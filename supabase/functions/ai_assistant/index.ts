import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

type AssistantConfidence = "high" | "medium" | "low" | "refuse";

type AssistantSuggestion = {
  type: "reminder" | "restock";
  itemId: string;
  reason: string;
};

type AssistantCitation = {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string | null;
  roomId: string | null;
  expiryDate: string | null;
};

type AssistantSuccess = {
  success: true;
  answer: string;
  confidence: AssistantConfidence;
  citations: AssistantCitation[];
  suggestions: AssistantSuggestion[];
  clarifyingQuestion: string | null;
};

type AssistantFailure = {
  success: false;
  error: string;
  errorCode:
    | "invalid_input"
    | "unauthenticated"
    | "forbidden_household"
    | "fetch_failed"
    | "provider_unavailable"
    | "budget_exceeded"
    | "disabled";
};

type AssistantResult = AssistantSuccess | AssistantFailure;

type RequestBody = {
  householdId?: string;
  question?: string;
};

type ItemRecord = {
  id: string;
  household_id: string;
  room_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit: string | null;
  expiry_date: string | null;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function logAiAudit(event: {
  stage: string;
  householdId?: string;
  userId?: string;
  outcome: "success" | "failure" | "refuse";
  errorCode?: string;
  metadata?: Record<string, unknown>;
}) {
  console.log(
    JSON.stringify({
      event: "ai_assistant_audit",
      timestamp: new Date().toISOString(),
      stage: event.stage,
      household_id: event.householdId ?? null,
      user_id: event.userId ?? null,
      outcome: event.outcome,
      error_code: event.errorCode ?? null,
      metadata: event.metadata ?? {},
    }),
  );
}

const DESTRUCTIVE_OR_PURCHASING_PATTERN =
  /\b(delete|remove|destroy|wipe|buy|purchase|order|checkout|reorder)\b/i;
const CROSS_HOUSEHOLD_PATTERN =
  /\b(other household|another household|someone else|other user)\b/i;

function resolveAllowedOrigins() {
  return (process.env.AI_ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function resolveOriginHeader(request: Request) {
  const origin = request.headers.get("Origin");
  if (!origin) {
    return "*";
  }

  const allowedOrigins = resolveAllowedOrigins();
  return allowedOrigins.includes(origin) ? origin : "";
}

function jsonResponse(
  request: Request,
  body: AssistantResult | { error: string },
  status = 200,
) {
  const allowedOrigin = resolveOriginHeader(request);
  if (!allowedOrigin) {
    return new Response(
      JSON.stringify({ error: "Origin not allowed" }),
      {
        status: 403,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
        },
      },
    );
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Access-Control-Allow-Origin": allowedOrigin,
      "Content-Type": "application/json",
    },
  });
}

function mapErrorStatus(errorCode: AssistantFailure["errorCode"]) {
  if (errorCode === "invalid_input") return 400;
  if (errorCode === "unauthenticated") return 401;
  if (errorCode === "forbidden_household") return 403;
  if (errorCode === "budget_exceeded") return 429;
  if (errorCode === "disabled") return 503;
  return 500;
}

function refusalResult(): AssistantSuccess {
  return {
    success: true,
    confidence: "refuse",
    answer:
      "I can help with grounded inventory questions and suggestions, but I cannot perform destructive or purchasing actions.",
    citations: [],
    suggestions: [],
    clarifyingQuestion: null,
  };
}

function budgetExceededResult(): AssistantFailure {
  return {
    success: false,
    error:
      "AI budget threshold reached for this environment. Please try again later.",
    errorCode: "budget_exceeded",
  };
}

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveAiEnvironment() {
  if (process.env.AI_ENVIRONMENT === "production") return "production";
  if (process.env.AI_ENVIRONMENT === "staging") return "staging";
  if (process.env.DENO_DEPLOYMENT_ID) return "production";
  return "development";
}

function resolveBudgetPolicy() {
  const environment = resolveAiEnvironment();
  if (environment === "production") {
    return {
      capUsd: parseNumber(process.env.AI_BUDGET_CAP_PROD_USD, 500),
      mode: process.env.AI_BUDGET_MODE_PROD === "degrade" ? "degrade" : "block",
    };
  }

  if (environment === "staging") {
    return {
      capUsd: parseNumber(process.env.AI_BUDGET_CAP_STAGING_USD, 50),
      mode: process.env.AI_BUDGET_MODE_STAGING === "block" ? "block" : "degrade",
    };
  }

  return {
    capUsd: parseNumber(process.env.AI_BUDGET_CAP_DEV_USD, 25),
    mode: process.env.AI_BUDGET_MODE_DEV === "block" ? "block" : "degrade",
  };
}

function isBudgetExceeded() {
  const policy = resolveBudgetPolicy();
  const projected = parseNumber(process.env.AI_PROJECTED_MONTHLY_USD, 0);
  const requestCost = parseNumber(process.env.AI_ESTIMATED_REQUEST_USD, 0.001);
  if (policy.mode !== "block") return false;
  return projected + requestCost > policy.capUsd;
}

function isAiEnabled() {
  return process.env.AI_ENABLED !== "false";
}

function getGeminiApiKey() {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GEMINI_API_KEY ??
    null;
}

function getGeminiModel() {
  return process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
}

function normalizeQuestion(question: string) {
  return question.trim().toLowerCase();
}

function toCitation(item: ItemRecord): AssistantCitation {
  return {
    itemId: item.id,
    itemName: item.name,
    quantity: item.quantity,
    unit: item.unit,
    roomId: item.room_id,
    expiryDate: item.expiry_date,
  };
}

function buildNoMatchResult(query: string): AssistantSuccess {
  return {
    success: true,
    confidence: "low",
    answer: `I could not find a grounded match for "${query}" in this inventory space.`,
    citations: [],
    suggestions: [],
    clarifyingQuestion: "Can you share a different item name or keyword?",
  };
}

async function searchInventory(
  supabase: ReturnType<typeof createClient>,
  householdId: string,
  queryText: string,
) {
  const query = queryText
    .trim()
    .replace(/[%_]/g, " ")
    .replace(/[,()]/g, " ")
    .replace(/\s+/g, " ");
  if (!query) return [];

  const pattern = `%${query}%`;
  const { data, error } = await supabase
    .from("inventory_items")
    .select(
      "id, household_id, room_id, name, description, quantity, unit, expiry_date",
    )
    .eq("household_id", householdId)
    .or(`name.ilike.${pattern},description.ilike.${pattern}`)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return [];
  }

  return (data ?? []) as ItemRecord[];
}

async function callGeminiWithTools(
  question: string,
  householdId: string,
  supabase: ReturnType<typeof createClient>,
) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }

  const model = getGeminiModel();
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const systemInstruction = `
You are OpenInventory Assistant.
Rules:
1) Ground claims only in tool data.
2) If no tool evidence exists, respond with uncertainty.
3) Never perform destructive/purchasing actions.
4) Use search_inventory tool for inventory checks.
`.trim();

  const firstRequestBody = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: question }],
      },
    ],
    tools: [
      {
        functionDeclarations: [
          {
            name: "search_inventory",
            description:
              "Search inventory items in the current household using a keyword query.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Keyword to search item name/description.",
                },
              },
              required: ["query"],
            },
          },
        ],
      },
    ],
  };

  const firstResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(firstRequestBody),
  });

  if (!firstResponse.ok) {
    return null;
  }

  const firstPayload = await firstResponse.json();
  const functionCallPart = firstPayload?.candidates?.[0]?.content?.parts?.find((
    part: unknown,
  ) => Boolean((part as Record<string, unknown>)?.functionCall))?.functionCall;

  if (!functionCallPart || functionCallPart?.name !== "search_inventory") {
    const directText = firstPayload?.candidates?.[0]?.content?.parts?.find((
      part: unknown,
    ) => typeof (part as Record<string, unknown>)?.text === "string")?.text;
    return typeof directText === "string" ? directText : null;
  }

  const query = (functionCallPart?.args?.query ?? "").toString();
  const results = await searchInventory(supabase, householdId, query);
  const citations = results.map(toCitation);

  const secondRequestBody = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: question }],
      },
      {
        role: "model",
        parts: [{ functionCall: functionCallPart }],
      },
      {
        role: "user",
        parts: [{
          functionResponse: {
            name: "search_inventory",
            response: {
              query,
              items: citations,
            },
          },
        }],
      },
    ],
  };

  const secondResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(secondRequestBody),
  });

  if (!secondResponse.ok) {
    return null;
  }

  const secondPayload = await secondResponse.json();
  const answerText = secondPayload?.candidates?.[0]?.content?.parts?.find((
    part: unknown,
  ) => typeof (part as Record<string, unknown>)?.text === "string")?.text;

  if (typeof answerText !== "string") {
    return null;
  }

  if (citations.length === 0) {
    return {
      answer: buildNoMatchResult(query).answer,
      confidence: "low" as const,
      citations: [],
      suggestions: [] as AssistantSuggestion[],
      clarifyingQuestion: "Can you share a different item name or keyword?",
    };
  }

  const suggestions: AssistantSuggestion[] = citations
    .filter((citation) => citation.quantity <= 1)
    .map((citation) => ({
      type: "restock",
      itemId: citation.itemId,
      reason: "Quantity is low (1 or less).",
    }));

  return {
    answer: answerText,
    confidence: "high" as const,
    citations,
    suggestions,
    clarifyingQuestion: null,
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    const allowedOrigin = resolveOriginHeader(request);
    if (!allowedOrigin) {
      return new Response("forbidden", { status: 403, headers: CORS_HEADERS });
    }
    return new Response("ok", {
      headers: {
        ...CORS_HEADERS,
        "Access-Control-Allow-Origin": allowedOrigin,
      },
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Method not allowed" }, 405);
  }

  if (!isAiEnabled()) {
    const result: AssistantFailure = {
      success: false,
      error: "AI is currently disabled.",
      errorCode: "disabled",
    };
    logAiAudit({ stage: "entry", outcome: "failure", errorCode: "disabled" });
    return jsonResponse(request, result, mapErrorStatus(result.errorCode));
  }

  if (isBudgetExceeded()) {
    const result = budgetExceededResult();
    logAiAudit({ stage: "entry", outcome: "failure", errorCode: "budget_exceeded" });
    return jsonResponse(request, result, mapErrorStatus(result.errorCode));
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      request,
      { success: false, error: "Invalid JSON body", errorCode: "invalid_input" },
      400,
    );
  }

  const householdId = body.householdId?.trim() ?? "";
  const question = body.question?.trim() ?? "";
  if (!householdId || !question) {
    logAiAudit({
      stage: "validation",
      householdId,
      outcome: "failure",
      errorCode: "invalid_input",
    });
    return jsonResponse(
      request,
      {
        success: false,
        error: "householdId and question are required",
        errorCode: "invalid_input",
      },
      400,
    );
  }

  if (question.length > 1_500) {
    return jsonResponse(
      request,
      {
        success: false,
        error: "Question exceeds maximum length.",
        errorCode: "invalid_input",
      },
      400,
    );
  }

  const normalizedQuestion = normalizeQuestion(question);
  if (
    DESTRUCTIVE_OR_PURCHASING_PATTERN.test(normalizedQuestion) ||
    CROSS_HOUSEHOLD_PATTERN.test(normalizedQuestion)
  ) {
    logAiAudit({
      stage: "guardrail",
      householdId,
      outcome: "refuse",
    });
    return jsonResponse(request, refusalResult(), 200);
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    logAiAudit({
      stage: "auth",
      householdId,
      outcome: "failure",
      errorCode: "unauthenticated",
    });
    return jsonResponse(
      request,
      {
        success: false,
        error: "User not authenticated",
        errorCode: "unauthenticated",
      },
      401,
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    logAiAudit({
      stage: "bootstrap",
      householdId,
      outcome: "failure",
      errorCode: "fetch_failed",
    });
    return jsonResponse(
      request,
      {
        success: false,
        error: "Supabase environment not configured",
        errorCode: "fetch_failed",
      },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user?.id) {
    logAiAudit({
      stage: "auth",
      householdId,
      outcome: "failure",
      errorCode: "unauthenticated",
    });
    return jsonResponse(
      request,
      {
        success: false,
        error: "User not authenticated",
        errorCode: "unauthenticated",
      },
      401,
    );
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", authData.user.id)
    .eq("household_id", householdId)
    .limit(1);

  if (membershipError || (memberships ?? []).length === 0) {
    logAiAudit({
      stage: "authz",
      householdId,
      userId: authData.user.id,
      outcome: "failure",
      errorCode: "forbidden_household",
    });
    return jsonResponse(
      request,
      {
        success: false,
        error: "Access denied for inventory space",
        errorCode: "forbidden_household",
      },
      403,
    );
  }

  const geminiResult = await callGeminiWithTools(question, householdId, supabase);
  if (!geminiResult) {
    logAiAudit({
      stage: "provider",
      householdId,
      userId: authData.user.id,
      outcome: "failure",
      errorCode: "provider_unavailable",
    });
    return jsonResponse(
      request,
      {
        success: false,
        error: "Gemini provider is unavailable",
        errorCode: "provider_unavailable",
      },
      500,
    );
  }

  const result: AssistantSuccess = {
    success: true,
    answer: geminiResult.answer,
    confidence: geminiResult.confidence,
    citations: geminiResult.citations,
    suggestions: geminiResult.suggestions,
    clarifyingQuestion: geminiResult.clarifyingQuestion,
  };
  logAiAudit({
    stage: "complete",
    householdId,
    userId: authData.user.id,
    outcome: "success",
    metadata: {
      confidence: result.confidence,
      citation_count: result.citations.length,
      suggestion_count: result.suggestions.length,
    },
  });

  return jsonResponse(request, result, 200);
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-expect-error Deno runtime URL import (types not resolved in web TS config)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { callGeminiWithToolsLoop } from "./GeminiToolLoop.ts";

// Cursor/TS in the monorepo doesn't always load Deno globals for Edge Functions.
// Declare the minimal shape we use so `Deno.serve` doesn't type-error.
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (
    handler: (request: Request) => Response | Promise<Response>,
  ) => void;
};

function getEnv(key: string): string | undefined {
  // Supabase Edge Functions expose secrets via `Deno.env.get()`.
  // `process.env` can be incomplete depending on runtime/bundling.
  return (globalThis as unknown as { Deno?: typeof Deno }).Deno?.env?.get(key) ??
    (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
      .process?.env?.[key];
}

type AssistantConfidence = "high" | "medium" | "low" | "refuse";

type AssistantSuggestion = {
  type: "reminder" | "restock";
  itemId: string;
  reason: string;
};

type AssistantCitation = {
  entityType: "item" | "product";
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

type ProductRecord = {
  id: string;
  household_id: string;
  sku: string | null;
  barcode: string | null;
  name: string;
  unit: string | null;
  is_active: boolean;
};

type StockOnHandRecord = {
  household_id: string | null;
  product_id: string | null;
  room_id: string | null;
  quantity_on_hand: number | null;
};

type MovementRecord = {
  id: string;
  household_id: string;
  product_id: string;
  room_id: string | null;
  movement_type: string;
  quantity_delta: number;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
  products?: { id: string; name: string; sku: string | null; unit: string | null } | null;
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
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveAllowedOrigins() {
  return (getEnv("AI_ALLOWED_ORIGINS") ?? "http://localhost:3000")
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
  if (getEnv("AI_ENVIRONMENT") === "production") return "production";
  if (getEnv("AI_ENVIRONMENT") === "staging") return "staging";
  if (getEnv("DENO_DEPLOYMENT_ID")) return "production";
  return "development";
}

function resolveBudgetPolicy() {
  const environment = resolveAiEnvironment();
  if (environment === "production") {
    return {
      capUsd: parseNumber(getEnv("AI_BUDGET_CAP_PROD_USD"), 500),
      mode: getEnv("AI_BUDGET_MODE_PROD") === "degrade" ? "degrade" : "block",
    };
  }

  if (environment === "staging") {
    return {
      capUsd: parseNumber(getEnv("AI_BUDGET_CAP_STAGING_USD"), 50),
      mode: getEnv("AI_BUDGET_MODE_STAGING") === "block" ? "block" : "degrade",
    };
  }

  return {
    capUsd: parseNumber(getEnv("AI_BUDGET_CAP_DEV_USD"), 25),
    mode: getEnv("AI_BUDGET_MODE_DEV") === "block" ? "block" : "degrade",
  };
}

function isBudgetExceeded() {
  const policy = resolveBudgetPolicy();
  const projected = parseNumber(getEnv("AI_PROJECTED_MONTHLY_USD"), 0);
  const requestCost = parseNumber(getEnv("AI_ESTIMATED_REQUEST_USD"), 0.001);
  if (policy.mode !== "block") return false;
  return projected + requestCost > policy.capUsd;
}

function isAiEnabled() {
  return getEnv("AI_ENABLED") !== "false";
}

function getGeminiApiKey() {
  return getEnv("GOOGLE_GENERATIVE_AI_API_KEY") ??
    getEnv("GEMINI_API_KEY") ??
    null;
}

function getGeminiModel() {
  // Gemini 3 Flash (preview) model id (can be overridden per environment).
  // Ref: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-flash
  return getEnv("GEMINI_MODEL") ?? "gemini-3-flash-preview";
}

function normalizeQuestion(question: string) {
  return question.trim().toLowerCase();
}

function toCitation(item: ItemRecord): AssistantCitation {
  return {
    entityType: "item",
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

function expandSearchVariants(query: string) {
  const sanitized = query
    .trim()
    .toLowerCase()
    .replace(/[%_]/g, " ")
    .replace(/[,()]/g, " ")
    .replace(/\s+/g, " ");

  const variants = new Set<string>();
  if (sanitized) variants.add(sanitized);

  const tokens = sanitized.split(" ").filter(Boolean);
  const expandToken = (token: string) => {
    const t = token.trim().toLowerCase();
    if (!t) return;
    variants.add(t);
    // battery <-> batteries
    if (t.endsWith("y") && t.length > 2) {
      variants.add(`${t.slice(0, -1)}ies`);
    }
    if (t.endsWith("ies") && t.length > 3) {
      variants.add(`${t.slice(0, -3)}y`);
    }
    // add/remove plural endings
    if (t.endsWith("es") && t.length > 3) {
      variants.add(t.slice(0, -2));
    }
    if (t.endsWith("s") && t.length > 3) {
      variants.add(t.slice(0, -1));
    } else if (!t.endsWith("s") && t.length > 1) {
      variants.add(`${t}s`);
    }
  };

  tokens.forEach(expandToken);

  return Array.from(variants)
    .map((value) => value.trim())
    .filter((value) => value.length > 1)
    .slice(0, 12);
}

async function searchInventory(
  supabase: ReturnType<typeof createClient>,
  householdId: string,
  queryText: string,
) {
  const variants = expandSearchVariants(queryText);
  if (variants.length === 0) return [];

  const orFilter = variants
    .flatMap((variant) => {
      const pattern = `%${variant}%`;
      return [`name.ilike.${pattern}`, `description.ilike.${pattern}`];
    })
    .join(",");

  const { data, error } = await supabase
    .from("inventory_items")
    .select(
      "id, household_id, room_id, name, description, quantity, unit, expiry_date",
    )
    .eq("household_id", householdId)
    .or(orFilter)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return [];
  }

  return (data ?? []) as ItemRecord[];
}

async function searchProducts(
  supabase: ReturnType<typeof createClient>,
  householdId: string,
  queryText: string,
) {
  const variants = expandSearchVariants(queryText);
  if (variants.length === 0) return [];

  const orFilter = variants
    .flatMap((variant) => {
      const pattern = `%${variant}%`;
      return [
        `name.ilike.${pattern}`,
        `sku.ilike.${pattern}`,
        `barcode.ilike.${pattern}`,
      ];
    })
    .join(",");

  const { data, error } = await supabase
    .from("products")
    .select("id, household_id, sku, barcode, name, unit, is_active")
    .eq("household_id", householdId)
    .or(orFilter)
    .order("updated_at", { ascending: false })
    .limit(5);

  if (error) return [];
  return (data ?? []) as ProductRecord[];
}

async function resolveWorkspaceType(
  supabase: ReturnType<typeof createClient>,
  householdId: string,
): Promise<"personal" | "business"> {
  const { data, error } = await supabase
    .from("households")
    .select("workspace_type")
    .eq("id", householdId)
    .single();

  if (error || !data?.workspace_type) return "personal";
  return data.workspace_type === "business" ? "business" : "personal";
}

async function resolveProductIdBySku(
  supabase: ReturnType<typeof createClient>,
  householdId: string,
  sku: string,
): Promise<string | null> {
  const trimmed = sku.trim();
  if (!trimmed) return null;
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("household_id", householdId)
    .eq("sku", trimmed)
    .single();
  if (error || !data?.id) return null;
  return data.id as string;
}

async function getStockOnHand(
  supabase: ReturnType<typeof createClient>,
  householdId: string,
  args: { productId?: string; sku?: string; roomId?: string },
) {
  const productId = args.productId ??
    (args.sku ? await resolveProductIdBySku(supabase, householdId, args.sku) : null);
  if (!productId) {
    return { productId: null, product: null, roomId: args.roomId ?? null, quantityOnHand: 0 };
  }

  let query = supabase
    .from("stock_on_hand")
    .select("household_id, product_id, room_id, quantity_on_hand")
    .eq("household_id", householdId)
    .eq("product_id", productId);

  if (args.roomId) {
    query = query.eq("room_id", args.roomId);
  }

  const { data, error } = await query;
  if (error) {
    return { productId, product: null, roomId: args.roomId ?? null, quantityOnHand: 0 };
  }

  const rows = (data ?? []) as StockOnHandRecord[];
  const quantityOnHand = rows.reduce(
    (sum, row) => sum + Number(row.quantity_on_hand ?? 0),
    0,
  );

  const { data: product } = await supabase
    .from("products")
    .select("id, name, sku, unit")
    .eq("household_id", householdId)
    .eq("id", productId)
    .single();

  return {
    productId,
    product: product ?? null,
    roomId: args.roomId ?? null,
    quantityOnHand,
  };
}

async function getMovements(
  supabase: ReturnType<typeof createClient>,
  householdId: string,
  args: { productId?: string; sku?: string; limit?: number },
) {
  const limit = Number.isFinite(args.limit) ? Math.max(1, Math.min(25, Number(args.limit))) : 10;
  const productId = args.productId ??
    (args.sku ? await resolveProductIdBySku(supabase, householdId, args.sku) : null);
  if (!productId) return { productId: null, product: null, movements: [] as MovementRecord[] };

  const { data, error } = await supabase
    .from("inventory_movements")
    .select(
      "id, household_id, product_id, room_id, movement_type, quantity_delta, source_type, source_id, created_at, products (id, name, sku, unit)",
    )
    .eq("household_id", householdId)
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { productId, product: null, movements: [] as MovementRecord[] };

  const movements = (data ?? []) as MovementRecord[];
  const product = movements?.[0]?.products ??
    (await supabase
      .from("products")
      .select("id, name, sku, unit")
      .eq("household_id", householdId)
      .eq("id", productId)
      .single()).data ??
    null;

  return { productId, product, movements };
}

async function getLowStock(
  supabase: ReturnType<typeof createClient>,
  householdId: string,
  args: { threshold?: number; limit?: number },
) {
  const threshold = Number.isFinite(args.threshold) ? Math.max(0, Number(args.threshold)) : 5;
  const limit = Number.isFinite(args.limit) ? Math.max(1, Math.min(25, Number(args.limit))) : 10;

  const { data: stockRows, error: stockError } = await supabase
    .from("stock_on_hand")
    .select("product_id, quantity_on_hand")
    .eq("household_id", householdId);

  if (stockError) {
    return {
      threshold,
      products: [] as Array<{
        productId: string;
        quantityOnHand: number;
        product: Record<string, unknown> | null;
      }>,
    };
  }

  const totals = new Map<string, number>();
  (stockRows ?? []).forEach((row) => {
    const productId = (row as StockOnHandRecord).product_id;
    if (!productId) return;
    const previous = totals.get(productId) ?? 0;
    totals.set(productId, previous + Number((row as StockOnHandRecord).quantity_on_hand ?? 0));
  });

  const low = Array.from(totals.entries())
    .filter(([, qty]) => qty <= threshold)
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit)
    .map(([productId, quantityOnHand]) => ({ productId, quantityOnHand }));

  const productIds = low.map((entry) => entry.productId);
  const { data: products } = productIds.length > 0
    ? await supabase
      .from("products")
      .select("id, name, sku, unit")
      .eq("household_id", householdId)
      .in("id", productIds)
    : { data: [] as Array<Record<string, unknown>> };

  const productById = new Map<string, Record<string, unknown>>();
  (products ?? []).forEach((product) => {
    const id = (product as Record<string, unknown>)?.id;
    if (typeof id === "string") {
      productById.set(id, product as Record<string, unknown>);
    }
  });

  return {
    threshold,
    products: low.map((entry) => ({
      ...entry,
      product: productById.get(entry.productId) ?? null,
    })),
  };
}

async function callGeminiWithTools(
  question: string,
  householdId: string,
  supabase: ReturnType<typeof createClient>,
) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      failure: true as const,
      message: "missing_google_generative_ai_api_key",
    };
  }

  const model = getGeminiModel();
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const workspaceType = await resolveWorkspaceType(supabase, householdId);
  const systemInstruction = `
You are OpenInventory Assistant.
Rules:
1) Ground claims only in tool data.
2) If no tool evidence exists, respond with uncertainty.
3) Never perform destructive/purchasing actions.
4) The current workspace_type is "${workspaceType}" ("personal" or "business").
5) Prefer tools over direct answers; business mode may require multiple tool calls.
`.trim();

  const tools = [
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
        {
          name: "search_products",
          description:
            "Search products (SKUs) in the current household using a keyword query.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Keyword to search product name, SKU, or barcode.",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "get_stock_on_hand",
          description:
            "Get current stock on hand for a product (optionally room-scoped). Requires productId or sku.",
          parameters: {
            type: "object",
            properties: {
              productId: { type: "string" },
              sku: { type: "string" },
              roomId: { type: "string" },
            },
          },
        },
        {
          name: "get_movements",
          description:
            "Get recent inventory movements for a product. Requires productId or sku.",
          parameters: {
            type: "object",
            properties: {
              productId: { type: "string" },
              sku: { type: "string" },
              limit: { type: "number" },
            },
          },
        },
        {
          name: "get_low_stock",
          description:
            "List products whose stock on hand is <= threshold (across all rooms).",
          parameters: {
            type: "object",
            properties: {
              threshold: { type: "number" },
              limit: { type: "number" },
            },
          },
        },
      ],
    },
  ];

  const lowStockThreshold = workspaceType === "business" ? 5 : 1;

  return await callGeminiWithToolsLoop<AssistantCitation, AssistantSuggestion>({
    endpoint,
    apiKey,
    systemInstruction,
    tools: tools as Array<Record<string, unknown>>,
    question,
    fetchFn: fetch,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 512,
    },
    buildNoMatch: (queryText) => ({
      answer: buildNoMatchResult(queryText).answer,
      confidence: "low",
      citations: [],
      suggestions: [],
      clarifyingQuestion: "Can you share a different item name, SKU, or keyword?",
    }),
    buildSuggestions: (citations) =>
      citations
        .filter((citation) => citation.quantity <= lowStockThreshold)
        .map((citation) => ({
          type: "restock",
          itemId: citation.itemId,
          reason: workspaceType === "business"
            ? `Quantity is low (${lowStockThreshold} or less).`
            : "Quantity is low (1 or less).",
        })),
    toolHandlers: {
      search_inventory: async (toolArgs) => {
        const query = String(toolArgs.query ?? "").trim();
        const results = await searchInventory(supabase, householdId, query);
        const citations = results.map(toCitation);
        return {
          lastQueryText: query,
          citations,
          toolResponse: { query, items: citations },
        };
      },
      search_products: async (toolArgs) => {
        const query = String(toolArgs.query ?? "").trim();
        const results = await searchProducts(supabase, householdId, query);
        return {
          lastQueryText: query,
          citations: [],
          toolResponse: { query, products: results },
        };
      },
      get_stock_on_hand: async (toolArgs) => {
        const response = await getStockOnHand(supabase, householdId, {
          productId: typeof toolArgs.productId === "string" ? toolArgs.productId : undefined,
          sku: typeof toolArgs.sku === "string" ? toolArgs.sku : undefined,
          roomId: typeof toolArgs.roomId === "string" ? toolArgs.roomId : undefined,
        });

        const citations: AssistantCitation[] = response.productId
          ? [{
            entityType: "product" as const,
            itemId: response.productId,
            itemName: String(
              (response.product as Record<string, unknown> | null)?.name ?? response.productId,
            ),
            quantity: response.quantityOnHand,
            unit: (response.product as Record<string, unknown> | null)?.unit as string | null ??
              null,
            roomId: response.roomId,
            expiryDate: null,
          }]
          : [];

        return {
          citations,
          toolResponse: response as unknown as Record<string, unknown>,
        };
      },
      get_movements: async (toolArgs) => {
        const response = await getMovements(supabase, householdId, {
          productId: typeof toolArgs.productId === "string" ? toolArgs.productId : undefined,
          sku: typeof toolArgs.sku === "string" ? toolArgs.sku : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });

        const citations: AssistantCitation[] = response.productId
          ? [{
            entityType: "product" as const,
            itemId: response.productId,
            itemName: String(
              (response.product as Record<string, unknown> | null)?.name ?? response.productId,
            ),
            quantity: 0,
            unit: (response.product as Record<string, unknown> | null)?.unit as string | null ??
              null,
            roomId: null,
            expiryDate: null,
          }]
          : [];

        return {
          citations,
          toolResponse: response as unknown as Record<string, unknown>,
        };
      },
      get_low_stock: async (toolArgs) => {
        const response = await getLowStock(supabase, householdId, {
          threshold: typeof toolArgs.threshold === "number" ? toolArgs.threshold : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });

        const citations: AssistantCitation[] = response.products.map((entry) => ({
          entityType: "product" as const,
          itemId: entry.productId,
          itemName: String(
            (entry.product as Record<string, unknown> | null)?.name ?? entry.productId,
          ),
          quantity: entry.quantityOnHand,
          unit: (entry.product as Record<string, unknown> | null)?.unit as string | null ?? null,
          roomId: null,
          expiryDate: null,
        }));

        return {
          citations,
          toolResponse: response as unknown as Record<string, unknown>,
        };
      },
    },
  });
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

  if (!UUID_PATTERN.test(householdId)) {
    logAiAudit({
      stage: "validation",
      householdId,
      outcome: "failure",
      errorCode: "invalid_input",
      metadata: { reason: "invalid_household_id_format" },
    });
    return jsonResponse(
      request,
      {
        success: false,
        error: "householdId must be a UUID",
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

  const supabaseUrl = getEnv("SUPABASE_URL");
  const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");
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
  if (!geminiResult || ("failure" in geminiResult)) {
    logAiAudit({
      stage: "provider",
      householdId,
      userId: authData.user.id,
      outcome: "failure",
      errorCode: "provider_unavailable",
      metadata: !geminiResult
        ? { reason: "unknown" }
        : { reason: "message" in geminiResult ? geminiResult.message : "unknown" },
    });
    return jsonResponse(
      request,
      {
        success: false,
        error: `Gemini provider is unavailable${
          geminiResult && "message" in geminiResult ? ` (${geminiResult.message})` : ""
        }`,
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

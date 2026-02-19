import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-expect-error Deno runtime URL import (types not resolved in web TS config)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

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

type RequestBody = {
  householdId?: string;
  modalities?: Array<"audio" | "video" | "text">;
  requestedConcurrency?: number;
  client?: "web" | "ios" | "android";
};

type LiveSessionSuccess = {
  success: true;
  sessionToken: string;
  expiresAt: string;
  ttlSeconds: number;
  transport: "direct_live_api";
  provider: "google_gemini_flash";
  modalities: Array<"audio" | "video" | "text">;
  policy: {
    maxConcurrencyPerUser: number;
    allowedClients: Array<"web" | "ios" | "android">;
  };
};

type LiveSessionFailure = {
  success: false;
  error: string;
  errorCode:
    | "invalid_input"
    | "unauthenticated"
    | "forbidden_household"
    | "disabled"
    | "live_disabled"
    | "policy_violation"
    | "provider_unavailable";
};

const CORS_HEADERS = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function logLiveAudit(event: {
  stage: string;
  householdId?: string;
  userId?: string;
  outcome: "success" | "failure";
  errorCode?: string;
  metadata?: Record<string, unknown>;
}) {
  console.log(
    JSON.stringify({
      event: "ai_live_session_audit",
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

function resolveAllowedOrigins() {
  return (getEnv("AI_ALLOWED_ORIGINS") ?? "http://localhost:3000")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function resolveOriginHeader(request: Request) {
  const origin = request.headers.get("Origin");
  if (!origin) return "*";
  return resolveAllowedOrigins().includes(origin) ? origin : "";
}

function jsonResponse(
  request: Request,
  body: LiveSessionSuccess | LiveSessionFailure | { error: string },
  status = 200,
) {
  const allowedOrigin = resolveOriginHeader(request);
  if (!allowedOrigin) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
      },
    });
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

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseInteger(value: string | undefined, fallback: number) {
  return Math.floor(parseNumber(value, fallback));
}

function isAiEnabled() {
  return getEnv("AI_ENABLED") !== "false";
}

function isLiveEnabled() {
  return getEnv("AI_LIVE_ENABLED") === "true";
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

function isLiveBudgetExceeded() {
  const policy = resolveBudgetPolicy();
  if (policy.mode !== "block") return false;
  const projected = parseNumber(getEnv("AI_PROJECTED_MONTHLY_USD"), 0);
  const requestCost = parseNumber(getEnv("AI_LIVE_ESTIMATED_REQUEST_USD"), 0.005);
  return projected + requestCost > policy.capUsd;
}

function resolveAllowedClients() {
  const raw = getEnv("AI_LIVE_ALLOWED_CLIENTS") ?? "web,ios,android";
  const clients = raw.split(",").map((value) => value.trim().toLowerCase());
  const result: Array<"web" | "ios" | "android"> = [];

  if (clients.includes("web")) result.push("web");
  if (clients.includes("ios")) result.push("ios");
  if (clients.includes("android")) result.push("android");

  return result.length > 0
    ? result
    : (["web", "ios", "android"] as Array<"web" | "ios" | "android">);
}

function resolveAllowedModalities() {
  const raw = getEnv("AI_LIVE_ALLOWED_MODALITIES") ?? "audio,video,text";
  const modalities = raw.split(",").map((value) => value.trim().toLowerCase());
  const result: Array<"audio" | "video" | "text"> = [];

  if (modalities.includes("audio")) result.push("audio");
  if (modalities.includes("video")) result.push("video");
  if (modalities.includes("text")) result.push("text");

  return result.length > 0
    ? result
    : (["audio", "video", "text"] as Array<"audio" | "video" | "text">);
}

function encodeBase64Url(input: Uint8Array) {
  const base64 = btoa(String.fromCharCode(...input));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signPayloadHmac(payload: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return encodeBase64Url(new Uint8Array(signature));
}

async function issueBrokerToken(claims: Record<string, unknown>, secret: string) {
  const header = encodeBase64Url(
    new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })),
  );
  const payload = encodeBase64Url(new TextEncoder().encode(JSON.stringify(claims)));
  const signature = await signPayloadHmac(`${header}.${payload}`, secret);
  return `${header}.${payload}.${signature}`;
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
    logLiveAudit({ stage: "entry", outcome: "failure", errorCode: "disabled" });
    return jsonResponse(
      request,
      {
        success: false,
        error: "AI is currently disabled.",
        errorCode: "disabled",
      },
      503,
    );
  }

  if (!isLiveEnabled()) {
    logLiveAudit({ stage: "entry", outcome: "failure", errorCode: "live_disabled" });
    return jsonResponse(
      request,
      {
        success: false,
        error: "Live AI sessions are currently disabled.",
        errorCode: "live_disabled",
      },
      503,
    );
  }

  if (isLiveBudgetExceeded()) {
    logLiveAudit({
      stage: "entry",
      outcome: "failure",
      errorCode: "policy_violation",
      metadata: { reason: "budget_exceeded" },
    });
    return jsonResponse(
      request,
      {
        success: false,
        error: "AI live budget threshold reached.",
        errorCode: "policy_violation",
      },
      429,
    );
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
  if (!householdId) {
    logLiveAudit({
      stage: "validation",
      outcome: "failure",
      errorCode: "invalid_input",
    });
    return jsonResponse(
      request,
      {
        success: false,
        error: "householdId is required",
        errorCode: "invalid_input",
      },
      400,
    );
  }

  if (!UUID_PATTERN.test(householdId)) {
    logLiveAudit({
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

  const requestedModalities: Array<"audio" | "video" | "text"> =
    body.modalities && body.modalities.length > 0
      ? body.modalities
      : ["audio", "text"];
  const allowedModalities = resolveAllowedModalities();
  const disallowedModality = requestedModalities.find((value) =>
    !allowedModalities.includes(value)
  );
  if (disallowedModality) {
    logLiveAudit({
      stage: "policy",
      householdId,
      outcome: "failure",
      errorCode: "policy_violation",
      metadata: { disallowed_modality: disallowedModality },
    });
    return jsonResponse(
      request,
      {
        success: false,
        error: `Modality '${disallowedModality}' is not permitted.`,
        errorCode: "policy_violation",
      },
      403,
    );
  }

  const requestedClient = body.client ?? "web";
  const allowedClients = resolveAllowedClients();
  if (!allowedClients.includes(requestedClient)) {
    logLiveAudit({
      stage: "policy",
      householdId,
      outcome: "failure",
      errorCode: "policy_violation",
      metadata: { requested_client: requestedClient },
    });
    return jsonResponse(
      request,
      {
        success: false,
        error: `Client '${requestedClient}' is not permitted.`,
        errorCode: "policy_violation",
      },
      403,
    );
  }

  const maxConcurrencyPerUser = parseInteger(
    getEnv("AI_LIVE_MAX_CONCURRENCY_PER_USER"),
    2,
  );
  const requestedConcurrency = body.requestedConcurrency ?? 1;
  if (requestedConcurrency > maxConcurrencyPerUser) {
    logLiveAudit({
      stage: "policy",
      householdId,
      outcome: "failure",
      errorCode: "policy_violation",
      metadata: {
        requested_concurrency: requestedConcurrency,
        max_concurrency_per_user: maxConcurrencyPerUser,
      },
    });
    return jsonResponse(
      request,
      {
        success: false,
        error: "Requested concurrency exceeds policy limit.",
        errorCode: "policy_violation",
      },
      403,
    );
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    logLiveAudit({
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
    logLiveAudit({
      stage: "bootstrap",
      householdId,
      outcome: "failure",
      errorCode: "provider_unavailable",
    });
    return jsonResponse(
      request,
      {
        success: false,
        error: "Supabase environment not configured",
        errorCode: "provider_unavailable",
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
    logLiveAudit({
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
    logLiveAudit({
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

  const ttlSeconds = Math.min(
    parseInteger(getEnv("AI_LIVE_SESSION_TTL_SECONDS"), 300),
    900,
  );
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAtEpoch = issuedAt + ttlSeconds;

  const signingSecret = getEnv("AI_LIVE_BROKER_SECRET");
  if (!signingSecret) {
    logLiveAudit({
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
        error: "Live broker secret is missing.",
        errorCode: "provider_unavailable",
      },
      500,
    );
  }

  const token = await issueBrokerToken(
    {
      sub: authData.user.id,
      household_id: householdId,
      provider: "google_gemini_flash",
      transport: "direct_live_api",
      client: requestedClient,
      modalities: requestedModalities,
      iat: issuedAt,
      exp: expiresAtEpoch,
    },
    signingSecret,
  );

  const response: LiveSessionSuccess = {
    success: true,
    sessionToken: token,
    expiresAt: new Date(expiresAtEpoch * 1000).toISOString(),
    ttlSeconds,
    transport: "direct_live_api",
    provider: "google_gemini_flash",
    modalities: requestedModalities,
    policy: {
      maxConcurrencyPerUser,
      allowedClients,
    },
  };

  logLiveAudit({
    stage: "complete",
    householdId,
    userId: authData.user.id,
    outcome: "success",
    metadata: {
      client: requestedClient,
      modalities: requestedModalities,
      ttl_seconds: ttlSeconds,
    },
  });

  return jsonResponse(request, response);
});

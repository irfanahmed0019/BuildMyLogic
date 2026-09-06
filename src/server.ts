import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { sarvamJson } from "./lib/sarvam.server";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}


type VscodeSession = {
  sessionId: string;
  challengeId: string;
  userId: string;
  token: string;
  active: boolean;
  startedAt: string;
  endedAt?: string;
  events: Array<Record<string, unknown>>;
};

const vscodeSessions = new Map<string, VscodeSession>();

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization, x-buildmylogic-token",
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...corsHeaders(),
    },
  });
}


async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function clean(value: unknown, max = 500): string {
  return String(value ?? "").trim().slice(0, max);
}

function bearerOrPairingToken(request: Request): string {
  const pairing = request.headers.get("x-buildmylogic-token")?.trim();
  if (pairing) return pairing;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
}

function validateVscodeSession(request: Request, sessionId: string): VscodeSession | Response {
  const session = vscodeSessions.get(sessionId);
  if (!session) return jsonResponse({ ok: false, error: "BuildMyLogic session not found." }, 404);
  if (!session.active) return jsonResponse({ ok: false, error: "BuildMyLogic session is no longer active." }, 409);
  const token = bearerOrPairingToken(request);
  if (!token || token !== session.token) return jsonResponse({ ok: false, error: "Invalid BuildMyLogic pairing token." }, 401);
  return session;
}

function summarizeEvent(eventType: string, payload: Record<string, unknown>) {
  if (eventType === "test_run") {
    const passed = Number(payload.passed ?? 0);
    const failed = Number(payload.failed ?? 0);
    const errors = Number(payload.errors ?? 0);
    return {
      kind: failed || errors ? "test_failure" : "test_success",
      passed,
      failed,
      errors,
      success: Boolean(payload.success),
    };
  }
  if (eventType === "diagnostics_change" || eventType === "context" || eventType === "active_editor") {
    const diagnostics = Array.isArray(payload.diagnostics) ? payload.diagnostics : [];
    return { kind: "editor_evidence", diagnosticCount: diagnostics.length };
  }
  if (eventType === "stuck") return { kind: "learner_stuck" };
  if (eventType === "submit") return { kind: "submission" };
  return { kind: eventType };
}

async function maybeVibeIntervention(session: VscodeSession, eventType: string, payload: Record<string, unknown>) {
  if (eventType !== "stuck") return null;
  const apiKey = process.env.SARVAM_API_KEY?.trim();
  if (!apiKey) return null;
  const note = clean(payload.note, 1000);
  const editor = payload.activeEditor && typeof payload.activeEditor === "object" ? JSON.stringify(payload.activeEditor).slice(0, 9000) : "none";
  const diagnostics = Array.isArray(payload.diagnostics) ? JSON.stringify(payload.diagnostics).slice(0, 5000) : "none";
  const lastRun = payload.lastRun && typeof payload.lastRun === "object" ? JSON.stringify(payload.lastRun).slice(0, 4000) : "none";
  try {
    return await sarvamJson<{ hint: string; nextStep: string }>(
      apiKey,
      `You are Vibe inside BuildMyLogic. Give the learner the minimum useful intervention. Never invent facts about their code. Do not provide a complete challenge solution. Return JSON exactly: {"hint":"one short explanation","nextStep":"one concrete action"}.`,
      `Challenge: ${session.challengeId}\nLearner says: ${note || "I am stuck"}\nActive editor evidence: ${editor}\nDiagnostics: ${diagnostics}\nLatest test evidence: ${lastRun}`,
      450,
    );
  } catch {
    return null;
  }
}

async function handleBuildMyLogicApi(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  if (!pathname.startsWith("/api/")) return null;

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });


  if (request.method === "POST" && pathname === "/api/vscode/sessions") {
    const body = await readJson(request);
    const challengeId = clean(body.challenge_id ?? body.challengeId, 180);
    const userId = clean(body.user_id ?? body.userId, 180) || "local-user";
    if (!challengeId) return jsonResponse({ ok: false, error: "challenge_id is required." }, 400);
    const sessionId = `bml_${crypto.randomUUID()}`;
    const tokenBytes = new Uint8Array(24);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const session: VscodeSession = {
      sessionId,
      challengeId,
      userId,
      token,
      active: true,
      startedAt: new Date().toISOString(),
      events: [],
    };
    vscodeSessions.set(sessionId, session);
    return jsonResponse({ ok: true, session_id: sessionId, challenge_id: challengeId, user_id: userId, token });
  }

  const eventMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/events$/);
  if (request.method === "POST" && eventMatch) {
    const sessionId = decodeURIComponent(eventMatch[1]);
    const validated = validateVscodeSession(request, sessionId);
    if (validated instanceof Response) return validated;
    const body = await readJson(request);
    const eventType = clean(body.event_type, 80);
    const payload = body.payload && typeof body.payload === "object" ? body.payload as Record<string, unknown> : {};
    if (!eventType) return jsonResponse({ ok: false, error: "event_type is required." }, 400);
    if (clean(body.session_id, 180) !== session.sessionId || clean(body.challenge_id, 180) !== session.challengeId || clean(body.user_id, 180) !== session.userId) {
      return jsonResponse({ ok: false, error: "Session identity does not match the pairing." }, 403);
    }
    const event = {
      schemaVersion: Number(body.schemaVersion ?? 2),
      session_id: session.sessionId,
      challenge_id: session.challengeId,
      user_id: session.userId,
      event_type: eventType,
      timestamp: clean(body.timestamp, 80) || new Date().toISOString(),
      payload,
    };
    session.events.push(event);
    if (session.events.length > 500) session.events.splice(0, session.events.length - 500);
    if (eventType === "session_ended") {
      session.active = false;
      session.endedAt = new Date().toISOString();
    }
    const evidence = summarizeEvent(eventType, payload);
    const intervention = await maybeVibeIntervention(session, eventType, payload);
    return jsonResponse({ ok: true, accepted: true, event_type: eventType, evidence, intervention });
  }

  const contextMatch = pathname === "/api/vscode/context";
  if (request.method === "POST" && contextMatch) {
    const body = await readJson(request);
    const sessionId = clean(body.session_id, 180);
    if (!sessionId) return jsonResponse({ ok: false, error: "session_id is required." }, 400);
    const validated = validateVscodeSession(request, sessionId);
    if (validated instanceof Response) return validated;
    const payload = body.payload && typeof body.payload === "object" ? body.payload as Record<string, unknown> : {};
    const event = { ...body, session_id: session.sessionId, event_type: clean(body.event_type, 80) || "context", payload };
    session.events.push(event);
    if (session.events.length > 500) session.events.splice(0, session.events.length - 500);
    return jsonResponse({ ok: true, accepted: true });
  }

  const sessionMatch = pathname.match(/^\/api\/vscode\/sessions\/([^/]+)$/);
  if (request.method === "GET" && sessionMatch) {
    const sessionId = decodeURIComponent(sessionMatch[1]);
    const session = vscodeSessions.get(sessionId);
    if (!session) return jsonResponse({ ok: false, error: "Session not found." }, 404);
    return jsonResponse({ ok: true, session: { session_id: session.sessionId, challenge_id: session.challengeId, user_id: session.userId, active: session.active, started_at: session.startedAt, ended_at: session.endedAt, event_count: session.events.length } });
  }

  return jsonResponse({ ok: false, error: "BuildMyLogic API endpoint not found." }, 404);
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // Cloudflare/Lovable injects secrets into the Worker `env` object at request time.
      // TanStack server functions in this app read secrets from process.env per request.
      // Bridge the Worker binding here so SARVAM_API_KEY is available in production.
      const runtimeEnv = env as Record<string, unknown> | null | undefined;
      const sarvamApiKey = runtimeEnv?.SARVAM_API_KEY;
      if (typeof sarvamApiKey === "string" && sarvamApiKey.trim()) {
        process.env.SARVAM_API_KEY = sarvamApiKey;
      }

      const apiResponse = await handleBuildMyLogicApi(request);
      if (apiResponse) return apiResponse;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

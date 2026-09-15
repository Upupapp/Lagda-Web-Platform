// Credentialed HTTP client for the backend's RECIPIENT realm ONLY.
//
// Deliberately separate from api-client.ts's apiRequest(): the backend runs
// two completely independent session/CSRF domains (see
// Lagda-Backend/packages/api/src/security/cookies.ts) — a sender's workspace
// session (`lagda_session`/`lagda_csrf`) and a recipient's signing session
// (`lagda_signing_session`/`lagda_signing_csrf`). Reusing apiRequest here
// would read the WRONG CSRF cookie and silently merge the two realms this
// mission explicitly requires stay apart (P2 §9). A recipient page must
// never import api-client.ts's apiRequest, and this file must never be used
// for a sender/workspace call.

import { API_BASE_URL } from "./backend-flag";
import { ApiError, type ApiErrorBody } from "./api-client";

const RECIPIENT_CSRF_COOKIE_NAME = "lagda_signing_csrf";

function readCookie(name: string): string | null {
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function requiresCsrf(method: string): boolean {
  return method !== "GET" && method !== "HEAD";
}

export interface RecipientApiRequestInit {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export async function recipientApiRequest<T>(path: string, init: RecipientApiRequestInit = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      "recipientApiRequest called with no VITE_API_BASE_URL configured — this should never happen behind USE_REAL_BACKEND.",
    );
  }
  const method = init.method ?? "GET";
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (requiresCsrf(method)) {
    const csrf = readCookie(RECIPIENT_CSRF_COOKIE_NAME);
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }
  if (init.headers) {
    for (const [name, value] of Object.entries(init.headers)) {
      if (name.toLowerCase() === "content-type" || name.toLowerCase() === "x-csrf-token") continue;
      headers[name] = value;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: "include",
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    });
  } catch {
    throw new ApiError(0, undefined, "Could not reach the server. Check your connection and try again.");
  }

  if (response.status === 204) return undefined as T;

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload: { error?: ApiErrorBody } | undefined = isJson ? await response.json().catch(() => undefined) : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, payload?.error, `Request failed with status ${response.status}.`);
  }
  return payload as T;
}

// The signing document's bytes are streamed, not JSON — fetched separately
// so callers can build an object URL for an inline viewer. Same credentialed
// realm as recipientApiRequest, no CSRF needed (GET).
export async function fetchRecipientDocumentBlob(): Promise<Blob> {
  if (!API_BASE_URL) {
    throw new Error("fetchRecipientDocumentBlob called with no VITE_API_BASE_URL configured.");
  }
  const response = await fetch(`${API_BASE_URL}/signing/ceremony/document`, {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) {
    throw new ApiError(response.status, undefined, "Could not load the document.");
  }
  return response.blob();
}

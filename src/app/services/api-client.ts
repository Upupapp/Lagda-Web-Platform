// Credentialed HTTP client for Lagda-Backend (packages/api).
//
// Auth model: httpOnly session cookie (`lagda_session`) + a companion
// JS-readable CSRF cookie (`lagda_csrf`) the backend expects echoed back as
// `X-CSRF-Token` on every mutating request (double-submit pattern — see
// Lagda-Backend/packages/api/src/security/cookies.ts). GET requests don't
// need it; the backend doesn't check it there.
//
// Every call sends `credentials: "include"` so the session cookie rides
// along even though frontend (5173) and backend (8090) are different
// origins in local dev — the backend's CORS_ORIGINS allowlist must include
// the frontend origin for this to work (see Lagda-Backend/.env).

import { API_BASE_URL } from "./backend-flag";

const CSRF_COOKIE_NAME = "lagda_csrf";

export interface ApiErrorDetail {
  field?: string;
  code: string;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  requestId?: string;
  details?: ApiErrorDetail[];
}

// Thrown for any non-2xx response. `body` is the backend's structured error
// when the response was JSON-shaped; undefined for a transport-level failure
// the backend never got to respond to in its own error format.
export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody | undefined;

  constructor(status: number, body: ApiErrorBody | undefined, fallbackMessage: string) {
    super(body?.message ?? fallbackMessage);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** Narrows an unknown parsed JSON body down to the `{ error: ApiErrorBody }`
 *  envelope shape, without asserting anything about a response that isn't
 *  actually shaped that way (a malformed/unexpected body just yields
 *  `undefined`, never a false structured error). */
export function extractErrorBody(payload: unknown): ApiErrorBody | undefined {
  if (typeof payload !== "object" || payload === null || !("error" in payload)) return undefined;
  const error = (payload as { error: unknown }).error;
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = error as Partial<ApiErrorBody>;
  if (typeof candidate.code !== "string" || typeof candidate.message !== "string") return undefined;
  return candidate as ApiErrorBody;
}

function readCookie(name: string): string | null {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function requiresCsrf(method: string): boolean {
  return method !== "GET" && method !== "HEAD";
}

export interface ApiRequestInit {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /**
   * Caller-supplied headers for the rare request that needs one beyond the
   * standard set — e.g. `Idempotency-Key` on the handful of endpoints that
   * require it (see Lagda-Backend's IDEMPOTENCY_KEY_HEADER). Merged in
   * AFTER Content-Type/CSRF are set, so a caller cannot accidentally
   * override either — this is additive only, never a replacement for the
   * standard headers.
   */
  headers?: Record<string, string>;
}

// Low-level request. Domain services build on this rather than calling
// fetch directly, so the auth/CSRF/error-shape handling lives in one place.
export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      "apiRequest called with no VITE_API_BASE_URL configured — this should never happen behind USE_REAL_BACKEND.",
    );
  }
  const method = init.method ?? "GET";
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (requiresCsrf(method)) {
    const csrf = readCookie(CSRF_COOKIE_NAME);
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
  const payload: unknown = isJson ? await response.json().catch(() => undefined) : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, extractErrorBody(payload), `Request failed with status ${response.status}.`);
  }
  return payload as T;
}

// Multipart upload — separate from apiRequest because a FormData body must
// never be JSON-stringified and must never get an explicit Content-Type (the
// browser sets the multipart boundary itself; setting it manually breaks the
// backend's parser). Same CSRF/credentials/error handling otherwise — see
// Lagda-Backend's upload-route.ts for the exact multipart contract this
// talks to (one file part, field name irrelevant — the backend iterates
// every part looking for one of type "file").
export async function apiUpload<T>(path: string, formData: FormData, signal?: AbortSignal): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      "apiUpload called with no VITE_API_BASE_URL configured — this should never happen behind USE_REAL_BACKEND.",
    );
  }
  const headers: Record<string, string> = {};
  const csrf = readCookie(CSRF_COOKIE_NAME);
  if (csrf) headers["X-CSRF-Token"] = csrf;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers,
      credentials: "include",
      body: formData,
      signal,
    });
  } catch {
    throw new ApiError(0, undefined, "Could not reach the server. Check your connection and try again.");
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload: unknown = isJson ? await response.json().catch(() => undefined) : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, extractErrorBody(payload), `Upload failed with status ${response.status}.`);
  }
  return payload as T;
}

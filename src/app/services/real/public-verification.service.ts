// The real verification surface: public lookup + file check (BACKEND-42),
// the emailed-code participant gate, and the authenticated member shortcut.
//
// Public calls carry no cookie and no session (`credentials: "omit"`): a
// stranger with a reference is calling, not a signed-in workspace member.
// The one exception is `requestMemberAccess`, which deliberately goes through
// `apiRequest` so the session cookie and CSRF header travel with it.
//
// The access token a successful code exchange returns is held by the caller
// IN MEMORY ONLY. Nothing in this module writes it to any storage.

import { API_BASE_URL } from "../backend-flag";
import { apiRequest, ApiError } from "../api-client";

export interface RealVerificationRecord {
  readonly verificationId: string;
  /** Epoch milliseconds, exactly as the backend's `VerificationResponseSchema` sends it. */
  readonly completedAt: number;
  readonly participantCount: number;
  readonly finalDocument: { readonly digestAlgorithm: "sha-256"; readonly digest: string };
  readonly seal: {
    readonly scheme: string; readonly version: number;
    readonly digestAlgorithm: "sha-256"; readonly description: string;
  };
}

/** A timestamp as the backend sends it: epoch ms or an ISO string. */
export type WireTime = number | string;

export interface VerificationParticipant {
  readonly name: string;
  readonly maskedEmail: string;
  readonly recipientType: string;
  readonly status: string;
  readonly actedAt: WireTime | null;
  readonly routingOrder: number;
}

export interface VerificationEvent {
  readonly type: string;
  readonly label: string;
  readonly at: WireTime;
}

export interface VerificationDetails {
  readonly documentTitle: string;
  readonly completedAt: WireTime;
  readonly sealedDigest: string;
  readonly participants: readonly VerificationParticipant[];
  readonly events: readonly VerificationEvent[];
}

export interface VerificationGrant {
  readonly accessToken: string;
  readonly expiresAt: WireTime;
  readonly documentTitle: string;
  readonly recipientType: string;
  readonly details: VerificationDetails;
}

export type LookupResult =
  | { readonly kind: "found"; readonly record: RealVerificationRecord }
  | { readonly kind: "not-found" }
  | { readonly kind: "rate-limited" }
  | { readonly kind: "error" };

export type SendCodeResult =
  | { readonly kind: "sent"; readonly expiresInSeconds: number }
  | { readonly kind: "rate-limited" }
  | { readonly kind: "error" };

export type AccessResult =
  | { readonly kind: "granted"; readonly grant: VerificationGrant }
  | { readonly kind: "denied" }
  | { readonly kind: "rate-limited" }
  | { readonly kind: "error" };

export type DetailsResult =
  | { readonly kind: "ok"; readonly details: VerificationDetails }
  | { readonly kind: "expired" }
  | { readonly kind: "rate-limited" }
  | { readonly kind: "error" };

export type DocumentResult =
  | { readonly kind: "ok"; readonly blob: Blob; readonly mediaType: string }
  | { readonly kind: "expired" }
  | { readonly kind: "rate-limited" }
  | { readonly kind: "error" };

export type FileCheckResult =
  | {
      readonly kind: "result"; readonly matches: boolean;
      readonly authoritativeDigest: string; readonly uploadedDigest: string;
    }
  | { readonly kind: "not-found" }
  | { readonly kind: "too-large" }
  | { readonly kind: "invalid" }
  | { readonly kind: "rate-limited" }
  | { readonly kind: "error" };

function url(verificationId: string, suffix = ""): string {
  return `${API_BASE_URL ?? ""}/public/verifications/${encodeURIComponent(verificationId)}${suffix}`;
}

async function postJson(target: string, body: unknown): Promise<Response | null> {
  try {
    return await fetch(target, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return null;
  }
}

async function readJson<T>(response: Response): Promise<T | null> {
  return await response.json().catch(() => null) as T | null;
}

export async function lookupVerification(verificationId: string): Promise<LookupResult> {
  if (API_BASE_URL === null) return { kind: "error" };
  let response: Response;
  try {
    response = await fetch(url(verificationId), { method: "GET", credentials: "omit" });
  } catch {
    return { kind: "error" };
  }
  if (response.status === 404) return { kind: "not-found" };
  if (response.status === 429) return { kind: "rate-limited" };
  if (!response.ok) return { kind: "error" };
  const record = await readJson<RealVerificationRecord>(response);
  if (record === null) return { kind: "error" };
  return { kind: "found", record };
}

/**
 * POST /access-code. The backend answers 202 whether or not the email is a
 * participant; this function preserves that neutrality — the caller cannot
 * learn anything about the address from the result.
 */
export async function requestAccessCode(verificationId: string, email: string): Promise<SendCodeResult> {
  if (API_BASE_URL === null) return { kind: "error" };
  const response = await postJson(url(verificationId, "/access-code"), { email });
  if (response === null) return { kind: "error" };
  if (response.status === 429) return { kind: "rate-limited" };
  if (!response.ok) return { kind: "error" };
  const body = await readJson<{ expiresInSeconds?: number }>(response);
  return { kind: "sent", expiresInSeconds: body?.expiresInSeconds ?? 600 };
}

function isGrant(value: unknown): value is VerificationGrant {
  return typeof value === "object" && value !== null
    && typeof (value as { accessToken?: unknown }).accessToken === "string";
}

/** POST /access with the emailed code. */
export async function submitAccessCode(
  verificationId: string, email: string, code: string,
): Promise<AccessResult> {
  if (API_BASE_URL === null) return { kind: "error" };
  const response = await postJson(url(verificationId, "/access"), { email, code });
  if (response === null) return { kind: "error" };
  if (response.status === 401) return { kind: "denied" };
  if (response.status === 429) return { kind: "rate-limited" };
  if (!response.ok) return { kind: "error" };
  const body = await readJson<unknown>(response);
  if (!isGrant(body)) return { kind: "error" };
  return { kind: "granted", grant: body };
}

export async function fetchVerificationDetails(
  verificationId: string, accessToken: string,
): Promise<DetailsResult> {
  if (API_BASE_URL === null) return { kind: "error" };
  const response = await postJson(url(verificationId, "/details"), { accessToken });
  if (response === null) return { kind: "error" };
  if (response.status === 401) return { kind: "expired" };
  if (response.status === 429) return { kind: "rate-limited" };
  if (!response.ok) return { kind: "error" };
  const details = await readJson<VerificationDetails>(response);
  if (details === null) return { kind: "error" };
  return { kind: "ok", details };
}

export async function fetchSignedDocument(
  verificationId: string, accessToken: string,
): Promise<DocumentResult> {
  if (API_BASE_URL === null) return { kind: "error" };
  const response = await postJson(url(verificationId, "/document"), { accessToken });
  if (response === null) return { kind: "error" };
  if (response.status === 401) return { kind: "expired" };
  if (response.status === 429) return { kind: "rate-limited" };
  if (!response.ok) return { kind: "error" };
  return {
    kind: "ok",
    blob: await response.blob(),
    mediaType: response.headers.get("Content-Type") ?? "application/pdf",
  };
}

/**
 * POST /file-check with the raw file bytes as the body (the backend streams
 * and hashes `request.raw`; it is not multipart). A mismatch is a 200 with
 * `matches: false`, never an error.
 */
export async function checkVerificationFile(verificationId: string, file: Blob): Promise<FileCheckResult> {
  if (API_BASE_URL === null) return { kind: "error" };
  let response: Response;
  try {
    response = await fetch(url(verificationId, "/file-check"), {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/pdf" },
      body: file,
    });
  } catch {
    return { kind: "error" };
  }
  if (response.status === 404) return { kind: "not-found" };
  if (response.status === 413) return { kind: "too-large" };
  if (response.status === 400) return { kind: "invalid" };
  if (response.status === 429) return { kind: "rate-limited" };
  if (!response.ok) return { kind: "error" };
  const body = await readJson<{ matches: boolean; authoritativeDigest: string; uploadedDigest: string }>(response);
  if (body === null || typeof body.matches !== "boolean") return { kind: "error" };
  return {
    kind: "result", matches: body.matches,
    authoritativeDigest: body.authoritativeDigest, uploadedDigest: body.uploadedDigest,
  };
}

/**
 * Authenticated shortcut: if the signed-in account's verified email is a
 * participant, the backend returns the same grant the emailed code would.
 */
export async function requestMemberAccess(verificationId: string): Promise<AccessResult> {
  if (API_BASE_URL === null) return { kind: "error" };
  try {
    const body = await apiRequest<unknown>(
      `/verifications/${encodeURIComponent(verificationId)}/member-access`, { method: "POST" });
    if (!isGrant(body)) return { kind: "error" };
    return { kind: "granted", grant: body };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403 || error.status === 404) return { kind: "denied" };
      if (error.status === 429) return { kind: "rate-limited" };
    }
    return { kind: "error" };
  }
}

/** The public, shareable URL of a record's dedicated verification page. */
export function verificationPageUrl(verificationId: string, origin = window.location.origin): string {
  return `${origin}/verify/${encodeURIComponent(verificationId)}`;
}

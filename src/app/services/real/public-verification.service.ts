// The real public verification surface (BACKEND-42 lookup + OD-135 email-gated
// document access). No cookie, no session — these three calls are the entire
// credential model, matching `final-copy.service.ts`'s own `credentials:
// "omit"` reasoning: a stranger with a reference (and, for the last two, a
// participant email) is calling, not a signed-in workspace member.

import { API_BASE_URL } from "../backend-flag";

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

export type LookupResult =
  | { readonly kind: "found"; readonly record: RealVerificationRecord }
  | { readonly kind: "not-found" }
  | { readonly kind: "error" };

export async function lookupVerification(verificationId: string): Promise<LookupResult> {
  if (API_BASE_URL === null) return { kind: "error" };
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/public/verifications/${encodeURIComponent(verificationId)}`, {
      method: "GET",
      credentials: "omit",
    });
  } catch {
    return { kind: "error" };
  }
  if (response.status === 404) return { kind: "not-found" };
  if (!response.ok) return { kind: "error" };
  const record = await response.json().catch(() => null) as RealVerificationRecord | null;
  if (record === null) return { kind: "error" };
  return { kind: "found", record };
}

export type AccessResult =
  | { readonly kind: "granted"; readonly documentTitle: string; readonly recipientType: string }
  | { readonly kind: "denied" }
  | { readonly kind: "error" };

export async function requestParticipantAccess(
  verificationId: string, email: string,
): Promise<AccessResult> {
  if (API_BASE_URL === null) return { kind: "error" };
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/public/verifications/${encodeURIComponent(verificationId)}/access`, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch {
    return { kind: "error" };
  }
  // 401 (no matching participant) and 429 (rate limited) both mean "not
  // granted right now" — the caller gets one denial either way, same as the
  // backend gives one denial for every reason underneath it.
  if (response.status === 401 || response.status === 429) return { kind: "denied" };
  if (!response.ok) return { kind: "error" };
  const body = await response.json().catch(() => null) as
    { documentTitle: string; recipientType: string } | null;
  if (body === null) return { kind: "error" };
  return { kind: "granted", documentTitle: body.documentTitle, recipientType: body.recipientType };
}

export type DocumentResult =
  | { readonly kind: "ok"; readonly blob: Blob; readonly mediaType: string }
  | { readonly kind: "denied" }
  | { readonly kind: "error" };

export async function fetchParticipantDocument(
  verificationId: string, email: string,
): Promise<DocumentResult> {
  if (API_BASE_URL === null) return { kind: "error" };
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/public/verifications/${encodeURIComponent(verificationId)}/document`, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch {
    return { kind: "error" };
  }
  if (response.status === 401 || response.status === 429) return { kind: "denied" };
  if (!response.ok) return { kind: "error" };
  return {
    kind: "ok",
    blob: await response.blob(),
    mediaType: response.headers.get("Content-Type") ?? "application/pdf",
  };
}

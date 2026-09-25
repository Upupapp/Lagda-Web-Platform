// A participant's copy of a finished document (073).
//
// The link in the completion email is `/copy/<credential>`. The page posts
// the credential in a request BODY — never in a URL the API would log — and
// receives the sealed PDF. No cookie is set or sent: this is one exchange of
// a credential for bytes, not a session.

import { API_BASE_URL } from "../backend-flag";

export type FinalCopyResult =
  | { readonly kind: "ok"; readonly blob: Blob; readonly filename: string }
  | { readonly kind: "invalid" }
  | { readonly kind: "error" };

/** The filename the server chose, or a safe fallback. */
export function filenameFromDisposition(header: string | null): string {
  const match = header === null ? null : /filename="([^"]+)"/u.exec(header);
  return match?.[1] ?? "signed-document.pdf";
}

export async function downloadFinalCopy(token: string): Promise<FinalCopyResult> {
  if (API_BASE_URL === null) return { kind: "error" };
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/final-copies/download`, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch {
    return { kind: "error" };
  }
  // 401 (unknown, expired, revoked) and 422 (not even the right shape) both
  // mean "this link will never work" — one answer for both.
  if (response.status === 401 || response.status === 422) return { kind: "invalid" };
  if (!response.ok) return { kind: "error" };
  return {
    kind: "ok",
    blob: await response.blob(),
    filename: filenameFromDisposition(response.headers.get("Content-Disposition")),
  };
}

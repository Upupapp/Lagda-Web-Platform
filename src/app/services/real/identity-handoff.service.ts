// The identity check, continued on a phone.
//
// The computer shows a QR code of `/sign/identity/handoff#<token>`. The phone
// that scans it has no signing session and gets none: the token is the whole
// credential, and it travels in a request BODY, never in a URL a server would
// log. No cookie is sent or kept (`credentials: "omit"`), as with a
// participant's final copy.
//
// The computer's half (asking for the link, and watching how the phone gets
// on) belongs to the signing session and is in signing-access.service.ts.

import { API_BASE_URL } from "../backend-flag";
import { ApiError, extractErrorBody } from "../api-client";
import type { IdentityCheckMode } from "../../models/identity-check";
import type { IdentityCheckResult, IdentityCheckSubmission } from "./signing-access.service";

/** What the phone is told when it opens the link. */
export interface IdentityHandoffSession {
  documentTitle: string;
  mode: IdentityCheckMode | null;
  idTypes: string[];
  attemptsRemaining: number;
  expiresAt: string;
  status: string;
}

interface RawAttempt {
  outcome: "passed" | "failed";
  attemptsRemaining: number;
  status: string;
}

/** One answer for every link that will not work, whatever the reason. */
const NOT_FOUND = { code: "identity_handoff_not_found", message: "This link has ended." };

async function post<T>(path: string, body: unknown): Promise<T> {
  // A build with no backend has no link to honour.
  if (API_BASE_URL === null) throw new ApiError(404, NOT_FOUND, NOT_FOUND.message);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, undefined, "Could not reach the server. Check your connection and try again.");
  }
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload: unknown = isJson === true ? await response.json().catch(() => undefined) : undefined;
  if (!response.ok) {
    throw new ApiError(response.status, extractErrorBody(payload), `Request failed with status ${String(response.status)}.`);
  }
  return payload as T;
}

class RealIdentityHandoffService {
  /** Opens the link. A wrong, expired or used token is a 404, and nothing more is said. */
  async open(token: string): Promise<IdentityHandoffSession> {
    if (token === "") throw new ApiError(404, NOT_FOUND, NOT_FOUND.message);
    return post<IdentityHandoffSession>("/public/identity-handoff/open", { token });
  }

  /**
   * One attempt, made from the phone. The same body as an attempt made on the
   * computer, plus the token: the kind of ID, how the selfie was taken, the
   * agreement, and no image, number or name.
   *
   * Answered in the words the stages already understand: a failure with no
   * attempt left is a lock, whatever the hand-off itself is then called.
   */
  async submit(token: string, input: IdentityCheckSubmission): Promise<IdentityCheckResult> {
    const raw = await post<RawAttempt>("/public/identity-handoff/submit", {
      token,
      idType: input.idType,
      capture: input.capture,
      consent: true,
      // TEST MODE ONLY. Refused by the server in any other mode.
      ...(input.testOutcome === undefined ? {} : { testOutcome: input.testOutcome }),
    });
    if (raw.outcome === "passed") {
      return { outcome: "passed", attemptsRemaining: raw.attemptsRemaining, status: "passed" };
    }
    const locked = raw.status === "locked" || raw.attemptsRemaining <= 0;
    return { outcome: "failed", attemptsRemaining: raw.attemptsRemaining, status: locked ? "locked" : "pending" };
  }
}

export const realIdentityHandoffService = new RealIdentityHandoffService();

/**
 * Whether trying the same request again could help. A link that is wrong,
 * over or used never will; a dropped connection or a busy server might.
 */
export function identityHandoffRetryable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  return error.status === 0 || error.status === 429 || error.status >= 500;
}

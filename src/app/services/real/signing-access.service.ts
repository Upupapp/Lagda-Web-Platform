// Real recipient-realm service — signing-access bootstrap + the signing
// ceremony surface. Traced directly against current source this command
// (P2): signing-access-routes.ts, signing-ceremony-routes.ts. Uses
// recipientApiRequest, NEVER apiRequest — see that file's header for why.

import { recipientApiRequest, fetchRecipientDocumentBlob } from "../recipient-api-client";

export interface BootstrapResult {
  authenticated: true;
  signingRequestId: string;
  documentTitle: string;
  recipientName: string;
  maskedEmail: string;
  /**
   * How THIS session was authenticated: the emailed link, or a signed-in
   * account that re-entered its password to continue from the app.
   */
  authenticationMethod: RecipientAuthenticationMethod;
  authenticatedAt: string;
}

export type RecipientAuthenticationMethod = "link-only" | "account-password";

export interface SigningContext {
  authenticated: true;
  signingRequestId: string;
  authenticationMethod: RecipientAuthenticationMethod;
}

export interface CeremonyField {
  fieldId: string;
  type: string;
  pageNumber: number;
  x: number; y: number; width: number; height: number;
  required: boolean;
  label: string;
  layer: number;
  valueAuthority: "RECIPIENT_SUPPLIED" | "SERVER_DERIVED";
  valueKind: string;
  maxLength: number | null;
}

/**
 * Where this participant stands on the sender's optional identity check.
 *
 * While `status` is `pending`, `locked` or `name-mismatch` the server
 * withholds the document, the fields and consent. `name-mismatch`: the check
 * was passed, but the name read from the ID is not the name the sender
 * entered; the sender decides, and the participant waits. The ID's name is
 * never given to this browser. `mode: "test"` means the check is SIMULATED: nothing
 * is verified, and the page must say so.
 */
export interface CeremonyIdentityCheck {
  required: boolean;
  status: "not-required" | "pending" | "passed" | "locked" | "name-mismatch";
  mode: "test" | "live" | null;
  attemptsRemaining: number;
  verifiedAt: string | null;
  /** The kinds of ID the participant may choose from. */
  idTypes: string[];
  /**
   * Where the check is done. `inline`: on LAGDA's own screens. `hosted`: on
   * the identity verification partner's page, which the participant is sent
   * to and brought back from. Absent from an older server: `inline`.
   */
  flow?: IdentityCheckFlow;
}

export type IdentityCheckFlow = "inline" | "hosted";

/** Where this check is done. Anything but an explicit `hosted` is `inline`. */
export function identityCheckFlow(check: Pick<CeremonyIdentityCheck, "flow"> | undefined): IdentityCheckFlow {
  return check?.flow === "hosted" ? "hosted" : "inline";
}

/**
 * A visit to the identity verification partner's page. `url` is theirs: the
 * browser is sent to it exactly as given. Asking again while one is open
 * returns the same one.
 */
export interface IdentityCheckSession {
  url: string;
  expiresAt: string;
}

/**
 * Where the hosted check stands, asked of the partner now.
 *
 * `pendingReview` means a person at the partner is looking at it: the status
 * stays `pending` and the answer comes later. It is reported only here, never
 * on the ceremony. An attempt that was not passed shows only as `pending`
 * with fewer `attemptsRemaining` than before.
 */
export interface IdentityCheckSessionStatus {
  status: "pending" | "passed" | "locked" | "not-required" | "name-mismatch";
  attemptsRemaining: number;
  verifiedAt: string | null;
  pendingReview: boolean;
}

/**
 * One attempt. Deliberately no image, ID number or name: the server accepts
 * none, and the capture never leaves the browser.
 */
export interface IdentityCheckSubmission {
  idType: string;
  capture: "camera" | "upload";
  consent: true;
  /** TEST MODE ONLY. Refused by the server in any other mode. */
  testOutcome?: "pass" | "fail";
}

export interface IdentityCheckResult {
  outcome: "passed" | "failed";
  attemptsRemaining: number;
  status: "pending" | "passed" | "locked" | "not-required";
}

/**
 * A way to continue the identity check on a phone: a link, shown as a QR
 * code, that is good for ten minutes. The secret is in the link's FRAGMENT,
 * so it is never sent to a server by the browser that opens it. Asking for
 * another one revokes this one.
 */
export interface IdentityHandoff {
  handoffId: string;
  url: string;
  expiresAt: string;
}

export type IdentityHandoffState = "waiting" | "opened" | "completed" | "failed" | "expired" | "revoked";

/** How the phone is getting on, as the computer that showed the code sees it. */
export interface IdentityHandoffStatus {
  status: IdentityHandoffState;
  attemptsRemaining: number;
}

/** True while the identity check stands between this participant and the document. */
export function identityCheckOutstanding(view: Pick<CeremonyView, "identityCheck">): boolean {
  const check = view.identityCheck;
  // Absent from an older server: nothing is asked.
  if (check === undefined) return false;
  // A name that does not match blocks exactly as a lock does: the sender decides.
  return check.required
    && (check.status === "pending" || check.status === "locked" || check.status === "name-mismatch");
}

export interface CeremonyView {
  request: { signingRequestId: string; documentTitle: string };
  recipient: { recipientId: string; name: string; email: string; type: string };
  /** Present only once an account has been bound. The address is masked. */
  accountLink?: { maskedEmail: string };
  /**
   * Marks handed to THIS session at claim time, ready to apply.
   *
   * Session-scoped server-side: a forwarded link cannot reach a mark prepared
   * for the browser that was actually verified.
   */
  preparedSignatures?: {
    purpose: "signature" | "initials";
    method: "typed" | "drawn";
    text?: string;
    styleIndex?: number;
    base64?: string;
    width?: number;
    height?: number;
  }[];
  access: {
    mayEnter: boolean;
    mayViewDocument: boolean;
    mayViewAssignedFields: boolean;
    mayAcceptConsent: boolean;
    mayProceedToInput: boolean;
    /** Whether Decline belongs on the page. Absent from an older server. */
    mayDecline?: boolean;
    /** Whether Skip belongs on the page: an approver's alone. */
    maySkip?: boolean;
  };
  consent: {
    required: boolean;
    accepted: boolean;
    type: string;
    requiredVersion: string;
    acceptedVersion: string | null;
    acceptedAt: string | null;
  };
  /** 105. Absent from a server that predates the identity check: treat as not required. */
  identityCheck?: CeremonyIdentityCheck;
  document: { mediaType: string; sizeBytes: number; digest: string; pageCount: number | null } | null;
  fields: CeremonyField[];
  firstEnteredAt: string | null;
}

/**
 * Is this path segment shaped like a bootstrap credential at all?
 *
 * The backend's schema pins the token to EXACTLY 43 characters
 * (`minLength: 43, maxLength: 43`) — base64url over 32 bytes. This mirrors
 * that bound and nothing stricter: a client rule the server does not share is
 * a rule that silently breaks the day the server's format changes.
 *
 * Length alone is the effective check. The mock scenario ids are 20-30
 * characters, and although they happen to use only base64url-legal
 * characters, none of them is 43 long.
 */
export function isSigningAccessToken(value: string): boolean {
  return value.length === SIGNING_TOKEN_LENGTH;
}

/** Thrown before any request leaves the browser. */
export class NotASigningTokenError extends Error {
  constructor() {
    // Deliberately identical in wording to a token the server rejects. A
    // caller must not be able to tell "this is not a token" from "this token
    // is not valid" — that difference is an oracle, and the backend collapses
    // every bootstrap failure into one error for exactly this reason.
    super("This signing link is not valid. Please open the link from your email again.");
    this.name = "NotASigningTokenError";
  }
}

const SIGNING_TOKEN_LENGTH = 43;

class RealSigningAccessService {
  // `token` is the 43-char opaque credential taken from the /sign/:token
  // path segment of the emailed link — never sent as a query param, per the
  // backend's link builder (security/signing-delivery.ts).
  //
  // The shape is checked HERE rather than at the call site, because this is
  // the single place every caller must pass through. The demonstration inbox
  // used to hand its fixture ids straight to this method as though they were
  // credentials; with a real backend that produced a 422 and a signer staring
  // at "One or more fields contain invalid values". Guarding the call site
  // would have fixed that one caller. Guarding here fixes every caller there
  // will ever be.
  async bootstrap(token: string): Promise<BootstrapResult> {
    if (!isSigningAccessToken(token)) {
      throw new NotASigningTokenError();
    }
    return recipientApiRequest<BootstrapResult>("/signing-access/bootstrap", {
      method: "POST",
      body: { token },
    });
  }

  /**
   * Opens the ceremony from a code minted by "Continue signing" in the app.
   *
   * The code proves the signed-in account re-entered its password; the
   * server then bootstraps from the recipient's own grant, so every check
   * the emailed link passes applies here unchanged. Single use, two minutes.
   */
  async continueFromApp(code: string): Promise<BootstrapResult> {
    if (!/^[A-Za-z0-9_-]{22}$/.test(code)) throw new NotASigningTokenError();
    return recipientApiRequest<BootstrapResult>("/signing-access/continue", {
      method: "POST",
      body: { code },
    });
  }

  async context(): Promise<SigningContext> {
    return recipientApiRequest<SigningContext>("/signing/context");
  }

  // Records a first-entry timestamp server-side (a real, one-time side
  // effect) — call once per session, not on every poll. Use read() for
  // subsequent refreshes/polls.
  async enter(): Promise<CeremonyView> {
    return recipientApiRequest<CeremonyView>("/signing/ceremony/enter", { method: "POST" });
  }

  // Safe to poll — writes nothing.
  async read(): Promise<CeremonyView> {
    return recipientApiRequest<CeremonyView>("/signing/ceremony");
  }

  async acceptConsent(consentVersion: string): Promise<CeremonyView> {
    return recipientApiRequest<CeremonyView>("/signing/ceremony/consent", {
      method: "POST",
      body: { consentVersion },
    });
  }

  /**
   * One attempt at the sender's identity check. The route exists only where
   * the check is switched on; the body names the kind of ID and how the
   * selfie was taken, and nothing else.
   */
  async submitIdentityCheck(input: IdentityCheckSubmission): Promise<IdentityCheckResult> {
    return recipientApiRequest<IdentityCheckResult>("/signing/identity-check", {
      method: "POST",
      body: {
        idType: input.idType,
        capture: input.capture,
        consent: true,
        ...(input.testOutcome === undefined ? {} : { testOutcome: input.testOutcome }),
      },
    });
  }

  /**
   * HOSTED FLOW. Opens a visit to the identity verification partner's page.
   * The body is the participant's agreement and nothing else. Refused with
   * 409 `identity_check_not_required`, `identity_check_locked`,
   * `identity_check_unavailable` (also when the partner cannot be reached) or
   * `identity_name_mismatch` (passed, and waiting on the sender about the name).
   */
  async startIdentityCheckSession(): Promise<IdentityCheckSession> {
    return recipientApiRequest<IdentityCheckSession>("/signing/identity-check/session", {
      method: "POST",
      body: { consent: true },
    });
  }

  /**
   * HOSTED FLOW. Asks the partner where the check stands and brings the
   * ceremony up to date with the answer.
   *
   * NO body, on purpose: the client then sends no JSON content type either,
   * and the server answers 400 to a JSON content type with nothing after it.
   */
  async refreshIdentityCheckSession(): Promise<IdentityCheckSessionStatus> {
    return recipientApiRequest<IdentityCheckSessionStatus>(
      "/signing/identity-check/session/refresh", { method: "POST" });
  }

  /**
   * Asks for a link that continues the identity check on a phone. Same
   * session, cookies and CSRF token as the attempt itself. Refused (409) with
   * the same codes as an attempt when the check is no longer wanted, is
   * locked, or is not available.
   */
  async createIdentityHandoff(): Promise<IdentityHandoff> {
    return recipientApiRequest<IdentityHandoff>("/signing/identity-check/handoff", { method: "POST" });
  }

  // Safe to poll: writes nothing.
  async identityHandoffStatus(handoffId: string): Promise<IdentityHandoffStatus> {
    return recipientApiRequest<IdentityHandoffStatus>(
      `/signing/identity-check/handoff/${encodeURIComponent(handoffId)}`);
  }

  // Streams the PDF; the caller builds an object URL from the blob for an
  // inline viewer and must revoke it on unmount.
  async documentBlob(): Promise<Blob> {
    return fetchRecipientDocumentBlob();
  }
}

export const realSigningAccessService = new RealSigningAccessService();

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
  authenticationMethod: "link-only";
  authenticatedAt: string;
}

export interface SigningContext {
  authenticated: true;
  signingRequestId: string;
  authenticationMethod: "link-only";
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
  };
  consent: {
    required: boolean;
    accepted: boolean;
    type: string;
    requiredVersion: string;
    acceptedVersion: string | null;
    acceptedAt: string | null;
  };
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

  // Streams the PDF; the caller builds an object URL from the blob for an
  // inline viewer and must revoke it on unmount.
  async documentBlob(): Promise<Blob> {
    return fetchRecipientDocumentBlob();
  }
}

export const realSigningAccessService = new RealSigningAccessService();

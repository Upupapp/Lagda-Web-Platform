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

class RealSigningAccessService {
  // `token` is the 43-char opaque credential taken from the /sign/:token
  // path segment of the emailed link — never sent as a query param, per the
  // backend's link builder (security/signing-delivery.ts).
  async bootstrap(token: string): Promise<BootstrapResult> {
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

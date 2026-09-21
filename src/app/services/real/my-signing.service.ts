// The signed-in account's own signing lists (backend migrations 055, 056).
//
//   GET  /me/documents-to-sign            what is waiting for this account
//   GET  /me/signed-documents             what this account has signed
//   POST /me/documents-to-sign/continue   the second verification
//
// Account-scoped, not workspace-scoped: these are documents OTHER people sent
// to this account, from any workspace. Uses the workspace client (apiRequest)
// because the caller is the signed-in account; the ceremony itself is then
// opened by the signing page through the recipient client.

import { apiRequest } from "../api-client";

export interface DocumentToSign {
  signingRequestId: string;
  recipientId: string;
  documentTitle: string;
  senderName: string | null;
  senderEmail: string | null;
  workspaceName: string | null;
  invitedAt: string;
  expiresAt: string;
}

export interface SignedDocument {
  signingRequestId: string;
  documentTitle: string;
  senderName: string | null;
  senderEmail: string | null;
  workspaceName: string | null;
  signedAt: string;
}

export interface ContinueSigningResult {
  /** Single use, two minutes. Passed to the signing page in the URL fragment. */
  code: string;
  expiresAt: string;
}

class RealMySigningService {
  async documentsToSign(): Promise<DocumentToSign[]> {
    const res = await apiRequest<{ items: DocumentToSign[] }>("/me/documents-to-sign");
    return res.items;
  }

  async signedDocuments(): Promise<SignedDocument[]> {
    const res = await apiRequest<{ items: SignedDocument[] }>("/me/signed-documents");
    return res.items;
  }

  /** @param currentPassword The second verification, re-proved now. */
  async continueSigning(
    item: Pick<DocumentToSign, "signingRequestId" | "recipientId">,
    currentPassword: string,
  ): Promise<ContinueSigningResult> {
    return apiRequest<ContinueSigningResult>("/me/documents-to-sign/continue", {
      method: "POST",
      body: {
        signingRequestId: item.signingRequestId,
        recipientId: item.recipientId,
        currentPassword,
      },
    });
  }
}

export const realMySigningService = new RealMySigningService();

/** Where "Proceed to signing" goes. The code rides in the fragment, never sent to a server. */
export function continueSigningPath(code: string): string {
  return `/sign/continue#${encodeURIComponent(code)}`;
}

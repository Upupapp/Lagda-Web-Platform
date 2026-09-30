// The signed-in account's own signing lists (backend migrations 055, 056).
//
//   GET  /me/documents-to-sign            what is waiting for this account
//   GET  /me/signed-documents             what this account has signed
//   POST /me/documents-to-sign/continue   the second verification
//   GET  /me/other-documents/completed    completed documents in another role
//   GET  /me/participant-documents/:verificationId/branding/logo
//
// Account-scoped, not workspace-scoped: these are documents OTHER people sent
// to this account, from any workspace. Uses the workspace client (apiRequest)
// because the caller is the signed-in account; the ceremony itself is then
// opened by the signing page through the recipient client.

import { apiRequest } from "../api-client";
import { API_BASE_URL } from "../backend-flag";

export interface DocumentToSign {
  signingRequestId: string;
  recipientId: string;
  documentTitle: string;
  /** The role on the request. Null only for an entry from before the role was recorded — a signer's. */
  recipientType: string | null;
  senderName: string | null;
  senderEmail: string | null;
  workspaceName: string | null;
  invitedAt: string;
  expiresAt: string;
  /**
   * The SENDER workspace's banner — present when this account's verified
   * address is a recipient of the request. Absent from an older server, and
   * null when it cannot be shown; the card then uses the default colour.
   */
  branding?: SenderBranding | null;
}

export interface SenderBranding {
  displayName: string;
  primaryColor: string | null;
  logo: { version: string; width: number; height: number } | null;
}

/**
 * A completed document as its participant sees it: the verification ID that
 * opens the signed copy, participants and audit trail, and the owner
 * workspace's banner. Only for a completed request the account took part in.
 */
export interface ParticipantCompletion {
  verificationId: string;
  completedAt: string;
  participants: number;
  completed: number;
  branding: {
    displayName: string;
    primaryColor: string | null;
    logo: { version: string; width: number; height: number } | null;
  };
}

export interface SignedDocument {
  signingRequestId: string;
  documentTitle: string;
  senderName: string | null;
  senderEmail: string | null;
  workspaceName: string | null;
  signedAt: string;
  /** Null until every participant has finished. */
  completion: ParticipantCompletion | null;
}

/** "Others" once done: a non-signer role on a completed document. */
export interface CompletedOtherDocument extends DocumentToSign {
  completion: ParticipantCompletion;
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

  async completedOtherDocuments(): Promise<CompletedOtherDocument[]> {
    const res = await apiRequest<{ items: CompletedOtherDocument[] }>("/me/other-documents/completed");
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

/** "I must sign" is a signer's list; every other role is listed under "Others". */
export function isSignerEntry(item: Pick<DocumentToSign, "recipientType">): boolean {
  return item.recipientType === null || item.recipientType === "signer";
}

/** Roles that act in the ceremony and so can continue from the app. */
export function canContinueFromApp(item: Pick<DocumentToSign, "recipientType">): boolean {
  return item.recipientType === "approver" || item.recipientType === "reviewer"
    || item.recipientType === "acknowledgment-recipient" || isSignerEntry(item);
}

/** Where "Proceed to signing" goes. The code rides in the fragment, never sent to a server. */
export function continueSigningPath(code: string): string {
  return `/sign/continue#${encodeURIComponent(code)}`;
}

/** The owner's logo on a participant's completed-document card, or null. */
export function participantLogoUrl(completion: ParticipantCompletion): string | null {
  if (completion.branding.logo === null || API_BASE_URL === null) return null;
  return `${API_BASE_URL}/me/participant-documents/${encodeURIComponent(completion.verificationId)}`
    + `/branding/logo?v=${encodeURIComponent(completion.branding.logo.version)}`;
}

/** The sender workspace's logo on an "I must sign" card, or null. */
export function senderLogoUrl(item: Pick<DocumentToSign, "signingRequestId" | "branding">): string | null {
  const logo = item.branding?.logo ?? null;
  if (logo === null || API_BASE_URL === null) return null;
  return `${API_BASE_URL}/me/documents-to-sign/${encodeURIComponent(item.signingRequestId)}`
    + `/branding/logo?v=${encodeURIComponent(logo.version)}`;
}

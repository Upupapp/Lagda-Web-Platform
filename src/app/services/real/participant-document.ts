// A participant's own completed document — "Signed by me" and "Others".
//
// Opens the signed copy, participants and audit trail through the same grant
// the Verify page uses for a signed-in participant: POST
// /verifications/:id/member-access returns a short-lived access token when the
// account's verified email is on the document, and the token reads
// /details and /document. The grant is kept per document until shortly before
// it expires, and fetched once more if the server says it has lapsed.

import { ApiError } from "../api-client";
import type { DocumentRecordSource } from "../../components/document-sharing/SharedDocumentDialog";
import type { SharedDocumentDetails } from "./document-sharing.service";
import {
  requestMemberAccess, fetchVerificationDetails, fetchSignedDocument,
  type VerificationDetails, type WireTime,
} from "./public-verification.service";

const RENEW_BEFORE_MS = 30_000;

interface CachedGrant { readonly token: string; readonly expiresAt: number }
const grants = new Map<string, CachedGrant>();

const toMillis = (value: WireTime): number =>
  typeof value === "number" ? value : Date.parse(value);

function failure(status: number, message: string): ApiError {
  return new ApiError(status, undefined, message);
}

async function grantFor(verificationId: string, fresh = false): Promise<string> {
  const cached = grants.get(verificationId);
  if (!fresh && cached !== undefined && cached.expiresAt - RENEW_BEFORE_MS > Date.now()) return cached.token;
  const result = await requestMemberAccess(verificationId);
  if (result.kind === "granted") {
    grants.set(verificationId, { token: result.grant.accessToken, expiresAt: toMillis(result.grant.expiresAt) });
    return result.grant.accessToken;
  }
  grants.delete(verificationId);
  if (result.kind === "denied") throw failure(403, "This document is not available to your account.");
  if (result.kind === "rate-limited") throw failure(429, "Too many attempts. Try again in a moment.");
  throw failure(0, "We couldn't reach LAGDA. Check your connection and try again.");
}

function toDetails(details: VerificationDetails): SharedDocumentDetails {
  return {
    documentTitle: details.documentTitle,
    completedAt: toMillis(details.completedAt),
    sealedDigest: details.sealedDigest,
    participants: details.participants.map(p => ({
      name: p.name,
      maskedEmail: p.maskedEmail,
      recipientType: p.recipientType,
      status: p.status as SharedDocumentDetails["participants"][number]["status"],
      actedAt: p.actedAt === null ? null : toMillis(p.actedAt),
      routingOrder: p.routingOrder,
    })),
    events: details.events.map(e => ({ type: e.type, label: e.label, at: toMillis(e.at) })),
  };
}

/** Runs `read` with a grant; on an expired grant, once more with a fresh one. */
async function withGrant<T>(
  verificationId: string,
  read: (token: string) => Promise<{ kind: "ok"; value: T } | { kind: "expired" | "rate-limited" | "error" }>,
): Promise<T> {
  for (const fresh of [false, true]) {
    const result = await read(await grantFor(verificationId, fresh));
    if (result.kind === "ok") return result.value;
    if (result.kind === "rate-limited") throw failure(429, "Too many attempts. Try again in a moment.");
    if (result.kind === "error") break;
  }
  throw failure(0, "We couldn't open this document. Try again in a moment.");
}

export function participantDocumentSource(verificationId: string, documentTitle: string): DocumentRecordSource {
  return {
    key: verificationId,
    documentTitle,
    loadDetails: () => withGrant(verificationId, async token => {
      const result = await fetchVerificationDetails(verificationId, token);
      return result.kind === "ok" ? { kind: "ok", value: toDetails(result.details) } : result;
    }),
    loadFile: () => withGrant(verificationId, async token => {
      const result = await fetchSignedDocument(verificationId, token);
      if (result.kind !== "ok") return result;
      const blob = result.blob.type ? result.blob : new Blob([result.blob], { type: result.mediaType });
      return { kind: "ok", value: blob };
    }),
  };
}

/** Test seam: forget cached grants. */
export function resetParticipantGrants(): void {
  grants.clear();
}

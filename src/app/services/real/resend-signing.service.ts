// Sending a document out for signing again.
//
// ── This creates a NEW transaction, and it has to ─────────────────────────
//
// There is no endpoint that adds a recipient to a request already sent, and
// there should not be. A sent request carries a snapshot of exactly who was
// asked and what they were shown; a completed one is evidence. Editing that
// list after the fact would rewrite history rather than extend it.
//
// So a re-send is a SECOND signing request over the same document. The
// original keeps its own snapshot, its own audit trail and its own completed
// artifact, untouched. The two are separate records of separate events,
// because that is what they are.
//
// ── Why the document's recipients are replaced ────────────────────────────
//
// `POST /documents/{id}/signing-requests` takes an EMPTY body on purpose:
// "the signing configuration is snapshotted from the document's preparation,
// never supplied by the caller". Recipients therefore belong to the document,
// and the only way to aim a new request at different people is to change the
// document's list before snapshotting it.
//
// That is a real mutation of current state, and the caller should say so in
// the UI. What it does NOT touch is any request already created: those hold
// their own copies, which is precisely the property that makes this safe.
//
// ── One transaction for the recipient change ───────────────────────────
//
// The recipient list is replaced by a single PUT that the server applies
// atomically: the list becomes exactly what was sent, or nothing changes.
// Creating and sending the request follow as two more calls. A failure
// there leaves a DRAFT request on a correctly configured document — visible,
// resumable and safe — rather than a document pointing at a recipient list
// nobody chose.

import { realRecipientService } from "./recipient.service";
import { realSigningRequestService } from "./signing-request.service";

export interface ResendRecipient {
  readonly name: string;
  readonly email: string;
}

export interface ResendResult {
  readonly signingRequestId: string;
  readonly sentTo: number;
}

/** The most addresses one re-send will accept. */
export const MAX_RESEND_RECIPIENTS = 25;

/**
 * Deliberately permissive, and NOT the authority.
 *
 * The server validates addresses properly; this exists so somebody who types
 * "a@b" with no dot is told before the request is built, rather than after
 * three network calls have already mutated the document.
 */
export function looksLikeEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 5
    && trimmed.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/**
 * Parses whatever the sender pasted into a list of addresses.
 *
 * Accepts commas, semicolons, newlines and spaces, because people paste from
 * a mail client, a spreadsheet and a chat message and all three arrive
 * differently. Duplicates are collapsed case-insensitively — sending the same
 * person two links from one action is never what was meant.
 */
export function parseRecipients(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of raw.split(/[,;\s]+/)) {
    const value = piece.trim();
    if (value.length === 0) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

/** A display name for an address the sender gave us no name for. */
function nameFor(email: string): string {
  const local = email.slice(0, email.indexOf("@"));
  return local.length > 0 ? local : email;
}

class ResendSigningService {
  /**
   * Points the document at these recipients and sends a fresh request.
   *
   * Every network call is awaited in sequence rather than in parallel: they
   * are not independent — the request snapshots whatever the recipient list
   * is at the moment it is created, so a create racing an add would snapshot
   * a half-written list.
   */
  async resend(
    workspaceId: string,
    documentId: string,
    recipients: readonly ResendRecipient[],
  ): Promise<ResendResult> {
    if (recipients.length === 0) {
      throw new Error("Add at least one email address.");
    }
    if (recipients.length > MAX_RESEND_RECIPIENTS) {
      throw new Error(`A single send is limited to ${MAX_RESEND_RECIPIENTS} recipients.`);
    }

    // One call, one transaction. This replaced list-then-add-then-remove —
    // four separately committing requests that failed in two ways on any
    // real document:
    //
    //   "already has a recipient with that email address" — the add ran
    //   before the remove, so re-sending to the same person collided with
    //   that person.
    //
    //   "Remove this recipient's fields before removing them" — every sent
    //   document has a signature field, and a signer who owns fields cannot be
    //   deleted. So no re-send could ever remove the previous signer.
    //
    // The server now keeps anybody already listed and hands a departing
    // signer's fields to their replacement, so the fields already placed are
    // kept and nobody has to place them again.
    await realRecipientService.replaceAll(workspaceId, documentId,
      recipients.map(recipient => ({
        name: recipient.name.trim().length > 0 ? recipient.name.trim() : nameFor(recipient.email),
        email: recipient.email.trim(),
        type: "signer" as const,
        isRequired: true,
      })));

    const created = await realSigningRequestService.create(
      workspaceId, documentId, crypto.randomUUID());

    if (created.state === "draft") {
      await realSigningRequestService.markReadyToSend(workspaceId, created.signingRequestId);
    }

    await realSigningRequestService.send(
      workspaceId, created.signingRequestId, crypto.randomUUID());

    return { signingRequestId: created.signingRequestId, sentTo: recipients.length };
  }
}

export const resendSigningService = new ResendSigningService();

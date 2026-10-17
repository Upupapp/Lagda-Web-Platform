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
//
// ── The identity check goes with the new list ─────────────────────────────
//
// Who must pass "ID and face verification" is kept by the participant's
// EMAIL on the document. Change the addresses and the requirement is left
// behind on the old ones: the new person skips the check and nothing says so.
//
// So when the caller passes `identity`, the complete set for the NEW list is
// saved after the recipients are replaced and BEFORE the request is created.
// If it cannot be saved, nothing is created and nothing is sent. A re-send
// must never go out with the check silently dropped.

import { realRecipientService, type RealRecipient } from "./recipient.service";
import { realSigningRequestService } from "./signing-request.service";
import { sendOptionsFor, type RequestChoices } from "./resend-choices";
import { realIdentityCheckService, describeIdentityRequirementError } from "./identity-check.service";
import { ApiError } from "../api-client";

export interface ResendRecipient {
  readonly name: string;
  readonly email: string;
}

export interface ResendResult {
  readonly signingRequestId: string;
  readonly sentTo: number;
  /**
   * The title the new request went out under, as the server reports it. The
   * server numbers a re-send ("Lease (2)") so it can be told apart from the
   * earlier one. Null from a server that does not say.
   */
  readonly documentTitle: string | null;
}

/** Who must pass the identity check on the list being sent to. */
export interface ResendIdentity {
  /** The COMPLETE set of addresses that must pass. `[]`: nobody. */
  readonly emails: readonly string[];
  /**
   * Addresses the sender allowed a lighter method earlier and now wants asked
   * again. The server keeps a waiver for as long as the address stays in the
   * set, so these are taken out and put back.
   */
  readonly askAgain?: readonly string[];
}

export interface ResendOptions {
  /** Absent: the identity check is not offered here, and nothing is saved. */
  readonly identity?: ResendIdentity;
  /**
   * What the request being repeated was sent with (see resend-choices.ts).
   * Absent: the new request goes out with the defaults, as it always did.
   */
  readonly choices?: RequestChoices;
}

/** The identity check could not be saved for the new list. Nothing was sent. */
export class ResendIdentityNotSavedError extends Error {
  constructor(reason: string) {
    super(`ID and face verification could not be saved, so nothing was sent. ${reason}`);
    this.name = "ResendIdentityNotSavedError";
  }
}

const emailKey = (email: string) => email.trim().toLowerCase();

/**
 * Makes the document's set exactly `identity.emails`, or throws.
 *
 * `listed` is everyone on the new recipient list. It matters for one case
 * only: a server that will not change the set once the document's last
 * request has ended. There, the send may still go ahead if what the server
 * ALREADY holds for these people is what was asked for, since nothing would
 * be dropped or added. Anything else stops the send.
 */
async function saveIdentityRequirements(
  workspaceId: string, documentId: string, identity: ResendIdentity, listed: readonly string[],
): Promise<void> {
  const wanted = [...new Set(identity.emails.map(emailKey))];
  const askAgain = new Set((identity.askAgain ?? []).map(emailKey).filter(email => wanted.includes(email)));
  try {
    if (askAgain.size > 0) {
      await realIdentityCheckService.replaceRequirements(
        workspaceId, documentId, wanted.filter(email => !askAgain.has(email)));
    }
    await realIdentityCheckService.replaceRequirements(workspaceId, documentId, wanted);
  } catch (cause) {
    const closed = cause instanceof ApiError && cause.body?.code === "identity_requirement_not_editable";
    if (closed && askAgain.size === 0) {
      const held = await realIdentityCheckService.requirements(workspaceId, documentId).catch(() => null);
      if (held !== null) {
        const onList = new Set(listed.map(emailKey));
        const heldForList = held.map(item => emailKey(item.email)).filter(email => onList.has(email));
        const same = heldForList.length === wanted.length && heldForList.every(email => wanted.includes(email));
        if (same) return;
      }
    }
    throw new ResendIdentityNotSavedError(describeIdentityRequirementError(cause, wanted));
  }
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

/** Roles that can act — a re-send needs at least one of them to go anywhere. */
const ACTING_TYPES = new Set(["signer", "approver", "reviewer", "acknowledgment-recipient"]);

export function canResendTo(participants: readonly { type: string }[]): boolean {
  return participants.some(participant => ACTING_TYPES.has(participant.type));
}

class ResendSigningService {
  /** Who the document currently goes to — the people a re-send would reach. */
  async currentParticipants(workspaceId: string, documentId: string): Promise<RealRecipient[]> {
    return realRecipientService.list(workspaceId, documentId);
  }

  /**
   * Sends a fresh request to the SAME participants, minus any the sender left
   * out. Each keeps their role, routing step and placed fields; a left-out
   * person's fields are REMOVED rather than handed to someone else.
   */
  async resendToSame(
    workspaceId: string,
    documentId: string,
    keep: readonly RealRecipient[],
    options: ResendOptions = {},
  ): Promise<ResendResult> {
    if (!canResendTo(keep)) {
      throw new Error("Keep at least one person who signs, approves, reviews or acknowledges.");
    }
    await realRecipientService.replaceAll(workspaceId, documentId,
      keep.map(participant => ({
        name: participant.name,
        email: participant.email,
        organization: participant.organization,
        type: participant.type,
        isRequired: participant.isRequired,
        routingOrder: participant.routingOrder,
      })),
      { departingFields: "remove" });
    return this.sendCurrent(workspaceId, documentId, keep.map(participant => participant.email), options);
  }

  /**
   * The recipient list is in place. Saves the identity check for it (when
   * asked to), and only then creates and sends the new request.
   */
  private async sendCurrent(
    workspaceId: string, documentId: string, listed: readonly string[], options: ResendOptions,
  ): Promise<ResendResult> {
    if (options.identity !== undefined) {
      await saveIdentityRequirements(workspaceId, documentId, options.identity, listed);
    }
    const created = await realSigningRequestService.create(
      workspaceId, documentId, crypto.randomUUID());
    if (created.state === "draft") {
      await realSigningRequestService.markReadyToSend(workspaceId, created.signingRequestId);
    }
    // Left empty while every choice is a default, so a plain send again is
    // the request it always was.
    const carried = sendOptionsFor(options.choices);
    await realSigningRequestService.send(
      workspaceId, created.signingRequestId, crypto.randomUUID(),
      ...(Object.keys(carried).length === 0 ? [] : [carried]));
    const title = typeof created.documentTitle === "string" ? created.documentTitle.trim() : "";
    return {
      signingRequestId: created.signingRequestId,
      sentTo: listed.length,
      documentTitle: title === "" ? null : title,
    };
  }

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
    options: ResendOptions = {},
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

    return this.sendCurrent(workspaceId, documentId, recipients.map(recipient => recipient.email), options);
  }
}

export const resendSigningService = new ResendSigningService();

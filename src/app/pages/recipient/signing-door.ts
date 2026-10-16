// Why a signing link did not open, as the server now says it (110).
//
// The server used to collapse every closed door into one "this link is no
// longer valid", so a participant whose document had been cancelled, declined
// or completed was told only that their link was broken, and wrote to the
// sender to ask what had happened. It now names the reason, for a real link
// only: a string that is not a credential still gets the collapsed answer.
//
// The code arrives two ways. Opening the link (`/signing-access/bootstrap`,
// `/signing-access/continue`) answers with it as the error's own code. A
// ceremony refused after it opened answers `signing_ceremony_unavailable`
// and carries it in `details[0]`, against the field `signingRequest`.
//
// The screens say what is true and nothing the server's text says: that text
// is never shown here.

import { ApiError } from "../../services/api-client";

/** A door this page has its own screen for. */
export type SigningDoor =
  | "cancelled" | "declined" | "expired" | "completed" | "already-acted";

const DOOR_OF_CODE: Readonly<Record<string, SigningDoor>> = {
  signing_request_cancelled: "cancelled",
  signing_request_declined: "declined",
  signing_request_expired: "expired",
  signing_request_completed: "completed",
  signing_recipient_already_acted: "already-acted",
};

/**
 * The door an error names, or null for anything else — not their turn yet,
 * an unusable link, an ended session — which keeps the screen it had.
 */
export function signingDoorOf(err: unknown): SigningDoor | null {
  if (!(err instanceof ApiError) || err.body === undefined) return null;
  const own = DOOR_OF_CODE[err.body.code];
  if (own !== undefined) return own;
  if (err.body.code !== "signing_ceremony_unavailable") return null;
  const detail = err.body.details?.find(d => d.field === "signingRequest") ?? err.body.details?.[0];
  return detail === undefined ? null : DOOR_OF_CODE[detail.code] ?? null;
}

/** What a participant did, for "You have already …". Null when not known. */
function actedPhrase(recipientType: string | null): string | null {
  switch (recipientType) {
    case "signer": return "signed";
    case "approver": return "approved";
    case "reviewer": return "reviewed";
    case "acknowledgment-recipient": case "acknowledger": return "acknowledged";
    default: return null;
  }
}

export interface DoorScreen {
  readonly badge: string;
  readonly title: string;
  readonly description: string;
  /** "danger" for a request that ended without being completed. */
  readonly tone: "danger" | "warn" | "success" | "neutral";
}

/**
 * The screen for one door. `recipientType` is known only when the ceremony
 * had already opened; a link refused at the door does not say who it was for.
 */
export function doorScreen(door: SigningDoor, recipientType: string | null = null): DoorScreen {
  switch (door) {
    case "cancelled":
      return {
        badge: "Cancelled", tone: "warn",
        title: "The sender cancelled this request",
        description: "This document can no longer be signed. Nothing more is needed from you. "
          + "If you were expecting to sign it, contact the sender.",
      };
    case "declined":
      return {
        badge: "Declined", tone: "warn",
        title: "This request was declined",
        description: "A participant declined, so this document will not be completed and can no "
          + "longer be signed. Nothing more is needed from you.",
      };
    case "expired":
      return {
        badge: "Expired", tone: "warn",
        title: "This request has expired",
        description: "The signing deadline the sender set has passed, so this document can no "
          + "longer be signed. If it still needs your signature, ask the sender to send it again.",
      };
    case "completed":
      return {
        badge: "Complete", tone: "success",
        title: "This document is complete",
        description: "Everyone has finished, and nothing more is needed from you. You will "
          + "receive a copy if the sender shares it.",
      };
    case "already-acted": {
      const did = actedPhrase(recipientType);
      return {
        badge: "Done", tone: "success",
        title: did === null ? "You have already done your part" : `You have already ${did} this document`,
        description: "Nothing more is needed from you. The document is still waiting for others.",
      };
    }
  }
}

// What the sender is told about a request's progress, in one place: a final
// document that could not be produced (109), what became of telling a
// participant they may continue (110), and reminders (111).
//
// Kept apart from the dialogs so each sentence is written once and tested on
// its own. None of these ever shows the server's own message: each code the
// server can answer with has its words here, and anything else falls back to
// a sentence that is true whatever went wrong.

import { ApiError } from "../../services/api-client";
import type { SignatoryReminders, RequestReminders } from "../../services/real/signing-request.service";
import type { ParticipantNotice } from "../../services/real/identity-check.service";

// ── 109. A final document that could not be produced ──────────────────────

export const COMPLETION_FAILED_TITLE = "Could not finalize";
export const COMPLETION_FAILED_SENTENCE =
  "Every signature is safe, but the final signed document could not be produced. Try again, and nobody needs to sign again.";
export const COMPLETION_FINALIZING_SENTENCE =
  "Everyone has signed. The final signed document is being produced.";

/** What the sender is told after pressing Try again. */
export function describeRetryOutcome(restarted: boolean): string {
  return restarted
    ? "Trying again. The final document is being produced."
    : "It is already being produced. Check again in a minute.";
}

export function describeRetryError(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.body?.code === "signing_completion_not_retryable") {
      return "This document can't be finalized again right now. Reload the list to see where it stands.";
    }
    if (cause.status === 404 || cause.status === 403) {
      return "You don't have permission to finalize this document. Ask the person who sent it, or a workspace administrator.";
    }
    if (cause.status === 0) return "Could not reach LAGDA. Check your connection and try again.";
  }
  return "That did not work. Try again in a moment.";
}

// ── 110. Telling a participant they can continue ──────────────────────────


/**
 * What became of telling `name` they may continue, after a lighter method
 * was allowed or their name accepted. Null: the call told nobody and there is
 * nothing to add. `offerNewLink`: it is their turn and their link has ended.
 */
export function describeParticipantNotice(
  notice: ParticipantNotice | undefined, name: string,
): { text: string; offerNewLink: boolean } | null {
  switch (notice) {
    case "sent":
      return { text: `We emailed ${name} that they can continue.`, offerNewLink: false };
    case "already-sent":
      return { text: `${name} has already been emailed that they can continue.`, offerNewLink: false };
    case "not-waiting":
      return { text: `Nothing is waiting on ${name} right now, so no email was sent.`, offerNewLink: false };
    case "link-lapsed":
      return {
        text: `${name}'s signing link has ended, so they were not emailed. Send them a new link to continue.`,
        offerNewLink: true,
      };
    default:
      return null;
  }
}

// ── 111. Reminders ────────────────────────────────────────────────────────

function fmt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-PH", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila",
  });
}

/**
 * One participant's reminders, as a line: "Reminders: 1 of 3 sent · last …
 * · next …". For someone the request is waiting on, with reminders known.
 */
export function describeSignatoryReminders(
  mine: SignatoryReminders, policy: RequestReminders, now: number = Date.now(),
): string {
  if (!policy.enabled) return "Reminders are off for this document";
  const parts = [`Reminders: ${String(mine.sentCount)} of ${String(policy.maxAutomatic)} sent`];
  // A sender's own reminders are not among the automatic ones; said apart,
  // so "0 of 3 sent" beside a reminder sent a minute ago is not a puzzle.
  if (mine.manualSentCount > 0) parts.push(`${String(mine.manualSentCount)} sent manually`);
  if (mine.lastSentAt !== null) parts.push(`last ${fmt(mine.lastSentAt)}`);
  if (mine.nextDueAt === null) parts.push("no more reminders");
  else if (Date.parse(mine.nextDueAt) <= now) parts.push("next within the hour");
  else parts.push(`next ${fmt(mine.nextDueAt)}`);
  return parts.join(" · ");
}

/** The days, as the sender set them: "first after 3 days, then every 3 days". */
export function describeReminderDays(first: number, every: number): string {
  const days = (n: number) => `${String(n)} day${n === 1 ? "" : "s"}`;
  return `first after ${days(first)}, then every ${days(every)}`;
}

/** The fixed rule, said wherever reminders can be switched on. */
export const REMINDER_RULE =
  "Up to 3 reminders, until they act. Reminders stop when the document is completed, declined, cancelled or expires.";

const MANUAL_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Why "Send a reminder now" was refused, from `details[0].code`.
 * `lastSentAt` lets "too soon" name the hour; `offerNewLink` says the
 * participant's link has ended.
 */
export function describeReminderRefusal(
  cause: unknown, lastSentAt: string | null,
): { text: string; offerNewLink: boolean } {
  if (cause instanceof ApiError) {
    const code = cause.body?.code === "signing_reminder_not_sendable"
      ? cause.body.details?.find(d => d.field === "reminder")?.code ?? cause.body.details?.[0]?.code
      : undefined;
    switch (code) {
      case "too-soon": {
        const last = lastSentAt === null ? Number.NaN : Date.parse(lastSentAt);
        return Number.isNaN(last)
          ? { text: "A reminder was sent less than an hour ago. Wait an hour before reminding them again.", offerNewLink: false }
          : { text: `You can send the next reminder after ${fmt(new Date(last + MANUAL_INTERVAL_MS).toISOString())}.`, offerNewLink: false };
      }
      case "limit-reached":
        return { text: "You have sent the most reminders allowed for this turn (10). They can still sign from their email.", offerNewLink: false };
      case "link-lapsed":
        return { text: "Their signing link has ended, so a reminder would not work. Send them a new link instead.", offerNewLink: true };
      case "delivery-failed":
        return { text: "Their last email could not be delivered — check the address.", offerNewLink: false };
      case "not-their-turn":
        return { text: "It is not their turn yet. They will be emailed when it is.", offerNewLink: false };
      case "request-not-open":
        return { text: "This document is no longer out for signature, so there is no one to remind.", offerNewLink: false };
      default:
        break;
    }
    if (cause.status === 404 || cause.status === 403) {
      return { text: "You don't have permission to send reminders for this document.", offerNewLink: false };
    }
    if (cause.status === 0) return { text: "Could not reach LAGDA. Check your connection and try again.", offerNewLink: false };
  }
  return { text: "The reminder could not be sent. Try again in a moment.", offerNewLink: false };
}

/** Why the request's reminder settings could not be saved. */
export function describeReminderSettingsError(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.body?.code === "signing_reminders_not_configurable") {
      return "Reminders can be changed only while the document is out for signature and before its deadline.";
    }
    if (cause.body?.code === "reminder_settings_invalid" || cause.status === 422) {
      return "Each interval must be a whole number of days from 1 to 30.";
    }
    if (cause.status === 404 || cause.status === 403) {
      return "You don't have permission to change reminders for this document.";
    }
    if (cause.status === 0) return "Could not reach LAGDA. Check your connection and try again.";
  }
  return "The reminder settings could not be saved. Try again in a moment.";
}

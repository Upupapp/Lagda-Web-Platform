// What "send again" keeps from the request it repeats (073, 111).
//
// Sending a document again creates a NEW signing request. That request used
// to go out with an empty body, so it always emailed participants the
// completed document and always had reminders on (3 days, then every 3),
// whatever the sender had chosen the first time. It now carries those two
// choices over.
//
// They are read from the previous request's progress view, the one place the
// server reports them. A previous request that cannot be read (an older
// server, a network error, a request the sender no longer has authority
// over) is not an error here: the new one is sent with today's defaults,
// exactly as before, and nothing is said.

import { realSigningRequestService } from "./signing-request.service";
import { REMINDER_DEFAULTS, sameReminderSettings, type ReminderSettings } from "./reminder-settings";

/** The sender's two choices that outlive one request. */
export interface RequestChoices {
  /** Participants are emailed the completed document when everyone has finished. */
  readonly emailFinalCopy: boolean;
  readonly reminders: ReminderSettings;
}

/**
 * The previous request's choices, or null when they cannot be read. A server
 * that reports only one of the two still gives that one; the other is the
 * default, which is what it would have been.
 */
export async function readPreviousChoices(
  workspaceId: string, signingRequestId: string,
): Promise<RequestChoices | null> {
  try {
    const view = await realSigningRequestService.signatures(workspaceId, signingRequestId);
    if (view.shareFinalCopy === undefined && view.reminders === undefined) return null;
    return {
      emailFinalCopy: view.shareFinalCopy !== false,
      reminders: view.reminders === undefined
        ? REMINDER_DEFAULTS
        : {
          enabled: view.reminders.enabled,
          firstAfterDays: view.reminders.firstAfterDays,
          everyDays: view.reminders.everyDays,
        },
    };
  } catch {
    return null;
  }
}

/**
 * What to pass `send` for these choices: nothing at all while they are the
 * defaults, so a default send is the empty body (and idempotency fingerprint)
 * it always was; `shareFinalCopy: false` and the whole `reminders` object only
 * where they differ.
 */
export function sendOptionsFor(choices: RequestChoices | undefined): {
  shareFinalCopy?: false; reminders?: ReminderSettings;
} {
  if (choices === undefined) return {};
  return {
    ...(choices.emailFinalCopy ? {} : { shareFinalCopy: false as const }),
    ...(sameReminderSettings(choices.reminders, REMINDER_DEFAULTS) ? {} : { reminders: choices.reminders }),
  };
}

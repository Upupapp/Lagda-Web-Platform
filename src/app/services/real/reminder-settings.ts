// What a sender chooses about reminders for one request (111), and the
// server's own defaults for it. Its own module so that code which only needs
// these (the resend flow) does not depend on the whole signing request
// service.

/** 111. What the sender chose for one request's reminders. */
export interface ReminderSettings {
  enabled: boolean;
  /** Whole days from the start of a participant's turn to their first reminder. */
  firstAfterDays: number;
  /** Whole days between one reminder and the next. */
  everyDays: number;
}

/** 111. What a new request gets when the sender says nothing; the server's own. */
export const REMINDER_DEFAULTS: ReminderSettings = { enabled: true, firstAfterDays: 3, everyDays: 3 };
export const REMINDER_DAYS_MIN = 1;
export const REMINDER_DAYS_MAX = 30;
/** The server's fixed limit on automatic reminders per turn, for copy written before one is read. */
export const REMINDER_MAX_AUTOMATIC = 3;

/** Whether two reminder settings say the same thing. */
export function sameReminderSettings(a: ReminderSettings, b: ReminderSettings): boolean {
  return a.enabled === b.enabled && a.firstAfterDays === b.firstAfterDays && a.everyDays === b.everyDays;
}

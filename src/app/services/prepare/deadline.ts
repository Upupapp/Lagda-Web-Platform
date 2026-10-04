// A signing deadline, from the date a sender picks to the instant the server
// keeps.
//
// The Prepare flow asks for a DATE, not a time. "Expires 20 October" means
// the signer has all of 20 October, so the instant is the END of that day —
// and the day is the Philippine one (UTC+8, no daylight saving), whatever
// zone the sender's browser happens to be in. A deadline that moved by eight
// hours when a sender travelled would be a different promise to the signer.

const MANILA_OFFSET = "+08:00";

/** `YYYY-MM-DD` → the last second of that day in Manila, as an ISO instant. Null for anything else. */
export function deadlineFromDate(date: string | null | undefined): string | null {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const at = Date.parse(`${date}T23:59:59${MANILA_OFFSET}`);
  return Number.isNaN(at) ? null : new Date(at).toISOString();
}

/** An ISO instant → the Manila calendar date it falls on, `YYYY-MM-DD` (for a date input). */
export function dateOfDeadline(iso: string | null | undefined): string {
  if (typeof iso !== "string") return "";
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return "";
  return new Date(at + 8 * 3_600_000).toISOString().slice(0, 10);
}

/** Today's date in Manila, `YYYY-MM-DD` — the earliest a deadline can be. */
export function todayInManila(now: number = Date.now()): string {
  return new Date(now + 8 * 3_600_000).toISOString().slice(0, 10);
}

/** "October 20, 2026", read in Manila. */
export function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Manila" });
}

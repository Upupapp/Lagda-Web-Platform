// How long an invitation has left, in words and colours.
//
// The server counts `secondsLeft` when it answers; the page counts down from
// there on its own clock and re-syncs on every answer. `ExpiryClock` holds that
// arrangement: the offset between the server's idea of "now" and this device's,
// worked out from each answer, so a device with a wrong clock still shows the
// right time left.

export type ExpiryTone = "calm" | "amber" | "red" | "ended";

const HOUR = 3_600_000;
export const AMBER_UNDER_MS = 24 * HOUR;
export const RED_UNDER_MS = 3 * HOUR;

/** Calm above a day, amber under 24 hours, red under 3 hours, ended at zero. */
export function expiryTone(msLeft: number): ExpiryTone {
  if (msLeft <= 0) return "ended";
  if (msLeft < RED_UNDER_MS) return "red";
  if (msLeft < AMBER_UNDER_MS) return "amber";
  return "calm";
}

/** "2 d 23 h 59 m" above a day, "5 h 04 m 09 s" under it, "12 m 30 s", "45 s". */
export function countdownText(msLeft: number): string {
  if (msLeft <= 0) return "Expired";
  const total = Math.floor(msLeft / 1000);
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${String(d)} d ${String(h)} h ${String(m)} m`;
  if (h > 0) return `${String(h)} h ${two(m)} m ${two(s)} s`;
  if (m > 0) return `${String(m)} m ${two(s)} s`;
  return `${String(s)} s`;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Mon 20 Oct, 9:14 AM" in this device's time. Empty for a time that cannot be read. */
export function expiryLabel(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const hours = at.getHours();
  const clock = `${String(hours % 12 === 0 ? 12 : hours % 12)}:${String(at.getMinutes()).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
  return `${DAYS[at.getDay()] ?? ""} ${String(at.getDate())} ${MONTHS[at.getMonth()] ?? ""}, ${clock}`;
}

/** A date and time for the timeline: "20 Oct 2026, 9:14 AM". */
export function stampLabel(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const hours = at.getHours();
  const clock = `${String(hours % 12 === 0 ? 12 : hours % 12)}:${String(at.getMinutes()).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
  return `${String(at.getDate())} ${MONTHS[at.getMonth()] ?? ""} ${String(at.getFullYear())}, ${clock}`;
}

/**
 * Time left on an invitation, kept in step with the server.
 *
 * Every answer says `secondsLeft` at the moment the server sent it; the end
 * moment is then `receivedAt + secondsLeft`, whatever this device's clock says
 * the date is. Between answers the page counts from `Date.now()`.
 */
export class ExpiryClock {
  private endsAt = 0;

  /** Re-syncs from an answer. `receivedAt` is this device's time as it arrived. */
  sync(secondsLeft: number, receivedAt: number = Date.now()): void {
    this.endsAt = receivedAt + Math.max(0, secondsLeft) * 1000;
  }

  msLeft(now: number = Date.now()): number {
    return Math.max(0, this.endsAt - now);
  }
}

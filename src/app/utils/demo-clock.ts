// Deterministic demonstration clock for LAGDA frontend fixtures.
// Prevents fixture dates from becoming nonsensical over time.
// Tests override BASE_DATE to get stable, date-independent results.

// ── Base date ─────────────────────────────────────────────────────────────────
// The canonical "now" for all fixture calculations.
// Change this value when generating new fixture sets; do not use Date.now().

let BASE_DATE: Date = new Date("2026-07-16T08:00:00+08:00"); // Asia/Manila

export function setDemoBaseDate(d: Date): void {
  BASE_DATE = d;
}

export function resetDemoBaseDate(): void {
  BASE_DATE = new Date("2026-07-16T08:00:00+08:00");
}

// ── Core access ───────────────────────────────────────────────────────────────

export function demoNow(): Date {
  return new Date(BASE_DATE.getTime());
}

export function demoNowIso(): string {
  return BASE_DATE.toISOString();
}

// ── Relative construction ─────────────────────────────────────────────────────

export function demoDaysAgo(n: number): Date {
  const d = demoNow();
  d.setDate(d.getDate() - n);
  return d;
}

export function demoDaysFromNow(n: number): Date {
  const d = demoNow();
  d.setDate(d.getDate() + n);
  return d;
}

export function demoHoursAgo(n: number): Date {
  return new Date(BASE_DATE.getTime() - n * 3_600_000);
}

export function demoMinutesAgo(n: number): Date {
  return new Date(BASE_DATE.getTime() - n * 60_000);
}

// ── ISO string helpers ────────────────────────────────────────────────────────

export function isoDaysAgo(n: number): string {
  return demoDaysAgo(n).toISOString();
}

export function isoDaysFromNow(n: number): string {
  return demoDaysFromNow(n).toISOString();
}

export function isoHoursAgo(n: number): string {
  return demoHoursAgo(n).toISOString();
}

export function isoMinutesAgo(n: number): string {
  return demoMinutesAgo(n).toISOString();
}

// ── Display formatting ────────────────────────────────────────────────────────

const DATE_FORMAT = new Intl.DateTimeFormat("en-PH", {
  year: "numeric", month: "short", day: "numeric",
  timeZone: "Asia/Manila",
});

const DATETIME_FORMAT = new Intl.DateTimeFormat("en-PH", {
  year: "numeric", month: "short", day: "numeric",
  hour: "2-digit", minute: "2-digit",
  timeZone: "Asia/Manila",
});

const TIME_FORMAT = new Intl.DateTimeFormat("en-PH", {
  hour: "2-digit", minute: "2-digit",
  timeZone: "Asia/Manila",
});

export function formatDemoDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso));
}

export function formatDemoDateTime(iso: string): string {
  return DATETIME_FORMAT.format(new Date(iso));
}

export function formatDemoTime(iso: string): string {
  return TIME_FORMAT.format(new Date(iso));
}

export function formatRelative(iso: string): string {
  const ms = BASE_DATE.getTime() - new Date(iso).getTime();
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDemoDate(iso);
}

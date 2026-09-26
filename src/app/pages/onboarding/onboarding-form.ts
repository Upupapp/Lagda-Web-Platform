// Plain (non-component) helpers shared by the onboarding steps: style
// tokens, input styling and the Profile step's rules. Kept out of the .tsx
// component files so Fast Refresh keeps working on them.

import type { CSSProperties } from "react";
import type { DateFormatPreference, ProfileDraft, TimeFormatPreference } from "../../models/auth";

export const GF: CSSProperties = { fontFamily: "'Geist', sans-serif" };
export const AZURE = "#0078D4";
export const NAVY = "#07111F";

export const INPUT_STYLE: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#FFFFFF",
  border: "1px solid #CBD5E1",
  borderRadius: 8,
  color: NAVY,
  ...GF,
  fontSize: 16,
  minHeight: 44,
  padding: "10px 14px",
  outline: "none",
};

export function inputStyle(hasError: boolean): CSSProperties {
  return {
    ...INPUT_STYLE,
    borderColor: hasError ? "#C0392B" : "#CBD5E1",
    background: hasError ? "#FEF2F2" : "#FFFFFF",
  };
}

/** aria-describedby for an input rendered inside <Field>. */
export function describedBy(id: string, error: string | undefined, hasHint = false): string | undefined {
  if (error) return `${id}-err`;
  return hasHint ? `${id}-hint` : undefined;
}


// ── Profile step ────────────────────────────────────────────────────────────

export const NAME_MAX = 200;

export const FALLBACK_TIME_ZONES = [
  "Asia/Manila", "Asia/Singapore", "Asia/Hong_Kong", "Asia/Tokyo", "Asia/Seoul",
  "Asia/Shanghai", "Asia/Jakarta", "Asia/Bangkok", "Asia/Kolkata", "Asia/Dubai",
  "Australia/Sydney", "Australia/Perth", "Pacific/Auckland",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Toronto", "America/Sao_Paulo", "UTC",
];

let cachedZones: string[] | null = null;

/** Every IANA zone the browser knows, falling back to a short list. */
export function listTimeZones(): string[] {
  if (cachedZones) return cachedZones;
  let zones: string[] = [];
  try {
    const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
    zones = typeof intl.supportedValuesOf === "function" ? intl.supportedValuesOf("timeZone") : [];
  } catch {
    zones = [];
  }
  if (zones.length === 0) zones = FALLBACK_TIME_ZONES;
  // Some engines omit "UTC" from supportedValuesOf; it is a real choice.
  cachedZones = zones.includes("UTC") ? zones : [...zones, "UTC"];
  return cachedZones;
}

export function zoneLabel(zone: string): string {
  return zone.replace(/_/g, " ");
}

export const DATE_FORMATS: { value: Exclude<DateFormatPreference, "">; label: string }[] = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

export const TIME_FORMATS: { value: Exclude<TimeFormatPreference, "">; label: string }[] = [
  { value: "12h", label: "12-hour" },
  { value: "24h", label: "24-hour" },
];

export type ProfileField = "fullName" | "displayName" | "timeZone" | "jobTitle" | "department" | "preferredSenderName";
export type ProfileErrors = Partial<Record<ProfileField, string>>;

export const FIELD_IDS: Record<ProfileField, string> = {
  fullName: "ob-full-name",
  displayName: "ob-display-name",
  timeZone: "ob-tz",
  jobTitle: "ob-job-title",
  department: "ob-department",
  preferredSenderName: "ob-sender-name",
};

export function validateProfile(p: ProfileDraft, zones: readonly string[]): ProfileErrors {
  const e: ProfileErrors = {};
  const full = p.fullName.trim();
  if (full.length < 2) e.fullName = "Enter your full name — at least 2 characters.";
  else if (full.length > NAME_MAX) e.fullName = `Full name can be at most ${NAME_MAX} characters.`;
  const display = p.displayName.trim();
  if (!display) e.displayName = "Enter a display name.";
  else if (display.length > NAME_MAX) e.displayName = `Display name can be at most ${NAME_MAX} characters.`;
  if (!p.timeZone || !zones.includes(p.timeZone)) e.timeZone = "Choose your time zone.";
  for (const key of ["jobTitle", "department", "preferredSenderName"] as const) {
    if (p[key].trim().length > NAME_MAX) e[key] = `Keep this under ${NAME_MAX} characters.`;
  }
  return e;
}

export function orNull(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}


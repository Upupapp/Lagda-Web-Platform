// The settings sections, in banner order.
//
// My Settings (/app/settings) holds the six PERSONAL sections. The workspace
// sections are listed here too because their pages still draw their heading
// with SettingsPage, but they live under Workspace now — Branding, Billing &
// Plan, Usage and Integrations behind its gear (/app/workspace/settings/*),
// Organization units under Organisation. Their old /app/settings addresses
// redirect (see LegacySettingsRedirect).
//
// One list drives the My Settings carousel, the security tab row and the
// "which section is this path in" question, so none of them can disagree
// about what exists or where it lives.

import type { LucideIcon } from "lucide-react";
import {
  UserRound, SlidersHorizontal, ShieldCheck, Bell, PenLine, Database,
  Palette, CreditCard, BarChart3, Network, Puzzle, Gem, ScanFace,
} from "lucide-react";
import { isCapabilityInActiveProfile } from "../../../config/capability-resolver";

export const SETTINGS_ROOT = "/app/settings";

export type SettingsGroup = "personal" | "workspace";

export type SettingsSectionKey =
  | "profile" | "preferences" | "security" | "identity" | "notifications" | "signatures" | "data-and-privacy" | "plan"
  | "branding" | "billing" | "usage" | "organization" | "integrations";

export interface SettingsSection {
  key: SettingsSectionKey;
  label: string;
  /** One line on what the section is for. Tooltip on the banner; text on the overview. */
  hint: string;
  path: string;
  icon: LucideIcon;
  group: SettingsGroup;
  /** Shown only when this capability is in the active launch profile. */
  capability?: string;
}

const p = (key: string) => `${SETTINGS_ROOT}/${key}`;
const ws = (key: string) => `/app/workspace/settings/${key}`;

export const ALL_SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { key: "profile", label: "Profile", hint: "Your name, photo and sender name", path: p("profile"), icon: UserRound, group: "personal" },
  { key: "preferences", label: "Preferences", hint: "Time zone, date and number formats", path: p("preferences"), icon: SlidersHorizontal, group: "personal" },
  { key: "security", label: "Security", hint: "Password, two-step verification and sessions", path: p("security"), icon: ShieldCheck, group: "personal" },
  { key: "notifications", label: "Notifications", hint: "Which emails LAGDA sends you", path: p("notifications"), icon: Bell, group: "personal" },
  { key: "signatures", label: "Signatures & Initials", hint: "The signature and initials you apply to documents", path: p("signatures"), icon: PenLine, group: "personal" },
  { key: "data-and-privacy", label: "Data & Privacy", hint: "What LAGDA keeps about you, and your requests", path: p("data-and-privacy"), icon: Database, group: "personal" },
  { key: "plan", label: "Plan & Billing", hint: "Your plan, the Free document and upgrading", path: p("plan"), icon: Gem, group: "personal" },
  { key: "branding", label: "Branding", hint: "Logo, colour and sender display", path: ws("branding"), icon: Palette, group: "workspace" },
  { key: "billing", label: "Billing & Plan", hint: "This workspace's plan (its owner's) and invoices", path: ws("billing"), icon: CreditCard, group: "workspace" },
  { key: "usage", label: "Usage", hint: "Signing requests, documents and storage this month", path: ws("usage"), icon: BarChart3, group: "workspace" },
  { key: "organization", label: "Organization Units", hint: "Departments, offices and titles", path: "/app/workspace/organization", icon: Network, group: "workspace" },
  // Post-launch; its route is capability-guarded, so its tab is not shown
  // where the page would be a dead end.
  { key: "integrations", label: "Integrations", hint: "Connected apps — coming soon", path: ws("integrations"), icon: Puzzle, group: "workspace", capability: "integrations" },
];

/** The sections of My Settings: the personal ones, in carousel order. */
export const SETTINGS_SECTIONS: readonly SettingsSection[] =
  ALL_SETTINGS_SECTIONS.filter(s => s.group === "personal" && (!s.capability || isCapabilityInActiveProfile(s.capability)));

/**
 * "Identity verification": verifying your own account. Kept out of the lists
 * above because it is not a section every account has: it is shown only once
 * the server says this account is offered it (hooks/useAccountFeatures), and
 * then it sits after Security.
 */
export const IDENTITY_SECTION: SettingsSection = {
  key: "identity", label: "Identity verification", hint: "Verify who you are, once, for your account",
  path: p("identity"), icon: ScanFace, group: "personal",
};

/** The My Settings carousel for this account: Identity verification after Security where it is offered. */
export function settingsSectionsFor(identityAvailable: boolean): readonly SettingsSection[] {
  if (!identityAvailable) return SETTINGS_SECTIONS;
  const at = SETTINGS_SECTIONS.findIndex(s => s.key === "security") + 1;
  return [...SETTINGS_SECTIONS.slice(0, at), IDENTITY_SECTION, ...SETTINGS_SECTIONS.slice(at)];
}

export const SETTINGS_GROUP_LABELS: Record<SettingsGroup, string> = {
  personal: "Personal",
  workspace: "Workspace",
};

/**
 * The section a settings path belongs to — a My Settings path or the new
 * home of a workspace section. Null on the My Settings overview, on
 * Workspace › General, and anywhere else.
 */
export function settingsSectionForPath(pathname: string): SettingsSection | null {
  return [...ALL_SETTINGS_SECTIONS, IDENTITY_SECTION]
    .find(s => pathname === s.path || pathname.startsWith(`${s.path}/`)) ?? null;
}

// ── Security tabs ──────────────────────────────────────────────────────────

export interface SecurityTab { path: string; label: string }

export const SECURITY_TABS: readonly SecurityTab[] = [
  { path: p("security"), label: "Overview" },
  { path: p("security/password"), label: "Password" },
  { path: p("security/mfa"), label: "Two-step verification" },
  { path: p("security/sessions"), label: "Sessions" },
  { path: p("security/activity"), label: "Activity" },
];

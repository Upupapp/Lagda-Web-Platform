// The settings section map, the sample plan catalogue, and the guarantee that
// the public pricing plans still carry no prices.

import { describe, it, expect } from "vitest";
import { settingsSectionForPath, ALL_SETTINGS_SECTIONS, SECURITY_TABS } from "../sections";
import { isLiveSettingsPath } from "../SettingsShell";
import { movedSettingsPath } from "../LegacySettingsRedirect";
import {
  LAGDA_PLANS, COMPARE_GROUPS, SAMPLE_PLANS, SAMPLE_COMPARE_GROUPS, CURRENT_PLAN, currentPlanLimits,
  annualSaving, formatPeso,
} from "../../../../config/pricing.config";
import { buildSampleInvoice, SAMPLE_INVOICE_TOTAL } from "../billing/sample-invoice";
import { normalizeWorkspaceUsage } from "../../../../services/real/workspace-usage.service";
import { normalizeNotificationPreferences } from "../../../../services/real/notification-preferences.service";

describe("settings sections", () => {
  it("maps every settings path, including sub-pages, to its section", () => {
    expect(settingsSectionForPath("/app/settings")).toBeNull();
    expect(settingsSectionForPath("/app/settings/profile")?.key).toBe("profile");
    expect(settingsSectionForPath("/app/settings/security/mfa")?.key).toBe("security");
    expect(settingsSectionForPath("/app/workspace/settings/billing/invoices/INV-SAMPLE-0001")?.key).toBe("billing");
    expect(settingsSectionForPath("/app/workspace/settings/branding")?.key).toBe("branding");
    expect(settingsSectionForPath("/app/workspace/organization")?.key).toBe("organization");
    expect(settingsSectionForPath("/app/settings/nope")).toBeNull();
    expect(settingsSectionForPath("/app/workspace")).toBeNull();
    expect(settingsSectionForPath("/app/workspace/settings")).toBeNull();
  });

  it("sends every moved settings address to its new home, keeping the rest of the path", () => {
    expect(movedSettingsPath("/app/settings/branding")).toBe("/app/workspace/settings/branding");
    expect(movedSettingsPath("/app/settings/billing")).toBe("/app/workspace/settings/billing");
    expect(movedSettingsPath("/app/settings/billing/invoices/INV-SAMPLE-0001")).toBe("/app/workspace/settings/billing/invoices/INV-SAMPLE-0001");
    expect(movedSettingsPath("/app/settings/usage")).toBe("/app/workspace/settings/usage");
    expect(movedSettingsPath("/app/settings/integrations/slack")).toBe("/app/workspace/settings/integrations/slack");
    expect(movedSettingsPath("/app/settings/organization")).toBe("/app/workspace/organization");
    expect(movedSettingsPath("/app/settings/profile")).toBeNull();
    expect(movedSettingsPath("/app/settings")).toBeNull();
  });

  it("groups seven personal and five workspace sections, with Integrations capability-gated", () => {
    expect(ALL_SETTINGS_SECTIONS.filter(s => s.group === "personal").map(s => s.label)).toEqual(
      ["Profile", "Preferences", "Security", "Notifications", "Signatures & Initials", "Data & Privacy", "Plan & Billing"]);
    expect(ALL_SETTINGS_SECTIONS.filter(s => s.group === "workspace").map(s => s.label)).toEqual(
      ["Branding", "Billing & Plan", "Usage", "Organization Units", "Integrations"]);
    expect(ALL_SETTINGS_SECTIONS.find(s => s.key === "integrations")?.capability).toBe("integrations");
    expect(SECURITY_TABS.map(t => t.label)).toEqual(["Overview", "Password", "Two-step verification", "Sessions", "Activity"]);
  });

  it("is live everywhere but Integrations with a backend, and nowhere without one", () => {
    expect(isLiveSettingsPath("/app/settings/notifications", true)).toBe(true);
    expect(isLiveSettingsPath("/app/workspace/settings/integrations", true)).toBe(false);
    expect(isLiveSettingsPath("/app/workspace/settings/branding", true)).toBe(true);
    expect(isLiveSettingsPath("/app/settings/profile", false)).toBe(false);
  });
});

describe("pricing config", () => {
  it("leaves the public plans without prices", () => {
    expect(LAGDA_PLANS.map(p => p.id)).toEqual(["personal", "business", "enterprise"]);
    for (const p of LAGDA_PLANS) { expect(p.monthlyPrice).toBeNull(); expect(p.annualPrice).toBeNull(); }
    expect(JSON.stringify(COMPARE_GROUPS)).not.toContain("₱");
  });

  it("carries the four sample plans with their prices and limits", () => {
    expect(SAMPLE_PLANS.map(p => p.name)).toEqual(["Free", "Personal", "Business", "Enterprise"]);
    const [free, personal, business, enterprise] = SAMPLE_PLANS;
    expect(free?.price).toEqual({ monthly: 0, annual: 0, perUser: false });
    expect(personal?.price).toEqual({ monthly: 299, annual: 2990, perUser: false });
    expect(business?.price).toEqual({ monthly: 799, annual: 7990, perUser: true });
    expect(enterprise?.price).toBeNull();
    expect(business?.mostPopular).toBe(true);
    expect(SAMPLE_PLANS.map(p => p.limits.signingRequestsPerMonth.label)).toEqual(["1 document in total", "50", "200 per user", "Custom"]);
    expect(SAMPLE_PLANS.map(p => p.limits.users.label)).toEqual(["1", "1", "Up to 50", "Unlimited"]);
    expect(SAMPLE_PLANS.map(p => p.limits.storageBytes.label)).toEqual(["500 MB", "5 GB", "50 GB shared", "Custom"]);
    expect(SAMPLE_PLANS.map(p => p.limits.templates.label)).toEqual(["3", "25", "Unlimited shared", "Unlimited"]);
    expect(SAMPLE_PLANS.map(p => p.support)).toEqual(["Help Center", "Email", "Priority email", "Dedicated"]);
    expect(SAMPLE_PLANS.map(p => p.trial)).toEqual([null, null, null, "Demo"]);
    expect(SAMPLE_PLANS.map(p => p.branding)).toEqual([false, true, true, true]);
    expect(annualSaving({ monthly: 299, annual: 2990, perUser: false })).toBe(598);
    expect(formatPeso(7990)).toBe("₱7,990");
  });

  it("derives every comparison cell from the plans", () => {
    const rows = SAMPLE_COMPARE_GROUPS.flatMap(g => g.rows);
    for (const row of rows) for (const plan of SAMPLE_PLANS) expect(row.cell(plan)).not.toBeUndefined();
    expect(rows.find(r => r.id === "signer-auth")?.cell(SAMPLE_PLANS[3]!)).toBe("+ SSO");
  });

  it("applies no limits beyond the Free document (enforced by the server)", () => {
    expect(CURRENT_PLAN.name).toBe("Early Access");
    expect(currentPlanLimits()).toBeNull();
  });
});

describe("sample invoice", () => {
  it("is the Business annual price with 12% VAT included", () => {
    const inv = buildSampleInvoice("Ana Reyes");
    expect(SAMPLE_INVOICE_TOTAL).toBe(7990);
    expect(inv.total).toBe(7990);
    expect(inv.subtotal).toBe(7133.93);
    expect(inv.vat).toBe(856.07);
    expect(inv.audit.map(a => a.event)).toEqual(["Issued", "Viewed", "Marked as sample"]);
  });
});

describe("response normalisers", () => {
  it("reads missing usage figures as zero", () => {
    const u = normalizeWorkspaceUsage({}, Date.UTC(2026, 8, 15));
    expect(u.signingRequests.sentThisMonth).toBe(0);
    expect(u.storageBytes).toBe(0);
    expect(u.period.end).toBeGreaterThan(u.period.start);
  });

  it("keeps notification defaults for missing keys and drops unknown ones", () => {
    const p = normalizeNotificationPreferences({ signerActivity: false, extra: true });
    expect(p.signerActivity).toBe(false);
    expect(p.invitations).toBe(true);
    expect(p.updatedAt).toBeNull();
    expect("extra" in p).toBe(false);
  });
});

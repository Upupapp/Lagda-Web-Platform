// Settings with a real backend (fetch mocked): the banner shell, and every
// section reading and writing the account endpoints it is wired to.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const platform = {
  role: "owner" as string | null,
  user: { id: "u1", email: "ana@example.com", displayName: "Ana Reyes", fullName: "Ana Reyes", jobTitle: "Partner", role: "owner" as const },
  currentWorkspace: { id: "ws_1", name: "Reyes Law Office" } as { id: string; name: string } | null,
  refreshSessionFromBackend: vi.fn(),
};
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform, announceProfileChanged: vi.fn() }));

import { SettingsLayout } from "../SettingsShell";
import { SettingsOverviewPage } from "../SettingsOverviewPage";
import { PreferencesPage } from "../PreferencesPage";
import { SecurityOverviewPage } from "../SecurityOverviewPage";
import { PasswordPage } from "../PasswordPage";
import { MfaPage } from "../MfaPage";
import { SessionsPage } from "../SessionsPage";
import { SecurityActivityPage } from "../SecurityActivityPage";
import { NotificationsPage } from "../NotificationsPage";
import { UsagePage } from "../UsagePage";
import { PlanBillingPage } from "../PlanBillingPage";
import { BillingPage } from "../BillingPage";
import { InvoicePage } from "../billing/InvoicePage";
import { DataPrivacyPage } from "../DataPrivacyPage";
import { SETTINGS_SECTIONS } from "../sections";
import { ROLE_CAPABILITIES } from "../../../../models/workspace-role-policy";
import { resetPlanStore } from "../../../../hooks/usePlans";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const NOW = Date.now();
const DAY = 86_400_000;

let me: Record<string, unknown>;
let notif: Record<string, unknown>;
let role: string;
let failNotificationPatch = false;
let workspacePlan = "business";
let workspacePlanOwnerIsYou = true;
let invoices: Record<string, unknown>[] = [];
const calls: { method: string; path: string; body: unknown }[] = [];

const USAGE = {
  period: { start: Date.UTC(2026, 8, 1), end: Date.UTC(2026, 9, 1) },
  documents: { total: 17, uploadedThisMonth: 4 },
  signingRequests: { sentThisMonth: 3, sentTotal: 21, inProgress: 2, completedThisMonth: 1, completedTotal: 15 },
  members: 3, templates: 5, contacts: 12, verificationsThisMonth: 6, storageBytes: 12_400_000,
};

const SESSIONS = [
  { sessionId: "s_here", createdAt: NOW - 2 * DAY, lastSeenAt: NOW - 60_000, expiresAt: NOW + 28 * DAY, isCurrent: true },
  { sessionId: "s_old", createdAt: NOW - 9 * DAY, lastSeenAt: NOW - 3 * DAY, expiresAt: NOW + 21 * DAY, isCurrent: false },
  { sessionId: "s_mid", createdAt: NOW - 5 * DAY, lastSeenAt: NOW - DAY, expiresAt: NOW + 25 * DAY, isCurrent: false },
];

beforeEach(() => {
  resetPlanStore();
  workspacePlan = "business";
  workspacePlanOwnerIsYou = true;
  invoices = [
    { number: "LAGDA-2026-0002", requestId: "pur_2", plan: "business", planName: "Business", amountPesos: 799, issuedAt: "2026-09-20T01:00:00.000Z", periodEnd: "2026-10-20T01:00:00.000Z" },
    { number: "LAGDA-2026-0001", requestId: "pur_1", plan: "personal", planName: "Personal", amountPesos: 299, issuedAt: "2026-08-20T01:00:00.000Z", periodEnd: "2026-09-20T01:00:00.000Z" },
  ];
  calls.length = 0;
  role = "owner";
  failNotificationPatch = false;
  me = {
    userId: "u1", email: "ana@example.com", emailVerified: true,
    profile: { fullName: "Ana Reyes", displayName: "Ana Reyes", jobTitle: null, department: null, preferredSenderName: null },
    preferences: { timezone: "Asia/Manila", locale: null, language: null, dateFormat: null, timeFormat: "12h", numberFormat: null, appearance: null, density: null, documentListView: null },
    security: { mfaEnabled: false, mfaFactor: null, recoveryCodesRemaining: null },
    avatar: null, createdAt: NOW - 90 * DAY,
  };
  notif = { signerActivity: true, requestCompleted: true, actionReminders: true, workspaceRequests: true, invitations: true, updatedAt: null };
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? "GET";
    const path = url.replace("http://api.test", "").replace(/\?.*$/, "");
    const body: unknown = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ method, path, body });
    if (path === "/me" && method === "GET") return Promise.resolve(json(200, me));
    if (path === "/me/preferences" && method === "PATCH") {
      me = { ...me, preferences: { ...(me.preferences as object), ...(body as object) } };
      return Promise.resolve(json(200, me));
    }
    if (path === "/me/password" && method === "POST") {
      const b = body as { currentPassword: string };
      if (b.currentPassword !== "right-password") return Promise.resolve(json(401, { error: { code: "INVALID_CREDENTIALS", message: "That password is incorrect." } }));
      return Promise.resolve(json(200, { status: "changed", otherSessionsRevoked: 2 }));
    }
    if (path === "/me/sessions") return Promise.resolve(json(200, { sessions: SESSIONS }));
    if (path === "/me/sessions/revoke") {
      const b = body as { sessionId?: string };
      return Promise.resolve(json(200, { revoked: b.sessionId ? 1 : 2, signedOut: false }));
    }
    if (path === "/me/notification-preferences" && method === "GET") return Promise.resolve(json(200, notif));
    if (path === "/me/notification-preferences" && method === "PATCH") {
      if (failNotificationPatch) return Promise.resolve(json(500, { error: { code: "server_error", message: "boom" } }));
      notif = { ...notif, ...(body as object), updatedAt: NOW };
      return Promise.resolve(json(200, notif));
    }
    if (path === "/workspaces/ws_1/access") {
      return Promise.resolve(json(200, { workspaceId: "ws_1", membershipId: "m1", role, capabilities: ROLE_CAPABILITIES[role as "owner"], roleTitle: null }));
    }
    if (path === "/workspaces/ws_1/usage") return Promise.resolve(json(200, USAGE));
    // 093. The workspace's plan is its owner's.
    if (path === "/workspaces/ws_1/plan") return Promise.resolve(json(200, { plan: workspacePlan, ownerIsYou: workspacePlanOwnerIsYou, ownerName: "Carmen Reyes", paidUntil: "2026-10-30T09:00:00.000Z" }));
    if (path === "/me/plan/invoices") return Promise.resolve(json(200, { invoices }));
    if (/^\/me\/plan\/invoices\/[^/]+\/pdf$/.test(path)) {
      return Promise.resolve(new Response(new Blob(["%PDF-1.7 test"], { type: "application/pdf" }), { status: 200, headers: { "content-type": "application/pdf" } }));
    }
    if (path === "/me/plan") return Promise.resolve(json(200, {
      plan: "business", storedPlan: "business", paidUntil: "2026-10-30T09:00:00.000Z", autoRenew: false,
      freeDocumentsUsed: 0, freeDocumentLimit: 1, pendingRequest: null, approver: false, upgradesAvailable: true,
    }));
    if (path === "/workspaces/ws_1/members") return Promise.resolve(json(200, { members: [
      { membershipId: "m2", userId: "u9", email: "owner@reyes.ph", displayName: "Carmen Reyes", role: "owner", joinedAt: 1, isCurrentUser: false },
      { membershipId: "m1", userId: "u1", email: "ana@example.com", displayName: "Ana Reyes", role: "administrator", joinedAt: 2, isCurrentUser: true },
    ] }));
    return Promise.resolve(json(404, { error: { code: "resource_not_found", message: path } }));
  }));
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/settings" element={<SettingsLayout />}>
          <Route index element={<SettingsOverviewPage />} />
          <Route path="preferences" element={<PreferencesPage />} />
          <Route path="security" element={<SecurityOverviewPage />} />
          <Route path="security/password" element={<PasswordPage />} />
          <Route path="security/mfa" element={<MfaPage />} />
          <Route path="security/sessions" element={<SessionsPage />} />
          <Route path="security/activity" element={<SecurityActivityPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="data-and-privacy" element={<DataPrivacyPage />} />
          <Route path="plan" element={<PlanBillingPage />} />
        </Route>
        {/* Moved to Workspace › Workspace Settings; the pages are the same. */}
        <Route path="/app/workspace/settings">
          <Route path="usage" element={<UsagePage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="billing/invoices/:invoiceId" element={<InvoicePage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("settings shell", () => {
  it("Free has no Workspace, so no line pointing to it", async () => {
    workspacePlan = "free";
    renderAt("/app/settings/preferences");
    expect(await screen.findByTestId("settings-banner-preferences")).toBeInTheDocument();
    await waitFor(() => { expect(screen.queryByTestId("settings-moved-note")).toBeNull(); });
    expect(screen.queryByRole("link", { name: /Workspace Settings/ })).toBeNull();
  });

  it("shows the seven personal sections side by side, marks the current one, and no preview note", async () => {
    renderAt("/app/settings/preferences");
    expect(screen.getByRole("heading", { level: 1, name: "My Settings" })).toBeInTheDocument();
    const banners = screen.getByTestId("settings-banners");
    expect(within(banners).getAllByRole("link").map(l => l.textContent)).toEqual([
      expect.stringContaining("Profile"), expect.stringContaining("Preferences"), expect.stringContaining("Security"),
      expect.stringContaining("Notifications"), expect.stringContaining("Signatures & Initials"), expect.stringContaining("Data & Privacy"),
      expect.stringContaining("Plan & Billing"),
    ]);
    for (const s of SETTINGS_SECTIONS) expect(screen.getByTestId(`settings-banner-${s.key}`)).toHaveAttribute("href", s.path);
    // Workspace-wide settings are not here any more; a line says where they went.
    expect(screen.queryByTestId("settings-banner-branding")).toBeNull();
    expect(screen.queryByTestId("settings-banner-billing")).toBeNull();
    expect(screen.getByTestId("settings-moved-note")).toHaveTextContent("Workspace Settings");
    // The row scrolls with a button at each end.
    expect(screen.getByRole("button", { name: "Scroll sections left" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scroll sections right" })).toBeInTheDocument();
    expect(screen.getByTestId("settings-banner-preferences")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("settings-banner-profile")).not.toHaveAttribute("aria-current");
    // Roving focus: only the current banner is in the tab order.
    expect(screen.getByTestId("settings-banner-preferences")).toHaveAttribute("tabindex", "0");
    expect(screen.getByTestId("settings-banner-profile")).toHaveAttribute("tabindex", "-1");
    expect(await screen.findByRole("heading", { level: 2, name: "Preferences" })).toBeInTheDocument();
    expect(screen.queryByTestId("settings-preview-note")).toBeNull();
    expect(screen.queryByTestId("security-tabs")).toBeNull();
  });

  it("moves between banners with the arrow keys", async () => {
    const user = userEvent.setup();
    renderAt("/app/settings/preferences");
    screen.getByTestId("settings-banner-preferences").focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByTestId("settings-banner-security")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByTestId("settings-banner-profile")).toHaveFocus();
  });

  it("shows the security tab row on security pages, with the sub-page marked", async () => {
    renderAt("/app/settings/security/sessions");
    const tabs = screen.getByTestId("security-tabs");
    expect(within(tabs).getByRole("link", { name: "Sessions" })).toHaveAttribute("aria-current", "page");
    expect(within(tabs).getByRole("link", { name: "Password" })).not.toHaveAttribute("aria-current");
    // The Security banner is the current section, but not the exact page.
    expect(screen.getByTestId("settings-banner-security")).toHaveAttribute("aria-current", "true");
    await screen.findAllByTestId("session-row");
  });
});

describe("preferences", () => {
  it("loads from /me and saves only what changed", async () => {
    const user = userEvent.setup();
    renderAt("/app/settings/preferences");
    const tz = await screen.findByLabelText("Time zone");
    expect(tz).toHaveValue("Asia/Manila");
    expect(screen.getByLabelText("Time format")).toHaveValue("12h");
    await user.selectOptions(screen.getByLabelText("Date format"), "YYYY-MM-DD");
    // Appearance (theme, density) and Default view are hidden for now.
    expect(screen.queryByText("Appearance")).toBeNull();
    expect(screen.queryByText("Default view")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Save preferences/ }));
    expect(await screen.findByText("Preferences saved.")).toBeInTheDocument();
    const patch = calls.find(c => c.method === "PATCH" && c.path === "/me/preferences");
    expect(patch?.body).toEqual({ dateFormat: "YYYY-MM-DD" });
    expect(screen.getByRole("button", { name: /Save preferences/ })).toBeDisabled();
  });
});

describe("password", () => {
  it("shows a wrong current password against that field", async () => {
    const user = userEvent.setup();
    renderAt("/app/settings/security/password");
    await user.type(await screen.findByLabelText(/Current password/), "wrong-password");
    await user.type(screen.getByLabelText(/^New password/), "BrandNew#2026");
    await user.type(screen.getByLabelText(/Confirm new password/), "BrandNew#2026");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("That password is incorrect.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Current password/)).toHaveAttribute("aria-invalid", "true");
  });

  it("changes it, clears the fields and says how many other sessions were signed out", async () => {
    const user = userEvent.setup();
    renderAt("/app/settings/security/password");
    await user.type(await screen.findByLabelText(/Current password/), "right-password");
    await user.type(screen.getByLabelText(/^New password/), "BrandNew#2026");
    await user.type(screen.getByLabelText(/Confirm new password/), "BrandNew#2026");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText(/Password changed\. You stay signed in here, and 2 other sessions were signed out\./)).toBeInTheDocument();
    expect(calls.find(c => c.path === "/me/password")?.body).toEqual({ currentPassword: "right-password", newPassword: "BrandNew#2026" });
    expect(screen.getByLabelText(/Current password/)).toHaveValue("");
  });

  it("checks length and match before sending anything", async () => {
    const user = userEvent.setup();
    renderAt("/app/settings/security/password");
    await user.type(await screen.findByLabelText(/Current password/), "x");
    await user.type(screen.getByLabelText(/^New password/), "short");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("Use at least 8 characters.")).toBeInTheDocument();
    expect(calls.some(c => c.path === "/me/password")).toBe(false);
  });
});

describe("sessions", () => {
  it("lists sessions with this device first and signs out one or all others", async () => {
    const user = userEvent.setup();
    renderAt("/app/settings/security/sessions");
    const rows = await screen.findAllByTestId("session-row");
    expect(rows).toHaveLength(3);
    expect(within(rows[0] as HTMLElement).getByText("This device")).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).queryByRole("button")).toBeNull();

    await user.click(within(rows[1] as HTMLElement).getByRole("button", { name: /Sign out session/ }));
    expect(await screen.findByText("That session was signed out.")).toBeInTheDocument();
    expect(calls.find(c => c.path === "/me/sessions/revoke")?.body).toEqual({ sessionId: "s_mid" });
    expect(screen.getAllByTestId("session-row")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: /Sign out other sessions/ }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Sign out other sessions" }));
    expect(await screen.findByText(/2 sessions were signed out\./)).toBeInTheDocument();
    expect(calls.filter(c => c.path === "/me/sessions/revoke").at(-1)?.body).toEqual({});
    expect(screen.getAllByTestId("session-row")).toHaveLength(1);
  });
});

describe("two-step verification", () => {
  it("reads the status from /me and links to the setup flow when it is off", async () => {
    renderAt("/app/settings/security/mfa");
    expect(await screen.findByTestId("mfa-status")).toHaveTextContent("Off");
    expect(screen.getByTestId("mfa-setup-link")).toHaveAttribute("href", "/mfa/setup?from=settings");
  });

  it("shows it on, with the recovery codes left", async () => {
    me = { ...me, security: { mfaEnabled: true, mfaFactor: "TOTP", recoveryCodesRemaining: 7 } };
    renderAt("/app/settings/security/mfa");
    expect(await screen.findByTestId("mfa-status")).toHaveTextContent("On");
    expect(screen.getByTestId("mfa-recovery-remaining")).toHaveTextContent("7");
    expect(screen.queryByTestId("mfa-setup-link")).toBeNull();
  });
});

describe("security overview and activity", () => {
  it("summarises MFA, sessions and the honest sign-in history state", async () => {
    renderAt("/app/settings/security");
    expect(await screen.findByTestId("security-row-mfa")).toHaveTextContent("Off");
    expect(screen.getByTestId("security-row-sessions")).toHaveTextContent("3 signed in");
    expect(screen.getByTestId("security-row-activity")).toHaveTextContent("Not recorded yet");
  });

  it("says sign-in history is not recorded, and shows no events", async () => {
    renderAt("/app/settings/security/activity");
    expect(await screen.findByText("Sign-in history isn’t recorded yet")).toBeInTheDocument();
    expect(screen.queryByText(/Successful sign-in|Failed attempt/)).toBeNull();
  });
});

describe("notifications", () => {
  it("shows only the switches that control a real email, lists the always-on emails, and saves each switch on its own", async () => {
    const user = userEvent.setup();
    renderAt("/app/settings/notifications");
    const completed = await screen.findByRole("switch", { name: "Signing complete" });
    expect(completed).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("heading", { name: "Documents you send" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your workspace" })).toBeInTheDocument();
    expect(await screen.findByRole("switch", { name: "Join requests" })).toBeInTheDocument();
    // No switch for emails LAGDA does not send yet.
    expect(screen.getAllByRole("switch")).toHaveLength(2);
    expect(screen.queryByText(/signer completes or declines/)).toBeNull();
    const always = screen.getByTestId("notif-always-on");
    for (const label of ["Sign-in and verification codes", "Password resets", "Signing invitations", "Signed-copy emails",
      "Join links and join decisions", "Workspace invitations", "Document upload requests"]) {
      expect(within(always).getByText(label)).toBeInTheDocument();
    }
    expect(within(always).queryByRole("switch")).toBeNull();
    expect(screen.getByTestId("notif-more-note")).toBeInTheDocument();

    await user.click(completed);
    expect(completed).toHaveAttribute("aria-checked", "false");
    await waitFor(() => expect(calls.find(c => c.method === "PATCH")?.body).toEqual({ requestCompleted: false }));
    expect(await screen.findByText(/Last changed/)).toBeInTheDocument();
  });

  it("puts a switch back and says so when saving fails", async () => {
    const user = userEvent.setup();
    failNotificationPatch = true;
    renderAt("/app/settings/notifications");
    const completed = await screen.findByRole("switch", { name: "Signing complete" });
    await user.click(completed);
    expect(await screen.findByText(/could not be saved, so the previous setting was kept/)).toBeInTheDocument();
    expect(completed).toHaveAttribute("aria-checked", "true");
  });

  it("hides the workspace group from someone who does not manage the workspace", async () => {
    role = "member";
    platform.role = "member";
    try {
      renderAt("/app/settings/notifications");
      await screen.findByRole("switch", { name: "Signing complete" });
      await waitFor(() => expect(screen.queryByRole("switch", { name: "Join requests" })).toBeNull());
      expect(screen.queryByRole("heading", { name: "Your workspace" })).toBeNull();
    } finally {
      platform.role = "owner";
    }
  });
});

describe("usage", () => {
  it("shows the workspace's real counts, with no limit applied during Early Access", async () => {
    renderAt("/app/workspace/settings/usage");
    expect(await screen.findByTestId("usage-value-sent-month")).toHaveTextContent("3");
    expect(screen.getByTestId("usage-value-in-progress")).toHaveTextContent("2");
    expect(screen.getByTestId("usage-value-documents-total")).toHaveTextContent("17");
    expect(screen.getByTestId("usage-value-storage")).toHaveTextContent("12.4 MB");
    expect(screen.getByTestId("usage-value-members")).toHaveTextContent("3");
    expect(screen.getByTestId("usage-metric-sent-month")).toHaveTextContent("No limit applied");
    expect(screen.getByTestId("usage-period")).toHaveTextContent("September 2026");
    expect(document.body.textContent).not.toMatch(/API calls|demonstration/i);
  });

  it("shows zeros for a new workspace", async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith("/workspaces/ws_1/usage")) return Promise.resolve(json(200, { period: USAGE.period }));
      return Promise.resolve(json(404, { error: { code: "x", message: "x" } }));
    });
    renderAt("/app/workspace/settings/usage");
    expect(await screen.findByTestId("usage-value-sent-month")).toHaveTextContent("0");
    expect(screen.getByTestId("usage-value-storage")).toHaveTextContent("0 B");
  });
});

describe("billing & plan", () => {
  it("shows the workspace's plan as its owner's, with real usage lines", async () => {
    renderAt("/app/workspace/settings/billing");
    expect(await screen.findByTestId("billing-plan-summary")).toHaveTextContent("This workspace has Business features because you are on Business.");
    expect(screen.getByTestId("billing-current-plan")).toHaveTextContent("BUSINESS");
    expect(screen.getByTestId("billing-cycle")).toHaveTextContent("Monthly");
    expect(screen.getByTestId("billing-next-invoice")).toHaveTextContent("2026");
    expect(screen.getByTestId("billing-manage-plan")).toHaveAttribute("href", "/app/settings/plan");
    const lines = await screen.findByTestId("billing-usage-lines");
    expect(lines).toHaveTextContent("Signing requests this month3 (no limit applied)");
  });

  it("shows monthly test-mode prices from the plan config, marking the current plan", async () => {
    renderAt("/app/workspace/settings/billing");
    expect(screen.getByTestId("sample-pricing-notice")).toHaveTextContent("TEST MODE — NO MONEY IS MOVED");
    expect(screen.getByTestId("plan-price-free")).toHaveTextContent("₱0");
    expect(screen.getByTestId("plan-price-personal")).toHaveTextContent("₱299");
    expect(screen.getByTestId("plan-price-business")).toHaveTextContent("₱799");
    expect(within(screen.getByTestId("plan-card-enterprise")).getByText("Custom")).toBeInTheDocument();
    expect(within(screen.getByTestId("plan-card-business")).getByText("Most popular")).toBeInTheDocument();
    expect(await within(screen.getByTestId("plan-card-business")).findByText("Current plan")).toBeInTheDocument();
    expect(within(screen.getByTestId("plan-card-free")).getByText("1 document sent for signing")).toBeInTheDocument();
  });

  it("sends Choose to your own Plan & Billing, with Enterprise coming soon", async () => {
    const user = userEvent.setup();
    renderAt("/app/workspace/settings/billing");
    expect(screen.getByTestId("plan-choose-enterprise")).toHaveTextContent("Coming soon");
    expect(screen.getByTestId("plan-choose-enterprise")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Choose Personal" }));
    expect(await screen.findByRole("heading", { name: "Upgrade to Personal" })).toBeInTheDocument();
    expect(calls.some(c => c.method !== "GET")).toBe(false);
  });

  it("expands the full comparison from the same config", async () => {
    const user = userEvent.setup();
    renderAt("/app/workspace/settings/billing");
    expect(screen.queryByTestId("plan-compare")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Compare all features/ }));
    const table = screen.getByTestId("plan-compare");
    expect(within(table).getByRole("rowheader", { name: "Documents you send" })).toBeInTheDocument();
    expect(within(table).getByText("1 document in total")).toBeInTheDocument();
    expect(within(table).getByText("200 per user a month")).toBeInTheDocument();
    expect(within(table).getByText("50 GB shared")).toBeInTheDocument();
    expect(within(table).getByText("Priority email")).toBeInTheDocument();
  });

  it("lists the owner's invoices, one per approved plan change, newest first, billed to the owner", async () => {
    renderAt("/app/workspace/settings/billing");
    const list = await screen.findByTestId("invoice-list");
    const items = within(list).getAllByRole("listitem");
    expect(items.map(i => i.getAttribute("data-testid"))).toEqual(["invoice-LAGDA-2026-0002", "invoice-LAGDA-2026-0001"]);
    expect(items[0]).toHaveTextContent("Business");
    expect(items[0]).toHaveTextContent("₱799");
    expect(items[1]).toHaveTextContent("Personal");
    expect(items[1]).toHaveTextContent("Test — not paid");
    expect(await within(items[0]!).findByText(/Carmen Reyes/)).toBeInTheDocument();
    expect(within(items[0]!).getByRole("link", { name: /View/ })).toHaveAttribute("href", "/app/workspace/settings/billing/invoices/LAGDA-2026-0002");
  });

  it("says so when there are no invoices yet", async () => {
    invoices = [];
    renderAt("/app/workspace/settings/billing");
    expect(await screen.findByTestId("no-invoices")).toBeInTheDocument();
  });

  it("shows invoices to the owner only", async () => {
    workspacePlanOwnerIsYou = false;
    renderAt("/app/workspace/settings/billing");
    expect(await screen.findByTestId("invoices-owner-only")).toBeInTheDocument();
    expect(screen.queryByTestId("invoice-list")).toBeNull();
  });
});

describe("invoice page", () => {
  it("shows a test-mode invoice with VAT, status and the audit trail", async () => {
    renderAt("/app/workspace/settings/billing/invoices/LAGDA-2026-0002");
    expect(await screen.findByTestId("invoice-number")).toHaveTextContent("LAGDA-2026-0002");
    expect(screen.getByTestId("invoice-sample-banner")).toHaveTextContent("TEST MODE — NO PAYMENT HAS BEEN TAKEN");
    expect(screen.getByTestId("invoice-total")).toHaveTextContent("₱799.00");
    expect(screen.getByTestId("invoice-vat")).toHaveTextContent("₱85.61");
    expect(screen.getByTestId("invoice-status")).toHaveTextContent("Test — not paid");
    const audit = screen.getByTestId("invoice-audit");
    expect(within(audit).getAllByTestId("audit-event").map(e => e.textContent)).toEqual(["Requested", "Approved", "Issued", "Marked as test"]);
    expect(await screen.findByTestId("invoice-page-billed-name")).toHaveTextContent("Carmen Reyes");
    expect(screen.getByRole("button", { name: /Print/ })).toBeInTheDocument();
  });

  it("downloads the invoice as a PDF built by the server", async () => {
    const user = userEvent.setup();
    const created: Blob[] = [];
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: (b: Blob) => { created.push(b); return "blob:invoice"; }, revokeObjectURL: () => undefined }));
    renderAt("/app/workspace/settings/billing/invoices/LAGDA-2026-0002");
    await user.click(await screen.findByTestId("download-pdf"));
    await waitFor(() => expect(created).toHaveLength(1));
    expect(created[0]!.type).toBe("application/pdf");
    const asked = calls.find(c => c.path === "/me/plan/invoices/LAGDA-2026-0002/pdf");
    expect(asked).toBeDefined();
  });

  it("shows the LAGDA logo and the QR block", async () => {
    renderAt("/app/workspace/settings/billing/invoices/LAGDA-2026-0001");
    expect(await screen.findByTestId("invoice-logo")).toHaveAttribute("alt", "LAGDA");
    expect(screen.getByTestId("invoice-qr")).toHaveTextContent("Open this invoice in LAGDA");
  });

  it("says not found for a number that is not on the account", async () => {
    renderAt("/app/workspace/settings/billing/invoices/LAGDA-2026-0009");
    expect(await screen.findByRole("heading", { name: "Invoice not found" })).toBeInTheDocument();
  });
});

describe("overview and data & privacy", () => {
  it("summarises the profile and security, and points to where workspace settings went", async () => {
    renderAt("/app/settings");
    expect(screen.getByTestId("overview-profile-name")).toHaveTextContent("Ana Reyes");
    expect(await screen.findByTestId("overview-mfa")).toHaveTextContent("Off");
    expect(screen.getByTestId("overview-sessions")).toHaveTextContent("3");
    // The plan and usage are workspace-wide, so they moved to Workspace.
    expect(screen.queryByTestId("overview-usage")).toBeNull();
    const links = screen.getByTestId("overview-workspace-links");
    expect(within(links).getByRole("link", { name: /Organisation/ })).toHaveAttribute("href", "/app/workspace/organization");
  });

  it("offers only honest actions: contact support", () => {
    renderAt("/app/settings/data-and-privacy");
    expect(screen.getByText("Download my data")).toBeInTheDocument();
    expect(screen.getByText("Delete my account")).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: /Contact support/ });
    expect(links).toHaveLength(2);
    for (const l of links) expect(l).toHaveAttribute("href", "/contact");
    expect(screen.queryByRole("button", { name: /export|closure|delete/i })).toBeNull();
  });
});

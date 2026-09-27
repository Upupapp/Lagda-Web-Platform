// Settings in the demo build (no backend): every section still works, says it
// is a preview, and never calls the network.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: false, API_BASE_URL: null }));

const platform = {
  role: "owner" as string | null,
  user: { id: "u1", email: "ana.reyes@example.com", displayName: "Ana Reyes", role: "owner" as const },
  currentWorkspace: { id: "ws_demo", name: "Reyes & Partners" },
};
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform, announceProfileChanged: vi.fn() }));

import { SettingsLayout } from "../SettingsShell";
import { SettingsOverviewPage } from "../SettingsOverviewPage";
import { PasswordPage } from "../PasswordPage";
import { NotificationsPage } from "../NotificationsPage";
import { UsagePage } from "../UsagePage";
import { SessionsPage } from "../SessionsPage";
import { BillingPage } from "../BillingPage";

const fetchSpy = vi.fn();
beforeEach(() => { fetchSpy.mockReset(); vi.stubGlobal("fetch", fetchSpy); });

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/settings" element={<SettingsLayout />}>
          <Route index element={<SettingsOverviewPage />} />
          <Route path="security/password" element={<PasswordPage />} />
          <Route path="security/sessions" element={<SessionsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="usage" element={<UsagePage />} />
          <Route path="billing" element={<BillingPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("settings in the demo build", () => {
  it("marks the build and every section as a preview", async () => {
    renderAt("/app/settings");
    expect(screen.getByText("Demo build")).toBeInTheDocument();
    expect(screen.getByTestId("settings-preview-note")).toHaveTextContent(/not connected to an account/);
    expect(await screen.findByTestId("overview-usage")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never claims a password was changed", async () => {
    const user = userEvent.setup();
    renderAt("/app/settings/security/password");
    await user.type(screen.getByLabelText(/Current password/), "anything");
    await user.type(screen.getByLabelText(/^New password/), "BrandNew#2026");
    await user.type(screen.getByLabelText(/Confirm new password/), "BrandNew#2026");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("Demo build — no password was changed.")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps notification switches for the visit", async () => {
    const user = userEvent.setup();
    renderAt("/app/settings/notifications");
    const sw = await screen.findByRole("switch", { name: "Signing complete" });
    await user.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(/remembered for this visit only/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows sample usage, labelled as such", async () => {
    renderAt("/app/settings/usage");
    expect(await screen.findByTestId("usage-value-sent-month")).toHaveTextContent("12");
    expect(screen.getByText("Demo build — these are sample figures.")).toBeInTheDocument();
  });

  it("lists the fictional sessions without revoking anything real", async () => {
    renderAt("/app/settings/security/sessions");
    expect((await screen.findAllByTestId("session-row")).length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("bills to the signed-in user when there is no members list", () => {
    renderAt("/app/settings/billing");
    expect(screen.getByTestId("invoice-billed-name")).toHaveTextContent("Ana Reyes");
  });
});

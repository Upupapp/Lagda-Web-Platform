// The Home header: the person on the CURRENT workspace's banner — its colour,
// logo (or initials) and name — changing with the workspace, while the
// person's own details stay.

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

let workspace = { id: "ws_1", name: "Reyes Law" };
vi.mock("../../../context/PlatformContext", () => ({
  usePlatform: () => ({
    currentWorkspace: workspace,
    user: { fullName: "Ana Reyes", displayName: "Ana", email: "ana@reyes.test", jobTitle: "Partner" },
    refreshSessionFromBackend: vi.fn(),
  }),
  announceProfileChanged: vi.fn(),
}));
const snapshots: Record<string, unknown> = {
  ws_1: { displayName: "Reyes Law", primaryColor: "#0B5E3C", logoUrl: "http://api.test/logo-1.png", senderDisplayName: null, footerTagline: null, canEdit: true },
  ws_2: { displayName: "Side Firm", primaryColor: null, logoUrl: null, senderDisplayName: null, footerTagline: null, canEdit: false },
};
vi.mock("../../../hooks/workspace-branding-store", () => ({
  useWorkspaceBrandingSnapshot: (id: string | null) => (id === null ? null : snapshots[id] ?? null),
}));

import { ProfileHero } from "../ProfileHero";
import { brandGradient } from "../../../pages/platform/contacts/contacts-ui";

const renderHero = () => render(<MemoryRouter><ProfileHero /></MemoryRouter>);

describe("ProfileHero", () => {
  it("shows the person on the current workspace's colour, logo and name", () => {
    workspace = { id: "ws_1", name: "Reyes Law" };
    renderHero();
    const hero = screen.getByTestId("profile-hero");
    expect(within(hero).getByRole("heading", { level: 1, name: /Ana Reyes/ })).toBeTruthy();
    expect(hero.textContent).toContain("Ana");
    expect(hero.textContent).toContain("ana@reyes.test");
    expect(screen.getByTestId("profile-hero-band").style.backgroundImage).toBe(brandGradient("#0B5E3C"));
    expect(within(screen.getByTestId("profile-hero-logo")).getByRole("img", { name: "Reyes Law logo" }).getAttribute("src"))
      .toBe("http://api.test/logo-1.png");
  });

  it("switches banner and logo with the workspace; the person stays", () => {
    workspace = { id: "ws_2", name: "Side Firm" };
    renderHero();
    expect(screen.getByTestId("profile-hero-band").style.backgroundImage).toBe(brandGradient(null));
    // No logo: the workspace's initials instead.
    expect(screen.getByTestId("profile-hero-logo").textContent).toBe("SF");
    expect(screen.getByText("Side Firm")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: /Ana Reyes/ })).toBeTruthy();
  });
});

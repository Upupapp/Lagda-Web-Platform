// Settings › Profile: the Profile Photo section is for Free accounts only —
// centred photo, then Change photo / Remove, then the note. Personal and
// Business do not show it, and neither does a plan not read yet.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const platform = {
  user: { id: "u_1", fullName: "Ana Reyes", avatarUrl: "https://cdn.test/ana.png" as string | null },
  refreshSessionFromBackend: vi.fn(),
};
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform, announceProfileChanged: vi.fn() }));

let planId: string | null = "free";
vi.mock("../../../../hooks/usePlans", () => ({
  useMyPlan: () => ({ plan: planId === null ? null : { plan: planId }, refresh: vi.fn() }),
}));

vi.mock("../../../../services/real/account-settings.service", () => ({
  realAccountSettingsService: {
    getUserProfile: () => Promise.resolve({
      fullName: "Ana Reyes", displayName: "Ana", jobTitle: "", department: "", preferredSenderName: "Ana Reyes", email: "ana@example.com",
    }),
  },
}));

import { ProfilePage } from "../ProfilePage";

const show = () => render(<MemoryRouter><ProfilePage /></MemoryRouter>);

beforeEach(() => { planId = "free"; });

describe("Profile Photo by plan", () => {
  it("Free: the photo, then Change photo and Remove, then the note", async () => {
    show();
    const section = await screen.findByTestId("profile-photo");
    const order = [...section.querySelectorAll("img, label, button, #avatar-help")].map(n =>
      n.tagName === "IMG" ? "photo" : n.id === "avatar-help" ? "note" : n.textContent);
    expect(order).toEqual(["photo", "Change photo", "Remove", "note"]);
    expect(within(section).getByText(/Cropped to a square/)).toBeTruthy();
  });

  for (const paid of ["personal", "business", null]) {
    it(`${paid ?? "an unread plan"}: no Profile Photo`, async () => {
      planId = paid;
      show();
      await screen.findByText("Personal Information");
      expect(screen.queryByTestId("profile-photo")).toBeNull();
      expect(screen.queryByText("Profile Photo")).toBeNull();
    });
  }
});

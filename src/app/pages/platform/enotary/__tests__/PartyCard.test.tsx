// The card of the other person: the initials in its avatar, and the avatar standing above the banner it overlaps.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";

const counterpart = vi.fn();
const counterpartAvatar = vi.fn();
vi.mock("../../../../services/real/enotary-sessions.service", () => ({
  realEnotarySessionsService: { counterpart: (id: string) => counterpart(id) as unknown, counterpartAvatar: (id: string, version?: string | null) => counterpartAvatar(id, version) as unknown },
}));

import { PartyCard, initialsOf } from "../CaseFrame";

const revokeObjectURL = vi.fn();

beforeEach(() => {
  counterpart.mockReset(); counterpartAvatar.mockReset(); revokeObjectURL.mockReset();
  URL.createObjectURL = vi.fn(() => "blob:photo");
  URL.revokeObjectURL = revokeObjectURL;
});

describe("the initials of the avatar", () => {
  it("take the first and the last word of the name, leaving out the title and anything in brackets", () => {
    expect(initialsOf("Atty. Jake Smith (TEST ACCOUNT)")).toBe("JS");
    expect(initialsOf("Aiyana Yasmin A. Cruz")).toBe("AC");
    expect(initialsOf("Rosa")).toBe("R");
    expect(initialsOf("")).toBe("?");
  });
});

describe("the party card", () => {
  it("lifts the avatar above the banner so it is not hidden behind it", () => {
    render(<PartyCard name="Atty. Jake Smith (TEST ACCOUNT)" role="Notary Public" tone="attorney" status={{ label: "Accepted", tone: "ok" }} rows={[]} auditCount={null} />);
    const avatar = screen.getByText("JS");
    expect(avatar.parentElement).toHaveStyle({ position: "relative", zIndex: "1" });
  });
});

describe("the party card's own look", () => {
  const card = (invitationId?: string) => <PartyCard name="Atty. Jake Smith" role="Notary Public" tone="attorney" status={{ label: "Accepted", tone: "ok" }} rows={[]} auditCount={null} invitationId={invitationId} />;

  it("shows the person's profile photo and the colour of their workspace's banner", async () => {
    counterpart.mockResolvedValue({ role: "notary", brandColor: "#0A84D6", hasAvatar: true, avatarVersion: "v1" });
    counterpartAvatar.mockResolvedValue(new Blob(["x"], { type: "image/png" }));
    render(card("eni_1"));
    await waitFor(() => { expect(screen.getByTestId("party-photo")).toBeInTheDocument(); });
    expect(screen.getByRole("img", { name: "Atty. Jake Smith's profile photo" })).toHaveAttribute("src", "blob:photo");
    expect(screen.getByTestId("party-banner").style.background).toContain("linear-gradient");
    expect(counterpart).toHaveBeenCalledWith("eni_1");
  });

  it("keeps the initials when they have no photo, and the default banner when the server has nothing", async () => {
    counterpart.mockResolvedValue({ role: "notary", brandColor: null, hasAvatar: false, avatarVersion: null });
    render(card("eni_1"));
    await waitFor(() => { expect(counterpart).toHaveBeenCalled(); });
    expect(screen.getByText("JS")).toBeInTheDocument();
    expect(screen.queryByTestId("party-photo")).toBeNull();
    expect(counterpartAvatar).not.toHaveBeenCalled();
  });

  it("fetches a changed photo again while the page is open, and only when its version changes", async () => {
    counterpart.mockResolvedValue({ role: "notary", brandColor: null, hasAvatar: true, avatarVersion: "v1" });
    counterpartAvatar.mockResolvedValue(new Blob(["x"], { type: "image/png" }));
    render(card("eni_1"));
    await waitFor(() => { expect(screen.getByTestId("party-photo")).toBeInTheDocument(); });
    expect(counterpartAvatar).toHaveBeenLastCalledWith("eni_1", "v1");
    // The tab comes back to the front: the card asks again; the same version is not fetched twice.
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); await Promise.resolve(); });
    await waitFor(() => { expect(counterpart).toHaveBeenCalledTimes(2); });
    expect(counterpartAvatar).toHaveBeenCalledTimes(1);
    counterpart.mockResolvedValue({ role: "notary", brandColor: null, hasAvatar: true, avatarVersion: "v2" });
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); await Promise.resolve(); });
    await waitFor(() => { expect(counterpartAvatar).toHaveBeenLastCalledWith("eni_1", "v2"); });
    expect(revokeObjectURL).toHaveBeenCalled();
  });

  it("says under a name read from a valid ID that LAGDA verified it", () => {
    render(<PartyCard name="Atty. AIYANA YASMIN A. CRUZ" role="Notary Public" tone="attorney" status={{ label: "Accepted", tone: "ok" }} rows={[]} auditCount={null} verifiedName />);
    expect(screen.getByTestId("party-name")).toHaveTextContent("Atty. AIYANA YASMIN A. CRUZ");
    expect(screen.getByTestId("party-name-verified")).toHaveTextContent("Name on valid ID · Verified by LAGDA");
  });

  it("asks for nothing without a request, and survives a server that has no card", async () => {
    render(card());
    expect(counterpart).not.toHaveBeenCalled();
    counterpart.mockRejectedValue(new Error("404"));
    render(card("eni_2"));
    await waitFor(() => { expect(counterpart).toHaveBeenCalledWith("eni_2"); });
    expect(screen.getAllByText("JS").length).toBe(2);
  });
});

/* eslint-disable testing-library/prefer-user-event, testing-library/no-unnecessary-act -- these files run on a held clock (fake timers), where userEvent waits on timers; fireEvent does not. */
// The notary's landing page: what each state of the link says, the way through
// sign-in and back, and one screen for each way the claim can be refused.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const platform = { sessionStatus: "authenticated" as string, user: { id: "u1", displayName: "Ana" } as { id: string; displayName: string } | null };
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

const lookup = vi.fn();
const claim = vi.fn();
vi.mock("../../../../services/real/enotary-invitations.service", async (original) => ({
  ...(await original<typeof import("../../../../services/real/enotary-invitations.service")>()),
  realEnotaryInvitationsService: { lookup: (...a: unknown[]) => lookup(...a) as unknown, claim: (...a: unknown[]) => claim(...a) as unknown },
}));

import { NotaryInvitePage } from "../NotaryInvitePage";
import { recallInvite } from "../invite-memory";
import { ApiError } from "../../../../services/api-client";

const TOKEN = "Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MEFCQ0RFRkdISUo";
const PATH = `/enotary/invite/${TOKEN}`;
const refusal = (status: number, code: string, more: Record<string, unknown> = {}) =>
  new ApiError(status, { code, message: code, ...more }, code);

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname}{location.search}</div>;
}

function renderAt(path = PATH) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/enotary/invite/:token" element={<NotaryInvitePage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}
const settle = async () => { await act(async () => { await new Promise(r => setTimeout(r, 0)); }); };
const press = (el: HTMLElement) => { fireEvent.click(el); };
const text = (id: string) => (screen.getByTestId(id).textContent ?? "").replace(/\s+/g, " ");

beforeEach(() => {
  platform.sessionStatus = "authenticated";
  platform.user = { id: "u1", displayName: "Ana" };
  lookup.mockResolvedValue({ state: "open", notaryName: "Ana Maria Cruz", expiresAt: "2026-10-20T01:14:00.000Z" });
  sessionStorage.clear();
});
afterEach(() => { sessionStorage.clear(); });

describe("an open link", () => {
  it("names the notary and the steps, without a session, and says online sessions are not available", async () => {
    platform.sessionStatus = "unauthenticated";
    platform.user = null;
    renderAt();
    await settle();
    expect(lookup).toHaveBeenCalledWith(TOKEN);
    expect(text("invite-open")).toContain("Atty. Ana Maria Cruz");
    expect(text("invite-open")).toContain("Open until Tue 20 Oct, 9:14 AM");
    expect(screen.getByTestId("invite-steps").querySelectorAll("li")).toHaveLength(5);
    expect(screen.getByTestId("onramp-note")).toHaveTextContent(/not currently available.*Supreme Court accreditation/);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("sends a signed-out visitor through sign-in or account creation and back to this same address", async () => {
    platform.sessionStatus = "unauthenticated";
    platform.user = null;
    renderAt();
    await settle();
    const back = encodeURIComponent(PATH);
    expect(screen.getByRole("link", { name: /Sign in to continue/ })).toHaveAttribute("href", `/sign-in?returnTo=${back}`);
    expect(screen.getByRole("link", { name: /Create a LAGDA account/ })).toHaveAttribute("href", `/create-account?returnTo=${back}`);
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
  });

  it("shows no sign-in choice until the session is known", async () => {
    platform.sessionStatus = "initializing";
    platform.user = null;
    renderAt();
    await settle();
    expect(screen.queryByRole("link", { name: /Sign in/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
  });

  it("keeps the address for the way back from the identity check", async () => {
    renderAt();
    await settle();
    expect(recallInvite()).toBe(PATH);
  });

  it("claims on Continue and goes to the desk", async () => {
    claim.mockResolvedValue({ invitation: { id: "eni_1" }, notary: { applicationStatus: "none", canAccept: false } });
    renderAt();
    await settle();
    press(screen.getByRole("button", { name: "Continue" }));
    await settle();
    expect(claim).toHaveBeenCalledWith(TOKEN);
    expect(screen.getByTestId("where")).toHaveTextContent("/app/enotary/desk");
    expect(recallInvite()).toBeNull();
  });
});

describe("each way a claim is refused", () => {
  const open = async () => {
    renderAt();
    await settle();
    press(screen.getByRole("button", { name: "Continue" }));
    await settle();
  };

  it("identity required: sends the notary to verify, with a way to try again", async () => {
    claim.mockRejectedValueOnce(refusal(409, "identity_required"));
    await open();
    expect(text("invite-identity-required")).toContain("Verify your identity first");
    expect(text("invite-identity-required")).toContain("Ana Maria Cruz");
    expect(screen.getByRole("link", { name: /Verify my identity/ })).toHaveAttribute("href", "/app/settings/identity");
    claim.mockResolvedValueOnce({ invitation: { id: "eni_1" }, notary: { applicationStatus: "draft", canAccept: false } });
    press(screen.getByRole("button", { name: /I have verified/ }));
    await settle();
    expect(claim).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("where")).toHaveTextContent("/app/enotary/desk");
  });

  it("name mismatch: says it is for a different notary, and names nobody", async () => {
    claim.mockRejectedValue(refusal(409, "notary_name_mismatch"));
    await open();
    const words = text("invite-name-mismatch");
    expect(words).toContain("This request is for a different notary");
    expect(words).toContain("Nothing was changed");
    expect(words).not.toContain("Ana Maria Cruz");
  });

  it.each([
    ["expired", "This request has expired"], ["revoked", "The client cancelled this request"],
    ["used", "This request was already taken"], ["unknown", "This link is not valid"],
  ] as const)("unavailable (%s): says so, from the state the refusal carries", async (state, title) => {
    claim.mockRejectedValue(refusal(410, "enotary_invitation_unavailable", { state }));
    await open();
    expect(text(`invite-${state}`)).toContain(title);
  });

  it("unavailable: asks the public lookup which state it is when the refusal does not say", async () => {
    claim.mockRejectedValue(refusal(404, "enotary_invitation_unavailable"));
    lookup.mockResolvedValueOnce({ state: "open", notaryName: "Ana Maria Cruz" }).mockResolvedValueOnce({ state: "used" });
    await open();
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(text("invite-used")).toContain("This request was already taken");
  });

  it("falls back to an invalid-link screen when even the lookup cannot say", async () => {
    claim.mockRejectedValue(refusal(410, "enotary_invitation_unavailable"));
    lookup.mockResolvedValueOnce({ state: "open", notaryName: "Ana Maria Cruz" }).mockRejectedValueOnce(new Error("down"));
    await open();
    expect(screen.getByTestId("invite-unknown")).toBeInTheDocument();
  });

  it("session ended: goes to sign-in and back to the same address", async () => {
    claim.mockRejectedValue(refusal(401, "unauthenticated"));
    await open();
    expect(screen.getByTestId("where")).toHaveTextContent(`/sign-in?returnTo=${encodeURIComponent(PATH)}`);
  });

  it("a switched-off server: says requests are not open here", async () => {
    claim.mockRejectedValue(refusal(404, "resource_not_found"));
    await open();
    expect(screen.getByTestId("invite-not-offered")).toBeInTheDocument();
  });

  it("any other failure offers a retry that claims again", async () => {
    claim.mockRejectedValueOnce(new ApiError(500, undefined, "x")).mockResolvedValue({ invitation: { id: "eni_1" }, notary: { applicationStatus: "approved", canAccept: true } });
    await open();
    expect(screen.getByTestId("invite-error")).toBeInTheDocument();
    press(screen.getByRole("button", { name: "Try again" }));
    await settle();
    expect(claim).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("where")).toHaveTextContent("/app/enotary/desk");
  });
});

describe("a link that is not open", () => {
  it.each([
    ["expired", "This request has expired"], ["revoked", "The client cancelled this request"],
    ["used", "This request was already taken"], ["unknown", "This link is not valid"],
  ] as const)("%s", async (state, title) => {
    lookup.mockResolvedValue({ state });
    renderAt();
    await settle();
    expect(text(`invite-${state}`)).toContain(title);
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(screen.getByTestId("onramp-note")).toBeInTheDocument();
  });

  it("a token of the wrong shape is never looked up", async () => {
    renderAt("/enotary/invite/short");
    await settle();
    expect(lookup).not.toHaveBeenCalled();
    expect(screen.getByTestId("invite-unknown")).toBeInTheDocument();
  });

  it("a server that is off, or cannot be reached", async () => {
    lookup.mockRejectedValueOnce(new ApiError(404, undefined, "x"));
    const view = renderAt();
    await settle();
    expect(screen.getByTestId("invite-not-offered")).toBeInTheDocument();
    view.unmount();
    lookup.mockRejectedValueOnce(new ApiError(0, undefined, "x"));
    renderAt();
    await settle();
    expect(screen.getByTestId("invite-error")).toBeInTheDocument();
    lookup.mockResolvedValue({ state: "open", notaryName: "Ana" });
    press(screen.getByRole("button", { name: "Try again" }));
    await settle();
    expect(screen.getByTestId("invite-open")).toBeInTheDocument();
  });
});

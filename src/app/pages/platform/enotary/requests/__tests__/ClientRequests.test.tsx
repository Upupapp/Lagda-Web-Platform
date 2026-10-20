/* eslint-disable testing-library/prefer-user-event, testing-library/no-unnecessary-act -- these files run on a held clock (fake timers), where userEvent waits on timers; fireEvent does not. */
// The client's request pages: the list, and one request with its expiry panel,
// live countdown, link, QR card, revoke and renew.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";

vi.mock("../../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const get = vi.fn();
const list = vi.fn();
const revoke = vi.fn();
const renew = vi.fn();
const setNotaryEmail = vi.fn();
vi.mock("../../../../../services/real/enotary-invitations.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-invitations.service")>()),
  realEnotaryInvitationsService: {
    get: (...a: unknown[]) => get(...a) as unknown, list: (...a: unknown[]) => list(...a) as unknown,
    revoke: (...a: unknown[]) => revoke(...a) as unknown, renew: (...a: unknown[]) => renew(...a) as unknown,
    setNotaryEmail: (...a: unknown[]) => setNotaryEmail(...a) as unknown,
  },
}));

import { ClientRequestPage, POLL_MS } from "../ClientRequestPage";
import { ClientRequestsPage } from "../ClientRequestsPage";
import { ApiError } from "../../../../../services/api-client";
import type { Invitation } from "../../../../../services/real/enotary-invitations.service";
import { countdownText, expiryLabel, expiryTone, ExpiryClock } from "../expiry";

const T0 = Date.parse("2026-10-17T01:00:00.000Z");
const SECRET = "Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MEFCQ0RFRkdISUo";
const LINK = `https://lagda.io/enotary/invite/${SECRET}`;
const HOUR = 3600;

const invitation = (over: Partial<Invitation> = {}): Invitation => ({
  id: "eni_1", status: "awaiting",
  notary: { directoryId: "ana-cruz", name: "Ana Maria Cruz", firm: "Cruz Law", city: "Makati City", province: "Metro Manila", emailOnRecord: false, accountKnown: false },
  notaryEmail: null, link: LINK, createdAt: new Date(T0).toISOString(), expiresAt: new Date(T0 + 3 * 24 * HOUR * 1000).toISOString(),
  secondsLeft: 3 * 24 * HOUR, claimedAt: null, decidedAt: null,
  timeline: [{ at: new Date(T0).toISOString(), code: "created", text: "You asked Ana Maria Cruz" }], ...over,
});

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname}</div>;
}

function renderRequest(id = "eni_1") {
  return render(
    <MemoryRouter initialEntries={[`/app/enotary/requests/${id}`]}>
      <Routes>
        <Route path="/app/enotary/requests/:id" element={<><ClientRequestPage /><Where /></>} />
        <Route path="/app/enotary/requests" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

const settle = async (ms = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
const press = (element: HTMLElement) => { fireEvent.click(element); };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "Date"] });
  vi.setSystemTime(T0);
});
afterEach(() => { vi.useRealTimers(); });

describe("the expiry words", () => {
  it("turns amber under 24 hours and red under 3, and ends at zero", () => {
    const h = 3_600_000;
    expect(expiryTone(3 * 24 * h)).toBe("calm");
    expect(expiryTone(24 * h)).toBe("calm");
    expect(expiryTone(24 * h - 1)).toBe("amber");
    expect(expiryTone(3 * h)).toBe("amber");
    expect(expiryTone(3 * h - 1)).toBe("red");
    expect(expiryTone(1)).toBe("red");
    expect(expiryTone(0)).toBe("ended");
  });

  it("counts down in days, hours and minutes, then finer", () => {
    expect(countdownText(((2 * 24 + 23) * 3600 + 59 * 60 + 30) * 1000)).toBe("2 d 23 h 59 m");
    expect(countdownText((5 * 3600 + 4 * 60 + 9) * 1000)).toBe("5 h 04 m 09 s");
    expect(countdownText((12 * 60 + 30) * 1000)).toBe("12 m 30 s");
    expect(countdownText(45_000)).toBe("45 s");
    expect(countdownText(0)).toBe("Expired");
    expect(countdownText(-5)).toBe("Expired");
  });

  it("writes the expiry like Tue 20 Oct, 9:14 AM, and nothing for a bad date", () => {
    expect(expiryLabel("2026-10-20T01:14:00.000Z")).toBe("Tue 20 Oct, 9:14 AM");
    expect(expiryLabel("2026-10-20T13:05:00.000Z")).toBe("Tue 20 Oct, 9:05 PM");
    expect(expiryLabel("nonsense")).toBe("");
  });

  it("counts from the server's seconds, not from this device's idea of the date", () => {
    const clock = new ExpiryClock();
    clock.sync(100, 5_000);
    expect(clock.msLeft(5_000)).toBe(100_000);
    expect(clock.msLeft(65_000)).toBe(40_000);
    expect(clock.msLeft(500_000)).toBe(0);
    clock.sync(-3, 0);
    expect(clock.msLeft(0)).toBe(0);
  });
});

describe("one request, waiting for the notary", () => {
  it("shows the expiry panel, the link, the QR card and the timeline, and says nothing is open yet", async () => {
    get.mockResolvedValue(invitation());
    renderRequest();
    await settle();
    expect(screen.getByTestId("case-title")).toHaveTextContent("Waiting for Atty. Ana Maria Cruz to join");
    expect(screen.getByTestId("expiry-countdown")).toHaveTextContent("3 d 0 h 0 m");
    expect(screen.getByTestId("expiry-label")).toHaveTextContent(/^Expires \w{3} \d+ \w{3}, \d+:\d{2} (AM|PM)$/);
    expect(screen.getByTestId("expiry-panel")).toHaveAttribute("data-tone", "calm");
    expect(screen.getByLabelText("Link for the notary")).toHaveValue(LINK);
    const card = screen.getByTestId("qr-card-image");
    expect(card.tagName).toBe("IMG");
    expect(decodeURIComponent(card.getAttribute("src") ?? "")).toContain("Scan only if you are Atty.");
    expect(screen.getByRole("button", { name: "Save the card" })).toBeInTheDocument();
    expect(screen.getByTestId("audit-trail")).toHaveTextContent("You asked Ana Maria Cruz");
    expect(screen.getByTestId("onramp-note")).toHaveTextContent(/not currently available.*Supreme Court accreditation/);
    expect(screen.getByTestId("party-status")).toHaveTextContent("Waiting for the notary");
  });

  it("counts down every second on its own clock", async () => {
    get.mockResolvedValue(invitation({ secondsLeft: 125 }));
    renderRequest();
    await settle();
    expect(screen.getByTestId("expiry-countdown")).toHaveTextContent("2 m 05 s");
    await settle(1000);
    expect(screen.getByTestId("expiry-countdown")).toHaveTextContent("2 m 04 s");
  });

  it.each([
    [30 * HOUR, "calm"], [20 * HOUR, "amber"], [2 * HOUR, "red"],
  ])("with %s seconds left the panel is %s", async (secondsLeft, tone) => {
    get.mockResolvedValue(invitation({ secondsLeft }));
    renderRequest();
    await settle();
    expect(screen.getByTestId("expiry-panel")).toHaveAttribute("data-tone", tone);
  });

  it("asks again every 5 seconds and re-syncs the countdown from each answer", async () => {
    get.mockResolvedValueOnce(invitation({ secondsLeft: 1000 })).mockResolvedValue(invitation({ secondsLeft: 600 }));
    renderRequest();
    await settle();
    expect(get).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("expiry-countdown")).toHaveTextContent("16 m 40 s");
    await settle(POLL_MS);
    expect(get).toHaveBeenCalledTimes(2);
    // The server says 600 s; the device's own count would have said 995 s.
    expect(screen.getByTestId("expiry-countdown")).toHaveTextContent("10 m 00 s");
    await settle(POLL_MS);
    expect(get).toHaveBeenCalledTimes(3);
  });

  it("moves to the notary's answer when a poll says so, and stops asking", async () => {
    get.mockResolvedValueOnce(invitation())
      .mockResolvedValue(invitation({ status: "claimed", link: null, claimedAt: new Date(T0).toISOString() }));
    renderRequest();
    await settle();
    await settle(POLL_MS);
    expect(screen.getByTestId("party-status")).toHaveTextContent("Notary verified");
    expect(screen.getByTestId("request-notice")).toHaveTextContent(/passed the identity check/);
    expect(screen.queryByLabelText("Link for the notary")).toBeNull();
    expect(screen.queryByTestId("qr-card")).toBeNull();
    expect(screen.getByTestId("expiry-panel")).toBeInTheDocument();
    get.mockResolvedValue(invitation({ status: "accepted", link: null }));
    await settle(POLL_MS);
    const calls = get.mock.calls.length;
    await settle(POLL_MS * 4);
    expect(get).toHaveBeenCalledTimes(calls);
  });

  it("asks once when the clock reaches zero", async () => {
    get.mockResolvedValueOnce(invitation({ secondsLeft: 2 })).mockResolvedValue(invitation({ status: "expired", link: null, secondsLeft: 0 }));
    renderRequest();
    await settle();
    await settle(2100);
    expect(get).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("party-status")).toHaveTextContent("Expired");
    expect(screen.queryByTestId("expiry-panel")).toBeNull();
  });

  it("copies the link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    get.mockResolvedValue(invitation());
    renderRequest();
    await settle();
    press(screen.getByRole("button", { name: "Copy link" }));
    await settle();
    expect(writeText).toHaveBeenCalledWith(LINK);
    expect(screen.getByText("Link copied.")).toBeInTheDocument();
  });

  it("shares with the Web Share API when there is one, and copies when there is not", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    get.mockResolvedValue(invitation());
    const view = renderRequest();
    await settle();
    press(screen.getByRole("button", { name: "Share" }));
    await settle();
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: LINK }));
    expect(writeText).not.toHaveBeenCalled();
    view.unmount();
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    renderRequest();
    await settle();
    press(screen.getByRole("button", { name: "Share" }));
    await settle();
    expect(writeText).toHaveBeenCalledWith(LINK);
  });

  it("offers the notary's email only when LAGDA has none, and saves it", async () => {
    get.mockResolvedValue(invitation());
    setNotaryEmail.mockResolvedValue(invitation({ notaryEmail: "atty@example.ph" }));
    const view = renderRequest();
    await settle();
    fireEvent.change(screen.getByLabelText("Email address (optional)"), { target: { value: "atty@example.ph" } });
    press(screen.getByRole("button", { name: "Save the email" }));
    await settle();
    expect(setNotaryEmail).toHaveBeenCalledWith("eni_1", "atty@example.ph");
    expect(screen.getByTestId("notary-email-saved")).toHaveTextContent("atty@example.ph");
    view.unmount();

    get.mockResolvedValue(invitation({ notary: { ...invitation().notary, emailOnRecord: true } }));
    renderRequest();
    await settle();
    expect(screen.queryByTestId("email-panel")).toBeNull();
  });

  it("says when the notary already has a LAGDA account", async () => {
    get.mockResolvedValue(invitation({ notary: { ...invitation().notary, accountKnown: true } }));
    renderRequest();
    await settle();
    expect(screen.getByTestId("link-panel")).toHaveTextContent(/already has a LAGDA account/);
  });

  it("cancels only after a confirmation, then shows Renew", async () => {
    get.mockResolvedValue(invitation());
    revoke.mockResolvedValue(invitation({ status: "revoked", link: null }));
    renderRequest();
    await settle();
    press(screen.getByRole("button", { name: "Cancel this request" }));
    expect(revoke).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog");
    press(within(dialog).getByRole("button", { name: "Cancel the request" }));
    await settle();
    expect(revoke).toHaveBeenCalledWith("eni_1");
    expect(screen.getByTestId("party-status")).toHaveTextContent("Cancelled");
    expect(screen.getByRole("button", { name: "Renew with a new link" })).toBeInTheDocument();
    expect(screen.queryByTestId("expiry-panel")).toBeNull();
  });

  it("says plainly when a revoke is refused", async () => {
    get.mockResolvedValue(invitation());
    revoke.mockRejectedValue(new ApiError(409, { code: "enotary_invitation_unavailable", message: "x" }, "x"));
    renderRequest();
    await settle();
    press(screen.getByRole("button", { name: "Cancel this request" }));
    press(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel the request" }));
    await settle();
    expect(screen.getByRole("alert")).toHaveTextContent("This request has already ended.");
  });
});

describe("a request that has ended", () => {
  it.each([
    ["expired", /ran out of time/], ["revoked", /You cancelled this request/],
  ] as const)("a %s one can be renewed, and the new one opens", async (status, words) => {
    get.mockResolvedValue(invitation({ status, link: null, secondsLeft: 0 }));
    renew.mockResolvedValue(invitation({ id: "eni_2" }));
    renderRequest();
    await settle();
    expect(screen.getByTestId("request-notice")).toHaveTextContent(words);
    expect(screen.queryByTestId("expiry-panel")).toBeNull();
    press(screen.getByRole("button", { name: "Renew with a new link" }));
    await settle();
    expect(renew).toHaveBeenCalledWith("eni_1");
    expect(screen.getByTestId("where")).toHaveTextContent("/app/enotary/requests/eni_2");
  });

  it("an accepted one says it will say when the session can begin", async () => {
    get.mockResolvedValue(invitation({ status: "accepted", link: null, decidedAt: new Date(T0).toISOString() }));
    renderRequest();
    await settle();
    const notice = screen.getByTestId("request-notice");
    expect(notice).toHaveTextContent(/accepted your request. You will be told when the session can begin/);
    expect(notice.textContent).not.toMatch(/video|payment|pay |notarized on|book/i);
    expect(screen.queryByRole("button", { name: /Cancel|Renew/ })).toBeNull();
  });

  it("a declined one points back to the directory", async () => {
    get.mockResolvedValue(invitation({ status: "declined", link: null }));
    renderRequest();
    await settle();
    expect(screen.getByTestId("request-notice")).toHaveTextContent(/declined this request/);
    expect(screen.getByTestId("party-status")).toHaveTextContent("Declined");
  });
});

describe("the page around it", () => {
  it("says so when the server does not offer it, or does not know the request", async () => {
    get.mockResolvedValue(null);
    renderRequest();
    await settle();
    expect(screen.getByText("Not available on this account yet.")).toBeInTheDocument();
  });

  it("offers a retry when the request cannot be loaded", async () => {
    get.mockRejectedValueOnce(new ApiError(500, undefined, "x")).mockResolvedValue(invitation());
    renderRequest();
    await settle();
    press(screen.getByRole("button", { name: "Try again" }));
    await settle();
    expect(screen.getByTestId("expiry-panel")).toBeInTheDocument();
  });
});

describe("the list", () => {
  const renderList = () => render(<MemoryRouter><ClientRequestsPage /></MemoryRouter>);

  it("lists newest first with each state, and a live countdown on the open ones only", async () => {
    list.mockResolvedValue([
      invitation({ id: "eni_3", secondsLeft: 2 * HOUR }),
      invitation({ id: "eni_2", status: "accepted", link: null, notary: { ...invitation().notary, name: "Ben Lim" } }),
      invitation({ id: "eni_1", status: "expired", link: null, notary: { ...invitation().notary, name: "Cara Tan" } }),
    ]);
    renderList();
    await settle();
    const rows = within(screen.getByTestId("requests-list")).getAllByRole("link");
    expect(rows.map(row => row.getAttribute("href"))).toEqual([
      "/app/enotary/requests/eni_3", "/app/enotary/requests/eni_2", "/app/enotary/requests/eni_1",
    ]);
    expect(screen.getAllByTestId("row-countdown")).toHaveLength(1);
    expect(screen.getByTestId("row-countdown")).toHaveAttribute("data-tone", "red");
    expect(screen.getByTestId("row-countdown")).toHaveTextContent("2 h 00 m 00 s left");
    expect(within(rows[1]!).getByTestId("status-pill")).toHaveTextContent("Accepted");
    await settle(1000);
    expect(screen.getByTestId("row-countdown")).toHaveTextContent("1 h 59 m 59 s left");
  });

  it("says what to do when there are none, and when eNotary is not offered", async () => {
    list.mockResolvedValue([]);
    const view = renderList();
    await settle();
    expect(screen.getByTestId("requests-empty")).toHaveTextContent(/Request this notary/);
    expect(screen.getByRole("link", { name: /Go to the Notary Directory/ })).toHaveAttribute("href", "/enotary-directory/");
    view.unmount();
    list.mockResolvedValue(null);
    renderList();
    await settle();
    expect(screen.getByText("Not available on this account yet.")).toBeInTheDocument();
  });
});

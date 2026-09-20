// The real dashboard, rendered against a stubbed list endpoint.
//
// The rules are covered in dashboard-attention.test.ts. What is covered here
// is that the page shows what the rules produce, says the honest thing when
// the list is paged, and does not fall over on an empty workspace or a
// failed request — the three states a real account actually meets.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { SigningRequestListItem } from "../../../services/real/signing-request.service";

const list = vi.fn();
vi.mock("../../../services/real/signing-request.service", () => ({
  realSigningRequestService: {
    list: (...args: unknown[]) => list(...args),
    signatures: vi.fn(),
    audit: vi.fn(),
  },
}));

let workspace: { id: string } | null = { id: "ws_1" };
vi.mock("../../../context/PlatformContext", () => ({
  usePlatform: () => ({
    currentWorkspace: workspace,
    user: { displayName: "Ana Reyes" },
  }),
}));

import { RealDashboard } from "../RealDashboard";

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
const ahead = (days: number) => new Date(Date.now() + days * DAY).toISOString();

let seq = 0;
function req(over: Partial<SigningRequestListItem> = {}): SigningRequestListItem {
  seq += 1;
  return {
    signingRequestId: `sr_${seq}`, documentId: `doc_${seq}`,
    documentTitle: `Document ${seq}`, state: "sent",
    participantCount: 3, completedParticipantCount: 1,
    createdAt: ago(10), sentAt: ago(1), completedAt: null, expiresAt: null,
    ...over,
  };
}

function renderPage() {
  return render(<MemoryRouter><RealDashboard /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  workspace = { id: "ws_1" };
});

describe("with signing requests", () => {
  it("leads with what needs attention", async () => {
    list.mockResolvedValue({
      items: [
        req({ state: "declined", documentTitle: "Lease — refused" }),
        req({ expiresAt: ahead(2), documentTitle: "NDA — expiring" }),
        req({ documentTitle: "Fine" }),
      ],
      total: 3, page: 1, perPage: 100, hasNextPage: false,
    });
    renderPage();

    const section = await screen.findByRole("region", { name: "Needs attention" });
    expect(section.textContent).toContain("Lease — refused");
    expect(section.textContent).toContain("Declined");
    expect(section.textContent).toContain("NDA — expiring");
    expect(section.textContent).toMatch(/Expires in 2 days/);
    expect(section.textContent).not.toContain("Fine");
  });

  it("shows progress for what is in flight", async () => {
    list.mockResolvedValue({
      items: [req({ participantCount: 4, completedParticipantCount: 1 })],
      total: 1, page: 1, perPage: 100, hasNextPage: false,
    });
    renderPage();

    expect(await screen.findByRole("meter", { name: "1 of 4 signed" })).toBeTruthy();
  });

  it("counts from what it fetched, and says so when the workspace has more", async () => {
    // 100 rows is the API's ceiling. A workspace with 340 requests must not
    // be told it has 100 — the previous dashboard was emptied for exactly
    // this class of invented number.
    list.mockResolvedValue({
      items: [req({ state: "completed", completedAt: ago(1) }), req()],
      total: 340, page: 1, perPage: 100, hasNextPage: true,
    });
    renderPage();

    const note = await screen.findByText(/Counts cover your 2 most recent requests/);
    expect(note.textContent).toContain("340 in total");
  });

  it("says nothing about paging when it has everything", async () => {
    list.mockResolvedValue({
      items: [req()], total: 1, page: 1, perPage: 100, hasNextPage: false,
    });
    renderPage();

    await screen.findByRole("region", { name: "Needs attention" });
    expect(screen.queryByText(/most recent requests/)).toBeNull();
  });

  it("says plainly when nothing is waiting", async () => {
    list.mockResolvedValue({
      items: [req({ sentAt: ago(1) })], total: 1, page: 1, perPage: 100, hasNextPage: false,
    });
    renderPage();

    expect(await screen.findByText(/Nothing is waiting on you/)).toBeTruthy();
  });

  it("greets the person by first name", async () => {
    list.mockResolvedValue({ items: [req()], total: 1, page: 1, perPage: 100, hasNextPage: false });
    renderPage();
    expect(await screen.findByRole("heading", { name: /Welcome back, Ana/ })).toBeTruthy();
  });

  it("offers the signature record for a declined request", async () => {
    list.mockResolvedValue({
      items: [req({ state: "declined", documentTitle: "Refused" })],
      total: 1, page: 1, perPage: 100, hasNextPage: false,
    });
    renderPage();
    expect(await screen.findByRole("button", { name: "Signatures for Refused" })).toBeTruthy();
  });

  it("offers the audit trail on every row that has one", async () => {
    // The trail is the product's evidentiary claim, and it was reachable
    // over HTTP with nothing in the interface using it. Every real row —
    // attention, in flight, completed — now opens it.
    list.mockResolvedValue({
      items: [
        req({ state: "declined", documentTitle: "Refused" }),
        req({ documentTitle: "Flying" }),
        req({ state: "completed", completedAt: ago(1), documentTitle: "Done" }),
      ],
      total: 3, page: 1, perPage: 100, hasNextPage: false,
    });
    renderPage();
    expect(await screen.findByRole("button", { name: "Activity for Refused" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Activity for Flying" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Activity for Done" })).toBeTruthy();
  });
});

describe("edge states", () => {
  it("shows a first-run path for an empty workspace, not an apology", async () => {
    list.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 100, hasNextPage: false });
    renderPage();

    expect(await screen.findByText("Send your first document")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Prepare your first document/ }).getAttribute("href"))
      .toBe("/app/prepare");
    expect(screen.queryByText(/still being built out/)).toBeNull();
  });

  it("reports a failed load instead of an empty dashboard", async () => {
    list.mockRejectedValue(new Error("500"));
    renderPage();

    expect(await screen.findByText("Couldn't load your dashboard")).toBeTruthy();
  });

  it("fetches a hundred rows, the API's ceiling", async () => {
    list.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 100, hasNextPage: false });
    renderPage();
    await screen.findByText("Send your first document");
    expect(list).toHaveBeenCalledWith("ws_1", { perPage: 100 });
  });

  it("requests nothing without a workspace", () => {
    workspace = null;
    renderPage();
    expect(list).not.toHaveBeenCalled();
  });

  it("never shows demo fixture copy", async () => {
    list.mockResolvedValue({ items: [req()], total: 1, page: 1, perPage: 100, hasNextPage: false });
    renderPage();
    await screen.findByRole("region", { name: "Needs attention" });
    const text = document.body.textContent ?? "";
    expect(/mock data only/i.test(text)).toBe(false);
    expect(/frontend demonstration/i.test(text)).toBe(false);
  });
});

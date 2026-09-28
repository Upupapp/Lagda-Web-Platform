import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

const documentsToSign = vi.fn();
const signedDocuments = vi.fn();
const completedOthers = vi.fn();
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1", name: "Mine" } }),
}));
vi.mock("../../../../services/real/my-signing.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/my-signing.service")>();
  return {
    ...actual,
    realMySigningService: {
      documentsToSign: () => documentsToSign(),
      signedDocuments: () => signedDocuments(),
      completedOtherDocuments: () => completedOthers(),
      continueSigning: vi.fn(),
    },
  };
});
const sources: string[] = [];
vi.mock("../../../../services/real/participant-document", () => ({
  participantDocumentSource: (verificationId: string, documentTitle: string) => {
    sources.push(verificationId);
    return {
      key: verificationId, documentTitle,
      loadFile: () => Promise.resolve(new Blob(["%PDF"], { type: "application/pdf" })),
      loadDetails: () => Promise.resolve({
        documentTitle, completedAt: Date.parse("2026-09-27T00:00:00.000Z"), sealedDigest: "e".repeat(64),
        participants: [{ name: "Maria Santos", maskedEmail: "m•••@example.com", recipientType: "signer",
          status: "signed", actedAt: null, routingOrder: 1 }],
        events: [{ type: "document-sent", label: "Sent for signing", at: Date.parse("2026-09-26T00:00:00.000Z") }],
      }),
    };
  },
}));

import { DocumentsToSignSection, OthersSection, SignedByMeSection } from "../MySigningSections";

const completion = (id: string) => ({
  verificationId: `LAGDA-VER-2026-${id}`, completedAt: "2026-09-27T00:00:00.000Z",
  participants: 2, completed: 2,
  branding: { displayName: "Owner Co", primaryColor: "#112233", logo: { version: "d".repeat(64), width: 10, height: 5 } },
});

const entry = (recipientType: string | null, title: string) => ({
  signingRequestId: `sr_${title}`, recipientId: `r_${title}`, documentTitle: title, recipientType,
  senderName: "Paul", senderEmail: "paul@example.com", workspaceName: "Acme",
  invitedAt: "2026-09-25T00:00:00.000Z", expiresAt: "2026-10-25T00:00:00.000Z",
});

beforeEach(() => {
  sources.length = 0;
  signedDocuments.mockResolvedValue([]);
  completedOthers.mockResolvedValue([]);
  documentsToSign.mockResolvedValue([
    entry("signer", "Lease"),
    entry(null, "Old signer entry"),
    entry("approver", "Budget"),
    entry("reviewer", "Policy"),
    entry("acknowledgment-recipient", "Handbook"),
    entry("viewer", "Minutes"),
    entry("carbon-copy", "Contract copy"),
  ]);
});

const table = (name: string) => screen.findByRole("table", { name });

describe("I must sign", () => {
  it("lists signers only (and pre-role entries, which were signers')", async () => {
    const onCount = vi.fn();
    render(<MemoryRouter><DocumentsToSignSection onCount={onCount} /></MemoryRouter>);
    const t = await table("Documents I must sign");
    expect(within(t).getByText("Lease")).toBeTruthy();
    expect(within(t).getByText("Old signer entry")).toBeTruthy();
    expect(within(t).queryByText("Budget")).toBeNull();
    // The count is reported from a passive effect after the table commits,
    // so it can land a tick after the table is findable.
    await waitFor(() => { expect(onCount).toHaveBeenLastCalledWith(2); });
  });
});

describe("Others", () => {
  it("lists every non-signer role with its badge", async () => {
    const onCount = vi.fn();
    render(<MemoryRouter><OthersSection onCount={onCount} /></MemoryRouter>);
    const t = await table("Other documents I take part in");
    for (const title of ["Budget", "Policy", "Handbook", "Minutes", "Contract copy"]) {
      expect(within(t).getByText(title)).toBeTruthy();
    }
    expect(within(t).queryByText("Lease")).toBeNull();
    for (const badge of ["Approver", "Reviewer", "Acknowledgment", "Viewer", "Copy recipient"]) {
      expect(within(t).getByText(badge)).toBeTruthy();
    }
    await waitFor(() => { expect(onCount).toHaveBeenLastCalledWith(5); });
  });

  it("offers a role-worded continue to those who act, and none to those who only receive", async () => {
    render(<MemoryRouter><OthersSection /></MemoryRouter>);
    const t = await table("Other documents I take part in");
    expect(within(t).getByRole("button", { name: /Continue to approve/ })).toBeTruthy();
    expect(within(t).getByRole("button", { name: /Continue reviewing/ })).toBeTruthy();
    expect(within(t).getByRole("button", { name: /Continue to acknowledge/ })).toBeTruthy();
    expect(within(t).getByText("Open it from your email link")).toBeTruthy();
    expect(within(t).getByText("It appears here once completed")).toBeTruthy();
    expect(screen.queryByText(/completed copy by email/)).toBeNull();
  });

  it("opens the password check worded for the role", async () => {
    render(<MemoryRouter><OthersSection /></MemoryRouter>);
    const t = await table("Other documents I take part in");
    await userEvent.click(within(t).getByRole("button", { name: /Continue to approve/ }));
    const dialog = await screen.findByRole("dialog", { name: "Continue to approve" });
    expect(within(dialog).getByText(/before you approve it/)).toBeTruthy();
  });

  it("says so when there is nothing", async () => {
    documentsToSign.mockResolvedValue([entry("signer", "Lease")]);
    render(<MemoryRouter><OthersSection /></MemoryRouter>);
    expect(await screen.findByText("Nothing here yet")).toBeTruthy();
  });
});

describe("completed documents, as the owner's cards", () => {
  it("shows a completed Others document once, as a card under the owner's banner", async () => {
    completedOthers.mockResolvedValue([{ ...entry("carbon-copy", "Contract copy"), completion: completion("CCCCCCCCCC") }]);
    const onCount = vi.fn();
    render(<MemoryRouter><OthersSection onCount={onCount} /></MemoryRouter>);
    const grid = await screen.findByRole("list", { name: "Completed documents I took part in" });
    expect(within(grid).getByText("Contract copy")).toBeTruthy();
    expect(within(grid).getByText("Owner Co")).toBeTruthy();
    expect(within(grid).getByText("Your role: Copy recipient")).toBeTruthy();
    const t = await table("Other documents I take part in");
    expect(within(t).queryByText("Contract copy")).toBeNull();
    expect(screen.getByRole("heading", { name: "In progress" })).toBeTruthy();
    // Only what is still open counts as "to look at".
    await waitFor(() => { expect(onCount).toHaveBeenLastCalledWith(4); });
  });

  it("opens participants and the audit trail through the participant's own access", async () => {
    completedOthers.mockResolvedValue([{ ...entry("viewer", "Minutes"), completion: completion("VVVVVVVVVV") }]);
    render(<MemoryRouter><OthersSection /></MemoryRouter>);
    await userEvent.click(await screen.findByRole("button", { name: "Show actions for Minutes" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /View participants/ }));
    const dialog = await screen.findByRole("dialog", { name: /Participants/ });
    expect(await within(dialog).findByText("Maria Santos")).toBeTruthy();
    expect(sources).toEqual(["LAGDA-VER-2026-VVVVVVVVVV"]);
  });

  it("lists Signed by me as cards once completed, and the rest as waiting", async () => {
    signedDocuments.mockResolvedValue([
      { signingRequestId: "sr_done", documentTitle: "Lease", senderName: "Paul", senderEmail: "p@example.com",
        workspaceName: "Acme", signedAt: "2026-09-26T00:00:00.000Z", completion: completion("DDDDDDDDDD") },
      { signingRequestId: "sr_wait", documentTitle: "NDA", senderName: "Paul", senderEmail: "p@example.com",
        workspaceName: "Acme", signedAt: "2026-09-26T00:00:00.000Z", completion: null },
    ]);
    render(<MemoryRouter><SignedByMeSection /></MemoryRouter>);
    const grid = await screen.findByRole("list", { name: "Completed documents I signed" });
    expect(within(grid).getByText("Lease")).toBeTruthy();
    expect(within(grid).queryByText("NDA")).toBeNull();
    expect(screen.getByRole("heading", { name: "Waiting for others to finish" })).toBeTruthy();
    const t = await table("Signed by me");
    expect(within(t).getByText("NDA")).toBeTruthy();

    await userEvent.click(within(grid).getByRole("button", { name: "Show actions for Lease" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /View audit trail/ }));
    const dialog = await screen.findByRole("dialog", { name: /Audit trail/ });
    expect(await within(dialog).findByText("Sent for signing")).toBeTruthy();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

const documentsToSign = vi.fn();
vi.mock("../../../../services/real/my-signing.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/my-signing.service")>();
  return {
    ...actual,
    realMySigningService: {
      documentsToSign: () => documentsToSign(),
      signedDocuments: () => Promise.resolve([]),
      continueSigning: vi.fn(),
    },
  };
});

import { DocumentsToSignSection, OthersSection } from "../MySigningSections";

const entry = (recipientType: string | null, title: string) => ({
  signingRequestId: `sr_${title}`, recipientId: `r_${title}`, documentTitle: title, recipientType,
  senderName: "Paul", senderEmail: "paul@example.com", workspaceName: "Acme",
  invitedAt: "2026-09-25T00:00:00.000Z", expiresAt: "2026-10-25T00:00:00.000Z",
});

beforeEach(() => {
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
    expect(onCount).toHaveBeenLastCalledWith(2);
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
    expect(onCount).toHaveBeenLastCalledWith(5);
  });

  it("offers a role-worded continue to those who act, and none to those who only receive", async () => {
    render(<MemoryRouter><OthersSection /></MemoryRouter>);
    const t = await table("Other documents I take part in");
    expect(within(t).getByRole("button", { name: /Continue to approve/ })).toBeTruthy();
    expect(within(t).getByRole("button", { name: /Continue reviewing/ })).toBeTruthy();
    expect(within(t).getByRole("button", { name: /Continue to acknowledge/ })).toBeTruthy();
    expect(within(t).getByText("Open it from your email link")).toBeTruthy();
    expect(within(t).getByText(/completed copy by email/)).toBeTruthy();
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

// The audit trail dialog, against a stubbed audit endpoint.
//
// This is a record, and the assertions are about fidelity: that every entry
// the backend sent is on screen with its actor, its absolute timestamp, and
// its authentication/consent details verbatim — plus the three states a real
// request meets (empty trail, failed load, closed by the person).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AuditTrail } from "../../../services/real/signing-request.service";

const audit = vi.fn();
vi.mock("../../../services/real/signing-request.service", () => ({
  realSigningRequestService: { audit: (...args: unknown[]) => audit(...args) },
}));

import { AuditTrailDialog } from "../AuditTrailDialog";

const trail: AuditTrail = {
  signingRequestId: "sr_1",
  state: "completed",
  entries: [
    {
      id: "ev_1", type: "signing-request.sent", eventVersion: 1,
      occurredAt: "2026-09-18T02:15:00.000Z",
      actor: { type: "workspace-user", displayName: "Ana Reyes" },
      description: "Signing request sent to 2 recipients.",
      details: { kind: "none" },
    },
    {
      id: "ev_2", type: "recipient.authenticated", eventVersion: 1,
      occurredAt: "2026-09-18T03:40:12.000Z",
      actor: { type: "recipient", displayName: "James Reid", recipientId: "srr_1" },
      description: "James Reid opened the signing link.",
      details: { kind: "authentication", method: "email-otp" },
    },
    {
      id: "ev_3", type: "recipient.consented", eventVersion: 1,
      occurredAt: "2026-09-18T03:41:00.000Z",
      actor: { type: "recipient", displayName: "James Reid", recipientId: "srr_1" },
      description: "James Reid agreed to sign electronically.",
      details: { kind: "consent", consentType: "electronic-records", consentVersion: "1.2" },
    },
    {
      id: "ev_4", type: "signing-request.completed", eventVersion: 1,
      occurredAt: "2026-09-18T03:45:00.000Z",
      actor: { type: "system", displayName: "LAGDA" },
      description: "All required signatures collected; document sealed.",
      details: { kind: "none" },
    },
  ],
};

function renderDialog(onClose: () => void = vi.fn()) {
  render(
    <AuditTrailDialog
      workspaceId="ws_1" signingRequestId="sr_1"
      documentTitle="Lease Agreement" onClose={onClose}
    />,
  );
}

// The summary line puts the count in a <strong>, so a matcher on "4 events"
// would span two elements and never match. This phrase is contiguous text.
const LOADED = /recorded by LAGDA as they happened/;

beforeEach(() => { vi.clearAllMocks(); });

describe("the record", () => {
  it("asks for this request's trail", async () => {
    audit.mockResolvedValue(trail);
    renderDialog();
    await screen.findByText(LOADED);
    expect(audit).toHaveBeenCalledWith("ws_1", "sr_1");
  });

  it("shows every entry, in order, with its actor", async () => {
    audit.mockResolvedValue(trail);
    renderDialog();
    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[0]?.textContent).toContain("Signing request sent");
    expect(items[0]?.textContent).toContain("Sender");
    expect(items[0]?.textContent).toContain("Ana Reyes");
    expect(items[1]?.textContent).toContain("Recipient");
    expect(items[3]?.textContent).toContain("LAGDA");
  });

  it("carries the authentication and consent details verbatim", async () => {
    // These are the facts a dispute would turn on. Summarising them into a
    // friendlier sentence is exactly what we would then be asked to justify.
    audit.mockResolvedValue(trail);
    renderDialog();
    expect(await screen.findByText(/Authenticated by email otp/)).toBeTruthy();
    expect(screen.getByText(/Consent: electronic records v1\.2/)).toBeTruthy();
  });

  it("stamps each entry with an absolute, machine-readable time", async () => {
    audit.mockResolvedValue(trail);
    renderDialog();
    await screen.findByText(LOADED);
    const times = document.querySelectorAll("time[datetime]");
    expect(times).toHaveLength(4);
    expect(times[1]?.getAttribute("datetime")).toBe("2026-09-18T03:40:12.000Z");
    // Rendered with a zone — "2 days ago" is useless as evidence.
    expect(times[1]?.textContent).toMatch(/[A-Z]{2,5}|GMT|UTC/);
  });

  it("names the document it is for", async () => {
    audit.mockResolvedValue(trail);
    renderDialog();
    expect(await screen.findByRole("dialog", { name: "Audit trail for Lease Agreement" })).toBeTruthy();
  });
});

describe("edge states", () => {
  it("says so when nothing has been recorded", async () => {
    audit.mockResolvedValue({ ...trail, entries: [] });
    renderDialog();
    expect(await screen.findByText(/Nothing has been recorded/)).toBeTruthy();
  });

  it("reports a failed load rather than an empty record", async () => {
    // An empty record and a failed fetch must never look alike: one says
    // "nothing happened", the other says "we could not tell you".
    audit.mockRejectedValue(new Error("500"));
    renderDialog();
    expect(await screen.findByText(/could not be loaded/)).toBeTruthy();
    expect(screen.queryByText(/Nothing has been recorded/)).toBeNull();
  });

  it("closes on Escape", async () => {
    audit.mockResolvedValue(trail);
    const onClose = vi.fn();
    renderDialog(onClose);
    await screen.findByText(LOADED);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes from its own button", async () => {
    audit.mockResolvedValue(trail);
    const onClose = vi.fn();
    renderDialog(onClose);
    await screen.findByText(LOADED);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

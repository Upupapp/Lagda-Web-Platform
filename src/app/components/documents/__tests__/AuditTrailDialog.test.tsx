// The audit trail dialog, against a stubbed audit endpoint.
//
// This is a record, and the assertions are about fidelity: that every entry
// the backend sent is on screen with its actor, its absolute timestamp, and
// its authentication/consent details verbatim — plus the three states a real
// request meets (empty trail, failed load, closed by the person).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
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
    <MemoryRouter>
      <AuditTrailDialog
        workspaceId="ws_1" signingRequestId="sr_1"
        documentTitle="Lease Agreement" onClose={onClose}
      />
    </MemoryRouter>,
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

describe("presentation fixes", () => {
  it("never doubles the v of a version that already carries one", async () => {
    const [, , consent] = trail.entries;
    audit.mockResolvedValue({
      ...trail,
      entries: [{ ...consent!, details: { kind: "consent", consentType: "electronic-records", consentVersion: "v0-demonstration" } }],
    });
    renderDialog();
    expect(await screen.findByText(/Consent: electronic records v0-demonstration/)).toBeTruthy();
    expect(screen.queryByText(/vv0/)).toBeNull();
  });

  it("puts a send before the eligibility it causes when they share an instant", async () => {
    const at = "2026-09-18T02:15:00.000Z";
    const base = { eventVersion: 1, occurredAt: at, details: { kind: "none" as const } };
    audit.mockResolvedValue({
      ...trail,
      entries: [
        { ...base, id: "a", type: "recipient-activated", actor: { type: "system", displayName: "LAGDA" }, description: "Recipient became eligible to sign" },
        { ...base, id: "b", type: "transaction-sent", actor: { type: "workspace-user", displayName: "Ana Reyes" }, description: "Request sent for signing" },
        { ...base, id: "c", type: "transaction-created", actor: { type: "workspace-user", displayName: "Ana Reyes" }, description: "Signing request created" },
      ],
    });
    renderDialog();
    const items = await screen.findAllByRole("listitem");
    expect(items.map(i => i.textContent)).toEqual([
      expect.stringContaining("Signing request created"),
      expect.stringContaining("Request sent for signing"),
      expect.stringContaining("Recipient became eligible to sign"),
    ]);
  });

  it("keeps the server's order for entries at different times", async () => {
    audit.mockResolvedValue(trail);
    renderDialog();
    const items = await screen.findAllByRole("listitem");
    expect(items.map(i => i.textContent)).toEqual([
      expect.stringContaining("Signing request sent"),
      expect.stringContaining("opened the signing link"),
      expect.stringContaining("agreed to sign"),
      expect.stringContaining("All required signatures"),
    ]);
  });

  it("names the page as the sidebar does, and the name is a link to it", async () => {
    // It said "Verify Document" in blue, which is not what the sidebar calls
    // the page and was not a link.
    audit.mockResolvedValue(trail);
    const onClose = vi.fn();
    renderDialog(onClose);
    const link = await screen.findByRole("link", { name: "Verify a Document" });
    expect(link).toHaveAttribute("href", "/app/verify");
    await userEvent.click(link);
    expect(onClose).toHaveBeenCalled();
  });
});

// 105. The identity check's entries. A check made in test mode was SIMULATED:
// the server's sentence says so, and nothing added beside it may read as a
// verification.
describe("identity check entries", () => {
  const recipient = { type: "recipient" as const, displayName: "James Reid", recipientId: "srr_1" };

  it("shows the server's sentence, the kind of ID and how the selfie was taken", async () => {
    audit.mockResolvedValue({
      ...trail,
      entries: [{
        id: "ev_i", type: "identity-check-passed", eventVersion: 1, occurredAt: "2026-09-18T03:40:30.000Z",
        actor: recipient, description: "Identity check simulated (test mode): passed",
        details: { kind: "identity-check", mode: "test", outcome: "passed", idType: "umid", capture: "camera" },
      }],
    });
    renderDialog();
    const [item] = await screen.findAllByRole("listitem");
    expect(item?.textContent).toContain("Identity check simulated (test mode): passed");
    const extra = screen.getByTestId("audit-identity-check").textContent ?? "";
    expect(extra).toContain("ID: UMID (SSS / GSIS)");
    expect(extra).toContain("Captured by camera");
    expect(extra).toContain("Test mode: simulated");
    expect(extra).not.toMatch(/verified|identity confirmed|biometric/i);
  });

  it("says Uploaded selfie, and leaves out what the entry does not carry", async () => {
    audit.mockResolvedValue({
      ...trail,
      entries: [
        {
          id: "ev_f", type: "identity-check-failed", eventVersion: 1, occurredAt: "2026-09-18T03:40:30.000Z",
          actor: recipient, description: "Identity check not passed",
          details: { kind: "identity-check", mode: "live", outcome: "failed", idType: "a-new-kind", capture: "upload" },
        },
        {
          id: "ev_g", type: "identity-check-failed", eventVersion: 1, occurredAt: "2026-09-18T03:41:30.000Z",
          actor: recipient, description: "Identity check not passed",
          details: { kind: "identity-check", mode: "live", outcome: "failed", idType: null, capture: null },
        },
      ],
    });
    renderDialog();
    const [first, second] = await screen.findAllByTestId("audit-identity-check");
    expect(first?.textContent).toContain("ID: a new kind");
    expect(first?.textContent).toContain("Uploaded selfie");
    expect(first?.textContent).not.toContain("Test mode");
    expect(second?.textContent).toBe("");
  });

  it("shows the sender's reason for allowing a lighter method, when one was given", async () => {
    const waived = {
      type: "identity-check-waived", eventVersion: 1,
      actor: { type: "workspace-user" as const, displayName: "Ana Reyes" },
      description: "Sender allowed this participant to continue without the identity check",
    };
    audit.mockResolvedValue({
      ...trail,
      entries: [
        { ...waived, id: "ev_w1", occurredAt: "2026-09-18T03:42:00.000Z", details: { kind: "identity-check-waived", reason: "No ID with them" } },
        { ...waived, id: "ev_w2", occurredAt: "2026-09-18T03:43:00.000Z", details: { kind: "identity-check-waived", reason: null } },
      ],
    });
    renderDialog();
    const items = await screen.findAllByRole("listitem");
    expect(items[0]?.textContent).toContain("Sender allowed this participant to continue without the identity check");
    expect(screen.getAllByTestId("audit-identity-waiver")).toHaveLength(1);
    expect(screen.getByTestId("audit-identity-waiver").textContent).toBe("Reason: No ID with them");
  });

  it("puts a failed attempt, the pass and the consent in that order when they share an instant", async () => {
    const at = "2026-09-18T03:40:30.000Z";
    const base = { eventVersion: 1, occurredAt: at, actor: recipient };
    audit.mockResolvedValue({
      ...trail,
      entries: [
        { ...base, id: "c", type: "consent-accepted", description: "Consent accepted", details: { kind: "consent", consentType: "electronic-records", consentVersion: "1" } },
        { ...base, id: "w", type: "identity-check-waived", description: "Sender allowed this participant to continue without the identity check", details: { kind: "identity-check-waived", reason: null } },
        { ...base, id: "p", type: "identity-check-passed", description: "Identity check simulated (test mode): passed", details: { kind: "identity-check", mode: "test", outcome: "passed", idType: null, capture: null } },
        { ...base, id: "f", type: "identity-check-failed", description: "Identity check simulated (test mode): not passed", details: { kind: "identity-check", mode: "test", outcome: "failed", idType: null, capture: null } },
        { ...base, id: "v", type: "document-viewed", description: "Signing link opened", details: { kind: "none" } },
      ],
    });
    renderDialog();
    const items = await screen.findAllByRole("listitem");
    expect(items.map(i => i.textContent)).toEqual([
      expect.stringContaining("Signing link opened"),
      expect.stringContaining("(test mode): not passed"),
      expect.stringContaining("(test mode): passed"),
      expect.stringContaining("Sender allowed this participant"),
      expect.stringContaining("Consent accepted"),
    ]);
  });

  it("still shows an entry whose details this build does not know", async () => {
    audit.mockResolvedValue({
      ...trail,
      entries: [{
        id: "ev_n", type: "something-new", eventVersion: 1, occurredAt: "2026-09-18T03:40:30.000Z",
        actor: recipient, description: "Something new happened",
        details: { kind: "a-future-kind", detail: "x" } as unknown as AuditTrail["entries"][number]["details"],
      }],
    });
    renderDialog();
    const [item] = await screen.findAllByRole("listitem");
    expect(item?.textContent).toContain("Something new happened");
    expect(item?.textContent).toContain("James Reid");
    expect(screen.queryByTestId("audit-identity-check")).toBeNull();
  });
});

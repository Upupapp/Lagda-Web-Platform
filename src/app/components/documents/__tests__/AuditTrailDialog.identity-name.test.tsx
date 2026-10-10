// The audit trail and the name read from a participant's ID.
//
// The server supplies each entry's sentence. Pinned here is what is added
// under it: the name on the ID of a passed check, what differed where it was
// a close match, and the facts recorded with a mismatch and an acceptance.
// Also the order of entries that share an instant (verified, mismatch, the
// sender's acceptance, consent), and that an entry of a kind this build does
// not know renders as it always did.

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { AuditTrail, AuditEntry, AuditDetails } from "../../../services/real/signing-request.service";

const audit = vi.fn();
vi.mock("../../../services/real/signing-request.service", () => ({
  realSigningRequestService: { audit: (...args: unknown[]) => audit(...args) as unknown },
}));

import { AuditTrailDialog } from "../AuditTrailDialog";
import { orderAuditEntries } from "../audit-order";

const AT = "2026-10-10T03:40:30.000Z";

const entry = (id: string, type: string, description: string, details: AuditDetails, occurredAt = AT): AuditEntry => ({
  id, type, eventVersion: 1, occurredAt,
  actor: { type: "recipient", displayName: "Maria Santos", recipientId: "srr_1" },
  description, details,
});

const passed = (over: Record<string, unknown> = {}) => entry("ev_pass", "identity-check-passed", "Identity check passed", {
  kind: "identity-check", mode: "live", outcome: "passed", idType: "passport", capture: "provider",
  provider: "didit", providerReference: "ref-1", ...over,
});

function renderWith(entries: AuditEntry[]) {
  const trail: AuditTrail = { signingRequestId: "sr_1", state: "sent", entries };
  audit.mockResolvedValue(trail);
  render(
    <MemoryRouter>
      <AuditTrailDialog workspaceId="ws_1" signingRequestId="sr_1" documentTitle="Lease Agreement" onClose={vi.fn()} />
    </MemoryRouter>,
  );
}

const lines = (testId: string) => [...screen.getByTestId(testId).querySelectorAll(":scope > div > div")].map(line => line.textContent ?? "");

describe("the name on the ID, in the audit trail", () => {
  it("adds the name to a passed check that carries one", async () => {
    renderWith([passed({ verifiedName: "Maria Clara Santos", nameMatch: "match", nameDifferences: [] })]);
    expect((await screen.findByTestId("audit-identity-name")).textContent ?? "").toBe("Name on ID: Maria Clara Santos");
    expect(screen.queryByTestId("audit-identity-name-close")).toBeNull();
    // What was there before is still there.
    expect(screen.getByTestId("audit-identity-check").textContent ?? "").toContain("ID: Passport");
    expect(screen.getByTestId("audit-identity-reference").textContent ?? "").toBe("Reference: ref-1");
  });

  it("says what differed for a close match, in plain words, including a difference it does not know", async () => {
    renderWith([passed({
      verifiedName: "Maria C. Santos Jr.", nameMatch: "close",
      nameDifferences: ["middle-initial", "suffix", "hyphenated-surname"],
    })]);
    expect((await screen.findByTestId("audit-identity-name-close")).textContent ?? "")
      .toBe("Close match: middle initial, suffix (Jr., III…), hyphenated surname");
  });

  it("says Close match alone when no difference is named", async () => {
    renderWith([passed({ verifiedName: "Maria Santos", nameMatch: "close" })]);
    expect((await screen.findByTestId("audit-identity-name-close")).textContent ?? "").toBe("Close match");
  });

  it("adds nothing to a check from an older server", async () => {
    renderWith([passed()]);
    const extra = await screen.findByTestId("audit-identity-check");
    expect(extra.textContent ?? "").not.toMatch(/Name on ID|Close match/);
    expect(screen.queryByTestId("audit-identity-name")).toBeNull();
  });

  it("shows both names for a mismatch", async () => {
    renderWith([entry("ev_mm", "identity-name-mismatch", "The name on the ID did not match the document", {
      kind: "identity-name-mismatch", verifiedName: "Maria Clara Santos-Dela Cruz", documentName: "Maria Santos",
    })]);
    await screen.findByText("The name on the ID did not match the document");
    expect(lines("audit-identity-name-mismatch")).toEqual([
      "Name on ID: Maria Clara Santos-Dela Cruz", "On this document: Maria Santos",
    ]);
  });

  it("shows both names and the reason for an acceptance", async () => {
    renderWith([entry("ev_acc", "identity-name-accepted", "The sender accepted the name on the ID", {
      kind: "identity-name-accepted", verifiedName: "Maria Clara Santos-Dela Cruz", documentName: "Maria Santos",
      reason: "Married name",
    })]);
    await screen.findByText("The sender accepted the name on the ID");
    expect(lines("audit-identity-name-accepted")).toEqual([
      "Name on ID: Maria Clara Santos-Dela Cruz", "On this document: Maria Santos", "Reason: Married name",
    ]);
    // A long name or reason wraps instead of overflowing.
    const wrap = screen.getByTestId("audit-identity-name-accepted").querySelector("div") as HTMLElement;
    expect(wrap.style.overflowWrap).toBe("anywhere");
  });

  it("adds no name line where the ID's name could not be read", async () => {
    renderWith([passed({ verifiedName: null, nameMatch: "unavailable" })]);
    const extra = await screen.findByTestId("audit-identity-check");
    expect(extra.textContent ?? "").toContain("ID: Passport");
    expect(extra.textContent ?? "").not.toMatch(/Name on ID|Close match|Accepted/);
    expect(screen.queryByTestId("audit-identity-name")).toBeNull();
    // The server's own sentence is what says so.
    expect(screen.getByText("Identity check passed")).toBeInTheDocument();
  });

  it("notes a later pass under a name the sender already accepted", async () => {
    renderWith([passed({ verifiedName: "Maria Clara Santos-Dela Cruz", nameMatch: "accepted" })]);
    expect((await screen.findByTestId("audit-identity-name")).textContent ?? "").toBe("Name on ID: Maria Clara Santos-Dela Cruz");
    expect(screen.getByTestId("audit-identity-name-accepted-note").textContent ?? "").toBe("Accepted by the sender");
    expect(screen.queryByTestId("audit-identity-name-close")).toBeNull();
  });

  it("says the spacing of a family name in plain words", async () => {
    renderWith([passed({ verifiedName: "Maria De la Cruz", nameMatch: "close", nameDifferences: ["spacing"] })]);
    expect((await screen.findByTestId("audit-identity-name-close")).textContent ?? "")
      .toBe("Close match: spacing of the family name (Dela Cruz / De la Cruz)");
  });

  it("renders a kind the server does not send, such as a correction, like any unknown entry", async () => {
    renderWith([entry("ev_cor", "identity-name-corrected", "The sender changed the participant's name", {
      kind: "identity-name-corrected", previousName: "Maria Santos", newName: "Maria Clara Santos",
    } as unknown as AuditDetails)]);
    const row = (await screen.findByText("The sender changed the participant's name")).closest("li") as HTMLElement;
    expect(row.textContent ?? "").not.toMatch(/Changed from|Name on ID/);
  });

  it("adds no empty block when the facts were not recorded", async () => {
    renderWith([
      entry("ev_mm", "identity-name-mismatch", "The name on the ID did not match the document", { kind: "identity-name-mismatch" }),
      entry("ev_acc", "identity-name-accepted", "The sender accepted the name on the ID", { kind: "identity-name-accepted", reason: "  " }),
    ]);
    await screen.findByText("The sender accepted the name on the ID");
    expect(screen.queryByTestId("audit-identity-name-mismatch")).toBeNull();
    expect(screen.queryByTestId("audit-identity-name-accepted")).toBeNull();
  });

  it("still renders an entry of a kind this build does not know, with its sentence and nothing invented", async () => {
    renderWith([entry("ev_new", "something-new", "Something new happened", { kind: "something-new", verifiedName: "X" } as unknown as AuditDetails)]);
    const row = (await screen.findByText("Something new happened")).closest("li") as HTMLElement;
    expect(within(row).getByText("Maria Santos")).toBeInTheDocument();
    expect(row.textContent ?? "").not.toMatch(/Name on ID|Reason:|Changed from/);
    expect(within(row).getByText(/2026/)).toBeInTheDocument();
  });
});

describe("the order of entries written in the same instant", () => {
  const consent = entry("ev_consent", "consent-accepted", "Consent accepted", { kind: "consent", consentType: "electronic-records", consentVersion: "v1" });
  const mismatch = entry("ev_mm", "identity-name-mismatch", "Name mismatch", { kind: "identity-name-mismatch" });
  const accepted = entry("ev_acc", "identity-name-accepted", "Name accepted", { kind: "identity-name-accepted" });
  const waived = entry("ev_waive", "identity-check-waived", "Lighter method allowed", { kind: "identity-check-waived", reason: null });
  const ids = (entries: AuditEntry[]) => orderAuditEntries(entries).map(e => e.id);

  it("reads verified, mismatch, the sender's acceptance, then consent", () => {
    expect(ids([consent, accepted, mismatch, passed()])).toEqual(["ev_pass", "ev_mm", "ev_acc", "ev_consent"]);
  });

  it("puts a lighter method after the mismatch it answers", () => {
    expect(ids([waived, mismatch, passed()])).toEqual(["ev_pass", "ev_mm", "ev_waive"]);
  });

  it("places them by what they carry, whatever the server calls the event", () => {
    const renamed = (source: AuditEntry, type: string) => ({ ...source, type });
    expect(ids([consent, renamed(accepted, "identity-check-name-accepted"), renamed(mismatch, "identity-check-name-mismatch"), passed()]))
      .toEqual(["ev_pass", "ev_mm", "ev_acc", "ev_consent"]);
  });

  it("never reorders entries at different times", () => {
    const later = (source: AuditEntry, seconds: number) => ({
      ...source, occurredAt: new Date(Date.parse(AT) + seconds * 1000).toISOString(),
    });
    expect(ids([consent, later(mismatch, 1), later(passed(), 2), later(accepted, 3)]))
      .toEqual(["ev_consent", "ev_mm", "ev_pass", "ev_acc"]);
  });

  it("keeps an unknown kind beside its neighbour, as before", () => {
    const unknown = entry("ev_new", "something-new", "Something new", { kind: "none" });
    expect(ids([passed(), unknown, consent])).toEqual(["ev_pass", "ev_new", "ev_consent"]);
  });

  it("shows them in that order in the dialog", async () => {
    renderWith([consent, accepted, mismatch, passed()]);
    await screen.findByText("Name accepted");
    const shown = within(screen.getByRole("list")).getAllByRole("listitem").map(item => item.textContent ?? "");
    expect(shown.map(text => /^(Identity check passed|Name mismatch|Name accepted|Consent accepted)/.exec(text)?.[1])).toEqual([
      "Identity check passed", "Name mismatch", "Name accepted", "Consent accepted",
    ]);
  });
});

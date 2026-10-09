// The audit trail's identity check entries, where the check was done by the
// identity verification partner.
//
// Pinned: the partner is named as "our identity partner" and never by brand;
// its reference is shown on a line of its own that selects whole; the kinds
// of ID it reports have names; and an attempt that was not passed is never
// called verified.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { AuditTrail, AuditEntry, AuditDetails } from "../../../services/real/signing-request.service";

const audit = vi.fn();
vi.mock("../../../services/real/signing-request.service", () => ({
  realSigningRequestService: { audit: (...args: unknown[]) => audit(...args) as unknown },
}));

import { AuditTrailDialog } from "../AuditTrailDialog";

const entry = (id: string, details: AuditDetails, passed = true): AuditEntry => ({
  id, type: passed ? "identity-check-passed" : "identity-check-failed", eventVersion: 1,
  occurredAt: "2026-10-09T03:40:30.000Z",
  actor: { type: "recipient", displayName: "James Reid", recipientId: "srr_1" },
  description: passed ? "Identity check passed" : "Identity check not passed",
  details,
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

describe("identity check entries from the identity partner", () => {
  it("names the kind of ID, who verified it, and the reference to quote", async () => {
    renderWith([entry("ev_1", {
      kind: "identity-check", mode: "live", outcome: "passed", idType: "passport", capture: "provider",
      provider: "didit", providerReference: "a1b2c3d4-0000-4000-8000-123456789abc",
    })]);
    const extra = await screen.findByTestId("audit-identity-check");
    expect(extra.textContent).toContain("ID: Passport");
    expect(extra.textContent).toContain("Verified by our identity partner");
    expect(extra.textContent).not.toMatch(/Captured by camera|Uploaded selfie|Test mode/);
    // Never the vendor's name.
    expect(document.body.textContent).not.toMatch(/didit/i);

    const reference = screen.getByTestId("audit-identity-reference");
    expect(reference.textContent).toBe("Reference: a1b2c3d4-0000-4000-8000-123456789abc");
    const value = screen.getByText("a1b2c3d4-0000-4000-8000-123456789abc");
    expect(value.style.userSelect).toBe("all");
  });

  it("names Other government ID, and does not call an attempt that was not passed verified", async () => {
    renderWith([entry("ev_2", {
      kind: "identity-check", mode: "live", outcome: "failed", idType: "other-id", capture: "provider",
      provider: "didit", providerReference: "ref-2",
    }, false)]);
    const extra = await screen.findByTestId("audit-identity-check");
    expect(extra.textContent).toContain("ID: Other government ID");
    expect(extra.textContent).toContain("Checked by our identity partner");
    expect(extra.textContent).not.toMatch(/Verified/);
    expect(screen.getByTestId("audit-identity-reference").textContent).toBe("Reference: ref-2");
  });

  it("shows no reference line when the entry carries none", async () => {
    renderWith([
      entry("ev_3", { kind: "identity-check", mode: "live", outcome: "passed", idType: "passport", capture: "provider", provider: "didit" }),
      entry("ev_4", { kind: "identity-check", mode: "live", outcome: "passed", idType: null, capture: "provider", providerReference: "  " }),
      entry("ev_5", { kind: "identity-check", mode: "test", outcome: "passed", idType: "umid", capture: "camera" }),
    ]);
    const rows = await screen.findAllByTestId("audit-identity-check");
    expect(rows).toHaveLength(3);
    expect(screen.queryByTestId("audit-identity-reference")).toBeNull();
    // An entry made on LAGDA's own screens reads as it always did.
    const inline = rows.find(row => (row.textContent ?? "").includes("UMID"));
    expect(inline?.textContent).toContain("ID: UMID (SSS / GSIS)");
    expect(inline?.textContent).toContain("Captured by camera");
    expect(inline?.textContent).toContain("Test mode: simulated");
  });
});

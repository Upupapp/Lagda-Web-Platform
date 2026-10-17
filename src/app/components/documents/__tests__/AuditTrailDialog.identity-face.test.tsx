// The audit trail's identity check entries, where the check was a face check
// alone against an earlier verification.
//
// Pinned: it is called "Confirmed by a face check", not a verification by the
// partner (no ID was shown); the reference line is as for any provider check;
// an attempt that was not passed is never called confirmed; and the vendor is
// never named.

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
  occurredAt: "2026-10-12T03:40:30.000Z",
  actor: { type: "recipient", displayName: "James Reid", recipientId: "srr_1" },
  description: passed ? "Identity confirmed by a face check against an earlier verification." : "Face check not passed.",
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

describe("identity check entries from a face check", () => {
  it("says it was confirmed by a face check, with the reference to quote", async () => {
    renderWith([entry("ev_1", {
      kind: "identity-check", mode: "live", outcome: "passed", idType: null, capture: "provider-face",
      provider: "didit", providerReference: "f1f2f3f4-0000-4000-8000-123456789abc",
    })]);
    const extra = await screen.findByTestId("audit-identity-check");
    expect(extra.textContent ?? "").toContain("Confirmed by a face check");
    expect(extra.textContent ?? "").not.toMatch(/Verified by our identity partner|Captured by camera|Uploaded selfie|Test mode|ID:/);
    // The sentence the server wrote stands above it.
    expect(screen.getByText("Identity confirmed by a face check against an earlier verification.")).toBeInTheDocument();
    expect(screen.getByTestId("audit-identity-reference").textContent ?? "")
      .toBe("Reference: f1f2f3f4-0000-4000-8000-123456789abc");
    expect(screen.getByText("f1f2f3f4-0000-4000-8000-123456789abc").style.userSelect).toBe("all");
    expect(document.body.textContent ?? "").not.toMatch(/didit/i);
  });

  it("does not call a face check that was not passed confirmed", async () => {
    renderWith([entry("ev_2", {
      kind: "identity-check", mode: "live", outcome: "failed", idType: null, capture: "provider-face",
      provider: "didit", providerReference: "ref-2",
    }, false)]);
    const extra = await screen.findByTestId("audit-identity-check");
    expect(extra.textContent ?? "").toContain("Face check only, no ID shown");
    expect(extra.textContent ?? "").not.toMatch(/Confirmed|Verified/);
    expect(screen.getByTestId("audit-identity-reference").textContent ?? "").toBe("Reference: ref-2");
  });

  it("still says a full check was verified by our identity partner", async () => {
    renderWith([entry("ev_3", {
      kind: "identity-check", mode: "live", outcome: "passed", idType: "passport", capture: "provider",
      provider: "didit", providerReference: "ref-3",
    })]);
    const extra = await screen.findByTestId("audit-identity-check");
    expect(extra.textContent ?? "").toContain("Verified by our identity partner");
    expect(extra.textContent ?? "").not.toContain("Confirmed by a face check");
  });
});

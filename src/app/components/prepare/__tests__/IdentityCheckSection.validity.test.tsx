// The sender is told how long a pass counts: one muted line under the
// explanation, wherever the section is offered (Prepare, and the send-again
// dialog that shares it). Not where the plan does not include the check, and
// not where the check is not offered at all.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { IdentityCheckSection } from "../IdentityCheckSection";
import type { IdentityRequirementsControl } from "../../../hooks/useIdentityCheckRequirements";

const control = (over: Partial<IdentityRequirementsControl> = {}): IdentityRequirementsControl => ({
  status: "ready", mode: "live", flow: "inline", canEdit: true, saveState: "idle", error: null,
  isRequired: () => false, isWaived: () => false,
  setRequired: () => undefined, requireAllSigners: () => undefined, clear: () => undefined,
  ...over,
});
const people = [{ id: "p1", name: "Ana Reyes", email: "ana@example.ph", role: "signer" }];
const LINE = "A participant who passes is not asked again for 24 hours on this workspace's documents.";

describe("how long a pass counts, for the sender", () => {
  it("is said under the explanation when the check is available", () => {
    render(<IdentityCheckSection control={control()} participants={people} />);
    expect(screen.getByTestId("identity-check-valid-note").textContent ?? "").toBe(LINE);
    // After the explanation, before the list.
    const explainer = screen.getByTestId("identity-check-explainer");
    expect(explainer.compareDocumentPosition(screen.getByTestId("identity-check-valid-note"))
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("is said in the hosted flow and in test mode too", () => {
    render(<IdentityCheckSection control={control({ flow: "hosted", mode: "test" })} participants={people} />);
    expect(screen.getByTestId("identity-check-valid-note").textContent ?? "").toBe(LINE);
  });

  it("is said while the document's settings are still loading", () => {
    render(<IdentityCheckSection control={control({ status: "loading", canEdit: false })} participants={people} />);
    expect(screen.getByTestId("identity-check-valid-note")).toBeInTheDocument();
  });

  it("is not said where the plan does not include the check", () => {
    render(<IdentityCheckSection control={control({ status: "plan-locked", canEdit: false })} participants={people} />);
    expect(screen.getByTestId("identity-check-plan-note")).toBeInTheDocument();
    expect(screen.queryByTestId("identity-check-valid-note")).toBeNull();
    expect(screen.queryByText(LINE)).toBeNull();
  });

  it("is not said where the check is not offered: nothing is rendered at all", () => {
    const { container } = render(<IdentityCheckSection control={control({ status: "off", mode: null, canEdit: false })} participants={people} />);
    expect(container.innerHTML).toBe("");
  });
});

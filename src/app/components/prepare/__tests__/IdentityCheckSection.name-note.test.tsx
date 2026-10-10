// The sender is told the name must match: one muted line under the
// explanation, wherever the section is offered (Prepare, and the send-again
// dialog that shares it). Not where the plan does not include the check, and
// not where the check is not offered at all.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { IdentityCheckSection } from "../IdentityCheckSection";
import type { IdentityRequirementsControl } from "../../../hooks/useIdentityCheckRequirements";

const control = (over: Partial<IdentityRequirementsControl> = {}): IdentityRequirementsControl => ({
  status: "ready", mode: "live", flow: "hosted", canEdit: true, saveState: "idle", error: null,
  isRequired: () => false, isWaived: () => false,
  setRequired: () => undefined, requireAllSigners: () => undefined, clear: () => undefined,
  ...over,
});
const people = [{ id: "p1", name: "Ana Reyes", email: "ana@example.ph", role: "signer" }];
const LINE = "The name on the participant's ID must match the name you enter for them here.";

describe("the name must match, for the sender", () => {
  it("is said under the explanation, after how long a pass counts and before the list", () => {
    render(<IdentityCheckSection control={control()} participants={people} />);
    const note = screen.getByTestId("identity-check-name-note");
    expect(note.textContent ?? "").toBe(LINE);
    const follows = (first: HTMLElement, second: HTMLElement) =>
      Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(screen.getByTestId("identity-check-explainer"), note)).toBe(true);
    expect(follows(screen.getByTestId("identity-check-valid-note"), note)).toBe(true);
    expect(follows(note, screen.getByRole("switch", { name: /Ana Reyes/ }))).toBe(true);
    // Said once.
    expect(screen.getAllByText(LINE)).toHaveLength(1);
  });

  it("is said while the document's settings are still loading, and with nobody listed yet", () => {
    render(<IdentityCheckSection control={control({ status: "loading", canEdit: false })} participants={[]} />);
    expect(screen.getByTestId("identity-check-name-note").textContent ?? "").toBe(LINE);
  });

  it("is not said where the plan does not include the check", () => {
    render(<IdentityCheckSection control={control({ status: "plan-locked", canEdit: false })} participants={people} />);
    expect(screen.getByTestId("identity-check-plan-note")).toBeInTheDocument();
    expect(screen.queryByTestId("identity-check-name-note")).toBeNull();
    expect(screen.queryByText(LINE)).toBeNull();
  });

  it("is not said where the check is not offered: nothing is rendered at all", () => {
    const { container } = render(<IdentityCheckSection control={control({ status: "off", mode: null, canEdit: false })} participants={people} />);
    expect(container.innerHTML).toBe("");
  });
});

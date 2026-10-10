// What LAGDA keeps of a check, on the consent screen of the check done on
// LAGDA's own screens. Said only where the check is real: in test mode
// nothing is read from an ID, so nothing is kept and the screen does not
// say otherwise.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { IdentityCheckStep, type IdentityCheckStepProps } from "../IdentityCheckStep";
import { IDENTITY_CHECK_KEPT_NOTE } from "../../../models/identity-check";
import type { CeremonyIdentityCheck } from "../../../services/real/signing-access.service";

const check = (mode: CeremonyIdentityCheck["mode"]): CeremonyIdentityCheck => ({
  required: true, status: "pending", mode, attemptsRemaining: 3, verifiedAt: null, idTypes: ["umid", "philippine-passport"],
});

function setup(mode: CeremonyIdentityCheck["mode"]) {
  const props: IdentityCheckStepProps = {
    identityCheck: check(mode), documentTitle: "Office Lease",
    submit: vi.fn<IdentityCheckStepProps["submit"]>(), onReload: vi.fn<IdentityCheckStepProps["onReload"]>(),
  };
  render(<IdentityCheckStep {...props} />);
}

describe("what LAGDA keeps, on the inline consent screen", () => {
  it("is said where the check is real", () => {
    setup("live");
    expect(screen.getByRole("heading", { name: "Before you start" })).toBeInTheDocument();
    expect(screen.getByTestId("identity-check-kept-note").textContent ?? "").toBe(IDENTITY_CHECK_KEPT_NOTE);
    expect(screen.queryByText(/In test mode nothing leaves this device/)).toBeNull();
  });

  it("is not said in test mode, which reads as it always did", () => {
    setup("test");
    expect(screen.getByRole("heading", { name: "Before you start" })).toBeInTheDocument();
    expect(screen.queryByTestId("identity-check-kept-note")).toBeNull();
    expect(document.body.textContent ?? "").not.toContain("LAGDA keeps the name");
    expect(screen.getByText(/In test mode nothing leaves this device/)).toBeInTheDocument();
  });
});

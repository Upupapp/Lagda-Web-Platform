// What this screen must never become.
//
// It is the one place in the product that makes an offer rather than carries
// out an instruction, and it is shown to someone who did not choose to be
// here — they were sent a contract. That combination is exactly where a
// signing product starts nudging, and a nudge here is not a growth tactic but
// pressure applied to someone mid-way through a legal act.
//
// So these tests guard the SHAPE of the choice, not the wording:
//
//   - both paths reachable, in one interaction, from the first screen
//   - the no-account path stated as complete, never as a lesser fallback
//   - no claim that signing without an account is less secure or less binding
//
// The copy can be rewritten freely. What it may not do is start ranking the
// two paths on safety or legality, because that would be untrue.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SigningEntryChoice } from "../SigningEntryChoice";

function setup(overrides: Partial<Parameters<typeof SigningEntryChoice>[0]> = {}) {
  const onContinueWithoutAccount = vi.fn();
  const onContinueWithAccount = vi.fn();
  const view = render(
    <SigningEntryChoice
      documentTitle="Engagement Letter"
      maskedEmail="bud•••@example.com"
      onContinueWithoutAccount={onContinueWithoutAccount}
      onContinueWithAccount={onContinueWithAccount}
      {...overrides}
    />,
  );
  return { onContinueWithoutAccount, onContinueWithAccount, container: view.container };
}

describe("SigningEntryChoice", () => {
  it("offers both ways to sign as labelled regions", () => {
    setup();
    expect(screen.getByRole("region", { name: /without a LAGDA account/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /with your LAGDA account/i })).toBeInTheDocument();
  });

  it("names the document and the address it was sent to", () => {
    setup();
    expect(screen.getByText("Engagement Letter")).toBeInTheDocument();
    expect(screen.getByText(/bud•••@example\.com/)).toBeInTheDocument();
  });

  it("reaches the no-account path in a single click", async () => {
    const { onContinueWithoutAccount, onContinueWithAccount } = setup();
    await userEvent.click(screen.getByRole("button", { name: /continue without an account/i }));
    expect(onContinueWithoutAccount).toHaveBeenCalledTimes(1);
    expect(onContinueWithAccount).not.toHaveBeenCalled();
  });

  it("reaches the account path in a single click", async () => {
    const { onContinueWithoutAccount, onContinueWithAccount } = setup();
    await userEvent.click(screen.getByRole("button", { name: /sign in & continue/i }));
    expect(onContinueWithAccount).toHaveBeenCalledTimes(1);
    expect(onContinueWithoutAccount).not.toHaveBeenCalled();
  });

  it("honours `disabled` on both paths, so neither can be clicked mid-flight", async () => {
    const { onContinueWithoutAccount, onContinueWithAccount } = setup({ disabled: true });
    for (const name of [/continue without an account/i, /sign in & continue/i]) {
      const button = screen.getByRole("button", { name });
      expect(button).toBeDisabled();
      await userEvent.click(button);
    }
    expect(onContinueWithoutAccount).not.toHaveBeenCalled();
    expect(onContinueWithAccount).not.toHaveBeenCalled();
  });

  // ── The anti-coercion guards ────────────────────────────────────────────

  it("states that both paths are equally binding", () => {
    setup();
    expect(screen.getByText(/same legally\s+binding signature/i)).toBeInTheDocument();
  });

  it("carries the secure-session assurance on the no-account panel", () => {
    setup();
    const guest = screen.getByRole("region", { name: /without a LAGDA account/i });
    expect(guest).toHaveTextContent(/secure session/i);
    expect(guest).toHaveTextContent(/encrypted in transit/i);
    expect(guest).toHaveTextContent(/audit trail/i);
  });

  it("never suggests the no-account path is less secure or less valid", () => {
    setup();
    const account = screen.getByRole("region", { name: /with your LAGDA account/i });
    const text = account.textContent ?? "";
    // The account panel may sell convenience. It may not sell safety it does
    // not uniquely have — the other path is encrypted and audited too.
    expect(text).not.toMatch(/more secure|safer|less secure|not secure|insecure/i);
    expect(text).not.toMatch(/legally binding|more valid|fully binding/i);
  });

  // ── Layout ──────────────────────────────────────────────────────────────
  //
  // These panels shipped stacked on a 1440px screen, because the card they
  // sit in caps at 560px by default: inner width ~512px against the 578px two
  // columns need. The grid did exactly what it was told and the container was
  // wrong, which is the failure mode worth pinning — nothing errors, the
  // layout just quietly reads as one column everywhere.
  it("asks for a reflowing two-column grid rather than a fixed one", () => {
    const { container } = setup();
    // A grid template is a style, not a role or a label. Testing Library has
    // no query for it, and asserting on it is the whole point of this test.
    // eslint-disable-next-line testing-library/no-node-access
    const grid = container.querySelector("[style*='grid-template-columns']");
    const columns = (grid as HTMLElement | null)?.style.gridTemplateColumns ?? "";
    // auto-fit + a percentage floor is what makes it collapse on a narrow
    // screen instead of overflowing it.
    expect(columns).toContain("auto-fit");
    expect(columns).toContain("100%");
  });

  it("does not make an account sound required", () => {
    const { container } = setup();
    expect(container.textContent ?? "").not.toMatch(
      /you must (sign in|create an account)|required to sign in/i);
  });
});

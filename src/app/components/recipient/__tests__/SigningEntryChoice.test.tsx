// The signer's sign-in step.
//
// Signing now requires a LAGDA account, so this screen is a single required
// step rather than a choice between two. These tests pin what a REQUIRED step
// owes someone who was sent a contract and did not ask to create an account:
//
//   - there is exactly one way forward, and it is signing in
//   - the address to sign in with is stated before they type anything
//   - creating an account is presented as possible and free, not as a wall
//   - nothing claims signing in makes the signature legally stronger, which
//     would be untrue
//
// The copy can be rewritten freely. What it may not do is offer a path that
// no longer exists, or promise something the account does not deliver.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SigningEntryChoice } from "../SigningEntryChoice";

function setup(overrides: Partial<Parameters<typeof SigningEntryChoice>[0]> = {}) {
  const onContinueWithAccount = vi.fn();
  const view = render(
    <SigningEntryChoice
      documentTitle="Engagement Letter"
      maskedEmail="bud•••@example.com"
      onContinueWithAccount={onContinueWithAccount}
      {...overrides}
    />,
  );
  return { onContinueWithAccount, container: view.container };
}

describe("SigningEntryChoice", () => {
  it("offers exactly one way forward, and it is signing in", () => {
    setup();
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName(/sign in & continue/i);
  });

  it("no longer offers to sign without an account", () => {
    // The panel this replaced was a choice. Leaving a way round the sign-in
    // on screen would make the requirement decorative.
    const { container } = setup();
    expect(container.textContent ?? "").not.toMatch(/without an account/i);
    expect(screen.queryByRole("button", { name: /without an account/i })).toBeNull();
  });

  it("signs in on a single click", async () => {
    const { onContinueWithAccount } = setup();
    await userEvent.click(screen.getByRole("button", { name: /sign in & continue/i }));
    expect(onContinueWithAccount).toHaveBeenCalledTimes(1);
  });

  it("honours `disabled`, so it cannot be pressed mid-flight", async () => {
    const { onContinueWithAccount } = setup({ disabled: true });
    const button = screen.getByRole("button", { name: /sign in & continue/i });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onContinueWithAccount).not.toHaveBeenCalled();
  });

  it("names the document and the address to sign in with", () => {
    // A different account is refused, so the address comes BEFORE the
    // password — not as an error after it.
    setup();
    expect(screen.getByText("Engagement Letter")).toBeInTheDocument();
    expect(screen.getByText(/bud•••@example\.com/)).toBeInTheDocument();
  });

  it("tells someone without an account that they can create one, free", () => {
    const { container } = setup();
    expect(container.textContent ?? "").toMatch(/create one free/i);
  });

  it("does not claim signing in makes the signature stronger or more valid", () => {
    // The signing link is what proves the document is yours to sign; the
    // account confirms who you are. Claiming more would be untrue on the one
    // screen where somebody decides whether to trust the product.
    const { container } = setup();
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/legally (stronger|binding)|more valid|more secure|safer/i);
  });

  it("warns that signing in opens a second tab", () => {
    // The ceremony stays in THIS tab and continues on its own. Somebody who
    // closes it thinking the new tab replaced it loses their place.
    const { container } = setup();
    expect(container.textContent ?? "").toMatch(/opens a new tab/i);
  });
});

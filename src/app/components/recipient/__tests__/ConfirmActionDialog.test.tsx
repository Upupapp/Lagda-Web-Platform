import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmActionDialog } from "../ConfirmActionDialog";
import { ceremonyWording } from "../../../services/participant-wording";

function open(type: string, over: { busy?: boolean } = {}) {
  const onContinue = vi.fn();
  const onCancel = vi.fn();
  const copy = ceremonyWording(type).confirm;
  if (copy === null) throw new Error(`${type} has no confirmation`);
  render(
    <ConfirmActionDialog
      copy={copy} documentTitle="Service Agreement" busy={over.busy ?? false}
      onContinue={onContinue} onCancel={onCancel}
    />,
  );
  return { onContinue, onCancel, dialog: screen.getByRole("alertdialog") };
}

describe("who is asked to confirm", () => {
  it.each([
    ["approver", "Confirm your approval", /formally approve this document/],
    ["reviewer", "Confirm your review", /formally state that you have reviewed/],
    ["acknowledgment-recipient", "Confirm your acknowledgment", /formally acknowledge that you have received and read/],
  ])("%s: named, with what Continue does and that it stays on the record", (type, title, lead) => {
    const { dialog } = open(type);
    expect(within(dialog).getByRole("heading", { name: title })).toBeTruthy();
    expect(within(dialog).getByText(lead)).toBeTruthy();
    expect(within(dialog).getByText(/recorded under your name with the date and time/)).toBeTruthy();
    expect(within(dialog).getByText(/cannot be undone or changed afterwards/)).toBeTruthy();
    expect(within(dialog).getByText("Service Agreement")).toBeTruthy();
  });

  it("a signer is not asked: signing is already a deliberate act", () => {
    expect(ceremonyWording("signer").confirm).toBeNull();
  });
});

describe("the dialog", () => {
  it("has exactly two actions, Continue and Cancel", () => {
    const { dialog } = open("reviewer");
    expect(within(dialog).getAllByRole("button").map(b => b.textContent)).toEqual(["Cancel", "Continue"]);
  });

  it("is centred on the screen at every width, never docked to an edge", () => {
    open("reviewer");
    const scrim = screen.getByTestId("confirm-action-scrim");
    expect(scrim.style.position).toBe("fixed");
    expect(scrim.style.alignItems).toBe("center");
    expect(scrim.style.justifyContent).toBe("center");
  });

  it("starts on Cancel, so Enter or a repeated tap cannot confirm by accident", () => {
    open("approver");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
  });

  it("Continue records, Cancel and Escape do not", async () => {
    const user = userEvent.setup();
    const { onContinue, onCancel } = open("acknowledgment-recipient");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("keeps Tab inside the two buttons", async () => {
    const user = userEvent.setup();
    open("reviewer");
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Continue" }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
  });

  it("holds both buttons while the decision is being recorded", async () => {
    const user = userEvent.setup();
    const { onContinue, onCancel } = open("approver", { busy: true });
    const buttons = screen.getAllByRole("button");
    expect(buttons.every(b => (b as HTMLButtonElement).disabled)).toBe(true);
    await user.keyboard("{Escape}");
    expect(onCancel).not.toHaveBeenCalled();
    expect(onContinue).not.toHaveBeenCalled();
  });
});

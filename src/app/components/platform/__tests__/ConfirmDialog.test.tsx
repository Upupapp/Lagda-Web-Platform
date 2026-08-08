// The confirm dialog replaced the last `window.confirm()` calls in the product,
// including "revoke every other session" and "turn off multi-factor
// authentication". A native dialog came with focus handling, an escape key and
// a modal barrier for free; a hand-built one only has them if they are tested.
//
// These tests are about that contract, not about appearance.

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ConfirmDialog, useConfirm } from "../ConfirmDialog";
import type { ConfirmRequest } from "../ConfirmDialog";

const BASE: ConfirmRequest = {
  title: "Revoke all other sessions?",
  body: "This signs out every other device.",
  confirmLabel: "Revoke other sessions",
  onConfirm: () => {},
};

function renderDialog(overrides: Partial<ConfirmRequest> = {}) {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  const result = render(
    <ConfirmDialog request={{ ...BASE, onConfirm, ...overrides }} onClose={onClose} />,
  );
  return { ...result, onClose, onConfirm, user: userEvent.setup() };
}

describe("ConfirmDialog", () => {
  it("exposes itself as an alert dialog naming its own question", () => {
    renderDialog();
    const dialog = screen.getByRole("alertdialog");
    // The accessible name must be the question, not a generic "Confirm" — this
    // is the whole reason for not using window.confirm, which prepends the
    // origin and cannot be labelled.
    expect(dialog).toHaveAccessibleName("Revoke all other sessions?");
    expect(dialog).toHaveAccessibleDescription("This signs out every other device.");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("names the confirm button after the action rather than 'OK'", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: "Revoke other sessions" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^ok$/i })).not.toBeInTheDocument();
  });

  it("moves focus to the confirm button so a keyboard user is not stranded", async () => {
    renderDialog();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Revoke other sessions" })).toHaveFocus(),
    );
  });

  it("keeps Tab inside the dialog", async () => {
    const { user } = renderDialog();
    const confirmBtn = screen.getByRole("button", { name: "Revoke other sessions" });
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });

    await waitFor(() => expect(confirmBtn).toHaveFocus());
    // Confirm is the last focusable control, so Tab must wrap to Cancel rather
    // than escaping into the page behind the scrim.
    await user.tab();
    expect(cancelBtn).toHaveFocus();
  });

  it("closes on Escape without running the action", async () => {
    const { user, onClose, onConfirm } = renderDialog();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("closes on Cancel without running the action", async () => {
    const { user, onClose, onConfirm } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("runs the action once and then closes", async () => {
    const { user, onClose, onConfirm } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Revoke other sessions" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("waits for an async action before closing, and blocks a second click", async () => {
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const onConfirm = vi.fn(() => pending);
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<ConfirmDialog request={{ ...BASE, onConfirm }} onClose={onClose} />);
    const button = screen.getByRole("button", { name: "Revoke other sessions" });

    await user.click(button);
    // Still open and busy — a double click must not revoke twice.
    await waitFor(() => expect(button).toBeDisabled());
    expect(onClose).not.toHaveBeenCalled();

    release?.();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when there is no request", () => {
    const { container } = render(<ConfirmDialog request={null} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("restores focus to the control that opened it", async () => {
    function Harness() {
      const { confirm, confirmDialog } = useConfirm();
      return (
        <>
          <button onClick={() => confirm(BASE)}>Revoke</button>
          {confirmDialog}
        </>
      );
    }
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Revoke" });

    await user.click(opener);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Revoke other sessions" })).toHaveFocus(),
    );

    await user.keyboard("{Escape}");
    // Focus must come back to the trigger, otherwise a keyboard user resumes at
    // the top of the document with no idea where they were.
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("releases the page scroll lock when it closes", async () => {
    const { unmount } = renderDialog();
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});

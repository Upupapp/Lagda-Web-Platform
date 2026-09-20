// The field editor's drawer and bottom sheet.
//
// These sit over the canvas, so the assertions that matter are about getting
// out of them and about not stranding the keyboard behind them — the two ways
// a summoned panel goes from helpful to trapping.

import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorDrawer, EditorSheet } from "../EditorMobileChrome";

const SURFACES = [
  { name: "drawer", Component: EditorDrawer, title: "Documents and pages" },
  { name: "sheet", Component: EditorSheet, title: "Field properties" },
] as const;

for (const { name, Component, title } of SURFACES) {
  describe(`the ${name}`, () => {
    it("renders nothing at all when closed", () => {
      render(
        <Component open={false} title={title} onClose={vi.fn()}>
          <p>panel body</p>
        </Component>,
      );
      expect(screen.queryByRole("dialog")).toBeNull();
      // Not merely hidden: a closed panel must not leave its controls in the
      // tab order behind the canvas.
      expect(screen.queryByText("panel body")).toBeNull();
    });

    it("shows its content when open, as a modal surface", () => {
      render(
        <Component open title={title} onClose={vi.fn()}>
          <p>panel body</p>
        </Component>,
      );
      const dialog = screen.getByRole("dialog", { name: title });
      expect(dialog.getAttribute("aria-modal")).toBe("true");
      expect(screen.getByText("panel body")).toBeTruthy();
    });

    it("closes on Escape", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Component open title={title} onClose={onClose}><p>body</p></Component>);

      await user.keyboard("{Escape}");

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("closes from its own button", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Component open title={title} onClose={onClose}><p>body</p></Component>);

      await user.click(screen.getByRole("button", { name: `Close ${title.toLowerCase()}` }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("gives the close control a real tap target", () => {
      render(<Component open title={title} onClose={vi.fn()}><p>body</p></Component>);
      const close = screen.getByRole("button", { name: `Close ${title.toLowerCase()}` });
      expect(close.style.width).toBe("44px");
      expect(close.style.height).toBe("44px");
    });

    it("locks the page behind it, and unlocks on close", () => {
      const { rerender } = render(
        <Component open title={title} onClose={vi.fn()}><p>body</p></Component>,
      );
      expect(document.body.style.overflow).toBe("hidden");

      rerender(<Component open={false} title={title} onClose={vi.fn()}><p>body</p></Component>);
      expect(document.body.style.overflow).not.toBe("hidden");
    });

    it("gives focus back to whatever opened it", async () => {
      // Otherwise focus is left on a node that no longer exists and the next
      // Tab starts from the top of the document.
      const user = userEvent.setup();
      function Harness() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <button onClick={() => { setOpen(true); }}>open it</button>
            <Component open={open} title={title} onClose={() => { setOpen(false); }}>
              <p>body</p>
            </Component>
          </>
        );
      }

      render(<Harness />);
      const trigger = screen.getByRole("button", { name: "open it" });
      await user.click(trigger);
      expect(screen.getByRole("dialog")).toBeTruthy();

      await user.keyboard("{Escape}");

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });
}

describe("the sheet specifically", () => {
  it("leaves the canvas visible behind it", () => {
    // The point of editing a field is seeing where it lands. A full-height
    // sheet would cover the thing being changed.
    render(<EditorSheet open title="Field properties" onClose={vi.fn()}><p>body</p></EditorSheet>);
    expect(screen.getByRole("dialog").style.maxHeight).toBe("70vh");
  });
});

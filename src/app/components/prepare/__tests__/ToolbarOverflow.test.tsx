// The editor toolbar's overflow menu.
//
// What it replaced: four controls — undo, copy, paste, the view toggle —
// rendered past the edge of a clipping ancestor at 320px, so they could not
// be reached at all on a phone. These assertions are about reachability and
// about not trapping the keyboard, which are the two ways a menu like this
// fails people.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToolbarOverflow, type ToolbarItem } from "../ToolbarOverflow";

function items(over: Partial<ToolbarItem> = {}): ToolbarItem[] {
  return [
    { id: "undo", label: "Undo", glyph: "↩", title: "Undo (Ctrl+Z)", onClick: vi.fn(), disabled: false },
    { id: "paste", label: "Paste", title: "Paste (Ctrl+V)", onClick: vi.fn(), disabled: true },
    { id: "fit", label: "Fit page", title: "Reset zoom", onClick: vi.fn(), disabled: false, ...over },
  ];
}

describe("reaching the controls", () => {
  it("hides them until asked, so the row stays short", () => {
    render(<ToolbarOverflow items={items()} zoom={100} />);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Undo" })).toBeNull();
  });

  it("opens on the trigger and lists every item", async () => {
    const user = userEvent.setup();
    render(<ToolbarOverflow items={items()} zoom={100} />);

    await user.click(screen.getByRole("button", { name: "More editor actions" }));

    expect(screen.getByRole("menu")).toBeTruthy();
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
  });

  it("runs the action and closes", async () => {
    const user = userEvent.setup();
    const list = items();
    render(<ToolbarOverflow items={list} zoom={100} />);

    await user.click(screen.getByRole("button", { name: "More editor actions" }));
    await user.click(screen.getByRole("menuitem", { name: /Undo/ }));

    expect(list[0]?.onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("does not run a disabled action", async () => {
    const user = userEvent.setup();
    const list = items();
    render(<ToolbarOverflow items={list} zoom={100} />);

    await user.click(screen.getByRole("button", { name: "More editor actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Paste" }));

    expect(list[1]?.onClick).not.toHaveBeenCalled();
    // Still open: nothing happened, so closing would be a lie about it.
    expect(screen.getByRole("menu")).toBeTruthy();
  });

  it("gives every row a real tap target", async () => {
    // These are the controls somebody reaches for on a phone; a 24px row is
    // how a menu becomes technically-present and practically unusable.
    const user = userEvent.setup();
    render(<ToolbarOverflow items={items()} zoom={100} />);
    await user.click(screen.getByRole("button", { name: "More editor actions" }));
    for (const row of screen.getAllByRole("menuitem")) {
      expect(row.style.minHeight).toBe("44px");
    }
  });
});

describe("getting out of it", () => {
  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<ToolbarOverflow items={items()} zoom={100} />);
    await user.click(screen.getByRole("button", { name: "More editor actions" }));

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes when something else is clicked", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>elsewhere</button>
        <ToolbarOverflow items={items()} zoom={100} />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "More editor actions" }));

    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("announces its state to assistive technology", async () => {
    const user = userEvent.setup();
    render(<ToolbarOverflow items={items()} zoom={100} />);
    const trigger = screen.getByRole("button", { name: "More editor actions" });

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    await user.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("the zoom readout", () => {
  it("shows the current zoom, since its controls live in here", async () => {
    const user = userEvent.setup();
    render(<ToolbarOverflow items={items()} zoom={140} />);
    await user.click(screen.getByRole("button", { name: "More editor actions" }));
    expect(screen.getByText("Zoom 140%")).toBeTruthy();
  });
});

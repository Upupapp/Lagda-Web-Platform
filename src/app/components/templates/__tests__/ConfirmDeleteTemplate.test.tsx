import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDeleteTemplate } from "../ConfirmDeleteTemplate";

describe("template deletion keyboard safety", () => {
  it("contains focus, preserves typed confirmation and restores the trigger", async () => {
    const user = userEvent.setup();
    const trigger = document.createElement("button");
    document.body.append(trigger); trigger.focus();
    const close = vi.fn(), confirm = vi.fn();
    const view = render(<ConfirmDeleteTemplate templateName="QA Agreement" onCancel={close} onConfirm={confirm} />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Delete template" })).toBeDisabled();
    await user.type(within(dialog).getByRole("textbox"), "QA Agreement");
    const last = within(dialog).getByRole("button", { name: "Delete template" });
    expect(last).toBeEnabled(); last.focus();
    await user.tab(); expect(within(dialog).getByRole("button", { name: "Close" })).toHaveFocus();
    await user.keyboard("{Escape}"); expect(close).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
    view.unmount(); expect(trigger).toHaveFocus(); trigger.remove();
  });
  it("keeps Escape from dismissing a deletion in progress", async () => {
    const user = userEvent.setup(), close = vi.fn();
    render(<ConfirmDeleteTemplate templateName="QA Agreement" busy onCancel={close} onConfirm={vi.fn()} />);
    expect(screen.getByRole("dialog")).toHaveFocus();
    await user.tab(); expect(screen.getByRole("dialog")).toHaveFocus();
    await user.keyboard("{Escape}"); expect(close).not.toHaveBeenCalled();
  });
});

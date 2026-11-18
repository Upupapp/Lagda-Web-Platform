import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmActionDialog } from "../ConfirmActionDialog";
const copy = { title: "Confirm your review", lead: "Review decision", points: ["Recorded in the audit trail"] };
describe("recipient decision confirmation", () => {
  it("focuses Cancel and locks background scrolling until the dialog closes", () => {
    document.body.style.overflow = "auto";
    const { unmount } = render(<ConfirmActionDialog copy={copy} documentTitle="QA agreement" busy={false} onContinue={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("auto");
    document.body.style.overflow = "";
  });
  it("keeps the dialog open during submission and permits Escape after it settles", async () => {
    const user = userEvent.setup();
    const cancel = vi.fn();
    const { rerender } = render(<ConfirmActionDialog copy={copy} documentTitle="QA agreement" busy onContinue={vi.fn()} onCancel={cancel} />);
    await user.keyboard("{Escape}");
    expect(cancel).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Recording…" })).toBeDisabled();
    rerender(<ConfirmActionDialog copy={copy} documentTitle="QA agreement" busy={false} onContinue={vi.fn()} onCancel={cancel} />);
    await user.keyboard("{Escape}");
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});

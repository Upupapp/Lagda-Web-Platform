import { useRef, useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useWorkspaceDialog } from "../useWorkspaceDialog";
function Panel({ close, busy }: { close: () => void; busy: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useWorkspaceDialog(ref, close, busy);
  return <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true"><input aria-label="Name" /><button>Save</button></div>;
}
describe("workspace dialog focus", () => {
  it("contains forward and reverse Tab, locks background scrolling and restores trigger focus", async () => {
    function Host() { const [open, setOpen] = useState(false); return <><button onClick={() => setOpen(true)}>Open</button>{open && <Panel busy={false} close={() => setOpen(false)} />}</>; }
    render(<Host />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("textbox")).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    screen.getByRole("button", { name: "Save" }).focus();
    await userEvent.tab();
    expect(screen.getByRole("textbox")).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
  it("keeps the existing busy guard when Escape is pressed", async () => {
    const close = vi.fn(); const view = render(<Panel busy close={close} />);
    await userEvent.keyboard("{Escape}"); expect(close).not.toHaveBeenCalled();
    view.rerender(<Panel busy={false} close={close} />);
    await userEvent.keyboard("{Escape}"); expect(close).toHaveBeenCalledOnce();
  });
});

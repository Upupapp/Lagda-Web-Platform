// The shortcut TABLE is the single source for both the key handler and the
// editor's Help panel. These tests pin both halves to it: every row in the
// table is a key the handler really acts on, and the Help panel lists
// exactly the table — no more, no fewer, in the same words.

import { describe, it, expect, vi } from "vitest";
import { render, renderHook, screen, within } from "@testing-library/react";
import {
  useFieldEditorShortcuts, FIELD_EDITOR_SHORTCUTS, CANVAS_NUDGE_SHORTCUTS, matchShortcut,
  type FieldShortcutHandlers, type ShortcutAction,
} from "../useFieldEditorShortcuts";
import { FieldsHelpPanel, helpShortcutRows } from "../../components/prepare/FieldsHelpPanel";
import { FIELD_ISSUE_CODES } from "../../models/field-editor";
import { FIELD_ISSUE_GUIDE } from "../../components/prepare/field-issue-guide";

function handlers(): FieldShortcutHandlers & Record<string, ReturnType<typeof vi.fn>> {
  return {
    copy: vi.fn(), paste: vi.fn(), undo: vi.fn(), redo: vi.fn(),
    duplicate: vi.fn(), deleteSelected: vi.fn(), selectAll: vi.fn(), escape: vi.fn(),
    hasSelection: true, hasClipboard: true, announce: vi.fn(),
  } as never;
}

const EXPECTED: Record<ShortcutAction, (keyof FieldShortcutHandlers)[]> = {
  escape: ["escape"], deleteSelected: ["deleteSelected"], copy: ["copy"],
  cut: ["copy", "deleteSelected"], paste: ["paste"], undo: ["undo"], redo: ["redo"],
  duplicate: ["duplicate"], selectAll: ["selectAll"],
};

describe("the shortcut table drives the handler", () => {
  for (const binding of FIELD_EDITOR_SHORTCUTS) {
    it(`${binding.display.join("+")} → ${binding.action}`, () => {
      const h = handlers();
      renderHook(() => useFieldEditorShortcuts(h));
      const key = binding.key === "escape" ? "Escape" : binding.key === "delete" ? "Delete"
        : binding.key === "backspace" ? "Backspace" : binding.key;
      const event = new KeyboardEvent("keydown", {
        key, ctrlKey: binding.mod, shiftKey: binding.shift === true, bubbles: true, cancelable: true,
      });
      document.dispatchEvent(event);
      for (const name of EXPECTED[binding.action]) expect(h[name]).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
      expect(matchShortcut(event)?.id).toBe(binding.id);
    });
  }

  it("has unique ids, and every row says what it does", () => {
    const ids = FIELD_EDITOR_SHORTCUTS.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of FIELD_EDITOR_SHORTCUTS) expect(b.description.length).toBeGreaterThan(5);
  });
});

describe("the Help panel lists exactly the table", () => {
  it("renders one row per binding plus the canvas nudges, in table order and words", () => {
    render(<FieldsHelpPanel open onOpenChange={vi.fn()} mode="side" fabStyle={{}} />);
    const table = screen.getByRole("table", { name: "Keyboard shortcuts" });
    const rows = within(table).getAllByRole("row");
    const expected = helpShortcutRows();
    expect(expected.map(r => r.id)).toEqual([
      ...FIELD_EDITOR_SHORTCUTS.map(b => b.id), ...CANVAS_NUDGE_SHORTCUTS.map(b => b.id),
    ]);
    expect(rows.map(r => r.getAttribute("data-shortcut-id"))).toEqual(expected.map(r => r.id));
    FIELD_EDITOR_SHORTCUTS.forEach((b, i) => {
      expect(rows[i]).toHaveTextContent(b.display.join(" + "));
      expect(rows[i]).toHaveTextContent(b.description);
    });
  });

  it("explains every validation issue code and its fix, from the same guide the panel uses", () => {
    const { container } = render(<FieldsHelpPanel open onOpenChange={vi.fn()} mode="sheet" fabStyle={{}} />);
    const listed = [...container.ownerDocument.querySelectorAll("[data-issue-code]")].map(el => el.getAttribute("data-issue-code"));
    expect(listed).toEqual([...FIELD_ISSUE_CODES]);
    expect(screen.getByText(FIELD_ISSUE_GUIDE.SIGNER_MISSING_SIGNATURE.fixDoes!, { exact: false })).toBeInTheDocument();
  });

  it("has every required section", () => {
    render(<FieldsHelpPanel open onOpenChange={vi.fn()} mode="side" fabStyle={{}} />);
    for (const title of [
      "Adding fields", "Moving & resizing", "Assigning people", "The question-mark badges",
      "Validate & Auto-fix", "Auto-placement & Undo", "Keyboard shortcuts",
    ]) expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
  });
});

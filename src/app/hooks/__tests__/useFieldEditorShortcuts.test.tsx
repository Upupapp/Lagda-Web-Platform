// The field editor's keyboard shortcuts.
//
// The operations themselves were already covered through the editor's own
// reducer tests. What was never covered — because it did not exist — is the
// key matching: which combination reaches which operation, on which
// platform, and when it must stay out of the way.
//
// That last part is the reason these are worth having. The editor contains
// text inputs (a field's Label, its X/Y position), and a shortcut layer that
// forgets them turns Ctrl+A in the Label box into "select every field on the
// page" and Ctrl+C into a copy of the wrong thing entirely.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFieldEditorShortcuts, type FieldShortcutHandlers } from "../useFieldEditorShortcuts";

function makeHandlers(over: Partial<FieldShortcutHandlers> = {}): FieldShortcutHandlers {
  return {
    copy: vi.fn(), paste: vi.fn(), undo: vi.fn(), redo: vi.fn(),
    duplicate: vi.fn(), deleteSelected: vi.fn(), selectAll: vi.fn(), escape: vi.fn(),
    hasSelection: true, hasClipboard: true, announce: vi.fn(),
    ...over,
  };
}

/** Dispatches a keydown on `target` (the document by default). */
function press(
  key: string,
  modifiers: { ctrl?: boolean; meta?: boolean; shift?: boolean } = {},
  target: EventTarget = document,
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    ctrlKey: modifiers.ctrl ?? false,
    metaKey: modifiers.meta ?? false,
    shiftKey: modifiers.shift ?? false,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("the clipboard keys", () => {
  it("copies on Ctrl+C", () => {
    const h = makeHandlers();
    renderHook(() => useFieldEditorShortcuts(h));
    press("c", { ctrl: true });
    expect(h.copy).toHaveBeenCalledTimes(1);
  });

  it("copies on Cmd+C, without being told which platform this is", () => {
    const h = makeHandlers();
    renderHook(() => useFieldEditorShortcuts(h));
    press("c", { meta: true });
    expect(h.copy).toHaveBeenCalledTimes(1);
  });

  it("pastes on Ctrl+V", () => {
    const h = makeHandlers();
    renderHook(() => useFieldEditorShortcuts(h));
    press("v", { ctrl: true });
    expect(h.paste).toHaveBeenCalledTimes(1);
  });

  it("cuts by copying and then deleting", () => {
    // Order matters: the clipboard has to hold the fields after they leave
    // the page, not a promise to look them up later.
    const h = makeHandlers();
    renderHook(() => useFieldEditorShortcuts(h));
    press("x", { ctrl: true });
    expect(h.copy).toHaveBeenCalledTimes(1);
    expect(h.deleteSelected).toHaveBeenCalledTimes(1);
  });

  it("does not copy an empty selection", () => {
    const h = makeHandlers({ hasSelection: false });
    renderHook(() => useFieldEditorShortcuts(h));
    press("c", { ctrl: true });
    expect(h.copy).not.toHaveBeenCalled();
  });

  it("leaves Ctrl+C to the browser when nothing is selected", () => {
    // So the visitor can still copy text off the page.
    const h = makeHandlers({ hasSelection: false });
    renderHook(() => useFieldEditorShortcuts(h));
    const event = press("c", { ctrl: true });
    expect(event.defaultPrevented).toBe(false);
  });

  it("does not paste an empty clipboard", () => {
    const h = makeHandlers({ hasClipboard: false });
    renderHook(() => useFieldEditorShortcuts(h));
    press("v", { ctrl: true });
    expect(h.paste).not.toHaveBeenCalled();
  });
});

describe("undo and redo", () => {
  it("undoes on Ctrl+Z", () => {
    const h = makeHandlers();
    renderHook(() => useFieldEditorShortcuts(h));
    press("z", { ctrl: true });
    expect(h.undo).toHaveBeenCalledTimes(1);
    expect(h.redo).not.toHaveBeenCalled();
  });

  it("redoes on Ctrl+Y", () => {
    const h = makeHandlers();
    renderHook(() => useFieldEditorShortcuts(h));
    press("y", { ctrl: true });
    expect(h.redo).toHaveBeenCalledTimes(1);
  });

  it("redoes on Ctrl+Shift+Z too", () => {
    // Windows reaches for Ctrl+Y, the Mac and Adobe lineage for
    // Ctrl+Shift+Z. Binding one and not the other means half of everyone
    // presses a key that does nothing.
    const h = makeHandlers();
    renderHook(() => useFieldEditorShortcuts(h));
    press("z", { ctrl: true, shift: true });
    expect(h.redo).toHaveBeenCalledTimes(1);
    expect(h.undo).not.toHaveBeenCalled();
  });

  it("actually prevents the browser default on Ctrl+Z", () => {
    // The precise failure this replaced: the old handler called
    // preventDefault() and then ran nothing, so the key did less than if it
    // had never been bound. Suppressing the default is only correct when
    // something takes its place.
    const h = makeHandlers();
    renderHook(() => useFieldEditorShortcuts(h));
    const event = press("z", { ctrl: true });
    expect(event.defaultPrevented).toBe(true);
    expect(h.undo).toHaveBeenCalledTimes(1);
  });
});

describe("the rest of the canvas keys", () => {
  it("deletes on Delete and on Backspace", () => {
    const h = makeHandlers();
    renderHook(() => useFieldEditorShortcuts(h));
    press("Delete");
    press("Backspace");
    expect(h.deleteSelected).toHaveBeenCalledTimes(2);
  });

  it("does not delete an empty selection", () => {
    const h = makeHandlers({ hasSelection: false });
    renderHook(() => useFieldEditorShortcuts(h));
    press("Delete");
    expect(h.deleteSelected).not.toHaveBeenCalled();
  });

  it("duplicates on Ctrl+D instead of bookmarking the page", () => {
    const h = makeHandlers();
    renderHook(() => useFieldEditorShortcuts(h));
    const event = press("d", { ctrl: true });
    expect(h.duplicate).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("selects every field on the page with Ctrl+A", () => {
    const h = makeHandlers();
    renderHook(() => useFieldEditorShortcuts(h));
    press("a", { ctrl: true });
    expect(h.selectAll).toHaveBeenCalledTimes(1);
  });

  it("escapes", () => {
    const h = makeHandlers();
    renderHook(() => useFieldEditorShortcuts(h));
    press("Escape");
    expect(h.escape).toHaveBeenCalledTimes(1);
  });
});

describe("staying out of the way", () => {
  /** Focuses a real element of the given kind and returns it. */
  function focusA(tag: "input" | "textarea" | "select"): HTMLElement {
    const el = document.createElement(tag);
    document.body.appendChild(el);
    el.focus();
    return el;
  }

  for (const tag of ["input", "textarea", "select"] as const) {
    it(`ignores Ctrl+A while typing in a ${tag}`, () => {
      // The editor has a Label box and X/Y position inputs. Selecting every
      // field on the page because somebody wanted to select their own text
      // is a genuinely destructive surprise.
      const h = makeHandlers();
      renderHook(() => useFieldEditorShortcuts(h));
      const el = focusA(tag);
      press("a", { ctrl: true }, el);
      expect(h.selectAll).not.toHaveBeenCalled();
    });
  }

  it("ignores Backspace in a text box, so it still deletes a character", () => {
    const h = makeHandlers();
    renderHook(() => useFieldEditorShortcuts(h));
    const el = focusA("input");
    press("Backspace", {}, el);
    expect(h.deleteSelected).not.toHaveBeenCalled();
  });

  it("ignores a contentEditable surface too", () => {
    const h = makeHandlers();
    renderHook(() => useFieldEditorShortcuts(h));
    const el = document.createElement("div");
    el.contentEditable = "true";
    // jsdom does not derive isContentEditable from the attribute.
    Object.defineProperty(el, "isContentEditable", { value: true });
    document.body.appendChild(el);
    press("c", { ctrl: true }, el);
    expect(h.copy).not.toHaveBeenCalled();
  });

  it("leaves Escape working inside a text box, because it is the way out", () => {
    const h = makeHandlers();
    renderHook(() => useFieldEditorShortcuts(h));
    const el = focusA("input");
    press("Escape", {}, el);
    // Handled by the input itself — the hook must not also clear the
    // selection behind it.
    expect(h.escape).not.toHaveBeenCalled();
  });

  it("does not swallow browser shortcuts it has no binding for", () => {
    // An editor that preventDefaults every Ctrl combination is an editor
    // that has broken Find.
    const h = makeHandlers();
    renderHook(() => useFieldEditorShortcuts(h));
    for (const key of ["f", "s", "r", "p"]) {
      expect(press(key, { ctrl: true }).defaultPrevented).toBe(false);
    }
  });

  it("binds nothing at all when disabled", () => {
    const h = makeHandlers({ enabled: false });
    renderHook(() => useFieldEditorShortcuts(h));
    press("z", { ctrl: true });
    press("Delete");
    expect(h.undo).not.toHaveBeenCalled();
    expect(h.deleteSelected).not.toHaveBeenCalled();
  });

  it("stops listening once unmounted", () => {
    const h = makeHandlers();
    const { unmount } = renderHook(() => useFieldEditorShortcuts(h));
    unmount();
    press("z", { ctrl: true });
    expect(h.undo).not.toHaveBeenCalled();
  });
});

describe("saying what happened", () => {
  it("announces each action, since none of them moves focus", () => {
    const h = makeHandlers();
    renderHook(() => useFieldEditorShortcuts(h));

    press("c", { ctrl: true });
    press("v", { ctrl: true });
    press("z", { ctrl: true });
    press("Delete");

    const said = (h.announce as ReturnType<typeof vi.fn>).mock.calls.map(c => String(c[0]));
    expect(said).toHaveLength(4);
    expect(said.every(m => m.length > 0)).toBe(true);
  });

  it("works without an announcer", () => {
    const h = makeHandlers({ announce: undefined });
    renderHook(() => useFieldEditorShortcuts(h));
    expect(() => press("c", { ctrl: true })).not.toThrow();
    expect(h.copy).toHaveBeenCalledTimes(1);
  });
});

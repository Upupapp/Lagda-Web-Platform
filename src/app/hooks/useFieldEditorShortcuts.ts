// Keyboard shortcuts for the field-placement editor.
//
// ── What was here before ───────────────────────────────────────────────────
//
// A stub. It matched Ctrl+Z, called `preventDefault()`, and then did nothing
// — the comment said "undo handled by context", but no call was made. So the
// browser's own undo was suppressed and no editor undo ran in its place:
// pressing Ctrl+Z did strictly less than not binding the key at all.
//
// Meanwhile the toolbar advertised `title="Undo (Ctrl+Z)"` and
// `"Redo (Ctrl+Shift+Z)"`. The UI was promising something the code had
// stopped short of.
//
// None of the underlying operations were missing. `FieldEditorContext`
// already had an internal clipboard, COPY/PASTE, undo/redo with a history
// limit, duplicate and delete. This binds what was already there.
//
// ── Why a hook, and why it takes plain functions ───────────────────────────
//
// Not `useFieldEditor()` directly. Taking the operations as arguments means
// the key-matching — which is the part with the branches and the platform
// differences — can be tested by calling it with spies, instead of standing
// up an entire editor to find out whether Ctrl+Y reaches redo.
//
// ── Conventions, deliberately ──────────────────────────────────────────────
//
// Redo is bound to BOTH Ctrl+Y and Ctrl+Shift+Z. Windows applications
// overwhelmingly use the first, the Mac and Adobe lineage the second, and
// people arrive with the muscle memory of whatever they used yesterday.
// Binding one and not the other just means half of them press a key that
// does nothing.
//
// `metaKey` is accepted everywhere `ctrlKey` is, so ⌘ works without asking
// which platform this is.

import { useEffect, useRef } from "react";

export interface FieldShortcutHandlers {
  /** Copy the current selection to the editor's internal clipboard. */
  readonly copy: () => void;
  /** Paste onto the current page. Already offsets and selects the copies. */
  readonly paste: () => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly duplicate: () => void;
  readonly deleteSelected: () => void;
  readonly selectAll: () => void;
  /** Cancel a pending placement, or clear the selection. */
  readonly escape: () => void;
  /** True when there is something selected — gates copy/cut/duplicate. */
  readonly hasSelection: boolean;
  /** True when the clipboard holds something — gates paste. */
  readonly hasClipboard: boolean;
  /**
   * Told what happened, in words, so the page can put it somewhere a screen
   * reader will read. Every one of these actions changes the document
   * silently otherwise: three fields can vanish on Delete with nothing
   * announcing it.
   */
  readonly announce?: (message: string) => void;
  /** Turns the bindings off entirely — used while a modal owns the keyboard. */
  readonly enabled?: boolean;
}

/**
 * Whether the keystroke belongs to whatever the visitor is typing in.
 *
 * A field's own Label box is a text input inside this editor, so Ctrl+A
 * there has to select the text, not every field on the page — and Ctrl+C has
 * to copy the characters, not the field. `isContentEditable` covers any rich
 * surface a later feature introduces.
 */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target instanceof HTMLElement ? target : null;
  const active = el ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  if (!active) return false;
  if (active.isContentEditable) return true;
  return active instanceof HTMLInputElement
    || active instanceof HTMLTextAreaElement
    || active instanceof HTMLSelectElement;
}

// ── The one shortcut table ─────────────────────────────────────────────────
//
// The handler below and the in-editor Help panel both READ this list. The
// panel used to be something a person would have written by hand, and a
// hand-written list of shortcuts is a list that drifts: a binding changes
// here and the help keeps advertising the old one. Now there is nothing to
// keep in step — a row in the panel IS a row the handler matches.

export type ShortcutAction =
  | "escape" | "deleteSelected" | "copy" | "cut" | "paste"
  | "undo" | "redo" | "duplicate" | "selectAll";

export interface ShortcutBinding {
  /** Stable id, unique across the table. */
  readonly id: string;
  readonly action: ShortcutAction;
  /** `event.key`, lower-cased. */
  readonly key: string;
  /** Ctrl on Windows/Linux, ⌘ on a Mac — either is accepted. */
  readonly mod: boolean;
  /** true / false require that Shift state; undefined accepts either. */
  readonly shift?: boolean;
  /** What must be true for the binding to act (else the key is left alone). */
  readonly requires?: "selection" | "clipboard";
  /** The keys as shown to a person, e.g. ["Ctrl", "Shift", "Z"]. */
  readonly display: readonly string[];
  /** What it does, in the Help panel's words. */
  readonly description: string;
  /** Said to a screen reader after it runs. */
  readonly announcement?: string;
}

export const FIELD_EDITOR_SHORTCUTS: readonly ShortcutBinding[] = [
  { id: "escape", action: "escape", key: "escape", mod: false,
    display: ["Esc"], description: "Cancel placing a field, or clear the selection" },
  // Delete and Backspace both, because which one removes things is a
  // keyboard-layout argument nobody should have to win.
  { id: "delete", action: "deleteSelected", key: "delete", mod: false, requires: "selection",
    display: ["Delete"], description: "Delete the selected fields", announcement: "Deleted the selected fields." },
  { id: "backspace", action: "deleteSelected", key: "backspace", mod: false, requires: "selection",
    display: ["Backspace"], description: "Delete the selected fields", announcement: "Deleted the selected fields." },
  { id: "copy", action: "copy", key: "c", mod: true, requires: "selection",
    display: ["Ctrl", "C"], description: "Copy the selected fields", announcement: "Copied the selected fields." },
  // Cut is copy-then-delete rather than its own reducer action: the
  // clipboard has to hold the fields AFTER they leave the page, and
  // composing the two existing operations keeps one definition of each.
  { id: "cut", action: "cut", key: "x", mod: true, requires: "selection",
    display: ["Ctrl", "X"], description: "Cut the selected fields", announcement: "Cut the selected fields." },
  { id: "paste", action: "paste", key: "v", mod: true, requires: "clipboard",
    display: ["Ctrl", "V"], description: "Paste copied fields onto this page", announcement: "Pasted fields onto this page." },
  // Ctrl+Shift+Z is redo, not undo — the Mac and Adobe convention. Listed
  // before plain Ctrl+Z so the more specific binding matches first.
  { id: "redo-shift-z", action: "redo", key: "z", mod: true, shift: true,
    display: ["Ctrl", "Shift", "Z"], description: "Redo the last change", announcement: "Redid the last change." },
  { id: "undo", action: "undo", key: "z", mod: true, shift: false,
    display: ["Ctrl", "Z"], description: "Undo the last change", announcement: "Undid the last change." },
  { id: "redo-y", action: "redo", key: "y", mod: true,
    display: ["Ctrl", "Y"], description: "Redo the last change", announcement: "Redid the last change." },
  { id: "duplicate", action: "duplicate", key: "d", mod: true, requires: "selection",
    display: ["Ctrl", "D"], description: "Duplicate the selected field", announcement: "Duplicated the selected field." },
  { id: "select-all", action: "selectAll", key: "a", mod: true,
    display: ["Ctrl", "A"], description: "Select every field on this page", announcement: "Selected every field on this page." },
];

/**
 * Arrow-key nudges, handled by the canvas itself (they only make sense
 * while the page has focus). Kept beside the table above so the Help panel
 * lists them from the same source the canvas reads its step sizes from.
 */
export const CANVAS_NUDGE_STEP = 0.005;
export const CANVAS_NUDGE_STEP_LARGE = 0.02;

export const CANVAS_NUDGE_SHORTCUTS: readonly { readonly id: string; readonly display: readonly string[]; readonly description: string }[] = [
  { id: "nudge", display: ["←", "↑", "→", "↓"], description: "Nudge the selected fields (canvas focused)" },
  { id: "nudge-large", display: ["Shift", "Arrow"], description: "Nudge the selected fields four times further" },
];

/** The binding a keystroke matches, or null. Pure — exported for tests. */
export function matchShortcut(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey">): ShortcutBinding | null {
  const mod = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  for (const binding of FIELD_EDITOR_SHORTCUTS) {
    if (binding.key !== key || binding.mod !== mod) continue;
    if (binding.shift !== undefined && binding.shift !== event.shiftKey) continue;
    return binding;
  }
  return null;
}

export function useFieldEditorShortcuts(handlers: FieldShortcutHandlers): void {
  /**
   * The listener reads through a ref, and is bound once.
   *
   * The obvious version — closing over `handlers` and listing them as effect
   * dependencies — is subtly wrong, and wrong in a way that only shows up in
   * sequences. `hasClipboard` is false until a copy happens; pressing
   * Ctrl+C then Ctrl+V runs BOTH handlers before React has re-run the
   * effect, so the paste branch still saw the pre-copy clipboard and
   * declined. Copy-then-paste — the single most ordinary thing anyone does
   * with these keys — silently did nothing.
   *
   * Caught by the editor's own wiring test, not by the unit tests above it:
   * in isolation each key works, and only the pair fails.
   *
   * Keeping the current values in a ref also means the document listener is
   * added once rather than being torn down and re-added on every render of
   * a large editor.
   */
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const h = ref.current;
      if (h.enabled === false) return;

      // Every binding is for the canvas, not for whatever is being typed in
      // — including Escape, which inside a text box belongs to that box.
      // Everything else (Ctrl+S, Ctrl+R, Ctrl+F) belongs to the browser:
      // swallowing unrecognised combinations is how an editor breaks Find.
      if (isTypingTarget(event.target)) return;
      const binding = matchShortcut(event);
      if (binding === null) return;
      if (binding.requires === "selection" && !h.hasSelection) return;
      if (binding.requires === "clipboard" && !h.hasClipboard) return;

      event.preventDefault();
      switch (binding.action) {
        case "escape": h.escape(); break;
        case "deleteSelected": h.deleteSelected(); break;
        case "copy": h.copy(); break;
        case "cut": h.copy(); h.deleteSelected(); break;
        case "paste": h.paste(); break;
        case "undo": h.undo(); break;
        case "redo": h.redo(); break;
        case "duplicate": h.duplicate(); break;
        case "selectAll": h.selectAll(); break;
      }
      if (binding.announcement) h.announce?.(binding.announcement);
    };

    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); };
  }, []);
}

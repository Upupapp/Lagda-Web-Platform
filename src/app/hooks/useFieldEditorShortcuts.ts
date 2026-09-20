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
      const {
        copy, paste, undo, redo, duplicate, deleteSelected, selectAll, escape,
        hasSelection, hasClipboard, announce, enabled = true,
      } = ref.current;

      if (!enabled) return;

      // Escape is the one key that must work while typing: it is how you get
      // out. Everything below this line is for the canvas only.
      if (event.key === "Escape") {
        if (isTypingTarget(event.target)) return;
        event.preventDefault();
        escape();
        return;
      }

      if (isTypingTarget(event.target)) return;

      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (!mod) {
        // Delete and Backspace both, because which one removes things is a
        // keyboard-layout argument nobody should have to win.
        if (key === "delete" || key === "backspace") {
          if (!hasSelection) return;
          event.preventDefault();
          deleteSelected();
          announce?.("Deleted the selected fields.");
        }
        return;
      }

      switch (key) {
        case "c":
          if (!hasSelection) return;
          event.preventDefault();
          copy();
          announce?.("Copied the selected fields.");
          return;

        case "x":
          // Cut is copy-then-delete rather than its own reducer action: the
          // clipboard has to hold the fields AFTER they leave the page, and
          // composing the two existing operations keeps one definition of
          // each instead of a third that can drift from both.
          if (!hasSelection) return;
          event.preventDefault();
          copy();
          deleteSelected();
          announce?.("Cut the selected fields.");
          return;

        case "v":
          if (!hasClipboard) return;
          event.preventDefault();
          paste();
          announce?.("Pasted fields onto this page.");
          return;

        case "z":
          event.preventDefault();
          // Ctrl+Shift+Z is redo, not undo — the Mac and Adobe convention.
          if (event.shiftKey) {
            redo();
            announce?.("Redid the last change.");
          } else {
            undo();
            announce?.("Undid the last change.");
          }
          return;

        case "y":
          event.preventDefault();
          redo();
          announce?.("Redid the last change.");
          return;

        case "d":
          if (!hasSelection) return;
          event.preventDefault();
          duplicate();
          announce?.("Duplicated the selected field.");
          return;

        case "a":
          event.preventDefault();
          selectAll();
          announce?.("Selected every field on this page.");
          return;

        default:
          // Everything else — Ctrl+S, Ctrl+R, Ctrl+F — belongs to the
          // browser. Swallowing unrecognised combinations is how an editor
          // ends up breaking Find.
          return;
      }
    };

    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); };
  }, []);
}

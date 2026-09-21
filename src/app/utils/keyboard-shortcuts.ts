// The platform's keyboard shortcuts, decided in one place.
//
// Ctrl+K / ⌘K opens the command palette from anywhere in the app.
// "/" jumps to the search field on a page that has one, as it does on most
// sites that have a search field (GitHub, Gmail, YouTube).
//
// Why these were not fully working before:
//
//   The palette listener compared `event.key === "k"`. With Caps Lock on, or
//   on a layout that reports the shifted letter, the key arrives as "K" and
//   the shortcut silently did nothing.
//
//   The hint beside the search button always read "⌘K", a Mac glyph that
//   means nothing on the Windows machines most users here are on.
//
//   "/" was not bound at all.

/** Ctrl+K or ⌘K, case-insensitive, and not a different chord that includes K. */
export function isPaletteShortcut(event: KeyboardEvent): boolean {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return false;
  return event.key.toLowerCase() === "k";
}

/**
 * True while the user is typing into something.
 *
 * A single-key shortcut like "/" must never steal a keystroke from a field:
 * someone typing "and/or" into a title would have the cursor yanked away.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** "/" with no modifier, pressed outside a field. */
export function isSearchFocusShortcut(event: KeyboardEvent): boolean {
  return event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey
    && !isTypingTarget(event.target);
}

export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } })
    .userAgentData?.platform ?? navigator.platform ?? "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/** "⌘K" on Apple devices, "Ctrl K" everywhere else. */
export function paletteShortcutLabel(): string {
  return isApplePlatform() ? "⌘K" : "Ctrl K";
}

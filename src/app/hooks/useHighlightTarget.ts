// Shared "deep-link + highlight" mechanism for the Prepare wizard's Help
// panel (see PreparationHelpFab.tsx): a missing-item banner in that panel
// navigates to `<step route>?<paramName>=<id>`, and the destination step
// reads that id once on load, scrolls the matching element into view, and
// applies a brief highlight so the user immediately sees which row/field
// caused the "not ready" state. One hook, reused by every step that needs
// this (Participants, Routing) so the scroll/highlight/expiry behavior stays
// identical everywhere instead of being reimplemented per page.
//
// The element being highlighted must carry `id={htmlHighlightId(id)}`.

import { useEffect, useRef, useState } from "react";

export function htmlHighlightId(rawId: string): string {
  return `prep-highlight-${rawId}`;
}

const HIGHLIGHT_DURATION_MS = 2600;

export function useHighlightTarget(paramName: string): {
  isHighlighted: (id: string) => boolean;
} {
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const consumedRef = useRef(false);

  useEffect(() => {
    if (consumedRef.current) return;
    const raw = new URLSearchParams(window.location.search).get(paramName);
    if (!raw) return;
    consumedRef.current = true;

    // Deferred one tick so the target list has actually rendered (e.g. right
    // after navigation, before participant/group rows exist in the DOM yet).
    const scrollTimer = window.setTimeout(() => {
      setHighlightId(raw);
      document.getElementById(htmlHighlightId(raw))?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    const clearTimer = window.setTimeout(() => setHighlightId(null), HIGHLIGHT_DURATION_MS);
    return () => { window.clearTimeout(scrollTimer); window.clearTimeout(clearTimer); };
  }, [paramName]);

  return { isHighlighted: (id: string) => highlightId === id };
}

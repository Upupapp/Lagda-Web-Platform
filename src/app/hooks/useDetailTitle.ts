import { useEffect, useSyncExternalStore } from "react";
import { useLocation } from "react-router";

// The record name a detail page wants in the platform header's crumb.
//
// PlatformHeader derives its crumb from the URL, so a detail route read
// "Contacts › Con_7a7cf3b7…" — the record's id, which means nothing to the
// person looking at it. The header cannot know a contact's or template's name;
// the page that loaded the record does. A page publishes the name here and the
// header swaps it in for the id segment.
//
// Keyed by pathname so a label can never outlive its page: a stale name from
// the previous record is ignored the moment the URL changes, even before the
// unmounting page has cleared it.
//
// On-page only. The browser tab title stays the route's generic title from
// routes.ts — titles deliberately carry no participant names or ids, since
// they land in history, bookmarks and screen shares.

interface DetailTitle { readonly pathname: string; readonly label: string }

let current: DetailTitle | null = null;
const listeners = new Set<() => void>();

function publish(next: DetailTitle | null): void {
  current = next;
  listeners.forEach(l => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Called by a detail page once its record has loaded. */
export function useDetailTitle(label: string | null | undefined): void {
  const { pathname } = useLocation();
  useEffect(() => {
    const trimmed = label?.trim();
    if (!trimmed) return;
    const entry: DetailTitle = { pathname, label: trimmed };
    publish(entry);
    return () => { if (current === entry) publish(null); };
  }, [pathname, label]);
}

/** The published label for `pathname`, or null. */
export function useDetailTitleFor(pathname: string): string | null {
  const entry = useSyncExternalStore(subscribe, () => current, () => null);
  return entry !== null && entry.pathname === pathname ? entry.label : null;
}

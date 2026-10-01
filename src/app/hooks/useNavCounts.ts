// The side panel's pop-up counts — only for what is WAITING on this account:
//
//   Documents         documents in "I must sign" (a signer, still to sign)
//   Shared Documents  shares waiting for your answer, plus access requests
//                     waiting on documents you own
//   Contacts          contact requests waiting for your answer
//
// One shared store, like the Invitations count: the side panel and the phone
// menu can both be mounted, and one poll serves both. LIVE: an action that
// changes a count (signing, sharing, access and contact requests — see
// nav-counts-signal.ts) re-reads at once, here and in the other open tabs; so
// does moving to another page, coming back to the tab, and a check every 15
// seconds while the tab is visible — so a bubble drops, and vanishes at zero,
// without a refresh. Each number fails on its own and keeps its last good
// value — an error never reaches the navigation.

import { useEffect, useSyncExternalStore } from "react";
import { USE_REAL_BACKEND } from "../services/backend-flag";
import { usePlatform } from "../context/PlatformContext";
import { realMySigningService, isSignerEntry } from "../services/real/my-signing.service";
import { documentSharingService } from "../services/real/document-sharing.service";
import { contactConnectionsService } from "../services/real/contact-connections.service";
import { registerSessionCleanup } from "../services/session-lifecycle";
import { onNavCountsChanged } from "../services/nav-counts-signal";

export const NAV_COUNT_POLL_MS = 15_000;
/** Moving between pages re-reads, but not more often than this. */
export const NAV_COUNT_NAVIGATION_GAP_MS = 3_000;

export interface NavCounts {
  readonly documents: number;
  readonly shared: number;
  readonly contacts: number;
}

const ZERO: NavCounts = { documents: 0, shared: 0, contacts: 0 };
let counts: NavCounts = ZERO;
const listeners = new Set<() => void>();
let subscribers = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let inflight: Promise<void> | null = null;
/** An action landed while a read was running: read once more after it. */
let again = false;
let lastStarted = 0;
let unlisten: (() => void) | null = null;
/** Who is asking: the workspace (for access requests) and the account. */
let context: { workspaceId: string | null; userId: string | null } = { workspaceId: null, userId: null };

function emit() { for (const l of listeners) l(); }

let generation = 0;

function set(next: Partial<NavCounts>) {
  const merged = { ...counts, ...next };
  if (merged.documents === counts.documents && merged.shared === counts.shared && merged.contacts === counts.contacts) return;
  counts = merged;
  emit();
}

async function sharedPending(): Promise<number> {
  const incoming = (await documentSharingService.sharedWithMe("pending")).length;
  const { workspaceId, userId } = context;
  if (workspaceId === null) return incoming;
  const requests = await documentSharingService.listAccessRequests(workspaceId, "pending").catch(() => []);
  return incoming + requests.filter(r => userId === null || r.document.owner.userId === userId).length;
}

/** Asks the backend now. Resolves once every number that could be read is current. */
export function refreshNavCounts(): Promise<void> {
  if (!USE_REAL_BACKEND) return Promise.resolve();
  if (inflight) { again = true; return inflight; }
  lastStarted = Date.now();
  const started = generation;
  const current = (fn: () => void) => { if (generation === started) fn(); };
  inflight = Promise.all([
    realMySigningService.documentsToSign()
      .then(items => { current(() => { set({ documents: items.filter(isSignerEntry).length }); }); })
      .catch(() => undefined),
    sharedPending()
      .then(shared => { current(() => { set({ shared }); }); })
      .catch(() => undefined),
    contactConnectionsService.list()
      .then(lists => { current(() => { set({ contacts: lists.received.length }); }); })
      .catch(() => undefined),
  ]).then(() => undefined).finally(() => {
    inflight = null;
    if (again) { again = false; void refreshNavCounts(); }
  });
  return inflight;
}

/** After moving to another page: re-read, unless that just happened. */
export function refreshNavCountsOnNavigation(): void {
  if (subscribers === 0 || Date.now() - lastStarted < NAV_COUNT_NAVIGATION_GAP_MS) return;
  void refreshNavCounts();
}

function onFocus() { void refreshNavCounts(); }
function onVisibility() { if (document.visibilityState === "visible") void refreshNavCounts(); }

function start() {
  if (!USE_REAL_BACKEND || typeof window === "undefined") return;
  void refreshNavCounts();
  // A hidden tab is not asked; it catches up the moment it is shown.
  timer = setInterval(() => { if (document.visibilityState !== "hidden") void refreshNavCounts(); }, NAV_COUNT_POLL_MS);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisibility);
  unlisten = onNavCountsChanged(() => { void refreshNavCounts(); });
}

function stop() {
  if (timer !== null) clearInterval(timer);
  timer = null;
  unlisten?.();
  unlisten = null;
  if (typeof window === "undefined") return;
  window.removeEventListener("focus", onFocus);
  document.removeEventListener("visibilitychange", onVisibility);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** For tests: forget the numbers and any poll in progress. */
export function resetNavCounts(): void {
  stop();
  counts = ZERO;
  subscribers = 0;
  inflight = null;
  again = false;
  lastStarted = 0;
  context = { workspaceId: null, userId: null };
  emit();
}

// Sign-out: the next account starts from zero, not from the last one's counts.
registerSessionCleanup({
  id: "nav-counts",
  onSignOut: () => {
    generation += 1;
    counts = ZERO;
    inflight = null;
    again = false;
    context = { workspaceId: null, userId: null };
    emit();
  },
});

export function useNavCounts(): NavCounts {
  const { currentWorkspace, user } = usePlatform();
  const workspaceId = currentWorkspace?.id ?? null;
  const userId = user?.id ?? null;
  useEffect(() => {
    const changed = context.workspaceId !== workspaceId || context.userId !== userId;
    if (context.userId !== null && context.userId !== userId) {
      generation += 1;
      inflight = null;
      set(ZERO);
    }
    context = { workspaceId, userId };
    subscribers += 1;
    if (subscribers === 1) start();
    else if (changed) void refreshNavCounts();
    return () => {
      subscribers -= 1;
      if (subscribers === 0) stop();
    };
  }, [workspaceId, userId]);
  return useSyncExternalStore(subscribe, () => counts, () => counts);
}

// The side panel's pop-up counts — only for what is WAITING on this account:
//
//   Documents         documents in "I must sign" (a signer, still to sign)
//   Shared Documents  shares waiting for your answer, plus access requests
//                     waiting on documents you own
//   Contacts          contact requests waiting for your answer
//
// One shared store, like the Invitations count: the side panel and the phone
// menu can both be mounted, and one poll serves both (every 60 seconds and
// when the window regains focus). Each number fails on its own and keeps its
// last good value — an error never reaches the navigation.

import { useEffect, useSyncExternalStore } from "react";
import { USE_REAL_BACKEND } from "../services/backend-flag";
import { usePlatform } from "../context/PlatformContext";
import { realMySigningService, isSignerEntry } from "../services/real/my-signing.service";
import { documentSharingService } from "../services/real/document-sharing.service";
import { contactConnectionsService } from "../services/real/contact-connections.service";

export const NAV_COUNT_POLL_MS = 60_000;

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
/** Who is asking: the workspace (for access requests) and the account. */
let context: { workspaceId: string | null; userId: string | null } = { workspaceId: null, userId: null };

function emit() { for (const l of listeners) l(); }

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
  inflight ??= Promise.all([
    realMySigningService.documentsToSign()
      .then(items => { set({ documents: items.filter(isSignerEntry).length }); })
      .catch(() => undefined),
    sharedPending()
      .then(shared => { set({ shared }); })
      .catch(() => undefined),
    contactConnectionsService.list()
      .then(lists => { set({ contacts: lists.received.length }); })
      .catch(() => undefined),
  ]).then(() => undefined).finally(() => { inflight = null; });
  return inflight;
}

function onFocus() { void refreshNavCounts(); }

function start() {
  if (!USE_REAL_BACKEND || typeof window === "undefined") return;
  void refreshNavCounts();
  timer = setInterval(() => { void refreshNavCounts(); }, NAV_COUNT_POLL_MS);
  window.addEventListener("focus", onFocus);
}

function stop() {
  if (timer !== null) clearInterval(timer);
  timer = null;
  if (typeof window !== "undefined") window.removeEventListener("focus", onFocus);
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
  context = { workspaceId: null, userId: null };
  emit();
}

export function useNavCounts(): NavCounts {
  const { currentWorkspace, user } = usePlatform();
  const workspaceId = currentWorkspace?.id ?? null;
  const userId = user?.id ?? null;
  useEffect(() => {
    const changed = context.workspaceId !== workspaceId || context.userId !== userId;
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

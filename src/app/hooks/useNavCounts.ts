// The side panel's pop-up counts — only for what is WAITING on this account:
//
//   Documents         documents you still have to act on: sign, approve,
//                     review or acknowledge (a copy sent for information
//                     waits on nobody and is not counted)
//   Shared Documents  shares waiting for your answer, plus access requests
//                     waiting on documents you own
//   Contacts          contact requests waiting for your answer, plus document
//                     requests a contact sent you that are still pending
//   Workspace         join requests waiting for approval (owners and
//                     administrators only)
//   My Settings       plan upgrade requests waiting (the plan approver only)
//
// One shared store, like the Invitations count: the side panel and the phone
// menu can both be mounted, and one poll serves both. LIVE: an action that
// changes a count (signing, sharing, access and contact requests — see
// nav-counts-signal.ts) re-reads at once, here and in the other open tabs; so
// does moving to another page, and every beat of the app's one heartbeat
// (services/live/heartbeat.ts: coming back to the tab, and every 15 seconds
// while it is visible) — so a bubble drops, and vanishes at zero, without a
// refresh. Each number fails on its own and keeps its last good value — an
// error never reaches the navigation.

import { useEffect, useSyncExternalStore } from "react";
import { USE_REAL_BACKEND } from "../services/backend-flag";
import { usePlatform } from "../context/PlatformContext";
import { realMySigningService, canContinueFromApp } from "../services/real/my-signing.service";
import { realContactRequestService } from "../services/real/contact-request.service";
import { listJoinRequests } from "../services/real/workspace-join.service";
import { plansService } from "../services/real/plans.service";
import { useMyPlan } from "./usePlans";
import { onTopic } from "../services/live/topics";
import { documentSharingService } from "../services/real/document-sharing.service";
import { contactConnectionsService } from "../services/real/contact-connections.service";
import { registerSessionCleanup } from "../services/session-lifecycle";
import { onNavCountsChanged } from "../services/nav-counts-signal";
import { HEARTBEAT_MS, onHeartbeat } from "../services/live/heartbeat";
import { realEnotaryInvitationsService } from "../services/real/enotary-invitations.service";
import { useAccountFeatures } from "./useAccountFeatures";

export const NAV_COUNT_POLL_MS = HEARTBEAT_MS;
/** Moving between pages re-reads, but not more often than this. */
export const NAV_COUNT_NAVIGATION_GAP_MS = 3_000;

export interface NavCounts {
  readonly documents: number;
  readonly shared: number;
  /** Contact requests plus document requests waiting on you. */
  readonly contacts: number;
  /** The document-request part of `contacts`, for the tab inside Contacts. */
  readonly documentRequests: number;
  readonly workspace: number;
  readonly settings: number;
  /** Notary desk: requests waiting for the notary's answer, plus payments waiting for the notary's confirmation. */
  readonly notaryDesk: number;
}

const ZERO: NavCounts = { documents: 0, shared: 0, contacts: 0, documentRequests: 0, workspace: 0, settings: 0, notaryDesk: 0 };
/** The Contacts bubble is two reads; each keeps its last good number on its own. */
let contactParts = { connections: 0, documentRequests: 0 };
let counts: NavCounts = ZERO;
const listeners = new Set<() => void>();
let subscribers = 0;
let offHeartbeat: (() => void) | null = null;
let inflight: Promise<void> | null = null;
/** An action landed while a read was running: read once more after it. */
let again = false;
let lastStarted = 0;
let unlisten: (() => void) | null = null;
/** Who is asking: the workspace (for access and join requests), the account, and what it may decide. */
interface Asker {
  workspaceId: string | null; userId: string | null;
  /** Owner or administrator of the workspace: decides join requests. */
  managesMembers: boolean;
  /** Approves plan upgrades for LAGDA. */
  approver: boolean;
  /** This account has a notary desk. */
  notaryDesk: boolean;
}
const NOBODY: Asker = { workspaceId: null, userId: null, managesMembers: false, approver: false, notaryDesk: false };
let context: Asker = NOBODY;

function emit() { for (const l of listeners) l(); }

let generation = 0;

function set(next: Partial<NavCounts>) {
  const merged = { ...counts, ...next };
  if ((Object.keys(merged) as (keyof NavCounts)[]).every(k => merged[k] === counts[k])) return;
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

function setContacts(part: Partial<typeof contactParts>) {
  contactParts = { ...contactParts, ...part };
  set({ contacts: contactParts.connections + contactParts.documentRequests, documentRequests: contactParts.documentRequests });
}

/** Join requests waiting, for someone who decides them; nobody else is asked (it would be refused). */
async function joinRequestsWaiting(): Promise<number> {
  const { workspaceId, managesMembers } = context;
  if (workspaceId === null || !managesMembers) return 0;
  return (await listJoinRequests(workspaceId, "pending")).filter(r => r.state === "pending").length;
}

/** Upgrade requests waiting, for the plan approver only. */
async function planRequestsWaiting(): Promise<number> {
  if (!context.approver) return 0;
  return (await plansService.pendingReviews()).requests.length;
}

/** What waits on the notary: requests to take, requests to answer and payments to confirm. Nobody without a desk is asked. */
async function notaryDeskWaiting(): Promise<number> {
  if (!context.notaryDesk) return 0;
  const desk = await realEnotaryInvitationsService.desk();
  if (desk === null) return 0;
  const fresh = (desk.incoming ?? []).length;
  const answer = desk.requests.filter(r => r.status === "claimed").length;
  const confirm = desk.requests.filter(r => r.payment?.status === "proof").length;
  return fresh + answer + confirm;
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
      .then(items => { current(() => { set({ documents: items.filter(canContinueFromApp).length }); }); })
      .catch(() => undefined),
    sharedPending()
      .then(shared => { current(() => { set({ shared }); }); })
      .catch(() => undefined),
    contactConnectionsService.list()
      .then(lists => { current(() => { setContacts({ connections: lists.received.length }); }); })
      .catch(() => undefined),
    realContactRequestService.listReceived("pending")
      .then(items => { current(() => { setContacts({ documentRequests: items.filter(r => r.status === "pending").length }); }); })
      .catch(() => undefined),
    joinRequestsWaiting()
      .then(workspace => { current(() => { set({ workspace }); }); })
      .catch(() => undefined),
    planRequestsWaiting()
      .then(settings => { current(() => { set({ settings }); }); })
      .catch(() => undefined),
    notaryDeskWaiting()
      .then(notaryDesk => { current(() => { set({ notaryDesk }); }); })
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

function start() {
  if (!USE_REAL_BACKEND || typeof window === "undefined") return;
  void refreshNavCounts();
  offHeartbeat = onHeartbeat(() => { void refreshNavCounts(); });
  // Answering a document request, deciding a join request or a plan request
  // announce their own topics; each can move one of these numbers.
  const refresh = () => { void refreshNavCounts(); };
  const offs = [onNavCountsChanged(refresh), ...(["contacts", "members", "invitations", "plan", "documents"] as const).map(t => onTopic(t, refresh))];
  unlisten = () => { for (const off of offs) off(); };
}

function stop() {
  offHeartbeat?.();
  offHeartbeat = null;
  unlisten?.();
  unlisten = null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** For tests: forget the numbers and any poll in progress. */
export function resetNavCounts(): void {
  stop();
  counts = ZERO;
  contactParts = { connections: 0, documentRequests: 0 };
  subscribers = 0;
  inflight = null;
  again = false;
  lastStarted = 0;
  context = NOBODY;
  emit();
}

// Sign-out: the next account starts from zero, not from the last one's counts.
registerSessionCleanup({
  id: "nav-counts",
  onSignOut: () => {
    generation += 1;
    counts = ZERO;
    contactParts = { connections: 0, documentRequests: 0 };
    inflight = null;
    again = false;
    context = NOBODY;
    emit();
  },
});

export function useNavCounts(): NavCounts {
  const { currentWorkspace, user, role } = usePlatform();
  const workspaceId = currentWorkspace?.id ?? null;
  const userId = user?.id ?? null;
  const managesMembers = role === "owner" || role === "administrator";
  const approver = useMyPlan().plan?.approver === true;
  const notaryDesk = useAccountFeatures().notaryDesk;
  useEffect(() => {
    const changed = context.workspaceId !== workspaceId || context.userId !== userId
      || context.managesMembers !== managesMembers || context.approver !== approver || context.notaryDesk !== notaryDesk;
    if (context.userId !== null && context.userId !== userId) {
      generation += 1;
      inflight = null;
      contactParts = { connections: 0, documentRequests: 0 };
      set(ZERO);
    }
    // Another workspace, or a role that no longer decides: its number goes at once.
    if (context.workspaceId !== workspaceId || !managesMembers) set({ workspace: 0 });
    if (!approver) set({ settings: 0 });
    if (!notaryDesk) set({ notaryDesk: 0 });
    context = { workspaceId, userId, managesMembers, approver, notaryDesk };
    subscribers += 1;
    if (subscribers === 1) start();
    else if (changed) void refreshNavCounts();
    return () => {
      subscribers -= 1;
      if (subscribers === 0) stop();
    };
  }, [workspaceId, userId, managesMembers, approver, notaryDesk]);
  return useSyncExternalStore(subscribe, () => counts, () => counts);
}

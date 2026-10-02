// One shared copy of the plans (backend 093): the signed-in account's own, and
// each workspace's (its OWNER's, which is what decides what a workspace offers).
//
// Read on first use, again when the window regains focus, and whenever
// something announces a change (an upgrade request, an approval arriving in
// another tab). The demo build has every feature: its hooks answer "business"
// without a request.

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { USE_REAL_BACKEND } from "../services/backend-flag";
import { usePlatform } from "../context/PlatformContext";
import { registerSessionCleanup } from "../services/session-lifecycle";
import {
  plansService, planIncludes, type MyPlan, type PlanId, type WorkspacePlan,
} from "../services/real/plans.service";

type Listener = () => void;

// ── Whose plans these are ──────────────────────────────────────────────────
//
// Every answer is kept WITH the account it was read for, and is only ever
// shown to that account. Signing out wipes the store (session-lifecycle);
// a different account signing in on the same tab — even without a sign-out,
// after an expired session — reads nothing of the previous one's, because
// its id does not match. A request that was still on its way for the old
// account is dropped when it lands (`generation`).

/** The account the hooks last rendered for (null: signed out, or unknown). */
let account: string | null = null;
let mine: { readonly for: string | null; readonly plan: MyPlan } | null = null;
let mineLoading: Promise<void> | null = null;
/** Keyed `${account}|${workspaceId}`: "is the owner you?" depends on who asks. */
let workspaces: ReadonlyMap<string, WorkspacePlan> = new Map();
const workspaceLoading = new Map<string, Promise<void>>();
let generation = 0;
const listeners = new Set<Listener>();

const emit = () => { for (const l of listeners) l(); };

/** Calls back whenever the person's plan is (re)read — for views that follow it, like invoices. */
export function onPlanRead(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
const subscribe = (l: Listener) => { listeners.add(l); return () => { listeners.delete(l); }; };
const key = (workspaceId: string) => `${account ?? ""}|${workspaceId}`;

const CHANNEL = "lagda-plan";

/** Points the store at this account, forgetting another's answers. */
function scopeToAccount(userId: string | null): void {
  if (account === userId) return;
  account = userId;
  generation += 1;
  mine = null;
  mineLoading = null;
  workspaces = new Map();
  workspaceLoading.clear();
}

export function refreshMyPlan(): Promise<void> {
  if (!USE_REAL_BACKEND) return Promise.resolve();
  const started = generation;
  const asked = account;
  mineLoading ??= plansService.mine()
    .then(next => { if (generation === started) { mine = { for: asked, plan: next }; emit(); } })
    .catch(() => undefined)
    .finally(() => { if (generation === started) mineLoading = null; });
  return mineLoading;
}

export function refreshWorkspacePlan(workspaceId: string): Promise<void> {
  if (!USE_REAL_BACKEND) return Promise.resolve();
  const k = key(workspaceId);
  const running = workspaceLoading.get(k);
  if (running) return running;
  const started = generation;
  const next = plansService.workspace(workspaceId)
    .then(plan => {
      if (generation !== started) return;
      const m = new Map(workspaces); m.set(k, plan); workspaces = m; emit();
    })
    .catch(() => undefined)
    .finally(() => { if (generation === started) workspaceLoading.delete(k); });
  workspaceLoading.set(k, next);
  return next;
}

/** The workspace ids with a plan read for the current account. */
function knownWorkspaceIds(): string[] {
  const prefix = `${account ?? ""}|`;
  return [...workspaces.keys()].filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length));
}

/** Re-reads every plan here, and tells the account's other tabs to. */
export function announcePlanChanged(): void {
  void refreshMyPlan();
  for (const id of knownWorkspaceIds()) void refreshWorkspacePlan(id);
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage("changed");
    channel.close();
  } catch { /* no BroadcastChannel: this tab is still current */ }
}

/** Forgets everything (sign-out, and tests). Late answers are dropped. */
export function resetPlanStore(): void {
  generation += 1;
  account = null;
  mine = null;
  mineLoading = null;
  workspaces = new Map();
  workspaceLoading.clear();
  emit();
}

// Sign-out leaves nothing of this account's plans behind for the next one.
registerSessionCleanup({ id: "plans", onSignOut: resetPlanStore });

let watching = false;
function watchForChanges(): void {
  if (watching || typeof window === "undefined") return;
  watching = true;
  const refreshAll = () => {
    if (mine !== null) void refreshMyPlan();
    for (const id of knownWorkspaceIds()) void refreshWorkspacePlan(id);
  };
  window.addEventListener("focus", refreshAll);
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = refreshAll;
  } catch { /* no BroadcastChannel */ }
}

const DEMO_MINE: MyPlan = {
  plan: "business", storedPlan: "business", paidUntil: null, autoRenew: true,
  freeDocumentsUsed: 0, freeDocumentLimit: 1, pendingRequest: null, approver: false, upgradesAvailable: false,
};

/** The signed-in account's own plan; null until it has been read. */
export function useMyPlan(): { plan: MyPlan | null; refresh: () => Promise<void> } {
  const userId = usePlatform().user?.id ?? null;
  scopeToAccount(userId);
  const read = useSyncExternalStore(subscribe, () => mine, () => mine);
  // Only this account's own answer, never a previous one's.
  const plan = read !== null && read.for === userId ? read.plan : null;
  useEffect(() => {
    if (!USE_REAL_BACKEND) return;
    watchForChanges();
    if (mine === null || mine.for !== userId) void refreshMyPlan();
  }, [userId]);
  return { plan: USE_REAL_BACKEND ? plan : DEMO_MINE, refresh: refreshMyPlan };
}

/**
 * The plan of a workspace (default: the current one) — its owner's. `plan` is
 * null until it has been read.
 */
export function useWorkspacePlan(workspaceId?: string | null): {
  plan: PlanId | null; info: WorkspacePlan | null; refresh: () => Promise<void>;
} {
  const { currentWorkspace, user } = usePlatform();
  const userId = user?.id ?? null;
  scopeToAccount(userId);
  const id = workspaceId === undefined ? currentWorkspace?.id ?? null : workspaceId;
  const read = () => (id === null ? null : workspaces.get(key(id)) ?? null);
  const info = useSyncExternalStore(subscribe, read, read);
  useEffect(() => {
    if (!USE_REAL_BACKEND || id === null) return;
    watchForChanges();
    if (!workspaces.has(key(id))) void refreshWorkspacePlan(id);
  }, [id, userId]);
  const refresh = useCallback(() => (id === null ? Promise.resolve() : refreshWorkspacePlan(id)), [id]);
  if (!USE_REAL_BACKEND) return { plan: "business", info: null, refresh };
  return { plan: info?.plan ?? null, info, refresh };
}

/**
 * A check for navigation: true unless the current workspace's plan is KNOWN
 * to be below `minimum` (an unread plan hides nothing).
 */
export function usePlanCheck(): (minimum: Exclude<PlanId, "free">) => boolean {
  const { plan } = useWorkspacePlan();
  return useCallback((minimum: Exclude<PlanId, "free">) => plan === null || planIncludes(plan, minimum), [plan]);
}

/**
 * Whether the current workspace's plan includes `minimum`: true, false, or
 * null while unknown (callers keep things visible rather than flicker a lock
 * at a paying workspace).
 */
export function useWorkspaceAllows(minimum: Exclude<PlanId, "free">, workspaceId?: string | null): boolean | null {
  const { plan } = useWorkspacePlan(workspaceId);
  return plan === null ? null : planIncludes(plan, minimum);
}

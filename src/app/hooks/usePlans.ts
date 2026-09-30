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
import {
  plansService, planIncludes, type MyPlan, type PlanId, type WorkspacePlan,
} from "../services/real/plans.service";

type Listener = () => void;

let mine: MyPlan | null = null;
let mineLoading: Promise<void> | null = null;
let workspaces: ReadonlyMap<string, WorkspacePlan> = new Map();
const workspaceLoading = new Map<string, Promise<void>>();
const listeners = new Set<Listener>();

const emit = () => { for (const l of listeners) l(); };
const subscribe = (l: Listener) => { listeners.add(l); return () => { listeners.delete(l); }; };

const CHANNEL = "lagda-plan";

export function refreshMyPlan(): Promise<void> {
  if (!USE_REAL_BACKEND) return Promise.resolve();
  mineLoading ??= plansService.mine()
    .then(next => { mine = next; emit(); })
    .catch(() => undefined)
    .finally(() => { mineLoading = null; });
  return mineLoading;
}

export function refreshWorkspacePlan(workspaceId: string): Promise<void> {
  if (!USE_REAL_BACKEND) return Promise.resolve();
  const running = workspaceLoading.get(workspaceId);
  if (running) return running;
  const next = plansService.workspace(workspaceId)
    .then(plan => { const m = new Map(workspaces); m.set(workspaceId, plan); workspaces = m; emit(); })
    .catch(() => undefined)
    .finally(() => { workspaceLoading.delete(workspaceId); });
  workspaceLoading.set(workspaceId, next);
  return next;
}

/** Re-reads every plan here, and tells the account's other tabs to. */
export function announcePlanChanged(): void {
  void refreshMyPlan();
  for (const id of workspaces.keys()) void refreshWorkspacePlan(id);
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage("changed");
    channel.close();
  } catch { /* no BroadcastChannel: this tab is still current */ }
}

/** For tests: forget everything. */
export function resetPlanStore(): void {
  mine = null;
  workspaces = new Map();
  emit();
}

let watching = false;
function watchForChanges(): void {
  if (watching || typeof window === "undefined") return;
  watching = true;
  const refreshAll = () => {
    if (mine !== null) void refreshMyPlan();
    for (const id of workspaces.keys()) void refreshWorkspacePlan(id);
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
  const plan = useSyncExternalStore(subscribe, () => mine, () => mine);
  useEffect(() => {
    if (!USE_REAL_BACKEND) return;
    watchForChanges();
    if (mine === null) void refreshMyPlan();
  }, []);
  return { plan: USE_REAL_BACKEND ? plan : DEMO_MINE, refresh: refreshMyPlan };
}

/**
 * The plan of a workspace (default: the current one) — its owner's. `plan` is
 * null until it has been read.
 */
export function useWorkspacePlan(workspaceId?: string | null): {
  plan: PlanId | null; info: WorkspacePlan | null; refresh: () => Promise<void>;
} {
  const { currentWorkspace } = usePlatform();
  const id = workspaceId === undefined ? currentWorkspace?.id ?? null : workspaceId;
  const info = useSyncExternalStore(subscribe,
    () => (id === null ? null : workspaces.get(id) ?? null),
    () => (id === null ? null : workspaces.get(id) ?? null));
  useEffect(() => {
    if (!USE_REAL_BACKEND || id === null) return;
    watchForChanges();
    if (!workspaces.has(id)) void refreshWorkspacePlan(id);
  }, [id]);
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

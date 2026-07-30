// Platform session context — central state for the authenticated customer platform.
// Wraps the entire app in main.tsx so both auth and platform routes can access it.
// All data is mock/frontend-only. No real tokens, passwords, or API keys stored here.

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type {
  UserSummary,
  PlatformWorkspace,
  PlatformSessionStatus,
  PlatformRole,
  PlatformPermission,
  PlatformFlags,
  NotificationSummary,
  SubscriptionSummary,
} from "../models";
import { ROLE_PERMISSIONS } from "../models";
import {
  MOCK_CURRENT_USER,
  MOCK_WORKSPACES,
  MOCK_CURRENT_WORKSPACE,
  MOCK_SUBSCRIPTION,
} from "../data/mock/workspaces";
import { MOCK_NOTIFICATIONS } from "../data/mock";
import { globalSearchService } from "../services/mock/global-search.service";
import { documentOrganizationService } from "../services/mock/document-organization.service";
import { workflowAutomationService } from "../services/mock/workflow-automation.service";
import { signingWorkflowService } from "../services/mock/signing-workflow.service";
import { ACTIVE_LAUNCH_PROFILE, resolveCapability, buildCapabilityContext } from "../config/capability-resolver";
import type { LaunchProfileId, CapabilityResolution, ProductCapabilityId } from "../models/product-capability";

// ── Platform flags (default all active for demo) ──────────────────────────────

export const DEFAULT_PLATFORM_FLAGS: PlatformFlags = {
  dashboardEnabled:           true,
  documentsEnabled:           true,
  prepareFlowEnabled:         true,
  templatesEnabled:           true,
  contactsEnabled:            true,
  verificationEnabled:        true,
  notificationsEnabled:       true,
  teamEnabled:                true,
  billingEnabled:             true,
  integrationsEnabled:        true,
  apiEnabled:                 true,
  webhooksEnabled:            true,
  reportsEnabled:             true,
  // Automation is Enterprise Preview — disabled in the default launch profile.
  // Enable via VITE_LAUNCH_PROFILE=enterprise-preview at build time.
  automationEnabled:          false,
  developmentPlaceholdersEnabled: true,
};

// ── Context shape ─────────────────────────────────────────────────────────────

export interface PlatformContextValue {
  sessionStatus:      PlatformSessionStatus;
  user:               UserSummary | null;
  workspaces:         PlatformWorkspace[];
  currentWorkspace:   PlatformWorkspace | null;
  subscription:       SubscriptionSummary | null;
  role:               PlatformRole | null;
  notifications:      NotificationSummary[];
  unreadCount:        number;
  flags:              PlatformFlags;

  // Launch profile + capability resolution
  activeLaunchProfile: LaunchProfileId;
  resolveCapability: (id: ProductCapabilityId | string) => CapabilityResolution;

  // Actions
  signIn: (
    user: UserSummary,
    workspaces: PlatformWorkspace[],
    currentWorkspace: PlatformWorkspace,
    subscription: SubscriptionSummary,
    notifications: NotificationSummary[],
  ) => void;
  signOut: () => void;
  switchWorkspace:            (workspaceId: string) => void;
  markNotificationRead:       (id: string) => void;
  markAllNotificationsRead:   () => void;
  expireSession:              () => void;
  hasPermission:              (p: PlatformPermission) => boolean;
  hasFlag:                    (f: keyof PlatformFlags) => boolean;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [sessionStatus, setSessionStatus] = useState<PlatformSessionStatus>("initializing");
  const [user, setUser] = useState<UserSummary | null>(null);
  const [workspaces, setWorkspaces] = useState<PlatformWorkspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<PlatformWorkspace | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [role, setRole] = useState<PlatformRole | null>(null);
  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [flags] = useState<PlatformFlags>(DEFAULT_PLATFORM_FLAGS);

  // Brief initialization window — resolves to unauthenticated if nothing restores a session
  useEffect(() => {
    const t = setTimeout(() => {
      setSessionStatus((s) => s === "initializing" ? "unauthenticated" : s);
    }, 350);
    return () => clearTimeout(t);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const signIn = useCallback((
    u: UserSummary,
    ws: PlatformWorkspace[],
    cw: PlatformWorkspace,
    sub: SubscriptionSummary,
    notifs: NotificationSummary[],
  ) => {
    setUser(u);
    setWorkspaces(ws);
    setCurrentWorkspace(cw);
    setSubscription(sub);
    setNotifications(notifs);
    setRole(cw.role);
    setSessionStatus("authenticated");
  }, []);

  const signOut = useCallback(() => {
    globalSearchService.resetGlobalSearchDemonstration();
    documentOrganizationService.resetDocumentOrganizationDemonstration();
    workflowAutomationService.resetWorkflowAutomationDemonstration();
    // Clears every signing-workflow draft, stage selection, and demonstration activity
    // record before the next account can load.
    signingWorkflowService.resetSigningWorkflowDemonstration();
    setSessionStatus("unauthenticated");
    setUser(null);
    setWorkspaces([]);
    setCurrentWorkspace(null);
    setSubscription(null);
    setNotifications([]);
    setRole(null);
  }, []);

  const switchWorkspace = useCallback((workspaceId: string) => {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (!ws) return;
    globalSearchService.clearWorkspaceScopedDestinations();
    documentOrganizationService.clearWorkspaceScopedOrganization(ws.id);
    workflowAutomationService.clearWorkspaceScopedAutomation(ws.id);
    signingWorkflowService.clearWorkspaceScopedWorkflows(ws.id);
    setCurrentWorkspace(ws);
    setRole(ws.role);
    // In production: re-fetch documents, notifications, etc. for the new workspace.
    // For demo, keep existing notifications.
  }, [workspaces]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((ns) => ns.map((n) => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((ns) => ns.map((n) => ({ ...n, isRead: true })));
  }, []);

  const expireSession = useCallback(() => {
    setSessionStatus("expired");
  }, []);

  const hasPermission = useCallback((p: PlatformPermission): boolean => {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.includes(p) ?? false;
  }, [role]);

  const hasFlag = useCallback((f: keyof PlatformFlags): boolean => {
    return flags[f];
  }, [flags]);

  const resolveCapabilityFn = useCallback((id: ProductCapabilityId | string): CapabilityResolution => {
    const ctx = buildCapabilityContext(
      ACTIVE_LAUNCH_PROFILE,
      role ? (ROLE_PERMISSIONS[role] ?? []) : [],
      flags as Record<string, boolean>,
    );
    return resolveCapability(id, ctx);
  }, [role, flags]);

  return (
    <PlatformContext.Provider value={{
      sessionStatus, user, workspaces, currentWorkspace, subscription, role,
      notifications, unreadCount, flags,
      activeLaunchProfile: ACTIVE_LAUNCH_PROFILE,
      resolveCapability: resolveCapabilityFn,
      signIn, signOut, switchWorkspace,
      markNotificationRead, markAllNotificationsRead,
      expireSession, hasPermission, hasFlag,
    }}>
      {children}
    </PlatformContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used inside <PlatformProvider>");
  return ctx;
}

export function usePermission(permission: PlatformPermission): boolean {
  const { hasPermission } = usePlatform();
  return hasPermission(permission);
}

export function usePlatformFlag(flag: keyof PlatformFlags): boolean {
  const { hasFlag } = usePlatform();
  return hasFlag(flag);
}

export function useCapability(id: ProductCapabilityId | string): CapabilityResolution {
  const { resolveCapability: resolve } = usePlatform();
  return resolve(id);
}

// Mock sign-in helper — loads demo data into context.
// Called from SignIn.tsx after mock form validation succeeds.
export function createMockSignInPayload() {
  return {
    user: MOCK_CURRENT_USER,
    workspaces: MOCK_WORKSPACES,
    currentWorkspace: MOCK_CURRENT_WORKSPACE,
    subscription: MOCK_SUBSCRIPTION,
    notifications: [...MOCK_NOTIFICATIONS],
  };
}

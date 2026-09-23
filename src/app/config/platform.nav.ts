// Centralized platform navigation configuration.
// Drives both the desktop sidebar and mobile drawer.
// Add/remove items here — no changes needed in layout components.

import type { PlatformPermission, PlatformFeatureFlag } from "../models";

export type NavStatus = "active" | "planned" | "enterprise";
export type NavGroup = "primary" | "utility" | "settings";

export interface PlatformNavItem {
  id: string;
  label: string;
  path: string;
  icon: string;             // Lucide icon name
  group: NavGroup;
  permission?: PlatformPermission;
  featureFlag?: PlatformFeatureFlag;
  status?: NavStatus;
  showBadge?: boolean;      // dynamic badge (e.g., unread count)
  showOnMobile?: boolean;
  description?: string;
}

// ── Bulk Send: deliberately absent from navigation (Gap Closure Command 5) ───
//
// Bulk Send is registered with Global Search, the Command Palette, the Dashboard,
// Reports, Notifications and the Documents workspace, but NOT here. That is a
// decision, not an omission — recorded so nobody "fixes" it by adding an item.
//
// WHY NOT:
//   1. It is an Enterprise Preview capability. A top-level item would rank it
//      alongside Documents and Templates, above launch features, for every user
//      in every profile that has it.
//   2. It is entered from context — from Documents, or from a Template that is
//      being sent to many recipients. A standalone entry point invites starting a
//      batch before there is a Template to send, which is the state the feature
//      handles worst.
//   3. Nothing about it is unreachable. The Command Palette ("Open Bulk Send"),
//      Global Search, the Dashboard card, the Reports family, and the Documents
//      provenance link all lead there.
//
// THIS IS NOT A PERMISSION DECISION. Hidden navigation is presentation, never
// authorization: /app/bulk-send/* is guarded by CapabilityGuard and the service's
// own permission checks, and a user who can reach those routes can still reach
// them by every other path, including a direct URL.
//
// Revisit if Bulk Send graduates out of Enterprise Preview into a launch
// capability — at that point the registry's `navigationVisibility` flag should be
// flipped to true and an item added here.

// Primary navigation — shown in sidebar and mobile drawer
export const PRIMARY_NAV: PlatformNavItem[] = [
  {
    id: "dashboard",
    label: "Home",
    path: "/app/dashboard",
    icon: "LayoutDashboard",
    group: "primary",
    permission: "view_dashboard",
    featureFlag: "dashboardEnabled",
    showOnMobile: true,
    description: "Activity overview and quick actions",
  },
  {
    id: "documents",
    label: "Documents",
    path: "/app/documents",
    icon: "FileText",
    group: "primary",
    permission: "view_documents",
    featureFlag: "documentsEnabled",
    showBadge: true,
    showOnMobile: true,
    description: "All document transactions",
  },
  {
    id: "templates",
    label: "Templates",
    path: "/app/templates",
    icon: "Files",
    group: "primary",
    // Not `manage_templates`: that gates AUTHORING one, and this is the entry
    // point to the whole library, including reading and applying an existing
    // template — a `sender`'s act, per the backend's own template.view
    // capability (core/src/authorization/index.ts). Gating navigation to
    // `manage_templates` meant a sender could never reach this page at all,
    // even though the backend already lets them use it once they're on it.
    // `view_workflow` is the permission `sender` already holds for exactly
    // this reason. Individual write actions (Create, Edit, Delete, ...) keep
    // their own `manage_templates` checks inside the pages themselves.
    permission: "view_workflow",
    featureFlag: "templatesEnabled",
    showOnMobile: true,
    description: "Reusable document templates",
  },
  {
    id: "contacts",
    label: "Contacts",
    path: "/app/contacts",
    icon: "Users",
    group: "primary",
    permission: "manage_contacts",
    featureFlag: "contactsEnabled",
    showOnMobile: true,
    description: "Signing participants and contacts",
  },
  {
    id: "verify",
    label: "Check a Document",
    path: "/app/verify",
    icon: "ShieldCheck",
    group: "primary",
    permission: "verify_documents",
    featureFlag: "verificationEnabled",
    showOnMobile: true,
    description: "Check document authenticity",
  },
  {
    id: "inbox",
    label: "Needs your signature",
    path: "/app/inbox",
    icon: "Inbox",
    group: "primary",
    showBadge: true,
    showOnMobile: true,
    description: "Document requests assigned to you",
    // This was the only navigation entry with neither a permission nor a
    // feature flag, which is how a demonstration surface stayed reachable in
    // production long after everything around it had been gated.
    featureFlag: "recipientInboxEnabled",
  },
  {
    id: "automation",
    label: "Automation",
    path: "/app/automation",
    icon: "Zap",
    group: "primary",
    permission: "view_workflow_automation",
    featureFlag: "automationEnabled",
    showOnMobile: false,
    description: "Workflow rules, policies, and defaults",
  },
];

// Utility navigation — shown below primary nav (or bottom of sidebar)
export const UTILITY_NAV: PlatformNavItem[] = [
  {
    // ONE row for everything administrative, and it opens a PAGE.
    //
    // It replaces a "Team" row that pointed at /app/team — four routes that
    // render `<PlatformPlaceholder />` and always did (router.tsx calls them
    // "legacy placeholders"). Real member management lives under
    // /app/workspace, which until now was linked ONLY from the settings side
    // rail — and that rail is display:none below 1024px, so Members, Teams,
    // Roles and Invitations were unreachable by navigation on any phone.
    //
    // A page rather than a flyout because a page can carry a line of
    // explanation under each link ("Members — who is in this workspace"),
    // which a 13px sidebar row cannot. Someone intimidated by the product
    // reads one word and decides it is not for them today, instead of
    // deciding that eleven times before their first send.
    id: "manage",
    label: "Manage",
    path: "/app/workspace",
    icon: "Settings2",
    group: "utility",
    permission: "manage_team",
    featureFlag: "teamEnabled",
    showOnMobile: true,
    description: "People, oversight and workspace settings",
  },
];

// Prepare Document CTA — primary action, always visible
export const PREPARE_ACTION = {
  label: "New Document",
  path: "/app/prepare",
  icon: "FilePlus",
  permission: "prepare_documents" as PlatformPermission,
  featureFlag: "prepareFlowEnabled" as PlatformFeatureFlag,
};

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

// Primary navigation — shown in sidebar and mobile drawer
export const PRIMARY_NAV: PlatformNavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
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
    permission: "manage_templates",
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
    label: "Verify Document",
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
    label: "My Actions",
    path: "/app/inbox",
    icon: "Inbox",
    group: "primary",
    showBadge: true,
    showOnMobile: true,
    description: "Document requests assigned to you",
  },
  {
    id: "reports",
    label: "Reports",
    path: "/app/reports",
    icon: "BarChart2",
    group: "primary",
    permission: "view_reports",
    featureFlag: "reportsEnabled",
    showOnMobile: false,
    description: "Operational insights and analytics",
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
    id: "notifications",
    label: "Notifications",
    path: "/app/notifications",
    icon: "Bell",
    group: "utility",
    featureFlag: "notificationsEnabled",
    showBadge: true,
    showOnMobile: true,
    description: "Activity alerts and updates",
  },
  {
    id: "team",
    label: "Team",
    path: "/app/team",
    icon: "Users2",
    group: "utility",
    permission: "manage_team",
    featureFlag: "teamEnabled",
    showOnMobile: false,
    description: "Manage workspace members",
  },
];

// Prepare Document CTA — primary action, always visible
export const PREPARE_ACTION = {
  label: "Prepare Document",
  path: "/app/prepare",
  icon: "FilePlus",
  permission: "prepare_documents" as PlatformPermission,
  featureFlag: "prepareFlowEnabled" as PlatformFeatureFlag,
};

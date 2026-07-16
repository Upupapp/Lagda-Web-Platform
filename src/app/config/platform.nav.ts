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

export interface PlatformSettingsItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  permission?: PlatformPermission;
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

// Settings navigation — shown in the settings section
export const SETTINGS_NAV: PlatformSettingsItem[] = [
  { id: "profile",        label: "Profile",             path: "/app/settings/profile",        icon: "CircleUser",     description: "Name, email, and preferences" },
  { id: "security",       label: "Security",            path: "/app/settings/security",       icon: "Lock",           permission: "manage_security" },
  { id: "notifications",  label: "Notifications",       path: "/app/settings/notifications",  icon: "BellRing" },
  { id: "branding",       label: "Branding",            path: "/app/settings/branding",       icon: "Palette",        permission: "manage_branding" },
  { id: "billing",        label: "Billing",             path: "/app/settings/billing",        icon: "CreditCard",     permission: "view_billing" },
  { id: "usage",          label: "Usage",               path: "/app/settings/usage",          icon: "BarChart2",      permission: "view_usage" },
  { id: "integrations",   label: "Integrations",        path: "/app/settings/integrations",   icon: "Puzzle",         permission: "manage_integrations" },
  { id: "api",            label: "API Access",          path: "/app/settings/api",            icon: "Code2",          permission: "manage_api" },
  { id: "webhooks",       label: "Webhooks",            path: "/app/settings/webhooks",       icon: "Webhook",        permission: "manage_webhooks" },
];

// Prepare Document CTA — primary action, always visible
export const PREPARE_ACTION = {
  label: "Prepare Document",
  path: "/app/prepare",
  icon: "FilePlus",
  permission: "prepare_documents" as PlatformPermission,
  featureFlag: "prepareFlowEnabled" as PlatformFeatureFlag,
};

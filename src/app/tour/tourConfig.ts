// Product Tour — step configuration.
// Two chapters authored in this pass: Dashboard Orientation and Sidebar
// Navigation Orientation. Add more chapters here later; the engine
// (TourContext/TourOverlay/TourCoachmark) never needs to change.
//
// Every `target` value must match a real `data-guide="..."` attribute added
// to PlatformDashboard.tsx, PlatformSidebar.tsx, or MobileNav.tsx. Copy is
// written to describe what THIS interface shows — never real backend
// persistence, real emails, or cryptographic guarantees — matching the
// "Frontend demonstration" notice already on the dashboard.
//
// Trimmed to 7 steps deliberately (from an earlier 19): welcome, navigation,
// primary actions, personal task inbox, document status, global search, and
// replay. Everything else here was either role/capability-gated (Bulk Send,
// Reports, Automation, Templates, Usage & Plan, Team), redundant with a step
// that stayed (Needs Attention vs. Status Summary + My Actions; toolbar
// Notifications vs. the dashboard Notifications step), or secondary detail
// (Recent Documents/Activity, Help Center) — a first-run tour should teach
// the handful of things every role needs, not every screen that exists.

import type { GuideStep } from "./types";

function hasGuideTarget(target: string): boolean {
  if (typeof document === "undefined") return false;
  return document.querySelector(`[data-guide="${target}"]`) !== null;
}

export const DASHBOARD_CHAPTER = "dashboard-orientation";
export const SIDEBAR_CHAPTER = "sidebar-navigation-orientation";
export const TOOLBAR_CHAPTER = "platform-toolbar";

export const TOUR_STEPS: GuideStep[] = [
  // ── Chapter 1: Dashboard Orientation ─────────────────────────────────────
  {
    id: "dashboard.welcome",
    chapter: DASHBOARD_CHAPTER,
    route: "/app/dashboard",
    title: "Welcome to LAGDA",
    description:
      "This short tour walks through the Dashboard and the sidebar so you know where things live. Everything shown here is a frontend demonstration — the data on screen is mock data, not a live backend.",
    placement: "center",
  },
  {
    id: "dashboard.quick-actions",
    chapter: DASHBOARD_CHAPTER,
    route: "/app/dashboard",
    target: "dashboard-quick-actions",
    title: "Quick Actions",
    description:
      "These cards are the fastest way to start something — preparing a document, opening a template, verifying a document, or inviting a teammate. Only actions your role can perform are shown.",
    placement: "bottom",
    condition: () => hasGuideTarget("dashboard-quick-actions"),
  },
  {
    id: "dashboard.my-actions",
    chapter: DASHBOARD_CHAPTER,
    route: "/app/dashboard",
    target: "dashboard-my-actions",
    title: "My Actions",
    description:
      "When a document is waiting on you to sign, approve, or review, it shows up here first — this demo view lists items assigned to you in the mock inbox.",
    placement: "bottom",
    condition: () => hasGuideTarget("dashboard-my-actions"),
    targetTimeoutMs: 2000,
  },
  {
    id: "dashboard.status-summary",
    chapter: DASHBOARD_CHAPTER,
    route: "/app/dashboard",
    target: "dashboard-status-summary",
    title: "Document Status",
    description:
      "A running count of your documents by status in this demo workspace — awaiting signature, in progress, completed, and expired. Click a card to filter the Documents list.",
    placement: "bottom",
    permission: "view_documents",
    condition: () => hasGuideTarget("dashboard-status-summary"),
  },
  // ── Chapter 2: Sidebar Navigation Orientation ────────────────────────────
  {
    id: "sidebar.overview",
    chapter: SIDEBAR_CHAPTER,
    target: "platform-sidebar-nav",
    title: "Getting Around LAGDA",
    description:
      "This is how you reach the rest of the platform: Documents, Workflow, Templates, Contacts, Verify Document, My Actions, Reports, and Automation, plus Notifications, Team, and Settings below. Only the sections your role can access are shown — on smaller screens, the same navigation lives behind the menu icon at the top.",
    placement: "right",
  },

  // ── Chapter 3: Platform Toolbar ──────────────────────────────────────────
  // Covers the header cluster added alongside this chapter: search, the
  // notification bell, help, and the tour restart entry point. Each step
  // targets whichever chrome is actually on screen — the desktop header's
  // `data-guide` values, or the mobile drawer's equivalents on narrow
  // viewports — via `target` / `mobileTarget`.
  {
    id: "toolbar.search",
    chapter: TOOLBAR_CHAPTER,
    target: "header-search-btn",
    mobileTarget: "mobile-search-trigger",
    title: "Search",
    description:
      "Press Ctrl+K (⌘K on Mac) or use this shortcut to search across documents, my actions, templates, contacts, people & teams, verification, notifications, reports, settings, and help — all from one place.",
    placement: "bottom",
    condition: () => hasGuideTarget("header-search-btn") || hasGuideTarget("mobile-search-trigger"),
  },
  {
    id: "toolbar.restart-tour",
    chapter: TOOLBAR_CHAPTER,
    target: "header-restart-tour-btn",
    mobileTarget: "mobile-restart-tour-trigger",
    title: "Replay This Tour",
    description:
      "You can come back to this walkthrough anytime — this button restarts it from the beginning.",
    placement: "bottom",
    condition: () => hasGuideTarget("header-restart-tour-btn") || hasGuideTarget("mobile-restart-tour-trigger"),
  },
];

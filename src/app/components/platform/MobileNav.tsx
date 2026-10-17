// Mobile navigation — top bar, bottom bar + slide-in drawer.
// Replaces the sidebar at <768px.
// Focus-trapped while open. Escape closes. Scroll locked.

import { usePlanCheck, useMyPlan } from "../../hooks/usePlans";
import { WorkspaceBadge } from "./WorkspaceBadge";
import { WorkspacePlanLine } from "./WorkspaceSwitcher";
import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { NavLink, Link, useLocation } from "react-router";
import {
  Menu, X, LayoutDashboard, FileText, Files, Users, ShieldCheck,
  Bell, Users2, Settings, Settings2, FilePlus, Inbox, HelpCircle, GitBranch, BarChart2, Zap,
  Search, Compass, Share2, Mail, ChevronDown, LogIn, Building2, UserCog, Lock, Check, Stamp, BadgeCheck, Home, LayoutTemplate,
} from "lucide-react";
import { JoinWorkspaceDialog } from "./JoinWorkspaceDialog";
import lagdaHeaderLogo from "../../../brand elements/svg/LagdaLogoPrimaryHorizontalFullColor_Header.svg";
import { usePlatform } from "../../context/PlatformContext";
import { PRIMARY_NAV, UTILITY_NAV, ACCOUNT_NAV, PREPARE_ACTION } from "../../config/platform.nav";
import { NotificationMenu } from "./NotificationMenu";
import { useTour } from "../../tour/TourContext";
import { Z } from "../../utils/z-index";
// Same lazy-load rationale as PlatformHeader.tsx: the palette pulls in every
// domain's mock fixtures, so it stays out of the entry chunk until opened.
const CommandPalette = lazy(() =>
  import("./CommandPalette").then(m => ({ default: m.CommandPalette })),
);
import { useSignOutFlow } from "../../hooks/useSignOutFlow";
import { usePrepareLaunch } from "../../hooks/usePrepareLaunch";
import { UserAvatar } from "./UserAvatar";
import { usePendingInvitationCount } from "../../hooks/usePendingInvitationCount";
import { InvitationCountBubble, NavCountBubble, INVITATION_BUBBLE_STYLES } from "./InvitationCountBubble";
import { useNavCounts } from "../../hooks/useNavCounts";
import { useWorkspacePlanLabel } from "../../hooks/useWorkspacePlanLabel";
import { useNavAccess } from "../../hooks/useCanPrepare";
import { useAccountFeatures } from "../../hooks/useAccountFeatures";

const BORDER = "rgba(0,0,0,0.08)";
const GF     = { fontFamily: "'Geist', sans-serif" };
const GM     = { fontFamily: "'Geist Mono', monospace" };

// Must cover the same names as PlatformSidebar's map. It did not: Inbox and
// HelpCircle were absent, so "My Actions" rendered with no icon on mobile only.
const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, FileText, Files, Users, ShieldCheck, Bell, Users2, Settings, Settings2, FilePlus,
  Inbox, HelpCircle, GitBranch, BarChart2, Zap, Share2, Mail, Building2, UserCog, Stamp,
};
// The bottom bar: the four places people go most, with Prepare in the middle.
// Everything else stays in the drawer. Icons only, so each needs one that
// reads on its own; the label is the accessible name.
const BOTTOM_BAR_HEIGHT = 60;
const BOTTOM_BAR_IDS = ["dashboard", "documents", "shared-documents", "templates"] as const;
const BOTTOM_BAR_ICONS: Record<(typeof BOTTOM_BAR_IDS)[number], React.ElementType> = {
  dashboard: Home, documents: FileText, "shared-documents": Share2, templates: LayoutTemplate,
};
// Prepare Document's own surface: deep navy under a fine diamond weave.
const PREPARE_NAVY = "#0A1A4F";
const PREPARE_WEAVE =
  "repeating-linear-gradient(45deg, rgba(96,140,255,0.16) 0 1px, transparent 1px 6px), " +
  "repeating-linear-gradient(-45deg, rgba(96,140,255,0.16) 0 1px, transparent 1px 6px)";
const inBottomBar = (id: string) => (BOTTOM_BAR_IDS as readonly string[]).includes(id);

function NavIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Comp = ICON_MAP[name];
  if (!Comp) return null;
  return <Comp size={size} aria-hidden />;
}

export function MobileNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const { user, currentWorkspace, workspaces, switchWorkspace, refreshWorkspaceList, unreadCount, hasFlag } = usePlatform();
  const [switching, setSwitching] = useState(false);
  // Opening the list is when someone looks for a newly approved workspace.
  useEffect(() => {
    if (switching) void refreshWorkspaceList();
    // Only on opening; the function's identity changes with the list itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [switching]);

  const planAllows = usePlanCheck();
  // 093. Joining another workspace is part of Personal (the person's own plan).
  const { plan: myPlan } = useMyPlan();
  const joinLocked = myPlan?.plan === "free";
  // The workspace's real plan, as the desktop switcher shows it (never the
  // session's placeholder).
  const planLabel = useWorkspacePlanLabel(currentWorkspace ?? null);
  const { restartTour } = useTour();
  const drawerRef    = useRef<HTMLDivElement>(null);
  const triggerRef   = useRef<HTMLButtonElement>(null);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [drawerOpen]);

  // Close on Escape; trap focus
  useEffect(() => {
    if (!drawerOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [drawerOpen]);

  // Focus first item when drawer opens
  useEffect(() => {
    if (drawerOpen && drawerRef.current) {
      const first = drawerRef.current.querySelector<HTMLElement>('a[href], button:not([disabled])');
      setTimeout(() => first?.focus(), 50);
    }
  }, [drawerOpen]);

  const closeAndNavigate = useCallback(() => {
    setDrawerOpen(false);
    triggerRef.current?.focus();
  }, []);

  // The drawer closes first so the confirmation is not stacked behind it.
  const { requestSignOut, confirmDialog } = useSignOutFlow(() => { setDrawerOpen(false); });
  const { onPrepareClick } = usePrepareLaunch();
  const pendingInvitations = usePendingInvitationCount();
  const navCounts = useNavCounts();
  const handleSignOut = requestSignOut;

  const openSearch = useCallback(() => {
    setDrawerOpen(false);
    setSearchOpen(true);
  }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const handleRestartTour = useCallback(() => {
    setDrawerOpen(false);
    restartTour();
  }, [restartTour]);

  const nav = useNavAccess();
  // The person's OWN verification, beside their own name.
  const { identityVerified } = useAccountFeatures();
  const canPrepare = nav.canPrepare && hasFlag("prepareFlowEnabled");

  // Which of the bar's five places (Prepare is the third) the page is in, for
  // the raised circle that slides between them. -1 on a page the bar does not list.
  const { pathname } = useLocation();
  const activeBarId = BOTTOM_BAR_IDS.find(id => {
    const path = PRIMARY_NAV.find(entry => entry.id === id)?.path;
    return path !== undefined && (pathname === path || pathname.startsWith(`${path}/`));
  });
  const activeBarIndex = activeBarId === undefined ? -1 : BOTTOM_BAR_IDS.indexOf(activeBarId);
  const preparing = pathname === PREPARE_ACTION.path || pathname.startsWith(`${PREPARE_ACTION.path}/`);
  const activeBarSlot = preparing ? 2 : activeBarIndex < 0 ? -1 : activeBarIndex + (activeBarIndex >= 2 ? 1 : 0);
  // The circle stays where it last was while it fades out, so it never slides
  // in from the edge when a listed page is opened next.
  const lastBarSlot = useRef(0);
  if (activeBarSlot >= 0) lastBarSlot.current = activeBarSlot;

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: Z.shell,
          height: 56, background: "#ffffff",
          borderBottom: `1px solid ${BORDER}`,
          display: "flex", alignItems: "center",
          // The logo pinned to the very left edge and the hamburger to the
          // very right, with nothing stretching either toward the middle —
          // `justify-content: space-between` on the two end groups, and
          // everything between them (bell, avatar) kept close to the
          // hamburger rather than centered in the free space.
          justifyContent: "space-between",
          paddingLeft: 10, paddingRight: 6,
        }}
        aria-label="Mobile navigation bar"
      >
        {/* Logo — far left, and the largest it can be without crowding the
            actions on the narrowest phones this still has to fit. */}
        <NavLink to="/app/dashboard" style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0, minWidth: 0 }} aria-label="LAGDA — Dashboard">
          {/* The cropped header SVG, as the onboarding header uses: the full
              file's canvas is mostly whitespace, so at phone widths its
              wordmark rendered tiny. Cropped, the wordmark fills the width.
              Same on every page, not just the dashboard. */}
          <img src={lagdaHeaderLogo} alt="LAGDA" style={{ display: "block", width: "clamp(150px, 46vw, 200px)", maxWidth: "100%", aspectRatio: "200 / 58", height: "auto", objectFit: "cover", objectPosition: "left center" }} />
        </NavLink>

        {/* Right actions: bell, avatar, then the hamburger last — at the
            very right edge, where a nav trigger is expected. */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          <span data-guide="mobile-notification-bell" style={{ display: "flex" }}>
            <NotificationMenu align="right" />
          </span>
          {user ? (
            <Link
              to="/app/settings/profile"
              aria-label="Your profile"
              data-testid="mobile-profile-link"
              className="mobile-nav-btn"
              style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, flexShrink: 0, textDecoration: "none" }}
            >
              <UserAvatar user={user} size={32} fontSize={10} />
            </Link>
          ) : null}
          <button
            ref={triggerRef}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
            style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "#64748B", cursor: "pointer", borderRadius: 8, flexShrink: 0 }}
            className="mobile-nav-btn"
          >
            <Menu size={20} aria-hidden />
          </button>
        </div>
      </header>

      {/* ── Bottom bar ──────────────────────────────────────────── */}
      <nav
        aria-label="Main sections"
        data-testid="mobile-bottom-nav"
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: Z.shell,
          height: `calc(${BOTTOM_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
          paddingBottom: "env(safe-area-inset-bottom, 0px)", boxSizing: "border-box",
          background: "#ffffff", borderTop: `1px solid ${BORDER}`,
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", alignItems: "center",
        }}
      >
        <span
          aria-hidden
          className="mnav-bottom-pill"
          data-testid="mobile-bottom-pill"
          // The one raised circle in the bar: it marks the place you are in,
          // Prepare Document included.
          style={{
            position: "absolute", top: -5, width: 52, height: 52, borderRadius: 999, boxSizing: "border-box",
            left: `calc(${lastBarSlot.current * 20 + 10}% - 26px)`,
            backgroundColor: "#0078D4", border: "3px solid #ffffff", boxShadow: "0 4px 14px rgba(0,120,212,0.35)",
            pointerEvents: "none",
            opacity: activeBarSlot >= 0 ? 1 : 0,
            transform: activeBarSlot >= 0 ? "scale(1)" : "scale(0.6)",
          }}
        />
        {BOTTOM_BAR_IDS.map((id, index) => {
          const item = PRIMARY_NAV.find(entry => entry.id === id);
          const shown = item !== undefined && nav.allows(item)
            && (!item.featureFlag || hasFlag(item.featureFlag))
            && (item.plan === undefined || planAllows(item.plan));
          const Icon = BOTTOM_BAR_ICONS[id];
          const count = id === "documents" ? navCounts.documents : id === "shared-documents" ? navCounts.shared : 0;
          return (
            <span key={id} style={{ display: "contents" }}>
              {/* Prepare takes the middle of the five places. */}
              {index === 2 && (
                <span style={{ display: "flex", justifyContent: "center" }}>
                  {canPrepare && (
                    <NavLink
                      to={PREPARE_ACTION.path}
                      onClick={(event) => { onPrepareClick(PREPARE_ACTION.path)(event); }}
                      aria-label="Prepare Document"
                      title="Prepare Document"
                      data-testid="mobile-bottom-prepare"
                      className="mnav-bottom-prepare"
                      // A navy soft square at rest, level with the rest. While
                      // preparing it rounds off, rises into the circle and
                      // takes the circle's colour.
                      style={{
                        position: "relative", width: 44, height: 44, boxSizing: "border-box",
                        borderRadius: preparing ? 999 : 14,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        backgroundColor: preparing ? "#0078D4" : PREPARE_NAVY,
                        backgroundImage: preparing ? "none" : PREPARE_WEAVE,
                        color: "#ffffff", textDecoration: "none",
                        transform: preparing ? "translateY(-9px)" : "none",
                      }}
                    >
                      <FilePlus size={22} aria-hidden />
                    </NavLink>
                  )}
                </span>
              )}
              <span style={{ display: "flex", justifyContent: "center" }}>
                {shown && item && (
                  <NavLink
                    to={item.path}
                    aria-label={count > 0 ? `${item.label} (${count})` : item.label}
                    title={item.label}
                    className="mnav-bottom-link"
                    style={({ isActive }) => ({
                      position: "relative", width: 52, height: 44, borderRadius: 12,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      textDecoration: "none",
                      color: isActive ? "#ffffff" : "#64748B",
                      background: "transparent",
                      // Up into the circle: its centre is 9px above the row's.
                      transform: isActive ? "translateY(-9px)" : "none",
                    })}
                  >
                    <Icon size={22} aria-hidden />
                    {count > 0 && (
                      <span aria-hidden style={{ position: "absolute", top: 4, right: 6, minWidth: 16, height: 16, padding: "0 4px", boxSizing: "border-box", borderRadius: 999, background: "#0078D4", color: "#ffffff", ...GM, fontSize: 9, fontWeight: 700, lineHeight: "16px", textAlign: "center" }}>
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </NavLink>
                )}
              </span>
            </span>
          );
        })}
      </nav>

      {/* ── Backdrop ────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          onClick={() => { setDrawerOpen(false); triggerRef.current?.focus(); }}
          aria-hidden
          style={{ position: "fixed", inset: 0, zIndex: Z.drawerScrim, background: "rgba(0,0,0,0.5)" }}
        />
      )}

      {/* ── Drawer ──────────────────────────────────────────────── */}
      {/*
        LAGDA-RESP-2. The drawer stays MOUNTED so it can slide, but while it is
        closed it must be genuinely gone — not merely moved off-screen.

        `transform: translateX(-100%)` alone hides it visually and changes
        nothing else: all 14 controls (Prepare Document, Dashboard ... Settings,
        Sign Out, Close navigation) stayed in the tab order at x -270..-11, so a
        keyboard user tabbing off the hamburger vanished into an invisible menu.
        It also announced `role="dialog"` with `aria-modal` permanently, which
        tells a screen reader a modal is open when none is.

        Three things fix it together, and each covers a gap the others leave:

          inert            removes the subtree from the tab order, from hit
                           testing and from the accessibility tree. One
                           attribute, and it is the one that actually matters.
          visibility       the fallback for browsers without `inert`. Unlike
                           `display: none` it still animates, which is why the
                           transition below also carries `visibility`.
          role/aria-modal  applied only while open, so nothing claims a modal
                           exists when the drawer is shut.

        `visibility` is deliberately part of the transition: without it the
        drawer would become invisible instantly and the slide-out would not be
        seen. `0s 0.22s` delays hiding until the slide finishes; opening applies
        it immediately.
      */}
      <div
        id="mobile-nav-drawer"
        ref={drawerRef}
        {...(drawerOpen ? { role: "dialog", "aria-modal": true } : {})}
        aria-label="Navigation"
        // `inert` is a real HTML attribute but @types/react 18 has no typing
        // for it (React 19 adds one). Spread as an attribute rather than
        // dropped: the runtime honours it today, and this is the line that
        // actually removes the closed drawer from the tab order.
        {...({ inert: drawerOpen ? undefined : "" } as { inert?: string })}
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0, zIndex: Z.drawer,
          width: 280,
          background: "#ffffff",
          borderRight: `1px solid ${BORDER}`,
          display: "flex", flexDirection: "column",
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          visibility: drawerOpen ? "visible" : "hidden",
          transition: drawerOpen
            ? "transform 0.22s ease, visibility 0s"
            : "transform 0.22s ease, visibility 0s 0.22s",
          overflowY: "auto",
        }}
      >
        {/* Drawer header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <img src={lagdaHeaderLogo} alt="LAGDA" style={{ display: "block", width: 172, aspectRatio: "200 / 58", height: "auto", objectFit: "cover", objectPosition: "left center" }} />
          <button
            onClick={() => { setDrawerOpen(false); triggerRef.current?.focus(); }}
            aria-label="Close navigation"
            style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "#F1F5F9", border: "none", borderRadius: 8, color: "#64748B", cursor: "pointer" }}
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        {/* Workspace */}
        {currentWorkspace && (
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            {/* The switcher. The desktop sidebar has had one all along; here the
                workspace was only a label, so on a phone there was no way to
                change workspace at all. It opens IN PLACE, as a list under the
                row: a floating menu inside a 280px drawer has nowhere to go. */}
            <button
              type="button"
              onClick={() => { setSwitching(v => !v); }}
              aria-expanded={switching}
              aria-controls="mobile-workspace-list"
              aria-label={`Current workspace: ${currentWorkspace.name}. Tap to switch.`}
              data-testid="mobile-workspace-switcher"
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 44,
                padding: "6px 8px", margin: "-6px -8px 0", boxSizing: "content-box",
                background: switching ? "#F1F5F9" : "transparent", border: "none", borderRadius: 8,
                cursor: "pointer", textAlign: "left",
              }}
            >
              <WorkspaceBadge workspace={currentWorkspace} size={28} radius={7} fontSize={10} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", color: "#07111F", ...GF, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentWorkspace.name}</span>
                {planLabel && <span style={{ display: "block", color: "#64748B", ...GM, fontSize: 10 }}>{planLabel}</span>}
              </span>
              <ChevronDown size={16} aria-hidden style={{ color: "#64748B", flexShrink: 0, transform: switching ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
            </button>
            {switching && (
              <div id="mobile-workspace-list" role="group" aria-label="Your workspaces"
                style={{ marginTop: 8, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
                {workspaces.map(ws => {
                  const current = ws.id === currentWorkspace.id;
                  return (
                    <button
                      key={ws.id} type="button"
                      aria-current={current ? "true" : undefined}
                      onClick={() => {
                        setSwitching(false);
                        if (!current) switchWorkspace(ws.id);
                        setDrawerOpen(false); triggerRef.current?.focus();
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 48,
                        padding: "6px 10px", background: current ? "#EEF6FD" : "#FFFFFF", border: "none",
                        borderBottom: `1px solid ${BORDER}`, cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <WorkspaceBadge workspace={ws} size={26} radius={7} fontSize={10} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", color: "#07111F", ...GF, fontSize: 13, fontWeight: current ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ws.name}</span>
                        <WorkspacePlanLine workspace={ws} />
                      </span>
                      {current && <Check size={15} aria-hidden style={{ color: "#0078D4", flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            )}
            {/* The drawer closes first so the dialog is not stacked behind it. */}
            <button type="button" disabled={joinLocked} aria-disabled={joinLocked}
              onClick={joinLocked ? undefined : () => { setDrawerOpen(false); setJoining(true); }}
              data-testid="mobile-join-workspace"
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", marginTop: 10,
                minHeight: 40, padding: "0 10px", borderRadius: 8, border: `1px solid ${BORDER}`,
                background: joinLocked ? "#F8FAFC" : "#FFFFFF", color: joinLocked ? "#94A3B8" : "#0F172A", ...GF, fontSize: 13, fontWeight: 500,
                cursor: joinLocked ? "not-allowed" : "pointer",
              }}>
              {joinLocked
                ? <Lock size={15} aria-hidden style={{ color: "#B45309", flexShrink: 0 }} />
                : <LogIn size={15} aria-hidden style={{ color: "#0078D4", flexShrink: 0 }} />}
              <span style={{ flex: 1, textAlign: "left" }}>Join another workspace</span>
              {joinLocked && (
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#92400E", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 999, padding: "1px 8px" }}>
                  Personal
                </span>
              )}
            </button>
          </div>
        )}

        {/* Primary nav */}
        <nav aria-label="Platform sections" data-guide="platform-sidebar-nav" style={{ flex: 1, padding: "10px 10px", overflowY: "auto" }}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            {[...PRIMARY_NAV, ...ACCOUNT_NAV].map((item) => {
              const allowed = nav.allows(item);
              const enabled = !item.featureFlag || hasFlag(item.featureFlag);
              if (inBottomBar(item.id)) return null;
              if (!allowed || !enabled || (item.plan !== undefined && !planAllows(item.plan))) return null;
              return (
                <li key={item.id}>
                  <NavLink
                    to={item.path}
                    onClick={closeAndNavigate}
                    style={({ isActive }) => ({
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 12px", borderRadius: 8, minHeight: 48,
                      textDecoration: "none",
                      background: isActive ? "rgba(0,120,212,0.12)" : "transparent",
                      border: isActive ? "1px solid rgba(0,120,212,0.22)" : "1px solid transparent",
                      color: isActive ? "#005A9E" : "#334155",
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        <span style={{ color: isActive ? "#005A9E" : "#475569", display: "flex" }}><NavIcon name={item.icon} size={20} /></span>
                        <span style={{ ...GF, fontSize: 15, fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
                        {item.id === "inbox" && unreadCount > 0 && (
                          <span style={{ marginLeft: "auto", background: "#0078D4", color: "white", fontFamily: "'Geist Mono', monospace", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "1px 6px" }}>
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                        {item.id === "invitations" && <InvitationCountBubble key={pendingInvitations} count={pendingInvitations} />}
                        {item.id === "contacts" && <NavCountBubble key={navCounts.contacts} kind="contacts" count={navCounts.contacts} />}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>

          <div style={{ borderTop: `1px solid ${BORDER}`, margin: "8px 0" }} />
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            {UTILITY_NAV.map((item) => {
              const allowed = nav.allows(item);
              const enabled = !item.featureFlag || hasFlag(item.featureFlag);
              if (!allowed || !enabled || (item.plan !== undefined && !planAllows(item.plan))) return null;
              return (
                <li key={item.id}>
                  <NavLink to={item.path} onClick={closeAndNavigate} style={({ isActive }) => ({ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, textDecoration: "none", color: isActive ? "#0078D4" : "#64748B" })}>
                    {({ isActive }) => (
                      <>
                        <span style={{ color: isActive ? "#0078D4" : "#64748B", display: "flex" }}><NavIcon name={item.icon} /></span>
                        <span style={{ ...GF, fontSize: 14, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
                        {item.id === "notifications" && unreadCount > 0 && (
                          <span style={{ marginLeft: "auto", background: "#0078D4", color: "white", fontFamily: "'Geist Mono', monospace", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "1px 6px" }}>
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                        {item.id === "manage" && <NavCountBubble key={navCounts.workspace} kind="workspace" count={navCounts.workspace} />}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
            <li>
              <NavLink to={navCounts.settings > 0 ? "/app/settings/plan" : "/app/settings/profile"} onClick={closeAndNavigate} style={({ isActive }) => ({ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, textDecoration: "none", color: isActive ? "#0078D4" : "#64748B" })}>
                {({ isActive }) => (
                  <>
                    <span style={{ color: isActive ? "#0078D4" : "#64748B", display: "flex" }}><NavIcon name="UserCog" /></span>
                    <span style={{ ...GF, fontSize: 14, fontWeight: isActive ? 600 : 400 }}>My Settings</span>
                    <NavCountBubble key={navCounts.settings} kind="settings" count={navCounts.settings} />
                  </>
                )}
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Tools & help — secondary to the section links above, so it sits
            at the bottom, collapsed until asked for. The items stay mounted
            (the tour targets them by data-guide) but are inert while shut. */}
        <div className="mnav-tools" style={{ borderTop: `1px solid ${BORDER}`, padding: "6px 10px", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setToolsOpen(o => !o)}
            aria-expanded={toolsOpen}
            aria-controls="mobile-nav-tools"
            className="mnav-tools-toggle"
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              width: "100%", minHeight: 44, padding: "10px 12px", borderRadius: 8,
              background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
              color: "#334155", ...GF, fontSize: 13, fontWeight: 600,
            }}
          >
            <span>Tools &amp; help</span>
            <ChevronDown size={16} aria-hidden className="mnav-tools-chevron"
              style={{ transform: toolsOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
          </button>
          <div
            id="mobile-nav-tools"
            className="mnav-tools-panel"
            data-open={toolsOpen ? "true" : "false"}
            {...({ inert: toolsOpen ? undefined : "" } as { inert?: string })}
            aria-hidden={toolsOpen ? undefined : true}
            style={{ display: "grid", gridTemplateRows: toolsOpen ? "1fr" : "0fr", visibility: toolsOpen ? "visible" : "hidden" }}
          >
            <div style={{ overflow: "hidden", minHeight: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button
                  onClick={openSearch}
                  data-guide="mobile-search-trigger"
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", borderRadius: 8, minHeight: 44,
                    background: "transparent", border: "none", width: "100%",
                    color: "#475569", cursor: "pointer", textAlign: "left",
                  }}
                >
                  <Search size={18} aria-hidden />
                  <span style={{ ...GF, fontSize: 14 }}>Search</span>
                </button>
                <button
                  onClick={handleRestartTour}
                  data-guide="mobile-restart-tour-trigger"
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", borderRadius: 8, minHeight: 44,
                    background: "transparent", border: "none", width: "100%",
                    color: "#475569", cursor: "pointer", textAlign: "left",
                  }}
                >
                  <Compass size={18} aria-hidden />
                  <span style={{ ...GF, fontSize: 14 }}>Restart Tour</span>
                </button>
                <Link
                  to="/help"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Help Center (opens in new tab)"
                  data-guide="mobile-help-link"
                  onClick={closeAndNavigate}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", borderRadius: 8, minHeight: 44,
                    color: "#475569", textDecoration: "none",
                  }}
                >
                  <HelpCircle size={18} aria-hidden />
                  <span style={{ ...GF, fontSize: 14 }}>Help Center</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* User footer */}
        {user && (
          <div style={{ borderTop: `1px solid ${BORDER}`, padding: "12px 14px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <UserAvatar user={user} size={32} fontSize={11} />
              <div>
                <p style={{ color: "#07111F", ...GF, fontSize: 13, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{user.displayName}</span>
                  {identityVerified && (
                    <span
                      data-testid="mobile-nav-verified-badge" title="Your identity is verified"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 7px", borderRadius: 999,
                        fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap",
                        color: "#166534", background: "#DCFCE7", border: "1px solid #BBF7D0",
                      }}
                    >
                      <BadgeCheck size={11} aria-hidden />Verified
                    </span>
                  )}
                </p>
                <p style={{ color: "#64748B", ...GM, fontSize: 10, margin: 0 }}>{user.email}</p>
            {(user.jobTitle || user.department) && (
              <p style={{ color: "#64748B", fontFamily: "'Geist', sans-serif", fontSize: 11, margin: "3px 0 0" }}>
                {[user.jobTitle, user.department].filter(Boolean).join(" · ")}
              </p>
            )}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              style={{ width: "100%", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: "#ef4444", ...GF, fontSize: 13, fontWeight: 600, padding: "9px 14px", minHeight: 44, cursor: "pointer" }}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {searchOpen && (
        <Suspense fallback={null}>
          <CommandPalette open={searchOpen} onClose={closeSearch} />
        </Suspense>
      )}

      <style>{`
        .mobile-nav-btn:hover, .mobile-nav-btn:focus-visible { color: #0078D4 !important; background: #EAF6FF !important; }
        .mobile-nav-btn:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
        .mnav-bottom-link:focus-visible, .mnav-bottom-prepare:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
        .mnav-bottom-pill { transition: left 360ms cubic-bezier(0.34, 1.4, 0.64, 1), opacity 180ms ease, transform 220ms ease; }
        .mnav-bottom-link { transition: color 220ms ease 80ms, transform 300ms cubic-bezier(0.34, 1.4, 0.64, 1); }
        .mnav-bottom-prepare { transition: border-radius 300ms ease, background-color 300ms ease, transform 300ms cubic-bezier(0.34, 1.4, 0.64, 1); }
        ${INVITATION_BUBBLE_STYLES}
        .mnav-tools-panel { transition: grid-template-rows 180ms ease, visibility 0s 180ms; }
        .mnav-tools-panel[data-open="true"] { transition: grid-template-rows 180ms ease, visibility 0s; }
        .mnav-tools-chevron { transition: transform 180ms ease; flex-shrink: 0; }
        .mnav-tools-toggle:hover { background: #F1F5F9 !important; }
        .mnav-tools-toggle:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
          #mobile-nav-drawer { transition: none !important; }
          .mnav-bottom-pill, .mnav-bottom-link, .mnav-bottom-prepare { transition: none !important; }
          .mnav-tools-panel, .mnav-tools-panel[data-open="true"], .mnav-tools-chevron { transition: none !important; }
        }
      `}</style>
      {confirmDialog}
      {joining && <JoinWorkspaceDialog onClose={() => { setJoining(false); triggerRef.current?.focus(); }} />}
    </>
  );
}

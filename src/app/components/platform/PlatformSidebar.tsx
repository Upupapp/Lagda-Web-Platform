// Desktop sidebar for the authenticated LAGDA customer platform.
// Collapses to icon-only mode via a toggle button.
// Hidden on mobile — MobileNav handles that breakpoint.

import { useState, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard, FileText, Files, Users, ShieldCheck,
  Bell, Users2, Settings, FilePlus, ChevronLeft, ChevronRight,
  HelpCircle, Inbox,
  GitBranch,
  BarChart2,
  Zap,
} from "lucide-react";
import { LagdaLogo } from "../brand/LagdaLogo";
import lagdaLogoFull from "../../../brand elements/svg/LagdaLogoPrimaryHorizontalFullColor.svg";
import lagdaLogoSmall from "../../../brand elements/svg/LagdaLogoPrimaryHorizontalFullColor_Header_small.svg";
import { usePlatform } from "../../context/PlatformContext";
import { useNotificationCenter } from "../../context/NotificationCenterContext";
import { PRIMARY_NAV, UTILITY_NAV, PREPARE_ACTION } from "../../config/platform.nav";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { UserMenu } from "./UserMenu";
import { Z } from "../../utils/z-index";

const BORDER = "rgba(0,0,0,0.08)";
const GF     = { fontFamily: "'Geist', sans-serif" };
const GM     = { fontFamily: "'Geist Mono', monospace" };

// Keyed by the `icon` string on each nav item. A name missing here renders a
// blank space rather than failing, which is why `nav-icons.test.ts` asserts
// every navigation item resolves in BOTH this map and MobileNav's.
const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, FileText, Files, Users, ShieldCheck,
  Bell, Users2, Settings, FilePlus, HelpCircle, Inbox, GitBranch,
  BarChart2, Zap,
};

function NavIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Comp = ICON_MAP[name];
  if (!Comp) return <span style={{ width: size, height: size, display: "inline-block" }} />;
  return <Comp size={size} aria-hidden />;
}

interface SidebarItemProps {
  to: string;
  icon: string;
  label: string;
  badge?: number | null;
  collapsed: boolean;
}

function SidebarItem({ to, icon, label, badge, collapsed }: SidebarItemProps) {
  return (
    <li>
      <NavLink
        to={to}
        aria-label={collapsed ? label : undefined}
        title={collapsed ? label : undefined}
        style={({ isActive }) => ({
          display: "flex",
          alignItems: "center",
          gap: collapsed ? 0 : 10,
          padding: collapsed ? "9px 0" : "8px 10px",
          justifyContent: collapsed ? "center" : "flex-start",
          borderRadius: 8,
          textDecoration: "none",
          background: isActive ? "rgba(0,120,212,0.14)" : "transparent",
          border: isActive ? "1px solid rgba(0,120,212,0.22)" : "1px solid transparent",
          color: isActive ? "#0078D4" : "#64748B",
          transition: "background 0.12s, color 0.12s",
          position: "relative",
          minHeight: 36,
        })}
        aria-current={undefined}  // set below via style callback
      >
        {({ isActive }) => (
          <>
            <span aria-hidden style={{ flexShrink: 0, color: isActive ? "#0078D4" : "#64748B", display: "flex", alignItems: "center" }}>
              <NavIcon name={icon} />
            </span>
            {!collapsed && (
              <span style={{ ...GF, fontSize: 13, fontWeight: isActive ? 600 : 400, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {label}
              </span>
            )}
            {!collapsed && badge != null && badge > 0 && (
              <span style={{ ...GM, fontSize: 10, fontWeight: 700, background: "rgba(0,120,212,0.15)", color: "#0078D4", borderRadius: 999, padding: "1px 6px", marginLeft: "auto", flexShrink: 0 }}>
                {badge > 99 ? "99+" : badge}
              </span>
            )}
            {collapsed && badge != null && badge > 0 && (
              <span style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: "50%", background: "#0078D4", border: "2px solid #ffffff" }} aria-hidden />
            )}
          </>
        )}
      </NavLink>
    </li>
  );
}

export function PlatformSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { hasPermission, hasFlag, signOut } = usePlatform();
  const { unreadCount } = useNotificationCenter();
  const navigate = useNavigate();
  // The dashboard route gets its own brand-mark asset; every other platform
  // page keeps the standard LagdaLogo component.
  const isDashboard = useLocation().pathname === "/app/dashboard";

  const handleSignOut = useCallback(async () => {
    signOut();
    navigate("/sign-in");
  }, [signOut, navigate]);

  const sidebarWidth = collapsed ? 60 : 240;

  const canPrepare = hasPermission("prepare_documents") && hasFlag("prepareFlowEnabled");

  return (
    <aside
      aria-label="Platform navigation"
      style={{
        width: sidebarWidth,
        flexShrink: 0,
        background: "#ffffff",
        borderRight: `1px solid ${BORDER}`,
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        zIndex: Z.shell,
        transition: "width 0.2s ease",
      }}
      className="platform-sidebar"
    >
      {/* ── Logo + collapse toggle ─────────────────────────────────── */}
      <div style={{
        padding: collapsed ? "20px 8px 16px" : "20px 18px 16px",
        borderBottom: `1px solid ${BORDER}`,
        display: "flex",
        alignItems: "center",
        flexDirection: collapsed ? "column" : "row",
        justifyContent: collapsed ? "center" : "space-between",
        gap: collapsed ? 12 : 8,
        flexShrink: 0,
      }}>
        {!collapsed ? (
          <NavLink to="/app/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", minWidth: 0 }} aria-label="LAGDA — Go to Dashboard">
            {isDashboard ? (
              <img src={lagdaLogoFull} alt="LAGDA" style={{ display: "block", width: 156, maxWidth: "100%", height: "auto", objectFit: "contain", objectPosition: "left center" }} />
            ) : (
              <LagdaLogo variant="colored-horizontal" size="sm" decorative />
            )}
          </NavLink>
        ) : (
          <NavLink to="/app/dashboard" style={{ textDecoration: "none", display: "flex", justifyContent: "center" }} aria-label="LAGDA — Go to Dashboard">
            {isDashboard ? (
              <img src={lagdaLogoSmall} alt="LAGDA" style={{ display: "block", width: 34, height: "auto", objectFit: "contain" }} />
            ) : (
              <LagdaLogo variant="colored-icon" size="xs" decorative />
            )}
          </NavLink>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            background: "#F1F5F9",
            border: `1px solid ${BORDER}`,
            borderRadius: 7,
            color: "#64748B",
            width: 26,
            height: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            padding: 0,
            transition: "color 0.12s, background 0.12s",
          }}
          className="sidebar-collapse-btn"
        >
          {collapsed ? <ChevronRight size={14} aria-hidden /> : <ChevronLeft size={14} aria-hidden />}
        </button>
      </div>

      {/* ── Workspace switcher ─────────────────────────────────────── */}
      <div style={{ padding: collapsed ? "12px 8px" : "12px 14px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      {/* ── Prepare Document CTA ───────────────────────────────────── */}
      <div style={{ padding: collapsed ? "12px 8px 4px" : "14px 14px 4px", flexShrink: 0 }}>
        {canPrepare ? (
          <NavLink
            to={PREPARE_ACTION.path}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: collapsed ? 0 : 8,
              background: "#07111F",
              color: "white",
              borderRadius: 8,
              padding: collapsed ? "9px 0" : "9px 12px",
              textDecoration: "none",
              ...GF,
              fontSize: 13,
              fontWeight: 600,
              minHeight: 38,
              transition: "background 0.12s",
            }}
            aria-label={collapsed ? "Prepare Document" : undefined}
            title={collapsed ? "Prepare Document" : undefined}
            className="prepare-cta"
          >
            <FilePlus size={16} aria-hidden />
            {!collapsed && <span>Prepare Document</span>}
          </NavLink>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: collapsed ? 0 : 8,
              background: "#F1F5F9",
              color: "#94A3B8",
              borderRadius: 8,
              padding: collapsed ? "9px 0" : "9px 12px",
              cursor: "not-allowed",
              fontSize: 13,
              fontWeight: 600,
              minHeight: 38,
              ...GF,
            }}
            title="You don't have permission to prepare documents"
            aria-label="Prepare Document — not available with your current role"
          >
            <FilePlus size={16} aria-hidden />
            {!collapsed && <span>Prepare Document</span>}
          </div>
        )}
      </div>

      {/* ── Primary nav ───────────────────────────────────────────── */}
      <nav aria-label="Platform sections" data-guide="platform-sidebar-nav" style={{ flex: 1, padding: collapsed ? "10px 8px" : "10px 14px", overflowY: "auto" }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {PRIMARY_NAV.map((item) => {
            const allowed = !item.permission || hasPermission(item.permission);
            const enabled = !item.featureFlag || hasFlag(item.featureFlag);
            if (!allowed || !enabled) return null;
            const badge = item.showBadge && item.id === "inbox" ? unreadCount : null;
            return (
              <SidebarItem
                key={item.id}
                to={item.path}
                icon={item.icon}
                label={item.label}
                badge={badge}
                collapsed={collapsed}
              />
            );
          })}
        </ul>

        {/* Utility nav */}
        {!collapsed && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
            <p style={{ ...GM, fontSize: 9, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.08em", padding: "0 10px 4px" }}>
              WORKSPACE
            </p>
          </div>
        )}
        {collapsed && <div style={{ height: 8 }} />}
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {UTILITY_NAV.map((item) => {
            const allowed = !item.permission || hasPermission(item.permission);
            const enabled = !item.featureFlag || hasFlag(item.featureFlag);
            if (!allowed || !enabled) return null;
            const badge = item.showBadge && item.id === "notifications" ? unreadCount : null;
            return (
              <SidebarItem
                key={item.id}
                to={item.path}
                icon={item.icon}
                label={item.label}
                badge={badge}
                collapsed={collapsed}
              />
            );
          })}
          {/* Settings */}
          <SidebarItem
            to="/app/settings/profile"
            icon="Settings"
            label="Settings"
            badge={null}
            collapsed={collapsed}
          />
        </ul>
      </nav>

      {/* ── User footer ───────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <UserMenu collapsed={collapsed} onSignOut={handleSignOut} />
      </div>

      <style>{`
        .platform-sidebar::-webkit-scrollbar { width: 4px; }
        .platform-sidebar::-webkit-scrollbar-track { background: transparent; }
        .platform-sidebar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 4px; }
        .platform-sidebar a:focus-visible,
        .platform-sidebar button:focus-visible,
        .sidebar-collapse-btn:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; border-radius: 6px; }
        .prepare-cta:hover { background: #0B2344 !important; }
        @media (prefers-reduced-motion: reduce) {
          .platform-sidebar, .platform-sidebar * { transition: none !important; }
        }
      `}</style>
    </aside>
  );
}

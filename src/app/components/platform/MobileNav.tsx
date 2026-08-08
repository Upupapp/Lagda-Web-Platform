// Mobile navigation — top bar + slide-in drawer.
// Replaces the sidebar at <768px.
// Focus-trapped while open. Escape closes. Scroll locked.

import { useState, useRef, useEffect, useCallback } from "react";
import { NavLink, useNavigate } from "react-router";
import {
  Menu, X, LayoutDashboard, FileText, Files, Users, ShieldCheck,
  Bell, Users2, Settings, FilePlus,
} from "lucide-react";
import { LagdaLogo } from "../brand/LagdaLogo";
import { usePlatform } from "../../context/PlatformContext";
import { PRIMARY_NAV, UTILITY_NAV, PREPARE_ACTION } from "../../config/platform.nav";
import { NotificationMenu } from "./NotificationMenu";
import { Z } from "../../utils/z-index";

const NAVY   = "#07111F";
const BORDER = "rgba(255,255,255,0.07)";
const GF     = { fontFamily: "'Geist', sans-serif" };
const GM     = { fontFamily: "'Geist Mono', monospace" };

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, FileText, Files, Users, ShieldCheck, Bell, Users2, Settings, FilePlus,
};
function NavIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Comp = ICON_MAP[name];
  if (!Comp) return null;
  return <Comp size={size} aria-hidden />;
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  const first = parts[0] ?? "", last = parts[parts.length - 1] ?? "";
  if (parts.length >= 2) return (first.charAt(0) + last.charAt(0)).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function MobileNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, currentWorkspace, unreadCount, hasPermission, hasFlag, signOut } = usePlatform();
  const drawerRef    = useRef<HTMLDivElement>(null);
  const triggerRef   = useRef<HTMLButtonElement>(null);
  const navigate     = useNavigate();

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

  const handleSignOut = useCallback(() => {
    setDrawerOpen(false);
    signOut();
    navigate("/sign-in");
  }, [signOut, navigate]);

  const canPrepare = hasPermission("prepare_documents") && hasFlag("prepareFlowEnabled");
  const userInitials = user ? getInitials(user.displayName) : "?";

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: Z.shell,
          height: 56, background: NAVY,
          borderBottom: `1px solid ${BORDER}`,
          display: "flex", alignItems: "center", gap: 0,
          paddingLeft: 4, paddingRight: 8,
        }}
        aria-label="Mobile navigation bar"
      >
        {/* Hamburger */}
        <button
          ref={triggerRef}
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          aria-controls="mobile-nav-drawer"
          style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "#64748b", cursor: "pointer", borderRadius: 8, flexShrink: 0 }}
          className="mobile-nav-btn"
        >
          <Menu size={20} aria-hidden />
        </button>

        {/* Logo */}
        <NavLink to="/app/dashboard" style={{ display: "flex", alignItems: "center", textDecoration: "none", flex: 1, paddingLeft: 4 }} aria-label="LAGDA — Dashboard">
          <LagdaLogo variant="white-horizontal" size="xs" decorative />
        </NavLink>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <NotificationMenu align="right" />
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(0,120,212,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Geist Mono', monospace", fontSize: 10, color: "#38bdf8", fontWeight: 700,
          }}>
            {userInitials}
          </div>
        </div>
      </header>

      {/* ── Backdrop ────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          onClick={() => { setDrawerOpen(false); triggerRef.current?.focus(); }}
          aria-hidden
          style={{ position: "fixed", inset: 0, zIndex: Z.drawerScrim, background: "rgba(0,0,0,0.5)" }}
        />
      )}

      {/* ── Drawer ──────────────────────────────────────────────── */}
      <div
        id="mobile-nav-drawer"
        ref={drawerRef}
        role="dialog"
        aria-label="Navigation"
        aria-modal
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0, zIndex: Z.drawer,
          width: 280,
          background: NAVY,
          borderRight: `1px solid ${BORDER}`,
          display: "flex", flexDirection: "column",
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.22s ease",
          overflowY: "auto",
        }}
      >
        {/* Drawer header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <LagdaLogo variant="white-horizontal" size="sm" decorative />
          <button
            onClick={() => { setDrawerOpen(false); triggerRef.current?.focus(); }}
            aria-label="Close navigation"
            style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, color: "#64748b", cursor: "pointer" }}
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        {/* Workspace */}
        {currentWorkspace && (
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: currentWorkspace.accentColor, display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 10, color: "white", fontWeight: 700 }}>
                {currentWorkspace.initials}
              </div>
              <div>
                <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 600, margin: 0 }}>{currentWorkspace.name}</p>
                <p style={{ color: "#475569", ...GM, fontSize: 10, margin: 0 }}>{currentWorkspace.plan}</p>
              </div>
            </div>
          </div>
        )}

        {/* Prepare CTA */}
        {canPrepare && (
          <div style={{ padding: "12px 12px 0", flexShrink: 0 }}>
            <NavLink
              to={PREPARE_ACTION.path}
              onClick={closeAndNavigate}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "#0078D4", color: "white", borderRadius: 8, padding: "10px 14px", textDecoration: "none", ...GF, fontSize: 14, fontWeight: 600 }}
            >
              <FilePlus size={16} aria-hidden />
              Prepare Document
            </NavLink>
          </div>
        )}

        {/* Primary nav */}
        <nav aria-label="Platform sections" style={{ flex: 1, padding: "10px 10px", overflowY: "auto" }}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            {PRIMARY_NAV.map((item) => {
              const allowed = !item.permission || hasPermission(item.permission);
              const enabled = !item.featureFlag || hasFlag(item.featureFlag);
              if (!allowed || !enabled) return null;
              return (
                <li key={item.id}>
                  <NavLink
                    to={item.path}
                    onClick={closeAndNavigate}
                    style={({ isActive }) => ({
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 12px", borderRadius: 8, minHeight: 44,
                      textDecoration: "none",
                      background: isActive ? "rgba(0,120,212,0.14)" : "transparent",
                      border: isActive ? "1px solid rgba(0,120,212,0.22)" : "1px solid transparent",
                      color: isActive ? "#38bdf8" : "#64748b",
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        <span style={{ color: isActive ? "#38bdf8" : "#64748b", display: "flex" }}><NavIcon name={item.icon} /></span>
                        <span style={{ ...GF, fontSize: 14, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
                        {item.id === "inbox" && unreadCount > 0 && (
                          <span style={{ marginLeft: "auto", background: "#0078D4", color: "white", fontFamily: "'Geist Mono', monospace", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "1px 6px" }}>
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
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
              const allowed = !item.permission || hasPermission(item.permission);
              const enabled = !item.featureFlag || hasFlag(item.featureFlag);
              if (!allowed || !enabled) return null;
              return (
                <li key={item.id}>
                  <NavLink to={item.path} onClick={closeAndNavigate} style={({ isActive }) => ({ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, textDecoration: "none", color: isActive ? "#38bdf8" : "#64748b" })}>
                    {({ isActive }) => (
                      <>
                        <span style={{ color: isActive ? "#38bdf8" : "#64748b", display: "flex" }}><NavIcon name={item.icon} /></span>
                        <span style={{ ...GF, fontSize: 14, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
                        {item.id === "notifications" && unreadCount > 0 && (
                          <span style={{ marginLeft: "auto", background: "#0078D4", color: "white", fontFamily: "'Geist Mono', monospace", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "1px 6px" }}>
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
            <li>
              <NavLink to="/app/settings/profile" onClick={closeAndNavigate} style={({ isActive }) => ({ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, textDecoration: "none", color: isActive ? "#38bdf8" : "#64748b" })}>
                {({ isActive }) => (
                  <>
                    <span style={{ color: isActive ? "#38bdf8" : "#64748b", display: "flex" }}><NavIcon name="Settings" /></span>
                    <span style={{ ...GF, fontSize: 14, fontWeight: isActive ? 600 : 400 }}>Settings</span>
                  </>
                )}
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* User footer */}
        {user && (
          <div style={{ borderTop: `1px solid ${BORDER}`, padding: "12px 14px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,120,212,0.2)", display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 11, color: "#38bdf8", fontWeight: 700 }}>
                {userInitials}
              </div>
              <div>
                <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 600, margin: 0 }}>{user.displayName}</p>
                <p style={{ color: "#475569", ...GM, fontSize: 10, margin: 0 }}>{user.email}</p>
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

      <style>{`
        .mobile-nav-btn:hover, .mobile-nav-btn:focus-visible { color: white !important; background: rgba(255,255,255,0.06) !important; }
        .mobile-nav-btn:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
          #mobile-nav-drawer { transition: none !important; }
        }
      `}</style>
    </>
  );
}

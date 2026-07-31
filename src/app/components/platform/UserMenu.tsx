// User account menu — displays user info and navigation to profile, settings, sign out.

import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { CircleUser, Lock, CreditCard, HelpCircle, LogOut, ChevronUp, Settings } from "lucide-react";
import { usePlatform } from "../../context/PlatformContext";
import { PLATFORM_ROLE_LABELS } from "../../models";

const GF   = { fontFamily: "'Geist', sans-serif" };
const GM   = { fontFamily: "'Geist Mono', monospace" };
const BORDER = "rgba(255,255,255,0.07)";

interface UserMenuProps {
  collapsed: boolean;
  onSignOut: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  const first = parts[0] ?? "", last = parts[parts.length - 1] ?? "";
  if (parts.length >= 2) return (first.charAt(0) + last.charAt(0)).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function UserMenu({ collapsed, onSignOut }: UserMenuProps) {
  const { user, role } = usePlatform();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleSignOut = useCallback(() => {
    setOpen(false);
    onSignOut();
  }, [onSignOut]);

  if (!user) return null;
  const initials  = getInitials(user.displayName);
  const roleLabel = role ? PLATFORM_ROLE_LABELS[role] : "";

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-label={`Account menu for ${user.displayName}`}
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          display: "flex", alignItems: "center",
          gap: collapsed ? 0 : 10,
          justifyContent: collapsed ? "center" : "flex-start",
          width: "100%", padding: collapsed ? "12px 0" : "12px 14px",
          background: "transparent", border: "none", cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "rgba(0,120,212,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          ...GM, fontSize: 11, color: "#38bdf8", fontWeight: 700, flexShrink: 0,
        }}>
          {initials}
        </div>
        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.displayName}
              </p>
              <p style={{ color: "#475569", ...GM, fontSize: 9, margin: 0 }}>{roleLabel}</p>
            </div>
            <ChevronUp size={12} style={{ color: "#475569", flexShrink: 0, transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} aria-hidden />
          </>
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Account menu"
          style={{
            position: "absolute",
            bottom: "calc(100% + 4px)",
            left: collapsed ? 44 : 8,
            right: collapsed ? "auto" : 8,
            minWidth: collapsed ? 220 : undefined,
            zIndex: 200,
            background: "#0B1929",
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {/* User info header */}
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 600, margin: "0 0 2px" }}>{user.displayName}</p>
            <p style={{ color: "#475569", ...GM, fontSize: 10, margin: 0 }}>{user.email}</p>
          </div>

          {/* Menu items */}
          <div style={{ padding: "6px 6px" }}>
            <MenuItem to="/app/settings/profile" icon={<CircleUser size={14} aria-hidden />} label="Profile" onClose={() => setOpen(false)} />
            <MenuItem to="/app/settings/security" icon={<Lock size={14} aria-hidden />} label="Security" onClose={() => setOpen(false)} />
            <MenuItem to="/app/settings/billing" icon={<CreditCard size={14} aria-hidden />} label="Billing & Usage" onClose={() => setOpen(false)} />
            <MenuItem to="/app/settings/profile" icon={<Settings size={14} aria-hidden />} label="Workspace Settings" onClose={() => setOpen(false)} />

            <div style={{ borderTop: `1px solid ${BORDER}`, margin: "4px 0" }} />

            <MenuItem to="/help" icon={<HelpCircle size={14} aria-hidden />} label="Help Center" onClose={() => setOpen(false)} external />

            <div style={{ borderTop: `1px solid ${BORDER}`, margin: "4px 0" }} />

            {/* Sign Out */}
            <button
              role="menuitem"
              onClick={handleSignOut}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", border: "none", background: "transparent",
                borderRadius: 7, padding: "8px 10px", cursor: "pointer",
                color: "#ef4444", ...GF, fontSize: 13, textAlign: "left",
              }}
            >
              <LogOut size={14} aria-hidden />
              <span>Sign Out</span>
            </button>

            <div style={{ padding: "6px 10px 2px" }}>
              <p style={{ color: "#1E293B", ...GM, fontSize: 9 }}>
                FRONTEND DEMONSTRATION — Signing out clears the in-memory session only.
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .user-menu-item:hover { background: rgba(255,255,255,0.04) !important; }
      `}</style>
    </div>
  );
}

function MenuItem({ to, icon, label, onClose, external }: {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClose: () => void;
  external?: boolean;
}) {
  const GF = { fontFamily: "'Geist', sans-serif" };
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onClose}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 10px", borderRadius: 7, textDecoration: "none",
        color: "#94a3b8", ...GF, fontSize: 13,
      }}
      className="user-menu-item"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

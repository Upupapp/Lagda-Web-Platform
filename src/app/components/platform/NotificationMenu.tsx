// Notification bell with dropdown panel.
// Displays recent mock notifications and unread count badge.

import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { Bell, Check, CheckCheck, FileText, AlertTriangle, Clock, UserPlus, Building2 } from "lucide-react";
import { usePlatform } from "../../context/PlatformContext";
import type { NotificationType } from "../../models";

const GF   = { fontFamily: "'Geist', sans-serif" };
const BORDER = "rgba(255,255,255,0.07)";

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "signature-completed":
    case "document-completed": return <Check size={14} style={{ color: "#22c55e" }} aria-hidden />;
    case "document-declined":  return <AlertTriangle size={14} style={{ color: "#ef4444" }} aria-hidden />;
    case "document-expiring":
    case "document-expired":   return <Clock size={14} style={{ color: "#f59e0b" }} aria-hidden />;
    case "team-invitation":    return <UserPlus size={14} style={{ color: "#0078D4" }} aria-hidden />;
    case "workspace-update":   return <Building2 size={14} style={{ color: "#64748b" }} aria-hidden />;
    default:                   return <FileText size={14} style={{ color: "#64748b" }} aria-hidden />;
  }
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

interface NotificationMenuProps {
  /** Where to anchor the dropdown — used in mobile top bar vs. header */
  align?: "right" | "left";
}

export function NotificationMenu({ align = "right" }: NotificationMenuProps) {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = usePlatform();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
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

  const recent = notifications.slice(0, 5);

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        style={{
          position: "relative",
          background: "transparent", border: "none",
          cursor: "pointer", color: "#64748b",
          width: 36, height: 36, display: "flex",
          alignItems: "center", justifyContent: "center",
          borderRadius: 8, padding: 0,
        }}
        className="notif-trigger"
      >
        <Bell size={18} aria-hidden />
        {unreadCount > 0 && (
          <span
            aria-hidden
            style={{
              position: "absolute", top: 4, right: 4,
              background: "#0078D4", color: "white",
              borderRadius: "50%", width: 16, height: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Geist Mono', monospace", fontSize: 9, fontWeight: 700,
              border: "2px solid #07111F",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          aria-modal
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            [align]: 0,
            width: 360,
            maxWidth: "calc(100vw - 16px)",
            zIndex: 300,
            background: "#0B1929",
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: `1px solid ${BORDER}` }}>
            <h2 style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: 0 }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{ marginLeft: 8, fontFamily: "'Geist Mono', monospace", fontSize: 10, color: "#0078D4", background: "rgba(0,120,212,0.15)", borderRadius: 999, padding: "1px 7px" }}>
                  {unreadCount}
                </span>
              )}
            </h2>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllNotificationsRead()}
                style={{ background: "none", border: "none", color: "#38bdf8", ...GF, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                aria-label="Mark all notifications as read"
              >
                <CheckCheck size={13} aria-hidden />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <ul style={{ listStyle: "none", margin: 0, padding: "6px 0", maxHeight: 320, overflowY: "auto" }} role="list">
            {recent.length === 0 ? (
              <li style={{ padding: "24px 14px", textAlign: "center", color: "#334155", ...GF, fontSize: 13 }}>
                No notifications yet.
              </li>
            ) : (
              recent.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      markNotificationRead(n.id);
                      setOpen(false);
                    }}
                    style={{
                      display: "flex", gap: 10, padding: "10px 14px",
                      background: n.isRead ? "transparent" : "rgba(0,120,212,0.06)",
                      border: "none", width: "100%", textAlign: "left",
                      cursor: "pointer", borderBottom: `1px solid ${BORDER}`,
                    }}
                    className="notif-item"
                  >
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {getNotificationIcon(n.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: n.isRead ? "#64748b" : "white", ...GF, fontSize: 12, fontWeight: n.isRead ? 400 : 600, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {n.title}
                      </p>
                      <p style={{ color: "#475569", ...GF, fontSize: 11, margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {n.body}
                      </p>
                      <p style={{ color: "#334155", fontFamily: "'Geist Mono', monospace", fontSize: 10, margin: 0 }}>
                        {formatRelativeDate(n.createdAt)}
                      </p>
                    </div>
                    {!n.isRead && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#0078D4", flexShrink: 0, marginTop: 4 }} aria-hidden />}
                  </button>
                </li>
              ))
            )}
          </ul>

          {/* Footer */}
          <div style={{ padding: "10px 14px", borderTop: `1px solid ${BORDER}` }}>
            <Link
              to="/app/notifications"
              onClick={() => setOpen(false)}
              style={{ color: "#38bdf8", ...GF, fontSize: 12, textDecoration: "none", display: "block", textAlign: "center" }}
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}

      <style>{`
        .notif-trigger:hover, .notif-trigger:focus-visible { color: white !important; background: rgba(255,255,255,0.06) !important; }
        .notif-trigger:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
        .notif-item:hover { background: rgba(255,255,255,0.04) !important; }
        .notif-item:focus-visible { outline: 2px solid #0078D4; outline-offset: -2px; }
      `}</style>
    </div>
  );
}

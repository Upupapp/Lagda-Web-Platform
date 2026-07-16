// Notification bell with compact dropdown panel.
// Command 28: uses NotificationCenterContext for live unread count and rich fixture data.

import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import {
  Bell, CheckCheck,
  FileText, AlertTriangle, Clock, ShieldAlert, CreditCard,
  BarChart2, Puzzle, Settings, Megaphone, Inbox,
} from "lucide-react";
import { useNotificationCenter } from "../../context/NotificationCenterContext";
import type { NotificationRecord, NotificationCategory, NotificationSeverity } from "../../models/notifications";

const GF    = { fontFamily: "'Geist', sans-serif" };
const BORDER = "rgba(255,255,255,0.07)";

const AZURE = "#0078D4";
const AMBER = "#D97706";
const RED   = "#DC2626";
const GREEN = "#16A34A";
const SLATE = "#64748B";

function severityColor(severity: NotificationSeverity): string {
  switch (severity) {
    case "critical": return RED;
    case "warning":  return AMBER;
    case "success":  return GREEN;
    default:         return AZURE;
  }
}

function getCategoryIcon(category: NotificationCategory, severity: NotificationSeverity) {
  const color = severityColor(severity);
  const size  = 14;
  switch (category) {
    case "my-actions":   return <Inbox size={size} style={{ color }} aria-hidden />;
    case "documents":    return <FileText size={size} style={{ color }} aria-hidden />;
    case "workspace":    return <Settings size={size} style={{ color: SLATE }} aria-hidden />;
    case "security":     return <ShieldAlert size={size} style={{ color }} aria-hidden />;
    case "billing":      return <CreditCard size={size} style={{ color }} aria-hidden />;
    case "usage":        return <BarChart2 size={size} style={{ color }} aria-hidden />;
    case "integrations": return <Puzzle size={size} style={{ color: SLATE }} aria-hidden />;
    case "system":       return <Settings size={size} style={{ color: SLATE }} aria-hidden />;
    case "promotional":  return <Megaphone size={size} style={{ color: SLATE }} aria-hidden />;
    default:             return <FileText size={size} style={{ color: SLATE }} aria-hidden />;
  }
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 2)   return "Just now";
  if (diffMin < 60)  return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24)   return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7)   return `${diffDay}d ago`;
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

interface NotificationMenuProps {
  align?: "right" | "left";
}

export function NotificationMenu({ align = "right" }: NotificationMenuProps) {
  const { items, unreadCount, markRead, markAllRead } = useNotificationCenter();
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

  // Show 5 most recent non-dismissed notifications
  const recent = [...items]
    .filter((n) => n.status !== "dismissed")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  function handleItemClick(n: NotificationRecord) {
    if (n.status === "unread") markRead(n.id);
    setOpen(false);
  }

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
              background: AZURE, color: "white",
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
          aria-label="Recent notifications"
          aria-modal
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            [align]: 0,
            width: 380,
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
                <span style={{ marginLeft: 8, fontFamily: "'Geist Mono', monospace", fontSize: 10, color: AZURE, background: "rgba(0,120,212,0.15)", borderRadius: 999, padding: "1px 7px" }}>
                  {unreadCount}
                </span>
              )}
            </h2>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                style={{ background: "none", border: "none", color: "#38bdf8", ...GF, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                aria-label="Mark all notifications as read"
              >
                <CheckCheck size={13} aria-hidden />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <ul style={{ listStyle: "none", margin: 0, padding: "6px 0", maxHeight: 340, overflowY: "auto" }} role="list">
            {recent.length === 0 ? (
              <li style={{ padding: "24px 14px", textAlign: "center", color: "#475569", ...GF, fontSize: 13 }}>
                No notifications yet.
              </li>
            ) : (
              recent.map((n) => (
                <li key={n.id}>
                  <Link
                    to={`/app/notifications/${n.id}`}
                    onClick={() => handleItemClick(n)}
                    style={{
                      display: "flex", gap: 10, padding: "10px 14px",
                      background: n.status === "unread" ? "rgba(0,120,212,0.07)" : "transparent",
                      textDecoration: "none",
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                    className="notif-item-link"
                  >
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      {getCategoryIcon(n.category, n.severity)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: n.status === "unread" ? "white" : "#64748b", ...GF, fontSize: 12, fontWeight: n.status === "unread" ? 600 : 400, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {n.title}
                      </p>
                      <p style={{ color: "#475569", ...GF, fontSize: 11, margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {n.body}
                      </p>
                      <p style={{ color: "#334155", fontFamily: "'Geist Mono', monospace", fontSize: 10, margin: 0 }}>
                        {formatRelativeDate(n.createdAt)}
                      </p>
                    </div>
                    {n.status === "unread" && (
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: AZURE, flexShrink: 0, marginTop: 5 }} aria-hidden />
                    )}
                  </Link>
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
        .notif-item-link:hover { background: rgba(255,255,255,0.04) !important; }
        .notif-item-link:focus-visible { outline: 2px solid #0078D4; outline-offset: -2px; }
      `}</style>
    </div>
  );
}

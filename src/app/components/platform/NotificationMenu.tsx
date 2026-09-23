// Notification bell with compact dropdown panel.
// Command 28: uses NotificationCenterContext for live unread count and rich fixture data.

import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import {
  Bell, CheckCheck,
  FileText, ShieldAlert, CreditCard,
  BarChart2, Puzzle, Settings, Megaphone, Inbox,
} from "lucide-react";
import { useNotificationCenter } from "../../context/NotificationCenterContext";
import type { NotificationRecord, NotificationCategory, NotificationSeverity } from "../../models/notifications";
import { Z } from "../../utils/z-index";

const GF    = { fontFamily: "'Geist', sans-serif" };
const BORDER = "rgba(0,0,0,0.08)";

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
  /** Restricts the bell to one category's notifications — its own badge
   *  count, its own "recent 5" list, and its own "mark all read" (which
   *  marks only THIS category, never the whole inbox). Omitted = every
   *  category, the original header-bell behaviour. */
  category?: NotificationCategory;
  /** Panel header title. Defaults to "Notifications"; a scoped bell (e.g.
   *  the Documents sidebar row) wants something more specific. */
  heading?: string;
  /** Trigger button box size in px. Defaults to 36 (header bell); a bell
   *  inline in a sidebar row wants something smaller. */
  size?: number;
  /** Bell glyph size in px. Defaults to 18. */
  iconSize?: number;
}

export function NotificationMenu({
  align = "right", category, heading = "Notifications", size = 36, iconSize = 18,
}: NotificationMenuProps) {
  const { items, markRead, markAllRead: markAllReadGlobal } = useNotificationCenter();
  const [open, setOpen] = useState(false);

  const scoped = category === undefined ? items : items.filter((n) => n.category === category);
  const unreadCount = scoped.filter((n) => n.status === "unread").length;

  // A category-scoped bell must only mark ITS OWN notifications read — the
  // context's markAllRead has no category concept, so scoped use loops
  // markRead over exactly the unread items this bell is showing a count for.
  function handleMarkAllRead() {
    if (category === undefined) { markAllReadGlobal(); return; }
    for (const n of scoped) { if (n.status === "unread") markRead(n.id); }
  }
  const [pos, setPos] = useState<{
    top: number; right?: number; left?: number; width: number | "auto";
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);

  // The panel used to anchor via CSS `right: 0` relative to this component's
  // own (36px-wide) wrapper. On narrow phones that put the panel's right edge
  // at the BUTTON's edge rather than the viewport's edge, so a ~380px-wide
  // panel ran off the left side of the screen — the header text visibly
  // clipped ("otifications" instead of "Notifications"). Measuring the
  // trigger's real position and anchoring the panel to the viewport instead
  // keeps it fully on-screen regardless of what sits next to the bell.
  useEffect(() => {
    if (!open || !triggerRef.current) { setPos(null); return; }
    const r = triggerRef.current.getBoundingClientRect();
    const viewport = window.innerWidth;
    const GUTTER = 8;

    // Below the platform's phone breakpoint the panel spans the viewport
    // between two gutters instead of hanging off the bell. At 320px a
    // 380px-wide panel cannot be anchored anywhere without clipping, and
    // full-bleed is what the rest of the product does at this width.
    if (viewport <= 767) {
      setPos({ top: r.bottom + GUTTER, left: GUTTER, right: GUTTER, width: "auto" });
      return;
    }

    // Wider screens keep the anchored panel — but the width must be clamped
    // against the OFFSET, not against the viewport alone. `maxWidth:
    // calc(100vw - 16px)` was independent of `right`, so whenever the bell
    // was not flush with the viewport edge (the desktop header has trailing
    // help/tour buttons, putting `right` at 40-80px) the panel's own width
    // plus that offset overflowed and the left edge was cut off — the
    // "otifications" clipping this measurement exists to prevent.
    const offset = align === "left"
      ? Math.max(GUTTER, r.left)
      : Math.max(GUTTER, viewport - r.right);
    const available = viewport - offset - GUTTER;
    const width = Math.max(260, Math.min(380, available));

    setPos(align === "left"
      ? { top: r.bottom + GUTTER, left: offset, width }
      : { top: r.bottom + GUTTER, right: offset, width });
  }, [open, align]);

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

  // A resize (e.g. rotating the device) can invalidate the measured position;
  // closing rather than re-measuring keeps this simple and avoids a stray
  // resize-listener living for the lifetime of an open panel.
  useEffect(() => {
    if (!open) return;
    function handler() { setOpen(false); }
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [open]);

  // Show 5 most recent non-dismissed notifications
  const recent = [...scoped]
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
        aria-label={`${heading}${unreadCount > 0 ? ` — ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        style={{
          position: "relative",
          background: "transparent", border: "none",
          cursor: "pointer", color: "#64748B",
          width: size, height: size, display: "flex",
          alignItems: "center", justifyContent: "center",
          borderRadius: 8, padding: 0,
        }}
        className="notif-trigger"
      >
        <Bell size={iconSize} aria-hidden />
        {unreadCount > 0 && (
          <span
            aria-hidden
            style={{
              position: "absolute", top: 2, right: 2,
              background: AZURE, color: "white",
              borderRadius: "50%", width: 16, height: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Geist Mono', monospace", fontSize: 9, fontWeight: 700,
              border: "2px solid #ffffff",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && pos && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Recent notifications"
          aria-modal
          style={{
            position: "fixed",
            top: pos.top,
            // Both edges are set in the full-bleed case, which is what makes
            // `width: auto` span the viewport; otherwise exactly one is set
            // and the measured width applies.
            ...(pos.left !== undefined ? { left: pos.left } : {}),
            ...(pos.right !== undefined ? { right: pos.right } : {}),
            width: pos.width,
            // The panel must never grow past the space measured for it, and
            // it must not exceed the viewport's own height either — a long
            // list on a short phone would otherwise run off the bottom with
            // no way to reach the footer link.
            maxHeight: "calc(100vh - 72px)",
            display: "flex",
            flexDirection: "column",
            zIndex: Z.dropdown,
            background: "#ffffff",
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            boxShadow: "0 16px 48px rgba(7,17,31,0.18)",
            overflow: "hidden",
          }}
        >
          {/* Header. `flexShrink: 0` so it keeps its height when the list
              below it is the part that scrolls, and `gap` so the title and
              the action cannot touch at 320px. */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "12px 14px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <h2 style={{ color: "#07111F", ...GF, fontSize: 14, fontWeight: 700, margin: 0, minWidth: 0, whiteSpace: "nowrap" }}>
              {heading}
              {unreadCount > 0 && (
                <span style={{ marginLeft: 8, fontFamily: "'Geist Mono', monospace", fontSize: 10, color: AZURE, background: "rgba(0,120,212,0.15)", borderRadius: 999, padding: "1px 7px" }}>
                  {unreadCount}
                </span>
              )}
            </h2>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                // `flexShrink: 0` + `nowrap`: without them this wraps to two
                // lines at 320px and drags the header's height with it. The
                // LABEL is what collapses on the narrowest screens, not the
                // control — the icon alone still carries the action, and the
                // accessible name is on the button either way.
                style={{ background: "none", border: "none", color: "#0078D4", ...GF, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, flexShrink: 0, whiteSpace: "nowrap", padding: 0 }}
                aria-label="Mark all notifications as read"
              >
                <CheckCheck size={13} aria-hidden />
                <span className="notif-markall-label">Mark all read</span>
              </button>
            )}
          </div>

          {/* Notification list */}
          {/* The list is the one part that scrolls. `flex: 1` + `minHeight: 0`
              rather than a fixed 340px cap, so on a short phone it shrinks to
              whatever the panel's own max height leaves and the footer link
              below stays reachable instead of being pushed off-screen. */}
          <ul style={{ listStyle: "none", margin: 0, padding: "6px 0", flex: 1, minHeight: 0, maxHeight: 340, overflowY: "auto" }} role="list">
            {recent.length === 0 ? (
              <li style={{ padding: "24px 14px", textAlign: "center", color: "#64748B", ...GF, fontSize: 13 }}>
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
                      background: n.status === "unread" ? "#EAF6FF" : "transparent",
                      textDecoration: "none",
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                    className="notif-item-link"
                  >
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      {getCategoryIcon(n.category, n.severity)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Clamped to two lines rather than truncated to one.
                          A real title — "Signature required: Service
                          Agreement" — loses its subject entirely to a
                          single-line ellipsis at 320px, and the subject is
                          the part that makes the notification worth reading.
                          Two lines keep it while still bounding the row. */}
                      <p className="notif-title" style={{ color: n.status === "unread" ? "#07111F" : "#64748B", ...GF, fontSize: 12, fontWeight: n.status === "unread" ? 600 : 400, margin: "0 0 2px" }}>
                        {n.title}
                      </p>
                      <p className="notif-body" style={{ color: "#64748B", ...GF, fontSize: 11, margin: "0 0 3px" }}>
                        {n.body}
                      </p>
                      <p style={{ color: "#94A3B8", fontFamily: "'Geist Mono', monospace", fontSize: 10, margin: 0 }}>
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
              to={category === "documents" ? "/app/notifications?view=documents" : "/app/notifications"}
              onClick={() => setOpen(false)}
              style={{ color: "#0078D4", ...GF, fontSize: 12, textDecoration: "none", display: "block", textAlign: "center" }}
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}

      <style>{`
        .notif-trigger:hover, .notif-trigger:focus-visible { color: #0078D4 !important; background: #EAF6FF !important; }
        .notif-trigger:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
        .notif-item-link:hover { background: #F1F5F9 !important; }
        .notif-item-link:focus-visible { outline: 2px solid #0078D4; outline-offset: -2px; }

        /* Two-line clamp. \`overflow-wrap: anywhere\` is the safety net for the
           one case a clamp cannot handle on its own: a single unbroken token
           longer than the column (a URL, a long reference number) would
           otherwise widen the row and reintroduce horizontal overflow. */
        .notif-title, .notif-body {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
          overflow-wrap: anywhere;
        }

        @media (max-width: 380px) {
          /* At the narrowest widths the label goes and the icon stays: the
             button keeps its accessible name, its hit area and its meaning,
             while the header stops competing with the title for room. */
          .notif-markall-label { display: none; }
          /* Tighter gutters buy back ~12px of text column without changing
             type size — shrinking the text would cost more than it saves. */
          .notif-item-link { padding-left: 10px !important; padding-right: 10px !important; }
        }
      `}</style>
    </div>
  );
}

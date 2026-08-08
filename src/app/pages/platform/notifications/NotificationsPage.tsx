// In-App Notifications and Alerts Center — list page.
// Route: /app/notifications
// Command 28. Frontend demonstration only. No real delivery, persistence, or sync.

import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router";
import {
  Bell, Search, CheckCheck, X,
  FileText, ShieldAlert, CreditCard, BarChart2,
  Puzzle, Settings, Megaphone, Inbox, AlertCircle,
  ChevronRight, Eye, EyeOff, Trash2, RotateCcw,
} from "lucide-react";
import { useNotificationCenter } from "../../../context/NotificationCenterContext";
import type {
  NotificationRecord,
  NotificationCategory,
  NotificationView,
  NotificationSort,
  NotificationDateGroup,
} from "../../../models/notifications";
import {
  NOTIFICATION_VIEW_LABELS,
  NOTIFICATION_SORT_LABELS,
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_DATE_GROUP_LABELS,
} from "../../../models/notifications";
import { TabStrip } from "../../../components/platform/TabStrip";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const GREEN = "#16A34A";
const RED   = "#DC2626";
const AMBER = "#D97706";
const GOLD  = "#C9960C";

// ── Severity helpers ──────────────────────────────────────────────────────────
function severityColor(s: NotificationRecord["severity"]): string {
  switch (s) {
    case "critical": return RED;
    case "warning":  return AMBER;
    case "success":  return GREEN;
    default:         return AZURE;
  }
}

function severityLabel(s: NotificationRecord["severity"]): string {
  switch (s) {
    case "critical": return "Critical";
    case "warning":  return "Warning";
    case "success":  return "Resolved";
    default:         return "Info";
  }
}

function getCategoryIcon(cat: NotificationCategory, severity: NotificationRecord["severity"]) {
  const color = severityColor(severity);
  const s = 15;
  switch (cat) {
    case "my-actions":   return <Inbox size={s} style={{ color }} aria-hidden />;
    case "documents":    return <FileText size={s} style={{ color }} aria-hidden />;
    case "workspace":    return <Settings size={s} style={{ color: SLATE }} aria-hidden />;
    case "security":     return <ShieldAlert size={s} style={{ color }} aria-hidden />;
    case "billing":      return <CreditCard size={s} style={{ color }} aria-hidden />;
    case "usage":        return <BarChart2 size={s} style={{ color }} aria-hidden />;
    case "integrations": return <Puzzle size={s} style={{ color: SLATE }} aria-hidden />;
    case "system":       return <Settings size={s} style={{ color: SLATE }} aria-hidden />;
    case "promotional":  return <Megaphone size={s} style={{ color: SLATE }} aria-hidden />;
    default:             return <Bell size={s} style={{ color: SLATE }} aria-hidden />;
  }
}

function priorityWeight(p: NotificationRecord["priority"]): number {
  return p === "high" ? 0 : p === "normal" ? 1 : 2;
}

// ── Date grouping ─────────────────────────────────────────────────────────────
function getDateGroup(iso: string): NotificationDateGroup {
  const d   = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yestStart  = new Date(todayStart.getTime() - 86400000);
  const weekStart  = new Date(todayStart.getTime() - 6 * 86400000);
  if (d >= todayStart) return "today";
  if (d >= yestStart)  return "yesterday";
  if (d >= weekStart)  return "this-week";
  return "earlier";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function formatRelative(iso: string): string {
  const d    = new Date(iso);
  const now  = new Date();
  const diff = now.getTime() - d.getTime();
  const min  = Math.round(diff / 60000);
  if (min < 2)  return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24)  return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7)  return `${day}d ago`;
  return formatDate(iso);
}

// ── View filter logic ─────────────────────────────────────────────────────────
function matchesView(item: NotificationRecord, view: NotificationView): boolean {
  if (view === "dismissed")       return item.status === "dismissed";
  if (item.status === "dismissed") return false;
  switch (view) {
    case "all":             return true;
    case "unread":          return item.status === "unread";
    case "action-required": return item.priority === "high" && item.hasAction;
    case "documents":       return item.category === "documents";
    case "my-actions":      return item.category === "my-actions";
    case "workspace":       return item.category === "workspace";
    case "security":        return item.category === "security";
    case "billing-usage":   return item.category === "billing" || item.category === "usage";
    case "integrations":    return item.category === "integrations";
    case "system":          return item.category === "system";
    default:                return true;
  }
}

const ALL_VIEWS: NotificationView[] = [
  "all", "unread", "action-required", "documents", "my-actions",
  "workspace", "security", "billing-usage", "integrations", "system", "dismissed",
];

const DATE_GROUP_ORDER: NotificationDateGroup[] = ["today", "yesterday", "this-week", "earlier"];

// ── Components ────────────────────────────────────────────────────────────────

interface NotifCardProps {
  notification: NotificationRecord;
  onMarkRead:   (id: string) => void;
  onMarkUnread: (id: string) => void;
  onDismiss:    (id: string) => void;
  onRestore:    (id: string) => void;
}

function NotifCard({ notification: n, onMarkRead, onMarkUnread, onDismiss, onRestore }: NotifCardProps) {
  const isUnread    = n.status === "unread";
  const isDismissed = n.status === "dismissed";
  const severityCol = severityColor(n.severity);

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "14px 16px",
        background: isUnread ? "rgba(0,120,212,0.04)" : "white",
        borderBottom: "1px solid #F1F5F9",
        position: "relative",
        opacity: isDismissed ? 0.55 : 1,
      }}
      className="notif-card"
    >
      {/* Priority accent bar */}
      {n.priority === "high" && !isDismissed && (
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: severityCol, borderRadius: "2px 0 0 2px" }} aria-hidden />
      )}

      {/* Icon */}
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: isDismissed ? "#F1F5F9" : `${severityCol}14`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, marginTop: 1,
      }}>
        {getCategoryIcon(n.category, n.severity)}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 3 }}>
          {isUnread && (
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: AZURE, flexShrink: 0, marginTop: 5 }} aria-label="Unread" />
          )}
          <p style={{
            ...GF, fontSize: 13, fontWeight: isUnread ? 600 : 400,
            color: isDismissed ? SLATE : NAVY,
            margin: 0, flex: 1,
          }}>
            <Link
              to={`/app/notifications/${n.id}`}
              style={{ color: "inherit", textDecoration: "none" }}
              className="notif-title-link"
            >
              {n.title}
            </Link>
          </p>
          <span style={{ ...GM, fontSize: 10, color: SILVER, flexShrink: 0, marginTop: 2 }}>
            {formatRelative(n.createdAt)}
          </span>
        </div>

        <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "0 0 8px", lineHeight: 1.5 }}>
          {n.body}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Category badge */}
          <span style={{ ...GF, fontSize: 10, fontWeight: 500, color: SLATE, background: "#F1F5F9", borderRadius: 4, padding: "2px 6px" }}>
            {NOTIFICATION_CATEGORY_LABELS[n.category]}
          </span>

          {/* Severity badge */}
          <span style={{ ...GF, fontSize: 10, fontWeight: 500, color: severityCol, background: `${severityCol}12`, borderRadius: 4, padding: "2px 6px" }}>
            {severityLabel(n.severity)}
          </span>

          {/* Action button */}
          {n.hasAction && n.actionPath && !isDismissed && (
            <Link
              to={n.actionPath}
              style={{ display: "flex", alignItems: "center", gap: 3, ...GF, fontSize: 11, color: AZURE, textDecoration: "none", marginLeft: "auto" }}
              className="notif-action-link"
            >
              {n.actionLabel ?? "View"} <ChevronRight size={11} aria-hidden />
            </Link>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        {isDismissed ? (
          <button
            onClick={() => onRestore(n.id)}
            title="Restore notification"
            aria-label="Restore notification"
            style={{ background: "none", border: "none", cursor: "pointer", color: SILVER, display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6 }}
            className="notif-ctrl-btn"
          >
            <RotateCcw size={13} aria-hidden />
          </button>
        ) : (
          <>
            <button
              onClick={() => isUnread ? onMarkRead(n.id) : onMarkUnread(n.id)}
              title={isUnread ? "Mark as read" : "Mark as unread"}
              aria-label={isUnread ? "Mark as read" : "Mark as unread"}
              style={{ background: "none", border: "none", cursor: "pointer", color: SILVER, display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6 }}
              className="notif-ctrl-btn"
            >
              {isUnread ? <Eye size={13} aria-hidden /> : <EyeOff size={13} aria-hidden />}
            </button>
            {n.isDismissible && (
              <button
                onClick={() => onDismiss(n.id)}
                title="Dismiss notification"
                aria-label="Dismiss notification"
                style={{ background: "none", border: "none", cursor: "pointer", color: SILVER, display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6 }}
                className="notif-ctrl-btn"
              >
                <X size={13} aria-hidden />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function NotificationsPage() {
  const { items, unreadCount, markRead, markUnread, markAllRead, dismiss, restore } = useNotificationCenter();

  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState("");

  const view = (searchParams.get("view") ?? "all") as NotificationView;
  const sort = (searchParams.get("sort") ?? "newest") as NotificationSort;

  function setView(v: NotificationView) {
    setSearchParams((p) => { p.set("view", v); return p; }, { replace: true });
  }
  function setSort(s: NotificationSort) {
    setSearchParams((p) => { p.set("sort", s); return p; }, { replace: true });
  }

  // Count per view for tab badges
  const viewCounts = useMemo(() => {
    const counts: Partial<Record<NotificationView, number>> = {};
    for (const v of ALL_VIEWS) {
      counts[v] = items.filter((n) => matchesView(n, v)).length;
    }
    return counts;
  }, [items]);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = items.filter((n) => matchesView(n, view));
    if (q.trim()) {
      const lower = q.toLowerCase();
      result = result.filter((n) =>
        n.title.toLowerCase().includes(lower) ||
        n.body.toLowerCase().includes(lower) ||
        n.workspaceName.toLowerCase().includes(lower)
      );
    }
    // Sort
    result = [...result].sort((a, b) => {
      if (sort === "oldest")   return a.createdAt.localeCompare(b.createdAt);
      if (sort === "priority") {
        const pw = priorityWeight(a.priority) - priorityWeight(b.priority);
        if (pw !== 0) return pw;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
    return result;
  }, [items, view, q, sort]);

  // Group by date (newest-first groups)
  const groups = useMemo(() => {
    const grouped: Record<NotificationDateGroup, NotificationRecord[]> = {
      today: [], yesterday: [], "this-week": [], earlier: [],
    };
    for (const n of filtered) {
      grouped[getDateGroup(n.createdAt)].push(n);
    }
    return grouped;
  }, [filtered]);

  const orderedGroups = DATE_GROUP_ORDER.filter((g) => groups[g].length > 0);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 0 48px" }}>
      {/* ── Page header ───────────────────────────────────────────── */}
      <div style={{ padding: "28px 24px 0" }}>
        <h1 style={{ ...GF, fontSize: 22, fontWeight: 700, color: NAVY, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Notifications
        </h1>
        <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 16px" }}>
          Review updates, alerts, and action-related information across your LAGDA account and permitted Workspaces.
        </p>

        {/* Demo notice */}
        <div
          role="note"
          aria-label="Demonstration data notice"
          style={{ display: "flex", gap: 8, padding: "10px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, marginBottom: 20 }}
        >
          <AlertCircle size={14} style={{ color: SLATE, flexShrink: 0, marginTop: 1 }} aria-hidden />
          <p style={{ ...GF, fontSize: 12, color: SLATE, margin: 0 }}>
            These notifications and read states are fictional frontend demonstration data. No notification, reminder, email, SMS, push message, or real-time event is delivered or synchronized.
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: SILVER, pointerEvents: "none" }} aria-hidden />
            <input
              type="search"
              placeholder="Search notifications…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search notifications"
              style={{ width: "100%", paddingLeft: 32, paddingRight: 12, height: 36, border: "1px solid #E2E8F0", borderRadius: 8, ...GF, fontSize: 13, color: NAVY, outline: "none", boxSizing: "border-box" }}
              className="notif-search"
            />
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as NotificationSort)}
            aria-label="Sort notifications"
            style={{ height: 36, border: "1px solid #E2E8F0", borderRadius: 8, paddingLeft: 10, paddingRight: 28, ...GF, fontSize: 13, color: NAVY, background: "white", appearance: "none", cursor: "pointer", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2364748b'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
          >
            {(Object.keys(NOTIFICATION_SORT_LABELS) as NotificationSort[]).map((s) => (
              <option key={s} value={s}>{NOTIFICATION_SORT_LABELS[s]}</option>
            ))}
          </select>

          {/* Mark all read */}
          {unreadCount > 0 && view !== "dismissed" && (
            <button
              onClick={() => markAllRead()}
              style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 12px", background: "white", border: "1px solid #E2E8F0", borderRadius: 8, ...GF, fontSize: 13, color: SLATE, cursor: "pointer" }}
              className="notif-mark-all-btn"
            >
              <CheckCheck size={13} aria-hidden />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────── */}
      <div style={{ borderBottom: "1px solid #E2E8F0", marginTop: 4 }}>
        <TabStrip as="tablist" label="Notification views" activeKey={view} className="notif-tablist">
          {ALL_VIEWS.map((v) => {
            const isActive = v === view;
            const count    = viewCounts[v] ?? 0;
            return (
              <button
                key={v}
                role="tab"
                aria-selected={isActive}
                onClick={() => setView(v)}
                style={{
                  ...GF, fontSize: 12, fontWeight: isActive ? 600 : 400,
                  color: isActive ? AZURE : SLATE,
                  background: "none", border: "none", borderBottom: `2px solid ${isActive ? AZURE : "transparent"}`,
                  padding: "10px 12px", cursor: "pointer", whiteSpace: "nowrap",
                  display: "flex", alignItems: "center", gap: 5,
                  transition: "color 0.12s, border-color 0.12s",
                }}
                className="notif-tab"
              >
                {NOTIFICATION_VIEW_LABELS[v]}
                {count > 0 && (
                  <span style={{ ...GM, fontSize: 9, fontWeight: 700, background: isActive ? AZURE : "#E2E8F0", color: isActive ? "white" : SLATE, borderRadius: 999, padding: "1px 5px" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </TabStrip>
      </div>

      {/* ── Notification list ─────────────────────────────────────── */}
      <div style={{ padding: "0 24px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <Bell size={32} style={{ color: "#CBD5E1", marginBottom: 12 }} aria-hidden />
            <p style={{ ...GF, fontSize: 14, fontWeight: 600, color: SLATE, margin: "0 0 4px" }}>
              {view === "unread" ? "No unread notifications" :
               view === "dismissed" ? "No dismissed notifications" :
               q ? "No notifications match your search" :
               "No notifications in this view"}
            </p>
            <p style={{ ...GF, fontSize: 13, color: SILVER, margin: 0 }}>
              {view === "unread" ? "You're all caught up." :
               view === "dismissed" ? "Dismissed items will appear here." :
               q ? "Try a different search term." :
               "Notifications will appear here as activity occurs."}
            </p>
          </div>
        ) : (
          <div>
            {orderedGroups.map((group) => (
              <div key={group}>
                {/* Date group header */}
                <div style={{ padding: "16px 0 6px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ ...GM, fontSize: 10, fontWeight: 700, color: SILVER, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {NOTIFICATION_DATE_GROUP_LABELS[group]}
                  </span>
                  <div style={{ flex: 1, height: 1, background: "#F1F5F9" }} aria-hidden />
                </div>

                {/* Cards */}
                <div style={{ background: "white", borderRadius: 10, border: "1px solid #E2E8F0", overflow: "hidden", marginBottom: 8 }}>
                  {groups[group].map((n) => (
                    <NotifCard
                      key={n.id}
                      notification={n}
                      onMarkRead={markRead}
                      onMarkUnread={markUnread}
                      onDismiss={dismiss}
                      onRestore={restore}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preference link */}
        <div style={{ marginTop: 24, padding: "14px 16px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <p style={{ ...GF, fontSize: 12, color: SLATE, margin: 0 }}>
            Control which notifications you receive.
          </p>
          <Link to="/app/settings/notifications" style={{ ...GF, fontSize: 12, color: AZURE, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }} className="notif-pref-link">
            Notification Preferences <ChevronRight size={12} aria-hidden />
          </Link>
        </div>
      </div>

      <style>{`
        .notif-search:focus { border-color: #0078D4 !important; box-shadow: 0 0 0 3px rgba(0,120,212,0.1); }
        .notif-mark-all-btn:hover { background: #F1F5F9 !important; }
        .notif-mark-all-btn:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
        .notif-tab:focus-visible { outline: 2px solid #0078D4; outline-offset: -2px; }
        .notif-tablist { scrollbar-width: none; }
        .notif-tablist::-webkit-scrollbar { display: none; }
        .notif-card:last-child { border-bottom: none !important; }
        .notif-card:hover { background: rgba(0,120,212,0.02) !important; }
        .notif-ctrl-btn:hover { color: #0078D4 !important; background: rgba(0,120,212,0.08) !important; }
        .notif-ctrl-btn:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
        .notif-title-link:hover { color: #0078D4 !important; }
        .notif-action-link:hover { text-decoration: underline !important; }
        .notif-pref-link:hover { text-decoration: underline !important; }
      `}</style>
    </div>
  );
}

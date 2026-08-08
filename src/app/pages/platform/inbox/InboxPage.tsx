// Command 27 — Authenticated Recipient Inbox — /app/inbox
// Personal workspace for document requests assigned to the current user.
// No backend, no storage, no email-based access, no cross-user access.

import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import {
  Inbox, PenLine, ThumbsUp, Eye, FileCheck, Mail, Clock,
  CheckCircle2, AlertCircle, ChevronRight, Search, SlidersHorizontal,
  Calendar, ArrowUpDown, Circle,
} from "lucide-react";
import { usePlatform } from "../../../context/PlatformContext";
import { AppContent, PageHeader } from "../../../components/platform";
import { inboxService } from "../../../services/mock/inbox.service";
import { usePageMeta } from "../../../hooks/usePageMeta";
import type {
  RecipientInboxItem, RecipientInboxSummary, RecipientInboxQuery,
  InboxFilterView, InboxSortOrder,
} from "../../../models/inbox";
import type { RecipientParticipantRole } from "../../../models/recipient";
import { TabStrip } from "../../../components/platform/TabStrip";

// ── Design tokens ─────────────────────────────────────────────────────────────

const GF     = { fontFamily: "'Geist', sans-serif" };
const AZURE  = "#0078D4";
const NAVY   = "#07111F";
const SLATE  = "#64748B";
const SILVER = "#8A9BAE";
const GOLD   = "#C9960C";
const GREEN  = "#16A34A";
const RED    = "#DC2626";
const AMBER  = "#D97706";

// ── Helper functions ──────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  const hrs  = Math.floor(diff / 3_600_000);
  if (hrs < 1)   return "Just now";
  if (hrs < 24)  return `${hrs}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days}d ago`;
  return formatDate(iso);
}

function isDueSoon(dueAt: string | null): boolean {
  if (!dueAt) return false;
  const hours = (new Date(dueAt).getTime() - Date.now()) / 3_600_000;
  return hours > 0 && hours < 72;
}

function isDueOverdue(dueAt: string | null): boolean {
  if (!dueAt) return false;
  return new Date(dueAt).getTime() < Date.now();
}

// ── Role display ──────────────────────────────────────────────────────────────

type RoleColor = { bg: string; fg: string };

const ROLE_COLORS: Record<RecipientParticipantRole, RoleColor> = {
  "signer":                  { bg: "rgba(0,120,212,0.1)",   fg: AZURE },
  "approver":                { bg: "rgba(22,163,74,0.1)",   fg: GREEN },
  "reviewer":                { bg: "rgba(100,116,139,0.1)", fg: SLATE },
  "acknowledgment-recipient":{ bg: "rgba(201,150,12,0.1)",  fg: GOLD },
  "viewer":                  { bg: "rgba(138,155,174,0.12)",fg: SILVER },
  "copy-recipient":          { bg: "rgba(138,155,174,0.12)",fg: SILVER },
};

const ROLE_LABELS: Record<RecipientParticipantRole, string> = {
  "signer":                  "Signer",
  "approver":                "Approver",
  "reviewer":                "Reviewer",
  "acknowledgment-recipient":"Acknowledgment",
  "viewer":                  "Viewer",
  "copy-recipient":          "Copy Recipient",
};

function RoleIcon({ role, size = 14 }: { role: RecipientParticipantRole; size?: number }) {
  switch (role) {
    case "signer":                  return <PenLine size={size} aria-hidden />;
    case "approver":                return <ThumbsUp size={size} aria-hidden />;
    case "reviewer":                return <Eye size={size} aria-hidden />;
    case "acknowledgment-recipient":return <FileCheck size={size} aria-hidden />;
    case "viewer":                  return <Eye size={size} aria-hidden />;
    case "copy-recipient":          return <Mail size={size} aria-hidden />;
  }
}

function RoleBadge({ role }: { role: RecipientParticipantRole }) {
  const { bg, fg } = ROLE_COLORS[role];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, background: bg, color: fg, ...GF, fontSize: 11, fontWeight: 600 }}>
      <RoleIcon role={role} size={11} />
      {ROLE_LABELS[role]}
    </span>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

type AssignmentStatus = RecipientInboxItem["assignmentStatus"];

const STATUS_COLORS: Record<AssignmentStatus, { bg: string; fg: string }> = {
  "action-required": { bg: "rgba(220,38,38,0.1)",  fg: RED },
  "in-progress":     { bg: "rgba(217,119,6,0.1)",  fg: AMBER },
  "upcoming":        { bg: "rgba(100,116,139,0.1)", fg: SLATE },
  "completed":       { bg: "rgba(22,163,74,0.1)",  fg: GREEN },
  "unavailable":     { bg: "rgba(138,155,174,0.1)", fg: SILVER },
};

const STATUS_LABELS: Record<AssignmentStatus, string> = {
  "action-required": "Awaiting My Action",
  "in-progress":     "In Progress",
  "upcoming":        "Upcoming",
  "completed":       "Completed",
  "unavailable":     "Unavailable",
};

function StatusBadge({ status }: { status: AssignmentStatus }) {
  const { bg, fg } = STATUS_COLORS[status];
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, background: bg, color: fg, ...GF, fontSize: 11, fontWeight: 600 }}>
      {STATUS_LABELS[status]}
    </span>
  );
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCard({
  label, count, color, view, activeView, onClick,
}: {
  label: string; count: number; color: string;
  view: InboxFilterView; activeView: InboxFilterView;
  onClick: (v: InboxFilterView) => void;
}) {
  const isActive = activeView === view;
  return (
    <button
      onClick={() => onClick(view)}
      aria-pressed={isActive}
      style={{
        display: "flex", flexDirection: "column", gap: 4, padding: "14px 16px",
        background: isActive ? `rgba(0,120,212,0.06)` : "#fff",
        border: isActive ? `1.5px solid ${AZURE}` : "1.5px solid #E2E8F0",
        borderRadius: 12, cursor: "pointer", textAlign: "left", flex: 1, minWidth: 0,
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <span style={{ color, ...GF, fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
        {count}
      </span>
      <span style={{ color: SLATE, ...GF, fontSize: 12, fontWeight: 500 }}>{label}</span>
    </button>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

const TABS: { view: InboxFilterView; label: string }[] = [
  { view: "awaiting",    label: "Awaiting Action" },
  { view: "in-progress", label: "In Progress" },
  { view: "upcoming",    label: "Upcoming" },
  { view: "completed",   label: "Completed" },
  { view: "all",         label: "All" },
  { view: "unavailable", label: "Unavailable" },
];

// ── Assignment list item ──────────────────────────────────────────────────────

function AssignmentItem({ item }: { item: RecipientInboxItem }) {
  const dueSoon     = isDueSoon(item.dueAt);
  const dueOverdue  = isDueOverdue(item.dueAt);
  const dueColor    = dueOverdue ? RED : dueSoon ? AMBER : SLATE;
  const isActionable = item.assignmentStatus === "action-required" || item.assignmentStatus === "in-progress";

  return (
    <Link
      to={`/app/inbox/${item.id}`}
      style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px", background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 12, textDecoration: "none", transition: "border-color 0.15s" }}
      className="inbox-item-link"
      aria-label={`${item.documentTitle} — ${STATUS_LABELS[item.assignmentStatus]}`}
    >
      {/* Row 1: unread dot + title + chevron */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {!item.isRead && (
          <span aria-label="Unread" style={{ flexShrink: 0, marginTop: 4 }}>
            <Circle size={8} fill={AZURE} color={AZURE} aria-hidden />
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: NAVY, ...GF, fontSize: 14, fontWeight: 700, margin: "0 0 4px", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.documentTitle}
          </p>
          {item.documentCount > 1 && (
            <p style={{ color: SILVER, ...GF, fontSize: 12, margin: "0 0 4px" }}>
              {item.documentCount} documents
            </p>
          )}
        </div>
        <ChevronRight size={16} color={SILVER} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
      </div>

      {/* Row 2: badges */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <StatusBadge status={item.assignmentStatus} />
        <RoleBadge role={item.role} />
      </div>

      {/* Row 3: sender + date + due */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <span style={{ color: SLATE, ...GF, fontSize: 12 }}>
          {item.senderName} · {item.workspaceName}
        </span>
        <span style={{ color: SILVER, ...GF, fontSize: 12 }}>
          Received {formatRelative(item.assignedAt)}
        </span>
        {item.dueAt && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, color: dueColor, ...GF, fontSize: 12, fontWeight: dueSoon || dueOverdue ? 600 : 400 }}>
            <Calendar size={12} aria-hidden />
            {dueOverdue ? "Overdue" : dueSoon ? "Due soon"  : "Due"} {formatDate(item.dueAt)}
          </span>
        )}
        {item.assignmentStatus === "in-progress" && item.fieldCount > 0 && (
          <span style={{ color: AMBER, ...GF, fontSize: 12 }}>
            {item.fieldCompleted}/{item.fieldCount} fields
          </span>
        )}
      </div>

      {/* Row 4: continue/start action link */}
      {isActionable && item.handoffRequestId && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <span style={{ color: AZURE, ...GF, fontSize: 13, fontWeight: 600 }}>
            {item.assignmentStatus === "in-progress" ? "Continue →" : "Start →"}
          </span>
        </div>
      )}
    </Link>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ view, hasQuery }: { view: InboxFilterView; hasQuery: boolean }) {
  if (hasQuery) {
    return (
      <div style={{ textAlign: "center", padding: "60px 24px" }}>
        <Search size={32} color={SILVER} aria-hidden style={{ marginBottom: 12 }} />
        <p style={{ color: SLATE, ...GF, fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>No results found</p>
        <p style={{ color: SILVER, ...GF, fontSize: 13, margin: 0 }}>Try adjusting your search or filters.</p>
      </div>
    );
  }
  const messages: Record<InboxFilterView, { icon: React.ReactNode; title: string; body: string }> = {
    awaiting:     { icon: <CheckCircle2 size={32} color={GREEN} />,  title: "All caught up",           body: "No document requests require your action right now." },
    "in-progress":{ icon: <Clock size={32} color={SILVER} />,        title: "Nothing in progress",     body: "Start a signing request to see it here." },
    upcoming:     { icon: <Calendar size={32} color={SILVER} />,     title: "No upcoming requests",    body: "Requests waiting for other participants will appear here." },
    completed:    { icon: <CheckCircle2 size={32} color={GREEN} />,  title: "No completed requests",   body: "Completed signings will appear here." },
    unavailable:  { icon: <AlertCircle size={32} color={SILVER} />,  title: "No unavailable requests", body: "Expired, cancelled, or voided requests will appear here." },
    all:          { icon: <Inbox size={32} color={SILVER} />,        title: "No requests yet",         body: "Document requests assigned to you will appear here." },
  };
  const { icon, title, body } = messages[view];
  return (
    <div style={{ textAlign: "center", padding: "60px 24px" }}>
      <div style={{ marginBottom: 12 }}>{icon}</div>
      <p style={{ color: NAVY, ...GF, fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>{title}</p>
      <p style={{ color: SLATE, ...GF, fontSize: 13, margin: 0 }}>{body}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function InboxPage() {
  usePageMeta();
  const { user } = usePlatform();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeView = (searchParams.get("view") ?? "all") as InboxFilterView;
  const activeSort = (searchParams.get("sort") ?? "received") as InboxSortOrder;

  const [q, setQ]         = useState("");
  const [role, setRole]   = useState<RecipientParticipantRole | "">("");
  const [items, setItems] = useState<RecipientInboxItem[]>([]);
  const [summary, setSummary] = useState<RecipientInboxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    try {
      const query: RecipientInboxQuery = {
        view: activeView,
        q,
        role,
        sort: activeSort,
      };
      const result  = inboxService.listAssignments(query);
      const sumResult = inboxService.getSummary();
      if (result.ok)    setItems(result.data);
      else              setError(true);
      if (sumResult.ok) setSummary(sumResult.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [activeView, q, role, activeSort]);

  useEffect(() => { load(); }, [load]);

  function setView(view: InboxFilterView) {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set("view", view);
      return p;
    }, { replace: true });
  }

  function setSort(sort: InboxSortOrder) {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set("sort", sort);
      return p;
    }, { replace: true });
  }

  const unread = items.filter(i => !i.isRead).length;

  return (
    <>
      <PageHeader
        title="My Actions"
        description="Review document requests assigned to you and continue your required actions."
      />

      <AppContent style={{ maxWidth: 900 }}>

        {/* Demo notice */}
        <div
          role="note"
          aria-label="Demonstration notice"
          style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(0,120,212,0.04)", border: "1px solid rgba(0,120,212,0.12)", borderRadius: 10 }}
        >
          <p style={{ color: "#1E40AF", ...GF, fontSize: 12, margin: 0, lineHeight: 1.6 }}>
            <strong>Demonstration only.</strong> This Inbox uses fictional recipient assignments and frontend-only request states. No real signing invitations have been sent to you.
          </p>
        </div>

        {/* Summary cards */}
        {summary && (
          <div
            role="list"
            aria-label="Assignment summary"
            style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}
          >
            <SummaryCard label="Awaiting Action" count={summary.actionRequiredCount} color={RED}   view="awaiting"     activeView={activeView} onClick={setView} />
            <SummaryCard label="In Progress"     count={summary.inProgressCount}     color={AMBER} view="in-progress"  activeView={activeView} onClick={setView} />
            <SummaryCard label="Upcoming"        count={summary.upcomingCount}        color={SLATE} view="upcoming"     activeView={activeView} onClick={setView} />
            <SummaryCard label="Completed"       count={summary.completedCount}       color={GREEN} view="completed"    activeView={activeView} onClick={setView} />
          </div>
        )}

        {/* Tab bar */}
        <TabStrip as="tablist" label="Filter by status" activeKey={activeView} className="inbox-tabstrip">
          {TABS.map(({ view, label }) => {
            const isActive = activeView === view;
            return (
              <button
                key={view}
                role="tab"
                aria-selected={isActive}
                onClick={() => setView(view)}
                style={{
                  padding: "10px 16px", background: "none", border: "none",
                  borderBottom: isActive ? `2px solid ${AZURE}` : "2px solid transparent",
                  color: isActive ? AZURE : SLATE,
                  ...GF, fontSize: 13, fontWeight: isActive ? 700 : 500,
                  cursor: "pointer", whiteSpace: "nowrap", marginBottom: -1.5,
                  transition: "color 0.15s",
                }}
              >
                {label}
              </button>
            );
          })}
        </TabStrip>

        {/* Search + filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>

          {/* Search */}
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <Search size={15} color={SILVER} aria-hidden style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="search"
              placeholder="Search by title, sender, or workspace…"
              value={q}
              onChange={e => setQ(e.target.value)}
              aria-label="Search assignments"
              style={{
                width: "100%", padding: "9px 12px 9px 34px",
                border: "1.5px solid #E2E8F0", borderRadius: 8,
                ...GF, fontSize: 13, color: NAVY, background: "#fff",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Role filter */}
          <div style={{ position: "relative" }}>
            <SlidersHorizontal size={14} color={SILVER} aria-hidden style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <select
              value={role}
              onChange={e => setRole(e.target.value as RecipientParticipantRole | "")}
              aria-label="Filter by role"
              style={{
                padding: "9px 12px 9px 30px",
                border: "1.5px solid #E2E8F0", borderRadius: 8,
                ...GF, fontSize: 13, color: role ? NAVY : SILVER, background: "#fff",
                cursor: "pointer", appearance: "none", paddingRight: 28,
              }}
            >
              <option value="">All roles</option>
              <option value="signer">Signer</option>
              <option value="approver">Approver</option>
              <option value="reviewer">Reviewer</option>
              <option value="acknowledgment-recipient">Acknowledgment</option>
              <option value="viewer">Viewer</option>
              <option value="copy-recipient">Copy Recipient</option>
            </select>
          </div>

          {/* Sort */}
          <div style={{ position: "relative" }}>
            <ArrowUpDown size={14} color={SILVER} aria-hidden style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <select
              value={activeSort}
              onChange={e => setSort(e.target.value as InboxSortOrder)}
              aria-label="Sort assignments"
              style={{
                padding: "9px 12px 9px 30px",
                border: "1.5px solid #E2E8F0", borderRadius: 8,
                ...GF, fontSize: 13, color: NAVY, background: "#fff",
                cursor: "pointer", appearance: "none", paddingRight: 28,
              }}
            >
              <option value="received">Newest first</option>
              <option value="due-date">Due date</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Unread notice */}
        {unread > 0 && activeView === "all" && (
          <p style={{ color: AZURE, ...GF, fontSize: 12, fontWeight: 600, margin: "0 0 12px" }}>
            {unread} unread {unread === 1 ? "request" : "requests"}
          </p>
        )}

        {/* Content */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 120, background: "#F1F5F9", borderRadius: 12, animation: "inbox-pulse 1.4s ease-in-out infinite" }} />
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: "20px 16px", background: "#FFF7ED", border: "1px solid rgba(217,119,6,0.2)", borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
            <AlertCircle size={18} color={AMBER} aria-hidden />
            <div>
              <p style={{ color: "#92400E", ...GF, fontSize: 13, fontWeight: 600, margin: 0 }}>Could not load your inbox.</p>
              <button onClick={load} style={{ color: AZURE, background: "none", border: "none", ...GF, fontSize: 13, cursor: "pointer", padding: 0, marginTop: 4 }}>Retry</button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <EmptyState view={activeView} hasQuery={!!q || !!role} />
        ) : (
          <div role="list" aria-label="Document assignments" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map(item => (
              <div key={item.id} role="listitem">
                <AssignmentItem item={item} />
              </div>
            ))}
          </div>
        )}

        {/* Privacy footer */}
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid #E2E8F0" }}>
          <p style={{ color: SILVER, ...GF, fontSize: 12, margin: 0, lineHeight: 1.6 }}>
            Your inbox shows only document requests assigned to your account. Other workspace members cannot access your inbox, including Workspace Administrators. Unread state is session-only and not stored.
          </p>
        </div>

      </AppContent>

      <style>{`
        .inbox-item-link:hover {
          border-color: ${AZURE} !important;
        }
        @keyframes inbox-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        .inbox-cards {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .inbox-cards > * {
          flex: 1 1 calc(25% - 8px);
          min-width: 120px;
        }
      `}</style>
    </>
  );
}

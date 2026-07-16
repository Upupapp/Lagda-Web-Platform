// Command 14 — Authenticated Customer Dashboard.
// Sections: Quick Actions, Needs Attention, Document Status Summary,
// Recent Documents, Recent Activity, Template Shortcuts, Verification Access,
// Usage & Plan Snapshot, Workspace & Team Summary.
// Role-aware composition via hasPermission(). No eNotary content.
// No Burgundy (#67023B) in this file. No real analytics. No backend mutations.

import { useState, useEffect, useCallback, useId } from "react";
import { Link, useSearchParams } from "react-router";
import {
  FilePlus, FileText, LayoutTemplate, ShieldCheck, Users,
  AlertCircle, Clock, CheckCircle2, XCircle, RefreshCw,
  ChevronRight, AlertTriangle, Send, FileEdit, Activity,
  ArrowRight, Inbox, PenLine, ThumbsUp, Eye, FileCheck, Mail, Calendar, Bell, ShieldAlert,
} from "lucide-react";
import { inboxService } from "../../services/mock/inbox.service";
import type { RecipientInboxItem } from "../../models/inbox";
import type { RecipientParticipantRole } from "../../models/recipient";
import { useNotificationCenter } from "../../context/NotificationCenterContext";
import { NOTIFICATION_CATEGORY_LABELS } from "../../models/notifications";
import { usePlatform } from "../../context/PlatformContext";
import type { PlatformRole } from "../../models";
import {
  AppContent, StatCard, DashboardGrid, EmptyStateLayout,
  SkeletonBlock, SKELETON_STYLE, PageHeader,
} from "../../components/platform";
import { mockDashboardService, DASHBOARD_MOCK_TEMPLATES } from "../../services/mock/dashboard.service";
import type {
  DashboardData, DashboardScenario, DashboardLoadState,
  AttentionItem, DashboardDocument, ActivityItem, DashboardUsage,
  DocumentStatusCount,
} from "../../models/dashboard";
import type { TransactionStatus } from "../../models";
import { TRANSACTION_STATUS_LABELS } from "../../models";
import { usePageMeta } from "../../hooks/usePageMeta";

// ── Design tokens (inline-style only — no Tailwind in JSX) ───────────────────

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const AZURE  = "#0078D4";
const GOLD   = "#C9960C";
const GREEN  = "#059669";
const RED    = "#DC2626";
const AMBER  = "#D97706";
const SLATE6 = "#64748B";
const SLATE4 = "#94A3B8";
const SLATE2 = "#E2E8F0";
const NAVY   = "#07111F";

// ── Date formatting (no external library needed) ──────────────────────────────

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now   = new Date();
  const diffMs   = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHrs  = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 2)  return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs  < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return "Yesterday";
  const sameYear = now.getFullYear() === date.getFullYear();
  return date.toLocaleDateString("en-PH", {
    month: "short", day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function formatStorageBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576)     return `${(bytes / 1_048_576).toFixed(0)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

// ── Scenario derivation ───────────────────────────────────────────────────────

const VALID_SCENARIOS: DashboardScenario[] = [
  "standard-admin", "sender", "viewer", "auditor", "new-user",
  "partial-failure", "full-error", "usage-warning", "restricted-workspace",
];

function deriveScenario(
  role: PlatformRole | null,
  demoOverride: string | null,
): DashboardScenario {
  if (demoOverride && (VALID_SCENARIOS as string[]).includes(demoOverride)) {
    return demoOverride as DashboardScenario;
  }
  switch (role) {
    case "viewer":   return "viewer";
    case "reviewer": return "restricted-workspace";
    case "auditor":  return "auditor";
    case "sender":   return "sender";
    default:         return "standard-admin";
  }
}

// ── Status colors (not eNotary-related) ──────────────────────────────────────

function statusColor(status: TransactionStatus): string {
  switch (status) {
    case "completed":            return GREEN;
    case "awaiting-signature":
    case "partially-completed":  return AMBER;
    case "sent":                 return AZURE;
    case "declined":             return RED;
    case "expired":              return SLATE4;
    default:                     return SLATE6;
  }
}

function statusBg(status: TransactionStatus): string {
  switch (status) {
    case "completed":            return "rgba(5,150,105,0.1)";
    case "awaiting-signature":
    case "partially-completed":  return "rgba(217,119,6,0.1)";
    case "sent":                 return "rgba(0,120,212,0.1)";
    case "declined":             return "rgba(220,38,38,0.1)";
    case "expired":              return "rgba(148,163,184,0.1)";
    default:                     return "#F1F5F9";
  }
}

// ── Reusable subcomponents ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ color: SLATE6, ...GF, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", margin: 0 }}>
      {children}
    </h2>
  );
}

function SectionHeader({
  label, to, linkLabel,
}: { label: string; to?: string; linkLabel?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <SectionLabel>{label}</SectionLabel>
      {to && linkLabel && (
        <Link to={to} style={{ color: AZURE, ...GF, fontSize: 12, textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
          {linkLabel} <ChevronRight size={12} aria-hidden />
        </Link>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: TransactionStatus }) {
  const label = TRANSACTION_STATUS_LABELS[status] ?? status;
  return (
    <span
      aria-label={`Status: ${label}`}
      style={{
        display: "inline-block", padding: "2px 8px", borderRadius: 20,
        background: statusBg(status), color: statusColor(status),
        ...GF, fontSize: 11, fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}

function SectionErrorCard({ onRetry }: { onRetry?: () => void }) {
  return (
    <div style={{ padding: "20px 16px", background: "#FFF7ED", border: "1px solid rgba(217,119,6,0.2)", borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
      <AlertCircle size={18} color={AMBER} aria-hidden />
      <div style={{ flex: 1 }}>
        <p style={{ color: "#92400E", ...GF, fontSize: 13, fontWeight: 600, margin: 0 }}>This section could not be loaded.</p>
        <p style={{ color: "#B45309", ...GF, fontSize: 12, margin: "2px 0 0" }}>This is a frontend demonstration — no real service was contacted.</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} style={{ background: "none", border: "1px solid rgba(217,119,6,0.3)", borderRadius: 6, color: "#92400E", ...GF, fontSize: 12, padding: "5px 10px", cursor: "pointer" }}>
          Retry
        </button>
      )}
    </div>
  );
}

function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <SkeletonBlock width={32} height={32} radius={8} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <SkeletonBlock width="70%" height={13} />
            <SkeletonBlock width="40%" height={11} />
          </div>
          <SkeletonBlock width={60} height={20} radius={10} />
        </div>
      ))}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "white", border: `1px solid ${SLATE2}`, borderRadius: 12, ...style }}>
      {children}
    </div>
  );
}

// ── Quick Actions ─────────────────────────────────────────────────────────────

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  sub: string;
  to: string;
  accent: string;
  bg: string;
  permission: boolean;
}

function QuickActionsSection({ canPrepare, canTemplate, canVerify, canInvite }: {
  canPrepare: boolean; canTemplate: boolean; canVerify: boolean; canInvite: boolean;
}) {
  const actions: QuickAction[] = [
    { icon: <FilePlus size={20} aria-hidden />, label: "Prepare a Document", sub: "Upload and request signatures", to: "/app/prepare", accent: AZURE, bg: "rgba(0,120,212,0.08)", permission: canPrepare },
    { icon: <FileText size={20} aria-hidden />, label: "My Documents", sub: "View and manage documents", to: "/app/documents", accent: NAVY, bg: "#F8FAFC", permission: true },
    { icon: <LayoutTemplate size={20} aria-hidden />, label: "Use a Template", sub: "Start from a saved template", to: "/app/templates", accent: NAVY, bg: "#F8FAFC", permission: canTemplate },
    { icon: <ShieldCheck size={20} aria-hidden />, label: "Verify a Document", sub: "Check a document's authenticity", to: "/app/verify", accent: NAVY, bg: "#F8FAFC", permission: canVerify },
    { icon: <Users size={20} aria-hidden />, label: "Invite Team Member", sub: "Add someone to this workspace", to: "/app/team/invitations", accent: NAVY, bg: "#F8FAFC", permission: canInvite },
  ].filter((a) => a.permission);

  if (actions.length === 0) return null;

  return (
    <section aria-label="Quick actions" style={{ marginBottom: 24 }}>
      <SectionHeader label="Quick Actions" />
      <div className="dashboard-quick-actions">
        {actions.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="dashboard-quick-action-card"
            aria-label={a.label}
            style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 16px", background: "white", border: `1px solid ${SLATE2}`, borderRadius: 12, textDecoration: "none" }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 10, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", color: a.accent, flexShrink: 0 }}>
              {a.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: "#0F172A", ...GF, fontSize: 13, fontWeight: 700, margin: "0 0 1px" }}>{a.label}</p>
              <p style={{ color: SLATE6, ...GF, fontSize: 12, margin: 0 }}>{a.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ── Needs Attention ───────────────────────────────────────────────────────────

function AttentionIcon({ type }: { type: AttentionItem["type"] }) {
  if (type === "awaiting-signature") return <Clock size={16} color={AMBER} aria-hidden />;
  if (type === "expiring-soon")      return <AlertTriangle size={16} color={AMBER} aria-hidden />;
  return <XCircle size={16} color={RED} aria-hidden />;
}

function NeedsAttentionSection({ items, hasError, isLoading, onRetry }: {
  items: AttentionItem[]; hasError: boolean; isLoading: boolean; onRetry: () => void;
}) {
  return (
    <section aria-label="Needs attention" style={{ marginBottom: 24 }}>
      <SectionHeader label="Needs Attention" to="/app/documents" linkLabel="View all" />
      <Card>
        {isLoading ? (
          <div style={{ padding: "16px 20px" }}><SkeletonRows count={2} /></div>
        ) : hasError ? (
          <div style={{ padding: 16 }}><SectionErrorCard onRetry={onRetry} /></div>
        ) : items.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 20px" }}>
            <CheckCircle2 size={20} color={GREEN} aria-hidden />
            <p style={{ color: SLATE6, ...GF, fontSize: 13, margin: 0 }}>No items need your attention right now.</p>
          </div>
        ) : (
          <ul aria-label="Items requiring attention" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {items.map((item, idx) => (
              <li
                key={item.id}
                style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 20px", borderBottom: idx < items.length - 1 ? `1px solid ${SLATE2}` : "none" }}
              >
                <div style={{ marginTop: 2, flexShrink: 0 }}>
                  <AttentionIcon type={item.type} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "#0F172A", ...GF, fontSize: 13, fontWeight: 600, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.title}
                  </p>
                  <p style={{ color: SLATE6, ...GF, fontSize: 12, margin: 0 }}>{item.detail}</p>
                  {item.expiresAt && (
                    <p style={{ color: AMBER, ...GF, fontSize: 11, margin: "3px 0 0" }}>
                      Expires {formatShortDate(item.expiresAt)}
                    </p>
                  )}
                </div>
                <Link
                  to={`/app/documents/${item.transactionId}`}
                  aria-label={`View ${item.title}`}
                  style={{ color: AZURE, ...GF, fontSize: 12, textDecoration: "none", flexShrink: 0, marginTop: 2 }}
                >
                  View <ArrowRight size={12} aria-hidden style={{ display: "inline", verticalAlign: "middle" }} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

// ── Document Status Summary ───────────────────────────────────────────────────

interface StatusCardDef {
  key: keyof DocumentStatusCount;
  label: string;
  color: string;
}

const STATUS_CARDS: StatusCardDef[] = [
  { key: "awaiting-signature", label: "Awaiting Signature", color: AMBER },
  { key: "partially-completed", label: "In Progress",       color: "#0891B2" },
  { key: "completed",          label: "Completed",          color: GREEN },
  { key: "expired",            label: "Expired",            color: SLATE4 },
];

function StatusSummarySection({ counts, hasError, isLoading, onRetry }: {
  counts: DocumentStatusCount | null; hasError: boolean; isLoading: boolean; onRetry: () => void;
}) {
  return (
    <section aria-label="Document status summary" style={{ marginBottom: 24 }}>
      <SectionHeader label="Document Status" to="/app/documents" linkLabel="All documents" />
      {isLoading ? (
        <DashboardGrid>
          {STATUS_CARDS.map((_, i) => (
            <div key={i} style={{ background: "white", border: `1px solid ${SLATE2}`, borderRadius: 12, padding: "18px 20px" }}>
              <SkeletonBlock width="60%" height={11} />
              <div style={{ marginTop: 8 }}><SkeletonBlock width="40%" height={28} /></div>
            </div>
          ))}
        </DashboardGrid>
      ) : hasError ? (
        <SectionErrorCard onRetry={onRetry} />
      ) : (
        <DashboardGrid>
          {STATUS_CARDS.map((sc) => (
            <Link
              key={sc.key}
              to={`/app/documents?status=${encodeURIComponent(sc.key)}`}
              aria-label={`${sc.label}: ${counts?.[sc.key] ?? 0} documents`}
              style={{ display: "block", textDecoration: "none" }}
              className="dashboard-stat-link"
            >
              <StatCard
                label={sc.label}
                value={String(counts?.[sc.key] ?? 0)}
                sub={`of ${counts?.total ?? 0} total`}
                accent={sc.color}
              />
            </Link>
          ))}
        </DashboardGrid>
      )}
    </section>
  );
}

// ── Recent Documents ──────────────────────────────────────────────────────────

function RecentDocumentsSection({ docs, hasError, isLoading, onRetry }: {
  docs: DashboardDocument[]; hasError: boolean; isLoading: boolean; onRetry: () => void;
}) {
  return (
    <section aria-label="Recent documents" style={{ marginBottom: 24 }}>
      <SectionHeader label="Recent Documents" to="/app/documents" linkLabel="View all" />
      <Card>
        {isLoading ? (
          <div style={{ padding: "16px 20px" }}><SkeletonRows count={4} /></div>
        ) : hasError ? (
          <div style={{ padding: 16 }}><SectionErrorCard onRetry={onRetry} /></div>
        ) : docs.length === 0 ? (
          <EmptyStateLayout
            icon={<FileText size={24} aria-hidden />}
            title="No documents yet"
            description="Prepare your first document to request signatures."
            action={
              <Link to="/app/prepare" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: AZURE, color: "white", ...GF, fontSize: 13, fontWeight: 600, padding: "10px 16px", borderRadius: 8, textDecoration: "none" }}>
                <FilePlus size={15} aria-hidden /> Prepare a Document
              </Link>
            }
          />
        ) : (
          <div className="dashboard-doc-table" role="table" aria-label="Recent documents">
            <div role="rowgroup">
              <div role="row" className="dashboard-doc-header-row" style={{ display: "grid", padding: "10px 20px", borderBottom: `1px solid ${SLATE2}` }}>
                <span role="columnheader" style={{ color: SLATE4, ...GF, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Document</span>
                <span role="columnheader" className="dashboard-col-status" style={{ color: SLATE4, ...GF, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Status</span>
                <span role="columnheader" className="dashboard-col-date" style={{ color: SLATE4, ...GF, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Updated</span>
              </div>
            </div>
            <div role="rowgroup">
              {docs.map((doc, idx) => (
                <Link
                  key={doc.id}
                  to={`/app/documents/${doc.id}`}
                  role="row"
                  aria-label={`${doc.title}, ${TRANSACTION_STATUS_LABELS[doc.status] ?? doc.status}, updated ${formatRelativeDate(doc.updatedAt)}`}
                  className="dashboard-doc-row"
                  style={{ display: "grid", padding: "12px 20px", textDecoration: "none", borderBottom: idx < docs.length - 1 ? `1px solid ${SLATE2}` : "none" }}
                >
                  <div role="cell" style={{ minWidth: 0 }}>
                    <p style={{ color: "#0F172A", ...GF, fontSize: 13, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {doc.title}
                    </p>
                    <p style={{ color: SLATE4, ...GF, fontSize: 11, margin: "2px 0 0" }}>
                      {doc.completedParticipantCount} of {doc.participantCount} signed
                    </p>
                  </div>
                  <div role="cell" className="dashboard-col-status">
                    <StatusBadge status={doc.status} />
                  </div>
                  <span role="cell" className="dashboard-col-date" style={{ color: SLATE4, ...GF, fontSize: 12 }}>
                    {formatRelativeDate(doc.updatedAt)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}

// ── Recent Activity ───────────────────────────────────────────────────────────

function activityIcon(type: ActivityItem["type"]): React.ReactNode {
  const sz = 14;
  switch (type) {
    case "document-completed":  return <CheckCircle2 size={sz} color={GREEN} aria-hidden />;
    case "signature-received":  return <CheckCircle2 size={sz} color={AZURE}  aria-hidden />;
    case "document-sent":       return <Send         size={sz} color={SLATE6} aria-hidden />;
    case "document-expired":    return <XCircle      size={sz} color={SLATE4} aria-hidden />;
    case "document-created":    return <FileEdit     size={sz} color={SLATE4} aria-hidden />;
    default:                    return <Activity     size={sz} color={SLATE4} aria-hidden />;
  }
}

function RecentActivitySection({ items, hasError, isLoading, onRetry }: {
  items: ActivityItem[]; hasError: boolean; isLoading: boolean; onRetry: () => void;
}) {
  return (
    <section aria-label="Recent activity" style={{ marginBottom: 24 }}>
      <SectionHeader label="Recent Activity" to="/app/documents" linkLabel="View documents" />
      <Card>
        {isLoading ? (
          <div style={{ padding: "16px 20px" }}><SkeletonRows count={5} /></div>
        ) : hasError ? (
          <div style={{ padding: 16 }}><SectionErrorCard onRetry={onRetry} /></div>
        ) : items.length === 0 ? (
          <EmptyStateLayout
            icon={<Clock size={24} aria-hidden />}
            title="No recent activity"
            description="Document events will appear here as you prepare and send documents."
          />
        ) : (
          <ul aria-label="Activity feed" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {items.map((item, idx) => (
              <li
                key={item.id}
                style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 20px", borderBottom: idx < items.length - 1 ? `1px solid ${SLATE2}` : "none" }}
              >
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "#F8FAFC", border: `1px solid ${SLATE2}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  {activityIcon(item.type)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "#0F172A", ...GF, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{item.description}</p>
                </div>
                <time dateTime={item.timestamp} style={{ color: SLATE4, ...GF, fontSize: 11, flexShrink: 0, marginTop: 2 }}>
                  {formatRelativeDate(item.timestamp)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

// ── Template Shortcuts ────────────────────────────────────────────────────────

function TemplateShortcuts({ isLoading }: { isLoading: boolean }) {
  const templates = DASHBOARD_MOCK_TEMPLATES.slice(0, 3);
  return (
    <section aria-label="Template shortcuts" style={{ marginBottom: 20 }}>
      <SectionHeader label="Templates" to="/app/templates" linkLabel="All templates" />
      <Card>
        {isLoading ? (
          <div style={{ padding: "12px 16px" }}><SkeletonRows count={3} /></div>
        ) : templates.length === 0 ? (
          <div style={{ padding: "16px" }}>
            <p style={{ color: SLATE6, ...GF, fontSize: 13, margin: 0 }}>No templates saved yet.</p>
          </div>
        ) : (
          <ul aria-label="Recent templates" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {templates.map((tmpl, idx) => (
              <li key={tmpl.id} style={{ borderBottom: idx < templates.length - 1 ? `1px solid ${SLATE2}` : "none" }}>
                <Link
                  to={`/app/templates/${tmpl.id}`}
                  aria-label={`Use template: ${tmpl.name}`}
                  className="dashboard-template-row"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "11px 16px", textDecoration: "none" }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: "#0F172A", ...GF, fontSize: 13, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tmpl.name}</p>
                    <p style={{ color: SLATE4, ...GF, fontSize: 11, margin: "2px 0 0" }}>Used {tmpl.usageCount} times</p>
                  </div>
                  <ChevronRight size={14} color={SLATE4} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

// ── Document Verification Access ──────────────────────────────────────────────

function VerificationAccessCard() {
  return (
    <section aria-label="Document Verification" style={{ marginBottom: 20 }}>
      <Link
        to="/app/verify"
        className="dashboard-verify-card"
        aria-label="Verify a document — Check the authenticity of a LAGDA-signed document"
        style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px", background: "white", border: `1px solid ${SLATE2}`, borderRadius: 12, textDecoration: "none" }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(5,150,105,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ShieldCheck size={20} color={GREEN} aria-hidden />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: "#0F172A", ...GF, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>Verify a Document</p>
          <p style={{ color: SLATE6, ...GF, fontSize: 12, margin: 0 }}>Check the authenticity of a LAGDA-signed document</p>
        </div>
        <ArrowRight size={16} color={SLATE4} aria-hidden />
      </Link>
    </section>
  );
}

// ── Usage & Plan Snapshot ─────────────────────────────────────────────────────

function UsageMeter({
  label, used, limit, isNear, formatUsed = String,
}: {
  label: string;
  used: number;
  limit: number | null;
  isNear: boolean;
  formatUsed?: (v: number) => string;
}) {
  const meterId = useId();
  const pct = (limit && limit > 0) ? Math.min((used / limit) * 100, 100) : 0;
  const usedStr  = formatUsed(used);
  const limitStr = limit ? formatUsed(limit) : "Unlimited";
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <p style={{ color: "#0F172A", ...GF, fontSize: 12, fontWeight: 600, margin: 0 }}>{label}</p>
        <span style={{ color: isNear ? AMBER : SLATE4, ...GM, fontSize: 11 }}>{usedStr} / {limitStr}</span>
      </div>
      <div
        id={meterId}
        role="meter"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit ?? used}
        aria-label={`${label}: ${usedStr} of ${limitStr} used`}
        style={{ height: 6, background: SLATE2, borderRadius: 3, overflow: "hidden" }}
      >
        {limit !== null && (
          <div style={{ width: `${pct}%`, height: "100%", background: isNear ? AMBER : AZURE, borderRadius: 3, transition: "width 0.4s ease" }} aria-hidden />
        )}
      </div>
      {isNear && (
        <p role="alert" aria-live="polite" style={{ color: AMBER, ...GF, fontSize: 11, margin: "4px 0 0" }}>
          You are approaching your {label.toLowerCase()} limit. Contact support to discuss plan options.
        </p>
      )}
    </div>
  );
}

function UsageSnapshot({ usage, isLoading }: { usage: DashboardUsage | null; isLoading: boolean }) {
  return (
    <section aria-label="Usage and plan snapshot" style={{ marginBottom: 20 }}>
      <SectionHeader label="Usage & Plan" to="/app/settings/billing" linkLabel="Manage" />
      <Card style={{ padding: "16px" }}>
        {isLoading || !usage ? (
          <>
            <SkeletonBlock width="50%" height={11} />
            <div style={{ marginTop: 10 }}><SkeletonBlock height={6} /></div>
            <div style={{ marginTop: 16 }}><SkeletonBlock width="50%" height={11} /></div>
            <div style={{ marginTop: 10 }}><SkeletonBlock height={6} /></div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ color: "#0F172A", ...GF, fontSize: 12, fontWeight: 600 }}>
                {usage.planLabel} Plan
              </span>
              <span style={{ color: SLATE4, ...GF, fontSize: 11 }}>
                Renews {formatShortDate(usage.periodEndDate)}
              </span>
            </div>
            <UsageMeter
              label="Sending Requests"
              used={usage.sendingRequestsUsed}
              limit={usage.sendingRequestsLimit}
              isNear={usage.isNearSendingLimit}
            />
            <UsageMeter
              label="Storage"
              used={usage.storageUsedBytes}
              limit={usage.storageLimitBytes}
              isNear={usage.isNearStorageLimit}
              formatUsed={formatStorageBytes}
            />
            <p style={{ color: SLATE4, ...GF, fontSize: 11, margin: "8px 0 0", lineHeight: 1.5 }}>
              Usage figures are for demonstration only and are not connected to a production billing system.
            </p>
          </>
        )}
      </Card>
    </section>
  );
}

// ── Workspace & Team Summary ──────────────────────────────────────────────────

function WorkspaceTeamSummary({ memberCount, workspaceName, planLabel, isLoading }: {
  memberCount: number; workspaceName: string; planLabel: string; isLoading: boolean;
}) {
  return (
    <section aria-label="Workspace and team summary" style={{ marginBottom: 20 }}>
      <SectionHeader label="Team" to="/app/team" linkLabel="Manage" />
      <Card style={{ padding: "16px" }}>
        {isLoading ? (
          <>
            <SkeletonBlock width="60%" height={13} />
            <div style={{ marginTop: 8 }}><SkeletonBlock width="40%" height={11} /></div>
            <div style={{ marginTop: 12 }}><SkeletonBlock height={32} radius={8} /></div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(0,120,212,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={18} color={AZURE} aria-hidden />
              </div>
              <div>
                <p style={{ color: "#0F172A", ...GF, fontSize: 13, fontWeight: 700, margin: 0 }}>{workspaceName}</p>
                <p style={{ color: SLATE4, ...GF, fontSize: 11, margin: "2px 0 0" }}>{planLabel} Plan</p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#F8FAFC", borderRadius: 8 }}>
              <span style={{ color: SLATE6, ...GF, fontSize: 12 }}>Team members</span>
              <span style={{ color: "#0F172A", ...GF, fontSize: 12, fontWeight: 700 }}>{memberCount}</span>
            </div>
            <Link
              to="/app/team/invitations"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, padding: "9px", background: "rgba(0,120,212,0.06)", borderRadius: 8, color: AZURE, ...GF, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
              className="dashboard-invite-link"
            >
              <Users size={14} aria-hidden /> Invite a team member
            </Link>
          </>
        )}
      </Card>
    </section>
  );
}

// ── My Actions section (C27 inbox integration) ────────────────────────────────

const INBOX_ROLE_ICONS: Record<RecipientParticipantRole, React.ReactNode> = {
  "signer":                   <PenLine size={13} aria-hidden />,
  "approver":                 <ThumbsUp size={13} aria-hidden />,
  "reviewer":                 <Eye size={13} aria-hidden />,
  "acknowledgment-recipient": <FileCheck size={13} aria-hidden />,
  "viewer":                   <Eye size={13} aria-hidden />,
  "copy-recipient":           <Mail size={13} aria-hidden />,
};

const INBOX_ROLE_LABELS: Record<RecipientParticipantRole, string> = {
  "signer":                   "Signer",
  "approver":                 "Approver",
  "reviewer":                 "Reviewer",
  "acknowledgment-recipient": "Acknowledgment",
  "viewer":                   "Viewer",
  "copy-recipient":           "Copy Recipient",
};

function MyActionsSection() {
  const [items, setItems] = useState<RecipientInboxItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const result = inboxService.getActionRequiredItems(3);
    if (result.ok) setItems(result.data);
    setLoaded(true);
  }, []);

  if (!loaded) return null;
  if (items.length === 0) return null;

  return (
    <section aria-label="My Actions — awaiting your action" style={{ marginBottom: 24 }}>
      <SectionHeader label="My Actions" to="/app/inbox" linkLabel="View all" />
      <Card style={{ padding: "4px 0" }}>
        {items.map((item, idx) => {
          const dueSoon = item.dueAt && (new Date(item.dueAt).getTime() - Date.now()) / 3_600_000 < 72;
          return (
            <Link
              key={item.id}
              to={`/app/inbox/${item.id}`}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                textDecoration: "none",
                borderBottom: idx < items.length - 1 ? "1px solid #F1F5F9" : "none",
              }}
              className="dashboard-inbox-link"
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: item.assignmentStatus === "in-progress" ? "rgba(217,119,6,0.1)" : "rgba(0,120,212,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: item.assignmentStatus === "in-progress" ? AMBER : AZURE, flexShrink: 0 }}>
                {INBOX_ROLE_ICONS[item.role]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "#0F172A", ...GF, fontSize: 13, fontWeight: 600, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.documentTitle}
                </p>
                <p style={{ color: SLATE6, ...GF, fontSize: 12, margin: 0 }}>
                  {INBOX_ROLE_LABELS[item.role]} · {item.senderName}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                {item.dueAt && (
                  <span style={{ display: "flex", alignItems: "center", gap: 3, color: dueSoon ? AMBER : SLATE4, ...GF, fontSize: 11, fontWeight: dueSoon ? 600 : 400 }}>
                    <Calendar size={11} aria-hidden />
                    {new Date(item.dueAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                  </span>
                )}
                <ChevronRight size={14} color={SLATE4} aria-hidden />
              </div>
            </Link>
          );
        })}
      </Card>
    </section>
  );
}

// ── Notifications Dashboard Section (C28) ────────────────────────────────────

function NotificationsSection() {
  const { items, unreadCount, markRead } = useNotificationCenter();

  const urgent = items
    .filter((n) => n.status !== "dismissed" && n.priority === "high" && n.status === "unread")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  if (unreadCount === 0 && urgent.length === 0) return null;

  return (
    <section aria-label="High-priority notifications" style={{ marginBottom: 24 }}>
      <SectionHeader label="Notifications" to="/app/notifications" linkLabel="View all" />
      <Card style={{ padding: "4px 0" }}>
        {urgent.length > 0 ? (
          urgent.map((n, idx) => {
            const sevColor = n.severity === "critical" ? RED : n.severity === "warning" ? AMBER : AZURE;
            return (
              <Link
                key={n.id}
                to={`/app/notifications/${n.id}`}
                onClick={() => markRead(n.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                  textDecoration: "none",
                  borderBottom: idx < urgent.length - 1 ? "1px solid #F1F5F9" : "none",
                  borderLeft: `3px solid ${sevColor}`,
                }}
                className="dashboard-notif-link"
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${sevColor}14`, display: "flex", alignItems: "center", justifyContent: "center", color: sevColor, flexShrink: 0 }}>
                  {n.category === "security" ? <ShieldAlert size={15} aria-hidden /> : <Bell size={15} aria-hidden />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "#0F172A", ...GF, fontSize: 13, fontWeight: 600, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {n.title}
                  </p>
                  <p style={{ color: SLATE6, ...GF, fontSize: 12, margin: 0 }}>
                    {NOTIFICATION_CATEGORY_LABELS[n.category]}
                  </p>
                </div>
                <ChevronRight size={14} color={SLATE4} aria-hidden />
              </Link>
            );
          })
        ) : (
          <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <Bell size={15} style={{ color: SLATE6 }} aria-hidden />
            <p style={{ ...GF, fontSize: 13, color: SLATE6, margin: 0 }}>
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "No new notifications"}
            </p>
            <Link to="/app/notifications" style={{ marginLeft: "auto", ...GF, fontSize: 12, color: AZURE, textDecoration: "none" }}>
              View all →
            </Link>
          </div>
        )}
      </Card>
    </section>
  );
}

// ── Reports Direction Section (C29) ──────────────────────────────────────────

function ReportsDirectionSection() {
  return (
    <section aria-label="Reports direction" style={{ marginBottom: 24 }}>
      <SectionHeader label="Reports" to="/app/reports" linkLabel="View all reports" />
      <Card>
        <div style={{ padding: "12px 16px" }}>
          <p style={{ ...GF, fontSize: 12, color: SLATE6, margin: "0 0 10px" }}>
            Operational insights across document transactions, participants, templates,
            verification, and workspace activity.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "Document Operations",      path: "/app/reports/documents" },
              { label: "Participants & Routing",   path: "/app/reports/participants" },
              { label: "Verification",             path: "/app/reports/verification" },
              { label: "Team Activity",            path: "/app/reports/teams" },
            ].map(r => (
              <Link
                key={r.path}
                to={r.path}
                style={{
                  ...GF, fontSize: 12, color: AZURE, textDecoration: "none",
                  background: "rgba(0,120,212,0.06)", borderRadius: 6,
                  padding: "4px 9px", border: "1px solid rgba(0,120,212,0.15)",
                }}
              >
                {r.label} →
              </Link>
            ))}
          </div>
          <p style={{ ...GF, fontSize: 10, color: SLATE4, margin: "8px 0 0" }}>
            Demonstration data only — not connected to a production analytics backend.
          </p>
        </div>
      </Card>
    </section>
  );
}

// ── Automation Direction Section (C32) ───────────────────────────────────────

function AutomationDirectionSection() {
  return (
    <section aria-label="Automation direction" style={{ marginBottom: 24 }}>
      <SectionHeader label="Automation" to="/app/automation" linkLabel="Open automation" />
      <Card>
        <div style={{ padding: "12px 16px" }}>
          <p style={{ ...GF, fontSize: 12, color: SLATE6, margin: "0 0 10px" }}>
            Configure rules, reusable policies, and workspace defaults that shape
            how document transactions are processed and routed.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "Rules",     path: "/app/automation/rules" },
              { label: "Policies",  path: "/app/automation/policies" },
              { label: "Conflicts", path: "/app/automation/conflicts" },
              { label: "Activity",  path: "/app/automation/activity" },
            ].map(r => (
              <Link
                key={r.path}
                to={r.path}
                style={{
                  ...GF, fontSize: 12, color: AZURE, textDecoration: "none",
                  background: "rgba(0,120,212,0.06)", borderRadius: 6,
                  padding: "4px 9px", border: "1px solid rgba(0,120,212,0.15)",
                }}
              >
                {r.label} →
              </Link>
            ))}
          </div>
          <p style={{ ...GF, fontSize: 10, color: SLATE4, margin: "8px 0 0" }}>
            Active in Demonstration — rules and policies do not modify live transactions.
          </p>
        </div>
      </Card>
    </section>
  );
}

// ── Full Error State ──────────────────────────────────────────────────────────

function FullErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <PageHeader title="Dashboard" />
      <AppContent>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <AlertCircle size={28} color={RED} aria-hidden />
          </div>
          <h1 style={{ color: "#0F172A", ...GF, fontSize: 22, fontWeight: 800, margin: "0 0 10px" }}>Dashboard unavailable</h1>
          <p style={{ color: SLATE6, ...GF, fontSize: 14, lineHeight: 1.6, margin: "0 0 28px", maxWidth: 400 }}>
            The dashboard could not be loaded. This is a frontend demonstration — no real service was contacted.
          </p>
          <button
            onClick={onRetry}
            style={{ display: "flex", alignItems: "center", gap: 8, background: AZURE, color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "12px 20px", borderRadius: 8, border: "none", cursor: "pointer" }}
          >
            <RefreshCw size={15} aria-hidden /> Try again
          </button>
        </div>
      </AppContent>
    </>
  );
}

// ── New-user empty state (shown when all counts are 0) ────────────────────────

function NewUserWelcome({ canPrepare }: { canPrepare: boolean }) {
  return (
    <section aria-label="Getting started" style={{ marginBottom: 24 }}>
      <Card style={{ padding: "32px 24px", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(0,120,212,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <FilePlus size={26} color={AZURE} aria-hidden />
        </div>
        <h2 style={{ color: "#0F172A", ...GF, fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>You're all set</h2>
        <p style={{ color: SLATE6, ...GF, fontSize: 14, lineHeight: 1.6, margin: "0 0 24px", maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
          Your workspace is ready. Prepare your first document to request signatures from participants.
        </p>
        {canPrepare && (
          <Link
            to="/app/prepare"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: AZURE, color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "12px 20px", borderRadius: 8, textDecoration: "none" }}
          >
            <FilePlus size={16} aria-hidden /> Prepare your first document
          </Link>
        )}
      </Card>
    </section>
  );
}

// ── Demo notice ───────────────────────────────────────────────────────────────

function DemoNotice({ scenario }: { scenario: DashboardScenario }) {
  return (
    <div role="note" aria-label="Frontend demonstration notice" style={{ marginTop: 32, padding: "12px 16px", background: "rgba(0,120,212,0.04)", borderRadius: 10, border: "1px solid rgba(0,120,212,0.12)" }}>
      <p style={{ color: "#1E40AF", ...GF, fontSize: 12, margin: "0 0 4px", lineHeight: 1.6 }}>
        <strong>Frontend demonstration.</strong> This dashboard uses mock data only. Document management, signing workflows, billing, and team features will connect to the backend during integration.
      </p>
      <p style={{ color: "#93C5FD", ...GM, fontSize: 10, margin: 0 }}>
        Scenario: {scenario} — Change via <code style={{ background: "rgba(0,120,212,0.1)", padding: "1px 4px", borderRadius: 4 }}>?demo=</code> query parameter.
      </p>
    </div>
  );
}

// ── Main Dashboard Component ──────────────────────────────────────────────────

export function PlatformDashboard() {
  usePageMeta();

  const { user, currentWorkspace, role, hasPermission, resolveCapability } = usePlatform();
  const [searchParams] = useSearchParams();

  const scenario = deriveScenario(role, searchParams.get("demo"));

  const [loadState, setLoadState] = useState<DashboardLoadState>("loading");
  const [data, setData]           = useState<DashboardData | null>(null);
  const [workspaceKey, setWorkspaceKey] = useState(currentWorkspace?.id ?? "");

  const load = useCallback(async () => {
    setLoadState("loading");
    setData(null);
    try {
      const d = await mockDashboardService.load(scenario);
      setData(d);
      const hasPartial = Object.values(d.sectionErrors).some(Boolean);
      setLoadState(hasPartial ? "partial-error" : "ready");
    } catch {
      setLoadState("full-error");
    }
  }, [scenario]);

  useEffect(() => { load(); }, [load]);

  // Reload when the active workspace changes (workspace switching).
  useEffect(() => {
    const id = currentWorkspace?.id ?? "";
    if (id && id !== workspaceKey) {
      setWorkspaceKey(id);
      load();
    }
  }, [currentWorkspace?.id, workspaceKey, load]);

  if (loadState === "full-error") return <FullErrorState onRetry={load} />;

  const isLoading   = loadState === "loading";
  const isNewUser   = scenario === "new-user" && !isLoading && (data?.statusCounts.total ?? 0) === 0;

  const canViewDocs  = hasPermission("view_documents");
  const canPrepare   = hasPermission("prepare_documents");
  const canTemplate  = hasPermission("manage_templates");
  const canVerify    = hasPermission("verify_documents");
  const canInvite    = hasPermission("manage_team");
  const canBilling    = hasPermission("view_billing") || hasPermission("view_usage");
  const canAudit      = hasPermission("view_audit");
  const canReports    = hasPermission("view_reports");
  // Automation: gated by capability (enterprise-preview, disabled by default)
  const automationCap = resolveCapability("workflow-automation");
  const canAutomation = automationCap.available && hasPermission("view_workflow_automation");

  const firstName = user?.displayName?.split(" ")[0] ?? "there";
  const wsName    = currentWorkspace?.name ?? "Your Workspace";
  const planRaw   = currentWorkspace?.plan ?? "";
  const planLabel = planRaw.charAt(0).toUpperCase() + planRaw.slice(1);
  const memberCount = currentWorkspace?.memberCount ?? 1;

  const hasSectionErr = (key: keyof DashboardData["sectionErrors"]) =>
    data?.sectionErrors[key] ?? false;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={currentWorkspace ? `${wsName} — ${planLabel} Plan` : undefined}
        actions={
          <button
            onClick={load}
            aria-label="Refresh dashboard"
            disabled={isLoading}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: `1px solid ${SLATE2}`, borderRadius: 8,
              color: SLATE6, ...GF, fontSize: 13, padding: "7px 12px", cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <RefreshCw size={14} aria-hidden className={isLoading ? "spin-icon" : ""} />
            {isLoading ? "Loading…" : "Refresh"}
          </button>
        }
      />

      <AppContent style={{ maxWidth: 1280 }}>

        {/* Quick Actions — always visible for any role that has at least one action */}
        <QuickActionsSection
          canPrepare={canPrepare}
          canTemplate={canTemplate}
          canVerify={canVerify}
          canInvite={canInvite}
        />

        {/* New-user welcome state */}
        {isNewUser && canPrepare && (
          <NewUserWelcome canPrepare={canPrepare} />
        )}

        {/* Two-column layout: main + side panel */}
        <div className="dashboard-layout">

          {/* Main column */}
          <div className="dashboard-main">

            {/* My Actions (C27) — shown for all roles */}
            <MyActionsSection />

            {/* Notifications (C28) — high-priority unread only */}
            <NotificationsSection />

            {canViewDocs && (
              <>
                <NeedsAttentionSection
                  items={data?.attentionItems ?? []}
                  hasError={hasSectionErr("attention")}
                  isLoading={isLoading}
                  onRetry={load}
                />
                <StatusSummarySection
                  counts={data?.statusCounts ?? null}
                  hasError={hasSectionErr("statusCounts")}
                  isLoading={isLoading}
                  onRetry={load}
                />
                <RecentDocumentsSection
                  docs={data?.recentDocuments ?? []}
                  hasError={hasSectionErr("recentDocuments")}
                  isLoading={isLoading}
                  onRetry={load}
                />
              </>
            )}

            {(canViewDocs || canAudit) && (
              <RecentActivitySection
                items={data?.activityItems ?? []}
                hasError={hasSectionErr("activity")}
                isLoading={isLoading}
                onRetry={load}
              />
            )}

            {/* Reports direction (C29) — concise link section for roles with view_reports */}
            {canReports && <ReportsDirectionSection />}

            {/* Automation direction (C32) — concise link section for roles with view_workflow_automation */}
            {canAutomation && <AutomationDirectionSection />}

          </div>

          {/* Side panel */}
          <aside className="dashboard-side" aria-label="Dashboard side panel">

            {canTemplate && (
              <TemplateShortcuts isLoading={isLoading} />
            )}

            {canVerify && (
              <VerificationAccessCard />
            )}

            {canBilling && (
              <UsageSnapshot usage={data?.usage ?? null} isLoading={isLoading} />
            )}

            {canInvite && (
              <WorkspaceTeamSummary
                memberCount={memberCount}
                workspaceName={wsName}
                planLabel={planLabel}
                isLoading={isLoading}
              />
            )}

          </aside>
        </div>

        <DemoNotice scenario={scenario} />
      </AppContent>

      <style>{`
        /* Two-column layout */
        .dashboard-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
        }
        @media (min-width: 900px) {
          .dashboard-layout {
            grid-template-columns: 1fr 320px;
            gap: 24px;
            align-items: start;
          }
        }

        /* Quick-actions responsive grid */
        .dashboard-quick-actions {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (min-width: 640px) {
          .dashboard-quick-actions {
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          }
        }

        /* Document table layout */
        .dashboard-doc-table { }
        .dashboard-doc-header-row,
        .dashboard-doc-row {
          grid-template-columns: 1fr;
        }
        .dashboard-col-status,
        .dashboard-col-date { display: none; }
        @media (min-width: 640px) {
          .dashboard-doc-header-row,
          .dashboard-doc-row {
            grid-template-columns: 1fr 140px 100px;
            align-items: center;
          }
          .dashboard-col-status,
          .dashboard-col-date { display: block; }
        }

        /* Hover & focus states */
        .dashboard-quick-action-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); border-color: #CBD5E1 !important; }
        .dashboard-quick-action-card:focus-visible { outline: 2px solid ${AZURE}; outline-offset: 2px; }
        .dashboard-doc-row:hover { background: #F8FAFC; }
        .dashboard-doc-row:focus-visible { outline: 2px solid ${AZURE}; outline-offset: -2px; }
        .dashboard-template-row:hover { background: #F8FAFC; }
        .dashboard-template-row:focus-visible { outline: 2px solid ${AZURE}; outline-offset: -2px; }
        .dashboard-stat-link:focus-visible { outline: 2px solid ${AZURE}; outline-offset: 2px; border-radius: 12px; }
        .dashboard-stat-link:hover > div { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .dashboard-verify-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); border-color: #CBD5E1 !important; }
        .dashboard-verify-card:focus-visible { outline: 2px solid ${AZURE}; outline-offset: 2px; }
        .dashboard-invite-link:hover { background: rgba(0,120,212,0.1) !important; }
        .dashboard-inbox-link:hover { background: #F8FAFC; }
        .dashboard-inbox-link:focus-visible { outline: 2px solid ${AZURE}; outline-offset: -2px; }
        .dashboard-notif-link:hover { background: #F8FAFC; }
        .dashboard-notif-link:focus-visible { outline: 2px solid ${AZURE}; outline-offset: -2px; }

        /* Refresh spin */
        @keyframes spin-anim { to { transform: rotate(360deg); } }
        .spin-icon { animation: spin-anim 1s linear infinite; }

        /* Skeleton */
        ${SKELETON_STYLE}

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </>
  );
}

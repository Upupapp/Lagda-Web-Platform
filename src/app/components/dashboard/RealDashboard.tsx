// The dashboard, for a real account.
//
// ── What it is built on ────────────────────────────────────────────────────
//
// One call: GET /workspaces/:id/signing-requests. Every number on this page
// is derived from rows that endpoint returned — state, participant counts,
// four timestamps — by the rules in services/dashboard/attention.ts. There
// is no usage meter, no plan widget and no activity feed, because there is
// no endpoint behind any of them and the previous version of this page was
// emptied precisely for showing invented figures to real accounts.
//
// ── What it is honest about ────────────────────────────────────────────────
//
// The list is capped at 100 rows and has no status filter. When a workspace
// has more than that, the summary says it is counting the 100 most recent,
// rather than presenting a page's buckets as workspace totals.
//
// ── What it leads with ─────────────────────────────────────────────────────
//
// Needs attention. A dashboard's job is to surface the thing you would
// otherwise find out too late: a decline, an expiry, a request nobody has
// touched in a week, a document fully prepared and then forgotten. The
// counts come second; the lists after that.

import { useState, useEffect, type CSSProperties } from "react";
import { Link } from "react-router";
import {
  FilePlus, FileText, XCircle, Clock, AlertTriangle, FileEdit,
  CheckCircle2, Send, ChevronRight, PenLine, History,
} from "lucide-react";
import { usePlatform } from "../../context/PlatformContext";
import {
  AppContent, StatCard, DashboardGrid, EmptyStateLayout, SkeletonBlock, PageHeader,
} from "../platform";
import {
  realSigningRequestService, type SigningRequestListItem,
} from "../../services/real/signing-request.service";
import {
  summarize, needsAttention, inFlight, recentlyCompleted,
  type AttentionEntry, type AttentionKind,
} from "../../services/dashboard/attention";
import { SIGNING_REQUEST_STATUS } from "../../services/signing-request-status";
import { StatusBadge } from "../documents/StatusBadge";
import { SignatureRecordDialog } from "../documents/SignatureRecordDialog";
import { AuditTrailDialog } from "../documents/AuditTrailDialog";
import { usePrepareLaunch } from "../../hooks/usePrepareLaunch";

const GF: CSSProperties = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const GREEN  = "#059669";
const RED    = "#DC2626";
const AMBER  = "#B45309";
const SLATE6 = "#64748B";
const SLATE4 = "#94A3B8";
const SLATE2 = "#E2E8F0";

/** The page fetches this many. Also the API's ceiling. */
const PAGE_SIZE = 100;

// ── Small helpers ──────────────────────────────────────────────────────────

function fmtRelative(iso: string, now = Date.now()): string {
  const diffMs = now - Date.parse(iso);
  const mins = Math.floor(diffMs / 60_000);
  const hrs  = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  if (mins < 2)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24)  return `${hrs}h ago`;
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** What each attention kind says, and how it looks. */
const ATTENTION: Record<AttentionKind, {
  icon: typeof XCircle; color: string; label: (days?: number) => string;
}> = {
  declined: {
    icon: XCircle, color: RED,
    label: () => "Declined",
  },
  expiring: {
    icon: Clock, color: AMBER,
    label: days => {
      const whole = Math.ceil(days ?? 0);
      return whole <= 0 ? "Expires today" : `Expires in ${plural(whole, "day")}`;
    },
  },
  stalled: {
    icon: AlertTriangle, color: AMBER,
    label: days => `No signatures after ${plural(Math.floor(days ?? 0), "day")}`,
  },
  "never-sent": {
    icon: FileEdit, color: SLATE6,
    label: days => `Prepared ${plural(Math.floor(days ?? 0), "day")} ago, never sent`,
  },
};

// ── Pieces ─────────────────────────────────────────────────────────────────

function SectionTitle({ children, count }: { children: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "28px 0 12px" }}>
      <h2 style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>{children}</h2>
      {count !== undefined && (
        <span style={{ ...GF, fontSize: 12, fontWeight: 600, color: SLATE4 }}>{count}</span>
      )}
    </div>
  );
}

function PrepareLink({ label = "Prepare Document" }: { label?: string }) {
  const { onPrepareClick } = usePrepareLaunch();
  return (
    <Link
      to="/app/prepare"
      onClick={onPrepareClick()}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
        background: AZURE, color: "#fff", textDecoration: "none", ...GF,
      }}
    >
      <FilePlus size={15} aria-hidden />
      {label}
    </Link>
  );
}

function RowShell({ children }: { children: React.ReactNode }) {
  return (
    <li style={{
      listStyle: "none", background: "#fff", border: `1px solid ${SLATE2}`,
      borderRadius: 10, padding: "12px 14px", marginBottom: 8,
      display: "flex", alignItems: "center", gap: 12, minWidth: 0, ...GF,
    }}>
      {children}
    </li>
  );
}

function Title({ item }: { item: SigningRequestListItem }) {
  return (
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 14, fontWeight: 600, color: NAVY, overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%",
        }} title={item.documentTitle}>
          {item.documentTitle}
        </span>
        <StatusBadge status={SIGNING_REQUEST_STATUS[item.state]} />
      </div>
    </div>
  );
}

function SignaturesButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Signatures for ${title}`}
      style={{
        ...GF, display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 12, fontWeight: 600, color: AZURE, background: "none",
        border: `1px solid ${SLATE2}`, borderRadius: 6, padding: "6px 10px",
        cursor: "pointer", whiteSpace: "nowrap", minHeight: 32,
      }}
    >
      <PenLine size={13} aria-hidden />
      Signatures
    </button>
  );
}

function ActivityButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Activity for ${title}`}
      title="Audit trail"
      style={{
        ...GF, display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 12, fontWeight: 600, color: SLATE6, background: "none",
        border: `1px solid ${SLATE2}`, borderRadius: 6, padding: "6px 10px",
        cursor: "pointer", whiteSpace: "nowrap", minHeight: 32,
      }}
    >
      <History size={13} aria-hidden />
      Activity
    </button>
  );
}

/** The two drill-downs every real row offers: who signed, and what happened. */
function RowActions({ item, onSignatures, onAudit }: {
  item: SigningRequestListItem;
  onSignatures: (item: SigningRequestListItem) => void;
  onAudit: (item: SigningRequestListItem) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <SignaturesButton title={item.documentTitle} onClick={() => onSignatures(item)} />
      <ActivityButton title={item.documentTitle} onClick={() => onAudit(item)} />
    </div>
  );
}

function AttentionRow({ entry, onSignatures, onAudit }: {
  entry: AttentionEntry;
  onSignatures: (item: SigningRequestListItem) => void;
  onAudit: (item: SigningRequestListItem) => void;
}) {
  const meta = ATTENTION[entry.kind];
  const Icon = meta.icon;
  const drillable = entry.kind !== "never-sent";
  return (
    <RowShell>
      <Icon size={18} aria-hidden style={{ color: meta.color, flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <Title item={entry.item} />
        <div style={{ fontSize: 12, color: meta.color, fontWeight: 600, marginTop: 4 }}>
          {meta.label(entry.days)}
        </div>
      </div>
      {drillable
        ? <RowActions item={entry.item} onSignatures={onSignatures} onAudit={onAudit} />
        : (
          <Link to="/app/documents" style={{ ...GF, fontSize: 12, fontWeight: 600, color: AZURE, textDecoration: "none", whiteSpace: "nowrap" }}>
            Open <ChevronRight size={13} aria-hidden style={{ verticalAlign: "-2px" }} />
          </Link>
        )}
    </RowShell>
  );
}

function ProgressMeter({ signed, of }: { signed: number; of: number }) {
  const pct = of === 0 ? 0 : Math.round((signed / of) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <div
        role="meter" aria-valuenow={signed} aria-valuemin={0} aria-valuemax={of}
        aria-label={`${signed} of ${of} signed`}
        style={{ width: 72, height: 6, borderRadius: 3, background: SLATE2, overflow: "hidden", flexShrink: 0 }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? GREEN : AZURE }} />
      </div>
      <span style={{ fontSize: 12, color: SLATE6, whiteSpace: "nowrap" }}>{signed} of {of} signed</span>
    </div>
  );
}

// ── The page ───────────────────────────────────────────────────────────────

export function RealDashboard() {
  const { currentWorkspace, user } = usePlatform();
  const workspaceId = currentWorkspace?.id ?? null;

  const [items, setItems] = useState<SigningRequestListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [signaturesFor, setSignaturesFor] = useState<SigningRequestListItem | null>(null);
  const [auditFor, setAuditFor] = useState<SigningRequestListItem | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    setStatus("loading");
    void realSigningRequestService.list(workspaceId, { perPage: PAGE_SIZE })
      .then(result => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
        setStatus("ready");
      })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [workspaceId]);

  const now = Date.now();
  const summary   = summarize(items, total);
  const attention = needsAttention(items, now);
  const flying    = inFlight(items);
  const done      = recentlyCompleted(items, 5);
  const paged     = summary.total > summary.fetched;

  const greeting = user?.displayName ? `Welcome back, ${user.displayName.split(" ")[0]}` : "Dashboard";

  return (
    <>
      <PageHeader title={greeting} primaryAction={<PrepareLink />} />
      <AppContent style={{ padding: "0 24px 40px" }}>
        {status === "loading" && (
          <div style={{ padding: "24px 0" }} aria-busy="true" aria-label="Loading dashboard">
            <SkeletonBlock height={96} />
          </div>
        )}

        {status === "error" && (
          <EmptyStateLayout
            icon={<FileText size={28} />}
            title="Couldn't load your dashboard"
            description="Something went wrong loading this workspace's signing requests. Try refreshing the page."
          />
        )}

        {status === "ready" && items.length === 0 && (
          <EmptyStateLayout
            icon={<Send size={28} />}
            title="Send your first document"
            description="Upload a PDF, add the people who need to sign, place their fields and send. Everything you send shows up here — what's waiting on whom, what's about to expire, and what's done."
            action={<PrepareLink label="Prepare your first document" />}
          />
        )}

        {status === "ready" && items.length > 0 && (
          <>
            {/* 1 — what needs you */}
            <section aria-label="Needs attention">
              <SectionTitle count={attention.length}>Needs attention</SectionTitle>
              {attention.length === 0
                ? (
                  <div style={{
                    ...GF, display: "flex", alignItems: "center", gap: 8, padding: "12px 14px",
                    borderRadius: 10, background: "#F0FDF4", border: "1px solid #BBF7D0",
                    color: "#166534", fontSize: 13,
                  }}>
                    <CheckCircle2 size={16} aria-hidden />
                    Nothing is waiting on you. No declines, nothing expiring soon, nothing stalled.
                  </div>
                )
                : (
                  <ul style={{ margin: 0, padding: 0 }}>
                    {attention.map(entry => (
                      <AttentionRow
                        key={entry.item.signingRequestId} entry={entry}
                        onSignatures={setSignaturesFor} onAudit={setAuditFor}
                      />
                    ))}
                  </ul>
                )}
            </section>

            {/* 2 — the counts, scoped honestly */}
            <section aria-label="Document status summary">
              <SectionTitle>At a glance</SectionTitle>
              <DashboardGrid>
                <StatCard label="In flight" value={summary.inFlight} accent={AZURE} sub="Sent, waiting on signatures" />
                <StatCard label="Needs attention" value={summary.attention} accent={summary.attention > 0 ? RED : undefined} sub="Declined or expired" />
                <StatCard label="Drafts" value={summary.drafts} sub="Prepared, not yet sent" />
                <StatCard label="Completed" value={summary.completed} accent={GREEN} sub="Every signature collected" />
              </DashboardGrid>
              {paged && (
                <p style={{ ...GF, fontSize: 12, color: SLATE6, margin: "10px 2px 0" }}>
                  Counts cover your {summary.fetched} most recent requests. This workspace has {summary.total} in total —
                  see <Link to="/app/documents" style={{ color: AZURE }}>Documents</Link> for all of them.
                </p>
              )}
            </section>

            {/* 3 — in flight */}
            {flying.length > 0 && (
              <section aria-label="In flight">
                <SectionTitle count={flying.length}>In flight</SectionTitle>
                <ul style={{ margin: 0, padding: 0 }}>
                  {flying.slice(0, 8).map(({ item, signed, of }) => (
                    <RowShell key={item.signingRequestId}>
                      <Send size={16} aria-hidden style={{ color: AZURE, flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Title item={item} />
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                          <ProgressMeter signed={signed} of={of} />
                          {item.sentAt !== null && (
                            <span style={{ fontSize: 12, color: SLATE4, whiteSpace: "nowrap" }}>sent {fmtRelative(item.sentAt, now)}</span>
                          )}
                        </div>
                      </div>
                      <RowActions item={item} onSignatures={setSignaturesFor} onAudit={setAuditFor} />
                    </RowShell>
                  ))}
                </ul>
              </section>
            )}

            {/* 4 — recently done */}
            {done.length > 0 && (
              <section aria-label="Recently completed">
                <SectionTitle count={done.length}>Recently completed</SectionTitle>
                <ul style={{ margin: 0, padding: 0 }}>
                  {done.map(item => (
                    <RowShell key={item.signingRequestId}>
                      <CheckCircle2 size={16} aria-hidden style={{ color: GREEN, flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Title item={item} />
                        <div style={{ fontSize: 12, color: SLATE4, marginTop: 4 }}>
                          completed {item.completedAt === null ? "" : fmtRelative(item.completedAt, now)}
                        </div>
                      </div>
                      <RowActions item={item} onSignatures={setSignaturesFor} onAudit={setAuditFor} />
                    </RowShell>
                  ))}
                </ul>
              </section>
            )}

            <p style={{ ...GF, fontSize: 12, color: SLATE4, margin: "28px 2px 0" }}>
              Everything above comes from your signing requests. Usage, plan and activity summaries aren&rsquo;t
              available for real accounts yet, so they aren&rsquo;t shown.
            </p>
          </>
        )}
      </AppContent>

      {signaturesFor && workspaceId && (
        <SignatureRecordDialog
          workspaceId={workspaceId}
          signingRequestId={signaturesFor.signingRequestId}
          documentTitle={signaturesFor.documentTitle}
          onClose={() => setSignaturesFor(null)}
        />
      )}
      {auditFor && workspaceId && (
        <AuditTrailDialog
          workspaceId={workspaceId}
          signingRequestId={auditFor.signingRequestId}
          documentTitle={auditFor.documentTitle}
          onClose={() => setAuditFor(null)}
        />
      )}
    </>
  );
}

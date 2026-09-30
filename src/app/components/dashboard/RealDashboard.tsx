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
//
// Needs attention also carries one kind of account notice: an invitation this
// user sent that was DECLINED (WORKSPACE_INVITATION_DECLINED, from the
// account feed the notification center already loads). Unread ones from the
// last 14 days are listed with the invitee, the reason and the date, and a
// "Review invitation" link to Manage → Invitations focused on it — switching
// to that invitation's workspace first when it is not the current one.
// Opening it marks the notice read, which takes it off this list.

import { useState, useEffect, type CSSProperties } from "react";
import { Link } from "react-router";
import {
  FilePlus, FileText, XCircle, Clock, AlertTriangle, FileEdit,
  CheckCircle2, Send, ChevronRight, PenLine, History, UserX, X, Bell, BarChart3, CircleCheck,
  type LucideIcon,
} from "lucide-react";
import { ProfileHero } from "./ProfileHero";
import { usePlatform } from "../../context/PlatformContext";
import { useOptionalNotificationCenter } from "../../context/NotificationCenterContext";
import {
  invitationDeclinesNeedingAttention, declineReviewPath, type DeclineAttentionEntry,
} from "../../services/dashboard/invitation-declines";
import {
  AppContent, EmptyStateLayout, SkeletonBlock,
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

/** A section of Home: a white panel with an icon, a title, a count pill, an optional line and action. */
function Panel({ icon: Icon, title, count, subtitle, action, label, children }: {
  icon: LucideIcon; title: string; count?: number; subtitle?: string; action?: React.ReactNode;
  label: string; children: React.ReactNode;
}) {
  return (
    <section aria-label={label} className="hd-panel">
      <div className="hd-panel-head">
        <Icon size={22} strokeWidth={1.9} aria-hidden className="hd-panel-icon" />
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          <div className="hd-panel-title-row">
            <h2 className="hd-panel-title">{title}</h2>
            {count !== undefined && <span className="hd-count" aria-label={`${String(count)} items`}>{count}</span>}
          </div>
          {subtitle && <p className="hd-panel-sub">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** One "At a glance" figure: an icon in a tinted circle, a label, the number, a line. */
function GlanceTile({ icon: Icon, label, value, sub, tone }: {
  icon: LucideIcon; label: string; value: number; sub: string; tone: "azure" | "red" | "slate" | "green";
}) {
  return (
    <div className="hd-tile" data-tone={tone}>
      <span aria-hidden className="hd-tile-icon"><Icon size={20} strokeWidth={2} /></span>
      <div style={{ minWidth: 0 }}>
        <div className="hd-tile-label">{label}</div>
        <div className="hd-tile-value">{value}</div>
        <div className="hd-tile-sub">{sub}</div>
      </div>
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

function RowShell({ children, tone }: { children: React.ReactNode; tone?: "danger" }) {
  return <li className="hd-row" data-tone={tone}>{children}</li>;
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
      className="hd-btn" data-variant="primary"
    >
      <PenLine size={15} aria-hidden />
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
      className="hd-btn"
    >
      <History size={15} aria-hidden />
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
    <div className="hd-row-actions">
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
    <RowShell {...(entry.kind === "declined" ? { tone: "danger" as const } : {})}>
      <span aria-hidden className="hd-row-badge" style={{ color: meta.color }}>
        <Icon size={entry.kind === "declined" ? 26 : 20} aria-hidden fill={entry.kind === "declined" ? meta.color : "none"} stroke={entry.kind === "declined" ? "#FFFFFF" : meta.color} />
      </span>
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

function fmtDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

/** "<invitee> declined your invitation to <workspace>", its reason and date,
 *  the action — review the invitation in Manage → Invitations — and a small
 *  Dismiss (×) that takes it out of Needs attention without opening it. */
function DeclineRow({ entry, onOpen, onDismiss }: {
  entry: DeclineAttentionEntry;
  onOpen: (entry: DeclineAttentionEntry) => void;
  onDismiss?: (entry: DeclineAttentionEntry) => void;
}) {
  const { notice, decline } = entry;
  const workspace = decline.workspaceName ?? "your workspace";
  const date = fmtDate(notice.createdAt);
  return (
    <li
      data-testid={`decline-${notice.id}`}
      style={{
        listStyle: "none", background: "#fff", border: `1px solid ${SLATE2}`,
        borderRadius: 10, padding: "12px 14px", marginBottom: 8,
        display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", minWidth: 0, ...GF,
      }}
    >
      <UserX size={18} aria-hidden style={{ color: RED, flexShrink: 0, marginTop: 1 }} />
      <div style={{ minWidth: 0, flex: "1 1 200px" }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: NAVY, overflowWrap: "anywhere" }}>
          {decline.invitee} declined your invitation to {workspace}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#334155", overflowWrap: "anywhere" }}>
          {decline.reason === null ? "No reason given." : <>Reason: &ldquo;{decline.reason}&rdquo;</>}
        </p>
        {date !== "" && (
          <p style={{ margin: "4px 0 0", fontSize: 12, color: SLATE6 }}>
            Declined <time dateTime={notice.createdAt}>{date}</time>
          </p>
        )}
      </div>
      <Link
        to={declineReviewPath(decline)}
        onClick={() => onOpen(entry)}
        aria-label={`Review invitation declined by ${decline.invitee}`}
        className="dashboard-decline-review"
        style={{
          ...GF, display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
          fontSize: 12, fontWeight: 600, color: AZURE, textDecoration: "none",
          border: `1px solid ${SLATE2}`, borderRadius: 6, padding: "6px 10px", minHeight: 32,
          whiteSpace: "nowrap", marginLeft: "auto",
        }}
      >
        Review invitation <ChevronRight size={13} aria-hidden />
      </Link>
      {onDismiss !== undefined && (
        <button
          type="button"
          onClick={() => onDismiss(entry)}
          aria-label={`Dismiss the decline from ${decline.invitee}`}
          title="Dismiss"
          style={{
            ...GF, display: "inline-flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, width: 32, height: 32, padding: 0, cursor: "pointer",
            background: "transparent", border: `1px solid ${SLATE2}`, borderRadius: 6, color: SLATE6,
          }}
        >
          <X size={14} aria-hidden />
        </button>
      )}
    </li>
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
  const platform = usePlatform();
  const { currentWorkspace } = platform;
  const workspaceId = currentWorkspace?.id ?? null;
  const notices = useOptionalNotificationCenter();

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
  const declines  = invitationDeclinesNeedingAttention(notices?.items ?? [], now);

  // Opening a decline: switch to the invitation's workspace when it is not
  // the current one (Manage → Invitations lists the CURRENT workspace's), and
  // mark the notice read so it leaves this list.
  const openDecline = ({ notice, decline }: DeclineAttentionEntry) => {
    const target = decline.workspaceId;
    if (target !== null && target !== "" && target !== workspaceId
      && platform.workspaces.some(w => w.id === target)) {
      platform.switchWorkspace(target);
    }
    notices?.markRead(notice.id);
  };

  // Dismissing: persisted server-side like the read mark, so it stays out
  // of Needs attention after a reload.
  const dismissDecline = ({ notice }: DeclineAttentionEntry) => {
    notices?.dismiss(notice.id);
  };

  const attentionCount = attention.length + declines.length;
  const attentionSection = (
    <Panel label="Needs attention" icon={Bell} title="Needs attention" count={attentionCount}
      subtitle={attentionCount === 0 ? undefined : "These items require your immediate attention."}
      action={<Link to="/app/documents" className="hd-viewall">View all <ChevronRight size={16} aria-hidden /></Link>}>
      {attentionCount === 0
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
            {declines.map(entry => (
              <DeclineRow
                key={entry.notice.id} entry={entry} onOpen={openDecline}
                {...(notices === null ? {} : { onDismiss: dismissDecline })}
              />
            ))}
            {attention.map(entry => (
              <AttentionRow
                key={entry.item.signingRequestId} entry={entry}
                onSignatures={setSignaturesFor} onAudit={setAuditFor}
              />
            ))}
          </ul>
        )}
    </Panel>
  );

  return (
    <>
      <AppContent style={{ padding: "0 24px 40px" }}>
        {/* Who you are, on the banner of the workspace you are in. */}
        <ProfileHero />
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

        {status === "ready" && items.length === 0 && declines.length > 0 && attentionSection}

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
            {attentionSection}

            {/* 2 — the counts, scoped honestly */}
            <Panel label="Document status summary" icon={BarChart3} title="At a glance">
              <div className="hd-tiles">
                <GlanceTile icon={Send} tone="azure" label="In flight" value={summary.inFlight} sub="Sent, waiting on signatures" />
                <GlanceTile icon={Clock} tone={summary.attention > 0 ? "red" : "slate"} label="Needs attention" value={summary.attention} sub="Declined or expired" />
                <GlanceTile icon={FileText} tone="slate" label="Drafts" value={summary.drafts} sub="Prepared, not yet sent" />
                <GlanceTile icon={CircleCheck} tone="green" label="Completed" value={summary.completed} sub="Every signature collected" />
              </div>
              {paged && (
                <p style={{ ...GF, fontSize: 12, color: SLATE6, margin: "10px 2px 0" }}>
                  Counts cover your {summary.fetched} most recent requests. This workspace has {summary.total} in total —
                  see <Link to="/app/documents" style={{ color: AZURE }}>Documents</Link> for all of them.
                </p>
              )}
            </Panel>

            {/* 3 — in flight */}
            {flying.length > 0 && (
              <Panel label="In flight" icon={Send} title="In flight" count={flying.length}>
                <ul style={{ margin: 0, padding: 0 }}>
                  {flying.slice(0, 8).map(({ item, signed, of }) => (
                    <RowShell key={item.signingRequestId}>
                      <span aria-hidden className="hd-row-badge" style={{ color: AZURE }}><Send size={22} aria-hidden /></span>
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
              </Panel>
            )}

            {/* 4 — recently done */}
            {done.length > 0 && (
              <Panel label="Recently completed" icon={CheckCircle2} title="Recently completed" count={done.length}>
                <ul style={{ margin: 0, padding: 0 }}>
                  {done.map(item => (
                    <RowShell key={item.signingRequestId}>
                      <span aria-hidden className="hd-row-badge"><CheckCircle2 size={26} aria-hidden fill={GREEN} stroke="#FFFFFF" /></span>
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
              </Panel>
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
      <style>{`
        .dashboard-decline-review:hover { background: #F0F7FF; }
        .dashboard-decline-review:focus-visible { outline: 2px solid ${AZURE}; outline-offset: 2px; }
        ${HOME_CSS}
      `}</style>
    </>
  );
}

const HOME_CSS = `
.hd-panel { background: #FFFFFF; border: 1px solid #E6EBF2; border-radius: 18px; padding: 18px 18px 14px; margin-top: 16px;
  box-shadow: 0 1px 2px rgba(7,17,31,0.03); min-width: 0; }
.hd-panel-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; min-width: 0; }
.hd-panel-icon { color: #0B1F4B; flex-shrink: 0; margin-top: 1px; }
.hd-panel-title-row { display: flex; align-items: center; gap: 10px; }
.hd-panel-title { margin: 0; font-family: 'Geist', sans-serif; font-size: 18px; font-weight: 700; color: #0B1F4B; }
.hd-count { font-family: 'Geist', sans-serif; font-size: 12px; font-weight: 700; min-width: 22px; height: 22px; padding: 0 7px; box-sizing: border-box; border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center; background: #E6F0FB; color: #1D4ED8; }
.hd-panel-sub { font-family: 'Geist', sans-serif; font-size: 14px; color: #64748B; margin: 4px 0 0; }
.hd-viewall { display: inline-flex; align-items: center; gap: 6px; min-height: 42px; padding: 0 14px 0 16px; border-radius: 12px; border: 1.5px solid #D6DEE8;
  font-family: 'Geist', sans-serif; font-size: 14px; font-weight: 600; color: #334155; text-decoration: none; white-space: nowrap; flex-shrink: 0; }
.hd-viewall:hover { border-color: #0078D4; color: #005A9E; }
.hd-row { list-style: none; display: flex; align-items: center; gap: 14px; min-width: 0; background: #FFFFFF; border: 1px solid #E6EBF2; border-radius: 12px;
  padding: 14px 16px; margin-bottom: 10px; font-family: 'Geist', sans-serif; }
.hd-row:last-child { margin-bottom: 0; }
.hd-row[data-tone="danger"] { background: #FEF2F2; border-color: #FCD5D5; }
.hd-row-badge { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.hd-row-actions { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
.hd-btn { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 14px; border-radius: 10px; border: 1.5px solid #D6DEE8;
  background: #FFFFFF; font-family: 'Geist', sans-serif; font-size: 13px; font-weight: 600; color: #475569; cursor: pointer; white-space: nowrap; }
.hd-btn[data-variant="primary"] { color: #1D6FD1; border-color: #CFE0F5; }
.hd-btn:hover { border-color: #0078D4; color: #005A9E; background: #F5F9FE; }
.hd-btn:focus-visible { outline: 3px solid rgba(0,120,212,0.35); outline-offset: 1px; }
.hd-tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.hd-tile { display: flex; gap: 14px; align-items: flex-start; border: 1px solid #E6EBF2; border-radius: 14px; padding: 16px; background: #FFFFFF; min-width: 0;
  box-shadow: 0 6px 16px -14px rgba(7,17,31,0.4); }
.hd-tile-icon { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.hd-tile[data-tone="azure"] .hd-tile-icon { background: #E6F0FB; color: #1D6FD1; }
.hd-tile[data-tone="red"] .hd-tile-icon { background: #FDECEC; color: #DC2626; }
.hd-tile[data-tone="slate"] .hd-tile-icon { background: #EEF2F7; color: #334155; }
.hd-tile[data-tone="green"] .hd-tile-icon { background: #E3F6EC; color: #059669; }
.hd-tile-label { font-family: 'Geist', sans-serif; font-size: 12.5px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #475569; }
.hd-tile-value { font-family: 'Geist', sans-serif; font-size: 34px; font-weight: 800; line-height: 1.1; margin-top: 6px; color: #0B1F4B; }
.hd-tile[data-tone="azure"] .hd-tile-value { color: #1D6FD1; }
.hd-tile[data-tone="red"] .hd-tile-value { color: #DC2626; }
.hd-tile[data-tone="green"] .hd-tile-value { color: #059669; }
.hd-tile-sub { font-family: 'Geist', sans-serif; font-size: 13px; color: #64748B; margin-top: 8px; }
@media (max-width: 1100px) { .hd-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) {
  .hd-panel { padding: 14px 12px 12px; border-radius: 16px; }
  .hd-panel-head { gap: 10px; }
  .hd-panel-title { font-size: 17px; }
  .hd-panel-sub { font-size: 13px; }
  .hd-viewall { min-height: 36px; padding: 0 10px 0 12px; font-size: 13px; border-radius: 10px; }
  .hd-tiles { gap: 10px; }
  .hd-tile { flex-direction: column; gap: 8px; padding: 12px; }
  .hd-tile-value { font-size: 28px; }
  .hd-row { flex-wrap: wrap; align-items: flex-start; padding: 12px; }
  .hd-row-actions { width: 100%; flex-wrap: nowrap; padding-left: 50px; box-sizing: border-box; }
  .hd-row-actions .hd-btn { flex: 1 1 0; min-width: 0; justify-content: center; padding: 0 8px; }
}
`;

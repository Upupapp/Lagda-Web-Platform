// Transaction Detail — /app/documents/:transactionId and sub-routes.
// Parent: TransactionDetailLayout (loads txn, shares via Outlet context)
// Children: OverviewTab, ParticipantsTab, ActivityTab, EvidenceTab, SettingsTab
// No backend. No real auth. No eNotary. No Burgundy (#67023B).
// Never log OTPs, tokens, or passwords. Never display raw IP/location/device data.

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Outlet,
  useOutletContext,
  useParams,
  useNavigate,
  useLocation,
  useSearchParams,
  Link,
} from "react-router";
import {
  FileText,
  Users,
  Activity,
  Shield,
  Settings,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Info,
  Download,
  Copy,
  Archive,
  RotateCcw,
  Ban,
  Pencil,
  Folder,
  Tag,
  Bell,
  Calendar,
  Eye,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { usePlatform } from "../../../context/PlatformContext";
import { PageHeader } from "../../../components/platform/PageHeader";
import { AppContent } from "../../../components/platform/AppContentLayout";
import type {
  TransactionDetail,
  TransactionActionAvailability,
  ActivityEvent,
  ActivityEventCategory,
  ActivityQuery,
  ReminderSettings,
  ExpirationSettings,
} from "../../../models/transaction-detail";
import {
  TRANSACTION_STATUS_LABELS,
} from "../../../models";
import {
  ROUTING_MODE_LABELS,
  PARTICIPANT_ROLE_LABELS,
  PARTICIPANT_DELIVERY_LABELS,
  PARTICIPANT_ACTION_LABELS,
  ACTION_STATE_TONE,
  DELIVERY_STATE_TONE,
  AUTH_METHOD_LABELS,
  ACTIVITY_PAGE_SIZE,
  ACTIVITY_CATEGORY_LABELS,
  VALID_ACTIVITY_CATEGORIES,
} from "../../../models/transaction-detail";
import {
  mockTransactionDetailService,
  resolveActions,
} from "../../../services/mock/transaction-detail.service";

// ── Design tokens ─────────────────────────────────────────────────────────────

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const GOLD  = "#C9960C";

// Status → { bg, text, border }
function statusChip(status: string): { bg: string; text: string; border: string } {
  switch (status) {
    case "completed":   return { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0" };
    case "draft":       return { bg: "#F8FAFC", text: "#64748B", border: "#E2E8F0" };
    case "ready-to-send": return { bg: "#F0F9FF", text: "#0369A1", border: "#BAE6FD" };
    case "sent":
    case "delivered":
    case "viewed":
    case "authentication-completed":
    case "awaiting-signature":
    case "awaiting-approval": return { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" };
    case "partially-completed": return { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" };
    case "expired":     return { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" };
    case "failed-delivery": return { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" };
    case "cancelled":
    case "voided":
    case "declined":    return { bg: "#FFF7ED", text: "#9A3412", border: "#FED7AA" };
    case "archived":    return { bg: "#F1F5F9", text: "#475569", border: "#CBD5E1" };
    default:            return { bg: "#F8FAFC", text: "#64748B", border: "#E2E8F0" };
  }
}

// ── Global styles ─────────────────────────────────────────────────────────────

const TXN_STYLES = `
  .txn-tab-link { text-decoration: none; display: flex; align-items: center; gap: 6px;
    padding: 10px 16px; border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s;
    font-size: 14px; font-weight: 500; white-space: nowrap; }
  .txn-tab-link:hover { color: #0F172A; border-bottom-color: #CBD5E1; }
  .txn-tab-link.active { color: #0078D4; border-bottom-color: #0078D4; }
  .txn-tab-link:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; border-radius: 2px; }
  .txn-btn { display: inline-flex; align-items: center; gap: 6px; border: none; cursor: pointer;
    font-size: 14px; font-weight: 500; border-radius: 6px; padding: 8px 14px;
    transition: opacity 0.15s, background 0.15s; }
  .txn-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .txn-btn:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
  .txn-btn-primary { background: #0078D4; color: #fff; }
  .txn-btn-primary:not(:disabled):hover { background: #005EA2; }
  .txn-btn-secondary { background: #F1F5F9; color: #0F172A; border: 1px solid #E2E8F0; }
  .txn-btn-secondary:not(:disabled):hover { background: #E2E8F0; }
  .txn-btn-danger { background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; }
  .txn-btn-danger:not(:disabled):hover { background: #FEE2E2; }
  .txn-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 10px; }
  .txn-expand-row { cursor: pointer; }
  .txn-expand-row:hover td { background: #F8FAFC; }
  .txn-expand-row:focus-visible { outline: 2px solid #0078D4; }
  .txn-input { width: 100%; padding: 8px 12px; border: 1.5px solid #CBD5E1;
    border-radius: 6px; font-size: 14px; outline: none; transition: border-color 0.15s; }
  .txn-input:focus { border-color: #0078D4; }
  .txn-input:disabled { background: #F8FAFC; color: #94A3B8; }
  .txn-section-title { font-size: 13px; font-weight: 700; color: #475569;
    text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 12px; }
  @media (prefers-reduced-motion: reduce) {
    .txn-btn, .txn-tab-link, .txn-input { transition: none; }
  }
  @media (max-width: 640px) {
    .txn-desktop-only { display: none !important; }
    .txn-mobile-full { width: 100% !important; }
  }
  @media (min-width: 641px) {
    .txn-mobile-only { display: none !important; }
  }
`;

// ── Outlet context ────────────────────────────────────────────────────────────

export interface TxnOutletContext {
  txn: TransactionDetail;
  actions: TransactionActionAvailability[];
  canPrepare: boolean;
  canVerify: boolean;
  canAudit: boolean;
  reload: () => void;
}

function useTxnContext() {
  return useOutletContext<TxnOutletContext>();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function isActionAvailable(actions: TransactionActionAvailability[], id: string) {
  return actions.find(a => a.action === id)?.available ?? false;
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const c = statusChip(status);
  return (
    <span style={{
      ...GF, display: "inline-block", fontSize: 12, fontWeight: 600,
      padding: "2px 8px", borderRadius: 100,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      {TRANSACTION_STATUS_LABELS[status as keyof typeof TRANSACTION_STATUS_LABELS] ?? status}
    </span>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  confirmDanger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ open, title, body, confirmLabel, confirmDanger, loading, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={title}
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={onCancel} style={{ position: "absolute", inset: 0, background: "rgba(7,17,31,0.4)" }} aria-hidden />
      <div ref={ref} tabIndex={-1} style={{
        position: "relative", background: "#fff", borderRadius: 12, padding: "24px 28px",
        maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(7,17,31,0.18)", ...GF,
      }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700, color: NAVY }}>{title}</h2>
        <div style={{ color: "#475569", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>{body}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="txn-btn txn-btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
          <button
            className={`txn-btn ${confirmDanger ? "txn-btn-danger" : "txn-btn-primary"}`}
            onClick={onConfirm} disabled={loading}
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function TxnSkeleton() {
  return (
    <div style={{ padding: "24px", ...GF }}>
      <style>{`@keyframes sk-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: i === 1 ? 28 : 18, borderRadius: 6, background: "#E2E8F0",
          animation: "sk-pulse 1.4s ease-in-out infinite", marginBottom: 16, maxWidth: i === 1 ? 320 : 480 }} />
      ))}
    </div>
  );
}

// ── TransactionDetailLayout (parent) ──────────────────────────────────────────

export function TransactionDetailLayout() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission } = usePlatform();

  const canPrepare = hasPermission("prepare_documents");
  const canVerify  = hasPermission("view_documents");
  const canAudit   = hasPermission("view_audit");

  const [txn,     setTxn]     = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);

  const reload = useCallback(() => setLoadKey(k => k + 1), []);

  useEffect(() => {
    if (!transactionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    mockTransactionDetailService.getTransaction(transactionId).then(result => {
      if (cancelled) return;
      if (!result) {
        setTxn(null);
        setError("not-found");
      } else {
        setTxn(result);
        setError(null);
      }
    }).catch(() => {
      if (!cancelled) setError("load-error");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [transactionId, loadKey]);

  // Tab active detection
  const base = `/app/documents/${transactionId}`;
  const isActive = (suffix: string) => {
    if (suffix === "") return location.pathname === base || location.pathname === base + "/";
    return location.pathname.startsWith(base + suffix);
  };

  // Tab visibility
  const TAB_LINKS = [
    { label: "Overview",     icon: <FileText size={14} />,  to: base,                    suffix: "" },
    { label: "Participants", icon: <Users size={14} />,     to: `${base}/participants`,  suffix: "/participants" },
    { label: "Activity",     icon: <Activity size={14} />,  to: `${base}/activity`,      suffix: "/activity" },
    { label: "Evidence",     icon: <Shield size={14} />,    to: `${base}/evidence`,      suffix: "/evidence",   hidden: !canVerify && !canAudit },
    { label: "Settings",     icon: <Settings size={14} />,  to: `${base}/settings`,      suffix: "/settings",   hidden: !canPrepare && txn?.status !== "completed" },
  ];

  const actions = txn ? resolveActions(txn, canPrepare, canVerify, canAudit) : [];

  if (loading) {
    return (
      <div>
        <style>{TXN_STYLES}</style>
        <TxnSkeleton />
      </div>
    );
  }

  if (error === "not-found" || !txn) {
    return (
      <div>
        <style>{TXN_STYLES}</style>
        <AppContent>
          <div style={{ textAlign: "center", padding: "64px 24px", ...GF }}>
            <FileText size={48} style={{ color: "#CBD5E1", marginBottom: 16 }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: NAVY, margin: "0 0 8px" }}>Transaction not found</h2>
            <p style={{ color: "#64748B", fontSize: 14, marginBottom: 24 }}>
              This transaction may have been removed or you may not have access to it.
            </p>
            <button className="txn-btn txn-btn-secondary" onClick={() => navigate("/app/documents")}>
              <ArrowLeft size={14} /> Back to Documents
            </button>
          </div>
        </AppContent>
      </div>
    );
  }

  if (error === "load-error") {
    return (
      <div>
        <style>{TXN_STYLES}</style>
        <AppContent>
          <div style={{ textAlign: "center", padding: "64px 24px", ...GF }}>
            <AlertTriangle size={48} style={{ color: "#F59E0B", marginBottom: 16 }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: NAVY, margin: "0 0 8px" }}>Unable to load transaction</h2>
            <p style={{ color: "#64748B", fontSize: 14, marginBottom: 24 }}>
              An error occurred while loading this transaction. Please try again.
            </p>
            <button className="txn-btn txn-btn-primary" onClick={reload}>
              <RefreshCw size={14} /> Try Again
            </button>
          </div>
        </AppContent>
      </div>
    );
  }

  const outletCtx: TxnOutletContext = { txn, actions, canPrepare, canVerify, canAudit, reload };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <style>{TXN_STYLES}</style>
      <PageHeader
        compact
        title={txn.title}
        status={<StatusBadge status={txn.status} />}
        breadcrumbs={[
          { label: "Documents", to: "/app/documents" },
          { label: txn.title },
        ]}
        secondaryActions={
          <button className="txn-btn txn-btn-secondary" onClick={() => navigate("/app/documents")}
            aria-label="Back to Documents">
            <ArrowLeft size={14} />
            <span className="txn-desktop-only">Documents</span>
          </button>
        }
        tabs={
          <nav aria-label="Transaction sections">
            <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto" }}>
              {TAB_LINKS.filter(t => !t.hidden).map(t => (
                <Link
                  key={t.suffix}
                  to={t.to}
                  className={`txn-tab-link${isActive(t.suffix) ? " active" : ""}`}
                  aria-current={isActive(t.suffix) ? "page" : undefined}
                  style={{ color: isActive(t.suffix) ? AZURE : "#64748B", ...GF }}
                >
                  <span aria-hidden>{t.icon}</span>
                  {t.label}
                </Link>
              ))}
            </div>
          </nav>
        }
      />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <Outlet context={outletCtx} />
      </div>
    </div>
  );
}

// ── OverviewTab ───────────────────────────────────────────────────────────────

export function OverviewTab() {
  const { txn, actions, canPrepare, reload } = useTxnContext();
  const navigate = useNavigate();

  const base = `/app/documents/${txn.id}`;

  function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="txn-card" style={{ marginBottom: 16 }}>
        <div style={{ padding: "16px 20px 0", borderBottom: "1px solid #F1F5F9" }}>
          <p className="txn-section-title">{title}</p>
        </div>
        <div style={{ padding: "16px 20px" }}>{children}</div>
      </div>
    );
  }

  const chip = statusChip(txn.status);
  const isActive = ["sent","delivered","viewed","authentication-completed","awaiting-signature","awaiting-approval","partially-completed"].includes(txn.status);
  const needsAttention = txn.isMyAction;

  return (
    <AppContent>
      {/* Needs Attention Banner */}
      {needsAttention && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "12px 16px",
          display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16, ...GF }}>
          <AlertTriangle size={16} style={{ color: GOLD, flexShrink: 0, marginTop: 2 }} />
          <div>
            <span style={{ fontWeight: 600, color: "#92400E", fontSize: 14 }}>Action required</span>
            <span style={{ color: "#92400E", fontSize: 14 }}> — This transaction requires your attention.</span>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        {/* Status summary */}
        <SectionCard title="Status">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
            <DetailField label="Status"><StatusBadge status={txn.status} /></DetailField>
            <DetailField label="Created">{fmtDate(txn.createdAt)}</DetailField>
            {txn.sentAt && <DetailField label="Sent">{fmtDate(txn.sentAt)}</DetailField>}
            {txn.completedAt && <DetailField label="Completed">{fmtDate(txn.completedAt)}</DetailField>}
            {txn.expiresAt && (
              <DetailField label={txn.expiration.isExpired ? "Expired" : "Expires"}>
                <span style={{ color: txn.expiration.isExpired ? "#991B1B" : "#64748B" }}>{fmtDate(txn.expiresAt)}</span>
              </DetailField>
            )}
            <DetailField label="Routing">{ROUTING_MODE_LABELS[txn.routingMode]}</DetailField>
            <DetailField label="Workspace">{txn.workspaceName}</DetailField>
            <DetailField label="Owner">{txn.ownerName}</DetailField>
          </div>
        </SectionCard>

        {/* Participant progress */}
        <SectionCard title="Participants">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ ...GF, fontSize: 13, color: "#64748B" }}>
              {txn.participants.filter(p => p.actionState === "completed" || p.actionState === "approved").length} of {txn.participants.length} completed
            </span>
            <Link to={`${base}/participants`} style={{ ...GF, fontSize: 13, color: AZURE, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              View all <ChevronRight size={12} />
            </Link>
          </div>
          {/* Progress bar */}
          {(() => {
            const done = txn.participants.filter(p => p.actionState === "completed" || p.actionState === "approved").length;
            const pct = txn.participants.length > 0 ? Math.round((done / txn.participants.length) * 100) : 0;
            return (
              <div style={{ marginBottom: 16 }}>
                <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
                  aria-label={`${pct}% of participants completed`}
                  style={{ height: 6, background: "#E2E8F0", borderRadius: 9999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#16A34A" : AZURE,
                    borderRadius: 9999, transition: "width 0.3s" }} />
                </div>
              </div>
            );
          })()}
          {/* Participant list preview — up to 4 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {txn.participants.slice(0, 4).map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, ...GF }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#EFF6FF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, color: AZURE, flexShrink: 0 }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>{PARTICIPANT_ROLE_LABELS[p.role]}</div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 100,
                  background: ACTION_STATE_TONE[p.actionState] + "18",
                  color: ACTION_STATE_TONE[p.actionState],
                }}>
                  {PARTICIPANT_ACTION_LABELS[p.actionState]}
                </span>
              </div>
            ))}
            {txn.participants.length > 4 && (
              <Link to={`${base}/participants`} style={{ ...GF, fontSize: 13, color: AZURE, textDecoration: "none" }}>
                +{txn.participants.length - 4} more participants
              </Link>
            )}
          </div>
        </SectionCard>

        {/* Files */}
        <SectionCard title="Files">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {txn.files.map(f => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                borderBottom: "1px solid #F1F5F9", ...GF }}>
                <FileText size={18} style={{ color: AZURE, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, whiteSpace: "nowrap",
                    overflow: "hidden", textOverflow: "ellipsis" }}>{f.displayTitle}</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>
                    {f.pageCount} page{f.pageCount !== 1 ? "s" : ""} · {fmtBytes(f.fileSizeBytesApprox)}
                    {f.isPrimary && <span style={{ marginLeft: 6, background: "#EFF6FF", color: AZURE,
                      padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>Primary</span>}
                  </div>
                </div>
                {f.integrityState === "recorded" && (
                  <span style={{ fontSize: 11, color: "#166534", display: "flex", alignItems: "center", gap: 3 }}>
                    <CheckCircle size={12} /> Recorded
                  </span>
                )}
                {f.integrityState === "mismatch-demo" && (
                  <span style={{ fontSize: 11, color: "#991B1B", display: "flex", alignItems: "center", gap: 3 }}>
                    <AlertTriangle size={12} /> Demo mismatch
                  </span>
                )}
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Recent Activity (last 3 events) */}
        <SectionCard title="Recent Activity">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <Link to={`${base}/activity`} style={{ ...GF, fontSize: 13, color: AZURE, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              Full history <ChevronRight size={12} />
            </Link>
          </div>
          <div>
            {txn.activity.slice(0, 3).map(ev => (
              <ActivityEventRow key={ev.id} event={ev} compact />
            ))}
            {txn.activity.length === 0 && (
              <p style={{ ...GF, color: "#94A3B8", fontSize: 14, margin: 0 }}>No activity recorded yet.</p>
            )}
          </div>
        </SectionCard>

        {/* Verification record */}
        {txn.verificationRecord.verificationId && (
          <SectionCard title="Verification">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
              <DetailField label="Verification ID">
                <span style={{ ...GF, fontSize: 13, fontFamily: "monospace", color: NAVY }}>
                  {txn.verificationRecord.verificationId}
                </span>
              </DetailField>
              <DetailField label="Record Status">
                {txn.verificationRecord.recordStatus === "available"
                  ? <span style={{ color: "#166534", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}><CheckCircle size={13} /> Available</span>
                  : <span style={{ color: "#64748B", fontSize: 13 }}>{txn.verificationRecord.recordStatus}</span>
                }
              </DetailField>
              {txn.verificationRecord.completedAt && (
                <DetailField label="Recorded At">{fmtDate(txn.verificationRecord.completedAt)}</DetailField>
              )}
            </div>
            <p style={{ ...GF, fontSize: 12, color: "#94A3B8", margin: "12px 0 0" }}>
              Verification records are provided for reference. This is a demonstration — verification
              results here do not reflect a live or certified verification service.
            </p>
          </SectionCard>
        )}

        {/* Completion record */}
        {txn.completionRecord && (
          <SectionCard title="Completion Record">
            <div style={{ ...GF, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <CheckCircle size={16} style={{ color: "#16A34A" }} />
                <span style={{ fontWeight: 700, color: "#166534", fontSize: 14 }}>Transaction Completed</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                {txn.completionRecord.completedAt && (
                  <DetailField label="Completed At">{fmtDateTime(txn.completionRecord.completedAt)}</DetailField>
                )}
                <DetailField label="Participants">
                  {txn.completionRecord.completedParticipantCount} of {txn.completionRecord.participantCount}
                </DetailField>
                <DetailField label="Files">{txn.completionRecord.fileCount}</DetailField>
              </div>
            </div>
            <p style={{ ...GF, fontSize: 12, color: "#94A3B8", margin: "10px 0 0" }}>
              This completion record is a summary generated in this demonstration.
              It does not constitute a legal certificate or court-admissible document.
            </p>
          </SectionCard>
        )}

        {/* Reminders / Expiration */}
        {isActive && (txn.reminder.enabled || txn.expiration.enabled) && (
          <SectionCard title="Automation">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, ...GF }}>
              {txn.reminder.enabled && (
                <DetailField label="Reminders">
                  Every {txn.reminder.intervalDays} day{txn.reminder.intervalDays !== 1 ? "s" : ""}
                  {txn.reminder.nextScheduledAt && ` · Next: ${fmtDate(txn.reminder.nextScheduledAt)}`}
                </DetailField>
              )}
              {txn.expiration.enabled && txn.expiresAt && (
                <DetailField label="Expiration">
                  {fmtDate(txn.expiresAt)}
                  {txn.expiration.isExpired && <span style={{ color: "#991B1B", marginLeft: 6 }}>Expired</span>}
                </DetailField>
              )}
            </div>
          </SectionCard>
        )}

        {/* Tags */}
        {txn.tags.length > 0 && (
          <SectionCard title="Tags">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {txn.tags.map(t => (
                <span key={t.id} style={{
                  ...GF, fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 100,
                  background: t.color + "22", color: t.color, border: `1px solid ${t.color}44`,
                }}>
                  {t.name}
                </span>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Quick actions */}
        {canPrepare && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {isActionAvailable(actions, "continue-draft") && (
              <button className="txn-btn txn-btn-primary" onClick={() => navigate(`/app/prepare?txn=${txn.id}`)}>
                Continue Draft
              </button>
            )}
            {isActionAvailable(actions, "resend-invitation") && (
              <button className="txn-btn txn-btn-secondary" onClick={() => reload()}>
                <RefreshCw size={14} /> Resend Invitations (Demo)
              </button>
            )}
            <Link to={`${base}/settings`} className="txn-btn txn-btn-secondary" style={{ textDecoration: "none" }}>
              <Settings size={14} /> Settings
            </Link>
          </div>
        )}
      </div>
    </AppContent>
  );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 120, ...GF }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: NAVY }}>{children}</div>
    </div>
  );
}

// ── ParticipantsTab ───────────────────────────────────────────────────────────

export function ParticipantsTab() {
  const { txn } = useTxnContext();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (txn.status === "draft") {
    return (
      <AppContent>
        <div style={{ textAlign: "center", padding: "48px 24px", ...GF }}>
          <Users size={40} style={{ color: "#CBD5E1", marginBottom: 12 }} />
          <p style={{ color: "#64748B", fontSize: 14 }}>Participants are added during document preparation.</p>
        </div>
      </AppContent>
    );
  }

  return (
    <AppContent>
      <h2 style={{ ...GF, fontSize: 16, fontWeight: 700, color: NAVY, margin: "0 0 4px" }}>Participants</h2>
      <p style={{ ...GF, fontSize: 13, color: "#64748B", margin: "0 0 20px" }}>
        Email addresses are masked for privacy. Contact details are visible to workspace owners only.
      </p>

      {/* Desktop table */}
      <div className="txn-desktop-only">
        <div style={{ overflowX: "auto" }}>
          <table role="table" style={{ width: "100%", borderCollapse: "collapse", ...GF }}>
            <thead role="rowgroup">
              <tr role="row" style={{ borderBottom: "2px solid #E2E8F0" }}>
                {["Name", "Role", "Step", "Delivery", "Status", "Auth"].map(h => (
                  <th key={h} role="columnheader" scope="col"
                    style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700,
                      color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {h}
                  </th>
                ))}
                <th role="columnheader" scope="col" style={{ width: 32 }} />
              </tr>
            </thead>
            <tbody role="rowgroup">
              {txn.participants.map(p => (
                <>
                  <tr key={p.id} role="row" className="txn-expand-row"
                    tabIndex={0}
                    aria-expanded={expanded.has(p.id)}
                    onClick={() => toggleExpand(p.id)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(p.id); } }}
                    style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td role="cell" style={{ padding: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#EFF6FF",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700, color: AZURE, flexShrink: 0 }}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: NAVY }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: "#94A3B8" }}>{p.emailMasked}</div>
                        </div>
                      </div>
                    </td>
                    <td role="cell" style={{ padding: "12px", fontSize: 13, color: "#475569" }}>
                      {PARTICIPANT_ROLE_LABELS[p.role]}
                      {!p.isRequired && <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: 4 }}>(opt)</span>}
                    </td>
                    <td role="cell" style={{ padding: "12px", fontSize: 13, color: "#475569" }}>
                      {p.routingStep}
                    </td>
                    <td role="cell" style={{ padding: "12px" }}>
                      <span style={{ fontSize: 12, color: DELIVERY_STATE_TONE[p.deliveryState] }}>
                        {PARTICIPANT_DELIVERY_LABELS[p.deliveryState]}
                      </span>
                    </td>
                    <td role="cell" style={{ padding: "12px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 100,
                        background: ACTION_STATE_TONE[p.actionState] + "18",
                        color: ACTION_STATE_TONE[p.actionState],
                      }}>
                        {PARTICIPANT_ACTION_LABELS[p.actionState]}
                      </span>
                    </td>
                    <td role="cell" style={{ padding: "12px", fontSize: 12, color: "#64748B" }}>
                      {p.authSummary.length === 0
                        ? "None"
                        : p.authSummary.map(a => AUTH_METHOD_LABELS[a.method]).join(", ")}
                    </td>
                    <td role="cell" style={{ padding: "12px", textAlign: "right" }}>
                      {expanded.has(p.id) ? <ChevronUp size={14} style={{ color: "#94A3B8" }} /> : <ChevronDown size={14} style={{ color: "#94A3B8" }} />}
                    </td>
                  </tr>
                  {expanded.has(p.id) && (
                    <tr key={`${p.id}-detail`} role="row">
                      <td role="cell" colSpan={7} style={{ padding: "0 12px 16px 52px", background: "#F8FAFC" }}>
                        <ParticipantDetail participant={p} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="txn-mobile-only">
        {txn.participants.map(p => (
          <div key={p.id} className="txn-card" style={{ marginBottom: 12 }}>
            <button onClick={() => toggleExpand(p.id)}
              aria-expanded={expanded.has(p.id)}
              style={{ width: "100%", background: "none", border: "none", cursor: "pointer",
                padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#EFF6FF",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: AZURE, flexShrink: 0 }}>
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0, ...GF }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: NAVY }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "#64748B" }}>{PARTICIPANT_ROLE_LABELS[p.role]}</div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 100,
                background: ACTION_STATE_TONE[p.actionState] + "18",
                color: ACTION_STATE_TONE[p.actionState], flexShrink: 0,
              }}>
                {PARTICIPANT_ACTION_LABELS[p.actionState]}
              </span>
              {expanded.has(p.id) ? <ChevronUp size={14} style={{ color: "#94A3B8" }} /> : <ChevronDown size={14} style={{ color: "#94A3B8" }} />}
            </button>
            {expanded.has(p.id) && (
              <div style={{ padding: "0 16px 16px", borderTop: "1px solid #F1F5F9" }}>
                <ParticipantDetail participant={p} />
              </div>
            )}
          </div>
        ))}
      </div>
    </AppContent>
  );
}

function ParticipantDetail({ participant: p }: { participant: ReturnType<typeof useTxnContext>["txn"]["participants"][0] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 20, paddingTop: 12, ...GF }}>
      {p.invitedAt   && <DetailField label="Invited">{fmtDateTime(p.invitedAt)}</DetailField>}
      {p.viewedAt    && <DetailField label="Viewed">{fmtDateTime(p.viewedAt)}</DetailField>}
      {p.completedAt && <DetailField label="Completed">{fmtDateTime(p.completedAt)}</DetailField>}
      {p.declinedAt  && <DetailField label="Declined">{fmtDateTime(p.declinedAt)}</DetailField>}
      {p.failedAt    && <DetailField label="Failed">{fmtDateTime(p.failedAt)}</DetailField>}
      <DetailField label="Fields assigned">{p.assignedFieldCount}</DetailField>
      {p.authSummary.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Authentication
          </div>
          {p.authSummary.map((a, i) => (
            <div key={i} style={{ fontSize: 13, color: "#475569", display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              {a.state === "completed"
                ? <CheckCircle size={12} style={{ color: "#16A34A" }} />
                : a.state === "failed"
                ? <XCircle size={12} style={{ color: "#DC2626" }} />
                : <Clock size={12} style={{ color: "#94A3B8" }} />}
              {AUTH_METHOD_LABELS[a.method]}
              {a.completedAt && <span style={{ color: "#94A3B8" }}>· {fmtDate(a.completedAt)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ActivityTab ───────────────────────────────────────────────────────────────

const SEV_ICON: Record<string, React.ReactNode> = {
  success: <CheckCircle size={14} style={{ color: "#16A34A" }} />,
  warning: <AlertTriangle size={14} style={{ color: "#D97706" }} />,
  error:   <XCircle size={14} style={{ color: "#DC2626" }} />,
  info:    <Info size={14} style={{ color: "#0369A1" }} />,
};

function ActivityEventRow({ event: ev, compact }: { event: ActivityEvent; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ paddingBottom: compact ? 12 : 0 }}>
      <button onClick={() => !compact && setOpen(o => !o)}
        style={{ width: "100%", background: "none", border: "none", cursor: compact ? "default" : "pointer",
          textAlign: "left", display: "flex", gap: 10, alignItems: "flex-start",
          padding: compact ? "0 0 8px" : "12px 0", borderBottom: "1px solid #F1F5F9" }}
        aria-expanded={!compact ? open : undefined}>
        <span style={{ marginTop: 1, flexShrink: 0 }}>{SEV_ICON[ev.severity]}</span>
        <div style={{ flex: 1, minWidth: 0, ...GF }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: NAVY }}>{ev.title}</div>
          {(!compact || true) && (
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, lineHeight: 1.4 }}>{ev.description}</div>
          )}
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span>{fmtDateTime(ev.timestamp)}</span>
            {ev.actorName && <span>· {ev.actorName}</span>}
          </div>
        </div>
        {!compact && (open ? <ChevronUp size={14} style={{ color: "#CBD5E1", flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: "#CBD5E1", flexShrink: 0 }} />)}
      </button>
      {!compact && open && (
        <div style={{ padding: "8px 0 12px 24px", ...GF }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <DetailField label="Category">{ev.category}</DetailField>
            <DetailField label="Actor">{ev.actorType === "system" ? "System" : (ev.actorName ?? "Unknown")}</DetailField>
            {ev.participantName && <DetailField label="Participant">{ev.participantName}</DetailField>}
          </div>
        </div>
      )}
    </div>
  );
}

export function ActivityTab() {
  const { txn } = useTxnContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawCat = searchParams.get("category") ?? "all";
  const rawSort = searchParams.get("sort") ?? "newest";
  const rawPage = parseInt(searchParams.get("page") ?? "1", 10);

  const category: ActivityEventCategory | "all" = VALID_ACTIVITY_CATEGORIES.includes(rawCat as ActivityEventCategory | "all")
    ? (rawCat as ActivityEventCategory | "all")
    : "all";
  const sort = rawSort === "oldest" ? "oldest" : "newest";
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  function setParam(key: string, value: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set(key, value);
      if (key !== "page") next.set("page", "1");
      return next;
    });
  }

  const filtered = txn.activity.filter(ev => category === "all" || ev.category === category);
  const sorted = sort === "newest" ? filtered : [...filtered].reverse();
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / ACTIVITY_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * ACTIVITY_PAGE_SIZE, safePage * ACTIVITY_PAGE_SIZE);

  const catCounts: Partial<Record<ActivityEventCategory | "all", number>> = { all: filtered.length };

  return (
    <AppContent>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ ...GF, fontSize: 16, fontWeight: 700, color: NAVY, margin: 0 }}>Activity Timeline</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label htmlFor="act-sort" style={{ ...GF, fontSize: 13, color: "#64748B" }}>Sort:</label>
          <select id="act-sort" value={sort} onChange={e => setParam("sort", e.target.value)}
            style={{ ...GF, fontSize: 13, border: "1.5px solid #E2E8F0", borderRadius: 6, padding: "6px 10px", background: "#fff" }}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ overflowX: "auto", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 4, minWidth: "max-content" }} role="group" aria-label="Filter by category">
          {(["all", ...VALID_ACTIVITY_CATEGORIES.filter(c => c !== "all")] as (ActivityEventCategory | "all")[]).map(cat => {
            const count = txn.activity.filter(e => cat === "all" || e.category === cat).length;
            if (count === 0 && cat !== "all") return null;
            const isActive = category === cat;
            return (
              <button key={cat} onClick={() => setParam("category", cat)}
                aria-pressed={isActive}
                style={{
                  ...GF, fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 100,
                  border: `1.5px solid ${isActive ? AZURE : "#E2E8F0"}`,
                  background: isActive ? AZURE : "#fff",
                  color: isActive ? "#fff" : "#64748B",
                  cursor: "pointer",
                }}>
                {ACTIVITY_CATEGORY_LABELS[cat]} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Event list */}
      {pageItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", ...GF, color: "#94A3B8", fontSize: 14 }}>
          No events in this category.
        </div>
      ) : (
        <div>
          {pageItems.map(ev => <ActivityEventRow key={ev.id} event={ev} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, ...GF }}>
          <span style={{ fontSize: 13, color: "#64748B" }}>
            Page {safePage} of {totalPages} · {total} event{total !== 1 ? "s" : ""}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="txn-btn txn-btn-secondary" disabled={safePage <= 1}
              onClick={() => setParam("page", String(safePage - 1))}>Prev</button>
            <button className="txn-btn txn-btn-secondary" disabled={safePage >= totalPages}
              onClick={() => setParam("page", String(safePage + 1))}>Next</button>
          </div>
        </div>
      )}
    </AppContent>
  );
}

// ── EvidenceTab ───────────────────────────────────────────────────────────────

export function EvidenceTab() {
  const { txn, canVerify, canAudit } = useTxnContext();

  if (!canVerify && !canAudit) {
    return (
      <AppContent>
        <div style={{ textAlign: "center", padding: "48px 24px", ...GF }}>
          <Shield size={40} style={{ color: "#CBD5E1", marginBottom: 12 }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: "0 0 8px" }}>Access restricted</h2>
          <p style={{ color: "#64748B", fontSize: 14 }}>You need Verifier or Auditor permissions to view evidence.</p>
        </div>
      </AppContent>
    );
  }

  return (
    <AppContent>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ ...GF, fontSize: 16, fontWeight: 700, color: NAVY, margin: "0 0 4px" }}>Evidence</h2>
          <p style={{ ...GF, fontSize: 13, color: "#64748B", margin: 0 }}>
            Evidence sections summarize recorded events. Raw audit data is accessible to authorized administrators only.
          </p>
        </div>
        {isActionAvailable([{ action: "copy-verification-id", available: !!txn.verificationRecord.verificationId, reason: undefined }], "copy-verification-id") && (
          <button className="txn-btn txn-btn-secondary" onClick={() => {
            if (txn.verificationRecord.verificationId) {
              navigator.clipboard.writeText(txn.verificationRecord.verificationId).catch(() => {});
            }
          }}>
            <Copy size={13} /> Copy Verification ID
          </button>
        )}
      </div>

      {/* Completion Record */}
      {txn.completionRecord?.evidenceAvailable && (
        <div className="txn-card" style={{ marginBottom: 16, padding: "16px 20px", background: "#F0FDF4", borderColor: "#BBF7D0" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", ...GF }}>
            <CheckCircle size={18} style={{ color: "#16A34A", flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 700, color: "#166534", fontSize: 14, marginBottom: 4 }}>Completion evidence recorded</div>
              <div style={{ fontSize: 13, color: "#166534" }}>
                {txn.completionRecord.completedParticipantCount} of {txn.completionRecord.participantCount} participants completed.
                {txn.verificationRecord.verificationId && (
                  <> Verification ID: <span style={{ fontFamily: "monospace" }}>{txn.verificationRecord.verificationId}</span></>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evidence sections */}
      {txn.evidenceSections.map(section => {
        const canView = section.privacyLevel === "public-summary"
          || (section.privacyLevel === "authorized-standard" && canVerify)
          || (section.privacyLevel === "authorized-audit" && canAudit);

        return (
          <div key={section.id} className="txn-card" style={{ marginBottom: 12 }}>
            <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, ...GF }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: NAVY }}>{section.title}</div>
                {!section.available && section.unavailableReason && (
                  <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{section.unavailableReason}</div>
                )}
              </div>
              <div>
                {!section.available ? (
                  <span style={{ fontSize: 12, color: "#94A3B8", display: "flex", alignItems: "center", gap: 4 }}>
                    <Info size={12} /> Not available
                  </span>
                ) : !canView ? (
                  <span style={{ fontSize: 12, color: "#64748B", display: "flex", alignItems: "center", gap: 4 }}>
                    <Shield size={12} /> Restricted
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: "#166534", display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle size={12} /> Recorded
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Device / network summary (privacy-safe aggregate only) */}
      {canAudit && txn.deviceNetworkSummaries.length > 0 && (
        <div className="txn-card" style={{ marginTop: 20 }}>
          <div style={{ padding: "16px 20px 0", borderBottom: "1px solid #F1F5F9" }}>
            <p className="txn-section-title">Device & Network Summary</p>
          </div>
          <div style={{ padding: "14px 20px" }}>
            <p style={{ ...GF, fontSize: 12, color: "#94A3B8", marginBottom: 12 }}>
              Aggregate device and network region summaries only. Exact IP addresses, precise location coordinates,
              and individual device identifiers are not displayed here. This is demonstration data.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table role="table" style={{ width: "100%", borderCollapse: "collapse", ...GF, fontSize: 13 }}>
                <thead role="rowgroup">
                  <tr role="row">
                    {["Device", "Browser", "OS", "Network Region", "Timestamp"].map(h => (
                      <th key={h} role="columnheader" scope="col" style={{ padding: "8px 12px", textAlign: "left",
                        fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase",
                        letterSpacing: "0.06em", borderBottom: "1px solid #E2E8F0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {txn.deviceNetworkSummaries.map((d, i) => (
                    <tr key={i} role="row" style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td role="cell" style={{ padding: "10px 12px", color: NAVY }}>{d.deviceCategory}</td>
                      <td role="cell" style={{ padding: "10px 12px", color: "#475569" }}>{d.browserCategory}</td>
                      <td role="cell" style={{ padding: "10px 12px", color: "#475569" }}>{d.osCategory}</td>
                      <td role="cell" style={{ padding: "10px 12px", color: "#475569" }}>{d.networkRegion}</td>
                      <td role="cell" style={{ padding: "10px 12px", color: "#94A3B8" }}>{fmtDateTime(d.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {txn.evidenceSections.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", ...GF, color: "#94A3B8", fontSize: 14 }}>
          No evidence sections are available for this transaction.
        </div>
      )}

      <p style={{ ...GF, fontSize: 12, color: "#94A3B8", marginTop: 20, lineHeight: 1.6 }}>
        Evidence records shown here are for demonstration purposes only. They do not constitute
        legally certified audit outputs. Some documents may still require wet signatures, notarization,
        personal appearance, witnesses, or other legal formalities. Users remain responsible for
        determining the requirements that apply to each transaction.
      </p>
    </AppContent>
  );
}

// ── SettingsTab ───────────────────────────────────────────────────────────────

export function SettingsTab() {
  const { txn, actions, canPrepare, reload } = useTxnContext();
  const navigate = useNavigate();

  // Rename
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(txn.title);
  const [renameSaving, setRenameSaving] = useState(false);
  const [renameMsg, setRenameMsg] = useState<string | null>(null);

  // Reminders
  const [remindEnabled, setRemindEnabled] = useState(txn.reminder.enabled);
  const [remindDays, setRemindDays] = useState(txn.reminder.intervalDays);
  const [remindSaving, setRemindSaving] = useState(false);
  const [remindMsg, setRemindMsg] = useState<string | null>(null);

  // Expiration
  const [expEnabled, setExpEnabled] = useState(txn.expiration.enabled);
  const [expDate, setExpDate] = useState(txn.expiresAt ? txn.expiresAt.slice(0, 10) : "");
  const [expSaving, setExpSaving] = useState(false);
  const [expMsg, setExpMsg] = useState<string | null>(null);

  // Archive confirm
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);

  // Restore confirm
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);

  const canRename     = isActionAvailable(actions, "rename");
  const canRemind     = isActionAvailable(actions, "edit-reminders");
  const canExpiration = isActionAvailable(actions, "edit-expiration");
  const canArchive    = isActionAvailable(actions, "archive");
  const canRestore    = isActionAvailable(actions, "restore");
  const canCancel     = isActionAvailable(actions, "cancel");

  async function saveRename() {
    if (!renameValue.trim()) return;
    setRenameSaving(true);
    setRenameMsg(null);
    try {
      await mockTransactionDetailService.renameTransaction(txn.id, renameValue);
      setRenameMsg("Title updated in this demonstration.");
      setRenaming(false);
      reload();
    } catch (e: unknown) {
      setRenameMsg(e instanceof Error ? e.message : "Unable to rename.");
    } finally {
      setRenameSaving(false);
    }
  }

  async function saveReminders() {
    setRemindSaving(true);
    setRemindMsg(null);
    try {
      const settings: ReminderSettings = { enabled: remindEnabled, intervalDays: remindDays };
      await mockTransactionDetailService.updateReminders(txn.id, settings);
      setRemindMsg("Reminder settings updated in this demonstration.");
      reload();
    } catch {
      setRemindMsg("Unable to update reminders.");
    } finally {
      setRemindSaving(false);
    }
  }

  async function saveExpiration() {
    setExpSaving(true);
    setExpMsg(null);
    try {
      const settings: ExpirationSettings = {
        enabled: expEnabled,
        expiresAt: expEnabled && expDate ? new Date(expDate).toISOString() : undefined,
        isExpired: txn.expiration.isExpired,
      };
      await mockTransactionDetailService.updateExpiration(txn.id, settings);
      setExpMsg("Expiration updated in this demonstration.");
      reload();
    } catch {
      setExpMsg("Unable to update expiration.");
    } finally {
      setExpSaving(false);
    }
  }

  async function doArchive() {
    setArchiveBusy(true);
    try {
      await mockTransactionDetailService.archive(txn.id);
      setArchiveOpen(false);
      reload();
    } catch { /* ignore */ } finally {
      setArchiveBusy(false);
    }
  }

  async function doRestore() {
    setRestoreBusy(true);
    try {
      await mockTransactionDetailService.restore(txn.id);
      setRestoreOpen(false);
      reload();
    } catch { /* ignore */ } finally {
      setRestoreBusy(false);
    }
  }

  async function doCancel() {
    if (!cancelReason.trim()) return;
    setCancelBusy(true);
    try {
      await mockTransactionDetailService.cancelTransaction(txn.id, cancelReason);
      setCancelOpen(false);
      reload();
    } catch { /* ignore */ } finally {
      setCancelBusy(false);
    }
  }

  function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="txn-card" style={{ marginBottom: 16 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9" }}>
          <p className="txn-section-title">{title}</p>
        </div>
        <div style={{ padding: "16px 20px" }}>{children}</div>
      </div>
    );
  }

  function Toast({ msg }: { msg: string }) {
    return (
      <p role="status" aria-live="polite" style={{ ...GF, fontSize: 13, color: "#166534",
        background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 6, padding: "8px 12px", margin: "10px 0 0" }}>
        {msg}
      </p>
    );
  }

  return (
    <AppContent style={{ maxWidth: 660 }}>
      <h2 style={{ ...GF, fontSize: 16, fontWeight: 700, color: NAVY, margin: "0 0 20px" }}>Transaction Settings</h2>

      {/* Rename */}
      <SettingsSection title="Title">
        {!renaming ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ ...GF, fontSize: 15, fontWeight: 600, color: NAVY }}>{txn.title}</span>
            {canRename && (
              <button className="txn-btn txn-btn-secondary"
                onClick={() => { setRenaming(true); setRenameValue(txn.title); setRenameMsg(null); }}>
                <Pencil size={13} /> Rename
              </button>
            )}
          </div>
        ) : (
          <div>
            <label htmlFor="txn-rename" style={{ ...GF, fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
              New title
            </label>
            <input id="txn-rename" className="txn-input" style={{ ...GF }} value={renameValue}
              onChange={e => setRenameValue(e.target.value.slice(0, 200))}
              maxLength={200} placeholder="Transaction title" disabled={renameSaving} />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="txn-btn txn-btn-primary" onClick={saveRename} disabled={renameSaving || !renameValue.trim()}>
                {renameSaving ? "Saving…" : "Save"}
              </button>
              <button className="txn-btn txn-btn-secondary" onClick={() => setRenaming(false)} disabled={renameSaving}>Cancel</button>
            </div>
            {renameMsg && <Toast msg={renameMsg} />}
          </div>
        )}
      </SettingsSection>

      {/* Folder & Tags */}
      <SettingsSection title="Folder & Tags">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, ...GF }}>
          <DetailField label="Folders">
            {txn.folderNames.length > 0
              ? txn.folderNames.join(", ")
              : <span style={{ color: "#94A3B8" }}>No folder</span>}
          </DetailField>
          <DetailField label="Tags">
            {txn.tags.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {txn.tags.map(t => (
                  <span key={t.id} style={{
                    fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 100,
                    background: t.color + "22", color: t.color, border: `1px solid ${t.color}44`,
                  }}>{t.name}</span>
                ))}
              </div>
            ) : <span style={{ color: "#94A3B8" }}>No tags</span>}
          </DetailField>
        </div>
        <p style={{ ...GF, fontSize: 12, color: "#94A3B8", margin: "12px 0 0" }}>
          Folder and tag management is available from the Documents workspace.
        </p>
      </SettingsSection>

      {/* Reminders */}
      {(canRemind || txn.reminder.enabled) && (
        <SettingsSection title="Reminders">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <input type="checkbox" id="remind-enabled" checked={remindEnabled}
              onChange={e => setRemindEnabled(e.target.checked)} disabled={!canRemind || remindSaving}
              style={{ width: 16, height: 16, cursor: canRemind ? "pointer" : "default" }} />
            <label htmlFor="remind-enabled" style={{ ...GF, fontSize: 14, color: NAVY, cursor: canRemind ? "pointer" : "default" }}>
              Send automatic reminders
            </label>
          </div>
          {remindEnabled && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <label htmlFor="remind-days" style={{ ...GF, fontSize: 13, color: "#475569" }}>Every</label>
              <input id="remind-days" type="number" min={1} max={30} value={remindDays}
                onChange={e => setRemindDays(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                disabled={!canRemind || remindSaving}
                style={{ ...GF, width: 70, padding: "6px 10px", border: "1.5px solid #CBD5E1",
                  borderRadius: 6, fontSize: 14, outline: "none" }} />
              <span style={{ ...GF, fontSize: 13, color: "#475569" }}>day(s)</span>
            </div>
          )}
          {canRemind && (
            <button className="txn-btn txn-btn-secondary" onClick={saveReminders} disabled={remindSaving}>
              <Bell size={13} /> {remindSaving ? "Saving…" : "Save Reminder Settings"}
            </button>
          )}
          {!canRemind && (
            <p style={{ ...GF, fontSize: 12, color: "#94A3B8", margin: "4px 0 0" }}>
              {actions.find(a => a.action === "edit-reminders")?.reason ?? "Reminders cannot be changed for this transaction."}
            </p>
          )}
          {remindMsg && <Toast msg={remindMsg} />}
        </SettingsSection>
      )}

      {/* Expiration */}
      {(canExpiration || txn.expiration.enabled) && (
        <SettingsSection title="Expiration">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <input type="checkbox" id="exp-enabled" checked={expEnabled}
              onChange={e => setExpEnabled(e.target.checked)} disabled={!canExpiration || expSaving}
              style={{ width: 16, height: 16, cursor: canExpiration ? "pointer" : "default" }} />
            <label htmlFor="exp-enabled" style={{ ...GF, fontSize: 14, color: NAVY, cursor: canExpiration ? "pointer" : "default" }}>
              Set expiration date
            </label>
          </div>
          {expEnabled && (
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="exp-date" style={{ ...GF, fontSize: 13, color: "#475569", display: "block", marginBottom: 4 }}>
                Expires on
              </label>
              <input id="exp-date" type="date" value={expDate} onChange={e => setExpDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)} disabled={!canExpiration || expSaving}
                style={{ ...GF, padding: "7px 12px", border: "1.5px solid #CBD5E1", borderRadius: 6, fontSize: 14 }} />
            </div>
          )}
          {canExpiration && (
            <button className="txn-btn txn-btn-secondary" onClick={saveExpiration} disabled={expSaving}>
              <Calendar size={13} /> {expSaving ? "Saving…" : "Save Expiration"}
            </button>
          )}
          {!canExpiration && (
            <p style={{ ...GF, fontSize: 12, color: "#94A3B8", margin: "4px 0 0" }}>
              {actions.find(a => a.action === "edit-expiration")?.reason ?? "Expiration cannot be changed for this transaction."}
            </p>
          )}
          {expMsg && <Toast msg={expMsg} />}
        </SettingsSection>
      )}

      {/* Archive / Restore */}
      {(canArchive || canRestore) && (
        <SettingsSection title={canRestore ? "Restore" : "Archive"}>
          {canRestore ? (
            <>
              <p style={{ ...GF, fontSize: 14, color: "#475569", margin: "0 0 12px" }}>
                Restore this transaction from the archived view.
                {txn.preArchiveStatus && ` Status will return to: ${TRANSACTION_STATUS_LABELS[txn.preArchiveStatus]}.`}
              </p>
              <button className="txn-btn txn-btn-secondary" onClick={() => setRestoreOpen(true)}>
                <RotateCcw size={13} /> Restore Transaction
              </button>
            </>
          ) : (
            <>
              <p style={{ ...GF, fontSize: 14, color: "#475569", margin: "0 0 12px" }}>
                Move this transaction to the archived view. You can restore it at any time.
              </p>
              <button className="txn-btn txn-btn-secondary" onClick={() => setArchiveOpen(true)}>
                <Archive size={13} /> Archive Transaction
              </button>
            </>
          )}
        </SettingsSection>
      )}

      {/* Cancel */}
      {canCancel && (
        <SettingsSection title="Cancel Transaction">
          <p style={{ ...GF, fontSize: 14, color: "#475569", margin: "0 0 12px" }}>
            Cancelling will stop the signing workflow and notify all participants.
            This action cannot be undone.
          </p>
          <button className="txn-btn txn-btn-danger" onClick={() => setCancelOpen(true)}>
            <Ban size={13} /> Cancel Transaction
          </button>
        </SettingsSection>
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={archiveOpen}
        title="Archive this transaction?"
        body="This will move the transaction to your Archived view. You can restore it at any time."
        confirmLabel="Archive"
        loading={archiveBusy}
        onConfirm={doArchive}
        onCancel={() => setArchiveOpen(false)}
      />

      <ConfirmDialog
        open={restoreOpen}
        title="Restore this transaction?"
        body={`The transaction will be restored${txn.preArchiveStatus ? ` with status: ${TRANSACTION_STATUS_LABELS[txn.preArchiveStatus]}` : ""}.`}
        confirmLabel="Restore"
        loading={restoreBusy}
        onConfirm={doRestore}
        onCancel={() => setRestoreOpen(false)}
      />

      {/* Cancel dialog — needs reason input */}
      {cancelOpen && (
        <div role="dialog" aria-modal="true" aria-label="Cancel Transaction"
          style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={() => setCancelOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(7,17,31,0.4)" }} aria-hidden />
          <div style={{ position: "relative", background: "#fff", borderRadius: 12, padding: "24px 28px",
            maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(7,17,31,0.18)", ...GF }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#991B1B" }}>Cancel transaction?</h2>
            <p style={{ fontSize: 14, color: "#475569", marginBottom: 16 }}>
              This will stop the signing workflow and notify all participants. This cannot be undone.
            </p>
            <label htmlFor="cancel-reason" style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
              Reason (required)
            </label>
            <textarea id="cancel-reason" rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value.slice(0, 500))}
              placeholder="Enter the reason for cancelling…"
              style={{ ...GF, width: "100%", padding: "8px 12px", border: "1.5px solid #CBD5E1", borderRadius: 6,
                fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button className="txn-btn txn-btn-secondary" onClick={() => setCancelOpen(false)} disabled={cancelBusy}>Keep</button>
              <button className="txn-btn txn-btn-danger" onClick={doCancel} disabled={cancelBusy || !cancelReason.trim()}>
                {cancelBusy ? "Cancelling…" : "Cancel Transaction"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppContent>
  );
}

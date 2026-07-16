// Command 27 — Assignment Detail Page — /app/inbox/:requestId
// Shows full context for one recipient assignment and hands off to C20 signing flow.
// No backend, no storage. Privacy: single-user access only.

import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  ArrowLeft, PenLine, ThumbsUp, Eye, FileCheck, Mail,
  AlertCircle, Clock, Calendar, CheckCircle2, Lock,
  BookOpen, Shield, FileText, Info, ChevronRight,
  Building2, User,
} from "lucide-react";
import { AppContent, PageHeader } from "../../../components/platform";
import { inboxService } from "../../../services/mock/inbox.service";
import { usePageMeta } from "../../../hooks/usePageMeta";
import type { RecipientInboxItem } from "../../../models/inbox";
import type { RecipientParticipantRole } from "../../../models/recipient";

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
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
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

const ROLE_LABELS: Record<RecipientParticipantRole, string> = {
  "signer":                  "Signer",
  "approver":                "Approver",
  "reviewer":                "Reviewer",
  "acknowledgment-recipient":"Acknowledgment Recipient",
  "viewer":                  "Viewer",
  "copy-recipient":          "Copy Recipient",
};

const ROLE_DESCRIPTIONS: Record<RecipientParticipantRole, string> = {
  "signer":                  "You are required to sign fields assigned to you.",
  "approver":                "You are required to review and explicitly approve this document.",
  "reviewer":                "You are required to review this document and may leave comments.",
  "acknowledgment-recipient":"You are required to acknowledge that you have read this document.",
  "viewer":                  "You have been granted access to view this document. No action is required.",
  "copy-recipient":          "You have been sent a copy of this document for your records. No action is required.",
};

function RoleIcon({ role, size = 18 }: { role: RecipientParticipantRole; size?: number }) {
  switch (role) {
    case "signer":                  return <PenLine size={size} aria-hidden />;
    case "approver":                return <ThumbsUp size={size} aria-hidden />;
    case "reviewer":                return <Eye size={size} aria-hidden />;
    case "acknowledgment-recipient":return <FileCheck size={size} aria-hidden />;
    case "viewer":                  return <Eye size={size} aria-hidden />;
    case "copy-recipient":          return <Mail size={size} aria-hidden />;
  }
}

// ── Auth method display ───────────────────────────────────────────────────────

function authMethodLabel(method: RecipientInboxItem["authMethod"]): string {
  switch (method) {
    case "invitation-access":  return "Invitation link";
    case "email-code":         return "Email verification code";
    case "sms-code":           return "SMS verification code";
    case "authenticator":      return "Authenticator app (TOTP)";
    case "account-signin":     return "LAGDA account sign-in";
    case "enterprise-idp":     return "Enterprise identity provider";
    case "none":               return "No additional verification required";
  }
}

// ── Status display ────────────────────────────────────────────────────────────

type AssignmentStatus = RecipientInboxItem["assignmentStatus"];

const STATUS_LABELS: Record<AssignmentStatus, string> = {
  "action-required": "Awaiting My Action",
  "in-progress":     "In Progress",
  "upcoming":        "Upcoming",
  "completed":       "Completed",
  "unavailable":     "Unavailable",
};

const STATUS_COLORS: Record<AssignmentStatus, { bg: string; fg: string }> = {
  "action-required": { bg: "rgba(220,38,38,0.1)",  fg: RED },
  "in-progress":     { bg: "rgba(217,119,6,0.1)",  fg: AMBER },
  "upcoming":        { bg: "rgba(100,116,139,0.1)", fg: SLATE },
  "completed":       { bg: "rgba(22,163,74,0.1)",  fg: GREEN },
  "unavailable":     { bg: "rgba(138,155,174,0.1)", fg: SILVER },
};

function StatusBadge({ status }: { status: AssignmentStatus }) {
  const { bg, fg } = STATUS_COLORS[status];
  return (
    <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, background: bg, color: fg, ...GF, fontSize: 13, fontWeight: 600 }}>
      {STATUS_LABELS[status]}
    </span>
  );
}

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, padding: "10px 0", borderBottom: "1px solid #F1F5F9" }}>
      <span style={{ color: SILVER, ...GF, fontSize: 13, flexShrink: 0 }}>{label}</span>
      <span style={{ color: valueColor ?? NAVY, ...GF, fontSize: 13, fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({
  title, icon, children,
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      style={{
        background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 12,
        padding: "20px", marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ color: AZURE }}>{icon}</span>
        <h2 style={{ color: NAVY, ...GF, fontSize: 14, fontWeight: 700, margin: 0 }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  if (total === 0) return null;
  const pct = Math.min(100, Math.round((completed / total) * 100));
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: SLATE, ...GF, fontSize: 12 }}>{completed} of {total} fields completed</span>
        <span style={{ color: pct === 100 ? GREEN : AMBER, ...GF, fontSize: 12, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: "#E2E8F0", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? GREEN : AZURE, borderRadius: 3, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

// ── Primary action area ───────────────────────────────────────────────────────

function PrimaryActionArea({ item }: { item: RecipientInboxItem }) {
  const { assignmentStatus, role, handoffRequestId, statusReason } = item;

  if (assignmentStatus === "completed") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px", background: "rgba(22,163,74,0.05)", border: "1.5px solid rgba(22,163,74,0.2)", borderRadius: 12 }}>
        <CheckCircle2 size={20} color={GREEN} aria-hidden />
        <div>
          <p style={{ color: GREEN, ...GF, fontSize: 14, fontWeight: 700, margin: 0 }}>You have completed your required action</p>
          {item.completedAt && (
            <p style={{ color: SLATE, ...GF, fontSize: 12, margin: "3px 0 0" }}>
              Completed {formatDateTime(item.completedAt)}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (assignmentStatus === "unavailable") {
    const reasonText: Record<string, string> = {
      "expired":   "The signing deadline for this request has passed.",
      "cancelled": "This request was cancelled by the sender.",
      "voided":    "This request has been voided.",
    };
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "16px", background: "#FFF7ED", border: "1.5px solid rgba(217,119,6,0.2)", borderRadius: 12 }}>
        <AlertCircle size={20} color={AMBER} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ color: "#92400E", ...GF, fontSize: 14, fontWeight: 700, margin: 0 }}>This request is no longer available</p>
          <p style={{ color: "#B45309", ...GF, fontSize: 13, margin: "4px 0 0" }}>
            {reasonText[statusReason ?? ""] ?? "This request cannot be accessed."}
          </p>
        </div>
      </div>
    );
  }

  if (assignmentStatus === "upcoming") {
    const reasonText: Record<string, string> = {
      "routing-locked":    "This request is waiting for another participant to complete their action before your turn begins.",
      "not-yet-available": "This request is assigned to you but is not yet available — other participants must act first.",
    };
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "16px", background: "rgba(100,116,139,0.06)", border: "1.5px solid rgba(100,116,139,0.2)", borderRadius: 12 }}>
        <Clock size={20} color={SLATE} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ color: NAVY, ...GF, fontSize: 14, fontWeight: 700, margin: 0 }}>Not yet your turn</p>
          <p style={{ color: SLATE, ...GF, fontSize: 13, margin: "4px 0 0" }}>
            {reasonText[statusReason ?? "routing-locked"]}
          </p>
        </div>
      </div>
    );
  }

  // action-required or in-progress — show action button
  if (!handoffRequestId) {
    return (
      <div style={{ padding: "16px", background: "rgba(0,120,212,0.04)", border: "1.5px solid rgba(0,120,212,0.15)", borderRadius: 12 }}>
        <p style={{ color: SLATE, ...GF, fontSize: 13, margin: 0 }}>
          The signing flow for this request is not yet available in this demonstration.
        </p>
      </div>
    );
  }

  const actionLabel = (() => {
    if (assignmentStatus === "in-progress") return "Continue";
    switch (role) {
      case "signer":                  return "Sign Document";
      case "approver":                return "Review and Approve";
      case "reviewer":                return "Review Document";
      case "acknowledgment-recipient":return "Read and Acknowledge";
      case "viewer":                  return "View Document";
      case "copy-recipient":          return "View Document";
    }
  })();

  return (
    <div style={{ padding: "20px", background: assignmentStatus === "in-progress" ? "rgba(217,119,6,0.04)" : "rgba(0,120,212,0.04)", border: `1.5px solid ${assignmentStatus === "in-progress" ? "rgba(217,119,6,0.2)" : "rgba(0,120,212,0.15)"}`, borderRadius: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ color: NAVY, ...GF, fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>
            {assignmentStatus === "in-progress" ? "Continue your action" : "Your action is required"}
          </p>
          <p style={{ color: SLATE, ...GF, fontSize: 13, margin: 0 }}>
            You will be taken to the secure signing environment. Adopt your signature explicitly for each field.
          </p>
        </div>
        <Link
          to={`/sign/${handoffRequestId}`}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: assignmentStatus === "in-progress" ? AMBER : AZURE,
            color: "#fff", ...GF, fontSize: 14, fontWeight: 700,
            padding: "11px 20px", borderRadius: 8, textDecoration: "none",
            flexShrink: 0,
          }}
        >
          {actionLabel} <ChevronRight size={16} aria-hidden />
        </Link>
      </div>

      {/* Signature library direction — for signers/approvers */}
      {(role === "signer" || role === "approver") && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(0,120,212,0.1)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <BookOpen size={14} color={AZURE} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: SLATE, ...GF, fontSize: 12, margin: 0, lineHeight: 1.6 }}>
              <strong>Signature Library:</strong> Your saved signatures and initials are available in the signing environment. Open the signature field, then select "From Library" to choose a saved representation. Explicit adoption is required for each field — library entries are not applied automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AssignmentDetailPage() {
  usePageMeta();
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();

  const [item, setItem]     = useState<RecipientInboxItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!requestId) { setNotFound(true); setLoading(false); return; }
    const result = inboxService.getAssignment(requestId);
    if (!result.ok) {
      setNotFound(true);
    } else {
      setItem(result.data);
      // Mark as read on open
      inboxService.markAsRead(requestId);
    }
    setLoading(false);
  }, [requestId]);

  if (loading) {
    return (
      <>
        <PageHeader title="Loading…" />
        <AppContent style={{ maxWidth: 760 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 120, background: "#F1F5F9", borderRadius: 12, marginBottom: 16, animation: "inbox-pulse 1.4s ease-in-out infinite" }} />
          ))}
        </AppContent>
      </>
    );
  }

  if (notFound || !item) {
    return (
      <>
        <PageHeader title="Not Found" />
        <AppContent style={{ maxWidth: 760 }}>
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <AlertCircle size={36} color={SILVER} aria-hidden style={{ marginBottom: 16 }} />
            <h1 style={{ color: NAVY, ...GF, fontSize: 20, fontWeight: 800, margin: "0 0 10px" }}>Assignment not found</h1>
            <p style={{ color: SLATE, ...GF, fontSize: 14, margin: "0 0 24px" }}>
              This assignment does not exist or you do not have access to it.
            </p>
            <Link to="/app/inbox" style={{ color: AZURE, ...GF, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
              ← Return to My Actions
            </Link>
          </div>
        </AppContent>
      </>
    );
  }

  const dueSoon     = isDueSoon(item.dueAt);
  const dueOverdue  = isDueOverdue(item.dueAt);
  const dueColor    = dueOverdue ? RED : dueSoon ? AMBER : NAVY;

  return (
    <>
      <PageHeader
        title={item.documentTitle}
        description={`${item.documentCount > 1 ? `${item.documentCount} documents` : "1 document"} · Assigned by ${item.senderName}`}
        actions={
          <Link
            to="/app/inbox"
            style={{ display: "flex", alignItems: "center", gap: 6, color: SLATE, ...GF, fontSize: 13, textDecoration: "none" }}
          >
            <ArrowLeft size={14} aria-hidden /> My Actions
          </Link>
        }
      />

      <AppContent style={{ maxWidth: 760 }}>

        {/* Demo notice */}
        <div role="note" aria-label="Demonstration notice" style={{ marginBottom: 20, padding: "10px 14px", background: "rgba(0,120,212,0.04)", border: "1px solid rgba(0,120,212,0.12)", borderRadius: 10 }}>
          <p style={{ color: "#1E40AF", ...GF, fontSize: 12, margin: 0 }}>
            <strong>Demonstration.</strong> This is a fictional recipient assignment. No real signing invitation has been issued.
          </p>
        </div>

        {/* Status + role row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20, alignItems: "center" }}>
          <StatusBadge status={item.assignmentStatus} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, background: "#F1F5F9", color: SLATE, ...GF, fontSize: 13, fontWeight: 600 }}>
            <RoleIcon role={item.role} size={14} />
            {ROLE_LABELS[item.role]}
          </span>
        </div>

        {/* Primary action */}
        <div style={{ marginBottom: 20 }}>
          <PrimaryActionArea item={item} />
        </div>

        {/* Assignment overview */}
        <SectionCard title="Assignment Overview" icon={<Info size={16} />}>
          <p style={{ color: SLATE, ...GF, fontSize: 13, margin: "0 0 14px", lineHeight: 1.6 }}>
            {ROLE_DESCRIPTIONS[item.role]}
          </p>
          {item.documentDescription && (
            <p style={{ color: SLATE, ...GF, fontSize: 13, margin: "0 0 14px", lineHeight: 1.6 }}>
              {item.documentDescription}
            </p>
          )}
          <div>
            <InfoRow label="Assigned"   value={formatDateTime(item.assignedAt)} />
            {item.dueAt && (
              <InfoRow
                label={dueOverdue ? "Overdue since" : "Due by"}
                value={formatDate(item.dueAt)}
                valueColor={dueColor}
              />
            )}
            {item.completedAt && (
              <InfoRow label="Completed" value={formatDateTime(item.completedAt)} valueColor={GREEN} />
            )}
          </div>
        </SectionCard>

        {/* Sender and workspace */}
        <SectionCard title="Sent by" icon={<User size={16} />}>
          <InfoRow label="Sender"        value={item.senderName} />
          {item.senderOrganization && (
            <InfoRow label="Organization" value={item.senderOrganization} />
          )}
          <InfoRow label="Workspace"    value={item.workspaceName} />
        </SectionCard>

        {/* Documents */}
        <SectionCard title={item.documentCount > 1 ? `Documents (${item.documentCount})` : "Document"} icon={<FileText size={16} />}>
          {Array.from({ length: item.documentCount }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#F8FAFC", borderRadius: 8, marginBottom: i < item.documentCount - 1 ? 8 : 0 }}>
              <FileText size={16} color={AZURE} aria-hidden />
              <span style={{ color: NAVY, ...GF, fontSize: 13, fontWeight: 500 }}>
                {item.documentCount === 1 ? item.documentTitle : `${item.documentTitle} — Part ${i + 1}`}
              </span>
            </div>
          ))}
          <p style={{ color: SILVER, ...GF, fontSize: 12, margin: "10px 0 0" }}>
            Document contents are only accessible within the signing environment.
          </p>
        </SectionCard>

        {/* Field progress — for signers / approvers with fields */}
        {item.fieldCount > 0 && (
          <SectionCard title="Field Progress" icon={<PenLine size={16} />}>
            <ProgressBar completed={item.fieldCompleted} total={item.fieldCount} />
            {item.assignmentStatus === "in-progress" && item.fieldCompleted > 0 && (
              <p style={{ color: AMBER, ...GF, fontSize: 12, margin: "10px 0 0" }}>
                You have started this signing session. Continue to complete the remaining fields.
              </p>
            )}
            {item.assignmentStatus === "completed" && (
              <p style={{ color: GREEN, ...GF, fontSize: 12, margin: "10px 0 0" }}>
                All fields have been completed.
              </p>
            )}
          </SectionCard>
        )}

        {/* Routing */}
        {item.routingPosition !== null && item.totalRoutingPositions !== null && (
          <SectionCard title="Signing Order" icon={<Lock size={16} />}>
            <p style={{ color: SLATE, ...GF, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              You are participant <strong>{item.routingPosition}</strong> of {item.totalRoutingPositions} in the signing sequence.
              {item.routingPosition > 1 && item.assignmentStatus === "upcoming" && (
                <> Participants before you must complete their actions first.</>
              )}
            </p>
          </SectionCard>
        )}

        {/* Authentication requirements */}
        {item.authMethod !== "none" && (
          <SectionCard title="Authentication Required" icon={<Shield size={16} />}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#F8FAFC", borderRadius: 8 }}>
              <Shield size={16} color={AZURE} aria-hidden />
              <span style={{ color: NAVY, ...GF, fontSize: 13 }}>{authMethodLabel(item.authMethod)}</span>
            </div>
            <p style={{ color: SILVER, ...GF, fontSize: 12, margin: "10px 0 0" }}>
              You will be asked to verify your identity before accessing the signing environment. This requirement was set by the sender.
            </p>
          </SectionCard>
        )}

        {/* Privacy notice */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #E2E8F0" }}>
          <p style={{ color: SILVER, ...GF, fontSize: 12, margin: 0, lineHeight: 1.6 }}>
            This assignment is visible only to you. Other workspace members — including Workspace Administrators — cannot view your personal inbox or this assignment. Signature data is never stored in your browser or transmitted outside the signing environment.
          </p>
        </div>

      </AppContent>

      <style>{`
        @keyframes inbox-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}

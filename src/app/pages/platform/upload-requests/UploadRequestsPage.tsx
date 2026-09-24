// /app/upload-requests — documents people have asked each other to supply.
//
// Two lists, because a person is on both sides of this feature: what is being
// asked of ME (the queue the notification email sends someone to) and what I
// have asked of others (so a requester can see who has not answered, and
// withdraw a request they no longer need).
//
// ── Fulfilling chains onto the ordinary upload ────────────────────────────
//
// The backend's fulfil endpoint takes a documentId, not a file: the
// create-then-upload path is the only one that knows how to admit bytes
// safely, and a second upload route would need its own quarantine story. So
// this page uploads through `realDocumentService` exactly as the Prepare flow
// does, then hands the resulting id to `fulfilUploadRequest`.
//
// Inline styles only. No Burgundy.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  Inbox, Send, Upload, X, CheckCircle2, AlertCircle, Info, FileText,
} from "lucide-react";
import { usePlatform } from "../../../context/PlatformContext";
import { SkeletonBlock, SKELETON_STYLE } from "../../../components/platform";
import { useProcessing, buildSteps } from "../../../services/processing.service";
import { realDocumentService } from "../../../services/real/document.service";
import { ApiError } from "../../../services/api-client";
import {
  listUploadRequests, cancelUploadRequest, fulfilUploadRequest,
  uploadRequestsAvailable,
} from "../../../services/upload-requests-source";
import type { UploadRequest, UploadRequestStatus } from "../../../models/upload-requests";
import { UPLOAD_REQUEST_STATUS_LABELS } from "../../../models/upload-requests";
import { usePageMeta } from "../../../hooks/usePageMeta";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GF     = { fontFamily: "'Geist', sans-serif" };
const GM     = { fontFamily: "'Geist Mono', monospace" };
const AZURE  = "#0078D4";
const NAVY   = "#0F172A";
const SILVER = "#64748B";
const BORDER = "#E2E8F0";

const STATUS_TONE: Record<UploadRequestStatus, { bg: string; fg: string }> = {
  pending:   { bg: "#FFFBEB", fg: "#92400E" },
  fulfilled: { bg: "#ECFDF5", fg: "#047857" },
  cancelled: { bg: "#F1F5F9", fg: "#64748B" },
};

function StatusPill({ status }: { status: UploadRequestStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <span style={{
      ...GM, fontSize: 10, fontWeight: 700, borderRadius: 999,
      padding: "2px 8px", background: tone.bg, color: tone.fg, flexShrink: 0,
    }}>
      {UPLOAD_REQUEST_STATUS_LABELS[status]}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ── One request ───────────────────────────────────────────────────────────────

function RequestCard({
  request, mine, busy, onUpload, onCancel,
}: {
  request: UploadRequest;
  /** True in the "asked of me" list — the only side that can fulfil. */
  mine: boolean;
  busy: boolean;
  onUpload: (request: UploadRequest, file: File) => void;
  onCancel: (request: UploadRequest) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{
      padding: "14px 16px", background: "white", border: `1px solid ${BORDER}`,
      borderRadius: 10, display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...GF, fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 2 }}>
            {request.title}
          </div>
          <div style={{ ...GF, fontSize: 11, color: "#94A3B8" }}>
            Asked {formatDate(request.createdAt)}
          </div>
        </div>
        <StatusPill status={request.status} />
      </div>

      {request.note !== null && (
        <p style={{
          ...GF, fontSize: 12.5, color: "#475569", margin: 0, lineHeight: 1.55,
          padding: "8px 10px", background: "#F8FAFC", borderRadius: 8,
        }}>
          {request.note}
        </p>
      )}

      {request.status === "pending" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
          {mine ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                style={{ display: "none" }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(request, file);
                  // Cleared so choosing the SAME file twice still fires
                  // onChange — a retry after a failed upload is the common
                  // case here, not an edge one.
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "8px 14px", borderRadius: 8, border: "none",
                  background: busy ? "#93C5FD" : AZURE, color: "white",
                  ...GF, fontSize: 12.5, fontWeight: 700,
                  cursor: busy ? "default" : "pointer", minHeight: 38,
                }}
              >
                <Upload size={13} />
                {busy ? "Uploading…" : "Upload document"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onCancel(request)}
              disabled={busy}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "8px 14px", borderRadius: 8,
                background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626",
                ...GF, fontSize: 12.5, fontWeight: 600,
                cursor: busy ? "default" : "pointer", minHeight: 38,
              }}
            >
              <X size={13} />
              Withdraw request
            </button>
          )}
        </div>
      )}

      {request.status === "fulfilled" && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, ...GF, fontSize: 12, color: "#047857" }}>
          <CheckCircle2 size={13} />
          Uploaded {request.fulfilledAt === null ? "" : formatDate(request.fulfilledAt)}
          {" · "}
          <Link to="/app/documents" style={{ color: AZURE, textDecoration: "none" }}>
            View in Documents
          </Link>
        </div>
      )}
    </div>
  );
}

// ── One list ──────────────────────────────────────────────────────────────────

function RequestList({
  title, icon, empty, requests, mine, busyId, onUpload, onCancel,
}: {
  title: string;
  icon: React.ReactNode;
  empty: string;
  requests: UploadRequest[];
  mine: boolean;
  busyId: string | null;
  onUpload: (request: UploadRequest, file: File) => void;
  onCancel: (request: UploadRequest) => void;
}) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {icon}
        <h2 style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>{title}</h2>
        <span style={{ ...GM, fontSize: 11, color: SILVER }}>{requests.length}</span>
      </div>
      {requests.length === 0 ? (
        <p style={{ ...GF, fontSize: 13, color: "#94A3B8", margin: 0 }}>{empty}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {requests.map(request => (
            <RequestCard
              key={request.requestId}
              request={request}
              mine={mine}
              busy={busyId === request.requestId}
              onUpload={onUpload}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function UploadRequestsPage() {
  usePageMeta();
  const platform = usePlatform();
  const { run } = useProcessing();
  const workspaceId = platform.currentWorkspace?.id;
  const available = uploadRequestsAvailable(workspaceId);

  const [assignedToMe, setAssignedToMe] = useState<UploadRequest[]>([]);
  const [askedByMe, setAskedByMe] = useState<UploadRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const currentUserId = platform.user?.id;

  const load = useCallback(async () => {
    if (!available) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      // Two reads rather than one filtered client-side: "assigned to me" is a
      // real backend filter with its own index, and the other list is
      // everything this workspace has asked for.
      const [mine, all] = await Promise.all([
        listUploadRequests(workspaceId, { assignedToMe: true }),
        listUploadRequests(workspaceId, {}),
      ]);
      setAssignedToMe(mine);
      // What I asked OF OTHERS — the same list minus my own queue, so a
      // request I made of myself does not appear twice.
      setAskedByMe(all.filter(r =>
        r.requestedByUserId === currentUserId && r.assigneeUserId !== currentUserId));
    } catch (err) {
      setError(err instanceof ApiError
        ? err.message
        : "Could not load document requests. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [available, workspaceId, currentUserId]);

  useEffect(() => { void load(); }, [load]);

  const UPLOAD_STAGES = [
    { id: "transfer", label: "Transferring your file" },
    { id: "process",  label: "Securing and preparing it" },
    { id: "answer",   label: "Answering the request" },
  ];

  const handleUpload = (request: UploadRequest, file: File) => {
    if (workspaceId === undefined) return;
    void (async () => {
      setBusyId(request.requestId);
      setError(null);
      try {
        const capacity = await realDocumentService.checkUploadCapacity();
        if (!capacity.available) {
          setError(capacity.message ?? "Uploads are temporarily unavailable.");
          return;
        }
        await run(
          {
            message: `Uploading ${file.name}`,
            detail: "Large documents can take a moment.",
            steps: buildSteps(UPLOAD_STAGES, "transfer"),
          },
          async ({ update }) => {
            // The ordinary create-then-upload path — the only one that admits
            // bytes — then the request is answered with what it produced.
            const created = await realDocumentService.create(workspaceId, file.name);
            update({ steps: buildSteps(UPLOAD_STAGES, "process") });
            await realDocumentService.upload(workspaceId, created.documentId, file);
            update({ steps: buildSteps(UPLOAD_STAGES, "answer") });
            return fulfilUploadRequest(workspaceId, request.requestId, created.documentId);
          },
        );
        await load();
      } catch (err) {
        setError(err instanceof ApiError
          ? err.message
          : "Something went wrong uploading this file. Please try again.");
      } finally {
        setBusyId(null);
      }
    })();
  };

  const handleCancel = (request: UploadRequest) => {
    if (workspaceId === undefined) return;
    void (async () => {
      setBusyId(request.requestId);
      setError(null);
      try {
        await run(
          { message: "Withdrawing the request", detail: "The record is kept." },
          () => cancelUploadRequest(workspaceId, request.requestId),
        );
        await load();
      } catch (err) {
        setError(err instanceof ApiError
          ? err.message
          : "Could not withdraw this request. Please try again.");
      } finally {
        setBusyId(null);
      }
    })();
  };

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100%", ...GF }}>
      <div style={{ background: "white", borderBottom: `1px solid ${BORDER}`, padding: "18px 24px" }}>
        <h1 style={{ ...GF, fontSize: 18, fontWeight: 800, color: NAVY, margin: "0 0 4px" }}>
          Document Requests
        </h1>
        <p style={{ ...GF, fontSize: 12.5, color: SILVER, margin: 0 }}>
          Documents your workspace has asked people to supply — and the ones
          being asked of you.
        </p>
      </div>

      <div style={{ padding: 24, maxWidth: 760 }}>
        {!available && (
          <div style={{ display: "flex", gap: 8, padding: "14px 16px", background: "#FDF8EC", border: "1px solid #EBD79A", borderRadius: 10 }}>
            <Info size={14} color="#B45309" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ ...GF, fontSize: 12.5, color: "#78350F", margin: 0, lineHeight: 1.6 }}>
              Open a workspace to request documents. This feature has no
              demonstration data — a request names a real colleague and sends
              them a real email.
            </p>
          </div>
        )}

        {available && error !== null && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, padding: "12px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9 }}>
            <AlertCircle size={14} color="#B91C1C" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ ...GF, fontSize: 12.5, color: "#B91C1C", margin: 0, lineHeight: 1.55 }}>{error}</p>
          </div>
        )}

        {available && loading && (
          <>
            <style>{SKELETON_STYLE}</style>
            <SkeletonBlock height={20} width={200} />
            <div style={{ marginTop: 14 }}><SkeletonBlock height={120} /></div>
          </>
        )}

        {available && !loading && (
          <>
            <RequestList
              title="Asked of you"
              icon={<Inbox size={15} color={AZURE} />}
              empty="Nothing is being asked of you right now."
              requests={assignedToMe}
              mine
              busyId={busyId}
              onUpload={handleUpload}
              onCancel={handleCancel}
            />
            <RequestList
              title="You asked for"
              icon={<Send size={15} color={SILVER} />}
              empty="You have not asked anyone for a document yet. Open a contact to request one."
              requests={askedByMe}
              mine={false}
              busyId={busyId}
              onUpload={handleUpload}
              onCancel={handleCancel}
            />
            <p style={{ ...GF, fontSize: 12, color: "#94A3B8", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <FileText size={12} />
              To ask someone for a document, open them in{" "}
              <Link to="/app/contacts" style={{ color: AZURE }}>Contacts</Link>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

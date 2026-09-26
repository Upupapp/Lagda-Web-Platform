// Members → "Join requests" (078). Owner / administrator only.
//
// Every join — by a join link or by accepting an email invitation — lands
// here as a PENDING request. Nobody becomes a member until an owner or
// administrator approves it. Approving can give a typed role title and the
// two privileges; without a title the person appears as "New Comer".

import { useCallback, useEffect, useId, useState } from "react";
import { useViewport } from "../../../../hooks/useViewport";
import {
  listJoinRequests, approveJoinRequest, declineJoinRequest, JoinActionError,
  JOIN_ROLE_TITLE_MAX, NEW_COMER_LABEL,
  type JoinRequest, type JoinRequestState,
} from "../../../../services/real/workspace-join.service";
import { AccessEditor, Dialog, ErrorNote, type AccessDraft } from "./join-ui";
import { buttonStyle, formatWhen, GF, GM, NAVY, AZURE, SLATE, SILVER, BORDER } from "./join-styles";

const STATE_BADGE: Record<JoinRequestState, { label: string; bg: string; color: string }> = {
  pending: { label: "Pending", bg: "#FFF8E1", color: "#8A5A00" },
  approved: { label: "Approved", bg: "#E8F5E9", color: "#1B5E20" },
  declined: { label: "Declined", bg: "#F1F5F9", color: "#475569" },
};

function message(err: unknown): string {
  return err instanceof JoinActionError ? err.message : "Something went wrong. Please try again.";
}

type Modal = { kind: "approve"; request: JoinRequest } | { kind: "decline"; request: JoinRequest } | null;

export function JoinRequestsSection({ workspaceId, refreshKey = 0, onDecided, onPendingCount }: {
  workspaceId: string;
  /** Bumped by the page when something else (a used link) may have added one. */
  refreshKey?: number;
  onDecided?: () => void;
  onPendingCount?: (count: number) => void;
}) {
  const { isNarrow } = useViewport();
  const [requests, setRequests] = useState<JoinRequest[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const headingId = useId();

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setRequests(await listJoinRequests(workspaceId));
    } catch (err) {
      setLoadError(message(err));
    }
  }, [workspaceId]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const pending = (requests ?? []).filter(r => r.state === "pending").sort((a, b) => a.createdAt - b.createdAt);
  const history = (requests ?? []).filter(r => r.state !== "pending")
    .sort((a, b) => (b.decidedAt ?? b.createdAt) - (a.decidedAt ?? a.createdAt));

  useEffect(() => {
    if (requests !== null) onPendingCount?.(pending.length);
  }, [requests, pending.length, onPendingCount]);

  const decided = (requestId: string, state: JoinRequestState) => {
    setRequests(list => (list ?? []).map(r => r.requestId === requestId ? { ...r, state, decidedAt: Date.now() } : r));
    setModal(null);
    onDecided?.();
  };

  return (
    <section id="join-requests" aria-labelledby={headingId} data-testid="join-requests-section"
      style={{ background: "#FFFFFF", border: `1.5px solid ${BORDER}`, borderRadius: 12, marginTop: 24, overflow: "hidden" }}>
      <div style={{ padding: isNarrow ? 16 : "18px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <h2 id={headingId} style={{ ...GF, fontSize: 16, fontWeight: 800, color: NAVY, margin: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          Join requests
          {pending.length > 0 && (
            <span aria-label={`${String(pending.length)} pending`} style={{ ...GM, fontSize: 11, padding: "2px 8px", borderRadius: 999, background: AZURE, color: "#FFFFFF" }}>
              {pending.length}
            </span>
          )}
        </h2>
        <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "4px 0 0", lineHeight: 1.5 }}>
          People who used a join link or accepted an email invitation. They join only after you approve.
        </p>
      </div>

      <div style={{ padding: isNarrow ? 12 : 16 }}>
        {loadError ? (
          <div style={{ textAlign: "center" }}>
            <ErrorNote>{loadError}</ErrorNote>
            <button type="button" onClick={() => void load()} style={buttonStyle("secondary")}>Try again</button>
          </div>
        ) : requests === null ? (
          <p aria-busy="true" style={{ ...GF, fontSize: 13, color: SLATE, textAlign: "center", margin: "12px 0" }}>Loading join requests…</p>
        ) : (
          <>
            {pending.length === 0 ? (
              <p style={{ ...GF, fontSize: 13, color: SLATE, textAlign: "center", margin: "12px 0" }}>No requests are waiting for approval.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {pending.map(r => (
                  <RequestRow key={r.requestId} request={r} narrow={isNarrow}
                    onApprove={() => setModal({ kind: "approve", request: r })}
                    onDecline={() => setModal({ kind: "decline", request: r })} />
                ))}
              </ul>
            )}
            {history.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <button type="button" onClick={() => setShowHistory(s => !s)} aria-expanded={showHistory}
                  style={{ ...buttonStyle("link"), padding: "6px 0" }}>
                  {showHistory ? "Hide" : "Show"} approved and declined ({history.length})
                </button>
                {showHistory && (
                  <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                    {history.map(r => <RequestRow key={r.requestId} request={r} narrow={isNarrow} />)}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {modal?.kind === "approve" && (
        <ApproveDialog request={modal.request} onClose={() => setModal(null)}
          onApprove={async (access) => {
            await approveJoinRequest(workspaceId, modal.request.requestId, access);
            decided(modal.request.requestId, "approved");
          }} />
      )}
      {modal?.kind === "decline" && (
        <DeclineDialog request={modal.request} onClose={() => setModal(null)}
          onConfirm={async () => {
            await declineJoinRequest(workspaceId, modal.request.requestId);
            decided(modal.request.requestId, "declined");
          }} />
      )}
    </section>
  );
}

function RequestRow({ request, narrow, onApprove, onDecline }: {
  request: JoinRequest; narrow: boolean; onApprove?: () => void; onDecline?: () => void;
}) {
  const badge = STATE_BADGE[request.state];
  const source = request.sourceKind === "invitation" ? "Email invitation" : `Join link: ${request.ticketLabel ?? "—"}`;
  return (
    <li data-testid={`join-request-${request.requestId}`}
      style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: narrow ? 12 : "12px 14px", display: "flex", gap: 12, flexDirection: narrow ? "column" : "row", alignItems: narrow ? "stretch" : "flex-start" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, overflowWrap: "anywhere" }}>{request.fullName}</span>
          <span style={{ ...GM, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: badge.bg, color: badge.color }}>{badge.label}</span>
        </div>
        <div style={{ ...GM, fontSize: 12, color: SLATE, marginTop: 2, overflowWrap: "anywhere" }}>{request.email}</div>
        {request.reason && (
          <p style={{ ...GF, fontSize: 13, color: NAVY, margin: "6px 0 0", lineHeight: 1.5, overflowWrap: "anywhere" }}>
            <span style={{ color: SLATE }}>Reason: </span>{request.reason}
          </p>
        )}
        <div style={{ ...GF, fontSize: 12, color: SILVER, marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ overflowWrap: "anywhere" }}>{source}</span>
          <span aria-hidden>·</span>
          <span>Requested {formatWhen(request.createdAt)}</span>
          {request.decidedAt !== null && (<><span aria-hidden>·</span><span>Decided {formatWhen(request.decidedAt)}</span></>)}
        </div>
      </div>
      {request.state === "pending" && onApprove && onDecline && (
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button type="button" onClick={onDecline} style={{ ...buttonStyle("secondary"), flex: narrow ? 1 : undefined }} aria-label={`Decline ${request.fullName}`}>Decline</button>
          <button type="button" onClick={onApprove} style={{ ...buttonStyle("primary"), flex: narrow ? 1 : undefined }} aria-label={`Approve ${request.fullName}`}>Approve</button>
        </div>
      )}
    </li>
  );
}

function ApproveDialog({ request, onClose, onApprove }: {
  request: JoinRequest; onClose: () => void;
  onApprove: (access: { roleTitle: string | null; canRequestDocuments: boolean; canAssignSigners: boolean }) => Promise<void>;
}) {
  const [draft, setDraft] = useState<AccessDraft>({ roleTitle: "", canRequestDocuments: false, canAssignSigners: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const title = draft.roleTitle.trim();
    if (title.length > JOIN_ROLE_TITLE_MAX) { setError(`Keep the role title under ${String(JOIN_ROLE_TITLE_MAX)} characters.`); return; }
    setBusy(true);
    setError(null);
    try {
      await onApprove({
        roleTitle: title === "" ? null : title,
        canRequestDocuments: draft.canRequestDocuments,
        canAssignSigners: draft.canAssignSigners,
      });
    } catch (err) {
      setError(message(err));
      setBusy(false);
    }
  }

  return (
    <Dialog title={`Approve ${request.fullName}`} onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={buttonStyle("secondary")}>Cancel</button>
        <button type="button" onClick={() => void submit()} disabled={busy} style={buttonStyle("primary", busy)}>
          {busy ? "Approving…" : "Approve"}
        </button>
      </>}>
      {error && <ErrorNote>{error}</ErrorNote>}
      <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 16px", lineHeight: 1.5, overflowWrap: "anywhere" }}>
        {request.email} joins this workspace as a member. Without a role title, they appear as "{NEW_COMER_LABEL}".
      </p>
      <AccessEditor value={draft} onChange={setDraft} />
    </Dialog>
  );
}

function DeclineDialog({ request, onClose, onConfirm }: {
  request: JoinRequest; onClose: () => void; onConfirm: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog title={`Decline ${request.fullName}?`} onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={buttonStyle("secondary")}>Cancel</button>
        <button type="button" disabled={busy} style={buttonStyle("danger", busy)}
          onClick={() => {
            setBusy(true);
            onConfirm().catch((err: unknown) => { setError(message(err)); setBusy(false); });
          }}>
          {busy ? "Declining…" : "Decline request"}
        </button>
      </>}>
      {error && <ErrorNote>{error}</ErrorNote>}
      <p style={{ ...GF, fontSize: 14, color: SLATE, margin: 0, lineHeight: 1.6 }}>
        They will not join this workspace. If you change your mind later, send them a new join link.
      </p>
    </Dialog>
  );
}

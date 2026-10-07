// The Recycle Bin: a round button at the top right of Documents, and the panel
// it opens in the centre of the page.
//
// The panel has a fixed size on a wide screen (it does not grow and shrink
// with what is in it), takes most of a tablet, and fills a phone. Inside, each
// document is the same branded card as Records › Completed.
//
// Completed and cancelled documents moved to the bin are listed here. Each can
// be restored. Only the workspace OWNER can delete one permanently; a sender
// or administrator who presses delete files a deletion request instead, and
// the owner's own "Deletion requests" section is where they approve or
// disapprove it.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Trash2, X, ArchiveRestore, FileX2, Clock, ThumbsUp, ThumbsDown, Send, Inbox, CircleSlash } from "lucide-react";
import { MemberAvatar } from "../platform/MemberAvatar";
import { CompletedDocumentCard, useDocumentCardBranding, type CompletedCardData } from "../../pages/platform/documents/CompletedDocumentCards";
import { realDocumentService } from "../../services/real/document.service";
import { useDocumentLifecycle, type LifecycleAction } from "./useDocumentLifecycle";
import {
  documentLifecycleService, memberAvatarUrl, type DeletionRequest, type RecycleBinItem,
} from "../../services/real/document-lifecycle.service";
import { Z } from "../../utils/z-index";

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F", SLATE = "#475569", BORDER = "#E2E8F0", AZURE = "#0078D4", DANGER = "#B91C1C";

const when = (iso: string | null) => {
  if (iso === null) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
};

/** The round button. `count` is what is waiting in the bin for this person. */
export function RecycleBinButton({ count, onClick }: { count: number | null; onClick: () => void }) {
  const label = count !== null && count > 0 ? `Recycle Bin, ${String(count)} ${count === 1 ? "item" : "items"}` : "Recycle Bin";
  return (
    <span className="recycle-bin-wrap" style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      <button type="button" onClick={onClick} aria-label={label} data-testid="recycle-bin-button" className="recycle-bin-btn"
        style={{
          width: 44, height: 44, borderRadius: "50%", border: `1px solid ${BORDER}`, background: "#FFFFFF", color: SLATE,
          display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0,
          boxShadow: "0 1px 2px rgba(7,17,31,0.06)",
        }}>
        <Trash2 size={19} aria-hidden />
      </button>
      {count !== null && count > 0 && (
        <span aria-hidden data-testid="recycle-bin-count" style={{
          ...GF, position: "absolute", top: -4, right: -4, minWidth: 20, height: 20, padding: "0 5px", boxSizing: "border-box",
          borderRadius: 999, background: "#DC2626", color: "#FFFFFF", fontSize: 11, fontWeight: 800,
          display: "inline-flex", alignItems: "center", justifyContent: "center", border: "2px solid #FFFFFF",
        }}>{count > 99 ? "99+" : count}</span>
      )}
      <span className="recycle-bin-tip" aria-hidden style={{
        ...GF, position: "absolute", right: 0, top: "calc(100% + 6px)", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 2,
        background: NAVY, color: "#FFFFFF", fontSize: 11.5, fontWeight: 600, padding: "5px 9px", borderRadius: 7,
      }}>Recycle Bin</span>
      <style>{`
        .recycle-bin-tip { opacity: 0; transition: opacity 0.12s; }
        .recycle-bin-wrap:hover .recycle-bin-tip, .recycle-bin-wrap:focus-within .recycle-bin-tip { opacity: 1; }
        .recycle-bin-btn:hover { background: #F8FAFC !important; color: ${NAVY} !important; }
        .recycle-bin-btn:focus-visible { outline: 2px solid ${AZURE}; outline-offset: 2px; }
      `}</style>
    </span>
  );
}

function SmallButton({ icon: Icon, label, tone = "neutral", onClick, testId }: {
  icon: typeof Trash2; label: string; tone?: "neutral" | "danger" | "primary"; onClick: () => void; testId?: string;
}) {
  const color = tone === "danger" ? DANGER : tone === "primary" ? "#005A9E" : NAVY;
  const border = tone === "danger" ? "#FECACA" : tone === "primary" ? AZURE : "#CBD5E1";
  return (
    <button type="button" onClick={onClick} data-testid={testId}
      style={{
        ...GF, display: "inline-flex", alignItems: "center", gap: 6, minHeight: 36, padding: "0 12px", borderRadius: 8,
        border: `1px solid ${border}`, background: "#FFFFFF", color, fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
      }}>
      <Icon size={14} aria-hidden /> {label}
    </button>
  );
}

export function RecycleBinPanel({ workspaceId, isOwner, freePlan, onClose, onChanged }: {
  workspaceId: string;
  isOwner: boolean;
  freePlan: boolean;
  onClose: () => void;
  /** Something left or returned from the bin: the lists behind should re-read. */
  onChanged: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [items, setItems] = useState<RecycleBinItem[] | null>(null);
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    void documentLifecycleService.recycleBin(workspaceId).then(setItems).catch(() => { setItems([]); setFailed(true); });
    if (isOwner) void documentLifecycleService.deletionRequests(workspaceId).then(setRequests).catch(() => { setRequests([]); });
  }, [workspaceId, isOwner]);
  useEffect(() => { load(); }, [load]);

  // Verification IDs are on the document list, not on the bin's own rows.
  // Without them a card simply shows none: a failure here changes nothing else.
  const branding = useDocumentCardBranding();
  const [verificationIds, setVerificationIds] = useState<ReadonlyMap<string, string>>(new Map());
  useEffect(() => {
    let cancelled = false;
    void realDocumentService.list(workspaceId, { perPage: 100 })
      .then(page => {
        if (cancelled) return;
        setVerificationIds(new Map(page.items.flatMap(d => (d.verificationId ? [[d.documentId, d.verificationId] as const] : []))));
      })
      .catch(() => { /* cards show no Verification ID */ });
    return () => { cancelled = true; };
  }, [workspaceId]);

  const lifecycle = useDocumentLifecycle({ freePlan, onDone: () => { load(); onChanged(); } });
  const ask = (action: LifecycleAction) => { lifecycle.ask(action); };

  // Focus goes to Close once, when the panel opens. It must not be repeated
  // when `onClose` changes identity: the page behind refreshes on a timer,
  // and each refresh used to pull the focus out of a confirmation's reason
  // box onto Close, where the next space typed closed the whole panel.
  useEffect(() => { closeRef.current?.focus(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A confirmation on top handles its own Escape first.
      if (e.key === "Escape" && document.querySelector("[role=alertdialog]") === null) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const pendingIds = new Set(requests.map(r => r.signingRequestId));
  // The owner decides requested items in their own section, not twice.
  const listed = (items ?? []).filter(item => !(isOwner && pendingIds.has(item.signingRequestId)));
  const documentOf = new Map((items ?? []).map(item => [item.signingRequestId, item.documentId]));

  const cancelledBadge = (
    <span style={{
      ...GF, fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "#F1F5F9", color: SLATE,
      border: `1px solid ${BORDER}`, display: "inline-flex", alignItems: "center", gap: 5,
    }}><CircleSlash size={12} aria-hidden /> Cancelled</span>
  );
  const actionsRow: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", paddingTop: 10, borderTop: `1px solid ${BORDER}` };
  const line: React.CSSProperties = { ...GF, fontSize: 12.5, color: SLATE, margin: 0, display: "flex", alignItems: "center", gap: 7, minWidth: 0 };

  /** One document in the bin, as the same card Records › Completed shows. */
  const binCard = (item: RecycleBinItem): CompletedCardData => {
    const completed = item.state === "completed";
    return {
      key: item.signingRequestId, testId: "recycle-bin-item", title: item.documentTitle, actions: [],
      verificationId: item.verificationId ?? verificationIds.get(item.documentId) ?? null, hideVerification: !completed,
      done: completed ? item.participantCount : 0, total: completed ? item.participantCount : 0,
      createdAt: item.trashedAt, dateLabel: "Moved to the bin", bannerSubtitle: "In the Recycle Bin",
      ...(completed ? {} : { statusBadge: cancelledBadge }),
      extra: (
        <>
          <p style={line}>
            <MemberAvatar name={item.trashedBy.displayName} url={memberAvatarUrl(workspaceId, item.trashedBy)} size={20} />
            <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>Moved here by {item.trashedBy.displayName} · {when(item.trashedAt)}</span>
          </p>
          {item.trashedReason !== null && item.trashedReason !== undefined && (
            <p data-testid="recycle-bin-reason" style={{ ...GF, fontSize: 12.5, color: SLATE, margin: 0, lineHeight: 1.5, overflowWrap: "anywhere" }}>
              <span style={{ fontWeight: 700, color: NAVY }}>Reason:</span> {item.trashedReason}
            </p>
          )}
          {item.deletionRequest !== null && (
            <p data-testid="pending-owner" style={{ ...GF, fontSize: 12.5, fontWeight: 700, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "6px 9px", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={13} aria-hidden /> Pending the owner&rsquo;s approval
            </p>
          )}
        </>
      ),
      footer: (
        <div style={actionsRow}>
          {item.actions.includes("restore") && (
            <SmallButton icon={ArchiveRestore} label="Restore" tone="primary" testId="bin-restore"
              onClick={() => { ask({ kind: "bin-restore", workspaceId, signingRequestId: item.signingRequestId, title: item.documentTitle, state: item.state }); }} />
          )}
          {item.actions.includes("delete") && (
            <SmallButton icon={FileX2} label="Permanently Delete" tone="danger" testId="bin-delete"
              onClick={() => { ask({ kind: "bin-delete", workspaceId, signingRequestId: item.signingRequestId, title: item.documentTitle }); }} />
          )}
          {item.actions.includes("request-deletion") && (
            <SmallButton icon={Send} label="Delete" tone="danger" testId="bin-request-deletion"
              onClick={() => { ask({ kind: "bin-request-deletion", workspaceId, signingRequestId: item.signingRequestId, title: item.documentTitle }); }} />
          )}
        </div>
      ),
    };
  };

  /** A deletion request, on the same card, with who asked and why. */
  const requestCard = (req: DeletionRequest): CompletedCardData => {
    const completed = req.state === "completed";
    const documentId = req.signingRequestId === null ? undefined : documentOf.get(req.signingRequestId);
    return {
      key: req.requestId, testId: "deletion-request", title: req.documentTitle, actions: [],
      verificationId: documentId === undefined ? null : verificationIds.get(documentId) ?? null, hideVerification: !completed,
      done: 0, total: 0, createdAt: req.requestedAt, dateLabel: "Asked", bannerSubtitle: "Deletion requested",
      ...(completed ? {} : { statusBadge: cancelledBadge }),
      extra: (
        <>
          <p style={line}>
            <MemberAvatar name={req.requestedBy.displayName} url={memberAvatarUrl(workspaceId, req.requestedBy)} size={20} />
            <span style={{ minWidth: 0, overflowWrap: "anywhere" }}><strong style={{ color: NAVY }}>{req.requestedBy.displayName}</strong> asked to delete this · {when(req.requestedAt)}</span>
          </p>
          <p style={{ ...GF, fontSize: 13, color: NAVY, margin: 0, padding: "8px 10px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#92400E", marginBottom: 2 }}>Their reason</span>
            {req.reason ?? "No reason given."}
          </p>
        </>
      ),
      footer: (
        <div style={actionsRow}>
          <SmallButton icon={ThumbsDown} label="Disapprove Deletion" testId="disapprove-deletion"
            onClick={() => { ask({ kind: "disapprove-deletion", workspaceId, requestId: req.requestId, title: req.documentTitle, requester: req.requestedBy.displayName }); }} />
          <SmallButton icon={ThumbsUp} label="Approve Deletion" tone="danger" testId="approve-deletion"
            onClick={() => { ask({ kind: "approve-deletion", workspaceId, requestId: req.requestId, title: req.documentTitle, requester: req.requestedBy.displayName }); }} />
        </div>
      ),
    };
  };

  const empty = items !== null && !failed && listed.length === 0 && !(isOwner && requests.length > 0);
  const heading: React.CSSProperties = { ...GF, fontSize: 15, fontWeight: 800, color: NAVY, margin: 0 };

  return (
    <div data-testid="recycle-bin-scrim" className="recycle-bin-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: Z.modal, background: "rgba(7,17,31,0.55)", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} data-testid="recycle-bin-panel" className="recycle-bin-panel"
        style={{ ...GF, background: "#F8FAFC", display: "flex", flexDirection: "column", boxSizing: "border-box", boxShadow: "0 24px 60px -12px rgba(7,17,31,0.55)", overflow: "hidden" }}>
        {/* On a phone the title, the count and Close share the first row and
            the description runs the full width beneath them. Beside the
            icon it was squeezed into a column a few words wide. */}
        <div data-testid="recycle-bin-header" className="recycle-bin-head" style={{ background: "#FFFFFF", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <span aria-hidden className="recycle-bin-head-icon" style={{ borderRadius: "50%", background: "#F1F5F9", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Trash2 size={20} color={SLATE} />
          </span>
          <h2 id={titleId} className="recycle-bin-head-title" style={{ ...GF, fontWeight: 800, color: NAVY, margin: 0, minWidth: 0 }}>Recycle Bin</h2>
          {items !== null && !failed && (
            <span data-testid="recycle-bin-total" className="recycle-bin-head-total" style={{ ...GF, fontSize: 12.5, fontWeight: 700, color: SLATE, background: "#F1F5F9", border: `1px solid ${BORDER}`, borderRadius: 999, padding: "4px 11px", whiteSpace: "nowrap" }}>
              {(items.length)} {items.length === 1 ? "document" : "documents"}
            </span>
          )}
          <button ref={closeRef} type="button" aria-label="Close" onClick={onClose} className="recycle-bin-head-close"
            style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "#F1F5F9", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} aria-hidden />
          </button>
          <p data-testid="recycle-bin-description" className="recycle-bin-head-text" style={{ ...GF, color: SLATE, margin: 0, lineHeight: 1.5, minWidth: 0 }}>
            {isOwner
              ? "Documents moved to the bin. Restore one, or delete it permanently. Only you, the workspace owner, can delete."
              : "Documents you moved to the bin. Restore one, or ask the workspace owner to delete it permanently."}
          </p>
        </div>

        <div className="recycle-bin-body" style={{ overflowY: "auto", minHeight: 0, flex: 1, display: "flex", flexDirection: "column" }}>
          {/* ── The owner's deletion requests ───────────────────────────── */}
          {isOwner && requests.length > 0 && (
            <section aria-label="Deletion requests" data-testid="deletion-requests" style={{ marginBottom: 26 }}>
              <h3 style={{ ...heading, color: "#92400E" }}>Deletion requests ({requests.length})</h3>
              <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "3px 0 12px", lineHeight: 1.5 }}>
                A sender or administrator of your workspace asked for these to be deleted. Only you can decide. Their reason is shown to you alone.
              </p>
              <ul className="recycle-bin-list" style={{ margin: 0, padding: 0 }}>
                {requests.map(req => <CompletedDocumentCard key={req.requestId} card={requestCard(req)} branding={branding} />)}
              </ul>
            </section>
          )}

          {/* ── What is in the bin ─────────────────────────────────────── */}
          {(isOwner && requests.length > 0 && listed.length > 0) && <h3 style={{ ...heading, marginBottom: 12 }}>In the bin</h3>}
          {items === null && <p role="status" style={{ ...GF, fontSize: 14, color: SLATE, margin: "auto", textAlign: "center" }}>Loading the Recycle Bin…</p>}
          {items !== null && failed && (
            <p role="alert" style={{ ...GF, fontSize: 14, color: "#7F1D1D", margin: "auto", textAlign: "center" }}>The Recycle Bin could not be loaded. Close it and try again.</p>
          )}
          {empty && (
            <div data-testid="recycle-bin-empty" style={{ margin: "auto", textAlign: "center", padding: "24px 12px", maxWidth: 420 }}>
              <span aria-hidden style={{ width: 72, height: 72, borderRadius: "50%", background: "#FFFFFF", border: `1px solid ${BORDER}`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Inbox size={32} color={SLATE} />
              </span>
              <p style={{ ...GF, fontSize: 18, fontWeight: 800, color: NAVY, margin: "14px 0 6px" }}>The Recycle Bin is empty</p>
              <p style={{ ...GF, fontSize: 14, color: SLATE, margin: 0, lineHeight: 1.55 }}>
                Completed and cancelled documents you move to the bin appear here. You can restore them, or delete them for good.
              </p>
            </div>
          )}
          {listed.length > 0 && (
            <ul className="recycle-bin-list" style={{ margin: 0, padding: 0 }}>
              {listed.map(item => <CompletedDocumentCard key={item.signingRequestId} card={binCard(item)} branding={branding} />)}
            </ul>
          )}
        </div>
        <style>{`
          /* A phone: the whole screen. */
          .recycle-bin-scrim { padding: 0; }
          .recycle-bin-panel { width: 100%; height: 100dvh; border-radius: 0; }
          .recycle-bin-body { padding: 16px; }
          .recycle-bin-list { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); }
          .recycle-bin-head {
            display: grid; align-items: center; column-gap: 12px; row-gap: 10px; padding: 14px 16px 16px;
            grid-template-columns: auto minmax(0, 1fr) auto auto;
            grid-template-areas: "icon title total close" "text text text text";
          }
          .recycle-bin-head-icon { grid-area: icon; width: 40px; height: 40px; }
          .recycle-bin-head-title { grid-area: title; font-size: 18px; }
          .recycle-bin-head-total { grid-area: total; }
          .recycle-bin-head-close { grid-area: close; }
          .recycle-bin-head-text { grid-area: text; font-size: 13.5px; padding-top: 10px; border-top: 1px solid #EEF2F6; }
          /* Too narrow for the count beside the title: it goes under it. */
          @media (max-width: 359px) {
            .recycle-bin-head { grid-template-columns: auto minmax(0, 1fr) auto; grid-template-areas: "icon title close" "total total total" "text text text"; }
            .recycle-bin-head-total { justify-self: start; }
          }
          /* A tablet: most of the screen, with a margin. */
          @media (min-width: 640px) {
            .recycle-bin-scrim { padding: 20px; }
            .recycle-bin-panel { height: calc(100dvh - 40px); border-radius: 18px; }
            .recycle-bin-body { padding: 20px; }
            .recycle-bin-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            /* Room for the description beside the icon, under the title. */
            .recycle-bin-head {
              row-gap: 2px; padding: 16px 20px;
              grid-template-areas: "icon title total close" "icon text total close";
            }
            .recycle-bin-head-icon { width: 42px; height: 42px; }
            .recycle-bin-head-title { font-size: 19px; align-self: end; }
            .recycle-bin-head-text { font-size: 13px; padding-top: 0; border-top: 0; align-self: start; line-height: 1.45; }
          }
          /* A wide screen: a fixed size, whatever is inside. */
          @media (min-width: 1100px) {
            .recycle-bin-panel { width: min(1180px, calc(100vw - 64px)); height: min(820px, calc(100dvh - 64px)); }
            .recycle-bin-body { padding: 22px 24px 26px; }
            .recycle-bin-list { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          }
          /* A very wide screen: wider still. */
          @media (min-width: 1600px) {
            .recycle-bin-panel { width: 1360px; height: min(880px, calc(100dvh - 80px)); }
            .recycle-bin-list { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          }
        `}</style>
      </div>
      {lifecycle.element}
    </div>
  );
}

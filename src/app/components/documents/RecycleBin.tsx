// The Recycle Bin: a round button at the top right of Documents, and the wide
// panel it opens in the centre of the page.
//
// Completed and cancelled documents moved to the bin are listed here. Each can
// be restored. Only the workspace OWNER can delete one permanently; a sender
// or administrator who presses delete files a deletion request instead, and
// the owner's own "Deletion requests" section is where they approve or
// disapprove it.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Trash2, X, ArchiveRestore, FileX2, Clock, ThumbsUp, ThumbsDown, Send, Inbox } from "lucide-react";
import { MemberAvatar } from "../platform/MemberAvatar";
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

  return (
    <div data-testid="recycle-bin-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: Z.modal, background: "rgba(7,17,31,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxSizing: "border-box" }}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} data-testid="recycle-bin-panel"
        style={{
          ...GF, background: "#FFFFFF", borderRadius: 18, width: "100%", maxWidth: 960, maxHeight: "calc(100dvh - 32px)",
          display: "flex", flexDirection: "column", boxSizing: "border-box", boxShadow: "0 24px 60px -12px rgba(7,17,31,0.55)", overflow: "hidden",
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <span aria-hidden style={{ width: 40, height: 40, borderRadius: "50%", background: "#F1F5F9", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Trash2 size={19} color={SLATE} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 id={titleId} style={{ ...GF, fontSize: 18, fontWeight: 800, color: NAVY, margin: 0 }}>Recycle Bin</h2>
            <p style={{ ...GF, fontSize: 12.5, color: SLATE, margin: "2px 0 0", lineHeight: 1.45 }}>
              {isOwner
                ? "Documents moved to the bin. Restore one, or delete it permanently. Only you, the workspace owner, can delete."
                : "Documents you moved to the bin. Restore one, or ask the workspace owner to delete it permanently."}
            </p>
          </div>
          <button ref={closeRef} type="button" aria-label="Close" onClick={onClose}
            style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: "#F1F5F9", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X size={18} aria-hidden />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "16px 18px 20px", minHeight: 0 }}>
          {/* ── The owner's deletion requests ───────────────────────────── */}
          {isOwner && requests.length > 0 && (
            <section aria-label="Deletion requests" data-testid="deletion-requests" style={{ marginBottom: 20 }}>
              <h3 style={{ ...GF, fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#92400E", margin: "0 0 4px" }}>
                Deletion requests ({requests.length})
              </h3>
              <p style={{ ...GF, fontSize: 12.5, color: SLATE, margin: "0 0 10px", lineHeight: 1.5 }}>
                A sender or administrator of your workspace asked for these to be deleted. Only you can decide. Their reason is shown to you alone.
              </p>
              <ul style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {requests.map(req => (
                  <li key={req.requestId} data-testid="deletion-request" style={{ listStyle: "none", border: "1px solid #FDE68A", background: "#FFFBEB", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <MemberAvatar name={req.requestedBy.displayName} url={memberAvatarUrl(workspaceId, req.requestedBy)} size={36} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, margin: 0, overflowWrap: "anywhere" }}>{req.documentTitle}</p>
                        <p style={{ ...GF, fontSize: 12.5, color: SLATE, margin: "2px 0 0" }}>
                          <strong style={{ color: NAVY }}>{req.requestedBy.displayName}</strong> asked to delete this {req.state} document · {when(req.requestedAt)}
                        </p>
                        <p style={{ ...GF, fontSize: 13, color: NAVY, margin: "8px 0 0", padding: "8px 10px", background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 8, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                          <span style={{ display: "block", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: SLATE, marginBottom: 2 }}>Their reason</span>
                          {req.reason ?? "No reason given."}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", marginTop: 10 }}>
                      <SmallButton icon={ThumbsDown} label="Disapprove Deletion" testId="disapprove-deletion"
                        onClick={() => { ask({ kind: "disapprove-deletion", workspaceId, requestId: req.requestId, title: req.documentTitle, requester: req.requestedBy.displayName }); }} />
                      <SmallButton icon={ThumbsUp} label="Approve Deletion" tone="danger" testId="approve-deletion"
                        onClick={() => { ask({ kind: "approve-deletion", workspaceId, requestId: req.requestId, title: req.documentTitle, requester: req.requestedBy.displayName }); }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── What is in the bin ─────────────────────────────────────── */}
          {(isOwner && requests.length > 0) && (
            <h3 style={{ ...GF, fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: SLATE, margin: "0 0 10px" }}>
              In the bin
            </h3>
          )}
          {items === null && <p role="status" style={{ ...GF, fontSize: 13.5, color: SLATE, margin: 0 }}>Loading the Recycle Bin…</p>}
          {items !== null && failed && (
            <p role="alert" style={{ ...GF, fontSize: 13.5, color: "#7F1D1D", margin: 0 }}>The Recycle Bin could not be loaded. Close it and try again.</p>
          )}
          {items !== null && !failed && listed.length === 0 && (
            <div style={{ textAlign: "center", padding: "28px 12px" }}>
              <span aria-hidden style={{ width: 52, height: 52, borderRadius: "50%", background: "#F1F5F9", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Inbox size={24} color={SLATE} />
              </span>
              <p style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, margin: "10px 0 4px" }}>The Recycle Bin is empty</p>
              <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0, lineHeight: 1.5 }}>
                Completed and cancelled documents you move to the bin appear here.
              </p>
            </div>
          )}
          {listed.length > 0 && (
            <ul className="recycle-bin-list" style={{ margin: 0, padding: 0 }}>
              {listed.map(item => {
                const waiting = item.deletionRequest !== null;
                return (
                  <li key={item.signingRequestId} data-testid="recycle-bin-item" style={{ listStyle: "none", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
                      <p title={item.documentTitle} style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, margin: 0, flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{item.documentTitle}</p>
                      <span style={{
                        ...GF, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, flexShrink: 0,
                        ...(item.state === "completed" ? { background: "#DCFCE7", color: "#166534", border: "1px solid #BBF7D0" } : { background: "#F1F5F9", color: SLATE, border: `1px solid ${BORDER}` }),
                      }}>{item.state === "completed" ? "Completed" : "Cancelled"}</span>
                    </div>
                    <p style={{ ...GF, fontSize: 12.5, color: SLATE, margin: 0, display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                      <MemberAvatar name={item.trashedBy.displayName} url={memberAvatarUrl(workspaceId, item.trashedBy)} size={20} />
                      <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>Moved here by {item.trashedBy.displayName} · {when(item.trashedAt)}</span>
                    </p>
                    {waiting && (
                      <p data-testid="pending-owner" style={{ ...GF, fontSize: 12.5, fontWeight: 700, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "6px 9px", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={13} aria-hidden /> Pending the owner&rsquo;s approval
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", marginTop: "auto" }}>
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
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <style>{`
          .recycle-bin-list { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); }
          @media (min-width: 720px) { .recycle-bin-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        `}</style>
      </div>
      {lifecycle.element}
    </div>
  );
}

// Share a completed document, and manage who it is shared with.
//
// One dialog, two starting points:
//   mode "add"   the Share button on a Completed card, "+ Add More" in Shared By Me:
//                the email / full name form first, then the people with access.
//   mode "list"  "Shared With" in Shared By Me: the people first, each with
//                Edit and Remove; "+ Add more" reveals the form.
//
// Edit and Remove swap the dialog's content rather than stacking a second
// modal, so there is always exactly one focus trap and one Escape handler.
// Nothing is emailed: the recipient finds the document in Shared Documents →
// Shared With Me once they have a LAGDA account with that verified address.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Share2, Pencil, Trash2, UserPlus, UserRound, Mail } from "lucide-react";
import { ModalFrame, modalButtonStyle } from "../contact-requests/ModalFrame";
import {
  documentSharingService, sharingErrorMessage, isValidShareEmail, formatSharingDate,
  MAX_FULL_NAME_LENGTH,
  type DocumentShare, type AccessRequest,
} from "../../services/real/document-sharing.service";
import { GF, NAVY, SLATE, BORDER, StatusChip, SharingNotice, TextField, SmallButton, type ChipTone } from "./SharingPrimitives";

export interface ShareTarget {
  documentId: string;
  title: string;
}

type View =
  | { k: "main" }
  | { k: "edit"; share: DocumentShare }
  | { k: "remove-share"; share: DocumentShare }
  | { k: "remove-request"; request: AccessRequest };

const SHARE_STATUS: Record<"pending" | "accepted" | "rejected", { label: string; tone: ChipTone }> = {
  accepted: { label: "Has access", tone: "success" },
  pending: { label: "Waiting to accept", tone: "warning" },
  rejected: { label: "Declined", tone: "neutral" },
};

export const NO_EMAIL_COPY = "No email is sent. They'll find it in Shared Documents → Shared With Me once they have a LAGDA account.";
export const EMAIL_CHANGE_COPY = "Changing the email address hands access to a different person: the current share ends, "
  + "and the new address must accept it in Shared With Me before they can open the document.";

function shareName(share: DocumentShare): string {
  return share.fullName ?? share.recipient?.displayName ?? share.email;
}

export function ShareDocumentDialog({ workspaceId, target, mode = "add", onClose, onChanged }: {
  workspaceId: string;
  target: ShareTarget;
  mode?: "add" | "list";
  onClose: () => void;
  /** Called after anything changed who has access. */
  onChanged?: () => void;
}) {
  const [view, setView] = useState<View>({ k: "main" });
  const [shares, setShares] = useState<DocumentShare[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(mode === "add");
  const [notice, setNotice] = useState<{ tone: "error" | "success" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const changedRef = useRef(onChanged);
  changedRef.current = onChanged;

  const load = useCallback(() => {
    setLoadState("loading");
    const sharesP = documentSharingService.listShares(workspaceId, target.documentId);
    // Approved requests also give access. A failure here costs only those rows.
    const requestsP = documentSharingService.listAccessRequests(workspaceId, "approved")
      .then(items => items.filter(r => r.document.documentId === target.documentId))
      .catch((): AccessRequest[] => []);
    Promise.all([sharesP, requestsP])
      .then(([result, approved]) => {
        setShares(result.shares.filter(s => s.status !== "removed"));
        setRequests(approved);
        setLoadState("ready");
      })
      .catch((err: unknown) => { setLoadError(sharingErrorMessage(err, "load")); setLoadState("error"); });
  }, [workspaceId, target.documentId]);

  useEffect(() => { load(); }, [load]);

  const changed = () => { changedRef.current?.(); };

  async function removeShare(share: DocumentShare) {
    setBusy(true);
    try {
      await documentSharingService.removeShare(workspaceId, target.documentId, share.shareId);
      setShares(list => list.filter(s => s.shareId !== share.shareId));
      setNotice({ tone: "success", text: `${shareName(share)} no longer has access.` });
      changed();
    } catch (err) {
      setNotice({ tone: "error", text: sharingErrorMessage(err, "remove") });
    } finally {
      setBusy(false);
      setView({ k: "main" });
    }
  }

  async function removeRequest(request: AccessRequest) {
    setBusy(true);
    try {
      await documentSharingService.decideAccessRequest(workspaceId, request.requestId, "remove");
      setRequests(list => list.filter(r => r.requestId !== request.requestId));
      setNotice({ tone: "success", text: `${request.requester.displayName} no longer has access.` });
      changed();
    } catch (err) {
      setNotice({ tone: "error", text: sharingErrorMessage(err, "remove") });
    } finally {
      setBusy(false);
      setView({ k: "main" });
    }
  }

  if (view.k === "edit") {
    return (
      <EditShareView workspaceId={workspaceId} target={target} share={view.share} onClose={onClose}
        onCancel={() => setView({ k: "main" })}
        onSaved={(updated, previous) => {
          setShares(list => {
            const rest = list.filter(s => s.shareId !== updated.shareId && s.shareId !== previous?.shareId);
            return [updated, ...rest];
          });
          setNotice({
            tone: "success",
            text: previous === null
              ? "Saved."
              : `Saved. ${updated.email} must now accept the share before they can open the document.`,
          });
          setView({ k: "main" });
          changed();
        }} />
    );
  }

  if (view.k === "remove-share" || view.k === "remove-request") {
    const name = view.k === "remove-share" ? shareName(view.share) : view.request.requester.displayName;
    return (
      <ModalFrame key="remove" title="Remove access?" subtitle={target.title} onClose={() => setView({ k: "main" })} busy={busy} width={460}
        footer={<>
          <button type="button" data-autofocus onClick={() => setView({ k: "main" })} disabled={busy} style={modalButtonStyle("secondary", busy)}>Cancel</button>
          <button type="button" disabled={busy} style={modalButtonStyle("danger", busy)}
            onClick={() => { void (view.k === "remove-share" ? removeShare(view.share) : removeRequest(view.request)); }}>
            {busy ? "Removing…" : "Continue"}
          </button>
        </>}>
        <p style={{ ...GF, fontSize: 14, color: NAVY, margin: 0, lineHeight: 1.6, overflowWrap: "anywhere" }}>
          <strong>{name}</strong> will no longer be able to open this document. You can share it with them again later.
        </p>
      </ModalFrame>
    );
  }

  const people = shares.length + requests.length;

  return (
    <ModalFrame key="main" title={mode === "list" ? "Shared with" : "Share document"} subtitle={target.title} onClose={onClose} width={580}
      footer={<button type="button" onClick={onClose} style={modalButtonStyle("secondary")}>Done</button>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
        <div aria-live="polite">{notice && <SharingNotice tone={notice.tone}>{notice.text}</SharingNotice>}</div>

        {addOpen ? (
          <AddShareForm workspaceId={workspaceId} target={target} autoFocus
            onShared={share => {
              setShares(list => [share, ...list.filter(s => s.shareId !== share.shareId)]);
              setNotice({ tone: "success", text: `Shared with ${share.email}. ${NO_EMAIL_COPY}` });
              changed();
            }} />
        ) : (
          <div>
            <SmallButton icon={UserPlus} label="+ Add more" variant="primary" onClick={() => { setNotice(null); setAddOpen(true); }} />
          </div>
        )}

        <section aria-labelledby="share-people-heading" style={{ minWidth: 0 }}>
          <h3 id="share-people-heading" style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, margin: "0 0 8px" }}>
            People with access{loadState === "ready" ? ` (${people})` : ""}
          </h3>
          {loadState === "loading" && <p role="status" style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>Loading who has access…</p>}
          {loadState === "error" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
              <SharingNotice tone="error">{loadError}</SharingNotice>
              <SmallButton label="Try again" onClick={load} />
            </div>
          )}
          {loadState === "ready" && people === 0 && (
            <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>Not shared with anyone yet. Participants always keep their own access.</p>
          )}
          {loadState === "ready" && people > 0 && (
            <ul data-testid="share-people" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {shares.map(share => {
                const status = share.status === "removed" ? null : SHARE_STATUS[share.status];
                return (
                  <li key={share.shareId} data-testid="share-person" style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", minWidth: 0 }}>
                    <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                      <div style={{ ...GF, fontSize: 14, fontWeight: 600, color: NAVY, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", overflowWrap: "anywhere" }}>
                        <UserRound size={14} aria-hidden color={SLATE} /> <span style={{ minWidth: 0 }}>{shareName(share)}</span>
                        {status && <StatusChip tone={status.tone}>{status.label}</StatusChip>}
                      </div>
                      <div style={{ ...GF, fontSize: 12.5, color: SLATE, marginTop: 3, overflowWrap: "anywhere" }}>
                        <Mail size={12} aria-hidden style={{ display: "inline-block", verticalAlign: "-2px" }} /> {share.email} · Shared {formatSharingDate(share.createdAt)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {share.status !== "rejected" && (
                        <SmallButton icon={Pencil} label="Edit" ariaLabel={`Edit ${shareName(share)}`}
                          onClick={() => { setNotice(null); setView({ k: "edit", share }); }} />
                      )}
                      <SmallButton icon={Trash2} label="Remove" variant="danger" ariaLabel={`Remove ${shareName(share)}`}
                        onClick={() => { setNotice(null); setView({ k: "remove-share", share }); }} />
                    </div>
                  </li>
                );
              })}
              {requests.map(req => (
                <li key={req.requestId} data-testid="share-person" style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", minWidth: 0 }}>
                  <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                    <div style={{ ...GF, fontSize: 14, fontWeight: 600, color: NAVY, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", overflowWrap: "anywhere" }}>
                      <UserRound size={14} aria-hidden color={SLATE} /> <span style={{ minWidth: 0 }}>{req.requester.displayName}</span>
                      <StatusChip tone="info">Approved request</StatusChip>
                    </div>
                    <div style={{ ...GF, fontSize: 12.5, color: SLATE, marginTop: 3, overflowWrap: "anywhere" }}>
                      <Mail size={12} aria-hidden style={{ display: "inline-block", verticalAlign: "-2px" }} /> {req.requester.email} · Approved {formatSharingDate(req.decidedAt ?? req.updatedAt)}
                    </div>
                  </div>
                  <SmallButton icon={Trash2} label="Remove" variant="danger" ariaLabel={`Remove ${req.requester.displayName}`}
                    onClick={() => { setNotice(null); setView({ k: "remove-request", request: req }); }} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ModalFrame>
  );
}

function AddShareForm({ workspaceId, target, autoFocus, onShared }: {
  workspaceId: string; target: ShareTarget; autoFocus?: boolean; onShared: (share: DocumentShare) => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!isValidShareEmail(email)) { setEmailError("Enter a valid email address."); return; }
    if (fullName.trim().length > MAX_FULL_NAME_LENGTH) { setError(`Keep the full name to ${MAX_FULL_NAME_LENGTH} characters or fewer.`); return; }
    setEmailError(null);
    setError(null);
    setBusy(true);
    try {
      const share = await documentSharingService.createShare(workspaceId, target.documentId, { email, fullName });
      setEmail("");
      setFullName("");
      onShared(share);
    } catch (err) {
      setError(sharingErrorMessage(err, "share"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form noValidate aria-label="Share with a person" onSubmit={e => { void submit(e); }}
      style={{ display: "flex", flexDirection: "column", gap: 12, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, background: "#F8FAFC", minWidth: 0 }}>
      <TextField label="Email address" type="email" required value={email} onChange={v => { setEmail(v); setEmailError(null); }}
        error={emailError} autoComplete="off" autoFocus={autoFocus} maxLength={320} />
      <TextField label="Full name" value={fullName} onChange={setFullName} autoComplete="off" maxLength={MAX_FULL_NAME_LENGTH} />
      <p style={{ ...GF, fontSize: 12.5, color: SLATE, margin: 0, lineHeight: 1.55 }}>{NO_EMAIL_COPY}</p>
      {error && <div role="alert"><SharingNotice tone="error">{error}</SharingNotice></div>}
      <div>
        <button type="submit" disabled={busy} style={modalButtonStyle("primary", busy)}>
          <Share2 size={15} aria-hidden /> {busy ? "Sharing…" : "Share"}
        </button>
      </div>
    </form>
  );
}

function EditShareView({ workspaceId, target, share, onClose, onCancel, onSaved }: {
  workspaceId: string; target: ShareTarget; share: DocumentShare;
  onClose: () => void; onCancel: () => void;
  onSaved: (share: DocumentShare, previous: DocumentShare | null) => void;
}) {
  const [email, setEmail] = useState(share.email);
  const [fullName, setFullName] = useState(share.fullName ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formId = useId();
  const emailChanged = email.trim().toLowerCase() !== share.email.toLowerCase();
  const nameChanged = fullName.trim() !== (share.fullName ?? "");

  async function save() {
    if (busy) return;
    if (!isValidShareEmail(email)) { setEmailError("Enter a valid email address."); return; }
    if (!emailChanged && !nameChanged) { setError("Nothing has changed."); return; }
    setEmailError(null);
    setError(null);
    setBusy(true);
    try {
      const result = await documentSharingService.updateShare(workspaceId, target.documentId, share.shareId, {
        ...(emailChanged ? { email } : {}),
        ...(nameChanged ? { fullName } : {}),
      });
      onSaved(result.share, result.previous);
    } catch (err) {
      setError(sharingErrorMessage(err, "edit"));
      setBusy(false);
    }
  }

  return (
    <ModalFrame title="Edit shared person" subtitle={target.title} onClose={onClose} busy={busy} width={500}
      footer={<>
        <button type="button" onClick={onCancel} disabled={busy} style={modalButtonStyle("secondary", busy)}>Cancel</button>
        <button type="submit" form={formId} disabled={busy} style={modalButtonStyle("primary", busy)}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </>}>
      <form id={formId} noValidate aria-label="Edit shared person" onSubmit={e => { e.preventDefault(); void save(); }}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <TextField label="Full name" value={fullName} onChange={setFullName} autoFocus maxLength={MAX_FULL_NAME_LENGTH} autoComplete="off" />
        <TextField label="Email address" type="email" required value={email} onChange={v => { setEmail(v); setEmailError(null); }}
          error={emailError} maxLength={320} autoComplete="off" />
        <SharingNotice tone="info">{EMAIL_CHANGE_COPY}</SharingNotice>
        {error && <div role="alert"><SharingNotice tone="error">{error}</SharingNotice></div>}
      </form>
    </ModalFrame>
  );
}

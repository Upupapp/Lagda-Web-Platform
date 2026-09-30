// Share a completed document, and manage who it is shared with.
//
// One dialog, two starting points:
//   mode "add"   the Share button on a Completed card, "Add more" in Shared By Me:
//                the ways to add someone first — from your contacts (one click,
//                only people without access), or manually by email — then the
//                people with access.
//   mode "list"  "View people with access" in Shared By Me: the people with
//                access, each with Edit and Remove, then the document's
//                participants (read-only: they always keep their own access).
//
// Edit and Remove swap the dialog's content rather than stacking a second
// modal, so there is always exactly one focus trap and one Escape handler.
// Nothing is emailed: the recipient finds the document in Shared Documents →
// Shared With Me once they have a LAGDA account with that verified address.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Share2, Pencil, Trash2, UserPlus, UserRound, Mail, BookUser, Keyboard, PenLine } from "lucide-react";
import { DEFAULT_CONTACT_QUERY } from "../../models/contacts";
import { PersonAvatar } from "../../pages/platform/contacts/contacts-ui";
import { ModalFrame, modalButtonStyle } from "../contact-requests/ModalFrame";
import {
  documentSharingService, sharingErrorMessage, isValidShareEmail, formatSharingDate,
  MAX_FULL_NAME_LENGTH,
  type DocumentShare, type AccessRequest, type DocumentParticipant,
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
  const [participants, setParticipants] = useState<readonly DocumentParticipant[]>([]);
  const [addWay, setAddWay] = useState<"contacts" | "manual">("contacts");
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
        setParticipants(result.participants ?? []);
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
  // Who already has access, by address: the contacts picker leaves them out.
  const withAccess = new Set<string>([
    ...shares.filter(s => s.status !== "rejected").map(s => s.email.trim().toLowerCase()),
    ...requests.map(r => r.requester.email.trim().toLowerCase()),
    ...participants.map(p => p.email.trim().toLowerCase()),
  ]);
  const onShared = (share: DocumentShare) => {
    setShares(list => [share, ...list.filter(s => s.shareId !== share.shareId)]);
    setNotice({ tone: "success", text: `Shared with ${share.fullName ?? share.email}. ${NO_EMAIL_COPY}` });
    changed();
  };

  return (
    <ModalFrame key="main" title={mode === "list" ? "People with access" : "Share document"} subtitle={target.title} onClose={onClose} width={600}
      footer={<button type="button" onClick={onClose} style={modalButtonStyle("secondary")}>Done</button>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
        <div aria-live="polite">{notice && <SharingNotice tone={notice.tone}>{notice.text}</SharingNotice>}</div>

        {addOpen ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
            <div role="tablist" aria-label="How to add someone" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 10, background: "#EEF2F7", border: `1px solid ${BORDER}` }}>
              {([["contacts", "From your contacts", BookUser], ["manual", "Enter manually", Keyboard]] as const).map(([key, label, Icon]) => (
                <button key={key} type="button" role="tab" aria-selected={addWay === key} data-testid={`add-way-${key}`}
                  onClick={() => { setAddWay(key); setNotice(null); }}
                  style={{ ...GF, flex: "1 1 0", minWidth: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                    minHeight: 38, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: addWay === key ? 700 : 600,
                    background: addWay === key ? "#FFFFFF" : "transparent", color: addWay === key ? NAVY : SLATE,
                    boxShadow: addWay === key ? "0 1px 3px rgba(7,17,31,0.14)" : "none" }}>
                  <Icon size={15} aria-hidden /> {label}
                </button>
              ))}
            </div>
            {addWay === "contacts"
              ? <ContactsPicker workspaceId={workspaceId} target={target} excluded={withAccess} onShared={onShared} />
              : <AddShareForm workspaceId={workspaceId} target={target} autoFocus onShared={onShared} />}
          </div>
        ) : (
          <div>
            <SmallButton icon={UserPlus} label="Add more" variant="primary" onClick={() => { setNotice(null); setAddOpen(true); }} />
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
            <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>Not shared with anyone yet.</p>
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

        {loadState === "ready" && participants.length > 0 && <ParticipantsList participants={participants} />}
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

// ── Participants (read-only) ──────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  SIGNER: "Signer", APPROVER: "Approver", REVIEWER: "Reviewer", ACKNOWLEDGER: "Acknowledgement",
  ACKNOWLEDGMENT_RECIPIENT: "Acknowledgement", VIEWER: "Viewer", CC: "Copy", CARBON_COPY: "Copy",
};
const roleLabel = (role: string) => ROLE_LABEL[role.toUpperCase()]
  ?? role.toLowerCase().replace(/[_-]+/g, " ").replace(/^\w/, c => c.toUpperCase());

function ParticipantsList({ participants }: { participants: readonly DocumentParticipant[] }) {
  return (
    <section aria-labelledby="share-participants-heading" style={{ minWidth: 0 }}>
      <h3 id="share-participants-heading" style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 6 }}>
        <PenLine size={15} aria-hidden /> Participants ({participants.length})
      </h3>
      <p style={{ ...GF, fontSize: 12.5, color: SLATE, margin: "0 0 8px" }}>They took part in the document and always keep their own access.</p>
      <ul data-testid="share-participants" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {participants.map(p => (
          <li key={p.email} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 12px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", background: "#FBFCFE", minWidth: 0 }}>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <div style={{ ...GF, fontSize: 13.5, fontWeight: 600, color: NAVY, overflowWrap: "anywhere" }}>{p.name}</div>
              <div style={{ ...GF, fontSize: 12.5, color: SLATE, overflowWrap: "anywhere" }}>{p.email}{p.organization ? ` · ${p.organization}` : ""}</div>
            </div>
            <StatusChip tone="info">{roleLabel(p.role)}</StatusChip>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Add from your contacts ────────────────────────────────────────────────

interface PickableContact { id: string; name: string; email: string; organization?: string; avatarUrl?: string }

/**
 * The contacts who do not yet have access: not a participant, not already
 * shared with (a live share), not holding an approved request. One click
 * shares the document with them, under the name in your contacts.
 */
function ContactsPicker({ workspaceId, target, excluded, onShared }: {
  workspaceId: string; target: ShareTarget; excluded: ReadonlySet<string>;
  onShared: (share: DocumentShare) => void;
}) {
  const [contacts, setContacts] = useState<PickableContact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("../../services/contacts-source")
      .then(m => m.listContacts(workspaceId, { ...DEFAULT_CONTACT_QUERY, perPage: 100, sort: "name", direction: "asc" }))
      .then(page => {
        if (cancelled) return;
        setContacts(page.items.map(c => ({
          id: c.id, name: c.name, email: c.email,
          ...(c.organization ? { organization: c.organization } : {}),
          ...(c.avatarUrl ? { avatarUrl: c.avatarUrl } : {}),
        })));
      })
      .catch(() => { if (!cancelled) setError("Your contacts could not be loaded."); });
    return () => { cancelled = true; };
  }, [workspaceId]);

  const q = search.trim().toLowerCase();
  const available = (contacts ?? []).filter(c => !excluded.has(c.email.trim().toLowerCase()));
  const shown = available.filter(c => q === "" || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));

  const add = async (c: PickableContact) => {
    setBusy(c.id); setError(null);
    try {
      const share = await documentSharingService.createShare(workspaceId, target.documentId, { email: c.email, fullName: c.name });
      onShared(share);
    } catch (err) {
      setError(sharingErrorMessage(err, "share"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div data-testid="share-contacts-picker" style={{ display: "flex", flexDirection: "column", gap: 10, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, background: "#F8FAFC", minWidth: 0 }}>
      <TextField label="Search your contacts" value={search} onChange={setSearch} autoComplete="off" autoFocus maxLength={120} />
      {error && <div role="alert"><SharingNotice tone="error">{error}</SharingNotice></div>}
      {contacts === null && !error && <p role="status" style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>Loading your contacts…</p>}
      {contacts !== null && available.length === 0 && (
        <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>Everyone in your contacts already has access. Enter someone manually instead.</p>
      )}
      {contacts !== null && available.length > 0 && shown.length === 0 && (
        <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>No contact matches “{search.trim()}”.</p>
      )}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
        {shown.map(c => (
          <li key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 10px", minWidth: 0 }}>
            <PersonAvatar name={c.name} avatarUrl={c.avatarUrl} size={34} />
            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
              <div style={{ ...GF, fontSize: 13.5, fontWeight: 600, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
              <div style={{ ...GF, fontSize: 12, color: SLATE, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}{c.organization ? ` · ${c.organization}` : ""}</div>
            </div>
            <SmallButton icon={UserPlus} label={busy === c.id ? "Adding…" : "Give access"} variant="primary" ariaLabel={`Give ${c.name} access`}
              disabled={busy !== null} onClick={() => { void add(c); }} />
          </li>
        ))}
      </ul>
      <p style={{ ...GF, fontSize: 12.5, color: SLATE, margin: 0, lineHeight: 1.55 }}>{NO_EMAIL_COPY}</p>
    </div>
  );
}

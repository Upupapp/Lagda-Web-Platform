// Members → "Join links" (078). Owner / administrator only.
//
// A join link is a single-use ticket, sectioned by where it is in its life:
//   Draft      — created, editable, not yet a link. Edit · Send.
//   Sent       — a live link. Copy · QR code · Withdraw. Once someone uses
//                it, it is dead: the row says who used it and the Copy / QR
//                actions go away.
//   Withdrawn  — dead. "Send again" issues a NEW link; the old one stays dead.
// There is no time-based expiry.

import { useCallback, useEffect, useId, useState } from "react";
import { VerificationQRCode } from "../../../../components/verification/VerificationQRCode";
import { useViewport } from "../../../../hooks/useViewport";
import {
  listJoinTickets, createJoinTicket, updateJoinTicket, sendJoinTicket, withdrawJoinTicket,
  validateTicketInput, JoinActionError, JOIN_TICKET_LABEL_MAX,
  type JoinTicket, type JoinTicketState,
} from "../../../../services/real/workspace-join.service";
import { Dialog, ErrorNote } from "./join-ui";
import {
  buttonStyle, formatWhen, hintStyle, inputStyle, labelStyle,
  GF, GM, NAVY, AZURE, SLATE, SILVER, BORDER,
} from "./join-styles";

const TABS: { id: JoinTicketState; label: string; empty: string }[] = [
  { id: "sent", label: "Sent", empty: "No sent links. Create a link and send it to someone you want to invite." },
  { id: "withdrawn", label: "Withdrawn", empty: "No withdrawn links." },
  { id: "draft", label: "Draft", empty: "No drafts. Create a link to start one." },
];

const REQUEST_STATE_LABEL = { pending: "pending approval", approved: "approved", declined: "declined" } as const;

function message(err: unknown): string {
  return err instanceof JoinActionError ? err.message : "Something went wrong. Please try again.";
}

type Modal =
  | { kind: "create" }
  | { kind: "edit"; ticket: JoinTicket }
  | { kind: "send"; ticket: JoinTicket }
  | { kind: "withdraw"; ticket: JoinTicket }
  | { kind: "qr"; ticket: JoinTicket }
  | null;

export function JoinLinksSection({ workspaceId, onChanged, flush = false }: {
  workspaceId: string; onChanged?: () => void;
  /** On its own page: no top margin. */
  flush?: boolean;
}) {
  const { isNarrow } = useViewport();
  const [tickets, setTickets] = useState<JoinTicket[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<JoinTicketState>("sent");
  const [modal, setModal] = useState<Modal>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const headingId = useId();

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setTickets(await listJoinTickets(workspaceId));
    } catch (err) {
      setLoadError(message(err));
    }
  }, [workspaceId]);

  useEffect(() => { void load(); }, [load]);

  const replace = (next: JoinTicket) => {
    setTickets(list => {
      const rest = (list ?? []).filter(t => t.ticketId !== next.ticketId);
      return [next, ...rest];
    });
    onChanged?.();
  };

  const counts: Record<JoinTicketState, number> = { sent: 0, withdrawn: 0, draft: 0 };
  for (const t of tickets ?? []) counts[t.state] += 1;
  const visible = (tickets ?? []).filter(t => t.state === tab);

  async function copy(ticket: JoinTicket) {
    if (!ticket.linkUrl) return;
    try {
      await navigator.clipboard.writeText(ticket.linkUrl);
      setCopiedId(ticket.ticketId);
      setTimeout(() => setCopiedId(id => (id === ticket.ticketId ? null : id)), 2000);
    } catch {
      setNotice("Copying isn't available here. Open the QR code to see the full link.");
    }
  }

  return (
    <section aria-labelledby={headingId} data-testid="join-links-section"
      style={{ background: "#FFFFFF", border: `1.5px solid ${BORDER}`, borderRadius: 12, marginTop: flush ? 0 : 24, overflow: "hidden" }}>
      <div style={{ padding: isNarrow ? "16px" : "18px 20px", display: "flex", gap: 12, alignItems: isNarrow ? "stretch" : "center", justifyContent: "space-between", flexDirection: isNarrow ? "column" : "row" }}>
        <div>
          <h2 id={headingId} style={{ ...GF, fontSize: 16, fontWeight: 800, color: NAVY, margin: 0 }}>Join links</h2>
          <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "4px 0 0", lineHeight: 1.5 }}>
            Each link works once. Whoever uses it asks to join, and you approve or decline the request.
          </p>
        </div>
        <button type="button" onClick={() => setModal({ kind: "create" })} style={buttonStyle("primary")}>
          + Create link
        </button>
      </div>

      <div role="tablist" aria-label="Join links by status"
        style={{ display: "flex", borderBottom: `1px solid ${BORDER}`, padding: isNarrow ? "0 8px" : "0 16px" }}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} type="button" role="tab" id={`join-tab-${t.id}`}
              aria-selected={active} aria-controls="join-links-panel"
              onClick={() => setTab(t.id)}
              style={{
                ...GF, fontSize: 13, fontWeight: active ? 700 : 500, color: active ? AZURE : SLATE,
                background: "none", border: "none", borderBottom: `2px solid ${active ? AZURE : "transparent"}`,
                padding: "10px 12px", cursor: "pointer", flex: isNarrow ? 1 : undefined, minHeight: 44,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
              {t.label}
              <span style={{ ...GM, fontSize: 10, padding: "1px 7px", borderRadius: 999, background: active ? "#EBF4FC" : "#F1F5F9", color: active ? AZURE : SLATE }}>
                {counts[t.id]}
              </span>
            </button>
          );
        })}
      </div>

      <div id="join-links-panel" role="tabpanel" aria-labelledby={`join-tab-${tab}`} style={{ padding: isNarrow ? 12 : 16 }}>
        {notice && <ErrorNote>{notice}</ErrorNote>}
        {loadError ? (
          <div style={{ textAlign: "center", padding: 16 }}>
            <ErrorNote>{loadError}</ErrorNote>
            <button type="button" onClick={() => void load()} style={buttonStyle("secondary")}>Try again</button>
          </div>
        ) : tickets === null ? (
          <p aria-busy="true" style={{ ...GF, fontSize: 13, color: SLATE, textAlign: "center", margin: "12px 0" }}>Loading join links…</p>
        ) : visible.length === 0 ? (
          <p style={{ ...GF, fontSize: 13, color: SLATE, textAlign: "center", margin: "12px 0" }}>
            {TABS.find(t => t.id === tab)?.empty}
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {visible.map(t => (
              <TicketRow key={t.ticketId} ticket={t} narrow={isNarrow} copied={copiedId === t.ticketId}
                onEdit={() => setModal({ kind: "edit", ticket: t })}
                onSend={() => setModal({ kind: "send", ticket: t })}
                onWithdraw={() => setModal({ kind: "withdraw", ticket: t })}
                onQr={() => setModal({ kind: "qr", ticket: t })}
                onCopy={() => void copy(t)} />
            ))}
          </ul>
        )}
      </div>

      {(modal?.kind === "create" || modal?.kind === "edit") && (
        <TicketFormDialog
          ticket={modal.kind === "edit" ? modal.ticket : null}
          onClose={() => setModal(null)}
          onSave={async (input) => {
            const saved = modal.kind === "edit"
              ? await updateJoinTicket(workspaceId, modal.ticket.ticketId, input)
              : await createJoinTicket(workspaceId, input);
            replace(saved);
            setTab("draft");
            setModal(null);
          }}
        />
      )}
      {modal?.kind === "send" && (
        <SendDialog ticket={modal.ticket} onClose={() => setModal(null)}
          onSend={async (email) => {
            const sent = await sendJoinTicket(workspaceId, modal.ticket.ticketId, { email });
            replace(sent);
            setTab("sent");
            setNotice(null);
            setModal({ kind: "qr", ticket: sent });
          }} />
      )}
      {modal?.kind === "withdraw" && (
        <WithdrawDialog ticket={modal.ticket} onClose={() => setModal(null)}
          onConfirm={async () => {
            replace(await withdrawJoinTicket(workspaceId, modal.ticket.ticketId));
            setModal(null);
          }} />
      )}
      {modal?.kind === "qr" && modal.ticket.linkUrl && (
        <Dialog title={`Join link — ${modal.ticket.label}`} onClose={() => setModal(null)}
          footer={<>
            <button type="button" onClick={() => setModal(null)} style={buttonStyle("secondary")}>Close</button>
            <button type="button" onClick={() => void copy(modal.ticket)} style={buttonStyle("primary")}>
              {copiedId === modal.ticket.ticketId ? "Copied" : "Copy link"}
            </button>
          </>}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <VerificationQRCode url={modal.ticket.linkUrl} size={200} alt={`QR code for the join link "${modal.ticket.label}"`} />
            <p style={{ ...GM, fontSize: 11, color: SLATE, wordBreak: "break-all", textAlign: "center", margin: 0 }}>{modal.ticket.linkUrl}</p>
            <p style={{ ...hintStyle, textAlign: "center" }}>This link works once. After someone uses it, it can't be used again.</p>
          </div>
        </Dialog>
      )}
    </section>
  );
}

function TicketRow({ ticket, narrow, copied, onEdit, onSend, onWithdraw, onQr, onCopy }: {
  ticket: JoinTicket; narrow: boolean; copied: boolean;
  onEdit: () => void; onSend: () => void; onWithdraw: () => void; onQr: () => void; onCopy: () => void;
}) {
  const used = ticket.usedAt !== null;
  const meta = ticket.state === "draft" ? `Created ${formatWhen(ticket.createdAt)}`
    : ticket.state === "sent" ? `Sent ${formatWhen(ticket.sentAt)}`
    : `Withdrawn ${formatWhen(ticket.withdrawnAt)}`;

  return (
    <li data-testid={`join-ticket-${ticket.ticketId}`}
      style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: narrow ? 12 : "12px 14px", display: "flex", gap: 12, flexDirection: narrow ? "column" : "row", alignItems: narrow ? "stretch" : "center" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, overflowWrap: "anywhere" }}>{ticket.label}</div>
        <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 2, overflowWrap: "anywhere" }}>
          {ticket.recipientEmail ?? "No email — share the link yourself"}
        </div>
        <div style={{ ...GM, fontSize: 11, color: SILVER, marginTop: 4 }}>{meta}</div>
        {used && ticket.request && (
          <div style={{ ...GF, fontSize: 12, color: NAVY, marginTop: 6, background: "#F8FAFC", borderRadius: 6, padding: "4px 8px", display: "inline-block" }}>
            Used by <strong>{ticket.request.fullName}</strong> · {REQUEST_STATE_LABEL[ticket.request.state]}
          </div>
        )}
        {used && !ticket.request && (
          <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 6 }}>Used {formatWhen(ticket.usedAt)}</div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: narrow ? "flex-start" : "flex-end" }}>
        {ticket.state === "draft" && (<>
          <button type="button" onClick={onEdit} style={buttonStyle("secondary")} aria-label={`Edit ${ticket.label}`}>Edit</button>
          <button type="button" onClick={onSend} style={buttonStyle("primary")} aria-label={`Send ${ticket.label}`}>Send</button>
        </>)}
        {ticket.state === "sent" && !used && ticket.linkUrl && (<>
          <button type="button" onClick={onCopy} style={buttonStyle("secondary")} aria-label={`Copy link for ${ticket.label}`}>
            {copied ? "Copied" : "Copy link"}
          </button>
          <button type="button" onClick={onQr} style={buttonStyle("secondary")} aria-label={`QR code for ${ticket.label}`}>QR code</button>
        </>)}
        {ticket.state === "sent" && !used && (
          <button type="button" onClick={onWithdraw} style={{ ...buttonStyle("secondary"), color: "#B42318" }} aria-label={`Withdraw ${ticket.label}`}>Withdraw</button>
        )}
        {ticket.state === "withdrawn" && (
          <button type="button" onClick={onSend} style={buttonStyle("primary")} aria-label={`Send ${ticket.label} again`}>Send again</button>
        )}
      </div>
    </li>
  );
}

function TicketFormDialog({ ticket, onClose, onSave }: {
  ticket: JoinTicket | null; onClose: () => void;
  onSave: (input: { label: string; recipientEmail: string | null }) => Promise<void>;
}) {
  const [label, setLabel] = useState(ticket?.label ?? "");
  const [email, setEmail] = useState(ticket?.recipientEmail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const labelId = useId();
  const emailId = useId();

  async function submit() {
    const checked = validateTicketInput(label, email);
    if ("error" in checked) { setError(checked.error); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(checked.input);
    } catch (err) {
      setError(message(err));
      setSaving(false);
    }
  }

  return (
    <Dialog title={ticket ? "Edit draft link" : "Create join link"} onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={buttonStyle("secondary")}>Cancel</button>
        <button type="button" onClick={() => void submit()} disabled={saving} style={buttonStyle("primary", saving)}>
          {saving ? "Saving…" : "Save as draft"}
        </button>
      </>}>
      {error && <ErrorNote>{error}</ErrorNote>}
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor={labelId} style={labelStyle}>Label</label>
          <input id={labelId} type="text" value={label} maxLength={JOIN_TICKET_LABEL_MAX}
            onChange={(e) => setLabel(e.target.value)} placeholder="Finance team" style={inputStyle()}
            aria-describedby={`${labelId}-hint`} />
          <p id={`${labelId}-hint`} style={hintStyle}>For your reference, e.g. who the link is for. It is shown on the request.</p>
        </div>
        <div>
          <label htmlFor={emailId} style={labelStyle}>
            Recipient email <span style={{ fontWeight: 400, color: SLATE }}>(optional)</span>
          </label>
          <input id={emailId} type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com" style={inputStyle()} aria-describedby={`${emailId}-hint`} />
          <p id={`${emailId}-hint`} style={hintStyle}>Add one to send the link by email. Otherwise, copy the link and share it yourself.</p>
        </div>
      </form>
      <p style={{ ...hintStyle, marginTop: 14 }}>The link is saved as a draft. You can edit it until you send it.</p>
    </Dialog>
  );
}

function SendDialog({ ticket, onClose, onSend }: {
  ticket: JoinTicket; onClose: () => void; onSend: (email: boolean) => Promise<void>;
}) {
  const [byEmail, setByEmail] = useState(ticket.recipientEmail !== null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const again = ticket.state === "withdrawn";

  async function submit() {
    setSending(true);
    setError(null);
    try {
      await onSend(byEmail && ticket.recipientEmail !== null);
    } catch (err) {
      setError(message(err));
      setSending(false);
    }
  }

  return (
    <Dialog title={again ? "Send link again" : "Send join link"} onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={buttonStyle("secondary")}>Cancel</button>
        <button type="button" onClick={() => void submit()} disabled={sending} style={buttonStyle("primary", sending)}>
          {sending ? "Sending…" : byEmail && ticket.recipientEmail ? "Send" : "Create link"}
        </button>
      </>}>
      {error && <ErrorNote>{error}</ErrorNote>}
      <p style={{ ...GF, fontSize: 14, color: NAVY, margin: "0 0 12px", lineHeight: 1.5 }}>
        <strong>{ticket.label}</strong>
        {again ? " — this issues a new link. The withdrawn link stays unusable." : ""}
      </p>
      {ticket.recipientEmail ? (
        <label style={{ ...GF, fontSize: 14, color: NAVY, display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
          <input type="checkbox" checked={byEmail} onChange={(e) => setByEmail(e.target.checked)} style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0 }} />
          <span style={{ overflowWrap: "anywhere" }}>Send by email to {ticket.recipientEmail}</span>
        </label>
      ) : (
        <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0, lineHeight: 1.5 }}>
          This link has no recipient email. It will be created for you to copy or show as a QR code.
        </p>
      )}
      <p style={{ ...hintStyle, marginTop: 12 }}>The link works once and does not expire. You can withdraw it at any time.</p>
    </Dialog>
  );
}

function WithdrawDialog({ ticket, onClose, onConfirm }: {
  ticket: JoinTicket; onClose: () => void; onConfirm: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog title="Withdraw this link?" onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={buttonStyle("secondary")}>Cancel</button>
        <button type="button" disabled={busy} style={buttonStyle("danger", busy)}
          onClick={() => {
            setBusy(true);
            onConfirm().catch((err: unknown) => { setError(message(err)); setBusy(false); });
          }}>
          {busy ? "Withdrawing…" : "Withdraw link"}
        </button>
      </>}>
      {error && <ErrorNote>{error}</ErrorNote>}
      <p style={{ ...GF, fontSize: 14, color: SLATE, margin: 0, lineHeight: 1.6 }}>
        <strong style={{ color: NAVY }}>{ticket.label}</strong> will stop working immediately. You can send it again later, which creates a new link.
      </p>
    </Dialog>
  );
}

// Send this document out for signing again.
//
// ── What the sender needs to understand before pressing send ─────────────
//
// This is not "resend the same email". It creates a NEW signing request over
// the same document, with its own audit trail, and it repoints the document's
// recipient list at the addresses typed here. The original request keeps its
// own snapshot and stays exactly as it was.
//
// Both of those are stated on the panel rather than buried here, because the
// consequence lands on people outside the product: an email goes to every
// address in that box, immediately, containing a link that can sign a legal
// document. There is no undo and no preview step.
//
// ── Two more things said before sending ───────────────────────────────────
//
// The title. The server gives the new request its own numbered title
// ("Lease (2)"). The sender is told so before they confirm, and told which
// title it got, from the server's answer, once it is sent.
//
// The identity check. Who must pass "ID and face verification" is kept by
// the participant's EMAIL, so a re-send to a new address used to drop it
// without a word. Where the check is offered, each recipient who will act is
// listed with a switch: the same section, and the same switch, as Prepare's
// Authentication step. The set is saved before the new request is made, and
// a send whose set could not be saved does not go out.

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { X, Send, AlertCircle, Loader2, Mail, Users } from "lucide-react";
import {
  resendSigningService, parseRecipients, looksLikeEmail, MAX_RESEND_RECIPIENTS,
  canResendTo, type ResendIdentity,
} from "../../services/real/resend-signing.service";
import type { RealRecipient } from "../../services/real/recipient.service";
import { USE_REAL_BACKEND } from "../../services/backend-flag";
import { Z } from "../../utils/z-index";
import { withProcess } from "../../config/process-screens";
import { toastSuccess } from "../brand/BrandToast";
import { IdentityCheckSection, type IdentityCheckPerson } from "../prepare/IdentityCheckSection";
import {
  identityEmailKey, type IdentityRequirementsControl,
} from "../../hooks/useIdentityCheckRequirements";
import { useResendIdentityCheck } from "../../hooks/useResendIdentityCheck";
import { roleCanBeAskedForIdentityCheck } from "../../models/identity-check";

const GF: CSSProperties = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const SLATE = "#64748B";
const SILVER = "#8A9BAE";
const AZURE = "#0078D4";
const DANGER = "#C0392B";

type Mode = "new" | "same";

/** "8 Oct 2026": the day a lighter method was allowed. Empty if unreadable. */
function dayLabel(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return at.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Small-screen sizes and the gentle opening of what arrives after the dialog
 * is already on screen (the identity section). A row that grows from nothing
 * does not push the buttons out from under a finger.
 */
const DIALOG_STYLES = `
  .rsd-reveal { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 180ms ease; }
  .rsd-reveal[data-open="true"] { grid-template-rows: 1fr; }
  .rsd-reveal > div { overflow: hidden; min-height: 0; }
  @media (prefers-reduced-motion: reduce) { .rsd-reveal { transition: none; } }
  @media (max-width: 560px) { .rsd-touch { min-height: 44px !important; min-width: 44px; } }
`;

function Reveal({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className="rsd-reveal" data-open={open ? "true" : "false"}>
      <div>{open ? children : null}</div>
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  signer: "Signer",
  approver: "Approver",
  reviewer: "Reviewer",
  "acknowledgment-recipient": "Acknowledges",
  viewer: "Viewer",
  "carbon-copy": "Copy recipient",
};

/** The two options, as a segmented control that stays one row on a phone. */
function ModeSwitch({ mode, onChange, disabled }: {
  mode: Mode; onChange: (m: Mode) => void; disabled: boolean;
}) {
  const option = (value: Mode, label: string, Icon: typeof Mail) => {
    const active = mode === value;
    return (
      <button
        type="button"
        role="tab"
        className="rsd-touch"
        aria-selected={active}
        disabled={disabled}
        onClick={() => { onChange(value); }}
        style={{
          ...GF, flex: "1 1 0", minWidth: 0, minHeight: 40, padding: "6px 8px",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
          borderRadius: 8, border: "none", cursor: disabled ? "not-allowed" : "pointer",
          background: active ? "#FFFFFF" : "transparent",
          boxShadow: active ? "0 1px 3px rgba(7,17,31,0.12)" : "none",
          color: active ? AZURE : SLATE, fontSize: 12.5, fontWeight: 700,
          lineHeight: 1.2, textAlign: "center",
        }}
      >
        <Icon size={14} aria-hidden style={{ flexShrink: 0 }} />
        <span>{label}</span>
      </button>
    );
  };
  return (
    <div role="tablist" aria-label="Who to send to" style={{
      display: "flex", gap: 4, padding: 4, borderRadius: 10, background: "#F1F5F9",
      marginBottom: 14,
    }}>
      {option("new", "Send to new emails", Mail)}
      {option("same", "Re-send to same participants", Users)}
    </div>
  );
}

export function ResendSigningDialog({
  workspaceId, documentId, documentTitle, onClose, onSent, allowSameParticipants = true, signingRequestId,
}: {
  /**
   * The request being sent again. Its identity checks are where "locked",
   * "name on ID did not match" and "lighter method allowed" are read from.
   * Absent: nothing is said of any of them.
   */
  signingRequestId?: string;
  /**
   * False from Documents › Sent: a document still out for signing is sent on
   * to NEW addresses only. Re-sending it to the people who already have it is
   * what turns into repeated emails, so that option is not offered there.
   */
  allowSameParticipants?: boolean;
  workspaceId: string;
  documentId: string;
  documentTitle: string;
  onClose: () => void;
  onSent: (signingRequestId: string, sentTo: number) => void;
}) {
  const [mode, setMode] = useState<Mode>("new");
  const [raw, setRaw] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "Same participants": loaded on first switch, everyone included by default.
  const [participants, setParticipants] = useState<RealRecipient[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  // The identity check, where it is offered. With it on, the current
  // participants are needed for new addresses too: a new address starts from
  // what the person it replaces was asked for.
  const identity = useResendIdentityCheck({ workspaceId, documentId, signingRequestId });
  const identityOn = identity.status === "ready";
  useEffect(() => {
    if (!(mode === "same" || identityOn) || participants !== null) return;
    let live = true;
    resendSigningService.currentParticipants(workspaceId, documentId)
      .then(list => { if (live) setParticipants(list); })
      .catch(() => { if (live) setLoadError("The participants could not be loaded. Close this and try again."); });
    return () => { live = false; };
  }, [mode, identityOn, participants, workspaceId, documentId]);

  const addresses = parseRecipients(raw);
  const invalid = addresses.filter(a => !looksLikeEmail(a));
  const overLimit = addresses.length > MAX_RESEND_RECIPIENTS;
  const kept = (participants ?? []).filter(p => !excluded.has(p.recipientId));
  const sameReady = participants !== null && canResendTo(kept);

  // ── Who will act on the new request, and who must pass the check ──────────
  const validAddresses = overLimit ? [] : addresses.filter(looksLikeEmail);
  const addressesKey = validAddresses.map(identityEmailKey).join("\n");
  const keptKey = kept.map(p => p.recipientId).join("\n");
  const people = useMemo<IdentityCheckPerson[]>(() => (mode === "same"
    ? kept.filter(p => roleCanBeAskedForIdentityCheck(p.type))
      .map(p => ({ id: p.recipientId, name: p.name, email: p.email, role: p.type }))
    // Every new address is added as a signer (see resend-signing.service.ts).
    : validAddresses.map(email => ({ id: `new:${identityEmailKey(email)}`, name: "", email, role: "signer" }))),
  // `kept` and `validAddresses` are rebuilt every render; their keys say when they changed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [mode, keptKey, addressesKey]);

  // Where each switch STARTS. The same participants start from what the
  // document holds. A new address that is already on the document keeps its
  // own; every other new address takes the place of somebody leaving, in the
  // order the server pairs them (first newcomer, first to leave), and starts
  // ON when that person had to pass the check.
  const starting = useMemo(() => {
    const on = new Map<string, boolean>();
    const inheritedFrom = new Map<string, string>();
    if (mode === "same") {
      for (const person of people) on.set(identityEmailKey(person.email), identity.required.has(identityEmailKey(person.email)));
      return { on, inheritedFrom };
    }
    const previous = participants ?? [];
    const previousKeys = new Set(previous.map(p => identityEmailKey(p.email)));
    const newKeys = people.map(person => identityEmailKey(person.email));
    const staying = new Set(newKeys.filter(email => previousKeys.has(email)));
    const leaving = previous.filter(p => !staying.has(identityEmailKey(p.email)));
    let next = 0;
    for (const email of newKeys) {
      if (staying.has(email)) { on.set(email, identity.required.has(email)); continue; }
      const replaced = leaving[next];
      next += 1;
      const inherits = replaced !== undefined && identity.required.has(identityEmailKey(replaced.email));
      on.set(email, inherits);
      if (inherits) inheritedFrom.set(email, replaced.name.trim() !== "" ? replaced.name : replaced.email);
    }
    return { on, inheritedFrom };
  }, [mode, people, participants, identity.required]);

  // What the sender changed. Everything else follows `starting`.
  const [chosen, setChosen] = useState<ReadonlyMap<string, boolean>>(new Map());
  // Addresses allowed a lighter method that the sender switched off and on
  // again: they are to be asked once more.
  const [askAgain, setAskAgain] = useState<ReadonlySet<string>>(new Set());
  const isRequired = (email: string) => {
    const key = identityEmailKey(email);
    return chosen.get(key) ?? starting.on.get(key) ?? false;
  };
  const setRequired = (email: string, required: boolean) => {
    const key = identityEmailKey(email);
    const was = isRequired(email);
    setChosen(current => new Map(current).set(key, required));
    if (required && !was && identity.waivedAt.has(key)) setAskAgain(current => new Set(current).add(key));
    if (!required) setAskAgain(current => { const rest = new Set(current); rest.delete(key); return rest; });
  };
  const setAll = (emails: readonly string[], required: boolean) => {
    for (const email of emails) setRequired(email, required);
  };
  const changeMode = (next: Mode) => {
    setMode(next);
    setError(null);
    // The two lists are different people; a choice made for one is not a
    // choice about the other.
    setChosen(new Map());
    setAskAgain(new Set());
  };

  const identityControl: IdentityRequirementsControl = {
    status: "ready", mode: identity.mode, flow: identity.flow,
    canEdit: !sending && participants !== null,
    // Nothing is saved until Send; there is no save to report here.
    saveState: "idle", error: null,
    isRequired,
    // The note below says more than the section's own line would.
    isWaived: () => false,
    setRequired,
    requireAllSigners: () => { setAll(people.filter(p => p.role === "signer").map(p => p.email), true); },
    clear: () => { setAll(people.map(p => p.email), false); },
  };

  const identityNote = (person: IdentityCheckPerson): ReactNode => {
    const key = identityEmailKey(person.email);
    if (!isRequired(person.email)) return null;
    const lines: string[] = [];
    const waivedAt = identity.waivedAt.get(key);
    if (waivedAt !== undefined) {
      const day = dayLabel(waivedAt);
      lines.push(askAgain.has(key)
        ? "They will be asked for it again on this resend."
        : `Lighter method allowed${day === "" ? "" : ` ${day}`}. They will not be asked for it again. Switch off and on to ask again.`);
    } else if (identity.locked.has(key)) {
      lines.push("Locked after 3 attempts today. Resending does not give more attempts. Allow a lighter method if they cannot pass.");
    } else if (identity.nameMismatch.has(key)) {
      lines.push("Name on ID did not match. Sending again does not change that; decide in Participants or send to the right person.");
    }
    const inherited = starting.inheritedFrom.get(key);
    if (inherited !== undefined && !chosen.has(key)) lines.push(`On because ${inherited}, who they replace, was asked for it.`);
    if (lines.length === 0) return null;
    return (
      <div data-testid={`resend-identity-note-${key}`} style={{ ...GF, fontSize: 11.5, color: "#8A6100", marginTop: 2, lineHeight: 1.45 }}>
        {lines.map(line => <div key={line}>{line}</div>)}
      </div>
    );
  };

  // What is saved before the new request is made: everyone listed whose
  // switch is on. Absent when the check is not offered, and nothing is saved.
  const identityToSave: ResendIdentity | undefined = identityOn
    ? {
      emails: people.filter(p => isRequired(p.email)).map(p => identityEmailKey(p.email)),
      askAgain: people.map(p => identityEmailKey(p.email)).filter(email => askAgain.has(email) && isRequired(email)),
    }
    : undefined;

  // Not yet known whether a check applies, or what the document holds: a
  // send now could drop one, so there is no send until it is known.
  const identityPending = identity.status === "loading" || identity.status === "error"
    || (identityOn && participants === null);
  const canSend = !sending && !identityPending && (mode === "new"
    ? addresses.length > 0 && invalid.length === 0 && !overLimit
    : sameReady);

  // ── The title the new request will carry ──────────────────────────────────
  //
  // The server gives a re-send its own numbered title ("Lease (2)"), and
  // decides which only as it creates the request: nothing answers that in
  // advance (the title-suggestion route says "unchanged" for a document's own
  // title). So the sender is told THAT it will be numbered before they
  // confirm, and WHICH title it got from the server's own answer afterwards.
  // Nothing is said in the demo build, where nothing is numbered.

  // ── Focus ─────────────────────────────────────────────────────────────────
  const panelRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  sendingRef.current = sending;
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const first = panelRef.current?.querySelector<HTMLElement>("textarea, [role=tab]") ?? panelRef.current;
    first?.focus();
    return () => { opener?.focus(); };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); if (!sendingRef.current) onClose(); return; }
      if (e.key !== "Tab" || panelRef.current === null) return;
      // Keep Tab inside the dialog.
      const stops = [...panelRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), textarea:not([disabled]), input:not([disabled])")];
      if (stops.length === 0) return;
      const first = stops[0]!, last = stops[stops.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("keydown", onKey, true); };
  }, [onClose]);

  const toggle = (recipientId: string) => {
    setExcluded(current => {
      const next = new Set(current);
      if (next.has(recipientId)) next.delete(recipientId); else next.add(recipientId);
      return next;
    });
  };

  const submit = () => {
    // The ref, not the state: two presses in one tick must be one send.
    if (!canSend || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    // Passed only where the check is offered, so everywhere else the calls
    // are exactly what they always were.
    const options = identityToSave === undefined ? [] as const : [{ identity: identityToSave }] as const;
    void (async () => {
      try {
        const result = mode === "new"
          ? await withProcess("resend-new", "", () => resendSigningService.resend(
            workspaceId, documentId,
            addresses.map(email => ({ name: "", email })),
            ...options,
          ))
          : await withProcess("resend-same", "", () => resendSigningService.resendToSame(workspaceId, documentId, kept, ...options));
        // The title is the one the SERVER reports for the new request.
        const sentAs = typeof result.documentTitle === "string" && result.documentTitle !== "" ? result.documentTitle : null;
        toastSuccess("Sent for signing again", sentAs === null ? undefined : `Sent as "${sentAs}".`);
        onSent(result.signingRequestId, result.sentTo);
      } catch (err) {
        // The sequence mutates the document before it sends, so a failure
        // partway is possible and the message must not imply nothing
        // happened. It says what to check rather than "try again".
        setError(err instanceof Error && err.message.length > 0
          ? err.message
          : "That could not be sent. Check the document's recipients before trying again.");
        setSending(false);
      }
    })();
  };

  return (
    <>
      <div
        onClick={sending ? undefined : onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(7,17,31,0.45)", zIndex: Z.drawerScrim }}
      />
      <style>{DIALOG_STYLES}</style>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Send ${documentTitle} for signing again`}
        style={{
          position: "fixed", zIndex: Z.drawer, outline: "none",
          left: "50%", top: "50%", transform: "translate(-50%, -50%)",
          width: "min(560px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 32px)", overflowY: "auto",
          background: "#FFFFFF", borderRadius: 14,
          boxShadow: "0 24px 60px rgba(7,17,31,0.28)",
        }}
      >
        <header style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          gap: 12, padding: "16px 18px 12px", borderBottom: "1px solid #E3E8EF",
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ ...GF, margin: 0, fontSize: 15, fontWeight: 800, color: NAVY }}>
              Send for signing again
            </h2>
            <p style={{
              ...GF, margin: "3px 0 0", fontSize: 12, color: SILVER,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {documentTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            aria-label="Close"
            className="rsd-touch"
            style={{
              ...GF, border: "none", background: "none", cursor: sending ? "not-allowed" : "pointer",
              color: SILVER, padding: 4, lineHeight: 0,
            }}
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div style={{ padding: "14px 18px" }}>
          {allowSameParticipants && (
            <ModeSwitch mode={mode} onChange={changeMode} disabled={sending} />
          )}

          {mode === "same" ? (
            <SameParticipants
              participants={participants}
              loadError={loadError}
              excluded={excluded}
              onToggle={toggle}
              disabled={sending}
              keptCount={kept.length}
              ready={sameReady}
            />
          ) : (<>
          <label
            htmlFor="resend-emails"
            style={{ ...GF, display: "block", fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 6 }}
          >
            Email addresses
          </label>
          <textarea
            id="resend-emails"
            value={raw}
            disabled={sending}
            onChange={e => { setRaw(e.target.value); }}
            rows={4}
            placeholder={"name@example.com, another@example.com\nor one per line"}
            style={{
              ...GF, width: "100%", boxSizing: "border-box", padding: "10px 12px",
              borderRadius: 8, border: "1px solid #D1D9E0", fontSize: 13,
              color: NAVY, resize: "vertical", lineHeight: 1.5,
            }}
          />
          <p style={{ ...GF, margin: "6px 0 0", fontSize: 11.5, color: SILVER, lineHeight: 1.5 }}>
            Separate with commas, semicolons, spaces or new lines. Up to{" "}
            {MAX_RESEND_RECIPIENTS}.
          </p>

          {addresses.length > 0 && invalid.length === 0 && !overLimit && (
            <p role="status" style={{ ...GF, margin: "8px 0 0", fontSize: 12, color: SLATE }}>
              {addresses.length === 1
                ? "1 recipient will be emailed a signing link."
                : `${addresses.length} recipients will each be emailed a signing link.`}
            </p>
          )}

          {invalid.length > 0 && (
            <p role="alert" style={{ ...GF, margin: "8px 0 0", fontSize: 12, color: DANGER, lineHeight: 1.5 }}>
              {/* Names the offenders rather than saying "invalid email", so a
                  long paste does not have to be re-read line by line. */}
              Not valid email addresses: {invalid.join(", ")}
            </p>
          )}

          {overLimit && (
            <p role="alert" style={{ ...GF, margin: "8px 0 0", fontSize: 12, color: DANGER }}>
              {addresses.length} addresses — the limit for one send is {MAX_RESEND_RECIPIENTS}.
            </p>
          )}
          </>)}

          {/* ID and face verification, where the workspace has it. The same
              section as Prepare's, with a switch for each recipient who will
              act. A workspace whose plan does not include it sees nothing
              here: there is no requirement to carry over, and an upgrade
              prompt has no place in a send. */}
          {identity.status === "loading" && (
            <p role="status" data-testid="resend-identity-loading" style={{ ...GF, margin: "12px 0 0", fontSize: 12, color: SLATE, display: "flex", gap: 6, alignItems: "center" }}>
              <Loader2 size={13} aria-hidden /> Checking ID and face verification…
            </p>
          )}
          {identity.status === "error" && (
            <p role="alert" data-testid="resend-identity-error" style={{ ...GF, margin: "12px 0 0", fontSize: 12, color: DANGER, lineHeight: 1.5 }}>
              ID and face verification could not be read, so nothing can be sent yet.{" "}
              <button
                type="button" className="rsd-touch" onClick={identity.retry}
                style={{ ...GF, background: "none", border: "none", padding: "0 2px", fontSize: 12, fontWeight: 700, color: AZURE, textDecoration: "underline", cursor: "pointer" }}
              >
                Try again
              </button>
            </p>
          )}
          <Reveal open={identityOn}>
            {mode === "new" && loadError !== null && (
              <p role="alert" style={{ ...GF, margin: "12px 0 0", fontSize: 12, color: DANGER }}>{loadError}</p>
            )}
            <IdentityCheckSection
              control={identityControl}
              participants={people}
              renderNote={identityNote}
              notEditableMessage={null}
              emptyMessage={mode === "new"
                ? "Type the email addresses above, then choose who must pass the check."
                : "Nobody ticked signs, approves, reviews or acknowledges, so there is nobody to ask."}
            />
          </Reveal>

          {/* Said before sending, not after. Both consequences reach outside
              the product, and neither can be undone. */}
          <div style={{
            marginTop: 14, padding: "10px 12px", borderRadius: 8,
            background: "#FFF8E6", border: "1px solid #EBD9A6",
          }}>
            <p style={{ ...GF, margin: 0, fontSize: 11.5, color: "#7A5B00", lineHeight: 1.6 }}>
              This creates a <strong>new signing request</strong> with its own audit
              trail. The original stays exactly as it is.{" "}
              {mode === "new"
                ? <>The document&rsquo;s current recipient list is replaced by the addresses above, and emails are sent immediately.</>
                : <>Everyone ticked keeps their role, step and fields; anyone unticked is removed from this document along with their fields. Emails are sent immediately.</>}
            </p>
            {USE_REAL_BACKEND && (
              <p data-testid="resend-title-note" style={{ ...GF, margin: "6px 0 0", fontSize: 11.5, color: "#7A5B00", lineHeight: 1.6 }}>
                The new request gets its own numbered title so it can be told apart from the earlier one.
              </p>
            )}
          </div>

          {error !== null && (
            <p role="alert" style={{
              ...GF, margin: "12px 0 0", display: "flex", gap: 6, alignItems: "flex-start",
              fontSize: 12, color: DANGER, lineHeight: 1.5,
            }}>
              <AlertCircle size={14} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </p>
          )}
        </div>

        <footer style={{
          display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap",
          padding: "12px 18px 16px", borderTop: "1px solid #F1F5F9",
        }}>
          <button
            onClick={onClose}
            disabled={sending}
            className="rsd-touch"
            style={{
              ...GF, minHeight: 38, padding: "0 16px", borderRadius: 8,
              border: "1px solid #D1D9E0", background: "#FFFFFF", color: NAVY,
              fontSize: 13, fontWeight: 600, cursor: sending ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSend}
            className="rsd-touch"
            style={{
              ...GF, minHeight: 38, padding: "0 18px", borderRadius: 8, border: "none",
              background: canSend ? AZURE : "#9DBBD6", color: "#FFFFFF",
              fontSize: 13, fontWeight: 700, cursor: canSend ? "pointer" : "not-allowed",
              display: "inline-flex", alignItems: "center", gap: 7,
            }}
          >
            {sending
              ? <><Loader2 size={14} aria-hidden /> Sending…</>
              : <><Send size={14} aria-hidden /> Send links</>}
          </button>
        </footer>
      </div>
    </>
  );
}

/** The "same participants" list: one checkbox per person, all ticked. */
function SameParticipants({
  participants, loadError, excluded, onToggle, disabled, keptCount, ready,
}: {
  participants: RealRecipient[] | null;
  loadError: string | null;
  excluded: ReadonlySet<string>;
  onToggle: (recipientId: string) => void;
  disabled: boolean;
  keptCount: number;
  ready: boolean;
}) {
  if (loadError !== null) {
    return <p role="alert" style={{ ...GF, margin: 0, fontSize: 12, color: DANGER }}>{loadError}</p>;
  }
  if (participants === null) {
    return (
      <p role="status" style={{ ...GF, margin: 0, fontSize: 12.5, color: SLATE, display: "flex", gap: 6, alignItems: "center" }}>
        <Loader2 size={14} aria-hidden /> Loading participants…
      </p>
    );
  }
  const steps = new Set(participants.map(p => p.routingOrder)).size;
  return (
    <>
      <p style={{ ...GF, margin: "0 0 8px", fontSize: 12, color: SLATE, lineHeight: 1.5 }}>
        Untick anyone who should not receive it this time.
      </p>
      <ul aria-label="Participants" style={{
        listStyle: "none", margin: 0, padding: 0,
        border: "1px solid #E3E8EF", borderRadius: 10, overflow: "hidden",
      }}>
        {participants.map((p, index) => {
          const included = !excluded.has(p.recipientId);
          return (
            <li key={p.recipientId} style={{ borderTop: index === 0 ? "none" : "1px solid #F1F5F9" }}>
              <label style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px",
                cursor: disabled ? "not-allowed" : "pointer",
                background: included ? "#FFFFFF" : "#F8FAFC",
              }}>
                <input
                  type="checkbox"
                  checked={included}
                  disabled={disabled}
                  onChange={() => { onToggle(p.recipientId); }}
                  aria-label={`Include ${p.name}`}
                  style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }}
                />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 8px" }}>
                    <span style={{
                      ...GF, fontSize: 13, fontWeight: 600, color: included ? NAVY : SILVER,
                      overflowWrap: "anywhere",
                    }}>{p.name}</span>
                    <span style={{
                      ...GF, fontSize: 10.5, fontWeight: 700, color: SLATE,
                      background: "#F1F5F9", borderRadius: 99, padding: "1px 7px", whiteSpace: "nowrap",
                    }}>{ROLE_LABELS[p.type] ?? p.type}</span>
                    {steps > 1 && (
                      <span style={{ ...GF, fontSize: 11, color: SILVER, whiteSpace: "nowrap" }}>
                        Step {p.routingOrder}
                      </span>
                    )}
                  </span>
                  <span style={{
                    ...GF, display: "block", fontSize: 12, color: included ? SLATE : SILVER,
                    marginTop: 1, overflowWrap: "anywhere",
                    textDecoration: included ? "none" : "line-through",
                  }}>{p.email}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p role="status" style={{ ...GF, margin: "8px 0 0", fontSize: 12, color: ready ? SLATE : DANGER }}>
        {ready
          ? `${keptCount} of ${participants.length} will receive it.`
          : "Keep at least one person who signs, approves, reviews or acknowledges."}
      </p>
    </>
  );
}

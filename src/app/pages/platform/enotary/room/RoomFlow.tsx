// The steps of a session between meeting and sealing, as the 13 October pages lay them out. What the room shows
// next depends only on what the server says has happened:
//
//   client:  choose the document, finalize it  →  approve the act and the fee (and pay it)  →  the notary seals
//   notary:  confirm the client's identity     →  state the act and the fee  →  confirm the payment  →  apply the seal
//
// Each step is one button that asks the server; the page then shows what the server answers. Nothing here decides
// whether a step is allowed: the server refuses an out-of-order one, and the page says why in words.

import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { BadgeCheck, CheckCircle2, Hourglass, Send, X } from "lucide-react";
import { ActionButton, ActionRow, GF, Notice } from "../../../../components/system/design-system";
import { withProcess } from "../../../../config/process-screens";
import {
  formatPesos, parsePesos, realEnotaryInvitationsService, describePaymentError, FEE_MAX_PESOS, type Invitation,
} from "../../../../services/real/enotary-invitations.service";
import { formatClientAddress, realEnotarySessionsService, type ActType, type Session } from "../../../../services/real/enotary-sessions.service";
import { E } from "../EnotaryChrome";
import { ClientPaymentPanel } from "../payments/ClientPaymentPanel";
import { Panel, PanelTitle, TextField, bodyText, fieldStyle, hintStyle, labelStyle } from "../onramp-ui";
import { stampLabel } from "../requests/expiry";
import { maskAccountName } from "../../../../utils/screenshot-image";
import { StateActCard } from "./StateActCard";

const ACTS: { value: ActType; label: string; hint: string }[] = [
  { value: "acknowledgment", label: "Acknowledgment", hint: "The client says the signature on the document is theirs, freely given." },
  { value: "jurat", label: "Jurat", hint: "The client swears to the contents and signs before the notary." },
  { value: "signature_witnessing", label: "Signature witnessing", hint: "The notary witnesses the client signing." },
];

const pesos = (centavos: number) => `PHP ${formatPesos(centavos)}`;

const row = (label: string, value: ReactNode, first = false) => (
  <div key={label} style={{ display: "grid", gridTemplateColumns: "minmax(110px, 160px) 1fr", gap: 12, padding: "9px 0", borderTop: first ? "none" : `1px solid ${E.line}`, fontSize: 14.5 }}>
    <dt style={{ color: E.quiet, fontWeight: 700 }}>{label}</dt>
    <dd style={{ margin: 0, color: E.ink, overflowWrap: "anywhere" }}>{value}</dd>
  </div>
);

/** The fee choice: charge a fee, or none. Free makes the amount read-only and says what follows. */
export function FeeChoice({ clientName, noFee, setNoFee, fee, setFee, problem }: {
  clientName: string; noFee: boolean; setNoFee: (value: boolean) => void; fee: string; setFee: (value: string) => void; problem: string | null;
}) {
  return (
    <>
      <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
        <legend style={labelStyle}>Your fee for this request</legend>
        <div role="radiogroup" aria-label="Fee choice" style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", margin: "0 0 12px" }}>
          {([
            { free: false, title: "Charge a fee", note: "The client pays you directly.", testId: "fee-mode-charge" },
            { free: true, title: "No fee", note: "Free of charge for this client.", testId: "no-fee" },
          ] as const).map(option => {
            const chosen = noFee === option.free;
            return (
              <label key={option.testId} style={{ ...GF, display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                border: `2px solid ${chosen ? E.maroon : E.maroonLine}`, background: chosen ? "#FFF7F8" : "#FFFFFF" }}>
                <input type="radio" name="fee-mode" data-testid={option.testId} checked={chosen} onChange={() => { setNoFee(option.free); }}
                  style={{ width: 18, height: 18, marginTop: 2, accentColor: E.maroon }} />
                <span><strong style={{ display: "block", fontSize: 14.5, color: E.ink }}>{option.title}</strong>
                  <span style={{ fontSize: 13, color: E.quiet }}>{option.note}</span></span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <label htmlFor="fee-amount" style={labelStyle}>{noFee ? "Fee (PHP)" : "Amount to ask for (PHP)"}</label>
      <input
        id="fee-amount" data-testid="fee-input" inputMode="decimal" autoComplete="off"
        value={noFee ? "No fee: free of charge" : fee} maxLength={noFee ? undefined : 12} readOnly={noFee} aria-readonly={noFee || undefined}
        placeholder="e.g. 600" aria-invalid={problem !== null ? true : undefined}
        onChange={event => { if (!noFee) setFee(event.target.value); }}
        style={noFee ? { ...fieldStyle(false), background: "#F3F4F6", color: E.quiet, cursor: "not-allowed", fontWeight: 600 } : fieldStyle(problem !== null)}
      />
      {problem !== null && <p role="alert" style={{ ...hintStyle, color: "#B0182B" }}>{problem}</p>}
      {noFee ? (
        <div data-testid="no-fee-notice" role="status" style={{ ...GF, margin: "12px 0 0", padding: "12px 14px", borderRadius: 10, background: "#EEF7F0", border: "1px solid #BFE0C8" }}>
          <strong style={{ display: "block", fontSize: 14, color: E.ok, marginBottom: 6 }}>You are notarizing this free of charge</strong>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: E.text, lineHeight: 1.6 }}>
            <li>{clientName} will not be asked to pay, and will see that you are not charging a fee.</li>
            <li>There is no payment to confirm. You can apply your seal as soon as they approve.</li>
            <li>Once they approve, the fee cannot be changed.</li>
            <li>You do not need a payment QR for a request without a fee.</li>
          </ul>
        </div>
      ) : (
        <p style={hintStyle}>
          The client pays you directly with their bank or e-wallet app, then sends you the reference number. You confirm it from your own app.
          LAGDA never holds the money. A fee is paid to your saved payment QR.{" "}
          <Link to="/app/enotary/payment" style={{ color: "inherit", fontWeight: 700 }}>My payment QR</Link>
        </p>
      )}
    </>
  );
}

type Act = (name: string, work: () => Promise<Session>) => Promise<void>;

// ── The client ───────────────────────────────────────────────────────────────

export function ClientFlow({ s, busy, act, onChanged }: { s: Session; busy: string | null; act: Act; onChanged: () => void }) {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const payment = s.payment ?? null;
  const owes = payment !== null && (payment.status === "awaiting" || payment.status === "proof" || payment.status === "not_received");
  // The client's payment panel reads the request, so the room fetches it only while a fee is owed.
  useEffect(() => {
    if (!owes) return;
    let alive = true;
    void realEnotaryInvitationsService.get(s.invitationId).then(found => { if (alive && found !== null) setInvitation(found); }, () => undefined);
    return () => { alive = false; };
  }, [owes, s.invitationId, s.status, payment?.status]);

  if (s.status !== "live") return null;
  const statement = s.statement ?? null;
  const finalized = (s.finalizedAt ?? null) !== null;

  if (s.document === null) return null;

  if (!finalized) {
    return (
      <Panel testId="finalize-panel" tone="maroon">
        <PanelTitle>Finalize this document for eNotary</PanelTitle>
        <p style={bodyText}>Choose the document you both agreed on, then finalize it. After that it cannot be replaced, and the notary can state the notarial act and the fee.</p>
        <ActionRow align="end">
          <ActionButton icon={CheckCircle2} disabled={busy !== null} onClick={() => { void act("finalize", () => realEnotarySessionsService.finalize(s.id)); }}>
            {busy === "finalize" ? "Finalizing…" : "Finalize this document for eNotary"}
          </ActionButton>
        </ActionRow>
      </Panel>
    );
  }

  if (statement === null) {
    return (
      <Panel testId="finalized-panel" tone="sky">
        <PanelTitle>Finalized: the notary is reviewing</PanelTitle>
        <p style={{ ...bodyText, margin: 0, display: "flex", gap: 8 }}><Hourglass size={18} aria-hidden style={{ flex: "0 0 auto", marginTop: 2 }} />
          <span>The notary confirms who you are on the call, then states the notarial act and the fee. You are not charged before you approve it.</span></p>
      </Panel>
    );
  }

  if (statement.approvedAt === null) {
    return (
      <Panel testId="approve-panel" tone="maroon">
        <PanelTitle>Atty. {s.notaryName} confirmed the notarial act and the fee</PanelTitle>
        <dl style={{ margin: 0 }}>
          {row("Notary", s.notaryName, true)}
          {row("Document", s.document.name)}
          {row("Notarial act", statement.actTypeLabel)}
          {row("Note from the notary", statement.note)}
          {row("Fee", <strong data-testid="stated-fee">{statement.feeCentavos === 0 ? "No fee" : pesos(statement.feeCentavos)}</strong>)}
        </dl>
        <p data-testid="consent-text" style={{ ...bodyText, margin: "12px 0" }}>{s.consent.text}</p>
        <p style={{ ...hintStyle, margin: "0 0 4px" }}>You pay only when you approve. The notary completes the notarization after that.</p>
        <ActionRow align="end">
          <ActionButton icon={BadgeCheck} disabled={busy !== null} onClick={() => { void act("approve", () => realEnotarySessionsService.approve(s.id)); }}>
            {busy === "approve" ? "Approving…" : statement.feeCentavos === 0 ? "Approve" : `Approve and pay ${pesos(statement.feeCentavos)}`}
          </ActionButton>
        </ActionRow>
      </Panel>
    );
  }

  if (payment !== null && payment.status !== "confirmed" && payment.status !== "waived") {
    return invitation !== null && invitation.payment !== null && invitation.payment !== undefined
      ? <ClientPaymentPanel invitation={invitation} payment={invitation.payment} onChanged={next => { setInvitation(next); onChanged(); }} />
      : <Panel testId="payment-loading" tone="sky"><p style={{ ...bodyText, margin: 0 }}>Opening the payment…</p></Panel>;
  }

  return (
    <Panel testId="approved-panel" tone="sky">
      <PanelTitle>{payment !== null && payment.status === "confirmed" ? "Payment received" : "Approved"}</PanelTitle>
      <p style={{ ...bodyText, margin: 0 }} data-testid="approved-note">
        {statement.feeCentavos === 0 ? "No fee for this request. " : `The notary confirmed your payment of ${pesos(statement.feeCentavos)}. `}
        The notary completes the notarization next. You are told here as soon as it is done.
      </p>
    </Panel>
  );
}

// ── The notary ───────────────────────────────────────────────────────────────

export function NotaryFlow({ s, busy, act, onChanged, notarizePanel, look }: {
  s: Session; busy: string | null; act: Act; onChanged: () => void; notarizePanel: ReactNode;
  /** "v4": the step-6 console's card for stating the act and the fee. */
  look?: "v4";
}) {
  const [actType, setActType] = useState<ActType>("acknowledgment");
  const [note, setNote] = useState("");
  const [fee, setFee] = useState("");
  const [noFee, setNoFee] = useState(false);
  const [editing, setEditing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [working, setWorking] = useState(false);
  const statement = s.statement ?? null;
  const payment = s.payment ?? null;
  // The step-6 card names the payment QR a fee is paid to: the notary's own, its name masked.
  const [payee, setPayee] = useState<string | null>(null);
  useEffect(() => {
    if (look !== "v4") return;
    let alive = true;
    void Promise.resolve(realEnotaryInvitationsService.paymentProfile()).then(found => {
      if (alive) setPayee(found === null || found === undefined ? null : maskAccountName(found.payeeName));
    }, () => undefined);
    return () => { alive = false; };
  }, [look]);

  if (s.status !== "live") return null;
  const identity = (s.identityConfirmedAt ?? null) !== null;
  const finalized = (s.finalizedAt ?? null) !== null;

  const feeCentavos = noFee ? 0 : parsePesos(fee);
  const feeProblem = !noFee && fee.trim() !== "" && feeCentavos === null ? `Enter a fee between 1 and ${FEE_MAX_PESOS.toLocaleString("en-US")} pesos.` : null;
  const ready = note.trim() !== "" && feeCentavos !== null;

  const settle = async (work: () => Promise<unknown>, message: string) => {
    setWorking(true); setProblem(null); setSaid(null);
    try { await work(); setSaid(message); setMissing(false); onChanged(); }
    catch (error) { setProblem(describePaymentError(error)); }
    finally { setWorking(false); }
  };

  // 1. who the client is
  if (!identity) {
    return (
      <Panel testId="identity-panel" tone="maroon">
        <PanelTitle>Confirm who the client is</PanelTitle>
        <p style={bodyText}>LAGDA checked {s.clientName}&rsquo;s ID and face. Check it yourself on the call too: ask for a valid government ID and compare it with the person you see. Confirm only when you are satisfied.</p>
        {!s.presence.client && <p data-testid="client-not-here" style={{ ...hintStyle, color: "#8A5A00" }}>{s.clientName} is not in the room yet.</p>}
        <ActionRow align="end">
          <ActionButton icon={CheckCircle2} disabled={busy !== null || !s.presence.client} onClick={() => { void act("identity", () => realEnotarySessionsService.confirmIdentity(s.id)); }}>
            {busy === "identity" ? "Confirming…" : "I confirmed their identity on the call"}
          </ActionButton>
        </ActionRow>
      </Panel>
    );
  }

  // 2. wait for the final document
  if (!finalized) {
    return (
      <Panel testId="waiting-final" tone="sky">
        <PanelTitle>Client&rsquo;s document</PanelTitle>
        <p style={{ ...bodyText, margin: 0, display: "flex", gap: 8 }}><Hourglass size={18} aria-hidden style={{ flex: "0 0 auto", marginTop: 2 }} />
          <span>{s.document === null ? `${s.clientName} is choosing the document.` : `${s.clientName} has chosen a document and has not finalized it yet. Read it with them first.`}</span></p>
      </Panel>
    );
  }

  // 3. state the act and the fee (until the client approves)
  if ((statement === null || (editing && statement.approvedAt === null)) && look === "v4") {
    const send = () => {
      void act("act", async () => {
        try { const next = await realEnotarySessionsService.stateAct(s.id, { actType, feeCentavos: feeCentavos ?? 0, note }); setEditing(false); return next; }
        catch (error) { setProblem(error instanceof Error ? describePaymentError(error) : "That could not be sent."); throw error; }
      });
    };
    return (
      <StateActCard
        s={s} actType={actType} setActType={setActType} note={note} setNote={setNote} fee={fee} setFee={setFee} noFee={noFee} setNoFee={setNoFee}
        feeCentavos={feeCentavos} feeProblem={feeProblem} ready={ready} problem={problem} busy={busy} payee={payee} onSend={send}
        {...(statement !== null ? { onKeep: () => { setEditing(false); } } : {})}
      />
    );
  }
  if (statement === null || (editing && statement.approvedAt === null)) {
    return (
      <Panel testId="state-panel" tone="maroon">
        <PanelTitle>State the notarial act and your fee</PanelTitle>
        <p style={bodyText}>{s.clientName} finalized {s.document?.name ?? "the document"}. They pay after you state the act and the fee, and only when they approve.</p>
        <fieldset style={{ border: 0, padding: 0, margin: "0 0 14px" }}>
          <legend style={labelStyle}>Kind of act</legend>
          {ACTS.map(option => (
            <label key={option.value} style={{ ...GF, display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", fontSize: 14.5 }}>
              <input type="radio" name="stated-act" value={option.value} checked={actType === option.value} onChange={() => { setActType(option.value); }} style={{ marginTop: 5 }} />
              <span><strong>{option.label}</strong><small style={{ display: "block", color: E.quiet }}>{option.hint}</small></span>
            </label>
          ))}
        </fieldset>
        <TextField label="What the document is (the note to the client)" value={note} onChange={setNote} maxLength={300} required hint="For example: Acknowledgment of a deed of absolute sale." />
        <FeeChoice clientName={s.clientName} noFee={noFee} setNoFee={setNoFee} fee={fee} setFee={setFee} problem={feeProblem} />
        <p data-testid="fee-summary" style={{ ...GF, margin: "12px 0 0", fontSize: 14, fontWeight: 700, color: E.ink }}>
          {noFee ? `You will notarize this for ${s.clientName} without a fee.`
            : feeCentavos === null ? "Enter an amount to see what the client will be asked to pay."
              : `You will ask ${s.clientName} to pay ${pesos(feeCentavos)}.`}
        </p>
        {problem !== null && <Notice icon={X} tone="danger">{problem}</Notice>}
        <ActionRow align="end">
          {statement !== null && <ActionButton kind="secondary" onClick={() => { setEditing(false); }}>Keep what I stated</ActionButton>}
          <ActionButton
            icon={Send} disabled={busy !== null || !ready}
            onClick={() => {
              void act("act", async () => {
                try { const next = await realEnotarySessionsService.stateAct(s.id, { actType, feeCentavos: feeCentavos ?? 0, note }); setEditing(false); return next; }
                catch (error) { setProblem(error instanceof Error ? describePaymentError(error) : "That could not be sent."); throw error; }
              });
            }}
          >
            {busy === "act" ? "Sending…" : "Send the act and fee to the client"}
          </ActionButton>
        </ActionRow>
      </Panel>
    );
  }

  // 4. the client approves
  if (statement.approvedAt === null) {
    return (
      <Panel testId="stated-panel" tone="sky">
        <PanelTitle>Waiting for {s.clientName} to approve</PanelTitle>
        <dl style={{ margin: 0 }}>
          {row("Notarial act", statement.actTypeLabel, true)}
          {row("Note", statement.note)}
          {row("Fee", statement.feeCentavos === 0 ? "No fee" : pesos(statement.feeCentavos))}
        </dl>
        <ActionRow align="end">
          <ActionButton kind="secondary" onClick={() => { setNote(statement.note); setActType(statement.actType); setNoFee(statement.feeCentavos === 0); setFee(statement.feeCentavos === 0 ? "" : String(statement.feeCentavos / 100)); setEditing(true); }}>
            Change what I stated
          </ActionButton>
        </ActionRow>
      </Panel>
    );
  }

  // 5. the fee
  if (payment !== null && payment.status === "awaiting") {
    return (
      <Panel testId="await-payment" tone="sky">
        <PanelTitle>Waiting for {s.clientName}&rsquo;s payment</PanelTitle>
        <p style={{ ...bodyText, margin: 0 }}>{s.clientName} approved the act and the fee and was asked to pay {pesos(payment.amountCentavos)} to your QR. You confirm it here once it arrives.</p>
      </Panel>
    );
  }
  if (payment !== null && (payment.status === "proof" || payment.status === "not_received")) {
    return (
      <Panel testId="confirm-payment" tone="maroon">
        <PanelTitle>Payment of {pesos(payment.amountCentavos)}</PanelTitle>
        {payment.status === "proof" ? (
          <div data-testid="desk-proof">
            <p style={bodyText}>Reference number: <strong data-testid="desk-reference" style={{ letterSpacing: "0.04em" }}>{payment.reference}</strong>
              {payment.proofAt !== null && <> · sent {stampLabel(payment.proofAt)}</>}</p>
            <p style={hintStyle}>Look for this transfer in your own bank or e-wallet app. Do not go by a screenshot.</p>
            {missing && <p style={hintStyle}>The client is told the payment did not arrive and can send the reference again.</p>}
            {problem !== null && <Notice icon={X} tone="danger">{problem}</Notice>}
            <ActionRow align="end">
              <ActionButton kind="secondary" disabled={working} onClick={() => {
                setMissing(true);
                void settle(() => withProcess("enotary-payment-missing", s.clientName, () => realEnotaryInvitationsService.paymentNotReceived(s.invitationId, ""), describePaymentError), "The client was told the payment did not arrive.");
              }}>Not received</ActionButton>
              <ActionButton icon={CheckCircle2} disabled={working} onClick={() => {
                void settle(() => withProcess("enotary-payment-confirm", s.clientName, () => realEnotaryInvitationsService.confirmPayment(s.invitationId), describePaymentError), "You confirmed the payment.");
              }}>I received it</ActionButton>
            </ActionRow>
          </div>
        ) : <p style={{ ...bodyText, margin: 0 }}>You told {s.clientName} the payment did not arrive. They can send the reference again.</p>}
        {said !== null && <div role="status" style={{ ...GF, margin: "10px 0 0", fontSize: 14, fontWeight: 600, color: E.ok }}>{said}</div>}
      </Panel>
    );
  }

  // 6. everything is in: the seal
  return (
    <>
      <Panel testId="ready-to-seal" tone="sky">
        <PanelTitle>{payment !== null && payment.status === "confirmed" ? "Payment received. Apply your seal." : "Approved. Apply your seal."}</PanelTitle>
        <dl style={{ margin: 0 }}>
          {row("Document", s.document?.name ?? "", true)}
          {row("Notarial act", statement.actTypeLabel)}
          {row("Fee", statement.feeCentavos === 0 ? "No fee" : pesos(statement.feeCentavos))}
          {row("Client's identity", <span style={{ color: E.ok, fontWeight: 700 }}>Confirmed by you on the call</span>)}
          {row("Client's address", (s.clientAddress ?? null) === null
            ? <span data-testid="seal-address-missing" style={{ color: "#8A5A00", fontWeight: 700 }}>Not given yet: the client types it in the room</span>
            : <span data-testid="seal-address">{formatClientAddress(s.clientAddress!)}</span>)}
        </dl>
        <p style={hintStyle}>Applying the seal writes the next entry of your notarial register and completes the document. It cannot be undone.</p>
      </Panel>
      {notarizePanel}
    </>
  );
}

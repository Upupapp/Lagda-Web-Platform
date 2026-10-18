// The fee of an accepted request, from the client's side: who to pay, how much,
// the notary's QR to scan or save, and where to give the transfer's reference.
//
// The client pays the NOTARY, directly, with their own bank or e-wallet app.
// LAGDA never takes the money and never asks for card or account details; it
// only keeps the reference the client gives and waits for the notary to confirm
// from their own app.

import { useState } from "react";
import { Check, Hourglass, Send, ShieldAlert } from "lucide-react";
import { ActionButton, GF, Notice } from "../../../../components/system/design-system";
import {
  describePaymentError, formatPesos, realEnotaryInvitationsService, type Invitation, type InvitationPayment,
} from "../../../../services/real/enotary-invitations.service";
import { E } from "../EnotaryChrome";
import { Panel, PanelTitle, TextField, bodyText } from "../onramp-ui";
import { stampLabel } from "../requests/expiry";
import { PaymentQr } from "./PaymentQr";

/** The payment is something the client still has to do, or wait on the notary for. */
export function paymentIsPending(payment: InvitationPayment | null | undefined): boolean {
  return payment !== null && payment !== undefined
    && (payment.status === "awaiting" || payment.status === "proof" || payment.status === "not_received");
}

/** A reference as the server will read it: letters, digits and dashes, 6 to 40. */
export function referenceProblem(text: string): string | null {
  const compact = text.trim().replace(/\s+/g, "");
  if (compact === "") return null;
  if (compact.length < 6 || compact.length > 40) return "A reference number has 6 to 40 characters.";
  return /^[A-Za-z0-9-]+$/.test(compact) ? null : "Use only letters, numbers and dashes.";
}

export function ClientPaymentPanel({
  invitation, payment, onChanged,
}: { invitation: Invitation; payment: InvitationPayment; onChanged: (next: Invitation) => void }) {
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const notary = invitation.notary.name;
  const amount = `PHP ${formatPesos(payment.amountCentavos)}`;

  if (payment.status === "waived") {
    return (
      <Panel tone="sky" testId="payment-panel">
        <PanelTitle>Fee</PanelTitle>
        <p data-testid="payment-waived" style={{ ...bodyText, margin: 0 }}>{notary} is not charging a fee for this request. Nothing to pay.</p>
      </Panel>
    );
  }

  if (payment.status === "confirmed") {
    return (
      <Panel tone="sky" testId="payment-panel">
        <PanelTitle>Payment</PanelTitle>
        <p data-testid="payment-confirmed" style={{ ...bodyText, margin: 0, display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Check size={18} aria-hidden style={{ color: E.ok, flex: "0 0 auto", marginTop: 3 }} />
          <span>{notary} confirmed your payment of <strong>{amount}</strong>
            {payment.reference !== null && <> (reference {payment.reference})</>}
            {payment.decidedAt !== null && <>, {stampLabel(payment.decidedAt)}</>}.</span>
        </p>
      </Panel>
    );
  }

  if (payment.status === "proof") {
    return (
      <Panel tone="sky" testId="payment-panel">
        <PanelTitle>Payment</PanelTitle>
        <p data-testid="payment-waiting" style={{ ...bodyText, margin: 0, display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Hourglass size={18} aria-hidden style={{ color: E.skyDeep, flex: "0 0 auto", marginTop: 3 }} />
          <span>
            You told us you paid <strong>{amount}</strong> (reference <strong data-testid="payment-reference">{payment.reference}</strong>).
            Now {notary} checks their own account and confirms. You will be told when they do.
          </span>
        </p>
      </Panel>
    );
  }

  const error = referenceProblem(reference);
  const ready = reference.trim() !== "" && error === null;
  const payee = payment.payee;

  const send = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const next = await realEnotaryInvitationsService.sendPaymentProof(invitation.id, reference);
      setReference("");
      onChanged(next);
    } catch (failure) {
      setProblem(describePaymentError(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel tone="sky" testId="payment-panel">
      <PanelTitle>Pay {notary}</PanelTitle>
      {payment.status === "not_received" && (
        <div data-testid="payment-not-received">
          <Notice icon={ShieldAlert} tone="warn">
            {notary} could not find your payment{payment.note !== null ? `: ${payment.note}` : "."} Check the reference number, or pay again, then send the reference again.
            {payment.attemptsLeft > 0 ? ` You can send it ${String(payment.attemptsLeft)} more ${payment.attemptsLeft === 1 ? "time" : "times"}.` : " You cannot send it again here: please contact the notary."}
          </Notice>
        </div>
      )}
      <p style={{ ...GF, margin: "0 0 4px", fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: E.skyDeep }}>Amount to pay</p>
      <p data-testid="payment-amount" style={{ ...GF, margin: "0 0 10px", fontSize: "clamp(26px, 7vw, 34px)", fontWeight: 800, color: E.navy }}>{amount}</p>
      {payee !== null && (
        <p data-testid="payment-payee" style={{ ...bodyText, margin: "0 0 14px" }}>
          Pay to <strong>{payee.name}</strong>{payee.city !== null && <> · {payee.city}</>}. If your app shows a different name, do not pay.
        </p>
      )}
      {payment.qrPayload !== null && payee !== null && (
        <div style={{ margin: "0 0 16px" }}>
          <PaymentQr payload={payment.qrPayload} payeeName={payee.name} />
        </div>
      )}
      <ol data-testid="payment-steps" style={{ ...bodyText, margin: "0 0 16px", paddingLeft: 20 }}>
        <li>Open your bank or e-wallet app and choose to pay by QR. Scan the code above, or save it and use your app&rsquo;s &ldquo;upload QR&rdquo; option.</li>
        <li>Type the amount exactly: <strong>{amount}</strong>.</li>
        <li>Pay, then copy the <strong>reference number</strong> from your receipt.</li>
        <li>Enter it below and send it. {notary} then checks their own account and confirms.</li>
      </ol>
      <TextField
        label="Reference number of your transfer" value={reference} onChange={setReference} maxLength={60} autoComplete="off"
        error={error} hint="Letters, numbers and dashes, as on your receipt. Do not send a screenshot or your card or account details."
      />
      {problem !== null && <Notice icon={ShieldAlert} tone="danger">{problem}</Notice>}
      <ActionButton icon={Send} disabled={busy || !ready || payment.attemptsLeft === 0} onClick={() => { void send(); }}>
        {busy ? "Sending…" : "I have paid"}
      </ActionButton>
      <p style={{ ...bodyText, margin: "12px 0 0", fontSize: 12.5, color: E.quiet }}>
        You pay {notary} directly. LAGDA does not hold or move the money, and cannot refund it: any refund is between you and the notary.
      </p>
    </Panel>
  );
}

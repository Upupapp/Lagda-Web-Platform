// The fee of an accepted request, from the client's side: who to pay, how much,
// the notary's QR to scan or save, and where to give the transfer's reference.
//
// The client pays the NOTARY, directly, with their own bank or e-wallet app.
// LAGDA never takes the money and never asks for card or account details; it
// only keeps the reference the client gives and waits for the notary to confirm
// from their own app.

import { useEffect, useRef, useState } from "react";
import { Banknote, CalendarDays, Check, Hash, Hourglass, ImageUp, Lock, QrCode, ReceiptText, Send, ShieldAlert, UserRound, X } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { maskAccountName, prepareScreenshot, screenshotProblem } from "../../../../utils/screenshot-image";
import gcashArt from "../../../../../assets/gcash_assets/option1.eccd65d.png";
import gcashStep1 from "../../../../../assets/gcash_assets/ins_photo1.864a14a.png";
import gcashStep2 from "../../../../../assets/gcash_assets/ins_photo2.5ac00d1.png";
import gcashStep3 from "../../../../../assets/gcash_assets/ins_photo3.c80f5f0.png";
import gcashStep4 from "../../../../../assets/gcash_assets/ins_photo4.8d48222.png";
import { RecordCard, RecordGrid } from "../RecordCard";
import { ActionButton, GF, Notice } from "../../../../components/system/design-system";
import {
  describePaymentError, formatPesos, realEnotaryInvitationsService, type Invitation, type InvitationPayment,
} from "../../../../services/real/enotary-invitations.service";
import { E } from "../EnotaryChrome";
import { Z } from "../../../../utils/z-index";
import { Panel, PanelTitle, TextField, bodyText } from "../onramp-ui";
import { stampLabel } from "../requests/expiry";
import { PaymentQr } from "./PaymentQr";
import { withProcess } from "../../../../config/process-screens";

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

const GCASH_STYLES = `
  .gc-panel { font-family: 'Geist', sans-serif; padding: clamp(18px, 3vw, 28px); }
  .gc-head { text-align: center; margin: 0 44px 18px; }
  .gc-card { border: 1px solid #C9D3DE; border-radius: 12px; padding: clamp(14px, 3vw, 26px); background: #FFFFFF; }
  .gc-top { display: grid; grid-template-columns: 110px minmax(0, 1fr) minmax(0, 260px); gap: 22px; align-items: start; }
  .gc-art { width: 100px; height: 100px; border-radius: 50%; }
  .gc-qr-col { display: grid; justify-items: center; gap: 12px; text-align: center; }
  .gc-lead { margin: 0; font-size: clamp(18px, 3vw, 22px); font-weight: 700; color: #0A84D6; }
  .gc-qr { padding: 10px; border: 1px solid #E3EAF2; border-radius: 12px; background: #FFFFFF; }
  .gc-facts { margin: 0; display: grid; gap: 12px; align-self: center; }
  .gc-facts dt { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #647789; }
  .gc-facts dd { margin: 3px 0 0; font-size: 15px; font-weight: 700; color: #0A1A2B; }
  .gc-amount { font-size: clamp(24px, 5vw, 30px) !important; font-weight: 800 !important; color: #0B1F44 !important; }
  .gc-name { font-family: ui-monospace, Menlo, Consolas, monospace; letter-spacing: 0.08em; background: #E8F3FC; border: 1px solid #BBDDF5; color: #0563A6 !important; display: inline-block; padding: 5px 10px; border-radius: 8px; }
  .gc-warn { display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; color: #8A5A00; background: #FFF8EC; border: 1px solid #F0D9A8; border-radius: 8px; padding: 8px 10px; }
  .gc-instr { margin: 22px 0 14px; padding-bottom: 8px; font-size: 16px; font-weight: 700; color: #0A1A2B; border-bottom: 1px solid #C9D3DE; max-width: 300px; }
  .gc-steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
  .gc-steps li { display: grid; justify-items: center; align-content: start; gap: 10px; text-align: center; }
  .gc-steps p { margin: 0; font-size: 13.5px; line-height: 1.45; color: #33475B; min-height: 58px; }
  .gc-steps img { width: min(130px, 100%); height: auto; border-radius: 12px; box-shadow: 0 10px 22px -14px rgba(10,26,43,0.55); }
  .gc-num { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 999px; background: #0A84D6; color: #FFFFFF; font-size: 12.5px; font-weight: 800; }
  .gc-confirm { margin-top: 18px; padding: clamp(14px, 3vw, 22px); border-radius: 12px; background: #F7F9FC; border: 1px solid #DDE6EF; }
  .gc-confirm-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0 20px; }
  .gc-drop { position: relative; display: block; min-height: 112px; border: 2px dashed #A9BACB; border-radius: 12px; background: #FFFFFF; cursor: pointer; transition: border-color 140ms ease, background 140ms ease; }
  .gc-drop:hover, .gc-drop:focus-within { border-color: #0A84D6; background: #F5FAFE; }
  .gc-drop.has-file { border-style: solid; border-color: #B7E3CA; }
  .gc-drop input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
  .gc-drop-empty { display: grid; justify-items: center; gap: 4px; padding: 18px 12px; color: #0563A6; text-align: center; pointer-events: none; }
  .gc-drop-empty b { font-size: 14px; color: #0A1A2B; }
  .gc-drop-empty small { font-size: 12px; color: #647789; }
  .gc-drop-full { display: flex; gap: 12px; align-items: center; padding: 10px 12px; pointer-events: none; }
  .gc-drop-full img { width: 64px; height: 88px; object-fit: cover; border-radius: 8px; border: 1px solid #DDE6EF; }
  .gc-drop-full span { display: grid; gap: 3px; min-width: 0; font-size: 13.5px; color: #0A1A2B; }
  .gc-drop-full small { font-size: 12px; color: #647789; }
  .gc-send { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 14px; }
  @media (max-width: 900px) {
    .gc-top { grid-template-columns: minmax(0, 1fr); justify-items: center; text-align: center; }
    .gc-art { display: none; }
    .gc-facts { width: 100%; max-width: 360px; text-align: center; }
    .gc-steps { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 560px) {
    .gc-head { margin: 0 40px 14px 0; text-align: left; }
    .gc-steps { grid-template-columns: minmax(0, 1fr); }
    .gc-steps li { grid-template-columns: 30px minmax(0, 1fr) 84px; justify-items: start; text-align: left; align-items: center; }
    .gc-steps p { min-height: 0; }
    .gc-steps img { width: 84px; }
    .gc-confirm-grid { grid-template-columns: minmax(0, 1fr); }
    .gc-send > :last-child { width: 100%; }
  }
`;

export function ClientPaymentPanel({
  invitation, payment, onChanged,
}: { invitation: Invitation; payment: InvitationPayment; onChanged: (next: Invitation) => void }) {
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState<{ file: File; preview: string } | null>(null);
  const [shotProblem, setShotProblem] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // The payment opens as a panel in the middle of the page: the notary's QR, the amount, and where to say it was paid.
  const [open, setOpen] = useState(true);
  const dialog = useRef<HTMLDivElement>(null);
  const notary = invitation.notary.name;
  const paying = payment.status === "awaiting" || payment.status === "not_received";
  useEffect(() => {
    if (!open || !paying) return;
    dialog.current?.focus();
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); };
  }, [open, paying]);
  const amount = `PHP ${formatPesos(payment.amountCentavos)}`;

  if (payment.status === "waived") {
    return (
      <RecordCard icon={ReceiptText} title="Notarial Fee" badge={{ icon: Check, label: "No fee", tone: "end" }} testId="payment-panel">
        <p data-testid="payment-waived" style={{ ...bodyText, margin: 0 }}>{notary} is not charging a fee for this request. Nothing to pay.</p>
      </RecordCard>
    );
  }

  if (payment.status === "confirmed") {
    return (
      <RecordCard icon={ReceiptText} title="Payment Confirmation" badge={{ icon: Check, label: "Confirmed", tone: "ok" }} testId="payment-panel" flush>
        <RecordGrid cells={[
          { icon: Banknote, label: "Amount paid", lead: true, testId: "payment-amount-paid",
            value: <span style={{ fontFamily: "Tinos, 'Times New Roman', serif", fontSize: 26, color: E.navy }}><small style={{ fontFamily: "'Geist', sans-serif", fontSize: 13, color: "#8A6A2E", marginRight: 6 }}>PHP</small>{formatPesos(payment.amountCentavos)}</span> },
          { icon: Hash, label: "Payment reference", value: payment.reference ?? "None given", mono: true },
          { icon: UserRound, label: "Confirmed by", value: /^atty\.?\s/i.test(notary) ? notary : `Atty. ${notary}` },
          { icon: CalendarDays, label: "Date & time", value: payment.decidedAt === null ? "Not recorded" : stampLabel(payment.decidedAt) },
        ]} />
        <p data-testid="payment-confirmed" style={{ ...bodyText, margin: 0, padding: "12px 20px", borderTop: `1px solid ${E.line}`, fontSize: 13.5, display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Check size={16} aria-hidden style={{ color: E.ok, flex: "0 0 auto", marginTop: 3 }} />
          <span>{notary} confirmed your payment of <strong>{amount}</strong>
            {payment.reference !== null && <> (reference {payment.reference})</>}
            {payment.decidedAt !== null && <>, {stampLabel(payment.decidedAt)}</>}.</span>
        </p>
      </RecordCard>
    );
  }

  if (payment.status === "proof") {
    return (
      <RecordCard icon={ReceiptText} title="Payment" badge={{ icon: Hourglass, label: "Awaiting confirmation", tone: "warn" }} testId="payment-panel">
        <p data-testid="payment-waiting" style={{ ...bodyText, margin: 0, display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Hourglass size={18} aria-hidden style={{ color: "#8A5A00", flex: "0 0 auto", marginTop: 3 }} />
          <span>
            You told us you paid <strong>{amount}</strong> (reference <strong data-testid="payment-reference">{payment.reference}</strong>).
            Now {notary} checks their own account and confirms. You will be told when they do.
          </span>
        </p>
      </RecordCard>
    );
  }

  const error = referenceProblem(reference);
  const ready = reference.trim() !== "" && error === null && shot !== null;
  const payee = payment.payee;
  const masked = payee === null ? "" : maskAccountName(payee.name);

  const pick = (file: File | undefined) => {
    setShotProblem(null);
    if (file === undefined) return;
    const why = screenshotProblem(file);
    if (why !== null) { setShotProblem(why); return; }
    if (shot !== null) URL.revokeObjectURL(shot.preview);
    setShot({ file, preview: URL.createObjectURL(file) });
  };

  const send = async () => {
    if (shot === null) { setShotProblem("Add the screenshot of your receipt."); return; }
    setBusy(true);
    setProblem(null);
    try {
      const prepared = await prepareScreenshot(shot.file);
      const next = await withProcess("enotary-payment-proof", "", () => realEnotaryInvitationsService.sendPaymentProof(invitation.id, reference, { mediaType: prepared.mediaType, image: prepared.base64 }));
      setReference("");
      URL.revokeObjectURL(shot.preview);
      setShot(null);
      onChanged(next);
    } catch (failure) {
      setProblem(failure instanceof Error && !("status" in failure) ? failure.message : describePaymentError(failure));
    } finally {
      setBusy(false);
    }
  };

  const steps: readonly { image: string; title: ReactNode }[] = [
    { image: gcashStep1, title: <>Open your GCash app. In your dashboard, tap <strong>&ldquo;Pay QR.&rdquo;</strong></> },
    { image: gcashStep2, title: <>Tap <strong>&ldquo;Scan QR Code&rdquo;</strong> and scan the code above, or upload it from your gallery.</> },
    { image: gcashStep3, title: <>Check that the name reads <strong>{masked === "" ? "the notary's" : masked}</strong>, type <strong>{amount}</strong> and confirm.</> },
    { image: gcashStep4, title: <>Keep the receipt GCash shows you: take a <strong>screenshot</strong> of it with its reference number.</> },
  ];

  const form = (
    <section className="gc-panel" data-testid="payment-panel">
      <style>{GCASH_STYLES}</style>
      <header className="gc-head">
        <h2 style={{ margin: 0, fontSize: "clamp(18px, 3.4vw, 22px)", fontWeight: 800, color: E.navy }}>Pay {notary} with GCash</h2>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: E.quiet }}>For your safety, pay with the GCash app on your phone. You pay {notary} directly; LAGDA does not hold the money.</p>
      </header>
      {payment.status === "not_received" && (
        <div data-testid="payment-not-received" style={{ margin: "0 0 14px" }}>
          <Notice icon={ShieldAlert} tone="warn">
            {notary} could not find your payment{payment.note !== null ? `: ${payment.note}` : "."} Check the reference number, or pay again, then send your proof again.
            {payment.attemptsLeft > 0 ? ` You can send it ${String(payment.attemptsLeft)} more ${payment.attemptsLeft === 1 ? "time" : "times"}.` : " You cannot send it again here: please contact the notary."}
          </Notice>
        </div>
      )}
      <div className="gc-card">
        <div className="gc-top">
          <img src={gcashArt} alt="" aria-hidden="true" className="gc-art" />
          <div className="gc-qr-col">
            <p className="gc-lead">Scan the QR code with the GCash app to pay</p>
            {payment.qrPayload !== null && payee !== null
              ? <div className="gc-qr"><PaymentQr payload={payment.qrPayload} payeeName={payee.name} size={240} /></div>
              : <p style={{ ...bodyText, margin: 0 }}>The notary&rsquo;s QR is not available. Ask {notary} for their GCash details.</p>}
          </div>
          <dl className="gc-facts">
            <div><dt>Amount to pay</dt><dd data-testid="payment-amount" className="gc-amount">{amount}</dd></div>
            {payee !== null && <div><dt>GCash account name</dt><dd data-testid="payment-payee" className="gc-name">{masked}</dd></div>}
            {payee !== null && payee.city !== null && <div><dt>City</dt><dd>{payee.city}</dd></div>}
            <div className="gc-warn"><ShieldAlert size={15} aria-hidden /> If your app shows a different name or amount, do not pay.</div>
          </dl>
        </div>
        <h3 className="gc-instr">Instructions</h3>
        <ol className="gc-steps" data-testid="payment-steps">
          {steps.map((step, index) => (
            <li key={index}>
              <span className="gc-num">{String(index + 1).padStart(2, "0")}</span>
              <p>{step.title}</p>
              <img src={step.image} alt="" aria-hidden="true" />
            </li>
          ))}
        </ol>
      </div>

      <div className="gc-confirm">
        <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800, color: E.navy, display: "flex", alignItems: "center", gap: 8 }}><ReceiptText size={18} aria-hidden /> Confirm your payment</h3>
        <p style={{ margin: "0 0 14px", fontSize: 13.5, color: E.quiet }}>Once you have paid, send the reference number and a screenshot of your receipt. {notary} checks their own GCash and confirms.</p>
        <div className="gc-confirm-grid">
          <div style={{ minWidth: 0 }}>
            <TextField
              label="Reference number of your transfer" value={reference} onChange={setReference} maxLength={60} autoComplete="off" required
              placeholder="e.g. 1234 567 890123" error={error} hint="As printed on your GCash receipt. Letters, numbers and dashes."
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ display: "block", margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: E.ink }}>Screenshot of your receipt <span aria-hidden="true" style={{ color: "#B0182B" }}>*</span></span>
            <label className={shot === null ? "gc-drop" : "gc-drop has-file"} data-testid="screenshot-drop"
              onDragOver={event => { event.preventDefault(); }} onDrop={event => { event.preventDefault(); pick(event.dataTransfer.files[0]); }}>
              <input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Screenshot of your receipt" data-testid="screenshot-input"
                onChange={event => { pick(event.target.files?.[0]); event.target.value = ""; }} />
              {shot === null ? (
                <span className="gc-drop-empty"><ImageUp size={22} aria-hidden /><b>Add the screenshot</b><small>Drag it here or choose it. PNG, JPEG or WebP.</small></span>
              ) : (
                <span className="gc-drop-full"><img src={shot.preview} alt="Your receipt" data-testid="screenshot-preview" /><span><b style={{ overflowWrap: "anywhere" }}>{shot.file.name}</b><small>Choose another to replace it.</small></span></span>
              )}
            </label>
            {shotProblem !== null && <p role="alert" style={{ ...GF, margin: "6px 0 0", fontSize: 13, color: "#B0182B" }}>{shotProblem}</p>}
          </div>
        </div>
        {problem !== null && <Notice icon={ShieldAlert} tone="danger">{problem}</Notice>}
        <div className="gc-send">
          <span style={{ fontSize: 12.5, color: E.quiet, display: "inline-flex", alignItems: "center", gap: 6 }}><Lock size={13} aria-hidden /> Only {notary} sees your screenshot. LAGDA cannot refund a payment.</span>
          <ActionButton icon={Send} disabled={busy || !ready || payment.attemptsLeft === 0} onClick={() => { void send(); }}>
            {busy ? "Sending…" : "I have paid: send to the notary"}
          </ActionButton>
        </div>
      </div>
    </section>
  );

  return (
    <>
      <Panel tone="sky" testId="payment-due">
        <PanelTitle>Pay {notary}</PanelTitle>
        <p data-testid="payment-due-amount" style={{ ...GF, margin: "0 0 8px", fontSize: "clamp(24px, 6vw, 30px)", fontWeight: 800, color: E.navy }}>{amount}</p>
        <p style={{ ...bodyText, margin: "0 0 12px" }}>Pay {notary} with the QR, then say here that you paid. {notary} is told as soon as you send it.</p>
        <ActionButton icon={QrCode} onClick={() => { setOpen(true); }}>Open the payment panel</ActionButton>
      </Panel>
      {open && createPortal((
        <div data-testid="payment-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}
          style={{ position: "fixed", inset: 0, zIndex: Z.modal, display: "grid", placeItems: "center", padding: "clamp(10px, 3vw, 24px)", background: "rgba(10,26,43,0.55)" }}>
          <div ref={dialog} role="dialog" aria-modal="true" aria-label={`Pay ${notary}`} tabIndex={-1}
            style={{ position: "relative", width: "min(1040px, 100%)", maxHeight: "calc(100dvh - 32px)", overflowY: "auto", borderRadius: 16, background: "#FFFFFF", boxShadow: "0 30px 80px -20px rgba(10,26,43,0.6)", outline: "none" }}>
            <button type="button" onClick={() => { setOpen(false); }} aria-label="Close the payment panel" data-testid="payment-close"
              style={{ position: "absolute", right: 10, top: 10, zIndex: 1, width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 10, border: `1px solid ${E.line}`, background: "#FFFFFF", color: E.navy, cursor: "pointer" }}>
              <X size={18} aria-hidden />
            </button>
            {form}
          </div>
        </div>
      ), document.body)}
    </>
  );
}

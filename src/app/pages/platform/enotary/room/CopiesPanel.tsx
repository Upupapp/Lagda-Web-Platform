// Certified true copies of a notarized document: the client asks (a digital
// copy, or printed copies sent by courier), the notary quotes a fee, the client
// pays the notary's own QR and sends the transfer's reference, the notary
// confirms from their own app and issues the copy. LAGDA never holds the money.

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Download, Hourglass, Package, Send, ShieldAlert } from "lucide-react";
import { ActionButton, GF, Notice } from "../../../../components/system/design-system";
import { formatPesos, parsePesos } from "../../../../services/real/enotary-invitations.service";
import {
  describeSessionError, realEnotarySessionsService, type CertifiedCopy, type CopyRequestInput, type CtcMode, type SessionRole,
} from "../../../../services/real/enotary-sessions.service";
import { E } from "../EnotaryChrome";
import { Panel, PanelTitle, TextField, bodyText, labelStyle, fieldStyle } from "../onramp-ui";
import { PaymentQr } from "../payments/PaymentQr";
import { referenceProblem } from "../payments/ClientPaymentPanel";
import { stampLabel } from "../requests/expiry";
import { saveBlob } from "./room-bits";
import { withProcess } from "../../../../config/process-screens";
import { CopyJourney, nextStage } from "./CopyJourney";

export const COPIES_POLL_MS = 8_000;
const STATUS_WORDS: Record<CertifiedCopy["status"], string> = {
  requested: "Waiting for the notary's fee", quoted: "Fee quoted — payment due", payment_sent: "Payment sent — the notary is checking",
  paid: "Paid — being prepared", fulfilled: "Issued", received: "Received", declined: "Declined", cancelled: "Cancelled",
};

export function CopiesPanel({ sessionId, role }: { sessionId: string; role: SessionRole }) {
  const [copies, setCopies] = useState<CertifiedCopy[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const next = await realEnotarySessionsService.copies(sessionId);
      if (alive.current) setCopies(next);
    } catch {
      if (alive.current) setCopies(previous => previous ?? []);
    }
  }, [sessionId]);

  useEffect(() => {
    alive.current = true;
    void load();
    const timer = setInterval(() => { void load(); }, COPIES_POLL_MS);
    return () => { alive.current = false; clearInterval(timer); };
  }, [load]);

  const replace = (copy: CertifiedCopy) => {
    setProblem(null);
    setCopies(list => (list ?? []).some(item => item.id === copy.id) ? (list ?? []).map(item => item.id === copy.id ? copy : item) : [copy, ...(list ?? [])]);
  };
  const fail = (error: unknown) => { setProblem(describeSessionError(error)); };

  if (copies === null) return null;
  const openOne = copies.some(copy => copy.status === "requested" || copy.status === "quoted" || copy.status === "payment_sent" || copy.status === "paid");

  return (
    <Panel testId="copies-panel">
      <PanelTitle>Certified true copies</PanelTitle>
      {role === "client" && (
        <p style={{ ...bodyText, fontSize: 13.5 }}>
          A certified true copy is a copy the notary certifies as a true copy of the notarized document. Ask for a digital copy, or for printed copies sent to you.
        </p>
      )}
      {problem !== null && <Notice icon={ShieldAlert} tone="danger">{problem}</Notice>}
      {copies.length === 0 && role === "notary" && <p style={bodyText} data-testid="no-copies">The client has not asked for copies.</p>}
      {copies.map(copy => (
        <CopyCard key={copy.id} copy={copy} role={role} onChange={replace} onFail={fail} />
      ))}
      {role === "client" && !openOne && <RequestForm sessionId={sessionId} onDone={replace} onFail={fail} />}
    </Panel>
  );
}

function RequestForm({ sessionId, onDone, onFail }: { sessionId: string; onDone: (copy: CertifiedCopy) => void; onFail: (error: unknown) => void }) {
  const [mode, setMode] = useState<CtcMode>("digital");
  const [copies, setCopies] = useState("1");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const count = Number(copies);
  const countOk = Number.isInteger(count) && count >= 1 && count <= 10;
  const ready = mode === "digital" || (countOk && name.trim() !== "" && phone.trim() !== "" && address.trim() !== "");
  const send = async () => {
    setBusy(true);
    const input: CopyRequestInput = mode === "digital" ? { mode } : { mode, copies: count, deliveryName: name.trim(), deliveryPhone: phone.trim(), deliveryAddress: address.trim() };
    try { onDone(await withProcess("enotary-copy-request", "", () => realEnotarySessionsService.requestCopy(sessionId, input), describeSessionError)); } catch (error) { onFail(error); } finally { setBusy(false); }
  };
  return (
    <div data-testid="copy-request">
      <fieldset style={{ border: 0, padding: 0, margin: "0 0 12px" }}>
        <legend style={labelStyle}>What do you need?</legend>
        {([["digital", "A digital certified copy (a PDF)"], ["physical", "Printed certified copies, sent by courier"]] as const).map(([value, label]) => (
          <label key={value} style={{ ...GF, display: "flex", gap: 8, alignItems: "center", minHeight: 44, fontSize: 14.5 }}>
            <input type="radio" name="copy-mode" value={value} checked={mode === value} onChange={() => { setMode(value); }} /> {label}
          </label>
        ))}
      </fieldset>
      {mode === "physical" && (
        <>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="copy-count" style={labelStyle}>How many copies (1 to 10)</label>
            <input id="copy-count" inputMode="numeric" value={copies} onChange={event => { setCopies(event.target.value); }} style={{ ...fieldStyle(!countOk), maxWidth: 120 }} />
          </div>
          <TextField label="Send to (name)" value={name} onChange={setName} maxLength={200} autoComplete="name" required />
          <TextField label="Phone number for the courier" value={phone} onChange={setPhone} maxLength={50} inputMode="tel" autoComplete="tel" required />
          <TextField label="Delivery address" value={address} onChange={setAddress} maxLength={500} autoComplete="street-address" required />
        </>
      )}
      <ActionButton icon={Send} disabled={busy || !ready} onClick={() => { void send(); }}>{busy ? "Asking…" : "Ask the notary for copies"}</ActionButton>
    </div>
  );
}

function CopyCard({ copy, role, onChange, onFail }: { copy: CertifiedCopy; role: SessionRole; onChange: (copy: CertifiedCopy) => void; onFail: (error: unknown) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (name: string, work: () => Promise<CertifiedCopy>) => {
    setBusy(name);
    try { onChange(await work()); } catch (error) { onFail(error); } finally { setBusy(null); }
  };
  const service = realEnotarySessionsService;
  const what = copy.mode === "digital" ? "digital certified copy" : `${String(copy.copies)} printed certified ${copy.copies === 1 ? "copy" : "copies"}`;
  const amount = copy.feeCentavos === null ? null : copy.feeCentavos === 0 ? "no fee" : `PHP ${formatPesos(copy.feeCentavos)}`;

  return (
    <div data-testid="copy-card" data-status={copy.status} style={{ ...GF, border: `1px solid ${E.line}`, borderRadius: 10, padding: "12px 14px", margin: "0 0 12px", background: "#FFFFFF" }}>
      <p style={{ margin: "0 0 4px", fontWeight: 800, color: E.navy, fontSize: 14.5 }}>{what[0]?.toUpperCase()}{what.slice(1)}</p>
      <p data-testid="copy-status" style={{ margin: "0 0 8px", fontSize: 13.5, color: E.quiet }}>
        {STATUS_WORDS[copy.status]}{amount !== null && copy.status !== "requested" ? ` · ${amount}` : ""} · {stampLabel(copy.updatedAt)}
      </p>
      {copy.mode === "physical" && copy.status !== "declined" && copy.status !== "cancelled" && <CopyJourney copy={copy} />}
      {copy.delivery !== null && role === "notary" && (
        <p style={{ ...bodyText, fontSize: 13.5 }} data-testid="copy-delivery">Send to {copy.delivery.name}, {copy.delivery.phone}, {copy.delivery.address}</p>
      )}
      {copy.note !== null && <p style={{ ...bodyText, fontSize: 13.5 }}>Note: {copy.note}</p>}

      {role === "client" && copy.status === "requested" && (
        <>
          <p style={{ ...bodyText, display: "flex", gap: 8 }}><Hourglass size={18} aria-hidden style={{ color: E.skyDeep, flex: "0 0 auto" }} /> The notary will tell you the fee.</p>
          <ActionButton kind="secondary" disabled={busy !== null} onClick={() => { void run("cancel", () => service.cancelCopy(copy.id)); }}>Cancel the request</ActionButton>
        </>
      )}
      {role === "client" && copy.status === "quoted" && <ClientPay copy={copy} busy={busy !== null} onSend={reference => run("proof", () => service.sendProof(copy.id, reference))} />}
      {role === "client" && copy.status === "payment_sent" && (
        <p style={{ ...bodyText, display: "flex", gap: 8 }} data-testid="copy-waiting"><Hourglass size={18} aria-hidden style={{ color: E.skyDeep, flex: "0 0 auto" }} /> You sent reference <strong>{copy.reference}</strong>. The notary now checks their own account.</p>
      )}
      {role === "client" && copy.status === "paid" && <p style={bodyText}>The notary confirmed the payment and is preparing your {copy.mode === "digital" ? "copy" : "copies"}.</p>}
      {copy.status === "fulfilled" && (
        <FulfilledBlock copy={copy} role={role} busy={busy !== null} onReceived={() => run("received", () => service.received(copy.id))} />
      )}

      {role === "notary" && copy.status === "requested" && <NotaryQuote copy={copy} busy={busy !== null} run={run} />}
      {role === "notary" && copy.status === "quoted" && <p style={bodyText}>Waiting for the client to pay and send the reference.</p>}
      {role === "notary" && copy.status === "payment_sent" && (
        <>
          <p style={bodyText} data-testid="copy-proof">The client says they paid {amount}, reference <strong>{copy.reference}</strong>. Look for it in your own bank or e-wallet app.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ActionButton icon={Check} disabled={busy !== null} onClick={() => { void run("confirm", () => service.confirmPayment(copy.id)); }}>I received it</ActionButton>
            <ActionButton kind="secondary" disabled={busy !== null} onClick={() => { void run("notreceived", () => service.paymentNotReceived(copy.id)); }}>Not received</ActionButton>
          </div>
        </>
      )}
      {role === "notary" && copy.status === "paid" && <NotaryIssue copy={copy} busy={busy !== null} run={run} />}
      {role === "notary" && copy.mode === "physical" && (copy.status === "paid" || copy.status === "fulfilled") && (
        <NotaryStage copy={copy} busy={busy !== null} run={run} />
      )}
    </div>
  );
}

/** The one next step of a printed copy's journey, as a button: prepared, then in transit, out for delivery, delivered. */
function NotaryStage({ copy, busy, run }: { copy: CertifiedCopy; busy: boolean; run: (name: string, work: () => Promise<CertifiedCopy>) => Promise<void> }) {
  const next = nextStage(copy);
  if (next === null) return null;
  return (
    <div data-testid="copy-stage" style={{ marginTop: 10 }}>
      <ActionButton kind={copy.status === "paid" ? "secondary" : "primary"} icon={Package} disabled={busy}
        onClick={() => { void run("stage", () => withProcess("enotary-copy-stage", "", () => realEnotarySessionsService.setStage(copy.id, next.stage), describeSessionError)); }}>
        {busy ? "Updating…" : next.action}
      </ActionButton>
    </div>
  );
}

function ClientPay({ copy, busy, onSend }: { copy: CertifiedCopy; busy: boolean; onSend: (reference: string) => Promise<void> }) {
  const [reference, setReference] = useState("");
  const error = referenceProblem(reference);
  const ready = reference.trim() !== "" && error === null;
  return (
    <div data-testid="copy-pay">
      {copy.payee !== null && <p style={bodyText}>Pay <strong>{copy.payee.name}</strong>{copy.payee.city !== null && <> · {copy.payee.city}</>}. If your app shows a different name, do not pay.</p>}
      {copy.qrPayload !== null && copy.payee !== null && <div style={{ margin: "0 0 12px" }}><PaymentQr payload={copy.qrPayload} payeeName={copy.payee.name} /></div>}
      <TextField label="Reference number of your transfer" value={reference} onChange={setReference} maxLength={60} autoComplete="off" error={error} hint="From your receipt. Do not send a screenshot or your card or account details." />
      <ActionButton icon={Send} disabled={busy || !ready} onClick={() => { void onSend(reference); }}>{busy ? "Sending…" : "I have paid"}</ActionButton>
    </div>
  );
}

function NotaryQuote({ copy, busy, run }: { copy: CertifiedCopy; busy: boolean; run: (name: string, work: () => Promise<CertifiedCopy>) => Promise<void> }) {
  const [fee, setFee] = useState("");
  const centavos = fee.trim() === "" ? null : parsePesos(fee);
  const service = realEnotarySessionsService;
  return (
    <div data-testid="copy-quote">
      <TextField label="Fee for these copies (PHP)" value={fee} onChange={setFee} inputMode="numeric" hint="0 for no fee. Otherwise between 1 and 50,000. Paid to your own saved payment QR." error={fee.trim() !== "" && centavos === null ? "That is not a fee LAGDA can take." : null} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <ActionButton disabled={busy || centavos === null} onClick={() => { if (centavos !== null) void run("quote", () => service.quote(copy.id, centavos)); }}>Send the fee</ActionButton>
        <ActionButton kind="secondary" disabled={busy} onClick={() => { void run("decline", () => service.decline(copy.id)); }}>Decline</ActionButton>
      </div>
    </div>
  );
}

function NotaryIssue({ copy, busy, run }: { copy: CertifiedCopy; busy: boolean; run: (name: string, work: () => Promise<CertifiedCopy>) => Promise<void> }) {
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");
  const physical = copy.mode === "physical";
  return (
    <div data-testid="copy-issue">
      {physical ? (
        <>
          <p style={bodyText}>Print, certify and send the copies. Then enter the courier and the tracking number so the client can follow them.</p>
          <TextField label="Courier" value={courier} onChange={setCourier} maxLength={200} required />
          <TextField label="Tracking number" value={tracking} onChange={setTracking} maxLength={200} required />
        </>
      ) : <p style={bodyText}>Issue the digital copy: LAGDA prepares the PDF with your certification and a verification code.</p>}
      <ActionButton icon={Package} disabled={busy || (physical && (courier.trim() === "" || tracking.trim() === ""))}
        onClick={() => { void run("fulfil", () => realEnotarySessionsService.fulfil(copy.id, physical ? { courier: courier.trim(), trackingNo: tracking.trim() } : undefined)); }}>
        {busy ? "Working…" : physical ? "Mark as sent" : "Issue the copy"}
      </ActionButton>
    </div>
  );
}

function FulfilledBlock({ copy, role, busy, onReceived }: { copy: CertifiedCopy; role: SessionRole; busy: boolean; onReceived: () => Promise<void> }) {
  const [problem, setProblem] = useState<string | null>(null);
  const download = async () => {
    try { saveBlob(await realEnotarySessionsService.copyFile(copy.id), `certified-true-copy-${copy.verificationCode ?? copy.id}.pdf`); } catch (error) { setProblem(describeSessionError(error)); }
  };
  return (
    <div data-testid="copy-done">
      {copy.verificationCode !== null && <p style={bodyText}>Verification code <strong data-testid="copy-code">{copy.verificationCode}</strong></p>}
      {copy.hasFile && <ActionButton icon={Download} kind="secondary" onClick={() => { void download(); }}>Download the copy</ActionButton>}
      {copy.shipment !== null && <p style={bodyText} data-testid="copy-shipment">Sent by {copy.shipment.courier}, tracking <strong>{copy.shipment.trackingNo}</strong>.</p>}
      {problem !== null && <Notice icon={ShieldAlert} tone="danger">{problem}</Notice>}
      {role === "client" && copy.mode === "physical" && (
        <div style={{ marginTop: 8 }}>
          {copy.stage === "delivered" && <p style={{ ...bodyText, fontSize: 13.5 }} data-testid="copy-delivered">The courier delivered it. Confirm only when it is in your hands.</p>}
          <ActionButton icon={Check} disabled={busy} onClick={() => { void onReceived(); }}>I received them</ActionButton>
        </div>
      )}
    </div>
  );
}

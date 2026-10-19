// /app/enotary/desk — a notary's desk: the requests clients have sent them, Accept
// (naming a fee) or Decline for each, and, once a client says they paid, the
// confirmation that the money came.
//
// A request appears here only after the notary has proved who they are (the ID
// and face check) and the name matched. The client's name is shown from then on
// and not before. Accepting or declining needs an approved application whose
// commission has not ended; until then the desk says where the application stands
// and the buttons stay off. The server enforces every one of those rules.
//
// ── Paying the notary ──────────────────────────────────────────────────────
//
// The fee is paid straight to the notary by the notary's own payment QR (see the
// Payment QR page). The client sends the transfer's reference; the notary looks
// in their own bank or e-wallet app and confirms here. LAGDA never holds the
// money and a screenshot is never taken as proof: only the notary's own app is.
//
// Once the fee is settled, an accepted request shows its session (the room and,
// after a notarization, the certified copies) from the SessionPanel.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { SessionPanel } from "../room/SessionPanel";
import { AlertTriangle, Check, Clock, Inbox, QrCode, X } from "lucide-react";
import { ActionButton, GF, Notice, T } from "../../../../components/system/design-system";
import { useConfirm } from "../../../../components/platform/ConfirmDialog";
import { USE_REAL_BACKEND } from "../../../../services/backend-flag";
import { announceNavCountsChanged } from "../../../../services/nav-counts-signal";
import {
  describePaymentError, errorCode, formatPesos, parsePesos, realEnotaryInvitationsService,
  FEE_MAX_PESOS, type DeskIncoming, type DeskPayment, type DeskRequest, type NotaryDesk,
} from "../../../../services/real/enotary-invitations.service";
import { E, EnotaryFrame } from "../EnotaryChrome";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import { OnrampNote, Panel, StatusPill, bodyText, fieldStyle, hintStyle, labelStyle, linkButton, useNow } from "../onramp-ui";
import { ExpiryClock, countdownText, expiryLabel, expiryTone, stampLabel } from "../requests/expiry";

const POLL_MS = 5_000;

type Loaded =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "off" }
  | { kind: "ready"; desk: NotaryDesk; receivedAt: number };

/** What the banner says while the notary cannot accept yet, and where it leads. */
export function bannerFor(desk: NotaryDesk): { tone: "info" | "warn"; text: string; link: string; label: string } | null {
  if (desk.canAccept) return null;
  switch (desk.applicationStatus) {
    case "approved":
      return { tone: "warn", text: "Your commission on record has ended, so you can no longer accept requests. Apply again with your renewed commission.", link: "/app/enotary/apply", label: "Update my application" };
    case "submitted":
      return { tone: "info", text: "Your application is with a LAGDA reviewer. You can accept requests once it is approved.", link: "/app/enotary/apply", label: "See my application" };
    case "draft":
      return { tone: "info", text: "Finish your application so a LAGDA reviewer can approve it. You can accept requests once it is approved.", link: "/app/enotary/apply", label: "Continue my application" };
    case "rejected":
      return { tone: "warn", text: "Your application was not approved. Read the reviewer's reason, correct it and send it again.", link: "/app/enotary/apply", label: "See why" };
    case "expired":
      return { tone: "warn", text: "Your commission on record has ended, so you can no longer accept requests. Apply again with your renewed commission.", link: "/app/enotary/apply", label: "Update my application" };
    case "withdrawn":
      return { tone: "info", text: "You withdrew your application. Send it again to be able to accept requests.", link: "/app/enotary/apply", label: "Open my application" };
    default:
      return { tone: "info", text: "To accept requests you first apply once. A LAGDA reviewer checks your commission and documents.", link: "/app/enotary/apply", label: "Start my application" };
  }
}

/** One line on where an accepted request's fee stands, for the notary. */
export function paymentLine(payment: DeskPayment | null | undefined, clientName: string): string | null {
  if (payment === null || payment === undefined) return null;
  const amount = `PHP ${formatPesos(payment.amountCentavos)}`;
  switch (payment.status) {
    case "waived": return "No fee for this request.";
    case "awaiting": return `Waiting for ${clientName} to pay ${amount}.`;
    case "proof": return `${clientName} says they paid ${amount}.`;
    case "confirmed": return `You confirmed the payment of ${amount}.`;
    case "not_received": return `You told ${clientName} the ${amount} did not arrive. Waiting for another proof.`;
  }
}

/** The fee typed on the accept panel, in centavos; 0 when none is charged; null when it is not a sum the server takes. */
export function feeFrom(text: string, noFee: boolean): number | null {
  if (noFee) return 0;
  const parsed = parsePesos(text);
  return parsed === 0 ? null : parsed;
}

export function NotaryDeskPage() {
  const [loaded, setLoaded] = useState<Loaded>(USE_REAL_BACKEND ? { kind: "loading" } : { kind: "off" });
  const [working, setWorking] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [fee, setFee] = useState("");
  const [noFee, setNoFee] = useState(false);
  const [missing, setMissing] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const alive = useRef(true);
  /** What waited on the notary at the last read, so the menu bubble hears of a change at once. */
  const lastWaiting = useRef<number | null>(null);
  const { confirm, confirmDialog } = useConfirm();
  const now = useNow(1000);

  const load = useCallback((quiet: boolean) => {
    if (!USE_REAL_BACKEND) return;
    realEnotaryInvitationsService.desk().then(
      desk => {
        if (!alive.current) return;
        setLoaded(desk === null ? { kind: "off" } : { kind: "ready", desk, receivedAt: Date.now() });
        const waiting = desk === null ? 0
          : (desk.incoming ?? []).length + desk.requests.filter(r => r.status === "claimed").length
            + desk.requests.filter(r => r.payment?.status === "proof").length;
        if (lastWaiting.current !== null && lastWaiting.current !== waiting) announceNavCountsChanged();
        lastWaiting.current = waiting;
      },
      () => { if (alive.current && !quiet) setLoaded({ kind: "error" }); },
    );
  }, []);

  useEffect(() => {
    alive.current = true;
    load(false);
    const timer = setInterval(() => { if (!document.hidden) load(true); }, POLL_MS);
    // Coming back to the tab reads at once, not at the next tick.
    const shown = () => { if (!document.hidden) load(true); };
    document.addEventListener("visibilitychange", shown);
    return () => { alive.current = false; clearInterval(timer); document.removeEventListener("visibilitychange", shown); };
  }, [load]);

  if (loaded.kind === "loading") return <EnotaryLoading />;
  if (loaded.kind === "error") return <EnotaryLoadError onRetry={() => { setLoaded({ kind: "loading" }); load(false); }} />;
  if (loaded.kind === "off") return <EnotaryNotOffered />;

  const { desk, receivedAt } = loaded;
  const banner = bannerFor(desk);
  const hasQr = desk.paymentProfile !== null && desk.paymentProfile !== undefined;
  const incoming = desk.incoming ?? [];
  const waiting = desk.requests.filter(r => r.status === "claimed");
  const accepted = desk.requests.filter(r => r.status === "accepted");
  const toConfirm = desk.requests.filter(r => r.payment?.status === "proof");
  const closed = desk.requests.filter(r => r.status === "declined" || r.status === "expired" || r.status === "revoked");

  const refused = (error: unknown) => {
    const code = errorCode(error);
    if (code === "enotary_invitation_unavailable") return "That request is no longer open. The client may have cancelled it, or its time ran out.";
    return describePaymentError(error);
  };

  const describeTakeError = (error: unknown) => {
    const code = errorCode(error);
    if (code === "enotary_invitation_unavailable") return "That request is no longer open. The client may have cancelled it, or its time ran out.";
    if (code === "identity_required") return "Verify your identity first, then take the request.";
    if (code === "notary_name_mismatch") return "The name on your verified ID does not match this request.";
    return refused(error);
  };

  const finish = () => { if (alive.current) { setWorking(null); load(true); } };

  const answer = async (request: DeskRequest, kind: "accept" | "decline") => {
    setWorking(request.id);
    setProblem(null);
    setSaid(null);
    try {
      if (kind === "accept") {
        const amount = feeFrom(fee, noFee);
        if (amount === null) {
          setProblem(`Enter your fee in pesos (1 to ${FEE_MAX_PESOS.toLocaleString("en-US")}), or say you are not charging one.`);
          return;
        }
        await realEnotaryInvitationsService.accept(request.id, amount);
        if (!alive.current) return;
        setSaid(amount === 0
          ? `You accepted the request from ${request.client.name} without a fee. You will be told when the session can begin.`
          : `You accepted the request from ${request.client.name}. They were asked to pay PHP ${formatPesos(amount)} to your QR.`);
        setAccepting(null);
        setFee("");
        setNoFee(false);
      } else {
        await realEnotaryInvitationsService.decline(request.id, reason);
        if (!alive.current) return;
        setSaid(`You declined the request from ${request.client.name}.`);
        setDeclining(null);
        setReason("");
      }
    } catch (error) {
      if (alive.current) setProblem(refused(error));
    } finally {
      finish();
    }
  };

  const take = async (item: DeskIncoming) => {
    setWorking(item.id);
    setProblem(null);
    setSaid(null);
    try {
      await realEnotaryInvitationsService.take(item.id);
      if (alive.current) setSaid(`You took the request from ${item.client.name}. You can accept or decline it now.`);
    } catch (error) {
      if (alive.current) setProblem(describeTakeError(error));
    } finally {
      finish();
    }
  };

  const confirmPayment = (request: DeskRequest) => {
    const amount = request.payment === null || request.payment === undefined ? "" : ` of PHP ${formatPesos(request.payment.amountCentavos)}`;
    confirm({
      title: `Confirm the payment from ${request.client.name}?`,
      body: `Only confirm if the transfer${amount} (reference ${request.payment?.reference ?? ""}) is in your own bank or e-wallet account. The client is told, and the request goes on.`,
      confirmLabel: "Yes, I received it",
      cancelLabel: "Not yet",
      onConfirm: async () => {
        setWorking(request.id);
        setProblem(null);
        setSaid(null);
        try {
          await realEnotaryInvitationsService.confirmPayment(request.id);
          if (alive.current) setSaid(`You confirmed the payment from ${request.client.name}.`);
        } catch (error) {
          if (alive.current) setProblem(refused(error));
        } finally {
          finish();
        }
      },
    });
  };

  const notReceived = async (request: DeskRequest) => {
    setWorking(request.id);
    setProblem(null);
    setSaid(null);
    try {
      await realEnotaryInvitationsService.paymentNotReceived(request.id, reason);
      if (!alive.current) return;
      setSaid(`${request.client.name} was told the payment did not arrive. They can send the reference again.`);
      setMissing(null);
      setReason("");
    } catch (error) {
      if (alive.current) setProblem(refused(error));
    } finally {
      finish();
    }
  };

  const tally = (label: string, count: number, testId: string) => (
    <div data-testid={testId} style={{ ...GF, flex: "1 1 0", minWidth: 96, padding: "12px 14px", borderRadius: 12, background: "#FFFFFF", border: `1px solid ${E.maroonLine}`, textAlign: "center" }}>
      <strong style={{ display: "block", fontSize: 26, color: E.maroon, lineHeight: 1.1 }}>{count}</strong>
      <span style={{ fontSize: 13, color: E.quiet, fontWeight: 600 }}>{label}</span>
    </div>
  );

  const feeAmount = feeFrom(fee, noFee);
  const feeProblem = !noFee && fee.trim() !== "" && feeAmount === null ? "Enter a fee between 1 and 50,000 pesos." : null;

  return (
    <EnotaryFrame wide tone="attorney" badge="Notary" eyebrow="Notary desk" description="Requests that clients sent you, once you have proved who you are.">
      {confirmDialog}
      {banner !== null && (
        <div data-testid="desk-banner">
          <Notice icon={AlertTriangle} tone={banner.tone}>
            {banner.text}{" "}
            <Link to={banner.link} style={{ display: "inline-flex", alignItems: "center", minHeight: 44, color: "inherit", fontWeight: 700, textDecoration: "underline" }}>{banner.label}</Link>
          </Notice>
        </div>
      )}
      {banner === null && !hasQr && (
        <div data-testid="desk-qr-banner">
          <Notice icon={QrCode} tone="info">
            To ask for a fee, save your payment QR first: clients scan it to pay you directly.{" "}
            <Link to="/app/enotary/payment" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, color: "inherit", fontWeight: 700, textDecoration: "underline" }}>Save my payment QR</Link>
          </Notice>
        </div>
      )}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "0 0 18px" }}>
        {tally("New", incoming.length, "tally-new")}
        {tally("Waiting", waiting.length, "tally-waiting")}
        {tally("Accepted", accepted.length, "tally-accepted")}
        {tally("To confirm", toConfirm.length, "tally-confirm")}
        {tally("Closed", closed.length, "tally-closed")}
      </div>
      {said !== null && <div role="status" style={{ ...GF, margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: E.ok }}>{said}</div>}
      {problem !== null && <Notice icon={AlertTriangle} tone="danger">{problem}</Notice>}

      {incoming.length > 0 && (
        <section aria-labelledby="desk-new-heading" data-testid="desk-new" style={{ margin: "0 0 18px" }}>
          <h2 id="desk-new-heading" style={{ ...GF, fontSize: 17, color: E.ink, margin: "0 0 4px" }}>New requests for you</h2>
          <p style={{ ...bodyText, margin: "0 0 10px" }}>Clients sent these to your listing. Take one to see it among your requests, then accept or decline it.</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
            {incoming.map(item => {
              const clock = new ExpiryClock();
              clock.sync(item.secondsLeft, receivedAt);
              const msLeft = clock.msLeft(now);
              const busy = working === item.id;
              return (
                <li key={item.id} data-testid="desk-new-row" style={{ ...GF, padding: "14px 16px", borderRadius: 12, border: `1px solid ${E.maroonLine}`, background: "#FFFFFF" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 16, color: E.ink, flex: "1 1 180px", minWidth: 0, overflowWrap: "anywhere" }}>{item.client.name}</strong>
                    {item.client.identityVerified && <span style={{ fontSize: 12.5, color: E.ok, fontWeight: 700 }}>ID verified</span>}
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: E.quiet }}>Sent {stampLabel(item.receivedAt)}</p>
                  {msLeft > 0 && (
                    <p data-testid="desk-new-countdown" style={{ margin: "6px 0 0", fontSize: 13.5, fontWeight: 700, color: E.skyDeep, display: "flex", alignItems: "center", gap: 6 }}>
                      <Clock size={14} aria-hidden /> {countdownText(msLeft)} left · until {expiryLabel(item.expiresAt)}
                    </p>
                  )}
                  <div style={{ marginTop: 10 }}>
                    <ActionButton disabled={busy || msLeft <= 0} onClick={() => { void take(item); }}>{busy ? "Taking…" : "Take this request"}</ActionButton>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {desk.requests.length === 0 && incoming.length > 0 ? null : desk.requests.length === 0 ? (
        <Panel testId="desk-empty">
          <p style={{ ...bodyText, margin: 0, display: "flex", gap: 10 }}>
            <Inbox size={20} aria-hidden style={{ color: E.maroon, flex: "0 0 auto", marginTop: 2 }} />
            <span>No requests yet. When a client sends you a request, it appears here. A request sent as a link or a QR card appears once you open it.</span>
          </p>
        </Panel>
      ) : (
        <ul data-testid="desk-list" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {desk.requests.map(request => {
            const clock = new ExpiryClock();
            clock.sync(request.secondsLeft, receivedAt);
            const msLeft = clock.msLeft(now);
            const open = request.status === "claimed" && msLeft > 0;
            const tone = expiryTone(msLeft);
            const busy = working === request.id;
            const line = paymentLine(request.payment, request.client.name);
            const payment = request.payment ?? null;
            const proof = request.status === "accepted" && payment !== null && payment.status === "proof";
            const goesOn = payment === null || payment.status === "confirmed" || payment.status === "waived";
            return (
              <li key={request.id} data-testid="desk-row" data-status={request.status} data-payment={payment?.status ?? "none"} style={{ ...GF, padding: "14px 16px", borderRadius: 12, border: `1px solid ${E.line}`, background: "#FFFFFF" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 16, color: E.ink, flex: "1 1 180px", minWidth: 0, overflowWrap: "anywhere" }}>{request.client.name}</strong>
                  {request.client.identityVerified && <span style={{ fontSize: 12.5, color: E.ok, fontWeight: 700 }}>ID verified</span>}
                  <StatusPill status={request.status} label={request.status === "claimed" ? "Waiting for you" : undefined} />
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: E.quiet }}>
                  Received {stampLabel(request.receivedAt)}
                  {request.decidedAt !== null && <> · Answered {stampLabel(request.decidedAt)}</>}
                </p>
                {open && (
                  <p data-testid="desk-countdown" data-tone={tone} style={{ margin: "6px 0 0", fontSize: 13.5, fontWeight: 700, color: tone === "red" ? "#B0182B" : tone === "amber" ? "#8A5A00" : E.skyDeep, display: "flex", gap: 6, alignItems: "center" }}>
                    <Clock size={14} aria-hidden /> {countdownText(msLeft)} left · until {expiryLabel(request.expiresAt)}
                  </p>
                )}
                {request.status === "accepted" && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ margin: 0, fontSize: 13.5, color: E.text }}>
                      {goesOn
                        ? "Accepted. The session can begin."
                        : "Accepted. The request goes on once the fee is paid and you have confirmed it."}
                    </p>
                    {line !== null && (
                      <p data-testid="desk-payment" style={{ margin: "4px 0 0", fontSize: 13.5, fontWeight: 700, color: payment?.status === "proof" ? E.maroon : E.text }}>{line}</p>
                    )}
                    {goesOn && (
                      <div style={{ marginTop: 10 }}><SessionPanel invitationId={request.id} role="notary" /></div>
                    )}
                    {proof && (
                      <div data-testid="desk-proof" style={{ marginTop: 8, padding: "10px 12px", borderRadius: 10, background: E.maroonWash, border: `1px solid ${E.maroonLine}` }}>
                        <p style={{ margin: 0, fontSize: 13.5, color: E.text }}>
                          Reference number: <strong data-testid="desk-reference" style={{ letterSpacing: "0.04em" }}>{payment.reference}</strong>
                          {payment.proofAt !== null && <> · sent {stampLabel(payment.proofAt)}</>}
                        </p>
                        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: E.quiet }}>Look for this transfer in your own bank or e-wallet app. Do not go by a screenshot.</p>
                        {missing === request.id ? (
                          <div style={{ marginTop: 10 }}>
                            <label htmlFor={`missing-${request.id}`} style={labelStyle}>Note for the client (optional)</label>
                            <input id={`missing-${request.id}`} value={reason} maxLength={120} onChange={event => { setReason(event.target.value); }} style={fieldStyle()} />
                            <p style={hintStyle}>For example, &ldquo;No transfer with that reference yet.&rdquo; At most 120 characters.</p>
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                              <ActionButton kind="danger" icon={X} disabled={busy} onClick={() => { void notReceived(request); }}>{busy ? "Sending…" : "Tell the client it did not arrive"}</ActionButton>
                              <ActionButton kind="secondary" disabled={busy} onClick={() => { setMissing(null); setReason(""); }}>Back</ActionButton>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                            <ActionButton icon={Check} disabled={busy} onClick={() => { confirmPayment(request); }}>I received it</ActionButton>
                            <ActionButton kind="secondary" disabled={busy} onClick={() => { setMissing(request.id); setReason(""); }}>Not received</ActionButton>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {open && (
                  <div style={{ marginTop: 12 }}>
                    {declining === request.id ? (
                      <div>
                        <label htmlFor={`reason-${request.id}`} style={{ display: "block", fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>Reason (optional)</label>
                        <input id={`reason-${request.id}`} value={reason} maxLength={120} onChange={event => { setReason(event.target.value); }} style={fieldStyle()} />
                        <p style={{ margin: "6px 0 0", fontSize: 12.5, color: E.quiet }}>At most 120 characters. The client is told you declined.</p>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                          <ActionButton kind="danger" icon={X} disabled={busy} onClick={() => { void answer(request, "decline"); }}>{busy ? "Declining…" : "Decline the request"}</ActionButton>
                          <ActionButton kind="secondary" disabled={busy} onClick={() => { setDeclining(null); setReason(""); }}>Keep it</ActionButton>
                        </div>
                      </div>
                    ) : accepting === request.id ? (
                      <div data-testid="accept-panel">
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
                                  <input type="radio" name={`fee-mode-${request.id}`} data-testid={option.testId} checked={chosen}
                                    onChange={() => { setNoFee(option.free); }} style={{ width: 18, height: 18, marginTop: 2, accentColor: E.maroon }} />
                                  <span><strong style={{ display: "block", fontSize: 14.5, color: E.ink }}>{option.title}</strong>
                                    <span style={{ fontSize: 13, color: E.quiet }}>{option.note}</span></span>
                                </label>
                              );
                            })}
                          </div>
                        </fieldset>
                        <label htmlFor={`fee-${request.id}`} style={labelStyle}>{noFee ? "Fee (PHP)" : "Amount to ask for (PHP)"}</label>
                        <input
                          id={`fee-${request.id}`} data-testid="fee-input" inputMode="decimal" autoComplete="off"
                          value={noFee ? "No fee: free of charge" : fee} maxLength={noFee ? undefined : 12} readOnly={noFee} aria-readonly={noFee || undefined}
                          placeholder="e.g. 1500" aria-invalid={feeProblem !== null ? true : undefined}
                          onChange={event => { if (!noFee) setFee(event.target.value); }}
                          style={noFee ? { ...fieldStyle(false), background: "#F3F4F6", color: E.quiet, cursor: "not-allowed", fontWeight: 600 } : fieldStyle(feeProblem !== null)}
                        />
                        {feeProblem !== null && <p role="alert" style={{ ...hintStyle, color: T.danger }}>{feeProblem}</p>}
                        {noFee ? (
                          <div data-testid="no-fee-notice" role="status" style={{ ...GF, margin: "12px 0 0", padding: "12px 14px", borderRadius: 10, background: "#EEF7F0", border: "1px solid #BFE0C8" }}>
                            <strong style={{ display: "block", fontSize: 14, color: E.ok, marginBottom: 6 }}>You are accepting this request free of charge</strong>
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: E.text, lineHeight: 1.6 }}>
                              <li>{request.client.name} will not be asked to pay, and will see that you are not charging a fee.</li>
                              <li>There is no payment to confirm. The online session can begin as soon as you accept.</li>
                              <li>Once you accept, the fee cannot be changed. To charge a fee instead, choose "Charge a fee" before you accept.</li>
                              <li>You do not need a payment QR for a request without a fee.</li>
                            </ul>
                          </div>
                        ) : (
                          <>
                            {!hasQr && (
                              <p data-testid="accept-needs-qr" style={{ ...hintStyle, color: "#8A5A00" }}>
                                A fee is paid to your payment QR, and you have not saved one.{" "}
                                <Link to="/app/enotary/payment" style={{ color: "inherit", fontWeight: 700 }}>Save my payment QR</Link>
                              </p>
                            )}
                            <p style={hintStyle}>
                              The client pays you directly with their bank or e-wallet app, then sends you the reference number. You confirm from your own app.
                              LAGDA never holds the money. The online session begins once the fee is settled.
                            </p>
                          </>
                        )}
                        <p data-testid="fee-summary" style={{ ...GF, margin: "12px 0 0", fontSize: 14, fontWeight: 700, color: E.ink }}>
                          {noFee ? `You will accept this request without a fee.`
                            : feeAmount === null ? "Enter an amount to see what the client will be asked to pay."
                              : `You will ask ${request.client.name} to pay PHP ${formatPesos(feeAmount)}.`}
                        </p>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                          <ActionButton
                            icon={Check} disabled={busy || feeAmount === null || (!noFee && !hasQr)}
                            onClick={() => { void answer(request, "accept"); }}
                          >
                            {busy ? "Accepting…" : noFee ? "Accept without a fee" : "Accept the request"}
                          </ActionButton>
                          <ActionButton kind="secondary" disabled={busy} onClick={() => { setAccepting(null); setFee(""); setNoFee(false); }}>Not now</ActionButton>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <ActionButton icon={Check} disabled={busy || !desk.canAccept} onClick={() => { setAccepting(request.id); setDeclining(null); setFee(""); setNoFee(false); setReason(""); }}>Accept</ActionButton>
                        <ActionButton kind="secondary" disabled={busy || !desk.canAccept} onClick={() => { setDeclining(request.id); setAccepting(null); setReason(""); }}>Decline</ActionButton>
                      </div>
                    )}
                    {!desk.canAccept && <p style={{ margin: "8px 0 0", fontSize: 12.5, color: E.quiet }}>You can answer once your application is approved.</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p style={{ ...GF, margin: "18px 0 0", fontSize: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link to="/app/enotary/payment" style={{ ...linkButton("secondary"), color: T.ink }}>{hasQr ? "My payment QR" : "Save my payment QR"}</Link>
        <Link to="/app/enotary/apply" style={{ ...linkButton("secondary"), color: T.ink }}>{desk.applicationStatus === "none" ? "Apply to be a notary" : "My application"}</Link>
      </p>
      <OnrampNote />
    </EnotaryFrame>
  );
}

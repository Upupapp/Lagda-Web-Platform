// /app/enotary/desk — a notary's desk: the requests clients have sent them, Accept
// or Decline for each, and, once a client says they paid, the
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

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { SessionPanel } from "../room/SessionPanel";
import { AlertTriangle, Check, Clock, Inbox, QrCode, X } from "lucide-react";
import { ActionButton, GF, Notice, T, useViewport } from "../../../../components/system/design-system";
import { useConfirm } from "../../../../components/platform/ConfirmDialog";
import { USE_REAL_BACKEND } from "../../../../services/backend-flag";
import { NotaryRequestView } from "./NotaryRequestView";
import { announceNavCountsChanged } from "../../../../services/nav-counts-signal";
import {
  describePaymentError, errorCode, formatPesos, realEnotaryInvitationsService,
  type DeskIncoming, type DeskPayment, type DeskRequest, type NotaryDesk,
} from "../../../../services/real/enotary-invitations.service";
import { E, SERIF } from "../EnotaryChrome";
import { EnotaryCaseFrame } from "../CaseFrame";
import { useOptionalPlatform } from "../../../../context/PlatformContext";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import { OnrampNote, Panel, StatusPill, bodyText, fieldStyle, hintStyle, labelStyle, linkButton, markSessionsOffered, useNow } from "../onramp-ui";
import { ExpiryClock, countdownText, expiryLabel, expiryTone, stampLabel } from "../requests/expiry";
import { withProcess } from "../../../../config/process-screens";

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

/** The desk's three counts and its closed list. A request waits for the notary, is in progress, is done, or is over. */
export function groupRequests(requests: readonly DeskRequest[]): {
  waiting: DeskRequest[]; progress: DeskRequest[]; completed: DeskRequest[]; closed: DeskRequest[];
} {
  const out = { waiting: [] as DeskRequest[], progress: [] as DeskRequest[], completed: [] as DeskRequest[], closed: [] as DeskRequest[] };
  for (const request of requests) {
    if (request.status === "claimed" || (request.status === "accepted" && request.payment?.status === "proof")) out.waiting.push(request);
    else if (request.status === "accepted" && request.session?.status === "notarized") out.completed.push(request);
    else if (request.status === "accepted" && request.session?.status !== "cancelled") out.progress.push(request);
    else out.closed.push(request);
  }
  return out;
}

const initialsOf = (name: string): string =>
  name.split(/\s+/).filter(part => part !== "").slice(0, 2).map(part => part[0]?.toUpperCase() ?? "").join("");

/** What a notarized case says about its copy, in the words of the desk. */
export function copyWords(copy: NonNullable<DeskRequest["case"]>["copy"]): string {
  if (copy === null) return "Notarized";
  if (copy.status === "received") return "Copy received by the client";
  if (copy.status === "fulfilled") {
    if (copy.mode === "digital") return "Digital copy issued";
    return ({ delivered: "Copy delivered, awaiting receipt", out_for_delivery: "Copy out for delivery", in_transit: "Copy in transit" } as Record<string, string>)[copy.stage ?? ""] ?? "Copy with the courier";
  }
  if (copy.status === "declined" || copy.status === "cancelled") return "Notarized";
  return "Copy requested";
}

function stageWords(request: DeskRequest): string {
  const session = request.session ?? null;
  if (session === null) return "Accepted";
  if (session.status === "notarized") return copyWords(request.case?.copy ?? null);
  if (session.status === "cancelled") return "Called off";
  return session.status === "live" ? "In the room" : "Room not open yet";
}

/** The document, the act and the fee, as one line. */
function caseLine(request: DeskRequest): string {
  const held = request.case ?? null;
  if (held === null) return "";
  return [held.documentName, held.actLabel, held.feeCentavos === null ? null : held.feeCentavos === 0 ? "No fee" : `PHP ${formatPesos(held.feeCentavos)}`]
    .filter((part): part is string => part !== null && part !== "").join(" · ");
}

function DeskSection({ id, title, count, children }: { id: string; title: string; count: number; children: ReactNode }) {
  return (
    <section aria-labelledby={`desk-${id}-heading`} data-testid={`desk-section-${id}`}>
      <h2 id={`desk-${id}-heading`} style={{ ...GF, fontSize: 19, color: E.navy, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8 }}>
        {title} <span style={{ fontSize: 12.5, fontWeight: 700, color: E.quiet, background: E.skyWash, borderRadius: 999, padding: "2px 9px" }}>{count}</span>
      </h2>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>{children}</ul>
    </section>
  );
}

function CompletedRow({ request }: { request: DeskRequest }) {
  const words = copyWords(request.case?.copy ?? null);
  return (
    <li data-testid="desk-row" data-status="completed" style={{ ...GF, padding: "14px 16px", borderRadius: 12, border: `1px solid ${E.line}`, background: "#FFFFFF",
      display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <span aria-hidden="true" style={{ flex: "0 0 auto", width: 44, height: 44, borderRadius: 999, display: "grid", placeItems: "center", background: E.skyWash,
        border: `1px solid ${E.skyLine}`, color: E.skyDeep, fontFamily: SERIF, fontWeight: 700 }}>{initialsOf(request.client.name)}</span>
      <span style={{ flex: "1 1 240px", minWidth: 0 }}>
        <strong style={{ display: "block", fontFamily: SERIF, fontSize: 17, color: E.navy, overflowWrap: "anywhere" }}>{request.client.name}</strong>
        <small style={{ color: E.quiet, fontSize: 13 }}>
          {request.reference !== undefined && request.reference !== null && <span data-testid="desk-reference-no" style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace", color: E.ink, fontWeight: 700 }}>{request.reference}</span>}
          {" "}· Received {stampLabel(request.receivedAt)}{caseLine(request) !== "" && <> · {caseLine(request)}</>}
        </small>
      </span>
      <span data-testid="desk-copy-state" style={{ fontSize: 13, fontWeight: 700, color: E.ok, background: E.okWash, border: "1px solid #B7E3CA", borderRadius: 999, padding: "5px 12px" }}>{words}</span>
      <Link to={`/app/enotary/desk/${encodeURIComponent(request.id)}`} data-testid="desk-open" style={{ ...linkButton("secondary"), color: T.ink }}>Open</Link>
    </li>
  );
}

export function NotaryDeskPage({ focus }: { focus?: string } = {}) {
  const { isCompact } = useViewport();
  const platform = useOptionalPlatform();
  // Actions sit on the right on a wide screen and at the start, wrapping, on a narrow one.
  const buttonRow = (top = 10): CSSProperties => ({ display: "flex", gap: 10, flexWrap: "wrap", marginTop: top, justifyContent: isCompact ? "flex-start" : "flex-end" });
  const [loaded, setLoaded] = useState<Loaded>(USE_REAL_BACKEND ? { kind: "loading" } : { kind: "off" });
  const [working, setWorking] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
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
        if (desk !== null && desk.requests.some(r => r.session !== undefined)) markSessionsOffered();
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
  const surname = (platform?.user?.fullName ?? platform?.user?.displayName ?? "").replace(/^atty\.?\s+/i, "").trim().split(/\s+/).filter(part => part !== "").at(-1);
  const greeting = surname === undefined ? "Good day, counsel" : `Good day, Atty. ${surname}`;
  const hasQr = desk.paymentProfile !== null && desk.paymentProfile !== undefined;
  const incoming = desk.incoming ?? [];
  const groups = groupRequests(desk.requests);
  const waiting = groups.waiting;
  const progress = groups.progress;
  const completed = groups.completed;
  const closed = groups.closed;

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
        await withProcess("enotary-accept", request.client.name, () => realEnotaryInvitationsService.accept(request.id));
        if (!alive.current) return;
        setSaid(`You accepted the request from ${request.client.name}. Open the room when you are ready to meet.`);
        setAccepting(null);
      } else {
        await withProcess("enotary-decline", request.client.name, () => realEnotaryInvitationsService.decline(request.id, reason));
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
      await withProcess("enotary-take", item.client.name, () => realEnotaryInvitationsService.take(item.id));
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
          await withProcess("enotary-payment-confirm", request.client.name, () => realEnotaryInvitationsService.confirmPayment(request.id));
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
      await withProcess("enotary-payment-missing", request.client.name, () => realEnotaryInvitationsService.paymentNotReceived(request.id, reason));
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

  const renderRequest = (request: DeskRequest) => {
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
            <StatusPill status={request.status} label={request.status === "claimed" ? "Waiting for you" : request.status === "accepted" ? stageWords(request) : undefined} />
            {focus === undefined && <Link to={`/app/enotary/desk/${encodeURIComponent(request.id)}`} data-testid="desk-open" style={{ ...linkButton("secondary"), color: T.ink }}>Open</Link>}
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: E.quiet }}>
            {request.reference !== undefined && request.reference !== null && <><span data-testid="desk-reference-no" style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace", color: E.ink, fontWeight: 700 }}>{request.reference}</span> · </>}
            Received {stampLabel(request.receivedAt)}
            {request.decidedAt !== null && <> · Answered {stampLabel(request.decidedAt)}</>}
            {caseLine(request) !== "" && <> · {caseLine(request)}</>}
          </p>
          {open && (
            <p data-testid="desk-countdown" data-tone={tone} style={{ margin: "6px 0 0", fontSize: 13.5, fontWeight: 700, color: tone === "red" ? "#B0182B" : tone === "amber" ? "#8A5A00" : E.skyDeep, display: "flex", gap: 6, alignItems: "center" }}>
              <Clock size={14} aria-hidden /> {countdownText(msLeft)} left · until {expiryLabel(request.expiresAt)}
            </p>
          )}
          {request.status === "accepted" && (
            <div style={{ marginTop: 8 }}>
              <p style={{ margin: 0, fontSize: 13.5, color: E.text }}>
                {request.session?.status === "cancelled" ? "The session was called off. Nothing was notarized."
                  : goesOn
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
                      <div style={buttonRow()}>
                        <ActionButton kind="danger" icon={X} disabled={busy} onClick={() => { void notReceived(request); }}>{busy ? "Sending…" : "Tell the client it did not arrive"}</ActionButton>
                        <ActionButton kind="secondary" disabled={busy} onClick={() => { setMissing(null); setReason(""); }}>Back</ActionButton>
                      </div>
                    </div>
                  ) : (
                    <div style={buttonRow()}>
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
                  <div style={buttonRow()}>
                    <ActionButton kind="danger" icon={X} disabled={busy} onClick={() => { void answer(request, "decline"); }}>{busy ? "Declining…" : "Decline the request"}</ActionButton>
                    <ActionButton kind="secondary" disabled={busy} onClick={() => { setDeclining(null); setReason(""); }}>Keep it</ActionButton>
                  </div>
                </div>
              ) : accepting === request.id ? (
                <div data-testid="accept-panel">
                  <p style={{ margin: "0 0 8px", fontSize: 14, color: E.text }}>
                    Accept to open a private room with {request.client.name}. You meet on a video call, and they choose the document with you.
                  </p>
                  <p data-testid="accept-later" style={hintStyle}>
                    You do not name a fee now. After you confirm who they are and read the document, you state the notarial act and your fee, or no fee,
                    and {request.client.name} approves it before paying.
                  </p>
                  <div style={buttonRow()}>
                    <ActionButton icon={Check} disabled={busy} onClick={() => { void answer(request, "accept"); }}>
                      {busy ? "Accepting…" : "Accept the request"}
                    </ActionButton>
                    <ActionButton kind="secondary" disabled={busy} onClick={() => { setAccepting(null); }}>Not now</ActionButton>
                  </div>
                </div>
              ) : (
                <div style={buttonRow(0)}>
                  <ActionButton icon={Check} disabled={busy || !desk.canAccept} onClick={() => { setAccepting(request.id); setDeclining(null); setReason(""); }}>Accept</ActionButton>
                  <ActionButton kind="secondary" disabled={busy || !desk.canAccept} onClick={() => { setDeclining(request.id); setAccepting(null); setReason(""); }}>Decline</ActionButton>
                </div>
              )}
              {!desk.canAccept && <p style={{ margin: "8px 0 0", fontSize: 12.5, color: E.quiet }}>You can answer once your application is approved.</p>}
            </div>
          )}
        </li>
      );
  };

  const focused = focus === undefined ? null : desk.requests.find(request => request.id === focus) ?? null;
  const focusedNew = focus === undefined ? null : incoming.find(item => item.id === focus) ?? null;
  if (focus !== undefined) {
    return <NotaryRequestView focus={focus} request={focused} incoming={focusedNew} banner={banner} said={said} problem={problem} confirmDialog={confirmDialog}
      renderRequest={renderRequest} onTake={item => { void take(item); }} taking={working} receivedAt={receivedAt} now={now} />;
  }

  return (
    <EnotaryCaseFrame
      tone="attorney" eyebrow="Notary desk" title={greeting}
      lead="Requests from clients whose identity LAGDA has verified arrive here. Accept one to open a private room with the client."
    >
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
        {tally("Waiting", incoming.length + waiting.length, "tally-waiting")}
        {tally("In progress", progress.length, "tally-progress")}
        {tally("Completed", completed.length, "tally-completed")}
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
            <span>No request is waiting. A new one appears here by itself, without reloading the page. A request sent as a link or a QR card appears once you open it.</span>
          </p>
        </Panel>
      ) : (
        <div data-testid="desk-list" style={{ display: "grid", gap: 22 }}>
          {waiting.length > 0 && (
            <DeskSection id="waiting" title="Waiting for you" count={waiting.length}>{waiting.map(renderRequest)}</DeskSection>
          )}
          {progress.length > 0 && (
            <DeskSection id="progress" title="In progress" count={progress.length}>{progress.map(renderRequest)}</DeskSection>
          )}
          {completed.length > 0 && (
            <DeskSection id="completed" title="Completed" count={completed.length}>
              {completed.map(request => <CompletedRow key={request.id} request={request} />)}
            </DeskSection>
          )}
          {closed.length > 0 && (
            <DeskSection id="closed" title="Closed" count={closed.length}>{closed.map(renderRequest)}</DeskSection>
          )}
        </div>
      )}
      <p style={{ ...GF, margin: "18px 0 0", fontSize: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link to="/app/enotary/register" data-testid="open-register" style={{ ...linkButton("secondary"), color: T.ink }}>Open the notarial register</Link>
        <Link to="/app/enotary/payment" style={{ ...linkButton("secondary"), color: T.ink }}>{hasQr ? "My payment QR" : "Save my payment QR"}</Link>
        <Link to="/app/enotary/apply" style={{ ...linkButton("secondary"), color: T.ink }}>{desk.applicationStatus === "none" ? "Apply to be a notary" : "My application"}</Link>
      </p>
      <OnrampNote />
    </EnotaryCaseFrame>
  );
}

/** /app/enotary/desk/:id: one request, in its own page. */
export function NotaryRequestPage() {
  const { id = "" } = useParams<{ id: string }>();
  return <NotaryDeskPage focus={id} />;
}

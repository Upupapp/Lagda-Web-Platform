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

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { describeSessionError, realEnotarySessionsService } from "../../../../services/real/enotary-sessions.service";
import { SessionPanel } from "../room/SessionPanel";
import { DetailNotes, detailsLine } from "../request-details";
import {
  AlertTriangle, Archive, BadgeCheck, Banknote, BookOpen, CalendarDays, Check, CheckCircle2, Clock, FileText, Hash, Hourglass, Inbox,
  Image as ImageIcon, PenLine, QrCode, Search, Video, X, XCircle,
} from "lucide-react";
import { Z } from "../../../../utils/z-index";
import { DESK_CARD_STYLES, DeskCard, DeskGroup, type DeskFact, type DeskPill, type DeskTile } from "./DeskCard";
import { ActionButton, GF, Notice, T, useViewport } from "../../../../components/system/design-system";
import { useConfirm } from "../../../../components/platform/ConfirmDialog";
import { USE_REAL_BACKEND } from "../../../../services/backend-flag";
import { NotaryRequestView } from "./NotaryRequestView";
import { announceNavCountsChanged } from "../../../../services/nav-counts-signal";
import {
  describePaymentError, errorCode, formatPesos, realEnotaryInvitationsService,
  type DeskIncoming, type DeskPayment, type DeskRequest, type NotaryDesk,
} from "../../../../services/real/enotary-invitations.service";
import { E } from "../EnotaryChrome";
import { EnotaryCaseFrame } from "../CaseFrame";
import { useOptionalPlatform } from "../../../../context/PlatformContext";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import { OnrampNote, Panel, bodyText, fieldStyle, hintStyle, labelStyle, markSessionsOffered, useNow } from "../onramp-ui";
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

/** 131. Which of the desk's groups is shown: every one, or one of the four the counts name. */
export type DeskShow = "all" | "waiting" | "progress" | "completed" | "closed";
const DESK_SHOWS: readonly DeskShow[] = ["all", "waiting", "progress", "completed", "closed"];
export const deskShowOf = (value: string | null): DeskShow => (DESK_SHOWS as readonly string[]).includes(value ?? "") ? value as DeskShow : "all";

/** 131. Whether a request answers the desk's search: the client's name or the request's reference, in any case. */
export function deskMatches(item: { readonly client: { readonly name: string }; readonly reference?: string | null | undefined }, query: string): boolean {
  const words = query.trim().toLowerCase();
  if (words === "") return true;
  return item.client.name.toLowerCase().includes(words) || (item.reference ?? "").toLowerCase().includes(words);
}

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

const fee = (centavos: number | null | undefined): string | null =>
  centavos === null || centavos === undefined ? null : centavos === 0 ? "No fee" : `PHP ${formatPesos(centavos)}`;

/** The facts of a request, in the order of the card: when it came and was answered, the document, the act, the fee, its number. */
function factsOf(request: DeskRequest): DeskFact[] {
  const held = request.case ?? null;
  const facts: DeskFact[] = [{ icon: CalendarDays, label: "Received", value: stampLabel(request.receivedAt) }];
  if (request.decidedAt !== null) facts.push({ icon: Clock, label: "Answered", value: stampLabel(request.decidedAt) });
  const document = held?.documentName ?? request.details?.documentLabel ?? null;
  if (document !== null && document !== "") facts.push({ icon: FileText, label: "Document", value: document });
  const service = held?.actLabel ?? request.details?.actWantedLabel ?? null;
  if (service !== null && service !== "") facts.push({ icon: PenLine, label: "Service", value: service });
  const amount = fee(held?.feeCentavos ?? request.payment?.amountCentavos);
  if (amount !== null) facts.push({ icon: Banknote, label: "Fee", value: amount });
  if (request.reference !== undefined && request.reference !== null) facts.push({ icon: Hash, label: "Reference no.", value: request.reference, mono: true });
  return facts;
}

/** The badge that says where a request stands. */
function pillOf(request: DeskRequest): DeskPill {
  if (request.status === "claimed") return { icon: Hourglass, label: "Waiting for you", tone: "alert" };
  if (request.status !== "accepted") {
    const label = ({ declined: "Declined", revoked: "Cancelled by the client", expired: "Expired" } as Record<string, string>)[request.status] ?? "Closed";
    return { icon: XCircle, label, tone: "end" };
  }
  const session = request.session ?? null;
  if (session?.status === "cancelled") return { icon: XCircle, label: "Called off", tone: "warn" };
  if (session?.status === "notarized") return { icon: BadgeCheck, label: copyWords(request.case?.copy ?? null), tone: "ok" };
  if (session?.status === "live") return { icon: Video, label: "In the room", tone: "info" };
  return { icon: Clock, label: session === null ? "Accepted" : "Room not open yet", tone: "info" };
}

/** Where the session and the payment stand, as the card's two tiles. */
function tilesOf(request: DeskRequest): DeskTile[] {
  if (request.status !== "accepted") return [];
  const payment = request.payment ?? null;
  const session = request.session ?? null;
  const sessionTile: DeskTile = session?.status === "cancelled"
    ? { icon: XCircle, label: "Session status", text: "The session was called off. Nothing was notarized.", tone: "warn", testId: "desk-session-state" }
    : session?.status === "notarized"
      ? { icon: BadgeCheck, label: "Session status", text: `Notarized. ${copyWords(request.case?.copy ?? null)}.`, tone: "ok", testId: "desk-session-state" }
      : session?.status === "live"
        ? { icon: Video, label: "Session status", text: "The room is open.", tone: "info", testId: "desk-session-state" }
        : { icon: Video, label: "Session status", text: "Accepted. The session can begin.", tone: "info", testId: "desk-session-state" };
  const tiles = [sessionTile];
  const words = paymentLine(payment, request.client.name);
  if (payment !== null && words !== null) {
    const tone = payment.status === "confirmed" ? "ok" : payment.status === "proof" ? "alert" : payment.status === "waived" ? "end" : "wait";
    const icon = payment.status === "confirmed" ? CheckCircle2 : payment.status === "proof" ? AlertTriangle : payment.status === "waived" ? Check : Hourglass;
    tiles.push({ icon, label: "Payment", text: words, tone, testId: "desk-payment", strong: payment.status === "confirmed" || payment.status === "proof" });
  }
  return tiles;
}

/**
 * `focus`: one request on its own page. `then: "reopen"` (131, from a client's "asks to continue" notice): the request's
 * called-off session is opened again by itself and the notary taken to the room; one already open goes straight there.
 */
export function NotaryDeskPage({ focus, then }: { focus?: string; then?: "reopen" | undefined } = {}) {
  const { isCompact } = useViewport();
  const navigate = useNavigate();
  // 131. The desk's filters: one request (from a notice), a group, and a search by name or reference.
  const [params, setParams] = useSearchParams();
  const only = params.get("request");
  const show = deskShowOf(params.get("show"));
  const [query, setQuery] = useState("");
  const reopening = useRef(false);
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
  const [viewing, setViewing] = useState<{ id: string; url: string | null; name: string } | null>(null);
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

  // 131. Open the session again and go to the room, once, as the notice asked. Anything that stops it is said on the
  // request's page, which stays open.
  useEffect(() => {
    if (then !== "reopen" || focus === undefined || loaded.kind !== "ready" || reopening.current) return;
    const request = loaded.desk.requests.find(item => item.id === focus);
    if (request === undefined) return;
    reopening.current = true;
    const room = `/app/enotary/room/${encodeURIComponent(focus)}`;
    const status = request.session?.status;
    if (status === "preparing" || status === "live") { void navigate(room, { replace: true }); return; }
    if (status !== "cancelled") return;
    void (async () => {
      try {
        const found = await realEnotarySessionsService.lookup(focus);
        const session = found?.session ?? null;
        if (session === null) throw new Error("This request has no session to open again.");
        await withProcess("enotary-session-reopen", request.client.name, () => realEnotarySessionsService.reopen(session.id), describeSessionError);
        if (alive.current) void navigate(room, { replace: true });
      } catch (error) {
        if (alive.current) setProblem(describeSessionError(error));
      }
    })();
  }, [then, focus, loaded, navigate]);

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
        await withProcess("enotary-accept", request.client.name, () => realEnotaryInvitationsService.accept(request.id), refused);
        if (!alive.current) return;
        setSaid(`You accepted the request from ${request.client.name}. Once they start the session, you open the room from here.`);
        setAccepting(null);
      } else {
        await withProcess("enotary-decline", request.client.name, () => realEnotaryInvitationsService.decline(request.id, reason), refused);
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
      await withProcess("enotary-take", item.client.name, () => realEnotaryInvitationsService.take(item.id), describeTakeError);
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
          await withProcess("enotary-payment-confirm", request.client.name, () => realEnotaryInvitationsService.confirmPayment(request.id), refused);
          if (alive.current) setSaid(`You confirmed the payment from ${request.client.name}.`);
        } catch (error) {
          if (alive.current) setProblem(refused(error));
        } finally {
          finish();
        }
      },
    });
  };

  const showScreenshot = async (request: DeskRequest) => {
    setViewing({ id: request.id, url: null, name: request.client.name });
    try {
      const blob = await realEnotaryInvitationsService.paymentScreenshot(request.id);
      if (!alive.current) return;
      if (blob === null) { setViewing(null); setProblem(`${request.client.name} sent no screenshot with this payment.`); return; }
      setViewing({ id: request.id, url: URL.createObjectURL(blob), name: request.client.name });
    } catch {
      if (alive.current) { setViewing(null); setProblem("The screenshot could not be opened. Try again."); }
    }
  };
  const closeScreenshot = () => { if (viewing?.url !== null && viewing?.url !== undefined) URL.revokeObjectURL(viewing.url); setViewing(null); };

  const notReceived = async (request: DeskRequest) => {
    setWorking(request.id);
    setProblem(null);
    setSaid(null);
    try {
      await withProcess("enotary-payment-missing", request.client.name, () => realEnotaryInvitationsService.paymentNotReceived(request.id, reason), refused);
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

  // 131. The counts are the desk's filter: pressing one shows that group alone, pressing it again shows every group.
  const setFilter = (value: DeskShow) => {
    setParams(previous => { const next = new URLSearchParams(previous); if (value === "all") next.delete("show"); else next.set("show", value); return next; }, { replace: true });
  };
  const showEverything = () => {
    setQuery("");
    setParams(previous => { const next = new URLSearchParams(previous); next.delete("show"); next.delete("request"); return next; }, { replace: true });
  };
  const tally = (label: string, count: number, testId: string, value: DeskShow) => {
    const on = show === value;
    return (
      <button type="button" data-testid={testId} aria-pressed={on} className="dk-tally" title={on ? "Show every request" : `Show only: ${label}`}
        onClick={() => { setFilter(on ? "all" : value); }}
        style={{ ...GF, flex: "1 1 0", minWidth: 96, padding: "12px 14px", borderRadius: 12, background: on ? E.maroonWash : "#FFFFFF",
          border: `1px solid ${on ? E.maroon : E.maroonLine}`, boxShadow: on ? `inset 0 0 0 1px ${E.maroon}` : "none", textAlign: "center", cursor: "pointer" }}>
        <strong style={{ display: "block", fontSize: 26, color: E.maroon, lineHeight: 1.1 }}>{count}</strong>
        <span style={{ fontSize: 13, color: on ? E.maroon : E.quiet, fontWeight: on ? 800 : 600 }}>{label}</span>
      </button>
    );
  };

  const renderRequest = (request: DeskRequest) => {
      const clock = new ExpiryClock();
      clock.sync(request.secondsLeft, receivedAt);
      const msLeft = clock.msLeft(now);
      const open = request.status === "claimed" && msLeft > 0;
      const tone = expiryTone(msLeft);
      const busy = working === request.id;
      const payment = request.payment ?? null;
      const proof = request.status === "accepted" && payment !== null && payment.status === "proof";
      const goesOn = payment === null || payment.status === "confirmed" || payment.status === "waived";
      return (
        <DeskCard
          key={request.id} name={request.client.name} reference={request.reference} verified={request.client.identityVerified}
          pills={[pillOf(request)]}
          // Open is shown only where the card has no way forward of its own. Once there is a session, its band leads on:
          // "Go to the room" or "Join the room" while it is preparing or live (a reopened one too), "Open the session again"
          // once it is called off.
          openTo={focus === undefined && !(request.status === "accepted" && goesOn && ["preparing", "live", "cancelled"].includes(request.session?.status ?? ""))
            ? `/app/enotary/desk/${encodeURIComponent(request.id)}` : undefined}
          facts={factsOf(request)} tiles={tilesOf(request)}
          data={{ "data-status": request.status, "data-payment": payment?.status ?? "none" }}
          band={request.status === "accepted" && goesOn ? <SessionPanel invitationId={request.id} role="notary" variant="band" /> : undefined}
        >
          {request.details !== undefined && request.details !== null && request.status !== "accepted" && (
            <>
              <p data-testid="desk-details" style={{ margin: 0, fontSize: 13.5, color: E.text }}>Asked for: {detailsLine(request.details)}</p>
              <DetailNotes details={request.details} />
            </>
          )}
          {open && (
            <p data-testid="desk-countdown" data-tone={tone} style={{ margin: "8px 0 0", fontSize: 13.5, fontWeight: 700, color: tone === "red" ? "#B0182B" : tone === "amber" ? "#8A5A00" : E.skyDeep, display: "flex", gap: 6, alignItems: "center" }}>
              <Clock size={14} aria-hidden /> {countdownText(msLeft)} left · until {expiryLabel(request.expiresAt)}
            </p>
          )}
          {proof && (
            <div data-testid="desk-proof" style={{ padding: "12px 14px", borderRadius: 12, background: "#FFFFFF", border: `1px solid ${E.maroonLine}` }}>
              <p style={{ margin: 0, fontSize: 13.5, color: E.text }}>
                Reference number: <strong data-testid="desk-reference" style={{ letterSpacing: "0.04em" }}>{payment.reference}</strong>
                {payment.proofAt !== null && <> · sent {stampLabel(payment.proofAt)}</>}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12.5, color: E.quiet }}>Look for this transfer in your own bank or e-wallet app. The client&rsquo;s screenshot helps you find it; do not go by the screenshot alone.</p>
              <button type="button" className="dk-open" data-testid="view-screenshot" style={{ marginTop: 10, cursor: "pointer" }} disabled={viewing?.id === request.id && viewing.url === null}
                onClick={() => { void showScreenshot(request); }}>
                <ImageIcon size={15} aria-hidden /> View the receipt screenshot
              </button>
              {missing === request.id ? (
                <div style={{ marginTop: 10 }}>
                  <label htmlFor={`missing-${request.id}`} style={labelStyle}>Note for the client (optional)</label>
                  <input id={`missing-${request.id}`} value={reason} maxLength={120} placeholder="e.g. No transfer with that reference has arrived yet." onChange={event => { setReason(event.target.value); }} style={fieldStyle()} />
                  <p style={hintStyle}>At most 120 characters. The client can send the reference again.</p>
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
          {open && (
            <div style={{ marginTop: 12 }}>
              {declining === request.id ? (
                <div>
                  <label htmlFor={`reason-${request.id}`} style={{ display: "block", fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>Reason (optional)</label>
                  <input id={`reason-${request.id}`} value={reason} maxLength={120} placeholder="e.g. The document is outside my notarial jurisdiction." onChange={event => { setReason(event.target.value); }} style={fieldStyle()} />
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
        </DeskCard>
      );
  };

  const screenshotDialog = viewing === null || viewing.url === null ? null : (
    <div data-testid="screenshot-overlay" onMouseDown={event => { if (event.target === event.currentTarget) closeScreenshot(); }}
      style={{ position: "fixed", inset: 0, zIndex: Z.modal, display: "grid", placeItems: "center", padding: "clamp(10px, 3vw, 24px)", background: "rgba(10,26,43,0.6)" }}>
      <div role="dialog" aria-modal="true" aria-label={`Receipt screenshot from ${viewing.name}`}
        style={{ position: "relative", width: "min(560px, 100%)", maxHeight: "calc(100dvh - 32px)", overflow: "auto", borderRadius: 16, background: "#FFFFFF", padding: 18, boxSizing: "border-box" }}>
        <button type="button" onClick={closeScreenshot} aria-label="Close the screenshot" style={{ position: "absolute", right: 10, top: 10, width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 10, border: `1px solid ${E.line}`, background: "#FFFFFF", cursor: "pointer" }}><X size={18} aria-hidden /></button>
        <h2 style={{ margin: "0 48px 6px 0", fontSize: 17, fontWeight: 800, color: E.navy }}>Receipt from {viewing.name}</h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: E.quiet }}>Check it against your own GCash or bank app before you confirm.</p>
        <img src={viewing.url} alt={`Receipt screenshot from ${viewing.name}`} data-testid="screenshot-image" style={{ display: "block", width: "100%", height: "auto", borderRadius: 10, border: `1px solid ${E.line}` }} />
      </div>
    </div>
  );

  // 131. What the filters leave: one request when a notice asked for it, the group pressed, and what the search finds.
  const fits = (item: { readonly id: string; readonly client: { readonly name: string }; readonly reference?: string | null | undefined }) =>
    (only === null || item.id === only) && deskMatches(item, query);
  const wants = (group: DeskShow) => show === "all" || show === group;
  const shownIncoming = wants("waiting") ? incoming.filter(fits) : [];
  const shownWaiting = wants("waiting") ? waiting.filter(fits) : [];
  const shownProgress = wants("progress") ? progress.filter(fits) : [];
  const shownCompleted = wants("completed") ? completed.filter(fits) : [];
  const shownClosed = wants("closed") ? closed.filter(fits) : [];
  const filtering = only !== null || show !== "all" || query.trim() !== "";
  const nothingShown = shownIncoming.length + shownWaiting.length + shownProgress.length + shownCompleted.length + shownClosed.length === 0;
  const onlyOne = only === null ? null : desk.requests.find(request => request.id === only) ?? incoming.find(item => item.id === only) ?? null;

  const focused = focus === undefined ? null : desk.requests.find(request => request.id === focus) ?? null;
  const focusedNew = focus === undefined ? null : incoming.find(item => item.id === focus) ?? null;
  if (focus !== undefined) {
    return <>{screenshotDialog}<NotaryRequestView focus={focus} request={focused} incoming={focusedNew} banner={banner} said={said} problem={problem} confirmDialog={confirmDialog}
      renderRequest={renderRequest} onTake={item => { void take(item); }} taking={working} receivedAt={receivedAt} now={now} /></>;
  }

  return (
    <EnotaryCaseFrame
      tone="attorney" eyebrow="Notary desk" title={greeting}
      lead="Requests from clients whose identity LAGDA has verified arrive here. Accept one to open a private room with the client."
    >
      {confirmDialog}
      {screenshotDialog}
      <style>{`${DESK_CARD_STYLES}
        .dk-link { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 16px; border-radius: 10px; border: 1px solid ${E.line}; background: #FFFFFF; color: ${T.ink}; font-weight: 700; text-decoration: none; transition: background 140ms ease, border-color 140ms ease, transform 100ms ease; }
        .dk-link:hover { background: ${E.wash}; border-color: #C5D2DF; }
        .dk-link:active { transform: scale(0.97); }
        .dk-link:focus-visible { outline: 3px solid rgba(10,132,214,0.4); outline-offset: 2px; }
        @media (max-width: 640px) { .dk-links .dk-link { flex: 1 1 100%; justify-content: center; } }`}</style>
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
      <div role="group" aria-label="Show requests by status" style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "0 0 12px" }}>
        {tally("Waiting", incoming.length + waiting.length, "tally-waiting", "waiting")}
        {tally("In progress", progress.length, "tally-progress", "progress")}
        {tally("Completed", completed.length, "tally-completed", "completed")}
        {tally("Closed", closed.length, "tally-closed", "closed")}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", margin: "0 0 18px" }}>
        <label htmlFor="desk-search" style={{ position: "relative", flex: "1 1 260px", minWidth: 0 }}>
          <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Search requests by client or reference</span>
          <Search size={16} aria-hidden style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: E.quiet }} />
          <input id="desk-search" data-testid="desk-search" type="search" value={query} placeholder="Search by client name or reference (EN-2026-…)"
            onChange={event => { setQuery(event.target.value); }} style={{ ...fieldStyle(), paddingLeft: 36 }} />
        </label>
        {filtering && (
          <button type="button" className="dk-link" data-testid="desk-show-all" onClick={showEverything} style={{ cursor: "pointer" }}>
            <X size={16} aria-hidden /> Show all requests
          </button>
        )}
      </div>
      {only !== null && (
        <div data-testid="desk-only">
          <Notice icon={Inbox} tone="info">
            {onlyOne === null
              ? "The request this link names is not on your desk any more."
              : <>Showing only the request from <strong>{onlyOne.client.name}</strong>{"reference" in onlyOne && onlyOne.reference !== null && onlyOne.reference !== undefined ? <> ({onlyOne.reference})</> : null}.</>}
          </Notice>
        </div>
      )}
      {said !== null && <div role="status" style={{ ...GF, margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: E.ok }}>{said}</div>}
      {problem !== null && <Notice icon={AlertTriangle} tone="danger">{problem}</Notice>}

      {shownIncoming.length > 0 && (
        <section aria-labelledby="desk-new-heading" data-testid="desk-new" style={{ margin: "0 0 18px" }}>
          <h2 id="desk-new-heading" style={{ ...GF, fontSize: 17, color: E.ink, margin: "0 0 4px" }}>New requests for you</h2>
          <p style={{ ...bodyText, margin: "0 0 10px" }}>Clients sent these to your listing. Take one to see it among your requests, then accept or decline it.</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 14 }}>
            {shownIncoming.map(item => {
              const clock = new ExpiryClock();
              clock.sync(item.secondsLeft, receivedAt);
              const msLeft = clock.msLeft(now);
              const busy = working === item.id;
              return (
                <DeskCard
                  key={item.id} testId="desk-new-row" name={item.client.name} verified={item.client.identityVerified}
                  pills={[{ icon: Inbox, label: "New request", tone: "alert" }]}
                  facts={[
                    { icon: CalendarDays, label: "Sent", value: stampLabel(item.receivedAt) },
                    ...(item.details?.documentLabel !== undefined && item.details.documentLabel !== "" ? [{ icon: FileText, label: "Document", value: item.details.documentLabel }] : []),
                    ...(item.details?.actWantedLabel !== undefined && item.details.actWantedLabel !== "" ? [{ icon: PenLine, label: "Service", value: item.details.actWantedLabel }] : []),
                  ]}
                >
                  {item.details !== undefined && item.details !== null && <p data-testid="desk-new-details" style={{ margin: 0, fontSize: 13.5, color: E.text }}>Asked for: {detailsLine(item.details)}</p>}
                  <DetailNotes details={item.details} />
                  {msLeft > 0 && (
                    <p data-testid="desk-new-countdown" style={{ margin: "8px 0 0", fontSize: 13.5, fontWeight: 700, color: E.skyDeep, display: "flex", alignItems: "center", gap: 6 }}>
                      <Clock size={14} aria-hidden /> {countdownText(msLeft)} left · until {expiryLabel(item.expiresAt)}
                    </p>
                  )}
                  <div style={buttonRow()}>
                    <ActionButton icon={Check} disabled={busy || msLeft <= 0} onClick={() => { void take(item); }}>{busy ? "Taking…" : "Take this request"}</ActionButton>
                  </div>
                </DeskCard>
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
      ) : filtering && nothingShown ? (
        <Panel testId="desk-no-match">
          <p style={{ ...bodyText, margin: 0, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Search size={20} aria-hidden style={{ color: E.maroon, flex: "0 0 auto" }} />
            <span style={{ flex: "1 1 240px" }}>No request matches what you chose.</span>
            <button type="button" className="dk-link" onClick={showEverything} style={{ cursor: "pointer" }}>Show all requests</button>
          </p>
        </Panel>
      ) : (
        <div data-testid="desk-list" style={{ display: "grid", gap: 22 }}>
          {shownWaiting.length > 0 && (
            <DeskGroup id="waiting" title="Waiting for you" icon={Hourglass} count={shownWaiting.length}>{shownWaiting.map(renderRequest)}</DeskGroup>
          )}
          {shownProgress.length > 0 && (
            <DeskGroup id="progress" title="In progress" icon={Video} count={shownProgress.length}>{shownProgress.map(renderRequest)}</DeskGroup>
          )}
          {shownCompleted.length > 0 && (
            <DeskGroup id="completed" title="Completed" icon={BadgeCheck} count={shownCompleted.length}>
              {shownCompleted.map(request => (
                <DeskCard
                  key={request.id} name={request.client.name} reference={request.reference} verified={request.client.identityVerified}
                  pills={[{ ...pillOf(request), testId: "desk-copy-state" }]} openTo={`/app/enotary/desk/${encodeURIComponent(request.id)}`}
                  facts={factsOf(request)} data={{ "data-status": "completed" }}
                />
              ))}
            </DeskGroup>
          )}
          {shownClosed.length > 0 && (
            <DeskGroup id="closed" title="Closed" icon={Archive} count={shownClosed.length}>{shownClosed.map(renderRequest)}</DeskGroup>
          )}
        </div>
      )}
      <p className="dk-links" style={{ ...GF, margin: "22px 0 0", fontSize: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link to="/app/enotary/register" data-testid="open-register" className="dk-link"><BookOpen size={16} aria-hidden /> Open the notarial register</Link>
        <Link to="/app/enotary/payment" className="dk-link"><QrCode size={16} aria-hidden /> {hasQr ? "My payment QR" : "Save my payment QR"}</Link>
        <Link to="/app/enotary/apply" className="dk-link"><FileText size={16} aria-hidden /> {desk.applicationStatus === "none" ? "Apply to be a notary" : "My application"}</Link>
      </p>
      <OnrampNote />
    </EnotaryCaseFrame>
  );
}

/** /app/enotary/desk/:id: one request, in its own page. */
export function NotaryRequestPage() {
  const { id = "" } = useParams<{ id: string }>();
  // 131. `?then=reopen`: from the client's "asks to continue" notice, open the session again and go to the room.
  const [params] = useSearchParams();
  return <NotaryDeskPage focus={id} then={params.get("then") === "reopen" ? "reopen" : undefined} />;
}

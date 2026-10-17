// /app/enotary/desk — a notary's desk: the requests clients have sent them, and
// Accept or Decline for each.
//
// A request appears here only after the notary has proved who they are (the ID
// and face check) and the name matched. The client's name is shown from then on
// and not before. Accepting or declining needs an approved application whose
// commission has not ended; until then the desk says where the application stands
// and the buttons stay off. The server enforces every one of those rules.
//
// It ends at the notary's answer: "accepted" means the session opens when LAGDA
// eNotary does. No video, payment or document is offered here.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { AlertTriangle, Check, Clock, Inbox, X } from "lucide-react";
import { ActionButton, GF, Notice, T } from "../../../../components/system/design-system";
import { useConfirm } from "../../../../components/platform/ConfirmDialog";
import { USE_REAL_BACKEND } from "../../../../services/backend-flag";
import {
  errorCode, realEnotaryInvitationsService, type DeskRequest, type NotaryDesk,
} from "../../../../services/real/enotary-invitations.service";
import { E, EnotaryFrame } from "../EnotaryChrome";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import { OnrampNote, Panel, StatusPill, bodyText, fieldStyle, linkButton, useNow } from "../onramp-ui";
import { ExpiryClock, countdownText, expiryLabel, expiryTone, stampLabel } from "../requests/expiry";

const POLL_MS = 15_000;

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

export function NotaryDeskPage() {
  const [loaded, setLoaded] = useState<Loaded>(USE_REAL_BACKEND ? { kind: "loading" } : { kind: "off" });
  const [working, setWorking] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const alive = useRef(true);
  const { confirm, confirmDialog } = useConfirm();
  const now = useNow(1000);

  const load = useCallback((quiet: boolean) => {
    if (!USE_REAL_BACKEND) return;
    realEnotaryInvitationsService.desk().then(
      desk => { if (alive.current) setLoaded(desk === null ? { kind: "off" } : { kind: "ready", desk, receivedAt: Date.now() }); },
      () => { if (alive.current && !quiet) setLoaded({ kind: "error" }); },
    );
  }, []);

  useEffect(() => {
    alive.current = true;
    load(false);
    const timer = setInterval(() => { if (!document.hidden) load(true); }, POLL_MS);
    return () => { alive.current = false; clearInterval(timer); };
  }, [load]);

  if (loaded.kind === "loading") return <EnotaryLoading />;
  if (loaded.kind === "error") return <EnotaryLoadError onRetry={() => { setLoaded({ kind: "loading" }); load(false); }} />;
  if (loaded.kind === "off") return <EnotaryNotOffered />;

  const { desk, receivedAt } = loaded;
  const banner = bannerFor(desk);
  const waiting = desk.requests.filter(r => r.status === "claimed");
  const accepted = desk.requests.filter(r => r.status === "accepted");
  const closed = desk.requests.filter(r => r.status === "declined" || r.status === "expired" || r.status === "revoked");

  const refused = (error: unknown) => {
    const code = errorCode(error);
    if (code === "notary_not_approved") return "Your application is not approved, or your commission has ended, so you cannot answer requests.";
    if (code === "enotary_invitation_unavailable") return "That request is no longer open. The client may have cancelled it, or its time ran out.";
    return "That could not be done right now. Please try again.";
  };

  const answer = async (request: DeskRequest, kind: "accept" | "decline") => {
    setWorking(request.id);
    setProblem(null);
    setSaid(null);
    try {
      if (kind === "accept") await realEnotaryInvitationsService.accept(request.id);
      else await realEnotaryInvitationsService.decline(request.id, reason);
      if (!alive.current) return;
      setSaid(kind === "accept"
        ? `You accepted the request from ${request.client.name}. The session opens when LAGDA eNotary does.`
        : `You declined the request from ${request.client.name}.`);
      setDeclining(null);
      setReason("");
    } catch (error) {
      if (alive.current) setProblem(refused(error));
    } finally {
      if (alive.current) { setWorking(null); load(true); }
    }
  };

  const accept = (request: DeskRequest) => {
    confirm({
      title: `Accept the request from ${request.client.name}?`,
      body: "The client is told you accepted. The online session opens when LAGDA eNotary does; nothing is booked or notarized yet.",
      confirmLabel: "Accept the request",
      cancelLabel: "Not now",
      onConfirm: () => answer(request, "accept"),
    });
  };

  const tally = (label: string, count: number, testId: string) => (
    <div data-testid={testId} style={{ ...GF, flex: "1 1 0", minWidth: 96, padding: "12px 14px", borderRadius: 12, background: "#FFFFFF", border: `1px solid ${E.maroonLine}`, textAlign: "center" }}>
      <strong style={{ display: "block", fontSize: 26, color: E.maroon, lineHeight: 1.1 }}>{count}</strong>
      <span style={{ fontSize: 13, color: E.quiet, fontWeight: 600 }}>{label}</span>
    </div>
  );

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
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "0 0 18px" }}>
        {tally("Waiting", waiting.length, "tally-waiting")}
        {tally("Accepted", accepted.length, "tally-accepted")}
        {tally("Closed", closed.length, "tally-closed")}
      </div>
      {said !== null && <div role="status" style={{ ...GF, margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: E.ok }}>{said}</div>}
      {problem !== null && <Notice icon={AlertTriangle} tone="danger">{problem}</Notice>}

      {desk.requests.length === 0 ? (
        <Panel testId="desk-empty">
          <p style={{ ...bodyText, margin: 0, display: "flex", gap: 10 }}>
            <Inbox size={20} aria-hidden style={{ color: E.maroon, flex: "0 0 auto", marginTop: 2 }} />
            <span>No requests yet. When a client sends you a link or a QR card and you open it, the request appears here.</span>
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
            return (
              <li key={request.id} data-testid="desk-row" data-status={request.status} style={{ ...GF, padding: "14px 16px", borderRadius: 12, border: `1px solid ${E.line}`, background: "#FFFFFF" }}>
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
                  <p style={{ margin: "8px 0 0", fontSize: 13.5, color: E.text }}>Accepted. The session opens when LAGDA eNotary does.</p>
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
                    ) : (
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <ActionButton icon={Check} disabled={busy || !desk.canAccept} onClick={() => { accept(request); }}>Accept</ActionButton>
                        <ActionButton kind="secondary" disabled={busy || !desk.canAccept} onClick={() => { setDeclining(request.id); setReason(""); }}>Decline</ActionButton>
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
      <p style={{ ...GF, margin: "18px 0 0", fontSize: 14 }}>
        <Link to="/app/enotary/apply" style={{ ...linkButton("secondary"), color: T.ink }}>{desk.applicationStatus === "none" ? "Apply to be a notary" : "My application"}</Link>
      </p>
      <OnrampNote />
    </EnotaryFrame>
  );
}

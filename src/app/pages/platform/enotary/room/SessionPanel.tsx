// The session of an accepted request, as the request's own page and the
// notary's desk show it: start it (the client, once the fee is settled), go to
// the room, or read how it ended; after a notarization, the certified copies.
//
// Renders nothing when the feature is not offered.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { BadgeCheck, CalendarDays, Clock, Hash, Hourglass, Mail, PhoneOff, Video, XCircle } from "lucide-react";
import { RecordCard, type RecordBadge } from "../RecordCard";
import { ActionButton, Notice } from "../../../../components/system/design-system";
import {
  describeSessionError, realEnotarySessionsService, type SessionLookup, type SessionRole,
} from "../../../../services/real/enotary-sessions.service";
import { ApiError } from "../../../../services/api-client";
import { bodyText, linkButton, markSessionsOffered } from "../onramp-ui";
import { E } from "../EnotaryChrome";
import { stampLabel } from "../requests/expiry";
import { CopiesPanel } from "./CopiesPanel";
import { withProcess } from "../../../../config/process-screens";

export const SESSION_LOOKUP_MS = 8_000;

/** How long the notary sees "Opening the session again" before it is opened, so the step is never a flicker. */
export const REOPEN_PREPARE_MS = 900;

/** A panel of its own (the request page), or the band at the foot of a desk card: a heading and a white box. */
function Frame({ variant, title, tone = "plain", testId, children, badge }: {
  variant: "panel" | "band"; title: string; tone?: "plain" | "sky"; testId: string; children: ReactNode; badge?: RecordBadge;
}) {
  void tone;
  if (variant === "panel") return <RecordCard icon={Video} title={title === "Notarized" ? "Notarization Record" : "Session Record"} badge={badge} testId={testId}>{children}</RecordCard>;
  return (
    <section data-testid={testId}>
      <h3 style={{ margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, color: E.navy }}>
        <CalendarDays size={17} aria-hidden /> {title}
      </h3>
      <div style={{ background: "#FFFFFF", border: `1px solid ${E.line}`, borderRadius: 10, padding: "14px 16px" }}>{children}</div>
    </section>
  );
}

export function SessionPanel({ invitationId, role, variant = "panel" }: { invitationId: string; role: SessionRole; variant?: "panel" | "band" }) {
  const navigate = useNavigate();
  const [found, setFound] = useState<SessionLookup | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const alive = useRef(true);
  const roomPath = `/app/enotary/room/${encodeURIComponent(invitationId)}`;

  const load = useCallback(async () => {
    try {
      const next = await realEnotarySessionsService.lookup(invitationId);
      if (next !== null) markSessionsOffered();
      if (alive.current) setFound(next);
    } catch {
      /* the next round tries again; a failed read says nothing */
    }
  }, [invitationId]);

  const status = found?.session?.status;
  useEffect(() => {
    alive.current = true;
    void load();
    if (status === "notarized" || status === "cancelled") return () => { alive.current = false; };
    const timer = setInterval(() => { void load(); }, SESSION_LOOKUP_MS);
    return () => { alive.current = false; clearInterval(timer); };
  }, [load, status]);

  if (found === undefined || found === null) return null;
  const session = found.session;

  const start = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const next = await withProcess("enotary-session-start", "", () => realEnotarySessionsService.start(invitationId));
      if (alive.current) setFound({ session: next, canStart: false, reason: null });
    } catch (error) {
      if (alive.current) setProblem(describeSessionError(error));
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  // 122. A called-off session: the client asks the notary by email to open it again; the notary opens it.
  const whyNot = (error: unknown): string =>
    error instanceof ApiError && error.body?.code === "session_state" && error.body.message !== "" ? error.body.message : describeSessionError(error);
  const askToReopen = async () => {
    if (session === null) return;
    setBusy(true); setProblem(null); setSaid(null);
    try {
      await withProcess("enotary-session-reopen-request", "", () => realEnotarySessionsService.requestReopen(session.id));
      if (alive.current) setSaid(`We emailed ${session.notaryName} that you want to continue. You are told as soon as they open the session again.`);
    } catch (error) {
      if (alive.current) setProblem(whyNot(error));
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const reopen = async () => {
    if (session === null) return;
    setBusy(true); setProblem(null); setSaid(null);
    try {
      // The loading screen comes first and stays a moment; only then is the session opened, and the notary is taken to the room.
      const next = await withProcess("enotary-session-reopen", "", async () => {
        await new Promise(resolve => { setTimeout(resolve, REOPEN_PREPARE_MS); });
        return realEnotarySessionsService.reopen(session.id);
      });
      if (!alive.current) return;
      setFound({ session: next, canStart: false, reason: null });
      void navigate(roomPath);
    } catch (error) {
      if (alive.current) setProblem(describeSessionError(error));
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  if (session === null) {
    if (found.reason === "payment_pending") {
      return (
        <Frame variant={variant} title="The session" testId="session-panel" badge={{ icon: Hourglass, label: "Awaiting payment", tone: "warn" }}>
          <p style={{ ...bodyText, margin: 0 }} data-testid="session-wait-fee">
            {role === "client" ? "The session opens once the notary's fee is paid and confirmed." : "The session can begin once the client's payment is confirmed."}
          </p>
        </Frame>
      );
    }
    if (!found.canStart) return null;
    return (
      <Frame variant={variant} title="The session" tone="sky" testId="session-panel" badge={{ icon: Clock, label: "Not started", tone: "info" }}>
        {problem !== null && <Notice icon={XCircle} tone="danger">{problem}</Notice>}
        {role === "client" ? (
          <>
            <p style={bodyText}>Start the session to add your document and meet your notary online. The video runs between your browsers and is not recorded.</p>
            <ActionButton icon={Video} disabled={busy} onClick={() => { void start(); }}>{busy ? "Starting…" : "Start the session"}</ActionButton>
          </>
        ) : <p style={{ ...bodyText, margin: 0 }} data-testid="session-wait-client">The client has not started the session yet. You will be told when they add the document.</p>}
      </Frame>
    );
  }

  if (session.status === "cancelled") {
    const who = session.cancelledBy === role ? "You called off" : `${role === "client" ? session.notaryName : session.clientName} called off`;
    const stamp = session.endedAt === null ? null : stampLabel(session.endedAt);
    const cut = stamp === null ? -1 : stamp.lastIndexOf(", ");
    const ended = stamp === null ? null : cut < 0 ? { date: stamp, time: "" } : { date: stamp.slice(0, cut), time: stamp.slice(cut + 2) };
    return (
      <Frame variant={variant} title="The session" testId="session-panel" badge={{ icon: PhoneOff, label: "Session ended", tone: "warn" }}>
        {variant === "band" ? (
          <p style={{ ...bodyText, margin: 0 }} data-testid="session-cancelled">
            {who} the session{session.endedAt !== null ? ` on ${stampLabel(session.endedAt)}` : ""}. Nothing was notarized.
          </p>
        ) : (
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <span aria-hidden="true" style={{ flex: "0 0 auto", width: 44, height: 44, borderRadius: 10, display: "grid", placeItems: "center", background: "#FFF5DC", border: "1px solid #F0D9A8", color: "#8A5A00" }}><PhoneOff size={20} /></span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: E.ink }}>Session called off: no document notarized</p>
              <p data-testid="session-cancelled" style={{ ...bodyText, margin: "6px 0 0" }}>
                {who} the session{session.endedAt !== null ? ` on ${stampLabel(session.endedAt)}` : ""}. Nothing was notarized: <strong style={{ color: E.ink }}>no notarial act was performed</strong> and no notarial certificate was issued for this request.
              </p>
              <p style={{ margin: "12px 0 0", paddingTop: 10, borderTop: `1px dashed ${E.line}`, display: "flex", flexWrap: "wrap", gap: "6px 18px", fontSize: 13, color: E.quiet }}>
                {ended !== null && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><CalendarDays size={14} aria-hidden /> Called off on <strong style={{ color: E.ink }}>{ended.date}</strong></span>}
                {ended !== null && ended.time !== "" && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Clock size={14} aria-hidden /> at <strong style={{ color: E.ink }}>{ended.time}</strong></span>}
                {session.reference !== undefined && session.reference !== null && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Hash size={14} aria-hidden /> Ref. <strong style={{ color: E.ink, fontFamily: "ui-monospace, Menlo, Consolas, monospace" }}>{session.reference}</strong></span>}
              </p>
            </div>
          </div>
        )}
        {said !== null && <p role="status" data-testid="reopen-said" style={{ ...bodyText, margin: "10px 0 0" }}>{said}</p>}
        {problem !== null && <Notice icon={XCircle} tone="danger">{problem}</Notice>}
        <div data-testid="reopen-action" style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          {role === "client"
            ? <ActionButton icon={Mail} disabled={busy} onClick={() => { void askToReopen(); }}>{busy ? "Sending…" : `Email ${session.notaryName} to continue`}</ActionButton>
            : <ActionButton icon={Video} disabled={busy} onClick={() => { void reopen(); }}>{busy ? "Opening…" : "Open the session again"}</ActionButton>}
        </div>
      </Frame>
    );
  }

  if (session.status === "notarized") {
    return (
      <>
        <Frame variant={variant} title="Notarized" tone="sky" testId="session-panel" badge={{ icon: BadgeCheck, label: "Notarized", tone: "ok" }}>
          <p style={bodyText} data-testid="session-notarized">
            {session.act?.typeLabel} recorded{session.act !== null ? ` on ${stampLabel(session.act.at)}` : ""} · register entry {session.act?.registerRef} · code {session.notarized?.code}
          </p>
          <Link to={roomPath} style={linkButton("secondary")}>Open the notarized document</Link>
        </Frame>
        <CopiesPanel sessionId={session.id} role={role} />
      </>
    );
  }

  return (
    <Frame variant={variant} title="The session" tone="sky" testId="session-panel"
      badge={session.status === "live" ? { icon: Video, label: "In session", tone: "info" } : { icon: Clock, label: "Preparing", tone: "info" }}>
      <p style={bodyText} data-testid="session-state">
        {session.status === "live" ? "The room is open." : role === "client"
          ? session.document === null ? "Add your document, then wait for the notary to open the room." : "Your document is in. Waiting for the notary to open the room."
          : session.document === null ? "Waiting for the client to add the document." : "The document is in. Open the room when you are ready."}
      </p>
      <Link to={roomPath} style={linkButton("primary")}><Video size={16} aria-hidden /> {session.status === "live" ? "Join the room" : "Go to the room"}</Link>
    </Frame>
  );
}

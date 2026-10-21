// The session of an accepted request, as the request's own page and the
// notary's desk show it: start it (the client, once the fee is settled), go to
// the room, or read how it ended; after a notarization, the certified copies.
//
// Renders nothing when the feature is not offered.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Mail, Video, XCircle } from "lucide-react";
import { ActionButton, Notice } from "../../../../components/system/design-system";
import {
  describeSessionError, realEnotarySessionsService, type SessionLookup, type SessionRole,
} from "../../../../services/real/enotary-sessions.service";
import { ApiError } from "../../../../services/api-client";
import { Panel, PanelTitle, bodyText, linkButton, markSessionsOffered } from "../onramp-ui";
import { stampLabel } from "../requests/expiry";
import { CopiesPanel } from "./CopiesPanel";
import { withProcess } from "../../../../config/process-screens";

export const SESSION_LOOKUP_MS = 8_000;

export function SessionPanel({ invitationId, role }: { invitationId: string; role: SessionRole }) {
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
      const next = await withProcess("enotary-session-reopen", "", () => realEnotarySessionsService.reopen(session.id));
      if (alive.current) setFound({ session: next, canStart: false, reason: null });
    } catch (error) {
      if (alive.current) setProblem(describeSessionError(error));
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  if (session === null) {
    if (found.reason === "payment_pending") {
      return (
        <Panel testId="session-panel">
          <PanelTitle>The session</PanelTitle>
          <p style={{ ...bodyText, margin: 0 }} data-testid="session-wait-fee">
            {role === "client" ? "The session opens once the notary's fee is paid and confirmed." : "The session can begin once the client's payment is confirmed."}
          </p>
        </Panel>
      );
    }
    if (!found.canStart) return null;
    return (
      <Panel tone="sky" testId="session-panel">
        <PanelTitle>The session</PanelTitle>
        {problem !== null && <Notice icon={XCircle} tone="danger">{problem}</Notice>}
        {role === "client" ? (
          <>
            <p style={bodyText}>Start the session to add your document and meet your notary online. The video runs between your browsers and is not recorded.</p>
            <ActionButton icon={Video} disabled={busy} onClick={() => { void start(); }}>{busy ? "Starting…" : "Start the session"}</ActionButton>
          </>
        ) : <p style={{ ...bodyText, margin: 0 }} data-testid="session-wait-client">The client has not started the session yet. You will be told when they add the document.</p>}
      </Panel>
    );
  }

  if (session.status === "cancelled") {
    return (
      <Panel testId="session-panel">
        <PanelTitle>The session</PanelTitle>
        <p style={{ ...bodyText, margin: 0 }} data-testid="session-cancelled">
          {session.cancelledBy === role ? "You called off" : `${role === "client" ? session.notaryName : session.clientName} called off`} the session
          {session.endedAt !== null ? ` on ${stampLabel(session.endedAt)}` : ""}. Nothing was notarized.
        </p>
        {said !== null && <p role="status" data-testid="reopen-said" style={{ ...bodyText, margin: "10px 0 0" }}>{said}</p>}
        {problem !== null && <Notice icon={XCircle} tone="danger">{problem}</Notice>}
        <div data-testid="reopen-action" style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          {role === "client"
            ? <ActionButton icon={Mail} disabled={busy} onClick={() => { void askToReopen(); }}>{busy ? "Sending…" : `Email ${session.notaryName} to continue`}</ActionButton>
            : <ActionButton icon={Video} disabled={busy} onClick={() => { void reopen(); }}>{busy ? "Opening…" : "Open the session again"}</ActionButton>}
        </div>
      </Panel>
    );
  }

  if (session.status === "notarized") {
    return (
      <>
        <Panel tone="sky" testId="session-panel">
          <PanelTitle>Notarized</PanelTitle>
          <p style={bodyText} data-testid="session-notarized">
            {session.act?.typeLabel} recorded{session.act !== null ? ` on ${stampLabel(session.act.at)}` : ""} · register entry {session.act?.registerRef} · code {session.notarized?.code}
          </p>
          <Link to={roomPath} style={linkButton("secondary")}>Open the notarized document</Link>
        </Panel>
        <CopiesPanel sessionId={session.id} role={role} />
      </>
    );
  }

  return (
    <Panel tone="sky" testId="session-panel">
      <PanelTitle>The session</PanelTitle>
      <p style={bodyText} data-testid="session-state">
        {session.status === "live" ? "The room is open." : role === "client"
          ? session.document === null ? "Add your document, then wait for the notary to open the room." : "Your document is in. Waiting for the notary to open the room."
          : session.document === null ? "Waiting for the client to add the document." : "The document is in. Open the room when you are ready."}
      </p>
      <Link to={roomPath} style={linkButton("primary")}><Video size={16} aria-hidden /> {session.status === "live" ? "Join the room" : "Go to the room"}</Link>
    </Panel>
  );
}

// /app/enotary/room/:invitationId/place — the notary's page for placing the seal and the signature on the client's
// document, apart from the video session, as fields are placed when a document is prepared. The way back to the session is
// at the top and at the bottom. Every change is saved with the session on the server a moment after it is made, so the
// places survive a reload and a session called off and opened again; the act uses them. The notary can come here at any
// time until the document is notarized.

import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, CheckCircle2, CloudOff, Loader2, Video } from "lucide-react";
import { GF } from "../../../../components/system/design-system";
import { realEnotarySessionsService, type Session } from "../../../../services/real/enotary-sessions.service";
import { E, SERIF } from "../EnotaryChrome";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import { bodyText, linkButton } from "../onramp-ui";
import { SealPlacer, type Placements } from "./SealPlacer";
import { placementsOf, writePlacements } from "./seal-placements";
import { stampLabel } from "../requests/expiry";

/** How long after the last change the places are saved. */
export const SAVE_AFTER_MS = 500;

type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: string | null } | { kind: "failed" };

const PING_MS = 20_000;

type Loaded = { kind: "loading" } | { kind: "error" } | { kind: "off" } | { kind: "none" } | { kind: "ready"; session: Session };

export function SealPlacePage() {
  const { invitationId = "" } = useParams();
  const [loaded, setLoaded] = useState<Loaded>({ kind: "loading" });
  const [placements, setPlacements] = useState<Placements>({});
  const [hasSignature, setHasSignature] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const pending = useRef<{ sessionId: string; value: Placements; timer: ReturnType<typeof setTimeout> } | null>(null);
  const alive = useRef(true);
  const room = `/app/enotary/room/${encodeURIComponent(invitationId)}`;

  useEffect(() => {
    let alive = true;
    realEnotarySessionsService.lookup(invitationId).then(found => {
      if (!alive) return;
      if (found === null) setLoaded({ kind: "off" });
      else if (found.session === null) setLoaded({ kind: "none" });
      else {
        setLoaded({ kind: "ready", session: found.session });
        setPlacements(placementsOf(found.session));
        const savedAt = found.session.placements?.savedAt ?? null;
        setSave(savedAt === null ? { kind: "idle" } : { kind: "saved", at: savedAt });
      }
    }, () => { if (alive) setLoaded({ kind: "error" }); });
    return () => { alive = false; };
  }, [invitationId, attempt]);

  useEffect(() => {
    let alive = true;
    void Promise.resolve(realEnotarySessionsService.signature()).then(found => { if (alive) setHasSignature(found !== null && found !== undefined); }, () => undefined);
    return () => { alive = false; };
  }, []);

  // A change waiting to be saved goes at once when the page closes.
  const send = (sessionId: string, value: Placements) => {
    setSave({ kind: "saving" });
    realEnotarySessionsService.savePlacements(sessionId, value).then(
      next => { if (alive.current) setSave({ kind: "saved", at: next.placements?.savedAt ?? null }); },
      () => { if (alive.current) setSave({ kind: "failed" }); },
    );
  };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      const waiting = pending.current;
      if (waiting !== null) { clearTimeout(waiting.timer); void realEnotarySessionsService.savePlacements(waiting.sessionId, waiting.value).catch(() => undefined); }
    };
  }, []);

  // Being here is being present: the client's room keeps saying the notary is in the session.
  const sessionId = loaded.kind === "ready" ? loaded.session.id : null;
  const open = loaded.kind === "ready" && (loaded.session.status === "live" || loaded.session.status === "preparing");
  useEffect(() => {
    if (sessionId === null || !open) return;
    const ping = () => { Promise.resolve(realEnotarySessionsService.ping(sessionId)).catch(() => undefined); };
    const timer = setInterval(ping, PING_MS);
    return () => { clearInterval(timer); };
  }, [sessionId, open]);

  if (loaded.kind === "loading") return <EnotaryLoading label="Opening the document…" />;
  if (loaded.kind === "error") return <EnotaryLoadError onRetry={() => { setLoaded({ kind: "loading" }); setAttempt(value => value + 1); }} />;
  if (loaded.kind === "off") return <EnotaryNotOffered />;

  const session = loaded.kind === "ready" ? loaded.session : null;
  const allowed = session !== null && session.role === "notary" && session.status !== "notarized";
  const change = (next: Placements) => {
    setPlacements(next);
    if (session === null) return;
    writePlacements(session.id, next);
    if (pending.current !== null) clearTimeout(pending.current.timer);
    const sessionId = session.id;
    setSave({ kind: "saving" });
    pending.current = { sessionId, value: next, timer: setTimeout(() => { pending.current = null; send(sessionId, next); }, SAVE_AFTER_MS) };
  };
  const status = save.kind === "saving" ? <><Loader2 size={15} aria-hidden /> Saving…</>
    : save.kind === "saved" ? <><CheckCircle2 size={15} aria-hidden /> Saved with the session{save.at === null ? "" : ` at ${stampLabel(save.at)}`}</>
      : save.kind === "failed" ? <><CloudOff size={15} aria-hidden /> Not saved. <button type="button" onClick={() => { if (session !== null) send(session.id, placements); }} style={{ ...GF, border: 0, background: "none", padding: 0, color: "inherit", fontWeight: 800, textDecoration: "underline", cursor: "pointer" }}>Try again</button></>
        : null;
  const back = (label: string, testId = "back-to-session") => (
    <Link to={room} data-testid={testId} style={{ ...linkButton("primary"), display: "inline-flex", alignItems: "center", gap: 8 }}>
      <ArrowLeft size={16} aria-hidden /> {label}
    </Link>
  );

  return (
    <div className="eno-page" style={{ ...GF, background: E.ground }}>
      <div style={{ background: "#FFFFFF", borderBottom: `1px solid ${E.line}` }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "14px clamp(12px, 3vw, 28px)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {back("Back to the video session")}
          <div style={{ minWidth: 0, flex: "1 1 240px" }}>
            <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: E.maroon }}>Notarial act</p>
            <h1 data-testid="place-title" style={{ margin: 0, fontFamily: SERIF, fontSize: "clamp(20px, 4vw, 28px)", color: E.navy, overflowWrap: "anywhere" }}>Place your seal and signature</h1>
          </div>
          {allowed && open && <span style={{ ...bodyText, display: "inline-flex", alignItems: "center", gap: 6, margin: 0, fontSize: 13 }}><Video size={15} aria-hidden /> The session stays open while you are here.</span>}
          {allowed && status !== null && (
            <span role="status" data-testid="placements-saved" style={{ ...GF, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: save.kind === "failed" ? "#B0182B" : save.kind === "saved" ? E.ok : E.quiet }}>{status}</span>
          )}
        </div>
      </div>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px clamp(12px, 3vw, 28px) 56px" }}>
        {!allowed || session === null ? (
          <div data-testid="place-unavailable">
            <p style={bodyText}>{session === null ? "There is no session for this request yet." : session.role !== "notary" ? "Only the notary public places the seal and signature." : "The document is notarized, so the seal and signature can no longer move."}</p>
            <p>{back("Back to the request", "back-to-request")}</p>
          </div>
        ) : (
          <>
            <SealPlacer sessionId={session.id} hasSignature={hasSignature} value={placements} onChange={change} notaryName={session.notaryName} />
            <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>{back("Done: back to the video session", "done-back")}</div>
          </>
        )}
      </div>
    </div>
  );
}

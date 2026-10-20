// /app/enotary/room/:invitationId/place — the notary's page for placing the seal and the signature on the client's
// document, apart from the video session, as fields are placed when a document is prepared. The way back to the session is
// at the top and at the bottom, and the notary can come here again at any time while the session is open. Where they put
// each is kept in this tab and used when they record the act.

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Video } from "lucide-react";
import { GF } from "../../../../components/system/design-system";
import { realEnotarySessionsService, type Session } from "../../../../services/real/enotary-sessions.service";
import { E, SERIF } from "../EnotaryChrome";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import { bodyText, linkButton } from "../onramp-ui";
import { SealPlacer, type Placements } from "./SealPlacer";
import { readPlacements, writePlacements } from "./seal-placements";

const PING_MS = 20_000;

type Loaded = { kind: "loading" } | { kind: "error" } | { kind: "off" } | { kind: "none" } | { kind: "ready"; session: Session };

export function SealPlacePage() {
  const { invitationId = "" } = useParams();
  const [loaded, setLoaded] = useState<Loaded>({ kind: "loading" });
  const [placements, setPlacements] = useState<Placements>({});
  const [hasSignature, setHasSignature] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const room = `/app/enotary/room/${encodeURIComponent(invitationId)}`;

  useEffect(() => {
    let alive = true;
    realEnotarySessionsService.lookup(invitationId).then(found => {
      if (!alive) return;
      if (found === null) setLoaded({ kind: "off" });
      else if (found.session === null) setLoaded({ kind: "none" });
      else { setLoaded({ kind: "ready", session: found.session }); setPlacements(readPlacements(found.session.id)); }
    }, () => { if (alive) setLoaded({ kind: "error" }); });
    return () => { alive = false; };
  }, [invitationId, attempt]);

  useEffect(() => {
    let alive = true;
    void Promise.resolve(realEnotarySessionsService.signature()).then(found => { if (alive) setHasSignature(found !== null && found !== undefined); }, () => undefined);
    return () => { alive = false; };
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
  const allowed = session !== null && session.role === "notary" && open;
  const change = (next: Placements) => { setPlacements(next); if (session !== null) writePlacements(session.id, next); };
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
          {allowed && <span style={{ ...bodyText, display: "inline-flex", alignItems: "center", gap: 6, margin: 0, fontSize: 13 }}><Video size={15} aria-hidden /> The session stays open while you are here.</span>}
        </div>
      </div>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px clamp(12px, 3vw, 28px) 56px" }}>
        {!allowed || session === null ? (
          <div data-testid="place-unavailable">
            <p style={bodyText}>{session === null ? "There is no session for this request yet." : session.role !== "notary" ? "Only the notary public places the seal and signature." : "This session is over, so the seal and signature can no longer be placed."}</p>
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

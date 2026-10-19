// /app/enotary/requests — the client's requests to notaries, newest first, each
// with where it stands and (while open) how long it has left.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ChevronRight, Clock, Search } from "lucide-react";
import { T, TAP } from "../../../../components/system/design-system";
import { USE_REAL_BACKEND } from "../../../../services/backend-flag";
import {
  invitationIsOpen, realEnotaryInvitationsService, type Invitation,
} from "../../../../services/real/enotary-invitations.service";
import { ENOTARY_DIRECTORY_PATH } from "../../../../config/enotary-directory";
import { E, EnotaryFrame } from "../EnotaryChrome";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import { OnrampNote, StatusPill, bodyText, linkButton, useNow } from "../onramp-ui";
import { ExpiryClock, countdownText, expiryTone } from "./expiry";

// One request: the notary's name and office read as full lines, and where the request stands sits under them
// on a phone (status and time left side by side) or at the right on a wide screen.
const ROW_STYLES = `
  .req-row { font-family: 'Geist', sans-serif; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px 12px;
    min-height: ${TAP + 16}px; padding: 14px 14px; border-radius: 12px; border: 1px solid ${E.line}; background: #FFFFFF;
    text-decoration: none; color: ${T.ink}; box-sizing: border-box; }
  .req-row:hover { border-color: ${E.skyLine}; background: #FBFDFF; }
  .req-row:focus-visible { outline: 3px solid rgba(10,132,214,0.35); outline-offset: 2px; }
  .req-info { grid-column: 1; grid-row: 1; min-width: 0; display: block; }
  .req-name { display: block; font-size: 16px; line-height: 1.3; overflow-wrap: break-word; }
  .req-meta { display: flex; flex-wrap: wrap; gap: 2px 8px; margin-top: 3px; color: ${E.quiet}; font-size: 13px; line-height: 1.4; }
  .req-meta-part + .req-meta-part::before { content: "·"; margin-right: 8px; }
  .req-chevron { grid-column: 2; grid-row: 1; color: ${E.faint}; flex: 0 0 auto; }
  .req-foot { grid-column: 1 / -1; grid-row: 2; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding-top: 10px; border-top: 1px solid #EEF3F8; }
  .req-clock { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 700; white-space: nowrap; }
  @media (min-width: 640px) {
    .req-row { grid-template-columns: minmax(0, 1fr) auto auto; gap: 14px; }
    .req-foot { grid-column: 2; grid-row: 1; border-top: 0; padding-top: 0; justify-content: flex-end; flex-wrap: nowrap; }
    .req-chevron { grid-column: 3; }
  }
`;

type Loaded =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "off" }
  | { kind: "ready"; invitations: Invitation[]; receivedAt: number };

export function ClientRequestsPage() {
  const [loaded, setLoaded] = useState<Loaded>(USE_REAL_BACKEND ? { kind: "loading" } : { kind: "off" });
  const alive = useRef(true);
  const now = useNow(1000);

  const load = useCallback(() => {
    if (!USE_REAL_BACKEND) return;
    setLoaded(current => (current.kind === "ready" ? current : { kind: "loading" }));
    realEnotaryInvitationsService.list().then(
      list => { if (alive.current) setLoaded(list === null ? { kind: "off" } : { kind: "ready", invitations: list, receivedAt: Date.now() }); },
      () => { if (alive.current) setLoaded({ kind: "error" }); },
    );
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    return () => { alive.current = false; };
  }, [load]);

  const anyOpen = loaded.kind === "ready" && loaded.invitations.some(item => invitationIsOpen(item.status));
  useEffect(() => {
    if (!anyOpen) return;
    const timer = setInterval(() => { if (!document.hidden) load(); }, 15_000);
    return () => { clearInterval(timer); };
  }, [anyOpen, load]);

  if (loaded.kind === "loading") return <EnotaryLoading />;
  if (loaded.kind === "error") return <EnotaryLoadError onRetry={load} />;
  if (loaded.kind === "off") return <EnotaryNotOffered />;

  const { invitations, receivedAt } = loaded;
  return (
    <EnotaryFrame wide eyebrow="Your requests" badge="Client" tone="client" description="The notaries you have asked, and where each request stands.">
      <style>{ROW_STYLES}</style>
      {invitations.length === 0 ? (
        <div data-testid="requests-empty">
          <p style={bodyText}>You have not asked a notary yet. Find a notary in the Notary Directory and choose Request this notary.</p>
          <a href={ENOTARY_DIRECTORY_PATH} style={linkButton()}><Search size={16} aria-hidden /> Go to the Notary Directory</a>
        </div>
      ) : (
        <ul data-testid="requests-list" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {invitations.map(item => {
            const clock = new ExpiryClock();
            clock.sync(item.secondsLeft, receivedAt);
            const msLeft = clock.msLeft(now);
            const open = invitationIsOpen(item.status);
            const tone = expiryTone(msLeft);
            return (
              <li key={item.id}>
                <Link to={`/app/enotary/requests/${encodeURIComponent(item.id)}`} className="req-row" data-testid="request-row">
                  <span className="req-info">
                    <strong className="req-name">Atty. {item.notary.name}</strong>
                    {[item.notary.firm, item.notary.city].some(part => part !== "") && (
                      <small className="req-meta">
                        {[item.notary.firm, item.notary.city].filter(part => part !== "").map((part, i) => (
                          <span key={i} className="req-meta-part">{part}</span>
                        ))}
                      </small>
                    )}
                  </span>
                  <span className="req-foot">
                    <StatusPill status={item.status} />
                    {open && (
                      <small
                        data-testid="row-countdown" data-tone={tone} className="req-clock"
                        style={{ color: tone === "red" ? "#B0182B" : tone === "amber" ? "#8A5A00" : E.skyDeep }}
                      >
                        <Clock size={13} aria-hidden /> {tone === "ended" ? "Expired" : `${countdownText(msLeft)} left`}
                      </small>
                    )}
                  </span>
                  <ChevronRight size={18} aria-hidden className="req-chevron" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <OnrampNote />
    </EnotaryFrame>
  );
}

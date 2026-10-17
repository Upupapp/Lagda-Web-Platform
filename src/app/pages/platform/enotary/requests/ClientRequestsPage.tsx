// /app/enotary/requests — the client's requests to notaries, newest first, each
// with where it stands and (while open) how long it has left.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ChevronRight, Search } from "lucide-react";
import { GF, T, TAP } from "../../../../components/system/design-system";
import { USE_REAL_BACKEND } from "../../../../services/backend-flag";
import {
  invitationIsOpen, realEnotaryInvitationsService, type Invitation,
} from "../../../../services/real/enotary-invitations.service";
import { ENOTARY_DIRECTORY_PATH } from "../../../../config/enotary-directory";
import { E, EnotaryFrame } from "../EnotaryChrome";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import { OnrampNote, StatusPill, bodyText, linkButton, useNow } from "../onramp-ui";
import { ExpiryClock, countdownText, expiryTone } from "./expiry";

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
                <Link
                  to={`/app/enotary/requests/${encodeURIComponent(item.id)}`}
                  style={{
                    ...GF, display: "flex", alignItems: "center", gap: 12, minHeight: TAP + 16, padding: "12px 14px", borderRadius: 12,
                    border: `1px solid ${E.line}`, background: "#FFFFFF", textDecoration: "none", color: T.ink, boxSizing: "border-box",
                  }}
                >
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <strong style={{ display: "block", fontSize: 15, overflowWrap: "anywhere" }}>Atty. {item.notary.name}</strong>
                    <small style={{ display: "block", color: E.quiet, fontSize: 13 }}>
                      {[item.notary.firm, item.notary.city].filter(part => part !== "").join(" · ")}
                    </small>
                    {open && (
                      <small
                        data-testid="row-countdown" data-tone={tone}
                        style={{ display: "block", marginTop: 4, fontSize: 13, fontWeight: 700, color: tone === "red" ? "#B0182B" : tone === "amber" ? "#8A5A00" : E.skyDeep }}
                      >
                        {tone === "ended" ? "Expired" : `${countdownText(msLeft)} left`}
                      </small>
                    )}
                  </span>
                  <StatusPill status={item.status} />
                  <ChevronRight size={18} aria-hidden style={{ color: E.faint, flex: "0 0 auto" }} />
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

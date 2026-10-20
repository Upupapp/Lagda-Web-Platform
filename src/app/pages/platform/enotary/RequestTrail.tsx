// The audit trail of one request, as the server keeps it: every step from both sides, the same for the client and
// the notary, with the request number and the PDF. Read again when `refreshKey` changes and every 15 seconds, so a
// step the other person takes appears without a refresh. An older server that has no trail leaves the page with the
// entries it can work out itself (`fallback`).

import { useCallback, useEffect, useState } from "react";
import { realEnotarySessionsService, type AuditTrail } from "../../../services/real/enotary-sessions.service";
import { AuditTrailPanel, type TrailEntry } from "./CaseFrame";
import { stampLabel } from "./requests/expiry";

const REFRESH_MS = 15_000;

/** The request number and trail of an invitation; null until the server answers. */
export function useRequestTrail(invitationId: string | null, refreshKey?: unknown): AuditTrail | null {
  const [trail, setTrail] = useState<AuditTrail | null>(null);
  useEffect(() => {
    if (invitationId === null) return;
    let alive = true;
    const read = () => { realEnotarySessionsService.auditTrail(invitationId).then(next => { if (alive) setTrail(next); }, () => undefined); };
    read();
    const timer = setInterval(read, REFRESH_MS);
    return () => { alive = false; clearInterval(timer); };
  }, [invitationId, refreshKey]);
  return trail;
}

export function RequestTrail({ invitationId, tone, fallback = [], refreshKey, trail }: {
  invitationId: string; tone: "client" | "attorney"; fallback?: readonly TrailEntry[]; refreshKey?: unknown; trail?: AuditTrail | null;
}) {
  const own = useRequestTrail(trail === undefined ? invitationId : null, refreshKey);
  const found = trail === undefined ? own : trail;
  const [downloading, setDownloading] = useState(false);
  const entries: readonly TrailEntry[] = found !== null
    ? found.entries.map(entry => ({ at: entry.at, text: entry.text, by: entry.by, actor: entry.actor }))
    : fallback;

  const download = useCallback(() => {
    setDownloading(true);
    realEnotarySessionsService.auditPdf(invitationId).then(blob => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${found?.reference ?? "eNotary"}-audit-trail.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => { URL.revokeObjectURL(url); }, 1000);
    }).catch(() => undefined).finally(() => { setDownloading(false); });
  }, [invitationId, found?.reference]);

  return (
    <AuditTrailPanel
      entries={entries.map(entry => (found !== null ? { ...entry, sort: entry.at, at: stampLabel(entry.at) } : entry))}
      reference={found?.reference ?? null} tone={tone}
      onDownload={found !== null ? download : undefined} downloading={downloading}
    />
  );
}

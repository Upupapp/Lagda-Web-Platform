// /app/admin/notary-applications — the LAGDA reviewers' list of notary applications.
//
// For reviewers only: the server answers 404 to everyone else and this page then
// says "not available". It lists applications by status, oldest submission first
// among those waiting, and opens one for review.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { GF, T, TAP } from "../../../../components/system/design-system";
import { USE_REAL_BACKEND } from "../../../../services/backend-flag";
import { realNotaryApplicationsService, type AdminApplicationRow } from "../../../../services/real/notary-applications.service";
import type { NotaryApplicationStatus } from "../../../../services/real/enotary-invitations.service";
import { E, EnotaryFrame } from "../EnotaryChrome";
import { EnotaryLoadError, EnotaryNotOffered } from "../EnotaryStates";
import { OnrampNote, bodyText } from "../onramp-ui";
import { stampLabel } from "../requests/expiry";

export const STATUS_TABS: readonly { readonly id: string; readonly label: string }[] = [
  { id: "submitted", label: "To review" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Not approved" },
  { id: "", label: "All" },
];

export const APPLICATION_STATUS_WORDS: Record<NotaryApplicationStatus, string> = {
  none: "No application", draft: "Draft", submitted: "To review", approved: "Approved", rejected: "Not approved",
  withdrawn: "Withdrawn", expired: "Commission ended",
};

type Loaded =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "off" }
  | { kind: "ready"; rows: AdminApplicationRow[] };

export function AdminNotaryApplicationsPage() {
  const [tab, setTab] = useState("submitted");
  const [loaded, setLoaded] = useState<Loaded>(USE_REAL_BACKEND ? { kind: "loading" } : { kind: "off" });
  const alive = useRef(true);

  const load = useCallback((status: string) => {
    if (!USE_REAL_BACKEND) return;
    setLoaded({ kind: "loading" });
    realNotaryApplicationsService.adminList(status).then(
      rows => { if (alive.current) setLoaded(rows === null ? { kind: "off" } : { kind: "ready", rows }); },
      () => { if (alive.current) setLoaded({ kind: "error" }); },
    );
  }, []);

  useEffect(() => {
    alive.current = true;
    load(tab);
    return () => { alive.current = false; };
  }, [load, tab]);

  if (loaded.kind === "off") return <EnotaryNotOffered />;
  if (loaded.kind === "error") return <EnotaryLoadError onRetry={() => { load(tab); }} />;

  return (
    <EnotaryFrame wide tone="attorney" badge="Reviewer" eyebrow="LAGDA review" description="Notary applications waiting for a decision.">
      <div role="tablist" aria-label="Application status" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {STATUS_TABS.map(item => (
          <button
            key={item.id} role="tab" type="button" aria-selected={tab === item.id} onClick={() => { setTab(item.id); }}
            style={{
              ...GF, minHeight: TAP, padding: "0 16px", borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${tab === item.id ? E.maroon : T.borderStrong}`, background: tab === item.id ? E.maroonWash : "#FFFFFF", color: tab === item.id ? E.maroon : T.ink,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {loaded.kind === "loading" ? (
        <p role="status" style={{ ...bodyText, color: E.quiet }}>Loading…</p>
      ) : loaded.rows.length === 0 ? (
        <p data-testid="admin-empty" style={bodyText}>Nothing here.</p>
      ) : (
        <ul data-testid="admin-list" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {loaded.rows.map(row => (
            <li key={row.userId}>
              <Link
                to={`/app/admin/notary-applications/${encodeURIComponent(row.userId)}`}
                style={{ ...GF, display: "flex", alignItems: "center", gap: 12, minHeight: TAP + 16, padding: "12px 14px", borderRadius: 12, border: `1px solid ${E.line}`, background: "#FFFFFF", textDecoration: "none", color: T.ink, boxSizing: "border-box" }}
              >
                <span style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ display: "block", fontSize: 15, overflowWrap: "anywhere" }}>{row.legalName ?? "Name not on record yet"}</strong>
                  <small style={{ display: "block", color: E.quiet, fontSize: 13 }}>
                    {[row.office, row.city].filter(part => part !== "").join(" · ")}
                    {row.submittedAt !== null && <> · Sent {stampLabel(row.submittedAt)}</>}
                  </small>
                </span>
                <span data-testid="admin-status" style={{ fontSize: 12.5, fontWeight: 700, color: row.status === "submitted" ? E.maroon : E.quiet, whiteSpace: "nowrap" }}>
                  {APPLICATION_STATUS_WORDS[row.status]}
                </span>
                <ChevronRight size={18} aria-hidden style={{ color: E.faint, flex: "0 0 auto" }} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <OnrampNote />
    </EnotaryFrame>
  );
}

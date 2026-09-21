// Workspace administration → every document sent for signing.
//
// ── Why this exists separately from /app/documents ────────────────────────
//
// Documents is a working surface: it is where a sender goes to act on their
// own material. This is an oversight surface — every request in the
// workspace, who sent it, and how far it has got — and the two answer
// different questions from the same data.
//
// The distinction that matters is the initiator column. On the working
// surface "who sent this" is almost always "me"; in administration it is the
// whole point, and the list endpoint carries it now precisely so this view
// could exist without a second round trip per row.
//
// ── What it deliberately does NOT show in the table ───────────────────────
//
// Recipient names and addresses. The list endpoint withholds them by design:
// "a list is read by anyone with document.view, and a participant list is not
// theirs to see in aggregate". Opening one request's signer panel is a
// deliberate act against one document; a column would broadcast every
// counterparty the workspace deals with to anyone who can load the page.

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { Users, RefreshCw } from "lucide-react";
import { usePlatform } from "../../../context/PlatformContext";
import {
  realSigningRequestService, type SigningRequestListItem,
} from "../../../services/real/signing-request.service";
import { SignatureRecordDialog } from "../../../components/documents/SignatureRecordDialog";

const GF: CSSProperties = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const SLATE = "#64748B";
const SILVER = "#8A9BAE";
const AZURE = "#0078D4";

/** Requests that have actually left the building. */
const SENT_STATES = new Set([
  "sent", "partially-completed", "completion-ready", "completed",
  "declined", "expired", "cancelled",
]);

const STATE_LABEL: Record<string, string> = {
  "sent": "Awaiting signatures",
  "partially-completed": "Partially signed",
  "completion-ready": "Finalising",
  "completed": "Completed",
  "declined": "Declined",
  "expired": "Expired",
  "cancelled": "Cancelled",
};

const STATE_TONE: Record<string, { fg: string; bg: string }> = {
  "completed": { fg: "#1E7F4F", bg: "#EAF7EF" },
  "declined": { fg: "#C0392B", bg: "#FEF2F2" },
  "cancelled": { fg: "#C0392B", bg: "#FEF2F2" },
  "expired": { fg: "#9A6B00", bg: "#FFF8E6" },
};

function fmtDate(iso: string | null): string {
  if (iso === null) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function SignedDocumentsPage() {
  const platform = usePlatform();
  const workspaceId = platform.currentWorkspace?.id ?? null;

  const [items, setItems] = useState<SigningRequestListItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [signaturesFor, setSignaturesFor] = useState<SigningRequestListItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (workspaceId === null) return;
    let cancelled = false;
    setStatus("loading");
    void realSigningRequestService.list(workspaceId, { perPage: 100 })
      .then(result => { if (!cancelled) { setItems(result.items); setStatus("ready"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [workspaceId, refreshKey]);

  // Drafts are excluded: nothing has been sent, so there is no signing to
  // oversee. They remain on /app/documents, where they can still be finished.
  const sent = useMemo(
    () => items.filter(item => SENT_STATES.has(item.state)),
    [items],
  );

  const cell: CSSProperties = { padding: "10px 10px", fontSize: 13, color: NAVY, ...GF };
  const head: CSSProperties = {
    ...cell, fontSize: 11, fontWeight: 700, color: SILVER,
    textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "0 0 48px" }}>
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: "20px 24px" }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 10 }}>
          <ol style={{ display: "flex", gap: 6, listStyle: "none", margin: 0, padding: 0, ...GF, fontSize: 12, color: SILVER }}>
            <li><Link to="/app/workspace" style={{ color: AZURE, textDecoration: "none" }}>Workspace</Link></li>
            <li aria-hidden>›</li>
            <li style={{ color: SLATE }}>Signed Documents</li>
          </ol>
        </nav>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>
            Signed Documents
          </h1>
          <button
            onClick={() => { setRefreshKey(k => k + 1); }}
            style={{
              ...GF, display: "inline-flex", alignItems: "center", gap: 6,
              minHeight: 36, padding: "0 14px", borderRadius: 8,
              border: "1px solid #D1D9E0", background: "#FFFFFF", color: NAVY,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            <RefreshCw size={14} aria-hidden /> Refresh
          </button>
        </div>
        <p style={{ ...GF, margin: "6px 0 0", fontSize: 12.5, color: SLATE, maxWidth: "70ch", lineHeight: 1.6 }}>
          Every document this workspace has sent for signing, and who sent it.
          Open a row&rsquo;s signers to see who has signed and when.
        </p>
      </header>

      <div style={{ maxWidth: 1000, margin: "24px auto 0", padding: "0 24px" }}>
        {status === "loading" && (
          <p style={{ ...GF, fontSize: 13, color: SILVER }}>Loading…</p>
        )}
        {status === "error" && (
          <p role="alert" style={{ ...GF, fontSize: 13, color: "#C0392B" }}>
            These could not be loaded. Try Refresh.
          </p>
        )}
        {status === "ready" && sent.length === 0 && (
          <p style={{ ...GF, fontSize: 13, color: SILVER, lineHeight: 1.6 }}>
            Nothing has been sent for signing yet. Documents appear here once a
            signing request leaves the workspace.
          </p>
        )}

        {status === "ready" && sent.length > 0 && (
          <div style={{
            background: "#FFFFFF", border: "1px solid #E3E8EF", borderRadius: 12,
            overflowX: "auto",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E3E8EF" }}>
                  <th scope="col" style={head}>Document</th>
                  <th scope="col" style={head}>Sent by</th>
                  <th scope="col" style={head}>Status</th>
                  <th scope="col" style={head}>Signed</th>
                  <th scope="col" style={head}>Sent</th>
                  <th scope="col" style={head}>Completed</th>
                  <th scope="col" style={head}><span className="sr-only">Signers</span></th>
                </tr>
              </thead>
              <tbody>
                {sent.map(item => {
                  const tone = STATE_TONE[item.state];
                  return (
                    <tr key={item.signingRequestId} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ ...cell, fontWeight: 600, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.documentTitle}
                      </td>
                      <td style={cell}>
                        {item.initiator === null ? (
                          // Says the account is gone rather than printing a
                          // blank cell that reads as missing data.
                          <span style={{ color: SILVER, fontStyle: "italic" }}>Account removed</span>
                        ) : (
                          <>
                            <div>{item.initiator.name}</div>
                            <div style={{ fontSize: 11.5, color: SILVER }}>{item.initiator.email}</div>
                          </>
                        )}
                      </td>
                      <td style={cell}>
                        <span style={{
                          ...GF, display: "inline-block", padding: "3px 10px", borderRadius: 999,
                          fontSize: 11, fontWeight: 700,
                          color: tone?.fg ?? SLATE, background: tone?.bg ?? "#F1F5F9",
                        }}>
                          {STATE_LABEL[item.state] ?? item.state}
                        </span>
                      </td>
                      <td style={cell}>
                        {item.completedParticipantCount}/{item.participantCount}
                      </td>
                      <td style={{ ...cell, color: SLATE, whiteSpace: "nowrap" }}>{fmtDate(item.sentAt)}</td>
                      <td style={{ ...cell, color: SLATE, whiteSpace: "nowrap" }}>{fmtDate(item.completedAt)}</td>
                      <td style={{ ...cell, textAlign: "right" }}>
                        <button
                          onClick={() => { setSignaturesFor(item); }}
                          aria-label={`Signers of ${item.documentTitle}`}
                          title="Who signed"
                          style={{
                            ...GF, display: "inline-flex", alignItems: "center", gap: 6,
                            minHeight: 32, padding: "0 12px", borderRadius: 8,
                            border: "1px solid #D1D9E0", background: "#FFFFFF",
                            color: AZURE, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          <Users size={14} aria-hidden /> Signers
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {signaturesFor && workspaceId !== null && (
        <SignatureRecordDialog
          workspaceId={workspaceId}
          signingRequestId={signaturesFor.signingRequestId}
          documentTitle={signaturesFor.documentTitle}
          onClose={() => { setSignaturesFor(null); }}
        />
      )}
    </div>
  );
}

// What a person a document was shared with can open: the signed PDF (inline,
// with Download), its participants, and its audit trail. The PDF comes from
// GET /me/shared-documents/:id/document; participants and events from
// GET /me/shared-documents/:id/details (the 083 details shape).
//
// DocumentRecordDialog is the same dialog over any source of those two things;
// "Signed by me" and "Others" open a participant's own completed documents
// with it (participant-document.ts).

import { useEffect, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { ModalFrame, modalButtonStyle } from "../contact-requests/ModalFrame";
import {
  documentSharingService, sharingErrorMessage, formatSharingDateTime,
  type SharedDocument, type SharedDocumentDetails,
} from "../../services/real/document-sharing.service";
import { GF, NAVY, SLATE, BORDER, SharingNotice, StatusChip, type ChipTone } from "./SharingPrimitives";

export type SharedDocumentView = "document" | "participants" | "audit";

const TITLES: Record<SharedDocumentView, string> = {
  document: "Signed document",
  participants: "Participants",
  audit: "Audit trail",
};

const PARTICIPANT_STATUS: Record<SharedDocumentDetails["participants"][number]["status"], { label: string; tone: ChipTone }> = {
  signed: { label: "Signed", tone: "success" },
  approved: { label: "Approved", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  skipped: { label: "Skipped", tone: "neutral" },
  viewed: { label: "Viewed", tone: "info" },
  "no-action": { label: "No action", tone: "neutral" },
};

function humanize(value: string): string {
  const spaced = value.replace(/[_-]+/g, " ").trim().toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function fileNameFor(title: string): string {
  const base = title.replace(/[\\/:*?"<>|]+/g, " ").trim() || "signed-document";
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

export interface DocumentRecordSource {
  /** Changes when the record does; reloads the dialog's content. */
  readonly key: string;
  readonly documentTitle: string;
  readonly loadFile: () => Promise<Blob>;
  readonly loadDetails: () => Promise<SharedDocumentDetails>;
}

export function DocumentRecordDialog({ source, view, onClose }: {
  source: DocumentRecordSource; view: SharedDocumentView; onClose: () => void;
}) {
  return (
    <ModalFrame title={TITLES[view]} subtitle={source.documentTitle} onClose={onClose} width={view === "document" ? 920 : 620}
      footer={<button type="button" onClick={onClose} style={modalButtonStyle("secondary")}>Done</button>}>
      {view === "document" ? <DocumentBody item={source} /> : <DetailsBody item={source} view={view} />}
    </ModalFrame>
  );
}

export function SharedDocumentDialog({ item, view, onClose }: {
  item: SharedDocument; view: SharedDocumentView; onClose: () => void;
}) {
  const source: DocumentRecordSource = {
    key: item.id,
    documentTitle: item.documentTitle,
    loadFile: () => documentSharingService.sharedDocumentFile(item.id),
    loadDetails: () => documentSharingService.sharedDetails(item.id),
  };
  return <DocumentRecordDialog source={source} view={view} onClose={onClose} />;
}

function DocumentBody({ item }: { item: DocumentRecordSource }) {
  const [state, setState] = useState<{ s: "loading" } | { s: "ready"; url: string } | { s: "error"; text: string }>({ s: "loading" });

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    item.loadFile()
      .then(blob => {
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setState({ s: "ready", url: created });
      })
      .catch((err: unknown) => { if (!cancelled) setState({ s: "error", text: sharingErrorMessage(err, "open") }); });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
    // Keyed on the record, not the loader's identity, which changes each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.key]);

  function download() {
    if (state.s !== "ready") return;
    const anchor = document.createElement("a");
    anchor.href = state.url;
    anchor.download = fileNameFor(item.documentTitle);
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={download} disabled={state.s !== "ready"} style={modalButtonStyle("primary", state.s !== "ready")}>
          <Download size={15} aria-hidden /> Download signed document
        </button>
        {state.s === "ready" && (
          <a href={state.url} target="_blank" rel="noopener noreferrer" style={{ ...modalButtonStyle("secondary"), textDecoration: "none" }}>
            <ExternalLink size={15} aria-hidden /> Open in new tab
          </a>
        )}
      </div>
      {state.s === "loading" && <p role="status" style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>Loading the signed document…</p>}
      {state.s === "error" && <div role="alert"><SharingNotice tone="error">{state.text}</SharingNotice></div>}
      {state.s === "ready" && (
        <iframe src={state.url} title={`Signed document: ${item.documentTitle}`}
          style={{ width: "100%", height: "min(68vh, 760px)", minHeight: 320, border: `1px solid ${BORDER}`, borderRadius: 8, background: "#F1F5F9", display: "block", boxSizing: "border-box" }} />
      )}
    </div>
  );
}

function DetailsBody({ item, view }: { item: DocumentRecordSource; view: "participants" | "audit" }) {
  const [state, setState] = useState<{ s: "loading" } | { s: "ready"; details: SharedDocumentDetails } | { s: "error"; text: string }>({ s: "loading" });

  useEffect(() => {
    let cancelled = false;
    item.loadDetails()
      .then(details => { if (!cancelled) setState({ s: "ready", details }); })
      .catch((err: unknown) => { if (!cancelled) setState({ s: "error", text: sharingErrorMessage(err, "open") }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.key]);

  if (state.s === "loading") return <p role="status" style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>Loading…</p>;
  if (state.s === "error") return <div role="alert"><SharingNotice tone="error">{state.text}</SharingNotice></div>;
  const { details } = state;

  if (view === "participants") {
    const participants = [...details.participants].sort((a, b) => a.routingOrder - b.routingOrder);
    if (participants.length === 0) return <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>No participants are recorded.</p>;
    return (
      <ol aria-label="Participants in routing order" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {participants.map((p, i) => {
          const status = PARTICIPANT_STATUS[p.status] ?? { label: humanize(p.status), tone: "neutral" as const };
          return (
            <li key={`${p.routingOrder}-${p.maskedEmail}-${i}`} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px", minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, overflowWrap: "anywhere", minWidth: 0 }}>{p.name}</span>
                <StatusChip tone={status.tone}>{status.label}</StatusChip>
              </div>
              <div style={{ ...GF, fontSize: 12.5, color: SLATE, marginTop: 4, overflowWrap: "anywhere" }}>
                {p.maskedEmail} · {humanize(p.recipientType)} · Order {p.routingOrder}{p.actedAt !== null ? ` · ${formatSharingDateTime(p.actedAt)}` : ""}
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
      <dl style={{ margin: 0, display: "grid", gap: 6 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px" }}>
          <dt style={{ ...GF, fontSize: 13, color: SLATE }}>Completed</dt>
          <dd style={{ ...GF, fontSize: 13, color: NAVY, margin: 0 }}>{formatSharingDateTime(details.completedAt)}</dd>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px" }}>
          <dt style={{ ...GF, fontSize: 13, color: SLATE }}>Sealed fingerprint (SHA-256)</dt>
          <dd style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: NAVY, margin: 0, overflowWrap: "anywhere", minWidth: 0 }}>{details.sealedDigest}</dd>
        </div>
      </dl>
      {details.events.length === 0 ? (
        <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>No audit events are recorded.</p>
      ) : (
        <ol aria-label="Audit events" style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {details.events.map((ev, i) => (
            <li key={`${ev.type}-${i}`} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "2px 16px", padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ ...GF, fontSize: 13, color: NAVY, minWidth: 0, overflowWrap: "anywhere" }}>{ev.label}</span>
              <span style={{ ...GF, fontSize: 12.5, color: SLATE }}>{formatSharingDateTime(ev.at)}</span>
            </li>
          ))}
        </ol>
      )}
      <p style={{ ...GF, fontSize: 12, color: SLATE, margin: 0, lineHeight: 1.6 }}>
        These details are LAGDA’s record of the transaction. Electronic signing through LAGDA is not notarization, and this record is not a determination of the document’s legal validity.
      </p>
    </div>
  );
}

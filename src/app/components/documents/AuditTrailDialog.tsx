// The audit trail for one signing request: what happened, when, and by whom.
//
// Reads GET /workspaces/:id/signing-requests/:id/audit — the backend's
// tamper-evident event timeline. It has been reachable over HTTP for some
// time and nothing in the interface used it, which is a strange thing to
// leave on the shelf in an e-signature product: the trail IS the product's
// evidentiary claim, shown rather than described.
//
// Presented the way SignatureRecordDialog presents signatories, and for the
// same reason: this is a record, not a status widget. Timestamps are absolute
// with a zone, actors are named as the backend names them, and the
// authentication and consent details ride along verbatim. Nothing here is
// summarised into a friendlier sentence, because the friendlier sentence is
// exactly what somebody disputing a signature would ask us to justify.

import { useState, useEffect, type CSSProperties } from "react";
import { X, User, Mail, Cog, ShieldCheck, FileCheck, IdCard, FlaskConical, MessageSquare, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import {
  realSigningRequestService,
  type AuditTrail, type AuditEntry, type AuditActorType,
} from "../../services/real/signing-request.service";
import { Z } from "../../utils/z-index";
import { orderAuditEntries } from "./audit-order";
import { identityIdTypeLabel, identityNameDifferencesLabel } from "../../models/identity-check";

const GF: CSSProperties = { fontFamily: "'Geist', sans-serif" };
const GM: CSSProperties = { fontFamily: "'Geist Mono', monospace" };

const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SLATE6 = "#64748B";
const SLATE4 = "#94A3B8";
const SLATE2 = "#E2E8F0";

/** Absolute, with the timezone shown — an evidentiary timestamp is useless
 *  as "2 days ago", and ambiguous without an offset. */
function fmtAbsolute(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short",
  });
}

const ACTOR: Record<AuditActorType, { icon: typeof User; label: string }> = {
  "workspace-user": { icon: User, label: "Sender" },
  "recipient":      { icon: Mail, label: "Recipient" },
  "system":         { icon: Cog,  label: "LAGDA" },
};

/**
 * How the ID and face were taken. Where the identity verification partner did
 * it, it is named as that and never by brand; an attempt that was not passed
 * is not called verified.
 */
function captureLabel(
  capture: "camera" | "upload" | "provider" | "provider-face", outcome: "passed" | "failed",
): string {
  // A face check alone, against an earlier verification: no ID was shown, so
  // it is not called a verification of one.
  if (capture === "provider-face") {
    return outcome === "passed" ? "Confirmed by a face check" : "Face check only, no ID shown";
  }
  if (capture === "provider") {
    return outcome === "passed" ? "Verified by our identity partner" : "Checked by our identity partner";
  }
  return capture === "camera" ? "Captured by camera" : "Uploaded selfie";
}

/** A name or a reason the server recorded, or null: absent, empty, or not text. */
function recorded(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/**
 * The facts recorded with a decision about a name, one to a line. Names and
 * reasons are the sender's and the ID's own words and can be long: they wrap.
 */
function DetailLines({ testId, icon: Icon, lines }: { testId: string; icon: LucideIcon; lines: readonly string[] }) {
  if (lines.length === 0) return null;
  return (
    <div data-testid={testId} style={{ display: "flex", alignItems: "flex-start", gap: 5, fontSize: 12, color: SLATE6, marginTop: 4, ...GF }}>
      <Icon size={12} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
        {lines.map(line => <div key={line}>{line}</div>)}
      </div>
    </div>
  );
}

/** "Name on ID: …" and "On this document: …", each only where it was recorded. */
function nameLines(verifiedName: unknown, documentName: unknown): string[] {
  const onId = recorded(verifiedName), onDocument = recorded(documentName);
  return [
    ...(onId === null ? [] : [`Name on ID: ${onId}`]),
    ...(onDocument === null ? [] : [`On this document: ${onDocument}`]),
  ];
}

function EntryRow({ entry }: { entry: AuditEntry }) {
  const actor = ACTOR[entry.actor.type];
  const ActorIcon = actor.icon;

  return (
    <li style={{ padding: "12px 0", borderBottom: "1px solid #F1F5F9", listStyle: "none" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <ActorIcon size={16} aria-hidden style={{ color: SLATE4, flexShrink: 0, marginTop: 2 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, color: NAVY, ...GF, lineHeight: 1.45 }}>
            {entry.description}
          </div>

          <div style={{ fontSize: 12, color: SLATE6, marginTop: 3, ...GF, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span>
              <span style={{ color: SLATE4 }}>{actor.label}</span>
              {" · "}
              <span style={{ fontWeight: 600, color: NAVY }}>{entry.actor.displayName}</span>
            </span>
          </div>

          {/* Verbatim. These are the facts a dispute would turn on. */}
          {entry.details.kind === "authentication" && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: SLATE6, marginTop: 4, ...GF }}>
              <ShieldCheck size={12} aria-hidden />
              Authenticated by {entry.details.method.replace(/-/g, " ")}
            </div>
          )}
          {entry.details.kind === "consent" && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: SLATE6, marginTop: 4, ...GF }}>
              <FileCheck size={12} aria-hidden />
              {/* A version may already carry its "v" ("v0-…"); never print "vv". */}
              Consent: {entry.details.consentType.replace(/-/g, " ")} {/^v/i.test(entry.details.consentVersion) ? "" : "v"}{entry.details.consentVersion}
            </div>
          )}

          {/* 105. The server's sentence above already says whether the attempt
              was simulated. What is added here is only what was presented and
              how; in test mode nothing is added that reads as a verification. */}
          {entry.details.kind === "identity-check" && (
            <div data-testid="audit-identity-check" style={{ display: "flex", alignItems: "center", gap: "2px 10px", flexWrap: "wrap", fontSize: 12, color: SLATE6, marginTop: 4, ...GF }}>
              {entry.details.idType !== null && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <IdCard size={12} aria-hidden />
                  ID: {identityIdTypeLabel(entry.details.idType)}
                </span>
              )}
              {entry.details.capture !== null && (
                <span>{captureLabel(entry.details.capture, entry.details.outcome)}</span>
              )}
              {entry.details.mode === "test" && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#92400E", fontWeight: 600 }}>
                  <FlaskConical size={12} aria-hidden />
                  Test mode: simulated
                </span>
              )}
              {/* What a sender quotes to support. Its own line, and selected
                  whole by one click so it is copied without a stray space. */}
              {typeof entry.details.providerReference === "string" && entry.details.providerReference.trim() !== "" && (
                <span data-testid="audit-identity-reference" style={{ flexBasis: "100%", minWidth: 0, fontSize: 11.5, color: SLATE4, overflowWrap: "anywhere" }}>
                  Reference:{" "}
                  <span style={{ ...GM, userSelect: "all" }}>{entry.details.providerReference}</span>
                </span>
              )}
              {/* The name the partner read from the ID, where one was recorded,
                  and what differed where it was close to the document's. Where
                  it could not be read there is none, and the server's sentence
                  above already says so. */}
              {recorded(entry.details.verifiedName) !== null && (
                <span data-testid="audit-identity-name" style={{ flexBasis: "100%", minWidth: 0, overflowWrap: "anywhere" }}>
                  Name on ID: {recorded(entry.details.verifiedName)}
                </span>
              )}
              {recorded(entry.details.verifiedName) !== null && entry.details.nameMatch === "close" && (
                <span data-testid="audit-identity-name-close" style={{ flexBasis: "100%", minWidth: 0, overflowWrap: "anywhere" }}>
                  {identityNameDifferencesLabel(entry.details.nameDifferences) === ""
                    ? "Close match"
                    : `Close match: ${identityNameDifferencesLabel(entry.details.nameDifferences)}`}
                </span>
              )}
              {/* A pass made after the sender accepted that name as the same person. */}
              {recorded(entry.details.verifiedName) !== null && entry.details.nameMatch === "accepted" && (
                <span data-testid="audit-identity-name-accepted-note" style={{ flexBasis: "100%", minWidth: 0 }}>
                  Accepted by the sender
                </span>
              )}
            </div>
          )}
          {entry.details.kind === "identity-name-mismatch" && (
            <DetailLines testId="audit-identity-name-mismatch" icon={IdCard}
              lines={nameLines(entry.details.verifiedName, entry.details.documentName)} />
          )}
          {entry.details.kind === "identity-name-accepted" && (
            <DetailLines testId="audit-identity-name-accepted" icon={IdCard}
              lines={[
                ...nameLines(entry.details.verifiedName, entry.details.documentName),
                ...(recorded(entry.details.reason) === null ? [] : [`Reason: ${recorded(entry.details.reason) ?? ""}`]),
              ]} />
          )}
          {entry.details.kind === "identity-check-waived" && entry.details.reason !== null && entry.details.reason.trim() !== "" && (
            <div data-testid="audit-identity-waiver" style={{ display: "flex", alignItems: "flex-start", gap: 5, fontSize: 12, color: SLATE6, marginTop: 4, overflowWrap: "anywhere", ...GF }}>
              <MessageSquare size={12} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
              <span>Reason: {entry.details.reason}</span>
            </div>
          )}

          <time
            dateTime={entry.occurredAt}
            style={{ display: "block", fontSize: 11, color: SLATE4, marginTop: 5, ...GM }}
          >
            {fmtAbsolute(entry.occurredAt)}
          </time>
        </div>
      </div>
    </li>
  );
}

export interface AuditTrailDialogProps {
  workspaceId: string;
  signingRequestId: string;
  documentTitle: string;
  onClose: () => void;
}

export function AuditTrailDialog({
  workspaceId, signingRequestId, documentTitle, onClose,
}: AuditTrailDialogProps) {
  const [data, setData] = useState<AuditTrail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    void realSigningRequestService.audit(workspaceId, signingRequestId)
      .then(result => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [workspaceId, signingRequestId]);

  return (
    <div
      role="dialog" aria-modal="true" aria-label={`Audit trail for ${documentTitle}`}
      style={{
        position: "fixed", inset: 0, zIndex: Z.modal, display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "rgba(7,17,31,0.55)", padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: 12, width: "min(600px, 100%)",
        maxHeight: "min(85vh, 760px)", display: "flex", flexDirection: "column",
        boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
      }}>
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          gap: 12, padding: "16px 18px", borderBottom: `1px solid ${SLATE2}`,
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: 0, ...GF }}>
              Audit trail
            </h2>
            <p
              title={documentTitle}
              style={{
                fontSize: 12, color: SLATE6, margin: "3px 0 0", ...GF,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {documentTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: SLATE4, padding: 2, flexShrink: 0,
            }}
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "4px 18px 18px" }}>
          {failed && (
            <p style={{ fontSize: 13, color: SLATE6, padding: "24px 0", ...GF }}>
              This document&apos;s audit trail could not be loaded.
            </p>
          )}

          {!failed && data === null && (
            <p style={{ fontSize: 13, color: SLATE4, padding: "24px 0", ...GF }}>
              Loading…
            </p>
          )}

          {data !== null && data.entries.length === 0 && (
            <p style={{ fontSize: 13, color: SLATE6, padding: "24px 0", ...GF }}>
              Nothing has been recorded for this document yet.
            </p>
          )}

          {data !== null && data.entries.length > 0 && (
            <>
              <p style={{ fontSize: 12, color: SLATE6, margin: "14px 0 2px", ...GF }}>
                <strong style={{ color: NAVY }}>{data.entries.length}</strong>
                {" "}{data.entries.length === 1 ? "event" : "events"}, recorded by LAGDA as they happened.
                Times are shown in your timezone.
              </p>
              <ol style={{ margin: "8px 0 0", padding: 0 }}>
                {orderAuditEntries(data.entries).map(entry => <EntryRow key={entry.id} entry={entry} />)}
              </ol>
              <p style={{ fontSize: 11, color: SLATE4, margin: "14px 0 0", ...GF }}>
                This record is read-only. The same trail backs the document&rsquo;s public
                verification page —{" "}
                <Link to="/app/verify" onClick={onClose} style={{ color: AZURE, textDecoration: "underline" }}>Verify a Document</Link>{" "}
                in the sidebar.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

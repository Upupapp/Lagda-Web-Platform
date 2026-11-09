// The document to be notarized, attached to a request before its session begins (131): the client attaches,
// replaces or removes the PDF; the notary reads it before they accept and before the call. Once the session begins it
// is the session's document, so this panel is not shown then.

import { useEffect, useRef, useState } from "react";
import { FileText, Paperclip, XCircle } from "lucide-react";
import { ActionButton, GF, Notice } from "../../../components/system/design-system";
import {
  realEnotaryInvitationsService, type RequestDocument,
} from "../../../services/real/enotary-invitations.service";
import { withProcess } from "../../../config/process-screens";
import { E } from "./EnotaryChrome";
import { Panel, PanelTitle, bodyText, linkButton } from "./onramp-ui";
import { stampLabel } from "./requests/expiry";

const MAX_BYTES = 20 * 1024 * 1024;

function sizeLabel(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${String(Math.max(1, Math.round(bytes / 1024)))} KB`;
}

/** The server's reason, in words a person can act on. */
function problemOf(error: unknown): string {
  const status = (error as { status?: number }).status;
  const message = (error as { message?: string }).message;
  if (status === 413) return "The file is larger than 20 MB.";
  if (status === 422 && typeof message === "string" && message !== "") return message;
  if (status === 409) return typeof message === "string" && message !== "" ? message : "This request can no longer take a document.";
  if (status === 0) return "Could not reach LAGDA. Check your connection and try again.";
  return "The document could not be saved. Please try again.";
}

export function RequestDocumentPanel({ invitationId, document, role, editable, failedBefore = false, onChanged, autoOpen = false }: {
  invitationId: string;
  document: RequestDocument | null;
  role: "client" | "notary";
  /** The client may still attach, replace or remove it (the request is open or accepted, and no session has begun). */
  editable: boolean;
  /** The directory sent the request but could not attach its document: say so once. */
  failedBefore?: boolean;
  onChanged?: (document: RequestDocument | null) => void;
  /** Open the document at once (the desk's "Read the document" leads here), and bring it into view. */
  autoOpen?: boolean;
}) {
  const [busy, setBusy] = useState<"attach" | "remove" | "open" | null>(null);
  const [problem, setProblem] = useState<string | null>(failedBefore ? "Your request was sent, but the document could not be attached. Please attach it again." : null);
  const [preview, setPreview] = useState<string | null>(null);
  const input = useRef<HTMLInputElement | null>(null);

  // A new document, or none: the preview of the old one goes.
  useEffect(() => () => { if (preview !== null) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => { setPreview(null); }, [document?.addedAt]);

  const attach = (file: File | undefined) => {
    if (file === undefined) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") { setProblem("Only a PDF can be notarized here."); return; }
    if (file.size === 0) { setProblem("The file is empty."); return; }
    if (file.size > MAX_BYTES) { setProblem("The file is larger than 20 MB."); return; }
    setBusy("attach"); setProblem(null);
    withProcess("enotary-request-document-add", "", () => realEnotaryInvitationsService.attachDocument(invitationId, file), problemOf).then(
      saved => { setBusy(null); onChanged?.(saved); },
      (error: unknown) => { setBusy(null); setProblem(problemOf(error)); },
    );
  };

  const remove = () => {
    setBusy("remove"); setProblem(null);
    withProcess("enotary-request-document-remove", "", () => realEnotaryInvitationsService.removeDocument(invitationId), problemOf).then(
      () => { setBusy(null); onChanged?.(null); },
      (error: unknown) => { setBusy(null); setProblem(problemOf(error)); },
    );
  };

  const open = () => {
    setBusy("open"); setProblem(null);
    realEnotaryInvitationsService.document(invitationId).then(
      blob => { setBusy(null); setPreview(URL.createObjectURL(blob)); },
      () => { setBusy(null); setProblem("The document could not be opened. Please try again."); },
    );
  };

  // "Read the document" from the desk: opened once, as soon as there is a document to open.
  const opened = useRef(false);
  const panel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!autoOpen || opened.current || document === null) return;
    opened.current = true;
    open();
    panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the document is known
  }, [autoOpen, document]);

  const lead = role === "notary"
    ? document === null
      ? "The client has not attached the document yet. They can still attach it before the call, or bring it to the session."
      : "The client attached the document to be notarized. Read it before you accept and before the call."
    : document === null
      ? "Upload the document you want notarized, so the notary can read it before accepting and before the call. You may also bring it to the session."
      : "The notary can read this document before they accept and before the call. It becomes the session's document when the session begins.";

  return (
    <div ref={panel} style={{ scrollMarginTop: 90 }}>
    <Panel testId="request-document">
      <PanelTitle>The document to be notarized</PanelTitle>
      <p style={{ ...bodyText }}>{lead}</p>
      {document !== null && (
        <div data-testid="request-document-file" style={{ ...GF, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 12px", padding: "10px 12px", border: `1px solid ${E.line}`, borderRadius: 10, background: E.wash, marginBottom: 12 }}>
          <FileText size={18} aria-hidden style={{ color: E.maroon, flex: "0 0 auto" }} />
          <span style={{ flex: "1 1 220px", minWidth: 0, overflowWrap: "anywhere", fontSize: 14.5, color: E.ink }}>
            <strong>{document.name}</strong>
            <span style={{ display: "block", fontSize: 13, color: E.quiet }}>PDF · {sizeLabel(document.size)} · attached {stampLabel(document.addedAt)}</span>
          </span>
          <ActionButton kind="secondary" disabled={busy !== null} onClick={preview === null ? open : () => { setPreview(null); }}>
            {busy === "open" ? "Opening…" : preview === null ? "Open the document" : "Close the document"}
          </ActionButton>
        </div>
      )}
      {preview !== null && (
        <div style={{ marginBottom: 12 }}>
          <iframe title={`The document: ${document?.name ?? ""}`} src={preview} data-testid="request-document-preview" style={{ width: "100%", height: 520, border: `1px solid ${E.line}`, borderRadius: 10, background: "#FFFFFF" }} />
          <p style={{ ...GF, margin: "8px 0 0", fontSize: 13.5 }}>
            <a href={preview} target="_blank" rel="noopener noreferrer" style={{ color: E.skyDeep, fontWeight: 700 }}>Open in a new tab</a>
          </p>
        </div>
      )}
      {problem !== null && <Notice icon={XCircle} tone="danger">{problem}</Notice>}
      {role === "client" && editable && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <input
            ref={input} type="file" accept="application/pdf,.pdf" data-testid="request-document-input" aria-label="Upload the document to be notarized (PDF format only)"
            style={{ display: "none" }} onChange={event => { attach(event.target.files?.[0]); event.target.value = ""; }}
          />
          <button type="button" disabled={busy !== null} onClick={() => input.current?.click()} style={{ ...linkButton(document === null ? "primary" : "secondary"), cursor: busy !== null ? "default" : "pointer", opacity: busy !== null ? 0.7 : 1 }}>
            <Paperclip size={16} aria-hidden /> {busy === "attach" ? "Uploading…" : document === null ? "Choose a PDF file" : "Replace with another PDF"}
          </button>
          {document !== null && (
            <button type="button" disabled={busy !== null} onClick={remove} style={{ ...linkButton("secondary"), cursor: busy !== null ? "default" : "pointer" }}>
              {busy === "remove" ? "Removing…" : "Remove"}
            </button>
          )}
          <span style={{ ...GF, alignSelf: "center", fontSize: 13, color: E.quiet }}>Accepted format: PDF only (.pdf), up to 20 MB. Save scanned papers and photos as a PDF first.</span>
        </div>
      )}
    </Panel>
    </div>
  );
}

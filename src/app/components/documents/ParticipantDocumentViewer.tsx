// "View & Download" for a participant's own completed document — the same
// full-screen showcase Completed's "View" opens (DocumentArchiveViewer), with
// the same "Signed PDF" download button in its header. A participant has no
// workspace-cookie download link (their access is a short-lived grant, not a
// session on that workspace), so the header action fetches the same signed
// bytes the viewer itself draws and saves them, rather than linking to a URL.

import { useState } from "react";
import { Download } from "lucide-react";
import { DocumentArchiveViewer } from "./DocumentArchiveViewer";
import type { DocumentRecordSource } from "../document-sharing/SharedDocumentDialog";
import { fileNameFor } from "../document-sharing/SharedDocumentDialog";

function DownloadSignedPdf({ source }: { source: DocumentRecordSource }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await source.loadFile();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileNameFor(source.documentTitle);
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      // The viewer itself is already showing (or will show) this same
      // failure; a second, competing error surface here would only confuse.
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => { void download(); }}
      disabled={busy}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 6, flexShrink: 0,
        background: "rgba(201,161,90,0.16)",
        border: "1px solid rgba(201,161,90,0.45)",
        color: "#E8DCC4", fontSize: 12, fontWeight: 600,
        cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1,
        whiteSpace: "nowrap", fontFamily: "'Geist', sans-serif",
      }}
    >
      <Download size={14} aria-hidden />
      {busy ? "Preparing…" : "Signed PDF"}
    </button>
  );
}

export function ParticipantDocumentViewer({
  source, onClose,
}: {
  source: DocumentRecordSource;
  onClose: () => void;
}) {
  return (
    <DocumentArchiveViewer
      title={source.documentTitle}
      loadBlob={source.loadFile}
      onClose={onClose}
      headerAction={<DownloadSignedPdf source={source} />}
    />
  );
}

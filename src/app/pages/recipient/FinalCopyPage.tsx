// /copy/:token — a participant's copy of the finished, signed document (073).
//
// Opened from the completion email. Exchanges the link for the sealed PDF and
// starts the download, with a button to download again. The link is removed
// from the address bar as soon as it has been read, like the signing link.

import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { CheckCircle2, Download, Loader2, XCircle, AlertTriangle } from "lucide-react";
import {
  SignerCard, PhaseBanner, ActionButton, ActionRow,
} from "../../components/recipient/signer-ui";
import { downloadFinalCopy } from "../../services/real/final-copy.service";

type Phase = "loading" | "ready" | "invalid" | "error";

function save(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoked later, not now: some browsers read the URL after `click` returns.
  window.setTimeout(() => { URL.revokeObjectURL(url); }, 60_000);
}

export function FinalCopyPage() {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<Phase>("loading");
  const file = useRef<{ blob: Blob; filename: string } | null>(null);
  const credential = useRef<string | null>(token ?? null);

  const fetchCopy = async () => {
    const raw = credential.current;
    if (raw === null || raw === "") { setPhase("invalid"); return; }
    setPhase("loading");
    const result = await downloadFinalCopy(raw);
    if (result.kind === "ok") {
      file.current = { blob: result.blob, filename: result.filename };
      save(result.blob, result.filename);
      setPhase("ready");
      return;
    }
    setPhase(result.kind);
  };

  useEffect(() => {
    // Out of the address bar (and so out of history and any screenshot) once
    // read; the credential is kept in memory for a retry.
    if (token) window.history.replaceState(null, "", "/copy");
    void fetchCopy();
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "loading") {
    return (
      <SignerCard>
        <PhaseBanner icon={Loader2} tone="neutral" title="Preparing your signed document"
          description="Checking your download link…" />
      </SignerCard>
    );
  }

  if (phase === "ready") {
    return (
      <SignerCard>
        <PhaseBanner icon={CheckCircle2} tone="success" badge="Complete"
          title="Your signed document is downloading"
          description="This is the final, sealed copy that everyone completed. If the download didn't start, use the button below." />
        <ActionRow>
          <ActionButton icon={Download} full onClick={() => {
            if (file.current !== null) save(file.current.blob, file.current.filename);
          }}>
            Download again
          </ActionButton>
        </ActionRow>
      </SignerCard>
    );
  }

  if (phase === "invalid") {
    return (
      <SignerCard>
        <PhaseBanner icon={XCircle} tone="danger" title="This download link can't be used"
          description="It may have expired (links last 30 days) or been replaced. Contact the sender for a copy of the signed document." />
      </SignerCard>
    );
  }

  return (
    <SignerCard>
      <PhaseBanner icon={AlertTriangle} tone="warn" title="We couldn't fetch your document"
        description="Something went wrong on our side or with the connection. Please try again." />
      <ActionRow>
        <ActionButton icon={Download} full onClick={() => { void fetchCopy(); }}>
          Try again
        </ActionButton>
      </ActionRow>
    </SignerCard>
  );
}

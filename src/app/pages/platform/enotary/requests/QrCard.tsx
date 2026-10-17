// The QR card on a request's page: shown as the SVG that "Save the card" turns
// into a PNG (qr-card.ts), so what is saved is what is shown.

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { ActionButton, GF } from "../../../../components/system/design-system";
import lagdaHeaderLogo from "../../../../../brand elements/svg/LagdaLogoPrimaryHorizontalFullColor_Header.svg";
import { buildCardSvg, cardFileName, cardToPng, logoDataUri } from "./qr-card";
import { expiryLabel } from "./expiry";
import { E } from "../EnotaryChrome";

export function QrCard({ link, notaryName, expiresAt }: { link: string; notaryName: string; expiresAt: string }) {
  const [logo, setLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void logoDataUri(lagdaHeaderLogo).then(uri => { if (alive) setLogo(uri); });
    return () => { alive = false; };
  }, []);

  const label = expiryLabel(expiresAt);
  const input = { link, notaryName, expiresLabel: label === "" ? "Expires in 3 days" : `Expires ${label}` };
  // The same card, with the logo inline on screen (the page can load it as an image) and as data for the file.
  const shown = useMemo(() => buildCardSvg(input, lagdaHeaderLogo), [link, notaryName, label]); // eslint-disable-line react-hooks/exhaustive-deps
  const saved = useMemo(() => buildCardSvg(input, logo ?? undefined), [link, notaryName, label, logo]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    setSaving(true);
    setProblem(null);
    cardToPng(saved)
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = cardFileName(notaryName);
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => { URL.revokeObjectURL(url); }, 10_000);
      })
      .catch(() => { setProblem("The card could not be saved. Take a screenshot of it, or copy the link instead."); })
      .finally(() => { setSaving(false); });
  };

  return (
    <div data-testid="qr-card" style={{ ...GF }}>
      <div
        data-testid="qr-card-image"
        style={{ maxWidth: 360, margin: "0 auto", borderRadius: 18, boxShadow: "0 10px 30px -14px rgba(10,26,43,0.35)", lineHeight: 0 }}
        // The card is built by qr-card.ts from numbers and escaped text only.
        dangerouslySetInnerHTML={{ __html: shown.replace("<svg ", '<svg style="width:100%;height:auto;display:block" ') }}
      />
      <div style={{ maxWidth: 360, margin: "14px auto 0" }}>
        <ActionButton icon={Download} kind="secondary" onClick={save} disabled={saving} full>
          {saving ? "Saving…" : "Save the card"}
        </ActionButton>
        {problem !== null && <p role="alert" style={{ margin: "8px 0 0", fontSize: 13, color: "#C0392B" }}>{problem}</p>}
        <p style={{ margin: "10px 0 0", fontSize: 12.5, color: E.quiet, lineHeight: 1.5 }}>
          The notary scans this code with their phone to open the request. Only the named notary can take the request, and only after
          proving who they are, but share the card with that notary alone.
        </p>
      </div>
    </div>
  );
}

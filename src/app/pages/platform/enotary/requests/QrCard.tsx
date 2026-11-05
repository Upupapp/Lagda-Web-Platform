// The QR card on a request's page: shown as the picture that "Save the card"
// turns into a PNG (qr-card.ts), so what is saved is what is shown.

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { ActionButton, GF } from "../../../../components/system/design-system";
import lagdaHeaderLogo from "../../../../assets/brand/LagdaLogoPrimaryHorizontalFullColor.png";
import {
  buildCardSvg, cardAddressee, cardFileName, cardHeading, cardStatement, cardToPng, logoDataUri, philippineDate,
  philippineDateTime, type QrCardInput,
} from "./qr-card";
import { E } from "../EnotaryChrome";

export interface QrCardProps {
  readonly link: string;
  /** The notary as the Notary Directory lists them. */
  readonly notaryName: string;
  /** A lawyer's listing names one notary; an office's names no person. Absent: a lawyer's. */
  readonly listing?: "lawyer" | "office";
  /** For an office's listing, the office's name. */
  readonly office?: string;
  /** The request's number, or a short form of its id. */
  readonly reference: string;
  /** When the request was made, and when its link stops working (ISO). */
  readonly issuedAt: string;
  readonly expiresAt: string;
}

export function QrCard({ link, notaryName, listing, office, reference, issuedAt, expiresAt }: QrCardProps) {
  const [logo, setLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void logoDataUri(lagdaHeaderLogo).then(uri => { if (alive) setLogo(uri); });
    return () => { alive = false; };
  }, []);

  const validUntil = philippineDateTime(expiresAt);
  const input: QrCardInput = {
    link, notaryName, reference,
    ...(listing === undefined ? {} : { listing }),
    ...(office === undefined ? {} : { office }),
    issuedLabel: philippineDate(issuedAt),
    validUntilLabel: validUntil === "" ? null : validUntil,
  };
  // One card, with the logo once it has loaded: shown as a picture and saved as the same picture.
  const card = useMemo(() => buildCardSvg(input, logo ?? undefined), [link, notaryName, listing, office, reference, input.issuedLabel, validUntil, logo]); // eslint-disable-line react-hooks/exhaustive-deps
  const source = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(card)}`, [card]);

  const save = () => {
    setSaving(true);
    setProblem(null);
    cardToPng(card)
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
      <img
        data-testid="qr-card-image" src={source} alt={`${cardHeading(input)}. ${cardStatement(input)}`}
        style={{ display: "block", width: "100%", maxWidth: 400, height: "auto", margin: "0 auto", borderRadius: 18, boxShadow: "0 10px 30px -14px rgba(10,26,43,0.35)" }}
      />
      <div style={{ maxWidth: 400, margin: "14px auto 0" }}>
        <ActionButton icon={Download} kind="secondary" onClick={save} disabled={saving} full>
          {saving ? "Saving…" : "Save the card"}
        </ActionButton>
        {problem !== null && <p role="alert" style={{ margin: "8px 0 0", fontSize: 13, color: "#C0392B" }}>{problem}</p>}
        <p data-testid="qr-card-note" style={{ margin: "10px 0 0", fontSize: 12.5, color: E.quiet, lineHeight: 1.5 }}>
          The notary scans this code with their phone to open the request. It is reserved for {cardAddressee(input)}: LAGDA checks
          {listing === "office" ? " that the person opening it is a notary of that office" : " the notary's identity"} before the request
          opens, and refuses anyone else. Share the card with that notary alone.
        </p>
      </div>
    </div>
  );
}

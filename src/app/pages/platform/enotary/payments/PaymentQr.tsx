// A payment QR, drawn from its text: the picture a client scans with their bank
// or e-wallet app, or saves and opens in that app's "upload a QR" option.

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { ActionButton, GF } from "../../../../components/system/design-system";
import { E } from "../EnotaryChrome";
import { qrDataUrl, qrFileName } from "./payment-qr";

export function PaymentQr({ payload, payeeName, size = 280 }: { payload: string; payeeName: string; size?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setUrl(null);
    setFailed(false);
    qrDataUrl(payload).then(
      next => { if (alive) setUrl(next); },
      () => { if (alive) setFailed(true); },
    );
    return () => { alive = false; };
  }, [payload]);

  const save = () => {
    if (url === null) return;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = qrFileName(payeeName);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  return (
    <div data-testid="payment-qr" style={{ ...GF, textAlign: "center" }}>
      {url !== null ? (
        <img
          data-testid="payment-qr-image" src={url} alt={`Payment QR code of ${payeeName}`} width={size} height={size}
          style={{ display: "block", margin: "0 auto", maxWidth: "100%", height: "auto", background: "#FFFFFF", border: `1px solid ${E.line}`, borderRadius: 12 }}
        />
      ) : (
        <div role="status" style={{ width: size, maxWidth: "100%", aspectRatio: "1 / 1", margin: "0 auto", display: "grid", placeItems: "center", color: E.quiet, fontSize: 14, border: `1px dashed ${E.line}`, borderRadius: 12 }}>
          {failed ? "The QR could not be drawn." : "Drawing the QR…"}
        </div>
      )}
      <div style={{ maxWidth: size, margin: "12px auto 0" }}>
        <ActionButton icon={Download} kind="secondary" full onClick={save} disabled={url === null}>Save the QR</ActionButton>
      </div>
    </div>
  );
}

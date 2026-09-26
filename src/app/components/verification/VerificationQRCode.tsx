// A QR code encoding a verification URL — nothing more. Scanning it lands on
// exactly the same public verify page a person could reach by typing the URL
// or the Verification ID printed next to it; it is a convenience for a
// physical or shared copy of a completed document, not a separate identity
// or capability. Generated client-side (`qrcode`'s canvas renderer, dropped
// into an <img> as a data URL) so no verification URL is ever sent to a
// third-party QR-rendering service.

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function VerificationQRCode({ url, size = 128, alt }: { url: string; size?: number; alt?: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: size, margin: 1, color: { dark: "#07111F", light: "#FFFFFF" } })
      .then(uri => { if (!cancelled) setDataUrl(uri); })
      .catch(() => { if (!cancelled) setDataUrl(null); });
    return () => { cancelled = true; };
  }, [url, size]);

  if (dataUrl === null) {
    return (
      <div style={{ width: size, height: size, background: "#F1F5F9", borderRadius: 8 }} aria-hidden />
    );
  }

  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt={alt ?? `QR code linking to the verification page for ${url}`}
      style={{ borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }}
    />
  );
}

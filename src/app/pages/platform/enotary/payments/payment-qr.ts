// Reading a payment QR out of a picture, and drawing one from its text.
//
// A notary uploads the picture their bank or e-wallet app gave them. The page
// reads the text out of it (jsQR) and sends THAT text to the server, which checks
// it is a standing QR Ph code and reads the payee from it. The picture itself is
// never sent or stored; a client's page draws the code afresh from the text, so
// what the client scans is exactly what the server checked.

import jsQR from "jsqr";
import QRCode from "qrcode";

/** A picture larger than this is scaled down before it is read: phones take 12-megapixel photos. */
const MAX_SIDE = 1600;
/** What a notary may upload as a picture. */
export const QR_PICTURE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const QR_PICTURE_MAX_BYTES = 10 * 1024 * 1024;

export type QrPictureProblem = "type" | "size" | "unreadable" | "no_code";

export class QrPictureError extends Error {
  constructor(readonly problem: QrPictureProblem) {
    super(problem);
  }
}

export function qrPictureProblemText(problem: QrPictureProblem): string {
  switch (problem) {
    case "type": return "Upload a PNG, JPG or WebP picture of your payment QR.";
    case "size": return "That picture is larger than 10 MB. Upload a smaller one.";
    case "unreadable": return "That picture could not be opened. Try another one.";
    case "no_code": return "No QR code was found in that picture. Upload a sharp picture that shows the whole QR, or a screenshot of it.";
  }
}

function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file).catch(() => { throw new QrPictureError("unreadable"); });
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new QrPictureError("unreadable")); };
    image.src = url;
  });
}

/** The text of the QR in a picture. Throws a `QrPictureError` that says why not. */
export async function decodeQrPicture(file: File): Promise<string> {
  if (!(QR_PICTURE_TYPES as readonly string[]).includes(file.type)) throw new QrPictureError("type");
  if (file.size > QR_PICTURE_MAX_BYTES) throw new QrPictureError("size");
  const image = await loadImage(file);
  const width = "naturalWidth" in image ? image.naturalWidth : image.width;
  const height = "naturalHeight" in image ? image.naturalHeight : image.height;
  if (width === 0 || height === 0) throw new QrPictureError("unreadable");
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) throw new QrPictureError("unreadable");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  if ("close" in image) image.close();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const found = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: "attemptBoth" });
  if (found === null || found.data === "") throw new QrPictureError("no_code");
  return found.data;
}

/** A PNG data address of the code, drawn from its text; no logo, so every scanner reads it. */
export function qrDataUrl(payload: string, width = 560): Promise<string> {
  return QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 4, width, color: { dark: "#000000", light: "#FFFFFF" } });
}

/** `lagda-payment-qr-ATTY-AMADOR-SIMANDO.png` */
export function qrFileName(payeeName: string): string {
  const slug = payeeName.trim().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `lagda-payment-qr-${slug === "" ? "payee" : slug}.png`;
}

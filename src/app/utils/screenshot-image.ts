// The screenshot of a transfer, as the server keeps it with a payment proof: a PNG or JPEG of at most 2 MB.
// A phone screenshot is usually well under that; a larger one, or a WebP, is redrawn as a JPEG and made smaller until it fits.

export const SCREENSHOT_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const SCREENSHOT_MAX_BYTES = 2_000_000;
export const SCREENSHOT_MAX_SOURCE_BYTES = 15 * 1024 * 1024;

/** Why a picked file cannot be used, or null when it can. */
export function screenshotProblem(file: File): string | null {
  if (!SCREENSHOT_TYPES.includes(file.type)) return "Choose a PNG, JPEG or WebP picture of your receipt.";
  if (file.size === 0) return "The file is empty.";
  if (file.size > SCREENSHOT_MAX_SOURCE_BYTES) return "The picture is larger than 15 MB. Choose a smaller one.";
  return null;
}

const readBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => { resolve((typeof reader.result === "string" ? reader.result : "").replace(/^data:[^,]*,/, "")); };
  reader.onerror = () => { reject(new Error("The picture could not be read.")); };
  reader.readAsDataURL(blob);
});

const bytesOf = (base64: string): number => Math.floor((base64.length * 3) / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);

export async function prepareScreenshot(file: File): Promise<{ mediaType: "image/png" | "image/jpeg"; base64: string }> {
  if ((file.type === "image/png" || file.type === "image/jpeg") && file.size <= SCREENSHOT_MAX_BYTES) {
    return { mediaType: file.type, base64: await readBase64(file) };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => { resolve(el); };
      el.onerror = () => { reject(new Error("That picture could not be read. Try a PNG or JPEG.")); };
      el.src = url;
    });
    let scale = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
    for (let attempt = 0; attempt < 6; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (ctx === null) throw new Error("That picture could not be prepared. Try a smaller PNG or JPEG.");
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      if (bytesOf(base64) <= SCREENSHOT_MAX_BYTES) return { mediaType: "image/jpeg", base64 };
      scale *= 0.75;
    }
    throw new Error("That picture is too large to send. Crop it to the receipt and try again.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** An e-wallet account name as the wallet shows it to a payer: "AMADOR SIMANDO" reads "AM****R S.". */
export function maskAccountName(name: string): string {
  const words = name.replace(/^\s*atty\.?\s+/i, "").trim().split(/\s+/).filter(word => word !== "");
  if (words.length === 0) return "";
  const first = words[0] ?? "";
  const shown = first.length <= 2 ? first : `${first.slice(0, 2)}${"*".repeat(Math.max(2, first.length - 3))}${first.slice(-1)}`;
  const last = words.length > 1 ? ` ${(words[words.length - 1] ?? "").charAt(0)}.` : "";
  return `${shown}${last}`.toUpperCase();
}

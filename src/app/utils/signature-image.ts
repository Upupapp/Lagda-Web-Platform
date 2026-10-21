// Turning a picked picture into what the server keeps as a notary's signature: a PNG or JPEG of at most 300 KB.
//
// A phone photo or a scan is far larger than that, and may be a WebP. A small PNG or JPEG goes as it is; anything else is
// drawn onto a canvas, shrunk to fit a signature's size (keeping any clear background), and saved as a PNG, made smaller
// until it fits.

export const SIGNATURE_TYPES = ["image/png", "image/jpeg", "image/webp"];
/** What the server accepts. */
export const SIGNATURE_MAX_BYTES = 300_000;
/** The biggest picture that is read at all; it is shrunk before it is sent. */
export const SIGNATURE_MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const FIT_WIDTH = 700;
const FIT_HEIGHT = 280;

/** Why a picked file cannot be used, or null when it can. */
export function signatureFileProblem(file: File): string | null {
  if (!SIGNATURE_TYPES.includes(file.type)) return "Choose a PNG, JPEG or WebP picture.";
  if (file.size === 0) return "The file is empty.";
  if (file.size > SIGNATURE_MAX_SOURCE_BYTES) return "The picture is larger than 8 MB. Choose a smaller one.";
  return null;
}

const readBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => { resolve((typeof reader.result === "string" ? reader.result : "").replace(/^data:[^,]*,/, "")); };
  reader.onerror = () => { reject(new Error("The file could not be read.")); };
  reader.readAsDataURL(blob);
});

const bytesOf = (base64: string): number => Math.floor((base64.length * 3) / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);

export async function prepareSignature(file: File): Promise<{ mediaType: "image/png" | "image/jpeg"; base64: string }> {
  if ((file.type === "image/png" || file.type === "image/jpeg") && file.size <= SIGNATURE_MAX_BYTES) {
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
    let scale = Math.min(1, FIT_WIDTH / img.naturalWidth, FIT_HEIGHT / img.naturalHeight);
    for (let attempt = 0; attempt < 6; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (ctx === null) throw new Error("That picture could not be prepared. Try a smaller PNG or JPEG.");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      if (bytesOf(base64) <= SIGNATURE_MAX_BYTES) return { mediaType: "image/png", base64 };
      scale *= 0.7;
    }
    throw new Error("That picture is too detailed to keep. Use a plain picture of your signature on white.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

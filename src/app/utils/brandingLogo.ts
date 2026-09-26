// Turns the logo a person picks (PNG or JPEG) into the PNG the backend stores
// (082): scaled to fit LOGO_MAX_WIDTH x LOGO_MAX_HEIGHT without cropping or
// upscaling, transparent background kept, and shrunk further until it is
// under the server's 512 KB bound. The server checks the PNG from its bytes,
// so this is the only format ever sent.

export const LOGO_SOURCE_TYPES = ["image/png", "image/jpeg"];
export const LOGO_MAX_SOURCE_BYTES = 5 * 1024 * 1024;
export const LOGO_MAX_WIDTH = 800;
export const LOGO_MAX_HEIGHT = 400;
/** A little under the server's 512 KB, since base64 is decoded server-side. */
export const LOGO_MAX_PNG_BYTES = 500 * 1024;

export class LogoConversionError extends Error {}

/** The largest size that fits the box, never enlarging a small logo. */
export function fitLogo(width: number, height: number, maxWidth = LOGO_MAX_WIDTH, maxHeight = LOGO_MAX_HEIGHT): { width: number; height: number } {
  if (width <= 0 || height <= 0) throw new LogoConversionError("This image has no size.");
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function base64Bytes(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export async function toLogoPng(file: File): Promise<{ base64: string; preview: string; width: number; height: number }> {
  if (!LOGO_SOURCE_TYPES.includes(file.type)) throw new LogoConversionError("Choose a PNG or JPEG image.");
  if (file.size > LOGO_MAX_SOURCE_BYTES) throw new LogoConversionError("Choose an image under 5 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => { resolve(el); };
      el.onerror = () => { reject(new LogoConversionError("This image could not be read.")); };
      el.src = url;
    });
    let size = fitLogo(img.naturalWidth, img.naturalHeight);
    for (let attempt = 0; attempt < 6; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext("2d");
      if (ctx === null) throw new LogoConversionError("Your browser could not prepare the image.");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, size.width, size.height);
      const dataUrl = canvas.toDataURL("image/png");
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      if (base64Bytes(base64) <= LOGO_MAX_PNG_BYTES) {
        return { base64, preview: dataUrl, width: size.width, height: size.height };
      }
      size = { width: Math.max(1, Math.round(size.width * 0.8)), height: Math.max(1, Math.round(size.height * 0.8)) };
    }
    throw new LogoConversionError("This image is too detailed to use as a logo. Try a simpler one.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

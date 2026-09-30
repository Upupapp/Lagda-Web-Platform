// Turning a picked photo into what the server stores as a profile photo (072):
// a centred square, scaled to AVATAR_SIZE, as a PNG — the only format the
// server accepts, because a PNG's shape can be checked from its header without
// an image library. Shared by My Settings › Profile and the Home header.

export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
export const MAX_AVATAR_SOURCE_BYTES = 5 * 1024 * 1024;
/** What is stored: a square this size, whatever was picked. Small enough to
 *  load instantly in the header, large enough to stay sharp at 2x. */
export const AVATAR_SIZE = 256;

/** Why a picked file cannot be used, or null when it can. */
export function avatarFileProblem(file: File): string | null {
  if (!AVATAR_TYPES.includes(file.type)) return "Use a PNG, JPEG or WebP image.";
  if (file.size > MAX_AVATAR_SOURCE_BYTES) return "That image is larger than 5 MB.";
  return null;
}

/** The base64 payload (no `data:` prefix) and a preview URL. */
export async function toAvatarPng(file: File): Promise<{ base64: string; preview: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => { resolve(el); };
      el.onerror = () => { reject(new Error("unreadable")); };
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d");
    if (ctx === null) throw new Error("no canvas");
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side,
      0, 0, AVATAR_SIZE, AVATAR_SIZE,
    );
    const dataUrl = canvas.toDataURL("image/png");
    return { base64: dataUrl.slice(dataUrl.indexOf(",") + 1), preview: dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}

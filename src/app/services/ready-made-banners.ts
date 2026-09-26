// Category banners for the ready-made template gallery.
//
// Each category has a banner at `src/banners/bg-<slug>.png` (1600x500, used
// by the preview header) and an 800px WebP copy at
// `src/banners/card/bg-<slug>.webp` (used by the gallery cards).
//
// The banner slug is NOT the category id: the files drop "&" instead of
// spelling it out ("R&D & Innovation" -> "rd-innovation").

const FULL = import.meta.glob<string>("../../banners/bg-*.png", {
  eager: true, query: "?url", import: "default",
});
const CARD = import.meta.glob<string>("../../banners/card/bg-*.webp", {
  eager: true, query: "?url", import: "default",
});

export function bannerSlug(category: string): string {
  return category.toLowerCase().replace(/&/g, "").replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function bySlug(files: Record<string, string>): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  for (const [path, url] of Object.entries(files)) {
    const m = /bg-([a-z0-9-]+)\.(png|webp)$/.exec(path);
    if (m?.[1]) out.set(m[1], url);
  }
  return out;
}

/** slug -> URL. Exported for the coverage test. */
export const FULL_BANNERS = bySlug(FULL);
export const CARD_BANNERS = bySlug(CARD);

export interface CategoryBanner { readonly card: string; readonly full: string }

export function categoryBanner(category: string): CategoryBanner | undefined {
  const slug = bannerSlug(category);
  const full = FULL_BANNERS.get(slug);
  if (full === undefined) return undefined;
  return { full, card: CARD_BANNERS.get(slug) ?? full };
}

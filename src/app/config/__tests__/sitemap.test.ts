// The sitemap and the route table must agree.
//
// `public/sitemap.xml` is hand-maintained — its own header says "update this
// file when new indexable routes are published". It has in fact been kept
// accurate, which is exactly why it is worth pinning now: the failure mode is
// silent in both directions and neither shows up in a build.
//
//   - A route marked indexable but absent from the sitemap simply never gets
//     crawled. The page works, so nothing looks wrong.
//   - A path in the sitemap that is NOT indexable is worse: it invites crawlers
//     to a page the product has decided should not be indexed, which is how an
//     authenticated or pre-launch surface ends up in search results.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PUBLIC_ROUTES, AUTH_ROUTES, PLATFORM_ROUTES } from "../routes";

const ROOT = resolve(__dirname, "../../../..");
const ORIGIN = "https://lagda.io";

function sitemapPaths(): string[] {
  const xml = readFileSync(resolve(ROOT, "public/sitemap.xml"), "utf8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => {
    const loc = m[1]!;
    expect(loc.startsWith(ORIGIN), `sitemap entry is not on the canonical origin: ${loc}`).toBe(true);
    const path = loc.slice(ORIGIN.length);
    // The home entry is "https://lagda.io/"; every other entry has no trailing slash.
    return path === "" || path === "/" ? "/" : path.replace(/\/$/, "");
  });
}

describe("sitemap", () => {
  const paths = sitemapPaths();
  const indexable = PUBLIC_ROUTES.filter(r => r.isIndexable).map(r => r.path);

  it("is not empty", () => {
    // Guards the test: an unreadable or restructured sitemap would otherwise
    // make every assertion below pass against an empty set.
    expect(paths.length).toBeGreaterThan(50);
  });

  it("contains no duplicate entries", () => {
    const seen = new Set<string>();
    const dupes = paths.filter(p => (seen.has(p) ? true : (seen.add(p), false)));
    expect(dupes).toEqual([]);
  });

  it("lists every indexable public route", () => {
    const missing = indexable.filter(p => !paths.includes(p));
    expect(missing, "indexable but absent from the sitemap — these will never be crawled").toEqual([]);
  });

  it("lists nothing that is not an indexable public route", () => {
    const extra = paths.filter(p => !indexable.includes(p));
    expect(extra, "in the sitemap but not marked indexable — crawlers are being invited to it anyway").toEqual([]);
  });

  it("never lists an authenticated or auth-flow route", () => {
    // The platform is not public. This is the assertion that matters most if
    // someone ever hand-edits the file.
    const priv = new Set([...AUTH_ROUTES, ...PLATFORM_ROUTES].map(r => r.path));
    const leaked = paths.filter(p => priv.has(p) || p.startsWith("/app/"));
    expect(leaked, "authenticated surface leaked into the sitemap").toEqual([]);
  });

  it("includes the public Workflow page", () => {
    // The product's headline capability. If this drops out of the sitemap the
    // page still works, so nothing else would notice.
    expect(paths).toContain("/workflow");
  });
});

// Route metadata resolution.
//
// Most of this table is parametric, and it was matched with `r.path ===
// pathname` — so "/app/documents/:transactionId" was compared to
// "/app/documents/txn_004" and never matched. Every detail page in the product
// fell back to the generic site title. Nothing failed: the entries existed, the
// types were right, and the build passed. Only the comparison was wrong.
//
// These tests pin the behaviour that made it wrong, because it is invisible
// from every other angle.

import { describe, it, expect } from "vitest";
import {
  getRouteMeta,
  PUBLIC_ROUTES,
  AUTH_ROUTES,
  PLATFORM_ROUTES,
} from "../routes";

describe("getRouteMeta", () => {
  it("resolves an exact static path", () => {
    expect(getRouteMeta("/app/dashboard")?.title).toBe("Dashboard | LAGDA");
  });

  it("resolves a parametric path to its pattern's metadata", () => {
    const meta = getRouteMeta("/app/documents/txn_004");
    expect(meta).toBeDefined();
    expect(meta?.path).toBe("/app/documents/:transactionId");
  });

  it("resolves a nested parametric path", () => {
    expect(getRouteMeta("/app/documents/txn_004/workflow")?.path).toBe(
      "/app/documents/:transactionId/workflow",
    );
  });

  it("resolves a path with two parameters", () => {
    expect(getRouteMeta("/app/documents/txn_004/workflow/stages/stg_1")?.path).toBe(
      "/app/documents/:transactionId/workflow/stages/:stageId",
    );
  });

  it("prefers a static sibling over a parametric pattern of the same depth", () => {
    // "/app/documents/saved-views" and "/app/documents/:transactionId" both have
    // three segments. Without specificity ordering the saved-views list would be
    // titled "Overview" — whichever entry came first in the array would win.
    expect(getRouteMeta("/app/documents/saved-views")?.path).toBe("/app/documents/saved-views");
    expect(getRouteMeta("/app/documents/tags")?.path).toBe("/app/documents/tags");
  });

  it("does not match a pattern against a path of a different depth", () => {
    // "/app/documents/:transactionId" must not swallow a deeper unknown path.
    const meta = getRouteMeta("/app/documents/txn_004/not-a-real-tab/deeper");
    expect(meta).toBeUndefined();
  });

  it("returns undefined for an unknown path rather than a wrong match", () => {
    expect(getRouteMeta("/definitely/not/a/route")).toBeUndefined();
  });

  it("gives every routed metadata entry a non-empty title", () => {
    for (const route of [...PUBLIC_ROUTES, ...AUTH_ROUTES, ...PLATFORM_ROUTES]) {
      expect(route.title.trim(), `empty title for ${route.path}`).not.toBe("");
    }
  });

  it("declares no /app route as indexable", () => {
    // The platform is not public. A metadata entry is the only thing standing
    // between an authenticated route and the sitemap.
    const indexableAppRoutes = PLATFORM_ROUTES.filter(r => r.isIndexable);
    expect(indexableAppRoutes.map(r => r.path)).toEqual([]);
  });

  it("never declares a canonical path containing a parameter", () => {
    // A canonical URL advertising ":transactionId" would be published verbatim.
    for (const route of [...PUBLIC_ROUTES, ...AUTH_ROUTES, ...PLATFORM_ROUTES]) {
      expect(route.canonicalPath ?? "", `parametric canonical on ${route.path}`)
        .not.toContain(":");
    }
  });
});

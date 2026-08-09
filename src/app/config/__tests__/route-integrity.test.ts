// Route table vs route metadata — checked against the ROUTER, not a parse of it.
//
// WHY THIS EXISTS. A STITCH pass found that `RouteMeta.status` is declared on
// every one of the 225 routes and read by no code at all. A field nothing
// consumes cannot be wrong at runtime, so it drifts silently: three /app/team
// routes claimed `status: "implemented"` while the router rendered
// PlatformPlaceholder for them. That is the same class as the `routeIds` field
// recorded earlier — decorative metadata that documentation and audits then
// trust. These tests give the field a consumer.
//
// The route list is taken by walking `router.routes` — the real object the
// application runs on. An earlier attempt regex-parsed router.tsx by brace
// depth and produced impossible paths by stitching sibling routes together,
// so the parser was the defect rather than the app.

import { describe, it, expect } from "vitest";
import { router } from "../../../router";
import {
  PUBLIC_ROUTES, AUTH_ROUTES, PLATFORM_ROUTES, RECIPIENT_ROUTES,
} from "../routes";

// The metadata is split by layout family; integrity is a property of all four
// together, so a route cannot escape a check by living in the wrong list.
const ROUTE_METADATA = [
  ...PUBLIC_ROUTES, ...AUTH_ROUTES, ...PLATFORM_ROUTES, ...RECIPIENT_ROUTES,
];

interface RouteNode {
  path?: string;
  index?: boolean;
  children?: RouteNode[];
  element?: unknown;
}

/** Every path the router registers, resolved to its full form. */
function collectPaths(): string[] {
  const out: string[] = [];
  const walk = (routes: RouteNode[], prefix: string) => {
    for (const r of routes) {
      let full = prefix;
      if (r.path) {
        full = r.path.startsWith("/")
          ? r.path
          : `${prefix.replace(/\/$/, "")}/${r.path}`;
      }
      if (r.path || r.index) out.push(full.replace(/\/{2,}/g, "/") || "/");
      if (r.children) walk(r.children, full);
    }
  };
  walk(router.routes as RouteNode[], "");
  return [...new Set(out)];
}

const ROUTER_PATHS = collectPaths();
const META_PATHS = new Set(ROUTE_METADATA.map(r => r.path));

describe("route integrity", () => {
  it("registers a substantial route table", () => {
    // Guards every assertion below: if the walk broke, an empty list would make
    // the rest pass vacuously.
    expect(ROUTER_PATHS.length).toBeGreaterThan(150);
  });

  it("gives every registered route a metadata entry", () => {
    // Without metadata a route falls back to the generic document title and has
    // no breadcrumb, which is invisible until someone lands on it.
    const missing = ROUTER_PATHS.filter(
      p => !p.includes("*") && !META_PATHS.has(p),
    );
    expect(missing).toEqual([]);
  });

  it("only claims a route is implemented when the router registers it", () => {
    // Deliberately not "every metadata entry must be registered". Two entries
    // (/invitation, /app/workspaces) describe routes that do not exist yet and
    // are marked `status: "planned"` — metadata staged ahead of the route is a
    // legitimate pattern, and both are `isIndexable: false` so nothing points a
    // visitor or a crawler at them.
    //
    // What must not happen is an entry claiming to be implemented while the
    // router has no such path: that is a route the product believes it ships.
    const registered = new Set(ROUTER_PATHS);
    const lying = ROUTE_METADATA
      .filter(r => r.status === "implemented" && !registered.has(r.path))
      .map(r => r.path);
    expect(lying).toEqual([]);
  });

  it("keeps unregistered metadata non-indexable", () => {
    // A planned route may be described, but it must never be advertised: it
    // would put a 404 in the sitemap.
    const registered = new Set(ROUTER_PATHS);
    const advertised = ROUTE_METADATA
      .filter(r => !registered.has(r.path) && r.isIndexable)
      .map(r => r.path);
    expect(advertised).toEqual([]);
  });

  it("marks placeholder routes as planned, not implemented", () => {
    // The drift this suite was written for. `status` is documentation, and
    // documentation that contradicts the router is worse than none.
    const placeholderPaths = ROUTE_METADATA.filter(
      r => r.path.startsWith("/app/team"),
    );
    expect(placeholderPaths.length).toBeGreaterThan(0);

    for (const route of placeholderPaths) {
      expect(route.status, `${route.path} renders PlatformPlaceholder`).toBe("planned");
    }
  });
});

// The notary on-ramp's pages each have a title in the route table and a route in
// the router, and the landing page is public.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getRouteMeta } from "../routes";

const TOKEN = "a".repeat(43);
const ROUTER = readFileSync(resolve(__dirname, "../../../router.tsx"), "utf8");

const PAGES: [string, string, string][] = [
  ["/app/enotary/requests", "Your Notary Requests — LAGDA eNotary", "requests\""],
  ["/app/enotary/requests/eni_1", "Notary Request — LAGDA eNotary", "requests/:id\""],
  ["/app/enotary/apply", "Notary Application — LAGDA eNotary", "apply\""],
  ["/app/enotary/desk", "Notary Desk — LAGDA eNotary", "desk\""],
  ["/app/enotary/desk/eni_1", "Notary Request — LAGDA eNotary", "desk/:id\""],
  ["/app/admin/notary-applications", "Review Notaries — LAGDA", "admin/notary-applications\""],
  ["/app/admin/notary-applications/u1", "Review a Notary — LAGDA", "admin/notary-applications/:userId\""],
  [`/enotary/invite/${TOKEN}`, "A Request for You — LAGDA eNotary", "/enotary/invite/:token\""],
];

describe("the notary on-ramp's routes", () => {
  it.each(PAGES)("%s has its title and a route", (path, title, routerPath) => {
    expect(getRouteMeta(path)?.title).toBe(title);
    expect(ROUTER).toContain(`path: "${routerPath}`);
  });

  it("only the landing page is open to a signed-out visitor, and none is indexed", () => {
    for (const [path] of PAGES) {
      const meta = getRouteMeta(path);
      expect(meta?.isIndexable, path).toBe(false);
      expect(meta?.requiresAuth, path).toBe(path.startsWith("/app/"));
    }
  });

  it("opens the request, desk, application, payment QR and room pages in the eNotary shell, not the app's", () => {
    const from = ROUTER.indexOf('path: "/app/enotary",' + String.fromCharCode(10) + '    errorElement');
    expect(from).toBeGreaterThan(-1);
    const head = ROUTER.slice(from, from + 1500);
    expect(head).toContain("<EnotaryLayout />");
    for (const child of ['"requests"', '"requests/:id"', '"apply"', '"desk"', '"desk/:id"', '"payment"', '"register"', '"seal"', '"room/:invitationId"']) expect(head).toContain(`path: ${child}`);
    // And they are no longer children of the app layout.
    for (const old of ['path: "enotary/desk"', 'path: "enotary/room/:invitationId"', 'path: "enotary/requests"']) expect(ROUTER).not.toContain(old);
  });

  it("does not shadow the existing eNotary routes", () => {
    expect(getRouteMeta("/app/enotary/access")?.analyticsName).toBe("platform_enotary_access");
    expect(getRouteMeta("/enotary/faq")?.analyticsName).toBe("enotary_faq");
  });
});

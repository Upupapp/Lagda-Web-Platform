// The notary on-ramp's pages each have a title in the route table and a route in
// the router, and the landing page is public.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getRouteMeta } from "../routes";

const TOKEN = "a".repeat(43);
const ROUTER = readFileSync(resolve(__dirname, "../../../router.tsx"), "utf8");

const PAGES: [string, string, string][] = [
  ["/app/enotary/requests", "Your Notary Requests — LAGDA eNotary", "enotary/requests\""],
  ["/app/enotary/requests/eni_1", "Notary Request — LAGDA eNotary", "enotary/requests/:id\""],
  ["/app/enotary/apply", "Notary Application — LAGDA eNotary", "enotary/apply\""],
  ["/app/enotary/desk", "Notary Desk — LAGDA eNotary", "enotary/desk\""],
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

  it("does not shadow the existing eNotary routes", () => {
    expect(getRouteMeta("/app/enotary/access")?.analyticsName).toBe("platform_enotary_access");
    expect(getRouteMeta("/enotary/faq")?.analyticsName).toBe("enotary_faq");
  });
});

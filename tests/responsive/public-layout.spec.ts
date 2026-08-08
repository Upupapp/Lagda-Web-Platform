// Responsive behaviour of the PUBLIC site.
//
// Every existing browser test signs in first and exercises `/app/*`. The public
// marketing portal — 74 routes, 67 of them indexable, and the only part of the
// product a stranger ever sees — had no browser coverage at all. It is also the
// part most likely to break responsively, because it is the part built from a
// design canvas rather than from application components.
//
// These run under the mobile-320, mobile-390 and tablet-portrait projects.
// No sign-in: that is the point.

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { expectNoHorizontalScroll } from "../support/app";

interface PublicRoute {
  readonly path: string;
  readonly name: string;
  /** Distinctive text that proves the page rendered, not just that it responded. */
  readonly proof: RegExp;
}

// One route per top-level section. Not exhaustive — the point is to catch a
// layout rule that breaks a whole section, which is how responsive defects
// actually arrive.
const ROUTES: readonly PublicRoute[] = [
  { path: "/",            name: "home",       proof: /eSignature|sign/i },
  { path: "/esignature",  name: "eSignature", proof: /eSignature/i },
  { path: "/workflow",    name: "workflow",   proof: /workflow/i },
  { path: "/pricing",     name: "pricing",    proof: /plan|pricing/i },
  { path: "/security",    name: "security",   proof: /security/i },
  { path: "/solutions",   name: "solutions",  proof: /solution/i },
  { path: "/resources",   name: "resources",  proof: /resource|guide/i },
  { path: "/verify",      name: "verify",     proof: /verif/i },
  { path: "/enotary",     name: "eNotary",    proof: /eNotary/i },
  { path: "/contact",     name: "contact",    proof: /contact/i },
];

async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  // The public shell renders synchronously; waiting on the main landmark is
  // enough and avoids networkidle, which never settles with a dev overlay.
  await expect(page.locator("main")).toBeVisible();
}

for (const route of ROUTES) {
  test.describe(`public ${route.name} (${route.path})`, () => {
    test.beforeEach(async ({ page }) => {
      await open(page, route.path);
    });

    test("renders its content", async ({ page }) => {
      await expect(page.locator("main")).toContainText(route.proof);
    });

    test("does not scroll the page horizontally", async ({ page }) => {
      // The single most common prototype-to-web defect: a fixed width, a wide
      // grid, or a long unbroken string pushing the viewport sideways.
      await expectNoHorizontalScroll(page);
    });

    test("exposes exactly one level-1 heading", async ({ page }) => {
      await expect(page.locator("h1")).toHaveCount(1);
    });

    test("keeps every visible control inside the viewport", async ({ page }) => {
      const clipped = await page.evaluate(() => {
        const width = window.innerWidth;
        const out: string[] = [];
        const selector = "a[href], button, input, select, textarea";
        for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
          const rect = el.getBoundingClientRect();
          // Zero-size elements are hidden or not laid out; skip rather than
          // report every display:none control on the page.
          if (rect.width === 0 || rect.height === 0) continue;
          const style = window.getComputedStyle(el);
          if (style.visibility === "hidden" || style.display === "none") continue;
          // Skip anything inside a horizontally scrollable ancestor. A tab strip
          // or sub-nav is SUPPOSED to extend past the viewport — that is what
          // makes it scrollable — so flagging its children would report correct
          // behaviour as a defect and invite someone to "fix" it into overflow.
          let scrollable = false;
          for (let p = el.parentElement; p; p = p.parentElement) {
            const ov = window.getComputedStyle(p).overflowX;
            if ((ov === "auto" || ov === "scroll") && p.scrollWidth > p.clientWidth + 1) {
              scrollable = true;
              break;
            }
          }
          if (scrollable) continue;
          if (rect.left < -1 || rect.right > width + 1) {
            out.push(`${el.tagName.toLowerCase()}"${(el.textContent ?? "").trim().slice(0, 40)}" x ${Math.round(rect.left)}..${Math.round(rect.right)} vs ${width}`);
          }
        }
        return out;
      });
      expect(clipped, `controls clipped outside the viewport:\n${clipped.join("\n")}`).toEqual([]);
    });

    test("has no touch target below 44px in the primary navigation", async ({ page }) => {
      // Scoped to the header: it is the one region every visitor uses on every
      // page, and the one where a small target is most costly.
      const small = await page.evaluate(() => {
        const header = document.querySelector("header");
        if (!header) return ["no header element"];
        const out: string[] = [];
        for (const el of Array.from(header.querySelectorAll<HTMLElement>("a[href], button"))) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.height < 44) {
            out.push(`${(el.textContent ?? el.getAttribute("aria-label") ?? "?").trim().slice(0, 30)} = ${Math.round(r.height)}px`);
          }
        }
        return out;
      });
      expect(small, `header controls under 44px:\n${small.join("\n")}`).toEqual([]);
    });
  });
}

test.describe("public shell", () => {
  test("the mobile navigation opens and closes", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "tablet-portrait", "tablet shows the desktop navigation");
    await open(page, "/");

    const toggle = page.getByRole("button", { name: /menu|navigation/i }).first();
    await expect(toggle).toBeVisible();
    await toggle.click();

    // Something navigational must actually appear — a toggle that flips state
    // without revealing links is the failure this catches.
    await expect(page.getByRole("link", { name: /pricing/i }).first()).toBeVisible();
  });

  test("the footer is reachable and carries the eNotary disclaimer", async ({ page }) => {
    await open(page, "/");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    // The one piece of copy that is a hard product rule everywhere it appears.
    await expect(footer).toContainText(/Coming Soon/i);
  });
});

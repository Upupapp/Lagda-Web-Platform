// Regression coverage for the route error boundaries (STITCH full, 2026-08-01).
//
// Before this fix, `createBrowserRouter` had no `errorElement` anywhere and the
// repository contained no ErrorBoundary of any kind, so a thrown render error
// reached react-router's default screen — which prints the raw error message
// outside the LAGDA shell with no way back.
//
// These tests assert the four properties that mattered:
//   1. the boundary actually catches (the app does not blow up)
//   2. exactly one <h1>
//   3. the raw error message is NEVER rendered
//   4. a safe internal destination is offered

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";

import {
  PublicRouteError,
  PlatformRouteError,
  RecipientRouteError,
} from "../RouteErrorBoundary";

// A message that would be a genuine privacy incident if it ever reached the DOM:
// it carries a recipient name, an address, and an internal identifier — exactly
// the shapes LAGDA errors can pick up from a batch or a Contact.
const SECRET =
  "Failed loading batch bsb_issues for Maria Santos <maria.santos@example.test> at Northbridge Business Services";

function Boom(): never {
  throw new Error(SECRET);
}

function renderBoundary(Boundary: () => React.JSX.Element, path = "/") {
  const router = createMemoryRouter(
    [{ path, element: <Boom />, errorElement: <Boundary /> }],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

describe("route error boundaries", () => {
  beforeEach(() => {
    // react-router logs the caught error itself; silence it so the suite output
    // stays readable. The assertion below still proves nothing reaches the DOM.
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); });

  const CASES = [
    { name: "public", Boundary: PublicRouteError, path: "/", destination: "/" },
    { name: "platform", Boundary: PlatformRouteError, path: "/app/documents", destination: "/app/documents" },
    { name: "recipient", Boundary: RecipientRouteError, path: "/sign/req_1", destination: null },
  ] as const;

  for (const c of CASES) {
    describe(`${c.name} surface`, () => {
      it("catches the thrown error instead of letting it escape", () => {
        // If the boundary did not catch, render() itself would throw.
        expect(() => renderBoundary(c.Boundary, c.path)).not.toThrow();
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      it("renders exactly one h1", () => {
        renderBoundary(c.Boundary, c.path);
        expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      });

      it("never renders the raw error message, address, or internal id", () => {
        const { container } = renderBoundary(c.Boundary, c.path);
        const text = container.textContent ?? "";
        expect(text).not.toContain(SECRET);
        expect(text).not.toContain("maria.santos@example.test");
        expect(text).not.toContain("Maria Santos");
        expect(text).not.toContain("bsb_issues");
        expect(text).not.toContain("Northbridge Business Services");
        // react-router's own default wording must not appear either.
        expect(text).not.toContain("Unexpected Application Error");
        // Nothing that looks like an email address at all.
        expect(text).not.toMatch(/\S+@\S+\.\S+/);
      });

      it("offers a recovery action", () => {
        renderBoundary(c.Boundary, c.path);
        const alert = screen.getByRole("alert");
        const actions = [
          ...within(alert).queryAllByRole("link"),
          ...within(alert).queryAllByRole("button"),
        ];
        expect(actions.length).toBeGreaterThan(0);
        // Every action has an accessible name.
        for (const el of actions) {
          expect(el.textContent?.trim()).toBeTruthy();
        }
      });

      it("makes no affirmative delivery or legal claim", () => {
        renderBoundary(c.Boundary, c.path);
        const text = screen.getByRole("alert").textContent ?? "";

        // Product-forbidden claims are banned outright, in any context.
        expect(text).not.toMatch(
          /\b(legally binding|legally valid|Supreme Court|fully compliant|tamper-proof|immutable|notarized|certified|identity verified)\b/i,
        );

        // Delivery verbs are allowed ONLY when negated. "Nothing was sent" is
        // the honest language this product requires; "your document was sent"
        // would be a false claim. Check each occurrence's preceding context
        // rather than banning the substring.
        const verb = /\b(was|were|has been|have been)\s+(sent|delivered|signed|notified|completed)\b/gi;
        for (const m of text.matchAll(verb)) {
          const before = text.slice(Math.max(0, (m.index ?? 0) - 40), m.index ?? 0);
          expect(
            before,
            `"${m[0]}" appears without a negation — that reads as an affirmative claim`,
          ).toMatch(/\b(nothing|no|not|never|none)\b/i);
        }
      });
    });
  }

  it("the platform boundary keeps the user inside the authenticated surface", () => {
    renderBoundary(PlatformRouteError, "/app/documents");
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) {
      expect(l.getAttribute("href")).toMatch(/^\/app\//);
    }
  });

  it("the recipient boundary offers NO internal destination", () => {
    // A recipient has no account. Offering /app/... would imply access they do
    // not have and would dead-end them at a sign-in wall.
    renderBoundary(RecipientRouteError, "/sign/req_1");
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("the public boundary sends signed-out visitors somewhere public", () => {
    renderBoundary(PublicRouteError, "/");
    for (const l of screen.getAllByRole("link")) {
      expect(l.getAttribute("href")).not.toMatch(/^\/app\//);
    }
  });
});

describe("router wiring", () => {
  it("every top-level route root declares an errorElement", async () => {
    // Guards against a future route being added without a boundary, which is
    // exactly how the original gap appeared.
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/router.tsx", "utf8");
    const lines = src.split(/\r?\n/);

    const missing: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (!/^ {2}\{$/.test(lines[i - 1] ?? "")) continue;
      const m = /^ {4}path: "([^"]*)",$/.exec(lines[i] ?? "");
      if (!m) continue;
      // Look ahead a few lines for the errorElement on this route root.
      const window = lines.slice(i, i + 6).join("\n");
      if (!window.includes("errorElement:")) missing.push(m[1] ?? "(unknown)");
    }

    expect(missing, `route roots without an errorElement: ${missing.join(", ")}`).toEqual([]);
  });
});

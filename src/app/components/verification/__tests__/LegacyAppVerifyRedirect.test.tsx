import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { LegacyAppVerifyRedirect } from "../LegacyAppVerifyRedirect";
import { router } from "../../../../router";
import { PRIMARY_NAV, UTILITY_NAV } from "../../../config/platform.nav";

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/app/verify" element={<LegacyAppVerifyRedirect />} />
        <Route path="/app/verify/:verificationId" element={<LegacyAppVerifyRedirect />} />
        <Route path="/verify" element={<Where />} />
        <Route path="/verify/:verificationId" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("legacy /app/verify redirects", () => {
  it("sends /app/verify to the public /verify page", () => {
    renderAt("/app/verify");
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/verify$/);
  });

  it("keeps a prefilled id from the old query string", () => {
    renderAt("/app/verify?verificationId=LAGDA-VER-2026-004821");
    expect(screen.getByTestId("where")).toHaveTextContent("/verify?id=LAGDA-VER-2026-004821");
  });

  it("sends /app/verify/:id to the public /verify/:id record page", () => {
    renderAt("/app/verify/LAGDA-VER-2026-004821");
    expect(screen.getByTestId("where")).toHaveTextContent("/verify/LAGDA-VER-2026-004821");
  });

  it("is what the app router renders for both legacy paths", () => {
    const app = (router.routes as { path?: string; children?: { path?: string; element?: unknown }[] }[])
      .find(r => r.path === "/app" && r.children?.some(c => c.path === "verify"));
    expect(app).toBeDefined();
    for (const path of ["verify", "verify/:verificationId"]) {
      const child = app!.children!.find(c => c.path === path) as { element?: { type?: unknown } } | undefined;
      expect(child?.element?.type).toBe(LegacyAppVerifyRedirect);
    }
  });

  it("has no Check a Document navigation item", () => {
    const items = [...PRIMARY_NAV, ...UTILITY_NAV];
    expect(items.some(i => i.path.startsWith("/app/verify"))).toBe(false);
    expect(items.some(i => /check a document/i.test(i.label))).toBe(false);
  });
});

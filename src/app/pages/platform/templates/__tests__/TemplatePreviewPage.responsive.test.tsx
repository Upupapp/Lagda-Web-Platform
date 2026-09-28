// Template Preview on narrow screens: single column under 900px with the side
// details as collapsible cards, and pages that fit the available width.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import type { ReactNode } from "react";
import { getAllMockTemplates } from "../../../../data/mock/templates";
import { stubViewport } from "../../../../../test/viewport-stub";

const template = getAllMockTemplates().find(t => t.placeholders.length > 0 && t.routing.groups.length > 1)
  ?? getAllMockTemplates()[0]!;

vi.mock("../../../../context/TemplateContext", () => ({
  TemplateProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useTemplates: () => ({ state: { activeTemplate: template, activeLoading: false, activeError: null } }),
  useActiveTemplateLoader: () => undefined,
}));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws-1" } }),
}));
vi.mock("../../../../components/pdf/DocumentPageSurface", () => ({
  useRealDocument: () => ({ status: "idle" }),
  DocumentPageSurface: () => null,
}));
vi.mock("../../../../services/templates-source", () => ({ realTemplatesAvailable: () => false }));
vi.mock("../../../../hooks/usePageMeta", () => ({ usePageMeta: () => undefined }));

import { TemplatePreviewPage } from "../TemplatePreviewPage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/app/templates/${template.id}/preview`]}>
      <Routes><Route path="/app/templates/:templateId/preview" element={<TemplatePreviewPage />} /></Routes>
    </MemoryRouter>,
  );
}

afterEach(() => { vi.unstubAllGlobals(); });

describe("TemplatePreviewPage responsive layout", () => {
  it("is a single column under 900px with collapsible detail cards", async () => {
    stubViewport(390);
    renderPage();
    expect(screen.getByTestId("tpv-body")).toHaveAttribute("data-layout", "single");
    const routing = screen.getByRole("button", { name: /Routing/ });
    expect(routing).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(routing);
    expect(routing).toHaveAttribute("aria-expanded", "true");
    // Roles are open by default.
    expect(screen.getByRole("button", { name: /Role Placeholders/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps the split layout on a desktop, with no collapsible cards", () => {
    stubViewport(1366);
    renderPage();
    expect(screen.getByTestId("tpv-body")).toHaveAttribute("data-layout", "split");
    expect(screen.queryByRole("button", { name: /Routing/ })).toBeNull();
  });

  it("scales the page to the available width, keeping A4 proportions, with a 100% toggle", async () => {
    stubViewport(390);
    // The canvas reports 358px of room (390 minus 16px gutters).
    const orig = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get() { return 358; } });
    try {
      renderPage();
      const page = screen.getAllByTestId("tpv-page")[0]!;
      // 358 - 2 * 12px inner padding.
      expect(page.style.width).toBe("334px");
      expect(parseFloat(page.style.height) / parseFloat(page.style.width)).toBeCloseTo(842 / 595, 2);
      await userEvent.click(screen.getByRole("button", { name: "100%" }));
      expect(screen.getAllByTestId("tpv-page")[0]!.style.width).toBe("500px");
      expect(screen.getByRole("button", { name: "100%" })).toHaveAttribute("aria-pressed", "true");
    } finally {
      if (orig) Object.defineProperty(HTMLElement.prototype, "clientWidth", orig);
    }
  });

  it("renders the routing flow as an ordered list of steps", () => {
    stubViewport(390);
    renderPage();
    expect(screen.getByRole("list", { name: "Routing order", hidden: true })).toBeInTheDocument();
  });
});

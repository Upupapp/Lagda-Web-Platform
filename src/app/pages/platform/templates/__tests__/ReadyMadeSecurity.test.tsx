// Ready-made templates are a Personal feature (093), and their text must never
// reach a Free account's browser:
//   - no app source imports the library file (it is served by the backend);
//   - a Free workspace's gallery shows frosted cards that cannot be opened;
//   - the loader keeps only the text-free catalogue on a Free workspace, and
//     drops any text loaded earlier for a paid one.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../../../../hooks/usePageMeta", () => ({ usePageMeta: () => undefined }));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_free", name: "Free Firm" } }),
}));
let workspacePlan: { plan: string; ownerIsYou: boolean; ownerName: string | null } = { plan: "free", ownerIsYou: true, ownerName: "Ana" };
vi.mock("../../../../hooks/usePlans", () => ({
  useWorkspaceAllows: (min: string) => (workspacePlan.plan === "free" ? false : min === "personal" || workspacePlan.plan === "business"),
  useWorkspacePlan: () => ({ plan: workspacePlan.plan, info: { ...workspacePlan, paidUntil: null }, refresh: vi.fn() }),
}));

import readyMadeFixture from "../../../../../test/fixtures/ready_made_template.json";
import { ReadyMadeGalleryPage } from "../ReadyMadeGalleryPage";
import {
  installReadyMadeLibrary, trustInstalledReadyMadeLibrary, readyMadeLibraryKind, readyMadeRawDocuments,
  READY_MADE_TEMPLATES, type RawLibrary,
} from "../../../../services/ready-made-templates";
import { loadReadyMadeLibrary, resetReadyMadeLoader } from "../../../../services/ready-made-library";

const FULL = readyMadeFixture as RawLibrary;
const CATALOG: RawLibrary = {
  categories: FULL.categories.map(c => ({
    category: c.category,
    documents: c.documents.map(d => ({ document_type: d.document_type, title: d.title, signing_workflow: d.signing_workflow })),
  })),
};
const firstBody = FULL.categories[0]!.documents[0]!.body_content!;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  trustInstalledReadyMadeLibrary(false);
  resetReadyMadeLoader();
  workspacePlan = { plan: "free", ownerIsYou: true, ownerName: "Ana" };
});
afterEach(() => {
  // Back to the suite-wide fixture (test/setup.ts).
  installReadyMadeLibrary(FULL, "full");
  trustInstalledReadyMadeLibrary(true);
});

function srcFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" || name === "test" ? [] : srcFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("ready-made templates stay on the server", () => {
  it("no app source imports the library file", () => {
    const root = join(__dirname, "../../../../..");
    const offenders = srcFiles(join(root, "app")).concat(join(root, "router.tsx"))
      .filter(f => readFileSync(f, "utf8").includes("ready_made_template.json"));
    expect(offenders).toEqual([]);
  });

  it("keeps only the catalogue on a Free workspace, and drops text loaded for a paid one", async () => {
    installReadyMadeLibrary(FULL, "full");
    expect(readyMadeRawDocuments().length).toBeGreaterThan(0);
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith("/ready-made-templates/catalog")) return Promise.resolve(json(200, CATALOG));
      return Promise.resolve(json(403, { error: { code: "plan_required", message: "Ready-made templates needs the Personal plan or higher." } }));
    }));
    expect(await loadReadyMadeLibrary("ws_free")).toBe("locked");
    expect(readyMadeLibraryKind()).toBe("catalog");
    expect(readyMadeRawDocuments()).toEqual([]);
    expect(READY_MADE_TEMPLATES.every(t => t.body === "")).toBe(true);
  });

  it("shows a Free workspace frosted cards that cannot be opened, and no text", async () => {
    installReadyMadeLibrary(CATALOG, "catalog");
    render(<MemoryRouter><ReadyMadeGalleryPage /></MemoryRouter>);
    const cards = await screen.findAllByTestId("ready-made-locked-card");
    expect(cards).toHaveLength(READY_MADE_TEMPLATES.length);
    for (const card of cards) {
      expect(card.getAttribute("role")).toBeNull();
      expect(card.getAttribute("tabindex")).toBeNull();
      expect(card.querySelector("a")).toBeNull();
    }
    expect(screen.queryByRole("button", { name: /Preview ready-made template/ })).toBeNull();
    expect(screen.getByTestId("plan-upgrade-card").textContent).toContain("ready-made templates are part of the Personal plan");
    expect(document.body.textContent).not.toContain(firstBody.slice(0, 60));
  });

  it("opens the cards on a paid workspace", async () => {
    workspacePlan = { plan: "personal", ownerIsYou: true, ownerName: "Ana" };
    installReadyMadeLibrary(CATALOG, "catalog");
    render(<MemoryRouter><ReadyMadeGalleryPage /></MemoryRouter>);
    await waitFor(() => { expect(screen.getAllByRole("button", { name: /Preview ready-made template/ }).length).toBe(READY_MADE_TEMPLATES.length); });
    expect(screen.queryByTestId("ready-made-locked-card")).toBeNull();
  });
});

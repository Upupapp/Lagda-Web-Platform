// Launching a template while a preparation is unfinished.
//
// The launch writes its draft into the one local slot, and used to replace a
// preparation in progress without a word. It now asks first, with the same
// three choices as "Start preparation". This page sits outside
// PrepareProvider, so the unfinished draft is the one in local storage.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import type { ReactNode } from "react";
import { getAllMockTemplates } from "../../../../data/mock/templates";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

// A real fixture, without variables, so the wizard is two steps: roles, review.
const template = {
  ...getAllMockTemplates().find(t => t.status === "available" && t.placeholders.length > 0)!,
  variables: [],
};

vi.mock("../../../../context/TemplateContext", () => ({
  TemplateProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useTemplates: () => ({ state: { activeTemplate: template, activeLoading: false, activeError: null } }),
  useActiveTemplateLoader: () => undefined,
}));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1" } }),
}));
vi.mock("../../../../hooks/usePageMeta", () => ({ usePageMeta: () => undefined }));
vi.mock("../../../../hooks/useDetailTitle", () => ({ useDetailTitle: () => undefined }));
vi.mock("../../../../hooks/useAccountNameAssist", () => ({
  useAccountNameAssist: () => ({ status: "idle", accountName: null, lookup: () => undefined, reset: () => undefined }),
}));
vi.mock("../../../../components/prepare/PeoplePicker", () => ({ PeoplePicker: () => null }));
// Every role arrives already filled in, so the wizard can be walked to Launch.
vi.mock("../../../../services/templates-source", () => ({
  getTemplateRoleAssignments: (_ws: unknown, t: typeof template) => Promise.resolve(t.placeholders.map((p, index) => ({
    placeholderId: p.id, status: "resolved", displayName: `Person ${String(index + 1)}`, email: `person${String(index + 1)}@x.com`,
  }))),
}));
vi.mock("../../../../services/prepare/template-apply", () => ({
  resolveTemplateApplication: () => ({
    ok: true, authDowngrades: [],
    application: { participants: [], routing: { mode: "sequential", groups: [] }, fields: [] },
  }),
}));
vi.mock("../../../../config/process-screens", () => ({
  withProcess: (_kind: string, _who: string, work: () => Promise<unknown>) => work(),
}));

const handOff = vi.hoisted(() => vi.fn());
vi.mock("../../../../services/prepare/template-handoff", () => ({
  TEMPLATE_HANDOFF_ROUTE: "/app/prepare/upload",
  handOffTemplateToPrepare: handOff,
}));
const lifecycle = vi.hoisted(() => ({ deleteDraftDocument: vi.fn() }));
vi.mock("../../../../services/real/document-lifecycle.service", () => ({ documentLifecycleService: lifecycle }));
vi.mock("../../../../services/real/templates.service", () => ({
  realTemplatesService: { instantiate: vi.fn() },
}));

import { UseTemplatePage } from "../UseTemplatePage";
import { writeJSON, readJSON, PERSISTENCE_KEYS } from "../../../../services/local-persistence";
import { DRAFT_BLANK } from "../../../../data/mock/prepare";
import { ApiError } from "../../../../services/api-client";

function Where() {
  const location = useLocation();
  return <span data-testid="where">{location.pathname}</span>;
}

/** Opens the page and walks the wizard to its Launch button. */
async function toLaunch() {
  render(
    <MemoryRouter initialEntries={[`/app/templates/${template.id}/use`]}>
      <Where />
      <Routes>
        <Route path="/app/templates/:templateId/use" element={<UseTemplatePage />} />
        <Route path="/app/prepare/upload" element={<p>Documents step</p>} />
      </Routes>
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  // The roles fill in from the mocked assignments; Continue then reaches Review.
  await screen.findAllByDisplayValue("person1@x.com");
  await user.click(screen.getByRole("button", { name: /^Continue/ }));
  await screen.findByRole("button", { name: /Launch Signing Request/ });
  return user;
}

const launchButton = () => screen.getByRole("button", { name: /Launch Signing Request/ });
const where = () => screen.getByTestId("where").textContent ?? "";

function storeUnfinished(over: { documentId?: string; title?: string; empty?: boolean } = {}) {
  writeJSON(PERSISTENCE_KEYS.prepareDraft, {
    ...DRAFT_BLANK, id: "draft_a",
    details: { ...DRAFT_BLANK.details, title: over.empty ? "" : (over.title ?? "Lease A") },
    files: over.empty ? [] : [{
      id: "f1", fileName: "lease-a.pdf", fileSizeBytes: 10, mimeType: "application/pdf", fileState: "ready", order: 0,
      ...(over.documentId === undefined ? {} : { backendDocumentId: over.documentId }),
    }],
  });
}

beforeEach(() => {
  window.localStorage.clear();
  handOff.mockResolvedValue({ ok: true, route: "/app/prepare/upload", draft: { participants: [], routing: { groups: [] } } });
  lifecycle.deleteDraftDocument.mockResolvedValue(undefined);
});

describe("launching a template over an unfinished draft", () => {
  it("launches at once when nothing is in progress", async () => {
    const user = await toLaunch();
    await user.click(launchButton());
    await waitFor(() => { expect(handOff).toHaveBeenCalledTimes(1); });
    expect(screen.queryByTestId("unfinished-draft-dialog")).toBeNull();
  });

  it("does not ask about an empty draft", async () => {
    storeUnfinished({ empty: true });
    const user = await toLaunch();
    await user.click(launchButton());
    await waitFor(() => { expect(handOff).toHaveBeenCalledTimes(1); });
    expect(screen.queryByTestId("unfinished-draft-dialog")).toBeNull();
  });

  it("asks first, and launches nothing yet", async () => {
    storeUnfinished({ documentId: "doc_a" });
    const user = await toLaunch();
    await user.click(launchButton());
    const dialog = screen.getByTestId("unfinished-draft-dialog");
    expect(dialog.textContent ?? "").toContain("You have an unfinished document: “Lease A”.");
    expect(within(dialog).getAllByRole("button").map(button => button.textContent)).toEqual([
      "Continue that one",
      "Start a new one and keep that as a draft",
      "Discard it and start a new one",
    ]);
    expect(handOff).not.toHaveBeenCalled();
  });

  it("Continue that one: goes back to it, untouched", async () => {
    storeUnfinished({ documentId: "doc_a" });
    const user = await toLaunch();
    await user.click(launchButton());
    await user.click(screen.getByRole("button", { name: "Continue that one" }));
    expect(where()).toBe("/app/prepare/upload");
    expect(handOff).not.toHaveBeenCalled();
    expect(lifecycle.deleteDraftDocument).not.toHaveBeenCalled();
    expect(readJSON<{ id: string }>(PERSISTENCE_KEYS.prepareDraft)?.id).toBe("draft_a");
  });

  it("Keep as a draft: launches and deletes nothing on the server", async () => {
    storeUnfinished({ documentId: "doc_a" });
    const user = await toLaunch();
    await user.click(launchButton());
    await user.click(screen.getByRole("button", { name: "Start a new one and keep that as a draft" }));
    await waitFor(() => { expect(handOff).toHaveBeenCalledTimes(1); });
    expect(lifecycle.deleteDraftDocument).not.toHaveBeenCalled();
  });

  it("Discard: deletes it on the server, then launches", async () => {
    const order: string[] = [];
    lifecycle.deleteDraftDocument.mockImplementation(() => { order.push("delete"); return Promise.resolve(); });
    handOff.mockImplementation(() => {
      order.push("launch");
      return Promise.resolve({ ok: true, route: "/app/prepare/upload", draft: { participants: [], routing: { groups: [] } } });
    });
    storeUnfinished({ documentId: "doc_a" });
    const user = await toLaunch();
    await user.click(launchButton());
    await user.click(screen.getByRole("button", { name: "Discard it and start a new one" }));
    await waitFor(() => { expect(order).toEqual(["delete", "launch"]); });
    expect(lifecycle.deleteDraftDocument).toHaveBeenCalledWith("ws_1", "doc_a");
  });

  it("Discard that fails keeps the draft, says so, and launches nothing", async () => {
    lifecycle.deleteDraftDocument.mockRejectedValue(new ApiError(0, undefined, "Network error"));
    storeUnfinished({ documentId: "doc_a" });
    const user = await toLaunch();
    await user.click(launchButton());
    await user.click(screen.getByRole("button", { name: "Discard it and start a new one" }));
    expect((await screen.findByRole("alert")).textContent ?? "").toBe(
      "That draft was not deleted, so it has been kept. Check your connection and try again.");
    expect(handOff).not.toHaveBeenCalled();
    expect(readJSON<{ id: string }>(PERSISTENCE_KEYS.prepareDraft)?.id).toBe("draft_a");
  });
});

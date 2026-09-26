import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

const platform = { currentWorkspace: { id: "ws_1", name: "Acme" } as { id: string; name: string } | null };
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));
vi.mock("../../../../hooks/usePageMeta", () => ({ usePageMeta: () => undefined }));
vi.mock("../../../../services/processing.service", () => ({
  useProcessing: () => ({ run: (_m: unknown, fn: () => Promise<unknown>) => fn() }),
}));
const realTemplatesAvailable = vi.fn(() => true);
vi.mock("../../../../services/templates-source", () => ({
  realTemplatesAvailable: () => realTemplatesAvailable(),
}));
const copyReadyMadeTemplate = vi.fn();
vi.mock("../../../../services/ready-made-create", () => ({
  copyReadyMadeTemplate: (...a: unknown[]) => copyReadyMadeTemplate(...a),
}));

import { ReadyMadeGalleryPage } from "../ReadyMadeGalleryPage";
import { ReadyMadePreviewPage } from "../ReadyMadePreviewPage";
import { READY_MADE_TEMPLATES } from "../../../../services/ready-made-templates";

const offer = READY_MADE_TEMPLATES.find(t => t.title === "Employment Offer Letter and Contract Agreement")!;

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/templates/gallery" element={<ReadyMadeGalleryPage />} />
        <Route path="/app/templates/gallery/:readyId" element={<ReadyMadePreviewPage />} />
        <Route path="/app/templates/:id/author" element={<p>author page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  copyReadyMadeTemplate.mockReset();
  realTemplatesAvailable.mockReturnValue(true);
});

describe("ready-made gallery", () => {
  it("shows every template as a card, grouped by category", () => {
    renderAt("/app/templates/gallery");
    expect(screen.getAllByRole("button", { name: /Preview ready-made template/ })).toHaveLength(46);
    expect(screen.getByRole("heading", { name: /Recruitment & HR/ })).toBeTruthy();
  });

  it("filters by category and search", async () => {
    renderAt("/app/templates/gallery");
    await userEvent.click(screen.getByRole("button", { name: /^Healthcare \(1\)/ }));
    expect(screen.getAllByRole("button", { name: /Preview ready-made template/ })).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: /^All \(46\)/ }));
    await userEvent.type(screen.getByLabelText("Search ready-made templates"), "no-such-template-xyz");
    expect(screen.getByText(/No ready-made template matches/)).toBeTruthy();
  });

  it("opens the preview from a card", async () => {
    renderAt("/app/templates/gallery");
    await userEvent.click(screen.getByRole("button", { name: `Preview ready-made template: ${offer.title}` }));
    expect(screen.getByRole("heading", { level: 1, name: offer.title })).toBeTruthy();
  });
});

describe("ready-made preview", () => {
  it("shows the document and its roles in order, with the preparer as the sender", () => {
    renderAt(`/app/templates/gallery/${offer.id}`);
    expect(screen.getByLabelText("Document preview").textContent).toContain(offer.body.slice(0, 40));
    for (const r of offer.roles) expect(screen.getAllByText(r.label).length).toBeGreaterThan(0);
    expect(screen.getByText(/you, as the sender who prepares it/)).toBeTruthy();
  });

  it("copies the template into the workspace and opens it in the author editor", async () => {
    copyReadyMadeTemplate.mockResolvedValue({ template: { id: "tpl_9" }, documentGenerated: true });
    renderAt(`/app/templates/gallery/${offer.id}`);
    await userEvent.click(screen.getByRole("button", { name: /Use this template/ }));
    expect(copyReadyMadeTemplate).toHaveBeenCalledWith("ws_1", offer);
    expect(await screen.findByText("author page")).toBeTruthy();
  });

  it("shows the server's reason when the copy fails", async () => {
    copyReadyMadeTemplate.mockRejectedValue(new Error("Workspace limit reached."));
    renderAt(`/app/templates/gallery/${offer.id}`);
    await userEvent.click(screen.getByRole("button", { name: /Use this template/ }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Workspace limit reached.");
  });

  it("previews but cannot use without a workspace", () => {
    realTemplatesAvailable.mockReturnValue(false);
    renderAt(`/app/templates/gallery/${offer.id}`);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: /Use this template/ }).disabled).toBe(true);
    expect(screen.getByText(/Open a workspace to use this template/)).toBeTruthy();
  });

  it("says so for an unknown id", () => {
    renderAt("/app/templates/gallery/not-a-template");
    expect(screen.getByText(/could not be found/)).toBeTruthy();
  });
});

// The preparation shell and the one draft slot.
//
//   Discard draft   deletes on the server; a failure keeps the draft, says
//                   so, and offers to try again.
//   Resume          reopening document B while A is unfinished asks first.
//   Leaving step 1  a title the server does not hold yet is saved first, and
//                   a failed save keeps the sender on the step.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const { deleteDraftEverywhere, resumeBackendDraft, saveTitle, prepare, stable } = vi.hoisted(() => {
  const deleteDraftEverywhere = vi.fn();
  const resumeBackendDraft = vi.fn();
  const saveTitle = vi.fn();
  const setStep = vi.fn();
  const prepare: { draft: unknown; titleNeedsSave: boolean; stepStates: Record<string, string> } = {
    draft: null, titleNeedsSave: false, stepStates: {},
  };
  const stable = {
    deleteDraftEverywhere: (...args: unknown[]) => deleteDraftEverywhere(...args) as unknown,
    resumeBackendDraft: (...args: unknown[]) => resumeBackendDraft(...args) as unknown,
    saveTitle: (...args: unknown[]) => saveTitle(...args) as unknown,
    setStep: (...args: unknown[]) => setStep(...args) as unknown,
    validate: () => ({ errors: [], warnings: [], issues: [], readyForFieldPlacement: true }),
  };
  return { deleteDraftEverywhere, resumeBackendDraft, saveTitle, prepare, stable };
});
vi.mock("../../../../context/PrepareContext", () => ({
  usePrepare: () => ({
    draft: prepare.draft, isDirty: true, titleNeedsSave: prepare.titleNeedsSave,
    stepStates: prepare.stepStates, ...stable,
  }),
  PrepareProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ sessionStatus: "authenticated", currentWorkspace: { id: "ws_1" } }),
}));
vi.mock("../../../../services/processing.service", async (original) => ({
  ...(await original<typeof import("../../../../services/processing.service")>()),
  useProcessing: () => ({
    run: (_options: unknown, work: (tools: { update: () => void }) => Promise<unknown>) => work({ update: () => undefined }),
  }),
}));
vi.mock("../../../../components/prepare/PreparationHelpFab", () => ({
  PreparationHelpFab: () => null,
  nudgePreparationHelp: () => undefined,
}));
vi.mock("../../../../components/prepare/MissingItemsModal", () => ({ MissingItemsModal: () => null }));
const toastInfo = vi.hoisted(() => vi.fn());
vi.mock("../../../../components/brand/BrandToast", () => ({ toastInfo }));

import React from "react";
import { PrepareLayout } from "../PrepareLayout";
import { ApiError } from "../../../../services/api-client";
import { PREPARATION_STEPS } from "../../../../models/prepare";

const draftOf = (over: { title?: string; documentId?: string; files?: boolean } = {}) => ({
  id: "draft_a",
  details: { title: over.title ?? "Lease A", description: "", folderId: null, tagIds: [] },
  participants: [],
  files: over.files === false ? [] : [{
    id: "f1", fileName: "lease-a.pdf", fileSizeBytes: 10, mimeType: "application/pdf", fileState: "ready", order: 0,
    ...(over.documentId === undefined ? {} : { backendDocumentId: over.documentId }),
  }],
});

function Where() {
  const location = useLocation();
  return <span data-testid="where">{location.pathname}{location.search}</span>;
}

function open(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Where />
      <Routes>
        <Route path="/app/prepare" element={<PrepareLayout />}>
          <Route index element={<p>Entry</p>} />
          <Route path="upload" element={<p>Documents step</p>} />
          <Route path="participants" element={<p>Participants step</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const where = () => screen.getByTestId("where").textContent ?? "";

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1280 });
  prepare.draft = draftOf({ documentId: "doc_a" });
  prepare.titleNeedsSave = false;
  prepare.stepStates = Object.fromEntries(PREPARATION_STEPS.map(step => [step.id, "available"]));
  deleteDraftEverywhere.mockResolvedValue(undefined);
  resumeBackendDraft.mockResolvedValue(true);
  saveTitle.mockResolvedValue({ status: "skipped" });
});

describe("Discard draft", () => {
  it("deletes the draft everywhere once confirmed, then leaves the flow", async () => {
    open("/app/prepare/upload");
    await userEvent.click(screen.getByRole("button", { name: /Discard/ }));
    const dialog = screen.getByTestId("discard-dialog");
    // What the dialog promises is now what happens.
    expect(dialog.textContent ?? "").toContain("are removed from your Drafts");
    expect(dialog.textContent ?? "").toContain("The file you uploaded is deleted with the draft.");
    expect(deleteDraftEverywhere).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Discard draft" }));
    await waitFor(() => { expect(where()).toBe("/app/prepare"); });
    expect(deleteDraftEverywhere).toHaveBeenCalledTimes(1);
  });

  it("focuses Keep editing first, so Enter never deletes", async () => {
    open("/app/prepare/upload");
    await userEvent.click(screen.getByRole("button", { name: /Discard/ }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Keep editing" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByTestId("discard-dialog")).toBeNull();
    expect(deleteDraftEverywhere).not.toHaveBeenCalled();
  });

  it("keeps the draft and says so when the server could not delete, and offers Try again", async () => {
    deleteDraftEverywhere.mockRejectedValueOnce(new ApiError(0, undefined, "Network error"));
    open("/app/prepare/upload");
    await userEvent.click(screen.getByRole("button", { name: /Discard/ }));
    await userEvent.click(within(screen.getByTestId("discard-dialog")).getByRole("button", { name: "Discard draft" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent ?? "").toBe(
      "That draft was not deleted, so it has been kept. Check your connection and try again.");
    // Still on the step, with the draft.
    expect(where()).toBe("/app/prepare/upload");
    expect(screen.getByText("Documents step")).toBeInTheDocument();

    await userEvent.click(within(screen.getByTestId("discard-dialog")).getByRole("button", { name: "Try again" }));
    await waitFor(() => { expect(where()).toBe("/app/prepare"); });
    expect(deleteDraftEverywhere).toHaveBeenCalledTimes(2);
  });

  it("cannot be confirmed twice at once", async () => {
    let finish!: () => void;
    deleteDraftEverywhere.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    open("/app/prepare/upload");
    await userEvent.click(screen.getByRole("button", { name: /Discard/ }));
    const confirm = within(screen.getByTestId("discard-dialog")).getByRole("button", { name: "Discard draft" });
    await userEvent.dblClick(confirm);
    expect(deleteDraftEverywhere).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() => { expect(where()).toBe("/app/prepare"); });
  });
});

describe("Resume while another draft is unfinished", () => {
  it("asks first, naming the unfinished one", async () => {
    open("/app/prepare/upload?resumeDocumentId=doc_b");
    const dialog = await screen.findByTestId("unfinished-draft-dialog");
    expect(dialog.textContent ?? "").toContain("You have an unfinished document: “Lease A”.");
    expect(resumeBackendDraft).not.toHaveBeenCalled();
    expect(within(dialog).getAllByRole("button").map(button => button.textContent)).toEqual([
      "Continue that one",
      "Open the other one and keep that as a draft",
      "Discard it and open the other one",
    ]);
  });

  it("Continue that one: nothing is replaced and the link is dropped", async () => {
    open("/app/prepare/upload?resumeDocumentId=doc_b");
    await userEvent.click(await screen.findByRole("button", { name: "Continue that one" }));
    await waitFor(() => { expect(where()).toBe("/app/prepare/upload"); });
    expect(resumeBackendDraft).not.toHaveBeenCalled();
    expect(deleteDraftEverywhere).not.toHaveBeenCalled();
    expect(screen.queryByTestId("unfinished-draft-dialog")).toBeNull();
  });

  it("Keep as a draft: opens the other one and deletes nothing", async () => {
    open("/app/prepare/upload?resumeDocumentId=doc_b");
    await userEvent.click(await screen.findByRole("button", { name: "Open the other one and keep that as a draft" }));
    await waitFor(() => { expect(resumeBackendDraft).toHaveBeenCalledWith("doc_b"); });
    expect(deleteDraftEverywhere).not.toHaveBeenCalled();
    // A title typed a moment ago goes with the draft that is kept.
    expect(saveTitle).toHaveBeenCalled();
    await waitFor(() => { expect(where()).toBe("/app/prepare/upload"); });
  });

  it("Discard: deletes the unfinished one, then opens the other", async () => {
    const order: string[] = [];
    deleteDraftEverywhere.mockImplementation(() => { order.push("delete"); return Promise.resolve(); });
    resumeBackendDraft.mockImplementation(() => { order.push("resume"); return Promise.resolve(true); });
    open("/app/prepare/upload?resumeDocumentId=doc_b");
    await userEvent.click(await screen.findByRole("button", { name: "Discard it and open the other one" }));
    await waitFor(() => { expect(order).toEqual(["delete", "resume"]); });
  });

  it("Discard that fails keeps the unfinished one and opens nothing", async () => {
    deleteDraftEverywhere.mockRejectedValue(new ApiError(409, { code: "document_in_use", message: "A template uses this document." }, "Conflict"));
    open("/app/prepare/upload?resumeDocumentId=doc_b");
    await userEvent.click(await screen.findByRole("button", { name: "Discard it and open the other one" }));
    expect((await screen.findByRole("alert")).textContent ?? "").toBe(
      "That draft was not deleted, so it has been kept. A template uses this document.");
    expect(resumeBackendDraft).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("does not ask when the unfinished draft is empty", async () => {
    prepare.draft = draftOf({ title: "  ", files: false });
    open("/app/prepare/upload?resumeDocumentId=doc_b");
    await waitFor(() => { expect(resumeBackendDraft).toHaveBeenCalledWith("doc_b"); });
    expect(screen.queryByTestId("unfinished-draft-dialog")).toBeNull();
  });

  it("does not ask, or rebuild, when the draft being reopened is the one already open", async () => {
    open("/app/prepare/upload?resumeDocumentId=doc_a");
    await waitFor(() => { expect(where()).toBe("/app/prepare/upload"); });
    expect(resumeBackendDraft).not.toHaveBeenCalled();
    expect(screen.queryByTestId("unfinished-draft-dialog")).toBeNull();
  });

  it("offers no draft to keep when the unfinished one never reached the server", async () => {
    prepare.draft = draftOf({});
    open("/app/prepare/upload?resumeDocumentId=doc_b");
    const dialog = await screen.findByTestId("unfinished-draft-dialog");
    expect(within(dialog).queryByRole("button", { name: /keep that as a draft/ })).toBeNull();
    expect(dialog.textContent ?? "").toContain("It has not been uploaded yet, so it cannot be kept as a draft");
  });
});

describe("leaving the Documents step", () => {
  it("moves on at once when there is no title to save", async () => {
    open("/app/prepare/upload");
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(saveTitle).not.toHaveBeenCalled();
    expect(where()).toBe("/app/prepare/participants");
  });

  it("saves the title first, then moves on", async () => {
    prepare.titleNeedsSave = true;
    let finish!: (outcome: unknown) => void;
    saveTitle.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    open("/app/prepare/upload");
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(saveTitle).toHaveBeenCalledTimes(1);
    expect(where()).toBe("/app/prepare/upload");
    finish({ status: "saved", title: "Lease A", adjusted: null });
    await waitFor(() => { expect(where()).toBe("/app/prepare/participants"); });
  });

  it("says so when the title was numbered on the way out", async () => {
    prepare.titleNeedsSave = true;
    saveTitle.mockResolvedValue({ status: "saved", title: "Lease A (2)", adjusted: { typed: "Lease A", saved: "Lease A (2)" } });
    open("/app/prepare/upload");
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await waitFor(() => { expect(where()).toBe("/app/prepare/participants"); });
    expect(toastInfo).toHaveBeenCalledWith("Saved as \"Lease A (2)\"", "A document named \"Lease A\" already exists here.");
  });

  it("stays on the step when the title could not be saved", async () => {
    prepare.titleNeedsSave = true;
    saveTitle.mockResolvedValue({ status: "failed" });
    open("/app/prepare/upload");
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await waitFor(() => { expect(saveTitle).toHaveBeenCalledTimes(1); });
    await Promise.resolve();
    expect(where()).toBe("/app/prepare/upload");
    expect(screen.getByText("Documents step")).toBeInTheDocument();
  });
});

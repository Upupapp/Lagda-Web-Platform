// Send, and the title.
//
// The title is saved as it is typed, so there is normally nothing left to do
// at Send. But Send is still the last gate: a title that is not saved yet is
// saved there, and one that CANNOT be saved stops the send. It used to be
// swallowed, and the request went out under the file's name.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const { saveTitle, discardDraft, stable } = vi.hoisted(() => {
  const saveTitle = vi.fn();
  const discardDraft = vi.fn();
  const draft = {
    id: "draft_1",
    details: { title: "Lease", description: "", folderId: null, tagIds: [] },
    files: [{ id: "f1", fileName: "lease.pdf", backendDocumentId: "doc_1", uploadStatus: "uploaded" }],
    participants: [],
    settings: { expiration: { enabled: false, expiresAt: null } },
  };
  const stable = {
    draft,
    setStep: () => undefined,
    setFieldsSnapshot: () => undefined,
    syncError: null,
    multiDocumentSigningGap: false,
    saveTitle: (...args: unknown[]) => saveTitle(...args) as unknown,
    discardDraft: (...args: unknown[]) => discardDraft(...args) as unknown,
  };
  return { saveTitle, discardDraft, stable };
});
vi.mock("../../../../context/PrepareContext", () => ({ usePrepare: () => stable }));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ user: { displayName: "Sender" }, currentWorkspace: { id: "ws_1" } }),
}));
vi.mock("../../../../context/FieldEditorContext", () => {
  const editor = {
    initialize: () => undefined, runValidation: () => undefined, loadRealFields: () => undefined,
    fields: [], documents: [], validation: { errors: [], warnings: [] },
  };
  return {
    FieldEditorProvider: ({ children }: { children: React.ReactNode }) => children,
    useFieldEditor: () => editor,
  };
});
vi.mock("../../../../hooks/usePlans", () => ({
  useMyPlan: () => ({ plan: null }),
  useWorkspacePlan: () => ({ plan: "business" }),
  announcePlanChanged: () => undefined,
}));
vi.mock("../../../../services/prepare/send-readiness", async (original) => ({
  ...(await original<typeof import("../../../../services/prepare/send-readiness")>()),
  computeSendReadiness: () => ({ ready: true, blockers: [] }),
}));
vi.mock("../../../../services/processing.service", async (original) => ({
  ...(await original<typeof import("../../../../services/processing.service")>()),
  useProcessing: () => ({
    run: (_options: unknown, work: (tools: { update: () => void }) => Promise<unknown>) => work({ update: () => undefined }),
  }),
}));

const request = vi.hoisted(() => ({ create: vi.fn(), markReadyToSend: vi.fn(), send: vi.fn(), setExpiry: vi.fn() }));
vi.mock("../../../../services/real/signing-request.service", () => ({ realSigningRequestService: request }));
vi.mock("../../../../services/real/preparation.service", () => ({ realPreparationService: { get: vi.fn() } }));
const toasts = vi.hoisted(() => ({ toastInfo: vi.fn(), toastWarning: vi.fn() }));
vi.mock("../../../../components/brand/BrandToast", () => toasts);

import React from "react";
import { ConfirmationPage } from "../ConfirmationPage";

const open = () => render(<MemoryRouter><ConfirmationPage /></MemoryRouter>);
const sendButton = () => screen.getByRole("button", { name: "Send Signing Request" });

beforeEach(() => {
  saveTitle.mockResolvedValue({ status: "skipped" });
  discardDraft.mockResolvedValue(undefined);
  request.create.mockResolvedValue({ signingRequestId: "sr_1", documentId: "doc_1", state: "draft" });
  request.markReadyToSend.mockResolvedValue({ state: "ready-to-send" });
  request.send.mockResolvedValue({ signingRequestId: "sr_1", state: "sent" });
});

describe("Send and the title", () => {
  it("saves the title before the request is created", async () => {
    const order: string[] = [];
    saveTitle.mockImplementation(() => { order.push("title"); return Promise.resolve({ status: "saved", title: "Lease", adjusted: null }); });
    request.create.mockImplementation(() => { order.push("create"); return Promise.resolve({ signingRequestId: "sr_1", documentId: "doc_1", state: "ready-to-send" }); });
    open();
    await userEvent.click(sendButton());
    await waitFor(() => { expect(request.send).toHaveBeenCalledTimes(1); });
    expect(order).toEqual(["title", "create"]);
    expect(discardDraft).toHaveBeenCalledTimes(1);
  });

  it("stops the send, with a clear message, when the title could not be saved", async () => {
    saveTitle.mockResolvedValue({ status: "failed" });
    open();
    await userEvent.click(sendButton());
    expect(await screen.findByText(
      "The title could not be saved, so nothing was sent. Check your connection and try again.")).toBeInTheDocument();
    expect(request.create).not.toHaveBeenCalled();
    expect(request.send).not.toHaveBeenCalled();
    // The draft is kept, and the button is there to try again.
    expect(discardDraft).not.toHaveBeenCalled();
    expect(sendButton()).not.toBeDisabled();
  });

  it("sends once the title saves on a second attempt", async () => {
    saveTitle.mockResolvedValueOnce({ status: "failed" });
    open();
    await userEvent.click(sendButton());
    await screen.findByText(/The title could not be saved, so nothing was sent/);
    await userEvent.click(sendButton());
    await waitFor(() => { expect(request.send).toHaveBeenCalledTimes(1); });
    expect(screen.queryByText(/The title could not be saved/)).toBeNull();
  });

  it("says which title it went out under when the server numbered it at the last moment", async () => {
    saveTitle.mockResolvedValue({ status: "saved", title: "Lease (2)", adjusted: { typed: "Lease", saved: "Lease (2)" } });
    open();
    await userEvent.click(sendButton());
    await waitFor(() => { expect(request.send).toHaveBeenCalledTimes(1); });
    expect(toasts.toastInfo).toHaveBeenCalledWith(
      "Sent as \"Lease (2)\"", "A document named \"Lease\" already exists here.");
  });
});

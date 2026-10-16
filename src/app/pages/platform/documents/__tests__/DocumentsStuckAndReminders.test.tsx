// Sent cards for a request that is stuck or still being chased.
//
// A request whose every signature is in but whose final document could not be
// produced used to read "Finalizing" for ever. It now says "Could not
// finalize", that every signature is safe, and offers Try again (109). A
// request out for signature has Reminders beside its expiration (111).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { resetLiveCache } from "../../../../services/live/live-query";

vi.setConfig({ testTimeout: 15_000 });

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1", name: "Reyes Law", accentColor: "#0078D4" } }),
}));
vi.mock("../../../../hooks/usePrepareLaunch", () => ({ usePrepareLaunch: () => ({ onPrepareClick: () => undefined }) }));

const requests = vi.hoisted(() => ({ list: vi.fn(), retryCompletion: vi.fn(), signatures: vi.fn(), setReminders: vi.fn() }));
vi.mock("../../../../services/real/signing-request.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/signing-request.service")>();
  return { ...actual, realSigningRequestService: { ...actual.realSigningRequestService, ...requests } };
});
vi.mock("../../../../services/real/document.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/document.service")>();
  return { ...actual, realDocumentService: { ...actual.realDocumentService, list: () => Promise.resolve({ items: [], total: 0, page: 1, perPage: 100, hasNextPage: false }) } };
});
vi.mock("../../../../services/real/my-signing.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/my-signing.service")>();
  return { ...actual, realMySigningService: {
    documentsToSign: () => Promise.resolve([]), signedDocuments: () => Promise.resolve([]),
    completedOtherDocuments: () => Promise.resolve([]), continueSigning: vi.fn(),
  } };
});
vi.mock("../../../../services/real/document-lifecycle.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/document-lifecycle.service")>();
  return { ...actual, documentLifecycleService: {
    ...actual.documentLifecycleService,
    inboxCounts: () => Promise.resolve({ sign: 0, approve: 0, review: 0, acknowledge: 0 }),
    recycleBin: () => Promise.resolve([]), deletionRequests: () => Promise.resolve([]), deletedDocuments: () => Promise.resolve([]),
  } };
});
const toasts = vi.hoisted(() => ({ toastSuccess: vi.fn(), toastError: vi.fn(), toastInfo: vi.fn(), toastWarning: vi.fn() }));
vi.mock("../../../../components/brand/BrandToast", async importOriginal => ({
  ...(await importOriginal<typeof import("../../../../components/brand/BrandToast")>()), ...toasts,
}));

import { DocumentsPage } from "../DocumentsPage";
import { ApiError } from "../../../../services/api-client";

const ROW = {
  signingRequestId: "sr_1", documentId: "doc_1", documentTitle: "Lease", state: "completion-ready",
  participantCount: 2, completedParticipantCount: 2, initiator: null,
  createdAt: "2026-09-26T00:00:00.000Z", sentAt: "2026-09-28T00:00:00.000Z", completedAt: null, expiresAt: null,
  completion: { state: "failed", canRetry: true },
};
const listOf = (...items: unknown[]) => ({ items, total: items.length, page: 1, perPage: 50, hasNextPage: false });
const renderPage = () => render(<MemoryRouter initialEntries={["/app/documents"]}><DocumentsPage /></MemoryRouter>);

beforeEach(() => {
  resetLiveCache();
  Object.values(requests).forEach(fn => fn.mockReset());
  Object.values(toasts).forEach(fn => fn.mockReset());
  requests.list.mockResolvedValue(listOf(ROW));
});

describe("Sent: a final document that could not be produced", () => {
  it("says Could not finalize, that every signature is safe, and offers Try again", async () => {
    renderPage();
    const card = await screen.findByTestId("outbox-card");
    expect(within(card).getByText("Could not finalize")).toBeInTheDocument();
    expect(within(card).getByTestId("outbox-completion-failed")).toHaveTextContent(/Every signature is safe/);
    expect(within(card).getByRole("button", { name: "Try again to finalize Lease" })).toBeInTheDocument();
  });

  it("still says Finalizing while it is under way", async () => {
    requests.list.mockResolvedValue(listOf({ ...ROW, completion: { state: "finalizing", canRetry: false } }));
    renderPage();
    const card = await screen.findByTestId("outbox-card");
    expect(within(card).getByText("Finalizing")).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: /Try again/ })).toBeNull();
  });

  it("retries, says so, and reads the list again", async () => {
    requests.retryCompletion.mockResolvedValue({ signingRequestId: "sr_1", restarted: true, completion: { state: "finalizing", canRetry: false } });
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Try again to finalize Lease" }));
    expect(requests.retryCompletion).toHaveBeenCalledWith("ws_1", "sr_1");
    await waitFor(() => { expect(toasts.toastSuccess).toHaveBeenCalledWith("Trying again. The final document is being produced."); });
    await waitFor(() => { expect(requests.list.mock.calls.length).toBeGreaterThan(2); });
  });

  it("says a refusal or a missing permission in its own words", async () => {
    requests.retryCompletion.mockRejectedValue(new ApiError(404, { code: "not_found", message: "Not found" }, "x"));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Try again to finalize Lease" }));
    await waitFor(() => { expect(toasts.toastError).toHaveBeenCalledWith(expect.stringMatching(/don't have permission/)); });
  });
});

describe("Sent: reminders beside the expiration", () => {
  const OUT = { ...ROW, state: "sent", completedParticipantCount: 0, completion: null };

  it("opens the reminder settings, saves them with PUT", async () => {
    requests.list.mockResolvedValue(listOf(OUT));
    requests.signatures.mockResolvedValue({
      signingRequestId: "sr_1", state: "sent", signedCount: 0, requiredCount: 2, signatories: [],
      reminders: { enabled: true, firstAfterDays: 3, everyDays: 3, maxAutomatic: 3, maxManualPerTurn: 10 },
    });
    requests.setReminders.mockResolvedValue({ signingRequestId: "sr_1", reminders: { enabled: true, firstAfterDays: 2, everyDays: 3 } });
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Reminders for Lease" }));
    const dialog = await screen.findByRole("dialog", { name: "Reminders for Lease" });
    const first = await within(dialog).findByLabelText("First reminder after");
    // Select the value and type over it: clearing first would clamp the empty
    // field to 1 and the typed digit would follow it.
    await userEvent.tripleClick(first);
    await userEvent.keyboard("2");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => { expect(requests.setReminders).toHaveBeenCalledWith("ws_1", "sr_1", { enabled: true, firstAfterDays: 2, everyDays: 3 }); });
    expect(toasts.toastSuccess).toHaveBeenCalledWith("Reminders saved");
  });

  it("says why a change was refused", async () => {
    requests.list.mockResolvedValue(listOf(OUT));
    requests.signatures.mockResolvedValue({ signingRequestId: "sr_1", state: "sent", signedCount: 0, requiredCount: 2, signatories: [] });
    requests.setReminders.mockRejectedValue(new ApiError(409, { code: "signing_reminders_not_configurable", message: "x" }, "x"));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Reminders for Lease" }));
    const dialog = await screen.findByRole("dialog", { name: "Reminders for Lease" });
    await userEvent.click(await within(dialog).findByRole("checkbox", { name: /Remind participants/ }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Reminders can be changed only while the document is out for signature and before its deadline.");
    expect(requests.setReminders).toHaveBeenCalledWith("ws_1", "sr_1", { enabled: false, firstAfterDays: 3, everyDays: 3 });
  });

  it("is not offered once the request is no longer out", async () => {
    renderPage();
    const card = await screen.findByTestId("outbox-card");
    expect(within(card).queryByRole("button", { name: "Reminders for Lease" })).toBeNull();
  });
});

// Send, and the completed document.
//
// Settings lets the sender choose whether participants are emailed the
// completed document. That choice used to stop at the page: Send called the
// server with no options, so every request went out with the copy on. It is
// passed now, and only an explicit "off" changes what is sent.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const { stable } = vi.hoisted(() => {
  const draft: { [key: string]: unknown; settings: Record<string, unknown> } = {
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
    saveTitle: () => Promise.resolve({ status: "skipped" }),
    discardDraft: () => Promise.resolve(undefined),
  };
  return { stable };
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
vi.mock("../../../../components/brand/BrandToast", () => ({ toastInfo: vi.fn(), toastWarning: vi.fn() }));

import React from "react";
import { ConfirmationPage } from "../ConfirmationPage";

const open = () => render(<MemoryRouter><ConfirmationPage /></MemoryRouter>);
const send = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Send Signing Request" }));
  await waitFor(() => { expect(request.send).toHaveBeenCalledTimes(1); });
};
const withCompletion = (completion?: Record<string, unknown>) => {
  stable.draft.settings = {
    expiration: { enabled: false, expiresAt: null },
    ...(completion === undefined ? {} : { completion }),
  };
};

beforeEach(() => {
  request.create.mockReset().mockResolvedValue({ signingRequestId: "sr_1", documentId: "doc_1", state: "draft" });
  request.markReadyToSend.mockReset().mockResolvedValue({ state: "ready-to-send" });
  request.send.mockReset().mockResolvedValue({ signingRequestId: "sr_1", state: "sent" });
});

describe("Send and the reminders", () => {
  const withReminders = (reminders: Record<string, unknown>) => {
    stable.draft.settings = { expiration: { enabled: false, expiresAt: null }, reminders };
  };

  it("leaves reminders out of the body when they keep the defaults", async () => {
    withReminders({ enabled: true, firstReminderDays: 3, repeatIntervalDays: 3, maxReminders: null });
    open();
    await send();
    expect(request.send).toHaveBeenCalledWith("ws_1", "sr_1", expect.any(String), {});
  });

  it("sends the whole setting when the days differ", async () => {
    withReminders({ enabled: true, firstReminderDays: 2, repeatIntervalDays: 5, maxReminders: null });
    open();
    await send();
    expect(request.send).toHaveBeenCalledWith("ws_1", "sr_1", expect.any(String), {
      reminders: { enabled: true, firstAfterDays: 2, everyDays: 5 },
    });
  });

  it("sends reminders off when switched off, beside a withheld copy", async () => {
    stable.draft.settings = {
      expiration: { enabled: false, expiresAt: null },
      reminders: { enabled: false, firstReminderDays: 3, repeatIntervalDays: 3, maxReminders: null },
      completion: { emailFinalCopy: false },
    };
    open();
    await send();
    expect(request.send).toHaveBeenCalledWith("ws_1", "sr_1", expect.any(String), {
      shareFinalCopy: false,
      reminders: { enabled: false, firstAfterDays: 3, everyDays: 3 },
    });
  });
});

describe("Send and the completed document", () => {
  it("tells the server not to email the copy when the sender switched it off", async () => {
    withCompletion({ emailFinalCopy: false });
    open();
    expect(screen.getByTestId("final-copy-note")).toHaveTextContent(
      "When everyone has finished, eligible participants can open the completed document in LAGDA under Records. No separate download-link email is sent.");
    await send();
    expect(request.send).toHaveBeenCalledWith("ws_1", "sr_1", expect.any(String), { shareFinalCopy: false });
  });

  it("sends the request as it always was when the copy is left on", async () => {
    withCompletion({ emailFinalCopy: true });
    open();
    expect(screen.getByTestId("final-copy-note")).toHaveTextContent(
      "No separate download-link email is sent.");
    await send();
    expect(request.send).toHaveBeenCalledWith("ws_1", "sr_1", expect.any(String), {});
  });

  it("leaves the copy on for a draft saved before the setting existed", async () => {
    // No completion settings at all, and then the old ones with the switch
    // this replaced left off: neither is the sender choosing to withhold it.
    withCompletion();
    const view = open();
    await send();
    expect(request.send).toHaveBeenLastCalledWith("ws_1", "sr_1", expect.any(String), {});
    view.unmount();

    request.send.mockClear();
    withCompletion({ allowParticipantDownload: false, notifySenderOnComplete: false });
    open();
    await send();
    expect(request.send).toHaveBeenLastCalledWith("ws_1", "sr_1", expect.any(String), {});
  });
});

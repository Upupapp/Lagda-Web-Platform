// Documents › Sent: "Send to someone else", for a participant whose ID
// carries another name.
//
// The notice about the name lands on `?list=sent&participants=<request>`,
// which opens Participants. From there "Send to someone else" closes it and
// opens the dialog "Send to new email" opens, for the same request, on new
// addresses. Also where the request is not in the list the page holds.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.setConfig({ testTimeout: 15_000 });
import { resetLiveCache } from "../../../../services/live/live-query";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1", name: "Reyes Law", accentColor: "#0078D4" } }),
}));
vi.mock("../../../../hooks/usePrepareLaunch", () => ({ usePrepareLaunch: () => ({ onPrepareClick: () => undefined }) }));

const listRequests = vi.fn();
const getRequest = vi.fn();
const signatures = vi.fn();
vi.mock("../../../../services/real/signing-request.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/signing-request.service")>();
  return {
    ...actual,
    realSigningRequestService: {
      ...actual.realSigningRequestService,
      list: (...a: unknown[]) => listRequests(...a) as unknown,
      get: (...a: unknown[]) => getRequest(...a) as unknown,
      signatures: (...a: unknown[]) => signatures(...a) as unknown,
    },
  };
});
vi.mock("../../../../services/real/document.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/document.service")>();
  return { ...actual, realDocumentService: { ...actual.realDocumentService, list: () => Promise.resolve({ items: [], total: 0, page: 1, perPage: 100, hasNextPage: false }) } };
});
vi.mock("../../../../services/real/my-signing.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/my-signing.service")>();
  return {
    ...actual,
    realMySigningService: {
      documentsToSign: () => Promise.resolve([]),
      signedDocuments: () => Promise.resolve([]),
      completedOtherDocuments: () => Promise.resolve([]),
      continueSigning: vi.fn(),
    },
  };
});
vi.mock("../../../../services/real/document-lifecycle.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/document-lifecycle.service")>();
  return {
    ...actual,
    documentLifecycleService: {
      ...actual.documentLifecycleService,
      inboxCounts: () => Promise.resolve({ sign: 0, approve: 0, review: 0, acknowledge: 0 }),
      recycleBin: () => Promise.resolve([]),
      deletionRequests: () => Promise.resolve([]),
      deletedDocuments: () => Promise.resolve([]),
    },
  };
});

const identity = vi.hoisted(() => ({ availability: vi.fn(), requirements: vi.fn(), checks: vi.fn(), resolveName: vi.fn(), waive: vi.fn() }));
vi.mock("../../../../services/real/identity-check.service", async importOriginal => ({
  ...(await importOriginal<typeof import("../../../../services/real/identity-check.service")>()),
  realIdentityCheckService: identity,
}));
const currentParticipants = vi.hoisted(() => vi.fn());
vi.mock("../../../../services/real/resend-signing.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/resend-signing.service")>();
  return { ...actual, resendSigningService: { ...actual.resendSigningService, currentParticipants } };
});

import { DocumentsPage } from "../DocumentsPage";

const SENT = {
  signingRequestId: "sr_sent", documentId: "doc_s", documentTitle: "Employment Agreement 2026", state: "sent",
  participantCount: 1, completedParticipantCount: 0, initiator: null,
  createdAt: "2026-09-26T00:00:00.000Z", sentAt: "2026-09-28T00:00:00.000Z", completedAt: null, expiresAt: "2026-10-28T00:00:00.000Z",
};

const record = (signingRequestId: string) => ({
  signingRequestId, state: "sent", signedCount: 0, requiredCount: 1,
  signatories: [{
    recipientId: "srr_1", name: "Maria Santos", email: "maria@x.com", organization: null,
    type: "signer", isRequired: true, routingOrder: 1, state: "active", signedAt: null, declinedAt: null,
    declineReason: null, linkedAccountName: null, linkedAccountEmail: null,
  }],
});

const mismatch = {
  recipientId: "srr_1", email: "maria@x.com", required: true, status: "name-mismatch", mode: "live",
  lastOutcome: "passed", failedAttempts: 0, verifiedAt: "2026-10-10T02:00:00.000Z", idType: "passport", waivedAt: null,
  verifiedName: "Maria Clara Santos", nameMatch: "mismatch", nameDifferences: [], documentName: "Maria Santos",
};

beforeEach(() => {
  resetLiveCache();
  listRequests.mockReset();
  listRequests.mockResolvedValue({ items: [SENT], total: 1, page: 1, perPage: 50, hasNextPage: false });
  getRequest.mockReset();
  signatures.mockReset();
  signatures.mockImplementation((_ws: string, id: string) => Promise.resolve(record(id)));
  identity.availability.mockResolvedValue({ available: true, mode: "live", minimumPlan: "business", planAllows: true, idTypes: [], flow: "hosted" });
  identity.requirements.mockResolvedValue([{ email: "maria@x.com", requiredAt: "2026-10-08T01:00:00.000Z", waivedAt: null }]);
  identity.checks.mockResolvedValue([mismatch]);
  currentParticipants.mockResolvedValue([]);
});

const renderAt = (url: string) => render(<MemoryRouter initialEntries={[url]}><DocumentsPage /></MemoryRouter>);
const sendElsewhere = () => screen.findByRole("button", { name: "Send this document to someone else instead of Maria Santos" });

describe("Send to someone else, from Participants", () => {
  it("closes Participants and opens the send-again dialog for that request, on new addresses", async () => {
    const user = userEvent.setup();
    renderAt("/app/documents?list=sent&participants=sr_sent");
    expect(await screen.findByRole("dialog", { name: "Participants for Employment Agreement 2026" })).toBeInTheDocument();
    await user.click(await sendElsewhere());

    const dialog = await screen.findByRole("dialog", { name: "Send Employment Agreement 2026 for signing again" });
    expect(screen.queryByRole("dialog", { name: /Participants for/ })).toBeNull();
    // New addresses only: there is nobody to re-send it to as they are.
    expect(within(dialog).getByLabelText("Email addresses")).toBeInTheDocument();
    expect(within(dialog).queryByRole("tab", { name: /Re-send to same participants/ })).toBeNull();
    // It is that request's checks the dialog reads, and nothing was decided on the way.
    await waitFor(() => { expect(identity.checks).toHaveBeenCalledWith("ws_1", "sr_sent"); });
    expect(identity.resolveName).not.toHaveBeenCalled();
    expect(getRequest).not.toHaveBeenCalled();
  });

  it("works for a request the list in hand does not hold, by reading it", async () => {
    const user = userEvent.setup();
    getRequest.mockResolvedValue({
      signingRequestId: "sr_far", documentId: "doc_far", documentTitle: "Older Lease", state: "sent",
      recipients: [], fields: [], createdAt: "2026-08-01T00:00:00.000Z",
    });
    renderAt("/app/documents?list=sent&participants=sr_far");
    expect(await screen.findByRole("dialog", { name: "Participants for Older Lease" })).toBeInTheDocument();
    await user.click(await sendElsewhere());
    expect(await screen.findByRole("dialog", { name: "Send Older Lease for signing again" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /Participants for/ })).toBeNull();
    await waitFor(() => { expect(identity.requirements).toHaveBeenCalledWith("ws_1", "doc_far"); });
  });
});

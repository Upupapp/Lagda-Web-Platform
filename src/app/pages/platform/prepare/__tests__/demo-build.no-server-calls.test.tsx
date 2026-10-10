// The demo build (no backend configured) is exactly as it was.
//
// Saving the title early, the "already used" hint, deleting a discarded
// draft, the shared drafts list, and the identity check and numbered title on
// a re-send are all conversations with a server. Without one, none of them
// happens: no call is made, no new question is asked, nothing new is shown.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, renderHook, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: false, API_BASE_URL: null }));

vi.mock("../../../../context/PlatformContext", () => {
  const platform = { currentWorkspace: { id: "ws_1" }, hasFlag: () => true, user: { displayName: "Sender" } };
  return { usePlatform: () => platform, useOptionalPlatform: () => platform };
});
vi.mock("../../../../context/PendingPreparationContext", () => ({
  usePendingPreparation: () => ({ claimPending: () => null }),
}));
vi.mock("../../../../services/processing.service", async (original) => ({
  ...(await original<typeof import("../../../../services/processing.service")>()),
  useProcessing: () => ({
    run: (_options: unknown, work: (tools: { update: () => void }) => Promise<unknown>) => work({ update: () => undefined }),
  }),
}));
vi.mock("../../../../config/process-screens", async (original) => ({
  ...(await original<typeof import("../../../../config/process-screens")>()),
  withProcess: (_kind: string, _who: string, work: () => Promise<unknown>) => work(),
}));

// Every way the new work could reach a server, watched.
const server = vi.hoisted(() => ({
  rename: vi.fn(), titleSuggestion: vi.fn(), listDocuments: vi.fn(), createDocument: vi.fn(),
  checkUploadCapacity: vi.fn(), deleteDraftDocument: vi.fn(), listRequests: vi.fn(), listTemplates: vi.fn(),
  listRecipients: vi.fn(), availability: vi.fn(), requirements: vi.fn(), checks: vi.fn(), replaceRequirements: vi.fn(),
}));
vi.mock("../../../../services/real/document.service", () => ({
  realDocumentService: {
    rename: server.rename, titleSuggestion: server.titleSuggestion, list: server.listDocuments,
    create: server.createDocument, checkUploadCapacity: server.checkUploadCapacity,
  },
}));
vi.mock("../../../../services/real/document-lifecycle.service", () => ({
  documentLifecycleService: { deleteDraftDocument: server.deleteDraftDocument },
}));
vi.mock("../../../../services/real/signing-request.service", () => ({
  realSigningRequestService: { list: server.listRequests },
}));
vi.mock("../../../../services/real/templates.service", () => ({
  realTemplatesService: { list: server.listTemplates },
}));
vi.mock("../../../../services/real/recipient.service", () => ({
  realRecipientService: { list: server.listRecipients },
}));
vi.mock("../../../../services/real/identity-check.service", async (original) => ({
  ...(await original<typeof import("../../../../services/real/identity-check.service")>()),
  realIdentityCheckService: {
    availability: server.availability, requirements: server.requirements,
    checks: server.checks, replaceRequirements: server.replaceRequirements,
  },
}));
const resend = vi.hoisted(() => ({ currentParticipants: vi.fn(), resend: vi.fn(), resendToSame: vi.fn() }));
vi.mock("../../../../services/real/resend-signing.service", async (original) => ({
  ...(await original<typeof import("../../../../services/real/resend-signing.service")>()),
  resendSigningService: resend,
}));

import { PrepareProvider, usePrepare } from "../../../../context/PrepareContext";
import { PrepareEntryPage } from "../PrepareEntryPage";
import { UploadStep } from "../UploadStep";
import { ResendSigningDialog } from "../../../../components/documents/ResendSigningDialog";
import { useTitleSuggestion } from "../../../../hooks/useTitleSuggestion";
import { useDraftList } from "../../../../hooks/useDraftList";
import { DRAFT_BLANK } from "../../../../data/mock/prepare";
import { writeJSON, PERSISTENCE_KEYS } from "../../../../services/local-persistence";

type Ctx = ReturnType<typeof usePrepare>;
let ctx: Ctx;
function Probe() {
  ctx = usePrepare();
  return null;
}

function seedUnfinished() {
  writeJSON(PERSISTENCE_KEYS.prepareDraft, {
    ...DRAFT_BLANK, id: "draft_demo",
    details: { ...DRAFT_BLANK.details, title: "Lease" },
    // Even a draft that somehow carries a server id deletes and renames nothing.
    files: [{
      id: "f1", fileName: "lease.pdf", fileSizeBytes: 10, mimeType: "application/pdf", fileState: "ready", order: 0,
      backendDocumentId: "doc_1",
    }],
  });
}

const pause = (ms: number) => act(async () => { await new Promise(resolve => { setTimeout(resolve, ms); }); });

function expectNoServerCalls() {
  for (const [name, call] of Object.entries(server)) expect(call, name).not.toHaveBeenCalled();
}

beforeEach(() => { window.localStorage.clear(); });

describe("the demo build makes none of the new calls", () => {
  it("saves no title and deletes nothing on discard", async () => {
    seedUnfinished();
    render(<PrepareProvider><Probe /></PrepareProvider>);
    expect(ctx.titleNeedsSave).toBe(false);
    let outcome: unknown;
    await act(async () => { outcome = await ctx.saveTitle(); });
    expect(outcome).toEqual({ status: "skipped" });
    await act(async () => { await ctx.deleteDraftEverywhere(); });
    // Discarding still clears the local draft, as it always did.
    expect(ctx.draft).toBeNull();
    expectNoServerCalls();
  });

  it("the Documents step shows no title note and asks the server nothing", async () => {
    seedUnfinished();
    render(<PrepareProvider><UploadStep /></PrepareProvider>);
    const title = screen.getByLabelText(/Transaction title/);
    await userEvent.type(title, " 2026");
    await userEvent.tab();
    await pause(700);
    expect(screen.queryByTestId("prep-title-note")).toBeNull();
    expect(title.getAttribute("aria-describedby")).toBeNull();
    expectNoServerCalls();
  });

  it("asks for no title hint and reads no drafts list", async () => {
    const { result: hint } = renderHook(() => useTitleSuggestion({ workspaceId: "ws_1", title: "Lease" }));
    const { result: drafts } = renderHook(() => useDraftList("ws_1"));
    await pause(700);
    expect(hint.current).toBeNull();
    expect(drafts.current).toEqual([]);
    expectNoServerCalls();
  });

  it("Start preparation replaces the draft without a question, as before", async () => {
    seedUnfinished();
    render(
      <MemoryRouter initialEntries={["/app/prepare"]}>
        <PrepareProvider>
          <Probe />
          <Routes>
            <Route path="/app/prepare" element={<PrepareEntryPage />} />
            <Route path="/app/prepare/upload" element={<p>Documents step</p>} />
          </Routes>
        </PrepareProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByText("Resume a draft")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Start preparation/ }));
    expect(screen.queryByTestId("unfinished-draft-dialog")).toBeNull();
    await waitFor(() => { expect(screen.getByText("Documents step")).toBeInTheDocument(); }, { timeout: 5000 });
    expect(ctx.draft?.id).not.toBe("draft_demo");
    expectNoServerCalls();
  }, 15_000);

  it("Send again shows no identity section or title line, and sends as it always did", async () => {
    resend.resend.mockResolvedValue({ signingRequestId: "sr_new", sentTo: 1 });
    const onSent = vi.fn();
    render(<ResendSigningDialog workspaceId="ws_1" documentId="doc_1" documentTitle="Lease" signingRequestId="sr_old"
      onClose={vi.fn()} onSent={onSent} />);
    await userEvent.type(screen.getByLabelText("Email addresses"), "new@x.com");
    await userEvent.click(screen.getByRole("button", { name: /Send links/ }));
    await waitFor(() => { expect(onSent).toHaveBeenCalledWith("sr_new", 1); });
    expect(resend.resend.mock.calls[0]).toEqual(["ws_1", "doc_1", [{ name: "", email: "new@x.com" }]]);
    expect(resend.currentParticipants).not.toHaveBeenCalled();
    expect(screen.queryByTestId("identity-check-section")).toBeNull();
    expect(screen.queryByTestId("resend-title-note")).toBeNull();
    expectNoServerCalls();
  });
});

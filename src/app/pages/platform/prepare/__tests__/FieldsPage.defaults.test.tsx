// Coverage for the "default fields" convenience: a real document that has
// never had fields saved (a fresh preparation, GET returns an empty list)
// should NOT start on a blank canvas — see FieldsPage's real-field-load
// effect. Separate from FieldsPage.render.test.tsx, whose fixture
// deliberately has no backendDocumentId (so this effect never runs there).

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";

const prepare = {
  draft: {
    id: "d1",
    details: { title: "Test Contract", description: "", folderId: null, tagIds: [] },
    files: [{ id: "f1", fileName: "contract.pdf", fileSizeBytes: 1000, mimeType: "application/pdf", fileState: "ready", order: 0, backendDocumentId: "doc_1" }],
    participants: [
      { id: "pax_1", name: "Signer One", email: "s@x.com", role: "signer" },
      { id: "pax_2", name: "Viewer One", email: "v@x.com", role: "viewer" },
    ],
    routing: { mode: "sequential", groups: [] },
    auth: { defaultMethod: "none", perParticipant: {} },
    settings: {},
  },
  setStep: vi.fn(),
  setFieldsSnapshot: vi.fn(),
};
vi.mock("../../../../context/PrepareContext", () => ({ usePrepare: () => prepare }));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1" } }),
}));
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true }));

const getMock = vi.fn().mockResolvedValue({ revision: 0, fields: [] });
vi.mock("../../../../services/real/preparation.service", () => ({
  realPreparationService: { get: (...args: unknown[]) => getMock(...args) },
}));

import { FieldsPage } from "../FieldsPage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/app/prepare/fields"]}>
      <FieldsPage />
    </MemoryRouter>,
  );
}

describe("FieldsPage default fields", () => {
  it("places a default Signature field for a signer when the document has never been saved", async () => {
    renderPage();
    await waitFor(() => expect(getMock).toHaveBeenCalled());
    // The field list is the reliable way to assert on placed fields without
    // depending on canvas pixel geometry.
    const listBtn = await screen.findByRole("button", { name: /show field list/i });
    listBtn.click();
    const table = await screen.findByRole("table", { name: /field list/i });
    expect(table).toHaveTextContent("Signature");
    expect(table).toHaveTextContent("Signer One");
    // The viewer (non-blocking role) gets no default field.
    expect(table).not.toHaveTextContent("Viewer One");
  });
});

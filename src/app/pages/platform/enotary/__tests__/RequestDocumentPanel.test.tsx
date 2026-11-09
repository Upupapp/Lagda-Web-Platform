// 131. The document attached to a request: the client attaches, replaces and removes it; the notary only reads it.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const attachDocument = vi.fn();
const removeDocument = vi.fn();
const documentBlob = vi.fn();
vi.mock("../../../../services/real/enotary-invitations.service", async (original) => ({
  ...(await original<typeof import("../../../../services/real/enotary-invitations.service")>()),
  realEnotaryInvitationsService: {
    attachDocument: (...a: unknown[]) => attachDocument(...a) as unknown,
    removeDocument: (...a: unknown[]) => removeDocument(...a) as unknown,
    document: (...a: unknown[]) => documentBlob(...a) as unknown,
  },
}));

import { RequestDocumentPanel } from "../RequestDocumentPanel";
import { ApiError } from "../../../../services/api-client";

const DOC = { name: "Affidavit of Loss.pdf", size: 3_072, addedAt: "2026-11-09T01:04:00.000Z" };
/** The input is hidden behind its button, and the PNG case must reach the page's own check. */
const user = () => userEvent.setup({ applyAccept: false, pointerEventsCheck: 0 });
const pdf = () => new File([new Uint8Array([37, 80, 68, 70, 45])], "deed.pdf", { type: "application/pdf" });

describe("the document attached to a request", () => {
  beforeEach(() => { attachDocument.mockReset(); removeDocument.mockReset(); documentBlob.mockReset(); });

  it("lets the client attach a PDF and hands back what was saved", async () => {
    attachDocument.mockResolvedValue(DOC);
    const onChanged = vi.fn();
    render(<RequestDocumentPanel invitationId="eni_1" document={null} role="client" editable onChanged={onChanged} />);
    expect(screen.getByRole("button", { name: /Choose a PDF file/ })).toBeInTheDocument();
    await user().upload(screen.getByTestId("request-document-input"), pdf());
    await waitFor(() => { expect(onChanged).toHaveBeenCalledWith(DOC); });
    expect(attachDocument).toHaveBeenCalledWith("eni_1", expect.any(File));
  });

  it("refuses a file that is not a PDF before sending it, and says the server's reason in plain words", async () => {
    render(<RequestDocumentPanel invitationId="eni_1" document={null} role="client" editable />);
    await user().upload(screen.getByTestId("request-document-input"), new File(["x"], "photo.png", { type: "image/png" }));
    expect(await screen.findByText("Only a PDF can be notarized here.")).toBeInTheDocument();
    expect(attachDocument).not.toHaveBeenCalled();
    attachDocument.mockRejectedValue(new ApiError(422, { code: "session_document_rejected", message: "The file was rejected by security scanning." } as never, "x"));
    await user().upload(screen.getByTestId("request-document-input"), pdf());
    expect(await screen.findByText("The file was rejected by security scanning.")).toBeInTheDocument();
  });

  it("shows the attached PDF with Replace and Remove to the client", async () => {
    removeDocument.mockResolvedValue(undefined);
    const onChanged = vi.fn();
    render(<RequestDocumentPanel invitationId="eni_1" document={DOC} role="client" editable onChanged={onChanged} />);
    expect(screen.getByTestId("request-document-file")).toHaveTextContent("Affidavit of Loss.pdf");
    expect(screen.getByRole("button", { name: /Replace with another PDF/ })).toBeInTheDocument();
    await user().click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => { expect(onChanged).toHaveBeenCalledWith(null); });
  });

  it("lets the notary read it, and nothing more", async () => {
    documentBlob.mockResolvedValue(new Blob(["%PDF-"], { type: "application/pdf" }));
    URL.createObjectURL = vi.fn(() => "blob:doc"); URL.revokeObjectURL = vi.fn();
    render(<RequestDocumentPanel invitationId="eni_1" document={DOC} role="notary" editable={false} />);
    expect(screen.getByText(/Read it before you accept and before the call/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Replace with another PDF|Choose a PDF file|Remove/ })).toBeNull();
    await user().click(screen.getByRole("button", { name: "Open the document" }));
    expect(await screen.findByTestId("request-document-preview")).toHaveAttribute("src", "blob:doc");
    expect(screen.getByRole("link", { name: "Open in a new tab" })).toHaveAttribute("href", "blob:doc");
  });

  it("tells the notary when nothing is attached yet", () => {
    render(<RequestDocumentPanel invitationId="eni_1" document={null} role="notary" editable={false} />);
    expect(screen.getByText(/has not attached the document yet/)).toBeInTheDocument();
  });
});

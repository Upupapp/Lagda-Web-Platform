// The session's pages: the panel on a request, the room, the certified copies
// and the public check. The service is stubbed; what is tested is what a
// person sees and can do in each state the server may report.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "../../../../../services/api-client";
import { MemoryRouter, Route, Routes } from "react-router";

const svc = {
  lookup: vi.fn(), start: vi.fn(), get: vi.fn(), ping: vi.fn(), addDocument: vi.fn(), open: vi.fn(), consent: vi.fn(),
  cancel: vi.fn(), requestReopen: vi.fn(), reopen: vi.fn(), notarize: vi.fn(), messages: vi.fn(), say: vi.fn(), document: vi.fn(), notarized: vi.fn(),
  copies: vi.fn(), requestCopy: vi.fn(), quote: vi.fn(), decline: vi.fn(), sendProof: vi.fn(), confirmPayment: vi.fn(),
  paymentNotReceived: vi.fn(), auditTrail: vi.fn(), auditPdf: vi.fn(), setStage: vi.fn(), finalize: vi.fn(), confirmIdentity: vi.fn(), stateAct: vi.fn(), approve: vi.fn(), fulfil: vi.fn(), received: vi.fn(), cancelCopy: vi.fn(), copyFile: vi.fn(), verify: vi.fn(),
  checkLocation: vi.fn(), requestLocationRecheck: vi.fn(), signature: vi.fn(),
};
vi.mock("../../../../../services/real/enotary-sessions.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-sessions.service")>()),
  realEnotarySessionsService: new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => (svc as Record<string, (...a: unknown[]) => unknown>)[name]?.(...args) }),
}));
const sharedWithMe = vi.fn();
const sharedDocumentFile = vi.fn();
vi.mock("../../../../../services/real/document-sharing.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/document-sharing.service")>()),
  documentSharingService: { sharedWithMe: (...a: unknown[]) => sharedWithMe(...a) as unknown, sharedDocumentFile: (...a: unknown[]) => sharedDocumentFile(...a) as unknown },
}));
vi.mock("../useRoomConnection", () => ({
  useRoomConnection: () => ({ media: "ready", link: "waiting", local: null, remote: null, micOn: true, camOn: true, toggleMic: vi.fn(), toggleCam: vi.fn(), retry: vi.fn() }),
}));
vi.mock("../../payments/payment-qr", async (original) => ({
  ...(await original<typeof import("../../payments/payment-qr")>()),
  qrDataUrl: () => Promise.resolve("data:image/png;base64,AAAA"),
}));

import { SessionPanel } from "../SessionPanel";
import { NotarizePanel, RoomPage } from "../RoomPage";
import { CopiesPanel } from "../CopiesPanel";
import { VerifyNotarizedPage } from "../../../../public/enotary/VerifyNotarizedPage";
import type { CertifiedCopy, Session } from "../../../../../services/real/enotary-sessions.service";

const session = (over: Partial<Session> = {}): Session => ({
  id: "ens_1", invitationId: "eni_1", role: "client", status: "preparing", notaryName: "Aiyana Cruz", clientName: "Rosa Villanueva",
  createdAt: "2026-10-18T02:00:00.000Z", openedAt: null, endedAt: null, document: null,
  consent: { text: "I confirm that I am signing freely.", version: "v1", at: null },
  attestations: [{ key: "sawClient", text: "I saw the client." }, { key: "knewClient", text: "I verified who they are." }],
  presence: { client: false, notary: false }, notarizeBlock: "not_live", act: null, notarized: null, cancelledBy: null,
  pilotNotice: "LAGDA eNotary is a pilot. Accreditation is pending.", ...over,
});
const copy = (over: Partial<CertifiedCopy> = {}): CertifiedCopy => ({
  id: "ctc_1", sessionId: "ens_1", status: "requested", mode: "digital", copies: 1, delivery: null, feeCentavos: null, payee: null,
  qrPayload: null, reference: null, shipment: null, hasFile: false, verificationCode: null, note: null,
  createdAt: "2026-10-18T03:00:00.000Z", updatedAt: "2026-10-18T03:00:00.000Z", quotedAt: null, proofAt: null, paidAt: null,
  fulfilledAt: null, receivedAt: null, ...over,
});
const DOC = { name: "deed.pdf", size: 2048, sha256: "a".repeat(64), addedAt: "2026-10-18T02:10:00.000Z" };
const NOTARIZED = {
  act: { type: "acknowledgment" as const, typeLabel: "Acknowledgment", description: "Deed", place: "Naga City", at: "2026-10-18T02:30:00.000Z", registerRef: "2026-0001", notaryName: "Aiyana Cruz" },
  notarized: { size: 3000, sha256: "b".repeat(64), originalSha256: "a".repeat(64), code: "LAGDA-NOT-ABCD-2345", verifyUrl: "https://lagda.io/verify-notarized?code=LAGDA-NOT-ABCD-2345" },
};

beforeEach(() => {
  for (const fn of Object.values(svc)) fn.mockReset();
  svc.messages.mockResolvedValue([]);
  svc.copies.mockResolvedValue([]);
  svc.auditTrail.mockResolvedValue({ reference: "EN-2026-000004", clientName: "Rosa Villanueva", notaryName: "Aiyana Cruz", role: "client", entries: [] });
  svc.ping.mockImplementation(() => Promise.resolve(svc.get.getMockImplementation() === undefined ? null : undefined));
  svc.document.mockResolvedValue(new Blob(["%PDF-1.7"], { type: "application/pdf" }));
  svc.notarized.mockResolvedValue(new Blob(["%PDF-1.7"], { type: "application/pdf" }));
  URL.createObjectURL = vi.fn(() => "blob:test");
  URL.revokeObjectURL = vi.fn();
});

const room = (initial = "/app/enotary/room/eni_1") => render(
  <MemoryRouter initialEntries={[initial]}><Routes><Route path="/app/enotary/room/:invitationId" element={<RoomPage />} /></Routes></MemoryRouter>,
);

describe("the session panel on a request", () => {
  it("shows nothing when the feature is not offered", async () => {
    svc.lookup.mockResolvedValue(null);
    const { container } = render(<MemoryRouter><SessionPanel invitationId="eni_1" role="client" /></MemoryRouter>);
    await waitFor(() => { expect(svc.lookup).toHaveBeenCalled(); });
    expect(container).toBeEmptyDOMElement();
  });

  it("waits for the fee, and says so to each side", async () => {
    svc.lookup.mockResolvedValue({ session: null, canStart: false, reason: "payment_pending" });
    render(<MemoryRouter><SessionPanel invitationId="eni_1" role="client" /></MemoryRouter>);
    expect(await screen.findByTestId("session-wait-fee")).toHaveTextContent(/once the notary's fee is paid and confirmed/);
  });

  it("lets the client start the session, and then go to the room", async () => {
    const user = userEvent.setup();
    svc.lookup.mockResolvedValueOnce({ session: null, canStart: true, reason: null })
      .mockResolvedValue({ session: session(), canStart: false, reason: null });
    svc.start.mockResolvedValue(session());
    render(<MemoryRouter><SessionPanel invitationId="eni_1" role="client" /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Start the session" }));
    expect(svc.start).toHaveBeenCalledWith("eni_1");
    expect(await screen.findByRole("link", { name: /Go to the room/ })).toHaveAttribute("href", "/app/enotary/room/eni_1");
    expect(screen.getByTestId("session-state")).toHaveTextContent(/Add your document/);
  });

  it("tells the notary the client has not started, and offers no button", async () => {
    svc.lookup.mockResolvedValue({ session: null, canStart: true, reason: null });
    render(<MemoryRouter><SessionPanel invitationId="eni_1" role="notary" /></MemoryRouter>);
    expect(await screen.findByTestId("session-wait-client")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start the session" })).toBeNull();
  });

  it("lets the client email the notary to continue a called-off session, from the session panel, and shows what the server says", async () => {
    const user = userEvent.setup();
    svc.lookup.mockResolvedValue({ session: session({ status: "cancelled", cancelledBy: "client", endedAt: "2026-10-18T02:40:00.000Z" }), canStart: false, reason: null });
    svc.requestReopen.mockResolvedValueOnce(session({ status: "cancelled", cancelledBy: "client" }))
      .mockRejectedValueOnce(new ApiError(409, { code: "session_state", message: "You asked the notary a moment ago. Please wait a few minutes before asking again." }, "x"));
    render(<MemoryRouter><SessionPanel invitationId="eni_1" role="client" /></MemoryRouter>);
    expect(await screen.findByTestId("session-cancelled")).toHaveTextContent(/You called off the session/);
    await user.click(screen.getByRole("button", { name: /Email Aiyana Cruz to continue/ }));
    await waitFor(() => { expect(svc.requestReopen).toHaveBeenCalledWith("ens_1"); });
    expect(await screen.findByTestId("reopen-said")).toHaveTextContent(/emailed Aiyana Cruz/);
    await user.click(screen.getByRole("button", { name: /Email Aiyana Cruz to continue/ }));
    expect(await screen.findByText(/wait a few minutes/)).toBeInTheDocument();
  });

  it("lets the notary open a called-off session again", async () => {
    const user = userEvent.setup();
    svc.lookup.mockResolvedValue({ session: session({ role: "notary", status: "cancelled", cancelledBy: "client", endedAt: "2026-10-18T02:40:00.000Z" }), canStart: false, reason: null });
    svc.reopen.mockImplementation(() => {
      const open = session({ role: "notary", status: "preparing" });
      svc.lookup.mockResolvedValue({ session: open, canStart: false, reason: null });
      return Promise.resolve(open);
    });
    render(<MemoryRouter><SessionPanel invitationId="eni_1" role="notary" /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Open the session again" }));
    await waitFor(() => { expect(svc.reopen).toHaveBeenCalledWith("ens_1"); });
    expect(await screen.findByRole("link", { name: /Go to the room/ })).toBeInTheDocument();
  });

  it("says how a called-off session ended, and what a notarized one holds", async () => {
    svc.lookup.mockResolvedValue({ session: session({ status: "cancelled", cancelledBy: "notary", endedAt: "2026-10-18T02:40:00.000Z" }), canStart: false, reason: null });
    const view = render(<MemoryRouter><SessionPanel invitationId="eni_1" role="client" /></MemoryRouter>);
    expect(await screen.findByTestId("session-cancelled")).toHaveTextContent(/Aiyana Cruz called off the session.*Nothing was notarized/);
    view.unmount();
    svc.lookup.mockResolvedValue({ session: session({ status: "notarized", document: DOC, ...NOTARIZED }), canStart: false, reason: null });
    render(<MemoryRouter><SessionPanel invitationId="eni_1" role="client" /></MemoryRouter>);
    expect(await screen.findByTestId("session-notarized")).toHaveTextContent(/register entry 2026-0001 · code LAGDA-NOT-ABCD-2345/);
    expect(await screen.findByTestId("copies-panel")).toBeInTheDocument();
  });
});

describe("the room", () => {
  it("says there is no session when there is none, and when the feature is off", async () => {
    svc.lookup.mockResolvedValue({ session: null, canStart: false, reason: "payment_pending" });
    const view = room();
    expect(await screen.findByText(/once the notary's fee is settled/)).toBeInTheDocument();
    view.unmount();
    svc.lookup.mockResolvedValue(null);
    room();
    expect(await screen.findByText(/Not available on this account yet/)).toBeInTheDocument();
  });

  it("has the client add a PDF, names the pilot, and keeps the video until the room is open", async () => {
    const user = userEvent.setup();
    svc.lookup.mockResolvedValue({ session: session(), canStart: false, reason: null });
    svc.get.mockResolvedValue(session());
    svc.ping.mockResolvedValue(session());
    svc.addDocument.mockResolvedValue(session({ document: DOC }));
    room();
    expect(await screen.findByTestId("pilot-notice")).toHaveTextContent(/Accreditation is pending/);
    expect(screen.queryByTestId("video-panel")).toBeNull();
    const file = new File(["%PDF-1.7"], "deed.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText("PDF of the document"), file);
    await user.click(screen.getByRole("button", { name: "Add the document" }));
    expect(svc.addDocument).toHaveBeenCalledWith("ens_1", file);
    expect(await screen.findByTestId("document-info")).toHaveTextContent(/deed\.pdf/);
  });

  it("lets the client choose a document that was shared with them, from the Shared documents tab", async () => {
    const user = userEvent.setup();
    const live = session({ status: "live" });
    svc.lookup.mockResolvedValue({ session: live, canStart: false, reason: null });
    svc.get.mockResolvedValue(live); svc.ping.mockResolvedValue(live);
    sharedWithMe.mockResolvedValue([
      { id: "sh_1", documentTitle: "Lease Contract", completedAt: "2026-10-10T01:00:00.000Z", owner: { displayName: "Acme" }, sharedBy: { displayName: "Ana" }, actions: ["open"] },
      { id: "sh_2", documentTitle: "Still signing", completedAt: null, owner: { displayName: "Acme" }, sharedBy: null, actions: ["open"] },
    ]);
    sharedDocumentFile.mockResolvedValue(new Blob(["%PDF-1.7"], { type: "application/pdf" }));
    svc.addDocument.mockResolvedValue({ ...live, document: DOC });
    room();
    await user.click(await screen.findByRole("tab", { name: "Shared documents" }));
    expect(await screen.findAllByTestId("shared-option")).toHaveLength(1);
    expect(screen.getByText(/Shared by Ana/)).toBeInTheDocument();
    await user.click(screen.getByTestId("shared-option"));
    await user.click(screen.getByRole("button", { name: "Use this document" }));
    await waitFor(() => { expect(svc.addDocument).toHaveBeenCalled(); });
    expect(sharedDocumentFile).toHaveBeenCalledWith("sh_1");
    const file = svc.addDocument.mock.calls[0]?.[1] as File;
    expect(file.name).toBe("Lease Contract.pdf");
  });

  describe("a notarized request", () => {
    const placed = { ...NOTARIZED, act: { ...NOTARIZED.act, docNo: 4, pageNo: 1, bookNo: "I", series: 2026 } };
    const valid = { state: "notarization", code: "LAGDA-NOT-ABCD-2345", actLabel: "Acknowledgment", notaryName: "Aiyana Cruz", registerRef: "2026-0004", performedAt: "2026-10-18T02:30:00.000Z", notarizedSha256: "b".repeat(64), originalSha256: "a".repeat(64) };

    it("moves to step 8 while a certified copy is on its way, and ticks every step once it is received", async () => {
      svc.lookup.mockResolvedValue({ session: session({ status: "notarized", document: DOC, ...placed }), canStart: false, reason: null });
      svc.verify.mockResolvedValue(valid);
      svc.copies.mockResolvedValue([copy({ status: "paid", mode: "physical", copies: 1, feeCentavos: 0 })]);
      const { unmount } = room();
      const rail = await screen.findByRole("list", { name: "Steps of this request" });
      await waitFor(() => { expect(within(rail).getByText("Certified True Copy").closest("li")).toHaveClass("is-now"); });
      unmount();
      svc.copies.mockResolvedValue([copy({ status: "received", mode: "physical", copies: 1, feeCentavos: 0 })]);
      room();
      expect(await screen.findByRole("heading", { name: "Your eNotary request is complete" })).toBeInTheDocument();
      const done = screen.getByRole("list", { name: "Steps of this request" });
      expect(within(done).queryByText("Certified True Copy")?.closest("li")).not.toHaveClass("is-now");
      expect(within(done).getAllByRole("listitem").filter(item => item.classList.contains("is-now"))).toHaveLength(0);
    });

    it("shows the document, its register place, the seal with its fingerprint and QR, and says the seal is valid", async () => {
      svc.lookup.mockResolvedValue({ session: session({ status: "notarized", document: DOC, ...placed }), canStart: false, reason: null });
      svc.verify.mockResolvedValue(valid);
      room();
      expect(await screen.findByTestId("notarized-facts")).toHaveTextContent("Doc. No. 4; Page No. 1; Book No. I; Series of 2026.");
      expect(screen.getByTestId("verify-code")).toHaveTextContent("LAGDA-NOT-ABCD-2345");
      expect(screen.getByTestId("fingerprint")).toHaveTextContent("b".repeat(64));
      expect(await screen.findByTestId("verify-qr")).toHaveAttribute("src", "data:image/png;base64,AAAA");
      await waitFor(() => { expect(screen.getByTestId("seal-status")).toHaveAttribute("data-state", "valid"); });
      expect(screen.getByTestId("seal-status")).toHaveTextContent("Seal valid");
      expect(svc.verify).toHaveBeenCalledWith("LAGDA-NOT-ABCD-2345");
      // The client may ask for a certified true copy from here.
      expect(await screen.findByTestId("copies-panel")).toBeInTheDocument();
    });

    it("does not say the seal is valid when the public check disagrees with the file", async () => {
      svc.lookup.mockResolvedValue({ session: session({ status: "notarized", document: DOC, ...placed }), canStart: false, reason: null });
      svc.verify.mockResolvedValue({ ...valid, notarizedSha256: "c".repeat(64) });
      room();
      await waitFor(() => { expect(screen.getByTestId("seal-status")).toHaveAttribute("data-state", "invalid"); });
      expect(screen.getByTestId("seal-status")).toHaveTextContent("could not be confirmed");
    });

    it("compares a file here, without sending it", async () => {
      const user = userEvent.setup();
      const bytes = new TextEncoder().encode("%PDF-1.7 sealed");
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
      svc.lookup.mockResolvedValue({ session: session({ status: "notarized", document: DOC, ...placed, notarized: { ...placed.notarized, sha256: digest } }), canStart: false, reason: null });
      svc.verify.mockResolvedValue({ ...valid, notarizedSha256: digest });
      room();
      const input = await screen.findByLabelText("PDF to check");
      await user.upload(input, new File([bytes], "copy.pdf", { type: "application/pdf" }));
      expect(await screen.findByTestId("check-result")).toHaveAttribute("data-match", "true");
      await user.upload(input, new File([new TextEncoder().encode("different")], "other.pdf", { type: "application/pdf" }));
      await waitFor(() => { expect(screen.getByTestId("check-result")).toHaveAttribute("data-match", "false"); });
    });
  });

  it("lets the notary open the room before any document is in, since the client chooses it on the call", async () => {
    const user = userEvent.setup();
    const before = session({ role: "notary" });
    svc.lookup.mockResolvedValue({ session: before, canStart: false, reason: null });
    svc.get.mockResolvedValue(before); svc.ping.mockResolvedValue(before);
    const live = session({ role: "notary", status: "live", notarizeBlock: "no_document" });
    svc.open.mockImplementation(() => { svc.get.mockResolvedValue(live); svc.ping.mockResolvedValue(live); return Promise.resolve(live); });
    room();
    await user.click(await screen.findByRole("button", { name: "Open the room" }));
    expect(svc.open).toHaveBeenCalledWith("ens_1");
    expect(await screen.findByTestId("video-panel")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Notarize the document" })).toBeNull();
  });

  it("has the client finalize the document, and then wait for the notary's statement", async () => {
    const user = userEvent.setup();
    const live = session({ status: "live", document: DOC, notarizeBlock: "not_final" });
    const final = { ...live, finalizedAt: "2026-10-18T02:15:00.000Z", notarizeBlock: "no_identity" as const };
    svc.lookup.mockResolvedValue({ session: live, canStart: false, reason: null });
    svc.get.mockResolvedValue(live); svc.ping.mockResolvedValue(live);
    svc.finalize.mockImplementation(() => { svc.get.mockResolvedValue(final); svc.ping.mockResolvedValue(final); return Promise.resolve(final); });
    room();
    await user.click(await screen.findByRole("button", { name: "Finalize this document for eNotary" }));
    expect(svc.finalize).toHaveBeenCalledWith("ens_1");
    expect(await screen.findByTestId("finalized-panel")).toHaveTextContent(/not charged before you approve/);
    expect(screen.queryByLabelText("PDF of the document")).toBeNull();
  });

  it("shows the client the stated act and fee, and records the approval with the consent in its words", async () => {
    const user = userEvent.setup();
    const statement = { actType: "acknowledgment" as const, actTypeLabel: "Acknowledgment", feeCentavos: 0, note: "Deed of Sale", statedAt: "2026-10-18T02:20:00.000Z", approvedAt: null };
    const stated = session({ status: "live", document: DOC, finalizedAt: "2026-10-18T02:15:00.000Z", identityConfirmedAt: "2026-10-18T02:18:00.000Z", statement, notarizeBlock: "not_approved" });
    const approved = { ...stated, statement: { ...statement, approvedAt: "2026-10-18T02:22:00.000Z" }, notarizeBlock: null };
    svc.lookup.mockResolvedValue({ session: stated, canStart: false, reason: null });
    svc.get.mockResolvedValue(stated); svc.ping.mockResolvedValue(stated);
    svc.approve.mockImplementation(() => { svc.get.mockResolvedValue(approved); svc.ping.mockResolvedValue(approved); return Promise.resolve(approved); });
    room();
    expect(await screen.findByTestId("stated-fee")).toHaveTextContent("No fee");
    expect(screen.getByTestId("consent-text")).toHaveTextContent(/signing freely/);
    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(svc.approve).toHaveBeenCalledWith("ens_1");
    expect(await screen.findByTestId("approved-note")).toHaveTextContent(/No fee for this request/);
  });

  it("makes the notary confirm identity first, then state the act and a fee, and says what no fee means", async () => {
    const user = userEvent.setup();
    const base = { role: "notary" as const, status: "live" as const, document: DOC, finalizedAt: "2026-10-18T02:15:00.000Z", presence: { client: true, notary: true } };
    const first = session({ ...base, notarizeBlock: "no_identity" });
    const next = session({ ...base, identityConfirmedAt: "2026-10-18T02:18:00.000Z", notarizeBlock: "no_act" });
    svc.lookup.mockResolvedValue({ session: first, canStart: false, reason: null });
    svc.get.mockResolvedValue(first); svc.ping.mockResolvedValue(first);
    svc.confirmIdentity.mockImplementation(() => { svc.get.mockResolvedValue(next); svc.ping.mockResolvedValue(next); return Promise.resolve(next); });
    svc.stateAct.mockResolvedValue({ ...next, statement: { actType: "jurat", actTypeLabel: "Jurat", feeCentavos: 0, note: "Affidavit", statedAt: "2026-10-18T02:19:00.000Z", approvedAt: null } });
    room();
    await user.click(await screen.findByRole("button", { name: "I confirmed their identity on the call" }));
    expect(svc.confirmIdentity).toHaveBeenCalledWith("ens_1");
    const send = await screen.findByRole("button", { name: "Send to the client for approval" });
    expect(send).toBeDisabled();
    await user.click(screen.getByLabelText(/Jurat/));
    await user.type(screen.getByLabelText(/What it is about/), "Affidavit");
    await user.click(screen.getByTestId("no-fee"));
    expect(screen.getByTestId("no-fee-notice")).toHaveTextContent(/cannot be changed/);
    await user.click(send);
    expect(svc.stateAct).toHaveBeenCalledWith("ens_1", { actType: "jurat", feeCentavos: 0, note: "Affidavit" });
  });

  it("lets the notary record the act only with every attestation and the place, using what was approved", async () => {
    const user = userEvent.setup();
    const statement = { actType: "acknowledgment" as const, actTypeLabel: "Acknowledgment", feeCentavos: 0, note: "Deed of Sale", statedAt: "2026-10-18T02:20:00.000Z", approvedAt: "2026-10-18T02:22:00.000Z" };
    const live = session({
      role: "notary", status: "live", document: DOC, notarizeBlock: null, finalizedAt: "2026-10-18T02:15:00.000Z",
      identityConfirmedAt: "2026-10-18T02:18:00.000Z", statement, consent: { text: "x", version: "v1", at: "2026-10-18T02:22:00.000Z" },
    });
    svc.lookup.mockResolvedValue({ session: live, canStart: false, reason: null });
    svc.get.mockResolvedValue(live); svc.ping.mockResolvedValue(live);
    svc.notarize.mockResolvedValue(session({ role: "notary", status: "notarized", document: DOC, ...NOTARIZED }));
    room();
    const go = await screen.findByRole("button", { name: "Notarize the document" });
    expect(go).toBeDisabled();
    // With no signature picture on file, the panel says the block shows none.
    expect(screen.getByTestId("placement-summary")).toHaveTextContent("No signature picture is saved, so the block shows none.");
    expect(screen.queryByLabelText(/Title or description/)).toBeNull();
    // The panel says what it is, formally, and a pill that stays on screen (above a maximised call) leads to it.
    expect(screen.getByTestId("notarize-intro")).toHaveTextContent("Final step: record the notarial act.");
    expect(screen.getByTestId("final-step-banner")).toHaveTextContent("Final step: record the notarial act");
    expect(screen.getByLabelText(/Place of notarization/)).toHaveAttribute("placeholder", "e.g. Naga City, Camarines Sur");
    expect(screen.getByLabelText(/Remarks for your register/)).toHaveAttribute("placeholder", expect.stringContaining("read aloud"));
    const minimised = vi.fn();
    window.addEventListener("enotary:minimise-call", minimised);
    await user.click(screen.getByTestId("final-step-go"));
    expect(minimised).toHaveBeenCalledTimes(1);
    window.removeEventListener("enotary:minimise-call", minimised);
    await user.type(screen.getByLabelText(/Place of notarization/), "Naga City");
    expect(go).toBeDisabled();
    await user.click(screen.getByLabelText("I saw the client."));
    await user.click(screen.getByLabelText("I verified who they are."));
    expect(go).toBeEnabled();
    await user.click(go);
    expect(svc.notarize).toHaveBeenCalledWith("ens_1", {
      actType: "acknowledgment", description: "Deed of Sale", place: "Naga City", attestations: { sawClient: true, knewClient: true },
    });
    expect(await screen.findByTestId("verify-code")).toHaveTextContent("LAGDA-NOT-ABCD-2345");
    expect(screen.getByTestId("notarized-facts")).toHaveTextContent(/Entry 2026-0001/);
  });

  it("says nothing about the signature picture until the server has answered whether there is one", async () => {
    const statement = { actType: "acknowledgment" as const, actTypeLabel: "Acknowledgment", feeCentavos: 0, note: "Deed of Sale", statedAt: "2026-10-18T02:20:00.000Z", approvedAt: "2026-10-18T02:22:00.000Z" };
    const live = session({
      role: "notary", status: "live", document: DOC, notarizeBlock: null, finalizedAt: "2026-10-18T02:15:00.000Z",
      identityConfirmedAt: "2026-10-18T02:18:00.000Z", statement, consent: { text: "x", version: "v1", at: "2026-10-18T02:22:00.000Z" },
    });
    svc.lookup.mockResolvedValue({ session: live, canStart: false, reason: null });
    svc.get.mockResolvedValue(live); svc.ping.mockResolvedValue(live);
    svc.signature.mockReturnValue(new Promise(() => undefined));
    room();
    expect(await screen.findByTestId("placement-summary")).toHaveTextContent("Across the foot of the last page.");
    expect(screen.getByTestId("placement-summary")).not.toHaveTextContent("No signature picture");
  });

  it("says why the server refused an act, in words", async () => {
    const user = userEvent.setup();
    const statement = { actType: "acknowledgment" as const, actTypeLabel: "Acknowledgment", feeCentavos: 0, note: "Deed", statedAt: "2026-10-18T02:20:00.000Z", approvedAt: "2026-10-18T02:22:00.000Z" };
    const live = session({
      role: "notary", status: "live", document: DOC, notarizeBlock: null, finalizedAt: "2026-10-18T02:15:00.000Z",
      identityConfirmedAt: "2026-10-18T02:18:00.000Z", statement,
    });
    svc.lookup.mockResolvedValue({ session: live, canStart: false, reason: null });
    svc.get.mockResolvedValue(live); svc.ping.mockResolvedValue(live);
    const { ApiError } = await import("../../../../../services/api-client");
    svc.notarize.mockRejectedValue(new ApiError(409, { code: "notarize_blocked", message: "x", details: [{ code: "client_absent", message: "x" }] }, "x"));
    room();
    await user.type(await screen.findByLabelText(/Place of notarization/), "Naga");
    await user.click(screen.getByLabelText("I saw the client."));
    await user.click(screen.getByLabelText("I verified who they are."));
    await user.click(screen.getByRole("button", { name: "Notarize the document" }));
    expect(await screen.findByText(/has not been in the room in the last two minutes/)).toBeInTheDocument();
  });

  it("keeps what the notary wrote and ticked when the room's layout draws the act's panel anew", async () => {
    const user = userEvent.setup();
    const statement = { actType: "acknowledgment" as const, actTypeLabel: "Acknowledgment", feeCentavos: 0, note: "Deed", statedAt: "2026-10-18T02:20:00.000Z", approvedAt: "2026-10-18T02:22:00.000Z" };
    const live = session({ id: "ens_draft", role: "notary", status: "live", document: DOC, notarizeBlock: null, statement });
    const { unmount } = render(<MemoryRouter><NotarizePanel session={live} busy={false} onRecord={() => Promise.resolve()} /></MemoryRouter>);
    await user.type(screen.getByLabelText(/Place of notarization/), "Naga City");
    await user.type(screen.getByLabelText(/Remarks for your register/), "Read aloud");
    await user.click(screen.getByLabelText("I saw the client."));
    unmount();
    render(<MemoryRouter><NotarizePanel session={live} busy={false} onRecord={() => Promise.resolve()} /></MemoryRouter>);
    expect(screen.getByLabelText(/Place of notarization/)).toHaveValue("Naga City");
    expect(screen.getByLabelText(/Remarks for your register/)).toHaveValue("Read aloud");
    expect(screen.getByLabelText("I saw the client.")).toBeChecked();
    expect(screen.getByLabelText("I verified who they are.")).not.toBeChecked();
  });

  // 128. Where the parties are (Rule III).
  const located = (place: string, at: string) => ({ outcome: "within" as const, reason: null, place, accuracyM: 20, at, words: `Within the Philippines: ${place}` });

  it("holds the session while a party's location is missing, and says so to both, with the card to share it", async () => {
    const live = session({
      status: "live", document: DOC, notarizeBlock: "not_final",
      location: { required: true, client: null, notary: located("Taguig City, Metro Manila", "2026-10-18T02:05:00.000Z"), recheckRequestedAt: null, block: "client_location_missing", actLine: null },
    });
    svc.lookup.mockResolvedValue({ session: live, canStart: false, reason: null });
    svc.get.mockResolvedValue(live); svc.ping.mockResolvedValue(live);
    room();
    expect(await screen.findByTestId("location-hold")).toHaveTextContent("Share your location to go on: every party must be in the Philippines");
    expect(screen.getByTestId("location-panel")).toBeInTheDocument();
    expect(screen.getByTestId("location-theirs")).toHaveTextContent("Atty. Aiyana Cruz: within the Philippines: Taguig City, Metro Manila");
    // The card waits behind its button above the audit trail's; the hold notice opens it too.
    expect(screen.getByTestId("locator-overlay")).not.toBeVisible();
    expect(screen.getByTestId("locator-toggle")).toHaveAttribute("data-tone", "wait");
    await userEvent.setup().click(screen.getByTestId("location-hold-open"));
    expect(screen.getByRole("dialog", { name: "Location verification" })).toBeVisible();
  });

  it("checks both locations again just before the act, and takes the place of notarization from the notary's", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: (ok: PositionCallback) => { ok({ coords: { latitude: 14.52, longitude: 121.05, accuracy: 20 } } as GeolocationPosition); } } });
    const statement = { actType: "acknowledgment" as const, actTypeLabel: "Acknowledgment", feeCentavos: 0, note: "Deed", statedAt: "2026-10-18T02:20:00.000Z", approvedAt: "2026-10-18T02:22:00.000Z" };
    const location = {
      required: true, client: located("Naga City, Camarines Sur", "2026-10-18T02:10:00.000Z"), notary: located("Taguig City, Metro Manila", "2026-10-18T02:10:00.000Z"),
      recheckRequestedAt: null, block: null, actLine: null,
    };
    // The checks are older than three minutes: the act's own block says so, and pressing the button checks again.
    const live = session({
      id: "ens_geo", role: "notary", status: "live", document: DOC, notarizeBlock: "client_location", finalizedAt: "2026-10-18T02:15:00.000Z",
      identityConfirmedAt: "2026-10-18T02:18:00.000Z", statement, location,
    });
    svc.lookup.mockResolvedValue({ session: live, canStart: false, reason: null });
    svc.get.mockResolvedValue(live); svc.ping.mockResolvedValue(live);
    const asked = { ...live, location: { ...location, recheckRequestedAt: "2026-10-18T02:30:00.000Z" } };
    svc.requestLocationRecheck.mockResolvedValue(asked);
    svc.checkLocation.mockResolvedValue({ ...asked, location: { ...asked.location, notary: located("Taguig City, Metro Manila", "2026-10-18T02:30:02.000Z") } });
    svc.notarize.mockResolvedValue(session({ role: "notary", status: "notarized", document: DOC, ...NOTARIZED }));
    room();
    expect(await screen.findByLabelText(/Place of notarization/)).toHaveValue("Taguig City, Metro Manila");
    expect(screen.queryByTestId("notarize-block")).toBeNull();
    await user.click(screen.getByLabelText("I saw the client."));
    await user.click(screen.getByLabelText("I verified who they are."));
    const go = screen.getByRole("button", { name: "Notarize the document" });
    expect(go).toBeEnabled();
    // The client's device answers the request by itself; the room sees its fresh check.
    svc.get.mockResolvedValue({ ...asked, location: { ...asked.location, client: located("Naga City, Camarines Sur", "2026-10-18T02:30:05.000Z") } });
    await user.click(go);
    await waitFor(() => { expect(svc.notarize).toHaveBeenCalledWith("ens_geo", expect.objectContaining({ place: "Taguig City, Metro Manila" })); });
    expect(svc.requestLocationRecheck).toHaveBeenCalledWith("ens_geo");
    expect(svc.checkLocation).toHaveBeenCalledWith("ens_geo", { latitude: 14.52, longitude: 121.05, accuracy: 20 });
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined });
  });
});

describe("certified true copies", () => {
  it("lets the client ask for a digital copy, and for printed ones only with a delivery address", async () => {
    const user = userEvent.setup();
    svc.requestCopy.mockResolvedValue(copy());
    render(<CopiesPanel sessionId="ens_1" role="client" />);
    await user.click(await screen.findByRole("button", { name: "Ask the notary for copies" }));
    expect(svc.requestCopy).toHaveBeenCalledWith("ens_1", { mode: "digital" });
    expect(await screen.findByTestId("copy-status")).toHaveTextContent(/Waiting for the notary's fee/);
  });

  it("asks for the delivery details of printed copies", async () => {
    const user = userEvent.setup();
    render(<CopiesPanel sessionId="ens_1" role="client" />);
    await user.click(await screen.findByLabelText("Printed certified copies, sent by courier"));
    const ask = screen.getByRole("button", { name: "Ask the notary for copies" });
    expect(ask).toBeDisabled();
    await user.type(screen.getByLabelText(/Send to \(name\)/), "Rosa");
    await user.type(screen.getByLabelText(/Phone number/), "0917 000 0000");
    await user.type(screen.getByLabelText(/Delivery address/), "12 Rizal St");
    expect(ask).toBeEnabled();
  });

  it("shows the fee and the notary's QR when quoted, and sends only the reference", async () => {
    const user = userEvent.setup();
    svc.copies.mockResolvedValue([copy({ status: "quoted", feeCentavos: 20_000, payee: { name: "ATTY CRUZ", city: null }, qrPayload: "0002010102116304ABCD" })]);
    svc.sendProof.mockResolvedValue(copy({ status: "payment_sent", feeCentavos: 20_000, reference: "GC-11112222" }));
    render(<CopiesPanel sessionId="ens_1" role="client" />);
    expect(await screen.findByTestId("copy-pay")).toHaveTextContent(/Pay ATTY CRUZ/);
    await user.type(screen.getByLabelText("Reference number of your transfer"), "GC-11112222");
    await user.click(screen.getByRole("button", { name: "I have paid" }));
    expect(svc.sendProof).toHaveBeenCalledWith("ctc_1", "GC-11112222");
    expect(await screen.findByTestId("copy-waiting")).toHaveTextContent(/GC-11112222/);
  });

  it("has the notary quote in pesos, confirm a payment, and issue a copy", async () => {
    const user = userEvent.setup();
    svc.copies.mockResolvedValue([copy()]);
    svc.quote.mockResolvedValue(copy({ status: "quoted", feeCentavos: 20_000 }));
    render(<CopiesPanel sessionId="ens_1" role="notary" />);
    await user.type(await screen.findByLabelText(/Fee for these copies/), "200");
    await user.click(screen.getByRole("button", { name: "Send the fee" }));
    expect(svc.quote).toHaveBeenCalledWith("ctc_1", 20_000);
  });

  it("has the notary confirm a transfer from their own app, then issue", async () => {
    const user = userEvent.setup();
    svc.copies.mockResolvedValue([copy({ status: "payment_sent", feeCentavos: 20_000, reference: "GC-1111" })]);
    svc.confirmPayment.mockResolvedValue(copy({ status: "paid", feeCentavos: 20_000 }));
    svc.fulfil.mockResolvedValue(copy({ status: "fulfilled", hasFile: true, verificationCode: "LAGDA-CTC-AAAA-BBBB" }));
    render(<CopiesPanel sessionId="ens_1" role="notary" />);
    expect(await screen.findByTestId("copy-proof")).toHaveTextContent(/GC-1111.*own bank or e-wallet app/);
    await user.click(screen.getByRole("button", { name: "I received it" }));
    await user.click(await screen.findByRole("button", { name: "Issue the copy" }));
    expect(svc.fulfil).toHaveBeenCalledWith("ctc_1", undefined);
    expect(await screen.findByTestId("copy-code")).toHaveTextContent("LAGDA-CTC-AAAA-BBBB");
  });

  it("shows the client where printed copies are, with the courier's tracking number, and lets them confirm receipt", async () => {
    const user = userEvent.setup();
    const sent = copy({ status: "fulfilled", mode: "physical", copies: 2, feeCentavos: 0, shipment: { courier: "LBC", trackingNo: "123456" }, stage: "delivered", stageAt: "2026-10-18T05:00:00.000Z" });
    svc.copies.mockResolvedValue([sent]);
    svc.received.mockResolvedValue({ ...sent, status: "received" });
    render(<CopiesPanel sessionId="ens_1" role="client" />);
    const journey = await screen.findByTestId("copy-journey");
    expect(journey).toHaveAttribute("data-done", "6");
    expect(within(journey).getByText("Delivered").closest("li")).toHaveAttribute("data-state", "current");
    expect(within(journey).getByText("Received").closest("li")).toHaveAttribute("data-state", "todo");
    expect(screen.getByTestId("copy-tracking")).toHaveTextContent(/LBC.*123456/);
    expect(screen.getByTestId("copy-delivered")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "I received them" }));
    expect(await screen.findByTestId("copy-journey")).toHaveAttribute("data-done", "7");
  });

  it("gives the notary one next step at a time: prepared, then in transit, out for delivery, delivered", async () => {
    const user = userEvent.setup();
    svc.copies.mockResolvedValue([copy({ status: "paid", mode: "physical", feeCentavos: 0, delivery: { name: "Rosa", phone: "0917", address: "12 Rizal St" } })]);
    svc.setStage.mockResolvedValue(copy({ status: "paid", mode: "physical", feeCentavos: 0, stage: "prepared", delivery: { name: "Rosa", phone: "0917", address: "12 Rizal St" } }));
    render(<CopiesPanel sessionId="ens_1" role="notary" />);
    await user.click(await screen.findByRole("button", { name: "Mark as prepared" }));
    expect(svc.setStage).toHaveBeenCalledWith("ctc_1", "prepared");
    await waitFor(() => { expect(screen.queryByRole("button", { name: "Mark as prepared" })).toBeNull(); });
    expect(screen.getByTestId("copy-journey")).toHaveAttribute("data-done", "2");
  });

  it("offers a notary the next courier step once the copy is with the courier, and none after delivery", async () => {
    const user = userEvent.setup();
    const base = { status: "fulfilled" as const, mode: "physical" as const, feeCentavos: 0, shipment: { courier: "LBC", trackingNo: "123456" } };
    svc.copies.mockResolvedValue([copy({ ...base, stage: "handed" })]);
    svc.setStage.mockResolvedValue(copy({ ...base, stage: "in_transit" }));
    render(<CopiesPanel sessionId="ens_1" role="notary" />);
    await user.click(await screen.findByRole("button", { name: "Mark as in transit" }));
    expect(svc.setStage).toHaveBeenCalledWith("ctc_1", "in_transit");
    expect(await screen.findByRole("button", { name: "Mark as out for delivery" })).toBeInTheDocument();
  });

  it("asks a notary for the courier and tracking number of printed copies", async () => {
    const user = userEvent.setup();
    svc.copies.mockResolvedValue([copy({ status: "paid", mode: "physical", copies: 2, feeCentavos: 0, delivery: { name: "Rosa", phone: "0917", address: "12 Rizal St" } })]);
    svc.fulfil.mockResolvedValue(copy({ status: "fulfilled", mode: "physical", shipment: { courier: "LBC", trackingNo: "123456" } }));
    render(<CopiesPanel sessionId="ens_1" role="notary" />);
    expect(await screen.findByTestId("copy-delivery")).toHaveTextContent(/12 Rizal St/);
    const send = screen.getByRole("button", { name: "Mark as sent" });
    expect(send).toBeDisabled();
    await user.type(screen.getByLabelText(/Courier/), "LBC");
    await user.type(screen.getByLabelText(/Tracking number/), "123456");
    await user.click(send);
    expect(svc.fulfil).toHaveBeenCalledWith("ctc_1", { courier: "LBC", trackingNo: "123456" });
    expect(await screen.findByTestId("copy-shipment")).toHaveTextContent(/LBC.*123456/);
  });
});

describe("the public check", () => {
  const at = (code: string) => render(
    <MemoryRouter initialEntries={[`/verify-notarized?code=${code}`]}><Routes><Route path="/verify-notarized" element={<VerifyNotarizedPage />} /></Routes></MemoryRouter>,
  );

  it("checks the code in the address and shows what the server said", async () => {
    svc.verify.mockResolvedValue({
      state: "notarization", code: "LAGDA-NOT-ABCD-2345", actLabel: "Acknowledgment", notaryName: "Aiyana Cruz", registerRef: "2026-0001",
      performedAt: "2026-10-18T02:30:00.000Z", notarizedSha256: "b".repeat(64), originalSha256: "a".repeat(64),
    });
    at("LAGDA-NOT-ABCD-2345");
    expect(await screen.findByTestId("verify-facts")).toHaveTextContent(/Acknowledgment before Atty\. Aiyana Cruz.*2026-0001/);
    expect(svc.verify).toHaveBeenCalledWith("LAGDA-NOT-ABCD-2345");
  });

  it("says plainly when nothing matches", async () => {
    svc.verify.mockResolvedValue({ state: "unknown" });
    at("LAGDA-NOT-AAAA-BBBB");
    expect(await screen.findByTestId("verify-unknown")).toHaveTextContent(/No notarization or certified copy matches/);
  });

  it("compares a file here, without sending it", async () => {
    const user = userEvent.setup();
    const bytes = new TextEncoder().encode("%PDF-1.7 sample");
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
    svc.verify.mockResolvedValue({
      state: "notarization", code: "LAGDA-NOT-ABCD-2345", actLabel: "Jurat", notaryName: "Aiyana Cruz", registerRef: "2026-0002",
      performedAt: "2026-10-18T02:30:00.000Z", notarizedSha256: digest, originalSha256: "a".repeat(64),
    });
    at("LAGDA-NOT-ABCD-2345");
    const input = await screen.findByLabelText(/Compare a file you hold/);
    await user.upload(input, new File([bytes], "copy.pdf", { type: "application/pdf" }));
    expect(await screen.findByTestId("verify-compare")).toHaveAttribute("data-match", "true");
    await user.upload(input, new File([new TextEncoder().encode("different")], "other.pdf", { type: "application/pdf" }));
    await waitFor(() => { expect(screen.getByTestId("verify-compare")).toHaveAttribute("data-match", "false"); });
  });
});

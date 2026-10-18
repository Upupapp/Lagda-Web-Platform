// The session's pages: the panel on a request, the room, the certified copies
// and the public check. The service is stubbed; what is tested is what a
// person sees and can do in each state the server may report.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

const svc = {
  lookup: vi.fn(), start: vi.fn(), get: vi.fn(), ping: vi.fn(), addDocument: vi.fn(), open: vi.fn(), consent: vi.fn(),
  cancel: vi.fn(), notarize: vi.fn(), messages: vi.fn(), say: vi.fn(), document: vi.fn(), notarized: vi.fn(),
  copies: vi.fn(), requestCopy: vi.fn(), quote: vi.fn(), decline: vi.fn(), sendProof: vi.fn(), confirmPayment: vi.fn(),
  paymentNotReceived: vi.fn(), fulfil: vi.fn(), received: vi.fn(), cancelCopy: vi.fn(), copyFile: vi.fn(), verify: vi.fn(),
};
vi.mock("../../../../../services/real/enotary-sessions.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-sessions.service")>()),
  realEnotarySessionsService: new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => (svc as Record<string, (...a: unknown[]) => unknown>)[name]?.(...args) }),
}));
vi.mock("../useRoomConnection", () => ({
  useRoomConnection: () => ({ media: "ready", link: "waiting", local: null, remote: null, micOn: true, camOn: true, toggleMic: vi.fn(), toggleCam: vi.fn(), retry: vi.fn() }),
}));
vi.mock("../../payments/payment-qr", async (original) => ({
  ...(await original<typeof import("../../payments/payment-qr")>()),
  qrDataUrl: () => Promise.resolve("data:image/png;base64,AAAA"),
}));

import { SessionPanel } from "../SessionPanel";
import { RoomPage } from "../RoomPage";
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

  it("keeps the notary from opening the room without a document, and opens it with one", async () => {
    const user = userEvent.setup();
    svc.lookup.mockResolvedValue({ session: session({ role: "notary" }), canStart: false, reason: null });
    svc.get.mockResolvedValue(session({ role: "notary" }));
    svc.ping.mockResolvedValue(session({ role: "notary" }));
    const view = room();
    expect(await screen.findByTestId("no-document")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open the room" })).toBeDisabled();
    view.unmount();
    const withDoc = session({ role: "notary", document: DOC });
    svc.lookup.mockResolvedValue({ session: withDoc, canStart: false, reason: null });
    svc.get.mockResolvedValue(withDoc); svc.ping.mockResolvedValue(withDoc);
    const live = session({ role: "notary", document: DOC, status: "live", notarizeBlock: "no_consent" });
    svc.open.mockImplementation(() => { svc.get.mockResolvedValue(live); svc.ping.mockResolvedValue(live); return Promise.resolve(live); });
    room();
    await user.click(await screen.findByRole("button", { name: "Open the room" }));
    expect(svc.open).toHaveBeenCalledWith("ens_1");
    expect(await screen.findByTestId("video-panel")).toBeInTheDocument();
    expect(screen.getByTestId("notarize-block")).toHaveTextContent(/not yet confirmed that they are signing freely/);
    expect(screen.getByRole("button", { name: "Notarize the document" })).toBeDisabled();
  });

  it("asks the client to confirm before the act, and records the confirmation", async () => {
    const user = userEvent.setup();
    const live = session({ status: "live", document: DOC, notarizeBlock: "no_consent" });
    svc.lookup.mockResolvedValue({ session: live, canStart: false, reason: null });
    svc.get.mockResolvedValue(live); svc.ping.mockResolvedValue(live);
    svc.consent.mockResolvedValue(session({ status: "live", document: DOC, notarizeBlock: null, consent: { text: "x", version: "v1", at: "2026-10-18T02:20:00.000Z" } }));
    room();
    expect(await screen.findByTestId("consent-text")).toHaveTextContent(/signing freely/);
    await user.click(screen.getByRole("button", { name: "I confirm" }));
    expect(await screen.findByTestId("consent-done")).toBeInTheDocument();
  });

  it("lets the notary record the act only with every attestation and both fields", async () => {
    const user = userEvent.setup();
    const live = session({ role: "notary", status: "live", document: DOC, notarizeBlock: null, consent: { text: "x", version: "v1", at: "2026-10-18T02:20:00.000Z" } });
    svc.lookup.mockResolvedValue({ session: live, canStart: false, reason: null });
    svc.get.mockResolvedValue(live); svc.ping.mockResolvedValue(live);
    svc.notarize.mockResolvedValue(session({ role: "notary", status: "notarized", document: DOC, ...NOTARIZED }));
    room();
    const go = await screen.findByRole("button", { name: "Notarize the document" });
    expect(go).toBeDisabled();
    await user.type(screen.getByLabelText(/Title or description/), "Deed of Sale");
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
    expect(screen.getByTestId("notarized-facts")).toHaveTextContent(/register entry 2026-0001/i);
  });

  it("says why the server refused an act, in words", async () => {
    const user = userEvent.setup();
    const live = session({ role: "notary", status: "live", document: DOC, notarizeBlock: null });
    svc.lookup.mockResolvedValue({ session: live, canStart: false, reason: null });
    svc.get.mockResolvedValue(live); svc.ping.mockResolvedValue(live);
    const { ApiError } = await import("../../../../../services/api-client");
    svc.notarize.mockRejectedValue(new ApiError(409, { code: "notarize_blocked", message: "x", details: [{ code: "client_absent", message: "x" }] }, "x"));
    room();
    await user.type(await screen.findByLabelText(/Title or description/), "Deed");
    await user.type(screen.getByLabelText(/Place of notarization/), "Naga");
    await user.click(screen.getByLabelText("I saw the client."));
    await user.click(screen.getByLabelText("I verified who they are."));
    await user.click(screen.getByRole("button", { name: "Notarize the document" }));
    expect(await screen.findByText(/has not been in the room in the last two minutes/)).toBeInTheDocument();
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

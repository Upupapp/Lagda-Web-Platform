// The waiting room (step 3 of the notary's room page, and the client's matching view) and the client's address for the
// notarial record: what each side sees and can do, from the session the server sends.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

const svc = {
  lookup: vi.fn(), get: vi.fn(), ping: vi.fn(), open: vi.fn(), cancel: vi.fn(), giveAddress: vi.fn(), messages: vi.fn(), auditTrail: vi.fn(),
  document: vi.fn(), signature: vi.fn(),
};
vi.mock("../../../../../services/real/enotary-sessions.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-sessions.service")>()),
  realEnotarySessionsService: new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => (svc as Record<string, (...a: unknown[]) => unknown>)[name]?.(...args) }),
}));
vi.mock("../useRoomConnection", () => ({
  useRoomConnection: () => ({ media: "ready", link: "waiting", local: null, remote: null, micOn: true, camOn: true, toggleMic: vi.fn(), toggleCam: vi.fn(), retry: vi.fn() }),
}));

import { RoomPage } from "../RoomPage";
import { WaitingRoom, readinessOf } from "../WaitingRoom";
import { ClientAddressPanel, ClientAddressView } from "../ClientAddressPanel";
import type { Session } from "../../../../../services/real/enotary-sessions.service";

const session = (over: Partial<Session> = {}): Session => ({
  id: "ens_1", invitationId: "eni_1", role: "notary", status: "preparing", notaryName: "Aiyana Cruz", clientName: "Rosa Villanueva",
  createdAt: "2026-10-18T02:00:00.000Z", openedAt: null, endedAt: null, document: null,
  consent: { text: "I confirm that I am signing freely.", version: "v1", at: null },
  attestations: [{ key: "sawClient", text: "I saw the client." }],
  presence: { client: false, notary: true }, notarizeBlock: "not_live", act: null, notarized: null, cancelledBy: null,
  pilotNotice: "LAGDA eNotary is a pilot.", clientAddress: null, clientIdentity: { verified: true, idType: "Passport" }, ...over,
});
const DOC = { name: "deed.pdf", size: 2048, sha256: "a".repeat(64), addedAt: "2026-10-18T02:10:00.000Z" };
const ADDRESS = { street: "12 Rizal St., Brgy. San Jose", city: "Naga City", province: "Camarines Sur", givenAt: "2026-10-18T02:12:00.000Z" };

beforeEach(() => {
  for (const fn of Object.values(svc)) fn.mockReset();
  svc.messages.mockResolvedValue([]);
  svc.auditTrail.mockResolvedValue({ reference: "EN-2026-000004", clientName: "Rosa Villanueva", notaryName: "Aiyana Cruz", role: "notary", entries: [] });
  svc.document.mockResolvedValue(new Blob(["%PDF-1.7"], { type: "application/pdf" }));
  svc.signature.mockResolvedValue(null);
  URL.createObjectURL = vi.fn(() => "blob:test");
  URL.revokeObjectURL = vi.fn();
});

describe("the readiness checklist", () => {
  it("names the four things, each read from the session", () => {
    const items = readinessOf(session({ presence: { client: true, notary: true }, document: DOC, clientAddress: ADDRESS }), false);
    expect(items.map(item => [item.label, item.done])).toEqual([
      ["Client present", true], ["Document added", true], ["Identity verified by LAGDA", true], ["Client's address given", true],
    ]);
    expect(items[3]?.detail).toBe("12 Rizal St., Brgy. San Jose, Naga City, Camarines Sur");
    const bare = readinessOf(session({ clientIdentity: { verified: false, idType: null } }), false);
    expect(bare.filter(item => item.done)).toHaveLength(0);
  });
});

describe("the waiting room card", () => {
  it("gives the notary the checklist, the steps, and Open the room and Call off the session inside the card", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onCallOff = vi.fn();
    render(<WaitingRoom session={session({ document: DOC })} isClient={false} partner="Rosa Villanueva" busy={null} onOpen={onOpen} onCallOff={onCallOff} />);
    const card = screen.getByTestId("waiting-room");
    expect(within(card).getByRole("heading", { name: "The session with Rosa Villanueva" })).toBeInTheDocument();
    expect(within(card).getByTestId("readiness-count")).toHaveTextContent("2 of 4 ready");
    expect(within(card).getByTestId("readiness-document")).toHaveAttribute("data-done", "yes");
    expect(within(card).getByTestId("readiness-address")).toHaveAttribute("data-done", "no");
    expect(within(card).getByText("Apply your seal")).toBeInTheDocument();
    expect(within(card).getByTestId("waiting-note")).toHaveTextContent(/before every item is ready/);
    // Both in one row, "Open the room" first for a keyboard (it is shown on the right).
    const row = within(card).getByTestId("waiting-actions");
    expect(within(row).getAllByRole("button").map(button => button.textContent)).toEqual(["Open the room", "Call off the session"]);
    await user.click(within(card).getByRole("button", { name: "Open the room" }));
    await user.click(within(card).getByRole("button", { name: "Call off the session" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onCallOff).toHaveBeenCalledTimes(1);
  });

  it("gives the client the same checklist, their own steps, and only Call off the session", () => {
    render(<WaitingRoom session={session({ role: "client", presence: { client: true, notary: false } })} isClient partner="Atty. Aiyana Cruz" busy={null} onCallOff={vi.fn()} />);
    const card = screen.getByTestId("waiting-room");
    expect(within(card).getByRole("heading", { name: "Waiting for Atty. Aiyana Cruz to open the room" })).toBeInTheDocument();
    expect(within(card).getByText("The notary opens the room")).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: "Open the room" })).toBeNull();
    expect(within(card).getByRole("button", { name: "Call off the session" })).toBeInTheDocument();
  });

  it("replaces the one-line notice and the loose buttons on the notary's room page", async () => {
    const before = session({ document: DOC, presence: { client: true, notary: true } });
    svc.lookup.mockResolvedValue({ session: before, canStart: false, reason: null });
    svc.get.mockResolvedValue(before); svc.ping.mockResolvedValue(before);
    render(<MemoryRouter initialEntries={["/app/enotary/room/eni_1"]}><Routes><Route path="/app/enotary/room/:invitationId" element={<RoomPage />} /></Routes></MemoryRouter>);
    const card = await screen.findByTestId("waiting-room");
    expect(screen.queryByTestId("presence-panel")).toBeNull();
    // Each action once, and inside the card.
    expect(screen.getAllByRole("button", { name: "Open the room" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Call off the session" })).toHaveLength(1);
    expect(within(card).getByRole("button", { name: "Open the room" })).toBeInTheDocument();
    expect(within(card).getByRole("heading", { name: "Rosa Villanueva is in the waiting room" })).toBeInTheDocument();
  });
});

describe("the client's address", () => {
  it("is typed in three parts, all required, and saved together, tidied", async () => {
    const user = userEvent.setup();
    const saved = session({ role: "client", clientAddress: ADDRESS });
    const onSave = vi.fn(() => Promise.resolve(saved));
    const onSaved = vi.fn();
    render(<ClientAddressPanel session={session({ role: "client" })} onSave={onSave} onSaved={onSaved} />);
    await user.click(screen.getByRole("button", { name: "Save my address" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert").length).toBe(3);
    await user.type(screen.getByLabelText(/Street or barangay/), "  12 Rizal St.,   Brgy. San Jose ");
    await user.type(screen.getByLabelText(/City or municipality/), "Naga City");
    await user.type(screen.getByLabelText(/Province/), "Camarines Sur");
    await user.click(screen.getByRole("button", { name: "Save my address" }));
    expect(onSave).toHaveBeenCalledWith({ street: "12 Rizal St., Brgy. San Jose", city: "Naga City", province: "Camarines Sur" });
    expect(onSaved).toHaveBeenCalledWith(saved);
  });

  it("shows a saved address with a way to change it, and refuses a character that is not an address's", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ClientAddressPanel session={session({ role: "client", clientAddress: ADDRESS })} onSave={onSave} onSaved={vi.fn()} />);
    expect(screen.getByTestId("address-given")).toHaveTextContent("12 Rizal St., Brgy. San Jose, Naga City, Camarines Sur");
    await user.click(screen.getByRole("button", { name: "Change the address" }));
    const street = screen.getByLabelText(/Street or barangay/);
    await user.clear(street);
    await user.type(street, "<b>home</b>");
    await user.click(screen.getByRole("button", { name: "Save the new address" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/punctuation of an address/);
  });

  it("is shown to the notary as given, or as still to come", () => {
    const { rerender } = render(<ClientAddressView session={session()} />);
    expect(screen.getByTestId("address-missing")).toHaveTextContent(/cannot record the act without it/);
    rerender(<ClientAddressView session={session({ clientAddress: ADDRESS })} />);
    expect(screen.getByTestId("address-given")).toHaveTextContent("12 Rizal St., Brgy. San Jose, Naga City, Camarines Sur");
  });
});

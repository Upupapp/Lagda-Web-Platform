// Step 6 of the client's room as one console: where step 6 stands, the card for what the client does next, and the
// layout for the space it has. Every line comes from the session the server sends.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const approve = vi.fn();
vi.mock("../../../../../services/real/enotary-sessions.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-sessions.service")>()),
  realEnotarySessionsService: { approve: (...args: unknown[]) => approve(...args) as unknown },
}));
vi.mock("../../../../../services/real/enotary-invitations.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-invitations.service")>()),
  realEnotaryInvitationsService: { get: () => Promise.resolve(null) },
}));

import { ClientStepSix, StepSixCard, notaryStepSixStages, stepSixStages } from "../ClientStepSix";
import type { Session } from "../../../../../services/real/enotary-sessions.service";
import type { RoomConnection } from "../useRoomConnection";

const DOC = { name: "deed.pdf", size: 2048, sha256: "a".repeat(64), addedAt: "2026-10-18T02:10:00.000Z" };
const statement = (fee: number, approvedAt: string | null = null) => ({
  actType: "signature_witnessing" as const, actTypeLabel: "Signature witnessing", feeCentavos: fee, note: "Witnessing your signature.",
  statedAt: "2026-10-18T02:20:00.000Z", approvedAt,
});
const session = (over: Partial<Session> = {}): Session => ({
  id: "ens_1", invitationId: "eni_1", role: "client", status: "live", notaryName: "Aiyana Cruz", clientName: "Rosa Villanueva",
  createdAt: "2026-10-18T02:00:00.000Z", openedAt: "2026-10-18T02:05:00.000Z", endedAt: null, document: DOC,
  consent: { text: "I confirm that I am signing freely.", version: "v1", at: null }, attestations: [],
  presence: { client: true, notary: true }, notarizeBlock: null, act: null, notarized: null, cancelledBy: null,
  pilotNotice: "LAGDA eNotary is a pilot.", finalizedAt: "2026-10-18T02:15:00.000Z", identityConfirmedAt: "2026-10-18T02:18:00.000Z",
  statement: null, payment: null, clientIdentity: { verified: true, idType: "Passport" },
  clientAddress: { street: "12 Rizal St.", city: "Naga City", province: "Camarines Sur", givenAt: "2026-10-18T02:12:00.000Z" }, ...over,
});
const connection = { media: "ready", link: "connected", local: null, remote: null, micOn: true, camOn: true, toggleMic: vi.fn(), toggleCam: vi.fn(), retry: vi.fn() } as unknown as RoomConnection;

const width = (matches: { wide: boolean; medium: boolean }) => {
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes("1180") ? matches.wide : matches.medium,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
};

const consoleFor = (s: Session) => render(
  <ClientStepSix
    s={s} partner="Atty. Aiyana Cruz" connection={connection} messages={[]} onSend={() => Promise.resolve()} busy={null}
    act={(_name, work) => work().then(() => undefined)} onChanged={vi.fn()}
    call={<div>the call</div>} viewer={height => <div data-testid="viewer" data-height={height} />} address={<div>the address</div>}
  />,
);

const original = window.matchMedia;
beforeEach(() => { approve.mockReset(); });
afterEach(() => { window.matchMedia = original; });

describe("where step 6 stands", () => {
  it("follows the act and fee, the approval, the payment and the seal", () => {
    expect(stepSixStages(session()).map(stage => stage.state)).toEqual(["now", "todo", "todo", "todo", "todo"]);
    expect(stepSixStages(session({ statement: statement(60_000) })).map(stage => [stage.label, stage.state])).toEqual([
      ["Act and fee stated", "done"], ["You approve", "now"], ["You pay", "todo"], ["Notary confirms", "todo"], ["Notarized", "todo"],
    ]);
    const paying = session({ statement: statement(60_000, "2026-10-18T02:22:00.000Z"), payment: { status: "proof", amountCentavos: 60_000, reference: "R1", attemptsLeft: 4, proofAt: null, decidedAt: null, note: null, payee: null, qrPayload: null } });
    // The payment is aside (2026-10-22): it shows done once it is, but the seal is what is waited for.
    expect(stepSixStages(paying).map(stage => [stage.label, stage.state])).toEqual([
      ["Act and fee stated", "done"], ["You approve", "done"], ["You pay", "done"], ["Notary confirms", "todo"], ["Notarized", "now"],
    ]);
    const unpaid = session({ statement: statement(60_000, "2026-10-18T02:22:00.000Z"), payment: { status: "awaiting", amountCentavos: 60_000, reference: null, attemptsLeft: 5, proofAt: null, decidedAt: null, note: null, payee: null, qrPayload: null } });
    expect(stepSixStages(unpaid).find(stage => stage.state === "now")?.label).toBe("Notarized");
    expect(notaryStepSixStages(unpaid).map(stage => [stage.label, stage.state])).toEqual([
      ["State", "done"], ["Client approves", "done"], ["Payment", "todo"], ["Seal", "now"],
    ]);
  });

  it("leaves the payment out when there is no fee", () => {
    expect(stepSixStages(session({ statement: statement(0) })).map(stage => stage.label)).toEqual(["Act and fee stated", "You approve", "Notarized"]);
  });
});

describe("the step 6 card", () => {
  const card = (s: Session) => render(<StepSixCard s={s} busy={null} act={(_name, work) => work().then(() => undefined)} onChanged={vi.fn()} partner="Atty. Aiyana Cruz" />);

  it("says the notary is reviewing until the act and the fee are stated", () => {
    card(session());
    expect(screen.getByTestId("finalized-panel")).toHaveTextContent(/not charged before you approve/);
  });

  it("shows the stated act and fee for approval, with the consent in its words and what follows", async () => {
    const user = userEvent.setup();
    approve.mockResolvedValue(session({ statement: statement(60_000, "2026-10-18T02:22:00.000Z") }));
    card(session({ statement: statement(60_000) }));
    const panel = screen.getByTestId("approve-panel");
    expect(within(panel).getByText("Needs your approval")).toBeInTheDocument();
    expect(screen.getByTestId("stated-fee")).toHaveTextContent("PHP 600.00");
    expect(screen.getByTestId("consent-text")).toHaveTextContent("I confirm that I am signing freely.");
    expect(screen.getByTestId("s6-next")).toHaveTextContent(/GCash QR/);
    await user.click(screen.getByRole("button", { name: "Approve and pay PHP 600.00" }));
    expect(approve).toHaveBeenCalledWith("ens_1");
  });

  it("says there is nothing to pay when there is no fee", () => {
    card(session({ statement: statement(0) }));
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByTestId("s6-next")).toHaveTextContent(/nothing to pay/);
  });

  it("says the payment arrived once the notary confirms it", () => {
    card(session({ statement: statement(60_000, "2026-10-18T02:22:00.000Z"), payment: { status: "confirmed", amountCentavos: 60_000, reference: "R1", attemptsLeft: 4, proofAt: null, decidedAt: null, note: null, payee: null, qrPayload: null } }));
    expect(screen.getByTestId("approved-note")).toHaveTextContent("The notary confirmed your payment of PHP 600.00.");
  });
});

describe("the console", () => {
  it("shows the room, the people and the client's verified identity from the session", () => {
    width({ wide: true, medium: true });
    consoleFor(session({ statement: statement(60_000) }));
    expect(screen.getByTestId("s6-video")).toHaveTextContent("Video connected");
    expect(screen.getByTestId("s6-partner")).toHaveTextContent("Atty. Aiyana Cruz");
    expect(screen.getByTestId("s6-partner")).toHaveTextContent("Joined");
    expect(screen.getByTestId("s6-self")).toHaveTextContent("Identity verified by LAGDA");
    expect(screen.getByTestId("s6-finalized")).toHaveTextContent(/Finalized by you/);
    expect(screen.getByTestId("document-info")).toHaveTextContent("deed.pdf");
  });

  it("lays itself out in three columns, two, or one, with the step's card right after the call on a phone", () => {
    width({ wide: true, medium: true });
    const { unmount } = consoleFor(session({ statement: statement(60_000) }));
    expect(screen.getByTestId("client-step-six")).toHaveAttribute("data-width", "wide");
    expect(screen.getByTestId("viewer")).toHaveAttribute("data-height", "470");
    unmount();

    width({ wide: false, medium: true });
    const view = consoleFor(session({ statement: statement(60_000) }));
    expect(screen.getByTestId("client-step-six")).toHaveAttribute("data-width", "medium");
    view.unmount();

    width({ wide: false, medium: false });
    consoleFor(session({ statement: statement(60_000) }));
    expect(screen.getByTestId("client-step-six")).toHaveAttribute("data-width", "narrow");
    expect(screen.getByTestId("viewer")).toHaveAttribute("data-height", "380");
    const order = ["video-panel", "approve-panel", "document-panel", "chat-panel"].map(id => screen.getByTestId(id));
    for (let i = 1; i < order.length; i += 1) {
      expect(order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });
});

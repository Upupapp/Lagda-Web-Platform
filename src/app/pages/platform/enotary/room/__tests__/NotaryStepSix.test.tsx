// Step 6 of the notary's room: the console, the document with the notary's own marks, and the card for the act and fee.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../../../../../components/pdf/DocumentPageSurface", () => ({
  useRealDocument: () => ({ status: "ready", doc: {}, pageCount: 2, pageSizes: [{ width: 595, height: 842 }, { width: 595, height: 842 }] }),
  DocumentPageSurface: () => <canvas />,
}));
// The page itself is not drawn here: where the clear space is, is auto-place.test.ts's matter.
vi.mock("../auto-place", () => ({ autoPlacement: () => Promise.resolve({ block: { page: 2, x: 0.5, y: 0.86 } }) }));
const signature = vi.fn();
vi.mock("../../../../../services/real/enotary-sessions.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-sessions.service")>()),
  realEnotarySessionsService: {
    signature: () => signature() as unknown, document: () => Promise.resolve(new Blob(["%PDF-1.7"])),
    savePlacements: () => Promise.resolve({}),
    seal: () => Promise.resolve({ sealName: "Aiyana Cruz", jurisdictionLine: null, officeLine: null, commissionNo: "C-1", commissionValidUntil: "2027-12-31", rollNo: "123", customised: false, updatedAt: null }),
  },
}));
vi.mock("../../../../../services/real/notary-applications.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/notary-applications.service")>()),
  realNotaryApplicationsService: { read: () => Promise.resolve({ application: { office: "Del Rosario & Del Rosario" }, files: [], agreement: { version: "v1", text: "" } }) },
}));

import { NotaryStepSix } from "../NotaryStepSix";
import { NotaryDocumentCard } from "../NotaryDocumentCard";
import { notaryStepSixStages } from "../ClientStepSix";
import type { Session } from "../../../../../services/real/enotary-sessions.service";
import type { RoomConnection } from "../useRoomConnection";

const DOC = { name: "affidavit.pdf", size: 254_000, sha256: "3f9a61c0" + "0".repeat(48) + "8e2dc21e", addedAt: "2026-10-21T12:05:00.000Z" };
const session = (over: Partial<Session> = {}): Session => ({
  id: "ens_1", invitationId: "eni_1", role: "notary", status: "live", notaryName: "Aiyana Cruz", clientName: "Rosa Villanueva",
  createdAt: "2026-10-21T12:00:00.000Z", openedAt: "2026-10-21T12:02:00.000Z", endedAt: null, document: DOC,
  consent: { text: "x", version: "v1", at: null }, attestations: [], presence: { client: true, notary: true }, notarizeBlock: "no_act",
  act: null, notarized: null, cancelledBy: null, pilotNotice: "pilot", finalizedAt: "2026-10-21T12:10:00.000Z",
  identityConfirmedAt: "2026-10-21T12:12:00.000Z", statement: null, payment: null, clientIdentity: { verified: true, idType: "Passport" },
  clientAddress: null, placements: { seal: null, signature: null, savedAt: null }, ...over,
});
const connection = { media: "ready", link: "connected", local: null, remote: null, micOn: true, camOn: true, toggleMic: vi.fn(), toggleCam: vi.fn(), retry: vi.fn() } as unknown as RoomConnection;

const original = window.matchMedia;
const width = (wide: boolean, medium: boolean) => {
  window.matchMedia = vi.fn((query: string) => ({ matches: query.includes("1180") ? wide : medium, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia;
};
beforeEach(() => {
  signature.mockReset();
  signature.mockResolvedValue({ mediaType: "image/png", sizeBytes: 10, updatedAt: "2026-10-01T00:00:00.000Z", image: "iVBORw0KGgo=" });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 340 });
});
afterEach(() => { window.matchMedia = original; });

const card = (s: Session) => render(<MemoryRouter><NotaryDocumentCard s={s} /></MemoryRouter>);

describe("the document with the notary's own mark: the notarial block", () => {
  it("shows the block on the page it sits on, says where in words, and when it was saved", async () => {
    card(session({ placements: { seal: null, signature: null, savedAt: "2026-10-21T12:16:00.000Z", block: { page: 2, x: 0.5, y: 0.8 }, blockOwnPage: false } }));
    expect(await screen.findByTestId("nd-mark-block")).toBeInTheDocument();
    expect(screen.getByTestId("nd-sheet")).toHaveAttribute("data-page", "2");
    expect(screen.getByTestId("block-preview")).toHaveTextContent("Atty. Aiyana Cruz");
    expect(screen.getByTestId("nd-caption")).toHaveTextContent("Page 2, where your notarial block sits");
    expect(screen.getByTestId("nd-block")).toHaveTextContent("Page 2, at the foot");
    expect(screen.getByTestId("nd-block")).toHaveTextContent("Placed");
    expect(screen.getByTestId("nd-saved")).toHaveTextContent(/Saved with the session at .* kept even if the session is called off/);
    expect(screen.getByTestId("nd-review")).toHaveAttribute("href", "/app/enotary/room/eni_1/place");
    expect(screen.getByTestId("nd-finalized")).toHaveTextContent(/Finalized by the client/);
    expect(screen.getByTestId("document-info")).toHaveTextContent("SHA-256 3f9a61c0…8e2dc21e");
    expect(screen.queryByText("Open in a new tab")).toBeNull();
  });

  it("places the block for the notary once the document is final, at the foot of the last page, and says a missing signature picture", async () => {
    signature.mockResolvedValue(null);
    card(session());
    expect(await screen.findByText(/no signature picture is saved/)).toBeInTheDocument();
    expect(screen.getByTestId("nd-sheet")).toHaveAttribute("data-page", "2");
    expect(await screen.findByTestId("nd-auto")).toHaveTextContent("Placed for you at the foot of page 2, below the document's text. Check it and notarize");
    expect(screen.getByTestId("nd-block")).toHaveTextContent("Placed");
    expect(screen.getByRole("link", { name: "Review document, or move the notarial block" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add my signature" })).toHaveAttribute("href", "/app/enotary/seal");
  });

  it("waits for the client to finalize the document before placing the block", async () => {
    signature.mockResolvedValue(null);
    card(session({ id: "ens_waiting", finalizedAt: null }));
    expect(await screen.findByText(/no signature picture is saved/)).toBeInTheDocument();
    expect(screen.getByTestId("nd-block")).toHaveTextContent("Default place");
    expect(screen.getByTestId("nd-saved")).toHaveTextContent("Once the client finalizes the document, your notarial block is placed for you");
    expect(screen.queryByTestId("nd-auto")).toBeNull();
  });

  it("says when the block goes on a page of its own, and shows the last page without it", async () => {
    card(session({ placements: { seal: null, signature: null, savedAt: "2026-10-21T12:16:00.000Z", block: null, blockOwnPage: true } }));
    expect(await screen.findByTestId("nd-caption")).toHaveTextContent("your notarial block goes on a page of its own after it");
    expect(screen.queryByTestId("nd-mark-block")).toBeNull();
    expect(screen.queryByTestId("nd-mark-block-usual")).toBeNull();
    expect(screen.getByTestId("nd-block")).toHaveTextContent("On a page of its own at the end");
  });
});

describe("where the notary's step 6 stands", () => {
  it("follows the statement, the approval, the payment when there is a fee, and the seal", () => {
    expect(notaryStepSixStages(session()).map(stage => `${stage.label}:${stage.state}`)).toEqual(["State:now", "Client approves:todo", "Payment:todo", "Seal:todo"]);
    const free = session({ statement: { actType: "jurat", actTypeLabel: "Jurat", feeCentavos: 0, note: "n", statedAt: "2026-10-21T12:14:00.000Z", approvedAt: null } });
    expect(notaryStepSixStages(free).map(stage => stage.label)).toEqual(["State", "Client approves", "Seal"]);
  });
});

describe("the notary's console", () => {
  const consoleFor = () => render(
    <MemoryRouter>
      <NotaryStepSix s={session()} partner="Rosa Villanueva" connection={connection} messages={[]} onSend={() => Promise.resolve()}
        call={<div>the call</div>} address={<div data-testid="the-address">the address</div>} flow={<div data-testid="the-flow">the act and fee</div>} />
    </MemoryRouter>,
  );

  it("shows the client with LAGDA's identity check and the notary in the room", () => {
    width(true, true);
    consoleFor();
    expect(screen.getByTestId("s6-partner")).toHaveTextContent("Rosa Villanueva");
    expect(screen.getByTestId("s6-partner")).toHaveTextContent("Identity verified by LAGDA");
    expect(screen.getByTestId("s6-self")).toHaveTextContent("Notary public · In the room");
  });

  it("puts the next step right after the call on a phone, and first beside the call on a tablet", () => {
    width(false, false);
    const view = consoleFor();
    expect(screen.getByTestId("notary-step-six")).toHaveAttribute("data-width", "narrow");
    const order = ["video-panel", "the-flow", "document-panel", "the-address", "chat-panel"].map(id => screen.getByTestId(id));
    for (let i = 1; i < order.length; i += 1) expect(order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    view.unmount();
    width(false, true);
    consoleFor();
    expect(screen.getByTestId("notary-step-six")).toHaveAttribute("data-width", "medium");
    expect(screen.getByTestId("the-flow").compareDocumentPosition(screen.getByTestId("document-panel")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

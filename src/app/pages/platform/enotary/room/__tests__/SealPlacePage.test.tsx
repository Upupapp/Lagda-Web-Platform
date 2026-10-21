// The notary's own page for placing the seal and the signature: apart from the video session, with the way back to it at
// the top and the bottom, and what they placed saved with the session for the act to use.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";

vi.mock("../../../../../components/pdf/DocumentPageSurface", () => ({
  useRealDocument: () => ({ status: "ready", doc: {}, pageCount: 1, pageSizes: [{ width: 595, height: 842 }] }),
  DocumentPageSurface: () => <canvas />,
}));

let role = "notary";
let status = "live";
let saved: { seal: { page: number; x: number; y: number } | null; signature: null; savedAt: string | null } | null | undefined;
const lookup = vi.fn();
const savePlacements = vi.fn();
vi.mock("../../../../../services/real/enotary-sessions.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-sessions.service")>()),
  realEnotarySessionsService: {
    lookup: (id: string) => lookup(id) as unknown, document: () => Promise.resolve(new Blob(["%PDF-1.7"])),
    signature: () => Promise.resolve(null), ping: () => Promise.resolve(),
    savePlacements: (...args: unknown[]) => savePlacements(...args) as unknown,
  },
}));

import { SealPlacePage } from "../SealPlacePage";
import { placementsOf, readPlacements, whereOnPage, writePlacements } from "../seal-placements";
import type { Session } from "../../../../../services/real/enotary-sessions.service";

const open = () => render(
  <MemoryRouter initialEntries={["/app/enotary/room/eni_1/place"]}>
    <Routes><Route path="/app/enotary/room/:invitationId/place" element={<SealPlacePage />} /></Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  role = "notary"; status = "live"; saved = undefined; writePlacements("ens_1", {});
  savePlacements.mockReset();
  savePlacements.mockResolvedValue({ placements: { seal: null, signature: null, savedAt: "2026-10-18T12:16:00.000Z" } });
  lookup.mockImplementation(() => Promise.resolve({
    session: { id: "ens_1", invitationId: "eni_1", role, status, notaryName: "Aiyana Cruz", ...(saved === undefined ? {} : { placements: saved }) },
    canStart: false, reason: null,
  }));
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 520 });
});

describe("the seal and signature page", () => {
  it("shows the document and the way back to the video session at the top and at the bottom", async () => {
    open();
    expect(await screen.findByTestId("seal-placer")).toBeInTheDocument();
    expect(screen.getByTestId("place-title")).toHaveTextContent("Place your seal and signature");
    expect(screen.getByTestId("back-to-session")).toHaveAttribute("href", "/app/enotary/room/eni_1");
    expect(screen.getByTestId("done-back")).toHaveAttribute("href", "/app/enotary/room/eni_1");
  });

  it("starts from the places saved with the session, and says when they were saved", async () => {
    saved = { seal: { page: 1, x: 0.4, y: 0.6 }, signature: null, savedAt: "2026-10-18T12:16:00.000Z" };
    open();
    await waitFor(() => { expect(screen.getByTestId("marker-seal")).toBeInTheDocument(); });
    expect(screen.getByTestId("placements-saved")).toHaveTextContent(/Saved with the session at/);
  });

  it("saves a place with the session a moment after it is made", async () => {
    open();
    const surface = await screen.findByTestId("placer-surface-1");
    surface.getBoundingClientRect = () => ({ left: 0, top: 0, width: 520, height: 736, right: 520, bottom: 736, x: 0, y: 0, toJSON: () => ({}) });
    // eslint-disable-next-line testing-library/prefer-user-event -- the place comes from the click's coordinates, which only fireEvent sets.
    fireEvent.click(surface, { clientX: 260, clientY: 368 });
    expect(screen.getByTestId("placements-saved")).toHaveTextContent("Saving…");
    await waitFor(() => { expect(savePlacements).toHaveBeenCalledWith("ens_1", { seal: { page: 1, x: 0.5, y: 0.5 } }); });
    await waitFor(() => { expect(screen.getByTestId("placements-saved")).toHaveTextContent(/Saved with the session/); });
    expect(readPlacements("ens_1")).toEqual({ seal: { page: 1, x: 0.5, y: 0.5 } });
  });

  it("stays open for a session that was called off, so the places are kept for when it opens again", async () => {
    status = "cancelled";
    open();
    expect(await screen.findByTestId("seal-placer")).toBeInTheDocument();
  });

  it("is only for the notary", async () => {
    role = "client";
    open();
    expect(await screen.findByTestId("place-unavailable")).toHaveTextContent("Only the notary public");
    expect(screen.queryByTestId("seal-placer")).toBeNull();
  });

  it("says the places can no longer move once the document is notarized", async () => {
    status = "notarized";
    open();
    expect(await screen.findByTestId("place-unavailable")).toHaveTextContent("notarized");
  });
});

describe("what is kept between the pages", () => {
  it("keeps places, and forgets them once there are none", () => {
    writePlacements("ens_9", { seal: { page: 2, x: 0.1, y: 0.2 } });
    expect(readPlacements("ens_9")).toEqual({ seal: { page: 2, x: 0.1, y: 0.2 } });
    expect(readPlacements("ens_8")).toEqual({});
    writePlacements("ens_9", {});
    expect(readPlacements("ens_9")).toEqual({});
  });

  it("reads the places from the session, and says where a point sits in words", () => {
    const s = { id: "ens_7", placements: { seal: { page: 2, x: 0.8, y: 0.84 }, signature: null, savedAt: null } } as unknown as Session;
    expect(placementsOf(s)).toEqual({ seal: { page: 2, x: 0.8, y: 0.84 } });
    expect(whereOnPage({ page: 2, x: 0.8, y: 0.84 })).toBe("lower right");
    expect(whereOnPage({ page: 1, x: 0.5, y: 0.5 })).toBe("middle");
    expect(whereOnPage({ page: 1, x: 0.1, y: 0.1 })).toBe("top left");
  });
});

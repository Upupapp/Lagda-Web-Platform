// The notary's own page for placing the seal and the signature: apart from the video session, with the way back to it at
// the top and the bottom, and what they placed kept for the session to use.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";

vi.mock("../../../../../components/pdf/DocumentPageSurface", () => ({
  useRealDocument: () => ({ status: "ready", doc: {}, pageCount: 1, pageSizes: [{ width: 595, height: 842 }] }),
  DocumentPageSurface: () => <canvas />,
}));

let role = "notary";
let status = "live";
const lookup = vi.fn();
vi.mock("../../../../../services/real/enotary-sessions.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-sessions.service")>()),
  realEnotarySessionsService: {
    lookup: (id: string) => lookup(id) as unknown, document: () => Promise.resolve(new Blob(["%PDF-1.7"])),
    signature: () => Promise.resolve(null), ping: () => Promise.resolve(),
  },
}));

import { SealPlacePage } from "../SealPlacePage";
import { readPlacements, writePlacements } from "../seal-placements";

const open = () => render(
  <MemoryRouter initialEntries={["/app/enotary/room/eni_1/place"]}>
    <Routes><Route path="/app/enotary/room/:invitationId/place" element={<SealPlacePage />} /></Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  role = "notary"; status = "live"; writePlacements("ens_1", {});
  lookup.mockImplementation(() => Promise.resolve({ session: { id: "ens_1", invitationId: "eni_1", role, status, notaryName: "Aiyana Cruz" }, canStart: false, reason: null }));
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

  it("starts from what was placed before, so the notary can come back to it at any time", async () => {
    writePlacements("ens_1", { seal: { page: 1, x: 0.4, y: 0.6 } });
    open();
    await waitFor(() => { expect(screen.getByTestId("marker-seal")).toBeInTheDocument(); });
    expect(readPlacements("ens_1")).toEqual({ seal: { page: 1, x: 0.4, y: 0.6 } });
  });

  it("is only for the notary of a session that is open", async () => {
    role = "client";
    open();
    expect(await screen.findByTestId("place-unavailable")).toHaveTextContent("Only the notary public");
    expect(screen.queryByTestId("seal-placer")).toBeNull();
  });

  it("says the session is over once it is", async () => {
    status = "notarized";
    open();
    expect(await screen.findByTestId("place-unavailable")).toHaveTextContent("over");
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
});

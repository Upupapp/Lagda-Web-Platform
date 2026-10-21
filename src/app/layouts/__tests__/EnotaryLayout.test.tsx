/* eslint-disable testing-library/prefer-user-event -- the row's buttons and its scroll position are driven by DOM events on measured widths; fireEvent is the way to send a scroll. */
// The eNotary shell: the way back to the E-signature dashboard at the very top left, its own top bar and footer instead of
// the app's sidebar, the platform's sign-in guard, and a Menu for a client, and for a notary a row of the desk's pages that stays in view, one line at every width with a button at each end where it does not fit.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";

vi.mock("../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

let session = "authenticated";
let isNotary = false;
let waiting = 0;
vi.mock("../../context/PlatformContext", () => ({
  usePlatform: () => ({ sessionStatus: session, user: { id: "u1", fullName: "Miguel Fernandez", displayName: "Miguel" } }),
}));
vi.mock("../../hooks/useAccountFeatures", () => ({
  useAccountFeatures: () => ({ notaryRequests: true, notaryDesk: isNotary, notaryReview: false }),
}));
vi.mock("../../hooks/useNavCounts", () => ({ useNavCounts: () => ({ notaryDesk: waiting }) }));

vi.mock("../../hooks/useEnotaryCardSync", () => ({ useEnotaryCardSync: () => undefined }));

import { EnotaryLayout } from "../EnotaryLayout";

const at = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/app/enotary" element={<EnotaryLayout />}>
        <Route path="requests" element={<p>The requests page</p>} />
        <Route path="requests/:id" element={<p>One of my requests</p>} />
        <Route path="desk" element={<p>The desk page</p>} />
        <Route path="desk/:id" element={<p>One request</p>} />
      </Route>
      <Route path="/sign-in" element={<p>Sign in</p>} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => { session = "authenticated"; isNotary = false; waiting = 0; });

describe("the eNotary shell", () => {
  it("shows the page with its own top bar and a client's footer, and no app sidebar", () => {
    at("/app/enotary/requests");
    expect(screen.getByText("The requests page")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "LAGDA eNotary home" })).toBeInTheDocument();
    expect(screen.getByText(/The Notary Directory: choose a notary public/)).toBeInTheDocument();
    expect(screen.queryByTestId("shell-notary")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Platform sections" })).toBeNull();
  });

  it("sends a signed-out visitor to sign in", () => {
    session = "unauthenticated";
    at("/app/enotary/requests");
    expect(screen.getByText("Sign in")).toBeInTheDocument();
  });

  it("puts a notary's way back to the E-signature dashboard first, at the top left", () => {
    isNotary = true;
    at("/app/enotary/desk");
    const back = screen.getByTestId("back-to-dashboard");
    expect(back).toHaveTextContent("Back to E-signature Dashboard");
    expect(back).toHaveAttribute("href", "/app/dashboard");
    expect(screen.getAllByRole("link")[0]).toBe(back);
  });

  it("gives a client the Menu, not the row: back to LAGDA, their requests and the directory", () => {
    at("/app/enotary/requests/eni_1");
    expect(screen.queryByTestId("back-to-dashboard")).toBeNull();
    expect(screen.queryByTestId("shell-nav")).toBeNull();
    fireEvent.click(screen.getByTestId("shell-menu"));
    const list = screen.getByRole("navigation", { name: "eNotary menu" });
    expect(list).toHaveTextContent("Back to LAGDA");
    expect(list).toHaveTextContent("My notary requests");
    expect(list).toHaveTextContent("Notary Directory");
    expect(list).not.toHaveTextContent("Notary desk");
  });

  it("leaves the client's Menu out of the Notarial Request History, which has its own way back", () => {
    at("/app/enotary/requests");
    expect(screen.getByText("The requests page")).toBeInTheDocument();
    expect(screen.queryByTestId("shell-menu")).toBeNull();
    expect(screen.getByRole("link", { name: "LAGDA eNotary home" })).toBeInTheDocument();
  });

  it("shows a notary's name and badge, the desk's footer, and the pages only a notary has, with the red count", () => {
    isNotary = true; waiting = 2;
    at("/app/enotary/desk/eni_1");
    expect(screen.getByTestId("shell-notary")).toHaveTextContent("Miguel Fernandez");
    expect(screen.getByTestId("shell-notary")).toHaveTextContent("Notary Public");
    expect(screen.getByText(/The notary's desk: accept requests/)).toBeInTheDocument();
    const row = screen.getByRole("navigation", { name: "eNotary menu" });
    for (const label of ["Notary desk", "Notary Book", "Seal and signature", "My payment QR", "My application"]) expect(row).toHaveTextContent(label);
    expect(screen.getByTestId("notary-desk-bubble")).toHaveTextContent("2");
    // A request of the desk is still the desk.
    expect(screen.getByRole("link", { name: /Notary desk/ })).toHaveAttribute("aria-current", "page");
  });

  it("stays under the top of the window, and offers a button at an end only where there is more to reach", () => {
    isNotary = true;
    at("/app/enotary/desk");
    expect(screen.getByTestId("shell-nav")).toHaveClass("eno-navbar");
    expect(screen.queryByTestId("nav-left")).toBeNull();
    expect(screen.queryByTestId("nav-right")).toBeNull();
    const scroller = screen.getByTestId("shell-nav-scroll");
    Object.defineProperty(scroller, "clientWidth", { configurable: true, value: 300 });
    Object.defineProperty(scroller, "scrollWidth", { configurable: true, value: 900 });
    const scrollBy = vi.fn();
    scroller.scrollBy = scrollBy as unknown as typeof scroller.scrollBy;
    fireEvent.scroll(scroller);
    expect(screen.queryByTestId("nav-left")).toBeNull();
    fireEvent.click(screen.getByTestId("nav-right"));
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 180 }));
    scroller.scrollLeft = 600;
    fireEvent.scroll(scroller);
    expect(screen.getByTestId("nav-left")).toBeInTheDocument();
    expect(screen.queryByTestId("nav-right")).toBeNull();
  });
});

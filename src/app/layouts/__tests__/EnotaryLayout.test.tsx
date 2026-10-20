// The eNotary shell: its own top bar and footer instead of the app's sidebar, the platform's sign-in guard, and a
// Menu that leads back to the dashboard and to the other eNotary pages (the notary's only for a notary).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

import { EnotaryLayout } from "../EnotaryLayout";

const at = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/app/enotary" element={<EnotaryLayout />}>
        <Route path="requests" element={<p>The requests page</p>} />
        <Route path="desk" element={<p>The desk page</p>} />
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

  it("opens a Menu with the way back to the dashboard and the client's pages, and closes it on Escape", async () => {
    at("/app/enotary/requests");
    await userEvent.click(screen.getByTestId("shell-menu"));
    const menu = screen.getByRole("navigation", { name: "eNotary menu" });
    expect(menu).toHaveTextContent("Back to LAGDA");
    expect(menu).toHaveTextContent("My notary requests");
    expect(menu).toHaveTextContent("Notary Directory");
    expect(menu).not.toHaveTextContent("Notary desk");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("navigation", { name: "eNotary menu" })).toBeNull();
  });

  it("shows a notary's name and badge, the desk's footer, and the menu entries only a notary has, with the red count", async () => {
    isNotary = true; waiting = 2;
    at("/app/enotary/desk");
    expect(screen.getByTestId("shell-notary")).toHaveTextContent("Miguel Fernandez");
    expect(screen.getByTestId("shell-notary")).toHaveTextContent("Notary Public");
    expect(screen.getByText(/The notary's desk: accept requests/)).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("shell-menu"));
    const menu = screen.getByRole("navigation", { name: "eNotary menu" });
    expect(menu).toHaveTextContent("Notary desk");
    expect(menu).toHaveTextContent("My payment QR");
    expect(menu).toHaveTextContent("My application");
    expect(screen.getByTestId("notary-desk-bubble")).toHaveTextContent("2");
  });
});

// /sign/identity/return: where the identity verification partner sends the
// browser back to.
//
// Pinned here:
//
//   - the partner's query values leave the address bar at once and are never
//     shown, stored or sent anywhere
//   - with a signing session, the page routes into the signing page and tells
//     it, in router state and not in the address, that they have just returned
//   - without one, it says what to do on either kind of device
//   - the route is public, needs no sign-in, and is not indexable

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";

const read = vi.fn();
const enter = vi.fn();

vi.mock("../../../services/real/signing-access.service", async (original) => ({
  ...(await original<typeof import("../../../services/real/signing-access.service")>()),
  realSigningAccessService: {
    read: (...args: unknown[]) => read(...args) as unknown,
    enter: (...args: unknown[]) => enter(...args) as unknown,
  },
}));

import { IdentityReturnPage } from "../IdentityReturnPage";
import { ApiError } from "../../../services/api-client";
import { getRouteMeta, RECIPIENT_ROUTES } from "../../../config/routes";
import { identityReturnedAt } from "../../../models/identity-check";

const QUERY = "?verificationSessionId=vs_SECRET123&status=Approved";

/** Stands in for the signing page: shows where the router went, and with what. */
function Landed() {
  const location = useLocation();
  return (
    <div data-testid="landed">
      {location.pathname}|{location.search}|{location.hash}|{String(identityReturnedAt(location.state))}
    </div>
  );
}

function arrive(query = QUERY) {
  window.history.replaceState(null, "", `/sign/identity/return${query}`);
  return render(
    <MemoryRouter initialEntries={[`/sign/identity/return${query}`]}>
      <Routes>
        <Route path="/sign/identity/return" element={<IdentityReturnPage />} />
        <Route path="/sign/:requestId" element={<Landed />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  read.mockResolvedValue({ request: { signingRequestId: "sr_1" } });
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("arriving from the partner", () => {
  it("takes the partner's values out of the address bar at once", () => {
    const replace = vi.spyOn(window.history, "replaceState");
    read.mockReturnValue(new Promise(() => undefined));
    arrive();
    expect(window.location.search).toBe("");
    expect(window.location.pathname).toBe("/sign/identity/return");
    expect(window.location.href).not.toContain("vs_SECRET123");
    expect(replace).toHaveBeenCalledWith(null, "", "/sign/identity/return");
  });

  it("says Returning to your document, and never shows or keeps what the partner sent", () => {
    read.mockReturnValue(new Promise(() => undefined));
    arrive();
    expect(screen.getByRole("heading", { level: 1, name: "Returning to your document…" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(document.body.innerHTML).not.toContain("vs_SECRET123");
    expect(document.body.textContent).not.toMatch(/Approved|verificationSessionId/);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(document.cookie).not.toContain("vs_SECRET123");
  });

  it("names the page and keeps it out of search engines", () => {
    read.mockReturnValue(new Promise(() => undefined));
    arrive();
    expect(document.title).toBe("Identity Check — LAGDA eSignature");
    expect(document.head.innerHTML).toContain('<meta name="robots" content="noindex, nofollow">');
  });

  it("routes into the signing page with the returned flag in router state, not in the address", async () => {
    const before = Date.now();
    arrive();
    const landed = await screen.findByTestId("landed");
    const [pathname, search, hash, at] = (landed.textContent ?? "").split("|");
    expect(pathname).toBe("/sign/continue");
    expect(search).toBe("");
    expect(hash).toBe("");
    expect(Number(at)).toBeGreaterThanOrEqual(before);
    expect(Number(at)).toBeLessThanOrEqual(Date.now());
    // It only looked: reading writes nothing, entering would.
    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith();
    expect(enter).not.toHaveBeenCalled();
  });

  it("does the same whatever the partner put in the address", async () => {
    arrive("?status=Declined&verificationSessionId=x");
    expect((await screen.findByTestId("landed")).textContent).toMatch(/^\/sign\/continue\|\|\|\d+$/);
  });
});

describe("on a device with no signing session", () => {
  it("says to return to the computer, and what to do if they started here", async () => {
    read.mockRejectedValue(new ApiError(401, { code: "RECIPIENT_AUTHENTICATION_REQUIRED", message: "server words" }, "z"));
    arrive();
    expect(await screen.findByText("You can return to your computer. It will continue by itself.")).toBeInTheDocument();
    expect(screen.getByText(/Your signing session has ended\. Open your signing\s+link again to continue\./)).toBeInTheDocument();
    expect(screen.queryByTestId("landed")).toBeNull();
    expect(document.body.textContent).not.toContain("server words");
    expect(document.body.innerHTML).not.toContain("vs_SECRET123");
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("when the server cannot be reached", () => {
  it("offers to try again, and goes on once it can", async () => {
    read.mockRejectedValueOnce(new ApiError(0, undefined, "offline"));
    arrive();
    expect(await screen.findByRole("heading", { name: "We could not bring you back to your document" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => { expect(screen.getByTestId("landed")).toBeInTheDocument(); });
    expect(read).toHaveBeenCalledTimes(2);
  });
});

describe("the route", () => {
  it("is registered as public, needs no sign-in, and is not indexable", () => {
    const meta = getRouteMeta("/sign/identity/return");
    expect(meta?.path).toBe("/sign/identity/return");
    expect(meta).toMatchObject({ isPublic: true, requiresAuth: false, isIndexable: false, status: "implemented" });
    expect(RECIPIENT_ROUTES.filter(route => route.isIndexable)).toEqual([]);
  });

  it("leaves the phone's route and the signing link as they were", () => {
    expect(getRouteMeta("/sign/identity/handoff")?.path).toBe("/sign/identity/handoff");
    expect(getRouteMeta("/sign/" + "t".repeat(43))?.path).toBe("/sign/:requestId");
    expect(getRouteMeta("/sign/continue")?.path).toBe("/sign/:requestId");
  });
});

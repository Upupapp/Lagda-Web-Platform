// The recipient shell's way back to Documents, and the one page that goes
// without it: the identity check continued on a phone, which has no account
// session and holds its link in memory only.

import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { RecipientLayout } from "../RecipientLayout";
import { getRouteMeta, RECIPIENT_ROUTES } from "../../config/routes";

function renderShell(element: ReactElement) {
  return render(
    <MemoryRouter initialEntries={["/sign/x"]}>
      <Routes>
        <Route path="/sign" element={element}>
          <Route path=":requestId" element={<p>page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("RecipientLayout", () => {
  it("keeps the way back to Documents on the signing pages", () => {
    renderShell(<RecipientLayout />);
    expect(screen.getByRole("link", { name: "Back to Documents" })).toHaveAttribute("href", "/app/documents");
    expect(screen.getByRole("img", { name: "LAGDA" })).toBeInTheDocument();
  });

  it("leaves it out where asked, and keeps the logo header", () => {
    renderShell(<RecipientLayout documentsLink={false} />);
    expect(screen.queryByRole("link", { name: "Back to Documents" })).toBeNull();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "LAGDA" })).toBeInTheDocument();
    expect(screen.getByText("page")).toBeInTheDocument();
  });
});

describe("the phone's route", () => {
  it("is registered as public, needs no sign-in, and is not indexable", () => {
    const meta = getRouteMeta("/sign/identity/handoff");
    expect(meta?.path).toBe("/sign/identity/handoff");
    expect(meta).toMatchObject({ isPublic: true, requiresAuth: false, isIndexable: false, status: "implemented" });
    expect(RECIPIENT_ROUTES.filter(route => route.isIndexable)).toEqual([]);
  });

  it("is not mistaken for a signing link", () => {
    expect(getRouteMeta("/sign/" + "t".repeat(43))?.path).toBe("/sign/:requestId");
  });
});

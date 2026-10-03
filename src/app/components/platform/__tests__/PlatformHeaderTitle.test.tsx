// TC-42 / TC-50. The header crumb names a record, never its id, and every
// page inside the shell sets the browser tab title from routes.ts.

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../NotificationMenu", () => ({ NotificationMenu: () => <div /> }));
vi.mock("../../../tour/TourContext", () => ({ useTour: () => ({ restartTour: vi.fn() }) }));

import { PlatformHeader } from "../PlatformHeader";
import { useDetailTitle } from "../../../hooks/useDetailTitle";

function Detail({ name }: { name: string | null }) {
  useDetailTitle(name);
  return null;
}

function headingAt(path: string, name: string | null = null) {
  document.title = "Sign In — LAGDA";
  render(
    <MemoryRouter initialEntries={[path]}>
      <PlatformHeader />
      <Detail name={name} />
    </MemoryRouter>,
  );
  return within(screen.getByRole("banner", { name: "Platform header" })).getByRole("heading", { level: 1 });
}

describe("platform header crumb", () => {
  it("shows the contact's name in place of its id", () => {
    expect(headingAt("/app/contacts/con_7a7cf3b7e1", "Bruce Wayne")).toHaveTextContent("Contacts › Bruce Wayne");
  });

  it("shows the template's name on its sub-pages too", () => {
    expect(headingAt("/app/templates/wft_67fb9a01/edit", "Office Lease")).toHaveTextContent("Templates › Office Lease › Edit");
  });

  it("leaves the id out until the name has loaded", () => {
    const title = headingAt("/app/contacts/con_7a7cf3b7e1");
    expect(title).toHaveTextContent(/^Contacts$/);
    expect(title.textContent).not.toMatch(/con_/i);
  });
});

describe("browser tab title", () => {
  it("replaces the sign-in title with the route's own", () => {
    headingAt("/app/dashboard");
    expect(document.title).toBe("Dashboard — LAGDA");
  });

  it("uses the route's generic title on a detail page, never the record's name", () => {
    headingAt("/app/contacts/con_7a7cf3b7e1", "Bruce Wayne");
    expect(document.title).toBe("Contact — LAGDA");
  });
});

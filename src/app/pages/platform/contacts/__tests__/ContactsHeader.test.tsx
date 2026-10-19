// The Contacts header: Contact groups beside Find people.
import { describe, it, expect, vi } from "vitest";
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => ({ workspaces: [], currentWorkspace: null, user: { id: "u1" } }) }));
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ContactsHeader } from "../contacts-ui";

describe("the Contacts header", () => {
  it("offers Contact groups beside Find people, each to its own page", () => {
    render(<MemoryRouter><ContactsHeader section="all" subtitle="The people you send documents to." /></MemoryRouter>);
    expect(screen.getByTestId("contact-groups-button")).toHaveAttribute("href", "/app/contacts/groups");
    expect(screen.getByTestId("find-people-button")).toHaveAttribute("href", "/app/contacts/new");
    expect(screen.getByTestId("contact-groups-button")).toHaveTextContent("Contact groups");
  });

  it("shows neither when the page asks for no action", () => {
    render(<MemoryRouter><ContactsHeader section="archived" subtitle="Archived." action={false} /></MemoryRouter>);
    expect(screen.queryByTestId("contact-groups-button")).toBeNull();
    expect(screen.queryByTestId("find-people-button")).toBeNull();
  });
});

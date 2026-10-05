// A participant's name from their LAGDA account, and choosing a person from
// the workspace. Exercised through a small form the way the Signers step and
// Use Template use the pieces together.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const lookup = vi.fn();
const directory = vi.fn();
vi.mock("../../../services/real/contact-connections.service", () => ({
  contactConnectionsAvailable: (id: unknown) => typeof id === "string" && id !== "",
  contactConnectionsService: { lookup: (...a: unknown[]) => lookup(...a) as unknown },
}));
vi.mock("../../../services/real/participant-directory.service", async () => {
  const real = await vi.importActual<typeof import("../../../services/real/participant-directory.service")>(
    "../../../services/real/participant-directory.service");
  return {
    ...real,
    participantDirectoryAvailable: (id: unknown) => typeof id === "string" && id !== "",
    participantDirectoryService: { list: (...a: unknown[]) => directory(...a) as unknown },
  };
});

import { useAccountNameAssist, forgetAccountNameAnswers } from "../../../hooks/useAccountNameAssist";
import { ParticipantNameField } from "../ParticipantNameField";
import { PeoplePicker, type PickerContact } from "../PeoplePicker";
import { splitDirectory, type DirectoryPerson } from "../../../services/real/participant-directory.service";

const found = (displayName: string) => ({ person: { userId: "u1", displayName, relationship: "none", connectionId: null }, existingContactId: null });
const nobody = { person: null, existingContactId: null };

function Form({ workspaceId = "ws_1", contacts = [], initial = { name: "", email: "" } }: {
  workspaceId?: string | null; contacts?: PickerContact[]; initial?: { name: string; email: string };
}) {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const assist = useAccountNameAssist({ workspaceId, email, name, onName: setName });
  return (
    <div>
      <PeoplePicker
        workspaceId={workspaceId} contacts={contacts}
        onPick={p => { setName(p.name); setEmail(p.email); assist.notePicked(p); }}
      />
      <label htmlFor="n">Full name</label>
      <ParticipantNameField id="n" value={name} onChange={setName} assist={assist} inputStyle={{}} />
      <label htmlFor="e">Email</label>
      <input id="e" type="email" value={email} onChange={e => { setEmail(e.target.value); assist.noteEmailTyped(); }} />
    </div>
  );
}
const nameField = () => screen.getByLabelText<HTMLInputElement>("Full name");

beforeEach(() => { lookup.mockReset(); directory.mockReset(); forgetAccountNameAnswers(); });

describe("typing an email", () => {
  it("fills the name from the account, locks it, and says where it came from", async () => {
    lookup.mockResolvedValue(found("James Cortes"));
    const user = userEvent.setup();
    render(<Form />);
    await user.type(screen.getByLabelText("Email"), "james@example.com");
    await waitFor(() => { expect(nameField().value).toBe("James Cortes"); });
    expect(nameField().readOnly).toBe(true);
    expect(screen.getByText("From their LAGDA account")).toBeTruthy();
    // The complete address, once: not a search as each letter is typed.
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledWith("ws_1", "james@example.com");
  });

  it("leaves the name open and asks for it when no account uses the address", async () => {
    lookup.mockResolvedValue(nobody);
    const user = userEvent.setup();
    render(<Form />);
    await user.type(screen.getByLabelText("Email"), "new.person@example.com");
    expect(await screen.findByText("No LAGDA account for this email yet. Enter their full name.")).toBeTruthy();
    expect(nameField().readOnly).toBe(false);
    await user.type(nameField(), "Ana Reyes");
    expect(nameField().value).toBe("Ana Reyes");
  });

  it("never blocks the form when the check cannot be made", async () => {
    lookup.mockRejectedValue(new Error("rate limited"));
    const user = userEvent.setup();
    render(<Form />);
    await user.type(screen.getByLabelText("Email"), "someone@example.com");
    await waitFor(() => { expect(lookup).toHaveBeenCalled(); });
    expect(nameField().readOnly).toBe(false);
    expect(screen.queryByText(/No LAGDA account/)).toBeNull();
    await user.type(nameField(), "Typed Anyway");
    expect(nameField().value).toBe("Typed Anyway");
  });

  it("does not ask about a half-typed address, and asks nothing with no workspace", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Form />);
    await user.type(screen.getByLabelText("Email"), "james@");
    await new Promise(r => setTimeout(r, 700));
    expect(lookup).not.toHaveBeenCalled();
    unmount();
    render(<Form workspaceId={null} />);
    await user.type(screen.getByLabelText("Email"), "james@example.com");
    await new Promise(r => setTimeout(r, 700));
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe("the Edit button", () => {
  it("unlocks the name for this document, and Use account name puts it back", async () => {
    lookup.mockResolvedValue(found("Jimmy C."));
    const user = userEvent.setup();
    render(<Form />);
    await user.type(screen.getByLabelText("Email"), "james@example.com");
    await waitFor(() => { expect(nameField().readOnly).toBe(true); });

    await user.click(screen.getByRole("button", { name: "Edit name" }));
    expect(nameField().readOnly).toBe(false);
    await user.clear(nameField());
    await user.type(nameField(), "James Cortes");
    expect(screen.getByText(/Edited for this document/)).toBeTruthy();
    // Unlocked, so the Edit button itself is gone: nothing left to unlock.
    expect(screen.queryByRole("button", { name: "Edit name" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Use account name" }));
    expect(nameField().value).toBe("Jimmy C.");
    expect(nameField().readOnly).toBe(true);
  });

  it("sits inside the field, so the form is no wider and nothing beside it moves", async () => {
    lookup.mockResolvedValue(found("James Cortes"));
    const user = userEvent.setup();
    render(<Form />);
    await user.type(screen.getByLabelText("Email"), "james@example.com");
    const button = await screen.findByRole("button", { name: "Edit name" });
    expect(button.style.position).toBe("absolute");
    expect(button.parentElement).toBe(nameField().parentElement);
  });
});

describe("a participant saved earlier", () => {
  it("keeps the name it was saved with, shown as edited when the account's differs", async () => {
    lookup.mockResolvedValue(found("Jimmy C."));
    render(<Form initial={{ name: "James Cortes", email: "james@example.com" }} />);
    expect(await screen.findByText(/Edited for this document/)).toBeTruthy();
    expect(nameField().value).toBe("James Cortes");
  });
});

describe("choosing a person", () => {
  const people: DirectoryPerson[] = [
    { userId: "me", displayName: "Paul Sender", email: "paul@acme.test", isCurrentUser: true, units: [{ unitId: "legal", name: "Legal" }] },
    { userId: "a", displayName: "Ana Reyes", email: "ana@acme.test", isCurrentUser: false, units: [{ unitId: "legal", name: "Legal" }] },
    { userId: "b", displayName: "Ben Cruz", email: "ben@acme.test", isCurrentUser: false, units: [{ unitId: "hr", name: "People" }] },
    { userId: "c", displayName: "Cara Lim", email: "cara@acme.test", isCurrentUser: false, units: [] },
  ];
  const contacts: PickerContact[] = [{ id: "ct1", name: "Dana Outside", email: "dana@client.test", organization: "Client Co." }];

  it("splits the workspace into my team and the other teams", () => {
    const { myTeam, others } = splitDirectory(people);
    expect(myTeam.map(p => p.userId)).toEqual(["me", "a"]);
    expect(others.map(p => p.userId)).toEqual(["b", "c"]);
    // In no team at all: there is no "my team", the whole workspace is listed.
    const loner = splitDirectory(people.map(p => p.isCurrentUser ? { ...p, units: [] } : p));
    expect(loner.myTeam).toEqual([]);
    expect(loner.others).toHaveLength(4);
  });

  it("offers Contacts, My team and Other teams, and fills name and email from a team member without a second check", async () => {
    directory.mockResolvedValue(people);
    const user = userEvent.setup();
    render(<Form contacts={contacts} />);
    await user.click(screen.getByRole("button", { name: "Choose a person" }));
    const tabs = await screen.findByRole("tablist");
    await waitFor(() => { expect(within(tabs).getAllByRole("tab").map(t => t.textContent)).toEqual(["Contacts (1)", "My team (2)", "Other teams (2)"]); });

    await user.click(within(tabs).getByRole("tab", { name: /Other teams/ }));
    await user.click(screen.getByRole("button", { name: /Ben Cruz/ }));
    expect(nameField().value).toBe("Ben Cruz");
    expect(screen.getByLabelText("Email")).toHaveValue("ben@acme.test");
    expect(nameField().readOnly).toBe(true);
    expect(screen.getByText("From their LAGDA account")).toBeTruthy();
    await new Promise(r => setTimeout(r, 700));
    expect(lookup).not.toHaveBeenCalled();
  });

  it("a contact's name is the sender's own record: locked, labelled, and editable", async () => {
    directory.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<Form contacts={contacts} />);
    await user.click(screen.getByRole("button", { name: "Choose a person" }));
    await user.click(await screen.findByRole("button", { name: /Dana Outside/ }));
    expect(nameField().value).toBe("Dana Outside");
    expect(screen.getByText("From your contacts")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Edit name" }));
    expect(nameField().readOnly).toBe(false);
  });

  it("finds a person by team name, and stays a contacts list when the directory is refused", async () => {
    directory.mockResolvedValue(people);
    const user = userEvent.setup();
    const { unmount } = render(<Form contacts={contacts} />);
    await user.click(screen.getByRole("button", { name: "Choose a person" }));
    await user.click(await screen.findByRole("tab", { name: /Other teams/ }));
    await user.type(screen.getByLabelText("Search people by name, email or team"), "People");
    expect(screen.getByRole("button", { name: /Ben Cruz/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Cara Lim/ })).toBeNull();
    unmount();

    directory.mockRejectedValue(new Error("403"));
    render(<Form contacts={contacts} />);
    await user.click(screen.getByRole("button", { name: "Choose a person" }));
    expect(await screen.findByRole("button", { name: /Dana Outside/ })).toBeTruthy();
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("does not offer someone who is already a participant on the document", async () => {
    directory.mockResolvedValue(people);
    const user = userEvent.setup();
    render(<PeoplePicker workspaceId="ws_1" contacts={[]} onPick={() => {}} takenEmails={["ANA@acme.test"]} />);
    await user.click(screen.getByRole("button", { name: "Choose a person" }));
    const ana = await screen.findByRole("button", { name: /Ana Reyes/ });
    expect(ana).toBeDisabled();
    expect(within(ana).getByText(/already added/)).toBeTruthy();
  });
});

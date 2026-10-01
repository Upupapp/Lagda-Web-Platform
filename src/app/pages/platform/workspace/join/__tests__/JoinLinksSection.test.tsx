// People › Invite people › Join link (078), against the demo stand-in: the
// Sent / Withdrawn / Draft tabs, each row's actions, and the create form's
// Team choice (a label only) and optional note.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.mock("../../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: false, API_BASE_URL: null }));

import { JoinLinksSection } from "../JoinLinksSection";
import { resetDemoJoinStore } from "../../../../../services/real/workspace-join.service";
import { mockWorkspaceAdminService } from "../../../../../services/mock/workspace-admin.service";
import type { WorkspaceTeamSummary } from "../../../../../models/workspace-admin";

function team(name: string): WorkspaceTeamSummary {
  return { id: `tm_${name}` as WorkspaceTeamSummary["id"], name, status: "active", memberCount: 0, demonstrationOnly: true };
}

beforeEach(() => {
  resetDemoJoinStore();
  vi.spyOn(mockWorkspaceAdminService, "listTeams").mockResolvedValue([team("Legal"), team("Finance")]);
});

function tab(name: string) {
  return screen.getByRole("tab", { name: new RegExp(`^${name}`) });
}

async function renderLinks() {
  render(<MemoryRouter><JoinLinksSection workspaceId="demo" /></MemoryRouter>);
  await screen.findByTestId("join-ticket-jt_demo_sent");
}

describe("JoinLinksSection", () => {
  it("sections links into Sent, Withdrawn and Draft with counts", async () => {
    await renderLinks();
    expect(tab("Sent")).toHaveTextContent("Sent2");
    expect(tab("Withdrawn")).toHaveTextContent("Withdrawn1");
    expect(tab("Draft")).toHaveTextContent("Draft1");
    expect(tab("Sent")).toHaveAttribute("aria-selected", "true");
  });

  it("marks a used link as dead: who used it, and no Copy or QR", async () => {
    await renderLinks();
    const used = screen.getByTestId("join-ticket-jt_demo_used");
    expect(used).toHaveTextContent("Used by Maria Santos · pending approval");
    expect(within(used).queryByRole("button", { name: /Copy link/ })).toBeNull();
    expect(within(used).queryByRole("button", { name: /QR code/ })).toBeNull();

    const live = screen.getByTestId("join-ticket-jt_demo_sent");
    expect(within(live).getByRole("button", { name: /Copy link/ })).toBeInTheDocument();
    expect(within(live).getByRole("button", { name: /QR code/ })).toBeInTheDocument();
  });

  it("creates a link as a draft, edits it, then sends it by email", async () => {
    const user = userEvent.setup();
    await renderLinks();
    await user.click(screen.getByRole("button", { name: "+ Create link" }));
    const dialog = screen.getByRole("dialog", { name: "Create join link" });
    await user.type(within(dialog).getByLabelText(/Note/), "Finance Associate");
    await user.type(within(dialog).getByLabelText(/Recipient email/), "fa@example.com");
    await user.click(within(dialog).getByRole("button", { name: "Save as draft" }));

    expect(tab("Draft")).toHaveTextContent("Draft2");
    expect(tab("Draft")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Finance Associate")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit Finance Associate" }));
    const edit = screen.getByRole("dialog", { name: "Edit draft link" });
    const label = within(edit).getByLabelText(/Note/);
    await user.clear(label);
    await user.type(label, "Finance Lead");
    await user.click(within(edit).getByRole("button", { name: "Save as draft" }));
    expect(screen.getByText("Finance Lead")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Send Finance Lead" }));
    const send = screen.getByRole("dialog", { name: "Send join link" });
    expect(within(send).getByLabelText("Send by email to fa@example.com")).toBeChecked();
    await user.click(within(send).getByRole("button", { name: "Send" }));

    // The fresh link opens as a QR code, and the row moves to Sent.
    expect(await screen.findByRole("dialog", { name: "Join link — Finance Lead" })).toBeInTheDocument();
    expect(tab("Sent")).toHaveTextContent("Sent3");
    expect(tab("Draft")).toHaveTextContent("Draft1");
  });

  it("rejects an invalid email", async () => {
    const user = userEvent.setup();
    await renderLinks();
    await user.click(screen.getByRole("button", { name: "+ Create link" }));
    const dialog = screen.getByRole("dialog", { name: "Create join link" });
    await user.type(within(dialog).getByLabelText(/Note/), "X team");
    await user.type(within(dialog).getByLabelText(/Recipient email/), "not-an-email");
    await user.click(within(dialog).getByRole("button", { name: "Save as draft" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Enter a valid email address");
  });

  it("withdraws after confirmation, and Send again issues a new link", async () => {
    const user = userEvent.setup();
    await renderLinks();
    await user.click(screen.getByRole("button", { name: "Withdraw Litigation associate" }));
    const confirm = screen.getByRole("dialog", { name: "Withdraw this link?" });
    await user.click(within(confirm).getByRole("button", { name: "Withdraw link" }));
    expect(tab("Withdrawn")).toHaveTextContent("Withdrawn2");

    await user.click(tab("Withdrawn"));
    await user.click(screen.getByRole("button", { name: "Send Litigation associate again" }));
    const send = screen.getByRole("dialog", { name: "Send link again" });
    expect(send).toHaveTextContent("this issues a new link");
    await user.click(within(send).getByRole("button", { name: "Send" }));
    const qr = await screen.findByRole("dialog", { name: "Join link — Litigation associate" });
    expect(qr.textContent).toMatch(/\/join\/[A-Za-z0-9_-]{43}/);
    expect(qr.textContent).not.toContain("demoLitigationAssociateLinkToken");
  });

  it("creates a link without email when the draft has no recipient", async () => {
    const user = userEvent.setup();
    await renderLinks();
    await user.click(screen.getByRole("button", { name: "+ Create link" }));
    const dialog = screen.getByRole("dialog", { name: "Create join link" });
    await user.type(within(dialog).getByLabelText(/Note/), "Reception");
    await user.click(within(dialog).getByRole("button", { name: "Save as draft" }));
    await user.click(screen.getByRole("button", { name: "Send Reception" }));
    const send = screen.getByRole("dialog", { name: "Send join link" });
    expect(within(send).queryByRole("checkbox")).toBeNull();
    await user.click(within(send).getByRole("button", { name: "Create link" }));
    expect(await screen.findByRole("dialog", { name: "Join link — Reception" })).toBeInTheDocument();
  });

  it("labels a link with a team and a note, and splits them again when the draft is edited", async () => {
    const user = userEvent.setup();
    await renderLinks();
    await user.click(screen.getByRole("button", { name: "+ Create link" }));
    const dialog = screen.getByRole("dialog", { name: "Create join link" });
    const select = await within(dialog).findByRole("combobox", { name: "Team" });
    await within(dialog).findByRole("option", { name: "Finance" });
    expect(within(select).getAllByRole("option").map(o => o.textContent)).toEqual(["No specific team", "Finance", "Legal"]);
    await user.selectOptions(select, "Finance");
    await user.type(within(dialog).getByLabelText(/Note/), "for Ana, starts Monday");
    await user.click(within(dialog).getByRole("button", { name: "Save as draft" }));
    expect(screen.getByText("Finance · for Ana, starts Monday")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit Finance · for Ana, starts Monday" }));
    const edit = screen.getByRole("dialog", { name: "Edit draft link" });
    await within(edit).findByRole("option", { name: "Finance" });
    expect(within(edit).getByRole("combobox", { name: "Team" })).toHaveValue("Finance");
    expect(within(edit).getByLabelText(/Note/)).toHaveValue("for Ana, starts Monday");
  });

  it("says when no team exists yet, links to Teams, and still saves a note-only link", async () => {
    vi.spyOn(mockWorkspaceAdminService, "listTeams").mockResolvedValue([]);
    const user = userEvent.setup();
    await renderLinks();
    await user.click(screen.getByRole("button", { name: "+ Create link" }));
    const dialog = screen.getByRole("dialog", { name: "Create join link" });
    expect(await within(dialog).findByRole("option", { name: "No team created yet" })).toBeInTheDocument();
    expect(within(dialog).getByRole("combobox", { name: "Team" })).toBeDisabled();
    expect(within(dialog).getByRole("link", { name: "Create one" })).toHaveAttribute("href", "/app/workspace/people");
    await user.click(within(dialog).getByRole("button", { name: "Save as draft" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Choose a team, or add a note");
    await user.type(within(dialog).getByLabelText(/Note/), "Reception");
    await user.click(within(dialog).getByRole("button", { name: "Save as draft" }));
    expect(screen.getByText("Reception")).toBeInTheDocument();
  });
});

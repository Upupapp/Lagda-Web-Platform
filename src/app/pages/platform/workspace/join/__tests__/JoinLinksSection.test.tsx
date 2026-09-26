// Members → Join links (078), against the demo stand-in: the Sent /
// Withdrawn / Draft tabs and each row's actions.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: false, API_BASE_URL: null }));

import { JoinLinksSection } from "../JoinLinksSection";
import { resetDemoJoinStore } from "../../../../../services/real/workspace-join.service";

beforeEach(() => {
  resetDemoJoinStore();
});

function tab(name: string) {
  return screen.getByRole("tab", { name: new RegExp(`^${name}`) });
}

async function renderLinks() {
  render(<JoinLinksSection workspaceId="demo" />);
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
    await user.type(within(dialog).getByLabelText("Label"), "Finance Associate");
    await user.type(within(dialog).getByLabelText(/Recipient email/), "fa@example.com");
    await user.click(within(dialog).getByRole("button", { name: "Save as draft" }));

    expect(tab("Draft")).toHaveTextContent("Draft2");
    expect(tab("Draft")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Finance Associate")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit Finance Associate" }));
    const edit = screen.getByRole("dialog", { name: "Edit draft link" });
    const label = within(edit).getByLabelText("Label");
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
    await user.type(within(dialog).getByLabelText("Label"), "X team");
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
    await user.type(within(dialog).getByLabelText("Label"), "Reception");
    await user.click(within(dialog).getByRole("button", { name: "Save as draft" }));
    await user.click(screen.getByRole("button", { name: "Send Reception" }));
    const send = screen.getByRole("dialog", { name: "Send join link" });
    expect(within(send).queryByRole("checkbox")).toBeNull();
    await user.click(within(send).getByRole("button", { name: "Create link" }));
    expect(await screen.findByRole("dialog", { name: "Join link — Reception" })).toBeInTheDocument();
  });
});

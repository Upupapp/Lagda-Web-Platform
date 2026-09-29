// "Join another workspace" (078 join links, from the workspace menu): the link
// is checked as it is pasted, the request is sent with the person's name and
// reason, and every outcome reads as it does on the join page.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.setConfig({ testTimeout: 15_000 });

const platform = {
  user: { displayName: "Ana", fullName: "Ana Reyes" } as { displayName: string; fullName?: string } | null,
  currentWorkspace: { id: "ws_mine", name: "Mine", plan: "personal", role: "owner" },
  workspaces: [{ id: "ws_mine", name: "Mine", plan: "personal", role: "owner" }],
  switchWorkspace: vi.fn(),
  refreshWorkspaceList: vi.fn(() => Promise.resolve()),
};
vi.mock("../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

const preview = vi.fn();
const submit = vi.fn();
vi.mock("../../../services/real/workspace-join.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../services/real/workspace-join.service")>();
  return {
    ...actual,
    previewJoinLink: (token: string) => preview(token) as unknown,
    submitJoinRequest: (token: string, input: unknown) => submit(token, input) as unknown,
  };
});

import { JoinWorkspaceDialog } from "../JoinWorkspaceDialog";
import { WorkspaceSwitcher } from "../WorkspaceSwitcher";
import { JOIN_MESSAGES } from "../../../services/real/workspace-join.service";

const LINK = "https://lagda-esignature.netlify.app/join/tok_abcdef123456";

beforeEach(() => {
  preview.mockReset();
  submit.mockReset();
  platform.refreshWorkspaceList.mockClear();
  preview.mockResolvedValue({ kind: "ok", workspaceName: "Acme Legal", invitedByName: "Maria Santos" });
});

async function pasteLink(user: ReturnType<typeof userEvent.setup>, link = LINK) {
  await user.click(screen.getByLabelText("Join link"));
  await user.paste(link);
}

describe("JoinWorkspaceDialog", () => {
  it("checks a pasted link, shows which workspace it is for, and sends the request", async () => {
    const user = userEvent.setup();
    submit.mockResolvedValue({ kind: "sent", workspaceName: "Acme Legal" });
    render(<JoinWorkspaceDialog onClose={() => undefined} />);
    const send = screen.getByRole("button", { name: /Send request/ });
    expect(send).toBeDisabled();

    await pasteLink(user);
    expect(await screen.findByText("Acme Legal")).toBeInTheDocument();
    expect(screen.getByText(/invited by Maria Santos/)).toBeInTheDocument();
    expect(preview).toHaveBeenCalledWith("tok_abcdef123456");
    expect(screen.getByLabelText("Your full name")).toHaveValue("Ana Reyes");

    await user.type(screen.getByLabelText(/Why are you joining/), "Joining the legal team");
    await user.click(screen.getByRole("button", { name: /Send request/ }));
    expect(submit).toHaveBeenCalledWith("tok_abcdef123456", { fullName: "Ana Reyes", reason: "Joining the legal team" });
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(/Request sent/);
    expect(status).toHaveTextContent(/appears in your workspace menu/);
  });

  it("accepts the bare code at the end of the link", async () => {
    const user = userEvent.setup();
    render(<JoinWorkspaceDialog onClose={() => undefined} />);
    await pasteLink(user, "tok_abcdef123456");
    expect(await screen.findByText("Acme Legal")).toBeInTheDocument();
  });

  it("says so for a link that is not a join link, and one already used", async () => {
    const user = userEvent.setup();
    render(<JoinWorkspaceDialog onClose={() => undefined} />);
    await pasteLink(user, "https://example.com/not-a-join-link");
    expect(await screen.findByText(JOIN_MESSAGES.invalid)).toBeInTheDocument();
    expect(preview).not.toHaveBeenCalled();

    preview.mockResolvedValue({ kind: "used" });
    await user.clear(screen.getByLabelText("Join link"));
    await pasteLink(user);
    expect(await screen.findByText(JOIN_MESSAGES.used)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send request/ })).toBeDisabled();
  });

  it("reports an existing membership, a pending request, and an unverified email", async () => {
    const user = userEvent.setup();
    render(<JoinWorkspaceDialog onClose={() => undefined} />);
    await pasteLink(user);
    await screen.findByText("Acme Legal");

    submit.mockResolvedValueOnce({ kind: "already-member" });
    await user.click(screen.getByRole("button", { name: /Send request/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(JOIN_MESSAGES.alreadyMember);

    submit.mockResolvedValueOnce({ kind: "error", message: "x", reason: "email-unverified" });
    await user.click(screen.getByRole("button", { name: /Send request/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(JOIN_MESSAGES.emailUnverified);

    submit.mockResolvedValueOnce({ kind: "pending" });
    await user.click(screen.getByRole("button", { name: /Send request/ }));
    expect(await screen.findByRole("status")).toHaveTextContent(JOIN_MESSAGES.pending);
  });

  it("needs a name before sending", async () => {
    const user = userEvent.setup();
    render(<JoinWorkspaceDialog onClose={() => undefined} />);
    await pasteLink(user);
    await screen.findByText("Acme Legal");
    await user.clear(screen.getByLabelText("Your full name"));
    expect(screen.getByRole("button", { name: /Send request/ })).toBeDisabled();
  });
});

describe("the workspace menu", () => {
  it("offers Join another workspace (not Create, not SOON), re-reads the list on opening, and opens the dialog", async () => {
    const user = userEvent.setup();
    render(<WorkspaceSwitcher collapsed={false} />);
    await user.click(screen.getByRole("button", { name: /Current workspace: Mine/ }));
    expect(platform.refreshWorkspaceList).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/SOON/)).toBeNull();
    expect(screen.queryByText(/Create/)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Join another workspace" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Join link")).toBeInTheDocument();
  });
});

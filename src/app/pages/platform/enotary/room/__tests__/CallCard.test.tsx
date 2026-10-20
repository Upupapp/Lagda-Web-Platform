// The call card: what the mock's call shows (time, private room, the other person with a Joined chip, own picture,
// controls, the last thing said) and the maximised layout with its chat, participants and document.

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CallCard } from "../CallCard";
import type { RoomMessage, Session } from "../../../../../services/real/enotary-sessions.service";
import type { RoomConnection } from "../useRoomConnection";

const session = { id: "ens_1", role: "client", clientName: "Rosa Villanueva", notaryName: "Aiyana Cruz", openedAt: new Date(Date.now() - 65_000).toISOString() } as unknown as Session;
const connection = (over: Partial<RoomConnection> = {}): RoomConnection => ({
  media: "ready", link: "waiting", local: null, remote: null, micOn: true, camOn: true,
  toggleMic: vi.fn(), toggleCam: vi.fn(), retry: vi.fn(), ...over,
});
const messages: RoomMessage[] = [{ id: "m1", role: "notary", body: "Good day. Please choose the document.", sentAt: "2026-10-18T02:00:00.000Z" } as RoomMessage];

const card = (over: Partial<Parameters<typeof CallCard>[0]> = {}) => render(
  <CallCard
    session={session} connection={connection()} partnerName="Atty. Aiyana Cruz" partnerRole="Notary public" selfIdentityVerified partnerPresent
    messages={messages} onSend={vi.fn().mockResolvedValue(undefined)} onLeave={vi.fn()} document={<p>the document view</p>} {...over}
  />,
);

describe("the call card", () => {
  it("shows the time, the private room, the other person as joined, and the last thing said", () => {
    card();
    expect(screen.getByTestId("call-time")).toHaveTextContent(/^01:0[5-9]$/);
    expect(screen.getByText("Private room")).toBeInTheDocument();
    expect(screen.getByText("Atty. Aiyana Cruz")).toBeInTheDocument();
    expect(screen.getByText("Joined")).toBeInTheDocument();
    expect(screen.getByText("Identity verified")).toBeInTheDocument();
    expect(screen.getByTestId("call-said")).toHaveTextContent("Atty. Aiyana Cruz: Good day. Please choose the document.");
  });

  it("says the other person is not here yet, and waits for them", () => {
    card({ partnerPresent: false, messages: [] });
    expect(screen.getByText("Not here yet")).toBeInTheDocument();
    expect(screen.getByTestId("call-said")).toHaveTextContent("Waiting for Atty. Aiyana Cruz to join.");
  });

  it("mutes, stops the camera and leaves", async () => {
    const user = userEvent.setup();
    const toggleMic = vi.fn();
    const toggleCam = vi.fn();
    const conn = connection({ local: {} as MediaStream, toggleMic, toggleCam });
    const onLeave = vi.fn();
    card({ connection: conn, onLeave });
    await user.click(screen.getByRole("button", { name: /Mute/ }));
    await user.click(screen.getByRole("button", { name: /Stop video/ }));
    await user.click(screen.getByTestId("call-leave"));
    expect(toggleMic).toHaveBeenCalled();
    expect(toggleCam).toHaveBeenCalled();
    expect(onLeave).toHaveBeenCalled();
  });

  it("maximises to the whole window with the chat beside it, and minimises again", async () => {
    const user = userEvent.setup();
    card();
    expect(screen.getByTestId("call-card")).toHaveAttribute("data-max", "false");
    await user.click(screen.getByTestId("call-chat"));
    const open = screen.getByTestId("call-card");
    expect(open).toHaveAttribute("data-max", "true");
    expect(screen.getByRole("dialog", { name: "eNotary session with Atty. Aiyana Cruz" })).toBe(open);
    const panel = screen.getByRole("complementary", { name: "Chat" });
    expect(within(panel).getByRole("log", { name: "Chat" })).toHaveTextContent("Good day. Please choose the document.");
    await user.click(screen.getByRole("button", { name: /Participants/ }));
    expect(screen.getByTestId("call-people")).toHaveTextContent("Atty. Aiyana Cruz");
    await user.click(screen.getByRole("button", { name: /Document/ }));
    expect(screen.getByText("the document view")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Gallery view" }));
    expect(screen.getByRole("button", { name: "Gallery view" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByTestId("call-minimise"));
    expect(screen.getByTestId("call-card")).toHaveAttribute("data-max", "false");
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("leaves the maximised call with Escape", async () => {
    const user = userEvent.setup();
    card();
    await user.click(screen.getByTestId("call-maximise"));
    expect(screen.getByTestId("call-card")).toHaveAttribute("data-max", "true");
    await user.keyboard("{Escape}");
    expect(screen.getByTestId("call-card")).toHaveAttribute("data-max", "false");
  });

  it("says when the camera is blocked or the video cannot connect, and offers a retry", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    card({ connection: connection({ media: "denied", link: "failed", retry }) });
    expect(screen.getByTestId("media-denied")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try the video again" }));
    expect(retry).toHaveBeenCalled();
  });
});

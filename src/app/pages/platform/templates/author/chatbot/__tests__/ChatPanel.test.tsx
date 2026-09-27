// The panel's timing (loader, thinking, streaming), avatars and grouping,
// chips and the confirmation card — on fake timers.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPanel } from "../ChatPanel";
import { getChatSession, resetChatStore } from "../chat-store";
import type { EngineContext } from "../engine";

const ctx: EngineContext = { userName: "Ana Reyes", documentHasContent: false, canSaveRoles: true, today: "March 1, 2027" };
const person = { id: "u1", email: "ana@example.com", displayName: "Ana Reyes" } as never;

function setup(over: Partial<Parameters<typeof ChatPanel>[0]> = {}) {
  const onWrite = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup({ delay: null });
  const view = render(
    <ChatPanel templateId="tpl_1" variant="side" user={person} ctx={ctx} reduced={false} onClose={onClose} onWrite={onWrite} {...over} />,
  );
  return { view, user, onWrite, onClose };
}

const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

async function ready() {
  await tick(3000 + 420 + 50);
  await tick(1500); // the greeting streams in
}

async function send(user: ReturnType<typeof userEvent.setup>, text: string) {
  const box = screen.getByLabelText("Message LAGDA Chatbot");
  await user.type(box, text);
  await user.keyboard("{Enter}");
}

const log = () => screen.getByRole("log");

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  resetChatStore();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("opening", () => {
  it("plays the orbit loader for three seconds, then greets", async () => {
    setup();
    expect(screen.getByTestId("chat-loader")).toHaveTextContent("Getting your assistant ready");
    await tick(2800);
    expect(screen.getByTestId("chat-loader")).toBeInTheDocument();
    await tick(200 + 420 + 60);
    expect(screen.queryByTestId("chat-loader")).not.toBeInTheDocument();
    await tick(1500);
    expect(log()).toHaveTextContent(/Hi Ana! I'm LAGDA Chatbot/);
  });

  it("reduced motion: about a second, and no morph", async () => {
    setup({ reduced: true });
    await tick(1000);
    expect(screen.queryByTestId("chat-loader")).not.toBeInTheDocument();
    expect(log()).toHaveTextContent(/Hi Ana!/);
  });

  it("does not replay the loader for a conversation already under way", async () => {
    const { view } = setup();
    await ready();
    view.unmount();
    setup();
    expect(screen.queryByTestId("chat-loader")).not.toBeInTheDocument();
    expect(log()).toHaveTextContent(/Hi Ana!/);
  });

  it("is a labelled complementary region on a wide screen and a modal dialog as a sheet", () => {
    const { view } = setup();
    expect(screen.getByRole("complementary", { name: /LAGDA Chatbot — writing assistant/ })).toBeInTheDocument();
    expect(screen.getByText("LAGDA Chatbot uses built-in templates and rules. Nothing you type leaves your browser.")).toBeInTheDocument();
    view.unmount();
    setup({ variant: "sheet" });
    expect(screen.getByRole("dialog", { name: /LAGDA Chatbot/ })).toHaveAttribute("aria-modal", "true");
  });
});

describe("replies", () => {
  it("thinks for two seconds before the first reply", async () => {
    const { user } = setup();
    await ready();
    await send(user, "I need an NDA");
    expect(screen.getByTestId("chat-thinking")).toBeInTheDocument();
    await tick(1800);
    expect(screen.getByTestId("chat-thinking")).toBeInTheDocument();
    await tick(250);
    expect(screen.queryByTestId("chat-thinking")).not.toBeInTheDocument();
    expect(log()).toHaveTextContent(/Non-Disclosure Agreement \(NDA\)/);
  });

  it("thinks 0.8–1.5s for later replies", async () => {
    const { user } = setup();
    await ready();
    await send(user, "I need an NDA");
    await tick(2000);
    await tick(1500);
    await send(user, "Acme Inc.");
    await tick(700);
    expect(screen.getByTestId("chat-thinking")).toBeInTheDocument();
    await tick(850);
    expect(screen.queryByTestId("chat-thinking")).not.toBeInTheDocument();
  });

  it("streams the reply in quickly, and shows its chips when done", async () => {
    const { user } = setup();
    await ready();
    await send(user, "I need an NDA");
    await tick(2050);
    // Streaming: the chips of the newest message wait until the text is in.
    expect(screen.queryByRole("button", { name: "Skip" })).not.toBeInTheDocument();
    await tick(1300);
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
  });

  it("Shift+Enter is a new line, not a send", async () => {
    const { user } = setup();
    await ready();
    await user.type(screen.getByLabelText("Message LAGDA Chatbot"), "hello{Shift>}{Enter}{/Shift}");
    expect(screen.queryByTestId("chat-thinking")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Message LAGDA Chatbot")).toHaveValue("hello\n");
  });

  it("the latest bot reply is announced to assistive technology", async () => {
    const { user } = setup();
    await ready();
    await send(user, "help");
    await tick(2000);
    expect(screen.getByRole("status")).toHaveTextContent(/I can draft any of LAGDA's ready-made documents/);
  });
});

describe("avatars and grouping", () => {
  it("shows one avatar per group, beside the group's last bubble: bot left, the user's own on the right", async () => {
    const { user } = setup();
    await ready();
    await send(user, "I need an NDA");
    await tick(2000);
    await tick(1500);
    // bot (greeting) · user · bot (two bubbles: chosen + question)
    expect(within(log()).getAllByTestId("chat-avatar-bot")).toHaveLength(2);
    expect(within(log()).getAllByTestId("chat-avatar-user")).toHaveLength(1);
    const groups = within(log()).getAllByTestId(/chat-group-/);
    expect(groups.map(g => g.dataset.testid)).toEqual(["chat-group-bot", "chat-group-user", "chat-group-bot"]);
    expect(within(groups[2]!).getAllByTestId("chat-message-bot")).toHaveLength(2);
    // The user's avatar is their own — initials when there is no photo.
    expect(within(log()).getByTestId("chat-avatar-user")).toHaveTextContent("AR");
    expect(groups[1]).toHaveStyle({ flexDirection: "row-reverse" });
  });
});

describe("the confirmation card", () => {
  it("summarises, warns, and hands the plan to the page on Yes", async () => {
    const { user, onWrite } = setup();
    await ready();
    await send(user, "add a data privacy clause");
    await tick(2000);
    await tick(1500);
    const card = screen.getByTestId("chat-summary-card");
    expect(card).toHaveTextContent("Ready to write “Data Privacy clause”?");
    expect(card).toHaveTextContent("This conversation will be cleared once I start writing.");
    await user.click(within(card).getByRole("button", { name: "Yes, write it" }));
    expect(onWrite).toHaveBeenCalledWith(expect.objectContaining({ title: "Data Privacy clause", clauseOnly: ["data-privacy"] }));
  });

  it("Not yet keeps the conversation going", async () => {
    const { user, onWrite } = setup();
    await ready();
    await send(user, "add a data privacy clause");
    await tick(2000);
    await tick(1500);
    await user.click(within(screen.getByTestId("chat-summary-card")).getByRole("button", { name: "Not yet" }));
    await tick(1600);
    await tick(1500);
    expect(onWrite).not.toHaveBeenCalled();
    expect(log()).toHaveTextContent(/No problem|take your time/);
  });
});

describe("header", () => {
  it("Clear chat starts over from the greeting", async () => {
    const { user } = setup();
    await ready();
    await send(user, "I need an NDA");
    await tick(2000);
    await tick(1500);
    await user.click(screen.getByRole("button", { name: "Chat options" }));
    await user.click(screen.getByRole("menuitem", { name: /Clear chat/ }));
    expect(getChatSession("tpl_1").messages.map(m => m.from)).toEqual(["bot"]);
    expect(getChatSession("tpl_1").engine.docId).toBeNull();
  });

  it("close and Escape both close", async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByRole("button", { name: "Close LAGDA Chatbot" }));
    await user.click(screen.getByRole("button", { name: "Chat options" }));
    await user.keyboard("{Escape}"); // closes the menu first
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("closing mid-reply keeps the reply", async () => {
    const { user, view } = setup();
    await ready();
    await send(user, "I need an NDA");
    await tick(500);
    view.unmount();
    expect(getChatSession("tpl_1").messages.filter(m => m.from === "bot").length).toBeGreaterThan(1);
  });
});

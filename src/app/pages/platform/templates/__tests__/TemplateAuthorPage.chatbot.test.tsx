// The author page with the LAGDA Chatbot: the old purpose bar is gone, the
// conversation is deleted on write / save / leave, and the page warns first.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { DocumentTemplate } from "../../../../models/templates";

const template = {
  id: "tpl_1", name: "Offer", description: "", category: "hr", status: "draft", scope: "personal", source: "blank",
  ownerLabel: "", workspaceLabel: "", tags: [], documents: [], placeholders: [],
  routing: { mode: "sequential", groups: [] }, authentication: { globalDefault: "none", placeholderOverrides: {} },
  settings: { completionCopySender: true }, variables: [], fields: [],
  content: { kind: "flowDocument", content: [] }, contentPageCount: 0,
} as unknown as DocumentTemplate;

vi.mock("../../../../context/TemplateContext", () => ({
  TemplateProvider: ({ children }: { children: React.ReactNode }) => children,
  useTemplates: () => ({ state: { activeTemplate: template, activeLoading: false, activeError: null }, loadTemplate: () => undefined }),
  useActiveTemplateLoader: () => ({ status: "ready", workspaceId: "ws_1" }),
}));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1" }, user: { id: "u1", email: "ana@example.com", displayName: "Ana Reyes" } }),
}));
vi.mock("../../../../hooks/usePageMeta", () => ({ usePageMeta: () => undefined }));
vi.mock("../../../../services/processing.service", () => ({
  useProcessing: () => ({ run: (_m: unknown, fn: () => Promise<unknown>) => fn() }),
}));
const generateTemplateDocument = vi.fn();
const updateTemplate = vi.fn();
const saveTemplateContent = vi.fn();
vi.mock("../../../../services/templates-source", () => ({
  realTemplatesAvailable: () => true,
  generateTemplateDocument: (...a: unknown[]) => generateTemplateDocument(...a),
  saveResolvedFieldAnchors: () => Promise.resolve(),
  updateTemplate: (...a: unknown[]) => updateTemplate(...a),
  saveTemplateContent: (...a: unknown[]) => saveTemplateContent(...a),
  isTemplateContentConflict: () => false,
  conflictRevisionOf: () => undefined,
}));

import { TemplateAuthorPage, LEAVE_WARNING, SAVE_WARNING } from "../TemplateAuthorPage";
import { getChatSession, hasChatSession, resetChatStore, setChatSession } from "../author/chatbot/chat-store";
import { initialState, respond, type EngineState } from "../author/chatbot/engine";
// The page loads the draft builder on demand. Loading it here first means the
// test waits on the save itself, not on a cold module transform that can take
// longer than waitFor allows when the whole suite is running.
import "../author/chatbot/draft";
import "../author/chatbot/participants";

function mountPage() {
  const router = createMemoryRouter([
    { path: "/app/templates/:templateId/author", element: <TemplateAuthorPage /> },
    { path: "/app/templates/:id", element: <p>template details</p> },
    { path: "/app/templates/:id/use", element: <p>use template</p> },
  ], { initialEntries: ["/app/templates/tpl_1/author"] });
  render(<RouterProvider router={router} />);
  return router;
}

const ctx = { userName: "Ana Reyes", documentHasContent: false, canSaveRoles: true, today: "March 1, 2027" };

/** A conversation at the confirmation card, with participants. */
function seedConfirm(): EngineState {
  let s = initialState();
  for (const t of ["Create me an employment agreement contract to be signed by Juan Dela Cruz, but approved or skipped by Maria Santos", "Acme Inc.", "Software Engineer"]) {
    s = respond(s, { text: t }, ctx).state;
  }
  const card = respond(s, { text: "make it formal" }, ctx);
  setChatSession("tpl_1", {
    introduced: true,
    engine: card.state,
    messages: [
      { id: "u1", from: "user", text: "Create me an employment agreement…" },
      { id: "b1", from: "bot", text: card.replies[1]!.text, card: card.replies[1]!.card!, chips: card.replies[1]!.chips! },
    ],
  });
  return card.state;
}

function seedChat() {
  setChatSession("tpl_1", { introduced: true, engine: initialState(), messages: [
    { id: "b0", from: "bot", text: "Hi Ana!" }, { id: "u1", from: "user", text: "I need an NDA" },
  ] });
}

let user: ReturnType<typeof userEvent.setup>;

const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

// A data router builds a `Request` with jsdom's AbortSignal, which Node's
// own `Request` rejects. These routes have no loaders, so the signal is
// dropped for the test.
const NodeRequest = globalThis.Request;
class TestRequest extends NodeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    const { signal: _signal, ...rest } = init ?? {};
    super(input, rest);
  }
}

beforeEach(() => {
  vi.stubGlobal("Request", TestRequest);
  user = userEvent.setup();
  resetChatStore();
  generateTemplateDocument.mockReset();
  updateTemplate.mockReset();
  saveTemplateContent.mockReset();
  generateTemplateDocument.mockResolvedValue({ template: { ...template, contentPageCount: 1 }, resolvedAnchors: [] });
  saveTemplateContent.mockResolvedValue({ contentRevision: 2, contentSavedAt: "2027-03-01T02:05:00.000Z", contentGenerated: false });
});
afterEach(() => { vi.useRealTimers(); });

describe("the author page and LAGDA Chatbot", () => {
  it("has no purpose bar any more — the chatbot button instead", () => {
    mountPage();
    expect(screen.queryByText(/Start from a purpose/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Write it for me" })).toBeNull();
    const toggle = screen.getByRole("button", { name: "Open LAGDA Chatbot" });
    // The toggle keeps the usual bot.
    for (const img of Array.from(toggle.querySelectorAll("img"))) {
      expect(img.getAttribute("src")).toMatch(/lagda-bot\.webp$/);
    }
  });

  it("the button opens the side panel, and closing returns focus to it", async () => {
    mountPage();
    await user.click(screen.getByRole("button", { name: "Open LAGDA Chatbot" }));
    expect(await screen.findByRole("complementary", { name: /LAGDA Chatbot/ })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Close LAGDA Chatbot" }));
    expect(screen.queryByRole("complementary", { name: /LAGDA Chatbot/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Open LAGDA Chatbot" })).toHaveFocus();
  });

  it("keeps the conversation while the panel is closed and reopened", async () => {
    seedChat();
    mountPage();
    await user.click(screen.getByRole("button", { name: "Open LAGDA Chatbot" }));
    await user.click(await screen.findByRole("button", { name: "Close LAGDA Chatbot" }));
    await user.click(screen.getByRole("button", { name: "Open LAGDA Chatbot" }));
    expect(within(await screen.findByRole("log")).getByText("I need an NDA")).toBeTruthy();
  });

  describe("leaving", () => {
    it("Back with a conversation warns; Stay keeps the page and the chat", async () => {
      seedChat();
      const router = mountPage();
      await user.click(screen.getByRole("link", { name: /Offer/ }));
      const dialog = await screen.findByRole("alertdialog");
      expect(dialog.textContent).toContain(LEAVE_WARNING);
      await user.click(within(dialog).getByRole("button", { name: "Stay" }));
      expect(router.state.location.pathname).toBe("/app/templates/tpl_1/author");
      expect(hasChatSession("tpl_1")).toBe(true);
    });

    it("Leave and delete goes back and deletes the conversation", async () => {
      seedChat();
      const router = mountPage();
      await user.click(screen.getByRole("link", { name: /Offer/ }));
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByRole("button", { name: "Leave and delete" }));
      expect(await screen.findByText("template details")).toBeTruthy();
      expect(router.state.location.pathname).toBe("/app/templates/tpl_1");
      expect(hasChatSession("tpl_1")).toBe(false);
    });

    it("Back without a conversation just goes", async () => {
      mountPage();
      await user.click(screen.getByRole("link", { name: /Offer/ }));
      expect(await screen.findByText("template details")).toBeTruthy();
    });

    it("asks the browser to confirm an unload while a chat exists", () => {
      seedChat();
      mountPage();
      const e = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(e);
      expect(e.defaultPrevented).toBe(true);
    });

    it("no unload prompt without a conversation", () => {
      mountPage();
      const e = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(e);
      expect(e.defaultPrevented).toBe(false);
    });
  });

  describe("saving", () => {
    it("Save with a conversation warns; Keep chatting does not save", async () => {
      seedChat();
      mountPage();
      await user.click(screen.getByRole("button", { name: /Generate & Save/ }));
      const dialog = await screen.findByRole("alertdialog");
      expect(dialog.textContent).toContain(SAVE_WARNING);
      await user.click(within(dialog).getByRole("button", { name: "Keep chatting" }));
      expect(generateTemplateDocument).not.toHaveBeenCalled();
      expect(hasChatSession("tpl_1")).toBe(true);
    });

    it("Save finishes the template and deletes the conversation", async () => {
      seedChat();
      mountPage();
      await user.click(screen.getByRole("button", { name: /Generate & Save/ }));
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByRole("button", { name: "Save" }));
      expect(generateTemplateDocument).toHaveBeenCalledTimes(1);
      expect(hasChatSession("tpl_1")).toBe(false);
    });

    it("Save without a conversation saves straight away", async () => {
      mountPage();
      await user.click(screen.getByRole("button", { name: /Generate & Save/ }));
      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(generateTemplateDocument).toHaveBeenCalledTimes(1);
    });

    it("once generated, the same button offers to use the template", async () => {
      const router = mountPage();
      await user.click(screen.getByRole("button", { name: /Generate & Save/ }));
      const use = await screen.findByRole("button", { name: /Use this template now/ });
      expect(screen.queryByRole("button", { name: /Generate & Save/ })).toBeNull();
      await user.click(use);
      expect(router.state.location.pathname).toBe("/app/templates/tpl_1/use");
      expect(generateTemplateDocument).toHaveBeenCalledTimes(1);
    });
  });

  describe("writing", () => {
    it("Yes clears the chat, closes the panel, saves the roles, loads, types, and reports", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      user = userEvent.setup({ delay: null });
      seedConfirm();
      updateTemplate.mockImplementation((_ws: string, _id: string, draft: { placeholders: unknown[] }) => Promise.resolve({
        ...template,
        placeholders: (draft.placeholders as { label: string }[]).map((p, i) => ({ ...p, backendSlotId: `wfs_${String(i)}` })),
      }));
      mountPage();
      await user.click(screen.getByRole("button", { name: "Open LAGDA Chatbot" }));
      await user.click(within(await screen.findByTestId("chat-summary-card")).getByRole("button", { name: "Yes, write it" }));

      // Conversation reset and the panel closed at once.
      expect(hasChatSession("tpl_1")).toBe(false);
      expect(getChatSession("tpl_1").messages).toEqual([]);
      expect(screen.queryByTestId("lagda-chatbot-panel")).toBeNull();
      // The same orbit loader, over the page — with the usual bot, not the
      // opening loader's artwork.
      expect(within(screen.getByTestId("draft-loader")).getByTestId("orbit-loader-image").getAttribute("src"))
        .toMatch(/lagda-bot\.webp$/);
      expect(screen.queryByRole("button", { name: "Open LAGDA Chatbot" })).toBeNull();

      // The template's roles match the conversation's participants.
      // (The draft builder loads on demand, so this waits for it.)
      await vi.waitFor(() => { expect(updateTemplate).toHaveBeenCalledTimes(1); });
      const sent = updateTemplate.mock.calls[0]![2] as { placeholders: { label: string; role: string; routingStep: number }[]; routingMode: string };
      expect(sent.placeholders.map(p => [p.label, p.role, p.routingStep])).toEqual([["Employee", "signer", 1], ["HR Approver", "approver", 2]]);
      expect(sent.routingMode).toBe("sequential");

      await tick(3000);
      expect(screen.queryByTestId("draft-loader")).toBeNull();
      expect(screen.getByRole("button", { name: /Skip animation/ })).toBeTruthy();
      // Save is out of reach while the draft is being typed.
      expect(screen.getByRole("button", { name: /Generate & Save/ })).toBeDisabled();

      await user.click(screen.getByRole("button", { name: /Skip animation/ }));
      const done = screen.getByTestId("draft-done");
      expect(done.textContent).toContain("Draft written. Review and edit anything you like.");
      expect(done.textContent).toContain("Template roles set up: Employee, HR Approver.");
      const page = document.querySelector(".ProseMirror")!;
      expect(page.textContent).toContain("Juan Dela Cruz");
      expect(page.textContent).toContain("Approved by:");
      // Bound to the roles that were just saved.
      expect(page.querySelectorAll(".flow-field-anchor").length).toBeGreaterThanOrEqual(2);

      // Autosaved ONCE, straight away, with the finished draft — not frame
      // by frame while it was typed, and without waiting for the debounce.
      await vi.waitFor(() => { expect(saveTemplateContent).toHaveBeenCalledTimes(1); });
      const [ws, id, body] = saveTemplateContent.mock.calls[0]! as [string, string, { content: { content: unknown[] } }];
      expect([ws, id]).toEqual(["ws_1", "tpl_1"]);
      expect(JSON.stringify(body.content)).toContain("Juan Dela Cruz");
      await tick(5000);
      expect(saveTemplateContent).toHaveBeenCalledTimes(1);
    });
  });
});

// The author page against a REAL TemplateProvider and the real templates
// source, with only `fetch` mocked: the refresh bug (the page mounting before
// the session bootstrap has a workspace), and the draft autosave end to end —
// restore on refresh, debounce, hidden-page flush, retry, conflict + Reload,
// and when the leave prompts fire.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { Editor } from "@tiptap/core";

const platform = vi.hoisted(() => {
  type Value = {
    sessionStatus: string; workspaceStatus: string;
    currentWorkspace: { id: string } | null;
    user: { id: string; email: string; displayName: string } | null;
  };
  const listeners = new Set<() => void>();
  const store = {
    value: {
      sessionStatus: "initializing", workspaceStatus: "initializing", currentWorkspace: null, user: null,
    } as Value,
    set(patch: Partial<Value>) {
      store.value = { ...store.value, ...patch };
      listeners.forEach(l => l());
    },
    subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
  };
  return store;
});

vi.mock("../../../../services/backend-flag", () => ({ API_BASE_URL: "https://api.test", USE_REAL_BACKEND: true }));
vi.mock("../../../../context/PlatformContext", async () => {
  const React = await import("react");
  return {
    usePlatform: () => React.useSyncExternalStore(platform.subscribe, () => platform.value),
  };
});
vi.mock("../../../../hooks/usePageMeta", () => ({ usePageMeta: () => undefined }));
vi.mock("../../../../services/processing.service", () => ({
  useProcessing: () => ({ run: (_m: unknown, fn: () => Promise<unknown>) => fn() }),
}));

import { TemplateAuthorPage, CONFLICT_MESSAGE, UNSAVED_LEAVE_WARNING } from "../TemplateAuthorPage";
import { resetChatStore } from "../author/chatbot/chat-store";

const BASE = "https://api.test/workspaces";

function flow(text: string) {
  return { kind: "flowDocument", content: [{ kind: "paragraph", content: [{ kind: "text", text }] }] };
}

function wireTemplate(text: string, revision: number) {
  return {
    workflowTemplateId: "tpl_1", name: "Offer", routingMode: "sequential", roleSlots: [],
    completionSettings: { notifySenderOnComplete: true }, variables: [],
    documentId: null, sourceArtifactId: null,
    content: flow(text), contentPageCount: 0,
    contentRevision: revision, contentSavedAt: "2027-03-01T01:30:00.000Z", contentGenerated: false,
    createdAt: "2027-03-01T00:00:00.000Z", updatedAt: "2027-03-01T01:30:00.000Z",
  };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

type Route = (url: string, init: RequestInit) => Response | Promise<Response> | undefined;

let serverText = "Restored draft text";
let serverRevision = 4;
let putResponder: (n: number, body: { baseRevision?: number }) => Response | Promise<Response>;
let fetchMock: ReturnType<typeof vi.fn>;
let puts: { body: { content: unknown; baseRevision?: number }; keepalive: boolean }[];

const defaultRoute: Route = (url, init) => {
  const method = init.method ?? "GET";
  if (method === "GET" && url.endsWith("/workflow-templates/tpl_1")) {
    return json(200, wireTemplate(serverText, serverRevision));
  }
  if (method === "GET" && url.endsWith("/workflow-templates/tpl_1/fields")) return json(200, { items: [] });
  if (method === "PUT" && url.endsWith("/workflow-templates/tpl_1/content")) {
    const body = JSON.parse(init.body as string) as { content: unknown; baseRevision?: number };
    puts.push({ body, keepalive: init.keepalive === true });
    return putResponder(puts.length, body);
  }
  return undefined;
};

function saved(revision: number, at = "2027-03-01T02:05:00.000Z") {
  return json(200, { contentRevision: revision, contentSavedAt: at, contentGenerated: false });
}

function mountPage() {
  const router = createMemoryRouter([
    { path: "/app/templates/:templateId/author", element: <TemplateAuthorPage /> },
    { path: "/app/templates/:id", element: <p>template details</p> },
    { path: "/sign-in", element: <p>sign in page</p> },
  ], { initialEntries: ["/app/templates/tpl_1/author"] });
  render(<RouterProvider router={router} />);
  return router;
}

function signedIn(workspaceId = "ws_1") {
  act(() => {
    platform.set({
      sessionStatus: "authenticated", workspaceStatus: "ready",
      currentWorkspace: { id: workspaceId },
      user: { id: "u1", email: "ana@example.com", displayName: "Ana Reyes" },
    });
  });
}

function editorOf(): Editor {
  const el = document.querySelector<HTMLElement & { editor?: Editor }>(".ProseMirror");
  if (!el?.editor) throw new Error("editor not mounted");
  return el.editor;
}

/** Types at the end of the document, as one edit. */
function typeText(text: string) {
  act(() => { editorOf().chain().focus("end").insertContent(text).run(); });
}

const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

async function openLoaded() {
  const router = mountPage();
  signedIn();
  await vi.waitFor(() => { expect(document.querySelector(".ProseMirror")?.textContent).toContain(serverText); });
  return router;
}

function status() { return screen.getByTestId("save-status").textContent ?? ""; }

const NodeRequest = globalThis.Request;
class TestRequest extends NodeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    const { signal: _signal, ...rest } = init ?? {};
    super(input, rest);
  }
}

let visibility: DocumentVisibilityState = "visible";

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.stubGlobal("Request", TestRequest);
  resetChatStore();
  platform.value = { sessionStatus: "initializing", workspaceStatus: "initializing", currentWorkspace: null, user: null };
  serverText = "Restored draft text";
  serverRevision = 4;
  puts = [];
  putResponder = n => saved(serverRevision + n);
  fetchMock = vi.fn((url: string, init: RequestInit = {}) => {
    const r = defaultRoute(url, init);
    return Promise.resolve(r ?? json(404, { error: { code: "not_found", message: `No route for ${url}` } }));
  });
  vi.stubGlobal("fetch", fetchMock);
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
});
afterEach(() => { vi.useRealTimers(); });

describe("the author page on a refresh", () => {
  it("waits for the workspace instead of reading the fixtures, then loads the real template", async () => {
    mountPage();
    // Bootstrap in flight: no read, and certainly no "not found".
    await tick(500);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/not found/i)).toBeNull();

    signedIn();
    await vi.waitFor(() => { expect(document.querySelector(".ProseMirror")?.textContent).toContain("Restored draft text"); });
    expect(fetchMock.mock.calls.map(c => String(c[0]))).toContain(`${BASE}/ws_1/workflow-templates/tpl_1`);
    expect(screen.queryByText(/not found/i)).toBeNull();
    // The saved-at time the server reported, in local time (Asia/Manila).
    expect(status()).toBe("All changes saved · 09:30");
  });

  it("waits through the render where the status is ready but the workspace is not set yet", async () => {
    mountPage();
    act(() => { platform.set({ sessionStatus: "authenticated", workspaceStatus: "ready", currentWorkspace: null }); });
    await tick(200);
    expect(fetchMock).not.toHaveBeenCalled();
    signedIn();
    await vi.waitFor(() => { expect(fetchMock).toHaveBeenCalled(); });
  });

  it("re-reads when the workspace changes", async () => {
    await openLoaded();
    const reads = () => fetchMock.mock.calls.filter(c => String(c[0]).endsWith("/tpl_1") && ((c[1] as RequestInit | undefined)?.method ?? "GET") === "GET");
    expect(reads().map(c => String(c[0]))).toEqual([`${BASE}/ws_1/workflow-templates/tpl_1`]);
    signedIn("ws_2");
    await vi.waitFor(() => {
      expect(reads().map(c => String(c[0]))).toEqual([
        `${BASE}/ws_1/workflow-templates/tpl_1`, `${BASE}/ws_2/workflow-templates/tpl_1`,
      ]);
    });
  });

  it("sends a signed-out visitor to sign in rather than showing fixtures", async () => {
    const router = mountPage();
    act(() => { platform.set({ sessionStatus: "unauthenticated" }); });
    await vi.waitFor(() => { expect(router.state.location.pathname).toBe("/sign-in"); });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("draft autosave on the author page", () => {
  it("saves ~2s after typing stops, on the loaded revision, and says so", async () => {
    await openLoaded();
    typeText(" and more");
    expect(status()).toBe("Saving…");
    await tick(1500);
    expect(puts).toHaveLength(0);
    await tick(600);
    expect(puts).toHaveLength(1);
    expect(puts[0]!.body.baseRevision).toBe(4);
    expect(JSON.stringify(puts[0]!.body.content)).toContain("Restored draft text and more");
    await vi.waitFor(() => { expect(status()).toBe("All changes saved · 10:05"); });
  });

  it("a refresh restores what was autosaved", async () => {
    // What the server holds after an earlier session's autosave.
    serverText = "Typed before the refresh";
    serverRevision = 9;
    await openLoaded();
    expect(document.querySelector(".ProseMirror")?.textContent).toBe("Typed before the refresh");
    typeText("!");
    await tick(2100);
    expect(puts[0]!.body.baseRevision).toBe(9);
  });

  it("flushes at once, with keepalive, when the page is hidden", async () => {
    await openLoaded();
    typeText(" X");
    visibility = "hidden";
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(puts).toHaveLength(1);
    expect(puts[0]!.keepalive).toBe(true);
    // Nothing left for the debounce.
    await tick(3000);
    expect(puts).toHaveLength(1);
  });

  it("flushes on pagehide too", async () => {
    await openLoaded();
    typeText(" Y");
    act(() => { window.dispatchEvent(new Event("pagehide")); });
    expect(puts).toHaveLength(1);
    expect(puts[0]!.keepalive).toBe(true);
  });

  it("a failed save says so and retries until it lands", async () => {
    putResponder = n => n === 1 ? json(503, { error: { code: "unavailable", message: "down" } }) : saved(5);
    await openLoaded();
    typeText(" retry me");
    await tick(2100);
    await vi.waitFor(() => { expect(status()).toBe("Couldn't save — retrying"); });
    await tick(2100);
    expect(puts).toHaveLength(2);
    await vi.waitFor(() => { expect(status()).toBe("All changes saved · 10:05"); });
  });

  it("a conflict shows the other-tab message, and Reload loads the newer version", async () => {
    putResponder = () => json(409, { error: { code: "template_content_conflict", message: "Stale.", currentRevision: 6 } });
    await openLoaded();
    typeText(" mine");
    await tick(2100);
    const banner = await screen.findByTestId("save-conflict");
    expect(banner.textContent).toContain(CONFLICT_MESSAGE);
    expect(status()).toBe("Not saved — changed in another tab");
    // Nothing more is sent from this tab.
    typeText(" more");
    await tick(5000);
    expect(puts).toHaveLength(1);

    serverText = "The other tab's version";
    serverRevision = 6;
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
      .click(within(banner).getByRole("button", { name: /Reload/ }));
    await vi.waitFor(() => { expect(document.querySelector(".ProseMirror")?.textContent).toBe("The other tab's version"); });
    expect(screen.queryByTestId("save-conflict")).toBeNull();
    typeText("!");
    await tick(2100);
    expect(puts[1]!.body.baseRevision).toBe(6);
  });

  it("asks before unload only while a save is pending", async () => {
    await openLoaded();
    const unload = () => { const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; };
    expect(unload()).toBe(false);
    typeText(" pending");
    expect(unload()).toBe(true);
    await tick(2100);
    await vi.waitFor(() => { expect(status()).toContain("All changes saved"); });
    expect(unload()).toBe(false);
  });

  it("Back with a save pending sends it and then just goes", async () => {
    const router = await openLoaded();
    typeText(" pending");
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
      .click(screen.getByRole("link", { name: /Offer/ }));
    await vi.waitFor(() => { expect(router.state.location.pathname).toBe("/app/templates/tpl_1"); });
    expect(puts).toHaveLength(1);
    expect(JSON.stringify(puts[0]!.body.content)).toContain(" pending");
  });

  it("Back while saving is failing warns first", async () => {
    putResponder = () => json(503, { error: { code: "unavailable", message: "down" } });
    const router = await openLoaded();
    typeText(" at risk");
    await tick(2100);
    await vi.waitFor(() => { expect(status()).toBe("Couldn't save — retrying"); });
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    await u.click(screen.getByRole("link", { name: /Offer/ }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain(UNSAVED_LEAVE_WARNING);
    await u.click(within(dialog).getByRole("button", { name: "Stay" }));
    expect(router.state.location.pathname).toBe("/app/templates/tpl_1/author");
  });

  it("Back with everything saved goes without asking", async () => {
    const router = await openLoaded();
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
      .click(screen.getByRole("link", { name: /Offer/ }));
    await vi.waitFor(() => { expect(router.state.location.pathname).toBe("/app/templates/tpl_1"); });
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(puts).toHaveLength(0);
  });
});

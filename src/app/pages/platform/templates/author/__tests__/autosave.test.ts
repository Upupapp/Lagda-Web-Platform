// The draft autosave's timing rules, against the REAL content endpoint client
// (`saveTemplateContent` → apiRequest → fetch) with fetch mocked and fake
// timers — debounce, max interval, single in-flight + queue, conflict, retry
// with backoff, offline, and the keepalive flush for a hidden page.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../../../services/backend-flag", () => ({
  API_BASE_URL: "https://api.test",
  USE_REAL_BACKEND: true,
}));

import {
  saveTemplateContent, isTemplateContentConflict, conflictRevisionOf,
} from "../../../../../services/templates-source";
import { AutosaveController, formatSavedTime, type AutosaveState } from "../autosave";
import type { FlowDocument } from "../../../../../models/templates";

const URL = "https://api.test/workspaces/ws_1/workflow-templates/tpl_1/content";

function doc(text: string): FlowDocument {
  return { kind: "flowDocument", content: [{ kind: "paragraph", content: [{ kind: "text", text }] }] } as unknown as FlowDocument;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

let revision = 1;
function ok(): Response {
  revision += 1;
  return json(200, { contentRevision: revision, contentSavedAt: "2027-03-01T02:05:00.000Z", contentGenerated: false });
}

interface Harness {
  c: AutosaveController;
  fetch: ReturnType<typeof vi.fn>;
  states: AutosaveState[];
  setText: (t: string) => void;
  online: { value: boolean };
  target: EventTarget;
  bodies: () => { content: FlowDocument; baseRevision?: number }[];
}

function harness(opts: { initialRevision?: number | undefined; respond?: (n: number) => Response | Promise<Response> } = {}): Harness {
  let text = "";
  const states: AutosaveState[] = [];
  const online = { value: true };
  const target = new EventTarget();
  let n = 0;
  const fetch = vi.fn((_url: string, _init: RequestInit) => {
    n += 1;
    return Promise.resolve(opts.respond ? opts.respond(n) : ok());
  });
  vi.stubGlobal("fetch", fetch);
  const c = new AutosaveController({
    getContent: () => doc(text),
    save: (content, baseRevision, { keepalive }) =>
      saveTemplateContent("ws_1", "tpl_1", { content, baseRevision }, { keepalive }),
    isConflict: isTemplateContentConflict,
    conflictRevision: conflictRevisionOf,
    onChange: s => states.push(s),
    initialRevision: "initialRevision" in opts ? opts.initialRevision : 1,
    initialSavedAt: null,
    connectivity: target,
    isOnline: () => online.value,
  });
  return {
    c, fetch, states, online, target,
    setText: t => { text = t; },
    bodies: () => fetch.mock.calls.map(call => JSON.parse(call[1].body as string) as { content: FlowDocument; baseRevision?: number }),
  };
}

/** Types `t` as one edit. */
function type(h: Harness, t: string) { h.setText(t); h.c.change(); }

const advance = (ms: number) => vi.advanceTimersByTimeAsync(ms);

beforeEach(() => {
  vi.useFakeTimers();
  revision = 1;
});
afterEach(() => { vi.useRealTimers(); });

describe("draft autosave", () => {
  it("saves ~2s after typing stops, with the latest content and the base revision", async () => {
    const h = harness();
    type(h, "H");
    await advance(1000);
    type(h, "He");
    await advance(1000);
    type(h, "Hello");
    expect(h.c.getState().status).toBe("pending");
    await advance(1999);
    expect(h.fetch).not.toHaveBeenCalled();
    await advance(1);
    expect(h.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = h.fetch.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe(URL);
    expect(init.method).toBe("PUT");
    expect(init.credentials).toBe("include");
    expect(h.bodies()[0]).toEqual({ content: doc("Hello"), baseRevision: 1 });
    await advance(0);
    expect(h.c.getState()).toMatchObject({ status: "saved", revision: 2, savedAt: "2027-03-01T02:05:00.000Z" });
    expect(h.c.hasUnsavedChanges()).toBe(false);
  });

  it("saves at least every 30s while typing never stops", async () => {
    const h = harness();
    // A keystroke every second for 65 seconds: the debounce never fires.
    for (let i = 1; i <= 65; i++) {
      type(h, "x".repeat(i));
      await advance(1000);
    }
    expect(h.fetch).toHaveBeenCalledTimes(2);
    // Each save carries the revision the one before it returned.
    expect(h.bodies().map(b => b.baseRevision)).toEqual([1, 2]);
    await advance(2000);
    expect(h.fetch).toHaveBeenCalledTimes(3);
  });

  it("keeps ONE request in flight and queues the latest content behind it", async () => {
    let release!: () => void;
    const h = harness({
      respond: n => n === 1 ? new Promise<Response>(r => { release = () => r(ok()); }) : ok(),
    });
    type(h, "first");
    await advance(2000);
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.c.getState().status).toBe("saving");

    // More typing, and a flush asked for, while the first is still out.
    type(h, "second");
    await advance(2000);
    type(h, "third");
    void h.c.flush();
    await advance(5000);
    expect(h.fetch).toHaveBeenCalledTimes(1);

    release();
    await advance(0);
    await advance(0);
    expect(h.fetch).toHaveBeenCalledTimes(2);
    // The queued save is the LATEST content, on the NEW revision.
    expect(h.bodies()[1]).toEqual({ content: doc("third"), baseRevision: 2 });
    await advance(0);
    expect(h.c.getState().status).toBe("saved");
    await advance(30000);
    expect(h.fetch).toHaveBeenCalledTimes(2);
  });

  it("a 409 conflict stops saving and reports the server's revision", async () => {
    const h = harness({
      respond: () => json(409, { error: { code: "template_content_conflict", message: "Stale revision.", currentRevision: 7 } }),
    });
    type(h, "mine");
    await advance(2000);
    await advance(0);
    expect(h.c.getState()).toMatchObject({ status: "conflict", conflictRevision: 7 });
    // Nothing more is sent — not on more typing, not on a flush, not ever.
    type(h, "mine, more");
    expect(await h.c.flush({ keepalive: true })).toBe(false);
    await advance(60000);
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.c.hasUnsavedChanges()).toBe(true);
  });

  it("a failed save retries with backoff until it lands", async () => {
    const h = harness({ respond: n => n <= 2 ? json(500, { error: { code: "internal", message: "boom" } }) : ok() });
    type(h, "text");
    await advance(2000);
    await advance(0);
    expect(h.c.getState()).toMatchObject({ status: "error", failures: 1 });
    expect(h.c.hasUnsavedChanges()).toBe(true);

    // First retry after 2s…
    await advance(1999);
    expect(h.fetch).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(h.fetch).toHaveBeenCalledTimes(2);
    await advance(0);
    expect(h.c.getState()).toMatchObject({ status: "error", failures: 2 });
    // …the next after 5s.
    await advance(4999);
    expect(h.fetch).toHaveBeenCalledTimes(2);
    await advance(1);
    expect(h.fetch).toHaveBeenCalledTimes(3);
    await advance(0);
    expect(h.c.getState()).toMatchObject({ status: "saved", failures: 0 });
    expect(h.c.hasUnsavedChanges()).toBe(false);
  });

  it("offline, it waits without sending, and saves when the browser is back", async () => {
    const h = harness();
    h.online.value = false;
    type(h, "on the train");
    expect(h.c.getState().status).toBe("offline");
    await advance(60000);
    expect(h.fetch).not.toHaveBeenCalled();

    h.online.value = true;
    h.target.dispatchEvent(new Event("online"));
    await advance(0);
    expect(h.fetch).toHaveBeenCalledTimes(1);
    await advance(0);
    expect(h.c.getState().status).toBe("saved");
  });

  it("a flush for a hidden page goes at once, with keepalive", async () => {
    const h = harness();
    type(h, "last words");
    const done = h.c.flush({ keepalive: true });
    // Sent synchronously — a page being hidden may not get another tick.
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect((h.fetch.mock.calls[0]![1] as RequestInit).keepalive).toBe(true);
    await advance(0);
    expect(await done).toBe(true);
    // And nothing left for the debounce to send.
    await advance(30000);
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });

  it("a keepalive body too big for the browser is sent as an ordinary request", async () => {
    const h = harness();
    type(h, "x".repeat(70_000));
    void h.c.flush({ keepalive: true });
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect((h.fetch.mock.calls[0]![1] as RequestInit).keepalive).toBeUndefined();
    await advance(0);
  });

  it("a flush with nothing typed sends nothing", async () => {
    const h = harness();
    expect(await h.c.flush()).toBe(true);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("sends no baseRevision when the template has none yet", async () => {
    const h = harness({ initialRevision: undefined });
    type(h, "x");
    await h.c.flush();
    expect("baseRevision" in h.bodies()[0]!).toBe(false);
  });
});

describe("formatSavedTime", () => {
  it("is HH:MM in local time", () => {
    // vitest runs in Asia/Manila (UTC+8).
    expect(formatSavedTime("2027-03-01T02:05:00.000Z")).toBe("10:05");
    expect(formatSavedTime(null)).toBeNull();
    expect(formatSavedTime("not a date")).toBeNull();
  });
});

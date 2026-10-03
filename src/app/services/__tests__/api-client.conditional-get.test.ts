// The API client's conditional GET: it sends back the ETag of the last
// answer it held for a path, answers a 304 from that held copy (the SAME
// object), replaces it on a 200 with a new tag, never does this for a
// write, and forgets everything on sign-out.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

import { apiRequest, resetHeldAnswers } from "../api-client";
import { runSignOutCleanup } from "../session-lifecycle";

type Sent = { url: string; headers: Record<string, string>; method: string };
let sent: Sent[] = [];
let answer: (s: Sent) => Response;

const json = (body: unknown, etag?: string, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...(etag ? { etag } : {}) } });
const notModified = (etag: string) => new Response(null, { status: 304, headers: { etag } });

beforeEach(() => {
  sent = [];
  resetHeldAnswers();
  answer = () => json({ items: [] });
  vi.stubGlobal("fetch", vi.fn((url: string, init: RequestInit = {}) => {
    const s = { url, method: init.method ?? "GET", headers: (init.headers ?? {}) as Record<string, string> };
    sent.push(s);
    return Promise.resolve(answer(s));
  }));
});

describe("conditional GET", () => {
  it("sends the held tag back and answers a 304 with the held copy, the same object", async () => {
    answer = () => json({ items: [1, 2] }, 'W/"abc"');
    const first = await apiRequest<{ items: number[] }>("/workspaces/ws_1/contacts?q=a");
    expect(sent[0]?.headers["If-None-Match"]).toBeUndefined();

    answer = s => (s.headers["If-None-Match"] === 'W/"abc"' ? notModified('W/"abc"') : json({ items: [9] }, 'W/"zzz"'));
    const second = await apiRequest<{ items: number[] }>("/workspaces/ws_1/contacts?q=a");
    expect(sent[1]?.headers["If-None-Match"]).toBe('W/"abc"');
    expect(second).toBe(first);

    // Another path is another answer.
    const other = await apiRequest<{ items: number[] }>("/workspaces/ws_1/contacts?q=b");
    expect(sent[2]?.headers["If-None-Match"]).toBeUndefined();
    expect(other).toEqual({ items: [9] });
  });

  it("replaces the held copy when the answer changes", async () => {
    answer = () => json({ n: 1 }, 'W/"one"');
    const first = await apiRequest<{ n: number }>("/me/plan");
    answer = () => json({ n: 2 }, 'W/"two"');
    const second = await apiRequest<{ n: number }>("/me/plan");
    expect(second).toEqual({ n: 2 });
    expect(second).not.toBe(first);
    answer = s => (s.headers["If-None-Match"] === 'W/"two"' ? notModified('W/"two"') : json({ n: 3 }));
    expect(await apiRequest<{ n: number }>("/me/plan")).toBe(second);
  });

  it("never sends a tag with a write, and holds nothing from one", async () => {
    answer = () => json({ ok: true }, 'W/"w"');
    await apiRequest("/me/plan/upgrade-requests", { method: "POST", body: { plan: "personal" } });
    expect(sent[0]?.headers["If-None-Match"]).toBeUndefined();
    await apiRequest("/me/plan/upgrade-requests", { method: "POST", body: { plan: "personal" } });
    expect(sent[1]?.headers["If-None-Match"]).toBeUndefined();
  });

  it("asks again plainly when a 304 arrives with nothing held", async () => {
    let n = 0;
    answer = () => (++n === 1 ? notModified('W/"x"') : json({ fresh: true }, 'W/"x"'));
    expect(await apiRequest("/me")).toEqual({ fresh: true });
    expect(sent).toHaveLength(2);
    expect(sent[1]?.headers["If-None-Match"]).toBeUndefined();
  });

  it("forgets every held answer on sign-out", async () => {
    answer = () => json({ me: "ana" }, 'W/"a"');
    await apiRequest("/me");
    runSignOutCleanup();
    await apiRequest("/me");
    expect(sent[1]?.headers["If-None-Match"]).toBeUndefined();
  });
});

// A tiny fake of the 087 sharing API for tests: routes are matched on
// "METHOD /path" (query included), every call is recorded with its JSON body.

import { vi } from "vitest";

export const API = "http://api.test";

export interface Call { method: string; path: string; body: unknown }

interface WrappedReply { __reply: true; status: number; body?: unknown; blob?: Blob }
/** A WrappedReply, or any other value as a 200 JSON body. */
type Reply = unknown;

/** An explicit status (and body); anything else a route returns is a 200 JSON body. */
export const reply = (status: number, body?: unknown): WrappedReply => ({ __reply: true, status, body });
export const pdfReply = (blob: Blob): WrappedReply => ({ __reply: true, status: 200, blob });
/** Each value is a Reply, or a `(call: Call) => Reply`. */
export type Routes = Record<string, Reply>;

function isReply(value: unknown): value is WrappedReply {
  return typeof value === "object" && value !== null && "__reply" in value;
}

export function mockSharingApi(routes: Routes) {
  const calls: Call[] = [];
  const fetchMock = vi.fn((input: string, init: RequestInit = {}) => {
    const url = String(input);
    const path = url.startsWith(API) ? url.slice(API.length) : url;
    const method = (init.method ?? "GET").toUpperCase();
    const body: unknown = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
    const call = { method, path, body };
    calls.push(call);
    const key = `${method} ${path}`;
    const handler = routes[key] ?? routes[`${method} ${path.split("?")[0]}`];
    if (handler === undefined) {
      return Promise.resolve(new Response(JSON.stringify({ error: { code: "resource_not_found", message: `No route ${key}` } }), {
        status: 404, headers: { "Content-Type": "application/json" },
      }));
    }
    const raw = typeof handler === "function" ? (handler as (c: Call) => Reply)(call) : handler;
    const out: WrappedReply = isReply(raw) ? raw : { __reply: true, status: 200, body: raw };
    if (out.blob) return Promise.resolve(new Response(out.blob, { status: 200, headers: { "Content-Type": "application/pdf" } }));
    const status = out.status;
    if (status === 204) return Promise.resolve(new Response(null, { status }));
    return Promise.resolve(new Response(JSON.stringify(out.body ?? {}), { status, headers: { "Content-Type": "application/json" } }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

export const apiError = (status: number, code: string) => reply(status, { error: { code, message: code } });

const T = "2026-09-20T08:00:00.000Z";

export const DOC = {
  documentId: "doc_1", verificationId: "LAGDA-VER-2026-000111", documentTitle: "Lease Agreement",
  completedAt: T, owner: { userId: "usr_me", displayName: "Paul Owner" }, participantCount: 2,
};

export const share = (over: Record<string, unknown> = {}) => ({
  shareId: "shr_1", documentId: "doc_1", verificationId: DOC.verificationId, email: "ana@example.com",
  fullName: "Ana Reyes", status: "accepted", recipient: { userId: "usr_ana", displayName: "Ana R." },
  sharedBy: { userId: "usr_me", displayName: "Paul Owner" }, removedBy: null, replacesShareId: null,
  recipientDeleted: false, createdAt: T, updatedAt: T, respondedAt: T, removedAt: null, ...over,
});

export const accessRequest = (over: Record<string, unknown> = {}) => ({
  requestId: "req_1", document: DOC,
  requester: { userId: "usr_ben", displayName: "Ben Cruz", email: "ben@example.com" },
  note: "I am the tenant's lawyer.", status: "pending", decidedBy: null, decidedAt: null, removedAt: null,
  createdAt: T, updatedAt: T, ...over,
});

export const sharedDoc = (over: Record<string, unknown> = {}) => ({
  id: "shd_1", kind: "share", status: "accepted", verificationId: "LAGDA-VER-2026-000222",
  documentTitle: "Supply Contract", completedAt: T, owner: { displayName: "Olivia Owner" },
  sharedBy: { displayName: "Olivia Owner" }, fullName: "Paul", email: "paul@example.com", note: null,
  progress: { participants: 3, completed: 3 },
  branding: { displayName: "Globex Legal", primaryColor: "#7C2D12", logo: { version: "v3", width: 120, height: 40, url: "/me/shared-documents/shd_1/branding/logo?v=v3" } },
  actions: ["open", "remove-access"], createdAt: T, updatedAt: T, respondedAt: T, ...over,
});

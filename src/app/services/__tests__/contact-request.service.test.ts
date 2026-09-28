import { describe, it, expect, vi } from "vitest";

vi.mock("../backend-flag", () => ({ API_BASE_URL: "http://api.test", USE_REAL_BACKEND: true }));

import {
  realContactRequestService, contactRequestErrorMessage, contactRequestsAvailable,
} from "../real/contact-request.service";
import { ApiError } from "../api-client";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function stubFetch(response: Response = json({ items: [] })) {
  const fetchMock = vi.fn(() => Promise.resolve(response));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function lastCall(fetchMock: ReturnType<typeof stubFetch>): { url: string; init: RequestInit } {
  const call = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit];
  return { url: call[0], init: call[1] };
}

function bodyOf(init: RequestInit): unknown {
  return JSON.parse(init.body as string) as unknown;
}

describe("contactRequestsAvailable", () => {
  it("needs a workspace", () => {
    expect(contactRequestsAvailable("ws_1")).toBe(true);
    expect(contactRequestsAvailable(undefined)).toBe(false);
    expect(contactRequestsAvailable("")).toBe(false);
  });
});

describe("create", () => {
  it("posts only the fields that carry something", async () => {
    const fetchMock = stubFetch(json({ requestId: "cr_1" }, 201));
    await realContactRequestService.create("ws 1", {
      kind: "preparation", contactId: "con_1", title: "  Prepare the lease  ", message: "   ",
      documentId: "doc_1", dueAt: "2030-01-01T15:59:00.000Z",
    });
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe("http://api.test/workspaces/ws%201/contact-requests");
    expect(init.method).toBe("POST");
    expect(bodyOf(init)).toEqual({
      kind: "preparation", contactId: "con_1", title: "Prepare the lease",
      documentId: "doc_1", dueAt: "2030-01-01T15:59:00.000Z",
    });
  });

  it("never sends a documentId with an upload request", async () => {
    const fetchMock = stubFetch(json({}, 201));
    await realContactRequestService.create("ws_1", { kind: "upload", contactId: "c", title: "Permit", documentId: "doc_1", message: "2026 please" });
    expect(bodyOf(lastCall(fetchMock).init)).toEqual({ kind: "upload", contactId: "c", title: "Permit", message: "2026 please" });
  });
});

describe("answering", () => {
  it("completes with and without a document", async () => {
    const fetchMock = stubFetch(json({}));
    await realContactRequestService.complete("ws_1", "cr_1", "doc_9");
    expect(lastCall(fetchMock).url).toBe("http://api.test/workspaces/ws_1/contact-requests/cr_1/complete");
    expect(bodyOf(lastCall(fetchMock).init)).toEqual({ documentId: "doc_9" });
    await realContactRequestService.complete("ws_1", "cr_1");
    expect(bodyOf(lastCall(fetchMock).init)).toEqual({});
  });

  it("declines with a required, trimmed reason (always sent), and cancels", async () => {
    const fetchMock = stubFetch(json({}));
    await realContactRequestService.decline("ws_1", "cr_1", "  not mine  ");
    expect(lastCall(fetchMock).url).toBe("http://api.test/workspaces/ws_1/contact-requests/cr_1/decline");
    expect(bodyOf(lastCall(fetchMock).init)).toEqual({ reason: "not mine" });
    // Never silently dropped: an empty reason reaches the server, which refuses it.
    await realContactRequestService.decline("ws_1", "cr_1", "   ");
    expect(bodyOf(lastCall(fetchMock).init)).toEqual({ reason: "" });
    await realContactRequestService.cancel("ws_1", "cr_1");
    expect(lastCall(fetchMock).url).toBe("http://api.test/workspaces/ws_1/contact-requests/cr_1/cancel");
  });
});

describe("lists", () => {
  it("reads received, sent and per-contact lists", async () => {
    const fetchMock = stubFetch(json({ items: [{ requestId: "cr_1" }] }));
    expect(await realContactRequestService.listReceived()).toEqual([{ requestId: "cr_1" }]);
    expect(lastCall(fetchMock).url).toBe("http://api.test/me/contact-requests");
    const again = stubFetch(json({ items: [] }));
    await realContactRequestService.listReceived("pending");
    expect(lastCall(again).url).toBe("http://api.test/me/contact-requests?status=pending");
    const sent = stubFetch(json({ items: [] }));
    await realContactRequestService.listSent("completed");
    expect(lastCall(sent).url).toBe("http://api.test/me/contact-requests/sent?status=completed");
    const contact = stubFetch(json({ items: [] }));
    await realContactRequestService.listForContact("ws_1", "con_1");
    expect(lastCall(contact).url).toBe("http://api.test/workspaces/ws_1/contacts/con_1/requests");
  });
});

describe("contactRequestErrorMessage", () => {
  const err = (status: number, code?: string) =>
    new ApiError(status, code === undefined ? undefined : { code, message: "server words" }, "x");

  it("maps each documented refusal to a sentence a person can act on", () => {
    expect(contactRequestErrorMessage(err(422, "contact_request_members_only"), "create")).toMatch(/Only a member of this workspace can be assigned to prepare/);
    expect(contactRequestErrorMessage(err(422, "contact_request_recipient_cannot_act"), "create")).toMatch(/can't do that in this workspace yet/);
    expect(contactRequestErrorMessage(err(422, "validation_failed"), "create")).toMatch(/aren't sending it to yourself/);
    expect(contactRequestErrorMessage(err(404), "create")).toMatch(/can't send requests from this workspace/);
    expect(contactRequestErrorMessage(err(404), "complete")).toMatch(/no longer available/);
    expect(contactRequestErrorMessage(err(409, "resource_conflict"), "decline")).toMatch(/already been answered or cancelled/);
    expect(contactRequestErrorMessage(err(0), "load")).toMatch(/couldn't reach LAGDA/);
    expect(contactRequestErrorMessage(err(401), "load")).toMatch(/Sign in again/);
    expect(contactRequestErrorMessage(new Error("boom"), "create")).toBe("Something went wrong. Please try again.");
  });

  it("never echoes the server's own prose", () => {
    expect(contactRequestErrorMessage(err(422, "validation_failed"), "decline")).not.toContain("server words");
  });
});

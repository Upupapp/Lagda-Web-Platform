import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

import {
  extractJoinToken, previewJoinLink, submitJoinRequest,
  createJoinTicket, updateJoinTicket, sendJoinTicket, withdrawJoinTicket, listJoinTickets,
  listJoinRequests, approveJoinRequest, updateMemberAccess, validateTicketInput, JoinActionError,
} from "../workspace-join.service";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { "content-type": "application/json" },
  });
}

const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("extractJoinToken", () => {
  it("takes the segment after /join/ from a full link", () => {
    expect(extractJoinToken("https://app.lagda.ph/join/abc123XYZ")).toBe("abc123XYZ");
    expect(extractJoinToken("  https://app.lagda.ph/join/abc123XYZ/  ")).toBe("abc123XYZ");
    expect(extractJoinToken("https://app.lagda.ph/join/abc123XYZ?utm=mail#x")).toBe("abc123XYZ");
    expect(extractJoinToken("/join/tok_456789")).toBe("tok_456789");
  });

  it("accepts a bare token", () => {
    expect(extractJoinToken("Zx9-_k2LmN")).toBe("Zx9-_k2LmN");
  });

  it("rejects what is not a join link", () => {
    expect(extractJoinToken("")).toBeNull();
    expect(extractJoinToken("   ")).toBeNull();
    expect(extractJoinToken("https://app.lagda.ph/sign-in")).toBeNull();
    expect(extractJoinToken("https://app.lagda.ph/join/")).toBeNull();
    expect(extractJoinToken("two words")).toBeNull();
    expect(extractJoinToken("abc")).toBeNull();
  });
});

describe("previewJoinLink", () => {
  it("POSTs the token and returns the workspace on 200", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { workspaceName: "Mabini Legal Solutions", invitedByName: "Paul Reyes" }));
    await expect(previewJoinLink("tok_123456")).resolves.toEqual({
      kind: "ok", workspaceName: "Mabini Legal Solutions", invitedByName: "Paul Reyes",
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://api.test/workspace-join/preview");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ token: "tok_123456" });
  });

  it("maps 404 to invalid, 410 to used, anything else to error", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404, { error: { code: "join_link_invalid", message: "Not found" } }));
    await expect(previewJoinLink("tok_123456")).resolves.toEqual({ kind: "invalid" });
    fetchMock.mockResolvedValueOnce(jsonResponse(410, { error: { code: "join_link_used", message: "Used" } }));
    await expect(previewJoinLink("tok_123456")).resolves.toEqual({ kind: "used" });
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: { code: "internal", message: "Boom" } }));
    await expect(previewJoinLink("tok_123456")).resolves.toEqual({ kind: "error" });
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await expect(previewJoinLink("tok_123456")).resolves.toEqual({ kind: "error" });
  });
});

describe("submitJoinRequest", () => {
  it("sends token, full name and reason and reports sent on 201", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { requestId: "req_1", workspaceName: "Mabini Legal Solutions", state: "pending" }));
    await expect(submitJoinRequest("tok_123456", { fullName: "Ana Reyes", reason: null }))
      .resolves.toEqual({ kind: "sent", workspaceName: "Mabini Legal Solutions" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://api.test/workspace-join/requests");
    expect(JSON.parse(init?.body as string)).toEqual({ token: "tok_123456", fullName: "Ana Reyes", reason: null });
  });

  it("maps every documented error", async () => {
    const cases: [number, string, unknown][] = [
      [404, "join_link_invalid", { kind: "invalid" }],
      [410, "join_link_used", { kind: "used" }],
      [409, "join_already_member", { kind: "already-member" }],
      [409, "join_request_pending", { kind: "pending" }],
    ];
    for (const [status, code, expected] of cases) {
      fetchMock.mockResolvedValueOnce(jsonResponse(status, { error: { code, message: "x" } }));
      await expect(submitJoinRequest("tok_123456", { fullName: "Ana", reason: "hi" })).resolves.toEqual(expected);
    }
    fetchMock.mockResolvedValueOnce(jsonResponse(503, { error: { code: "unavailable", message: "Try later." } }));
    await expect(submitJoinRequest("tok_123456", { fullName: "Ana", reason: null }))
      .resolves.toEqual({ kind: "error", message: "Try later." });
  });
});

describe("submitJoinRequest — account states", () => {
  it("reports an unverified email and a lost session distinctly", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: { code: "join_email_unverified", message: "x" } }));
    await expect(submitJoinRequest("tok_123456", { fullName: "Ana", reason: null }))
      .resolves.toMatchObject({ kind: "error", reason: "email-unverified" });
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: { code: "AUTHENTICATION_REQUIRED", message: "Sign in to continue." } }));
    await expect(submitJoinRequest("tok_123456", { fullName: "Ana", reason: null }))
      .resolves.toMatchObject({ kind: "error", reason: "signed-out" });
  });
});

describe("join link management", () => {
  const ticket = {
    ticketId: "jt_1", label: "Finance", recipientEmail: null, state: "sent", linkUrl: "https://app/join/x",
    sentAt: 1, withdrawnAt: null, usedAt: null, request: null, createdAt: 1, updatedAt: 1,
  };

  it("creates, edits, sends and withdraws with the documented bodies", async () => {
    for (let i = 0; i < 4; i++) fetchMock.mockResolvedValueOnce(jsonResponse(200, ticket));
    await createJoinTicket("ws 1", { label: "Finance", recipientEmail: null });
    await updateJoinTicket("ws 1", "jt_1", { label: "Finance", recipientEmail: "f@example.com" });
    await sendJoinTicket("ws 1", "jt_1", { email: true });
    await withdrawJoinTicket("ws 1", "jt_1");
    const seen = fetchMock.mock.calls.map(([url, init]) => [init?.method, url, JSON.parse(init?.body as string)]);
    expect(seen).toEqual([
      ["POST", "http://api.test/workspaces/ws%201/join-tickets", { label: "Finance", recipientEmail: null }],
      ["PATCH", "http://api.test/workspaces/ws%201/join-tickets/jt_1", { label: "Finance", recipientEmail: "f@example.com" }],
      ["POST", "http://api.test/workspaces/ws%201/join-tickets/jt_1/send", { email: true }],
      ["POST", "http://api.test/workspaces/ws%201/join-tickets/jt_1/withdraw", {}],
    ]);
  });

  it("lists requests by state and approves with a normalised body", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { requests: [] }));
    await listJoinRequests("ws_1", "pending");
    expect(fetchMock.mock.calls[0]![0]).toBe("http://api.test/workspaces/ws_1/join-requests?state=pending");

    fetchMock.mockResolvedValueOnce(jsonResponse(200, { memberId: "m_1" }));
    await approveJoinRequest("ws_1", "jr_1", { roleTitle: "   ", canRequestDocuments: true, canAssignSigners: false });
    expect(JSON.parse(fetchMock.mock.calls[1]![1]?.body as string)).toEqual({
      roleTitle: null, canRequestDocuments: true, canAssignSigners: false,
    });

    fetchMock.mockResolvedValueOnce(jsonResponse(200, { updated: true }));
    await updateMemberAccess("ws_1", "m_1", { roleTitle: " Finance Associate " });
    const [url, init] = fetchMock.mock.calls[2]!;
    expect(url).toBe("http://api.test/workspaces/ws_1/members/m_1/access");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(init?.body as string)).toEqual({ roleTitle: "Finance Associate" });
  });

  it("turns a refusal into a readable JoinActionError", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(409, { error: { code: "conflict", message: "Only a draft can be edited." } }));
    await expect(updateJoinTicket("ws_1", "jt_1", { label: "x", recipientEmail: null }))
      .rejects.toMatchObject({ name: "JoinActionError", message: "Only a draft can be edited." });
    fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: { code: "forbidden", message: "no" } }));
    await expect(listJoinTickets("ws_1")).rejects.toBeInstanceOf(JoinActionError);
  });
});

describe("validateTicketInput", () => {
  it("requires a label and a valid optional email", () => {
    expect(validateTicketInput("  ", "")).toEqual({ error: "Enter a label for this link." });
    expect(validateTicketInput("A", "nope")).toHaveProperty("error");
    expect(validateTicketInput(" Finance ", "")).toEqual({ input: { label: "Finance", recipientEmail: null } });
    expect(validateTicketInput("x".repeat(121), "")).toHaveProperty("error");
  });
});

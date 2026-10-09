// The identity check's two clients, against a stubbed network.
//
// What is pinned: the exact request each call makes, that a missing route
// reads as "feature off" rather than as an error, and that a refusal is said
// in plain words. The participant's attempt carries no image, ID number or
// name, and this checks that too: the server accepts none.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../backend-flag", () => ({
  USE_REAL_BACKEND: true,
  API_BASE_URL: "https://example.test/api",
}));

import {
  realIdentityCheckService, describeIdentityRequirementError, describeIdentityWaiveError,
} from "../identity-check.service";
import { realSigningAccessService, identityCheckOutstanding } from "../signing-access.service";
import { ApiError } from "../../api-client";

const fetchMock = vi.fn();

function answer(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), {
    status, headers: { "content-type": "application/json" },
  }));
}

function refusal(status: number, code: string, details?: { field: string; code: string; message: string }[]) {
  return answer(status, { error: { code, message: `server said ${code}`, requestId: "req_1", ...(details ? { details } : {}) } });
}

function lastCall(): { url: string; method: string; body: unknown; headers: Record<string, string>; credentials: unknown } {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return {
    url, method: init.method ?? "GET",
    body: typeof init.body === "string" ? JSON.parse(init.body) as unknown : undefined,
    headers: init.headers as Record<string, string>,
    credentials: init.credentials,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  document.cookie = "lagda_csrf=workspace-token";
  document.cookie = "lagda_signing_csrf=recipient-token";
});

describe("whether the workspace can ask for the check", () => {
  it("reads the availability route", async () => {
    const body = { available: true, mode: "test", minimumPlan: "business", planAllows: true, idTypes: ["umid"] };
    fetchMock.mockReturnValue(answer(200, body));
    await expect(realIdentityCheckService.availability("ws 1")).resolves.toEqual(body);
    expect(lastCall().url).toBe("https://example.test/api/workspaces/ws%201/identity-check");
    expect(lastCall().method).toBe("GET");
  });

  it("answers not available for a member who prepares nothing, and for a server without the route", async () => {
    for (const status of [403, 404]) {
      fetchMock.mockReturnValue(refusal(status, status === 403 ? "access_denied" : "not_found"));
      const result = await realIdentityCheckService.availability("ws_1");
      expect(result.available).toBe(false);
      expect(result.mode).toBeNull();
      expect(result.idTypes).toEqual([]);
    }
  });

  it("lets any other failure through", async () => {
    fetchMock.mockReturnValue(refusal(500, "internal_error"));
    await expect(realIdentityCheckService.availability("ws_1")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("who must pass it on a document", () => {
  it("reads the set", async () => {
    const items = [{ email: "ana@example.ph", requiredAt: "2026-10-08T01:00:00.000Z", waivedAt: null }];
    fetchMock.mockReturnValue(answer(200, { items }));
    await expect(realIdentityCheckService.requirements("ws_1", "doc_1")).resolves.toEqual(items);
    expect(lastCall().url).toBe("https://example.test/api/workspaces/ws_1/documents/doc_1/identity-requirements");
  });

  it("reads a missing route as the feature being off", async () => {
    fetchMock.mockReturnValue(refusal(404, "not_found"));
    await expect(realIdentityCheckService.requirements("ws_1", "doc_1")).resolves.toBeNull();
  });

  it("sends the complete set with PUT and the workspace CSRF token", async () => {
    fetchMock.mockReturnValue(answer(200, { items: [] }));
    await realIdentityCheckService.replaceRequirements("ws_1", "doc_1", ["ana@example.ph", "ben@example.ph"]);
    const call = lastCall();
    expect(call.method).toBe("PUT");
    expect(call.url).toBe("https://example.test/api/workspaces/ws_1/documents/doc_1/identity-requirements");
    expect(call.body).toEqual({ emails: ["ana@example.ph", "ben@example.ph"] });
    expect(call.headers["X-CSRF-Token"]).toBe("workspace-token");
  });

  it("clears the set with an empty list", async () => {
    fetchMock.mockReturnValue(answer(200, { items: [] }));
    await realIdentityCheckService.replaceRequirements("ws_1", "doc_1", []);
    expect(lastCall().body).toEqual({ emails: [] });
  });
});

describe("how each participant of a sent request stands", () => {
  it("reads the checks, and a missing route as the feature being off", async () => {
    fetchMock.mockReturnValue(answer(200, { items: [] }));
    await expect(realIdentityCheckService.checks("ws_1", "sr_1")).resolves.toEqual([]);
    expect(lastCall().url).toBe("https://example.test/api/workspaces/ws_1/signing-requests/sr_1/identity-checks");

    fetchMock.mockReturnValue(refusal(404, "not_found"));
    await expect(realIdentityCheckService.checks("ws_1", "sr_1")).resolves.toBeNull();
  });

  it("waives with an empty object when no reason is given", async () => {
    fetchMock.mockReturnValue(answer(200, { recipientId: "srr_1", status: "waived", waivedAt: "2026-10-08T02:00:00.000Z" }));
    await realIdentityCheckService.waive("ws_1", "sr_1", "srr_1", "   ");
    const call = lastCall();
    expect(call.method).toBe("POST");
    expect(call.url).toBe(
      "https://example.test/api/workspaces/ws_1/signing-requests/sr_1/recipients/srr_1/identity-check/waive");
    expect(call.body).toEqual({});
    expect(call.headers["X-CSRF-Token"]).toBe("workspace-token");
  });

  it("sends the reason trimmed, and never more than 500 characters", async () => {
    fetchMock.mockReturnValue(answer(200, { recipientId: "srr_1", status: "waived", waivedAt: "2026-10-08T02:00:00.000Z" }));
    await realIdentityCheckService.waive("ws_1", "sr_1", "srr_1", "  No ID with them  ");
    expect(lastCall().body).toEqual({ reason: "No ID with them" });
    await realIdentityCheckService.waive("ws_1", "sr_1", "srr_1", "x".repeat(600));
    expect((lastCall().body as { reason: string }).reason).toHaveLength(500);
  });
});

describe("a refused change, in plain words", () => {
  const invalid = (details: { field: string; code: string; message: string }[]) =>
    new ApiError(422, { code: "identity_requirement_invalid", message: "server text", details }, "x");

  it("names the address a detail points at", () => {
    const error = invalid([
      { field: "emails[1]", code: "not-a-participant", message: "That address is not a participant of this document." },
    ]);
    expect(describeIdentityRequirementError(error, ["ana@example.ph", "ben@example.ph"]))
      .toBe("ben@example.ph is not saved as a participant of this document yet. Check the Participants step, then try again.");
  });

  it("says why a viewer cannot be asked", () => {
    const error = invalid([{ field: "emails[0]", code: "role-cannot-act", message: "server" }]);
    expect(describeIdentityRequirementError(error, ["val@example.ph"])).toContain("only views or receives a copy");
  });

  it("falls back to the server's own detail when the address cannot be told", () => {
    const error = invalid([{ field: "emails", code: "something-new", message: "A new rule applies." }]);
    expect(describeIdentityRequirementError(error, [])).toBe("A new rule applies.");
  });

  it("words the plan, availability and closed-document refusals", () => {
    expect(describeIdentityRequirementError(new ApiError(403, { code: "plan_required", message: "m" }, "x")))
      .toBe("ID and face verification is available on the Business plan.");
    expect(describeIdentityRequirementError(new ApiError(409, { code: "identity_check_unavailable", message: "m" }, "x")))
      .toBe("ID and face verification is not available for this workspace.");
    expect(describeIdentityRequirementError(new ApiError(409, { code: "identity_requirement_not_editable", message: "m" }, "x")))
      .toMatch(/can no longer be changed/);
    expect(describeIdentityRequirementError(new ApiError(0, undefined, "offline"))).toMatch(/connection/);
    expect(describeIdentityRequirementError(new Error("boom"))).toBe("Your change could not be saved. Try again.");
  });

  it("words a waiver that is no longer needed", () => {
    expect(describeIdentityWaiveError(new ApiError(409, { code: "identity_check_not_required", message: "m" }, "x")))
      .toBe("No identity check is required of this participant any more.");
    expect(describeIdentityWaiveError(new ApiError(0, undefined, "offline"))).toMatch(/connection/);
  });
});

describe("the participant's attempt", () => {
  it("posts the kind of ID and how it was captured, with the recipient CSRF token, and nothing else", async () => {
    fetchMock.mockReturnValue(answer(200, { outcome: "passed", attemptsRemaining: 3, status: "passed" }));
    await expect(realSigningAccessService.submitIdentityCheck({
      idType: "philippine-passport", capture: "camera", consent: true,
    })).resolves.toEqual({ outcome: "passed", attemptsRemaining: 3, status: "passed" });
    const call = lastCall();
    expect(call.url).toBe("https://example.test/api/signing/identity-check");
    expect(call.method).toBe("POST");
    expect(call.body).toEqual({ idType: "philippine-passport", capture: "camera", consent: true });
    expect(call.headers["X-CSRF-Token"]).toBe("recipient-token");
    expect(call.credentials).toBe("include");
  });

  it("sends the simulated outcome only when one is given", async () => {
    fetchMock.mockReturnValue(answer(200, { outcome: "failed", attemptsRemaining: 2, status: "pending" }));
    await realSigningAccessService.submitIdentityCheck({
      idType: "umid", capture: "upload", consent: true, testOutcome: "fail",
    });
    expect(lastCall().body).toEqual({ idType: "umid", capture: "upload", consent: true, testOutcome: "fail" });
  });

  it("surfaces a lock as the API's error, with its code", async () => {
    fetchMock.mockReturnValue(refusal(409, "identity_check_locked"));
    const error = await realSigningAccessService.submitIdentityCheck({
      idType: "umid", capture: "upload", consent: true,
    }).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).body?.code).toBe("identity_check_locked");
  });
});

describe("whether the check stands in the way", () => {
  const check = { required: true, status: "pending" as const, mode: "test" as const, attemptsRemaining: 3, verifiedAt: null, idTypes: [] };

  it("does not when an older server says nothing about it", () => {
    expect(identityCheckOutstanding({})).toBe(false);
  });

  it("does while pending or locked, and not once passed or not required", () => {
    expect(identityCheckOutstanding({ identityCheck: check })).toBe(true);
    expect(identityCheckOutstanding({ identityCheck: { ...check, status: "locked" } })).toBe(true);
    expect(identityCheckOutstanding({ identityCheck: { ...check, status: "passed" } })).toBe(false);
    expect(identityCheckOutstanding({ identityCheck: { ...check, required: false, status: "not-required" } })).toBe(false);
  });
});

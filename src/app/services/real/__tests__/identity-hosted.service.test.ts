// The identity check done on the identity verification partner's page: the
// participant's two calls, against a stubbed network.
//
// What is pinned: opening a visit sends the agreement and nothing else;
// asking where the check stands sends NO body and NO JSON content type (the
// server answers 400 to a JSON content type with nothing after it); both ride
// the participant's signing session; and every refusal reaches the caller
// with the server's code intact.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../backend-flag", () => ({
  USE_REAL_BACKEND: true,
  API_BASE_URL: "https://example.test/api",
}));

import {
  realSigningAccessService, identityCheckFlow, identityCheckOutstanding, type CeremonyIdentityCheck,
} from "../signing-access.service";
import { realIdentityCheckService } from "../identity-check.service";
import { ApiError } from "../../api-client";
import {
  identityIdTypeLabel, identityReturnState, identityReturnedAt,
} from "../../../models/identity-check";

const fetchMock = vi.fn();

function answer(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), {
    status, headers: { "content-type": "application/json" },
  }));
}

function refusal(status: number, code: string) {
  return answer(status, { error: { code, message: `server said ${code}`, requestId: "req_1" } });
}

function lastCall(): { url: string; method: string; rawBody: unknown; headers: Record<string, string>; credentials: unknown } {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return {
    url, method: init.method ?? "GET", rawBody: init.body,
    headers: init.headers as Record<string, string>, credentials: init.credentials,
  };
}

async function refusedWith(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(() => null, (thrown: unknown) => thrown);
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

const headerNames = (headers: Record<string, string>) => Object.keys(headers).map(name => name.toLowerCase());

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  document.cookie = "lagda_csrf=workspace-token";
  document.cookie = "lagda_signing_csrf=recipient-token";
});

describe("opening a visit to the partner's page", () => {
  it("posts exactly the agreement, on the participant's signing session", async () => {
    const session = { url: "https://verify.partner.example/session/abc?x=1", expiresAt: "2026-10-09T02:30:00.000Z" };
    fetchMock.mockReturnValue(answer(201, session));
    await expect(realSigningAccessService.startIdentityCheckSession()).resolves.toEqual(session);

    const call = lastCall();
    expect(call.url).toBe("https://example.test/api/signing/identity-check/session");
    expect(call.method).toBe("POST");
    expect(call.credentials).toBe("include");
    expect(call.rawBody).toBe('{"consent":true}');
    expect(call.headers["Content-Type"]).toBe("application/json");
    // The recipient realm's token, never the workspace's.
    expect(call.headers["X-CSRF-Token"]).toBe("recipient-token");
  });

  it.each([
    [422, "identity_check_invalid"],
    [409, "identity_check_not_required"],
    [409, "identity_check_locked"],
    [409, "identity_check_unavailable"],
    [429, "rate_limited"],
  ])("hands a %i %s to the caller with its code", async (status, code) => {
    fetchMock.mockReturnValue(refusal(status, code));
    const error = await refusedWith(realSigningAccessService.startIdentityCheckSession());
    expect(error.status).toBe(status);
    expect(error.body?.code).toBe(code);
  });

  it("reports a dropped connection as status 0", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    expect((await refusedWith(realSigningAccessService.startIdentityCheckSession())).status).toBe(0);
  });
});

describe("asking where the check stands", () => {
  it("posts with no body and no JSON content type", async () => {
    const status = { status: "pending", attemptsRemaining: 3, verifiedAt: null, pendingReview: true };
    fetchMock.mockReturnValue(answer(200, status));
    await expect(realSigningAccessService.refreshIdentityCheckSession()).resolves.toEqual(status);

    const call = lastCall();
    expect(call.url).toBe("https://example.test/api/signing/identity-check/session/refresh");
    expect(call.method).toBe("POST");
    expect(call.credentials).toBe("include");
    expect(call.rawBody).toBeUndefined();
    expect(headerNames(call.headers)).not.toContain("content-type");
    expect(call.headers["X-CSRF-Token"]).toBe("recipient-token");
  });

  it.each([
    [409, "identity_check_unavailable"],
    [409, "signing_ceremony_unavailable"],
    [429, "rate_limited"],
  ])("hands a %i %s to the caller with its code", async (status, code) => {
    fetchMock.mockReturnValue(refusal(status, code));
    const error = await refusedWith(realSigningAccessService.refreshIdentityCheckSession());
    expect(error.status).toBe(status);
    expect(error.body?.code).toBe(code);
  });
});

describe("where the check is done", () => {
  const base: CeremonyIdentityCheck = {
    required: true, status: "pending", mode: "live", attemptsRemaining: 3, verifiedAt: null, idTypes: [],
  };

  it("is on LAGDA's own screens unless the server says hosted", () => {
    expect(identityCheckFlow(undefined)).toBe("inline");
    expect(identityCheckFlow(base)).toBe("inline");
    expect(identityCheckFlow({ ...base, flow: "inline" })).toBe("inline");
    expect(identityCheckFlow({ ...base, flow: "hosted" })).toBe("hosted");
    // A word this build does not know is not taken for hosted.
    expect(identityCheckFlow({ flow: "something-new" as unknown as "hosted" })).toBe("inline");
  });

  it("stands between the participant and the document in either flow", () => {
    expect(identityCheckOutstanding({ identityCheck: { ...base, flow: "hosted" } })).toBe(true);
    expect(identityCheckOutstanding({ identityCheck: { ...base, flow: "hosted", status: "passed" } })).toBe(false);
  });

  it("is passed through to the sender's side as the server sends it", async () => {
    const body = { available: true, mode: "live", minimumPlan: "business", planAllows: true, idTypes: [], flow: "hosted" };
    fetchMock.mockReturnValue(answer(200, body));
    await expect(realIdentityCheckService.availability("ws_1")).resolves.toEqual(body);
  });
});

describe("the words both realms share", () => {
  it("names the kinds of ID the partner reports", () => {
    expect(identityIdTypeLabel("passport")).toBe("Passport");
    expect(identityIdTypeLabel("other-id")).toBe("Other government ID");
    // The ones LAGDA's own screens offer are as they were.
    expect(identityIdTypeLabel("philippine-passport")).toBe("Philippine Passport");
    expect(identityIdTypeLabel("umid")).toBe("UMID (SSS / GSIS)");
  });

  it("reads back when a participant returned, and nothing from anything else", () => {
    expect(identityReturnedAt(identityReturnState(1234))).toBe(1234);
    for (const other of [null, undefined, "x", 5, {}, { identityReturnedAt: "1" }, { identityReturnedAt: Number.NaN }]) {
      expect(identityReturnedAt(other)).toBeNull();
    }
  });
});

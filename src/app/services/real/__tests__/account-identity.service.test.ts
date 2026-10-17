// Verifying an account, the eNotary gate, and the kind of a signing visit:
// the calls, against a stubbed network.
//
// What is pinned: opening a visit sends the agreement (and, for eNotary, the
// role) and nothing else; asking where an account verification stands sends
// NO body and NO JSON content type; a 404 from a route that reads is "not
// offered" and answers null, never an error; and every other refusal reaches
// the caller with the code the server gave.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../backend-flag", () => ({
  USE_REAL_BACKEND: true,
  API_BASE_URL: "https://example.test/api",
}));

import {
  realAccountIdentityService, describeAccountIdentityError, type AccountIdentity,
} from "../account-identity.service";
import { realEnotaryAccessService, enotaryGrantStands, type EnotaryAccess } from "../enotary-access.service";
import { realSigningAccessService } from "../signing-access.service";
import { ApiError, resetHeldAnswers } from "../../api-client";
import {
  enotaryAccessPath, enotaryRole, enotarySessionPath, identityCheckKind, identityWhenLabel,
  providerReturned, providerReturnState,
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

const sentBody = (): unknown => JSON.parse(String(lastCall().rawBody));
const headerNames = () => Object.keys(lastCall().headers).map(name => name.toLowerCase());

async function refusedWith(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(() => null, (thrown: unknown) => thrown);
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

const IDENTITY: AccountIdentity = {
  available: true, status: "verified", verifiedName: "Ana Maria Reyes", verifiedAt: "2026-10-12T02:00:00.000Z",
  validUntil: "2027-10-12T02:00:00.000Z", pendingReview: false, canUseFaceCheck: true, nameMatchesProfile: "match",
};

const ACCESS: EnotaryAccess = {
  available: true, role: "client", attorneyApproved: null,
  account: { status: "verified", verifiedName: "Ana Maria Reyes", validUntil: "2027-10-12T02:00:00.000Z" },
  required: "none", granted: true, grantedUntil: "2026-10-12T04:00:00.000Z", pendingReview: false,
  nameMatchesProfile: "match",
};

beforeEach(() => {
  fetchMock.mockReset();
  resetHeldAnswers();
  vi.stubGlobal("fetch", fetchMock);
  document.cookie = "lagda_csrf=workspace-token";
});

describe("verifying an account", () => {
  it("reads where the account stands, on the signed-in session", async () => {
    fetchMock.mockReturnValue(answer(200, IDENTITY));
    await expect(realAccountIdentityService.read()).resolves.toEqual(IDENTITY);
    const call = lastCall();
    expect(call.url).toBe("https://example.test/api/me/identity");
    expect(call.method).toBe("GET");
    expect(call.credentials).toBe("include");
    expect(call.rawBody).toBeUndefined();
  });

  it("answers null, not an error, where the route is not there", async () => {
    fetchMock.mockReturnValue(refusal(404, "resource_not_found"));
    await expect(realAccountIdentityService.read()).resolves.toBeNull();
  });

  it("throws any other refusal of the read, with the code the server gave", async () => {
    fetchMock.mockReturnValue(refusal(401, "unauthenticated"));
    const error = await refusedWith(realAccountIdentityService.read());
    expect(error.status).toBe(401);
    expect(error.body?.code).toBe("unauthenticated");
  });

  it("opens a visit with the agreement and nothing else", async () => {
    fetchMock.mockReturnValue(answer(201, { url: "https://verify.partner.example/s/1", expiresAt: "2026-10-12T03:00:00.000Z", kind: "full" }));
    const session = await realAccountIdentityService.startSession();
    expect(session).toEqual({ url: "https://verify.partner.example/s/1", expiresAt: "2026-10-12T03:00:00.000Z", kind: "full" });
    const call = lastCall();
    expect(call.url).toBe("https://example.test/api/me/identity/session");
    expect(call.method).toBe("POST");
    expect(sentBody()).toEqual({ consent: true });
    expect(call.headers["Content-Type"]).toBe("application/json");
    expect(call.headers["X-CSRF-Token"]).toBe("workspace-token");
  });

  it.each([
    [409, "identity_check_unavailable"],
    [429, "rate_limited"],
    [401, "unauthenticated"],
    [404, "resource_not_found"],
  ])("hands a %i %s on opening a visit to the caller", async (status, code) => {
    fetchMock.mockReturnValue(refusal(status, code));
    const error = await refusedWith(realAccountIdentityService.startSession());
    expect(error.status).toBe(status);
    expect(error.body?.code).toBe(code);
  });

  it("asks for the result with NO body and NO JSON content type", async () => {
    fetchMock.mockReturnValue(answer(200, IDENTITY));
    await expect(realAccountIdentityService.refresh()).resolves.toEqual(IDENTITY);
    const call = lastCall();
    expect(call.url).toBe("https://example.test/api/me/identity/session/refresh");
    expect(call.method).toBe("POST");
    expect(call.rawBody).toBeUndefined();
    expect(headerNames()).not.toContain("content-type");
    // Still a write: the CSRF token rides along.
    expect(call.headers["X-CSRF-Token"]).toBe("workspace-token");
  });

  it("removes the verification with a DELETE and no body", async () => {
    fetchMock.mockReturnValue(Promise.resolve(new Response(null, { status: 204 })));
    await expect(realAccountIdentityService.remove()).resolves.toBeUndefined();
    const call = lastCall();
    expect(call.url).toBe("https://example.test/api/me/identity");
    expect(call.method).toBe("DELETE");
    expect(call.rawBody).toBeUndefined();
    expect(headerNames()).not.toContain("content-type");
  });

  it("says why removing failed in plain words, never the server's", () => {
    const made = (status: number) => new ApiError(status, { code: "x", message: "server said x" }, "server said x");
    expect(describeAccountIdentityError(made(0))).toBe("Could not reach the server. Check your connection and try again.");
    expect(describeAccountIdentityError(made(401))).toBe("Your session has ended. Sign in again to continue.");
    expect(describeAccountIdentityError(made(429))).toBe("Too many tries in a short time. Wait a minute, then try again.");
    expect(describeAccountIdentityError(made(404))).toBe("Identity verification is not available on this account yet.");
    expect(describeAccountIdentityError(made(500))).toBe("That could not be done right now. Please try again.");
    expect(describeAccountIdentityError(new Error("boom"))).toBe("That could not be done. Try again.");
  });
});

describe("the eNotary gate", () => {
  it.each([["client" as const], ["attorney" as const]])("reads the access for a %s, the role in the address", async (role) => {
    fetchMock.mockReturnValue(answer(200, { ...ACCESS, role }));
    await expect(realEnotaryAccessService.read(role)).resolves.toMatchObject({ role, granted: true });
    const call = lastCall();
    expect(call.url).toBe(`https://example.test/api/me/enotary/access?role=${role}`);
    expect(call.method).toBe("GET");
  });

  it("answers null where eNotary is not offered at all", async () => {
    fetchMock.mockReturnValue(refusal(404, "resource_not_found"));
    await expect(realEnotaryAccessService.read("client")).resolves.toBeNull();
  });

  it("opens a visit with the role and the agreement", async () => {
    fetchMock.mockReturnValue(answer(201, { url: "https://verify.partner.example/s/2", expiresAt: "2026-10-12T03:00:00.000Z", kind: "face" }));
    await expect(realEnotaryAccessService.startSession("attorney")).resolves.toMatchObject({ kind: "face" });
    const call = lastCall();
    expect(call.url).toBe("https://example.test/api/me/enotary/access/session");
    expect(call.method).toBe("POST");
    expect(sentBody()).toEqual({ role: "attorney", consent: true });
  });

  it.each([
    [409, "enotary_attorney_not_approved"],
    [409, "enotary_access_not_required"],
    [409, "identity_check_unavailable"],
    [429, "rate_limited"],
  ])("hands a %i %s on opening a visit to the caller", async (status, code) => {
    fetchMock.mockReturnValue(refusal(status, code));
    const error = await refusedWith(realEnotaryAccessService.startSession("client"));
    expect(error.status).toBe(status);
    expect(error.body?.code).toBe(code);
  });

  it("asks for the result with the role in the body", async () => {
    fetchMock.mockReturnValue(answer(200, ACCESS));
    await expect(realEnotaryAccessService.refresh("client")).resolves.toEqual(ACCESS);
    const call = lastCall();
    expect(call.url).toBe("https://example.test/api/me/enotary/access/refresh");
    expect(call.method).toBe("POST");
    expect(sentBody()).toEqual({ role: "client" });
  });

  it("knows a grant that stands from one that has run out, or was never given", () => {
    const now = Date.parse("2026-10-12T03:00:00.000Z");
    expect(enotaryGrantStands(ACCESS, now)).toBe(true);
    expect(enotaryGrantStands(ACCESS, Date.parse("2026-10-12T04:00:00.000Z"))).toBe(false);
    expect(enotaryGrantStands({ granted: false, required: "full", grantedUntil: null }, now)).toBe(false);
    expect(enotaryGrantStands({ granted: false, required: "face", grantedUntil: "2026-10-12T04:00:00.000Z" }, now)).toBe(false);
    // `none` is the server saying nothing stands in the way.
    expect(enotaryGrantStands({ granted: false, required: "none", grantedUntil: null }, now)).toBe(true);
    // A time that cannot be read is the server's to enforce.
    expect(enotaryGrantStands({ granted: true, required: "none", grantedUntil: "soon" }, now)).toBe(true);
  });
});

describe("the kind of a signing visit", () => {
  it("is handed on as the server gave it, and is the full check where it gave none", async () => {
    fetchMock.mockReturnValue(answer(201, { url: "https://verify.partner.example/s/3", expiresAt: "2026-10-12T03:00:00.000Z", kind: "face" }));
    const face = await realSigningAccessService.startIdentityCheckSession();
    expect(face.kind).toBe("face");
    expect(sentBody()).toEqual({ consent: true });
    fetchMock.mockReturnValue(answer(201, { url: "https://verify.partner.example/s/4", expiresAt: "2026-10-12T03:00:00.000Z" }));
    const older = await realSigningAccessService.startIdentityCheckSession();
    expect(older.kind).toBeUndefined();
    expect(identityCheckKind(older.kind)).toBe("full");
    expect(identityCheckKind("face")).toBe("face");
    expect(identityCheckKind("something-new")).toBe("full");
    expect(identityCheckKind(null)).toBe("full");
  });
});

describe("the words and addresses both pages share", () => {
  it("reads a role from an address, the client where it says nothing believable", () => {
    expect(enotaryRole("attorney")).toBe("attorney");
    expect(enotaryRole("client")).toBe("client");
    expect(enotaryRole("admin")).toBe("client");
    expect(enotaryRole(null)).toBe("client");
    expect(enotaryAccessPath("attorney")).toBe("/app/enotary/access?role=attorney");
    expect(enotarySessionPath("client")).toBe("/app/enotary/session?role=client");
  });

  it("carries a return in router state, never in the address", () => {
    expect(providerReturned(providerReturnState(1_760_000_000_000))).toBe(true);
    expect(providerReturned(null)).toBe(false);
    expect(providerReturned({})).toBe(false);
    expect(providerReturned({ providerReturnedAt: "now" })).toBe(false);
  });

  it("shows nothing as a date that is not one", () => {
    expect(identityWhenLabel("2026-10-12T04:00:00.000Z")).toMatch(/2026/);
    expect(identityWhenLabel("soon")).toBeNull();
    expect(identityWhenLabel(null)).toBeNull();
    expect(identityWhenLabel(undefined)).toBeNull();
  });
});

// The identity check handed to a phone: both ends, against a stubbed network.
//
// What is pinned: the computer's two calls ride the participant's signing
// session (its cookie, its CSRF token on the write); the phone's two carry the
// token in the BODY and no cookie at all; a refusal reaches the caller with
// the server's code intact; and an attempt made from the phone carries no
// image, ID number or name, and `testOutcome` only when one was given.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../backend-flag", () => ({
  USE_REAL_BACKEND: true,
  API_BASE_URL: "https://example.test/api",
}));

import { realSigningAccessService } from "../signing-access.service";
import { realIdentityHandoffService, identityHandoffRetryable } from "../identity-handoff.service";
import { ApiError } from "../../api-client";
import { identityHandoffTimeLeft, IDENTITY_HANDOFF_LIFETIME_MS } from "../../../models/identity-check";

const fetchMock = vi.fn();
const TOKEN = "k".repeat(43);

function answer(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), {
    status, headers: { "content-type": "application/json" },
  }));
}

function refusal(status: number, code: string, details?: { field: string; code: string; message: string }[]) {
  return answer(status, { error: { code, message: `server said ${code}`, requestId: "req_1", ...(details ? { details } : {}) } });
}

function lastCall(): { url: string; method: string; body: unknown; rawBody: unknown; headers: Record<string, string>; credentials: unknown } {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return {
    url, method: init.method ?? "GET",
    body: typeof init.body === "string" ? JSON.parse(init.body) as unknown : undefined,
    rawBody: init.body,
    headers: init.headers as Record<string, string>,
    credentials: init.credentials,
  };
}

async function refusedWith(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(() => null, (thrown: unknown) => thrown);
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  document.cookie = "lagda_csrf=workspace-token";
  document.cookie = "lagda_signing_csrf=recipient-token";
});

// ── The computer ─────────────────────────────────────────────────────────────

describe("asking for a link to continue on a phone", () => {
  it("posts on the participant's signing session, with its CSRF token and no body", async () => {
    const handoff = {
      handoffId: "idh_1", url: `https://lagda.io/sign/identity/handoff#${TOKEN}`, expiresAt: "2026-10-09T02:10:00.000Z",
    };
    fetchMock.mockReturnValue(answer(201, handoff));
    await expect(realSigningAccessService.createIdentityHandoff()).resolves.toEqual(handoff);

    const call = lastCall();
    expect(call.url).toBe("https://example.test/api/signing/identity-check/handoff");
    expect(call.method).toBe("POST");
    expect(call.credentials).toBe("include");
    // The recipient realm's token, never the workspace's.
    expect(call.headers["X-CSRF-Token"]).toBe("recipient-token");
    expect(call.rawBody).toBeUndefined();
  });

  it.each([
    "identity_check_not_required", "identity_check_locked", "identity_check_unavailable",
  ])("hands a 409 %s to the caller with its code", async code => {
    fetchMock.mockReturnValue(refusal(409, code));
    const error = await refusedWith(realSigningAccessService.createIdentityHandoff());
    expect(error.status).toBe(409);
    expect(error.body?.code).toBe(code);
  });

  it("reports a dropped connection as status 0", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    expect((await refusedWith(realSigningAccessService.createIdentityHandoff())).status).toBe(0);
  });
});

describe("watching how the phone is getting on", () => {
  it("reads the hand-off by its id, writing nothing", async () => {
    fetchMock.mockReturnValue(answer(200, { status: "opened", attemptsRemaining: 3 }));
    await expect(realSigningAccessService.identityHandoffStatus("idh 1/x"))
      .resolves.toEqual({ status: "opened", attemptsRemaining: 3 });

    const call = lastCall();
    expect(call.url).toBe("https://example.test/api/signing/identity-check/handoff/idh%201%2Fx");
    expect(call.method).toBe("GET");
    expect(call.credentials).toBe("include");
    expect(call.headers["X-CSRF-Token"]).toBeUndefined();
    expect(call.rawBody).toBeUndefined();
  });

  it.each([
    "waiting", "opened", "completed", "failed", "expired", "revoked",
  ] as const)("passes %s through as the server said it", async status => {
    fetchMock.mockReturnValue(answer(200, { status, attemptsRemaining: 2 }));
    await expect(realSigningAccessService.identityHandoffStatus("idh_1")).resolves.toEqual({ status, attemptsRemaining: 2 });
  });

  it.each([
    [409, "identity_check_locked"], [409, "identity_check_not_required"], [409, "identity_check_unavailable"],
    [404, "not_found"], [401, "RECIPIENT_AUTHENTICATION_REQUIRED"],
  ] as const)("hands a %i %s to the caller", async (status, code) => {
    fetchMock.mockReturnValue(refusal(status, code));
    const error = await refusedWith(realSigningAccessService.identityHandoffStatus("idh_1"));
    expect(error.status).toBe(status);
    expect(error.body?.code).toBe(code);
  });
});

// ── The phone ────────────────────────────────────────────────────────────────

describe("opening the link on the phone", () => {
  const session = {
    documentTitle: "Office Lease", mode: "live", idTypes: ["umid", "philippine-passport"],
    attemptsRemaining: 3, expiresAt: "2026-10-09T02:10:00.000Z", status: "opened",
  };

  it("posts the token in the body, with no cookie and no CSRF token", async () => {
    fetchMock.mockReturnValue(answer(200, session));
    await expect(realIdentityHandoffService.open(TOKEN)).resolves.toEqual(session);

    const call = lastCall();
    expect(call.url).toBe("https://example.test/api/public/identity-handoff/open");
    expect(call.url).not.toContain(TOKEN);
    expect(call.method).toBe("POST");
    expect(call.credentials).toBe("omit");
    expect(call.body).toEqual({ token: TOKEN });
    expect(call.headers).toEqual({ "Content-Type": "application/json" });
  });

  it("says one thing for a link that is wrong, over or used, and that it is not worth trying again", async () => {
    fetchMock.mockReturnValue(refusal(404, "identity_handoff_not_found"));
    const error = await refusedWith(realIdentityHandoffService.open(TOKEN));
    expect(error.status).toBe(404);
    expect(error.body?.code).toBe("identity_handoff_not_found");
    expect(identityHandoffRetryable(error)).toBe(false);
  });

  it("asks the server nothing when there is no token at all", async () => {
    const error = await refusedWith(realIdentityHandoffService.open(""));
    expect(error.body?.code).toBe("identity_handoff_not_found");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats a dropped connection, a busy server and a rate limit as worth another try", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    const offline = await refusedWith(realIdentityHandoffService.open(TOKEN));
    expect(offline.status).toBe(0);
    expect(identityHandoffRetryable(offline)).toBe(true);

    fetchMock.mockReturnValueOnce(refusal(503, "unavailable"));
    expect(identityHandoffRetryable(await refusedWith(realIdentityHandoffService.open(TOKEN)))).toBe(true);
    fetchMock.mockReturnValueOnce(refusal(429, "rate_limited"));
    expect(identityHandoffRetryable(await refusedWith(realIdentityHandoffService.open(TOKEN)))).toBe(true);
    fetchMock.mockReturnValueOnce(refusal(422, "validation_failed"));
    expect(identityHandoffRetryable(await refusedWith(realIdentityHandoffService.open(TOKEN)))).toBe(false);
  });
});

describe("an attempt made from the phone", () => {
  it("sends the token, the kind of ID, how the selfie was taken and the agreement, and nothing else", async () => {
    fetchMock.mockReturnValue(answer(200, { outcome: "passed", attemptsRemaining: 3, status: "completed" }));
    await expect(realIdentityHandoffService.submit(TOKEN, { idType: "umid", capture: "camera", consent: true }))
      .resolves.toEqual({ outcome: "passed", attemptsRemaining: 3, status: "passed" });

    const call = lastCall();
    expect(call.url).toBe("https://example.test/api/public/identity-handoff/submit");
    expect(call.method).toBe("POST");
    expect(call.credentials).toBe("omit");
    expect(call.body).toEqual({ token: TOKEN, idType: "umid", capture: "camera", consent: true });
    expect(call.headers["X-CSRF-Token"]).toBeUndefined();
  });

  it("sends testOutcome only when one was given", async () => {
    // A fresh answer each time: a response can be read once.
    fetchMock.mockImplementation(() => answer(200, { outcome: "failed", attemptsRemaining: 2, status: "failed" }));
    await realIdentityHandoffService.submit(TOKEN, { idType: "umid", capture: "upload", consent: true, testOutcome: "fail" });
    expect(lastCall().body).toEqual({ token: TOKEN, idType: "umid", capture: "upload", consent: true, testOutcome: "fail" });

    await realIdentityHandoffService.submit(TOKEN, { idType: "umid", capture: "upload", consent: true });
    expect(lastCall().body).not.toHaveProperty("testOutcome");
  });

  it("answers a failure with attempts left as one that can be tried again", async () => {
    fetchMock.mockReturnValue(answer(200, { outcome: "failed", attemptsRemaining: 2, status: "failed" }));
    await expect(realIdentityHandoffService.submit(TOKEN, { idType: "umid", capture: "upload", consent: true }))
      .resolves.toEqual({ outcome: "failed", attemptsRemaining: 2, status: "pending" });
  });

  it("answers a failure with none left, or one the server calls locked, as a lock", async () => {
    fetchMock.mockReturnValueOnce(answer(200, { outcome: "failed", attemptsRemaining: 0, status: "failed" }));
    await expect(realIdentityHandoffService.submit(TOKEN, { idType: "umid", capture: "upload", consent: true }))
      .resolves.toEqual({ outcome: "failed", attemptsRemaining: 0, status: "locked" });
    fetchMock.mockReturnValueOnce(answer(200, { outcome: "failed", attemptsRemaining: 0, status: "locked" }));
    await expect(realIdentityHandoffService.submit(TOKEN, { idType: "umid", capture: "upload", consent: true }))
      .resolves.toMatchObject({ status: "locked" });
  });

  it("hands a 422 identity_check_invalid to the caller with its details", async () => {
    fetchMock.mockReturnValue(refusal(422, "identity_check_invalid", [{ field: "idType", code: "not-offered", message: "m" }]));
    const error = await refusedWith(realIdentityHandoffService.submit(TOKEN, { idType: "nope", capture: "upload", consent: true }));
    expect(error.status).toBe(422);
    expect(error.body?.code).toBe("identity_check_invalid");
    expect(error.body?.details?.[0]?.field).toBe("idType");
  });

  it("hands a 404 for a link that ended while they were working to the caller", async () => {
    fetchMock.mockReturnValue(refusal(404, "identity_handoff_not_found"));
    const error = await refusedWith(realIdentityHandoffService.submit(TOKEN, { idType: "umid", capture: "upload", consent: true }));
    expect(error.status).toBe(404);
    expect(identityHandoffRetryable(error)).toBe(false);
  });
});

describe("how long a link has left", () => {
  const now = Date.parse("2026-10-09T02:00:00.000Z");

  it("is the time to its expiry, by this device's clock", () => {
    expect(identityHandoffTimeLeft("2026-10-09T02:10:00.000Z", now)).toBe(IDENTITY_HANDOFF_LIFETIME_MS);
    expect(identityHandoffTimeLeft("2026-10-09T02:00:30.000Z", now)).toBe(30_000);
  });

  it("is not believed when it says a fresh link is already over, or good for longer than a link can be", () => {
    // Either means this device's clock is wrong, not that the link is.
    expect(identityHandoffTimeLeft("2026-10-09T01:59:00.000Z", now)).toBeNull();
    expect(identityHandoffTimeLeft("2026-10-09T02:00:00.000Z", now)).toBeNull();
    expect(identityHandoffTimeLeft("2026-10-09T03:00:00.000Z", now)).toBeNull();
    expect(identityHandoffTimeLeft("not a date", now)).toBeNull();
  });
});

import { describe, it, expect, vi } from "vitest";

vi.mock("../backend-flag", () => ({ API_BASE_URL: "/api", USE_REAL_BACKEND: true }));

import {
  lookupVerification, requestAccessCode, submitAccessCode,
} from "../real/public-verification.service";

function limited(body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status: 429, headers: { "Content-Type": "application/json", ...headers } });
}

const RATE_LIMITED = { error: { code: "verification_rate_limited", message: "Slow down.", retryAfterSeconds: 42 } };

describe("verification_rate_limited", () => {
  it("carries the server's retryAfterSeconds on every step", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(limited(RATE_LIMITED, { "Retry-After": "42" }))));
    expect(await requestAccessCode("ver_1", "a@b.co")).toEqual({ kind: "rate-limited", retryAfterSeconds: 42 });
    expect(await submitAccessCode("ver_1", "a@b.co", "123456")).toEqual({ kind: "rate-limited", retryAfterSeconds: 42 });
    expect(await lookupVerification("ver_1")).toEqual({ kind: "rate-limited", retryAfterSeconds: 42 });
  });

  it("falls back to the Retry-After header, in seconds or as a date", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(limited({}, { "Retry-After": "3600" }))));
    expect(await requestAccessCode("ver_1", "a@b.co")).toEqual({ kind: "rate-limited", retryAfterSeconds: 3600 });

    const at = new Date(Date.now() + 90_000).toUTCString();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(limited({}, { "Retry-After": at }))));
    const result = await requestAccessCode("ver_1", "a@b.co");
    expect(result.kind).toBe("rate-limited");
    expect(result.kind === "rate-limited" ? result.retryAfterSeconds : 0).toBeGreaterThan(80);
  });

  it("leaves the wait unknown when the server gives none, or nonsense", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(limited({ error: { retryAfterSeconds: -5 } }, { "Retry-After": "soon" }))));
    expect(await requestAccessCode("ver_1", "a@b.co")).toEqual({ kind: "rate-limited" });
  });
});

import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("../backend-flag", () => ({ API_BASE_URL: "/api", USE_REAL_BACKEND: true }));

import {
  lookupVerification, requestAccessCode, submitAccessCode, fetchSignedDocument,
  fetchVerificationDetails, checkVerificationFile, requestMemberAccess, verificationPageUrl,
} from "../real/public-verification.service";

afterEach(() => { vi.unstubAllGlobals(); });

const RECORD = {
  verificationId: "ver_1", completedAt: 1_770_000_000_000, participantCount: 2,
  finalDocument: { digestAlgorithm: "sha-256", digest: "abc123" },
  seal: { scheme: "lagda-v1", version: 1, digestAlgorithm: "sha-256", description: "Sealed" },
};

const DETAILS = {
  documentTitle: "Lease Agreement", completedAt: 1_770_000_000_000, sealedDigest: "abc123",
  participants: [], events: [],
};
const GRANT = {
  outcome: "granted", accessToken: "tok_1", expiresAt: 1_770_000_600_000,
  documentTitle: "Lease Agreement", recipientType: "signer", details: DETAILS,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("lookupVerification", () => {
  it("GETs with no cookie and returns the record on 200", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(RECORD));
    vi.stubGlobal("fetch", fetchMock);
    const result = await lookupVerification("ver_1");
    expect(fetchMock).toHaveBeenCalledWith("/api/public/verifications/ver_1", expect.objectContaining({
      method: "GET", credentials: "omit",
    }));
    expect(result).toEqual({ kind: "found", record: RECORD });
  });

  it("reads 404 as not-found and 429 as rate-limited", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 404)));
    expect(await lookupVerification("nope")).toEqual({ kind: "not-found" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 429)));
    expect(await lookupVerification("nope")).toEqual({ kind: "rate-limited" });
  });

  it("reads a 500 or a network failure as a retryable error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 500)));
    expect(await lookupVerification("ver_1")).toEqual({ kind: "error" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await lookupVerification("ver_1")).toEqual({ kind: "error" });
  });

  it("URL-encodes the verification id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}, 404));
    vi.stubGlobal("fetch", fetchMock);
    await lookupVerification("a/b c");
    expect(fetchMock).toHaveBeenCalledWith("/api/public/verifications/a%2Fb%20c", expect.anything());
  });
});

describe("requestAccessCode", () => {
  it("posts only the email with no cookie and reports sent on 202", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ sent: true, expiresInSeconds: 600 }, 202));
    vi.stubGlobal("fetch", fetchMock);
    expect(await requestAccessCode("ver_1", "maria@example.com")).toEqual({ kind: "sent", expiresInSeconds: 600 });
    expect(fetchMock).toHaveBeenCalledWith("/api/public/verifications/ver_1/access-code", expect.objectContaining({
      method: "POST", credentials: "omit", body: JSON.stringify({ email: "maria@example.com" }),
    }));
  });

  it("maps 429 and network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 429)));
    expect(await requestAccessCode("ver_1", "a@b.co")).toEqual({ kind: "rate-limited" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await requestAccessCode("ver_1", "a@b.co")).toEqual({ kind: "error" });
  });
});

describe("submitAccessCode", () => {
  it("returns the grant on 200", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(GRANT));
    vi.stubGlobal("fetch", fetchMock);
    const result = await submitAccessCode("ver_1", "maria@example.com", "123456");
    expect(fetchMock).toHaveBeenCalledWith("/api/public/verifications/ver_1/access", expect.objectContaining({
      body: JSON.stringify({ email: "maria@example.com", code: "123456" }), credentials: "omit",
    }));
    expect(result.kind).toBe("granted");
    if (result.kind === "granted") expect(result.grant.accessToken).toBe("tok_1");
  });

  it("maps 401 to denied and 429 to rate-limited", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: { code: "verification_access_denied" } }, 401)));
    expect(await submitAccessCode("ver_1", "a@b.co", "000000")).toEqual({ kind: "denied" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 429)));
    expect(await submitAccessCode("ver_1", "a@b.co", "000000")).toEqual({ kind: "rate-limited" });
  });
});

describe("token-bearing calls", () => {
  it("fetchSignedDocument posts the token and returns the blob; 401 is expiry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Blob(["%PDF"]), {
      status: 200, headers: { "Content-Type": "application/pdf" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchSignedDocument("ver_1", "tok_1");
    expect(fetchMock).toHaveBeenCalledWith("/api/public/verifications/ver_1/document", expect.objectContaining({
      body: JSON.stringify({ accessToken: "tok_1" }),
    }));
    expect(result.kind).toBe("ok");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 401)));
    expect(await fetchSignedDocument("ver_1", "tok_1")).toEqual({ kind: "expired" });
  });

  it("fetchVerificationDetails returns details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(DETAILS)));
    expect(await fetchVerificationDetails("ver_1", "tok_1")).toEqual({ kind: "ok", details: DETAILS });
  });
});

describe("checkVerificationFile", () => {
  it("sends the raw bytes and reports a mismatch as a result, not an error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({
      verificationId: "ver_1", matches: false, digestAlgorithm: "sha-256",
      authoritativeDigest: "abc", uploadedDigest: "def",
    }));
    vi.stubGlobal("fetch", fetchMock);
    const file = new Blob(["%PDF-1.7"], { type: "application/pdf" });
    const result = await checkVerificationFile("ver_1", file);
    expect(fetchMock).toHaveBeenCalledWith("/api/public/verifications/ver_1/file-check", expect.objectContaining({
      method: "POST", credentials: "omit", body: file,
    }));
    expect(result).toEqual({ kind: "result", matches: false, authoritativeDigest: "abc", uploadedDigest: "def" });
  });

  it.each([[413, "too-large"], [400, "invalid"], [404, "not-found"], [429, "rate-limited"]])(
    "maps %i to %s", async (status, kind) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, status)));
      expect(await checkVerificationFile("ver_1", new Blob(["x"]))).toEqual({ kind });
    });
});

describe("requestMemberAccess", () => {
  it("sends the session cookie and returns the grant", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(GRANT));
    vi.stubGlobal("fetch", fetchMock);
    const result = await requestMemberAccess("ver_1");
    expect(fetchMock).toHaveBeenCalledWith("/api/verifications/ver_1/member-access", expect.objectContaining({
      method: "POST", credentials: "include",
    }));
    expect(result.kind).toBe("granted");
  });

  it("maps 401 to denied", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: { code: "verification_access_denied", message: "x" } }, 401)));
    expect(await requestMemberAccess("ver_1")).toEqual({ kind: "denied" });
  });
});

describe("verificationPageUrl", () => {
  it("points at the dedicated public page", () => {
    expect(verificationPageUrl("VRF 1", "https://lagda.example")).toBe("https://lagda.example/verify/VRF%201");
  });
});

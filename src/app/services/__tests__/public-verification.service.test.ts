import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("../backend-flag", () => ({ API_BASE_URL: "/api", USE_REAL_BACKEND: true }));

import {
  lookupVerification, requestParticipantAccess, fetchParticipantDocument,
} from "../real/public-verification.service";

afterEach(() => { vi.unstubAllGlobals(); });

const RECORD = {
  verificationId: "ver_1", completedAt: 1_770_000_000_000, participantCount: 2,
  finalDocument: { digestAlgorithm: "sha-256", digest: "abc123" },
  seal: { scheme: "lagda-v1", version: 1, digestAlgorithm: "sha-256", description: "Sealed" },
};

describe("lookupVerification", () => {
  it("GETs with no cookie and returns the record on 200", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(RECORD), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await lookupVerification("ver_1");
    expect(fetchMock).toHaveBeenCalledWith("/api/public/verifications/ver_1", expect.objectContaining({
      method: "GET", credentials: "omit",
    }));
    expect(result).toEqual({ kind: "found", record: RECORD });
  });

  it("reads a 404 as not-found, not an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 404 })));
    expect(await lookupVerification("nope")).toEqual({ kind: "not-found" });
  });

  it("reads a 500 or a network failure as a retryable error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 500 })));
    expect(await lookupVerification("ver_1")).toEqual({ kind: "error" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await lookupVerification("ver_1")).toEqual({ kind: "error" });
  });

  it("URL-encodes the verification id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    await lookupVerification("a/b c");
    expect(fetchMock).toHaveBeenCalledWith("/api/public/verifications/a%2Fb%20c", expect.anything());
  });
});

describe("requestParticipantAccess", () => {
  it("posts only the email, no cookie, no password field", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ outcome: "granted", documentTitle: "Lease Agreement", recipientType: "signer" }),
      { status: 200 },
    ));
    vi.stubGlobal("fetch", fetchMock);
    const result = await requestParticipantAccess("ver_1", "maria@example.com");
    expect(fetchMock).toHaveBeenCalledWith("/api/public/verifications/ver_1/access", expect.objectContaining({
      method: "POST", credentials: "omit", body: JSON.stringify({ email: "maria@example.com" }),
    }));
    expect(result).toEqual({ kind: "granted", documentTitle: "Lease Agreement", recipientType: "signer" });
  });

  it.each([401, 429])("reads %i as a single denial, not a distinguishable reason", async status => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status })));
    expect(await requestParticipantAccess("ver_1", "nobody@example.com")).toEqual({ kind: "denied" });
  });

  it("reads a 500 or network failure as a retryable error, not a denial", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 500 })));
    expect(await requestParticipantAccess("ver_1", "maria@example.com")).toEqual({ kind: "error" });
  });
});

describe("fetchParticipantDocument", () => {
  it("returns the document bytes and media type on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Blob(["%PDF"]), {
      status: 200, headers: { "Content-Type": "application/pdf" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchParticipantDocument("ver_1", "maria@example.com");
    expect(fetchMock).toHaveBeenCalledWith("/api/public/verifications/ver_1/document", expect.objectContaining({
      method: "POST", credentials: "omit", body: JSON.stringify({ email: "maria@example.com" }),
    }));
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") expect(result.mediaType).toBe("application/pdf");
  });

  it("denies on 401 without leaking whether the id or the email was wrong", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    expect(await fetchParticipantDocument("ver_1", "nobody@example.com")).toEqual({ kind: "denied" });
  });
});

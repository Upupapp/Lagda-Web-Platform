// The name on the ID: the sender's decision, against a stubbed network, and
// the words both realms share.
//
// What is pinned: the exact request each decision makes, that each refusal is
// said in plain words (never the server's), that a name which does not match
// blocks the participant exactly as a lock does, and that a difference this
// build does not know still reads.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../backend-flag", () => ({
  USE_REAL_BACKEND: true,
  API_BASE_URL: "https://example.test/api",
}));

import {
  realIdentityCheckService, describeIdentityNameResolutionError, identityNameReasonError,
  IDENTITY_NAME_CORRECTION_UNAVAILABLE,
} from "../identity-check.service";
import { identityCheckOutstanding, type CeremonyIdentityCheck } from "../signing-access.service";
import { ApiError } from "../../api-client";
import {
  identityNameDifferenceLabel, identityNameDifferencesLabel, identityCheckValidity, identityCheckStandingNote,
  IDENTITY_CHECK_VALID_HOURS,
} from "../../../models/identity-check";

const fetchMock = vi.fn();

function answer(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), {
    status, headers: { "content-type": "application/json" },
  }));
}

function refusal(status: number, code: string, details?: { field: string; code: string; message: string }[]) {
  return answer(status, { error: { code, message: `server said ${code}`, requestId: "req_1", ...(details ? { details } : {}) } });
}

function lastCall(): { url: string; method: string; body: unknown; headers: Record<string, string> } {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return {
    url, method: init.method ?? "GET",
    body: typeof init.body === "string" ? JSON.parse(init.body) as unknown : undefined,
    headers: init.headers as Record<string, string>,
  };
}

const ROUTE = "https://example.test/api/workspaces/ws%201/signing-requests/sr%2F1/recipients/srr%201/identity-check/name-resolution";

const resolvedView = {
  recipientId: "srr 1", email: "maria@example.ph", required: true, status: "passed", mode: "live",
  lastOutcome: "passed", failedAttempts: 0, verifiedAt: "2026-10-10T02:00:00.000Z", idType: "passport", waivedAt: null,
  verifiedName: "Maria Clara Santos", nameMatch: "accepted", nameDifferences: [], documentName: "Maria Santos",
};

async function thrown(work: Promise<unknown>): Promise<unknown> {
  try { await work; } catch (error) { return error; }
  throw new Error("expected a refusal");
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  document.cookie = "lagda_csrf=workspace-token";
});

describe("the sender's decision about a name that does not match", () => {
  const accept = (reason = "Married name") =>
    realIdentityCheckService.resolveName("ws 1", "sr/1", "srr 1", { action: "accept", reason });

  it("accepts as the same person: one POST, with the reason trimmed", async () => {
    fetchMock.mockReturnValue(answer(200, resolvedView));
    const result = await accept("  Married name  ");
    expect(result).toEqual(resolvedView);
    expect(lastCall().url).toBe(ROUTE);
    expect(lastCall().method).toBe("POST");
    expect(lastCall().body).toEqual({ action: "accept", reason: "Married name" });
  });

  it("can send nothing but an acceptance: the name on a sent document cannot be changed", async () => {
    fetchMock.mockReturnValue(answer(200, resolvedView));
    // Even handed something else by a caller that ignores the types.
    await realIdentityCheckService.resolveName("ws 1", "sr/1", "srr 1",
      { action: "use-id-name", reason: "x" } as unknown as { action: "accept"; reason: string });
    expect((lastCall().body as { action: string }).action).toBe("accept");
  });

  it("takes an acceptance repeated after it succeeded as a success", async () => {
    fetchMock.mockImplementation(() => answer(200, resolvedView));
    await expect(accept()).resolves.toEqual(resolvedView);
    await expect(accept()).resolves.toEqual(resolvedView);
  });

  it("never sends a reason longer than the server takes", async () => {
    fetchMock.mockReturnValue(answer(200, resolvedView));
    await accept("x".repeat(900));
    expect((lastCall().body as { reason: string }).reason).toHaveLength(500);
  });

  it.each([
    ["required", "Give a reason."],
    ["too-long", "The reason is too long (500 characters at most)."],
  ])("says a reason that is %s beside its field", async (code, wording) => {
    fetchMock.mockReturnValue(refusal(422, "identity_requirement_invalid", [{ field: "reason", code, message: "server words" }]));
    const error = await thrown(accept());
    expect(error).toBeInstanceOf(ApiError);
    expect(identityNameReasonError(error)).toBe(wording);
    expect(describeIdentityNameResolutionError(error)).toBe(wording);
  });

  it("does not blame the reason for a refusal about something else", async () => {
    fetchMock.mockReturnValue(refusal(422, "identity_requirement_invalid", [{ field: "action", code: "invalid", message: "server words" }]));
    const other = await thrown(accept());
    expect(identityNameReasonError(other)).toBeNull();
    expect(describeIdentityNameResolutionError(other)).toBe("That could not be done. Check the reason and try again.");
    fetchMock.mockReturnValue(refusal(409, "identity_name_not_pending"));
    expect(identityNameReasonError(await thrown(accept()))).toBeNull();
    expect(identityNameReasonError(new Error("boom"))).toBeNull();
  });

  it.each([
    [404, "not_found", "You do not have permission to do this, or the document is no longer available."],
    [403, "forbidden", "You do not have permission to do this, or the document is no longer available."],
    [409, "identity_name_not_pending", "This name is no longer waiting for a decision. It may already have been decided."],
    [409, "identity_name_correction_unavailable", IDENTITY_NAME_CORRECTION_UNAVAILABLE],
  ] as const)("says a %i %s in plain words", async (status, code, wording) => {
    fetchMock.mockReturnValue(refusal(status, code));
    const error = await thrown(accept());
    expect(error).toBeInstanceOf(ApiError);
    expect(describeIdentityNameResolutionError(error)).toBe(wording);
    expect(wording).not.toMatch(/server said/);
  });

  it("says a lost connection, and anything that is not the server's, plainly", () => {
    expect(describeIdentityNameResolutionError(new ApiError(0, undefined, "offline")))
      .toBe("That could not be done. Check your connection and try again.");
    expect(describeIdentityNameResolutionError(new Error("boom"))).toBe("That could not be done. Try again.");
  });
});

describe("a name that does not match, for the participant", () => {
  const check = (status: CeremonyIdentityCheck["status"], required = true): CeremonyIdentityCheck => ({
    required, status, mode: "live", attemptsRemaining: 3, verifiedAt: null, idTypes: [],
  });

  it("stands between them and the document, as a lock does", () => {
    expect(identityCheckOutstanding({ identityCheck: check("name-mismatch") })).toBe(true);
    expect(identityCheckOutstanding({ identityCheck: check("locked") })).toBe(true);
    expect(identityCheckOutstanding({ identityCheck: check("pending") })).toBe(true);
  });

  it("does not where the check is passed, not required, or not reported at all", () => {
    expect(identityCheckOutstanding({ identityCheck: check("passed") })).toBe(false);
    expect(identityCheckOutstanding({ identityCheck: check("not-required", false) })).toBe(false);
    expect(identityCheckOutstanding({ identityCheck: check("name-mismatch", false) })).toBe(false);
    expect(identityCheckOutstanding({})).toBe(false);
  });
});

describe("the differences between two names, in plain words", () => {
  it.each([
    ["middle-name-missing", "middle name not on the document"],
    ["middle-initial", "middle initial"],
    ["suffix", "suffix (Jr., III…)"],
    ["order", "names in a different order"],
    ["abbreviation", "abbreviation (Ma. for Maria)"],
    ["extra-given-name", "extra given name on the ID"],
    ["spacing", "spacing of the family name (Dela Cruz / De la Cruz)"],
  ])("says %s", (code, wording) => {
    expect(identityNameDifferenceLabel(code)).toBe(wording);
  });

  it("still reads a difference this build does not know, and never shows a raw oddity", () => {
    expect(identityNameDifferenceLabel("hyphenated-surname")).toBe("hyphenated surname");
    expect(identityNameDifferenceLabel("X_Y{}")).toBe("another small difference");
  });

  it("joins several, once each, and is empty for none or for a server that sends none", () => {
    expect(identityNameDifferencesLabel(["middle-initial", "suffix", "middle-initial"]))
      .toBe("middle initial, suffix (Jr., III…)");
    expect(identityNameDifferencesLabel([])).toBe("");
    expect(identityNameDifferencesLabel(undefined)).toBe("");
    expect(identityNameDifferencesLabel(null)).toBe("");
  });
});

describe("how long a pass counts, as dates", () => {
  it("is built from the one constant, and is what the consent screen's line says", () => {
    const verifiedAt = "2026-10-09T02:00:00.000Z";
    const validity = identityCheckValidity(verifiedAt);
    const when = (at: Date) => at.toLocaleString(undefined, {
      day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
    });
    expect(validity).toEqual({
      verified: when(new Date(verifiedAt)),
      until: when(new Date(Date.parse(verifiedAt) + IDENTITY_CHECK_VALID_HOURS * 60 * 60 * 1000)),
    });
    expect(identityCheckStandingNote({ required: true, status: "passed", mode: "live", verifiedAt })).toBe(
      `Identity verified ${validity?.verified ?? ""}. Valid until ${validity?.until ?? ""}. `
      + "You will not be asked again for this workspace's documents until then.");
  });

  it("is nothing without a believable record of when", () => {
    expect(identityCheckValidity(null)).toBeNull();
    expect(identityCheckValidity(undefined)).toBeNull();
    expect(identityCheckValidity("not a date")).toBeNull();
  });
});

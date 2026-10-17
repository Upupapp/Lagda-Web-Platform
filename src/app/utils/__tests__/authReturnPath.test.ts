import { describe, it, expect, vi, afterEach } from "vitest";
import {
  sanitizeAppReturnTo, buildSignInUrl, noteDeliberateSignOut, isFullLoadReturnPath, continueToReturnPath,
} from "../authReturnPath";

describe("sanitizeAppReturnTo", () => {
  it("keeps /app paths and falls back for anything else", () => {
    expect(sanitizeAppReturnTo("/app/documents")).toBe("/app/documents");
    expect(sanitizeAppReturnTo("https://evil.example")).toBe("/app/dashboard");
    expect(sanitizeAppReturnTo(null)).toBe("/app/dashboard");
  });

  it("returns a public /verify/:id visitor to the in-app record after sign-in (087)", () => {
    expect(sanitizeAppReturnTo("/app/verify/LAGDA-VER-2026-004821")).toBe("/app/verify/LAGDA-VER-2026-004821");
    // As the public page's links send it: encoded once in the query string.
    const query = new URLSearchParams(`returnTo=${encodeURIComponent("/app/verify/LAGDA-VER-2026-004821")}`);
    expect(sanitizeAppReturnTo(query.get("returnTo"))).toBe("/app/verify/LAGDA-VER-2026-004821");
  });

  it("allows returning to a join link or an invitation link, exactly", () => {
    expect(sanitizeAppReturnTo("/join/abcDEF123_-xyz")).toBe("/join/abcDEF123_-xyz");
    expect(sanitizeAppReturnTo(encodeURIComponent("/join/abcDEF123"))).toBe("/join/abcDEF123");
    expect(sanitizeAppReturnTo("/invitations/accept?token=abcDEF123")).toBe("/invitations/accept?token=abcDEF123");
    expect(sanitizeAppReturnTo("/join/abc/../../evil")).toBe("/app/dashboard");
    expect(sanitizeAppReturnTo("/join//evil.example")).toBe("/app/dashboard");
    expect(sanitizeAppReturnTo("/invitations/accept?token=abcdef&next=https://evil")).toBe("/app/dashboard");
  });
});

describe("the Notary Directory as a way back", () => {
  const original = window.location;
  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: original });
  });

  it.each([
    "/enotary-directory/",
    "/enotary-directory/?select=maria-santos-2",
    `/enotary-directory/?select=${"a".repeat(80)}`,
  ])("accepts %s, and marks it for a full page load", (path) => {
    expect(sanitizeAppReturnTo(path)).toBe(path);
    expect(sanitizeAppReturnTo(encodeURIComponent(path))).toBe(path);
    expect(isFullLoadReturnPath(path)).toBe(true);
  });

  it.each([
    "/enotary-directory",
    "/enotary-directory/index.html",
    "/enotary-directory/js/app.js",
    "/enotary-directory/?select=",
    "/enotary-directory/?select=Maria",
    "/enotary-directory/?select=a_b",
    "/enotary-directory/?select=a.b",
    `/enotary-directory/?select=${"a".repeat(81)}`,
    "/enotary-directory/?select=abc&next=https://evil.example",
    "/enotary-directory/?select=abc#x",
    "/enotary-directory/?other=abc",
    "/enotary-directory//evil.example",
    "/enotary-directory/../app",
    "//enotary-directory/",
    "https://evil.example/enotary-directory/",
    "//evil.example/enotary-directory/",
    "/enotary-directory/%2F%2Fevil.example",
    "/enotary-directory/?select=%2e%2e",
    "%252Fenotary-directory%252F",
    "/enotary",
    "/enotary-directory-evil/",
  ])("refuses %s", (path) => {
    expect(sanitizeAppReturnTo(path)).toBe("/app/dashboard");
    expect(isFullLoadReturnPath(path)).toBe(false);
  });

  it("continues to the directory with a full page load, and to /app with the router", () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", { configurable: true, value: { ...original, assign } });
    const navigate = vi.fn();
    continueToReturnPath("/enotary-directory/?select=abc", navigate, { replace: true });
    expect(assign).toHaveBeenCalledWith("/enotary-directory/?select=abc");
    expect(navigate).not.toHaveBeenCalled();

    continueToReturnPath("/app/documents", navigate, { replace: true });
    expect(navigate).toHaveBeenCalledWith("/app/documents", { replace: true });
    expect(assign).toHaveBeenCalledTimes(1);
  });
});

describe("a deliberate sign-out", () => {
  it("ends on a plain /sign-in, where an expired session keeps the page to return to", () => {
    const t0 = 1_800_000_000_000;
    // Nobody signed out: the session expired, or a signed-out visitor opened a link.
    expect(buildSignInUrl("/app/settings/security/password", t0))
      .toBe("/sign-in?returnTo=%2Fapp%2Fsettings%2Fsecurity%2Fpassword");

    // The person pressed Sign Out. The next sign-in in this tab, on ANY
    // account, must open Home, not the page the last person was on.
    noteDeliberateSignOut(t0);
    expect(buildSignInUrl("/app/settings/security/password", t0 + 300)).toBe("/sign-in");
    expect(buildSignInUrl("/app/documents?list=sent", t0 + 5_000)).toBe("/sign-in");
  });

  it("is a short window, so a session that expires later still returns to its page", () => {
    const t0 = 1_800_000_100_000;
    noteDeliberateSignOut(t0);
    expect(buildSignInUrl("/app/documents", t0 + 60_000)).toBe("/sign-in?returnTo=%2Fapp%2Fdocuments");
  });
});

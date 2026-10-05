import { describe, it, expect } from "vitest";
import { sanitizeAppReturnTo, buildSignInUrl, noteDeliberateSignOut } from "../authReturnPath";

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

import { describe, it, expect } from "vitest";
import { sanitizeAppReturnTo } from "../authReturnPath";

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

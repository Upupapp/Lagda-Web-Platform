// What people actually paste into a recipients box.
//
// Addresses arrive from a mail client (comma-separated), a spreadsheet
// (newlines), and a chat message (spaces) — often all three in one paste. The
// parser is the only thing standing between that and a send, and a send is
// not undoable: each address that gets through receives a real email with a
// real signing link.

import { describe, it, expect } from "vitest";
import {
  parseRecipients, looksLikeEmail, MAX_RESEND_RECIPIENTS,
} from "../resend-signing.service";

describe("parseRecipients", () => {
  it("splits on commas, semicolons, newlines and spaces alike", () => {
    expect(parseRecipients("a@x.com, b@x.com;c@x.com\nd@x.com e@x.com")).toEqual([
      "a@x.com", "b@x.com", "c@x.com", "d@x.com", "e@x.com",
    ]);
  });

  it("collapses duplicates case-insensitively", () => {
    // Sending one person two links from a single action is never the intent,
    // and a mail client that capitalises differently should not defeat that.
    expect(parseRecipients("Sam@x.com, sam@x.com, SAM@X.COM")).toEqual(["Sam@x.com"]);
  });

  it("ignores empty fragments from trailing separators", () => {
    expect(parseRecipients("a@x.com,,  ;\n")).toEqual(["a@x.com"]);
  });

  it("returns nothing for whitespace only", () => {
    expect(parseRecipients("   \n  ")).toEqual([]);
  });
});

describe("looksLikeEmail", () => {
  it("accepts an ordinary address", () => {
    expect(looksLikeEmail("someone@example.com")).toBe(true);
  });

  it("rejects the shapes people actually mistype", () => {
    // A missing dot is the common one — "a@b" looks finished and is not.
    for (const bad of ["a@b", "no-at-sign.com", "@example.com", "two@@x.com", "spaced out@x.com"]) {
      expect(looksLikeEmail(bad), bad).toBe(false);
    }
  });

  it("rejects an address longer than the column that stores it", () => {
    expect(looksLikeEmail(`${"a".repeat(250)}@x.com`)).toBe(false);
  });
});

describe("MAX_RESEND_RECIPIENTS", () => {
  it("is a real bound, not a placeholder", () => {
    expect(MAX_RESEND_RECIPIENTS).toBeGreaterThan(1);
    expect(MAX_RESEND_RECIPIENTS).toBeLessThanOrEqual(100);
  });
});

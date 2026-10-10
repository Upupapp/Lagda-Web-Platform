// How long a passed identity check counts, in words.
//
// One number says it (the server enforces the real window), and every
// sentence that names the duration is built from that number.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  IDENTITY_CHECK_VALID_HOURS, IDENTITY_CHECK_VALID_NOTE, IDENTITY_CHECK_VALID_NOTE_TEST,
  IDENTITY_CHECK_VALID_SENDER_NOTE, identityCheckStandingNote,
} from "../identity-check";

// The participant's own locale and timezone, pinned for the test: whatever
// machine runs this formats as a browser in Manila set to en-PH would.
//
// Written out part by part rather than left to the runtime's own locale data,
// which words "10:00 am" differently from one version to the next. What is
// under test is the instant shown and the 24 hours added, not that wording.
beforeEach(() => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila", day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  vi.spyOn(Date.prototype, "toLocaleString").mockImplementation(function (this: Date) {
    const part = (type: string) => parts.formatToParts(this).find(p => p.type === type)?.value ?? "";
    return `${part("day")} ${part("month")} ${part("year")}, ${part("hour")}:${part("minute")}`;
  });
});

const passed = (over: Record<string, unknown> = {}) => ({
  required: true, status: "passed", mode: "live" as const, verifiedAt: "2026-10-09T02:00:00.000Z", ...over,
});

describe("the one duration", () => {
  it("is 24 hours, and every sentence is built from it", () => {
    expect(IDENTITY_CHECK_VALID_HOURS).toBe(24);
    expect(IDENTITY_CHECK_VALID_NOTE).toBe(
      "Your identity is verified for the next 24 hours. During that time you can open and sign other "
      + "documents from this sender's workspace without verifying again.");
    expect(IDENTITY_CHECK_VALID_NOTE_TEST).toBe(
      "In test mode this result is kept for 24 hours, as a real verification would be.");
    expect(IDENTITY_CHECK_VALID_SENDER_NOTE).toBe(
      "A participant who passes is not asked again for 24 hours on this workspace's documents.");
  });

  it("never calls a test-mode result verified", () => {
    expect(IDENTITY_CHECK_VALID_NOTE_TEST).not.toMatch(/is verified|are verified|identity verified/i);
  });
});

describe("identityCheckStandingNote", () => {
  it("says when the identity was verified and until when that counts, 24 hours on", () => {
    // 02:00 UTC on the 9th is 10:00 in Manila; valid until 10:00 on the 10th.
    expect(identityCheckStandingNote(passed())).toBe(
      "Identity verified 9 Oct 2026, 10:00. Valid until 10 Oct 2026, 10:00. "
      + "You will not be asked again for this workspace's documents until then.");
  });

  it("crosses a month's end correctly", () => {
    expect(identityCheckStandingNote(passed({ verifiedAt: "2026-10-31T15:30:00.000Z" }))).toBe(
      "Identity verified 31 Oct 2026, 23:30. Valid until 1 Nov 2026, 23:30. "
      + "You will not be asked again for this workspace's documents until then.");
  });

  it("does not say verified in test mode", () => {
    const note = identityCheckStandingNote(passed({ mode: "test" }));
    expect(note).toBe("Identity check completed in test mode 9 Oct 2026, 10:00. Kept until 10 Oct 2026, 10:00.");
    expect(note).not.toMatch(/verified/i);
  });

  it("says nothing when the check is not asked, not passed, or has no date", () => {
    expect(identityCheckStandingNote(undefined)).toBeNull();
    expect(identityCheckStandingNote(passed({ required: false }))).toBeNull();
    expect(identityCheckStandingNote(passed({ required: false, status: "not-required", mode: null }))).toBeNull();
    expect(identityCheckStandingNote(passed({ status: "pending" }))).toBeNull();
    expect(identityCheckStandingNote(passed({ status: "locked" }))).toBeNull();
    expect(identityCheckStandingNote(passed({ verifiedAt: null }))).toBeNull();
    expect(identityCheckStandingNote(passed({ verifiedAt: "not a date" }))).toBeNull();
  });
});

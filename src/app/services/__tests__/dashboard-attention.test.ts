// Pure-logic coverage for the dashboard's rules — what is stalled, what is
// expiring, which request outranks which. Run against a fixed clock, because
// every one of these is a comparison against "now" and a test that read the
// real clock would pass on Monday and fail on Friday.

import { describe, it, expect } from "vitest";
import {
  summarize, needsAttention, inFlight, recentlyCompleted,
  DEFAULT_THRESHOLDS, DAY_MS,
} from "../dashboard/attention";
import type { SigningRequestListItem, SigningRequestState } from "../real/signing-request.service";
import { SIGNING_REQUEST_STATUS } from "../signing-request-status";

const NOW = Date.parse("2026-09-20T12:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW - n * DAY_MS).toISOString();
const daysAhead = (n: number) => new Date(NOW + n * DAY_MS).toISOString();

let seq = 0;
function req(over: Partial<SigningRequestListItem> = {}): SigningRequestListItem {
  seq += 1;
  return {
    signingRequestId: `sr_${seq}`,
    documentId: `doc_${seq}`,
    documentTitle: `Document ${seq}`,
    state: "sent",
    participantCount: 2,
    completedParticipantCount: 0,
    // Null rather than a sender: nothing here turns on who sent the request,
    // and a name would imply these tests exercise attribution.
    initiator: null,
    createdAt: daysAgo(10),
    sentAt: daysAgo(1),
    completedAt: null,
    expiresAt: null,
    ...over,
  };
}

describe("summarize", () => {
  it("buckets every state somewhere, exactly once", () => {
    const states: SigningRequestState[] = [
      "draft", "ready-to-send", "sent", "partially-completed", "completion-ready",
      "completed", "declined", "cancelled", "expired",
    ];
    const s = summarize(states.map(state => req({ state })), states.length);
    expect(s.drafts + s.inFlight + s.completed + s.attention + s.cancelled).toBe(states.length);
    expect(s).toMatchObject({ drafts: 2, inFlight: 3, completed: 1, attention: 2, cancelled: 1 });
  });

  it("keeps fetched and total apart, because the list is paged", () => {
    // The page can carry 100 rows of a 340-row workspace. Presenting the
    // bucket counts as workspace totals would be the invented-numbers bug
    // this dashboard was emptied to avoid.
    const s = summarize([req(), req()], 340);
    expect(s.fetched).toBe(2);
    expect(s.total).toBe(340);
  });
});

describe("needsAttention", () => {
  it("lists a declined request regardless of age", () => {
    const out = needsAttention([req({ state: "declined", sentAt: daysAgo(0.1) })], NOW);
    expect(out.map(e => e.kind)).toEqual(["declined"]);
  });

  it("flags an in-flight request expiring within the window", () => {
    const out = needsAttention([req({ expiresAt: daysAhead(3) })], NOW);
    expect(out[0]?.kind).toBe("expiring");
    expect(out[0]?.days).toBeCloseTo(3, 5);
  });

  it("does not flag one expiring after the window", () => {
    expect(needsAttention([req({ expiresAt: daysAhead(30) })], NOW)).toEqual([]);
  });

  it("does not flag one already past expiry as expiring", () => {
    // The backend's sweep will flip it to `expired`; until then it is not
    // "soon", and listing it as such would say the wrong thing.
    expect(needsAttention([req({ expiresAt: daysAgo(1) })], NOW)).toEqual([]);
  });

  it("flags a request sent long ago that nobody has signed", () => {
    const out = needsAttention([req({ sentAt: daysAgo(6), completedParticipantCount: 0 })], NOW);
    expect(out[0]?.kind).toBe("stalled");
  });

  it("does not call a request stalled once somebody has signed", () => {
    // Waiting on a second signer is progress, not a stall.
    const out = needsAttention([req({ sentAt: daysAgo(20), completedParticipantCount: 1 })], NOW);
    expect(out).toEqual([]);
  });

  it("does not call a request stalled before the threshold", () => {
    expect(needsAttention([req({ sentAt: daysAgo(2) })], NOW)).toEqual([]);
  });

  it("lists an in-flight request once, under expiry when both apply", () => {
    const out = needsAttention([req({ sentAt: daysAgo(20), expiresAt: daysAhead(1) })], NOW);
    expect(out).toHaveLength(1);
    expect(out[0]?.kind).toBe("expiring");
  });

  it("flags a draft that was prepared and then forgotten", () => {
    const out = needsAttention([req({ state: "draft", sentAt: null, createdAt: daysAgo(3) })], NOW);
    expect(out[0]?.kind).toBe("never-sent");
  });

  it("gives a fresh draft time before calling it forgotten", () => {
    const out = needsAttention([req({ state: "ready-to-send", sentAt: null, createdAt: daysAgo(0.5) })], NOW);
    expect(out).toEqual([]);
  });

  it("ignores completed and cancelled requests entirely", () => {
    const out = needsAttention([
      req({ state: "completed", completedAt: daysAgo(1), expiresAt: daysAhead(1) }),
      req({ state: "cancelled", sentAt: daysAgo(30) }),
    ], NOW);
    expect(out).toEqual([]);
  });

  it("orders declined, then expiring soonest-first, then stalled oldest-first, then drafts", () => {
    const out = needsAttention([
      req({ state: "draft", sentAt: null, createdAt: daysAgo(4), documentTitle: "draft" }),
      req({ sentAt: daysAgo(6), documentTitle: "stalled-6" }),
      req({ expiresAt: daysAhead(5), documentTitle: "exp-5" }),
      req({ sentAt: daysAgo(9), documentTitle: "stalled-9" }),
      req({ state: "declined", documentTitle: "declined" }),
      req({ expiresAt: daysAhead(1), documentTitle: "exp-1" }),
    ], NOW);
    expect(out.map(e => e.item.documentTitle)).toEqual([
      "declined", "exp-1", "exp-5", "stalled-9", "stalled-6", "draft",
    ]);
  });

  it("honours custom thresholds", () => {
    const strict = { ...DEFAULT_THRESHOLDS, stalledDays: 1 };
    const out = needsAttention([req({ sentAt: daysAgo(2) })], NOW, strict);
    expect(out[0]?.kind).toBe("stalled");
  });
});

describe("inFlight", () => {
  it("returns only sent requests, newest first, with progress", () => {
    const out = inFlight([
      req({ sentAt: daysAgo(5), completedParticipantCount: 1, participantCount: 3, documentTitle: "older" }),
      req({ state: "completed", completedAt: daysAgo(1) }),
      req({ state: "draft", sentAt: null }),
      req({ sentAt: daysAgo(1), documentTitle: "newer" }),
    ]);
    expect(out.map(e => e.item.documentTitle)).toEqual(["newer", "older"]);
    expect(out[1]).toMatchObject({ signed: 1, of: 3 });
  });
});

describe("recentlyCompleted", () => {
  it("returns completed requests newest first, capped", () => {
    const out = recentlyCompleted([
      req({ state: "completed", completedAt: daysAgo(3), documentTitle: "c3" }),
      req({ state: "completed", completedAt: daysAgo(1), documentTitle: "c1" }),
      req({ state: "completed", completedAt: daysAgo(2), documentTitle: "c2" }),
      req({ state: "sent" }),
    ], 2);
    expect(out.map(i => i.documentTitle)).toEqual(["c1", "c2"]);
  });
});

describe("SIGNING_REQUEST_STATUS", () => {
  it("maps every backend state to a badge status", () => {
    const states: SigningRequestState[] = [
      "draft", "ready-to-send", "sent", "partially-completed", "completion-ready",
      "completed", "declined", "cancelled", "expired",
    ];
    for (const state of states) expect(SIGNING_REQUEST_STATUS[state]).toBeTruthy();
    expect(SIGNING_REQUEST_STATUS["completion-ready"]).toBe("awaiting-signature");
  });
});

// The Overview's chart figures, computed from real signing requests.

import { describe, it, expect } from "vitest";
import {
  weekStart, weeklyTrend, countBetween, averageDaysToComplete, statusMix, stuckRequests,
} from "../real/overview-insights";
import type { SigningRequestListItem, SigningRequestState } from "../../../../services/real/signing-request.service";

const DAY = 86_400_000;
const NOW = new Date(2026, 9, 1, 12, 0, 0).getTime(); // Thursday 1 October 2026, noon

const req = (id: string, state: SigningRequestState, sentDaysAgo: number | null, doneDaysAgo: number | null = null): SigningRequestListItem => ({
  signingRequestId: id, documentId: `doc_${id}`, documentTitle: `Doc ${id}`, state,
  participantCount: 2, completedParticipantCount: doneDaysAgo === null ? 0 : 2, initiator: null,
  createdAt: new Date(NOW - (sentDaysAgo ?? 1) * DAY).toISOString(),
  sentAt: sentDaysAgo === null ? null : new Date(NOW - sentDaysAgo * DAY).toISOString(),
  completedAt: doneDaysAgo === null ? null : new Date(NOW - doneDaysAgo * DAY).toISOString(),
  expiresAt: null,
});

const ITEMS = [
  req("a", "completed", 2, 1),      // this week: sent and completed, 1 day
  req("b", "sent", 3),              // this week: sent, still waiting
  req("c", "completed", 10, 7),     // last week: sent 10 days ago, done 3 days later
  req("d", "declined", 20),
  req("e", "expired", 40),
  req("f", "draft", null),          // never sent: not counted anywhere
  req("g", "partially-completed", 9),
];

describe("overview figures", () => {
  it("weeks start on Monday", () => {
    expect(new Date(weekStart(NOW)).getDay()).toBe(1);
  });

  it("counts sent and completed per week, oldest first, ending this week", () => {
    const weeks = weeklyTrend(ITEMS, 3, NOW);
    expect(weeks).toHaveLength(3);
    expect(weeks[2]).toMatchObject({ sent: 2, completed: 1 });   // a, b sent; a completed
    expect(weeks[1]).toMatchObject({ sent: 2, completed: 1 });   // c, g sent; c completed (7 days ago)
  });

  it("counts between two times, for this month against last", () => {
    expect(countBetween(ITEMS, NOW - 5 * DAY, NOW + 1)).toEqual({ sent: 2, completed: 1 });
  });

  it("averages days from sending to completion", () => {
    expect(averageDaysToComplete(ITEMS)).toBeCloseTo((1 + 3) / 2, 5);
    expect(averageDaysToComplete([req("x", "sent", 2)])).toBeNull();
  });

  it("mixes where SENT documents stand, leaving drafts out", () => {
    expect(statusMix(ITEMS).map(s => [s.key, s.value])).toEqual([
      ["completed", 2], ["in-progress", 2], ["declined", 1], ["expired", 1],
    ]);
  });

  it("finds documents waiting on signers for a week or more", () => {
    expect(stuckRequests(ITEMS, 7, NOW).map(r => r.signingRequestId)).toEqual(["g"]);
  });
});

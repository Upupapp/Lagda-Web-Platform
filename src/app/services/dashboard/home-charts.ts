// The figures behind Home's charts.
//
// Same input and same honesty as the rest of Home (attention.ts): the rows
// GET /workspaces/:id/signing-requests returned, nothing estimated. The weekly
// line reuses the Workspace Overview's weeklyTrend, so the two pages count a
// week the same way; the circle charts read the same buckets as the "At a
// glance" tiles, so a chart and the tile beside it always agree.

import type { SigningRequestListItem } from "../real/signing-request.service";
import { isInFlight, type StatusSummary } from "./attention";

/** How many weeks the line covers, this week included. */
export const HOME_TREND_WEEKS = 12;

export type HomeSliceKey = "in-flight" | "attention" | "drafts" | "completed" | "cancelled";

export interface HomeSlice {
  readonly key: HomeSliceKey;
  readonly label: string;
  readonly value: number;
  /** Its mark's colour. Completed and needs attention keep the success and error colours. */
  readonly color: string;
}

/**
 * The status split, in the "At a glance" order. Around the ring the error red
 * never touches the success green: in flight, needs attention, drafts,
 * completed, then cancelled (only when there is any) closing the circle.
 */
export function statusSlices(summary: StatusSummary): HomeSlice[] {
  const slices: HomeSlice[] = [
    { key: "in-flight", label: "In flight", value: summary.inFlight, color: "#1b3a66" },
    { key: "attention", label: "Needs attention", value: summary.attention, color: "#DC2626" },
    { key: "drafts", label: "Drafts", value: summary.drafts, color: "#4a9ad8" },
    { key: "completed", label: "Completed", value: summary.completed, color: "#059669" },
  ];
  if (summary.cancelled > 0) {
    slices.push({ key: "cancelled", label: "Cancelled", value: summary.cancelled, color: "#94A3B8" });
  }
  return slices;
}

export interface SignatureProgress {
  /** Signatures already given, across the requests still out for signing. */
  readonly signed: number;
  /** Signatures those requests need in all. */
  readonly of: number;
  /** How many requests that is. */
  readonly requests: number;
}

/** Participants done, out of all involved, on every request still out for signing (an approval or a review counts, not only a signature). */
export function signatureProgress(items: readonly SigningRequestListItem[]): SignatureProgress {
  let signed = 0, of = 0, requests = 0;
  for (const item of items) {
    if (!isInFlight(item)) continue;
    requests += 1;
    of += item.participantCount;
    signed += Math.min(item.completedParticipantCount, item.participantCount);
  }
  return { signed, of, requests };
}

/** A share of a whole as a whole percent; a sliver that would round to 0 says "<1". */
export function percentLabel(value: number, whole: number): string {
  if (whole <= 0 || value <= 0) return "0%";
  const pct = (value / whole) * 100;
  return pct < 1 ? "<1%" : `${String(Math.round(pct))}%`;
}

/**
 * A clean top for a count axis and its steps: whole numbers only, at most
 * five steps, never below 4 (a week with one request still leaves headroom).
 */
export function countAxis(max: number): { top: number; ticks: number[] } {
  const target = Math.max(4, Math.ceil(max));
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  const step = steps.find(s => Math.ceil(target / s) <= 5) ?? Math.ceil(target / 5);
  const top = Math.ceil(target / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  return { top, ticks };
}

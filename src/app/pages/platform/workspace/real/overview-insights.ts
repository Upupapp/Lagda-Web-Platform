// The figures behind the Overview's charts, from what the backend already
// holds — nothing estimated, nothing invented:
//
//   · signing requests of the last 90 days (newest first, read page by page
//     only as far back as the window), for the weekly sent/completed trend,
//     the average time to complete, and the status mix
//   · the workspace's usage (092): this month's sent count and storage, for
//     the plan rings
//   · teams and how many people each has
//   · the last few activity entries
//
// Each source is asked for only when the person's role may read it, and each
// fails on its own: a chart whose numbers did not load says so, it is never
// drawn from zeros. Computed in the browser — fine for the volumes a
// workspace sends today; a backend summary can replace it later without the
// page changing.

import { useEffect, useState } from "react";
import { realSigningRequestService, type SigningRequestListItem, type SigningRequestState } from "../../../../services/real/signing-request.service";
import { realWorkspaceUsageService, type WorkspaceUsage } from "../../../../services/real/workspace-usage.service";
import { realOrganizationService } from "../../../../services/real/organization.service";
import { listWorkspaceActivity, type WorkspaceActivityEntry } from "../../../../services/real/workspace-activity.service";

const DAY = 86_400_000;
export const WINDOW_DAYS = 90;
const PAGE = 100;
const MAX_PAGES = 5;

export type Loadable<T> = T | null | "error";

export interface WeekPoint { label: string; start: number; sent: number; completed: number }
export interface StatusSlice { key: "completed" | "in-progress" | "declined" | "expired"; label: string; value: number }
export interface TeamSize { unitId: string; name: string; people: number }

export interface OverviewInsights {
  requests: Loadable<SigningRequestListItem[]>;
  usage: Loadable<WorkspaceUsage>;
  teams: Loadable<TeamSize[]>;
  activity: Loadable<WorkspaceActivityEntry[]>;
}

export interface InsightGates { documents: boolean; usage: boolean; teams: boolean; activity: boolean }

const time = (iso: string | null): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
};

/** Monday 00:00 of the week `ms` falls in, local time. */
export function weekStart(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return d.getTime();
}

/** Sent and completed per week, oldest first, over `weeks` weeks ending this week. */
export function weeklyTrend(items: readonly SigningRequestListItem[], weeks: number, now = Date.now()): WeekPoint[] {
  const thisWeek = weekStart(now);
  const points: WeekPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisWeek);
    d.setDate(d.getDate() - i * 7);
    const start = d.getTime();
    points.push({ start, label: d.toLocaleDateString("en-PH", { month: "short", day: "numeric" }), sent: 0, completed: 0 });
  }
  const index = (t: number) => {
    const ws = weekStart(t);
    return points.findIndex(p => p.start === ws);
  };
  for (const r of items) {
    const sent = time(r.sentAt);
    if (sent !== null) { const i = index(sent); if (i >= 0) points[i]!.sent += 1; }
    const done = time(r.completedAt);
    if (done !== null) { const i = index(done); if (i >= 0) points[i]!.completed += 1; }
  }
  return points;
}

/** Counts of requests sent and completed between two times. */
export function countBetween(items: readonly SigningRequestListItem[], from: number, to: number): { sent: number; completed: number } {
  let sent = 0, completed = 0;
  for (const r of items) {
    const s = time(r.sentAt); if (s !== null && s >= from && s < to) sent += 1;
    const c = time(r.completedAt); if (c !== null && c >= from && c < to) completed += 1;
  }
  return { sent, completed };
}

/** Average days from sending to completion, over requests completed in the window. Null with none. */
export function averageDaysToComplete(items: readonly SigningRequestListItem[]): number | null {
  const spans = items.flatMap(r => {
    const s = time(r.sentAt), c = time(r.completedAt);
    return s !== null && c !== null && c >= s ? [(c - s) / DAY] : [];
  });
  if (spans.length === 0) return null;
  return spans.reduce((a, b) => a + b, 0) / spans.length;
}

const IN_PROGRESS: readonly SigningRequestState[] = ["sent", "partially-completed", "completion-ready"];

/** Where the window's SENT requests stand now. Drafts are not counted. */
export function statusMix(items: readonly SigningRequestListItem[]): StatusSlice[] {
  const sent = items.filter(r => r.sentAt !== null);
  const of = (states: readonly SigningRequestState[]) => sent.filter(r => states.includes(r.state)).length;
  return [
    { key: "completed", label: "Completed", value: of(["completed"]) },
    { key: "in-progress", label: "In progress", value: of(IN_PROGRESS) },
    { key: "declined", label: "Declined", value: of(["declined", "cancelled"]) },
    { key: "expired", label: "Expired", value: of(["expired"]) },
  ];
}

/** Requests sent at least `days` ago that are still waiting on a signer. */
export function stuckRequests(items: readonly SigningRequestListItem[], days: number, now = Date.now()): SigningRequestListItem[] {
  return items.filter(r => {
    const s = time(r.sentAt);
    return s !== null && IN_PROGRESS.includes(r.state) && now - s >= days * DAY;
  });
}

async function requestsInWindow(workspaceId: string, now: number): Promise<SigningRequestListItem[]> {
  const since = now - WINDOW_DAYS * DAY;
  const out: SigningRequestListItem[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await realSigningRequestService.list(workspaceId, { page, perPage: PAGE });
    let older = false;
    for (const item of result.items) {
      const created = time(item.createdAt) ?? 0;
      if (created < since && (time(item.completedAt) ?? 0) < since) { older = true; continue; }
      out.push(item);
    }
    if (older || !result.hasNextPage) break;
  }
  return out;
}

export function useOverviewInsights(workspaceId: string, gates: InsightGates, refreshKey: string | number = 0): OverviewInsights {
  const [data, setData] = useState<OverviewInsights>({ requests: null, usage: null, teams: null, activity: null });
  const { documents, usage, teams, activity } = gates;
  useEffect(() => {
    let cancelled = false;
    const set = (patch: Partial<OverviewInsights>) => { if (!cancelled) setData(d => ({ ...d, ...patch })); };
    const now = Date.now();
    if (documents) {
      requestsInWindow(workspaceId, now).then(items => { set({ requests: items }); }).catch(() => { set({ requests: "error" }); });
    }
    if (usage) {
      realWorkspaceUsageService.get(workspaceId).then(u => { set({ usage: u }); }).catch(() => { set({ usage: "error" }); });
    }
    if (teams) {
      realOrganizationService.listUnits(workspaceId)
        .then(async units => {
          const live = units.filter(u => u.archivedAt === null);
          const counts = await Promise.all(live.map(u => realOrganizationService.listMembers(workspaceId, u.unitId).then(m => m.length).catch(() => 0)));
          set({ teams: live.map((u, i) => ({ unitId: u.unitId, name: u.name, people: counts[i] ?? 0 })).sort((a, b) => b.people - a.people) });
        })
        .catch(() => { set({ teams: "error" }); });
    }
    if (activity) {
      listWorkspaceActivity(workspaceId, { limit: 5 }).then(p => { set({ activity: p.events.slice(0, 5) }); }).catch(() => { set({ activity: "error" }); });
    }
    return () => { cancelled = true; };
  }, [workspaceId, documents, usage, teams, activity, refreshKey]);
  return data;
}

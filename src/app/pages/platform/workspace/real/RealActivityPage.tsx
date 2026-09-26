// /app/workspace/activity with a real backend — the workspace activity log
// (079): who changed members, access, join links, teams and the workspace.
//
// Owners, administrators and auditors only (`activity.view`); for everyone
// else the page says so and makes no request. Each entry's `summary` is the
// backend's finished sentence and is shown exactly as given.

import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspaceAccess } from "../../../../hooks/useWorkspaceAccess";
import {
  listWorkspaceActivity, ACTIVITY_CATEGORIES, ACTIVITY_CATEGORY_LABELS,
  type WorkspaceActivityCategory, type WorkspaceActivityEntry,
} from "../../../../services/real/workspace-activity.service";
import { buttonStyle } from "../join/join-styles";
import { ManagePage, NotAvailable, LoadingBlock, ErrorBlock, GF, GM, NAVY, SLATE, SILVER, BORDER } from "./manage-ui";
import { cardStyle } from "./manage-styles";
import { errorMessage } from "./manage-format";

const CRUMBS = [{ label: "Manage", to: "/app/workspace" }, { label: "Activity log" }];
export const EMPTY_ACTIVITY_MESSAGE = "Nothing recorded yet. Changes to members, links, teams and settings appear here from now on.";

const CATEGORY_TONE: Record<WorkspaceActivityCategory, { bg: string; color: string }> = {
  people: { bg: "#EBF4FC", color: "#0B4F8A" },
  access: { bg: "#F3E8FF", color: "#6B21A8" },
  links: { bg: "#ECFDF3", color: "#166534" },
  teams: { bg: "#FFF7ED", color: "#9A3412" },
  workspace: { bg: "#F1F5F9", color: "#334155" },
};

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getFullYear())}-${String(d.getMonth())}-${String(d.getDate())}`;
}

function dayLabel(ms: number, now: number): string {
  if (dayKey(ms) === dayKey(now)) return "Today";
  if (dayKey(ms) === dayKey(now - 24 * 60 * 60 * 1000)) return "Yesterday";
  return new Date(ms).toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function timeLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

function groupByDay(events: WorkspaceActivityEntry[]): { key: string; first: number; events: WorkspaceActivityEntry[] }[] {
  const groups: { key: string; first: number; events: WorkspaceActivityEntry[] }[] = [];
  for (const e of events) {
    const key = dayKey(e.occurredAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.events.push(e);
    else groups.push({ key, first: e.occurredAt, events: [e] });
  }
  return groups;
}

export function RealActivityPage({ workspaceId }: { workspaceId: string }) {
  const access = useWorkspaceAccess();
  const canView = access.can("activity.view");
  const [category, setCategory] = useState<WorkspaceActivityCategory | null>(null);
  const [events, setEvents] = useState<WorkspaceActivityEntry[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const request = useRef(0);

  const loadFirst = useCallback(async (cat: WorkspaceActivityCategory | null) => {
    const id = ++request.current;
    setEvents(null);
    setError(null);
    setMoreError(null);
    try {
      const page = await listWorkspaceActivity(workspaceId, { category: cat });
      if (id !== request.current) return;
      setEvents(page.events);
      setNextCursor(page.nextCursor);
    } catch (err) {
      if (id !== request.current) return;
      setError(errorMessage(err, "We couldn't load the activity log."));
    }
  }, [workspaceId]);

  useEffect(() => { if (canView) void loadFirst(category); }, [canView, category, loadFirst]);

  async function loadMore() {
    if (nextCursor === null) return;
    const id = request.current;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await listWorkspaceActivity(workspaceId, { category, before: nextCursor });
      if (id !== request.current) return;
      setEvents(list => {
        const seen = new Set((list ?? []).map(e => e.eventId));
        return [...(list ?? []), ...page.events.filter(e => !seen.has(e.eventId))];
      });
      setNextCursor(page.nextCursor);
    } catch (err) {
      if (id === request.current) setMoreError(errorMessage(err, "We couldn't load older entries."));
    } finally {
      if (id === request.current) setLoadingMore(false);
    }
  }

  if (!canView) {
    return <NotAvailable crumbs={CRUMBS} title="Activity log"
      message="Only the workspace's owner, administrators and auditors can read the activity log." />;
  }

  const now = Date.now();
  const chips: { value: WorkspaceActivityCategory | null; label: string }[] = [
    { value: null, label: "All" },
    ...ACTIVITY_CATEGORIES.map(c => ({ value: c, label: ACTIVITY_CATEGORY_LABELS[c] })),
  ];

  return (
    <ManagePage crumbs={CRUMBS} title="Activity log" maxWidth={860}>
      <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 16px", lineHeight: 1.6 }}>
        A record of changes to this workspace: who joined or left, roles and privileges, join links, teams and the workspace name.
      </p>
      <div role="group" aria-label="Filter by category" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {chips.map(c => {
          const active = category === c.value;
          return (
            <button key={c.label} type="button" aria-pressed={active} onClick={() => setCategory(c.value)}
              style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "7px 14px", minHeight: 36, borderRadius: 999, cursor: "pointer",
                border: `1px solid ${active ? NAVY : BORDER}`, background: active ? NAVY : "#FFFFFF", color: active ? "#FFFFFF" : SLATE }}>
              {c.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <ErrorBlock message={error} onRetry={() => void loadFirst(category)} />
      ) : events === null ? (
        <LoadingBlock label="Loading activity…" />
      ) : events.length === 0 ? (
        <div data-testid="activity-empty" style={{ ...cardStyle, padding: "40px 24px", textAlign: "center" }}>
          <p style={{ ...GF, fontSize: 14, color: SLATE, margin: 0, lineHeight: 1.6 }}>
            {category === null ? EMPTY_ACTIVITY_MESSAGE : `Nothing recorded under ${ACTIVITY_CATEGORY_LABELS[category]} yet.`}
          </p>
          {category !== null && (
            <button type="button" onClick={() => setCategory(null)} style={{ ...buttonStyle("link"), marginTop: 8 }}>Show everything</button>
          )}
        </div>
      ) : (
        <>
          <div data-testid="activity-list" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {groupByDay(events).map(group => (
              <section key={group.key} aria-label={dayLabel(group.first, now)}>
                <h2 style={{ ...GF, fontSize: 12, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>
                  {dayLabel(group.first, now)}
                </h2>
                <ol style={{ ...cardStyle, listStyle: "none", margin: 0, padding: 0, overflow: "hidden" }}>
                  {group.events.map((e, i) => {
                    const tone = CATEGORY_TONE[e.category] ?? CATEGORY_TONE.workspace;
                    return (
                      <li key={e.eventId} data-testid={`activity-${e.eventId}`}
                        style={{ display: "flex", gap: 12, padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid #F0F2F5", flexWrap: "wrap", alignItems: "baseline" }}>
                        <time dateTime={new Date(e.occurredAt).toISOString()} style={{ ...GM, fontSize: 11, color: SILVER, flex: "0 0 64px" }}>
                          {timeLabel(e.occurredAt)}
                        </time>
                        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                          <div style={{ ...GF, fontSize: 14, color: NAVY, lineHeight: 1.5, overflowWrap: "anywhere" }}>{e.summary}</div>
                        </div>
                        <span style={{ ...GM, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: tone.bg, color: tone.color, whiteSpace: "nowrap" }}>
                          {ACTIVITY_CATEGORY_LABELS[e.category] ?? e.category}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
          <div style={{ marginTop: 18, textAlign: "center" }}>
            {moreError && <p role="alert" style={{ ...GF, fontSize: 13, color: "#991B1B", margin: "0 0 8px" }}>{moreError}</p>}
            {nextCursor !== null ? (
              <button type="button" onClick={() => void loadMore()} disabled={loadingMore} style={buttonStyle("secondary", loadingMore)}>
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            ) : (
              <p style={{ ...GF, fontSize: 12, color: SILVER, margin: 0 }}>That is everything recorded{category ? ` under ${ACTIVITY_CATEGORY_LABELS[category]}` : ""}.</p>
            )}
          </div>
        </>
      )}
    </ManagePage>
  );
}

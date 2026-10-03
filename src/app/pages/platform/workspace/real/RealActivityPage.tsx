// /app/workspace/activity with a real backend — the workspace activity log
// (079): who changed members, access, join links, teams and the workspace.
//
// Owners, administrators and auditors only (`activity.view`); for everyone
// else the page says so and makes no request.
//
// ── The design ─────────────────────────────────────────────────────────────
//
// A timeline, newest first, grouped by day (Today, Yesterday, then dates).
// Every entry leads with WHO: their photo (or initials) and their name — or
// "You" when it was the person reading. Anyone else the sentence mentions who
// is a member gets their photo beside their name too. A coloured icon on the
// rail says what kind of change it was; the time sits under the sentence.
// Filters by kind and a search box narrow it; older entries load on demand.
//
// The sentence itself is the backend's (`summary`), written when the log is
// read. This page only swaps the names it recognises for faces and "You" —
// it never rebuilds the sentence from `action`.
//
// One column on a phone; on a wider screen a timeline rail on the left.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLiveRefresh } from "../../../../services/live/use-live-refresh";
import { Users, KeyRound, Link2, Network, Building2, Search, Settings2, type LucideIcon } from "lucide-react";
import { useWorkspaceAccess } from "../../../../hooks/useWorkspaceAccess";
import { usePlatform } from "../../../../context/PlatformContext";
import {
  listWorkspaceActivity, ACTIVITY_CATEGORIES, ACTIVITY_CATEGORY_LABELS,
  type WorkspaceActivityCategory, type WorkspaceActivityEntry,
} from "../../../../services/real/workspace-activity.service";
import { realWorkspaceAdminService } from "../../../../services/real/workspace-admin.service";
import { useWorkspacePeople, memberAvatarUrl } from "../../../../services/real/workspace-people.service";
import { MemberAvatar } from "../../../../components/platform/MemberAvatar";
import { buttonStyle } from "../join/join-styles";
import { ManagePage, NotAvailable, LoadingBlock, ErrorBlock, GF, NAVY, SLATE, SILVER, BORDER } from "./manage-ui";
import { cardStyle } from "./manage-styles";
import { errorMessage } from "./manage-format";

const CRUMBS = [{ label: "Workspace", to: "/app/workspace" }, { label: "Activity log" }];
export const EMPTY_ACTIVITY_MESSAGE = "Nothing recorded yet. Changes to members, links, teams and settings appear here from now on.";

const CATEGORY_STYLE: Record<WorkspaceActivityCategory, { bg: string; color: string; icon: LucideIcon }> = {
  people: { bg: "#EBF4FC", color: "#0B4F8A", icon: Users },
  access: { bg: "#F3E8FF", color: "#6B21A8", icon: KeyRound },
  links: { bg: "#ECFDF3", color: "#166534", icon: Link2 },
  teams: { bg: "#FFF7ED", color: "#9A3412", icon: Network },
  workspace: { bg: "#F1F5F9", color: "#334155", icon: Building2 },
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

function agoLabel(ms: number, now: number): string {
  const minutes = Math.round((now - ms) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${String(minutes)} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${String(hours)} h ago`;
  return "";
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

interface Person { userId: string; displayName: string }

/** The face-and-name for a person in a sentence. */
function Who({ name, url, you }: { name: string; url?: string | undefined; you: boolean }) {
  return (
    <span className="act-who">
      <MemberAvatar name={name} url={url} size={20} />
      <strong data-you={you ? "true" : undefined}>{you ? "You" : name}</strong>
    </span>
  );
}

/**
 * The backend's sentence, with the actor at the front shown as a face and a
 * name ("You" for the reader) and the subject, when a member, as a face too.
 */
export function ActivitySentence({ entry, meId, people, photo }: {
  entry: WorkspaceActivityEntry;
  meId: string | null;
  people: ReadonlyMap<string, Person>;
  photo: (userId: string | null | undefined) => string | undefined;
}) {
  const actorIsMe = meId !== null && entry.actorUserId === meId;
  let rest = entry.summary;
  let lead: ReactNode = null;
  if (entry.actorName && rest.startsWith(entry.actorName)) {
    rest = rest.slice(entry.actorName.length);
    lead = <Who name={entry.actorName} url={photo(entry.actorUserId)} you={actorIsMe} />;
    if (actorIsMe) {
      rest = rest.replace(/^ is /, " are ").replace(/^ has /, " have ").replace(/ and is /g, " and are ").replace(/ their /g, " your ");
    }
  }

  // The subject, when they are a member the sentence names.
  const subject = entry.subjectLabel ? people.get(entry.subjectLabel.toLowerCase()) : undefined;
  let body: ReactNode = rest;
  if (subject && entry.subjectLabel) {
    const at = rest.indexOf(entry.subjectLabel);
    if (at >= 0) {
      const before = rest.slice(0, at);
      let after = rest.slice(at + entry.subjectLabel.length);
      const subjectIsMe = meId !== null && subject.userId === meId;
      let shown = entry.subjectLabel;
      if (subjectIsMe) {
        if (after.startsWith("'s")) { shown = "your"; after = after.slice(2); } else shown = "you";
      }
      body = <>{before}<span className="act-who">
        <MemberAvatar name={subject.displayName} url={photo(subject.userId)} size={20} />
        <strong>{shown}</strong>
      </span>{after}</>;
    }
  }
  return <span className="act-sentence">{lead}{body}</span>;
}

export function RealActivityPage({ workspaceId }: { workspaceId: string }) {
  const access = useWorkspaceAccess();
  const platform = usePlatform();
  const meId = platform.user?.id ?? null;
  const canView = access.can("activity.view");
  const canSeeMembers = access.can("membership.view");
  const versions = useWorkspacePeople(canView ? workspaceId : null);
  const [category, setCategory] = useState<WorkspaceActivityCategory | null>(null);
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<WorkspaceActivityEntry[] | null>(null);
  const [members, setMembers] = useState<Person[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const request = useRef(0);
  /** Older entries were loaded: a quiet re-read would throw them away, so none happens. */
  const paged = useRef(false);

  const loadFirst = useCallback(async (cat: WorkspaceActivityCategory | null, quiet = false) => {
    const id = ++request.current;
    paged.current = false;
    if (!quiet) setEvents(null);
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
  // LIVE: the newest entries arrive every 30 s, and at once after a change
  // to members, links or the workspace made in this browser — while the
  // first page is all that is shown.
  useLiveRefresh(() => { if (!paged.current) void loadFirst(category, true); },
    { enabled: canView, every: 30_000, topics: ["members", "invitations", "workspace"] });

  // The members, so a sentence's subject can be shown with their face.
  useEffect(() => {
    if (!canView || !canSeeMembers) return;
    let cancelled = false;
    realWorkspaceAdminService.listMembers(workspaceId)
      .then(list => { if (!cancelled) setMembers(list.filter(m => m.userId).map(m => ({ userId: m.userId!, displayName: m.displayName }))); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [canView, canSeeMembers, workspaceId]);

  const people = useMemo(() => new Map(members.map(m => [m.displayName.toLowerCase(), m])), [members]);
  const photo = useCallback((userId: string | null | undefined) => memberAvatarUrl(workspaceId, userId, versions), [workspaceId, versions]);

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
      paged.current = true;
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
  const chips: { value: WorkspaceActivityCategory | null; label: string; icon: LucideIcon }[] = [
    { value: null, label: "All", icon: Settings2 },
    ...ACTIVITY_CATEGORIES.map(c => ({ value: c, label: ACTIVITY_CATEGORY_LABELS[c], icon: CATEGORY_STYLE[c].icon })),
  ];
  const q = query.trim().toLowerCase();
  const shown = events === null ? null : q === "" ? events : events.filter(e =>
    e.summary.toLowerCase().includes(q) || (e.actorName ?? "").toLowerCase().includes(q)
    || (q === "you" && meId !== null && e.actorUserId === meId));

  return (
    <ManagePage crumbs={CRUMBS} title="Activity log" maxWidth={920}>
      <style>{ACTIVITY_CSS}</style>
      <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 16px", lineHeight: 1.6 }}>
        Who did what in this workspace: people joining and leaving, roles and access, join links, teams and settings.
      </p>

      <div className="act-tools">
        <div role="group" aria-label="Filter by kind of change" className="act-chips">
          {chips.map(c => {
            const active = category === c.value;
            const Icon = c.icon;
            return (
              <button key={c.label} type="button" aria-pressed={active} onClick={() => { setCategory(c.value); }}
                className="act-chip" data-active={active ? "true" : "false"}>
                <Icon size={14} aria-hidden /> {c.label}
              </button>
            );
          })}
        </div>
        <label className="act-search">
          <Search size={15} aria-hidden color={SILVER} />
          <span className="act-sr">Search the activity log</span>
          <input type="search" value={query} onChange={e => { setQuery(e.target.value); }}
            placeholder="Search names or changes…" data-testid="activity-search" />
        </label>
      </div>

      {error ? (
        <ErrorBlock message={error} onRetry={() => void loadFirst(category)} />
      ) : shown === null ? (
        <LoadingBlock label="Loading activity…" />
      ) : shown.length === 0 ? (
        <div data-testid="activity-empty" style={{ ...cardStyle, padding: "40px 24px", textAlign: "center" }}>
          <p style={{ ...GF, fontSize: 14, color: SLATE, margin: 0, lineHeight: 1.6 }}>
            {q !== "" ? `Nothing here matches “${query.trim()}”.`
              : category === null ? EMPTY_ACTIVITY_MESSAGE : `Nothing recorded under ${ACTIVITY_CATEGORY_LABELS[category]} yet.`}
          </p>
          {(category !== null || q !== "") && (
            <button type="button" onClick={() => { setCategory(null); setQuery(""); }} style={{ ...buttonStyle("link"), marginTop: 8 }}>Show everything</button>
          )}
        </div>
      ) : (
        <>
          <div data-testid="activity-list" className="act-days">
            {groupByDay(shown).map(group => (
              <section key={group.key} aria-label={dayLabel(group.first, now)} className="act-day">
                <h2 className="act-day-label">{dayLabel(group.first, now)}</h2>
                <ol className="act-timeline">
                  {group.events.map(e => {
                    const tone = CATEGORY_STYLE[e.category] ?? CATEGORY_STYLE.workspace;
                    const Icon = tone.icon;
                    const ago = agoLabel(e.occurredAt, now);
                    return (
                      <li key={e.eventId} data-testid={`activity-${e.eventId}`} className="act-entry">
                        <span className="act-dot" aria-hidden style={{ background: tone.bg, color: tone.color }}><Icon size={15} /></span>
                        <div className="act-card">
                          <div className="act-text">
                            <ActivitySentence entry={e} meId={meId} people={people} photo={photo} />
                          </div>
                          <div className="act-meta">
                            <span className="act-kind" style={{ background: tone.bg, color: tone.color }}>{ACTIVITY_CATEGORY_LABELS[e.category] ?? e.category}</span>
                            <time dateTime={new Date(e.occurredAt).toISOString()}>{timeLabel(e.occurredAt)}</time>
                            {ago && <span aria-hidden>· {ago}</span>}
                          </div>
                        </div>
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
                {loadingMore ? "Loading…" : "Load older entries"}
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

const ACTIVITY_CSS = `
.act-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.act-tools { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 18px; }
.act-chips { display: flex; gap: 6px; flex-wrap: wrap; flex: 1 1 360px; }
.act-chip { display: inline-flex; align-items: center; gap: 6px; font-family: 'Geist', sans-serif; font-size: 13px; font-weight: 600;
  padding: 7px 13px; min-height: 36px; border-radius: 999px; cursor: pointer; border: 1px solid ${BORDER}; background: #FFFFFF; color: ${SLATE}; }
.act-chip[data-active="true"] { background: ${NAVY}; border-color: ${NAVY}; color: #FFFFFF; }
.act-chip:focus-visible { outline: 3px solid rgba(0,120,212,0.4); outline-offset: 2px; }
.act-search { position: relative; display: flex; align-items: center; gap: 8px; flex: 1 1 220px; max-width: 320px;
  border: 1.5px solid #D1D9E0; border-radius: 10px; padding: 0 10px; background: #FFFFFF; min-height: 38px; }
.act-search:focus-within { border-color: #0078D4; }
.act-search input { border: none; outline: none; flex: 1; min-width: 0; font-family: 'Geist', sans-serif; font-size: 13px; color: ${NAVY}; background: transparent; }
.act-days { display: flex; flex-direction: column; gap: 22px; }
.act-day-label { font-family: 'Geist', sans-serif; font-size: 12px; font-weight: 700; color: ${SLATE}; text-transform: uppercase;
  letter-spacing: 0.06em; margin: 0 0 10px; position: sticky; top: 0; background: #F8FAFC; padding: 4px 0; z-index: 1; }
.act-timeline { list-style: none; margin: 0; padding: 0; position: relative; }
.act-timeline::before { content: ""; position: absolute; left: 15px; top: 6px; bottom: 6px; width: 2px; background: #E3E8EF; border-radius: 2px; }
.act-entry { position: relative; display: flex; gap: 12px; padding: 0 0 12px; }
.act-dot { position: relative; z-index: 1; flex: 0 0 32px; width: 32px; height: 32px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center; border: 3px solid #F8FAFC; box-sizing: border-box; }
.act-card { flex: 1; min-width: 0; background: #FFFFFF; border: 1px solid ${BORDER}; border-radius: 12px; padding: 11px 14px;
  box-shadow: 0 1px 2px rgba(7,17,31,0.04); }
.act-text { font-family: 'Geist', sans-serif; font-size: 14px; color: ${NAVY}; line-height: 1.7; overflow-wrap: anywhere; }
.act-who { display: inline-flex; align-items: center; gap: 6px; vertical-align: middle; margin: 0 2px; }
.act-who strong { font-weight: 700; }
.act-who strong[data-you="true"] { color: #0078D4; }
.act-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 6px; font-family: 'Geist Mono', monospace; font-size: 11px; color: ${SILVER}; }
.act-kind { font-family: 'Geist Mono', monospace; font-size: 10px; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
@media (max-width: 640px) {
  .act-search { max-width: none; flex-basis: 100%; }
  .act-chips { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; flex-basis: 100%; padding-bottom: 2px; }
  .act-chips::-webkit-scrollbar { display: none; }
  .act-chip { flex-shrink: 0; }
  .act-timeline::before { left: 13px; }
  .act-dot { flex-basis: 28px; width: 28px; height: 28px; }
  .act-card { padding: 10px 12px; }
  .act-text { font-size: 13.5px; }
}
`;

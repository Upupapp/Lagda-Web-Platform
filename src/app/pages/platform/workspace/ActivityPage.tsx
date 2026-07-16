// /app/workspace/activity — Administrative activity log.
// Shows chronological workspace events with search and filter.
// Frontend-only demonstration. No Burgundy. No eNotary.

import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { WorkspaceAdminProvider, useWorkspaceAdmin } from "../../../context/WorkspaceAdminContext";
import type { WorkspaceActivityEventType } from "../../../models/workspace-admin";
import { WORKSPACE_ACTIVITY_EVENT_LABELS } from "../../../models/workspace-admin";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";

function useDebounce<T>(value: T, ms: number) {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return d;
}

const EVENT_ICON: Record<string, string> = {
  "member-invited":             "✉",
  "member-joined":              "➕",
  "member-role-changed":        "↔",
  "member-suspended":           "⏸",
  "member-reactivated":         "▶",
  "member-deactivated":         "✕",
  "member-removed":             "✕",
  "team-created":               "⊞",
  "team-updated":               "✎",
  "team-archived":              "⊟",
  "team-restored":              "↩",
  "team-member-added":          "➕",
  "team-member-removed":        "−",
  "role-created":               "⊞",
  "role-updated":               "✎",
  "role-archived":              "⊟",
  "role-restored":              "↩",
  "invitation-sent":            "✉",
  "invitation-resent":          "↩",
  "invitation-revoked":         "✕",
  "invitation-accepted":        "✓",
  "invitation-expired":         "⏱",
  "workspace-settings-updated": "⚙",
  "ownership-transferred":      "⇄",
};

const EVENT_COLOR: Record<string, string> = {
  "member-suspended":   "#E65100",
  "member-deactivated": "#991B1B",
  "member-removed":     "#991B1B",
  "invitation-revoked": "#DC2626",
  "invitation-expired": "#6B7280",
  "role-archived":      "#6B7280",
  "team-archived":      "#6B7280",
};

const EVENT_CATEGORIES = [
  { value: "all",         label: "All events" },
  { value: "member-invited",      label: "Invitations" },
  { value: "member-joined",       label: "Member join" },
  { value: "member-suspended",    label: "Suspensions" },
  { value: "member-role-changed", label: "Role changes" },
  { value: "team-created",        label: "Team events" },
  { value: "role-created",        label: "Role events" },
  { value: "workspace-settings-updated", label: "Settings" },
];

function ActivityRow({ event }: { event: { id: string; eventType: string; actorName: string; targetName?: string; metadata?: Record<string, string>; occurredAt: string } }) {
  const icon  = EVENT_ICON[event.eventType] ?? "·";
  const color = EVENT_COLOR[event.eventType] ?? AZURE;
  const label = WORKSPACE_ACTIVITY_EVENT_LABELS[event.eventType as WorkspaceActivityEventType] ?? event.eventType;

  return (
    <tr style={{ borderBottom: "1px solid #F0F2F5" }}>
      <td style={{ padding: "10px 16px", width: 40 }}>
        <span style={{ fontSize: 14, color, userSelect: "none" }}>{icon}</span>
      </td>
      <td style={{ padding: "10px 12px" }}>
        <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY }}>{label}</div>
        <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 2 }}>
          by <strong style={{ color: NAVY }}>{event.actorName}</strong>
          {event.targetName && <> on <strong style={{ color: NAVY }}>{event.targetName}</strong></>}
          {event.metadata && Object.entries(event.metadata).length > 0 && (
            <span style={{ marginLeft: 8, ...GM, fontSize: 11, color: SILVER }}>
              {Object.entries(event.metadata).map(([k, v]) => `${k}: ${v}`).join(", ")}
            </span>
          )}
        </div>
      </td>
      <td style={{ padding: "10px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
        <time dateTime={event.occurredAt} style={{ ...GM, fontSize: 11, color: SILVER }}>
          {new Date(event.occurredAt).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </time>
      </td>
    </tr>
  );
}

function ActivityInner() {
  const { state, asyncLoadActivity } = useWorkspaceAdmin();
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState<string>("all");
  const debouncedSearch = useDebounce(search, 280);

  useEffect(() => {
    asyncLoadActivity({
      search: debouncedSearch || undefined,
      eventType: eventType !== "all" ? (eventType as WorkspaceActivityEventType) : "all",
    });
  }, [asyncLoadActivity, debouncedSearch, eventType]);

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "0 0 48px" }}>
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: "20px 24px" }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 10 }}>
          <ol style={{ display: "flex", gap: 6, listStyle: "none", margin: 0, padding: 0, ...GF, fontSize: 12, color: SILVER }}>
            <li><Link to="/app/workspace" style={{ color: AZURE, textDecoration: "none" }}>Workspace</Link></li>
            <li aria-hidden>›</li>
            <li style={{ color: SLATE }}>Activity</li>
          </ol>
        </nav>
        <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>Administrative Activity</h1>
      </header>

      <div style={{ maxWidth: 900, margin: "24px auto 0", padding: "0 24px" }}>
        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <input type="search" placeholder="Search actor, target, event…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...GF, fontSize: 13, padding: "8px 14px", border: "1.5px solid #D1D9E0", borderRadius: 8, flex: "1 1 220px", minWidth: 160, outline: "none" }}
            aria-label="Search activity" />
          <select value={eventType} onChange={e => setEventType(e.target.value)}
            style={{ ...GF, fontSize: 13, padding: "8px 12px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", cursor: "pointer" }}
            aria-label="Filter by event type">
            {EVENT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, overflow: "hidden" }}>
          {state.activityLoading ? (
            <div aria-busy="true" style={{ padding: "32px", textAlign: "center", ...GF, fontSize: 13, color: SLATE }}>Loading activity…</div>
          ) : state.activity.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <p style={{ ...GF, fontSize: 14, color: SLATE, margin: 0 }}>No activity events found.</p>
              {(search || eventType !== "all") && (
                <button onClick={() => { setSearch(""); setEventType("all"); }}
                  style={{ ...GF, fontSize: 13, fontWeight: 600, color: AZURE, background: "none", border: "none", cursor: "pointer", marginTop: 10 }}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table role="table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ borderBottom: "2px solid #E3E8EF", background: "#F8FAFC" }}>
                  <tr>
                    <th style={{ padding: "10px 16px", width: 40 }} />
                    <th style={{ padding: "10px 12px", ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left" }}>Event</th>
                    <th style={{ padding: "10px 16px", ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {state.activity.map(ev => <ActivityRow key={ev.id} event={ev} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!state.activityLoading && state.activity.length > 0 && (
          <p style={{ ...GM, fontSize: 11, color: SILVER, marginTop: 10, textAlign: "right" }}>
            {state.activity.length} event{state.activity.length !== 1 ? "s" : ""}
          </p>
        )}

        <p style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 16, padding: "10px 16px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8 }}>
          Activity log is session-local. New events appear as you interact with members, teams, roles, and invitations.
        </p>
      </div>
    </div>
  );
}

export function ActivityPage() {
  return (
    <WorkspaceAdminProvider>
      <ActivityInner />
    </WorkspaceAdminProvider>
  );
}

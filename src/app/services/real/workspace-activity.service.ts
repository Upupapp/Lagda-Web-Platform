// Real workspace activity log (079) — talks to Lagda-Backend's
//
//   GET /workspaces/:wid/activity?limit=&before=&category=
//     → 200 { events: WorkspaceActivityEntry[], nextCursor: string | null }
//
// Newest first. `before` is the opaque cursor the previous page returned;
// `category` narrows to one of the five groups. Visible to owners,
// administrators and auditors (`activity.view`); everyone else gets the
// backend's hidden 404, so callers gate on the capability before asking.
//
// `summary` is a finished plain-English sentence written by the backend when
// the log is read. The page renders it as-is and never rebuilds it from
// `action` — rewording belongs to the backend, which keeps history consistent.

import { apiRequest } from "../api-client";

export const ACTIVITY_CATEGORIES = ["people", "access", "links", "teams", "workspace"] as const;
export type WorkspaceActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const ACTIVITY_CATEGORY_LABELS: Record<WorkspaceActivityCategory, string> = {
  people: "People",
  access: "Access",
  links: "Join links",
  teams: "Teams",
  workspace: "Workspace",
};

export interface WorkspaceActivityEntry {
  eventId: string;
  /** Epoch milliseconds. */
  occurredAt: number;
  category: WorkspaceActivityCategory;
  /** e.g. "member.role_changed", "join_request.approved". */
  action: string;
  actorName: string | null;
  summary: string;
  subjectLabel: string | null;
}

export interface WorkspaceActivityPage {
  events: WorkspaceActivityEntry[];
  nextCursor: string | null;
}

export interface WorkspaceActivityQueryInput {
  limit?: number;
  before?: string | null;
  category?: WorkspaceActivityCategory | null;
}

export const ACTIVITY_PAGE_SIZE = 50;

export async function listWorkspaceActivity(
  workspaceId: string, query: WorkspaceActivityQueryInput = {},
): Promise<WorkspaceActivityPage> {
  const params = new URLSearchParams();
  params.set("limit", String(query.limit ?? ACTIVITY_PAGE_SIZE));
  if (query.before) params.set("before", query.before);
  if (query.category) params.set("category", query.category);
  const result = await apiRequest<Partial<WorkspaceActivityPage>>(
    `/workspaces/${encodeURIComponent(workspaceId)}/activity?${params.toString()}`,
  );
  return {
    events: Array.isArray(result.events) ? result.events : [],
    nextCursor: typeof result.nextCursor === "string" && result.nextCursor !== "" ? result.nextCursor : null,
  };
}

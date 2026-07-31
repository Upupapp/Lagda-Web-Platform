// Global Search and Command Palette service — Command 30
// Frontend-only deterministic mock. No network requests. No production index.
// All results are controlled projections from existing domain fixtures.
// Results do not grant access. Every destination revalidates permissions.
// No signatures, evidence, field values, credentials, or document content.
// No eNotary scope, records, commands, or operational workflows.
// Recent queries, recent destinations, and pinned commands are module-level
// in-memory state — reset on sign-out, workspace switch, and page reload.

import type {
  GlobalSearchResult,
  GlobalSearchResultId,
  GlobalSearchResultGroup,
  GlobalSearchResultType,
  GlobalSearchScope,
  GlobalSearchRequest,
  GlobalSearchResponse,
  GlobalSearchMatchField,
  GlobalSearchMatchRange,
  GlobalSearchRecentQuery,
  GlobalSearchRecentQueryId,
  GlobalSearchRecentDestination,
  GlobalSearchRecentDestId,
  GlobalSearchSuggestion,
  GlobalSearchDestination,
  GlobalSearchDestinationResolution,
  CommandPaletteCommand,
  CommandPaletteCommandId,
  CommandPaletteCommandGroup,
} from "../../models/search";
import {
  VALID_SEARCH_SCOPES,
  SEARCH_SCOPE_LABELS,
  SEARCH_SCOPE_ICONS,
  SAFE_RETURN_ROUTE_PREFIXES,
  MAX_RECENT_QUERIES,
  MAX_RECENT_DESTINATIONS,
  MAX_QUERY_LENGTH,
  VALID_SORT_FIELDS,
} from "../../models/search";
import { MOCK_TRANSACTIONS, MOCK_TEMPLATES, MOCK_CONTACTS } from "../../data/mock";
import { SIGNING_WORKFLOW_FIXTURES } from "../../data/mock/signing-workflow";
import { COLLABORATION_THREAD_FIXTURES, COLLAB_WORKSPACE_ID } from "../../data/mock/collaboration";
import { buildPlatformSummaries } from "../preparation-platform-projection";
import { MOCK_CURRENT_WORKSPACE } from "../../data/mock/workspaces";
import { documentOrganizationService } from "./document-organization.service";
import { workflowAutomationService } from "./workflow-automation.service";
import { isCapabilityInActiveProfile } from "../../config/capability-resolver";
import { capabilityId } from "../../models/product-capability";

// Automation is enterprise-preview; check whether it's available in the current profile.
// We use a static context here (no permissions needed for search visibility gating).
// Search visibility is a PROFILE question, not a per-user one. These run at module
// scope, where there is no user, no permissions, and no feature flags — so they use
// isCapabilityInActiveProfile() rather than resolveCapability() with an empty
// context, which returned false for every capability in every profile and silently
// disabled the gates it was meant to control.
//
// Per-user enforcement is preserved: each result and command carries its own
// `requiresPermission`, and route access goes through CapabilityGuard.
function isAutomationSearchEnabled(): boolean {
  return isCapabilityInActiveProfile(capabilityId("workflow-automation"));
}

function isCollaborationSearchEnabled(): boolean {
  return isCapabilityInActiveProfile(capabilityId("document-collaboration"));
}

/** Saved views belong to advanced-document-organization (post-launch). */
function isAdvancedOrganizationEnabled(): boolean {
  return isCapabilityInActiveProfile(capabilityId("advanced-document-organization"));
}

/** Saved report views belong to advanced-reports (post-launch). */
function isAdvancedReportsEnabled(): boolean {
  return isCapabilityInActiveProfile(capabilityId("advanced-reports"));
}

/** The Integrations settings area is post-launch. */
function isIntegrationsEnabled(): boolean {
  return isCapabilityInActiveProfile(capabilityId("integrations"));
}

/** Bulk Send preparation is enterprise-preview, gated the same way. */
function isPreparationSearchEnabled(): boolean {
  return isCapabilityInActiveProfile(capabilityId("bulk-send"));
}

/**
 * The workspace this demonstration session holds. Search providers and the
 * Command Palette registry are evaluated at module scope with no React context,
 * so the value comes from the canonical workspace fixture the session is built
 * from rather than being guessed per provider.
 */
// The workspace fixture list is never empty, so the fallbacks below are not
// reachable — they exist so the fixture's index access stays type-safe.
const SESSION_WORKSPACE_ID = MOCK_CURRENT_WORKSPACE?.id ?? "";
const SESSION_WORKSPACE_NAME = MOCK_CURRENT_WORKSPACE?.name ?? "";

// Bulk Send preparation results (Gap Closure Command 5).
//
// The capability had declared `searchVisibility: true` since C33 but no provider
// was ever registered — a flag is a declaration of intent, not an implementation.
//
// Matches the batch NAME, its status label, and its Template name only. Recipient
// names, email addresses, organizations, pasted text and CSV cell values are never
// indexed and never appear in a result: the provider reads the safe platform
// projection, which does not carry them.
function buildPreparationResults(query: string): GlobalSearchResult[] {
  if (!isPreparationSearchEnabled()) return [];

  const q = query.toLowerCase();
  const matchesTerm =
    q.includes("bulk") || q.includes("preparation") || q.includes("batch") || q.includes("recipient");

  // Workspace scope comes from the projection, which filters on it.
  const items = buildPlatformSummaries(SESSION_WORKSPACE_ID);

  return items
    .filter((i) => matchesTerm || tokenMatch(query, i.title) || tokenMatch(query, i.statusLabel))
    .slice(0, 5)
    .map((i): GlobalSearchResult => ({
      id:               `sr_prep_${i.batchId}` as GlobalSearchResultId,
      type:             "navigation-command" as GlobalSearchResultType,
      title:            `Bulk Send — ${i.title}`,
      description:      `${i.statusLabel} · ${i.includedRows} ${i.includedRows === 1 ? "recipient row" : "recipient rows"}`,
      workspaceContext: SESSION_WORKSPACE_NAME,
      matchedFields:    buildMatchFields(query, [
        { field: "title", label: "Title", text: i.title },
      ]),
      matchScore:       computeScore(query, i.title) - 4,
      destination:      { type: "platform-route", path: i.route, requiresPermission: "view_documents" },
      availability:     "available",
      demonstrationOnly: true,
    }));
}

// ── Module-level in-memory state ──────────────────────────────────────────────
// Reset on sign-out, workspace switch, or explicit reset call.
// NEVER persisted to localStorage, sessionStorage, or any store.

let _recentQueries:    GlobalSearchRecentQuery[]      = [];
let _recentDests:      GlobalSearchRecentDestination[] = [];
let _pinnedCommandIds: string[]                       = [];
let _queryCounter      = 0;
let _destCounter       = 0;

// ── Deterministic matching ────────────────────────────────────────────────────

function tokenMatch(query: string, text: string | undefined): boolean {
  if (!text || !query) return false;
  return text.toLowerCase().includes(query.toLowerCase().trim());
}

function computeMatchRanges(query: string, text: string): GlobalSearchMatchRange[] {
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  const ranges: GlobalSearchMatchRange[] = [];
  let idx = 0;
  while (idx < t.length) {
    const pos = t.indexOf(q, idx);
    if (pos === -1) break;
    ranges.push({ start: pos, end: pos + q.length });
    idx = pos + q.length;
  }
  return ranges;
}

function buildMatchFields(
  query: string,
  fields: Array<{ field: GlobalSearchMatchField["field"]; label: string; text: string }>
): GlobalSearchMatchField[] {
  return fields
    .map((f) => ({
      field: f.field,
      label: f.label,
      text:  f.text,
      ranges: computeMatchRanges(query, f.text),
    }))
    .filter((f) => f.ranges.length > 0);
}

function computeScore(query: string, title: string, description?: string): number {
  const q = query.toLowerCase().trim();
  const t = title.toLowerCase();
  if (t === q) return 95;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  const words = q.split(/\s+/);
  if (words.length > 1 && words.every((w) => t.includes(w))) return 55;
  if (description && description.toLowerCase().includes(q)) return 30;
  return 10;
}

function validateScope(raw: unknown): GlobalSearchScope {
  if (typeof raw === "string" && VALID_SEARCH_SCOPES.includes(raw as GlobalSearchScope)) {
    return raw as GlobalSearchScope;
  }
  return "all";
}

function validateSortField(raw: unknown): GlobalSearchRequest["sort"] {
  if (typeof raw === "string" && VALID_SORT_FIELDS.includes(raw as GlobalSearchRequest["sort"])) {
    return raw as GlobalSearchRequest["sort"];
  }
  return "relevance";
}

function sanitizeQuery(raw: string): string {
  return raw.trim().slice(0, MAX_QUERY_LENGTH);
}

// ── Domain projections ────────────────────────────────────────────────────────

function buildDocumentResults(query: string): GlobalSearchResult[] {
  return MOCK_TRANSACTIONS
    .filter((t) => tokenMatch(query, t.title) || tokenMatch(query, t.status))
    .slice(0, 8)
    .map((t): GlobalSearchResult => ({
      id:               `sr_doc_${t.id}` as GlobalSearchResultId,
      type:             (t.status === "draft" ? "document-draft" : "document") as GlobalSearchResultType,
      title:            t.title,
      description:      t.status.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      workspaceContext: "Northbridge Legal",
      status:           t.status,
      statusLabel:      t.status.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      updatedAt:        t.updatedAt,
      matchedFields:    buildMatchFields(query, [
        { field: "title",  label: "Title",  text: t.title },
        { field: "status", label: "Status", text: t.status.replace(/-/g, " ") },
      ]),
      matchScore:       computeScore(query, t.title),
      destination:      { type: "platform-route", path: `/app/documents/${t.id}`, requiresPermission: "view_documents" },
      availability:     t.status === "archived" ? "archived" : t.status === "expired" ? "unavailable" : "available",
      demonstrationOnly: true,
    }));
}

// Signing Workflow destinations (Command 37).
// Safe destinations only: the document's Workflow tab. Deliberately NOT indexed:
// participant emails or names, signature requirements, field values, authentication
// data, consent evidence, inaccessible document titles, or Workflow Automation records.
const SIGNING_WORKFLOW_DOCUMENT_IDS: ReadonlySet<string> = new Set(
  SIGNING_WORKFLOW_FIXTURES.map(w => w.documentId),
);

function buildSigningWorkflowResults(query: string): GlobalSearchResult[] {
  const q = query.toLowerCase();
  const matchesWorkflowTerm =
    q.includes("workflow") || q.includes("signing") || q.includes("stage") || q.includes("routing");

  return MOCK_TRANSACTIONS
    .filter((t) => t.status !== "archived")
    .filter((t) => matchesWorkflowTerm || tokenMatch(query, t.title))
    .filter((t) => SIGNING_WORKFLOW_DOCUMENT_IDS.has(t.id))
    .slice(0, 5)
    .map((t): GlobalSearchResult => ({
      id:               `sr_wf_${t.id}` as GlobalSearchResultId,
      type:             "navigation-command" as GlobalSearchResultType,
      title:            `Signing Workflow — ${t.title}`,
      description:      "Stages, people, and required actions for this document",
      workspaceContext: "Northbridge Legal",
      matchedFields:    buildMatchFields(query, [
        { field: "title", label: "Title", text: t.title },
      ]),
      matchScore:       computeScore(query, t.title) - 5,
      destination:      { type: "platform-route", path: `/app/documents/${t.id}/workflow`, requiresPermission: "view_documents" },
      availability:     "available",
      demonstrationOnly: true,
    }));
}

// Collaboration (C34).
//
// Search matches thread TITLES only. Comment bodies, Personal Draft Notes, mention
// text, resolution summaries, and restricted-thread titles are never searched and
// never surfaced — a search result must not become a way to read something the
// viewer could not open directly.
//
// Only `internal-workspace` threads are searchable here: team-scoped and
// owner-and-reviewers threads depend on a per-viewer check that this module has no
// context to perform, so they are excluded rather than guessed at.
function buildCollaborationResults(query: string): GlobalSearchResult[] {
  const q = query.toLowerCase();
  const matchesTerm =
    q.includes("comment") || q.includes("discussion") || q.includes("thread") ||
    q.includes("collaboration") || q.includes("review") || q.includes("mention");

  const searchable = COLLABORATION_THREAD_FIXTURES.filter(
    (t) => t.workspaceId === COLLAB_WORKSPACE_ID &&
           t.visibility === "internal-workspace" &&
           t.status !== "archived",
  );

  const threads = searchable
    .filter((t) => matchesTerm || tokenMatch(query, t.title))
    .slice(0, 5)
    .map((t): GlobalSearchResult => ({
      id:               `sr_collab_${t.id}` as GlobalSearchResultId,
      type:             "navigation-command" as GlobalSearchResultType,
      title:            `Discussion — ${t.title}`,
      description:      "Internal discussion. Opening it does not grant access to anything new.",
      workspaceContext: "Northbridge Legal",
      matchedFields:    buildMatchFields(query, [
        { field: "title", label: "Title", text: t.title },
      ]),
      matchScore:       computeScore(query, t.title) - 6,
      destination:      {
        type: "platform-route",
        path: `/app/documents/${t.documentId}/collaboration/${t.id}`,
        requiresPermission: "view_documents",
      },
      availability:     "available",
      demonstrationOnly: true,
    }));

  if (!matchesTerm) return threads;

  return [
    {
      id:               "sr_collab_center" as GlobalSearchResultId,
      type:             "navigation-command" as GlobalSearchResultType,
      title:            "Collaboration Center",
      description:      "Internal review work across documents you already have access to",
      workspaceContext: "Northbridge Legal",
      matchedFields:    [],
      matchScore:       58,
      destination:      { type: "platform-route", path: "/app/collaboration", requiresPermission: "view_documents" },
      availability:     "available",
      demonstrationOnly: true,
    },
    {
      id:               "sr_collab_mentions" as GlobalSearchResultId,
      type:             "navigation-command" as GlobalSearchResultType,
      title:            "My Mentions",
      description:      "Comments where someone mentioned you. A mention never grants access.",
      workspaceContext: "Northbridge Legal",
      matchedFields:    [],
      matchScore:       55,
      destination:      { type: "platform-route", path: "/app/collaboration/mentions", requiresPermission: "view_documents" },
      availability:     "available",
      demonstrationOnly: true,
    },
    ...threads,
  ];
}

// My Actions — own assignments only (never another user's inbox)
const MY_ACTION_FIXTURES = [
  { id: "ia_001", title: "Retainer Agreement — Mabini Business Services", role: "Signer", status: "pending",    path: "/app/inbox/req_001" },
  { id: "ia_002", title: "Deed of Sale — Lot 7 Block 3",                   role: "Approver", status: "pending", path: "/app/inbox/req_002" },
  { id: "ia_003", title: "Faculty Employment Contract — Sampaguita",        role: "Acknowledgment", status: "pending", path: "/app/inbox/req_003" },
  { id: "ia_004", title: "NDA — Harborline Properties",                     role: "Signer", status: "completed", path: "/app/inbox/req_004" },
];

function buildMyActionsResults(query: string): GlobalSearchResult[] {
  return MY_ACTION_FIXTURES
    .filter((a) => tokenMatch(query, a.title) || tokenMatch(query, a.role) || tokenMatch(query, a.status))
    .slice(0, 5)
    .map((a): GlobalSearchResult => ({
      id:               `sr_action_${a.id}` as GlobalSearchResultId,
      type:             "recipient-assignment",
      title:            a.title,
      description:      `${a.role} required`,
      workspaceContext: "Northbridge Legal",
      status:           a.status,
      statusLabel:      a.status === "pending" ? "Pending your action" : "Completed",
      matchedFields:    buildMatchFields(query, [
        { field: "title",  label: "Title",  text: a.title },
        { field: "status", label: "Role",   text: a.role },
      ]),
      matchScore:       computeScore(query, a.title, a.role),
      destination:      { type: "platform-route", path: a.path },
      availability:     a.status === "completed" ? "available" : "available",
      demonstrationOnly: true,
    }));
}

function buildTemplateResults(query: string): GlobalSearchResult[] {
  return MOCK_TEMPLATES
    .filter((t) => tokenMatch(query, t.name) || tokenMatch(query, t.description))
    .slice(0, 6)
    .map((t): GlobalSearchResult => ({
      id:               `sr_tmpl_${t.id}` as GlobalSearchResultId,
      type:             "template",
      title:            t.name,
      description:      t.description,
      workspaceContext: "Northbridge Legal",
      updatedAt:        t.updatedAt,
      matchedFields:    buildMatchFields(query, [
        { field: "title",       label: "Template name", text: t.name },
        { field: "description", label: "Description",   text: t.description ?? "" },
      ]),
      matchScore:       computeScore(query, t.name, t.description),
      destination:      { type: "platform-route", path: `/app/templates/${t.id}`, requiresPermission: "manage_templates" },
      availability:     "available",
      demonstrationOnly: true,
    }));
}

function buildContactResults(query: string): GlobalSearchResult[] {
  return MOCK_CONTACTS
    .filter((c) =>
      tokenMatch(query, c.name) ||
      tokenMatch(query, c.organization) ||
      tokenMatch(query, c.email)  // email shown only as subtitle, not in URL or metadata
    )
    .slice(0, 6)
    .map((c): GlobalSearchResult => ({
      id:               `sr_con_${c.id}` as GlobalSearchResultId,
      type:             "contact",
      title:            c.name,
      description:      c.organization ?? "Contact",
      workspaceContext: "Northbridge Legal",
      updatedAt:        c.lastUsedAt,
      matchedFields:    buildMatchFields(query, [
        { field: "title",       label: "Name",         text: c.name },
        { field: "description", label: "Organization", text: c.organization ?? "" },
      ]),
      matchScore:       computeScore(query, c.name, c.organization),
      destination:      { type: "platform-route", path: `/app/contacts/${c.id}`, requiresPermission: "manage_contacts" },
      availability:     "available",
      demonstrationOnly: true,
    }));
}

// Contact groups
const CONTACT_GROUP_FIXTURES = [
  { id: "cg_001", name: "Harborline Properties Team",     count: 3 },
  { id: "cg_002", name: "Mabini Business Services",        count: 2 },
  { id: "cg_003", name: "Sampaguita Learning Institute",   count: 1 },
  { id: "cg_004", name: "Procurement Partners",            count: 4 },
];

function buildContactGroupResults(query: string): GlobalSearchResult[] {
  return CONTACT_GROUP_FIXTURES
    .filter((g) => tokenMatch(query, g.name))
    .slice(0, 3)
    .map((g): GlobalSearchResult => ({
      id:               `sr_cg_${g.id}` as GlobalSearchResultId,
      type:             "contact-group",
      title:            g.name,
      description:      `${g.count} member${g.count !== 1 ? "s" : ""}`,
      workspaceContext: "Northbridge Legal",
      matchedFields:    buildMatchFields(query, [{ field: "title", label: "Group name", text: g.name }]),
      matchScore:       computeScore(query, g.name),
      destination:      { type: "platform-route", path: `/app/contacts/groups/${g.id}`, requiresPermission: "manage_contacts" },
      availability:     "available",
      demonstrationOnly: true,
    }));
}

// Workspace members — aggregate display only, no private data
const MEMBER_FIXTURES = [
  { id: "mem_001", name: "Ana Reyes",          role: "Owner",         team: "Legal Operations" },
  { id: "mem_002", name: "Benito Santos",      role: "Sender",        team: "Procurement" },
  { id: "mem_003", name: "Celia Fernandez",    role: "Reviewer",      team: "Legal Operations" },
  { id: "mem_004", name: "Diego Villanueva",   role: "Sender",        team: "Human Resources" },
  { id: "mem_005", name: "Elena Castillo",     role: "Template Administrator", team: "Legal Operations" },
  { id: "mem_006", name: "Fernando Aquino",    role: "Auditor",       team: "Compliance" },
];

function buildMemberResults(query: string): GlobalSearchResult[] {
  return MEMBER_FIXTURES
    .filter((m) => tokenMatch(query, m.name) || tokenMatch(query, m.role) || tokenMatch(query, m.team))
    .slice(0, 5)
    .map((m): GlobalSearchResult => ({
      id:               `sr_mem_${m.id}` as GlobalSearchResultId,
      type:             "workspace-member",
      title:            m.name,
      description:      m.role,
      workspaceContext: "Northbridge Legal",
      teamContext:      m.team,
      matchedFields:    buildMatchFields(query, [
        { field: "title",       label: "Name", text: m.name },
        { field: "description", label: "Role", text: m.role },
        { field: "team",        label: "Team", text: m.team },
      ]),
      matchScore:       computeScore(query, m.name, m.role),
      destination:      { type: "platform-route", path: `/app/workspace/members/${m.id}`, requiresPermission: "manage_team" },
      availability:     "available",
      demonstrationOnly: true,
    }));
}

const TEAM_FIXTURES = [
  { id: "team_001", name: "Legal Operations",  memberCount: 3 },
  { id: "team_002", name: "Procurement",        memberCount: 2 },
  { id: "team_003", name: "Human Resources",    memberCount: 2 },
  { id: "team_004", name: "Compliance",         memberCount: 1 },
];

function buildTeamResults(query: string): GlobalSearchResult[] {
  return TEAM_FIXTURES
    .filter((t) => tokenMatch(query, t.name))
    .slice(0, 4)
    .map((t): GlobalSearchResult => ({
      id:               `sr_team_${t.id}` as GlobalSearchResultId,
      type:             "team",
      title:            t.name,
      description:      `${t.memberCount} member${t.memberCount !== 1 ? "s" : ""}`,
      workspaceContext: "Northbridge Legal",
      matchedFields:    buildMatchFields(query, [{ field: "title", label: "Team name", text: t.name }]),
      matchScore:       computeScore(query, t.name),
      destination:      { type: "platform-route", path: `/app/workspace/teams/${t.id}`, requiresPermission: "manage_team" },
      availability:     "available",
      demonstrationOnly: true,
    }));
}

const ROLE_FIXTURES = [
  { id: "role_001", name: "Owner",                  description: "Full workspace control" },
  { id: "role_002", name: "Administrator",           description: "Workspace management, documents, templates" },
  { id: "role_003", name: "Sender",                  description: "Prepare and send documents" },
  { id: "role_004", name: "Reviewer",                description: "Review and verify documents" },
  { id: "role_005", name: "Template Administrator",  description: "Manage templates and contacts" },
  { id: "role_006", name: "Auditor",                 description: "View audit trail and reports" },
];

function buildRoleResults(query: string): GlobalSearchResult[] {
  return ROLE_FIXTURES
    .filter((r) => tokenMatch(query, r.name) || tokenMatch(query, r.description))
    .slice(0, 4)
    .map((r): GlobalSearchResult => ({
      id:               `sr_role_${r.id}` as GlobalSearchResultId,
      type:             "role",
      title:            r.name,
      description:      r.description,
      workspaceContext: "Northbridge Legal",
      matchedFields:    buildMatchFields(query, [
        { field: "title",       label: "Role name",   text: r.name },
        { field: "description", label: "Description", text: r.description },
      ]),
      matchScore:       computeScore(query, r.name, r.description),
      destination:      { type: "platform-route", path: `/app/workspace/roles/${r.id}`, requiresPermission: "manage_team" },
      availability:     "available",
      demonstrationOnly: true,
    }));
}

// Verification records — identifier direction only, no evidence
const VERIFICATION_FIXTURES = [
  { id: "vrf_001", refId: "VRF-2026-NBL-001", docTitle: "Retainer Agreement — Mabini Business Services", status: "verified" },
  { id: "vrf_002", refId: "VRF-2026-NBL-002", docTitle: "NDA — Harborline Properties × Northbridge Legal", status: "verified" },
  { id: "vrf_003", refId: "VRF-2026-NBL-003", docTitle: "Deed of Sale — Lot 7 Block 3", status: "verified" },
  { id: "vrf_005", refId: "VRF-2026-NBL-005", docTitle: "Legal Services Agreement — Mabini Business Services", status: "pending" },
  { id: "vrf_006", refId: "VRF-2026-NBL-006", docTitle: "Supplier Agreement — Harborline Properties", status: "expired" },
];

function buildVerificationResults(query: string): GlobalSearchResult[] {
  return VERIFICATION_FIXTURES
    .filter((v) => tokenMatch(query, v.refId) || tokenMatch(query, v.docTitle) || tokenMatch(query, v.status))
    .slice(0, 4)
    .map((v): GlobalSearchResult => ({
      id:               `sr_vrf_${v.id}` as GlobalSearchResultId,
      type:             "verification-record",
      title:            v.refId,
      description:      v.docTitle,
      status:           v.status,
      statusLabel:      v.status.replace(/\b\w/g, (c) => c.toUpperCase()),
      workspaceContext: "Northbridge Legal",
      matchedFields:    buildMatchFields(query, [
        { field: "title",       label: "Verification ID", text: v.refId },
        { field: "description", label: "Document",        text: v.docTitle },
      ]),
      matchScore:       computeScore(query, v.refId, v.docTitle),
      destination:      { type: "platform-route", path: `/app/verify`, requiresPermission: "verify_documents" },
      availability:     v.status === "expired" ? "unavailable" : "available",
      demonstrationOnly: true,
    }));
}

// Notifications — current user only, no personal secrets
const NOTIFICATION_FIXTURES = [
  { id: "notif_001", title: "Maria Reyes signed the document",       category: "document-action",  summary: "Retainer Agreement has been signed" },
  { id: "notif_002", title: "Document completed",                     category: "document-action",  summary: "NDA has been fully signed" },
  { id: "notif_003", title: "Document expiring soon",                 category: "reminder",         summary: "Legal Services Agreement expires in 12 days" },
  { id: "notif_004", title: "Document expired",                       category: "reminder",         summary: "Supplier Agreement expired without completion" },
  { id: "notif_005", title: "New workspace member joined",            category: "workspace-update", summary: "A new member joined Northbridge Legal" },
  { id: "notif_006", title: "Template usage milestone",               category: "workspace-update", summary: "NDA template used 30 times" },
];

function buildNotificationResults(query: string): GlobalSearchResult[] {
  return NOTIFICATION_FIXTURES
    .filter((n) => tokenMatch(query, n.title) || tokenMatch(query, n.category) || tokenMatch(query, n.summary))
    .slice(0, 4)
    .map((n): GlobalSearchResult => ({
      id:               `sr_notif_${n.id}` as GlobalSearchResultId,
      type:             "notification",
      title:            n.title,
      description:      n.summary,
      matchedFields:    buildMatchFields(query, [
        { field: "title",       label: "Notification", text: n.title },
        { field: "description", label: "Summary",      text: n.summary },
      ]),
      matchScore:       computeScore(query, n.title, n.summary),
      destination:      { type: "platform-route", path: `/app/notifications/${n.id}` },
      availability:     "available",
      demonstrationOnly: true,
    }));
}

// Reports — family definitions + saved views
const REPORT_DEFINITION_FIXTURES = [
  { id: "rep_documents",    label: "Document Operations",        path: "/app/reports/documents",    family: "documents",     desc: "Volume, status, completion, and delivery metrics" },
  { id: "rep_participants", label: "Participants & Routing",     path: "/app/reports/participants", family: "participants",  desc: "Role distribution, routing stages, auth methods" },
  { id: "rep_templates",    label: "Template Adoption",          path: "/app/reports/templates",    family: "templates",     desc: "Usage trends, status distribution" },
  { id: "rep_verification", label: "Verification",               path: "/app/reports/verification", family: "verification",  desc: "Verification outcomes and coverage direction" },
  { id: "rep_teams",        label: "Workspace & Team Activity",  path: "/app/reports/teams",        family: "teams",         desc: "Workspace summary, team comparison, sender direction" },
];

const SAVED_VIEW_FIXTURES = [
  { id: "sv_001", label: "Monthly Document Summary",    family: "documents",    path: "/app/reports/sv_001" },
  { id: "sv_002", label: "Q3 Template Performance",     family: "templates",    path: "/app/reports/sv_002" },
  { id: "sv_003", label: "Participant Routing — Q2",    family: "participants", path: "/app/reports/sv_003" },
];

function buildReportResults(query: string): GlobalSearchResult[] {
  const defs: GlobalSearchResult[] = REPORT_DEFINITION_FIXTURES
    .filter((r) => tokenMatch(query, r.label) || tokenMatch(query, r.desc) || tokenMatch(query, r.family))
    .slice(0, 4)
    .map((r): GlobalSearchResult => ({
      id:               `sr_repdef_${r.id}` as GlobalSearchResultId,
      type:             "report-definition",
      title:            r.label,
      description:      r.desc,
      matchedFields:    buildMatchFields(query, [
        { field: "title",       label: "Report",      text: r.label },
        { field: "description", label: "Description", text: r.desc },
      ]),
      matchScore:       computeScore(query, r.label, r.desc),
      destination:      { type: "platform-route", path: r.path, requiresPermission: "view_reports" },
      availability:     "available",
      demonstrationOnly: true,
    }));

  const views: GlobalSearchResult[] = SAVED_VIEW_FIXTURES
    .filter((v) => tokenMatch(query, v.label) || tokenMatch(query, v.family))
    .slice(0, 3)
    .map((v): GlobalSearchResult => ({
      id:               `sr_sv_${v.id}` as GlobalSearchResultId,
      type:             "saved-report-view",
      title:            v.label,
      description:      `Saved view — ${v.family.replace(/\b\w/g, (c) => c.toUpperCase())} report`,
      matchedFields:    buildMatchFields(query, [{ field: "title", label: "Saved view", text: v.label }]),
      matchScore:       computeScore(query, v.label),
      destination:      { type: "platform-route", path: v.path, requiresPermission: "view_reports" },
      availability:     "available",
      demonstrationOnly: true,
    }));

  return [...defs, ...views];
}

// Settings routes — metadata only, no form values
const SETTINGS_ROUTE_FIXTURES = [
  { id: "st_profile",       label: "Profile",                 path: "/app/settings/profile",         desc: "Name, email, and display preferences" },
  { id: "st_prefs",         label: "Preferences",              path: "/app/settings/preferences",     desc: "Language, timezone, and display settings" },
  { id: "st_security",      label: "Security",                 path: "/app/settings/security",        desc: "Password, MFA, and active sessions", perm: "manage_security" },
  { id: "st_password",      label: "Password",                 path: "/app/settings/security/password", desc: "Change your account password", perm: "manage_security" },
  { id: "st_mfa",           label: "Two-Factor Authentication",path: "/app/settings/security/mfa",    desc: "Set up authenticator app", perm: "manage_security" },
  { id: "st_sessions",      label: "Active Sessions",          path: "/app/settings/security/sessions", desc: "Manage active login sessions", perm: "manage_security" },
  { id: "st_notifprefs",    label: "Notification Preferences", path: "/app/settings/notifications",   desc: "Email and in-app notification settings" },
  { id: "st_signatures",    label: "Signatures & Initials",    path: "/app/settings/signatures",      desc: "Manage your personal signature library" },
  { id: "st_branding",      label: "Branding",                 path: "/app/settings/branding",        desc: "Workspace logo and display name", perm: "manage_branding" },
  { id: "st_billing",       label: "Billing",                  path: "/app/settings/billing",         desc: "Subscription and payment details", perm: "view_billing" },
  { id: "st_usage",         label: "Usage",                    path: "/app/settings/usage",           desc: "Signing requests, storage, and plan limits", perm: "view_usage" },
  // Integrations is post-launch and its route is capability-guarded, so it is
  // filtered out below rather than listed unconditionally here.
  { id: "st_integrations",  label: "Integrations",             path: "/app/settings/integrations",    desc: "Connected apps and services", perm: "manage_integrations", capability: "integrations" },
  { id: "st_dataprivacy",   label: "Data & Privacy",           path: "/app/settings/data-and-privacy", desc: "Export account data and privacy controls" },
].filter((s) => !("capability" in s) || isCapabilityInActiveProfile(s.capability as string));

function buildSettingsResults(query: string): GlobalSearchResult[] {
  return SETTINGS_ROUTE_FIXTURES
    .filter((s) => tokenMatch(query, s.label) || tokenMatch(query, s.desc))
    .slice(0, 6)
    .map((s): GlobalSearchResult => ({
      id:               `sr_st_${s.id}` as GlobalSearchResultId,
      type:             "settings-route",
      title:            s.label,
      description:      s.desc,
      matchedFields:    buildMatchFields(query, [
        { field: "title",       label: "Setting",     text: s.label },
        { field: "description", label: "Description", text: s.desc },
      ]),
      matchScore:       computeScore(query, s.label, s.desc),
      destination:      { type: "platform-route", path: s.path, requiresPermission: s.perm },
      availability:     "available",
      demonstrationOnly: true,
    }));
}

// Help and resource fixtures — public/approved routes only
const HELP_FIXTURES = [
  { id: "h_faq",          label: "Frequently Asked Questions",      path: "/resources/faq",               desc: "Answers to common questions" },
  { id: "h_guides",       label: "Guides",                           path: "/resources/guides",             desc: "Step-by-step product guides" },
  { id: "h_legal",        label: "Legal Framework",                  path: "/resources/legal-framework",    desc: "Philippine laws governing eSignature" },
  { id: "h_docverify",    label: "Document Verification Guide",      path: "/resources/document-verification-guide", desc: "How to verify LAGDA documents" },
  { id: "h_authguide",    label: "Authentication Guide",             path: "/resources/authentication-guide", desc: "Signer authentication methods" },
  { id: "h_templates",    label: "Templates Guide",                  path: "/resources/templates-guide",   desc: "How to create and use templates" },
  { id: "h_security",     label: "Security Guide",                   path: "/resources/security-guide",    desc: "Security and privacy practices" },
  { id: "h_help",         label: "Help Center",                      path: "/help",                         desc: "All help articles and support" },
  { id: "h_contact",      label: "Contact Support",                  path: "/contact",                      desc: "Get in touch with the LAGDA team" },
  { id: "h_privacy",      label: "Privacy Policy",                   path: "/legal/privacy",                desc: "How LAGDA handles your data" },
  { id: "h_terms",        label: "Terms of Service",                 path: "/legal/terms",                  desc: "Terms and conditions" },
  { id: "h_a11y",         label: "Accessibility Statement",          path: "/legal/accessibility",          desc: "Accessibility commitment and status" },
  { id: "h_enotary",      label: "LAGDA eNotary",                    path: "/enotary",                      desc: "Coming Soon — Subject to Supreme Court Accreditation and applicable rules." },
];

function buildHelpResults(query: string): GlobalSearchResult[] {
  return HELP_FIXTURES
    .filter((h) => tokenMatch(query, h.label) || tokenMatch(query, h.desc))
    .slice(0, 5)
    .map((h): GlobalSearchResult => ({
      id:               `sr_help_${h.id}` as GlobalSearchResultId,
      type:             "help-resource",
      title:            h.label,
      description:      h.desc,
      matchedFields:    buildMatchFields(query, [
        { field: "title",       label: "Resource",    text: h.label },
        { field: "description", label: "Description", text: h.desc },
      ]),
      matchScore:       computeScore(query, h.label, h.desc),
      destination:      { type: "internal-route", path: h.path },
      availability:     "available",
      demonstrationOnly: true,
    }));
}

// Document organization — folders, tags, saved views
function buildFolderResults(query: string): GlobalSearchResult[] {
  const result = documentOrganizationService.listFolders({});
  if (!result.ok) return [];
  return result.data
    .filter((f) => f.status === "active" && (tokenMatch(query, f.name) || tokenMatch(query, f.scope)))
    .slice(0, 4)
    .map((f): GlobalSearchResult => ({
      id:               `sr_folder_${f.id}` as GlobalSearchResultId,
      type:             "document" as GlobalSearchResultType,
      title:            f.name,
      description:      f.scope === "workspace" ? "Workspace folder" : "Personal folder",
      workspaceContext: "Northbridge Legal",
      matchedFields:    buildMatchFields(query, [{ field: "title", label: "Folder", text: f.name }]),
      matchScore:       computeScore(query, f.name),
      destination:      { type: "platform-route", path: `/app/documents/folders/${f.id}`, requiresPermission: "view_documents" },
      availability:     "available",
      demonstrationOnly: true,
    }));
}

function buildOrgTagResults(query: string): GlobalSearchResult[] {
  const result = documentOrganizationService.listTags({});
  if (!result.ok) return [];
  return result.data
    .filter((t) => t.status === "active" && tokenMatch(query, t.name))
    .slice(0, 4)
    .map((t): GlobalSearchResult => ({
      id:               `sr_orgtag_${t.id}` as GlobalSearchResultId,
      type:             "document" as GlobalSearchResultType,
      title:            t.name,
      description:      "Document tag",
      workspaceContext: "Northbridge Legal",
      matchedFields:    buildMatchFields(query, [{ field: "title", label: "Tag", text: t.name }]),
      matchScore:       computeScore(query, t.name),
      destination:      { type: "platform-route", path: `/app/documents/tags`, requiresPermission: "view_documents" },
      availability:     "available",
      demonstrationOnly: true,
    }));
}

function buildOrgSavedViewResults(query: string): GlobalSearchResult[] {
  const result = documentOrganizationService.listSavedViews();
  if (!result.ok) return [];
  // A saved view has no description in the domain model (see OrgSavedView), so it is
  // matched and scored on its name only. Previously this read `v.description`, which
  // is always undefined — saved views were therefore never searchable by description
  // and every result scored as a name-only match anyway.
  return result.data
    .filter((v) => v.status !== "archived" && tokenMatch(query, v.name))
    .slice(0, 4)
    .map((v): GlobalSearchResult => ({
      id:               `sr_orgview_${v.id}` as GlobalSearchResultId,
      type:             "document" as GlobalSearchResultType,
      title:            v.name,
      description:      v.isDefault ? "Saved document view · Default" : "Saved document view",
      workspaceContext: "Northbridge Legal",
      matchedFields:    buildMatchFields(query, [
        { field: "title", label: "Saved view", text: v.name },
      ]),
      matchScore:       computeScore(query, v.name),
      destination:      { type: "platform-route", path: `/app/documents/saved-views/${v.id}`, requiresPermission: "view_documents" },
      availability:     "available",
      demonstrationOnly: true,
    }));
}

// ── Sort results ──────────────────────────────────────────────────────────────

function sortResults(results: GlobalSearchResult[], sort: string, dir: string): GlobalSearchResult[] {
  return [...results].sort((a, b) => {
    let cmp = 0;
    if (sort === "relevance")  cmp = b.matchScore - a.matchScore;
    else if (sort === "title") cmp = a.title.localeCompare(b.title);
    else if (sort === "status") cmp = (a.statusLabel ?? "").localeCompare(b.statusLabel ?? "");
    else if (sort === "updated-at") {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      cmp = tb - ta;
    }
    // stable tie-break by id
    if (cmp === 0) cmp = a.id.localeCompare(b.id);
    return dir === "asc" ? -cmp : cmp;
  });
}

// ── Automation scope builder ──────────────────────────────────────────────────

function buildAutomationResults(query: string): GlobalSearchResult[] {
  const results: GlobalSearchResult[] = [];

  const rulesRes = workflowAutomationService.listRules({ query });
  if (rulesRes.ok) {
    for (const rule of rulesRes.data.slice(0, 6)) {
      if (!tokenMatch(query, rule.name)) continue;
      results.push({
        id: `sr_auto_rule_${rule.id}` as GlobalSearchResultId,
        type: "navigation-command" as GlobalSearchResultType,
        title: rule.name,
        description: `Rule · ${rule.status}`,
        workspaceContext: "Northbridge Legal",
        matchedFields: buildMatchFields(query, [
          { field: "title", label: "Rule", text: rule.name },
        ]),
        matchScore: computeScore(query, rule.name),
        destination: { type: "platform-route", path: `/app/automation/rules/${rule.id}`, requiresPermission: "view_workflow_automation" },
        availability: "available",
        demonstrationOnly: true,
      });
    }
  }

  const policiesRes = workflowAutomationService.listPolicies();
  if (policiesRes.ok) {
    for (const policy of policiesRes.data) {
      if (!tokenMatch(query, policy.name)) continue;
      results.push({
        id: `sr_auto_pol_${policy.id}` as GlobalSearchResultId,
        type: "navigation-command" as GlobalSearchResultType,
        title: policy.name,
        description: `Policy · ${policy.family}`,
        workspaceContext: "Northbridge Legal",
        matchedFields: buildMatchFields(query, [
          { field: "title", label: "Policy", text: policy.name },
        ]),
        matchScore: computeScore(query, policy.name),
        destination: { type: "platform-route", path: `/app/automation/policies/${policy.id}`, requiresPermission: "view_workflow_automation" },
        availability: "available",
        demonstrationOnly: true,
      });
    }
  }

  return results;
}

// ── Scope → builder mapping ───────────────────────────────────────────────────

type ScopeBuilder = (query: string) => GlobalSearchResult[];

const SCOPE_BUILDERS: Partial<Record<GlobalSearchScope, ScopeBuilder[]>> = {
  // Composed rather than nested-ternaried: three capabilities now gate parts of the
  // documents scope, and each gate is independent.
  //   buildFolderResults / buildOrgTagResults -> basic-document-organization (launch-supporting)
  //   buildOrgSavedViewResults               -> advanced-document-organization (post-launch)
  //   buildCollaborationResults              -> document-collaboration (enterprise-preview)
  "documents":        [
                        buildDocumentResults,
                        buildSigningWorkflowResults,
                        ...(isPreparationSearchEnabled() ? [buildPreparationResults] : []),
                        ...(isCollaborationSearchEnabled() ? [buildCollaborationResults] : []),
                        buildFolderResults,
                        buildOrgTagResults,
                        ...(isAdvancedOrganizationEnabled() ? [buildOrgSavedViewResults] : []),
                      ],
  "my-actions":       [buildMyActionsResults],
  "templates":        [buildTemplateResults],
  "contacts":         [buildContactResults, buildContactGroupResults],
  "people-and-teams": [buildMemberResults, buildTeamResults, buildRoleResults],
  "verification":     [buildVerificationResults],
  "notifications":    [buildNotificationResults],
  "reports":          isAutomationSearchEnabled()
                        ? [buildReportResults, buildAutomationResults]
                        : [buildReportResults],
  "settings":         [buildSettingsResults],
  "help":             [buildHelpResults],
};

const ALL_SCOPE_ORDER: GlobalSearchScope[] = [
  "documents", "my-actions", "templates", "contacts",
  "people-and-teams", "verification", "notifications",
  "reports", "settings", "help",
];

// ── Command palette commands ──────────────────────────────────────────────────

// Collaboration commands (C34). Navigation only — none of them posts a comment,
// mentions anyone, resolves a thread, or changes a review response. Present only
// when the capability is available in the active launch profile.
const COLLABORATION_COMMANDS: CommandPaletteCommand[] = isCollaborationSearchEnabled() ? [
  { id: "cmd_collab_center"   as CommandPaletteCommandId, label: "Open Collaboration Center",   group: "Navigate", type: "navigate", icon: "MessagesSquare", isPinnable: true,  aliases: ["discussions", "comments", "internal review"], requiresPermission: "view_documents", destination: { type: "platform-route", path: "/app/collaboration" } },
  { id: "cmd_collab_mentions" as CommandPaletteCommandId, label: "Open My Mentions",            group: "Navigate", type: "my-work",  icon: "AtSign",         isPinnable: true,  aliases: ["mentions"],                                  requiresPermission: "view_documents", destination: { type: "platform-route", path: "/app/collaboration/mentions" } },
  { id: "cmd_collab_assigned" as CommandPaletteCommandId, label: "Open Reviews Assigned to Me", group: "Navigate", type: "my-work",  icon: "ClipboardCheck", isPinnable: false, aliases: ["my reviews"],                                requiresPermission: "view_documents", destination: { type: "platform-route", path: "/app/collaboration/assigned" } },
  { id: "cmd_collab_blocking" as CommandPaletteCommandId, label: "Open Blocking Discussions",   group: "Navigate", type: "navigate", icon: "AlertTriangle",  isPinnable: false, aliases: ["blocking"],                                  requiresPermission: "view_documents", destination: { type: "platform-route", path: "/app/collaboration/blocking" } },
] : [];

// Post-launch capabilities. Their routes are capability-guarded, so their commands
// must disappear together with the routes — a palette entry that lands on a
// "not available" page is a dead end, and it also discloses that the feature exists.
const ADVANCED_ORGANIZATION_COMMANDS: CommandPaletteCommand[] = isAdvancedOrganizationEnabled() ? [
  { id: "cmd_doc_savedviews" as CommandPaletteCommandId, label: "Open Saved Views",           group: "Navigate", type: "navigate",     icon: "Bookmark", isPinnable: true,  requiresPermission: "view_documents",      destination: { type: "platform-route", path: "/app/documents/saved-views" } },
] : [];

const ADVANCED_REPORTS_COMMANDS: CommandPaletteCommand[] = isAdvancedReportsEnabled() ? [
  { id: "cmd_savedrep"       as CommandPaletteCommandId, label: "Create Saved Report View",   group: "Create",   type: "quick-action", icon: "Bookmark", isPinnable: false, requiresPermission: "view_reports",        destination: { type: "platform-route", path: "/app/reports/saved" } },
] : [];

const INTEGRATIONS_COMMANDS: CommandPaletteCommand[] = isIntegrationsEnabled() ? [
  { id: "cmd_integrations"   as CommandPaletteCommandId, label: "Open Integrations",          group: "Settings", type: "settings",     icon: "Puzzle",   isPinnable: false, requiresPermission: "manage_integrations", destination: { type: "platform-route", path: "/app/settings/integrations" } },
] : [];

// Bulk Send preparation commands (Gap Closure Command 5).
//
// The capability had declared `commandPaletteVisibility: true` since C33 with no
// provider registered.
//
// NAVIGATION ONLY. Every command opens authoritative UI. None sends a request,
// notifies a recipient, marks a batch ready, applies a recommendation, removes
// rows, executes Automation, or schedules anything — the palette must never
// bypass a confirmation, a validation step, or an authoritative form.
const PREPARATION_COMMANDS: CommandPaletteCommand[] = isPreparationSearchEnabled() ? [
  { id: "cmd_prep_open"      as CommandPaletteCommandId, label: "Open Bulk Send",              group: "Navigate", type: "navigate", icon: "Send",       isPinnable: true,  aliases: ["preparation", "bulk", "recipients", "batch"], requiresPermission: "view_documents",    destination: { type: "platform-route", path: "/app/bulk-send" } },
  { id: "cmd_prep_new"       as CommandPaletteCommandId, label: "Create Bulk Send Batch",      group: "Create",   type: "quick-action", icon: "Plus",   isPinnable: false, aliases: ["new batch"],                                  requiresPermission: "prepare_documents", destination: { type: "platform-route", path: "/app/bulk-send/new" } },
  { id: "cmd_prep_configs"   as CommandPaletteCommandId, label: "Open Saved Bulk Send Configurations", group: "Navigate", type: "navigate", icon: "Bookmark", isPinnable: false, aliases: ["saved configurations"],              requiresPermission: "view_documents",    destination: { type: "platform-route", path: "/app/bulk-send/saved-configurations" } },
] : [];

const ALL_COMMANDS: CommandPaletteCommand[] = [
  ...PREPARATION_COMMANDS,
  // Navigate group
  { id: "cmd_dashboard"     as CommandPaletteCommandId, label: "Go to Dashboard",           group: "Navigate", type: "navigate",     icon: "LayoutDashboard", isPinnable: true,  aliases: ["home", "overview"],          destination: { type: "platform-route", path: "/app/dashboard" } },
  { id: "cmd_documents"     as CommandPaletteCommandId, label: "Open Documents",             group: "Navigate", type: "navigate",     icon: "FileText",        isPinnable: true,  requiresPermission: "view_documents",   destination: { type: "platform-route", path: "/app/documents" } },
  { id: "cmd_myactions"     as CommandPaletteCommandId, label: "Open My Actions",            group: "Navigate", type: "my-work",      icon: "Inbox",           isPinnable: true,  aliases: ["inbox", "assignments"],      destination: { type: "platform-route", path: "/app/inbox" } },
  { id: "cmd_templates"     as CommandPaletteCommandId, label: "Open Templates",             group: "Navigate", type: "navigate",     icon: "Files",           isPinnable: true,  requiresPermission: "manage_templates", destination: { type: "platform-route", path: "/app/templates" } },
  { id: "cmd_contacts"      as CommandPaletteCommandId, label: "Open Contacts",              group: "Navigate", type: "navigate",     icon: "Users",           isPinnable: true,  requiresPermission: "manage_contacts",  destination: { type: "platform-route", path: "/app/contacts" } },
  { id: "cmd_verify"        as CommandPaletteCommandId, label: "Open Verification",          group: "Navigate", type: "navigate",     icon: "ShieldCheck",     isPinnable: true,  requiresPermission: "verify_documents", destination: { type: "platform-route", path: "/app/verify" } },
  { id: "cmd_notifications" as CommandPaletteCommandId, label: "Open Notifications",         group: "Navigate", type: "my-work",      icon: "Bell",            isPinnable: false, destination: { type: "platform-route", path: "/app/notifications" } },
  { id: "cmd_reports"       as CommandPaletteCommandId, label: "Open Reports",               group: "Reports",  type: "navigate",     icon: "BarChart2",       isPinnable: true,  requiresPermission: "view_reports",           destination: { type: "platform-route", path: "/app/reports" } },

  // Automation group
  { id: "cmd_automation"           as CommandPaletteCommandId, label: "Open Automation",           group: "Automation", type: "navigate",     icon: "Zap",           isPinnable: true,  requiresPermission: "view_workflow_automation",   destination: { type: "platform-route", path: "/app/automation" } },
  { id: "cmd_automation_rules"     as CommandPaletteCommandId, label: "Open Automation Rules",     group: "Automation", type: "navigate",     icon: "Settings",      isPinnable: true,  requiresPermission: "view_workflow_automation",   destination: { type: "platform-route", path: "/app/automation/rules" } },
  { id: "cmd_automation_policies"  as CommandPaletteCommandId, label: "Open Automation Policies",  group: "Automation", type: "navigate",     icon: "ClipboardList", isPinnable: false, requiresPermission: "view_workflow_automation",   destination: { type: "platform-route", path: "/app/automation/policies" } },
  { id: "cmd_automation_conflicts" as CommandPaletteCommandId, label: "Open Automation Conflicts", group: "Automation", type: "navigate",     icon: "AlertTriangle", isPinnable: false, requiresPermission: "view_workflow_automation",   destination: { type: "platform-route", path: "/app/automation/conflicts" } },
  { id: "cmd_new_rule"             as CommandPaletteCommandId, label: "Create Automation Rule",    group: "Automation", type: "quick-action", icon: "Plus",          isPinnable: false, requiresPermission: "manage_workflow_automation", destination: { type: "platform-route", path: "/app/automation/rules/new" } },

  { id: "cmd_workspace"     as CommandPaletteCommandId, label: "Open Workspace Administration", group: "Workspace", type: "workspace", icon: "Building2",       isPinnable: false, requiresPermission: "manage_team",      destination: { type: "platform-route", path: "/app/workspace" } },
  { id: "cmd_search"        as CommandPaletteCommandId, label: "Open Global Search",         group: "Navigate", type: "navigate",     icon: "Search",          isPinnable: false, destination: { type: "platform-route", path: "/app/search" } },

  // Create group
  { id: "cmd_prepare"       as CommandPaletteCommandId, label: "Prepare Document",           group: "Create",   type: "quick-action", icon: "FilePlus",        isPinnable: true,  requiresPermission: "prepare_documents", destination: { type: "platform-route", path: "/app/prepare" } },
  { id: "cmd_newtemplate"   as CommandPaletteCommandId, label: "Create Template",            group: "Create",   type: "quick-action", icon: "FilePlus2",       isPinnable: false, requiresPermission: "manage_templates",  destination: { type: "platform-route", path: "/app/templates/new" } },
  { id: "cmd_newcontact"    as CommandPaletteCommandId, label: "Add Contact",                group: "Create",   type: "quick-action", icon: "UserPlus",        isPinnable: false, requiresPermission: "manage_contacts",   destination: { type: "platform-route", path: "/app/contacts/new" } },
  { id: "cmd_newgroup"      as CommandPaletteCommandId, label: "Create Contact Group",       group: "Create",   type: "quick-action", icon: "UsersRound",      isPinnable: false, requiresPermission: "manage_contacts",   destination: { type: "platform-route", path: "/app/contacts/groups" } },
  { id: "cmd_invitemember"  as CommandPaletteCommandId, label: "Invite Member",              group: "Create",   type: "quick-action", icon: "UserPlus2",       isPinnable: false, requiresPermission: "manage_team",       destination: { type: "platform-route", path: "/app/workspace/invitations" } },
  { id: "cmd_newteam"       as CommandPaletteCommandId, label: "Create Team",                group: "Create",   type: "quick-action", icon: "Users2",          isPinnable: false, requiresPermission: "manage_team",       destination: { type: "platform-route", path: "/app/workspace/teams" } },
  ...ADVANCED_REPORTS_COMMANDS,

  // Settings group
  { id: "cmd_profile"       as CommandPaletteCommandId, label: "Open Profile",               group: "Settings", type: "settings",    icon: "CircleUser",      isPinnable: false, destination: { type: "platform-route", path: "/app/settings/profile" } },
  { id: "cmd_security"      as CommandPaletteCommandId, label: "Open Security",              group: "Settings", type: "settings",    icon: "Lock",            isPinnable: true,  requiresPermission: "manage_security",  destination: { type: "platform-route", path: "/app/settings/security" } },
  { id: "cmd_signatures"    as CommandPaletteCommandId, label: "Open Signatures & Initials", group: "Settings", type: "settings",    icon: "PenLine",         isPinnable: true,  destination: { type: "platform-route", path: "/app/settings/signatures" } },
  { id: "cmd_notifpref"     as CommandPaletteCommandId, label: "Notification Preferences",  group: "Settings", type: "settings",    icon: "BellRing",        isPinnable: false, destination: { type: "platform-route", path: "/app/settings/notifications" } },
  { id: "cmd_billing"       as CommandPaletteCommandId, label: "Open Billing",               group: "Settings", type: "settings",    icon: "CreditCard",      isPinnable: false, requiresPermission: "view_billing",     destination: { type: "platform-route", path: "/app/settings/billing" } },
  { id: "cmd_usage"         as CommandPaletteCommandId, label: "Open Usage",                 group: "Settings", type: "settings",    icon: "BarChart2",       isPinnable: false, requiresPermission: "view_usage",       destination: { type: "platform-route", path: "/app/settings/usage" } },
  ...INTEGRATIONS_COMMANDS,
  { id: "cmd_dataprivacy"   as CommandPaletteCommandId, label: "Data & Privacy",             group: "Settings", type: "settings",    icon: "Shield",          isPinnable: false, destination: { type: "platform-route", path: "/app/settings/data-and-privacy" } },

  // Document organization group
  { id: "cmd_doc_folders"     as CommandPaletteCommandId, label: "Open Document Folders",      group: "Navigate", type: "navigate",     icon: "Folder",          isPinnable: true,  requiresPermission: "view_documents",   destination: { type: "platform-route", path: "/app/documents/folders" } },
  { id: "cmd_doc_tags"        as CommandPaletteCommandId, label: "Open Document Tags",          group: "Navigate", type: "navigate",     icon: "Tag",             isPinnable: false, requiresPermission: "view_documents",   destination: { type: "platform-route", path: "/app/documents/tags" } },
  ...ADVANCED_ORGANIZATION_COMMANDS,

  ...COLLABORATION_COMMANDS,

  // Help group
  { id: "cmd_help"          as CommandPaletteCommandId, label: "Open Help Center",           group: "Help",     type: "help",        icon: "HelpCircle",      isPinnable: false, destination: { type: "internal-route", path: "/help" } },
  { id: "cmd_guides"        as CommandPaletteCommandId, label: "Open Guides",                group: "Help",     type: "help",        icon: "BookOpen",        isPinnable: false, destination: { type: "internal-route", path: "/resources/guides" } },
  { id: "cmd_legalframework"as CommandPaletteCommandId, label: "Legal Framework",            group: "Help",     type: "help",        icon: "Scale",           isPinnable: false, destination: { type: "internal-route", path: "/resources/legal-framework" } },
  { id: "cmd_verifyguide"   as CommandPaletteCommandId, label: "Document Verification Guide",group: "Help",     type: "help",        icon: "FileSearch",      isPinnable: false, destination: { type: "internal-route", path: "/resources/document-verification-guide" } },
  { id: "cmd_support"       as CommandPaletteCommandId, label: "Contact Support",            group: "Help",     type: "help",        icon: "MessageCircle",   isPinnable: false, destination: { type: "internal-route", path: "/contact" } },
];

// ── Recent-query sensitivity filter ──────────────────────────────────────────
// Avoid retaining queries that look like identifiers or private values.

const SENSITIVE_PATTERNS = [
  /\S+@\S+\.\S+/,               // email-like
  /VRF-[\w-]+/i,                 // verification ID
  /\b\d{16}\b/,                  // payment card-like
  /\b\d{10,11}\b/,               // phone-like
  /^[A-Za-z0-9+/]{20,}={0,2}$/, // base64-like token
];

function isSensitiveQuery(q: string): boolean {
  return SENSITIVE_PATTERNS.some((rx) => rx.test(q));
}

// ── Return route validation ───────────────────────────────────────────────────

function isValidReturnRoute(path: string): boolean {
  return SAFE_RETURN_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// ── Service class ─────────────────────────────────────────────────────────────

class GlobalSearchService {

  // ── Core search ────────────────────────────────────────────────────────────

  search(req: Partial<GlobalSearchRequest>): GlobalSearchResponse {
    const query    = sanitizeQuery(req.query ?? "");
    const scope    = validateScope(req.scope);
    const sort     = validateSortField(req.sort);
    const dir      = req.sortDirection ?? "desc";
    const maxPG    = req.maxPerGroup ?? 5;
    const perPage  = req.perPage ?? 20;

    if (query.length < 2) {
      return {
        query, scope,
        groups: [],
        totalPermittedCount: 0,
        sourceStatuses: this._buildSourceStatuses("ok"),
        demonstrationOnly: true,
      };
    }

    const scopesToSearch: GlobalSearchScope[] =
      scope === "all" ? ALL_SCOPE_ORDER : [scope];

    const groups: GlobalSearchResultGroup[] = [];

    for (const sc of scopesToSearch) {
      const builders = SCOPE_BUILDERS[sc] ?? [];
      const raw = builders.flatMap((b) => b(query));
      const sorted = sortResults(raw, sort, dir);
      const limited = sorted.slice(0, maxPG);
      if (limited.length > 0) {
        groups.push({
          scope:      sc,
          label:      SEARCH_SCOPE_LABELS[sc],
          icon:       SEARCH_SCOPE_ICONS[sc],
          results:    limited,
          totalCount: sorted.length,
          hasMore:    sorted.length > perPage,
        });
      }
    }

    const totalPermittedCount = groups.reduce((acc, g) => acc + g.results.length, 0);

    return {
      query,
      scope,
      groups,
      totalPermittedCount,
      sourceStatuses: this._buildSourceStatuses("ok"),
      demonstrationOnly: true,
    };
  }

  private _buildSourceStatuses(status: "ok" | "unavailable" | "partial"): GlobalSearchResponse["sourceStatuses"] {
    return ALL_SCOPE_ORDER.map((sc) => ({
      scope:  sc,
      status,
      label:  SEARCH_SCOPE_LABELS[sc],
    }));
  }

  // ── Commands ───────────────────────────────────────────────────────────────

  private _getAvailableCommands(): CommandPaletteCommand[] {
    const automationEnabled = isAutomationSearchEnabled();
    return ALL_COMMANDS.filter((cmd) => {
      if (cmd.group === "Automation" && !automationEnabled) return false;
      return true;
    });
  }

  listCommands(): CommandPaletteCommand[] {
    return this._getAvailableCommands();
  }

  searchCommands(query: string): CommandPaletteCommand[] {
    const available = this._getAvailableCommands();
    if (!query || query.trim().length < 1) return available;
    const q = query.toLowerCase().trim();
    return available.filter((cmd) =>
      tokenMatch(q, cmd.label) ||
      tokenMatch(q, cmd.description) ||
      tokenMatch(q, cmd.group) ||
      (cmd.aliases ?? []).some((a) => tokenMatch(q, a))
    );
  }

  getCommandsByGroup(): Partial<Record<CommandPaletteCommandGroup, CommandPaletteCommand[]>> {
    const groups: Partial<Record<CommandPaletteCommandGroup, CommandPaletteCommand[]>> = {};
    for (const cmd of this._getAvailableCommands()) {
      if (!groups[cmd.group]) groups[cmd.group] = [];
      groups[cmd.group]!.push(cmd);
    }
    return groups;
  }

  // ── Recent queries ─────────────────────────────────────────────────────────

  getRecentQueries(): GlobalSearchRecentQuery[] {
    return [..._recentQueries];
  }

  addRecentQuery(query: string, scope?: GlobalSearchScope): void {
    const q = sanitizeQuery(query);
    if (q.length < 2 || isSensitiveQuery(q)) return;
    _recentQueries = _recentQueries.filter((r) => r.query !== q);
    _recentQueries.unshift({
      id:      `rq_${++_queryCounter}` as GlobalSearchRecentQueryId,
      query:   q,
      scope,
      addedAt: new Date().toISOString(),
    });
    if (_recentQueries.length > MAX_RECENT_QUERIES) {
      _recentQueries = _recentQueries.slice(0, MAX_RECENT_QUERIES);
    }
  }

  removeRecentQuery(id: GlobalSearchRecentQueryId): void {
    _recentQueries = _recentQueries.filter((r) => r.id !== id);
  }

  clearRecentQueries(): void {
    _recentQueries = [];
  }

  // ── Recent destinations ────────────────────────────────────────────────────

  getRecentDestinations(): GlobalSearchRecentDestination[] {
    return [..._recentDests];
  }

  addRecentDestination(label: string, path: string, icon?: string): void {
    if (!isValidReturnRoute(path)) return;
    _recentDests = _recentDests.filter((d) => d.path !== path);
    _recentDests.unshift({
      id:      `rd_${++_destCounter}` as GlobalSearchRecentDestId,
      label:   label.slice(0, 80),
      path,
      icon,
      addedAt: new Date().toISOString(),
    });
    if (_recentDests.length > MAX_RECENT_DESTINATIONS) {
      _recentDests = _recentDests.slice(0, MAX_RECENT_DESTINATIONS);
    }
  }

  removeRecentDestination(id: GlobalSearchRecentDestId): void {
    _recentDests = _recentDests.filter((d) => d.id !== id);
  }

  clearRecentDestinations(): void {
    _recentDests = [];
  }

  clearWorkspaceScopedDestinations(): void {
    // Keep only settings + personal routes after workspace switch
    _recentDests = _recentDests.filter((d) =>
      d.path.startsWith("/app/settings/") ||
      d.path === "/help" ||
      d.path.startsWith("/resources/") ||
      d.path.startsWith("/legal/")
    );
  }

  // ── Pinned commands ────────────────────────────────────────────────────────

  getPinnedCommandIds(): string[] {
    return [..._pinnedCommandIds];
  }

  getPinnedCommands(): CommandPaletteCommand[] {
    const available = this._getAvailableCommands();
    return available.filter((c) => _pinnedCommandIds.includes(c.id) && c.isPinnable);
  }

  pinCommand(id: string): void {
    const cmd = this._getAvailableCommands().find((c) => c.id === id);
    if (!cmd || !cmd.isPinnable) return;
    if (!_pinnedCommandIds.includes(id)) _pinnedCommandIds.push(id);
  }

  unpinCommand(id: string): void {
    _pinnedCommandIds = _pinnedCommandIds.filter((i) => i !== id);
  }

  // ── Suggestions ────────────────────────────────────────────────────────────

  getSuggestions(): GlobalSearchSuggestion[] {
    const suggestions: GlobalSearchSuggestion[] = [];

    // Recent queries first
    for (const rq of _recentQueries.slice(0, 3)) {
      suggestions.push({
        id:    `sug_rq_${rq.id}`,
        type:  "recent-query",
        label: rq.query,
        query: rq.query,
        scope: rq.scope,
        icon:  "History",
      });
    }

    // Recent destinations
    for (const rd of _recentDests.slice(0, 3)) {
      suggestions.push({
        id:          `sug_rd_${rd.id}`,
        type:        "recent-destination",
        label:       rd.label,
        destination: { type: "platform-route", path: rd.path },
        icon:        rd.icon ?? "Clock",
      });
    }

    // Default navigation suggestions if nothing else
    if (suggestions.length === 0) {
      const defaults = [
        { id: "sug_prep",  label: "Prepare a document",       query: "prepare",    icon: "FilePlus" },
        { id: "sug_tmpl",  label: "Browse templates",         query: "template",   icon: "Files" },
        { id: "sug_vrf",   label: "Verify a document",        query: "verify",     icon: "ShieldCheck" },
        { id: "sug_help",  label: "Visit the Help Center",    query: "help",       icon: "HelpCircle" },
      ];
      for (const d of defaults) {
        suggestions.push({ id: d.id, type: "navigation-suggestion", label: d.label, query: d.query, icon: d.icon });
      }
    }

    return suggestions;
  }

  // ── Destination resolution ─────────────────────────────────────────────────

  resolveDestination(
    destination: GlobalSearchDestination,
    isAuthenticated: boolean,
  ): GlobalSearchDestinationResolution {
    if (!isAuthenticated) {
      return { outcome: "authentication-required", message: "Sign in to continue." };
    }
    if (!destination.path || !destination.path.startsWith("/")) {
      return { outcome: "invalid-destination", message: "This destination is not available." };
    }
    // Validate return route is safe
    if (!isValidReturnRoute(destination.path) && destination.type === "platform-route") {
      return { outcome: "invalid-destination", message: "This destination is not available." };
    }
    return { outcome: "allowed", path: destination.path };
  }

  // ── Reset (call on sign-out or workspace switch) ───────────────────────────

  resetGlobalSearchDemonstration(): void {
    _recentQueries    = [];
    _recentDests      = [];
    _pinnedCommandIds = [];
    _queryCounter     = 0;
    _destCounter      = 0;
  }
}

export const globalSearchService = new GlobalSearchService();

// Backward-compatible re-export for anything still importing from search.service
export { globalSearchService as mockSearchService };

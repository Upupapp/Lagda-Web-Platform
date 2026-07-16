// Global Search and Command Palette typed models — Command 30
// Frontend-only controlled projections. Search results do not grant access.
// Every destination revalidates permissions before navigation.
// No signatures, evidence, field values, credentials, or raw document content.
// No eNotary search scope, records, or operational commands.
// No localStorage, sessionStorage, or persistent history.

// ── Branded ID types ─────────────────────────────────────────────────────────

export type GlobalSearchResultId       = string & { readonly __brand: "GlobalSearchResultId" };
export type GlobalSearchRecentQueryId  = string & { readonly __brand: "GlobalSearchRecentQueryId" };
export type GlobalSearchRecentDestId   = string & { readonly __brand: "GlobalSearchRecentDestId" };
export type CommandPaletteCommandId    = string & { readonly __brand: "CommandPaletteCommandId" };

// ── Result types ──────────────────────────────────────────────────────────────

export type GlobalSearchResultType =
  | "document"
  | "document-draft"
  | "recipient-assignment"
  | "template"
  | "contact"
  | "contact-group"
  | "workspace-member"
  | "team"
  | "role"
  | "verification-record"
  | "notification"
  | "report-definition"
  | "saved-report-view"
  | "settings-route"
  | "help-resource"
  | "public-resource"
  | "navigation-command"
  | "quick-action";

export const SEARCH_RESULT_TYPE_LABELS: Record<GlobalSearchResultType, string> = {
  "document":            "Document",
  "document-draft":      "Draft",
  "recipient-assignment":"My Action",
  "template":            "Template",
  "contact":             "Contact",
  "contact-group":       "Contact Group",
  "workspace-member":    "Member",
  "team":                "Team",
  "role":                "Role",
  "verification-record": "Verification",
  "notification":        "Notification",
  "report-definition":   "Report",
  "saved-report-view":   "Saved View",
  "settings-route":      "Settings",
  "help-resource":       "Help",
  "public-resource":     "Resource",
  "navigation-command":  "Navigation",
  "quick-action":        "Action",
};

// ── Scopes ────────────────────────────────────────────────────────────────────

export type GlobalSearchScope =
  | "all"
  | "documents"
  | "my-actions"
  | "templates"
  | "contacts"
  | "people-and-teams"
  | "verification"
  | "notifications"
  | "reports"
  | "settings"
  | "help";

export const VALID_SEARCH_SCOPES: GlobalSearchScope[] = [
  "all", "documents", "my-actions", "templates", "contacts",
  "people-and-teams", "verification", "notifications", "reports", "settings", "help",
];

export const SEARCH_SCOPE_LABELS: Record<GlobalSearchScope, string> = {
  "all":              "All",
  "documents":        "Documents",
  "my-actions":       "My Actions",
  "templates":        "Templates",
  "contacts":         "Contacts",
  "people-and-teams": "People & Teams",
  "verification":     "Verification",
  "notifications":    "Notifications",
  "reports":          "Reports",
  "settings":         "Settings",
  "help":             "Help",
};

export const SEARCH_SCOPE_ICONS: Record<GlobalSearchScope, string> = {
  "all":              "Search",
  "documents":        "FileText",
  "my-actions":       "Inbox",
  "templates":        "Files",
  "contacts":         "Users",
  "people-and-teams": "Users2",
  "verification":     "ShieldCheck",
  "notifications":    "Bell",
  "reports":          "BarChart2",
  "settings":         "Settings",
  "help":             "HelpCircle",
};

// ── Result availability ───────────────────────────────────────────────────────

export type GlobalSearchResultAvailability =
  | "available"
  | "archived"
  | "unavailable"
  | "restricted"
  | "stale"
  | "feature-unavailable"
  | "workspace-restricted"
  | "team-restricted";

export const AVAILABILITY_LABELS: Record<GlobalSearchResultAvailability, string> = {
  "available":            "Available",
  "archived":             "Archived",
  "unavailable":          "Unavailable",
  "restricted":           "Restricted",
  "stale":                "May be outdated",
  "feature-unavailable":  "Feature unavailable",
  "workspace-restricted": "Workspace restricted",
  "team-restricted":      "Team restricted",
};

// ── Destination ───────────────────────────────────────────────────────────────

export type GlobalSearchDestinationType = "internal-route" | "platform-route";

export interface GlobalSearchDestination {
  type: GlobalSearchDestinationType;
  path: string;
  requiresPermission?: string;
  requiresFeature?: string;
}

// ── Match fields (safe text ranges only — never unsafe HTML) ─────────────────

export interface GlobalSearchMatchRange {
  start: number;
  end: number;
}

export interface GlobalSearchMatchField {
  field: "title" | "description" | "status" | "workspace" | "team" | "alias";
  label: string;
  text: string;
  ranges: GlobalSearchMatchRange[];
}

// ── Search result ─────────────────────────────────────────────────────────────

export interface GlobalSearchResult {
  readonly id:               GlobalSearchResultId;
  readonly type:             GlobalSearchResultType;
  readonly title:            string;
  readonly description?:     string;
  readonly workspaceContext?: string;
  readonly teamContext?:      string;
  readonly status?:           string;
  readonly statusLabel?:      string;
  readonly updatedAt?:        string;
  readonly matchedFields:     GlobalSearchMatchField[];
  readonly matchScore:        number;       // 0–100, deterministic
  readonly destination:       GlobalSearchDestination;
  readonly availability:      GlobalSearchResultAvailability;
  readonly demonstrationOnly: true;
}

// ── Result group ──────────────────────────────────────────────────────────────

export interface GlobalSearchResultGroup {
  readonly scope:       GlobalSearchScope;
  readonly label:       string;
  readonly icon:        string;
  readonly results:     GlobalSearchResult[];
  readonly totalCount:  number;
  readonly hasMore:     boolean;
}

// ── Request / response ────────────────────────────────────────────────────────

export type GlobalSearchSortField     = "relevance" | "updated-at" | "title" | "status";
export type GlobalSearchSortDirection = "desc" | "asc";

export const VALID_SORT_FIELDS: GlobalSearchSortField[] = [
  "relevance", "updated-at", "title", "status",
];

export interface GlobalSearchFilter {
  scope?:        GlobalSearchScope;
  status?:       string;
  availability?: GlobalSearchResultAvailability;
}

export interface GlobalSearchRequest {
  query:          string;
  scope:          GlobalSearchScope;
  filters:        GlobalSearchFilter;
  sort:           GlobalSearchSortField;
  sortDirection:  GlobalSearchSortDirection;
  page:           number;
  perPage:        number;
  maxPerGroup:    number;    // limit for command palette mode
}

export const DEFAULT_SEARCH_REQUEST: GlobalSearchRequest = {
  query:         "",
  scope:         "all",
  filters:       {},
  sort:          "relevance",
  sortDirection: "desc",
  page:          1,
  perPage:       20,
  maxPerGroup:   5,
};

// ── Source statuses ───────────────────────────────────────────────────────────

export type GlobalSearchSourceStatus = "ok" | "unavailable" | "partial" | "restricted";

export interface GlobalSearchSourceInfo {
  scope:  GlobalSearchScope;
  status: GlobalSearchSourceStatus;
  label:  string;
}

// ── Response ──────────────────────────────────────────────────────────────────

export interface GlobalSearchResponse {
  readonly query:               string;
  readonly scope:               GlobalSearchScope;
  readonly groups:              GlobalSearchResultGroup[];
  readonly totalPermittedCount: number;
  readonly sourceStatuses:      GlobalSearchSourceInfo[];
  readonly demonstrationOnly:   true;
}

// ── Suggestions ───────────────────────────────────────────────────────────────

export type GlobalSearchSuggestionType =
  | "recent-query"
  | "recent-destination"
  | "scope-suggestion"
  | "navigation-suggestion"
  | "help-suggestion";

export interface GlobalSearchSuggestion {
  readonly id:           string;
  readonly type:         GlobalSearchSuggestionType;
  readonly label:        string;
  readonly description?: string;
  readonly query?:       string;
  readonly destination?: GlobalSearchDestination;
  readonly scope?:       GlobalSearchScope;
  readonly icon?:        string;
}

// ── Recent queries ─────────────────────────────────────────────────────────────

export const MAX_RECENT_QUERIES = 8;
export const MAX_QUERY_LENGTH   = 200;

export interface GlobalSearchRecentQuery {
  readonly id:     GlobalSearchRecentQueryId;
  readonly query:  string;
  readonly scope?: GlobalSearchScope;
  readonly addedAt: string;
}

// ── Recent destinations ───────────────────────────────────────────────────────

export const MAX_RECENT_DESTINATIONS = 8;

export interface GlobalSearchRecentDestination {
  readonly id:      GlobalSearchRecentDestId;
  readonly label:   string;
  readonly path:    string;
  readonly icon?:   string;
  readonly addedAt: string;
}

// ── Destination resolution ────────────────────────────────────────────────────

export type GlobalSearchDestinationOutcome =
  | "allowed"
  | "authentication-required"
  | "onboarding-required"
  | "permission-denied"
  | "workspace-restricted"
  | "team-restricted"
  | "feature-unavailable"
  | "resource-not-found"
  | "resource-unavailable"
  | "stale-result"
  | "invalid-destination";

export interface GlobalSearchDestinationResolution {
  outcome:          GlobalSearchDestinationOutcome;
  path?:            string;
  message?:         string;
  suggestedPath?:   string;
}

// ── Command palette commands ──────────────────────────────────────────────────

export type CommandPaletteCommandType =
  | "navigate"
  | "create"
  | "my-work"
  | "workspace"
  | "settings"
  | "help"
  | "quick-action";

export type CommandPaletteCommandGroup =
  | "Navigate"
  | "Create"
  | "My Work"
  | "Workspace"
  | "Reports"
  | "Automation"
  | "Settings"
  | "Help";

export interface CommandPaletteCommand {
  readonly id:                  CommandPaletteCommandId;
  readonly label:               string;
  readonly description?:        string;
  readonly group:               CommandPaletteCommandGroup;
  readonly type:                CommandPaletteCommandType;
  readonly icon:                string;
  readonly destination?:        GlobalSearchDestination;
  readonly requiresPermission?: string;
  readonly requiresFeature?:    string;
  readonly isPinnable:          boolean;
  readonly aliases?:            string[];
}

// ── Safe return-route allowlist ───────────────────────────────────────────────

export const SAFE_RETURN_ROUTE_PREFIXES: string[] = [
  "/app/",
  "/sign-in",
  "/create-account",
];

// ── Search scenarios ──────────────────────────────────────────────────────────

export type GlobalSearchScenario =
  | "standard-user"
  | "sender"
  | "recipient-focused"
  | "workspace-admin"
  | "team-scoped"
  | "billing-admin"
  | "empty-search"
  | "no-results"
  | "partial-source-failure"
  | "restricted-results"
  | "stale-result"
  | "full-failure";

export const VALID_SEARCH_SCENARIOS: GlobalSearchScenario[] = [
  "standard-user", "sender", "recipient-focused", "workspace-admin",
  "team-scoped", "billing-admin", "empty-search", "no-results",
  "partial-source-failure", "restricted-results", "stale-result", "full-failure",
];

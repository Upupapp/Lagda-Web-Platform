// Typed models for the Reports, Analytics, and Operational Insights Center (Command 29).
// FRONTEND-ONLY — no backend, no real analytics, no real exports, no real schedules.
// All report values are fictional demonstration data aggregated from existing domain fixtures.
// Burgundy (#67023B) is NEVER used here — reserved for future LAGDA eNotary only.
// No eNotary report categories, notarial metrics, or accreditation reports.

// ── Branded ID types ──────────────────────────────────────────────────────────

export type ReportId         = string & { readonly __brand: "ReportId" };
export type ReportViewId     = string & { readonly __brand: "ReportViewId" };
export type ReportMetricId   = string & { readonly __brand: "ReportMetricId" };
export type ReportFilterId   = string & { readonly __brand: "ReportFilterId" };
export type ReportAnnotationId = string & { readonly __brand: "ReportAnnotationId" };

// ── Report families ───────────────────────────────────────────────────────────

export type ReportFamily =
  | "documents"
  | "participants"
  | "templates"
  | "verification"
  | "teams";

export const REPORT_FAMILY_LABELS: Record<ReportFamily, string> = {
  documents:     "Document Operations",
  participants:  "Participants & Routing",
  templates:     "Template Adoption",
  verification:  "Verification",
  teams:         "Workspace & Team Activity",
};

export const REPORT_FAMILY_DESCRIPTIONS: Record<ReportFamily, string> = {
  documents:    "Volume, status distribution, completion direction, turnaround, and delivery-issue direction across document transactions.",
  participants: "Participant role distribution, routing-stage direction, bottleneck direction, authentication methods, consent, and field completion.",
  templates:    "Template usage trends, frequently used templates, status distribution, and role-placeholder direction.",
  verification: "Verification checks, outcome distribution, coverage direction, and match/mismatch direction.",
  teams:        "Workspace operational summary, team comparison, sender activity direction, and member participation direction.",
};

export const REPORT_FAMILY_PATHS: Record<ReportFamily, string> = {
  documents:    "/app/reports/documents",
  participants: "/app/reports/participants",
  templates:    "/app/reports/templates",
  verification: "/app/reports/verification",
  teams:        "/app/reports/teams",
};

export const REPORT_FAMILY_ICONS: Record<ReportFamily, string> = {
  documents:    "FileText",
  participants: "Users",
  templates:    "Files",
  verification: "ShieldCheck",
  teams:        "Building2",
};

// ── Date range presets ────────────────────────────────────────────────────────

export type ReportDatePreset =
  | "last-7-days"
  | "last-30-days"
  | "last-90-days"
  | "current-month"
  | "previous-month"
  | "current-quarter"
  | "previous-quarter"
  | "current-year"
  | "custom";

export const REPORT_DATE_PRESET_LABELS: Record<ReportDatePreset, string> = {
  "last-7-days":      "Last 7 Days",
  "last-30-days":     "Last 30 Days",
  "last-90-days":     "Last 90 Days",
  "current-month":    "Current Month",
  "previous-month":   "Previous Month",
  "current-quarter":  "Current Quarter",
  "previous-quarter": "Previous Quarter",
  "current-year":     "Current Year",
  "custom":           "Custom Range",
};

export const VALID_DATE_PRESETS: readonly ReportDatePreset[] = [
  "last-7-days","last-30-days","last-90-days",
  "current-month","previous-month","current-quarter","previous-quarter","current-year","custom",
];

export interface ReportDateRange {
  preset:   ReportDatePreset;
  from:     string; // ISO
  to:       string; // ISO
  label:    string; // human-readable description
}

// ── Trend direction ───────────────────────────────────────────────────────────

export type ReportTrendDirection =
  | "increase"
  | "decrease"
  | "unchanged"
  | "insufficient-data"
  | "unavailable";

export interface ReportTrend {
  direction:   ReportTrendDirection;
  magnitude?:  number;   // absolute change (not always meaningful)
  percentage?: number;   // percentage change (rounded, not precise)
  label:       string;   // text label — required, never color/arrow only
  context:     string;   // what this trend means for this specific metric
  comparedTo:  string;   // e.g. "previous 30-day period"
}

// ── Metric format types ───────────────────────────────────────────────────────

export type ReportMetricFormat =
  | "count"
  | "percentage"
  | "duration"
  | "date"
  | "ratio"
  | "text";

// ── Summary metric card ───────────────────────────────────────────────────────

export interface ReportMetricCard {
  id:          ReportMetricId;
  label:       string;
  value:       string | number;
  format:      ReportMetricFormat;
  denominator?: string;   // explains what the value is out of
  trend?:      ReportTrend;
  notice?:     string;    // data-quality or explanation notice
  isInsufficient?: boolean;
  isUnavailable?:  boolean;
  demonstrationOnly: true;
}

// ── Distribution item (horizontal bar chart row) ──────────────────────────────

export interface ReportDistributionItem {
  id:          string;
  label:       string;
  count:       number;
  percentage:  number;  // 0–100, rounded
  colorClass:  "azure" | "navy" | "slate" | "green" | "amber" | "red" | "gold" | "violet";
  isHighlighted?: boolean;
}

export interface ReportDistribution {
  id:           string;
  title:        string;
  description:  string;
  textSummary:  string;
  items:        ReportDistributionItem[];
  totalCount:   number;
  denominatorNote: string;
  demonstrationOnly: true;
}

// ── Time series (for simple line/bar trend charts) ────────────────────────────

export interface ReportTimeSeriesPoint {
  period:  string;   // "Jul 1", "Week 27", etc.
  isoDate: string;   // canonical ISO for accessibility
  count:   number;
}

export interface ReportTimeSeries {
  id:           string;
  title:        string;
  description:  string;
  textSummary:  string;
  points:       ReportTimeSeriesPoint[];
  unit:         string;   // "documents", "uses", etc.
  maxValue:     number;
  demonstrationOnly: true;
}

// ── Table row ─────────────────────────────────────────────────────────────────

export interface ReportTableColumn {
  id:         string;
  label:      string;
  format:     ReportMetricFormat;
  sortable:   boolean;
  hidden?:    boolean;
}

export interface ReportTableRow {
  id:      string;
  cells:   Record<string, string | number | null>;
  linkTo?: string;  // internal route — never external, never carries private data
}

export interface ReportTable {
  id:       string;
  title:    string;
  columns:  ReportTableColumn[];
  rows:     ReportTableRow[];
  totalRows: number;
  page:     number;
  perPage:  number;
  hasNextPage: boolean;
  textSummary: string;
  demonstrationOnly: true;
}

// ── Data quality notice ────────────────────────────────────────────────────────

export type ReportDataQualityLevel = "info" | "warning" | "error";

export interface ReportDataQualityNotice {
  id:      string;
  level:   ReportDataQualityLevel;
  message: string;
  detail?: string;
  linkTo?: string;  // internal route to relevant source
}

// ── Report result (output of one family report) ───────────────────────────────

export interface ReportResult<T = unknown> {
  family:       ReportFamily;
  dateRange:    ReportDateRange;
  metrics:      ReportMetricCard[];
  data:         T;
  dataQuality:  ReportDataQualityNotice[];
  textSummary:  string;
  generatedAt:  string;  // demonstration timestamp
  demonstrationOnly: true;
}

// ── Saved view ────────────────────────────────────────────────────────────────

export type ReportViewStatus = "active" | "archived";

export interface ReportSavedView {
  id:          ReportViewId;
  name:        string;
  family:      ReportFamily;
  datePreset:  ReportDatePreset;
  filters:     Record<string, string>;   // safe stable IDs only
  groupBy?:    string;
  sortField?:  string;
  sortDir?:    "asc" | "desc";
  columns?:    string[];
  status:      ReportViewStatus;
  isDefault:   boolean;
  createdAt:   string;
  updatedAt:   string;
  annotation?: string;  // plain text, in-memory only, max 500 chars
  demonstrationOnly: true;
}

// ── Saved view input ──────────────────────────────────────────────────────────

export interface CreateSavedViewInput {
  name:        string;
  family:      ReportFamily;
  datePreset:  ReportDatePreset;
  filters?:    Record<string, string>;
  groupBy?:    string;
  sortField?:  string;
  sortDir?:    "asc" | "desc";
  columns?:    string[];
  setAsDefault?: boolean;
}

// ── Export preview (no file generated) ────────────────────────────────────────

export interface ReportExportPreview {
  family:           ReportFamily;
  dateRange:        ReportDateRange;
  filters:          Record<string, string>;
  includedColumns:  string[];
  excludedPrivateFields: string[];
  estimatedRows:    number;
  privacyNotice:    string;
  demonstrationOnly: true;
}

// ── Share preview (no link generated) ────────────────────────────────────────

export interface ReportSharePreview {
  family:              ReportFamily;
  proposedRecipientCategory: string;
  scope:               string;
  permissionRequired:  string;
  expirationDirection: string;
  dataIncluded:        string[];
  dataExcluded:        string[];
  revocationDirection: string;
  demonstrationOnly:   true;
}

// ── Schedule preview (no schedule created) ───────────────────────────────────

export interface ReportSchedulePreview {
  family:             ReportFamily;
  frequencyDirection: string;
  timeZoneDirection:  string;
  channelDirection:   string;
  recipientDirection: string;
  permissionRequired: string;
  demonstrationOnly:  true;
}

// ── Report scenario ───────────────────────────────────────────────────────────

export type ReportScenario =
  | "standard"
  | "new-workspace"
  | "high-volume"
  | "team-scoped"
  | "partial-data"
  | "full-error";

export const VALID_REPORT_SCENARIOS: readonly ReportScenario[] = [
  "standard","new-workspace","high-volume","team-scoped","partial-data","full-error",
];

// ── Query state ───────────────────────────────────────────────────────────────

export interface ReportQuery {
  datePreset:         ReportDatePreset;
  dateFrom?:          string;
  dateTo?:            string;
  workspaceId?:       string;
  teamId?:            string;
  senderId?:          string;
  status?:            string;
  role?:              string;
  templateId?:        string;
  authMethod?:        string;
  verificationOutcome?: string;
  evidenceAvailability?: string;
  routingMode?:       string;
  deliveryIssue?:     string;
  groupBy?:           string;
  sortField?:         string;
  sortDir?:           "asc" | "desc";
  page?:              number;
  scenario?:          ReportScenario;
}

export const DEFAULT_REPORT_QUERY: ReportQuery = {
  datePreset: "last-30-days",
  page:       1,
};

// ── Document operations data ──────────────────────────────────────────────────

export interface DocumentOperationsData {
  volumeTrend:          ReportTimeSeries;
  statusDistribution:   ReportDistribution;
  completionRate:       ReportMetricCard;
  completionTime:       ReportMetricCard;
  awaitingAction:       ReportMetricCard;
  expiringCount:        ReportMetricCard;
  deliveryIssues:       ReportMetricCard;
  evidenceAvailability: ReportMetricCard;
  detailTable:          ReportTable;
}

// ── Participant data ──────────────────────────────────────────────────────────

export interface ParticipantReportData {
  roleDistribution:      ReportDistribution;
  roleOutcomes:          ReportDistribution[];
  routingStageSummary:   ReportMetricCard[];
  bottleneckDirection:   string;
  authMethodDistribution:ReportDistribution;
  consentMetrics:        ReportMetricCard[];
  fieldCompletionMetrics:ReportMetricCard[];
  detailTable:           ReportTable;
}

// ── Template adoption data ────────────────────────────────────────────────────

export interface TemplateReportData {
  summary:             ReportMetricCard[];
  usageTrend:          ReportTimeSeries;
  frequentlyUsed:      ReportTableRow[];
  statusDistribution:  ReportDistribution;
  placeholderSummary:  ReportMetricCard;
  detailTable:         ReportTable;
}

// ── Verification report data ──────────────────────────────────────────────────

export interface VerificationReportData {
  summary:             ReportMetricCard[];
  outcomeTrend:        ReportTimeSeries;
  outcomeDistribution: ReportDistribution;
  coverageMetric:      ReportMetricCard;
  matchDistribution:   ReportDistribution;
  detailTable:         ReportTable;
}

// ── Team activity data ────────────────────────────────────────────────────────

export interface TeamActivityData {
  workspaceSummary:     ReportMetricCard[];
  teamComparison:       ReportTable;
  senderActivity:       ReportTable;
  memberActivityNote:   string;
  detailTable:          ReportTable;
}

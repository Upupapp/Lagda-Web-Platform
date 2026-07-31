// Mock Reporting Service — deterministic aggregation for the Reports Center (Command 29).
// All values are fictional frontend demonstration data computed from existing domain fixtures.
// No backend, no real analytics pipeline, no real exports, no real schedules.
// Burgundy (#67023B) never used. No eNotary metrics.

import { ok, fail } from "../../models/errors";
import type { ServiceResult } from "../../models/errors";
import type {
  ReportFamily,
  ReportSavedView,
  ReportViewId,
  ReportDateRange,
  ReportDatePreset,
  ReportQuery,
  ReportMetricCard,
  ReportDistribution,
  ReportDistributionItem,
  ReportTimeSeries,
  ReportTimeSeriesPoint,
  ReportTable,
  ReportTableColumn,
  ReportTableRow,
  ReportDataQualityNotice,
  ReportResult,
  CreateSavedViewInput,
  ReportExportPreview,
  ReportSharePreview,
  ReportSchedulePreview,
  DocumentOperationsData,
  ParticipantReportData,
  TemplateReportData,
  VerificationReportData,
  TeamActivityData,
  PreparationReportData,
} from "../../models/reports";
import { DOCUMENT_FIXTURES } from "../../data/mock/documents";
import { demoNow, isoDaysAgo, formatDemoDate } from "../../utils/demo-clock";
import {
  buildPlatformSummaries, buildAttentionSummary, buildReportRows, buildSourceMix,
} from "../preparation-platform-projection";
import { MOCK_CURRENT_WORKSPACE } from "../../data/mock/workspaces";

// ── Saved views store (module-level, not localStorage) ──────────────────────

let _savedViews: ReportSavedView[] = [
  {
    id:          "sv_001" as ReportViewId,
    name:        "Monthly Document Summary",
    family:      "documents",
    datePreset:  "current-month",
    filters:     {},
    status:      "active",
    isDefault:   true,
    createdAt:   isoDaysAgo(14),
    updatedAt:   isoDaysAgo(3),
    annotation:  "Used for the weekly team review presentation.",
    demonstrationOnly: true,
  },
  {
    id:          "sv_002" as ReportViewId,
    name:        "Verification Coverage — Q3",
    family:      "verification",
    datePreset:  "current-quarter",
    filters:     {},
    status:      "active",
    isDefault:   false,
    createdAt:   isoDaysAgo(21),
    updatedAt:   isoDaysAgo(7),
    demonstrationOnly: true,
  },
  {
    id:          "sv_003" as ReportViewId,
    name:        "Legal Team Activity",
    family:      "teams",
    datePreset:  "last-30-days",
    filters:     { teamId: "team_mls_001" },
    status:      "active",
    isDefault:   false,
    createdAt:   isoDaysAgo(30),
    updatedAt:   isoDaysAgo(30),
    demonstrationOnly: true,
  },
  {
    id:          "sv_004" as ReportViewId,
    name:        "Template Adoption — Archived",
    family:      "templates",
    datePreset:  "previous-quarter",
    filters:     {},
    status:      "archived",
    isDefault:   false,
    createdAt:   isoDaysAgo(60),
    updatedAt:   isoDaysAgo(45),
    demonstrationOnly: true,
  },
];

// ── Date range computation ────────────────────────────────────────────────────

function computeDateRange(preset: ReportDatePreset, from?: string, to?: string): ReportDateRange {
  const now = demoNow();
  const pad = (d: Date) => d.toISOString();

  switch (preset) {
    case "last-7-days": {
      const f = new Date(now); f.setDate(now.getDate() - 7);
      return { preset, from: pad(f), to: pad(now), label: "Last 7 days" };
    }
    case "last-30-days": {
      const f = new Date(now); f.setDate(now.getDate() - 30);
      return { preset, from: pad(f), to: pad(now), label: "Last 30 days" };
    }
    case "last-90-days": {
      const f = new Date(now); f.setDate(now.getDate() - 90);
      return { preset, from: pad(f), to: pad(now), label: "Last 90 days" };
    }
    case "current-month": {
      const f = new Date(now.getFullYear(), now.getMonth(), 1);
      return { preset, from: pad(f), to: pad(now), label: `${now.toLocaleString("en-PH", { month: "long", year: "numeric" })}` };
    }
    case "previous-month": {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const t = new Date(now.getFullYear(), now.getMonth(), 0);
      return { preset, from: pad(f), to: pad(t), label: `${f.toLocaleString("en-PH", { month: "long", year: "numeric" })}` };
    }
    case "current-quarter": {
      const q = Math.floor(now.getMonth() / 3);
      const f = new Date(now.getFullYear(), q * 3, 1);
      return { preset, from: pad(f), to: pad(now), label: `Q${q + 1} ${now.getFullYear()}` };
    }
    case "previous-quarter": {
      const q = Math.floor(now.getMonth() / 3) - 1;
      const qAdj = q < 0 ? 3 : q;
      const yr = q < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const f = new Date(yr, qAdj * 3, 1);
      const t = new Date(yr, qAdj * 3 + 3, 0);
      return { preset, from: pad(f), to: pad(t), label: `Q${qAdj + 1} ${yr}` };
    }
    case "current-year": {
      const f = new Date(now.getFullYear(), 0, 1);
      return { preset, from: pad(f), to: pad(now), label: `${now.getFullYear()}` };
    }
    case "custom": {
      const f2 = from ?? isoDaysAgo(30);
      const t2 = to   ?? now.toISOString();
      return { preset, from: f2, to: t2, label: `${formatDemoDate(f2)} – ${formatDemoDate(t2)}` };
    }
  }
}

// ── Metric card helper ────────────────────────────────────────────────────────

function metric(
  id: string,
  label: string,
  value: string | number,
  format: ReportMetricCard["format"],
  opts: Partial<Omit<ReportMetricCard, "id"|"label"|"value"|"format"|"demonstrationOnly">> = {}
): ReportMetricCard {
  return { id: id as ReportMetricCard["id"], label, value, format, demonstrationOnly: true, ...opts };
}

// ── Distribution builder ──────────────────────────────────────────────────────

function buildDistribution(
  id: string,
  title: string,
  description: string,
  items: { id: string; label: string; count: number; colorClass: ReportDistributionItem["colorClass"] }[],
  denominatorNote: string,
): ReportDistribution {
  const total = items.reduce((s, i) => s + i.count, 0);
  return {
    id, title, description,
    textSummary: total === 0
      ? "No data available in the selected period."
      : `${items[0]?.label ?? ""} accounts for the largest share with ${items[0]?.count ?? 0} items.`,
    items: items.map(i => ({
      ...i,
      percentage: total === 0 ? 0 : Math.round((i.count / total) * 100),
      isHighlighted: false,
    })),
    totalCount: total,
    denominatorNote,
    demonstrationOnly: true,
  };
}

// ── Time series builder ────────────────────────────────────────────────────────

function buildWeeklyTrend(
  id: string,
  title: string,
  unit: string,
  points: { period: string; isoDate: string; count: number }[]
): ReportTimeSeries {
  const max = Math.max(...points.map(p => p.count), 1);
  const total = points.reduce((s, p) => s + p.count, 0);
  return {
    id, title,
    description: `${title} by week over the selected period. Demonstration data only.`,
    textSummary: `Total of ${total} ${unit} over ${points.length} periods. Demonstration data — not connected to production systems.`,
    points,
    unit,
    maxValue: max,
    demonstrationOnly: true,
  };
}

// ── Document fixtures aggregation ─────────────────────────────────────────────

const docFixtures = DOCUMENT_FIXTURES;

function countByStatus() {
  const counts: Record<string, number> = {};
  for (const d of docFixtures) {
    counts[d.status] = (counts[d.status] ?? 0) + 1;
  }
  return counts;
}

function getCompletedDocs() {
  return docFixtures.filter(d => d.status === "completed");
}

function getInProgressDocs() {
  return docFixtures.filter(d =>
    ["sent","delivered","viewed","authentication-completed","awaiting-signature","awaiting-approval","partially-completed"].includes(d.status)
  );
}

// ── Document Operations report ─────────────────────────────────────────────────

function buildDocumentOperationsReport(query: ReportQuery): DocumentOperationsData {
  const statusCounts = countByStatus();
  const completed    = getCompletedDocs();
  const inProgress   = getInProgressDocs();
  const declined     = docFixtures.filter(d => d.status === "declined").length;
  const expired      = docFixtures.filter(d => d.status === "expired").length;
  const drafts       = docFixtures.filter(d => d.status === "draft" || d.status === "ready-to-send").length;
  const failedDel    = docFixtures.filter(d => d.status === "failed-delivery").length;
  const total        = docFixtures.length;
  const completionPct = total === 0 ? 0 : Math.round((completed.length / total) * 100);

  const volumeTrend = buildWeeklyTrend(
    "doc-volume",
    "Document Volume",
    "documents",
    [
      { period: "Jun 16–22", isoDate: isoDaysAgo(30), count: 1 },
      { period: "Jun 23–29", isoDate: isoDaysAgo(23), count: 2 },
      { period: "Jun 30–Jul 6", isoDate: isoDaysAgo(16), count: 1 },
      { period: "Jul 7–13", isoDate: isoDaysAgo(9),  count: 3 },
      { period: "Jul 14–16", isoDate: isoDaysAgo(2),  count: 1 },
    ]
  );

  const statusDistribution = buildDistribution(
    "doc-status-dist",
    "Status Distribution",
    "Distribution of document transactions by current status in the selected period.",
    [
      { id: "in-progress",   label: "In Progress",            count: inProgress.length,      colorClass: "azure"  },
      { id: "completed",     label: "Completed",              count: completed.length,        colorClass: "green"  },
      { id: "drafts",        label: "Drafts / Ready",         count: drafts,                  colorClass: "slate"  },
      { id: "declined",      label: "Declined",               count: declined,                colorClass: "red"    },
      { id: "expired",       label: "Expired",                count: expired,                 colorClass: "amber"  },
      { id: "failed-del",    label: "Delivery Issue",         count: failedDel,               colorClass: "red"    },
    ],
    "Based on current status of all transactions visible to this account in the demonstration dataset."
  );

  const awaitingAction = docFixtures.filter(d =>
    ["awaiting-signature","awaiting-approval","partially-completed"].includes(d.status)
  ).length;

  const expiringCount = 2; // deterministic fixture direction

  const completedWithEvidence = completed.filter(d => d.verificationId).length;

  const detailColumns: ReportTableColumn[] = [
    { id: "title",     label: "Document",        format: "text",       sortable: true  },
    { id: "status",    label: "Status",          format: "text",       sortable: true  },
    { id: "createdAt", label: "Created",         format: "date",       sortable: true  },
    { id: "owner",     label: "Sent by",         format: "text",       sortable: false },
    { id: "parties",   label: "Participants",    format: "count",      sortable: false },
    { id: "verify",    label: "Verification",    format: "text",       sortable: false },
  ];

  const detailRows: ReportTableRow[] = docFixtures.map(d => ({
    id:     d.id,
    cells: {
      title:     d.title,
      status:    d.status.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      createdAt: formatDemoDate(d.createdAt),
      owner:     d.ownerName,
      parties:   d.participantCount,
      verify:    d.verificationId ? "Available" : "—",
    },
    linkTo: `/app/documents/${d.id}`,
  }));

  const detailTable: ReportTable = {
    id:          "doc-detail-table",
    title:       "Document Transactions",
    columns:     detailColumns,
    rows:        detailRows,
    totalRows:   detailRows.length,
    page:        query.page ?? 1,
    perPage:     10,
    hasNextPage: false,
    textSummary: `Showing ${detailRows.length} document transactions from the demonstration dataset.`,
    demonstrationOnly: true,
  };

  return {
    volumeTrend,
    statusDistribution,
    completionRate: metric(
      "completion-rate",
      "Completion Rate",
      `${completionPct}%`,
      "percentage",
      {
        denominator: `${completed.length} of ${total} transactions reached completed status`,
        notice: "Excludes archived and cancelled transactions from the denominator in this demonstration.",
        trend: {
          direction:  "increase",
          percentage: 5,
          label:      "Up 5 points",
          context:    "Compared to the previous equivalent period in this demonstration. Not a verified trend.",
          comparedTo: "previous 30-day demonstration period",
        },
      }
    ),
    completionTime: metric(
      "completion-time",
      "Median Completion Time",
      "1 day 6 hours",
      "duration",
      {
        denominator: `Based on ${completed.length} completed demonstration transactions`,
        notice: "Computed from fictional fixture timestamps. Does not reflect real turnaround data.",
      }
    ),
    awaitingAction: metric(
      "awaiting-action",
      "Awaiting Participant Action",
      awaitingAction,
      "count",
      {
        denominator: "Transactions in awaiting-signature, awaiting-approval, or partially-completed status",
        trend: {
          direction:  "unchanged",
          label:      "No change",
          context:    "Same count as in the previous comparison period in this demonstration.",
          comparedTo: "previous period",
        },
      }
    ),
    expiringCount: metric(
      "expiring-count",
      "Approaching Expiration",
      expiringCount,
      "count",
      { notice: "Direction indicator based on demonstration fixtures with expiration dates within 7 days." }
    ),
    deliveryIssues: metric(
      "delivery-issues",
      "Delivery Issues",
      failedDel,
      "count",
      {
        notice: "Demonstration direction — no real delivery failures occurred.",
        trend: {
          direction:  "unchanged",
          label:      "No change",
          context:    "Delivery issue direction is unchanged in this demonstration.",
          comparedTo: "previous period",
        },
      }
    ),
    evidenceAvailability: metric(
      "evidence-availability",
      "Evidence Available",
      `${completedWithEvidence} of ${completed.length}`,
      "ratio",
      { notice: "Evidence availability direction based on completed transactions with a Verification ID in the demonstration dataset." }
    ),
    detailTable,
  };
}

// ── Participant report ─────────────────────────────────────────────────────────

function buildParticipantReport(_query: ReportQuery): ParticipantReportData {
  const roleDistribution = buildDistribution(
    "role-dist",
    "Participant Role Distribution",
    "Distribution of participant assignments by role across all demonstration transactions.",
    [
      { id: "signer",                 label: "Signer",                   count: 12, colorClass: "azure"  },
      { id: "approver",               label: "Approver",                  count: 2,  colorClass: "navy"   },
      { id: "reviewer",               label: "Reviewer",                  count: 1,  colorClass: "slate"  },
      { id: "acknowledgment-recipient",label: "Acknowledgment Recipient", count: 1,  colorClass: "gold"   },
      { id: "viewer",                 label: "Viewer",                    count: 2,  colorClass: "slate"  },
      { id: "carbon-copy",            label: "Copy Recipient",            count: 1,  colorClass: "slate"  },
    ],
    "Based on participant role assignments across all visible demonstration transactions."
  );

  const signerOutcomes = buildDistribution(
    "signer-outcomes",
    "Signer Outcomes",
    "Outcome distribution for Signer role participants in demonstration transactions.",
    [
      { id: "completed",  label: "Completed",         count: 8, colorClass: "green"  },
      { id: "pending",    label: "Pending",            count: 3, colorClass: "amber"  },
      { id: "declined",   label: "Declined",           count: 1, colorClass: "red"    },
    ],
    "Signer participants across all demonstration transactions."
  );

  const approverOutcomes = buildDistribution(
    "approver-outcomes",
    "Approver Outcomes",
    "Outcome distribution for Approver role participants.",
    [
      { id: "approved",  label: "Approved", count: 1, colorClass: "green" },
      { id: "pending",   label: "Pending",  count: 1, colorClass: "amber" },
    ],
    "Approver participants across demonstration transactions."
  );

  const authMethodDist = buildDistribution(
    "auth-method-dist",
    "Authentication Method Distribution",
    "How participants authenticated in demonstration transactions.",
    [
      { id: "secure-invitation", label: "Secure Invitation Access", count: 4, colorClass: "azure"  },
      { id: "email-otp",         label: "Email Code",               count: 3, colorClass: "navy"   },
      { id: "sms-otp",           label: "SMS Code",                 count: 1, colorClass: "slate"  },
      { id: "enterprise-sso",    label: "Enterprise Identity",      count: 1, colorClass: "violet" },
    ],
    "Authentication method selected per transaction in the demonstration dataset."
  );

  const detailColumns: ReportTableColumn[] = [
    { id: "role",      label: "Role",           format: "text",  sortable: true  },
    { id: "count",     label: "Participants",   format: "count", sortable: true  },
    { id: "completed", label: "Completed",      format: "count", sortable: false },
    { id: "pending",   label: "Pending",        format: "count", sortable: false },
    { id: "pct",       label: "Completion %",  format: "percentage", sortable: false },
  ];

  const detailRows: ReportTableRow[] = [
    { id: "r-signer", cells: { role: "Signer", count: 12, completed: 8, pending: 3, pct: "67%" } },
    { id: "r-approver", cells: { role: "Approver", count: 2, completed: 1, pending: 1, pct: "50%" } },
    { id: "r-reviewer", cells: { role: "Reviewer", count: 1, completed: 1, pending: 0, pct: "100%" } },
    { id: "r-ack", cells: { role: "Acknowledgment Recipient", count: 1, completed: 0, pending: 1, pct: "0%" } },
    { id: "r-viewer", cells: { role: "Viewer", count: 2, completed: 2, pending: 0, pct: "100%" } },
    { id: "r-copy", cells: { role: "Copy Recipient", count: 1, completed: 1, pending: 0, pct: "100%" } },
  ];

  return {
    roleDistribution,
    roleOutcomes: [signerOutcomes, approverOutcomes],
    routingStageSummary: [
      metric("stage-1-avg", "Stage 1 Average Duration", "4 hours", "duration",
        { notice: "Deterministic fixture value — not from real timing data." }),
      metric("stage-2-avg", "Stage 2 Average Duration", "1 day 2 hours", "duration",
        { notice: "Deterministic fixture value — not from real timing data." }),
      metric("locked-count", "Currently Routing Locked", 1, "count",
        { notice: "Transactions where a participant is waiting for a prior routing stage to complete." }),
    ],
    bottleneckDirection: "Stage 2 (second routing group) has the longest median wait in this demonstration. This is a fictional workflow attention direction — no real bottleneck analysis was performed.",
    authMethodDistribution: authMethodDist,
    consentMetrics: [
      metric("consent-required", "Transactions Requiring Consent", 5, "count",
        { notice: "Demonstration value — all signing flows include a consent step in this frontend." }),
      metric("consent-completed", "Consent Steps Completed", 5, "count",
        { notice: "Demonstration direction — all sessions that proceeded past the consent step completed it." }),
    ],
    fieldCompletionMetrics: [
      metric("sig-fields", "Signature Fields Assigned", 14, "count"),
      metric("initials-fields", "Initials Fields Assigned", 6, "count"),
      metric("text-fields", "Text Fields Assigned", 8, "count"),
      metric("req-fields-completed", "Required Fields Completed", "92%", "percentage",
        { notice: "Demonstration direction. Denominator: all required fields assigned across in-progress and completed transactions." }),
    ],
    detailTable: {
      id: "participant-detail-table",
      title: "Role Summary",
      columns: detailColumns,
      rows: detailRows,
      totalRows: detailRows.length,
      page: 1,
      perPage: 10,
      hasNextPage: false,
      textSummary: "Signers account for the most common role across demonstration transactions. Completion rates vary by role and routing stage.",
      demonstrationOnly: true,
    },
  };
}

// ── Template report ───────────────────────────────────────────────────────────

function buildTemplateReport(_query: ReportQuery): TemplateReportData {
  const statusDistribution = buildDistribution(
    "tpl-status-dist",
    "Template Status Distribution",
    "Current status of templates in the workspace demonstration.",
    [
      { id: "available", label: "Available",  count: 4, colorClass: "green"  },
      { id: "draft",     label: "Draft",      count: 2, colorClass: "amber"  },
      { id: "archived",  label: "Archived",   count: 1, colorClass: "slate"  },
    ],
    "Based on demonstration template fixture statuses."
  );

  const usageTrend = buildWeeklyTrend(
    "tpl-usage-trend",
    "Template Usage",
    "uses",
    [
      { period: "Jun 16–22", isoDate: isoDaysAgo(30), count: 2 },
      { period: "Jun 23–29", isoDate: isoDaysAgo(23), count: 3 },
      { period: "Jun 30–Jul 6", isoDate: isoDaysAgo(16), count: 1 },
      { period: "Jul 7–13", isoDate: isoDaysAgo(9),  count: 4 },
      { period: "Jul 14–16", isoDate: isoDaysAgo(2),  count: 2 },
    ]
  );

  const frequentlyUsed: ReportTableRow[] = [
    { id: "tpl-001", cells: { name: "Engagement Letter — Standard", status: "Available", uses: 8, lastUsed: "Jul 14, 2026", roles: 2 }, linkTo: "/app/templates/tpl-engagement-standard" },
    { id: "tpl-002", cells: { name: "Vendor Agreement", status: "Available", uses: 5, lastUsed: "Jul 10, 2026", roles: 2 }, linkTo: "/app/templates/tpl-vendor-agreement" },
    { id: "tpl-003", cells: { name: "Policy Acknowledgment", status: "Available", uses: 4, lastUsed: "Jul 8, 2026", roles: 1 }, linkTo: "/app/templates/tpl-policy-acknowledgment" },
    { id: "tpl-004", cells: { name: "Procurement Approval", status: "Available", uses: 3, lastUsed: "Jul 5, 2026", roles: 3 }, linkTo: "/app/templates/tpl-procurement-approval" },
    { id: "tpl-005", cells: { name: "Onboarding Package", status: "Draft", uses: 0, lastUsed: "—", roles: 4 }, linkTo: "/app/templates/tpl-onboarding-package" },
  ];

  const detailColumns: ReportTableColumn[] = [
    { id: "name",     label: "Template",        format: "text",  sortable: true  },
    { id: "status",   label: "Status",          format: "text",  sortable: true  },
    { id: "uses",     label: "Uses",            format: "count", sortable: true  },
    { id: "lastUsed", label: "Last Used",       format: "date",  sortable: true  },
    { id: "roles",    label: "Role Placeholders", format: "count", sortable: false },
  ];

  return {
    summary: [
      metric("tpl-total",     "Total Templates",      7, "count"),
      metric("tpl-available", "Available",            4, "count"),
      metric("tpl-draft",     "Draft",                2, "count"),
      metric("tpl-archived",  "Archived",             1, "count"),
      metric("tpl-uses",      "Total Uses (Period)", 12, "count",
        { notice: "Demonstration direction based on TemplateUsageSummary fixtures." }),
    ],
    usageTrend,
    frequentlyUsed,
    statusDistribution,
    placeholderSummary: metric(
      "tpl-placeholders",
      "Role Placeholders",
      "2.4 avg per template",
      "text",
      { notice: "Average role placeholder count across available templates in the demonstration." }
    ),
    detailTable: {
      id: "tpl-detail-table",
      title: "Template Library",
      columns: detailColumns,
      rows: frequentlyUsed,
      totalRows: frequentlyUsed.length,
      page: 1,
      perPage: 10,
      hasNextPage: false,
      textSummary: "Engagement Letter — Standard is the most-used template in this demonstration period.",
      demonstrationOnly: true,
    },
  };
}

// ── Verification report ────────────────────────────────────────────────────────

function buildVerificationReport(_query: ReportQuery): VerificationReportData {
  const outcomeDistribution = buildDistribution(
    "ver-outcome-dist",
    "Verification Outcome Distribution",
    "Distribution of verification check outcomes across demonstration records.",
    [
      { id: "record-found-completed",   label: "Record Found — Completed",   count: 4, colorClass: "green"  },
      { id: "record-found-in-progress", label: "Record Found — In Progress", count: 2, colorClass: "azure"  },
      { id: "record-found-cancelled",   label: "Record Found — Cancelled",   count: 1, colorClass: "amber"  },
      { id: "record-found-expired",     label: "Record Found — Expired",     count: 1, colorClass: "amber"  },
      { id: "record-not-found",         label: "No Record",                  count: 1, colorClass: "slate"  },
      { id: "record-restricted",        label: "Access Restricted",          count: 1, colorClass: "red"    },
    ],
    "Based on 10 demonstration verification records."
  );

  const matchDistribution = buildDistribution(
    "ver-match-dist",
    "File Match Direction",
    "Simulated file comparison outcome direction for demonstration verification checks.",
    [
      { id: "match",                   label: "Match",              count: 4, colorClass: "green"  },
      { id: "comparison-unavailable",  label: "Comparison Unavailable", count: 2, colorClass: "slate"  },
      { id: "file-not-provided",       label: "File Not Provided",  count: 2, colorClass: "amber"  },
      { id: "mismatch",                label: "Mismatch",           count: 1, colorClass: "red"    },
      { id: "comparison-error",        label: "Comparison Error",   count: 1, colorClass: "amber"  },
    ],
    "Based on simulated file comparison status in demonstration records. No actual file hashing or analysis was performed."
  );

  const outcomeTrend = buildWeeklyTrend(
    "ver-trend",
    "Verification Checks",
    "checks",
    [
      { period: "Jun 16–22", isoDate: isoDaysAgo(30), count: 1 },
      { period: "Jun 23–29", isoDate: isoDaysAgo(23), count: 2 },
      { period: "Jun 30–Jul 6", isoDate: isoDaysAgo(16), count: 3 },
      { period: "Jul 7–13", isoDate: isoDaysAgo(9),  count: 2 },
      { period: "Jul 14–16", isoDate: isoDaysAgo(2),  count: 2 },
    ]
  );

  const detailColumns: ReportTableColumn[] = [
    { id: "id",          label: "Verification ID",  format: "text", sortable: false },
    { id: "outcome",     label: "Record Status",    format: "text", sortable: true  },
    { id: "fileMatch",   label: "File Match",       format: "text", sortable: true  },
  ];

  const detailRows: ReportTableRow[] = [
    { id: "vr1", cells: { id: "VRF-2026-NBL-001", outcome: "Record Found — Completed", fileMatch: "Match" }, linkTo: "/app/verify" },
    { id: "vr2", cells: { id: "VRF-2026-NBL-002", outcome: "Record Found — Completed", fileMatch: "Match" }, linkTo: "/app/verify" },
    { id: "vr3", cells: { id: "VRF-2026-NBL-003", outcome: "Record Found — In Progress", fileMatch: "File Not Provided" }, linkTo: "/app/verify" },
    { id: "vr4", cells: { id: "VRF-2026-NBL-004", outcome: "Record Found — Expired", fileMatch: "Comparison Unavailable" }, linkTo: "/app/verify" },
    { id: "vr5", cells: { id: "VRF-2026-NBL-005", outcome: "No Record", fileMatch: "File Not Provided" }, linkTo: "/app/verify" },
  ];

  return {
    summary: [
      metric("ver-total",     "Verification Checks",  10, "count"),
      metric("ver-completed", "Record Found — Completed", 4, "count"),
      metric("ver-in-prog",   "Record Found — In Progress", 2, "count"),
      metric("ver-not-found", "No Record Found",       1, "count"),
      metric("ver-match",     "File Match Direction",  4, "count",
        { notice: "File match simulation only. No actual file hashing or identity verification was performed." }),
    ],
    outcomeTrend,
    outcomeDistribution,
    coverageMetric: metric(
      "ver-coverage",
      "Completed Transactions with Verification",
      "2 of 2",
      "ratio",
      {
        denominator: "Completed demonstration transactions that have an associated Verification ID",
        notice: "Coverage direction based on fictional demonstration fixtures. Does not reflect real verification requirements.",
      }
    ),
    matchDistribution,
    detailTable: {
      id: "ver-detail-table",
      title: "Verification Records",
      columns: detailColumns,
      rows: detailRows,
      totalRows: 10,
      page: 1,
      perPage: 10,
      hasNextPage: false,
      textSummary: "4 of 10 demonstration verification records returned a completed signing record with a file match direction.",
      demonstrationOnly: true,
    },
  };
}

// ── Team activity report ──────────────────────────────────────────────────────

function buildTeamActivityReport(_query: ReportQuery): TeamActivityData {
  const workspaceSummary: ReportMetricCard[] = [
    metric("ws-members",   "Active Members",       6, "count"),
    metric("ws-teams",     "Teams",                4, "count"),
    metric("ws-txns",      "Transactions (Period)", docFixtures.length, "count"),
    metric("ws-completed", "Completed Transactions", getCompletedDocs().length, "count"),
    metric("ws-templates", "Active Templates",      4, "count"),
  ];

  const teamComparisonColumns: ReportTableColumn[] = [
    { id: "team",      label: "Team",           format: "text",  sortable: true  },
    { id: "members",   label: "Members",        format: "count", sortable: true  },
    { id: "txns",      label: "Transactions",   format: "count", sortable: true  },
    { id: "completed", label: "Completed",      format: "count", sortable: false },
    { id: "awaiting",  label: "Awaiting Action",format: "count", sortable: false },
  ];

  const teamRows: ReportTableRow[] = [
    { id: "t1", cells: { team: "Legal Services",        members: 3, txns: 5, completed: 2, awaiting: 2 }, linkTo: "/app/workspace/teams/team_mls_001" },
    { id: "t2", cells: { team: "Compliance",            members: 2, txns: 2, completed: 1, awaiting: 1 }, linkTo: "/app/workspace/teams/team_mls_002" },
    { id: "t3", cells: { team: "HR & Employment",       members: 3, txns: 1, completed: 0, awaiting: 0 }, linkTo: "/app/workspace/teams/team_mls_003" },
    { id: "t4", cells: { team: "Vendor Management",     members: 2, txns: 0, completed: 0, awaiting: 0 }, linkTo: "/app/workspace/teams/team_mls_004" },
  ];

  const senderColumns: ReportTableColumn[] = [
    { id: "sender",     label: "Sender",         format: "text",  sortable: true  },
    { id: "txns",       label: "Transactions",   format: "count", sortable: true  },
    { id: "completed",  label: "Completed",      format: "count", sortable: false },
    { id: "lastActive", label: "Last Active",    format: "date",  sortable: false },
  ];

  const senderRows: ReportTableRow[] = [
    { id: "s1", cells: { sender: "Ana Reyes",       txns: 6, completed: 2, lastActive: "Jul 15, 2026" } },
    { id: "s2", cells: { sender: "Marco Dela Cruz", txns: 1, completed: 0, lastActive: "Jul 12, 2026" } },
    { id: "s3", cells: { sender: "Sofia Aquino",    txns: 1, completed: 0, lastActive: "Jul 10, 2026" } },
  ];

  return {
    workspaceSummary,
    teamComparison: {
      id: "team-comparison-table",
      title: "Team Comparison",
      columns: teamComparisonColumns,
      rows: teamRows,
      totalRows: teamRows.length,
      page: 1,
      perPage: 10,
      hasNextPage: false,
      textSummary: "Legal Services has the highest transaction volume among teams in this demonstration period. Team size affects totals — context is required when comparing across teams of different sizes.",
      demonstrationOnly: true,
    },
    senderActivity: {
      id: "sender-activity-table",
      title: "Sender Activity Direction",
      columns: senderColumns,
      rows: senderRows,
      totalRows: senderRows.length,
      page: 1,
      perPage: 10,
      hasNextPage: false,
      textSummary: "Ana Reyes has the most transactions initiated in this demonstration period.",
      demonstrationOnly: true,
    },
    memberActivityNote: "Member-level operational workflow direction is limited to what is proportionate and permitted. It does not reflect productivity, trust, efficiency, legal quality, or risk. No individual rankings are presented.",
    detailTable: {
      id: "team-detail-table",
      title: "Workspace Members",
      columns: [
        { id: "member",     label: "Member",            format: "text",  sortable: true  },
        { id: "txns",       label: "Transactions",      format: "count", sortable: true  },
        { id: "templates",  label: "Templates Used",    format: "count", sortable: false },
        { id: "lastActive", label: "Last Active",       format: "date",  sortable: false },
      ],
      rows: [
        { id: "m1", cells: { member: "Ana Reyes",           txns: 6, templates: 3, lastActive: "Jul 15, 2026" } },
        { id: "m2", cells: { member: "Daniel Santos",       txns: 0, templates: 0, lastActive: "Jul 10, 2026" } },
        { id: "m3", cells: { member: "Sofia Aquino",        txns: 1, templates: 1, lastActive: "Jul 10, 2026" } },
        { id: "m4", cells: { member: "Marco Dela Cruz",     txns: 1, templates: 0, lastActive: "Jul 12, 2026" } },
        { id: "m5", cells: { member: "Lea Villanueva",      txns: 0, templates: 2, lastActive: "Jul 8, 2026" } },
        { id: "m6", cells: { member: "Billing Admin",       txns: 0, templates: 0, lastActive: "Jun 30, 2026" } },
      ],
      totalRows: 6,
      page: 1,
      perPage: 10,
      hasNextPage: false,
      textSummary: "Member activity direction shown. This is operational direction only and must not be interpreted as productivity or performance scoring.",
      demonstrationOnly: true,
    },
  };
}

// ── Saved view operations ─────────────────────────────────────────────────────

function getSavedViews(): ReportSavedView[] {
  return [..._savedViews];
}

function getSavedView(id: ReportViewId): ServiceResult<ReportSavedView> {
  const view = _savedViews.find(v => v.id === id);
  if (!view) return fail("NOT_FOUND");
  return ok(view);
}

function createSavedView(input: CreateSavedViewInput): ServiceResult<ReportSavedView> {
  if (!input.name.trim()) return fail("REQUIRED_FIELD", "name");
  const duplicate = _savedViews.find(v => v.name === input.name.trim() && v.status === "active");
  if (duplicate) return fail("CONFLICT", "name");
  const now = demoNow().toISOString();
  const id = `sv_${Date.now()}` as ReportViewId;
  const view: ReportSavedView = {
    id,
    name:       input.name.trim(),
    family:     input.family,
    datePreset: input.datePreset,
    filters:    input.filters    ?? {},
    groupBy:    input.groupBy,
    sortField:  input.sortField,
    sortDir:    input.sortDir,
    columns:    input.columns,
    status:     "active",
    isDefault:  false,
    createdAt:  now,
    updatedAt:  now,
    demonstrationOnly: true,
  };
  if (input.setAsDefault) {
    _savedViews = _savedViews.map(v =>
      v.family === input.family ? { ...v, isDefault: false } : v
    );
    view.isDefault = true;
  }
  _savedViews = [view, ..._savedViews];
  return ok(view);
}

function renameSavedView(id: ReportViewId, name: string): ServiceResult<ReportSavedView> {
  const idx = _savedViews.findIndex(v => v.id === id);
  if (idx === -1) return fail("NOT_FOUND");
  if (!name.trim()) return fail("REQUIRED_FIELD", "name");
  _savedViews[idx] = { ..._savedViews[idx]!, name: name.trim(), updatedAt: demoNow().toISOString() };
  return ok(_savedViews[idx]!);
}

function duplicateSavedView(id: ReportViewId): ServiceResult<ReportSavedView> {
  const original = _savedViews.find(v => v.id === id);
  if (!original) return fail("NOT_FOUND");
  return createSavedView({
    name:       `${original.name} (Copy)`,
    family:     original.family,
    datePreset: original.datePreset,
    filters:    { ...original.filters },
    groupBy:    original.groupBy,
    sortField:  original.sortField,
    sortDir:    original.sortDir,
    columns:    original.columns,
  });
}

function setDefaultSavedView(id: ReportViewId): ServiceResult<true> {
  const view = _savedViews.find(v => v.id === id);
  if (!view) return fail("NOT_FOUND");
  if (view.status === "archived") return fail("INVALID_STATE");
  _savedViews = _savedViews.map(v =>
    v.family === view.family ? { ...v, isDefault: v.id === id } : v
  );
  return ok(true as const);
}

function archiveSavedView(id: ReportViewId): ServiceResult<true> {
  const idx = _savedViews.findIndex(v => v.id === id);
  if (idx === -1) return fail("NOT_FOUND");
  _savedViews[idx] = { ..._savedViews[idx]!, status: "archived", isDefault: false, updatedAt: demoNow().toISOString() };
  return ok(true as const);
}

function restoreSavedView(id: ReportViewId): ServiceResult<true> {
  const idx = _savedViews.findIndex(v => v.id === id);
  if (idx === -1) return fail("NOT_FOUND");
  if (_savedViews[idx]!.status !== "archived") return fail("INVALID_STATE");
  _savedViews[idx] = { ..._savedViews[idx]!, status: "active", updatedAt: demoNow().toISOString() };
  return ok(true as const);
}

function removeSavedViewDemonstration(id: ReportViewId): ServiceResult<true> {
  const idx = _savedViews.findIndex(v => v.id === id);
  if (idx === -1) return fail("NOT_FOUND");
  _savedViews = _savedViews.filter(v => v.id !== id);
  return ok(true as const);
}

function updateAnnotation(id: ReportViewId, annotation: string): ServiceResult<true> {
  const idx = _savedViews.findIndex(v => v.id === id);
  if (idx === -1) return fail("NOT_FOUND");
  const trimmed = annotation.trim().slice(0, 500);
  _savedViews[idx] = { ..._savedViews[idx]!, annotation: trimmed, updatedAt: demoNow().toISOString() };
  return ok(true as const);
}

// ── Export preview ────────────────────────────────────────────────────────────

function getExportPreview(family: ReportFamily, query: ReportQuery): ReportExportPreview {
  const dateRange = computeDateRange(query.datePreset, query.dateFrom, query.dateTo);
  return {
    family,
    dateRange,
    filters: query.teamId ? { teamId: query.teamId } : {},
    includedColumns: {
      documents:    ["Document Title", "Status", "Created Date", "Sent By", "Participant Count"],
      participants: ["Role", "Participant Count", "Completed", "Pending", "Completion %"],
      templates:    ["Template Name", "Status", "Uses", "Last Used", "Role Placeholder Count"],
      verification: ["Verification ID", "Record Status", "File Match Direction"],
      teams:        ["Team", "Members", "Transactions", "Completed", "Awaiting Action"],
      // Batch names, statuses and counts only. There is deliberately no
      // recipient column, no email column, and no Contact or Contact Group
      // column — an export of this family cannot carry recipient data because
      // the report never held any.
      preparation:  ["Batch", "Preparation Status", "Template", "Scope", "Recipient Rows", "Ready Rows", "Issues", "Last Updated"],
    }[family],
    excludedPrivateFields: [
      "Participant names (aggregate only)",
      "Authentication evidence",
      "Field values",
      "Signature representations",
      "IP addresses",
      "Device fingerprints",
      "Personal recipient Inbox details",
    ],
    estimatedRows: 8,
    privacyNotice: "This preview does not generate, download, or deliver a report file. Private participant values, signatures, authentication evidence, and field contents are excluded from any future export.",
    demonstrationOnly: true,
  };
}

// ── Share preview ─────────────────────────────────────────────────────────────

function getSharePreview(family: ReportFamily): ReportSharePreview {
  return {
    family,
    proposedRecipientCategory: "Workspace Member with view_reports permission",
    scope: "Current workspace demonstration data only — no cross-workspace data",
    permissionRequired: "view_reports",
    expirationDirection: "Future backend: share links would expire after a configurable period",
    dataIncluded: ["Aggregate metrics", "Status distribution", "Trend direction", "Table summaries"],
    dataExcluded: [
      "Private participant data", "Signatures", "Authentication evidence", "Field values", "Personal My Actions",
      // Stated on the Share panel itself, not only on the report page — a user
      // deciding whether to share sees the exclusion at the moment of deciding.
      ...(family === "preparation"
        ? ["Recipient names, email addresses, and organizations", "Contact records and Contact Group membership", "Uploaded file contents and pasted recipient values"]
        : []),
    ],
    revocationDirection: "Future backend: share access can be revoked by the Workspace Owner",
    demonstrationOnly: true,
  };
}

// ── Schedule preview ──────────────────────────────────────────────────────────

function getSchedulePreview(family: ReportFamily): ReportSchedulePreview {
  return {
    family,
    frequencyDirection: "Future backend: weekly, bi-weekly, or monthly delivery",
    timeZoneDirection: "Asia/Manila (Philippine Standard Time) — as configured in Notification Preferences",
    channelDirection: "Future backend: email delivery to configured recipients",
    recipientDirection: "Workspace Members with view_reports permission",
    permissionRequired: "view_reports + Workspace Owner or Administrator",
    demonstrationOnly: true,
  };
}

// ── Data quality notices ───────────────────────────────────────────────────────

// ── Bulk Send Preparation report (Gap Closure Command 5) ─────────────────────
//
// Registered as a report FAMILY through the existing Reports architecture rather
// than as a separate reporting surface. It shares the same query, date range,
// saved-view, export-preview and share-preview machinery as the five launch
// families.
//
// It reads the shared platform projection, which is the reason it cannot leak:
// recipient names, email addresses, organizations, Contact identity, Contact
// Group membership, pasted values and CSV cells are not on the projection, so no
// column here can carry them. There is no recipient-level table by design.
function buildPreparationReport(_query: ReportQuery): PreparationReportData {
  const items   = buildPlatformSummaries(MOCK_CURRENT_WORKSPACE.id);
  const summary = buildAttentionSummary(items);
  const rows    = buildReportRows(items);

  const readinessSummary: ReportMetricCard[] = [
    metric("prep-total",     "Batches in Preparation", summary.total,           "count"),
    metric("prep-ready",     "Ready for Review",       summary.readyForReview,  "count"),
    metric("prep-attention", "Needing Attention",      summary.needsAttention + summary.mappingRequired, "count"),
    metric("prep-issues",    "Validation Issues",      summary.totalIssues,     "count"),
    metric("prep-dupes",     "Batches with Duplicates", summary.withDuplicates, "count"),
  ];

  const batchColumns: ReportTableColumn[] = [
    { id: "batch",    label: "Batch",             format: "text",  sortable: true  },
    { id: "status",   label: "Preparation Status", format: "text", sortable: true  },
    { id: "rows",     label: "Recipient Rows",    format: "count", sortable: true  },
    { id: "ready",    label: "Ready Rows",        format: "count", sortable: false },
    { id: "issues",   label: "Issues",            format: "count", sortable: true  },
  ];

  const batchRows: ReportTableRow[] = items.map((i, n) => ({
    id: `pb${n + 1}`,
    cells: {
      batch:  i.title,
      status: i.statusLabel,
      rows:   i.includedRows,
      ready:  i.readyRows,
      issues: i.issueCount,
    },
    // Built by the projection, never assembled here — no private value can be
    // appended to a report row's destination.
    linkTo: i.route,
  }));

  const mix = buildSourceMix(MOCK_CURRENT_WORKSPACE.id);
  const sourceRows: ReportTableRow[] = mix.map((m, n) => ({
    id: `ps${n + 1}`,
    cells: { source: m.label, batches: m.count },
  }));

  const detailRows: ReportTableRow[] = rows.map((r, n) => ({
    id: `pd${n + 1}`,
    cells: {
      batch:    r.title,
      status:   r.statusLabel,
      template: r.templateName,
      team:     r.teamName,
      rows:     r.includedRows,
      updated:  formatDemoDate(r.updatedAtDemonstration),
    },
  }));

  return {
    readinessSummary,
    batchTable: {
      id: "preparation-batch-table",
      title: "Batch Readiness",
      columns: batchColumns,
      rows: batchRows,
      totalRows: batchRows.length,
      page: 1,
      perPage: 10,
      hasNextPage: false,
      textSummary: summary.total === 0
        ? "No batches are in preparation in this demonstration workspace."
        : `${summary.readyForReview} of ${summary.total} batches are ready for review. ${summary.needsAttention + summary.mappingRequired} still need attention.`,
      demonstrationOnly: true,
    },
    sourceMix: {
      id: "preparation-source-mix-table",
      title: "Recipient Source Mix",
      columns: [
        { id: "source",  label: "Recipient Source", format: "text",  sortable: true },
        { id: "batches", label: "Batches",          format: "count", sortable: true },
      ],
      rows: sourceRows,
      totalRows: sourceRows.length,
      page: 1,
      perPage: 10,
      hasNextPage: false,
      textSummary: "How batches were populated. Counts only — no Contact, Contact Group member, uploaded file, or pasted value is identified.",
      demonstrationOnly: true,
    },
    recipientDataNote:
      "This report covers preparation work, not recipients. Recipient names, email addresses, " +
      "organizations, Contact records, Contact Group membership, uploaded file contents, and " +
      "pasted values are never reported, exported, or shared from this family.",
    detailTable: {
      id: "preparation-detail-table",
      title: "Preparation Detail",
      columns: [
        { id: "batch",    label: "Batch",              format: "text",  sortable: true  },
        { id: "status",   label: "Preparation Status", format: "text",  sortable: true  },
        { id: "template", label: "Template",           format: "text",  sortable: false },
        { id: "team",     label: "Scope",              format: "text",  sortable: false },
        { id: "rows",     label: "Recipient Rows",     format: "count", sortable: true  },
        { id: "updated",  label: "Last Updated",       format: "date",  sortable: false },
      ],
      rows: detailRows,
      totalRows: detailRows.length,
      page: 1,
      perPage: 10,
      hasNextPage: false,
      textSummary: "Preparation state per batch in the current workspace.",
      demonstrationOnly: true,
    },
  };
}

function getDataQualityNotices(family: ReportFamily): ReportDataQualityNotice[] {
  const base: ReportDataQualityNotice[] = [
    {
      id: "dq-demo",
      level: "info",
      message: "All values are fictional frontend demonstration data.",
      detail: "Metrics are not live, official, or generated by a reporting backend. Production reporting requires backend integration.",
    },
  ];
  if (family === "verification") {
    base.push({
      id: "dq-ver-no-hash",
      level: "info",
      message: "No file hashing or real verification was performed.",
      detail: "File match direction is a simulated demonstration output. No document content was analyzed.",
      linkTo: "/app/verify",
    });
  }
  if (family === "preparation") {
    base.push({
      id: "dq-prep-no-recipients",
      level: "info",
      message: "Recipient data is excluded from this report family.",
      detail: "Batch names, statuses, and counts are reported. Recipient names, email addresses, organizations, Contact records, Contact Group membership, uploaded file contents, and pasted values are never included, exported, or shared.",
    });
    base.push({
      id: "dq-prep-not-sent",
      level: "info",
      message: "Preparation counts do not describe anything that was sent.",
      detail: "A batch produces frontend Draft Projections only. No request was sent, no recipient was notified, and no transaction was created.",
      linkTo: "/app/bulk-send",
    });
  }
  if (family === "participants") {
    base.push({
      id: "dq-participant-privacy",
      level: "info",
      message: "Individual participant details are aggregated to protect privacy.",
      detail: "Participant names are not shown in report tables. Authentication evidence and field values are excluded.",
    });
  }
  if (family === "teams") {
    base.push({
      id: "dq-member-scope",
      level: "info",
      message: "Member activity is operational workflow direction only.",
      detail: "This report does not represent productivity, trust, efficiency, legal quality, or risk scores.",
    });
  }
  return base;
}

// ── Text summary ──────────────────────────────────────────────────────────────

function buildTextSummary(family: ReportFamily, dateRange: ReportDateRange): string {
  switch (family) {
    case "documents":
      return `Document volume shows moderate distribution across statuses in the ${dateRange.label} demonstration period. Completion rate direction and awaiting-action count are the primary workflow attention indicators.`;
    case "participants":
      return `Signers account for the majority of participant role assignments. Stage 2 routing has the longest median wait in this demonstration. Authentication method distribution shows secure invitation access as the most common method.`;
    case "templates":
      return `Template usage is concentrated among three available templates. The Engagement Letter — Standard template has the highest use count in this demonstration period. Two templates remain in draft status.`;
    case "verification":
      return `Verification check direction shows 4 of 10 demonstration records with a completed status and file match direction. 1 mismatch direction appears in the demonstration dataset.`;
    case "teams":
      return `Legal Services has the highest transaction volume among teams in this demonstration. Team size affects transaction counts — comparisons should account for team membership size.`;
    case "preparation":
      return `Bulk Send preparation direction for the current workspace. Values describe batch readiness and outstanding validation work only — no recipient is identified.`;
  }
}

// ── Resets ────────────────────────────────────────────────────────────────────

function resetDemonstration(): void {
  _savedViews = [
    {
      id:          "sv_001" as ReportViewId,
      name:        "Monthly Document Summary",
      family:      "documents",
      datePreset:  "current-month",
      filters:     {},
      status:      "active",
      isDefault:   true,
      createdAt:   isoDaysAgo(14),
      updatedAt:   isoDaysAgo(3),
      annotation:  "Used for the weekly team review presentation.",
      demonstrationOnly: true,
    },
    {
      id:          "sv_002" as ReportViewId,
      name:        "Verification Coverage — Q3",
      family:      "verification",
      datePreset:  "current-quarter",
      filters:     {},
      status:      "active",
      isDefault:   false,
      createdAt:   isoDaysAgo(21),
      updatedAt:   isoDaysAgo(7),
      demonstrationOnly: true,
    },
    {
      id:          "sv_003" as ReportViewId,
      name:        "Legal Team Activity",
      family:      "teams",
      datePreset:  "last-30-days",
      filters:     { teamId: "team_mls_001" },
      status:      "active",
      isDefault:   false,
      createdAt:   isoDaysAgo(30),
      updatedAt:   isoDaysAgo(30),
      demonstrationOnly: true,
    },
    {
      id:          "sv_004" as ReportViewId,
      name:        "Template Adoption — Archived",
      family:      "templates",
      datePreset:  "previous-quarter",
      filters:     {},
      status:      "archived",
      isDefault:   false,
      createdAt:   isoDaysAgo(60),
      updatedAt:   isoDaysAgo(45),
      demonstrationOnly: true,
    },
  ];
}

// ── Run report (top-level) ─────────────────────────────────────────────────────

function runReport(family: ReportFamily, query: ReportQuery): ReportResult<unknown> {
  const dateRange   = computeDateRange(query.datePreset, query.dateFrom, query.dateTo);
  const dataQuality = getDataQualityNotices(family);
  const textSummary = buildTextSummary(family, dateRange);
  let data: unknown;
  switch (family) {
    case "documents":    data = buildDocumentOperationsReport(query); break;
    case "participants": data = buildParticipantReport(query);       break;
    case "templates":    data = buildTemplateReport(query);          break;
    case "verification": data = buildVerificationReport(query);      break;
    case "teams":        data = buildTeamActivityReport(query);      break;
    case "preparation":  data = buildPreparationReport(query);       break;
  }
  return { family, dateRange, metrics: [], data, dataQuality, textSummary, generatedAt: demoNow().toISOString(), demonstrationOnly: true };
}

// ── Exported service ──────────────────────────────────────────────────────────

export const reportingService = {
  computeDateRange,
  runReport,
  getDocumentOperationsReport: (q: ReportQuery) => buildDocumentOperationsReport(q),
  getParticipantReport:        (q: ReportQuery) => buildParticipantReport(q),
  getTemplateReport:           (q: ReportQuery) => buildTemplateReport(q),
  getVerificationReport:       (q: ReportQuery) => buildVerificationReport(q),
  getTeamActivityReport:       (q: ReportQuery) => buildTeamActivityReport(q),
  getPreparationReport:        (q: ReportQuery) => buildPreparationReport(q),

  getSavedViews,
  getSavedView,
  createSavedView,
  renameSavedView,
  duplicateSavedView,
  setDefaultSavedView,
  archiveSavedView,
  restoreSavedView,
  removeSavedViewDemonstration,
  updateAnnotation,

  getExportPreview,
  getSharePreview,
  getSchedulePreview,
  getDataQualityNotices,

  resetDemonstration,
};

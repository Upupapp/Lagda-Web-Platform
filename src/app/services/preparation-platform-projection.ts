// Safe platform projection for the Bulk Send preparation feature —
// Gap Closure Command 5. Frontend demonstration only.
//
// "Bulk Send" is this repository's canonical feature name (routes `/app/bulk-send/*`,
// models `BULK_SEND_*`, labels "Bulk Send"), so it is used unchanged.
//
// THE one projection every platform surface reads. Global Search, the Command
// Palette, the Dashboard, Reports, Notifications and the Documents workspace all
// consume this — none of them reaches into batch internals or page state.
//
// WHY A PROJECTION AT ALL: a batch holds recipient names, email addresses,
// organizations, pasted text and CSV cell values. None of that may reach a search
// index, a dashboard count, a notification body, a report row, or a URL. The
// projection is the enforcement point: if a field is not on it, no surface can
// leak it.
//
// It creates no second Search, Command Palette, Dashboard, Reports, Notification,
// or navigation system. Each contribution registers through the canonical registry
// that already exists for its surface.

import type { BulkSendBatchStatus } from "../models/bulk-send";
import { BULK_SEND_BATCH_STATUS_LABELS } from "../models/bulk-send";
import { bulkSendService } from "./mock/bulk-send.service";
import { isCapabilityInActiveProfile } from "../config/capability-resolver";

export const PREPARATION_CAPABILITY_ID = "bulk-send";
export const PREPARATION_FEATURE_LABEL = "Bulk Send";

/** Profile gate for module-scope callers (search providers, command registries). */
export function isPreparationPlatformVisible(): boolean {
  return isCapabilityInActiveProfile(PREPARATION_CAPABILITY_ID);
}

// ── Platform status model ─────────────────────────────────────────────────────

export type PreparationPlatformStatus =
  | "draft"
  | "needs-attention"
  | "mapping-required"
  | "ready-for-review"
  | "projections-created"
  | "archived"
  | "unavailable";

export const PREPARATION_STATUS_LABELS: Record<PreparationPlatformStatus, string> = {
  "draft":               "Draft",
  "needs-attention":     "Needs attention",
  "mapping-required":    "Mapping required",
  "ready-for-review":    "Ready for review",
  "projections-created": "Draft Projections created",
  "archived":            "Archived",
  "unavailable":         "Unavailable",
};

/** Documents shows preparation state as SECONDARY to document status. */
export const PREPARATION_DOCUMENT_LABELS: Record<PreparationPlatformStatus, string> = {
  "draft":               "Preparation: Draft",
  "needs-attention":     "Preparation: Needs Attention",
  "mapping-required":    "Preparation: Mapping Required",
  "ready-for-review":    "Preparation: Ready for Review",
  "projections-created": "Preparation: Projections Created",
  "archived":            "Preparation: Archived",
  "unavailable":         "Preparation: Unavailable",
};

export type PreparationAttentionReason =
  | "invalid-recipient-data"
  | "duplicate-recipient"
  | "missing-role-mapping"
  | "no-recipients"
  | "restricted-source";

export const PREPARATION_ATTENTION_LABELS: Record<PreparationAttentionReason, string> = {
  "invalid-recipient-data": "Recipient data needs correcting",
  "duplicate-recipient":    "Duplicate recipients",
  "missing-role-mapping":   "Role mapping incomplete",
  "no-recipients":          "No recipients added yet",
  "restricted-source":      "Recipient source unavailable",
};

/**
 * Maps the batch's own status onto the platform vocabulary. Centralized so no
 * surface reinterprets a status for itself.
 *
 * A PURE MAPPING. It does not re-derive readiness from role mappings or issue
 * counts — the Bulk Send service already does that in `refresh()`, and a second
 * derivation here would silently disagree with the feature's own screens. The
 * first version of this function inspected `roleMappings` directly and reported
 * a batch the service considered ready as "Mapping required".
 *
 * Deliberately avoids "Sent", "Delivered", "Signed" and "Completed" — a batch
 * never reaches any of those states, and Documents already owns that vocabulary.
 */
function toPlatformStatus(s: BulkSendBatchStatus): PreparationPlatformStatus {
  switch (s) {
    case "archived":                  return "archived";
    case "unavailable":               return "unavailable";
    case "draft-projections-created":
    case "partially-projected":       return "projections-created";
    case "mapping-required":          return "mapping-required";
    // `invalid` and `needs-review` both mean the batch cannot proceed until
    // someone looks at the rows.
    case "invalid":
    case "needs-review":              return "needs-attention";
    case "ready-in-demonstration":    return "ready-for-review";
    case "draft":
    case "recipients-added":
    case "validation-required":       return "draft";
  }
}

// ── The projection ────────────────────────────────────────────────────────────

/**
 * Every field here is safe to place in a search result, a dashboard count, a
 * report row, a notification body, or a URL.
 *
 * NEVER present, by construction: recipient names, email addresses,
 * organizations, Contact IDs, Contact Group membership, pasted text, CSV cell
 * values, source file names, private request messages, authentication or consent
 * values, Policy internals, Automation expressions, access links, or tokens.
 */
export interface PreparationPlatformSummary {
  batchId:        string;
  /** The batch's own name. User-authored, plain text, never a recipient value. */
  title:          string;
  status:         PreparationPlatformStatus;
  statusLabel:    string;
  /** The underlying batch status label, for surfaces that want the raw state. */
  batchStatusLabel: string;
  templateName:   string | null;
  teamName:       string | null;
  includedRows:   number;
  readyRows:      number;
  issueCount:     number;
  duplicateCount: number;
  attention:      PreparationAttentionReason[];
  needsAttention: boolean;
  readyForReview: boolean;
  updatedAtDemonstration: string;
  /** Authorization filtering only. Never rendered. */
  workspaceId:    string;
  /** Canonical destination. Built here, never assembled by a surface. */
  route:          string;
}

// ── Route builders ────────────────────────────────────────────────────────────
//
// Centralized so no surface hand-assembles a path, and so no private value can be
// appended to one. Batch IDs are opaque and URL-encoded.

const isSafeId = (id: string) => /^[A-Za-z0-9_-]{1,64}$/.test(id);

export function preparationRoute(batchId: string): string {
  return isSafeId(batchId) ? `/app/bulk-send/${encodeURIComponent(batchId)}` : "/app/bulk-send";
}
export function preparationRecipientsRoute(batchId: string): string {
  return isSafeId(batchId) ? `/app/bulk-send/${encodeURIComponent(batchId)}/recipients` : "/app/bulk-send";
}
export function preparationMappingRoute(batchId: string): string {
  return isSafeId(batchId) ? `/app/bulk-send/${encodeURIComponent(batchId)}/mapping` : "/app/bulk-send";
}
export function preparationReviewRoute(batchId: string): string {
  return isSafeId(batchId) ? `/app/bulk-send/${encodeURIComponent(batchId)}/review` : "/app/bulk-send";
}
export const PREPARATION_LIST_ROUTE = "/app/bulk-send";

// ── Building summaries ────────────────────────────────────────────────────────

/**
 * Reads the Bulk Send service's own validated snapshot. Workspace and team
 * scoping, and validation, are the service's — this function only narrows the
 * result to a shape that is safe to publish.
 *
 * It must NOT read `BULK_SEND_BATCH_FIXTURES` directly: fixtures ship with an
 * empty validation summary and no role mappings, so a fixture-backed projection
 * reports every batch as issue-free and unmapped. The probe caught exactly that.
 */
export function buildPlatformSummaries(workspaceId: string, teamId: string | null = null): PreparationPlatformSummary[] {
  if (!isPreparationPlatformVisible()) return [];
  if (!workspaceId) return [];

  return bulkSendService.snapshotForPlatform(workspaceId, teamId)
    .map((b) => {
      const v = b.validation;
      const issueCount = (v?.warning ?? 0) + (v?.incomplete ?? 0) + (v?.duplicate ?? 0);
      const status = toPlatformStatus(b.status);

      const attention: PreparationAttentionReason[] = [];
      if (b.rows.length === 0 && b.status !== "archived") attention.push("no-recipients");
      if ((v?.incomplete ?? 0) > 0) attention.push("invalid-recipient-data");
      if ((v?.duplicate ?? 0) > 0) attention.push("duplicate-recipient");
      // Taken from the service's own status, not re-derived from role mappings.
      if (status === "mapping-required") attention.push("missing-role-mapping");
      if ((v?.restricted ?? 0) > 0) attention.push("restricted-source");

      return {
        batchId: String(b.id),
        title: b.name,
        status,
        statusLabel: PREPARATION_STATUS_LABELS[status],
        batchStatusLabel: BULK_SEND_BATCH_STATUS_LABELS[b.status],
        templateName: b.templateName ?? null,
        teamName: b.scope.teamName ?? null,
        includedRows: b.rows.filter((r) => !r.excluded).length,
        readyRows: v?.ready ?? 0,
        issueCount,
        duplicateCount: v?.duplicate ?? 0,
        attention,
        needsAttention: status === "needs-attention" || status === "mapping-required",
        readyForReview: status === "ready-for-review",
        updatedAtDemonstration: b.updatedAtDemonstration,
        workspaceId: b.scope.workspaceId,
        route: preparationRoute(String(b.id)),
      };
    });
}

// ── Aggregate views ───────────────────────────────────────────────────────────

export interface PreparationAttentionSummary {
  total:          number;
  needsAttention: number;
  readyForReview: number;
  mappingRequired: number;
  withDuplicates: number;
  totalIssues:    number;
}

export function buildAttentionSummary(items: PreparationPlatformSummary[]): PreparationAttentionSummary {
  return {
    total: items.length,
    needsAttention: items.filter((i) => i.status === "needs-attention").length,
    readyForReview: items.filter((i) => i.readyForReview).length,
    mappingRequired: items.filter((i) => i.status === "mapping-required").length,
    withDuplicates: items.filter((i) => i.duplicateCount > 0).length,
    totalIssues: items.reduce((n, i) => n + i.issueCount, 0),
  };
}

// ── Report projection ─────────────────────────────────────────────────────────

export interface PreparationReportRow {
  title:        string;
  statusLabel:  string;
  templateName: string;
  teamName:     string;
  includedRows: number;
  readyRows:    number;
  issueCount:   number;
  updatedAtDemonstration: string;
}

/** Report rows carry no recipient data — only counts and safe labels. */
export function buildReportRows(items: PreparationPlatformSummary[]): PreparationReportRow[] {
  return items.map((i) => ({
    title: i.title,
    statusLabel: i.statusLabel,
    templateName: i.templateName ?? "None",
    teamName: i.teamName ?? "Whole workspace",
    includedRows: i.includedRows,
    readyRows: i.readyRows,
    issueCount: i.issueCount,
    updatedAtDemonstration: i.updatedAtDemonstration,
  }));
}

export interface PreparationSourceMix { label: string; count: number }

export function buildSourceMix(workspaceId: string): PreparationSourceMix[] {
  if (!isPreparationPlatformVisible()) return [];
  if (!workspaceId) return [];
  const counts = new Map<string, number>();
  for (const b of bulkSendService.snapshotForPlatform(workspaceId)) {
    const src = b.schema?.source;
    if (!src) continue;
    const label = src.replace(/-/g, " ");
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

// ── Honest language ───────────────────────────────────────────────────────────

export const PREPARATION_DEMONSTRATION_NOTICE =
  "Counts come from the current frontend demonstration state. No production report was " +
  "generated, no search index was synchronized, and no recipient was notified.";

export const PREPARATION_NOTIFICATION_NOTICE =
  "This is an in-app notification preview. No email, SMS message, or push notification was " +
  "delivered, and no reminder was scheduled.";

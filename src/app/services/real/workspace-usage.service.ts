// A workspace's usage for the current calendar month, and in total.
//
//   GET /workspaces/:id/usage → WorkspaceUsage (times are epoch ms)
//
// Counts only — no limits. Limits come from the plan (config/pricing.config),
// and during Early Access none is applied.

import { apiRequest } from "../api-client";

export interface WorkspaceUsage {
  readonly period: { readonly start: number; readonly end: number };
  readonly documents: { readonly total: number; readonly uploadedThisMonth: number };
  readonly signingRequests: {
    readonly sentThisMonth: number;
    readonly sentTotal: number;
    readonly inProgress: number;
    readonly completedThisMonth: number;
    readonly completedTotal: number;
  };
  readonly members: number;
  readonly templates: number;
  readonly contacts: number;
  readonly verificationsThisMonth: number;
  readonly storageBytes: number;
}

const n = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

/** Missing or malformed figures read as 0 rather than breaking the page. */
export function normalizeWorkspaceUsage(raw: unknown, now = Date.now()): WorkspaceUsage {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const obj = (v: unknown) => (typeof v === "object" && v !== null ? v : {}) as Record<string, unknown>;
  const period = obj(r.period);
  const docs = obj(r.documents);
  const sr = obj(r.signingRequests);
  const today = new Date(now);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1).getTime();
  return {
    period: {
      start: typeof period.start === "number" ? period.start : monthStart,
      end: typeof period.end === "number" ? period.end : monthEnd,
    },
    documents: { total: n(docs.total), uploadedThisMonth: n(docs.uploadedThisMonth) },
    signingRequests: {
      sentThisMonth: n(sr.sentThisMonth), sentTotal: n(sr.sentTotal), inProgress: n(sr.inProgress),
      completedThisMonth: n(sr.completedThisMonth), completedTotal: n(sr.completedTotal),
    },
    members: n(r.members),
    templates: n(r.templates),
    contacts: n(r.contacts),
    verificationsThisMonth: n(r.verificationsThisMonth),
    storageBytes: n(r.storageBytes),
  };
}

class RealWorkspaceUsageService {
  async get(workspaceId: string): Promise<WorkspaceUsage> {
    return normalizeWorkspaceUsage(
      await apiRequest<unknown>(`/workspaces/${encodeURIComponent(workspaceId)}/usage`));
  }
}

export const realWorkspaceUsageService = new RealWorkspaceUsageService();

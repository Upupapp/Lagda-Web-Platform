// Bulk Send overview — /app/bulk-send
// Batch list, search, filters, sorting, empty and restricted states.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Plus, Search, Settings2 } from "lucide-react";
import { AppContent } from "../../../components/platform/AppContentLayout";
import { PageHeader } from "../../../components/platform/PageHeader";
import { CapabilityUnavailable } from "../../../components/platform/CapabilityUnavailable";
import {
  BULK_SEND_STYLES, BS, GF, TONES, BatchStatusPill, CountChip, EmptyState,
  Notice, SectionHeading, Skeleton, useAnnouncer,
} from "../../../components/bulk-send/BulkSendKit";
import { useBulkSendContext } from "./useBulkSend";
import { bulkSendService } from "../../../services/mock/bulk-send.service";
import type { BulkSendBatchSummary, BulkSendQuery } from "../../../models/bulk-send";
import {
  BULK_SEND_BATCH_STATUS_LABELS, BULK_SEND_DEMONSTRATION_NOTICE, BULK_SEND_SCOPE_NOTICE,
  BULK_SEND_SORT_LABELS, DEFAULT_BULK_SEND_QUERY, VALID_BULK_SEND_BATCH_STATUSES,
  VALID_BULK_SEND_SORTS, parseBatchStatusFilter, parseBulkSendSort,
} from "../../../models/bulk-send";

export function BulkSendOverviewPage() {
  const { capability, permissions, ctx } = useBulkSendContext();
  const [params, setParams] = useSearchParams();
  const { announce, announcerNode } = useAnnouncer();

  const [batches, setBatches] = useState<BulkSendBatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Every query value is validated; unsupported values fall back to a safe default.
  const query: BulkSendQuery = useMemo(() => ({
    ...DEFAULT_BULK_SEND_QUERY,
    q: (params.get("q") ?? "").slice(0, 120),
    status: parseBatchStatusFilter(params.get("status")),
    sort: parseBulkSendSort(params.get("sort")),
    hasWarnings: params.get("hasWarnings") === "1",
    hasExclusions: params.get("hasExclusions") === "1",
  }), [params]);

  const setQuery = useCallback((patch: Record<string, string | null | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === "" || v === "all") next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    if (!capability.available || !permissions.canViewBulkSend) return;
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);

    bulkSendService.listBatches(query, { ...ctx, signal: controller.signal }).then(result => {
      if (cancelled) return;
      if (result.ok) setBatches(result.data);
      else if (result.code !== "CANCELLED") setError(result.message);
    }).catch(() => { if (!cancelled) setError("Bulk Send could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; controller.abort(); };
  }, [query, capability.available, permissions.canViewBulkSend, ctx]);

  if (!capability.available) {
    return (
      <CapabilityUnavailable
        outcome={capability.outcome}
        reasonLabel={capability.reasonLabel}
        safeFallbackRoute={capability.safeFallbackRoute}
        title="Bulk Send Not Available"
      />
    );
  }
  if (!permissions.canViewBulkSend) {
    return (
      <CapabilityUnavailable
        outcome="unavailable-permission"
        reasonLabel="You do not have permission to view Bulk Send."
        safeFallbackRoute="/app/documents"
        title="Permission Required"
      />
    );
  }

  const totals = batches.reduce((acc, b) => ({
    total: acc.total + 1,
    ready: acc.ready + (b.status === "ready-in-demonstration" ? 1 : 0),
    review: acc.review + (b.status === "needs-review" || b.status === "mapping-required" ? 1 : 0),
    projected: acc.projected + b.draftProjections,
  }), { total: 0, ready: 0, review: 0, projected: 0 });

  const filtersActive = query.q !== "" || query.status !== "all" || query.hasWarnings || query.hasExclusions;

  return (
    <div className="bs-root">
      <style>{BULK_SEND_STYLES}</style>
      {announcerNode}
      <PageHeader title="Bulk Send" />
      <AppContent>
        <div className="bs-stack">
          <SectionHeading
            level={1}
            title="Bulk Send"
            description="Prepare the same approved Template for multiple recipient rows, validate mappings, and create frontend Draft Projections."
            action={permissions.canCreateBatch ? (
              <Link to="/app/bulk-send/new" className="bs-btn bs-btn-primary">
                <Plus size={16} aria-hidden /> New Batch
              </Link>
            ) : undefined}
          />

          {capability.preview && <Notice text={capability.reasonLabel} tone={TONES.azure} />}
          <Notice text={BULK_SEND_DEMONSTRATION_NOTICE} />

          {/* ── Status summary ─────────────────────────────────────────── */}
          <div className="bs-row" style={{ gap: 10 }}>
            <CountChip label="Batches" value={totals.total} tone={TONES.neutral} />
            <CountChip label="Ready" value={totals.ready} tone={TONES.success} />
            <CountChip label="Need review" value={totals.review} tone={TONES.warning} />
            <CountChip label="Draft Projections" value={totals.projected} tone={TONES.azure} />
          </div>

          {/* ── Search + filters ───────────────────────────────────────── */}
          <div className="bs-panel">
            <div className="bs-row" style={{ gap: 12 }}>
              <div className="bs-row" style={{ gap: 8, flex: "1 1 240px", minWidth: 0 }}>
                <Search size={16} color={BS.slate5} aria-hidden />
                <label htmlFor="bs-search" className="bs-visually-hidden">Search batches</label>
                <input
                  id="bs-search" className="bs-input" type="search"
                  placeholder="Search by batch, Template, Team, or sender"
                  defaultValue={query.q}
                  onChange={e => setQuery({ q: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="bs-status" className="bs-visually-hidden">Filter by status</label>
                <select id="bs-status" className="bs-select" value={query.status}
                  onChange={e => setQuery({ status: e.target.value })} style={{ width: "auto", minWidth: 170 }}>
                  <option value="all">All statuses</option>
                  {VALID_BULK_SEND_BATCH_STATUSES.map(s => (
                    <option key={s} value={s}>{BULK_SEND_BATCH_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="bs-sort" className="bs-visually-hidden">Sort batches</label>
                <select id="bs-sort" className="bs-select" value={query.sort}
                  onChange={e => setQuery({ sort: e.target.value })} style={{ width: "auto", minWidth: 170 }}>
                  {VALID_BULK_SEND_SORTS.map(s => (
                    <option key={s} value={s}>{BULK_SEND_SORT_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bs-row" style={{ gap: 16, marginTop: 12 }}>
              <label className="bs-row" style={{ ...GF, gap: 8, fontSize: 13, color: BS.slate6, minHeight: 44, cursor: "pointer" }}>
                <input type="checkbox" checked={query.hasWarnings} style={{ width: 18, height: 18 }}
                  onChange={e => setQuery({ hasWarnings: e.target.checked ? "1" : null })} />
                Has warnings
              </label>
              <label className="bs-row" style={{ ...GF, gap: 8, fontSize: 13, color: BS.slate6, minHeight: 44, cursor: "pointer" }}>
                <input type="checkbox" checked={query.hasExclusions} style={{ width: 18, height: 18 }}
                  onChange={e => setQuery({ hasExclusions: e.target.checked ? "1" : null })} />
                Has exclusions
              </label>
              {filtersActive && (
                <button type="button" className="bs-btn bs-btn-ghost bs-btn-sm"
                  onClick={() => { setParams(new URLSearchParams(), { replace: true }); announce("Filters cleared."); }}>
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* ── List ───────────────────────────────────────────────────── */}
          {loading && <Skeleton label="Loading Bulk Send batches" />}

          {!loading && error && (
            <EmptyState
              title="Bulk Send Could Not Be Loaded"
              body={error}
              actions={<>
                <button type="button" className="bs-btn bs-btn-secondary" onClick={() => setParams(new URLSearchParams(params))}>Retry</button>
                <Link to="/app/dashboard" className="bs-btn bs-btn-primary">Return to Dashboard</Link>
              </>}
            />
          )}

          {!loading && !error && batches.length === 0 && (
            filtersActive ? (
              <EmptyState
                title="No batches match this search"
                body="Adjust the filters, or clear them to see every batch in this Workspace."
                actions={<button type="button" className="bs-btn bs-btn-secondary"
                  onClick={() => setParams(new URLSearchParams(), { replace: true })}>Clear Filters</button>}
              />
            ) : (
              <EmptyState
                title="No batches yet"
                body="A batch pairs one approved Template with many recipient rows. You validate the mappings, then create frontend Draft Projections you can open in Documents."
                actions={<>
                  {permissions.canCreateBatch && (
                    <Link to="/app/bulk-send/new" className="bs-btn bs-btn-primary">
                      <Plus size={16} aria-hidden /> Create Batch
                    </Link>
                  )}
                  <Link to="/app/bulk-send/saved-configurations" className="bs-btn bs-btn-secondary">
                    <Settings2 size={16} aria-hidden /> Open Saved Configurations
                  </Link>
                </>}
              />
            )
          )}

          {!loading && !error && batches.length > 0 && (
            <>
              {/* Desktop table */}
              <div className="bs-card bs-scroll-x bs-desktop-only">
                <table className="bs-table">
                  <caption className="bs-visually-hidden">
                    Bulk Send batches in this Workspace, with row counts and Draft Projection totals.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Batch</th>
                      <th scope="col">Status</th>
                      <th scope="col">Template</th>
                      <th scope="col">Team</th>
                      <th scope="col">Rows</th>
                      <th scope="col">Ready</th>
                      <th scope="col">Warnings</th>
                      <th scope="col">Excluded</th>
                      <th scope="col">Draft Projections</th>
                      <th scope="col"><span className="bs-visually-hidden">Open</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map(b => (
                      <tr key={String(b.id)}>
                        <td style={{ overflowWrap: "anywhere" }}>
                          <Link to={`/app/bulk-send/${b.id}`} style={{ ...GF, color: BS.azure, fontWeight: 600, textDecoration: "none" }}>
                            {b.name}
                          </Link>
                        </td>
                        <td><BatchStatusPill status={b.status} /></td>
                        <td style={{ overflowWrap: "anywhere" }}>{b.templateName ?? "—"}</td>
                        <td>{b.teamName ?? "Workspace"}</td>
                        <td>{b.totalRows}</td>
                        <td>{b.readyRows}</td>
                        <td>{b.warningRows}</td>
                        <td>{b.excludedRows}</td>
                        <td>{b.draftProjections}</td>
                        <td>
                          <Link to={`/app/bulk-send/${b.id}`} className="bs-btn bs-btn-secondary bs-btn-sm">Open</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards — same data, no horizontal scrolling */}
              <ul className="bs-mobile-only" style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {batches.map(b => (
                  <li key={String(b.id)} className="bs-card" style={{ padding: 14 }}>
                    <p style={{ ...GF, margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: BS.navy, overflowWrap: "anywhere" }}>
                      {b.name}
                    </p>
                    <div className="bs-row" style={{ gap: 6, marginBottom: 10 }}>
                      <BatchStatusPill status={b.status} />
                    </div>
                    <p style={{ ...GF, margin: "0 0 10px", fontSize: 12, color: BS.slate5, lineHeight: 1.6 }}>
                      {b.templateName ?? "No Template"} · {b.teamName ?? "Workspace"}<br />
                      {b.totalRows} rows · {b.readyRows} ready · {b.warningRows} warnings · {b.draftProjections} Draft Projections
                    </p>
                    <Link to={`/app/bulk-send/${b.id}`} className="bs-btn bs-btn-secondary bs-btn-sm">Open Batch</Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="bs-row" style={{ gap: 10 }}>
            <Link to="/app/bulk-send/saved-configurations" className="bs-btn bs-btn-secondary bs-btn-sm">
              <Settings2 size={15} aria-hidden /> Saved Configurations
            </Link>
          </div>

          <Notice text={BULK_SEND_SCOPE_NOTICE} compact />
        </div>
      </AppContent>
    </div>
  );
}

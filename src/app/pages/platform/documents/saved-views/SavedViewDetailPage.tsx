// Command 31 — Saved View Detail Page.
// Route: /app/documents/saved-views/:viewId
// Shows definition and applies the saved view to the document list.
// No mutation. No eNotary. No Burgundy. No localStorage.

import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  BookOpen, FileText, AlertCircle, RefreshCw, Info,
  AlertTriangle, Star, ArrowLeft, X, ChevronRight,
} from "lucide-react";
import { AppContent, PageHeader, EmptyStateLayout, SkeletonBlock, SKELETON_STYLE } from "../../../../components/platform";
import { documentOrganizationService } from "../../../../services/mock/document-organization.service";
import { mockDocumentService } from "../../../../services/mock/document.service";
import type { OrgSavedView, OrgViewId } from "../../../../models/document-organization";
import type { DocumentListItem } from "../../../../models/documents";
import { TRANSACTION_STATUS_LABELS } from "../../../../models";
import { usePageMeta } from "../../../../hooks/usePageMeta";

const GF    = { fontFamily: "'Geist', sans-serif" } as React.CSSProperties;
const AZURE  = "#0078D4";
const NAVY   = "#07111F";
const SLATE6 = "#64748B";
const SLATE4 = "#94A3B8";
const SLATE2 = "#E2E8F0";
const AMBER  = "#D97706";
const RED    = "#DC2626";

const STYLES = SKELETON_STYLE + `
  .svd-row {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; border-bottom: 1px solid #F1F5F9;
  }
  .svd-row:last-child { border-bottom: none; }
  .svd-row:hover { background: #F8FAFC; }
  .svd-def-row { display: flex; gap: 8px; padding: "6px 0"; }
`;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return fmtDate(iso);
}

// ── Definition display ────────────────────────────────────────────────────────

function DefinitionSection({ view }: { view: OrgSavedView }) {
  const { filters, sort, sortDir, grouping } = view.definition;
  const rows: Array<{ label: string; value: string }> = [
    { label: "Sort", value: `${sort} — ${sortDir === "asc" ? "ascending" : "descending"}` },
    { label: "Group by", value: grouping === "none" ? "No grouping" : grouping },
  ];
  if (filters.statuses?.length) rows.unshift({ label: "Statuses", value: filters.statuses.map(s => TRANSACTION_STATUS_LABELS[s] ?? s).join(", ") });
  if (filters.folderId)         rows.unshift({ label: "Folder filter", value: filters.folderId });
  if (filters.tagIds?.length)   rows.unshift({ label: "Tags", value: `${filters.tagIds.length} tag(s)` });
  if (filters.q)                rows.unshift({ label: "Search", value: `"${filters.q}"` });
  if (filters.ownerId)          rows.unshift({ label: "Owner", value: filters.ownerId });
  if (filters.dateFrom)         rows.push({ label: "Date from", value: filters.dateFrom });
  if (filters.dateTo)           rows.push({ label: "Date to", value: filters.dateTo });

  return (
    <section aria-labelledby="view-def-heading" style={{ marginBottom: 20 }}>
      <h2 id="view-def-heading" style={{ fontSize: 12, fontWeight: 700, color: SLATE6, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px", ...GF }}>View Definition</h2>
      <div style={{ border: `1px solid ${SLATE2}`, borderRadius: 10, overflow: "hidden" }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: "flex", gap: 16, padding: "9px 14px", borderBottom: i < rows.length - 1 ? `1px solid #F1F5F9` : "none", background: i % 2 === 0 ? "#F8FAFC" : "#fff" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: SLATE6, width: 120, flexShrink: 0, ...GF }}>{row.label}</span>
            <span style={{ fontSize: 12, color: NAVY, ...GF }}>{row.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── SavedViewDetailPage ───────────────────────────────────────────────────────

export function SavedViewDetailPage() {
  usePageMeta();
  const { viewId } = useParams<{ viewId: string }>();
  const navigate   = useNavigate();

  const [view, setView]       = useState<OrgSavedView | null>(null);
  const [docs, setDocs]       = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [toast, setToast]     = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    if (!viewId) return;
    setLoading(true);
    setError(null);
    try {
      const viewResult = documentOrganizationService.getSavedView(viewId as OrgViewId);
      if (!viewResult.ok) { setError(viewResult.error.message); setLoading(false); return; }
      const sv = viewResult.data;
      setView(sv);

      // Apply the view's sort to the full list to demonstrate the saved configuration.
      const listResult = await mockDocumentService.list({
        view: "all",
        q: sv.definition.filters.q ?? "",
        folderId: sv.definition.filters.folderId ?? null,
        tagId: sv.definition.filters.tagIds?.[0] ?? null,
        sort: sv.definition.sort as never,
        dir: sv.definition.sortDir as never,
        page: 1,
      }, "standard");
      setDocs(listResult.items.slice(0, 10));
    } catch {
      setError("Could not load saved view details.");
    } finally {
      setLoading(false);
    }
  }, [viewId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function handleSetDefault() {
    if (!view) return;
    const r = documentOrganizationService.setDefaultSavedView(view.id);
    if (r.ok) { setView(r.data); setToast({ msg: `"${view.name}" set as default view.`, type: "success" }); }
    else setToast({ msg: r.error.message, type: "error" });
  }

  function handleOpenInDocuments() {
    if (!view) return;
    const params = new URLSearchParams();
    if (view.definition.filters.q)                    params.set("q", view.definition.filters.q);
    if (view.definition.filters.folderId)             params.set("folder", view.definition.filters.folderId);
    if (view.definition.filters.tagIds?.[0])          params.set("tag", view.definition.filters.tagIds[0]);
    if (view.definition.sort !== "updated")           params.set("sort", view.definition.sort);
    if (view.definition.sortDir !== "desc")           params.set("dir", view.definition.sortDir);
    navigate(`/app/documents?${params.toString()}`);
  }

  if (loading) {
    return (
      <>
        <style>{STYLES}</style>
        <PageHeader title="Saved View" breadcrumbs={[{ label: "Documents", to: "/app/documents" }, { label: "Saved Views", to: "/app/documents/saved-views" }, { label: "Loading…" }]} />
        <AppContent style={{ padding: "24px" }}>
          <div role="status" aria-label="Loading view" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SkeletonBlock height={24} width="40%" />
            <SkeletonBlock height={80} />
            {[1, 2, 3].map(i => <SkeletonBlock key={i} height={44} />)}
          </div>
        </AppContent>
      </>
    );
  }

  if (error || !view) {
    return (
      <>
        <style>{STYLES}</style>
        <PageHeader title="Saved View" breadcrumbs={[{ label: "Documents", to: "/app/documents" }, { label: "Saved Views", to: "/app/documents/saved-views" }]} />
        <AppContent style={{ padding: "48px 24px", textAlign: "center" }}>
          <AlertCircle size={32} style={{ color: RED, marginBottom: 12 }} aria-hidden />
          <p style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: "0 0 8px", ...GF }}>{error ?? "View not found"}</p>
          <Link to="/app/documents/saved-views" style={{ fontSize: 13, color: AZURE, ...GF, textDecoration: "underline" }}>Back to Saved Views</Link>
        </AppContent>
      </>
    );
  }

  const isArchived = view.status === "archived";
  const isStale    = view.status === "stale";

  return (
    <>
      <style>{STYLES}</style>
      <PageHeader
        title={view.name}
        breadcrumbs={[
          { label: "Documents", to: "/app/documents" },
          { label: "Saved Views", to: "/app/documents/saved-views" },
          { label: view.name },
        ]}
        primaryAction={
          <div style={{ display: "flex", gap: 8 }}>
            {!view.isDefault && !isArchived && (
              <button onClick={handleSetDefault} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: `1px solid ${SLATE2}`, background: "#fff", cursor: "pointer", fontSize: 13, color: SLATE6, ...GF }}>
                <Star size={13} aria-hidden /> Set as Default
              </button>
            )}
            {!isArchived && (
              <button onClick={handleOpenInDocuments} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "none", background: AZURE, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, ...GF }}>
                Open in Documents
              </button>
            )}
          </div>
        }
      />
      <AppContent style={{ padding: "0 24px 32px" }}>

        {/* Status badges */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {view.isDefault && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "#EFF6FF", color: AZURE, border: "1px solid #BFDBFE", ...GF, display: "flex", alignItems: "center", gap: 4 }}>
              <Star size={10} aria-hidden /> Default view
            </span>
          )}
          {isArchived && <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "#FFFBEB", color: AMBER, border: "1px solid #FDE68A", ...GF }}>Archived</span>}
          {isStale    && <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "#FFFBEB", color: AMBER, border: "1px solid #FDE68A", ...GF, display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={10} aria-hidden /> Stale</span>}
          <span style={{ fontSize: 11, color: SLATE4, padding: "2px 0", ...GF }}>Updated {fmtDate(view.updatedAt)}</span>
        </div>

        {/* Demo notice */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#EFF6FF", border: "1px solid #BFDBFE", margin: "0 0 16px", ...GF }}>
          <Info size={14} style={{ color: AZURE, flexShrink: 0, marginTop: 1 }} aria-hidden />
          <p style={{ fontSize: 12, color: "#1E40AF", margin: 0 }}>
            This is a personal saved view — a named configuration of filters, sort, and grouping. It does not change document permissions, status, or legal records. Document results below are a demonstration preview applying this view's definition.
          </p>
        </div>

        {/* Stale reasons */}
        {isStale && view.staleReasons && view.staleReasons.length > 0 && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#FFFBEB", border: "1px solid #FDE68A", margin: "0 0 16px", ...GF }}>
            <AlertTriangle size={14} style={{ color: AMBER, flexShrink: 0, marginTop: 1 }} aria-hidden />
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#92400E", margin: "0 0 4px", ...GF }}>This view references removed or archived resources:</p>
              {view.staleReasons.map((r, i) => <p key={i} style={{ fontSize: 12, color: "#92400E", margin: 0, ...GF }}>• {r}</p>)}
            </div>
          </div>
        )}

        {/* Definition */}
        <DefinitionSection view={view} />

        {/* Preview documents */}
        <section aria-labelledby="preview-docs-heading">
          <h2 id="preview-docs-heading" style={{ fontSize: 12, fontWeight: 700, color: SLATE6, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px", ...GF }}>
            Preview — Documents this View Would Show
          </h2>
          <div style={{ border: `1px solid ${SLATE2}`, borderRadius: 10, overflow: "hidden" }}>
            {docs.length === 0 ? (
              <EmptyStateLayout
                icon={<FileText size={24} />}
                title="No documents in preview"
                description="The demonstration document list returned no results for this view's configuration."
              />
            ) : (
              docs.map(doc => (
                <div key={doc.id} className="svd-row">
                  <FileText size={14} style={{ color: SLATE4, flexShrink: 0 }} aria-hidden />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link to={`/app/documents/${doc.id}`} style={{ fontSize: 13, fontWeight: 600, color: NAVY, textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...GF }} title={doc.title}>
                      {doc.title}
                    </Link>
                    <span style={{ fontSize: 11, color: SLATE4, ...GF }}>{fmtRelative(doc.updatedAt)}</span>
                  </div>
                  <span style={{ fontSize: 11, color: SLATE6, ...GF }}>{doc.status}</span>
                  <Link to={`/app/documents/${doc.id}`} style={{ fontSize: 12, color: AZURE, ...GF, textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
                    Open <ChevronRight size={11} aria-hidden />
                  </Link>
                </div>
              ))
            )}
          </div>
          <p style={{ fontSize: 11, color: SLATE4, margin: "8px 0 0", ...GF }}>
            Showing up to 10 demonstration results. Open in Documents for the full list.
          </p>
        </section>

        <div style={{ marginTop: 20 }}>
          <Link to="/app/documents/saved-views" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: SLATE6, ...GF, textDecoration: "none" }}>
            <ArrowLeft size={13} aria-hidden /> Back to Saved Views
          </Link>
        </div>
      </AppContent>

      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 300, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, ...GF, background: toast.type === "error" ? "#FEF2F2" : "#F0FDF4", color: toast.type === "error" ? "#991B1B" : "#166534", border: `1px solid ${toast.type === "error" ? "#FECACA" : "#BBF7D0"}`, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 8 }}>
          {toast.msg}
          <button onClick={() => setToast(null)} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit" }}><X size={13} aria-hidden /></button>
        </div>
      )}
    </>
  );
}

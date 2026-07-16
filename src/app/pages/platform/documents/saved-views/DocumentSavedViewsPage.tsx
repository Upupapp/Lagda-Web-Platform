// Command 31 — Document Saved Views Management Page.
// Route: /app/documents/saved-views
// Personal saved filter/sort/group configurations. Frontend-only.
// No eNotary views. No Burgundy. No localStorage. No real mutation.

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router";
import {
  BookOpen, Plus, Archive, RotateCcw, Pencil, Trash2, X,
  AlertCircle, RefreshCw, Info, Search, Copy, Star, AlertTriangle,
} from "lucide-react";
import { usePlatform } from "../../../../context/PlatformContext";
import { AppContent, PageHeader, EmptyStateLayout, SkeletonBlock, SKELETON_STYLE } from "../../../../components/platform";
import { documentOrganizationService } from "../../../../services/mock/document-organization.service";
import type { OrgSavedView, OrgViewId, OrgViewStatus } from "../../../../models/document-organization";
import { usePageMeta } from "../../../../hooks/usePageMeta";

const GF    = { fontFamily: "'Geist', sans-serif" } as React.CSSProperties;
const AZURE  = "#0078D4";
const NAVY   = "#07111F";
const SLATE6 = "#64748B";
const SLATE4 = "#94A3B8";
const SLATE2 = "#E2E8F0";
const AMBER  = "#D97706";
const GREEN  = "#16A34A";
const RED    = "#DC2626";
const GOLD   = "#C9960C";
const VIOLET = "#7C3AED";

const STYLES = SKELETON_STYLE + `
  .sv-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 14px;
  }
  .sv-card {
    border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px;
    background: #fff; display: flex; flex-direction: column; gap: 12px;
  }
  .sv-card-default { border-color: #BFDBFE; background: #EFF6FF; }
  .sv-card-stale   { border-color: #FDE68A; }
  .sv-card-archived { opacity: 0.65; }
  @media (prefers-reduced-motion: reduce) { .sv-card { transition: none !important; } }
`;

// ── Status badge ──────────────────────────────────────────────────────────────

function ViewStatusBadge({ status }: { status: OrgViewStatus }) {
  if (status === "active") return null;
  if (status === "archived") return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "#FFFBEB", color: AMBER, border: "1px solid #FDE68A", ...GF }}>Archived</span>
  );
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "#FFFBEB", color: AMBER, border: "1px solid #FDE68A", ...GF }}>Stale</span>
  );
}

// ── Filter summary ────────────────────────────────────────────────────────────

function ViewDefinitionSummary({ view }: { view: OrgSavedView }) {
  const { filters, sort, sortDir, grouping } = view.definition;
  const parts: string[] = [];
  if (filters.statuses?.length) parts.push(`Status: ${filters.statuses.join(", ")}`);
  if (filters.folderId)         parts.push("Folder filter");
  if (filters.tagIds?.length)   parts.push(`${filters.tagIds.length} tag${filters.tagIds.length > 1 ? "s" : ""}`);
  if (filters.q)                parts.push(`Search: "${filters.q}"`);
  parts.push(`Sort: ${sort} ${sortDir}`);
  if (grouping !== "none")      parts.push(`Group by: ${grouping}`);
  return (
    <p style={{ fontSize: 11, color: SLATE6, margin: 0, lineHeight: 1.5, ...GF }}>
      {parts.join(" · ")}
    </p>
  );
}

// ── SavedViewCard ─────────────────────────────────────────────────────────────

function SavedViewCard({
  view, onRename, onDuplicate, onSetDefault, onArchive, onRestore, onRemove,
}: {
  view: OrgSavedView;
  onRename: (v: OrgSavedView) => void;
  onDuplicate: (v: OrgSavedView) => void;
  onSetDefault: (v: OrgSavedView) => void;
  onArchive: (v: OrgSavedView) => void;
  onRestore: (v: OrgSavedView) => void;
  onRemove: (v: OrgSavedView) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const trigRef = useRef<HTMLButtonElement>(null);
  const isArchived = view.status === "archived";
  const isStale    = view.status === "stale";

  useEffect(() => {
    if (!menuOpen) return;
    function h(e: MouseEvent) { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); }
    function hk(e: KeyboardEvent) { if (e.key === "Escape") { setMenuOpen(false); trigRef.current?.focus(); } }
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", hk);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", hk); };
  }, [menuOpen]);

  const cardClass = `sv-card${view.isDefault ? " sv-card-default" : ""}${isStale ? " sv-card-stale" : ""}${isArchived ? " sv-card-archived" : ""}`;

  return (
    <article className={cardClass} aria-label={`Saved view: ${view.name}${view.isDefault ? " (default)" : ""}`}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Link
              to={`/app/documents/saved-views/${view.id}`}
              style={{ fontSize: 14, fontWeight: 600, color: NAVY, textDecoration: "none", ...GF, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {view.name}
            </Link>
            {view.isDefault && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "#EFF6FF", color: AZURE, border: "1px solid #BFDBFE", ...GF, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 3 }}>
                <Star size={9} aria-hidden /> Default
              </span>
            )}
            <ViewStatusBadge status={view.status} />
          </div>
        </div>
        <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            ref={trigRef}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Actions for ${view.name}`}
            onClick={() => setMenuOpen(o => !o)}
            style={{ width: 28, height: 28, border: "none", background: "none", cursor: "pointer", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: SLATE4 }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden>⋯</span>
          </button>
          {menuOpen && (
            <div role="menu" style={{ position: "absolute", right: 0, top: "100%", zIndex: 100, background: "#fff", border: `1px solid ${SLATE2}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 200, padding: "4px 0" }}>
              {!isArchived && (
                <>
                  <Link to={`/app/documents/saved-views/${view.id}`} role="menuitem"
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", fontSize: 13, color: NAVY, textDecoration: "none", ...GF }}>
                    <BookOpen size={13} aria-hidden /> Open View
                  </Link>
                  <button role="menuitem" onClick={() => { setMenuOpen(false); onRename(view); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: NAVY, ...GF, textAlign: "left" }}>
                    <Pencil size={13} aria-hidden /> Rename
                  </button>
                  <button role="menuitem" onClick={() => { setMenuOpen(false); onDuplicate(view); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: NAVY, ...GF, textAlign: "left" }}>
                    <Copy size={13} aria-hidden /> Duplicate
                  </button>
                  {!view.isDefault && (
                    <button role="menuitem" onClick={() => { setMenuOpen(false); onSetDefault(view); }}
                      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: NAVY, ...GF, textAlign: "left" }}>
                      <Star size={13} aria-hidden /> Set as Default
                    </button>
                  )}
                  <button role="menuitem" onClick={() => { setMenuOpen(false); onArchive(view); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: AMBER, ...GF, textAlign: "left" }}>
                    <Archive size={13} aria-hidden /> Archive
                  </button>
                </>
              )}
              {isArchived && (
                <button role="menuitem" onClick={() => { setMenuOpen(false); onRestore(view); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: GREEN, ...GF, textAlign: "left" }}>
                  <RotateCcw size={13} aria-hidden /> Restore
                </button>
              )}
              <div style={{ height: 1, background: SLATE2, margin: "4px 0" }} />
              <button role="menuitem" onClick={() => { setMenuOpen(false); onRemove(view); }}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: RED, ...GF, textAlign: "left" }}>
                <Trash2 size={13} aria-hidden /> Remove from Demonstration
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stale warning */}
      {isStale && view.staleReasons && view.staleReasons.length > 0 && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "7px 10px", borderRadius: 6, background: "#FFFBEB", border: "1px solid #FDE68A" }}>
          <AlertTriangle size={13} style={{ color: AMBER, flexShrink: 0, marginTop: 1 }} aria-hidden />
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#92400E", margin: "0 0 2px", ...GF }}>Stale view</p>
            {view.staleReasons.map((r, i) => (
              <p key={i} style={{ fontSize: 11, color: "#92400E", margin: 0, ...GF }}>{r}</p>
            ))}
          </div>
        </div>
      )}

      <ViewDefinitionSummary view={view} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: SLATE4, ...GF }}>
          Updated {new Date(view.updatedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        {!isArchived && (
          <Link
            to={`/app/documents/saved-views/${view.id}`}
            style={{ fontSize: 12, color: AZURE, ...GF, textDecoration: "none", fontWeight: 600 }}
          >
            Open →
          </Link>
        )}
      </div>
    </article>
  );
}

// ── Rename Dialog ─────────────────────────────────────────────────────────────

function RenameViewDialog({ view, onSave, onClose }: { view: OrgSavedView; onSave: (v: OrgSavedView) => void; onClose: () => void }) {
  const [name, setName] = useState(view.name);
  const [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => { ref.current?.focus(); ref.current?.select(); }, 50); }, []);
  useEffect(() => {
    function h(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) { setError("Name is required."); return; }
    const r = documentOrganizationService.renameSavedView(view.id, trimmed);
    if (!r.ok) { setError(r.error.message); return; }
    onSave(r.data);
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="rename-view-title"
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(7,17,31,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 400, width: "calc(100vw - 32px)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        <h2 id="rename-view-title" style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: "0 0 16px", ...GF }}>Rename Saved View</h2>
        <label htmlFor="rv-name" style={{ fontSize: 12, fontWeight: 600, color: SLATE6, display: "block", marginBottom: 4, ...GF }}>View name</label>
        <input id="rv-name" ref={ref} type="text" value={name} maxLength={120}
          onChange={e => { setName(e.target.value); setError(""); }}
          onKeyDown={e => { if (e.key === "Enter" && name.trim()) handleSave(); }}
          style={{ width: "100%", padding: "9px 12px", border: `1px solid ${error ? RED : SLATE2}`, borderRadius: 8, fontSize: 13, ...GF, color: NAVY, outline: "none", boxSizing: "border-box", marginBottom: error ? 2 : 20 }}
        />
        {error && <p style={{ fontSize: 11, color: RED, margin: "0 0 16px", ...GF }} role="alert">{error}</p>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${SLATE2}`, background: "#fff", cursor: "pointer", fontSize: 13, ...GF, color: SLATE6 }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: AZURE, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, ...GF }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── DocumentSavedViewsPage ────────────────────────────────────────────────────

export function DocumentSavedViewsPage() {
  usePageMeta();
  const { user, currentWorkspace } = usePlatform();

  const [views, setViews]           = useState<OrgSavedView[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [q, setQ]                   = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [renameTarget, setRenameTarget] = useState<OrgSavedView | null>(null);
  const [removeTarget, setRemoveTarget] = useState<OrgSavedView | null>(null);
  const [toast, setToast]           = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const userId      = user?.id ?? "usr_ana_reyes";
  const workspaceId = currentWorkspace?.id ?? "ws_northbridge_001";

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    try {
      const r = documentOrganizationService.listSavedViews(userId);
      if (r.ok) setViews(r.data);
      else setError(true);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [userId, workspaceId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(msg: string, type: "success" | "error" = "success") { setToast({ msg, type }); }

  const handleDuplicate = useCallback((view: OrgSavedView) => {
    const r = documentOrganizationService.duplicateSavedView(view.id);
    if (r.ok) { load(); showToast(`"${view.name}" duplicated.`); }
    else showToast(r.error.message, "error");
  }, [load]);

  const handleSetDefault = useCallback((view: OrgSavedView) => {
    const r = documentOrganizationService.setDefaultSavedView(view.id);
    if (r.ok) { load(); showToast(`"${view.name}" set as default view.`); }
    else showToast(r.error.message, "error");
  }, [load]);

  const handleArchive = useCallback((view: OrgSavedView) => {
    const r = documentOrganizationService.archiveSavedView(view.id);
    if (r.ok) { load(); showToast(`"${view.name}" archived.`); }
    else showToast(r.error.message, "error");
  }, [load]);

  const handleRestore = useCallback((view: OrgSavedView) => {
    const r = documentOrganizationService.restoreSavedView(view.id);
    if (r.ok) { load(); showToast(`"${view.name}" restored.`); }
    else showToast(r.error.message, "error");
  }, [load]);

  const handleRemove = useCallback((view: OrgSavedView) => {
    const r = documentOrganizationService.removeSavedViewDemonstration(view.id);
    if (r.ok) { load(); showToast(`"${view.name}" removed from demonstration.`); }
    else showToast(r.error.message, "error");
    setRemoveTarget(null);
  }, [load]);

  const filtered = useMemo(() => {
    let list = views;
    if (statusFilter === "active")   list = list.filter(v => v.status !== "archived");
    if (statusFilter === "archived") list = list.filter(v => v.status === "archived");
    if (q) list = list.filter(v => v.name.toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [views, statusFilter, q]);

  const defaultView = views.find(v => v.isDefault);
  const staleViews  = views.filter(v => v.status === "stale");

  return (
    <>
      <style>{STYLES}</style>
      <PageHeader
        title="Saved Views"
        breadcrumbs={[{ label: "Documents", href: "/app/documents" }, { label: "Saved Views" }]}
      />
      <AppContent style={{ padding: "0 24px 32px" }}>

        {/* Notice */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#EFF6FF", border: "1px solid #BFDBFE", margin: "0 0 16px", ...GF }}>
          <Info size={14} style={{ color: AZURE, flexShrink: 0, marginTop: 1 }} aria-hidden />
          <p style={{ fontSize: 12, color: "#1E40AF", margin: 0 }}>
            Saved views store named filter, sort, and grouping configurations. They are personal — not visible to other workspace members. They do not change document permissions or legal status. Retained for this frontend session.
          </p>
        </div>

        {/* Stale banner */}
        {staleViews.length > 0 && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#FFFBEB", border: "1px solid #FDE68A", margin: "0 0 16px", ...GF }}>
            <AlertTriangle size={14} style={{ color: AMBER, flexShrink: 0, marginTop: 1 }} aria-hidden />
            <p style={{ fontSize: 12, color: "#92400E", margin: 0 }}>
              {staleViews.length} saved view{staleViews.length > 1 ? "s reference" : " references"} archived or removed folders, tags, or teams. Review and update these views.
            </p>
          </div>
        )}

        {/* Stats bar */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          {defaultView && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: 12, color: "#1D4ED8", ...GF }}>
              <Star size={12} aria-hidden /> Default: {defaultView.name}
            </div>
          )}
          <div style={{ padding: "6px 12px", borderRadius: 8, background: "#F8FAFC", border: `1px solid ${SLATE2}`, fontSize: 12, color: NAVY, ...GF }}>
            {views.filter(v => v.status !== "archived").length} active view{views.filter(v => v.status !== "archived").length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 280 }}>
            <Search size={13} aria-hidden style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: SLATE4 }} />
            <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search views…"
              aria-label="Search saved views"
              style={{ width: "100%", padding: "7px 10px 7px 30px", border: `1px solid ${SLATE2}`, borderRadius: 8, fontSize: 13, ...GF, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as never)}
            aria-label="Filter by status"
            style={{ padding: "7px 10px", border: `1px solid ${SLATE2}`, borderRadius: 8, fontSize: 13, ...GF, color: NAVY, background: "#fff", cursor: "pointer" }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <button onClick={load} aria-label="Refresh" style={{ padding: "7px 10px", border: `1px solid ${SLATE2}`, borderRadius: 8, background: "#fff", cursor: "pointer", color: SLATE6, display: "flex", alignItems: "center" }}>
            <RefreshCw size={13} aria-hidden />
          </button>
        </div>

        {loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }} role="status" aria-label="Loading saved views">
            {[1, 2, 3].map(i => <SkeletonBlock key={i} height={140} radius={10} />)}
          </div>
        )}

        {!loading && error && (
          <div role="alert" style={{ padding: "32px 0", textAlign: "center" }}>
            <AlertCircle size={28} style={{ color: RED, marginBottom: 8 }} aria-hidden />
            <p style={{ fontSize: 14, color: NAVY, margin: "0 0 16px", ...GF }}>Could not load saved views</p>
            <button onClick={load} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${SLATE2}`, background: "#fff", cursor: "pointer", fontSize: 13, ...GF, color: SLATE6, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <RefreshCw size={13} aria-hidden /> Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          filtered.length === 0 ? (
            <EmptyStateLayout
              icon={<BookOpen size={26} />}
              title={q ? "No matching views" : "No saved views yet"}
              description={q ? "Try a different search." : "Save document filter and sort configurations as named views for quick access."}
            />
          ) : (
            <div className="sv-grid" role="list" aria-label="Saved views">
              {filtered.map(view => (
                <div key={view.id} role="listitem">
                  <SavedViewCard
                    view={view}
                    onRename={setRenameTarget}
                    onDuplicate={handleDuplicate}
                    onSetDefault={handleSetDefault}
                    onArchive={handleArchive}
                    onRestore={handleRestore}
                    onRemove={setRemoveTarget}
                  />
                </div>
              ))}
            </div>
          )
        )}
      </AppContent>

      {/* Rename dialog */}
      {renameTarget && (
        <RenameViewDialog
          view={renameTarget}
          onSave={v => { load(); setRenameTarget(null); showToast(`Renamed to "${v.name}".`); }}
          onClose={() => setRenameTarget(null)}
        />
      )}

      {/* Confirm remove dialog */}
      {removeTarget && (
        <div role="dialog" aria-modal="true" aria-labelledby="remove-view-title"
          style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(7,17,31,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) setRemoveTarget(null); }}
        >
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 420, width: "calc(100vw - 32px)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <h2 id="remove-view-title" style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: "0 0 12px", ...GF }}>Remove "{removeTarget.name}"</h2>
            <p style={{ fontSize: 13, color: SLATE6, margin: "0 0 20px", ...GF }}>
              Removes this saved view from the frontend demonstration. No documents or transactions are affected.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setRemoveTarget(null)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${SLATE2}`, background: "#fff", cursor: "pointer", fontSize: 13, ...GF, color: SLATE6 }}>Cancel</button>
              <button onClick={() => handleRemove(removeTarget)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: RED, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, ...GF }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 300, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, ...GF, background: toast.type === "error" ? "#FEF2F2" : "#F0FDF4", color: toast.type === "error" ? "#991B1B" : "#166534", border: `1px solid ${toast.type === "error" ? "#FECACA" : "#BBF7D0"}`, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 8, maxWidth: 360 }}>
          {toast.msg}
          <button onClick={() => setToast(null)} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit" }}><X size={13} aria-hidden /></button>
        </div>
      )}
    </>
  );
}

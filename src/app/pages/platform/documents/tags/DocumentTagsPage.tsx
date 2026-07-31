// Command 31 — Document Tags Management Page.
// Route: /app/documents/tags
// Workspace-scoped tags with design-system style tokens.
// No eNotary tags. No Burgundy. No localStorage. No raw hex input.

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Tag, Plus, Archive, RotateCcw, Pencil, Trash2, X,
  AlertCircle, RefreshCw, Info, Search,
} from "lucide-react";
import { usePlatform } from "../../../../context/PlatformContext";
import { AppContent, PageHeader, EmptyStateLayout, SkeletonBlock, SKELETON_STYLE } from "../../../../components/platform";
import { documentOrganizationService } from "../../../../services/mock/document-organization.service";
import type { OrgTag, OrgTagId, OrgTagStyle } from "../../../../models/document-organization";
import { TAG_STYLE_COLORS, TAG_STYLE_LABELS, VALID_TAG_STYLES } from "../../../../models/document-organization";
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

const STYLES = SKELETON_STYLE + `
  .tag-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
  }
  .tag-card {
    border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px;
    background: #fff; display: flex; flex-direction: column; gap: 10px;
  }
  .tag-card:hover { border-color: #CBD5E1; }
  @media (prefers-reduced-motion: reduce) { .tag-card { transition: none !important; } }
`;

// ── TagPreviewChip ─────────────────────────────────────────────────────────────

function TagPreviewChip({ name, style }: { name: string; style: OrgTagStyle }) {
  const color = TAG_STYLE_COLORS[style];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600,
      background: `${color}18`, color, border: `1px solid ${color}30`,
      ...GF,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} aria-hidden />
      {name || "Preview"}
    </span>
  );
}

// ── StylePicker ────────────────────────────────────────────────────────────────

function StylePicker({
  value, onChange, label = "Color style",
}: {
  value: OrgTagStyle;
  onChange: (s: OrgTagStyle) => void;
  label?: string;
}) {
  return (
    <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
      <legend style={{ fontSize: 12, fontWeight: 600, color: SLATE6, marginBottom: 6, ...GF }}>{label} *</legend>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {VALID_TAG_STYLES.map(s => {
          const color = TAG_STYLE_COLORS[s];
          const isSelected = s === value;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              aria-pressed={isSelected}
              aria-label={`${TAG_STYLE_LABELS[s]} color style`}
              title={TAG_STYLE_LABELS[s]}
              style={{
                width: 26, height: 26, borderRadius: 6, border: `2px solid ${isSelected ? NAVY : "transparent"}`,
                background: `${color}30`, cursor: "pointer", position: "relative",
                outline: isSelected ? `2px solid ${AZURE}` : "none",
                outlineOffset: 1,
              }}
            >
              <span style={{ display: "block", width: 14, height: 14, borderRadius: "50%", background: color, position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} aria-hidden />
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: SLATE4, margin: "4px 0 0", ...GF }}>
        Selected: <strong style={{ color: TAG_STYLE_COLORS[value] }}>{TAG_STYLE_LABELS[value]}</strong>
      </p>
    </fieldset>
  );
}

// ── CreateTagDialog ────────────────────────────────────────────────────────────

function CreateTagDialog({
  onSave, onClose, workspaceId,
}: {
  onSave: (tag: OrgTag) => void;
  onClose: () => void;
  workspaceId: string;
}) {
  const [name, setName]   = useState("");
  const [style, setStyle] = useState<OrgTagStyle>("azure");
  const [desc, setDesc]   = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);
  useEffect(() => {
    function h(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) { setError("Tag name is required."); return; }
    if (trimmed.length > 60) { setError("Tag name must be 60 characters or fewer."); return; }
    const r = documentOrganizationService.createTag({ name: trimmed, style, workspaceId, description: desc.trim() || undefined });
    if (!r.ok) { setError(r.error.message); return; }
    onSave(r.data);
  }

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="create-tag-title"
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(7,17,31,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 460, width: "calc(100vw - 32px)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        <h2 id="create-tag-title" style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: "0 0 4px", ...GF }}>Create Tag</h2>
        <p style={{ fontSize: 12, color: SLATE6, margin: "0 0 16px", ...GF }}>
          Tags are organizational metadata only. They do not change document permissions, legal status, or retention.
        </p>

        <label htmlFor="ct-name" style={{ fontSize: 12, fontWeight: 600, color: SLATE6, display: "block", marginBottom: 4, ...GF }}>Tag name *</label>
        <input
          id="ct-name" ref={inputRef} type="text" value={name} maxLength={60}
          onChange={e => { setName(e.target.value); setError(""); }}
          placeholder="e.g. Urgent"
          style={{ width: "100%", padding: "9px 12px", border: `1px solid ${error ? RED : SLATE2}`, borderRadius: 8, fontSize: 13, ...GF, color: NAVY, outline: "none", boxSizing: "border-box", marginBottom: error ? 2 : 12 }}
        />
        {error && <p style={{ fontSize: 11, color: RED, margin: "0 0 10px", ...GF }} role="alert">{error}</p>}

        <StylePicker value={style} onChange={setStyle} />

        <div style={{ marginTop: 12 }}>
          <label htmlFor="ct-desc" style={{ fontSize: 12, fontWeight: 600, color: SLATE6, display: "block", marginBottom: 4, ...GF }}>Description (optional)</label>
          <input id="ct-desc" type="text" value={desc} maxLength={200} onChange={e => setDesc(e.target.value)}
            placeholder="Brief description for this tag…"
            style={{ width: "100%", padding: "7px 12px", border: `1px solid ${SLATE2}`, borderRadius: 8, fontSize: 12, ...GF, color: NAVY, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginTop: 14, padding: "8px 10px", background: "#F8FAFC", borderRadius: 8 }}>
          <p style={{ fontSize: 11, color: SLATE6, margin: "0 0 4px", ...GF }}>Preview:</p>
          <TagPreviewChip name={name || "Tag name"} style={style} />
        </div>

        <p style={{ fontSize: 11, color: SLATE4, margin: "10px 0 20px", ...GF }}>Tags are retained for this frontend session.</p>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${SLATE2}`, background: "#fff", cursor: "pointer", fontSize: 13, ...GF, color: SLATE6 }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: AZURE, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, ...GF }}>Create Tag</button>
        </div>
      </div>
    </div>
  );
}

// ── EditTagDialog ─────────────────────────────────────────────────────────────

function EditTagDialog({
  tag, onSave, onClose,
}: {
  tag: OrgTag;
  onSave: (updated: OrgTag) => void;
  onClose: () => void;
}) {
  const [name, setName]   = useState(tag.name);
  const [style, setStyle] = useState<OrgTagStyle>(tag.style);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 50); }, []);
  useEffect(() => {
    function h(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) { setError("Tag name is required."); return; }

    // Rename if needed
    let updated = tag;
    if (trimmed !== tag.name) {
      const r = documentOrganizationService.renameTag(tag.id, { name: trimmed });
      if (!r.ok) { setError(r.error.message); return; }
      updated = r.data;
    }
    // Update style if changed
    if (style !== tag.style) {
      const r = documentOrganizationService.updateTagStyle(updated.id, { style });
      if (!r.ok) { setError(r.error.message); return; }
      updated = r.data;
    }
    onSave(updated);
  }

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="edit-tag-title"
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(7,17,31,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 460, width: "calc(100vw - 32px)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        <h2 id="edit-tag-title" style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: "0 0 16px", ...GF }}>Edit Tag</h2>

        <label htmlFor="et-name" style={{ fontSize: 12, fontWeight: 600, color: SLATE6, display: "block", marginBottom: 4, ...GF }}>Tag name *</label>
        <input
          id="et-name" ref={inputRef} type="text" value={name} maxLength={60}
          onChange={e => { setName(e.target.value); setError(""); }}
          style={{ width: "100%", padding: "9px 12px", border: `1px solid ${error ? RED : SLATE2}`, borderRadius: 8, fontSize: 13, ...GF, color: NAVY, outline: "none", boxSizing: "border-box", marginBottom: error ? 2 : 14 }}
        />
        {error && <p style={{ fontSize: 11, color: RED, margin: "0 0 10px", ...GF }} role="alert">{error}</p>}

        <StylePicker value={style} onChange={setStyle} label="Color style" />

        <div style={{ marginTop: 12, padding: "8px 10px", background: "#F8FAFC", borderRadius: 8 }}>
          <p style={{ fontSize: 11, color: SLATE6, margin: "0 0 4px", ...GF }}>Preview:</p>
          <TagPreviewChip name={name || "Tag name"} style={style} />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${SLATE2}`, background: "#fff", cursor: "pointer", fontSize: 13, ...GF, color: SLATE6 }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: AZURE, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, ...GF }}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

// ── TagCard ───────────────────────────────────────────────────────────────────

function TagCard({
  tag, onEdit, onArchive, onRestore, onRemove,
}: {
  tag: OrgTag;
  onEdit: (t: OrgTag) => void;
  onArchive: (t: OrgTag) => void;
  onRestore: (t: OrgTag) => void;
  onRemove: (t: OrgTag) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const trigRef = useRef<HTMLButtonElement>(null);
  const color = TAG_STYLE_COLORS[tag.style];
  const isArchived = tag.status === "archived";

  useEffect(() => {
    if (!menuOpen) return;
    function h(e: MouseEvent) { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); }
    function hk(e: KeyboardEvent) { if (e.key === "Escape") { setMenuOpen(false); trigRef.current?.focus(); } }
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", hk);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", hk); };
  }, [menuOpen]);

  return (
    <article className="tag-card" style={{ opacity: isArchived ? 0.65 : 1 }} aria-label={`Tag: ${tag.name}`}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <TagPreviewChip name={tag.name} style={tag.style} />
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            ref={trigRef}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Actions for ${tag.name}`}
            onClick={() => setMenuOpen(o => !o)}
            style={{ width: 28, height: 28, border: "none", background: "none", cursor: "pointer", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: SLATE4 }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden>⋯</span>
          </button>
          {menuOpen && (
            <div role="menu" style={{ position: "absolute", right: 0, top: "100%", zIndex: 100, background: "#fff", border: `1px solid ${SLATE2}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 180, padding: "4px 0" }}>
              {!isArchived && (
                <>
                  <button role="menuitem" onClick={() => { setMenuOpen(false); onEdit(tag); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: NAVY, ...GF, textAlign: "left" }}>
                    <Pencil size={13} aria-hidden /> Edit
                  </button>
                  <button role="menuitem" onClick={() => { setMenuOpen(false); onArchive(tag); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: AMBER, ...GF, textAlign: "left" }}>
                    <Archive size={13} aria-hidden /> Archive
                  </button>
                </>
              )}
              {isArchived && (
                <button role="menuitem" onClick={() => { setMenuOpen(false); onRestore(tag); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: GREEN, ...GF, textAlign: "left" }}>
                  <RotateCcw size={13} aria-hidden /> Restore
                </button>
              )}
              <div style={{ height: 1, background: SLATE2, margin: "4px 0" }} />
              <button role="menuitem" onClick={() => { setMenuOpen(false); onRemove(tag); }}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: RED, ...GF, textAlign: "left" }}>
                <Trash2 size={13} aria-hidden /> Remove from Demonstration
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: NAVY, margin: "0 0 2px", ...GF }}>{tag.name}</p>
          {tag.description && <p style={{ fontSize: 11, color: SLATE6, margin: 0, ...GF }}>{tag.description}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: 11, color: SLATE4, display: "block", ...GF }}>{tag.usageCount} use{tag.usageCount !== 1 ? "s" : ""}</span>
          <span style={{ fontSize: 10, color: TAG_STYLE_COLORS[tag.style], fontWeight: 600, ...GF }}>{TAG_STYLE_LABELS[tag.style]}</span>
        </div>
      </div>

      {isArchived && (
        <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "#FFFBEB", color: AMBER, border: "1px solid #FDE68A", alignSelf: "flex-start", ...GF }}>Archived</span>
      )}
    </article>
  );
}

// ── DocumentTagsPage ──────────────────────────────────────────────────────────

export function DocumentTagsPage() {
  usePageMeta();
  const { currentWorkspace } = usePlatform();

  const [tags, setTags]               = useState<OrgTag[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);
  const [q, setQ]                     = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [creating, setCreating]       = useState(false);
  const [editTarget, setEditTarget]   = useState<OrgTag | null>(null);
  const [removeTarget, setRemoveTarget] = useState<OrgTag | null>(null);
  const [toast, setToast]             = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const workspaceId = currentWorkspace?.id ?? "ws_northbridge_001";

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    try {
      const r = documentOrganizationService.listTags({});
      if (r.ok) setTags(r.data);
      else setError(true);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(msg: string, type: "success" | "error" = "success") { setToast({ msg, type }); }

  const handleArchive = useCallback((tag: OrgTag) => {
    const r = documentOrganizationService.archiveTag(tag.id);
    if (r.ok) { load(); showToast(`"${tag.name}" archived.`); }
    else showToast(r.error.message, "error");
  }, [load]);

  const handleRestore = useCallback((tag: OrgTag) => {
    const r = documentOrganizationService.restoreTag(tag.id);
    if (r.ok) { load(); showToast(`"${tag.name}" restored.`); }
    else showToast(r.error.message, "error");
  }, [load]);

  const handleRemove = useCallback((tag: OrgTag) => {
    const r = documentOrganizationService.removeTagDemonstration(tag.id);
    if (r.ok) { load(); showToast(`"${tag.name}" removed from demonstration state.`); }
    else showToast(r.error.message, "error");
    setRemoveTarget(null);
  }, [load]);

  const filtered = useMemo(() => {
    let list = tags;
    if (statusFilter === "active")   list = list.filter(t => t.status === "active");
    if (statusFilter === "archived") list = list.filter(t => t.status === "archived");
    if (q) list = list.filter(t => t.name.toLowerCase().includes(q.toLowerCase()) || t.description?.toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [tags, statusFilter, q]);

  const activeTags   = tags.filter(t => t.status === "active");
  const archivedTags = tags.filter(t => t.status === "archived");

  return (
    <>
      <style>{STYLES}</style>
      <PageHeader
        title="Document Tags"
        breadcrumbs={[{ label: "Documents", to: "/app/documents" }, { label: "Tags" }]}
        primaryAction={
          <button
            onClick={() => setCreating(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: AZURE, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, ...GF }}
          >
            <Plus size={14} aria-hidden /> Create Tag
          </button>
        }
      />
      <AppContent style={{ padding: "0 24px 32px" }}>

        {/* Notice */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#EFF6FF", border: "1px solid #BFDBFE", margin: "0 0 16px", ...GF }}>
          <Info size={14} style={{ color: AZURE, flexShrink: 0, marginTop: 1 }} aria-hidden />
          <p style={{ fontSize: 12, color: "#1E40AF", margin: 0 }}>
            Tags are organizational metadata only. They do not change document permissions, legal status, retention, or Evidence. Tag color is displayed alongside the tag name — color alone is never the sole identifier. No eNotary tags.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ padding: "8px 14px", borderRadius: 8, background: "#F8FAFC", border: `1px solid ${SLATE2}`, fontSize: 12, color: NAVY, ...GF }}>
            <strong>{activeTags.length}</strong> active
          </div>
          <div style={{ padding: "8px 14px", borderRadius: 8, background: "#F8FAFC", border: `1px solid ${SLATE2}`, fontSize: 12, color: NAVY, ...GF }}>
            <strong>{archivedTags.length}</strong> archived
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 280 }}>
            <Search size={13} aria-hidden style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: SLATE4 }} />
            <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search tags…"
              aria-label="Search tags"
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }} role="status" aria-label="Loading tags">
            {[1, 2, 3, 4].map(i => <SkeletonBlock key={i} height={96} radius={10} />)}
          </div>
        )}

        {!loading && error && (
          <div role="alert" style={{ padding: "32px 0", textAlign: "center" }}>
            <AlertCircle size={28} style={{ color: RED, marginBottom: 8 }} aria-hidden />
            <p style={{ fontSize: 14, color: NAVY, margin: "0 0 16px", ...GF }}>Could not load tags</p>
            <button onClick={load} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${SLATE2}`, background: "#fff", cursor: "pointer", fontSize: 13, ...GF, color: SLATE6, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <RefreshCw size={13} aria-hidden /> Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          filtered.length === 0 ? (
            <EmptyStateLayout
              icon={<Tag size={26} />}
              title={q ? "No matching tags" : "No tags yet"}
              description={q ? "Try a different search term." : "Create tags to categorize your documents by topic, priority, or team."}
              action={
                !q ? (
                  <button onClick={() => setCreating(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: AZURE, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, ...GF }}>
                    <Plus size={14} aria-hidden /> Create First Tag
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="tag-grid" role="list" aria-label="Document tags">
              {filtered.map(tag => (
                <div key={tag.id} role="listitem">
                  <TagCard
                    tag={tag}
                    onEdit={setEditTarget}
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

      {/* Create dialog */}
      {creating && (
        <CreateTagDialog
          workspaceId={workspaceId}
          onSave={tag => { load(); setCreating(false); showToast(`Tag "${tag.name}" created.`); }}
          onClose={() => setCreating(false)}
        />
      )}

      {/* Edit dialog */}
      {editTarget && (
        <EditTagDialog
          tag={editTarget}
          onSave={updated => { load(); setEditTarget(null); showToast(`Tag "${updated.name}" updated.`); }}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Confirm remove dialog */}
      {removeTarget && (
        <div
          role="dialog" aria-modal="true" aria-labelledby="remove-tag-title"
          style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(7,17,31,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) setRemoveTarget(null); }}
        >
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 420, width: "calc(100vw - 32px)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <h2 id="remove-tag-title" style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: "0 0 12px", ...GF }}>Remove "{removeTarget.name}" from Demonstration</h2>
            <p style={{ fontSize: 13, color: SLATE6, margin: "0 0 20px", ...GF }}>
              This removes the tag from the frontend demonstration state. No documents, transaction records, or legal data are deleted.
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
        <div role="status" aria-live="polite" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 300, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, ...GF, background: toast.type === "error" ? "#FEF2F2" : "#F0FDF4", color: toast.type === "error" ? "#991B1B" : "#166534", border: `1px solid ${toast.type === "error" ? "#FECACA" : "#BBF7D0"}`, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 8 }}>
          {toast.msg}
          <button onClick={() => setToast(null)} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit" }}><X size={13} aria-hidden /></button>
        </div>
      )}
    </>
  );
}

// Command 31 — Document Folders Management Page.
// Route: /app/documents/folders
// Manages personal and workspace folders. Does not grant document access.
// No eNotary folders. No Burgundy. No localStorage. No real mutation.

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router";
import {
  Folder, FolderOpen, FolderPlus, Archive, RotateCcw, Pencil,
  Trash2, X, Search, ChevronRight, ChevronDown, AlertCircle,
  RefreshCw, Info, Lock,
} from "lucide-react";
import { usePlatform } from "../../../../context/PlatformContext";
import { AppContent, PageHeader, EmptyStateLayout, SkeletonBlock, SKELETON_STYLE } from "../../../../components/platform";
import { documentOrganizationService } from "../../../../services/mock/document-organization.service";
import type { OrgFolder, OrgFolderId, OrgFolderScope } from "../../../../models/document-organization";
import { FOLDER_SCOPE_LABELS, MAX_FOLDER_DEPTH } from "../../../../models/document-organization";
import { usePageMeta } from "../../../../hooks/usePageMeta";
import { Z } from "../../../../utils/z-index";

const GF   = { fontFamily: "'Geist', sans-serif" } as React.CSSProperties;
const AZURE = "#0078D4";
const NAVY  = "#07111F";
const SLATE6 = "#64748B";
const SLATE4 = "#94A3B8";
const SLATE2 = "#E2E8F0";
const SLATE1 = "#F8FAFC";
const AMBER = "#D97706";
const GREEN = "#16A34A";
const RED   = "#DC2626";

const STYLES = SKELETON_STYLE + `
  .ofol-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  @media (max-width: 900px) { .ofol-grid { grid-template-columns: 1fr; } }
  .ofol-card {
    border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden;
    background: #fff;
  }
  .ofol-row {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; border-bottom: 1px solid #F1F5F9; cursor: pointer;
  }
  .ofol-row:last-child { border-bottom: none; }
  .ofol-row:hover { background: #F8FAFC; }
  .ofol-row-child {
    padding-left: 32px;
  }
  @media (prefers-reduced-motion: reduce) { .ofol-row { transition: none !important; } }
`;

// ── Status badge ──────────────────────────────────────────────────────────────

function FolderStatusBadge({ status }: { status: OrgFolder["status"] }) {
  if (status === "active") return null;
  const colors = status === "archived"
    ? { bg: "#FFFBEB", text: AMBER, border: "#FDE68A" }
    : { bg: "#FEF2F2", text: RED, border: "#FECACA" };
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, ...GF }}>
      {status === "archived" ? "Archived" : "Unavailable"}
    </span>
  );
}

// ── Scope badge ───────────────────────────────────────────────────────────────

function ScopeBadge({ scope }: { scope: OrgFolderScope }) {
  const isWorkspace = scope === "workspace";
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
      background: isWorkspace ? "#EFF6FF" : "#F0FDF4",
      color: isWorkspace ? "#1D4ED8" : "#166534",
      border: `1px solid ${isWorkspace ? "#BFDBFE" : "#BBF7D0"}`,
      ...GF,
    }}>
      {FOLDER_SCOPE_LABELS[scope]}
    </span>
  );
}

// ── Create Folder Dialog ──────────────────────────────────────────────────────

function CreateFolderDialog({
  onSave, onClose, parentId, defaultScope, workspaceId, userId, folders,
}: {
  onSave: (folder: OrgFolder) => void;
  onClose: () => void;
  parentId?: OrgFolderId | null;
  defaultScope?: OrgFolderScope;
  workspaceId: string;
  userId: string;
  folders: OrgFolder[];
}) {
  const [name, setName] = useState("");
  const [scope, setScope] = useState<OrgFolderScope>(defaultScope ?? "workspace");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  useEffect(() => {
    function h(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const parentFolder = parentId ? folders.find(f => f.id === parentId) : null;

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) { setError("Folder name is required."); return; }
    if (trimmed.length > 120) { setError("Folder name must be 120 characters or fewer."); return; }
    const result = documentOrganizationService.createFolder({
      name: trimmed, scope, parentId: parentId ?? null, workspaceId, ownerId: userId,
    });
    if (!result.ok) { setError(result.error.message); return; }
    onSave(result.data);
  }

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="create-folder-title"
      style={{ position: "fixed", inset: 0, zIndex: Z.modal, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(7,17,31,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 440, width: "calc(100vw - 32px)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        <h2 id="create-folder-title" style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: "0 0 4px", ...GF }}>
          {parentFolder ? `Create Subfolder in "${parentFolder.name}"` : "Create Folder"}
        </h2>
        <p style={{ fontSize: 12, color: SLATE6, margin: "0 0 16px", ...GF }}>
          Folders are organizational metadata only. They do not change document permissions, legal status, or Evidence.
        </p>

        <label htmlFor="cf-name" style={{ fontSize: 12, fontWeight: 600, color: SLATE6, display: "block", marginBottom: 4, ...GF }}>Folder name *</label>
        <input
          id="cf-name" ref={inputRef} type="text" value={name} maxLength={120}
          onChange={e => { setName(e.target.value); setError(""); }}
          placeholder="e.g. Client Agreements"
          style={{ width: "100%", padding: "9px 12px", border: `1px solid ${error ? RED : SLATE2}`, borderRadius: 8, fontSize: 13, ...GF, color: NAVY, outline: "none", boxSizing: "border-box", marginBottom: 4 }}
        />
        {error && <p style={{ fontSize: 11, color: RED, margin: "0 0 8px", ...GF }} role="alert">{error}</p>}

        {!parentFolder && (
          <>
            <fieldset style={{ border: "none", margin: "12px 0 0", padding: 0 }}>
              <legend style={{ fontSize: 12, fontWeight: 600, color: SLATE6, marginBottom: 6, ...GF }}>Scope</legend>
              <div style={{ display: "flex", gap: 12 }}>
                {(["workspace", "personal"] as OrgFolderScope[]).map(s => (
                  <label key={s} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: NAVY, ...GF }}>
                    <input type="radio" name="scope" value={s} checked={scope === s} onChange={() => setScope(s)} style={{ accentColor: AZURE }} />
                    {FOLDER_SCOPE_LABELS[s]}
                    {s === "personal" && <span style={{ fontSize: 10, color: SLATE4 }}>(visible only to you)</span>}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}

        <p style={{ fontSize: 11, color: SLATE4, margin: "12px 0 20px", ...GF }}>
          Retained for this frontend session. Maximum folder depth: {MAX_FOLDER_DEPTH} levels.
        </p>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${SLATE2}`, background: "#fff", cursor: "pointer", fontSize: 13, ...GF, color: SLATE6 }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: AZURE, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, ...GF }}>
            Create Folder
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Rename Dialog ─────────────────────────────────────────────────────────────

function RenameFolderDialog({
  folder, onSave, onClose,
}: {
  folder: OrgFolder;
  onSave: (updated: OrgFolder) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(folder.name);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 50); }, []);
  useEffect(() => {
    function h(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && name.trim()) handleSave();
    }
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [name, onClose]);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) { setError("Folder name is required."); return; }
    const result = documentOrganizationService.renameFolder(folder.id, { name: trimmed });
    if (!result.ok) { setError(result.error.message); return; }
    onSave(result.data);
  }

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="rename-folder-title"
      style={{ position: "fixed", inset: 0, zIndex: Z.modal, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(7,17,31,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 400, width: "calc(100vw - 32px)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        <h2 id="rename-folder-title" style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: "0 0 16px", ...GF }}>Rename Folder</h2>
        <label htmlFor="rf-name" style={{ fontSize: 12, fontWeight: 600, color: SLATE6, display: "block", marginBottom: 4, ...GF }}>Folder name</label>
        <input id="rf-name" ref={inputRef} type="text" value={name} maxLength={120}
          onChange={e => { setName(e.target.value); setError(""); }}
          style={{ width: "100%", padding: "9px 12px", border: `1px solid ${error ? RED : SLATE2}`, borderRadius: 8, fontSize: 13, ...GF, color: NAVY, outline: "none", boxSizing: "border-box", marginBottom: 4 }}
        />
        {error && <p style={{ fontSize: 11, color: RED, margin: "0 0 8px", ...GF }} role="alert">{error}</p>}
        <p style={{ fontSize: 11, color: SLATE4, margin: "8px 0 20px", ...GF }}>Document assignments and child folders are preserved.</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${SLATE2}`, background: "#fff", cursor: "pointer", fontSize: 13, ...GF, color: SLATE6 }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: AZURE, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, ...GF }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Remove Dialog ─────────────────────────────────────────────────────

function ConfirmRemoveDialog({
  folder, onConfirm, onClose,
}: {
  folder: OrgFolder;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="remove-folder-title"
      style={{ position: "fixed", inset: 0, zIndex: Z.modal, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(7,17,31,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 420, width: "calc(100vw - 32px)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        <h2 id="remove-folder-title" style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: "0 0 12px", ...GF }}>Remove "{folder.name}" from Demonstration</h2>
        <p style={{ fontSize: 13, color: SLATE6, margin: "0 0 8px", ...GF }}>
          This removes the folder from the current frontend demonstration state only. No files, documents, or transaction records are deleted.
        </p>
        <p style={{ fontSize: 13, color: SLATE6, margin: "0 0 20px", ...GF }}>
          Documents assigned to this folder will be moved to "Unfiled". Consider using <strong>Archive</strong> instead to preserve the folder structure.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${SLATE2}`, background: "#fff", cursor: "pointer", fontSize: 13, ...GF, color: SLATE6 }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: RED, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, ...GF }}>Remove from Demonstration</button>
        </div>
      </div>
    </div>
  );
}

// ── Folder row ────────────────────────────────────────────────────────────────

function FolderRow({
  folder, depth, isExpanded, hasChildren, onToggle, onOpen, onRename, onArchive, onRestore, onRemove, onCreateChild,
}: {
  folder: OrgFolder;
  depth: number;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  onOpen: (f: OrgFolder) => void;
  onRename: (f: OrgFolder) => void;
  onArchive: (f: OrgFolder) => void;
  onRestore: (f: OrgFolder) => void;
  onRemove: (f: OrgFolder) => void;
  onCreateChild: (f: OrgFolder) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const trigRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function h(e: MouseEvent) { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); }
    function hk(e: KeyboardEvent) { if (e.key === "Escape") { setMenuOpen(false); trigRef.current?.focus(); } }
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", hk);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", hk); };
  }, [menuOpen]);

  const isArchived = folder.status === "archived";

  return (
    <div
      className={`ofol-row${depth > 0 ? " ofol-row-child" : ""}`}
      style={{ paddingLeft: depth > 0 ? 14 + depth * 18 : 14, opacity: isArchived ? 0.65 : 1 }}
    >
      {hasChildren ? (
        <button
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${folder.name}`}
          style={{ background: "none", border: "none", cursor: "pointer", color: SLATE4, padding: 0, display: "flex", lineHeight: 1 }}
        >
          {isExpanded ? <ChevronDown size={13} aria-hidden /> : <ChevronRight size={13} aria-hidden />}
        </button>
      ) : (
        <span style={{ width: 13, flexShrink: 0 }} aria-hidden />
      )}
      <Folder size={14} aria-hidden style={{ color: isArchived ? SLATE4 : AZURE, flexShrink: 0 }} />
      <button
        onClick={() => onOpen(folder)}
        style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, color: isArchived ? SLATE6 : NAVY, ...GF, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        {folder.name}
      </button>
      <span style={{ fontSize: 11, color: SLATE4, whiteSpace: "nowrap", ...GF }}>
        {folder.documentCount} doc{folder.documentCount !== 1 ? "s" : ""}
      </span>
      <FolderStatusBadge status={folder.status} />
      <ScopeBadge scope={folder.scope} />
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          ref={trigRef}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`Actions for ${folder.name}`}
          onClick={() => setMenuOpen(o => !o)}
          style={{ width: 28, height: 28, border: "none", background: "none", cursor: "pointer", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: SLATE4 }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden>⋯</span>
        </button>
        {menuOpen && (
          <div role="menu" aria-label="Folder actions" style={{ position: "absolute", right: 0, top: "100%", zIndex: Z.dropdown, background: "#fff", border: `1px solid ${SLATE2}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 200, padding: "4px 0" }}>
            {!isArchived && (
              <>
                <button role="menuitem" onClick={() => { setMenuOpen(false); onOpen(folder); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: NAVY, ...GF, textAlign: "left" }}>
                  <FolderOpen size={13} aria-hidden /> Open Folder
                </button>
                <button role="menuitem" onClick={() => { setMenuOpen(false); onRename(folder); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: NAVY, ...GF, textAlign: "left" }}>
                  <Pencil size={13} aria-hidden /> Rename
                </button>
                {folder.childCount < MAX_FOLDER_DEPTH && (
                  <button role="menuitem" onClick={() => { setMenuOpen(false); onCreateChild(folder); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: NAVY, ...GF, textAlign: "left" }}>
                    <FolderPlus size={13} aria-hidden /> Create Subfolder
                  </button>
                )}
                <button role="menuitem" onClick={() => { setMenuOpen(false); onArchive(folder); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: AMBER, ...GF, textAlign: "left" }}>
                  <Archive size={13} aria-hidden /> Archive
                </button>
              </>
            )}
            {isArchived && (
              <button role="menuitem" onClick={() => { setMenuOpen(false); onRestore(folder); }}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: GREEN, ...GF, textAlign: "left" }}>
                <RotateCcw size={13} aria-hidden /> Restore
              </button>
            )}
            <div style={{ height: 1, background: SLATE2, margin: "4px 0" }} />
            <button role="menuitem" onClick={() => { setMenuOpen(false); onRemove(folder); }}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: RED, ...GF, textAlign: "left" }}>
              <Trash2 size={13} aria-hidden /> Remove from Demonstration
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DocumentFoldersPage ───────────────────────────────────────────────────────

export function DocumentFoldersPage() {
  usePageMeta();
  const { user, currentWorkspace } = usePlatform();
  const navigate = useNavigate();

  const [folders, setFolders]         = useState<OrgFolder[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);
  const [q, setQ]                     = useState("");
  const [scopeFilter, setScopeFilter] = useState<OrgFolderScope | "all">("all");
  const [expanded, setExpanded]       = useState<Set<OrgFolderId>>(new Set(["ofol_001" as OrgFolderId, "ofol_004" as OrgFolderId] as OrgFolderId[]));
  const [createParent, setCreateParent]   = useState<OrgFolder | null | undefined>(undefined);
  const [renameTarget, setRenameTarget]   = useState<OrgFolder | null>(null);
  const [removeTarget, setRemoveTarget]   = useState<OrgFolder | null>(null);
  const [toast, setToast]             = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const workspaceId = currentWorkspace?.id ?? WS_ID_FALLBACK;
  const userId = user?.id ?? "usr_ana_reyes";

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    try {
      const result = documentOrganizationService.listFolders({ q: q || undefined }, userId);
      if (result.ok) {
        let list = result.data;
        if (scopeFilter !== "all") list = list.filter(f => f.scope === scopeFilter);
        setFolders(list);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [q, scopeFilter, userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
  }

  const handleArchive = useCallback((folder: OrgFolder) => {
    const r = documentOrganizationService.archiveFolder(folder.id);
    if (r.ok) { load(); showToast(`"${folder.name}" archived.`); }
    else showToast(r.error.message, "error");
  }, [load]);

  const handleRestore = useCallback((folder: OrgFolder) => {
    const r = documentOrganizationService.restoreFolder(folder.id);
    if (r.ok) { load(); showToast(`"${folder.name}" restored.`); }
    else showToast(r.error.message, "error");
  }, [load]);

  const handleRemove = useCallback((folder: OrgFolder) => {
    const r = documentOrganizationService.removeFolderDemonstration(folder.id);
    if (r.ok) { load(); showToast(`"${folder.name}" removed from demonstration state.`); }
    else showToast(r.error.message, "error");
    setRemoveTarget(null);
  }, [load]);

  // Build tree
  const topLevel = useMemo(() => folders.filter(f => f.parentId === null).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)), [folders]);
  const workspaceFolders = topLevel.filter(f => f.scope === "workspace");
  const personalFolders  = topLevel.filter(f => f.scope === "personal");

  function getChildren(parentId: OrgFolderId): OrgFolder[] {
    return folders.filter(f => f.parentId === parentId).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  }

  function renderFolder(folder: OrgFolder, depth = 0): React.ReactNode {
    const children = getChildren(folder.id);
    const isExpanded_ = expanded.has(folder.id);
    return (
      <div key={folder.id}>
        <FolderRow
          folder={folder}
          depth={depth}
          isExpanded={isExpanded_}
          hasChildren={children.length > 0}
          onToggle={() => setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(folder.id)) next.delete(folder.id); else next.add(folder.id);
            return next;
          })}
          onOpen={() => navigate(`/app/documents/folders/${folder.id}`)}
          onRename={setRenameTarget}
          onArchive={handleArchive}
          onRestore={handleRestore}
          onRemove={setRemoveTarget}
          onCreateChild={f => setCreateParent(f)}
        />
        {isExpanded_ && children.map(c => renderFolder(c, depth + 1))}
      </div>
    );
  }

  return (
    <>
      <style>{STYLES}</style>
      <PageHeader
        title="Document Folders"
        breadcrumbs={[{ label: "Documents", to: "/app/documents" }, { label: "Folders" }]}
        primaryAction={
          <button
            onClick={() => setCreateParent(null)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: AZURE, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, ...GF }}
          >
            <FolderPlus size={14} aria-hidden /> Create Folder
          </button>
        }
      />
      <AppContent style={{ padding: "0 24px 32px" }}>

        {/* Org notice */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#EFF6FF", border: "1px solid #BFDBFE", margin: "0 0 16px", ...GF }}>
          <Info size={14} style={{ color: AZURE, flexShrink: 0, marginTop: 1 }} aria-hidden />
          <p style={{ fontSize: 12, color: "#1E40AF", margin: 0 }}>
            Folders are organizational metadata only. They do not change document permissions, legal status, retention, Verification, or Evidence. Folders are retained for this frontend session only.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 280 }}>
            <Search size={13} aria-hidden style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: SLATE4 }} />
            <input
              type="search" value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search folders…"
              aria-label="Search folders"
              style={{ width: "100%", padding: "7px 10px 7px 30px", border: `1px solid ${SLATE2}`, borderRadius: 8, fontSize: 13, ...GF, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <select
            value={scopeFilter}
            onChange={e => setScopeFilter(e.target.value as OrgFolderScope | "all")}
            aria-label="Filter by scope"
            style={{ padding: "7px 10px", border: `1px solid ${SLATE2}`, borderRadius: 8, fontSize: 13, ...GF, color: NAVY, background: "#fff", cursor: "pointer" }}
          >
            <option value="all">All Scopes</option>
            <option value="workspace">Workspace</option>
            <option value="personal">Personal</option>
          </select>
          <button onClick={load} aria-label="Refresh" style={{ padding: "7px 10px", border: `1px solid ${SLATE2}`, borderRadius: 8, background: "#fff", cursor: "pointer", color: SLATE6, display: "flex", alignItems: "center" }}>
            <RefreshCw size={13} aria-hidden />
          </button>
        </div>

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }} role="status" aria-label="Loading folders">
            {[1, 2, 3, 4].map(i => <SkeletonBlock key={i} height={48} />)}
          </div>
        )}

        {!loading && error && (
          <div role="alert" style={{ padding: "32px 0", textAlign: "center" }}>
            <AlertCircle size={28} style={{ color: RED, marginBottom: 8 }} aria-hidden />
            <p style={{ fontSize: 14, color: NAVY, margin: "0 0 16px", ...GF }}>Could not load folders</p>
            <button onClick={load} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${SLATE2}`, background: "#fff", cursor: "pointer", fontSize: 13, ...GF, color: SLATE6, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <RefreshCw size={13} aria-hidden /> Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="ofol-grid">
            {/* Workspace Folders */}
            <section aria-labelledby="ws-folders-heading">
              <h2 id="ws-folders-heading" style={{ fontSize: 13, fontWeight: 700, color: SLATE6, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px", ...GF }}>
                Workspace Folders
              </h2>
              <div className="ofol-card">
                {workspaceFolders.length === 0 ? (
                  <div style={{ padding: "24px 16px", textAlign: "center" }}>
                    <Folder size={24} style={{ color: SLATE4, marginBottom: 8 }} aria-hidden />
                    <p style={{ fontSize: 13, color: SLATE6, margin: "0 0 12px", ...GF }}>No workspace folders yet.</p>
                    <button onClick={() => setCreateParent(null)} style={{ fontSize: 12, color: AZURE, background: "none", border: "none", cursor: "pointer", ...GF, textDecoration: "underline" }}>
                      Create a workspace folder
                    </button>
                  </div>
                ) : (
                  workspaceFolders.map(f => renderFolder(f))
                )}
              </div>
            </section>

            {/* Personal Folders */}
            <section aria-labelledby="personal-folders-heading">
              <h2 id="personal-folders-heading" style={{ fontSize: 13, fontWeight: 700, color: SLATE6, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px", ...GF }}>
                Personal Folders
                <Lock size={11} aria-label="Visible only to you" style={{ marginLeft: 6, color: SLATE4, verticalAlign: "middle" }} />
              </h2>
              <div className="ofol-card">
                {personalFolders.length === 0 ? (
                  <div style={{ padding: "24px 16px", textAlign: "center" }}>
                    <Folder size={24} style={{ color: SLATE4, marginBottom: 8 }} aria-hidden />
                    <p style={{ fontSize: 13, color: SLATE6, margin: "0 0 12px", ...GF }}>No personal folders yet.</p>
                    <button onClick={() => { setCreateParent(null); }} style={{ fontSize: 12, color: AZURE, background: "none", border: "none", cursor: "pointer", ...GF, textDecoration: "underline" }}>
                      Create a personal folder
                    </button>
                  </div>
                ) : (
                  personalFolders.map(f => renderFolder(f))
                )}
              </div>
            </section>
          </div>
        )}

        {/* Archived section */}
        {!loading && !error && (() => {
          const archived = folders.filter(f => f.status === "archived" && f.parentId === null);
          if (archived.length === 0) return null;
          return (
            <section aria-labelledby="archived-folders-heading" style={{ marginTop: 24 }}>
              <h2 id="archived-folders-heading" style={{ fontSize: 13, fontWeight: 700, color: SLATE6, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px", ...GF }}>
                Archived Folders
              </h2>
              <div className="ofol-card">
                {archived.map(f => renderFolder(f))}
              </div>
            </section>
          );
        })()}
      </AppContent>

      {/* Dialogs */}
      {createParent !== undefined && (
        <CreateFolderDialog
          parentId={createParent?.id ?? null}
          defaultScope="workspace"
          workspaceId={workspaceId}
          userId={userId}
          folders={folders}
          onSave={folder => {
            load();
            setCreateParent(undefined);
            showToast(`Folder "${folder.name}" created.`);
          }}
          onClose={() => setCreateParent(undefined)}
        />
      )}
      {renameTarget && (
        <RenameFolderDialog
          folder={renameTarget}
          onSave={updated => {
            load();
            setRenameTarget(null);
            showToast(`Folder renamed to "${updated.name}".`);
          }}
          onClose={() => setRenameTarget(null)}
        />
      )}
      {removeTarget && (
        <ConfirmRemoveDialog
          folder={removeTarget}
          onConfirm={() => handleRemove(removeTarget)}
          onClose={() => setRemoveTarget(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: Z.toast,
            padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, ...GF,
            background: toast.type === "error" ? "#FEF2F2" : "#F0FDF4",
            color: toast.type === "error" ? "#991B1B" : "#166534",
            border: `1px solid ${toast.type === "error" ? "#FECACA" : "#BBF7D0"}`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            display: "flex", alignItems: "center", gap: 8, maxWidth: 360,
          }}
        >
          {toast.msg}
          <button onClick={() => setToast(null)} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", lineHeight: 1 }}>
            <X size={13} aria-hidden />
          </button>
        </div>
      )}
    </>
  );
}

const WS_ID_FALLBACK = "ws_northbridge_001";

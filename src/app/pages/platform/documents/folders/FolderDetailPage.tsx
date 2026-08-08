// Command 31 — Folder Detail Page.
// Route: /app/documents/folders/:folderId
// Shows documents assigned to a folder via frontend org state.
// No eNotary folders. No Burgundy. No localStorage. No real mutation.

import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  Folder, FileText, Archive, RotateCcw, Pencil, Trash2, X,
  AlertCircle, RefreshCw, Info, Search, ArrowLeft, ChevronRight,
} from "lucide-react";
import { usePlatform } from "../../../../context/PlatformContext";
import { AppContent, PageHeader, EmptyStateLayout, SkeletonBlock, SKELETON_STYLE } from "../../../../components/platform";
import { documentOrganizationService } from "../../../../services/mock/document-organization.service";
import { mockDocumentService } from "../../../../services/mock/document.service";
import type { OrgFolder, OrgFolderId } from "../../../../models/document-organization";
import { FOLDER_SCOPE_LABELS } from "../../../../models/document-organization";
import type { DocumentListItem } from "../../../../models/documents";
import { usePageMeta } from "../../../../hooks/usePageMeta";
import { Z } from "../../../../utils/z-index";

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
  .fdet-row {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 0; border-bottom: 1px solid #F1F5F9;
  }
  .fdet-row:last-child { border-bottom: none; }
`;

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

export function FolderDetailPage() {
  usePageMeta();
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const { user } = usePlatform();

  const [folder, setFolder]       = useState<OrgFolder | null>(null);
  const [children, setChildren]   = useState<OrgFolder[]>([]);
  const [docs, setDocs]           = useState<DocumentListItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [renaming, setRenaming]   = useState(false);
  const [newName, setNewName]     = useState("");
  const [renameErr, setRenameErr] = useState("");
  const [q, setQ]                 = useState("");
  const [toast, setToast]         = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  const userId = user?.id ?? "usr_ana_reyes";

  const load = useCallback(async () => {
    if (!folderId) return;
    setLoading(true);
    setError(null);
    try {
      const folderResult = documentOrganizationService.getFolder(folderId as OrgFolderId);
      if (!folderResult.ok) { setError(folderResult.error.message); setLoading(false); return; }
      const f = folderResult.data;
      setFolder(f);
      setNewName(f.name);

      // Load child folders
      const childrenResult = documentOrganizationService.listFolders({ status: "active" } as never, userId);
      if (childrenResult.ok) {
        setChildren(childrenResult.data.filter(cf => cf.parentId === folderId));
      }

      // Load full doc list, then filter by folder assignment
      const fullDocs = await mockDocumentService.list({ view: "all", q: "", folderId: null, tagId: null, sort: "updated", dir: "desc", page: 1 }, "standard");
      const folderDocs = documentOrganizationService.listFolderDocuments(folderId as OrgFolderId, fullDocs.items);
      setDocs(folderDocs);
    } catch {
      setError("Could not load folder details.");
    } finally {
      setLoading(false);
    }
  }, [folderId, userId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (renaming) setTimeout(() => { renameRef.current?.focus(); renameRef.current?.select(); }, 50);
  }, [renaming]);

  function handleRename() {
    if (!folder) return;
    const trimmed = newName.trim();
    if (!trimmed) { setRenameErr("Name is required."); return; }
    const r = documentOrganizationService.renameFolder(folder.id, { name: trimmed });
    if (!r.ok) { setRenameErr(r.error.message); return; }
    setFolder(r.data);
    setRenaming(false);
    setToast({ msg: `Renamed to "${r.data.name}".`, type: "success" });
  }

  function handleArchive() {
    if (!folder) return;
    const r = documentOrganizationService.archiveFolder(folder.id);
    if (r.ok) { load(); setToast({ msg: "Folder archived.", type: "success" }); }
    else setToast({ msg: r.error.message, type: "error" });
  }

  function handleRestore() {
    if (!folder) return;
    const r = documentOrganizationService.restoreFolder(folder.id);
    if (r.ok) { load(); setToast({ msg: "Folder restored.", type: "success" }); }
    else setToast({ msg: r.error.message, type: "error" });
  }

  function handleRemove() {
    if (!folder) return;
    const r = documentOrganizationService.removeFolderDemonstration(folder.id);
    if (r.ok) { navigate("/app/documents/folders"); }
    else setToast({ msg: r.error.message, type: "error" });
  }

  const filteredDocs = q
    ? docs.filter(d => d.title.toLowerCase().includes(q.toLowerCase()))
    : docs;

  if (loading) {
    return (
      <>
        <style>{STYLES}</style>
        <PageHeader title="Folder" breadcrumbs={[{ label: "Documents", to: "/app/documents" }, { label: "Folders", to: "/app/documents/folders" }, { label: "Loading…" }]} />
        <AppContent style={{ padding: "24px" }}>
          <div role="status" aria-label="Loading folder" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SkeletonBlock height={28} width="40%" />
            <SkeletonBlock height={16} width="60%" />
            {[1, 2, 3].map(i => <SkeletonBlock key={i} height={48} />)}
          </div>
        </AppContent>
      </>
    );
  }

  if (error || !folder) {
    return (
      <>
        <style>{STYLES}</style>
        <PageHeader title="Folder" breadcrumbs={[{ label: "Documents", to: "/app/documents" }, { label: "Folders", to: "/app/documents/folders" }]} />
        <AppContent style={{ padding: "48px 24px", textAlign: "center" }}>
          <AlertCircle size={32} style={{ color: RED, marginBottom: 12 }} aria-hidden />
          <p style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: "0 0 8px", ...GF }}>
            {error ?? "Folder not found"}
          </p>
          <Link to="/app/documents/folders" style={{ fontSize: 13, color: AZURE, ...GF, textDecoration: "underline" }}>
            Back to Folders
          </Link>
        </AppContent>
      </>
    );
  }

  const isArchived = folder.status === "archived";

  return (
    <>
      <style>{STYLES}</style>
      <PageHeader
        title={
          renaming ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                ref={renameRef}
                type="text"
                value={newName}
                maxLength={120}
                onChange={e => { setNewName(e.target.value); setRenameErr(""); }}
                onKeyDown={e => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") { setRenaming(false); setNewName(folder.name); } }}
                style={{ fontSize: 18, fontWeight: 700, color: NAVY, border: `1px solid ${renameErr ? RED : AZURE}`, borderRadius: 6, padding: "2px 8px", ...GF, outline: "none" }}
              />
              <button onClick={handleRename} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: AZURE, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, ...GF }}>Save</button>
              <button onClick={() => { setRenaming(false); setNewName(folder.name); }} style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${SLATE2}`, background: "#fff", cursor: "pointer", fontSize: 12, ...GF, color: SLATE6 }}><X size={12} aria-hidden /></button>
              {renameErr && <span style={{ fontSize: 11, color: RED, ...GF }}>{renameErr}</span>}
            </span>
          ) : folder.name
        }
        breadcrumbs={[
          { label: "Documents", to: "/app/documents" },
          { label: "Folders", to: "/app/documents/folders" },
          { label: folder.name },
        ]}
        primaryAction={
          <div style={{ display: "flex", gap: 8 }}>
            {!isArchived && (
              <button onClick={() => setRenaming(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: `1px solid ${SLATE2}`, background: "#fff", cursor: "pointer", fontSize: 13, color: SLATE6, ...GF }}>
                <Pencil size={13} aria-hidden /> Rename
              </button>
            )}
            {!isArchived ? (
              <button onClick={handleArchive} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: `1px solid ${SLATE2}`, background: "#fff", cursor: "pointer", fontSize: 13, color: AMBER, ...GF }}>
                <Archive size={13} aria-hidden /> Archive
              </button>
            ) : (
              <button onClick={handleRestore} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: `1px solid ${SLATE2}`, background: "#fff", cursor: "pointer", fontSize: 13, color: GREEN, ...GF }}>
                <RotateCcw size={13} aria-hidden /> Restore
              </button>
            )}
            <button onClick={handleRemove} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: `1px solid #FECACA`, background: "#FEF2F2", cursor: "pointer", fontSize: 13, color: RED, ...GF }}>
              <Trash2 size={13} aria-hidden /> Remove
            </button>
          </div>
        }
      />
      <AppContent style={{ padding: "0 24px 32px" }}>

        {/* Org notice */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#EFF6FF", border: "1px solid #BFDBFE", margin: "0 0 16px", ...GF }}>
          <Info size={14} style={{ color: AZURE, flexShrink: 0, marginTop: 1 }} aria-hidden />
          <p style={{ fontSize: 12, color: "#1E40AF", margin: 0 }}>
            This folder is organizational metadata only. Documents shown here reflect frontend demonstration state. Folder membership does not change document permissions, legal status, or Evidence.
          </p>
        </div>

        {/* Folder meta */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Folder size={14} style={{ color: AZURE }} aria-hidden />
            <span style={{ fontSize: 13, color: NAVY, fontWeight: 600, ...GF }}>{folder.name}</span>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
            background: folder.scope === "workspace" ? "#EFF6FF" : "#F0FDF4",
            color: folder.scope === "workspace" ? "#1D4ED8" : "#166534",
            border: `1px solid ${folder.scope === "workspace" ? "#BFDBFE" : "#BBF7D0"}`,
            ...GF,
          }}>
            {FOLDER_SCOPE_LABELS[folder.scope]}
          </span>
          {isArchived && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "#FFFBEB", color: AMBER, border: "1px solid #FDE68A", ...GF }}>Archived</span>
          )}
          <span style={{ fontSize: 12, color: SLATE4, ...GF }}>{folder.documentCount} document{folder.documentCount !== 1 ? "s" : ""}</span>
          {folder.childCount > 0 && <span style={{ fontSize: 12, color: SLATE4, ...GF }}>{folder.childCount} subfolder{folder.childCount !== 1 ? "s" : ""}</span>}
        </div>

        {/* Child folders */}
        {children.length > 0 && (
          <section aria-labelledby="subfolders-heading" style={{ marginBottom: 20 }}>
            <h2 id="subfolders-heading" style={{ fontSize: 12, fontWeight: 700, color: SLATE6, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px", ...GF }}>Subfolders</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {children.map(cf => (
                <Link
                  key={cf.id}
                  to={`/app/documents/folders/${cf.id}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                    borderRadius: 8, border: `1px solid ${SLATE2}`, background: "#F8FAFC",
                    textDecoration: "none", fontSize: 13, color: NAVY, ...GF,
                  }}
                >
                  <Folder size={13} style={{ color: AZURE }} aria-hidden />
                  {cf.name}
                  <span style={{ fontSize: 11, color: SLATE4 }}>({cf.documentCount})</span>
                  <ChevronRight size={11} style={{ color: SLATE4 }} aria-hidden />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Documents */}
        <section aria-labelledby="folder-docs-heading">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <h2 id="folder-docs-heading" style={{ fontSize: 12, fontWeight: 700, color: SLATE6, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0, ...GF }}>Documents in this Folder</h2>
            <div style={{ position: "relative", marginLeft: "auto" }}>
              <Search size={12} aria-hidden style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: SLATE4 }} />
              <input
                type="search" value={q} onChange={e => setQ(e.target.value)}
                placeholder="Filter documents…"
                aria-label="Filter documents in folder"
                style={{ padding: "5px 8px 5px 26px", border: `1px solid ${SLATE2}`, borderRadius: 6, fontSize: 12, ...GF, outline: "none" }}
              />
            </div>
            <button onClick={load} aria-label="Refresh" style={{ padding: "5px 8px", border: `1px solid ${SLATE2}`, borderRadius: 6, background: "#fff", cursor: "pointer", color: SLATE6, display: "flex", alignItems: "center" }}>
              <RefreshCw size={12} aria-hidden />
            </button>
          </div>
          <div style={{ border: `1px solid ${SLATE2}`, borderRadius: 10, overflow: "hidden" }}>
            {filteredDocs.length === 0 ? (
              <EmptyStateLayout
                icon={<FileText size={24} />}
                title={q ? "No matching documents" : "No documents in this folder"}
                description={q ? "Try a different filter term." : "Use Move to Folder from the Documents workspace to assign documents here."}
              />
            ) : (
              filteredDocs.map(doc => (
                <div key={doc.id} className="fdet-row">
                  <FileText size={14} style={{ color: SLATE4, flexShrink: 0 }} aria-hidden />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      to={`/app/documents/${doc.id}`}
                      style={{ fontSize: 13, fontWeight: 600, color: NAVY, textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...GF }}
                      title={doc.title}
                    >
                      {doc.title}
                    </Link>
                    <span style={{ fontSize: 11, color: SLATE4, ...GF }}>{fmtRelative(doc.updatedAt)}</span>
                  </div>
                  <span style={{ fontSize: 11, color: SLATE6, ...GF }}>{doc.status}</span>
                  <Link to={`/app/documents/${doc.id}`} style={{ fontSize: 12, color: AZURE, ...GF, textDecoration: "none", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 3 }}>
                    Open <ChevronRight size={11} aria-hidden />
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Back link */}
        <div style={{ marginTop: 20 }}>
          <Link to="/app/documents/folders" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: SLATE6, ...GF, textDecoration: "none" }}>
            <ArrowLeft size={13} aria-hidden /> Back to Folders
          </Link>
        </div>
      </AppContent>

      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite" style={{ position: "fixed", bottom: 24, right: 24, zIndex: Z.toast, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, ...GF, background: toast.type === "error" ? "#FEF2F2" : "#F0FDF4", color: toast.type === "error" ? "#991B1B" : "#166534", border: `1px solid ${toast.type === "error" ? "#FECACA" : "#BBF7D0"}`, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 8 }}>
          {toast.msg}
          <button onClick={() => setToast(null)} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit" }}><X size={12} aria-hidden /></button>
        </div>
      )}
    </>
  );
}

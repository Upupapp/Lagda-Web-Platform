// Command 15 — Authenticated Documents Workspace.
// Route: /app/documents  Views: All | Needs Attention | Drafts | In Progress |
//   Awaiting My Action | Completed | Expiring | Failed Delivery | Archived.
// No eNotary document types. No Burgundy (#67023B). No backend mutations.
// No real document content in list. No private audit evidence displayed.
// All participant names are fictional. No IP, device, location shown.

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import {
  FileText, FilePlus, Search, MoreHorizontal, Archive, RotateCcw, Pencil,
  X, AlertCircle, ChevronLeft, ChevronRight, Tag, FolderOpen, Folder,
  ShieldCheck, Activity, Users, RefreshCw, Inbox, ArrowUpDown,
  CheckSquare, Square,
} from "lucide-react";
import { usePlatform } from "../../../context/PlatformContext";
import {
  AppContent, EmptyStateLayout, SkeletonBlock, SKELETON_STYLE, PageHeader,
} from "../../../components/platform";
import { mockDocumentService } from "../../../services/mock/document.service";
import { TRANSACTION_STATUS_LABELS } from "../../../models";
import type { TransactionStatus } from "../../../models";
import type {
  DocumentView, DocumentListQuery, DocumentListItem, DocumentListResult,
  DocumentFolder, DocumentTag, DocumentSortField, DocumentSortDirection,
  DocumentActionId, DocumentScenario,
} from "../../../models/documents";
import {
  VALID_DOCUMENT_VIEWS, VIEW_LABELS, DEFAULT_QUERY,
  VALID_SORT_FIELDS, SORT_LABELS,
  DOCUMENT_STATUS_TONE, STATUS_TONE_CSS,
  VALID_DOC_SCENARIOS,
} from "../../../models/documents";
import { usePageMeta } from "../../../hooks/usePageMeta";

// ── Design tokens (inline styles only — no Tailwind in JSX) ──────────────────

const GF:   React.CSSProperties = { fontFamily: "'Geist', sans-serif" };
const AZURE  = "#0078D4";
const NAVY   = "#07111F";
const SLATE6 = "#64748B";
const SLATE4 = "#94A3B8";
const SLATE2 = "#E2E8F0";
const SLATE1 = "#F8FAFC";
const RED    = "#DC2626";

// ── Responsive CSS ────────────────────────────────────────────────────────────

const DOC_STYLES = SKELETON_STYLE + `
  .doc-layout {
    display: flex;
    gap: 0;
    min-height: 320px;
    margin-top: 8px;
  }
  .doc-folder-panel {
    width: 220px;
    flex-shrink: 0;
    border-right: 1px solid #E2E8F0;
    padding: 4px 0;
  }
  .doc-main {
    flex: 1;
    min-width: 0;
    padding-top: 4px;
  }
  .doc-table-desktop { display: block; }
  .doc-cards-mobile  { display: none; }
  .doc-row { display: grid; grid-template-columns: 40px 1fr 150px 100px 110px 48px; align-items: center; min-height: 52px; border-bottom: 1px solid #F1F5F9; }
  .doc-row:last-child { border-bottom: none; }
  .doc-row:hover { background: #F8FAFC; }
  .doc-header { display: grid; grid-template-columns: 40px 1fr 150px 100px 110px 48px; align-items: center; padding: 8px 0; border-bottom: 1px solid #E2E8F0; }
  .doc-view-tabs { display: flex; gap: 0; border-bottom: 1px solid #E2E8F0; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; }
  .doc-view-tabs::-webkit-scrollbar { display: none; }
  @media (max-width: 900px) {
    .doc-folder-panel { display: none; }
    .doc-row { grid-template-columns: 40px 1fr 130px 88px 48px; }
    .doc-header { grid-template-columns: 40px 1fr 130px 88px 48px; }
    .doc-col-updated { display: none; }
  }
  @media (max-width: 640px) {
    .doc-table-desktop { display: none; }
    .doc-cards-mobile  { display: block; }
  }
  @media (prefers-reduced-motion: reduce) {
    .doc-row { transition: none !important; }
  }
`;

// ── Date formatting ───────────────────────────────────────────────────────────

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "Just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

// ── Query parser / serializer ─────────────────────────────────────────────────

function safeView(raw: string | null): DocumentView {
  return (raw && VALID_DOCUMENT_VIEWS.includes(raw as DocumentView))
    ? (raw as DocumentView) : DEFAULT_QUERY.view;
}
function safeSort(raw: string | null): DocumentSortField {
  return (raw && VALID_SORT_FIELDS.includes(raw as DocumentSortField))
    ? (raw as DocumentSortField) : DEFAULT_QUERY.sort;
}
function safeDir(raw: string | null): DocumentSortDirection {
  return raw === "asc" ? "asc" : "desc";
}
function safePage(raw: string | null): number {
  const n = Number(raw); return Number.isInteger(n) && n > 0 ? n : 1;
}
function safeScenario(params: URLSearchParams): DocumentScenario {
  const raw = params.get("scenario");
  return (raw && VALID_DOC_SCENARIOS.includes(raw as DocumentScenario))
    ? (raw as DocumentScenario) : "standard";
}

function parseQuery(params: URLSearchParams): DocumentListQuery {
  return {
    view:     safeView(params.get("view")),
    q:        params.get("q") ?? "",
    folderId: params.get("folder") ?? null,
    tagId:    params.get("tag") ?? null,
    sort:     safeSort(params.get("sort")),
    dir:      safeDir(params.get("dir")),
    page:     safePage(params.get("page")),
  };
}

function buildParams(q: DocumentListQuery, sc: DocumentScenario): Record<string, string> {
  const out: Record<string, string> = {};
  if (q.view     !== DEFAULT_QUERY.view)  out.view   = q.view;
  if (q.q)                                out.q      = q.q;
  if (q.folderId)                         out.folder = q.folderId;
  if (q.tagId)                            out.tag    = q.tagId;
  if (q.sort     !== DEFAULT_QUERY.sort)  out.sort   = q.sort;
  if (q.dir      !== DEFAULT_QUERY.dir)   out.dir    = q.dir;
  if (q.page > 1)                         out.page   = String(q.page);
  if (sc !== "standard")                  out.scenario = sc;
  return out;
}

// ── Action availability ───────────────────────────────────────────────────────

const ARCHIVABLE_STATUSES: TransactionStatus[] = [
  "completed", "declined", "expired", "voided", "failed-delivery", "cancelled",
];

function getDocActions(
  item: DocumentListItem,
  canPrepare: boolean,
  canVerify: boolean,
): Array<{ id: DocumentActionId; label: string; href?: string; isDanger?: boolean }> {
  const acts: Array<{ id: DocumentActionId; label: string; href?: string; isDanger?: boolean }> = [];
  acts.push({ id: "view", label: "View", href: `/app/documents/${item.id}` });
  if (item.status === "draft" && canPrepare) {
    acts.push({ id: "continue-draft", label: "Continue Editing", href: `/app/documents/${item.id}` });
    acts.push({ id: "rename-draft",   label: "Rename" });
  }
  acts.push({ id: "view-activity", label: "View Activity", href: `/app/documents/${item.id}/activity` });
  if (item.participantCount > 0 && item.status !== "draft") {
    acts.push({ id: "view-participants", label: "Participants", href: `/app/documents/${item.id}/participants` });
  }
  if (item.verificationId && item.verificationStatus === "available" && canVerify) {
    acts.push({ id: "view-evidence", label: "View Evidence", href: `/app/documents/${item.id}/evidence` });
  }
  if (item.status === "archived") {
    acts.push({ id: "restore", label: "Restore" });
  } else if (ARCHIVABLE_STATUSES.includes(item.status)) {
    acts.push({ id: "archive", label: "Archive" });
  }
  return acts;
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TransactionStatus }) {
  const tone = DOCUMENT_STATUS_TONE[status];
  const css  = STATUS_TONE_CSS[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 7px", borderRadius: 4, fontSize: 11, fontWeight: 600,
      letterSpacing: "0.02em", whiteSpace: "nowrap",
      background: css.bg, color: css.text, border: `1px solid ${css.border}`,
      ...GF,
    }}>
      {TRANSACTION_STATUS_LABELS[status]}
    </span>
  );
}

// ── ParticipantProgress ───────────────────────────────────────────────────────

function ParticipantProgress({ done, total }: { done: number; total: number }) {
  if (total === 0) return <span style={{ color: SLATE4, fontSize: 12, ...GF }}>—</span>;
  const pct = Math.round((done / total) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        role="meter"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${done} of ${total} participants completed`}
        style={{ width: 40, height: 4, background: SLATE2, borderRadius: 2, overflow: "hidden", flexShrink: 0 }}
      >
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 2,
          background: pct === 100 ? "#059669" : AZURE,
        }} />
      </div>
      <span style={{ fontSize: 12, color: SLATE6, whiteSpace: "nowrap", ...GF }}>{done}/{total}</span>
    </div>
  );
}

// ── VerificationBadge ─────────────────────────────────────────────────────────

function VerificationBadge({ status }: { status: "pending" | "available" | "viewed" | undefined }) {
  if (!status || status === "pending") return null;
  return (
    <span title={status === "available" ? "Verification available" : "Verification viewed"}
      style={{ color: "#059669", display: "inline-flex", alignItems: "center" }}>
      <ShieldCheck size={13} aria-label={`Verification ${status}`} />
    </span>
  );
}

// ── TagChip ───────────────────────────────────────────────────────────────────

function TagChip({ tag }: { tag: DocumentTag }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "1px 6px", borderRadius: 10, fontSize: 10, fontWeight: 600,
      background: `${tag.color}18`, color: tag.color, border: `1px solid ${tag.color}30`,
      whiteSpace: "nowrap", ...GF,
    }}>
      {tag.name}
    </span>
  );
}

// ── ViewTabStrip ──────────────────────────────────────────────────────────────

function ViewTabStrip({
  view, viewCounts, onChange,
}: {
  view: DocumentView;
  viewCounts: Partial<Record<DocumentView, number>>;
  onChange: (v: DocumentView) => void;
}) {
  return (
    <div className="doc-view-tabs" role="tablist" aria-label="Document views">
      {VALID_DOCUMENT_VIEWS.map(v => {
        const isActive = v === view;
        const count = viewCounts[v];
        return (
          <button
            key={v}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(v)}
            style={{
              padding: "10px 14px", border: "none", cursor: "pointer", whiteSpace: "nowrap",
              fontSize: 13, fontWeight: isActive ? 600 : 400, ...GF,
              borderBottom: isActive ? `2px solid ${AZURE}` : "2px solid transparent",
              color: isActive ? AZURE : SLATE6,
              background: "transparent",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            {VIEW_LABELS[v]}
            {count != null && count > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 8,
                background: isActive ? `${AZURE}18` : "#F1F5F9",
                color: isActive ? AZURE : SLATE6,
              }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── SearchBar ─────────────────────────────────────────────────────────────────

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const id = "doc-search";
  return (
    <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 360 }}>
      <label htmlFor={id} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
        Search documents
      </label>
      <Search size={14} aria-hidden style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: SLATE4, pointerEvents: "none" }} />
      <input
        id={id}
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search documents…"
        style={{
          width: "100%", padding: "7px 32px 7px 32px", border: `1px solid ${SLATE2}`,
          borderRadius: 8, fontSize: 13, ...GF, background: "#fff", color: NAVY,
          outline: "none", boxSizing: "border-box",
        }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: SLATE4, padding: 2, lineHeight: 1 }}
        >
          <X size={13} aria-hidden />
        </button>
      )}
    </div>
  );
}

// ── SortControl ───────────────────────────────────────────────────────────────

function SortControl({
  sort, dir, onChange,
}: {
  sort: DocumentSortField;
  dir: DocumentSortDirection;
  onChange: (s: DocumentSortField, d: DocumentSortDirection) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) { if (!ref.current?.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Sort by ${SORT_LABELS[sort]}, ${dir === "asc" ? "ascending" : "descending"}`}
        style={{
          display: "flex", alignItems: "center", gap: 5, padding: "7px 10px",
          border: `1px solid ${SLATE2}`, borderRadius: 8, background: "#fff",
          cursor: "pointer", fontSize: 13, color: SLATE6, ...GF,
        }}
      >
        <ArrowUpDown size={13} aria-hidden />
        <span>{SORT_LABELS[sort]}</span>
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Sort options"
          style={{
            position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 50,
            background: "#fff", border: `1px solid ${SLATE2}`, borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)", minWidth: 180, padding: "4px 0",
          }}
        >
          {VALID_SORT_FIELDS.map(f => (
            <button
              key={f}
              role="option"
              aria-selected={sort === f}
              onClick={() => {
                const newDir = sort === f ? (dir === "asc" ? "desc" : "asc") : "desc";
                onChange(f, newDir);
                setOpen(false);
              }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "8px 12px", border: "none", cursor: "pointer",
                background: sort === f ? `${AZURE}0c` : "transparent",
                color: sort === f ? AZURE : NAVY, fontSize: 13, ...GF, textAlign: "left",
              }}
            >
              {SORT_LABELS[f]}
              {sort === f && (
                <span style={{ fontSize: 11, color: SLATE4 }}>{dir === "asc" ? "↑" : "↓"}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ActiveFilterChips ─────────────────────────────────────────────────────────

function ActiveFilterChips({
  query, folders, tags, onRemove, onClearAll,
}: {
  query: DocumentListQuery;
  folders: DocumentFolder[];
  tags: DocumentTag[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}) {
  const chips: Array<{ key: string; label: string }> = [];
  if (query.q) chips.push({ key: "q", label: `Search: "${query.q}"` });
  if (query.folderId) {
    const f = folders.find(f => f.id === query.folderId);
    chips.push({ key: "folderId", label: `Folder: ${f?.name ?? query.folderId}` });
  }
  if (query.tagId) {
    const t = tags.find(t => t.id === query.tagId);
    chips.push({ key: "tagId", label: `Tag: ${t?.name ?? query.tagId}` });
  }
  if (chips.length === 0) return null;

  return (
    <div role="region" aria-label="Active filters" style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "4px 0 8px" }}>
      {chips.map(c => (
        <span key={c.key} style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 8px 3px 10px", borderRadius: 12, fontSize: 12,
          background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", ...GF,
        }}>
          {c.label}
          <button
            onClick={() => onRemove(c.key)}
            aria-label={`Remove filter: ${c.label}`}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#60A5FA", lineHeight: 1 }}
          >
            <X size={11} aria-hidden />
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        style={{
          fontSize: 12, ...GF, color: SLATE6, border: "none", background: "none",
          cursor: "pointer", textDecoration: "underline", padding: "3px 4px",
        }}
      >
        Clear all
      </button>
    </div>
  );
}

// ── FolderPanel ───────────────────────────────────────────────────────────────

function FolderPanel({
  folders, selectedId, counts, onChange,
}: {
  folders: DocumentFolder[];
  selectedId: string | null;
  counts: Record<string, number>;
  onChange: (id: string | null) => void;
}) {
  return (
    <nav aria-label="Document folders" className="doc-folder-panel">
      <p style={{ fontSize: 10, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 16px 4px", margin: 0, ...GF }}>
        Folders
      </p>
      <button
        onClick={() => onChange(null)}
        aria-current={!selectedId ? "true" : undefined}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          padding: "7px 16px", border: "none", cursor: "pointer", textAlign: "left",
          background: !selectedId ? `${AZURE}0c` : "transparent",
          color: !selectedId ? AZURE : SLATE6, fontSize: 13, ...GF,
          borderLeft: !selectedId ? `2px solid ${AZURE}` : "2px solid transparent",
        }}
      >
        <FolderOpen size={14} aria-hidden />
        All Folders
      </button>
      {folders.map(f => {
        const isActive = f.id === selectedId;
        const count = counts[f.id] ?? 0;
        return (
          <button
            key={f.id}
            onClick={() => onChange(isActive ? null : f.id)}
            aria-current={isActive ? "true" : undefined}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 8, width: "100%", padding: "7px 16px", border: "none",
              cursor: "pointer", textAlign: "left",
              background: isActive ? `${AZURE}0c` : "transparent",
              color: isActive ? AZURE : SLATE6, fontSize: 13, ...GF,
              borderLeft: isActive ? `2px solid ${AZURE}` : "2px solid transparent",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Folder size={13} aria-hidden />
              {f.name}
            </span>
            {count > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? AZURE : SLATE4 }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

// ── SelectionBar ──────────────────────────────────────────────────────────────

function SelectionBar({
  count, total, tags, onSelectAll, onDeselectAll, onBulkArchive, onBulkAddTag, bulkTagOpen, onToggleBulkTag,
}: {
  count: number;
  total: number;
  tags: DocumentTag[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkArchive?: () => void;
  onBulkAddTag?: (tagId: string) => void;
  bulkTagOpen: boolean;
  onToggleBulkTag: () => void;
}) {
  return (
    <div
      role="region"
      aria-live="polite"
      aria-atomic
      aria-label={`${count} document${count !== 1 ? "s" : ""} selected`}
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "8px 0 10px",
        borderBottom: `1px solid ${SLATE2}`, flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: NAVY, ...GF }}>
        {count} selected
      </span>
      {count < total && (
        <button onClick={onSelectAll} style={{ fontSize: 12, color: AZURE, border: "none", background: "none", cursor: "pointer", ...GF }}>
          Select all {total} visible
        </button>
      )}
      <button onClick={onDeselectAll} style={{ fontSize: 12, color: SLATE6, border: "none", background: "none", cursor: "pointer", ...GF }}>
        Deselect all
      </button>
      {onBulkArchive && (
        <button
          onClick={onBulkArchive}
          style={{
            display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
            border: `1px solid ${SLATE2}`, borderRadius: 6, background: "#fff",
            cursor: "pointer", fontSize: 12, color: SLATE6, ...GF,
          }}
        >
          <Archive size={13} aria-hidden /> Archive
        </button>
      )}
      {onBulkAddTag && (
        <div style={{ position: "relative" }}>
          <button
            onClick={onToggleBulkTag}
            aria-expanded={bulkTagOpen}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
              border: `1px solid ${SLATE2}`, borderRadius: 6, background: "#fff",
              cursor: "pointer", fontSize: 12, color: SLATE6, ...GF,
            }}
          >
            <Tag size={13} aria-hidden /> Add Tag
          </button>
          {bulkTagOpen && (
            <div style={{
              position: "absolute", top: "100%", left: 0, zIndex: 60,
              background: "#fff", border: `1px solid ${SLATE2}`, borderRadius: 8,
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)", minWidth: 160, padding: "4px 0",
            }}>
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => onBulkAddTag(tag.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "8px 12px", border: "none", background: "none",
                    cursor: "pointer", fontSize: 13, ...GF, color: NAVY, textAlign: "left",
                  }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: tag.color, flexShrink: 0 }} aria-hidden />
                  {tag.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── RowActionMenu ─────────────────────────────────────────────────────────────

function RowActionMenu({
  item, isOpen, onToggle, onAction, onRename, canPrepare, canVerify, canArchive,
}: {
  item: DocumentListItem;
  isOpen: boolean;
  onToggle: () => void;
  onAction: (id: DocumentActionId, item: DocumentListItem) => void;
  onRename: (item: DocumentListItem) => void;
  canPrepare: boolean;
  canVerify: boolean;
  canArchive: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef    = useRef<HTMLDivElement>(null);
  const actions    = getDocActions(item, canPrepare, canVerify);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      onToggle();
      triggerRef.current?.focus();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onToggle]);

  return (
    <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
      <button
        ref={triggerRef}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Actions for ${item.title}`}
        onClick={onToggle}
        style={{
          width: 32, height: 32, border: "none", background: "transparent",
          cursor: "pointer", borderRadius: 6, display: "flex", alignItems: "center",
          justifyContent: "center", color: SLATE4,
        }}
      >
        <MoreHorizontal size={15} aria-hidden />
      </button>
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Document actions"
          style={{
            position: "absolute", right: 0, top: "100%", zIndex: 100,
            background: "#fff", border: `1px solid ${SLATE2}`, borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 178, padding: "4px 0",
          }}
          onClick={e => e.stopPropagation()}
        >
          {actions.map(act => {
            if (act.href) {
              return (
                <Link
                  key={act.id}
                  to={act.href}
                  role="menuitem"
                  style={{
                    display: "block", padding: "8px 14px", fontSize: 13,
                    color: NAVY, textDecoration: "none", ...GF,
                  }}
                >
                  {act.label}
                </Link>
              );
            }
            return (
              <button
                key={act.id}
                role="menuitem"
                onClick={() => {
                  onToggle();
                  if (act.id === "rename-draft") { onRename(item); return; }
                  onAction(act.id, item);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "8px 14px", border: "none", cursor: "pointer",
                  background: "none", fontSize: 13, ...GF, color: NAVY, textAlign: "left",
                }}
              >
                {act.id === "archive"      && <Archive    size={13} aria-hidden />}
                {act.id === "restore"      && <RotateCcw  size={13} aria-hidden />}
                {act.id === "rename-draft" && <Pencil     size={13} aria-hidden />}
                {act.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Checkbox ──────────────────────────────────────────────────────────────────

function DocCheckbox({ id, checked, onChange, label }: {
  id: string; checked: boolean;
  onChange: (c: boolean) => void; label: string;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: "0 4px" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        aria-label={label}
        style={{ width: 15, height: 15, cursor: "pointer", accentColor: AZURE }}
      />
    </label>
  );
}

// ── DocumentTable (desktop) ───────────────────────────────────────────────────

function DocumentTable({
  className, items, selectedIds, openMenuId, onToggleSelect, onToggleMenu, onAction, onRename, canPrepare, canVerify, canArchive,
}: {
  className: string;
  items: DocumentListItem[];
  selectedIds: Set<string>;
  openMenuId: string | null;
  onToggleSelect: (id: string) => void;
  onToggleMenu: (id: string) => void;
  onAction: (id: DocumentActionId, item: DocumentListItem) => void;
  onRename: (item: DocumentListItem) => void;
  canPrepare: boolean;
  canVerify: boolean;
  canArchive: boolean;
}) {
  return (
    <div className={className} role="table" aria-label="Documents">
      {/* Header */}
      <div role="rowgroup">
        <div role="row" className="doc-header">
          <div role="columnheader" aria-label="Select" style={{ padding: "0 4px" }} />
          <div role="columnheader" style={{ fontSize: 11, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 8px", ...GF }}>Document</div>
          <div role="columnheader" style={{ fontSize: 11, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 8px", ...GF }}>Status</div>
          <div role="columnheader" style={{ fontSize: 11, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 8px", ...GF }}>Progress</div>
          <div role="columnheader" className="doc-col-updated" style={{ fontSize: 11, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 8px", ...GF }}>Updated</div>
          <div role="columnheader" aria-label="Actions" />
        </div>
      </div>
      {/* Rows */}
      <div role="rowgroup">
        {items.map(item => (
          <div key={item.id} role="row" className="doc-row" aria-selected={selectedIds.has(item.id)}>
            {/* Checkbox */}
            <div role="cell">
              <DocCheckbox
                id={`chk-${item.id}`}
                checked={selectedIds.has(item.id)}
                onChange={() => onToggleSelect(item.id)}
                label={`Select ${item.title}`}
              />
            </div>
            {/* Title cell */}
            <div role="cell" style={{ padding: "8px 8px", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
                <FileText size={15} aria-hidden style={{ flexShrink: 0, marginTop: 2, color: SLATE4 }} />
                <div style={{ minWidth: 0 }}>
                  <Link
                    to={`/app/documents/${item.id}`}
                    style={{
                      fontSize: 13, fontWeight: 600, color: NAVY, textDecoration: "none",
                      display: "block", overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap", ...GF,
                    }}
                    title={item.title}
                  >
                    {item.title}
                  </Link>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: SLATE4, ...GF }}>
                      {item.ownerName}
                    </span>
                    {item.expiresAt && item.status !== "archived" && item.status !== "completed" && (
                      <span style={{ fontSize: 11, color: "#C2410C", ...GF }}>
                        Expires {fmtShort(item.expiresAt)}
                      </span>
                    )}
                    <VerificationBadge status={item.verificationStatus} />
                    {item.tags.slice(0, 2).map(t => <TagChip key={t.id} tag={t} />)}
                  </div>
                </div>
              </div>
            </div>
            {/* Status */}
            <div role="cell" style={{ padding: "8px 8px" }}>
              <StatusBadge status={item.status} />
            </div>
            {/* Progress */}
            <div role="cell" style={{ padding: "8px 8px" }}>
              <ParticipantProgress done={item.completedParticipantCount} total={item.participantCount} />
            </div>
            {/* Updated */}
            <div role="cell" className="doc-col-updated" style={{ padding: "8px 8px" }}>
              <span style={{ fontSize: 12, color: SLATE4, whiteSpace: "nowrap", ...GF }}>
                {fmtRelative(item.updatedAt)}
              </span>
            </div>
            {/* Actions */}
            <div role="cell" style={{ padding: "8px 4px" }}>
              <RowActionMenu
                item={item}
                isOpen={openMenuId === item.id}
                onToggle={() => onToggleMenu(item.id)}
                onAction={onAction}
                onRename={onRename}
                canPrepare={canPrepare}
                canVerify={canVerify}
                canArchive={canArchive}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DocumentCardList (mobile) ─────────────────────────────────────────────────

function DocumentCardList({
  className, items, selectedIds, openMenuId, onToggleSelect, onToggleMenu, onAction, onRename, canPrepare, canVerify, canArchive,
}: {
  className: string;
  items: DocumentListItem[];
  selectedIds: Set<string>;
  openMenuId: string | null;
  onToggleSelect: (id: string) => void;
  onToggleMenu: (id: string) => void;
  onAction: (id: DocumentActionId, item: DocumentListItem) => void;
  onRename: (item: DocumentListItem) => void;
  canPrepare: boolean;
  canVerify: boolean;
  canArchive: boolean;
}) {
  return (
    <ul className={className} style={{ listStyle: "none", margin: 0, padding: 0 }} aria-label="Documents">
      {items.map(item => (
        <li
          key={item.id}
          style={{
            borderBottom: `1px solid #F1F5F9`, padding: "12px 0",
            background: selectedIds.has(item.id) ? "#EFF6FF" : "transparent",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <DocCheckbox
              id={`card-chk-${item.id}`}
              checked={selectedIds.has(item.id)}
              onChange={() => onToggleSelect(item.id)}
              label={`Select ${item.title}`}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link
                to={`/app/documents/${item.id}`}
                style={{
                  fontSize: 14, fontWeight: 600, color: NAVY,
                  textDecoration: "none", display: "block", ...GF,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
                title={item.title}
              >
                {item.title}
              </Link>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <StatusBadge status={item.status} />
                <ParticipantProgress done={item.completedParticipantCount} total={item.participantCount} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: SLATE4, ...GF }}>{fmtRelative(item.updatedAt)}</span>
                {item.expiresAt && item.status !== "archived" && item.status !== "completed" && (
                  <span style={{ fontSize: 11, color: "#C2410C", ...GF }}>Expires {fmtShort(item.expiresAt)}</span>
                )}
                <VerificationBadge status={item.verificationStatus} />
              </div>
            </div>
            <RowActionMenu
              item={item}
              isOpen={openMenuId === item.id}
              onToggle={() => onToggleMenu(item.id)}
              onAction={onAction}
              onRename={onRename}
              canPrepare={canPrepare}
              canVerify={canVerify}
              canArchive={canArchive}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── PaginationControls ────────────────────────────────────────────────────────

function PaginationControls({ page, total, perPage, onPageChange }: {
  page: number; total: number; perPage: number; onPageChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / perPage);
  return (
    <nav aria-label="Pagination" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", flexWrap: "wrap", gap: 8 }}>
      <span style={{ fontSize: 13, color: SLATE6, ...GF }}>
        Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, total)} of {total}
      </span>
      <div style={{ display: "flex", gap: 4 }}>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          style={{
            display: "flex", alignItems: "center", gap: 4, padding: "6px 10px",
            border: `1px solid ${SLATE2}`, borderRadius: 6, background: "#fff",
            cursor: page <= 1 ? "not-allowed" : "pointer", color: page <= 1 ? SLATE4 : SLATE6, fontSize: 13, ...GF,
          }}
        >
          <ChevronLeft size={14} aria-hidden /> Prev
        </button>
        <span style={{ padding: "6px 10px", fontSize: 13, color: SLATE6, ...GF }}>
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          style={{
            display: "flex", alignItems: "center", gap: 4, padding: "6px 10px",
            border: `1px solid ${SLATE2}`, borderRadius: 6, background: "#fff",
            cursor: page >= totalPages ? "not-allowed" : "pointer", color: page >= totalPages ? SLATE4 : SLATE6, fontSize: 13, ...GF,
          }}
        >
          Next <ChevronRight size={14} aria-hidden />
        </button>
      </div>
    </nav>
  );
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────

function SkeletonDocRows() {
  return (
    <div role="status" aria-label="Loading documents" style={{ padding: "16px 0" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: `1px solid #F1F5F9` }}>
          <SkeletonBlock width={15} height={15} radius={3} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <SkeletonBlock width={`${60 + (i * 7) % 25}%`} height={14} />
            <SkeletonBlock width="30%" height={11} />
          </div>
          <SkeletonBlock width={90} height={22} radius={4} />
          <SkeletonBlock width={60} height={14} />
        </div>
      ))}
    </div>
  );
}

// ── Empty view ────────────────────────────────────────────────────────────────

function DocEmptyView({
  view, hasFilters, canPrepare, onClearFilters,
}: {
  view: DocumentView;
  hasFilters: boolean;
  canPrepare: boolean;
  onClearFilters: () => void;
}) {
  if (hasFilters) {
    return (
      <EmptyStateLayout
        icon={<Search size={26} />}
        title="No matching documents"
        description="No documents match the current filters. Try adjusting your search or filters."
        action={
          <button onClick={onClearFilters} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${SLATE2}`, background: "#fff", cursor: "pointer", fontSize: 13, ...GF, color: SLATE6 }}>
            Clear filters
          </button>
        }
      />
    );
  }

  if (view === "archived") {
    return (
      <EmptyStateLayout
        icon={<Archive size={26} />}
        title="No archived documents"
        description="Documents you archive will appear here. Archived documents remain accessible and can be restored at any time."
      />
    );
  }

  if (view === "expiring") {
    return (
      <EmptyStateLayout
        icon={<FileText size={26} />}
        title="No documents expiring soon"
        description="Documents set to expire within the next 14 days will appear here."
      />
    );
  }

  if (view === "awaiting-my-action") {
    return (
      <EmptyStateLayout
        icon={<Users size={26} />}
        title="No pending actions"
        description="Documents waiting for your signature or approval will appear here."
      />
    );
  }

  return (
    <EmptyStateLayout
      icon={<Inbox size={26} />}
      title="No documents yet"
      description="This workspace does not have any documents yet. Prepare a document to get started."
      action={
        canPrepare ? (
          <Link
            to="/app/documents/new"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
              borderRadius: 8, background: AZURE, color: "#fff", textDecoration: "none",
              fontSize: 13, fontWeight: 600, ...GF,
            }}
          >
            <FilePlus size={15} aria-hidden /> Prepare a Document
          </Link>
        ) : undefined
      }
    />
  );
}

// ── Error view ────────────────────────────────────────────────────────────────

function DocErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" style={{ padding: "48px 24px", textAlign: "center" }}>
      <AlertCircle size={32} style={{ color: RED, marginBottom: 12 }} aria-hidden />
      <p style={{ fontSize: 16, fontWeight: 600, color: NAVY, margin: "0 0 8px", ...GF }}>
        Could not load documents
      </p>
      <p style={{ fontSize: 13, color: SLATE6, margin: "0 0 20px", ...GF }}>
        There was a problem loading your document list. This is a demonstration environment — no live service is required.
      </p>
      <button
        onClick={onRetry}
        style={{
          padding: "8px 16px", borderRadius: 8, border: `1px solid ${SLATE2}`,
          background: "#fff", cursor: "pointer", fontSize: 13, ...GF, color: SLATE6,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}
      >
        <RefreshCw size={14} aria-hidden /> Retry
      </button>
    </div>
  );
}

// ── Rename Draft dialog ───────────────────────────────────────────────────────

function RenameDraftDialog({
  item, onSave, onClose,
}: {
  item: DocumentListItem;
  onSave: (title: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(item.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && value.trim()) onSave(value.trim());
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [value, onSave, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-title"
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(7,17,31,0.5)",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: 12, padding: "24px", maxWidth: 480,
        width: "calc(100vw - 32px)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}>
        <h2 id="rename-title" style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: "0 0 16px", ...GF }}>
          Rename Draft
        </h2>
        <label htmlFor="rename-input" style={{ fontSize: 12, fontWeight: 600, color: SLATE6, display: "block", marginBottom: 6, ...GF }}>
          Document title
        </label>
        <input
          id="rename-input"
          ref={inputRef}
          type="text"
          value={value}
          maxLength={200}
          onChange={e => setValue(e.target.value)}
          style={{
            width: "100%", padding: "9px 12px", border: `1px solid ${SLATE2}`, borderRadius: 8,
            fontSize: 14, ...GF, color: NAVY, outline: "none", boxSizing: "border-box",
            marginBottom: 20,
          }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px", borderRadius: 8, border: `1px solid ${SLATE2}`,
              background: "#fff", cursor: "pointer", fontSize: 13, ...GF, color: SLATE6,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => { if (value.trim()) onSave(value.trim()); }}
            disabled={!value.trim()}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: value.trim() ? AZURE : SLATE4,
              color: "#fff", cursor: value.trim() ? "pointer" : "not-allowed",
              fontSize: 13, fontWeight: 600, ...GF,
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DocumentsPage ─────────────────────────────────────────────────────────────

export function DocumentsPage() {
  usePageMeta();
  const { hasPermission, currentWorkspace } = usePlatform();
  const [searchParams, setSearchParams] = useSearchParams();

  const canViewDocs = hasPermission("view_documents");
  const canPrepare  = hasPermission("prepare_documents");
  const canVerify   = hasPermission("verify_documents");
  const canArchive  = hasPermission("prepare_documents");

  const scenario = useMemo(() => safeScenario(searchParams), [searchParams]);
  const query    = useMemo(() => parseQuery(searchParams),   [searchParams]);

  const [result,      setResult]      = useState<DocumentListResult | null>(null);
  const [loadState,   setLoadState]   = useState<"loading" | "ready" | "full-error">("loading");
  const [folders,     setFolders]     = useState<DocumentFolder[]>([]);
  const [tags,        setTags]        = useState<DocumentTag[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openMenuId,  setOpenMenuId]  = useState<string | null>(null);
  const [renameItem,  setRenameItem]  = useState<DocumentListItem | null>(null);
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [loadKey,     setLoadKey]     = useState(0);

  const reloadData = useCallback(() => setLoadKey(k => k + 1), []);

  // Load data; stale-result guard via cancelled flag
  useEffect(() => {
    if (!canViewDocs) return;
    let cancelled = false;
    setLoadState("loading");
    setSelectedIds(new Set());
    setOpenMenuId(null);
    setBulkTagOpen(false);

    Promise.all([
      mockDocumentService.list(query, scenario),
      mockDocumentService.getFolders(),
      mockDocumentService.getTags(),
    ]).then(([res, fols, tgs]) => {
      if (cancelled) return;
      setResult(res);
      setFolders(fols);
      setTags(tgs);
      setLoadState("ready");
    }).catch(() => {
      if (cancelled) return;
      setLoadState("full-error");
    });

    return () => { cancelled = true; };
  }, [query, scenario, currentWorkspace?.id, loadKey, canViewDocs]);

  const updateQuery = useCallback((patch: Partial<DocumentListQuery> & { page?: number }) => {
    const next = { ...query, ...patch, page: patch.page ?? 1 };
    setSearchParams(buildParams(next, scenario), { replace: true });
  }, [query, scenario, setSearchParams]);

  const handleRowAction = useCallback(async (actionId: DocumentActionId, item: DocumentListItem) => {
    setOpenMenuId(null);
    if (actionId === "archive") { await mockDocumentService.archive([item.id]); reloadData(); }
    if (actionId === "restore") { await mockDocumentService.restore([item.id]); reloadData(); }
    if (actionId === "rename-draft") setRenameItem(item);
  }, [reloadData]);

  const handleRenameSave = useCallback(async (title: string) => {
    if (!renameItem) return;
    await mockDocumentService.renameDraft(renameItem.id, title);
    setRenameItem(null);
    reloadData();
  }, [renameItem, reloadData]);

  const handleBulkArchive = useCallback(async () => {
    if (!selectedIds.size) return;
    await mockDocumentService.archive([...selectedIds]);
    setSelectedIds(new Set());
    reloadData();
  }, [selectedIds, reloadData]);

  const handleBulkAddTag = useCallback(async (tagId: string) => {
    if (!selectedIds.size) return;
    await mockDocumentService.addTag([...selectedIds], tagId);
    setBulkTagOpen(false);
    reloadData();
  }, [selectedIds, reloadData]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const pageItems = result?.items ?? [];

  if (!canViewDocs) {
    return (
      <AppContent>
        <div role="alert">
          <EmptyStateLayout
            icon={<ShieldCheck size={28} />}
            title="Access Restricted"
            description="You do not have permission to view documents in this workspace. Contact your workspace administrator."
          />
        </div>
      </AppContent>
    );
  }

  return (
    <>
      <style>{DOC_STYLES}</style>
      <PageHeader
        title="Documents"
        actions={
          canPrepare ? (
            <Link
              to="/app/documents/new"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: AZURE, color: "#fff", textDecoration: "none", ...GF,
              }}
            >
              <FilePlus size={15} aria-hidden />
              Prepare Document
            </Link>
          ) : undefined
        }
      />
      <AppContent style={{ padding: "0 24px 32px" }}>

        {/* View tabs */}
        <ViewTabStrip
          view={query.view}
          viewCounts={result?.viewCounts ?? {}}
          onChange={v => updateQuery({ view: v })}
        />

        {/* Search + Sort toolbar */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "14px 0 8px", flexWrap: "wrap" }}>
          <SearchBar value={query.q} onChange={q => updateQuery({ q })} />
          <SortControl
            sort={query.sort}
            dir={query.dir}
            onChange={(sort, dir) => updateQuery({ sort, dir })}
          />
          <button
            onClick={reloadData}
            aria-label="Refresh documents"
            style={{
              marginLeft: "auto", padding: "7px 10px", borderRadius: 6,
              border: `1px solid ${SLATE2}`, background: "#fff", cursor: "pointer",
              color: SLATE6, display: "flex", alignItems: "center",
            }}
          >
            <RefreshCw size={14} aria-hidden />
          </button>
        </div>

        {/* Active filter chips */}
        {(query.q || query.folderId || query.tagId) && (
          <ActiveFilterChips
            query={query}
            folders={folders}
            tags={tags}
            onRemove={key => updateQuery({ [key]: key === "q" ? "" : null })}
            onClearAll={() => updateQuery({ q: "", folderId: null, tagId: null })}
          />
        )}

        {/* Layout */}
        <div className="doc-layout">
          <FolderPanel
            folders={folders}
            selectedId={query.folderId}
            counts={result?.folderCounts ?? {}}
            onChange={folderId => updateQuery({ folderId })}
          />
          <main className="doc-main" aria-label="Document list">

            {selectedIds.size > 0 && (
              <SelectionBar
                count={selectedIds.size}
                total={pageItems.length}
                tags={tags}
                onSelectAll={() => setSelectedIds(new Set(pageItems.map(i => i.id)))}
                onDeselectAll={() => setSelectedIds(new Set())}
                onBulkArchive={canArchive ? handleBulkArchive : undefined}
                onBulkAddTag={canPrepare ? handleBulkAddTag : undefined}
                bulkTagOpen={bulkTagOpen}
                onToggleBulkTag={() => setBulkTagOpen(o => !o)}
              />
            )}

            {loadState === "loading" && <SkeletonDocRows />}

            {loadState === "full-error" && <DocErrorView onRetry={() => setLoadKey(k => k + 1)} />}

            {loadState === "ready" && (
              pageItems.length === 0 ? (
                <DocEmptyView
                  view={query.view}
                  hasFilters={!!(query.q || query.folderId || query.tagId)}
                  canPrepare={canPrepare}
                  onClearFilters={() => updateQuery({ q: "", folderId: null, tagId: null })}
                />
              ) : (
                <>
                  <DocumentTable
                    className="doc-table-desktop"
                    items={pageItems}
                    selectedIds={selectedIds}
                    openMenuId={openMenuId}
                    onToggleSelect={toggleSelect}
                    onToggleMenu={id => setOpenMenuId(prev => prev === id ? null : id)}
                    onAction={handleRowAction}
                    onRename={setRenameItem}
                    canPrepare={canPrepare}
                    canVerify={canVerify}
                    canArchive={canArchive}
                  />
                  <DocumentCardList
                    className="doc-cards-mobile"
                    items={pageItems}
                    selectedIds={selectedIds}
                    openMenuId={openMenuId}
                    onToggleSelect={toggleSelect}
                    onToggleMenu={id => setOpenMenuId(prev => prev === id ? null : id)}
                    onAction={handleRowAction}
                    onRename={setRenameItem}
                    canPrepare={canPrepare}
                    canVerify={canVerify}
                    canArchive={canArchive}
                  />
                  {result && (result.hasNextPage || result.hasPrevPage) && (
                    <PaginationControls
                      page={result.page}
                      total={result.total}
                      perPage={result.perPage}
                      onPageChange={p => updateQuery({ ...query, page: p })}
                    />
                  )}
                </>
              )
            )}
          </main>
        </div>
      </AppContent>

      {renameItem && (
        <RenameDraftDialog
          item={renameItem}
          onSave={handleRenameSave}
          onClose={() => setRenameItem(null)}
        />
      )}
    </>
  );
}

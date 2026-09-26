// Command 15 — Authenticated Documents Workspace.
// Route: /app/documents  Views: All | Needs Attention | Drafts | In Progress |
//   Awaiting My Action | Completed | Expiring | Failed Delivery | Archived.
// No eNotary document types. No Burgundy (#67023B). No backend mutations.
// No real document content in list. No private audit evidence displayed.
// All participant names are fictional. No IP, device, location shown.

import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import {
  FileText, FilePlus, Search, MoreHorizontal, Archive, RotateCcw, Pencil,
  X, AlertCircle, ChevronLeft, ChevronRight, Tag, FolderOpen, Folder,
  ShieldCheck, Activity, Users, RefreshCw, Inbox, ArrowUpDown,
  Star, Clock, ExternalLink,
  Eye, Bell, Ban, Shuffle, Shield, Info, Send, Download, History, PenLine, FileCheck2
} from "lucide-react";
import { usePlatform } from "../../../context/PlatformContext";
import {
  AppContent, EmptyStateLayout, SkeletonBlock, SKELETON_STYLE, PageHeader,
} from "../../../components/platform";
import { mockDocumentService } from "../../../services/mock/document.service";
import {
  realSigningRequestService,
  type SigningRequestListItem,
  type SigningRequestState,
} from "../../../services/real/signing-request.service";
// Lazy: pdf.js (~400KB) has no reason to load for every Documents page visit
// — only once someone actually opens a document.
const DocumentArchiveViewer = lazy(() =>
  import("../../../components/documents/DocumentArchiveViewer")
    .then(m => ({ default: m.DocumentArchiveViewer })));
import { SignatureRecordDialog } from "../../../components/documents/SignatureRecordDialog";
import { ResendSigningDialog } from "../../../components/documents/ResendSigningDialog";
import { realDocumentService, type RealDocument } from "../../../services/real/document.service";
import { iconForDocument } from "../../../services/documents/file-type-icon";
import { documentOrganizationService } from "../../../services/mock/document-organization.service";
import { isCapabilityInActiveProfile } from "../../../config/capability-resolver";
import { SIGNING_REQUEST_STATUS } from "../../../services/signing-request-status";
import { StatusBadge } from "../../../components/documents/StatusBadge";
import { VerificationIdActions } from "../../../components/documents/VerificationIdActions";
import { AuditTrailDialog } from "../../../components/documents/AuditTrailDialog";
import type { TransactionStatus } from "../../../models";
import type {
  DocumentView, DocumentListQuery, DocumentListItem, DocumentListResult,
  DocumentFolder, DocumentTag, DocumentSortField, DocumentSortDirection,
  DocumentActionId, DocumentScenario,
} from "../../../models/documents";
import {
  VALID_DOCUMENT_VIEWS, VIEW_LABELS, DEFAULT_QUERY,
  VALID_SORT_FIELDS, SORT_LABELS,
  VALID_DOC_SCENARIOS,
  ORG_FILTERED_VIEWS,
} from "../../../models/documents";
import type {
  OrgTag, OrgFolder as OrgFolderType, OrgTagId, OrgSavedView,
} from "../../../models/document-organization";
import { TAG_STYLE_COLORS } from "../../../models/document-organization";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import { preparationRoute } from "../../../services/preparation-platform-projection";
import { Z } from "../../../utils/z-index";
import { FilterChips } from "../../../components/platform/FilterChips";
import { usePrepareLaunch } from "../../../hooks/usePrepareLaunch";
import { isSearchFocusShortcut } from "../../../utils/keyboard-shortcuts";
import { DocumentsToSignSection, SignedByMeSection, OthersSection } from "./MySigningSections";
import { realMySigningService, isSignerEntry } from "../../../services/real/my-signing.service";

// ── Design tokens (inline styles only — no Tailwind in JSX) ──────────────────

const GF:    React.CSSProperties = { fontFamily: "'Geist', sans-serif" };
const AZURE  = "#0078D4";
const NAVY   = "#07111F";
const SLATE6 = "#64748B";
const SLATE4 = "#94A3B8";
const SLATE2 = "#E2E8F0";
const RED    = "#DC2626";
const AMBER  = "#D97706";

// ── Responsive CSS ────────────────────────────────────────────────────────────

const DOC_STYLES = SKELETON_STYLE + `
  .doc-layout {
    display: flex;
    gap: 0;
    min-height: 320px;
    margin-top: 8px;
  }
  .doc-folder-panel {
    width: 232px;
    flex-shrink: 0;
    border-right: 1px solid #E2E8F0;
    padding: 4px 0;
    overflow-y: auto;
  }
  .doc-main {
    flex: 1;
    min-width: 0;
    padding-top: 4px;
  }
  .doc-org-view-btn {
    display: flex; align-items: center; gap: 7px;
    width: 100%; padding: 6px 14px; border: none; cursor: pointer;
    text-align: left; font-family: 'Geist', sans-serif;
    font-size: 12px; border-left: 2px solid transparent;
    background: transparent; color: #64748B;
  }
  .doc-org-view-btn:hover { background: #F8FAFC; }
  .doc-org-view-btn.active { background: #EFF6FF18; color: #0078D4; border-left-color: #0078D4; font-weight: 600; }
  .doc-table-desktop { display: block; }
  .doc-cards-mobile  { display: none; }

  /* ── A bounded list ───────────────────────────────────────────────────
     The list grew without limit, so a workspace with eighty documents
     pushed the page footer — and every control below the table — an
     unreachable distance down. Capping it keeps the page a fixed shape
     whatever it contains.

     min() against vh rather than a fixed pixel height: 60vh is about
     eight rows on a laptop and about four on a phone, which is the right
     proportion in both cases, while the px ceiling stops it becoming
     absurd on a very tall monitor. */
  /* Space above the whole table, not between its header and its rows —
     doc-list-scroll is the row group, and a margin there would open a gap
     under the column headings. The mobile card list has no header, so it
     carries its own. */
  .doc-cards-mobile { margin-top: 45px; }
  @media (max-width: 767px) {
    .doc-list-scroll {
      max-height: 62vh;
      overflow-y: auto;
      overscroll-behavior: contain;
    }
  }
  /* The header must NOT scroll with the rows — a column header that
     disappears takes the meaning of every cell with it. */
  .doc-list-head { position: sticky; top: 0; z-index: 1; background: #FFFFFF; margin-top: 45px; }

  /* The actions wrap onto their own line rather than squeezing the title. */
  .doc-action { flex-shrink: 0; }
  @media (max-width: 400px) {
    .doc-action-label { display: none; }
    .doc-action { padding: 0 8px; }
  }

  .doc-list-scroll::-webkit-scrollbar       { width: 8px; }
  .doc-list-scroll::-webkit-scrollbar-track { background: transparent; }
  .doc-list-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
  /* Column widths are sized to their CONTENT, not guessed. The progress
     column carries a 40px meter, a "1/1" count and a "Signed"/"Details"
     label with gaps — around 128px at the platform's 12px body size — so
     the old 100px track let it bleed over the Created column beside it.
     150px holds it with headroom; \`column-gap\` then guarantees a visible
     separation even if a future label runs long. */
  .doc-row { display: grid; grid-template-columns: 40px minmax(0, 1fr) 150px 164px 150px 116px auto; column-gap: 8px; align-items: center; min-height: 52px; border-bottom: 1px solid #F1F5F9; }
  .doc-row:last-child { border-bottom: none; }
  .doc-row:hover { background: #F8FAFC; }
  .doc-header { display: grid; grid-template-columns: 40px minmax(0, 1fr) 150px 164px 150px 116px auto; column-gap: 8px; align-items: center; padding: 8px 0; border-bottom: 1px solid #E2E8F0; }
  /* Every cell is its own containment context. Without this a long title or
     a wide meter widens its track instead of truncating inside it, which is
     what turns one overflowing cell into a shifted row. */
  .doc-row > *, .doc-header > * { min-width: 0; overflow: hidden; }
  .doc-view-tabs { display: flex; gap: 0; border-bottom: 1px solid #E2E8F0; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; }
  .doc-view-tabs::-webkit-scrollbar { display: none; }
  /* Verification ID: its own column from 1024px; below that the id moves
     into the row's title cell (tablet) or the card (phone). */
  .doc-vid-tablet { display: none; }
  @media (max-width: 1023px) {
    .doc-row { grid-template-columns: 40px minmax(0, 1fr) 150px 150px 116px auto; }
    .doc-header { grid-template-columns: 40px minmax(0, 1fr) 150px 150px 116px auto; }
    .doc-col-vid { display: none; }
    .doc-vid-tablet { display: block; margin-top: 4px; }
  }
  @media (max-width: 900px) {
    .doc-folder-panel { display: none; }
    /* Created is dropped here, so five tracks. Progress keeps a real width
       rather than the old 88px: the same meter and label still have to fit,
       and squeezing the track is what produced the overlap in the first
       place. */
    .doc-row { grid-template-columns: 40px minmax(0, 1fr) 130px 140px auto; }
    .doc-header { grid-template-columns: 40px minmax(0, 1fr) 130px 140px auto; }
    .doc-col-updated { display: none; }
  }
  @media (max-width: 767px) {
    .doc-table-desktop { display: none; }
    /* contents, not block: on a phone the card list takes no box of its own,
       so its cards sit directly in the page flow rather than inside a
       separately scrolling frame. */
    .doc-cards-mobile  { display: contents; }
  }
  /* The live table's own tracks.

     The header and the rows are SEPARATE grids: the header must stay put
     while the rows scroll beneath it. Separate grids only line up when every
     track has the same width in both, and the actions track used to be auto.
     In a row, auto grew to fit four labelled buttons, about 430px. In the
     header, whose actions cell is empty, it was 0px. The difference went to
     the title track, so every heading to its right (Status, Progress,
     Created) sat several hundred pixels right of its data.

     Fixed tracks throughout, so both grids resolve identically. The actions
     track is sized for the widest row (Send again, Signers, History, View);
     narrower screens stack the buttons two by two rather than dropping
     their labels. */
  .doc-row.doc-grid-real, .doc-header.doc-grid-real {
    grid-template-columns: 40px minmax(0, 1fr) 130px 164px 150px 96px 448px;
  }
  .doc-actions-cell { display: flex; flex-wrap: wrap; gap: 4px; justify-content: flex-end; }
  @media (max-width: 1440px) {
    .doc-row.doc-grid-real, .doc-header.doc-grid-real {
      grid-template-columns: 40px minmax(0, 1fr) 120px 156px 140px 90px 248px;
    }
  }
  @media (max-width: 1180px) {
    .doc-row.doc-grid-real, .doc-header.doc-grid-real {
      grid-template-columns: 40px minmax(0, 1fr) 110px 156px 128px 160px;
    }
    .doc-grid-real > .doc-col-updated { display: none; }
    /* Icon-only actions here (each keeps its aria-label and tooltip): with
       labels the four buttons took 248px and left the title no room. */
    .doc-grid-real .doc-action-label { display: none; }
    .doc-grid-real .doc-action { padding: 0 9px !important; }
  }
  /* Tablet: the sidebar leaves about 480px, too little for a title track
     beside four fixed ones (it resolved to ~16px). The title takes a line of
     its own across the row — with the Verification ID beneath it — and
     Status, Progress and the actions sit on the line below, under their
     headings. */
  @media (max-width: 1023px) {
    .doc-row.doc-grid-real, .doc-header.doc-grid-real {
      grid-template-columns: 110px 128px minmax(0, 1fr);
    }
    .doc-grid-real > :first-child { display: none; }
    .doc-row.doc-grid-real > :nth-child(2) { grid-column: 1 / -1; padding-top: 10px !important; padding-bottom: 0 !important; }
    .doc-header.doc-grid-real > :nth-child(2) { display: none; }
    .doc-row.doc-grid-real { padding-bottom: 6px; }
  }

  /* Search and filters above the live table. */
  .doc-filter-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 16px; }
  .doc-filter-field { position: relative; flex: 1 1 220px; max-width: 340px; }
  .doc-filter-field input, .doc-filter-select {
    width: 100%; box-sizing: border-box; height: 36px; border: 1px solid #E2E8F0;
    border-radius: 8px; font-size: 13px; color: #07111F; background: #FFFFFF;
    font-family: 'Geist', sans-serif; outline: none;
  }
  .doc-filter-field input { padding: 0 34px 0 32px; }
  .doc-filter-field input:focus, .doc-filter-select:focus { border-color: #0078D4; box-shadow: 0 0 0 3px rgba(0,120,212,0.12); }
  .doc-filter-select { flex: 0 1 190px; width: auto; min-width: 150px; padding: 0 10px; cursor: pointer; }
  .doc-filter-kbd {
    position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
    font-family: 'Geist Mono', monospace; font-size: 11px; color: #5B6776;
    border: 1px solid #E2E8F0; border-radius: 4px; padding: 0 5px; line-height: 18px;
    background: #F8FAFC; pointer-events: none;
  }
  /* Phones. Two faults, both fixed here.

     The inputs were 13px, and iOS zooms the whole page when a field under
     16px takes focus, which is what threw the list and its cards out of
     place. 16px on phones stops the zoom.

     And every control took its own full-width row, four rows deep, pushing
     the list half a screen down. Now it is a grid: the name search spans
     the width, signer and status share the next row, and the count and
     Clear sit on one line beneath. */
  @media (max-width: 767px) {
    .doc-filter-bar {
      display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 8px; align-items: stretch;
    }
    .doc-filter-bar > .doc-filter-field:first-of-type { grid-column: 1 / -1; }
    .doc-filter-field, .doc-filter-select { max-width: none; min-width: 0; width: 100%; }
    .doc-filter-field input, .doc-filter-select { font-size: 16px; height: 42px; }
    .doc-filter-meta { grid-column: 1 / -1; }
    .doc-filter-kbd { display: none; }
    .doc-cards-mobile { margin-top: 16px; }
  }

  /* The three lists: what this workspace sent, and what was sent to me. */
  .doc-list-tabs { display: flex; gap: 4px; margin-top: 16px; border-bottom: 1px solid #E2E8F0; overflow-x: auto; scrollbar-width: none; }
  .doc-list-tabs::-webkit-scrollbar { display: none; }
  .doc-list-tab {
    display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
    padding: 10px 12px; font-family: 'Geist', sans-serif; font-size: 13px; font-weight: 600;
    color: #64748B; background: none; border: none; border-bottom: 2px solid transparent;
    cursor: pointer; margin-bottom: -1px;
  }
  .doc-list-tab[aria-selected="true"] { color: #0078D4; border-bottom-color: #0078D4; }
  .doc-list-count {
    min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; font-size: 11px;
    display: inline-flex; align-items: center; justify-content: center;
    background: #0078D4; color: #FFFFFF;
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

/** The Verification ID shown in the list: only a completed document has one to show. */
function completedVerificationId(item: DocumentListItem): string | null {
  return item.status === "completed" && item.verificationId ? item.verificationId : null;
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
// Lives in components/documents/StatusBadge.tsx now, shared with the
// dashboard. Same markup, same tone and label maps.

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

// ── PreparationBadge (Gap Closure Command 5) ─────────────────────────────────
//
// Bulk Send provenance, shown SECONDARY to document status — never in place of
// it, never styled to compete with it, and never in the Status cell. A document
// created from a batch has a real document status; where it came from is
// context, not state.
//
// Renders only for documents that carry `bulkSendSource`, which the Bulk Send
// service attaches to frontend Draft Projections. That field holds opaque IDs and
// safe labels only — batch name and Template name, never a recipient name, email
// address, organization, or source-row value — so nothing private can surface
// here.
//
// The link is the batch, not the row: opening it goes to preparation UI the user
// can already reach, and grants no access to anything new.
function PreparationBadge({ source }: { source: DocumentListItem["bulkSendSource"] }) {
  const { resolveCapability } = usePlatform();
  if (!source) return null;
  // A projection can outlive the capability being in the profile. Show plain
  // provenance text rather than a link into a guarded route.
  const available = resolveCapability("bulk-send").available;

  const label = "From Bulk Send";
  const title = `Created from the Bulk Send batch "${source.batchName}". Preparation only — nothing was sent from this batch.`;

  if (!available) {
    return (
      <span title={title} style={{ fontSize: 11, color: SLATE4, ...GF }}>
        {label}
      </span>
    );
  }

  return (
    <Link
      to={preparationRoute(source.batchId)}
      title={title}
      style={{
        fontSize: 11, color: SLATE4, textDecoration: "none", ...GF,
        display: "inline-flex", alignItems: "center", gap: 3,
        borderBottom: "1px dotted #CBD5E1",
      }}
    >
      <Send size={11} aria-hidden />
      {label}
    </Link>
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
            position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: Z.dropdown,
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

// ── Active filter derivation ──────────────────────────────────────────────────
// The chips themselves now live in components/platform/FilterChips so every
// list surface renders them identically; this only decides what is active here.

function documentFilterChips(
  query: DocumentListQuery,
  folders: DocumentFolder[],
  tags: DocumentTag[],
): Array<{ key: string; label: string }> {
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
  return chips;
}

// ── OrgSidePanel ──────────────────────────────────────────────────────────────
// Extended folder panel with org views (starred, recents, etc.), saved views,
// and a management link to /app/documents/folders.

function OrgSidePanel({
  folders, selectedFolderId, folderCounts, activeView, savedViews, starredCount, recentCount,
  onFolderChange, onViewChange,
}: {
  folders: DocumentFolder[];
  selectedFolderId: string | null;
  folderCounts: Record<string, number>;
  activeView: DocumentView;
  savedViews: OrgSavedView[];
  starredCount: number;
  recentCount: number;
  onFolderChange: (id: string | null) => void;
  onViewChange: (v: DocumentView) => void;
}) {
  // Org views shown in sidebar
  const ORG_VIEWS: Array<{ view: DocumentView; icon: React.ReactNode; label: string }> = [
    { view: "starred",        icon: <Star size={12} aria-hidden />,     label: "Starred" },
    { view: "recently-viewed", icon: <Clock size={12} aria-hidden />,   label: "Recently Viewed" },
    { view: "owned-by-me",    icon: <ShieldCheck size={12} aria-hidden />, label: "Owned by Me" },
    { view: "shared-with-me", icon: <Users size={12} aria-hidden />,    label: "Shared with Me" },
    { view: "awaiting-others", icon: <Activity size={12} aria-hidden />, label: "Awaiting Others" },
  ];

  const isOrgView = ORG_FILTERED_VIEWS.includes(activeView);
  const activeSavedViews = savedViews.filter(v => v.status !== "archived").slice(0, 5);

  return (
    <nav aria-label="Document organization" className="doc-folder-panel">

      {/* Org Views */}
      <div style={{ marginBottom: 4 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 14px 4px", margin: 0, ...GF }}>Views</p>
        {ORG_VIEWS.map(({ view, icon, label }) => {
          const isActive = activeView === view && !selectedFolderId;
          const badge = view === "starred" ? starredCount : view === "recently-viewed" ? recentCount : undefined;
          return (
            <button
              key={view}
              className={`doc-org-view-btn${isActive ? " active" : ""}`}
              aria-current={isActive ? "true" : undefined}
              onClick={() => { onFolderChange(null); onViewChange(view); }}
            >
              {icon}
              <span style={{ flex: 1 }}>{label}</span>
              {badge != null && badge > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? AZURE : SLATE4 }}>{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ height: 1, background: SLATE2, margin: "6px 10px" }} />

      {/* Folders */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 14px 4px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0, ...GF }}>Folders</p>
          <Link to="/app/documents/folders" style={{ fontSize: 10, color: AZURE, ...GF, textDecoration: "none", fontWeight: 600 }} aria-label="Manage folders">Manage</Link>
        </div>
        <button
          onClick={() => { onFolderChange(null); if (isOrgView) onViewChange("all"); }}
          aria-current={!selectedFolderId && !isOrgView ? "true" : undefined}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "6px 14px", border: "none", cursor: "pointer", textAlign: "left",
            background: !selectedFolderId && !isOrgView ? `${AZURE}0c` : "transparent",
            color: !selectedFolderId && !isOrgView ? AZURE : SLATE6, fontSize: 12, ...GF,
            borderLeft: !selectedFolderId && !isOrgView ? `2px solid ${AZURE}` : "2px solid transparent",
          }}
        >
          <FolderOpen size={13} aria-hidden />
          All Folders
        </button>
        {folders.map(f => {
          const isActive = f.id === selectedFolderId;
          const count = folderCounts[f.id] ?? 0;
          return (
            <button
              key={f.id}
              onClick={() => { onFolderChange(isActive ? null : f.id); if (isOrgView) onViewChange("all"); }}
              aria-current={isActive ? "true" : undefined}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 8, width: "100%", padding: "6px 14px", border: "none",
                cursor: "pointer", textAlign: "left",
                background: isActive ? `${AZURE}0c` : "transparent",
                color: isActive ? AZURE : SLATE6, fontSize: 12, ...GF,
                borderLeft: isActive ? `2px solid ${AZURE}` : "2px solid transparent",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, overflow: "hidden" }}>
                <Folder size={12} aria-hidden style={{ flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
              </span>
              {count > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? AZURE : SLATE4, flexShrink: 0 }}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Saved Views — advanced-document-organization (post-launch). The whole
          section is omitted in the launch profile because every link inside it
          targets a capability-guarded route. */}
      {isCapabilityInActiveProfile("advanced-document-organization") && activeSavedViews.length > 0 && (
        <>
          <div style={{ height: 1, background: SLATE2, margin: "6px 10px" }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 14px 4px" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0, ...GF }}>Saved Views</p>
              <Link to="/app/documents/saved-views" style={{ fontSize: 10, color: AZURE, ...GF, textDecoration: "none", fontWeight: 600 }} aria-label="Manage saved views">All</Link>
            </div>
            {activeSavedViews.map(sv => (
              <Link
                key={sv.id}
                to={`/app/documents/saved-views/${sv.id}`}
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "6px 14px",
                  fontSize: 12, color: SLATE6, ...GF, textDecoration: "none",
                  borderLeft: "2px solid transparent",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                <Eye size={11} aria-hidden style={{ flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{sv.name}</span>
                {sv.isDefault && <Star size={9} style={{ color: AZURE, flexShrink: 0 }} aria-label="Default" />}
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Tags management link */}
      <div style={{ height: 1, background: SLATE2, margin: "6px 10px" }} />
      <Link
        to="/app/documents/tags"
        style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 14px", fontSize: 12, color: SLATE6, ...GF, textDecoration: "none" }}
      >
        <Tag size={12} aria-hidden /> Manage Tags
      </Link>
    </nav>
  );
}

// ── OrgBulkBar ────────────────────────────────────────────────────────────────
// Full C31 bulk action bar with org operations and preview actions.

function OrgBulkBar({
  count, total, items: _items, orgTags, orgFolders: _orgFolders, onSelectAll, onDeselectAll,
  onBulkArchive, onBulkRestore, onBulkAddTag, onBulkRemoveTag,
  onBulkStar, onBulkUnstar,
  onPreviewExport, onPreviewReminders, onPreviewCancel,
  onPreviewOwnership, onPreviewRetention,
  activeView,
}: {
  count: number;
  total: number;
  items: DocumentListItem[];
  orgTags: OrgTag[];
  orgFolders: OrgFolderType[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkArchive?: () => void;
  onBulkRestore?: () => void;
  onBulkAddTag?: (tagId: OrgTagId) => void;
  onBulkRemoveTag?: (tagId: OrgTagId) => void;
  onBulkStar?: () => void;
  onBulkUnstar?: () => void;
  onPreviewExport?: () => void;
  onPreviewReminders?: () => void;
  onPreviewCancel?: () => void;
  onPreviewOwnership?: () => void;
  onPreviewRetention?: () => void;
  activeView: DocumentView;
}) {
  const [tagMenuOpen, setTagMenuOpen] = useState<"add" | "remove" | null>(null);
  const [moreOpen, setMoreOpen]       = useState(false);
  const tagRef  = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tagMenuOpen && !moreOpen) return;
    function h(e: MouseEvent) {
      if (tagRef.current && !tagRef.current.contains(e.target as Node)) setTagMenuOpen(null);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [tagMenuOpen, moreOpen]);

  const isArchivedView = activeView === "archived";
  const activeTags = orgTags.filter(t => t.status === "active");

  return (
    <div
      role="region"
      aria-live="polite"
      aria-atomic
      aria-label={`${count} document${count !== 1 ? "s" : ""} selected`}
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "8px 0 10px",
        borderBottom: `1px solid ${SLATE2}`, flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: NAVY, ...GF, marginRight: 4 }}>
        {count} selected
      </span>
      {count < total && (
        <button onClick={onSelectAll} style={{ fontSize: 12, color: AZURE, border: "none", background: "none", cursor: "pointer", ...GF }}>
          Select all {total}
        </button>
      )}
      <button onClick={onDeselectAll} style={{ fontSize: 12, color: SLATE6, border: "none", background: "none", cursor: "pointer", ...GF }}>
        Clear
      </button>

      <div style={{ width: 1, height: 20, background: SLATE2, margin: "0 2px" }} aria-hidden />

      {/* Move to Folder (not in this bar — done via document detail) */}

      {/* Add Tags */}
      {onBulkAddTag && (
        <div ref={tagRef} style={{ position: "relative" }}>
          <button
            onClick={() => setTagMenuOpen(prev => prev === "add" ? null : "add")}
            aria-expanded={tagMenuOpen === "add"}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 9px", border: `1px solid ${SLATE2}`, borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 12, color: SLATE6, ...GF }}
          >
            <Tag size={12} aria-hidden /> Add Tag
          </button>
          {tagMenuOpen === "add" && (
            <div style={{ position: "absolute", top: "100%", left: 0, zIndex: Z.dropdown, background: "#fff", border: `1px solid ${SLATE2}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", minWidth: 160, padding: "4px 0" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.06em", padding: "6px 12px 4px", margin: 0, ...GF }}>Add tag to selected</p>
              {activeTags.length === 0 && <p style={{ fontSize: 12, color: SLATE4, padding: "8px 12px", margin: 0, ...GF }}>No active tags</p>}
              {activeTags.map(t => (
                <button key={t.id} onClick={() => { onBulkAddTag(t.id); setTagMenuOpen(null); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: NAVY, ...GF, textAlign: "left" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: TAG_STYLE_COLORS[t.style], flexShrink: 0 }} aria-hidden />
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Remove Tags */}
      {onBulkRemoveTag && (
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setTagMenuOpen(prev => prev === "remove" ? null : "remove")}
            aria-expanded={tagMenuOpen === "remove"}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 9px", border: `1px solid ${SLATE2}`, borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 12, color: SLATE6, ...GF }}
          >
            <Tag size={12} aria-hidden /> Remove Tag
          </button>
          {tagMenuOpen === "remove" && (
            <div style={{ position: "absolute", top: "100%", left: 0, zIndex: Z.dropdown, background: "#fff", border: `1px solid ${SLATE2}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", minWidth: 160, padding: "4px 0" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.06em", padding: "6px 12px 4px", margin: 0, ...GF }}>Remove tag from selected</p>
              {activeTags.length === 0 && <p style={{ fontSize: 12, color: SLATE4, padding: "8px 12px", margin: 0, ...GF }}>No active tags</p>}
              {activeTags.map(t => (
                <button key={t.id} onClick={() => { onBulkRemoveTag(t.id); setTagMenuOpen(null); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: NAVY, ...GF, textAlign: "left" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: TAG_STYLE_COLORS[t.style], flexShrink: 0 }} aria-hidden />
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Star / Unstar */}
      {onBulkStar && (
        <button onClick={onBulkStar} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 9px", border: `1px solid ${SLATE2}`, borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 12, color: SLATE6, ...GF }}>
          <Star size={12} aria-hidden /> Star
        </button>
      )}
      {onBulkUnstar && (
        <button onClick={onBulkUnstar} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 9px", border: `1px solid ${SLATE2}`, borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 12, color: SLATE6, ...GF }}>
          <Star size={12} aria-hidden /> Unstar
        </button>
      )}

      {/* Archive / Restore */}
      {onBulkArchive && !isArchivedView && (
        <button onClick={onBulkArchive} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 9px", border: `1px solid ${SLATE2}`, borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 12, color: SLATE6, ...GF }}>
          <Archive size={12} aria-hidden /> Archive
        </button>
      )}
      {onBulkRestore && isArchivedView && (
        <button onClick={onBulkRestore} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 9px", border: `1px solid ${SLATE2}`, borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 12, color: SLATE6, ...GF }}>
          <RotateCcw size={12} aria-hidden /> Restore
        </button>
      )}

      {/* More / Preview actions */}
      <div ref={moreRef} style={{ position: "relative", marginLeft: "auto" }}>
        <button
          onClick={() => setMoreOpen(o => !o)}
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 9px", border: `1px solid ${SLATE2}`, borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 12, color: SLATE6, ...GF }}
        >
          More actions
        </button>
        {moreOpen && (
          <div role="menu" aria-label="More bulk actions" style={{ position: "absolute", right: 0, top: "100%", zIndex: Z.dropdown, background: "#fff", border: `1px solid ${SLATE2}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", minWidth: 220, padding: "4px 0" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.06em", padding: "6px 12px 4px", margin: 0, ...GF }}>Previews (no mutation)</p>
            {onPreviewExport && (
              <button role="menuitem" onClick={() => { setMoreOpen(false); onPreviewExport(); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: NAVY, ...GF, textAlign: "left" }}>
                <ExternalLink size={12} aria-hidden /> Preview Export
              </button>
            )}
            {onPreviewReminders && (
              <button role="menuitem" onClick={() => { setMoreOpen(false); onPreviewReminders(); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: NAVY, ...GF, textAlign: "left" }}>
                <Bell size={12} aria-hidden /> Preview Reminders
              </button>
            )}
            {onPreviewCancel && (
              <button role="menuitem" onClick={() => { setMoreOpen(false); onPreviewCancel(); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: NAVY, ...GF, textAlign: "left" }}>
                <Ban size={12} aria-hidden /> Preview Cancellation
              </button>
            )}
            {onPreviewOwnership && (
              <button role="menuitem" onClick={() => { setMoreOpen(false); onPreviewOwnership(); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: NAVY, ...GF, textAlign: "left" }}>
                <Shuffle size={12} aria-hidden /> Preview Ownership Transfer
              </button>
            )}
            {onPreviewRetention && (
              <button role="menuitem" onClick={() => { setMoreOpen(false); onPreviewRetention(); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: NAVY, ...GF, textAlign: "left" }}>
                <Shield size={12} aria-hidden /> Preview Retention
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Preview Dialogs ───────────────────────────────────────────────────────────
// Each preview shows the notice and never mutates state.

function PreviewDialog({
  title, notice, body, onClose,
}: {
  title: string;
  notice: string;
  body: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    function h(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="preview-dialog-title"
      style={{ position: "fixed", inset: 0, zIndex: Z.modal, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(7,17,31,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 480, width: "calc(100vw - 32px)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 id="preview-dialog-title" style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0, ...GF }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: SLATE4, padding: 2 }}><X size={16} aria-hidden /></button>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 12px", borderRadius: 8, background: "#FFFBEB", border: "1px solid #FDE68A", marginBottom: 16 }}>
          <Info size={13} style={{ color: AMBER, flexShrink: 0, marginTop: 1 }} aria-hidden />
          <p style={{ fontSize: 12, color: "#92400E", margin: 0, ...GF, fontStyle: "italic" }}>{notice}</p>
        </div>
        {body}
        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${SLATE2}`, background: "#fff", cursor: "pointer", fontSize: 13, ...GF, color: SLATE6 }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Legacy SelectionBar (kept for backward compat, unused in new flow) ─────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- retained for backward-compat reference, intentionally unused
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
              position: "absolute", top: "100%", left: 0, zIndex: Z.dropdown,
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
  item, isOpen, onToggle, onAction, onRename, canPrepare, canVerify, canArchive: _canArchive,
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
            position: "absolute", right: 0, top: "100%", zIndex: Z.dropdown,
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

function DocCheckbox({ id: _id, checked, onChange, label }: {
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
          <div role="columnheader" className="doc-col-vid" style={{ fontSize: 11, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 8px", whiteSpace: "nowrap", ...GF }}>Verification ID</div>
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
                    <PreparationBadge source={item.bulkSendSource} />
                    {item.tags.slice(0, 2).map(t => <TagChip key={t.id} tag={t} />)}
                  </div>
                  {completedVerificationId(item) && (
                    <div className="doc-vid-tablet">
                      <VerificationIdActions id={completedVerificationId(item)} variant="line" label="Verification ID" />
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Status */}
            <div role="cell" style={{ padding: "8px 8px" }}>
              <StatusBadge status={item.status} />
            </div>
            {/* Verification ID */}
            <div role="cell" className="doc-col-vid" style={{ padding: "8px 8px" }}>
              <VerificationIdActions id={completedVerificationId(item)} />
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
              {completedVerificationId(item) && (
                <div style={{ marginTop: 6 }}>
                  <VerificationIdActions id={completedVerificationId(item)} variant="line" label="Verification ID" />
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: SLATE4, ...GF }}>{fmtRelative(item.updatedAt)}</span>
                {item.expiresAt && item.status !== "archived" && item.status !== "completed" && (
                  <span style={{ fontSize: 11, color: "#C2410C", ...GF }}>Expires {fmtShort(item.expiresAt)}</span>
                )}
                <VerificationBadge status={item.verificationStatus} />
                <PreparationBadge source={item.bulkSendSource} />
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
  const { onPrepareClick } = usePrepareLaunch();
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
            to="/app/prepare"
            onClick={onPrepareClick()}
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
        position: "fixed", inset: 0, zIndex: Z.modal,
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

function DocumentsPageMockDemo() {
  usePageMeta();
  const { onPrepareClick } = usePrepareLaunch();
  const { hasPermission, currentWorkspace, user } = usePlatform();
  const [searchParams, setSearchParams] = useSearchParams();

  const canViewDocs = hasPermission("view_documents");
  const canPrepare  = hasPermission("prepare_documents");
  const canVerify   = hasPermission("verify_documents");
  const canArchive  = hasPermission("prepare_documents");

  const scenario = useMemo(() => safeScenario(searchParams), [searchParams]);
  const query    = useMemo(() => parseQuery(searchParams),   [searchParams]);

  const userId      = user?.id ?? "usr_ana_reyes";
  const workspaceId = currentWorkspace?.id ?? "ws_northbridge_001";

  // ── Core document state ───────────────────────────────────────────────────
  const [result,      setResult]      = useState<DocumentListResult | null>(null);
  const [loadState,   setLoadState]   = useState<"loading" | "ready" | "full-error">("loading");
  const [folders,     setFolders]     = useState<DocumentFolder[]>([]);
  const [tags,        setTags]        = useState<DocumentTag[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openMenuId,  setOpenMenuId]  = useState<string | null>(null);
  const [renameItem,  setRenameItem]  = useState<DocumentListItem | null>(null);
  const [loadKey,     setLoadKey]     = useState(0);

  // ── C31 org state ─────────────────────────────────────────────────────────
  const [orgTags,      setOrgTags]      = useState<OrgTag[]>([]);
  const [orgFolders,   setOrgFolders]   = useState<OrgFolderType[]>([]);
  const [savedViews,   setSavedViews]   = useState<OrgSavedView[]>([]);
  const [starredIds,   setStarredIds]   = useState<Set<string>>(new Set());
  const [recentIds,    setRecentIds]    = useState<string[]>([]);

  // ── C31 preview dialog state ─────────────────────────────────────────────
  const [previewDialog, setPreviewDialog] = useState<"export" | "reminders" | "cancel" | "ownership" | "retention" | null>(null);

  const reloadData = useCallback(() => setLoadKey(k => k + 1), []);

  // ── Load org state ────────────────────────────────────────────────────────
  useEffect(() => {
    const tagsResult = documentOrganizationService.listTags({});
    if (tagsResult.ok) setOrgTags(tagsResult.data.filter(t => t.status === "active"));

    const foldersResult = documentOrganizationService.listFolders({}, userId);
    if (foldersResult.ok) setOrgFolders(foldersResult.data.filter(f => f.status === "active"));

    const viewsResult = documentOrganizationService.listSavedViews(userId);
    if (viewsResult.ok) setSavedViews(viewsResult.data);

    const starred = documentOrganizationService.listStarredDocuments();
    setStarredIds(new Set(starred.map(s => s.documentId)));

    const recents = documentOrganizationService.listRecentDocuments(workspaceId);
    setRecentIds(recents.map(r => r.documentId));
  }, [userId, workspaceId, loadKey]);

  // ── Load document data with stale-result guard ────────────────────────────
  useEffect(() => {
    if (!canViewDocs) return;
    let cancelled = false;
    setLoadState("loading");
    setSelectedIds(new Set());
    setOpenMenuId(null);

    // For org-filtered views, use the "all" base view and filter client-side
    const baseQuery = ORG_FILTERED_VIEWS.includes(query.view)
      ? { ...query, view: "all" as DocumentView }
      : query;

    Promise.all([
      mockDocumentService.list(baseQuery, scenario),
      mockDocumentService.getFolders(),
      mockDocumentService.getTags(),
    ]).then(([res, fols, tgs]) => {
      if (cancelled) return;
      // Apply org-view client-side filtering
      let filteredItems = res.items;
      if (query.view === "starred") {
        filteredItems = res.items.filter(d => starredIds.has(d.id));
      } else if (query.view === "recently-viewed") {
        filteredItems = recentIds
          .map(id => res.items.find(d => d.id === id))
          .filter((d): d is DocumentListItem => d != null);
      } else if (query.view === "owned-by-me") {
        filteredItems = res.items.filter(d => !d.isMyAction && d.status !== "archived");
      } else if (query.view === "shared-with-me") {
        filteredItems = res.items.filter(d => d.participantCount > 0 && !d.isMyAction);
      } else if (query.view === "awaiting-others") {
        filteredItems = res.items.filter(d => ["sent", "delivered", "viewed", "awaiting-signature"].includes(d.status));
      }
      setResult({ ...res, items: filteredItems, total: filteredItems.length });
      setFolders(fols);
      setTags(tgs);
      setLoadState("ready");
    }).catch(() => {
      if (cancelled) return;
      setLoadState("full-error");
    });

    return () => { cancelled = true; };
  }, [query, scenario, currentWorkspace?.id, loadKey, canViewDocs, starredIds, recentIds]);

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

  // ── C31 bulk handlers ─────────────────────────────────────────────────────
  const handleBulkArchive = useCallback(async () => {
    if (!selectedIds.size) return;
    await mockDocumentService.archive([...selectedIds]);
    setSelectedIds(new Set());
    reloadData();
  }, [selectedIds, reloadData]);

  const handleBulkRestore = useCallback(async () => {
    if (!selectedIds.size) return;
    await mockDocumentService.restore([...selectedIds]);
    setSelectedIds(new Set());
    reloadData();
  }, [selectedIds, reloadData]);

  const handleBulkAddTag = useCallback(async (tagId: OrgTagId) => {
    if (!selectedIds.size) return;
    // Use org service for org tags; fall back to legacy addTag for base tags
    documentOrganizationService.addTagsToDocuments([...selectedIds], [tagId]);
    reloadData();
  }, [selectedIds, reloadData]);

  const handleBulkRemoveTag = useCallback(async (tagId: OrgTagId) => {
    if (!selectedIds.size) return;
    documentOrganizationService.removeTagsFromDocuments([...selectedIds], [tagId]);
    reloadData();
  }, [selectedIds, reloadData]);

  const handleBulkStar = useCallback(() => {
    if (!selectedIds.size) return;
    documentOrganizationService.starDocuments([...selectedIds]);
    setStarredIds(prev => new Set([...prev, ...selectedIds]));
    setSelectedIds(new Set());
  }, [selectedIds]);

  const handleBulkUnstar = useCallback(() => {
    if (!selectedIds.size) return;
    documentOrganizationService.unstarDocuments([...selectedIds]);
    setStarredIds(prev => {
      const next = new Set(prev);
      selectedIds.forEach(id => next.delete(id));
      return next;
    });
    setSelectedIds(new Set());
  }, [selectedIds, userId]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const pageItems = result?.items ?? [];

  // Preview body content
  function previewBody(_type: typeof previewDialog) {
    const count = selectedIds.size;
    const docList = pageItems.filter(d => selectedIds.has(d.id));
    if (!count) return <p style={{ fontSize: 13, color: SLATE6, ...GF }}>No documents selected.</p>;
    return (
      <div>
        <p style={{ fontSize: 13, color: NAVY, margin: "0 0 10px", ...GF, fontWeight: 600 }}>
          {count} document{count !== 1 ? "s" : ""} selected
        </p>
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {docList.slice(0, 6).map(d => (
            <li key={d.id} style={{ fontSize: 12, color: SLATE6, ...GF, marginBottom: 4 }}>{d.title}</li>
          ))}
          {docList.length > 6 && <li style={{ fontSize: 12, color: SLATE4, ...GF }}>…and {docList.length - 6} more</li>}
        </ul>
        <p style={{ fontSize: 11, color: SLATE4, margin: "12px 0 0", ...GF }}>
          This is a frontend demonstration only. No mutation, export, delivery, or legal action is performed.
        </p>
      </div>
    );
  }

  const PREVIEW_CONFIGS: Record<NonNullable<typeof previewDialog>, { title: string; notice: string }> = {
    export:     { title: "Preview Export",             notice: "This preview does not generate, download, or deliver any files." },
    reminders:  { title: "Preview Reminders",          notice: "No reminder, email, SMS message, or notification is sent from this frontend preview." },
    cancel:     { title: "Preview Cancellation / Void", notice: "This frontend preview does not cancel, void, notify, or modify any transaction." },
    ownership:  { title: "Preview Ownership Transfer", notice: "This preview does not transfer ownership or change document access." },
    retention:  { title: "Preview Retention",          notice: "This preview does not enforce retention, create legal holds, or delete records." },
  };

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
        primaryAction={
          canPrepare ? (
            <Link
              to="/app/prepare"
              onClick={onPrepareClick()}
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

        {/* View tabs — show only non-org views in the tab strip to keep it clean */}
        <ViewTabStrip
          view={ORG_FILTERED_VIEWS.includes(query.view) ? "all" : query.view}
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

        {/* Active org-view banner */}
        {ORG_FILTERED_VIEWS.includes(query.view) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8, background: "#EFF6FF", border: "1px solid #BFDBFE", marginBottom: 8, ...GF }}>
            <Info size={13} style={{ color: AZURE, flexShrink: 0 }} aria-hidden />
            <span style={{ fontSize: 12, color: "#1D4ED8" }}>
              {VIEW_LABELS[query.view]} — documents filtered from frontend organization state.
            </span>
            <button onClick={() => updateQuery({ view: "all" })} style={{ fontSize: 12, color: AZURE, background: "none", border: "none", cursor: "pointer", marginLeft: "auto", ...GF }}>
              Clear
            </button>
          </div>
        )}

        {/* Active filter chips */}
        <FilterChips
          chips={documentFilterChips(query, folders, tags)}
          onRemove={key => updateQuery({ [key]: key === "q" ? "" : null })}
          onClearAll={() => updateQuery({ q: "", folderId: null, tagId: null })}
          label="Active document filters"
        />

        {/* Layout */}
        <div className="doc-layout">
          <OrgSidePanel
            folders={folders}
            selectedFolderId={query.folderId}
            folderCounts={result?.folderCounts ?? {}}
            activeView={query.view}
            savedViews={savedViews}
            starredCount={starredIds.size}
            recentCount={recentIds.length}
            onFolderChange={folderId => updateQuery({ folderId })}
            onViewChange={v => updateQuery({ view: v })}
          />
          <main className="doc-main" aria-label="Document list">

            {selectedIds.size > 0 && (
              <OrgBulkBar
                count={selectedIds.size}
                total={pageItems.length}
                items={pageItems}
                orgTags={orgTags}
                orgFolders={orgFolders}
                onSelectAll={() => setSelectedIds(new Set(pageItems.map(i => i.id)))}
                onDeselectAll={() => setSelectedIds(new Set())}
                onBulkArchive={canArchive ? handleBulkArchive : undefined}
                onBulkRestore={canArchive ? handleBulkRestore : undefined}
                onBulkAddTag={canPrepare ? handleBulkAddTag : undefined}
                onBulkRemoveTag={canPrepare ? handleBulkRemoveTag : undefined}
                onBulkStar={handleBulkStar}
                onBulkUnstar={handleBulkUnstar}
                onPreviewExport={() => setPreviewDialog("export")}
                onPreviewReminders={() => setPreviewDialog("reminders")}
                onPreviewCancel={() => setPreviewDialog("cancel")}
                onPreviewOwnership={() => setPreviewDialog("ownership")}
                onPreviewRetention={() => setPreviewDialog("retention")}
                activeView={query.view}
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

      {/* Preview dialogs */}
      {previewDialog && (
        <PreviewDialog
          title={PREVIEW_CONFIGS[previewDialog].title}
          notice={PREVIEW_CONFIGS[previewDialog].notice}
          body={previewBody(previewDialog)}
          onClose={() => setPreviewDialog(null)}
        />
      )}
    </>
  );
}

// `SIGNING_REQUEST_STATUS` lives in services/signing-request-status.ts now,
// shared with the dashboard. See that file for the mapping and why.

/**
 * What the Documents page knows about a request's underlying FILE.
 *
 * Both nullable, and both genuinely absent in real states: a document
 * created but not yet uploaded has no detected type, and one uploaded
 * before the filename was recorded has no name. The icon helper treats
 * either absence as "fall back", never as an error.
 */
interface DocumentFileFacts {
  mediaType: string | null;
  filename: string | null;
}

// The signature affordance. Shown only once a request has actually been sent
// — a draft has no signatures to record, and offering to open an empty
// record would read as though something were missing.
function SignatureLink({
  item, onOpen, compact,
}: {
  item: SigningRequestListItem;
  onOpen: (item: SigningRequestListItem) => void;
  compact?: boolean;
}) {
  if (item.state === "draft" || item.state === "ready-to-send") {
    return <ParticipantProgress done={item.completedParticipantCount} total={item.participantCount} />;
  }
  const allSigned = item.completedParticipantCount > 0
    && item.completedParticipantCount >= item.participantCount;
  return (
    <button
      onClick={e => { e.stopPropagation(); onOpen(item); }}
      title="View participants"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, background: "none",
        border: "none", padding: 0, cursor: "pointer", ...GF,
      }}
    >
      <ParticipantProgress done={item.completedParticipantCount} total={item.participantCount} />
      <span style={{
        fontSize: compact === true ? 11 : 12, color: allSigned ? "#059669" : AZURE,
        fontWeight: 600, whiteSpace: "nowrap",
      }}>
        {allSigned ? "Signed" : "Details"}
      </span>
    </button>
  );
}

/**
 * A row action: icon AND label.
 *
 * The actions used to be four 32px icon-only buttons in a row. An icon is a
 * reminder for someone who already knows the action, not an explanation for
 * someone meeting it — a pencil reads as "edit" or "sign" depending on what
 * you already believe, and a paper plane as "send" or "send again".
 *
 * On a phone the label sits beside the icon, because that is where the guess
 * is most expensive and where a 32px target was already too small. Below
 * 400px the labels drop and `title`/`aria-label` carry the meaning, which is
 * the point at which four labelled buttons genuinely cannot fit.
 */
function DocAction({ icon: Icon, label, onClick, tone }: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  tone?: "default" | "primary";
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="doc-action"
      style={{
        ...GF,
        display: "inline-flex", alignItems: "center", gap: 6,
        minHeight: 34, padding: "0 10px", borderRadius: 7,
        border: "1px solid #E3E8EF", background: "#FFFFFF",
        color: tone === "primary" ? AZURE : SLATE4,
        fontSize: 12.5, fontWeight: 600, cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={15} aria-hidden />
      <span className="doc-action-label">{label}</span>
    </button>
  );
}

// ── Unsent drafts ────────────────────────────────────────────────────────────
//
// A signing request is created only at the final Send step. A document that
// was uploaded and prepared but never sent therefore has NO request -- and the
// sent list, built from requests, used to leave it out entirely, so a draft
// seemed to vanish until you remembered to reopen it. It is shown as a Draft
// row built from the document itself, marked so the actions a request would
// have (history, signers, send again) are not offered for it.

const UNSENT_DRAFT_PREFIX = "unsent-draft:";

function isUnsentDraft(item: SigningRequestListItem): boolean {
  return item.signingRequestId.startsWith(UNSENT_DRAFT_PREFIX);
}

function unsentDraftRow(document: RealDocument): SigningRequestListItem {
  return {
    signingRequestId: `${UNSENT_DRAFT_PREFIX}${document.documentId}`,
    documentId: document.documentId,
    documentTitle: document.title,
    state: "draft",
    participantCount: 0,
    completedParticipantCount: 0,
    initiator: null,
    createdAt: document.createdAt,
    sentAt: null,
    completedAt: null,
    expiresAt: null,
  };
}

function RealDocumentRow({
  item, onView, onSignatures, onAudit, onResend, file, verificationId,
}: {
  item: SigningRequestListItem;
  onView: (item: SigningRequestListItem) => void;
  onSignatures: (item: SigningRequestListItem) => void;
  onAudit: (item: SigningRequestListItem) => void;
  onResend: (item: SigningRequestListItem) => void;
  file: DocumentFileFacts | undefined;
  verificationId?: string | null;
}) {
  const FileGlyph = iconForDocument(file?.mediaType, file?.filename);
  const navigate = useNavigate();
  return (
    <div role="row" className="doc-row doc-grid-real">
      <div role="cell" />
      <div role="cell" style={{ padding: "8px 8px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
          <FileGlyph size={15} aria-hidden style={{ flexShrink: 0, marginTop: 2, color: SLATE4 }} />
          <button
            onClick={() => onView(item)}
            title={item.documentTitle}
            style={{
              fontSize: 13, fontWeight: 600, color: NAVY, background: "none", border: "none",
              cursor: "pointer", padding: 0, textAlign: "left", overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%", ...GF,
            }}
          >
            {item.documentTitle}
          </button>
        </div>
        {item.state === "completed" && verificationId && (
          <div className="doc-vid-tablet" style={{ paddingLeft: 23 }}>
            <VerificationIdActions id={verificationId} variant="line" label="Verification ID" />
          </div>
        )}
      </div>
      <div role="cell" style={{ padding: "8px 8px" }}>
        <StatusBadge status={SIGNING_REQUEST_STATUS[item.state]} />
      </div>
      <div role="cell" className="doc-col-vid" style={{ padding: "8px 8px" }}>
        <VerificationIdActions id={item.state === "completed" ? verificationId : null} />
      </div>
      <div role="cell" style={{ padding: "8px 8px" }}>
        <SignatureLink item={item} onOpen={onSignatures} />
      </div>
      <div role="cell" className="doc-col-updated" style={{ padding: "8px 8px" }}>
        <span style={{ fontSize: 12, color: SLATE4, whiteSpace: "nowrap", ...GF }}>
          {fmtRelative(item.createdAt)}
        </span>
      </div>
      <div role="cell" className="doc-actions-cell" style={{ padding: "8px 4px" }}>
        {/* Signers, as an action rather than a hidden affordance.
            *
            * The signature record was already reachable — by clicking the
            * "2/3" progress indicator, which reads as a status label, not a
            * button. The capability existed and nobody could find it. Drafts
            * have no signers yet, so it appears once a request has been sent. */}
        {/* Drafts only. "Continue" on a sent or completed request would
            promise editing of something already in front of its recipients —
            and for a completed one, of evidence. */}
        {item.state === "draft" && (
          <DocAction icon={Pencil} label="Continue" tone="primary"
            onClick={() => { void navigate(`/app/prepare/upload?resumeDocumentId=${encodeURIComponent(item.documentId)}`); }} />
        )}
        {item.state !== "draft" && item.state !== "ready-to-send" && (
          <DocAction icon={Send} label="Send again" onClick={() => onResend(item)} />
        )}
        {item.state !== "draft" && item.state !== "ready-to-send" && (
          <DocAction icon={Users} label="Participants" onClick={() => onSignatures(item)} />
        )}
        {/* An unsent draft has no signing request, so no history exists for
            it yet; and it can be viewed only once a file was uploaded. */}
        {!isUnsentDraft(item) && (
          <DocAction icon={History} label="History" onClick={() => onAudit(item)} />
        )}
        {(!isUnsentDraft(item) || file?.mediaType != null) && (
          <DocAction icon={Eye} label="View" onClick={() => onView(item)} />
        )}
      </div>
    </div>
  );
}

// Mobile card — the `.doc-table-desktop` grid layout above is hidden below
// 767px (DOC_STYLES), so without this a mobile visitor to /app/documents saw
// nothing at all: every real item still loaded, just with no surface to
// render it on. Same fields as the desktop row, stacked top-to-bottom.
function RealDocumentCard({
  item, onView, onSignatures, onAudit, onResend, file, verificationId,
}: {
  item: SigningRequestListItem;
  onView: (item: SigningRequestListItem) => void;
  onSignatures: (item: SigningRequestListItem) => void;
  onAudit: (item: SigningRequestListItem) => void;
  onResend: (item: SigningRequestListItem) => void;
  file: DocumentFileFacts | undefined;
  verificationId?: string | null;
}) {
  const FileGlyph = iconForDocument(file?.mediaType, file?.filename);
  const navigate = useNavigate();
  // A div, not a button: the signature affordance below is itself a button,
  // and a button inside a button is invalid HTML that browsers resolve
  // unpredictably. The title and the eye icon are the two real controls.
  return (
    <div
      style={{
        background: "#fff", border: `1px solid ${SLATE2}`, borderRadius: 10,
        padding: "12px 14px", marginBottom: 10, ...GF,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <FileGlyph size={16} aria-hidden style={{ flexShrink: 0, marginTop: 2, color: SLATE4 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <button
            onClick={() => onView(item)}
            title={item.documentTitle}
            style={{
              fontSize: 14, fontWeight: 600, color: NAVY, background: "none",
              border: "none", padding: 0, textAlign: "left", cursor: "pointer",
              display: "block", maxWidth: "100%", ...GF,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {item.documentTitle}
          </button>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <StatusBadge status={SIGNING_REQUEST_STATUS[item.state]} />
            <SignatureLink item={item} onOpen={onSignatures} compact />
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: SLATE4 }}>
            {fmtRelative(item.createdAt)}
          </div>
        </div>
        {/* Drafts only. "Continue" on a sent or completed request would
            promise editing of something already in front of its recipients —
            and for a completed one, of evidence. */}
        {item.state === "draft" && (
          <DocAction icon={Pencil} label="Continue" tone="primary"
            onClick={() => { void navigate(`/app/prepare/upload?resumeDocumentId=${encodeURIComponent(item.documentId)}`); }} />
        )}
        {item.state !== "draft" && item.state !== "ready-to-send" && (
          <DocAction icon={Send} label="Send again" onClick={() => onResend(item)} />
        )}
        {item.state !== "draft" && item.state !== "ready-to-send" && (
          <DocAction icon={Users} label="Participants" onClick={() => onSignatures(item)} />
        )}
        {/* An unsent draft has no signing request, so no history exists for
            it yet; and it can be viewed only once a file was uploaded. */}
        {!isUnsentDraft(item) && (
          <DocAction icon={History} label="History" onClick={() => onAudit(item)} />
        )}
        {(!isUnsentDraft(item) || file?.mediaType != null) && (
          <DocAction icon={Eye} label="View" onClick={() => onView(item)} />
        )}
      </div>
      {/* Full card width, not the title column: beside the action buttons
          that column is too narrow on a phone to show the id at all. */}
      {item.state === "completed" && verificationId && (
        <div style={{ marginTop: 8, paddingLeft: 24 }}>
          <VerificationIdActions id={verificationId} variant="line" label="Verification ID" />
        </div>
      )}
    </div>
  );
}

// The owner-facing document viewer: the "Digital Document Archive" reading
// surface (see DocumentArchiveViewer.tsx for the rendering approach and why
// an <iframe> was rejected). This wrapper only supplies WHAT to load — the
// real stored bytes, via the same real backend route the rest of this page
// already talks to — never how to render it.
function DocumentViewerDialog({
  workspaceId, item, onClose,
}: {
  workspaceId: string;
  item: SigningRequestListItem;
  onClose: () => void;
}) {
  const loadBlob = useCallback(
    () => realSigningRequestService.documentContentBlob(workspaceId, item.documentId),
    [workspaceId, item.documentId],
  );

  // ── The signed version ────────────────────────────────────────────────────
  //
  // The viewer above draws the SOURCE document — the bytes as uploaded, which
  // is what the recipient signed against and what stays byte-identical
  // forever. The signature is not in those bytes and never will be: the merge
  // draws it onto a SEPARATE sealed artifact at completion.
  //
  // So a sender looking at a completed request sees an unsigned-looking
  // document and has no way, from here, to see the signed one. This is that
  // way.
  //
  // Offered only for a `completed` request, because that is the only state in
  // which a sealed artifact exists. A button that 404s is worse than no
  // button.
  const signedVersion = item.state === "completed"
    ? realSigningRequestService.downloadUrl(workspaceId, item.signingRequestId)
    : null;

  return (
    <Suspense fallback={
      <div
        role="dialog" aria-modal="true" aria-label={item.documentTitle}
        style={{
          position: "fixed", inset: 0, zIndex: Z.modal, display: "flex",
          alignItems: "center", justifyContent: "center", background: "#12100D",
        }}
      >
        <FileText size={32} color="#C9A15A" aria-hidden />
      </div>
    }>
      <DocumentArchiveViewer
        title={item.documentTitle}
        loadBlob={loadBlob}
        onClose={onClose}
        headerAction={signedVersion === null ? undefined : (
          // A plain anchor, not `window.open` or a fetch-and-blob dance.
          //
          // `/api` is proxied through this same origin by `public/_redirects`
          // — done precisely so the session cookie is first-party — so an
          // ordinary same-origin navigation carries it. The route answers with
          // `Content-Disposition: attachment`, so the browser downloads and
          // the page never navigates away.
          //
          // `window.open` would risk a popup block and can leave a blank tab
          // behind; fetching to a Blob would buffer a whole signed PDF in
          // memory to reproduce what the browser already does natively.
          <a
            href={signedVersion}
            download
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 6, flexShrink: 0,
              background: "rgba(201,161,90,0.16)",
              border: "1px solid rgba(201,161,90,0.45)",
              color: "#E8DCC4", fontSize: 12, fontWeight: 600,
              textDecoration: "none", whiteSpace: "nowrap",
              fontFamily: "'Geist', sans-serif",
            }}
          >
            <Download size={14} aria-hidden />
            Signed PDF
          </a>
        )}
      />
    </Suspense>
  );
}

// ── Live search and filters ──────────────────────────────────────────────────
//
// Matched on the SERVER (the signing-request list's q, state and signer
// filters). Filtering the rows already in the browser would search only the
// first page, and a list row carries no signer data to match against.

/**
 * Which lifecycle states each SECTION queries for. Sections replaced the old
 * status-filter dropdown: a sender no longer chooses a status inside "Sent",
 * they instead click the section that already means that status. Cancelled
 * and expired requests have no section of their own — they stay visible in
 * Sent, since either one still needs a sender's attention, not a signer's.
 */
const LIST_STATES: Readonly<Record<"sent" | "completed" | "draft" | "declined", readonly SigningRequestState[]>> = {
  sent:      ["sent", "partially-completed", "completion-ready", "cancelled", "expired"],
  completed: ["completed"],
  draft:     ["draft", "ready-to-send"],
  declined:  ["declined"],
};

/** The value once it has stopped changing for ms: one request per pause, not per keystroke. */
function useDebouncedValue<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

function FilterField({
  id, label, placeholder, value, onChange, inputRef, shortcutHint,
}: {
  id: string; label: string; placeholder: string; value: string;
  onChange: (value: string) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  shortcutHint?: string;
}) {
  return (
    <div className="doc-filter-field">
      <label htmlFor={id} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
        {label}
      </label>
      <Search size={14} aria-hidden style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: SLATE4, pointerEvents: "none" }} />
      <input
        id={id}
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-keyshortcuts={shortcutHint}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          // Esc clears; a second Esc leaves the field.
          if (e.key !== "Escape") return;
          if (value !== "") { e.preventDefault(); onChange(""); } else { e.currentTarget.blur(); }
        }}
      />
      {value !== "" ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={`Clear ${label.toLowerCase()}`}
          style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: SLATE4, padding: 2, lineHeight: 1 }}
        >
          <X size={13} aria-hidden />
        </button>
      ) : shortcutHint !== undefined ? (
        <kbd className="doc-filter-kbd" aria-hidden>{shortcutHint}</kbd>
      ) : null}
    </div>
  );
}

function DocumentsPageRealMode() {
  const { onPrepareClick } = usePrepareLaunch();
  const { currentWorkspace } = usePlatform();
  const workspaceId = currentWorkspace?.id ?? null;

  const [items, setItems] = useState<SigningRequestListItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [viewing, setViewing] = useState<SigningRequestListItem | null>(null);
  const [signaturesFor, setSignaturesFor] = useState<SigningRequestListItem | null>(null);
  const [resendFor, setResendFor] = useState<SigningRequestListItem | null>(null);
  const [auditFor, setAuditFor] = useState<SigningRequestListItem | null>(null);
  const [files, setFiles] = useState<Map<string, DocumentFileFacts>>(new Map());
  const [documents, setDocuments] = useState<RealDocument[]>([]);
  // Which documents have EVER had a signing request, read unfiltered. Null
  // until known, so no document is briefly shown as a draft while loading.
  const [requestedDocumentIds, setRequestedDocumentIds] = useState<Set<string> | null>(null);
  // Every loaded request, unfiltered: the pool a Verification ID search is
  // matched against, since the server's q searches names only.
  const [allRequests, setAllRequests] = useState<SigningRequestListItem[]>([]);
  // Bumped after a re-send. That produces an additional signing request, so
  // the list gains a row — there is nothing in place to patch.
  const [refreshKey, setRefreshKey] = useState(0);
  const [total, setTotal] = useState(0);
  // A refetch for a new filter keeps the rows on screen. Blanking the table
  // to a skeleton on every search would make the search feel broken.
  const [fetching, setFetching] = useState(false);

  // The filters live in the URL, so a filtered list survives a reload, can be
  // shared, and can be opened directly from the command palette.
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";
  const urlSigner = searchParams.get("signer") ?? "";

  // Which list: this workspace's own sections, or documents sent TO me.
  const rawList = searchParams.get("list");
  const list: "sent" | "to-sign" | "signed" | "others" | "completed" | "draft" | "declined" =
    rawList === "to-sign" || rawList === "signed" || rawList === "others" || rawList === "completed"
      || rawList === "draft" || rawList === "declined" ? rawList : "sent";
  const [toSignCount, setToSignCount] = useState<number | null>(null);
  const [othersCount, setOthersCount] = useState<number | null>(null);
  const setList = (next: typeof list) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      if (next === "sent") params.delete("list"); else params.set("list", next);
      return params;
    }, { replace: true });
  };
  // The badge on "I must sign" is known before that list is opened.
  useEffect(() => {
    let cancelled = false;
    void realMySigningService.documentsToSign()
      .then(entries => {
        if (cancelled) return;
        const signing = entries.filter(isSignerEntry).length;
        setToSignCount(signing);
        setOthersCount(entries.length - signing);
      })
      .catch(() => { /* The badge is a convenience; the list reports its own failure. */ });
    return () => { cancelled = true; };
  }, []);

  const [nameInput, setNameInput] = useState(urlQ);
  const [signerInput, setSignerInput] = useState(urlSigner);
  const q = useDebouncedValue(nameInput.trim(), 300);
  const signer = useDebouncedValue(signerInput.trim(), 300);
  const filtering = q !== "" || signer !== "";
  const nameRef = useRef<HTMLInputElement>(null);

  // Settled text goes to the URL.
  useEffect(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (q) next.set("q", q); else next.delete("q");
      if (signer) next.set("signer", signer); else next.delete("signer");
      return next;
    }, { replace: true });
  }, [q, signer, setSearchParams]);

  // A URL changed from OUTSIDE (the command palette, Back) comes back to the
  // fields. After this page's own write the two already agree, so a field is
  // never overwritten while somebody is typing in it.
  const settledRef = useRef({ q, signer });
  settledRef.current = { q, signer };
  useEffect(() => {
    if (urlQ !== settledRef.current.q) setNameInput(urlQ);
    if (urlSigner !== settledRef.current.signer) setSignerInput(urlSigner);
  }, [urlQ, urlSigner]);

  const clearFilters = () => {
    setNameInput("");
    setSignerInput("");
  };

  // "/" jumps to the search field, as on most sites that have one.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!isSearchFocusShortcut(event)) return;
      event.preventDefault();
      nameRef.current?.focus();
      nameRef.current?.select();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    if (list === "to-sign" || list === "signed" || list === "others") return;
    let cancelled = false;
    setFetching(true);
    const states = LIST_STATES[list];

    void realSigningRequestService.list(workspaceId, { perPage: 50, q, signer, states })
      .then(result => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
        setStatus("ready");
        setFetching(false);
      })
      .catch(() => { if (!cancelled) { setStatus("error"); setFetching(false); } });

    return () => { cancelled = true; };
  }, [workspaceId, refreshKey, q, signer, list]);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;

    // The file's TYPE, fetched alongside rather than as part of the list.
    // A signing request is a workflow row and carries no file information;
    // the document row is where the server's detected media type lives. A
    // separate, non-blocking call so a failure here costs an accurate icon
    // and never the list itself.
    void realDocumentService.list(workspaceId, { perPage: 100 })
      .then(result => {
        if (cancelled) return;
        setFiles(new Map(result.items.map(document => [
          document.documentId,
          { mediaType: document.source?.mediaType ?? null, filename: document.originalFilename },
        ])));
        setDocuments(result.items);
      })
      .catch(() => { /* Icons fall back to the generic file glyph; drafts are not listed. */ });

    // Unfiltered, so a search or status filter on the sent list cannot make a
    // SENT document look like an unsent draft.
    void realSigningRequestService.list(workspaceId, { perPage: 100 })
      .then(result => {
        if (cancelled) return;
        setRequestedDocumentIds(new Set(result.items.map(r => r.documentId)));
        setAllRequests(result.items);
      })
      .catch(() => { /* Without this, drafts are not listed rather than guessed. */ });

    return () => { cancelled = true; };
  }, [workspaceId, refreshKey]);

  // Unsent drafts, filtered the way the server filters requests: by name.
  // They have no signers yet, so a signer filter excludes them, and they
  // only ever belong in the Draft section.
  const drafts = useMemo(() => {
    if (requestedDocumentIds === null) return [];
    if (list !== "draft" || signer !== "") return [];
    const needle = q.toLowerCase();
    return documents
      .filter(d => !requestedDocumentIds.has(d.documentId))
      .filter(d => needle === "" || d.title.toLowerCase().includes(needle))
      .map(unsentDraftRow);
  }, [documents, requestedDocumentIds, q, signer, list]);

  const verificationIds = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of documents) if (d.verificationId) map.set(d.documentId, d.verificationId);
    return map;
  }, [documents]);

  // A Verification ID typed or pasted into the name search. The server's q
  // matches names only, so completed requests whose document's id contains
  // the text are added from the rows already loaded.
  const byVerificationId = useMemo(() => {
    const needle = q.toLowerCase();
    if (needle === "" || signer !== "" || list === "draft" || list === "declined") return [];
    const states: readonly SigningRequestState[] = list === "completed" ? LIST_STATES.completed : ["completed"];
    const shown = new Set(items.map(r => r.signingRequestId));
    return allRequests.filter(r =>
      r.state === "completed" && states.includes(r.state) && !shown.has(r.signingRequestId)
      && (verificationIds.get(r.documentId) ?? "").toLowerCase().includes(needle));
  }, [allRequests, items, verificationIds, q, signer, list]);

  // Newest first across both kinds.
  const rows = useMemo(
    () => [...drafts, ...items, ...byVerificationId].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [drafts, items, byVerificationId]);
  const rowTotal = total + drafts.length + byVerificationId.length;

  return (
    <>
      <PageHeader
        title="Documents"
        primaryAction={
          <Link
            to="/app/prepare"
            onClick={onPrepareClick()}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: AZURE, color: "#fff", textDecoration: "none", ...GF,
            }}
          >
            <FilePlus size={15} aria-hidden />
            Prepare Document
          </Link>
        }
      />
      <AppContent style={{ padding: "0 24px 32px" }}>
        <style>{DOC_STYLES}</style>
        <div className="doc-list-tabs" role="tablist" aria-label="Document lists">
          <button type="button" role="tab" className="doc-list-tab" aria-selected={list === "sent"} onClick={() => setList("sent")}>
            <Send size={14} aria-hidden /> Sent
          </button>
          <button type="button" role="tab" className="doc-list-tab" aria-selected={list === "to-sign"} onClick={() => setList("to-sign")}>
            <PenLine size={14} aria-hidden /> I must sign
            {toSignCount !== null && toSignCount > 0 && (
              <span className="doc-list-count" aria-label={`${toSignCount} waiting`}>{toSignCount}</span>
            )}
          </button>
          <button type="button" role="tab" className="doc-list-tab" aria-selected={list === "signed"} onClick={() => setList("signed")}>
            <FileCheck2 size={14} aria-hidden /> Signed by me
          </button>
          <button type="button" role="tab" className="doc-list-tab" aria-selected={list === "others"} onClick={() => setList("others")}>
            <Users size={14} aria-hidden /> Others
            {othersCount !== null && othersCount > 0 && (
              <span className="doc-list-count" aria-label={`${String(othersCount)} to look at`}>{othersCount}</span>
            )}
          </button>
          <button type="button" role="tab" className="doc-list-tab" aria-selected={list === "completed"} onClick={() => setList("completed")}>
            <FileCheck2 size={14} aria-hidden /> Completed
          </button>
          <button type="button" role="tab" className="doc-list-tab" aria-selected={list === "draft"} onClick={() => setList("draft")}>
            <FileText size={14} aria-hidden /> Draft
          </button>
          <button type="button" role="tab" className="doc-list-tab" aria-selected={list === "declined"} onClick={() => setList("declined")}>
            <FileText size={14} aria-hidden /> Declined
          </button>
        </div>
        {list === "to-sign" && <DocumentsToSignSection onCount={setToSignCount} />}
        {list === "signed" && <SignedByMeSection />}
        {list === "others" && <OthersSection onCount={setOthersCount} />}
        {(list === "sent" || list === "completed" || list === "draft" || list === "declined") && (<>
        {status === "loading" && (
          <div style={{ padding: "32px 0" }}>
            <SkeletonBlock height={40} />
          </div>
        )}
        {status === "error" && (
          <EmptyStateLayout
            icon={<FileText size={28} />}
            title="Couldn't load your documents"
            description="Something went wrong loading this workspace's documents. Try refreshing the page."
          />
        )}
        {/* Shown once the list has loaded, and kept while filters are active
            even when nothing matches: hiding the controls on an empty result
            would leave no way to change the search that emptied it. */}
        {status === "ready" && (rows.length > 0 || filtering) && (
          <div className="doc-filter-bar" role="search" aria-label="Search and filter documents" style={{ position: "relative" }}>
            <FilterField
              id="doc-filter-name" label="Search by document name or Verification ID" placeholder="Search by name or Verification ID"
              value={nameInput} onChange={setNameInput} inputRef={nameRef} shortcutHint="/"
            />
            <FilterField
              id="doc-filter-signer" label="Filter by signer" placeholder="Signer name or email"
              value={signerInput} onChange={setSignerInput}
            />
            <div className="doc-filter-meta" style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", minWidth: 0 }}>
              {filtering && (
                <button
                  type="button"
                  onClick={clearFilters}
                  style={{ ...GF, height: 36, padding: "0 12px", borderRadius: 8, border: `1px solid ${SLATE2}`, background: "#fff", color: SLATE6, fontSize: 13, cursor: "pointer", flexShrink: 0 }}
                >
                  Clear filters
                </button>
              )}
              <span aria-live="polite" style={{ ...GF, fontSize: 12, color: SLATE4, marginLeft: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {fetching
                  ? "Searching…"
                  : total > items.length
                    ? `Showing the latest ${rows.length} of ${rowTotal}`
                    : `${rowTotal} ${rowTotal === 1 ? "document" : "documents"}`}
              </span>
            </div>
          </div>
        )}
        {status === "ready" && rows.length === 0 && !filtering && (
          <EmptyStateLayout
            icon={<FileText size={28} />}
            title="Your documents will appear here"
            description="Documents you prepare and send for signing will show up in this list. Use Prepare Document to start one."
          />
        )}
        {status === "ready" && rows.length === 0 && filtering && !fetching && (
          <EmptyStateLayout
            icon={<Search size={26} />}
            title="No documents match"
            description="Nothing in this workspace matches the current search and filters. Try a shorter name, a different signer, or another status."
          />
        )}
        {status === "ready" && rows.length > 0 && (
          <div className="doc-table-desktop doc-list-frame" role="table" aria-label="Documents">
            <div role="rowgroup" className="doc-list-head">
              <div role="row" className="doc-header doc-grid-real">
                <div role="columnheader" aria-label="Icon" />
                <div role="columnheader" style={{ fontSize: 11, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 8px", ...GF }}>Document</div>
                <div role="columnheader" style={{ fontSize: 11, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 8px", ...GF }}>Status</div>
                <div role="columnheader" className="doc-col-vid" style={{ fontSize: 11, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 8px", whiteSpace: "nowrap", ...GF }}>Verification ID</div>
                <div role="columnheader" style={{ fontSize: 11, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 8px", ...GF }}>Progress</div>
                <div role="columnheader" className="doc-col-updated" style={{ fontSize: 11, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 8px", ...GF }}>Created</div>
                {/* A visible heading, not just an aria-label: the column is the
                    widest in the table, and an unlabelled one reads as a gap. */}
                <div role="columnheader" style={{ fontSize: 11, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 8px", textAlign: "right", ...GF }}>Actions</div>
              </div>
            </div>
            <div role="rowgroup" className="doc-list-scroll">
              {rows.map(item => (
                <RealDocumentRow
                  key={item.signingRequestId} item={item}
                  onView={setViewing} onSignatures={setSignaturesFor} onAudit={setAuditFor}
                  onResend={setResendFor}
                  file={files.get(item.documentId)}
                verificationId={verificationIds.get(item.documentId) ?? null}
                />
              ))}
            </div>
          </div>
        )}
        {status === "ready" && rows.length > 0 && (
          <div className="doc-cards-mobile doc-list-frame doc-list-scroll">
            {rows.map(item => (
              <RealDocumentCard
                key={item.signingRequestId} item={item}
                onView={setViewing} onSignatures={setSignaturesFor} onAudit={setAuditFor}
                onResend={setResendFor}
                file={files.get(item.documentId)}
                verificationId={verificationIds.get(item.documentId) ?? null}
              />
            ))}
          </div>
        )}
        </>)}
      </AppContent>
      {viewing && workspaceId && (
        <DocumentViewerDialog workspaceId={workspaceId} item={viewing} onClose={() => setViewing(null)} />
      )}
      {resendFor && workspaceId && (
        <ResendSigningDialog
          workspaceId={workspaceId}
          documentId={resendFor.documentId}
          documentTitle={resendFor.documentTitle}
          onClose={() => { setResendFor(null); }}
          onSent={() => {
            setResendFor(null);
            // Refetch rather than patching the row: the send produced a NEW
            // request, so the list has an extra entry, not an edited one.
            setRefreshKey(k => k + 1);
          }}
        />
      )}
      {signaturesFor && workspaceId && (
        <SignatureRecordDialog
          workspaceId={workspaceId}
          signingRequestId={signaturesFor.signingRequestId}
          documentTitle={signaturesFor.documentTitle}
          onClose={() => setSignaturesFor(null)}
        />
      )}
      {auditFor && workspaceId && (
        <AuditTrailDialog
          workspaceId={workspaceId}
          signingRequestId={auditFor.signingRequestId}
          documentTitle={auditFor.documentTitle}
          onClose={() => setAuditFor(null)}
        />
      )}
    </>
  );
}

export function DocumentsPage() {
  return USE_REAL_BACKEND ? <DocumentsPageRealMode /> : <DocumentsPageMockDemo />;
}

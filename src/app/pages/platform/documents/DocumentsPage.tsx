// Command 15 — Authenticated Documents Workspace.
// Route: /app/documents  Views: All | Needs Attention | Drafts | In Progress |
//   Awaiting My Action | Completed | Expiring | Failed Delivery | Archived.
// No eNotary document types. No Burgundy (#67023B). No backend mutations.
// No real document content in list. No private audit evidence displayed.
// All participant names are fictional. No IP, device, location shown.

import { Trash2, BadgeCheck, CheckCheck } from "lucide-react";
import { useDocumentLifecycle } from "../../../components/documents/useDocumentLifecycle";
import { RecycleBinButton, RecycleBinPanel } from "../../../components/documents/RecycleBin";
import { DeletedDocumentsBlock, DeletedNoticeFromLink } from "../../../components/documents/DeletedDocumentsBlock";
import { documentLifecycleService, type InboxCounts } from "../../../services/real/document-lifecycle.service";
import type { InboxAction } from "../../../services/real/my-signing.service";
import { useWorkspaceAllows } from "../../../hooks/usePlans";
import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { Link, Navigate, useSearchParams, useNavigate } from "react-router";
import {
  FileText, FilePlus, Search, MoreHorizontal, Archive, RotateCcw, Pencil,
  X, AlertCircle, ChevronLeft, ChevronRight, Tag, FolderOpen, Folder,
  ShieldCheck, Activity, Users, RefreshCw, Inbox, ArrowUpDown,
  Star, Clock, ExternalLink,
  Eye, Bell, Ban, Shuffle, Shield, Info, Send, Download, History, PenLine, FileCheck2, Mail,
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
import {
  DRAFT_REQUEST_STATES, draftSources, isUnsentDraft, selectUnsentDraftDocuments, unsentDraftRow,
} from "../../../services/documents/draft-list";
import { ExpirationDialog } from "../../../components/documents/ExpirationDialog";
import { RemindersDialog } from "../../../components/documents/RemindersDialog";
import {
  COMPLETION_FAILED_TITLE, COMPLETION_FAILED_SENTENCE, describeRetryOutcome, describeRetryError,
} from "../../../components/documents/signing-progress-copy";
import { toastSuccess, toastError } from "../../../components/brand/BrandToast";
import type { RealDocument } from "../../../services/real/document.service";
import { documentOrganizationService } from "../../../services/mock/document-organization.service";
import { isCapabilityInActiveProfile } from "../../../config/capability-resolver";
import { SIGNING_REQUEST_STATUS, completionFailed } from "../../../services/signing-request-status";
import { StatusBadge } from "../../../components/documents/StatusBadge";
import { VerificationIdActions } from "../../../components/documents/VerificationIdActions";
import {
  CompletedDocumentGrid, useDocumentCardBranding, type CompletedCardData, type CardAction, type CardBranding,
} from "./CompletedDocumentCards";
import { MailCard, MailCardList, MailLine, MailAction, formalDate } from "./MailCard";
import { AuditTrailDialog } from "../../../components/documents/AuditTrailDialog";
import { ShareDocumentDialog } from "../../../components/document-sharing/ShareDocumentDialog";
import type { TransactionStatus } from "../../../models";
import { TRANSACTION_STATUS_LABELS } from "../../../models";
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
import { useLiveQuery } from "../../../services/live/live-query";
import { preparationRoute } from "../../../services/preparation-platform-projection";
import { Z } from "../../../utils/z-index";
import { FilterChips } from "../../../components/platform/FilterChips";
import { usePrepareLaunch } from "../../../hooks/usePrepareLaunch";
import { isSearchFocusShortcut } from "../../../utils/keyboard-shortcuts";
import { DocumentsToSignSection, SignedByMeSection } from "./MySigningSections";
import { legacyContactRequestRedirect } from "../../../models/contact-requests";
import { useCanPrepare } from "../../../hooks/useCanPrepare";

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

  /* The two groups: a formal segmented switch above that group's tabs. */
  .doc-groups {
    display: inline-flex; margin-top: 16px; padding: 4px; gap: 4px; border-radius: 12px;
    background: #F1F5F9; border: 1px solid #E2E8F0; max-width: 100%;
  }
  .doc-group {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; padding: 0 18px;
    border: none; border-radius: 9px; background: transparent; color: #475569; cursor: pointer; white-space: nowrap;
    font-family: 'Geist', sans-serif; font-size: 14px; font-weight: 600; letter-spacing: 0.01em;
  }
  .doc-group[aria-selected="true"] { background: #FFFFFF; color: #07111F; box-shadow: 0 1px 3px rgba(7,17,31,0.14); }
  .doc-group:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
  @media (max-width: 767px) {
    .doc-groups { display: flex; width: 100%; box-sizing: border-box; }
    .doc-group { flex: 1 1 0; padding: 0 10px; min-width: 0; }
  }

  @media (pointer: coarse), (max-width: 640px) {
    .doc-filter-bar button, .doc-filter-bar input, .doc-filter-bar select { min-height: 44px; touch-action: manipulation; }
  }
  @media (pointer: coarse) {
    .doc-filter-bar input, .doc-filter-bar select { font-size: 16px; }
  }
  /* The lists inside the chosen group. */
  .doc-list-strip { position: relative; margin-top: 16px; }
  .doc-list-tabs { display: flex; gap: 4px; border-bottom: 1px solid #E2E8F0; overflow-x: auto; scrollbar-width: none; }
  .doc-list-tabs::-webkit-scrollbar { display: none; }
  .doc-list-arrow { display: none; }
  .doc-list-tab {
    display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
    padding: 10px 12px; font-family: 'Geist', sans-serif; font-size: 13px; font-weight: 600;
    color: #64748B; background: none; border: none; border-bottom: 2px solid transparent;
    cursor: pointer; margin-bottom: -1px;
  }
  .doc-list-tab[aria-selected="true"] { color: #0063B1; border-bottom-color: #0078D4; }
  /* Phones and tablets: the sections sit side by side on ONE row of chips
     that scrolls sideways. An arrow at either edge shows there is more that
     way and moves the row, and the chosen section is always brought into
     view, so a section is never out of sight without a sign of it. */
  @media (max-width: 900px) {
    .doc-list-tabs {
      flex-wrap: nowrap; overflow-x: auto; border-bottom: none; gap: 8px; padding: 2px 0;
      scroll-behavior: smooth; -webkit-overflow-scrolling: touch; overscroll-behavior-x: contain;
    }
    .doc-list-tab {
      border: 1px solid #D1D9E0; border-radius: 999px; padding: 7px 12px; margin-bottom: 0;
      background: #FFFFFF; white-space: nowrap; flex: 0 0 auto;
    }
    .doc-list-tab[aria-selected="true"] { border-color: #0078D4; background: #EFF6FF; color: #005A9E; }
    .doc-list-arrow {
      position: absolute; top: 0; bottom: 0; width: 46px; padding: 0; border: none; cursor: pointer;
      align-items: center; color: #07111F; z-index: 1;
    }
    .doc-list-arrow[data-show="true"] { display: flex; }
    .doc-list-arrow[data-side="left"] { left: -2px; justify-content: flex-start; background: linear-gradient(90deg, #F8FAFC 58%, rgba(248,250,252,0)); }
    .doc-list-arrow[data-side="right"] { right: -2px; justify-content: flex-end; background: linear-gradient(270deg, #F8FAFC 58%, rgba(248,250,252,0)); }
    .doc-list-arrow span {
      width: 32px; height: 32px; border-radius: 50%; background: #FFFFFF; border: 1px solid #CBD5E1;
      display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(7,17,31,0.12);
    }
    .doc-list-arrow:focus-visible span { outline: 3px solid rgba(0,120,212,0.35); outline-offset: 1px; }
  }
  @media (prefers-reduced-motion: reduce) { .doc-list-tabs { scroll-behavior: auto; } }
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
  const canPrepare  = useCanPrepare();
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
                query.view === "completed" ? (
                  <CompletedDocumentGrid cards={pageItems.map((item): CompletedCardData => ({
                    key: item.id,
                    title: item.title,
                    verificationId: completedVerificationId(item),
                    done: item.completedParticipantCount,
                    total: item.participantCount,
                    createdAt: item.createdAt,
                    actions: getDocActions(item, canPrepare, canVerify).map(act => ({
                      id: act.id, label: act.label,
                      icon: act.id === "view" ? Eye : act.id === "view-activity" ? History : act.id === "view-participants" ? Users
                        : act.id === "view-evidence" ? ShieldCheck : act.id === "archive" ? Archive : act.id === "restore" ? RotateCcw : undefined,
                      href: act.href,
                      onSelect: act.href ? undefined : () => {
                        if (act.id === "rename-draft") { setRenameItem(item); return; }
                        void handleRowAction(act.id, item);
                      },
                    })),
                  }))} />
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

// ── Unsent drafts ────────────────────────────────────────────────────────────
//
// A signing request is created only at the final Send step. A document that
// was uploaded and prepared but never sent therefore has NO request -- and the
// sent list, built from requests, used to leave it out entirely, so a draft
// seemed to vanish until you remembered to reopen it. It is shown as a Draft
// row built from the document itself, marked so the actions a request would
// have (history, signers, send again) are not offered for it.
//
// What counts as one is decided in services/documents/draft-list.ts, which
// "Resume a draft" on the Prepare entry page reads too, so the two lists
// cannot disagree.

// ── Sent: the outbox mail card ─────────────────────────────────────────────
//
// What this workspace sent, as a letter under its OWN banner: the send date in
// the corner, the status in words, the document centred with who it went to
// and how far signing has got, and the same actions as before along the
// bottom — Participants and History at the left, View and Send again at the
// right.

const OUTBOX_STATUS: Partial<Record<SigningRequestState, { label: string; color: string }>> = {
  "sent":                { label: "Out for signature", color: "#0078D4" },
  "partially-completed": { label: "Partially signed",  color: "#0078D4" },
  "completion-ready":    { label: "Finalizing",        color: "#15803D" },
  "cancelled":           { label: "Cancelled",         color: "#64748B" },
  "expired":             { label: "Expired",           color: "#B45309" },
};

function OutboxCard({ item, branding, onView, onSignatures, onAudit, onResend, onExpiration, onReminders, onRetry, retrying, onCancel }: {
  /** Stops the request: every signing link ends. Absent where it cannot be cancelled. */
  onCancel?: (() => void) | undefined;
  /** 111. Opens the request's reminder settings. */
  onReminders: () => void;
  /** 109. Asks for a final document that could not be produced, again. */
  onRetry: () => void;
  retrying: boolean;
  item: SigningRequestListItem;
  branding: CardBranding;
  onView: () => void;
  onSignatures: () => void;
  onAudit: () => void;
  onResend: () => void;
  onExpiration: () => void;
}) {
  // 109. "Finalizing" that stopped is its own state, said in red.
  const failed = completionFailed(item);
  const status = failed
    ? { label: COMPLETION_FAILED_TITLE, color: "#B91C1C" }
    : OUTBOX_STATUS[item.state] ?? { label: TRANSACTION_STATUS_LABELS[SIGNING_REQUEST_STATUS[item.state]], color: "#0078D4" };
  const total = item.participantCount;
  const done = item.completedParticipantCount;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const pending = item.state === "sent" || item.state === "partially-completed";
  return (
    <MailCard
      testId="outbox-card"
      branding={{ displayName: branding.displayName, primaryColor: branding.primaryColor, logoUrl: branding.logoUrl }}
      subtitle={status.label}
      corner={<>Sent {formalDate(item.sentAt ?? item.createdAt)}</>}
      title={item.documentTitle}
      footerStart={<>
        <MailAction icon={Users} label="Participants" onClick={onSignatures} ariaLabel={`Participants of ${item.documentTitle}`} />
        <MailAction icon={History} label="History" onClick={onAudit} ariaLabel={`History of ${item.documentTitle}`} />
        {pending && onCancel && (
          <MailAction icon={Ban} label="Cancel" onClick={onCancel} ariaLabel={`Cancel ${item.documentTitle}`} />
        )}
      </>}
      footerEnd={<>
        <MailAction icon={Eye} label="View" onClick={onView} ariaLabel={`View ${item.documentTitle}`} primary={!pending} />
        {/* Only while still out for signing, and only to new addresses (the
            dialog opens without "re-send to the same participants"). */}
        {pending && (
          <MailAction icon={Send} label="Send to new email" primary onClick={onResend}
            ariaLabel={`Send ${item.documentTitle} to a new email address`} />
        )}
      </>}
    >
      <MailLine>
        To {total} {total === 1 ? "participant" : "participants"} · <strong style={{ color: "#07111F" }}>{done} of {total} completed</strong>
      </MailLine>
      {total > 0 && (
        <div className="mail-progress" role="meter" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}
          aria-label={`${String(done)} of ${String(total)} completed`}>
          <div style={{ width: `${String(pct)}%`, background: pct === 100 ? "#15803D" : status.color }} />
        </div>
      )}
      {/* The deadline is the sender's, and optional: said either way, with the
          control that sets, changes or removes it while signing is open. */}
      {pending && (
        <MailLine>
          {item.expiresAt !== null ? <>Signing closes {formalDate(item.expiresAt)}</> : "No expiration"}
          {" · "}
          <button type="button" className="mail-inline-link" onClick={onExpiration}
            aria-label={`${item.expiresAt !== null ? "Change expiration" : "Set expiration"} of ${item.documentTitle}`}>
            {item.expiresAt !== null ? "Change" : "Set expiration"}
          </button>
          {" · "}
          <button type="button" className="mail-inline-link" onClick={onReminders}
            aria-label={`Reminders for ${item.documentTitle}`}>
            Reminders
          </button>
        </MailLine>
      )}
      {failed && (
        <MailLine>
          <span data-testid="outbox-completion-failed" style={{ color: "#B91C1C" }}>{COMPLETION_FAILED_SENTENCE}</span>
          {item.completion?.canRetry === true && (
            <>
              {" "}
              <button type="button" className="mail-inline-link" onClick={onRetry} disabled={retrying}
                aria-label={`Try again to finalize ${item.documentTitle}`}>
                {retrying ? "Trying again…" : "Try again"}
              </button>
            </>
          )}
        </MailLine>
      )}
    </MailCard>
  );
}

// One card design for every list — Sent, Draft, Declined and Completed all
// draw the same branded card (CompletedDocumentCards.tsx). Completed's own
// green pill is right only for a completed request, so every other state
// gets the shared `StatusBadge` instead (`statusBadge`); the actions offered
// are exactly RealDocumentRow's old per-state set, just reached from the
// card's menu instead of a table cell, the way Completed's always were.
function documentCard(
  item: SigningRequestListItem,
  deps: {
    verificationId: string | null;
    file: DocumentFileFacts | undefined;
    navigate: ReturnType<typeof useNavigate>;
    onView: () => void;
    onSignatures: () => void;
    onAudit: () => void;
    /** Absent on a Free owner's workspace (093): no Send again. */
    onResend?: () => void;
    onShare?: () => void;
    onCancel?: () => void;
    /** Cancelled: back out for signature, from where it stopped. */
    onRestore?: () => void;
    /** Cancelled or completed: to the Recycle Bin. */
    onTrash?: () => void;
    /** Draft, declined or expired: deleted for good. */
    onDelete?: () => void;
  },
): CompletedCardData {
  const actions: CardAction[] = [];
  // Drafts only. "Continue" on a sent or completed request would promise
  // editing of something already in front of its recipients — and for a
  // completed one, of evidence.
  if (item.state === "draft") {
    actions.push({
      id: "continue", label: "Continue", icon: Pencil,
      onSelect: () => { void deps.navigate(`/app/prepare/upload?resumeDocumentId=${encodeURIComponent(item.documentId)}`); },
    });
  }
  // The rest keeps Completed's own order (View, Participants, History, Send
  // again) — the menu this design started from — for every state that offers
  // each action.
  if (!isUnsentDraft(item) || deps.file?.mediaType != null) {
    actions.push({ id: "view", label: "View", icon: Eye, onSelect: deps.onView });
  }
  if (item.state !== "draft" && item.state !== "ready-to-send") {
    actions.push({ id: "participants", label: "Participants", icon: Users, onSelect: deps.onSignatures });
  }
  // An unsent draft has no signing request, so no history exists for it yet.
  if (!isUnsentDraft(item)) {
    actions.push({ id: "history", label: "History", icon: History, onSelect: deps.onAudit });
  }
  if (item.state !== "draft" && item.state !== "ready-to-send" && item.state !== "cancelled" && deps.onResend !== undefined) {
    actions.push({ id: "send-again", label: "Send again", icon: Send, onSelect: deps.onResend });
  }
  if (item.state === "cancelled" && deps.onRestore !== undefined) {
    actions.push({ id: "restore", label: "Restore", icon: RotateCcw, onSelect: deps.onRestore });
  }
  // One icon-only button in the card's bottom-right corner; its name shows on hover.
  const cornerAction: CompletedCardData["cornerAction"] =
    (item.state === "completed" || item.state === "cancelled") && deps.onTrash !== undefined
      ? { label: "Move to Trash", icon: Trash2, onSelect: deps.onTrash, testId: "card-move-to-trash" }
      : (item.state === "draft" || item.state === "ready-to-send" || item.state === "declined" || item.state === "expired") && deps.onDelete !== undefined
        ? { label: item.state === "declined" || item.state === "expired" ? "Permanently Delete" : "Delete draft", icon: Trash2, onSelect: deps.onDelete, testId: "card-delete" }
        : undefined;

  return {
    key: item.signingRequestId,
    title: item.documentTitle,
    verificationId: item.state === "completed" ? deps.verificationId : null,
    done: item.completedParticipantCount,
    total: item.participantCount,
    createdAt: item.createdAt,
    dateLabel: item.state === "draft" ? "Started" : "Created",
    // Completed keeps the card's own default subtitle ("Completed document"); everything else names its status here, since that pill only exists for completed.
    bannerSubtitle: item.state === "completed" ? undefined : TRANSACTION_STATUS_LABELS[SIGNING_REQUEST_STATUS[item.state]],
    statusBadge: item.state === "completed" ? undefined : <StatusBadge status={SIGNING_REQUEST_STATUS[item.state]} />,
    actions,
    onShare: deps.onShare,
    ...(cornerAction ? { cornerAction } : {}),
  };
}

// The owner-facing document viewer: the "Digital Document Archive" reading
// surface (see DocumentArchiveViewer.tsx for the rendering approach and why
// an <iframe> was rejected). This wrapper only supplies WHAT to load — the
// real stored bytes, via the same real backend route the rest of this page
// already talks to — never how to render it.
/** What the viewer needs of a request: enough to be built from a detail read too. */
type ViewableRequest = Pick<SigningRequestListItem, "signingRequestId" | "documentId" | "documentTitle" | "state">;

/** What "send for signing again" needs of a request: enough to be built from a detail read too. */
type ResendTarget = Pick<SigningRequestListItem, "signingRequestId" | "documentId" | "documentTitle">;

function DocumentViewerDialog({
  workspaceId, item, onClose,
}: {
  workspaceId: string;
  item: ViewableRequest;
  onClose: () => void;
}) {
  // ── Which bytes (finding 9) ──────────────────────────────────────────────
  //
  // The uploaded file is what the recipient signed against and stays
  // byte-identical forever; the signature is never in it. At completion the
  // merge draws the signatures onto a SEPARATE sealed artifact. The viewer
  // used to show only the uploaded file, so a completed document looked
  // unsigned here while Verify a Document showed it signed.
  //
  // A completed request now opens on the signed version, with the original
  // one click away. Other states have no signed version yet.
  const completed = item.state === "completed";
  const [version, setVersion] = useState<"signed" | "original">(completed ? "signed" : "original");
  const loadBlob = useCallback(
    () => version === "signed"
      ? realSigningRequestService.completedDocumentBlob(workspaceId, item.signingRequestId)
      : realSigningRequestService.documentContentBlob(workspaceId, item.documentId),
    [workspaceId, item.documentId, item.signingRequestId, version],
  );
  const signedVersion = completed
    ? realSigningRequestService.downloadUrl(workspaceId, item.signingRequestId)
    : null;
  const toggleStyle = (active: boolean): React.CSSProperties => ({
    padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(201,161,90,0.45)",
    background: active ? "rgba(201,161,90,0.28)" : "transparent", color: "#E8DCC4",
    fontSize: 12, fontWeight: active ? 700 : 600, cursor: active ? "default" : "pointer",
    fontFamily: "'Geist', sans-serif",
  });

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
        // The viewer loads its blob once per mount: switching versions mounts
        // it afresh so the other bytes are drawn.
        key={version}
        title={version === "signed" ? `${item.documentTitle} (signed)` : item.documentTitle}
        loadBlob={loadBlob}
        onClose={onClose}
        // The download is a plain anchor, not `window.open` or a fetch-and-blob
        // dance. `/api` is proxied through this same origin by
        // the /api rule in `netlify.toml` — done precisely so the session cookie is
        // first-party — so an ordinary same-origin navigation carries it. The
        // route answers with `Content-Disposition: attachment`, so the browser
        // downloads and the page never navigates away. `window.open` would
        // risk a popup block and can leave a blank tab behind; fetching to a
        // Blob would buffer a whole signed PDF in memory to reproduce what
        // the browser already does natively.
        headerAction={signedVersion === null ? undefined : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span role="group" aria-label="Which version to show" style={{ display: "inline-flex", gap: 4 }}>
              <button type="button" data-testid="viewer-signed" aria-pressed={version === "signed"}
                onClick={() => { setVersion("signed"); }} style={toggleStyle(version === "signed")}>Signed</button>
              <button type="button" data-testid="viewer-original" aria-pressed={version === "original"}
                onClick={() => { setVersion("original"); }} style={toggleStyle(version === "original")}>Original</button>
            </span>
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
          </span>
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
 * requests have no section of their own and stay visible in Sent. Expired
 * ones sit with Declined: both ended without everyone signing.
 */
const LIST_STATES: Readonly<Record<"sent" | "completed" | "draft" | "declined" | "cancelled", readonly SigningRequestState[]>> = {
  // Out for signature only. A cancelled request has its own section in
  // Records, where it can be restored or moved to the Recycle Bin.
  sent:      ["sent", "partially-completed", "completion-ready"],
  cancelled: ["cancelled"],
  completed: ["completed"],
  draft:     DRAFT_REQUEST_STATES,
  // One section for both ways a request ends without everyone signing. The
  // address keeps the name `declined`, which existing links already use.
  declined:  ["declined", "expired"],
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

type DocumentsList =
  | "sent" | "to-sign" | "to-approve" | "to-review" | "to-acknowledge"
  | "signed" | "draft" | "declined" | "cancelled" | "completed";
const DOCUMENTS_LISTS: readonly DocumentsList[] = [
  "sent", "to-sign", "to-approve", "to-review", "to-acknowledge", "signed", "draft", "declined", "cancelled", "completed",
];
function isDocumentsList(value: string | null): value is DocumentsList {
  return value !== null && (DOCUMENTS_LISTS as readonly string[]).includes(value);
}
/** The inbox each "I must…" list shows. */
const INBOX_OF: Partial<Record<DocumentsList, InboxAction>> = {
  "to-sign": "sign", "to-approve": "approve", "to-review": "review", "to-acknowledge": "acknowledge",
};
const INBOX_TABS: readonly { list: DocumentsList; action: InboxAction; label: string; icon: typeof PenLine }[] = [
  { list: "to-sign", action: "sign", label: "I must sign", icon: PenLine },
  { list: "to-approve", action: "approve", label: "I must approve", icon: BadgeCheck },
  { list: "to-review", action: "review", label: "I must review", icon: Eye },
  { list: "to-acknowledge", action: "acknowledge", label: "Acknowledgement", icon: CheckCheck },
];

const EMPTY_REQUESTS: SigningRequestListItem[] = [];
const EMPTY_DOCUMENTS: RealDocument[] = [];

function DocumentsPageRealMode() {
  const { onPrepareClick } = usePrepareLaunch();
  const navigate = useNavigate();
  const ownBranding = useDocumentCardBranding();
  // 093. Sharing and Send again are paid; an unread plan hides nothing.
  const paidWorkspace = useWorkspaceAllows("personal") !== false;
  const { currentWorkspace, user } = usePlatform();
  const workspaceId = currentWorkspace?.id ?? null;

  const [viewing, setViewing] = useState<ViewableRequest | null>(null);
  const [signaturesFor, setSignaturesFor] = useState<Pick<SigningRequestListItem, "signingRequestId" | "documentTitle"> | null>(null);
  const [resendFor, setResendFor] = useState<ResendTarget | null>(null);
  const [expirationFor, setExpirationFor] = useState<SigningRequestListItem | null>(null);
  const [remindersFor, setRemindersFor] = useState<SigningRequestListItem | null>(null);
  // 109. The request whose final document is being asked for again, if any.
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [auditFor, setAuditFor] = useState<SigningRequestListItem | null>(null);
  const [shareFor, setShareFor] = useState<SigningRequestListItem | null>(null);
  const [binOpen, setBinOpen] = useState(false);
  const [binCount, setBinCount] = useState<number | null>(null);
  const isOwner = currentWorkspace?.role === "owner";
  const freePlan = !paidWorkspace;
  const [noticeId, setNoticeId] = useState<string | null>(null);

  // The filters live in the URL, so a filtered list survives a reload, can be
  // shared, and can be opened directly from the command palette.
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";
  const urlSigner = searchParams.get("signer") ?? "";

  // Which list: this workspace's own sections, or documents sent TO me.
  const rawList = searchParams.get("list");
  // Contact requests (086) are no longer listed here — they live in
  // Contacts → Requests From Contacts, and DocumentsPage redirects old links.
  // "Others" is gone: what a person must approve, review or acknowledge has
  // its own inbox beside "I must sign", and what they already acted on lives
  // under Shared Documents. An old ?list=others link lands on the approvals.
  const list: DocumentsList =
    rawList === "others" ? "to-approve"
      : isDocumentsList(rawList) ? rawList : "sent";
  const group: "correspondence" | "records" = list === "sent" || INBOX_OF[list] !== undefined ? "correspondence" : "records";
  const [inbox, setInbox] = useState<InboxCounts | null>(null);
  const inboxTotal = inbox === null ? 0 : inbox.sign + inbox.approve + inbox.review + inbox.acknowledge;
  const setList = (next: typeof list) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      if (next === "sent") params.delete("list"); else params.set("list", next);
      return params;
    }, { replace: true });
  };
  // The badges on "I must sign" and "Others" are known before either list is
  // opened. Others counts role documents only — contact requests are counted
  // in Contacts → Requests From Contacts, not here.
  const loadInbox = useCallback(() => {
    void documentLifecycleService.inboxCounts()
      .then(setInbox)
      .catch(() => { /* The badges are a convenience; each list reports its own failure. */ });
  }, []);
  useEffect(() => { loadInbox(); }, [loadInbox]);

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

  // ── The three reads, LIVE (services/live/live-query.ts) ───────────────
  //
  // Each is held in memory under its key, so coming back to this page shows
  // the last list at once and re-reads behind it; each re-reads on the app's
  // heartbeat (finding 5: a completed request used to say "0 of 1 signed"
  // until a reload) and the moment the `documents` topic is announced (a
  // send, a re-send, a cancel — here or in another tab). Rows stay on screen
  // while a re-read is in flight (see `fetching`), so nothing flickers.
  const ownList = list === "sent" || list === "completed" || list === "draft" || list === "declined" || list === "cancelled";
  const states = LIST_STATES[ownList ? list : "sent"];
  const listQuery = useLiveQuery(
    workspaceId && ownList ? `documents:list:${workspaceId}:${list}:${q}:${signer}` : null,
    () => realSigningRequestService.list(workspaceId ?? "", { perPage: 50, q, signer, states }),
    { topics: ["documents"] },
  );
  const items = listQuery.data?.items ?? EMPTY_REQUESTS;
  const total = listQuery.data?.total ?? 0;
  const status: "loading" | "ready" | "error" =
    listQuery.data !== undefined ? "ready" : listQuery.error !== undefined ? "error" : "loading";
  // A refetch for a new filter keeps the rows on screen. Blanking the table
  // to a skeleton on every search would make the search feel broken.
  const fetching = listQuery.refreshing;

  // The file's TYPE, read alongside rather than as part of the list. A
  // signing request is a workflow row and carries no file information; the
  // document row is where the server's detected media type lives. A separate,
  // non-blocking read so a failure here costs an accurate icon and never the
  // list itself.
  const documentsQuery = useLiveQuery(
    workspaceId ? draftSources.filesKey(workspaceId) : null,
    () => draftSources.readFiles(workspaceId ?? ""),
    { topics: ["documents"] },
  );
  const documents = documentsQuery.data?.items ?? EMPTY_DOCUMENTS;
  const files = useMemo<Map<string, DocumentFileFacts>>(() => new Map(documents.map(document => [
    document.documentId,
    { mediaType: document.source?.mediaType ?? null, filename: document.originalFilename },
  ])), [documents]);

  // Every request, unfiltered: which documents have EVER had a signing
  // request (null until known, so no document is briefly shown as a draft
  // while loading — and a search or status filter on the sent list cannot
  // make a SENT document look like an unsent draft), and the pool a
  // Verification ID search is matched against, since the server's q searches
  // names only.
  const allQuery = useLiveQuery(
    workspaceId ? draftSources.requestsKey(workspaceId) : null,
    () => draftSources.readRequests(workspaceId ?? ""),
    { topics: ["documents"] },
  );
  const allRequests = allQuery.data?.items ?? EMPTY_REQUESTS;
  const requestedDocumentIds = useMemo(
    () => (allQuery.data === undefined ? null : new Set(allQuery.data.items.map(r => r.documentId))),
    [allQuery.data],
  );

  // ── Opening one request from a link (finding 6) ───────────────────────
  //
  // `?open=<signing request id>`: the signed-document notice and the old
  // /app/documents/<id> address both land here. The request is taken from
  // the unfiltered list when it is there, and read on its own otherwise,
  // so a link into an older request still opens. The parameter is dropped
  // once used, so closing the viewer does not reopen it on the next render.
  const openId = searchParams.get("open");
  useEffect(() => {
    if (!workspaceId || openId === null) return;
    let cancelled = false;
    const done = () => {
      setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete("open"); return next; }, { replace: true });
    };
    const found = allRequests.find(r => r.signingRequestId === openId);
    if (found) { setViewing(found); done(); return; }
    if (requestedDocumentIds === null) return; // the unfiltered list has not answered yet
    void realSigningRequestService.get(workspaceId, openId)
      .then(detail => {
        if (cancelled) return;
        setViewing({
          signingRequestId: detail.signingRequestId, documentId: detail.documentId,
          documentTitle: detail.documentTitle, state: detail.state,
        });
      })
      .catch(() => { /* Not this workspace's request, or gone: the list stays. */ })
      .finally(() => { if (!cancelled) done(); });
    return () => { cancelled = true; };
  }, [workspaceId, openId, allRequests, requestedDocumentIds, setSearchParams]);

  // `?participants=<signing request id>`: the lapsed-signing-link notice lands
  // here, on the panel that sends a new link. Same rules as `open` above.
  const participantsId = searchParams.get("participants");
  useEffect(() => {
    if (!workspaceId || participantsId === null) return;
    let cancelled = false;
    const done = () => {
      setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete("participants"); return next; }, { replace: true });
    };
    const found = allRequests.find(r => r.signingRequestId === participantsId);
    if (found) { setSignaturesFor(found); done(); return; }
    if (requestedDocumentIds === null) return; // the unfiltered list has not answered yet
    void realSigningRequestService.get(workspaceId, participantsId)
      .then(detail => {
        if (cancelled) return;
        setSignaturesFor({ signingRequestId: detail.signingRequestId, documentTitle: detail.documentTitle });
      })
      .catch(() => { /* Not this workspace's request, or gone: the list stays. */ })
      .finally(() => { if (!cancelled) done(); });
    return () => { cancelled = true; };
  }, [workspaceId, participantsId, allRequests, requestedDocumentIds, setSearchParams]);

  // The documents that are a workflow template's own: what each use of the
  // template is copied from. Null until known, so none is briefly shown as a
  // draft. Someone who may not read templates gets an empty set, and the
  // server still refuses the delete with a message naming the template.
  const templatesQuery = useLiveQuery(
    workspaceId ? draftSources.templateDocumentsKey(workspaceId) : null,
    () => draftSources.readTemplateDocumentIds(workspaceId ?? ""),
    { topics: ["documents"] },
  );
  const templateDocumentIds = useMemo(
    () => (templatesQuery.data === undefined ? null : new Set(templatesQuery.data)),
    [templatesQuery.data],
  );

  // Unsent drafts, filtered the way the server filters requests: by name.
  // They have no signers yet, so a signer filter excludes them, and they
  // only ever belong in the Draft section.
  const drafts = useMemo(() => {
    if (list !== "draft" || signer !== "") return [];
    const needle = q.toLowerCase();
    // Which documents are unsent drafts is the shared rule; only the name
    // filter is this page's own.
    return selectUnsentDraftDocuments(documents, requestedDocumentIds, templateDocumentIds)
      .filter(d => needle === "" || d.title.toLowerCase().includes(needle))
      .map(unsentDraftRow);
  }, [documents, requestedDocumentIds, templateDocumentIds, q, signer, list]);

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

  // Links from the bell: `?bin=open` opens the Recycle Bin, and
  // `?deletedNotice=<id>` the owner's notice for a deleted document. Each
  // parameter is dropped once used, so closing does not reopen it.
  const binParam = searchParams.get("bin");
  const noticeParam = searchParams.get("deletedNotice");
  useEffect(() => {
    if (binParam === null && noticeParam === null) return;
    if (binParam === "open") setBinOpen(true);
    if (noticeParam !== null) setNoticeId(noticeParam);
    setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete("bin"); next.delete("deletedNotice"); return next; }, { replace: true });
  }, [binParam, noticeParam, setSearchParams]);

  // ── Cancel, restore, the Recycle Bin, delete ──────────────────────────
  const loadBinCount = useCallback(() => {
    if (!workspaceId || freePlan) { setBinCount(null); return; }
    void Promise.all([
      documentLifecycleService.recycleBin(workspaceId),
      isOwner ? documentLifecycleService.deletionRequests(workspaceId) : Promise.resolve([]),
    ]).then(([inBin]) => { setBinCount(inBin.length); }).catch(() => { setBinCount(null); });
  }, [workspaceId, freePlan, isOwner]);
  useEffect(() => { loadBinCount(); }, [loadBinCount]);
  const refreshLists = useCallback(() => {
    void listQuery.refresh(); void allQuery.refresh(); void documentsQuery.refresh(); loadBinCount();
  }, [listQuery, allQuery, documentsQuery, loadBinCount]);
  const lifecycle = useDocumentLifecycle({ freePlan, onDone: refreshLists });
  const lifecycleFor = (item: SigningRequestListItem): Pick<Parameters<typeof documentCard>[1], "onCancel" | "onRestore" | "onTrash" | "onDelete"> => {
    if (!workspaceId) return {};
    const base = { workspaceId, signingRequestId: item.signingRequestId, title: item.documentTitle };
    return {
      onCancel: () => { lifecycle.ask({ kind: "cancel", ...base }); },
      onRestore: () => { lifecycle.ask({ kind: "restore", ...base }); },
      onTrash: () => { if (item.state === "cancelled" || item.state === "completed") lifecycle.ask({ kind: "trash", ...base, state: item.state }); },
      onDelete: () => {
        if (item.state === "declined" || item.state === "expired") lifecycle.ask({ kind: "delete-ended", ...base });
        else if (isUnsentDraft(item)) lifecycle.ask({ kind: "delete-draft", workspaceId, documentId: item.documentId, title: item.documentTitle });
        else lifecycle.ask({ kind: "delete-draft", workspaceId, documentId: item.documentId, signingRequestId: item.signingRequestId, title: item.documentTitle });
      },
    };
  };

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
        {/* Two groups: Correspondence (documents still travelling — out from
            this workspace, or in to me) and Records (everything kept). The
            group follows the list, so every existing ?list= link still lands
            in the right place. Documents always opens on Sent. */}
        {/* The groups on the left; the Recycle Bin, a round button, at the far
            right of the same row. */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div className="doc-groups" role="tablist" aria-label="Document groups">
          <button type="button" role="tab" className="doc-group" aria-selected={group === "correspondence"}
            onClick={() => { if (group !== "correspondence") setList("sent"); }}>
            <Mail size={16} aria-hidden /> <span>Correspondence</span>
            {inboxTotal > 0 && (
              <span className="doc-list-count" aria-label={`${String(inboxTotal)} waiting for you`}>{inboxTotal}</span>
            )}
          </button>
          <button type="button" role="tab" className="doc-group" aria-selected={group === "records"}
            onClick={() => { if (group !== "records") setList("signed"); }}>
            <Archive size={16} aria-hidden /> <span>Records</span>
          </button>
        </div>
        {!freePlan && workspaceId && <RecycleBinButton count={binCount} onClick={() => { setBinOpen(true); }} />}
        </div>
        <DocListStrip watch={`${group}:${list}`}>
          {group === "correspondence" ? (<>
            <button type="button" role="tab" className="doc-list-tab" aria-selected={list === "sent"} onClick={() => setList("sent")}>
              <Send size={14} aria-hidden /> Sent
            </button>
            {INBOX_TABS.map(tab => {
              const count = inbox?.[tab.action] ?? 0;
              const Icon = tab.icon;
              return (
                <button key={tab.list} type="button" role="tab" className="doc-list-tab" data-testid={`tab-${tab.list}`}
                  aria-selected={list === tab.list} onClick={() => setList(tab.list)}>
                  <Icon size={14} aria-hidden /> {tab.label}
                  {count > 0 && <span className="doc-list-count" aria-label={`${String(count)} waiting`}>{count}</span>}
                </button>
              );
            })}
          </>) : (<>
            <button type="button" role="tab" className="doc-list-tab" aria-selected={list === "signed"} onClick={() => setList("signed")}>
              <FileCheck2 size={14} aria-hidden /> Signed by me
            </button>
            <button type="button" role="tab" className="doc-list-tab" aria-selected={list === "draft"} onClick={() => setList("draft")}>
              <FileText size={14} aria-hidden /> Draft
            </button>
            <button type="button" role="tab" className="doc-list-tab" aria-selected={list === "declined"} onClick={() => setList("declined")}>
              <FileText size={14} aria-hidden /> Declined &amp; Expired
            </button>
            <button type="button" role="tab" className="doc-list-tab" data-testid="tab-cancelled" aria-selected={list === "cancelled"} onClick={() => setList("cancelled")}>
              <Ban size={14} aria-hidden /> Cancelled
            </button>
            {/* Last: the finished work, shown as branded cards. */}
            <button type="button" role="tab" className="doc-list-tab" aria-selected={list === "completed"} onClick={() => setList("completed")}>
              <FileCheck2 size={14} aria-hidden /> Completed
            </button>
          </>)}
        </DocListStrip>
        {INBOX_OF[list] !== undefined && <DocumentsToSignSection key={list} action={INBOX_OF[list]} onCount={loadInbox} />}
        {list === "signed" && <SignedByMeSection />}
        {list === "sent" && <DeletedDocumentsBlock origins={["sent"]} heading="Deleted" />}
        {ownList && (<>
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
              <span aria-live="polite" style={{ ...GF, fontSize: 12, color: SLATE6, marginLeft: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
        {status === "ready" && rows.length > 0 && list === "sent" && (
          <MailCardList label="Sent documents">
            {rows.map(item => (
              <OutboxCard key={item.signingRequestId} item={item} branding={ownBranding}
                onView={() => { setViewing(item); }}
                onSignatures={() => { setSignaturesFor(item); }}
                onAudit={() => { setAuditFor(item); }}
                onResend={() => { setResendFor(item); }}
                onExpiration={() => { setExpirationFor(item); }}
                onReminders={() => { setRemindersFor(item); }}
                retrying={retryingId === item.signingRequestId}
                onRetry={() => {
                  if (!workspaceId || retryingId !== null) return;
                  setRetryingId(item.signingRequestId);
                  void realSigningRequestService.retryCompletion(workspaceId, item.signingRequestId)
                    .then(result => { toastSuccess(describeRetryOutcome(result.restarted)); })
                    .catch((cause: unknown) => { toastError(describeRetryError(cause)); })
                    .finally(() => {
                      setRetryingId(null);
                      void listQuery.refresh();
                      void allQuery.refresh();
                    });
                }}
                onCancel={lifecycleFor(item).onCancel} />
            ))}
          </MailCardList>
        )}
        {status === "ready" && rows.length > 0 && list !== "sent" && (
          <CompletedDocumentGrid label="Documents" cards={rows.map(item => documentCard(item, {
            verificationId: verificationIds.get(item.documentId) ?? null,
            file: files.get(item.documentId),
            navigate,
            onView: () => { setViewing(item); },
            onSignatures: () => { setSignaturesFor(item); },
            onAudit: () => { setAuditFor(item); },
            ...(paidWorkspace ? { onResend: () => { setResendFor(item); } } : {}),
            onShare: item.state === "completed" && paidWorkspace ? () => { setShareFor(item); } : undefined,
            ...lifecycleFor(item),
          }))} />
        )}
        </>)}
      </AppContent>
      {viewing && workspaceId && (
        <DocumentViewerDialog workspaceId={workspaceId} item={viewing} onClose={() => setViewing(null)} />
      )}
      {noticeId !== null && <DeletedNoticeFromLink id={noticeId} onClose={() => { setNoticeId(null); }} />}
      {lifecycle.element}
      {binOpen && workspaceId && (
        <RecycleBinPanel workspaceId={workspaceId} isOwner={isOwner} currentUserId={user?.id} freePlan={freePlan}
          onClose={() => { setBinOpen(false); }} onChanged={refreshLists} />
      )}
      {resendFor && workspaceId && (
        <ResendSigningDialog
          // From Sent, new addresses only: no re-sending to the same people.
          allowSameParticipants={list !== "sent"}
          workspaceId={workspaceId}
          documentId={resendFor.documentId}
          documentTitle={resendFor.documentTitle}
          onClose={() => { setResendFor(null); }}
          // The request being sent again: its identity checks are what the
          // dialog reads "locked" and "lighter method allowed" from.
          signingRequestId={isUnsentDraft(resendFor) ? undefined : resendFor.signingRequestId}
          onSent={() => {
            setResendFor(null);
            // Refetch rather than patching the row: the send produced a NEW
            // request, so the list has an extra entry, not an edited one.
            void listQuery.refresh();
            void allQuery.refresh();
            // The server gives the new request its own numbered title, which
            // is the document's title from now on.
            void documentsQuery.refresh();
          }}
        />
      )}
      {expirationFor && workspaceId && (
        <ExpirationDialog
          workspaceId={workspaceId}
          signingRequestId={expirationFor.signingRequestId}
          documentTitle={expirationFor.documentTitle}
          expiresAt={expirationFor.expiresAt}
          onClose={() => { setExpirationFor(null); }}
          onSaved={() => {
            setExpirationFor(null);
            toastSuccess("Expiration saved");
            void listQuery.refresh();
            void allQuery.refresh();
          }}
        />
      )}
      {remindersFor && workspaceId && (
        <RemindersDialog
          workspaceId={workspaceId}
          signingRequestId={remindersFor.signingRequestId}
          documentTitle={remindersFor.documentTitle}
          onClose={() => { setRemindersFor(null); }}
          onSaved={saved => {
            setRemindersFor(null);
            toastSuccess(saved.enabled ? "Reminders saved" : "Reminders switched off");
          }}
        />
      )}
      {signaturesFor && workspaceId && (
        <SignatureRecordDialog
          workspaceId={workspaceId}
          signingRequestId={signaturesFor.signingRequestId}
          documentTitle={signaturesFor.documentTitle}
          onClose={() => setSignaturesFor(null)}
          onChanged={() => { void listQuery.refresh(); void allQuery.refresh(); }}
          // "Send to someone else", for a participant whose ID carries another
          // name: the same dialog Send again opens, which starts on new emails.
          onSendToSomeoneElse={() => {
            const requestId = signaturesFor.signingRequestId;
            const listed = allRequests.find(r => r.signingRequestId === requestId);
            if (listed) { setResendFor(listed); return; }
            // Opened from a notice, for a request the list in hand does not hold.
            void realSigningRequestService.get(workspaceId, requestId)
              .then(detail => {
                setResendFor({
                  signingRequestId: detail.signingRequestId, documentId: detail.documentId,
                  documentTitle: detail.documentTitle,
                });
              })
              .catch(() => { toastError("That document could not be opened to send again. Find it under Sent and try from there."); });
          }}
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
      {shareFor && workspaceId && (
        <ShareDocumentDialog
          workspaceId={workspaceId}
          target={{ documentId: shareFor.documentId, title: shareFor.documentTitle }}
          onClose={() => setShareFor(null)}
        />
      )}
    </>
  );
}

/**
 * The row of document lists. On a phone it is one row that scrolls sideways,
 * with an arrow at each edge that has more behind it.
 */
function DocListStrip({ watch, children }: { watch: string; children: React.ReactNode }) {
  const row = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = row.current;
    if (el === null) return;
    const left = el.scrollLeft > 2, right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setMore(now => (now.left === left && now.right === right ? now : { left, right }));
  }, []);

  useEffect(() => {
    const el = row.current;
    if (el === null) return;
    // The chosen list is brought into view, sideways only.
    const chosen = el.querySelector<HTMLElement>('[aria-selected="true"]');
    if (chosen !== null) {
      const from = chosen.offsetLeft - 44, to = chosen.offsetLeft + chosen.offsetWidth + 44;
      if (from < el.scrollLeft) el.scrollLeft = Math.max(0, from);
      else if (to > el.scrollLeft + el.clientWidth) el.scrollLeft = to - el.clientWidth;
    }
    measure();
  }, [watch, measure]);

  useEffect(() => {
    const el = row.current;
    if (el === null) return;
    window.addEventListener("resize", measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(el);
    return () => { window.removeEventListener("resize", measure); observer?.disconnect(); };
  }, [measure]);

  const move = (direction: 1 | -1) => {
    const el = row.current;
    if (el !== null) el.scrollLeft += direction * Math.max(140, Math.round(el.clientWidth * 0.7));
  };

  return (
    <div className="doc-list-strip">
      {/* The arrows only move the row. Every list is reachable from the
          keyboard through the tabs themselves, so they stay out of its way. */}
      <button type="button" className="doc-list-arrow" data-side="left" data-show={more.left} tabIndex={-1} aria-hidden={!more.left}
        aria-label="Show earlier lists" onClick={() => { move(-1); }}>
        <span><ChevronLeft size={16} aria-hidden /></span>
      </button>
      <div ref={row} className="doc-list-tabs" role="tablist" aria-label="Document lists" onScroll={measure}>
        {children}
      </div>
      <button type="button" className="doc-list-arrow" data-side="right" data-show={more.right} tabIndex={-1} aria-hidden={!more.right}
        aria-label="Show more lists" onClick={() => { move(1); }}>
        <span><ChevronRight size={16} aria-hidden /></span>
      </button>
    </div>
  );
}

export function DocumentsPage() {
  // 086. Contact requests moved to Contacts → Requests From Contacts. Old
  // links (?list=requests-sent, ?request=<id>) follow them there.
  const [searchParams] = useSearchParams();
  const moved = legacyContactRequestRedirect(searchParams);
  if (moved !== null) return <Navigate to={moved} replace />;
  return USE_REAL_BACKEND ? <DocumentsPageRealMode /> : <DocumentsPageMockDemo />;
}

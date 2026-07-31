// /app/templates — Template library.
// Views, search, filter bar, sort, grid/list toggle, pagination, empty states.
// Inline styles only. No Tailwind. No Burgundy.

import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  LayoutTemplate, Plus, Search, ChevronDown, Grid, List,
  Clock, FileText, Users, GitBranch, Star, Archive,
  AlertCircle, RefreshCw, Filter, X, ChevronRight,
  Copy, CheckCircle2, PenLine, Eye, Zap,
} from "lucide-react";
import { TemplateProvider, useTemplates } from "../../../context/TemplateContext";
import {
  AppContent, EmptyStateLayout, SkeletonBlock, SKELETON_STYLE,
} from "../../../components/platform";
import { PageHeader } from "../../../components/platform";
import {
  TEMPLATE_VIEWS, TEMPLATE_CATEGORIES, TEMPLATE_STATUS_LABELS,
  TEMPLATE_STATUS_TONE, TEMPLATE_CATEGORY_LABELS, TEMPLATE_SCOPE_LABELS,
  DEFAULT_TEMPLATE_QUERY,
} from "../../../models/templates";
import type {
  TemplateListItem, TemplateListQuery, TemplateView, TemplateSortField,
  TemplateCategory, TemplateStatus,
} from "../../../models/templates";
import { usePageMeta } from "../../../hooks/usePageMeta";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GF    = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";
const GOLD  = "#C9960C";
const GREEN = "#059669";
const RED   = "#DC2626";

const STATUS_COLOR: Record<string, string> = {
  available:   GREEN,
  draft:       GOLD,
  archived:    "#94A3B8",
  unavailable: "#94A3B8",
  invalid:     RED,
};

const SORT_OPTIONS: { value: TemplateSortField; label: string }[] = [
  { value: "updatedAt",  label: "Last Updated" },
  { value: "name",       label: "Name (A–Z)"   },
  { value: "lastUsed",   label: "Last Used"     },
  { value: "usageCount", label: "Most Used"     },
  { value: "status",     label: "Status"        },
  { value: "category",   label: "Category"      },
];

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: TemplateStatus }) {
  const tone  = TEMPLATE_STATUS_TONE[status] ?? "neutral";
  const label = TEMPLATE_STATUS_LABELS[status] ?? status;
  const color: Record<string, string> = {
    success: "#E6F4EA",
    warning: "#FEF9E7",
    error:   "#FEF0F0",
    muted:   "#F1F5F9",
    neutral: "#F1F5F9",
  };
  const text: Record<string, string> = {
    success: GREEN,
    warning: GOLD,
    error:   RED,
    muted:   "#64748B",
    neutral: "#64748B",
  };
  return (
    <span style={{
      display:       "inline-flex",
      alignItems:    "center",
      gap:           4,
      padding:       "2px 8px",
      borderRadius:  99,
      fontSize:      11,
      fontWeight:    600,
      background:    color[tone] ?? "#F1F5F9",
      color:         text[tone]  ?? "#64748B",
      ...GF,
    }}>
      {label}
    </span>
  );
}

// ── Template card (grid view) ─────────────────────────────────────────────────
function TemplateCard({ item }: { item: TemplateListItem }) {
  const navigate = useNavigate();
  return (
    <article
      onClick={() => navigate(`/app/templates/${item.id}`)}
      style={{
        background:    "white",
        border:        "1px solid #E2E8F0",
        borderRadius:  12,
        padding:       "18px 20px",
        cursor:        "pointer",
        transition:    "box-shadow 0.15s, border-color 0.15s",
        outline:       "none",
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open template: ${item.name}`}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") navigate(`/app/templates/${item.id}`); }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
        (e.currentTarget as HTMLElement).style.borderColor = "#CBD5E1";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = "";
        (e.currentTarget as HTMLElement).style.borderColor = "#E2E8F0";
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 9,
          background: "#EEF4FB", display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <LayoutTemplate size={18} color={AZURE} />
        </div>
        <StatusBadge status={item.status} />
      </div>

      {/* Name */}
      <h3 style={{ ...GF, fontSize: 14, fontWeight: 700, color: "#0F172A", margin: "0 0 4px", lineHeight: 1.35 }}>
        {item.name}
      </h3>

      {/* Category + scope */}
      <p style={{ ...GF, fontSize: 12, color: "#64748B", margin: "0 0 14px" }}>
        {TEMPLATE_CATEGORY_LABELS[item.category]} · {TEMPLATE_SCOPE_LABELS[item.scope]}
      </p>

      {/* Meta row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <MetaChip icon={<Users size={11} />} label={`${item.placeholderCount} role${item.placeholderCount !== 1 ? "s" : ""}`} />
        <MetaChip icon={<FileText size={11} />} label={`${item.documentCount} doc${item.documentCount !== 1 ? "s" : ""}`} />
        <MetaChip icon={<GitBranch size={11} />} label={item.routingMode.replace(/-/g, " ")} />
        {item.usageCount > 0 && <MetaChip icon={<Star size={11} />} label={`${item.usageCount}×`} />}
      </div>

      {/* Error/warning indicator */}
      {(item.hasErrors || item.hasWarnings) && (
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <AlertCircle size={12} color={item.hasErrors ? RED : GOLD} />
          <span style={{ ...GF, fontSize: 11, color: item.hasErrors ? RED : GOLD }}>
            {item.hasErrors ? "Validation errors" : "Warnings"}
          </span>
        </div>
      )}
    </article>
  );
}

function MetaChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#64748B", ...GF, fontSize: 11 }}>
      {icon}
      {label}
    </span>
  );
}

// ── Template row (list view) ──────────────────────────────────────────────────
function TemplateRow({ item }: { item: TemplateListItem }) {
  const navigate = useNavigate();
  return (
    <tr
      onClick={() => navigate(`/app/templates/${item.id}`)}
      style={{ cursor: "pointer", borderBottom: "1px solid #F1F5F9" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}
    >
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#EEF4FB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <LayoutTemplate size={14} color={AZURE} />
          </div>
          <div>
            <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{item.name}</div>
            <div style={{ ...GF, fontSize: 11, color: "#94A3B8", marginTop: 1 }}>
              {TEMPLATE_CATEGORY_LABELS[item.category]} · {TEMPLATE_SCOPE_LABELS[item.scope]}
            </div>
          </div>
        </div>
      </td>
      <td style={{ padding: "12px 16px" }}><StatusBadge status={item.status} /></td>
      <td style={{ padding: "12px 16px", ...GF, fontSize: 12, color: "#64748B" }}>
        {item.placeholderCount} role{item.placeholderCount !== 1 ? "s" : ""}
      </td>
      <td style={{ padding: "12px 16px", ...GF, fontSize: 12, color: "#64748B" }}>
        {item.usageCount > 0 ? `${item.usageCount}× used` : "Unused"}
      </td>
      <td style={{ padding: "12px 16px", ...GF, fontSize: 12, color: "#94A3B8" }}>
        {item.lastUsedDate ? new Date(item.lastUsedDate).toLocaleDateString() : "—"}
      </td>
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {item.status === "available" && (
            <Link
              to={`/app/templates/${item.id}/use`}
              onClick={e => e.stopPropagation()}
              style={{ padding: "5px 10px", background: AZURE, color: "white", ...GF, fontSize: 11, fontWeight: 600, borderRadius: 6, textDecoration: "none" }}
            >
              Use
            </Link>
          )}
          <Link
            to={`/app/templates/${item.id}`}
            onClick={e => e.stopPropagation()}
            style={{ padding: "5px 10px", background: "#F1F5F9", color: "#0F172A", ...GF, fontSize: 11, fontWeight: 600, borderRadius: 6, textDecoration: "none" }}
          >
            View
          </Link>
        </div>
      </td>
    </tr>
  );
}

// ── Skeleton loaders ──────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 20px" }}>
      <style>{SKELETON_STYLE}</style>
      <SkeletonBlock height={38} width={38} radius={9} />
      <div style={{ marginTop: 12 }}><SkeletonBlock height={14} width="75%" /></div>
      <div style={{ marginTop: 6 }}><SkeletonBlock height={11} width="50%" /></div>
      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        <SkeletonBlock height={11} width={60} />
        <SkeletonBlock height={11} width={50} />
      </div>
    </div>
  );
}

// ── Main inner component ──────────────────────────────────────────────────────
function TemplatesInner() {
  usePageMeta();
  const { state, setQuery, loadList } = useTemplates();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [localQ, setLocalQ] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  // Initial load
  useEffect(() => {
    loadList(DEFAULT_TEMPLATE_QUERY);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when query changes
  useEffect(() => {
    loadList(state.query);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.query]);

  const updateQuery = useCallback((partial: Partial<TemplateListQuery>) => {
    setQuery({ ...state.query, page: 1, ...partial });
  }, [state.query, setQuery]);

  const handleSearch = (q: string) => {
    setLocalQ(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => updateQuery({ q }), 280);
  };

  const activeView     = state.query.view;
  const { listResult, listLoading } = state;
  const items          = listResult?.items ?? [];
  const total          = listResult?.total ?? 0;
  const hasFilters     = !!(state.query.status || state.query.scope || state.query.category);

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100%", ...GF }}>
      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0, letterSpacing: "-0.02em" }}>
              Templates
            </h1>
            <p style={{ ...GF, fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>
              Reusable document workflows for your team
            </p>
          </div>
          <Link
            to="/app/templates/new"
            style={{
              display:     "inline-flex",
              alignItems:  "center",
              gap:         7,
              padding:     "10px 18px",
              background:  AZURE,
              color:       "white",
              borderRadius:8,
              ...GF,
              fontSize:    13,
              fontWeight:  700,
              textDecoration:"none",
              flexShrink:  0,
            }}
          >
            <Plus size={15} />
            New Template
          </Link>
        </div>

        {/* View tabs */}
        <div style={{ display: "flex", gap: 2, marginTop: 16, borderBottom: "1px solid #E2E8F0", marginBottom: -1 }}>
          {TEMPLATE_VIEWS.map(v => (
            <button
              key={v.id}
              onClick={() => updateQuery({ view: v.id })}
              style={{
                ...GF,
                fontSize:   12,
                fontWeight: activeView === v.id ? 700 : 500,
                color:      activeView === v.id ? AZURE : "#64748B",
                background: "none",
                border:     "none",
                borderBottom: activeView === v.id ? `2px solid ${AZURE}` : "2px solid transparent",
                padding:    "8px 14px",
                cursor:     "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ background: "white", borderBottom: "1px solid #F1F5F9", padding: "12px 24px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 340 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
          <input
            type="search"
            value={localQ}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search templates…"
            style={{
              width:        "100%",
              height:       36,
              paddingLeft:  34,
              paddingRight: 12,
              border:       "1px solid #E2E8F0",
              borderRadius: 8,
              ...GF,
              fontSize:     13,
              color:        "#0F172A",
              background:   "#F8FAFC",
              outline:      "none",
              boxSizing:    "border-box",
            }}
          />
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(p => !p)}
          style={{
            display:     "inline-flex",
            alignItems:  "center",
            gap:         6,
            height:      36,
            padding:     "0 12px",
            border:      `1px solid ${showFilters || hasFilters ? AZURE : "#E2E8F0"}`,
            borderRadius:8,
            background:  showFilters || hasFilters ? "#EEF4FB" : "white",
            color:       showFilters || hasFilters ? AZURE : "#64748B",
            ...GF,
            fontSize:    12,
            fontWeight:  600,
            cursor:      "pointer",
          }}
        >
          <Filter size={13} />
          Filters
          {hasFilters && <span style={{ background: AZURE, color: "white", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 5px" }}>•</span>}
        </button>

        {/* Sort */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <span style={{ ...GF, fontSize: 12, color: "#64748B" }}>Sort:</span>
          <select
            value={state.query.sort}
            onChange={e => updateQuery({ sort: e.target.value as TemplateSortField })}
            style={{ ...GF, fontSize: 12, color: "#0F172A", border: "1px solid #E2E8F0", borderRadius: 6, padding: "5px 8px", background: "white", cursor: "pointer" }}
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            onClick={() => updateQuery({ direction: state.query.direction === "asc" ? "desc" : "asc" })}
            title={state.query.direction === "asc" ? "Ascending" : "Descending"}
            style={{ padding: "5px 8px", border: "1px solid #E2E8F0", borderRadius: 6, background: "white", cursor: "pointer", color: "#64748B", fontSize: 11 }}
          >
            {state.query.direction === "asc" ? "↑" : "↓"}
          </button>

          {/* View toggle */}
          <div style={{ display: "flex", border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
            <button
              onClick={() => setViewMode("grid")}
              title="Grid view"
              style={{ padding: "6px 10px", background: viewMode === "grid" ? "#EEF4FB" : "white", border: "none", cursor: "pointer", color: viewMode === "grid" ? AZURE : "#94A3B8", display: "flex", alignItems: "center" }}
            >
              <Grid size={14} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              title="List view"
              style={{ padding: "6px 10px", background: viewMode === "list" ? "#EEF4FB" : "white", border: "none", cursor: "pointer", color: viewMode === "list" ? AZURE : "#94A3B8", display: "flex", alignItems: "center" }}
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div style={{ background: "white", borderBottom: "1px solid #F1F5F9", padding: "12px 24px", display: "flex", gap: 12, flexWrap: "wrap" }}>
          <FilterSelect
            label="Status"
            value={state.query.status ?? ""}
            onChange={v => updateQuery({ status: v as TemplateStatus || undefined })}
            options={[["", "All Statuses"], ...Object.entries(TEMPLATE_STATUS_LABELS)]}
          />
          <FilterSelect
            label="Category"
            value={state.query.category ?? ""}
            onChange={v => updateQuery({ category: v as TemplateCategory || undefined })}
            options={[["", "All Categories"], ...TEMPLATE_CATEGORIES.map((c): [string, string] => [c, TEMPLATE_CATEGORY_LABELS[c]])]}
          />
          <FilterSelect
            label="Scope"
            value={state.query.scope ?? ""}
            onChange={v => updateQuery({ scope: (v as "personal" | "workspace") || undefined })}
            options={[["", "All Scopes"], ["personal", "Personal"], ["workspace", "Workspace"]]}
          />
          {hasFilters && (
            <button
              onClick={() => updateQuery({ status: undefined, category: undefined, scope: undefined })}
              style={{ ...GF, fontSize: 12, color: RED, background: "none", border: "1px solid #FEE2E2", borderRadius: 6, padding: "5px 10px", cursor: "pointer", alignSelf: "flex-end" }}
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: "20px 24px" }}>
        {/* Result count */}
        {!listLoading && listResult && (
          <p style={{ ...GF, fontSize: 12, color: "#94A3B8", marginBottom: 14 }}>
            {total === 0 ? "No templates found" : `${total} template${total !== 1 ? "s" : ""}`}
          </p>
        )}

        {/* Loading */}
        {listLoading && viewMode === "grid" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
        )}

        {/* Error */}
        {state.listError && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 16, background: "#FEF0F0", border: "1px solid #FECACA", borderRadius: 10, marginBottom: 16 }}>
            <AlertCircle size={16} color={RED} />
            <span style={{ ...GF, fontSize: 13, color: "#7F1D1D" }}>{state.listError}</span>
            <button onClick={() => loadList()} style={{ marginLeft: "auto", ...GF, fontSize: 12, color: RED, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Retry</button>
          </div>
        )}

        {/* Grid view */}
        {!listLoading && viewMode === "grid" && items.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {items.map(item => <TemplateCard key={item.id} item={item} />)}
          </div>
        )}

        {/* List view */}
        {!listLoading && viewMode === "list" && items.length > 0 && (
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  {["Template", "Status", "Roles", "Usage", "Last Used", ""].map(h => (
                    <th key={h} style={{ ...GF, fontSize: 11, fontWeight: 700, color: "#64748B", textAlign: "left", padding: "10px 16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => <TemplateRow key={item.id} item={item} />)}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state */}
        {!listLoading && items.length === 0 && !state.listError && (
          <EmptyStateLayout
            icon={<LayoutTemplate size={24} />}
            title={state.query.q ? `No results for "${state.query.q}"` : "No templates yet"}
            description={
              state.query.q
                ? "Try a different search term or clear the search to see all templates."
                : "Create your first template to build reusable signing workflows for your team."
            }
            action={
              !state.query.q ? (
                <Link
                  to="/app/templates/new"
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", background: AZURE, color: "white", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 700, textDecoration: "none" }}
                >
                  <Plus size={14} />
                  Create Template
                </Link>
              ) : (
                <button onClick={() => { setLocalQ(""); updateQuery({ q: "" }); }} style={{ ...GF, fontSize: 13, color: AZURE, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                  Clear search
                </button>
              )
            }
          />
        )}

        {/* Pagination */}
        {listResult && listResult.pageCount > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24 }}>
            <button
              disabled={listResult.page <= 1}
              onClick={() => updateQuery({ page: listResult.page - 1 })}
              style={{ ...GF, fontSize: 12, padding: "7px 14px", border: "1px solid #E2E8F0", borderRadius: 7, background: "white", cursor: "pointer", opacity: listResult.page <= 1 ? 0.4 : 1 }}
            >
              ← Previous
            </button>
            <span style={{ ...GF, fontSize: 12, color: "#64748B" }}>Page {listResult.page} of {listResult.pageCount}</span>
            <button
              disabled={listResult.page >= listResult.pageCount}
              onClick={() => updateQuery({ page: listResult.page + 1 })}
              style={{ ...GF, fontSize: 12, padding: "7px 14px", border: "1px solid #E2E8F0", borderRadius: 7, background: "white", cursor: "pointer", opacity: listResult.page >= listResult.pageCount ? 0.4 : 1 }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <label style={{ ...GF, fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...GF, fontSize: 12, color: "#0F172A", border: "1px solid #E2E8F0", borderRadius: 6, padding: "5px 8px", background: "white", cursor: "pointer" }}
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

// ── Export wrapped in provider ─────────────────────────────────────────────────
export function TemplatesPage() {
  return (
    <TemplateProvider>
      <TemplatesInner />
    </TemplateProvider>
  );
}

// /app/contacts — Contacts library page.
// Views, search, filters, sort, desktop table, mobile cards, multi-select, bulk actions.
// Frontend-only demonstration. No real persistence, sync, or identity verification.
// Burgundy (#67023B) never used. eNotary never referenced.

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { User as BlankPersonIcon, MoreVertical } from "lucide-react";
import { ContactProvider, useContacts } from "../../../context/ContactContext";
import type { ContactListItem, ContactView, ContactSortField, ContactScope, ContactStatus, ContactTagId, ContactGroupId } from "../../../models/contacts";
import {
  CONTACT_VIEW_LABELS, CONTACT_VIEWS, CONTACT_STATUS_LABELS, CONTACT_SCOPE_LABELS,
  SYSTEM_CONTACT_TAGS, getContactTagById,
} from "../../../models/contacts";
import { Z } from "../../../utils/z-index";
import { TabStrip } from "../../../components/platform/TabStrip";
import { FilterChips } from "../../../components/platform/FilterChips";
import { useProcessing } from "../../../services/processing.service";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const LIGHT = "#F0F7FF";
const PAGE_BG = "#F8FAFC";

function useDebounce<T>(value: T, ms: number): T {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return d;
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; color: string }> = {
    active:     { bg: "#DCFCE7", color: "#166534" },
    archived:   { bg: "#F1F5F9", color: "#475569" },
    invalid:    { bg: "#FEF3C7", color: "#92400E" },
    // Slate, not the Soft Burgundy Tint this used to be. Burgundy of any
    // strength is reserved for eNotary; spending it on an eSignature contact
    // status is what erodes the one visual cue separating the two products.
    restricted: { bg: "#E2E8F0", color: "#334155" },
  };
  const c = configs[status] ?? { bg: "#F1F5F9", color: "#475569" };
  return (
    <span style={{ ...GM, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: c.bg, color: c.color }}>
      {CONTACT_STATUS_LABELS[status as ContactStatus] ?? status}
    </span>
  );
}

function ScopeBadge({ scope }: { scope: ContactScope }) {
  return (
    <span style={{ ...GM, fontSize: 10, padding: "2px 7px", borderRadius: 999, background: scope === "workspace" ? "#EBF4FC" : "#F8FAFC", color: scope === "workspace" ? AZURE : SLATE }}>
      {CONTACT_SCOPE_LABELS[scope]}
    </span>
  );
}

function TagChip({ tagId }: { tagId: ContactTagId }) {
  const tag = getContactTagById(tagId);
  if (!tag) return null;
  return (
    <span style={{ ...GM, fontSize: 9, padding: "2px 6px", borderRadius: 999, background: `${tag.color}18`, color: tag.color }}>
      {tag.label}
    </span>
  );
}

/**
 * A real profile picture when this contact is tied to a registered LAGDA
 * account (`avatarUrl` set), otherwise a blank default person — never
 * initials. An address-book entry is not a verified identity (see
 * services/real/contact.service.ts), so guessing a face from a name's
 * initials would overstate what's actually known about most rows here.
 */
function ContactAvatar({ name, avatarUrl, size = 40 }: { name: string; avatarUrl?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const showImage = !!avatarUrl && !failed;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
      background: showImage ? "transparent" : "#EEF2F6",
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "1px solid #E3E8EF",
    }}>
      {showImage
        ? <img src={avatarUrl} alt="" onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <BlankPersonIcon size={Math.round(size * 0.55)} color={SILVER} aria-label={`${name}'s profile picture is not set`} strokeWidth={1.75} />
      }
    </div>
  );
}

function RelativeDate({ iso }: { iso?: string }) {
  if (!iso) return <span style={{ color: SILVER, fontSize: 12 }}>—</span>;
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  const label = diff === 0 ? "Today" : diff === 1 ? "Yesterday" : diff < 7 ? `${diff}d ago` : diff < 30 ? `${Math.floor(diff/7)}w ago` : `${Math.floor(diff/30)}mo ago`;
  return <span style={{ ...GM, fontSize: 11, color: SLATE }} title={d.toLocaleDateString()}>{label}</span>;
}

function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-label="Loading contacts" aria-busy="true" style={{ padding: "0 0 12px" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid #F0F2F5" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#E2E8F0" }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 12, background: "#E2E8F0", borderRadius: 4, width: "40%", marginBottom: 6 }} />
            <div style={{ height: 10, background: "#F1F5F9", borderRadius: 4, width: "60%" }} />
          </div>
          <div style={{ height: 20, background: "#F1F5F9", borderRadius: 10, width: 60 }} />
        </div>
      ))}
    </div>
  );
}

// ── Inner library component ───────────────────────────────────────────────────

function ContactsLibrary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, setQuery, asyncLoadList, asyncLoadGroups, asyncBulkArchive, asyncBulkRestore, asyncBulkAddToGroup, clearPending } = useContacts();

  const [searchInput,   setSearchInput]   = useState(searchParams.get("q") ?? "");
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [showFilters,   setShowFilters]   = useState(false);
  const [, setShowBulkMenu] = useState(false);
  const debouncedSearch = useDebounce(searchInput, 280);

  const currentView = (searchParams.get("view") as ContactView) ?? "all";

  // Sync URL params → context query
  useEffect(() => {
    const view   = (searchParams.get("view")  as ContactView  ) ?? "all";
    const sort   = (searchParams.get("sort")  as ContactSortField) ?? "updatedAt";
    const dir    = (searchParams.get("dir")   as "asc" | "desc") ?? "desc";
    const page   = parseInt(searchParams.get("page") ?? "1", 10);
    const scope  = (searchParams.get("scope") as ContactScope | "all") ?? "all";
    const status = (searchParams.get("status") as ContactStatus | "all") ?? "all";
    setQuery({ view, sort, direction: dir, page, scopeFilter: scope, statusFilter: status, search: debouncedSearch });
  }, [searchParams, debouncedSearch, setQuery]);

  // Reload list when query changes
  useEffect(() => { void asyncLoadList(); }, [state.query]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load groups once
  useEffect(() => { void asyncLoadGroups(); }, [asyncLoadGroups]);

  // Clear selection on view change
  useEffect(() => { setSelectedIds(new Set()); }, [currentView]);

  // Clear pending feedback after delay
  useEffect(() => {
    if (!state.pendingMessage) return;
    const t = setTimeout(clearPending, 3500);
    return () => clearTimeout(t);
  }, [state.pendingMessage, clearPending]);

  const setView    = (v: ContactView)       => { const p = new URLSearchParams(searchParams); p.set("view", v); p.delete("page"); setSearchParams(p); };
  const setSort    = (s: ContactSortField)  => { const p = new URLSearchParams(searchParams); p.set("sort", s); setSearchParams(p); };
  const toggleDir  = ()                     => { const p = new URLSearchParams(searchParams); p.set("dir", state.query.direction === "asc" ? "desc" : "asc"); setSearchParams(p); };
  const setPage    = (pg: number)           => { const p = new URLSearchParams(searchParams); p.set("page", String(pg)); setSearchParams(p); };

  // Only genuine narrowing appears as a chip. `view` is a tab and `sort`/`dir`
  // reorder rather than hide, so neither is a filter the user needs warning about.
  const activeFilterChips = [
    ...(searchInput.trim() ? [{ key: "q", label: `Search: "${searchInput.trim()}"` }] : []),
    ...(state.query.scopeFilter !== "all"
      ? [{ key: "scope", label: `Scope: ${CONTACT_SCOPE_LABELS[state.query.scopeFilter] ?? state.query.scopeFilter}` }]
      : []),
    ...(state.query.statusFilter !== "all"
      ? [{ key: "status", label: `Status: ${CONTACT_STATUS_LABELS[state.query.statusFilter] ?? state.query.statusFilter}` }]
      : []),
    ...state.query.tagFilter.map(tagId => ({
      key: `tag:${tagId}`,
      label: `Tag: ${getContactTagById(tagId)?.label ?? tagId}`,
    })),
  ];

  const removeFilter = (key: string) => {
    if (key === "q")      { setSearchInput(""); return; }
    if (key === "scope")  { setQuery({ scopeFilter: "all", page: 1 }); return; }
    if (key === "status") { setQuery({ statusFilter: "all", page: 1 }); return; }
    if (key.startsWith("tag:")) {
      const tagId = key.slice(4) as ContactTagId;
      setQuery({ tagFilter: state.query.tagFilter.filter(t => t !== tagId), page: 1 });
    }
  };

  const clearAllFilters = () => {
    setSearchInput("");
    setQuery({ tagFilter: [], scopeFilter: "all", statusFilter: "all", page: 1 });
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => { const s = new Set(prev); if (s.has(id)) { s.delete(id); } else { s.add(id); } return s; });
  const selectAll    = () => { if (!state.listResult) return; setSelectedIds(new Set(state.listResult.items.map(c => c.id))); };
  const clearSelect  = () => setSelectedIds(new Set());

  const items   = state.listResult?.items ?? [];
  const total   = state.listResult?.total  ?? 0;
  const counts  = state.listResult?.viewCounts;
  const hasNext = state.listResult?.hasNextPage ?? false;
  const hasPrev = state.listResult?.hasPrevPage ?? false;

  const selArr = Array.from(selectedIds) as ContactId[];

  return (
    <div style={{ minHeight: "100vh", background: PAGE_BG }}>
      {/* Skip link */}
      <a href="#contacts-main" style={{ position: "absolute", left: -9999, top: 0, zIndex: Z.skipLink, ...GF, background: AZURE, color: "#fff", padding: "6px 12px" }}
         onFocus={e => (e.currentTarget.style.left = "16px")}
         onBlur={e  => (e.currentTarget.style.left = "-9999px")}>
        Skip to contacts
      </a>

      {/* Page header */}
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: "20px 24px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ ...GF, color: NAVY, fontSize: 22, fontWeight: 800, margin: 0 }}>Contacts</h1>
            <p style={{ ...GF, color: SLATE, fontSize: 13, marginTop: 3 }}>
              Manage reusable participant information for document workflows.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link to="/app/contacts/import" style={{ ...GF, fontSize: 13, color: AZURE, border: `1.5px solid ${AZURE}`, borderRadius: 8, padding: "8px 14px", textDecoration: "none", fontWeight: 600 }}>
              Import Contacts
            </Link>
            <Link to="/app/contacts/new" style={{ ...GF, fontSize: 13, color: "#FFFFFF", background: AZURE, border: "none", borderRadius: 8, padding: "8px 16px", textDecoration: "none", fontWeight: 700 }}>
              + Add Contact
            </Link>
          </div>
        </div>

        {/* Views bar */}
        <TabStrip label="Contact views" activeKey={currentView} className="contacts-viewstrip">
          {CONTACT_VIEWS.map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-current={currentView === v ? "page" : undefined}
              style={{
                ...GF, fontSize: 13, fontWeight: currentView === v ? 700 : 500,
                padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                background: currentView === v ? LIGHT : "transparent",
                color: currentView === v ? AZURE : SLATE,
                whiteSpace: "nowrap",
              }}
            >
              {CONTACT_VIEW_LABELS[v]}
              {counts && (
                <span style={{ ...GM, fontSize: 10, marginLeft: 5, color: currentView === v ? AZURE : SILVER }}>
                  {counts[v]}
                </span>
              )}
            </button>
          ))}
        </TabStrip>
      </header>

      {/* Toolbar */}
      <div style={{ background: "#FFFFFF", borderBottom: "1px solid #F0F2F5", padding: "10px 24px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ flex: "1 1 220px", position: "relative" }}>
          <label htmlFor="contact-search" style={{ position: "absolute", left: -9999 }}>Search contacts</label>
          <input
            id="contact-search"
            type="search"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search contacts, organizations, roles, tags…"
            style={{
              ...GF, width: "100%", fontSize: 13, color: NAVY,
              border: "1.5px solid #D1D9E0", borderRadius: 8, padding: "7px 12px 7px 34px",
              outline: "none", boxSizing: "border-box",
            }}
          />
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: SILVER, fontSize: 14 }}>⌕</span>
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(v => !v)}
          aria-expanded={showFilters}
          aria-controls="filter-panel"
          style={{ ...GF, fontSize: 13, color: SLATE, background: "none", border: "1.5px solid #D1D9E0", borderRadius: 8, padding: "7px 12px", cursor: "pointer" }}
        >
          Filters {showFilters ? "▲" : "▼"}
        </button>

        {/* Sort */}
        <select
          value={state.query.sort}
          onChange={e => setSort(e.target.value as ContactSortField)}
          aria-label="Sort contacts"
          style={{ ...GF, fontSize: 13, color: NAVY, border: "1.5px solid #D1D9E0", borderRadius: 8, padding: "7px 10px", cursor: "pointer" }}
        >
          <option value="updatedAt">Recently Updated</option>
          <option value="lastUsedAt">Recently Used</option>
          <option value="usageCount">Frequently Used</option>
          <option value="name">Name</option>
          <option value="organization">Organization</option>
        </select>

        <button
          onClick={toggleDir}
          aria-label={state.query.direction === "asc" ? "Sort ascending" : "Sort descending"}
          style={{ ...GF, fontSize: 13, color: SLATE, background: "none", border: "1.5px solid #D1D9E0", borderRadius: 8, padding: "7px 10px", cursor: "pointer" }}
        >
          {state.query.direction === "asc" ? "↑" : "↓"}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div id="filter-panel" role="region" aria-label="Filters" style={{ background: "#FFFFFF", borderBottom: "1px solid #F0F2F5", padding: "12px 24px", display: "flex", gap: 16, flexWrap: "wrap" }}>
          <FilterSelect label="Scope" value={state.query.scopeFilter} onChange={v => setQuery({ scopeFilter: v as ContactScope | "all", page: 1 })}>
            <option value="all">All scopes</option>
            <option value="workspace">Workspace</option>
            <option value="personal">Personal</option>
          </FilterSelect>
          <FilterSelect label="Status" value={state.query.statusFilter} onChange={v => setQuery({ statusFilter: v as ContactStatus | "all", page: 1 })}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="invalid">Invalid</option>
          </FilterSelect>
          <div>
            <label style={{ ...GF, fontSize: 11, fontWeight: 700, color: SLATE, display: "block", marginBottom: 4 }}>Tags</label>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {SYSTEM_CONTACT_TAGS.slice(0, 8).map(tag => {
                const active = state.query.tagFilter.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => {
                      const next = active
                        ? state.query.tagFilter.filter(t => t !== tag.id)
                        : [...state.query.tagFilter, tag.id];
                      setQuery({ tagFilter: next, page: 1 });
                    }}
                    aria-pressed={active}
                    style={{
                      ...GM, fontSize: 10, padding: "3px 8px", borderRadius: 999, cursor: "pointer",
                      background: active ? `${tag.color}20` : "#F8FAFC",
                      color: active ? tag.color : SLATE,
                      border: active ? `1.5px solid ${tag.color}` : "1.5px solid #E3E8EF",
                      fontWeight: active ? 700 : 500,
                    }}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>
          {(state.query.tagFilter.length > 0 || state.query.scopeFilter !== "all" || state.query.statusFilter !== "all") && (
            <button onClick={() => setQuery({ tagFilter: [], scopeFilter: "all", statusFilter: "all", page: 1 })}
              style={{ ...GF, fontSize: 12, color: "#DC2626", background: "none", border: "none", cursor: "pointer", alignSelf: "flex-end", padding: "4px 0" }}>
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Active filters, ALWAYS visible.
          The panel above is collapsed by default but scope, status and tag all
          arrive from the URL, so following a shared link used to produce a
          filtered list with nothing saying it was filtered and no way to clear
          it without first finding the Filters toggle. */}
      <FilterChips
        chips={activeFilterChips}
        onRemove={removeFilter}
        onClearAll={clearAllFilters}
        label="Active contact filters"
      />

      {/* Pending message */}
      {(state.pendingMessage || state.pendingError) && (
        <div role="status" aria-live="polite" style={{
          margin: "12px 24px 0",
          padding: "10px 14px", borderRadius: 8,
          background: state.pendingError ? "#FEF2F2" : "#DCFCE7",
          color: state.pendingError ? "#991B1B" : "#166534",
          ...GF, fontSize: 13,
        }}>
          {state.pendingMessage ?? state.pendingError}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div role="toolbar" aria-label="Bulk contact actions" style={{
          margin: "12px 24px 0",
          background: NAVY, color: "#FFFFFF", borderRadius: 10,
          padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}>
          <span style={{ ...GF, fontSize: 13, fontWeight: 700 }} aria-live="polite">
            {selectedIds.size} selected
          </span>
          <div style={{ flex: 1 }} />
          <BulkActionButton label="Add Tag" onClick={() => setShowBulkMenu(v => !v)} />
          {currentView === "archived"
            ? <BulkActionButton label="Restore" onClick={async () => { await asyncBulkRestore(selArr); clearSelect(); void asyncLoadList(); }} />
            : <BulkActionButton label="Archive" onClick={async () => { await asyncBulkArchive(selArr); clearSelect(); void asyncLoadList(); }} />
          }
          <BulkActionButton label="Add to Group" onClick={async () => {
            // Use first group as demo
            await asyncBulkAddToGroup(selArr, "grp-clients" as ContactGroupId);
            clearSelect();
            void asyncLoadList();
          }} />
          <button onClick={clearSelect} style={{ ...GF, fontSize: 12, color: "#94A3B8", background: "none", border: "none", cursor: "pointer" }}>
            Clear selection
          </button>
        </div>
      )}

      {/* Main content */}
      <main id="contacts-main" style={{ padding: "16px 24px" }}>
        {state.listLoading && <Skeleton />}

        {!state.listLoading && state.listError && (
          <div role="alert" style={{ background: "#FEF2F2", borderRadius: 10, padding: "20px 24px", ...GF, color: "#991B1B", fontSize: 14 }}>
            <p style={{ fontWeight: 700, margin: "0 0 8px" }}>Could not load contacts</p>
            <p style={{ margin: "0 0 12px" }}>{state.listError}</p>
            <button onClick={() => void asyncLoadList()} style={{ ...GF, fontSize: 13, color: AZURE, background: "none", border: `1.5px solid ${AZURE}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer" }}>
              Try again
            </button>
          </div>
        )}

        {!state.listLoading && !state.listError && items.length === 0 && (
          <EmptyState view={currentView} hasSearch={!!searchInput.trim()} hasFilters={state.query.tagFilter.length > 0} onClear={() => { setSearchInput(""); setQuery({ tagFilter: [], scopeFilter: "all", statusFilter: "all" }); }} />
        )}

        {!state.listLoading && !state.listError && items.length > 0 && (
          <>
            {/* Select all */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", ...GF, fontSize: 12, color: SLATE }}>
                <input type="checkbox" checked={selectedIds.size === items.length && items.length > 0}
                  onChange={e => e.target.checked ? selectAll() : clearSelect()}
                  aria-label="Select all visible contacts" style={{ accentColor: AZURE }} />
                Select all
              </label>
              <span style={{ ...GF, fontSize: 12, color: SILVER }}>{total} contact{total !== 1 ? "s" : ""}</span>
            </div>

            <div className="contact-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(268px, 1fr))", gap: 12 }}>
              {items.map(c => <ContactCard key={c.id} contact={c} selected={selectedIds.has(c.id)} onToggle={toggleSelect} />)}
            </div>

            {/* Pagination */}
            {(hasNext || hasPrev) && (
              <div role="navigation" aria-label="Pagination" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20 }}>
                <button onClick={() => setPage(state.query.page - 1)} disabled={!hasPrev}
                  style={pageBtnStyle(!hasPrev)}>← Previous</button>
                <span style={{ ...GF, fontSize: 13, color: SLATE }}>Page {state.query.page}</span>
                <button onClick={() => setPage(state.query.page + 1)} disabled={!hasNext}
                  style={pageBtnStyle(!hasNext)}>Next →</button>
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        @media (max-width: 480px) { .contact-card-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

// ── Contact card ──────────────────────────────────────────────────────────────

function ContactCard({ contact: c, selected, onToggle }: { contact: ContactListItem; selected: boolean; onToggle: (id: string) => void }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [menuOpen]);

  return (
    <div
      style={{
        background: "#FFFFFF", border: selected ? `2px solid ${AZURE}` : "1.5px solid #E3E8EF",
        borderRadius: 14, padding: "16px", position: "relative",
        boxShadow: selected ? "0 4px 14px rgba(0,120,212,0.12)" : "0 1px 2px rgba(7,17,31,0.04)",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
    >
      {/* Select + 3-dot actions share the top-right corner with the avatar/name */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <input type="checkbox" checked={selected} onChange={() => onToggle(c.id)} aria-label={`Select ${c.name}`}
          style={{ accentColor: AZURE, marginTop: 12 }} />
        <ContactAvatar name={c.name} avatarUrl={c.avatarUrl} size={44} />
        <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
          <Link to={`/app/contacts/${c.id}`} style={{ ...GF, color: NAVY, fontWeight: 700, fontSize: 14, textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {c.name}
          </Link>
          <p style={{ ...GM, color: SLATE, fontSize: 11, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</p>
          {c.organization && <p style={{ ...GF, color: SILVER, fontSize: 11, margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.organization}</p>}
        </div>

        {/* The one visible control: everything else (View/Edit/Archive) hides
            behind it, so a card full of data doesn't also read as a toolbar. */}
        <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-label={`Actions for ${c.name}`} aria-expanded={menuOpen} aria-haspopup="menu"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, color: menuOpen ? AZURE : SLATE,
              background: menuOpen ? LIGHT : "transparent", border: "none", borderRadius: 7, cursor: "pointer",
            }}
          >
            <MoreVertical size={16} aria-hidden />
          </button>
          {menuOpen && (
            <div role="menu" style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: Z.dropdown, background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 160, overflow: "hidden" }}>
              <MenuItem label="View Contact"     onClick={() => { void navigate(`/app/contacts/${c.id}`); setMenuOpen(false); }} />
              {c.status === "active"    && <MenuItem label="Edit"    onClick={() => { void navigate(`/app/contacts/${c.id}/edit`); setMenuOpen(false); }} />}
              {c.status !== "archived"  && <MenuItem label="Archive" onClick={() => { setMenuOpen(false); }} />}
              {c.status === "archived"  && <MenuItem label="Restore" onClick={() => { setMenuOpen(false); }} />}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", margin: "12px 0 0" }}>
        <ScopeBadge scope={c.scope} />
        <StatusBadge status={c.status} />
      </div>

      {c.tagIds.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 10 }}>
          {c.tagIds.slice(0, 3).map(t => <TagChip key={t} tagId={t} />)}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTop: "1px solid #F0F2F5" }}>
        <span style={{ ...GF, fontSize: 11, color: SILVER }}>Last used</span>
        <RelativeDate iso={c.lastUsedAt} />
      </div>
    </div>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button role="menuitem" onClick={onClick}
      style={{ ...GF, display: "block", width: "100%", padding: "10px 14px", border: "none", borderBottom: "1px solid #F8FAFC", background: "#FFFFFF", textAlign: "left", cursor: "pointer", fontSize: 13, color: NAVY }}
      onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
      onMouseLeave={e => (e.currentTarget.style.background = "#FFFFFF")}>
      {label}
    </button>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ ...GF, fontSize: 11, fontWeight: 700, color: SLATE, display: "block", marginBottom: 4 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...GF, fontSize: 12, border: "1.5px solid #D1D9E0", borderRadius: 8, padding: "5px 10px", color: NAVY }}>
        {children}
      </select>
    </div>
  );
}

function BulkActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ ...GF, fontSize: 12, fontWeight: 600, color: "#FFFFFF", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
      {label}
    </button>
  );
}

function pageBtnStyle(disabled: boolean): React.CSSProperties {
  return { ...GF, fontSize: 13, padding: "7px 14px", borderRadius: 8, border: "1.5px solid #D1D9E0", background: disabled ? "#F8FAFC" : "#FFFFFF", color: disabled ? SILVER : NAVY, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1 };
}

// ── Empty states ──────────────────────────────────────────────────────────────

function EmptyState({ view, hasSearch, hasFilters, onClear }: { view: ContactView; hasSearch: boolean; hasFilters: boolean; onClear: () => void }) {
  const navigate = useNavigate();
  const { run } = useProcessing();
  const launchPrepare = async () => {
    await run(
      {
        message: "Opening document preparation",
        detail: "Getting your workspace ready.",
        minDuration: 1000,
      },
      async () => undefined,
    );
    void navigate("/app/prepare");
  };
  if (hasSearch || hasFilters) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px", ...GF }}>
        <p style={{ fontSize: 32, marginBottom: 12 }}>🔍</p>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 6 }}>No contacts match your search</h2>
        <p style={{ fontSize: 13, color: SLATE, marginBottom: 16 }}>Try adjusting your search terms or filters.</p>
        <button onClick={onClear} style={{ ...GF, fontSize: 13, color: AZURE, background: LIGHT, border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600 }}>
          Clear search and filters
        </button>
      </div>
    );
  }
  const configs: Record<ContactView, { icon: string; title: string; desc: string; action?: () => void; actionLabel?: string }> = {
    all:        { icon: "👥", title: "No contacts yet", desc: "Add contacts to quickly add participants to future document workflows.", action: () => { void navigate("/app/contacts/new"); }, actionLabel: "Add First Contact" },
    workspace:  { icon: "🏢", title: "No workspace contacts", desc: "Workspace contacts are visible to permitted team members.", action: () => { void navigate("/app/contacts/new"); }, actionLabel: "Add Workspace Contact" },
    personal:   { icon: "👤", title: "No personal contacts", desc: "Personal contacts are visible only to you.", action: () => { void navigate("/app/contacts/new"); }, actionLabel: "Add Personal Contact" },
    recent:     { icon: "🕐", title: "No recently used contacts", desc: "Contacts used in document workflows appear here.", action: () => { void launchPrepare(); }, actionLabel: "Prepare a Document" },
    frequent:   { icon: "⭐", title: "No frequently used contacts", desc: "Frequently used contacts are based on demonstration activity data.", },
    duplicates: { icon: "✓",  title: "No potential duplicates", desc: "No contacts share the same email or appear similar." },
    archived:   { icon: "📁", title: "No archived contacts", desc: "Archived contacts are removed from normal pickers but retained here." },
  };
  const cfg = configs[view] ?? configs.all;
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", ...GF }}>
      <p style={{ fontSize: 40, marginBottom: 12 }}>{cfg.icon}</p>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 6 }}>{cfg.title}</h2>
      <p style={{ fontSize: 13, color: SLATE, marginBottom: cfg.action ? 16 : 0, maxWidth: 360, margin: "0 auto 16px" }}>{cfg.desc}</p>
      {cfg.action && cfg.actionLabel && (
        <button onClick={cfg.action} style={{ ...GF, fontSize: 13, color: "#FFFFFF", background: AZURE, border: "none", borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontWeight: 700 }}>
          {cfg.actionLabel}
        </button>
      )}
    </div>
  );
}

// ── Exported page ─────────────────────────────────────────────────────────────

export function ContactsPage() {
  return (
    <ContactProvider>
      <ContactsLibrary />
    </ContactProvider>
  );
}

// Re-export types used in this file
type ContactId = import("../../../models/contacts").ContactId;

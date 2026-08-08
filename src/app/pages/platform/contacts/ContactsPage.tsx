// /app/contacts — Contacts library page.
// Views, search, filters, sort, desktop table, mobile cards, multi-select, bulk actions.
// Frontend-only demonstration. No real persistence, sync, or identity verification.
// Burgundy (#67023B) never used. eNotary never referenced.

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { ContactProvider, useContacts } from "../../../context/ContactContext";
import type { ContactListItem, ContactView, ContactSortField, ContactScope, ContactStatus, ContactTagId, ContactGroupId } from "../../../models/contacts";
import {
  CONTACT_VIEW_LABELS, CONTACT_VIEWS, CONTACT_STATUS_LABELS, CONTACT_SCOPE_LABELS,
  SYSTEM_CONTACT_TAGS, getContactTagById,
} from "../../../models/contacts";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const GOLD  = "#C9960C";
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

function InitialsAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      background: "#EBF4FC", display: "flex", alignItems: "center", justifyContent: "center",
      ...GM, fontSize: 11, fontWeight: 700, color: AZURE, flexShrink: 0, userSelect: "none",
    }}>
      {initials}
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, setQuery, asyncLoadList, asyncLoadGroups, asyncBulkArchive, asyncBulkRestore, asyncBulkAddTag, asyncBulkAddToGroup, clearPending } = useContacts();

  const [searchInput,   setSearchInput]   = useState(searchParams.get("q") ?? "");
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [showFilters,   setShowFilters]   = useState(false);
  const [showBulkMenu,  setShowBulkMenu]  = useState(false);
  const [gridView,      setGridView]      = useState(false);
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

  const toggleSelect = (id: string) => setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
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
      <a href="#contacts-main" style={{ position: "absolute", left: -9999, top: 0, zIndex: 9999, ...GF, background: AZURE, color: "#fff", padding: "6px 12px" }}
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
        <nav aria-label="Contact views" style={{ display: "flex", gap: 4, marginTop: 16, overflowX: "auto" }}>
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
        </nav>
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

        {/* Grid/list toggle */}
        <button
          onClick={() => setGridView(v => !v)}
          aria-label={gridView ? "Switch to list view" : "Switch to grid view"}
          style={{ ...GF, fontSize: 13, color: SLATE, background: "none", border: "1.5px solid #D1D9E0", borderRadius: 8, padding: "7px 10px", cursor: "pointer" }}
        >
          {gridView ? "☰" : "⊞"}
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

            {gridView
              ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                  {items.map(c => <ContactCard key={c.id} contact={c} selected={selectedIds.has(c.id)} onToggle={toggleSelect} />)}
                </div>
              )
              : (
                /* Desktop table — accessible */
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table role="table" aria-label="Contacts" style={{ width: "100%", borderCollapse: "collapse", ...GF, fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #E3E8EF" }}>
                          <Th style={{ width: 40 }}><span style={{ position: "absolute", left: -9999 }}>Select</span></Th>
                          <Th>Contact</Th>
                          <Th hideSmall>Organization</Th>
                          <Th hideSmall>Scope</Th>
                          <Th hideSmall>Tags</Th>
                          <Th>Status</Th>
                          <Th hideSmall>Last Used</Th>
                          <Th style={{ width: 80 }}>Actions</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(c => <ContactRow key={c.id} contact={c} selected={selectedIds.has(c.id)} onToggle={toggleSelect} />)}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile cards */}
                  <div className="contacts-mobile-cards">
                    {items.map(c => <ContactCard key={c.id} contact={c} selected={selectedIds.has(c.id)} onToggle={toggleSelect} />)}
                  </div>
                </>
              )
            }

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
        @media (min-width: 640px) { .contacts-mobile-cards { display: none !important; } }
        @media (max-width: 639px)  { .contacts-mobile-cards { display: grid !important; gap: 10px; } table[role="table"] { display: none; } }
      `}</style>
    </div>
  );
}

// ── Table components ──────────────────────────────────────────────────────────

function Th({ children, style, hideSmall }: { children?: React.ReactNode; style?: React.CSSProperties; hideSmall?: boolean }) {
  return (
    <th scope="col" style={{ ...GF, fontSize: 11, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em", padding: "8px 10px", textAlign: "left", whiteSpace: "nowrap", ...(hideSmall ? {} : {}), ...style }}>
      {children}
    </th>
  );
}

function ContactRow({ contact: c, selected, onToggle }: { contact: ContactListItem; selected: boolean; onToggle: (id: string) => void }) {
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
    <tr style={{ borderBottom: "1px solid #F0F2F5", background: selected ? LIGHT : "transparent" }}>
      <td style={{ padding: "10px 10px", width: 40 }}>
        <input type="checkbox" checked={selected} onChange={() => onToggle(c.id)} aria-label={`Select ${c.name}`} style={{ accentColor: AZURE }} />
      </td>
      <td style={{ padding: "10px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <InitialsAvatar name={c.name} />
          <div style={{ minWidth: 0 }}>
            <Link to={`/app/contacts/${c.id}`} style={{ ...GF, color: NAVY, fontWeight: 600, textDecoration: "none", fontSize: 13, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.name}
            </Link>
            <span style={{ ...GM, fontSize: 11, color: SLATE, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</span>
          </div>
        </div>
      </td>
      <td style={{ padding: "10px 10px", color: SLATE, fontSize: 12, whiteSpace: "nowrap" }}>{c.organization ?? "—"}</td>
      <td style={{ padding: "10px 10px" }}><ScopeBadge scope={c.scope} /></td>
      <td style={{ padding: "10px 10px" }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "nowrap" }}>{c.tagIds.slice(0, 2).map(t => <TagChip key={t} tagId={t} />)}</div>
      </td>
      <td style={{ padding: "10px 10px" }}><StatusBadge status={c.status} /></td>
      <td style={{ padding: "10px 10px" }}><RelativeDate iso={c.lastUsedAt} /></td>
      <td style={{ padding: "10px 10px", position: "relative" }}>
        <div ref={menuRef} style={{ display: "inline-block" }}>
          <button onClick={() => setMenuOpen(v => !v)} aria-label={`Actions for ${c.name}`} aria-expanded={menuOpen} aria-haspopup="menu"
            style={{ ...GF, fontSize: 18, color: SLATE, background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 6 }}>
            ⋮
          </button>
          {menuOpen && (
            <div role="menu" style={{ position: "absolute", right: 0, top: "100%", zIndex: 100, background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 160, overflow: "hidden" }}>
              <MenuItem label="View Contact"        onClick={() => { navigate(`/app/contacts/${c.id}`); setMenuOpen(false); }} />
              {c.status === "active" && <MenuItem label="Edit"          onClick={() => { navigate(`/app/contacts/${c.id}/edit`); setMenuOpen(false); }} />}
              {c.status !== "archived" && <MenuItem label="Archive"    onClick={() => { setMenuOpen(false); }} />}
              {c.status === "archived" && <MenuItem label="Restore"    onClick={() => { setMenuOpen(false); }} />}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function ContactCard({ contact: c, selected, onToggle }: { contact: ContactListItem; selected: boolean; onToggle: (id: string) => void }) {
  const navigate = useNavigate();
  return (
    <div style={{ background: "#FFFFFF", border: selected ? `2px solid ${AZURE}` : "1.5px solid #E3E8EF", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <input type="checkbox" checked={selected} onChange={() => onToggle(c.id)} aria-label={`Select ${c.name}`} style={{ accentColor: AZURE, marginTop: 8 }} />
        <InitialsAvatar name={c.name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ ...GF, color: NAVY, fontWeight: 700, fontSize: 14, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
          <p style={{ ...GM, color: SLATE, fontSize: 11, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</p>
          {c.organization && <p style={{ ...GF, color: SILVER, fontSize: 11, margin: "1px 0 0" }}>{c.organization}</p>}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <ScopeBadge scope={c.scope} />
          <StatusBadge status={c.status} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
        {c.tagIds.slice(0, 3).map(t => <TagChip key={t} tagId={t} />)}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => navigate(`/app/contacts/${c.id}`)}
          style={{ ...GF, flex: 1, fontSize: 12, color: AZURE, background: LIGHT, border: "none", borderRadius: 8, padding: "7px 0", cursor: "pointer", fontWeight: 600 }}>
          View
        </button>
        {c.status === "active" && (
          <button onClick={() => navigate(`/app/contacts/${c.id}/edit`)}
            style={{ ...GF, flex: 1, fontSize: 12, color: SLATE, background: "#F8FAFC", border: "1.5px solid #E3E8EF", borderRadius: 8, padding: "7px 0", cursor: "pointer", fontWeight: 600 }}>
            Edit
          </button>
        )}
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
    all:        { icon: "👥", title: "No contacts yet", desc: "Add contacts to quickly add participants to future document workflows.", action: () => navigate("/app/contacts/new"), actionLabel: "Add First Contact" },
    workspace:  { icon: "🏢", title: "No workspace contacts", desc: "Workspace contacts are visible to permitted team members.", action: () => navigate("/app/contacts/new"), actionLabel: "Add Workspace Contact" },
    personal:   { icon: "👤", title: "No personal contacts", desc: "Personal contacts are visible only to you.", action: () => navigate("/app/contacts/new"), actionLabel: "Add Personal Contact" },
    recent:     { icon: "🕐", title: "No recently used contacts", desc: "Contacts used in document workflows appear here.", action: () => navigate("/app/prepare"), actionLabel: "Prepare a Document" },
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

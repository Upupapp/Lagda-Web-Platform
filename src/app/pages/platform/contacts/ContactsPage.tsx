// /app/contacts — Contacts library page ("All Contacts").
// One view — every ACTIVE contact — with search, tag filter, sort, cards,
// multi-select and bulk actions. The other places in Contacts are
// Requests From Contacts (/app/contacts/requests) and Archived
// (/app/contacts/archived), both linked from the section nav here.
//
// /app/contacts/archived is this same library in its archived section: the
// backend's `state=archived` listing (contacts-source maps view "archived"
// onto it), the same cards, and a menu of View Contact and Restore. No
// selection or bulk actions there — restoring is one contact at a time.
// Frontend-only demonstration. No real persistence, sync, or identity verification.
// Burgundy (#67023B) never used. eNotary never referenced.

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import {
  MoreVertical, Mail, Phone, Building2, Share2, Clock3, ChevronRight, LayoutGrid, List as ListIcon,
  Users, Inbox, Send,
} from "lucide-react";
import { ContactProvider, useContacts } from "../../../context/ContactContext";
import type { ContactListItem, ContactView, ContactSortField, ContactTagId, ContactGroupId } from "../../../models/contacts";
import { SYSTEM_CONTACT_TAGS, getContactTagById } from "../../../models/contacts";
import { Z } from "../../../utils/z-index";
import { FilterChips } from "../../../components/platform/FilterChips";
import { useProcessing } from "../../../services/processing.service";
import {
  ContactsHeader, PersonAvatar, AccountBadges, DetailLine, useConnectionLists, useLiveRefresh, type HeaderStat,
} from "./contacts-ui";

const LAYOUT_KEY = "lagda.contacts.layout";

function readLayout(): "grid" | "list" {
  try { return window.localStorage.getItem(LAYOUT_KEY) === "list" ? "list" : "grid"; } catch { return "grid"; }
}

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

function TagChip({ tagId }: { tagId: ContactTagId }) {
  const tag = getContactTagById(tagId);
  if (!tag) return null;
  return (
    <span style={{ ...GM, fontSize: 9, padding: "2px 6px", borderRadius: 999, background: `${tag.color}18`, color: tag.color }}>
      {tag.label}
    </span>
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

type LibrarySection = "all" | "archived";

function ContactsLibrary({ section }: { section: LibrarySection }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, setQuery, asyncLoadList, asyncLoadGroups, asyncBulkArchive, asyncBulkAddToGroup, asyncRestore, clearPending } = useContacts();
  const archived = section === "archived";
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [layout, setLayout] = useState<"grid" | "list">(readLayout);
  const chooseLayout = (next: "grid" | "list") => {
    setLayout(next);
    try { window.localStorage.setItem(LAYOUT_KEY, next); } catch { /* a per-visit choice then */ }
  };
  const connections = useConnectionLists();

  const [searchInput,   setSearchInput]   = useState(searchParams.get("q") ?? "");
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [showFilters,   setShowFilters]   = useState(false);
  const [, setShowBulkMenu] = useState(false);
  const debouncedSearch = useDebounce(searchInput, 280);

  // Two views, one per route: All Contacts (active only) and Archived. The
  // scope / status filters (personal, shared…) are no longer offered, so the
  // query is pinned to the route's view whatever an old link says.
  const currentView: ContactView = archived ? "archived" : "all";

  // Sync URL params → context query
  useEffect(() => {
    const sort   = (searchParams.get("sort")  as ContactSortField) ?? "updatedAt";
    const dir    = (searchParams.get("dir")   as "asc" | "desc") ?? "desc";
    const page   = parseInt(searchParams.get("page") ?? "1", 10);
    setQuery({ view: currentView, sort, direction: dir, page, scopeFilter: "all", statusFilter: "all", search: debouncedSearch });
  }, [searchParams, debouncedSearch, setQuery, currentView]);

  // Reload list when query changes — but only once the query is this
  // section's. The provider starts on the default ("all") query, so without
  // this the Archived section's first render would also fetch active contacts.
  useEffect(() => {
    if (state.query.view !== currentView) return;
    void asyncLoadList();
  }, [state.query]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load groups once
  useEffect(() => { void asyncLoadGroups(); }, [asyncLoadGroups]);

  // An old link to a view or scope / status filter that is no longer offered
  // lands on All Contacts with those parameters dropped, so the URL never
  // claims a narrowing the list does not apply.
  useEffect(() => {
    if (!searchParams.has("view") && !searchParams.has("scope") && !searchParams.has("status")) return;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete("view");
      next.delete("scope");
      next.delete("status");
      next.delete("page");
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  // Clear pending feedback after delay
  useEffect(() => {
    if (!state.pendingMessage) return;
    const t = setTimeout(clearPending, 3500);
    return () => clearTimeout(t);
  }, [state.pendingMessage, clearPending]);

  const setSort    = (s: ContactSortField)  => { const p = new URLSearchParams(searchParams); p.set("sort", s); setSearchParams(p); };
  const toggleDir  = ()                     => { const p = new URLSearchParams(searchParams); p.set("dir", state.query.direction === "asc" ? "desc" : "asc"); setSearchParams(p); };
  const setPage    = (pg: number)           => { const p = new URLSearchParams(searchParams); p.set("page", String(pg)); setSearchParams(p); };

  // Only genuine narrowing appears as a chip. `view` is a tab and `sort`/`dir`
  // reorder rather than hide, so neither is a filter the user needs warning about.
  const activeFilterChips = [
    ...(searchInput.trim() ? [{ key: "q", label: `Search: "${searchInput.trim()}"` }] : []),
    ...state.query.tagFilter.map(tagId => ({
      key: `tag:${tagId}`,
      label: `Tag: ${getContactTagById(tagId)?.label ?? tagId}`,
    })),
  ];

  const removeFilter = (key: string) => {
    if (key === "q")      { setSearchInput(""); return; }
    if (key.startsWith("tag:")) {
      const tagId = key.slice(4) as ContactTagId;
      setQuery({ tagFilter: state.query.tagFilter.filter(t => t !== tagId), page: 1 });
    }
  };

  const clearAllFilters = () => {
    setSearchInput("");
    setQuery({ tagFilter: [], page: 1 });
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => { const s = new Set(prev); if (s.has(id)) { s.delete(id); } else { s.add(id); } return s; });
  const selectAll    = () => { if (!state.listResult) return; setSelectedIds(new Set(state.listResult.items.map(c => c.id))); };
  const clearSelect  = () => setSelectedIds(new Set());

  const items   = state.listResult?.items ?? [];
  const total   = state.listResult?.total  ?? 0;
  const hasNext = state.listResult?.hasNextPage ?? false;
  const hasPrev = state.listResult?.hasPrevPage ?? false;

  const selArr = Array.from(selectedIds) as ContactId[];

  // Someone accepting a request, or changing their name or photo, shows up
  // here without a reload.
  useLiveRefresh(() => { if (!state.listLoading) void asyncLoadList(); });

  const stats: HeaderStat[] = archived ? [] : [
    { label: "Contacts", value: state.listResult ? total : "—", icon: Users },
    ...(connections.available ? [
      { label: "Waiting for you", value: connections.lists?.received.length ?? "—", icon: Inbox,
        ...((connections.lists?.received.length ?? 0) > 0 ? { tone: "attention" as const } : {}) },
      { label: "Requests sent", value: connections.lists?.sent.length ?? "—", icon: Send },
    ] : []),
  ];

  const restore = async (id: string) => {
    setRestoringId(id);
    await asyncRestore(id as ContactId);
    setRestoringId(null);
    await asyncLoadList();
  };

  return (
    <div style={{ minHeight: "100vh", background: PAGE_BG }}>
      {/* Skip link */}
      <a href="#contacts-main" style={{ position: "absolute", left: -9999, top: 0, zIndex: Z.skipLink, ...GF, background: AZURE, color: "#fff", padding: "6px 12px" }}
         onFocus={e => (e.currentTarget.style.left = "16px")}
         onBlur={e  => (e.currentTarget.style.left = "-9999px")}>
        Skip to contacts
      </a>

      <ContactsHeader
        section={archived ? "archived" : "all"}
        pendingCount={connections.lists?.received.length}
        subtitle={archived
          ? "Archived contacts are kept for your records and left out of participant pickers. Restore one to use it again."
          : "The people you send documents to. Find anyone on LAGDA by their email, or add someone who isn't on LAGDA yet."}
        stats={stats}
      />

      {/* Toolbar */}
      <div className="ct-toolbar">
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

        <div className="ct-layout" role="group" aria-label="Layout">
          <button type="button" aria-pressed={layout === "grid"} aria-label="Cards" title="Cards" onClick={() => chooseLayout("grid")}>
            <LayoutGrid size={15} aria-hidden />
          </button>
          <button type="button" aria-pressed={layout === "list"} aria-label="List" title="List" onClick={() => chooseLayout("list")}>
            <ListIcon size={15} aria-hidden />
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div id="filter-panel" role="region" aria-label="Filters" style={{ background: "#FFFFFF", borderBottom: "1px solid #F0F2F5", padding: "12px 24px", display: "flex", gap: 16, flexWrap: "wrap" }}>
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
          {state.query.tagFilter.length > 0 && (
            <button onClick={() => setQuery({ tagFilter: [], page: 1 })}
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
      {!archived && selectedIds.size > 0 && (
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
          <BulkActionButton label="Archive" onClick={async () => { await asyncBulkArchive(selArr); clearSelect(); void asyncLoadList(); }} />
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
      <main id="contacts-main" className="ct-main" style={{ padding: "16px 24px" }}>
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
          <EmptyState view={currentView} hasSearch={!!searchInput.trim()} hasFilters={state.query.tagFilter.length > 0} onClear={() => { setSearchInput(""); setQuery({ tagFilter: [] }); }} />
        )}

        {!state.listLoading && !state.listError && items.length > 0 && (
          <>
            {/* Select all (active contacts only — Archived has no bulk actions) */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              {!archived && (
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", ...GF, fontSize: 12, color: SLATE }}>
                  <input type="checkbox" checked={selectedIds.size === items.length && items.length > 0}
                    onChange={e => e.target.checked ? selectAll() : clearSelect()}
                    aria-label="Select all visible contacts" style={{ accentColor: AZURE }} />
                  Select all
                </label>
              )}
              {/* SLATE on the page background: SILVER is 2.6:1 there and fails AA. */}
              <span style={{ ...GF, fontSize: 12, color: SLATE }}>
                {total} {archived ? "archived " : ""}contact{total !== 1 ? "s" : ""}
              </span>
            </div>

            <ul className={layout === "grid" ? "ct-grid" : "ct-list"} aria-label={archived ? "Archived contacts" : "Contacts"}>
              {items.map(c => archived
                ? <ContactCard key={c.id} layout={layout} contact={c} archived restoring={restoringId === c.id} onRestore={id => { void restore(id); }} />
                : <ContactCard key={c.id} layout={layout} contact={c} selected={selectedIds.has(c.id)} onToggle={toggleSelect} />)}
            </ul>

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

      <style>{CARD_CSS}</style>
    </div>
  );
}

// ── Contact card ──────────────────────────────────────────────────────────────

function ContactCard({ contact: c, selected = false, onToggle, archived = false, restoring = false, onRestore, layout }: {
  contact: ContactListItem;
  selected?: boolean;
  onToggle?: (id: string) => void;
  /** The Archived section's card: no selection, and a Restore action. */
  archived?: boolean;
  restoring?: boolean;
  onRestore?: (id: string) => void;
  layout: "grid" | "list";
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [menuOpen]);

  const menu = (
    <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setMenuOpen(v => !v)}
        aria-label={`Actions for ${c.name}`} aria-expanded={menuOpen} aria-haspopup="menu"
        className="ct-icon-btn" data-open={menuOpen ? "true" : undefined}
      >
        <MoreVertical size={16} aria-hidden />
      </button>
      {menuOpen && (
        <div role="menu" aria-label={`Actions for ${c.name}`} style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: Z.dropdown, background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 160, width: "max-content", maxWidth: "min(280px, calc(100vw - 48px))", overflow: "hidden" }}>
          <MenuItem label="View contact" onClick={() => { void navigate(`/app/contacts/${c.id}`); setMenuOpen(false); }} />
          {archived
            ? <MenuItem label={restoring ? "Restoring…" : "Restore"} disabled={restoring} onClick={() => { onRestore?.(c.id); setMenuOpen(false); }} />
            : <MenuItem label="Edit" onClick={() => { void navigate(`/app/contacts/${c.id}/edit`); setMenuOpen(false); }} />}
        </div>
      )}
    </div>
  );

  const checkbox = !archived && (
    <input type="checkbox" checked={selected} onChange={() => onToggle?.(c.id)} aria-label={`Select ${c.name}`}
      className="ct-check" />
  );

  if (layout === "list") {
    return (
      <li className="ct-row" data-selected={selected ? "true" : undefined}>
        {checkbox}
        <PersonAvatar name={c.name} avatarUrl={c.avatarUrl} size={36} />
        <div className="ct-row-main">
          <Link to={`/app/contacts/${c.id}`} className="ct-name">{c.name}</Link>
          <span className="ct-row-sub">{[c.title, c.organization].filter(Boolean).join(" · ") || c.email}</span>
        </div>
        <span className="ct-row-email">{c.email}</span>
        <span className="ct-row-badges">
          <AccountBadges account={c.account} workspaceMember={c.workspaceMember} />
        </span>
        <a href={`mailto:${c.email}`} className="ct-icon-btn ct-row-mail" aria-label={`Email ${c.name}`}><Mail size={15} aria-hidden /></a>
        {menu}
      </li>
    );
  }

  return (
    <li className="ct-card" data-selected={selected ? "true" : undefined}>
      <div className="ct-card-top">
        {checkbox}
        <PersonAvatar name={c.name} avatarUrl={c.avatarUrl} size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link to={`/app/contacts/${c.id}`} className="ct-name">{c.name}</Link>
          {c.title && <span className="ct-card-title">{c.title}</span>}
          <span className="ct-card-badges">
            <AccountBadges account={c.account} workspaceMember={c.workspaceMember} />
            {c.scope === "workspace" && (
              <span className="ct-soft-pill" title="Everyone in the workspace can use this contact"><Share2 size={11} aria-hidden /> Shared</span>
            )}
          </span>
        </div>
        {menu}
      </div>

      <div className="ct-card-details">
        <DetailLine icon={Mail} mono href={`mailto:${c.email}`}>{c.email}</DetailLine>
        <DetailLine icon={Phone} href={c.phone ? `tel:${c.phone}` : undefined}>{c.phone}</DetailLine>
        <DetailLine icon={Building2}>{c.organization}</DetailLine>
      </div>

      {c.tagIds.length > 0 && (
        <div className="ct-card-tags">
          {c.tagIds.slice(0, 3).map(t => <TagChip key={t} tagId={t} />)}
          {c.tagIds.length > 3 && <span className="ct-soft-pill">+{c.tagIds.length - 3}</span>}
        </div>
      )}

      <div className="ct-card-foot">
        <span className="ct-card-when">
          <Clock3 size={12} aria-hidden /> {archived ? "Updated" : "Used"} <RelativeDate iso={archived ? c.updatedAt : c.lastUsedAt} />
        </span>
        <Link to={`/app/contacts/${c.id}`} className="ct-card-open">View profile <ChevronRight size={14} aria-hidden /></Link>
      </div>
    </li>
  );
}

const CARD_CSS = `
.ct-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(290px, 100%), 1fr)); gap: 14px; }
.ct-card { background: #FFFFFF; border: 1.5px solid #E3E8EF; border-radius: 16px; padding: 16px 16px 12px; min-width: 0; display: flex; flex-direction: column; gap: 12px;
  box-shadow: 0 1px 2px rgba(7,17,31,0.04); transition: box-shadow 160ms ease, border-color 160ms ease, transform 160ms ease; position: relative; }
.ct-card:hover { border-color: #C9D5E3; box-shadow: 0 10px 24px -16px rgba(7,17,31,0.35); transform: translateY(-1px); }
.ct-card[data-selected="true"] { border-color: ${AZURE}; box-shadow: 0 0 0 3px rgba(0,120,212,0.14); }
.ct-card-top { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
.ct-check { accent-color: ${AZURE}; width: 16px; height: 16px; margin: 18px 0 0; flex-shrink: 0; cursor: pointer; }
.ct-name { font-family: 'Geist', sans-serif; color: ${NAVY}; font-weight: 700; font-size: 15px; text-decoration: none; display: block;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ct-name:hover { color: ${AZURE}; }
.ct-card-title { display: block; font-family: 'Geist', sans-serif; font-size: 12.5px; color: ${SLATE}; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ct-card-badges { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 7px; }
.ct-soft-pill { display: inline-flex; align-items: center; gap: 4px; font-family: 'Geist', sans-serif; font-size: 11px; font-weight: 600; color: ${SLATE};
  background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 999px; padding: 2px 8px; white-space: nowrap; }
.ct-card-details { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; background: #F8FAFC; border-radius: 10px; min-width: 0; }
.ct-card-tags { display: flex; gap: 5px; flex-wrap: wrap; }
.ct-card-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 10px; border-top: 1px solid #F0F2F5; margin-top: auto; }
.ct-card-when { display: inline-flex; align-items: center; gap: 5px; font-family: 'Geist', sans-serif; font-size: 11.5px; color: ${SLATE}; }
.ct-card-open { display: inline-flex; align-items: center; gap: 2px; font-family: 'Geist', sans-serif; font-size: 12.5px; font-weight: 700; color: #005A9E; text-decoration: none; min-height: 32px; }
.ct-card-open:hover { text-decoration: underline; text-underline-offset: 3px; }
.ct-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; color: ${SLATE}; background: transparent;
  border: none; border-radius: 8px; cursor: pointer; text-decoration: none; flex-shrink: 0; }
.ct-icon-btn:hover, .ct-icon-btn[data-open="true"] { background: ${LIGHT}; color: ${AZURE}; }
.ct-icon-btn:focus-visible { outline: 2px solid rgba(0,120,212,0.5); outline-offset: 1px; }

.ct-list { list-style: none; margin: 0; padding: 0; background: #FFFFFF; border: 1.5px solid #E3E8EF; border-radius: 14px; overflow: hidden; }
.ct-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid #F0F2F5; min-width: 0; }
.ct-row:last-child { border-bottom: none; }
.ct-row:hover { background: #FAFBFD; }
.ct-row[data-selected="true"] { background: ${LIGHT}; }
.ct-row .ct-check { margin: 0; }
.ct-row-main { flex: 1 1 200px; min-width: 0; display: flex; flex-direction: column; }
.ct-row-sub { font-family: 'Geist', sans-serif; font-size: 12px; color: ${SLATE}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ct-row-email { flex: 1 1 200px; min-width: 0; font-family: 'Geist Mono', monospace; font-size: 12px; color: ${SLATE}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ct-row-badges { display: flex; gap: 5px; flex-shrink: 0; }
@media (max-width: 900px) { .ct-row-email { display: none; } }
@media (max-width: 600px) { .ct-row-badges, .ct-row-mail { display: none; } }

.ct-toolbar { background: #FFFFFF; border-bottom: 1px solid #F0F2F5; padding: 10px 24px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ct-layout { display: inline-flex; padding: 3px; gap: 2px; border-radius: 9px; background: #F1F5F9; border: 1px solid #E2E8F0; }
.ct-layout button { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 30px; border: none; border-radius: 7px; background: transparent; color: ${SLATE}; cursor: pointer; }
.ct-layout button[aria-pressed="true"] { background: #FFFFFF; color: ${NAVY}; box-shadow: 0 1px 2px rgba(7,17,31,0.12); }
@media (max-width: 767px) {
  .ct-toolbar { padding: 10px 16px; }
  .ct-main { padding: 14px 16px !important; }
}
@media (hover: none) { .ct-card:hover { transform: none; } }
@media (prefers-reduced-motion: reduce) { .ct-card { transition: none; } .ct-card:hover { transform: none; } }
`;

function MenuItem({ label, onClick, disabled = false }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button role="menuitem" onClick={onClick} disabled={disabled}
      style={{ ...GF, display: "block", width: "100%", padding: "10px 14px", minHeight: 44, border: "none", borderBottom: "1px solid #F8FAFC", background: "#FFFFFF", textAlign: "left", cursor: disabled ? "not-allowed" : "pointer", fontSize: 13, color: NAVY }}
      onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
      onMouseLeave={e => (e.currentTarget.style.background = "#FFFFFF")}>
      {label}
    </button>
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
    archived:   { icon: "📁", title: "No archived contacts", desc: "Contacts you archive are kept here, out of participant pickers, until you restore them.", action: () => { void navigate("/app/contacts"); }, actionLabel: "View All Contacts" },
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
      <ContactsLibrary section="all" />
    </ContactProvider>
  );
}

/** /app/contacts/archived. A separate component (not a prop on
 *  ContactsPage) so moving between the two routes remounts the provider
 *  rather than carrying one section's list into the other. */
export function ArchivedContactsPage() {
  return (
    <ContactProvider>
      <ContactsLibrary section="archived" />
    </ContactProvider>
  );
}

// Re-export types used in this file
type ContactId = import("../../../models/contacts").ContactId;

// /app/contacts — Contacts library page ("All Contacts").
// One view — every ACTIVE contact — with search, tag filter, sort and cards.
// (Multi-select and its bulk bar — Add Tag, Archive, Add to Group — were
// removed: they only ever changed the demo data, never a real contact.
// Archiving is one contact at a time, from the contact's own page.)
// The other places in Contacts are
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
  BadgeCheck, UserRound, type LucideIcon,
  Users, Inbox, Send,
} from "lucide-react";
import { ContactProvider, useContacts } from "../../../context/ContactContext";
import type { ContactListItem, ContactView, ContactSortField, ContactTagId } from "../../../models/contacts";
import { SYSTEM_CONTACT_TAGS, getContactTagById } from "../../../models/contacts";
import { Z } from "../../../utils/z-index";
import { FilterChips } from "../../../components/platform/FilterChips";
import { useProcessing } from "../../../services/processing.service";
import {
  ContactsHeader, PersonAvatar, AccountBadges, useConnectionLists, useLiveRefresh, DeleteContactDialog,
  brandGradient, BrandWaves,
  type HeaderStat,
} from "./contacts-ui";
import { withProcess } from "../../../config/process-screens";

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
  const { state, setQuery, asyncLoadList, asyncLoadGroups, asyncRestore, clearPending } = useContacts();
  const archived = section === "archived";
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [layout, setLayout] = useState<"grid" | "list">(readLayout);
  const chooseLayout = (next: "grid" | "list") => {
    setLayout(next);
    try { window.localStorage.setItem(LAYOUT_KEY, next); } catch { /* a per-visit choice then */ }
  };
  const connections = useConnectionLists();
  const [deleting, setDeleting] = useState<ContactListItem | null>(null);

  const [searchInput,   setSearchInput]   = useState(searchParams.get("q") ?? "");
  const [showFilters,   setShowFilters]   = useState(false);
  const debouncedSearch = useDebounce(searchInput, 280);
  // A search is under way: the words are still settling, or the list is
  // being asked for them.
  const searching = searchInput.trim() !== "" && (searchInput !== debouncedSearch || state.listLoading);

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


  const items   = state.listResult?.items ?? [];
  const total   = state.listResult?.total  ?? 0;
  const hasNext = state.listResult?.hasNextPage ?? false;
  const hasPrev = state.listResult?.hasPrevPage ?? false;


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
    await withProcess("contact-restore", "", () => asyncRestore(id as ContactId));
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
          {/* Searching is as-you-type, so no full-screen loading screen: a
              small spinner in the box while the words settle and the list is
              asked, announced politely once. */}
          {searching && (
            <span data-testid="contact-search-spinner" style={{ position: "absolute", right: 30, top: "50%", transform: "translateY(-50%)", display: "inline-flex", alignItems: "center", gap: 6, ...GF, fontSize: 11.5, color: SLATE, pointerEvents: "none" }}>
              <span aria-hidden className="ct-search-spin" />
              Searching…
            </span>
          )}
          <span role="status" style={{ position: "absolute", left: -9999 }}>{searching ? "Searching contacts" : ""}</span>
          <style>{`.ct-search-spin { width: 12px; height: 12px; border-radius: 50%; border: 2px solid #CBD5E1; border-top-color: #0078D4; animation: ct-search-spin 700ms linear infinite; }
@keyframes ct-search-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .ct-search-spin { animation: none; } }`}</style>
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
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              {/* SLATE on the page background: SILVER is 2.6:1 there and fails AA. */}
              <span style={{ ...GF, fontSize: 12, color: SLATE }}>
                {total} {archived ? "archived " : ""}contact{total !== 1 ? "s" : ""}
              </span>
            </div>

            <ul className={layout === "grid" ? "ct-grid" : "ct-list"} aria-label={archived ? "Archived contacts" : "Contacts"}>
              {items.map(c => archived
                ? <ContactCard key={c.id} layout={layout} contact={c} archived restoring={restoringId === c.id} onRestore={id => { void restore(id); }} onDelete={setDeleting} />
                : <ContactCard key={c.id} layout={layout} contact={c} />)}
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
      {deleting && (
        <DeleteContactDialog contactId={deleting.id} name={deleting.name}
          onCancel={() => { setDeleting(null); }}
          onDeleted={() => { setDeleting(null); void asyncLoadList(); }} />
      )}
    </div>
  );
}

// ── Contact card ──────────────────────────────────────────────────────────────

function ContactCard({ contact: c, archived = false, restoring = false, onRestore, onDelete, layout }: {
  contact: ContactListItem;
  /** The Archived section's card: a Restore action. */
  archived?: boolean;
  restoring?: boolean;
  onRestore?: (id: string) => void;
  /** Archived only (092): opens the permanent-delete confirmation. */
  onDelete?: (contact: ContactListItem) => void;
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
            ? <>
                <MenuItem label={restoring ? "Restoring…" : "Restore"} disabled={restoring} onClick={() => { onRestore?.(c.id); setMenuOpen(false); }} />
                <MenuItem label="Delete permanently" danger onClick={() => { onDelete?.(c); setMenuOpen(false); }} />
              </>
            : <MenuItem label="Edit" onClick={() => { void navigate(`/app/contacts/${c.id}/edit`); setMenuOpen(false); }} />}
        </div>
      )}
    </div>
  );

  if (layout === "list") {
    return (
      <li className="ct-row">
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

  const connected = c.account?.connected === true;
  return (
    <li className="ct-card">
      {/* The banner is the brand colour of the workspace this person belongs to. */}
      <div className="ct-card-band" style={{ backgroundImage: brandGradient(c.account?.brandColor) }} data-testid="contact-card-band">
        <BrandWaves />
      </div>
      <div className="ct-card-controls">
        <span className="ct-card-menu">{menu}</span>
      </div>

      <div className="ct-card-avatar">
        <PersonAvatar name={c.name} avatarUrl={c.avatarUrl} size={96} ring />
        {connected && <span className="ct-card-dot" title="On LAGDA" aria-hidden />}
      </div>

      <div className="ct-card-id">
        <Link to={`/app/contacts/${c.id}`} className="ct-name">
          <span className="ct-name-text">{c.name}</span>
          {connected && <BadgeCheck size={20} strokeWidth={2.2} className="ct-verified" aria-label="Connected on LAGDA" />}
        </Link>
        {c.title && <span className="ct-card-title">{c.title}</span>}
        <span className="ct-card-badges">
          <AccountBadges account={c.account} workspaceMember={c.workspaceMember} />
          {c.scope === "workspace" && (
            <span className="ct-soft-pill" title="Everyone in the workspace can use this contact"><Share2 size={11} aria-hidden /> Shared</span>
          )}
        </span>
      </div>

      <div className="ct-card-details">
        <CardDetail icon={Mail} href={`mailto:${c.email}`}>{c.email}</CardDetail>
        <CardDetail icon={Phone} href={c.phone ? `tel:${c.phone}` : undefined}>{c.phone}</CardDetail>
        <CardDetail icon={Building2}>{c.organization}</CardDetail>
      </div>

      {c.tagIds.length > 0 && (
        <div className="ct-card-tags">
          {c.tagIds.slice(0, 3).map(t => <TagChip key={t} tagId={t} />)}
          {c.tagIds.length > 3 && <span className="ct-soft-pill">+{c.tagIds.length - 3}</span>}
        </div>
      )}

      <div className="ct-card-foot">
        <span className="ct-card-when">
          <Clock3 size={17} aria-hidden /> {archived ? "Updated" : "Used"} · <RelativeDate iso={archived ? c.updatedAt : c.lastUsedAt} />
        </span>
        <Link to={`/app/contacts/${c.id}`} className="ct-card-open"><UserRound size={16} aria-hidden /> View profile <ChevronRight size={15} aria-hidden /></Link>
      </div>
    </li>
  );
}

/** One line of the card's details: an icon in a soft circle, then the value. */
function CardDetail({ icon: Icon, href, children }: { icon: LucideIcon; href?: string | undefined; children: React.ReactNode }) {
  if (children === undefined || children === null || children === "") return null;
  const value = <span className="ct-detail-value">{children}</span>;
  return (
    <span className="ct-detail">
      <span aria-hidden className="ct-detail-icon"><Icon size={17} strokeWidth={1.9} /></span>
      {href ? <a href={href} className="ct-detail-link">{value}</a> : value}
    </span>
  );
}

const CARD_CSS = `
.ct-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr)); gap: 18px; }
.ct-card { background: #FFFFFF; border: 1px solid #E6EBF2; border-radius: 20px; padding: 0 16px 14px; min-width: 0; display: flex; flex-direction: column;
  gap: 12px; position: relative; overflow: hidden; box-shadow: 0 1px 2px rgba(7,17,31,0.04), 0 12px 28px -22px rgba(7,17,31,0.35);
  transition: box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease; }
.ct-card:hover { box-shadow: 0 18px 38px -24px rgba(7,17,31,0.45); transform: translateY(-2px); border-color: #D6DEE8; }
.ct-card-band { position: relative; height: 92px; margin: 0 -16px; overflow: hidden; }
.ct-card-controls { position: absolute; top: 10px; left: 12px; right: 10px; display: flex; justify-content: flex-end; align-items: flex-start; z-index: 1; }
.ct-card-menu .ct-icon-btn { background: rgba(255,255,255,0.88); color: ${NAVY}; box-shadow: 0 1px 3px rgba(7,17,31,0.18); }
.ct-card-menu .ct-icon-btn:hover, .ct-card-menu .ct-icon-btn[data-open="true"] { background: #FFFFFF; color: ${AZURE}; }
.ct-card-avatar { position: relative; align-self: center; margin-top: -62px; line-height: 0; }
.ct-card-dot { position: absolute; right: 6px; bottom: 6px; width: 20px; height: 20px; border-radius: 50%; background: #16A34A; border: 3px solid #FFFFFF;
  box-shadow: 0 1px 3px rgba(7,17,31,0.25); }
.ct-card-id { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; min-width: 0; }
.ct-name { display: inline-flex; align-items: center; gap: 7px; max-width: 100%; font-family: 'Geist', sans-serif; color: ${NAVY}; font-weight: 800;
  font-size: 19px; line-height: 1.25; text-decoration: none; }
.ct-name-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.ct-name:hover .ct-name-text { color: ${AZURE}; }
.ct-verified { flex-shrink: 0; color: #FFFFFF; fill: #2F80ED; }
.ct-card-title { display: block; max-width: 100%; font-family: 'Geist', sans-serif; font-size: 13.5px; font-weight: 600; color: #7B8BA3; letter-spacing: 0.01em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ct-card-badges { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin-top: 4px; }
.ct-soft-pill { display: inline-flex; align-items: center; gap: 4px; font-family: 'Geist', sans-serif; font-size: 11px; font-weight: 600; color: ${SLATE};
  background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 999px; padding: 2px 8px; white-space: nowrap; }
.ct-card-details { display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; background: #F5F8FC; border-radius: 14px; min-width: 0; }
.ct-detail { display: flex; align-items: center; gap: 12px; min-width: 0; }
.ct-detail-icon { width: 36px; height: 36px; border-radius: 50%; background: #E6F0FB; color: #1D6FD1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ct-detail-value { font-family: 'Geist', sans-serif; font-size: 13.5px; color: ${NAVY}; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.ct-detail-link { min-width: 0; text-decoration: none; display: flex; }
.ct-detail-link:hover .ct-detail-value { color: ${AZURE}; }
.ct-card-tags { display: flex; gap: 5px; flex-wrap: wrap; justify-content: center; }
.ct-card-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 12px; border-top: 1px solid #EDF1F6; margin-top: auto; }
.ct-card-when { display: inline-flex; align-items: center; gap: 6px; font-family: 'Geist', sans-serif; font-size: 12.5px; color: #7B8BA3; }
.ct-card-open { display: inline-flex; align-items: center; gap: 6px; min-height: 38px; padding: 0 12px 0 14px; border-radius: 12px; background: #EEF5FD;
  font-family: 'Geist', sans-serif; font-size: 13px; font-weight: 700; color: #1D6FD1; text-decoration: none; white-space: nowrap; }
.ct-card-open:hover { background: #E1EDFB; }
.ct-card-open:focus-visible { outline: 3px solid rgba(0,120,212,0.35); outline-offset: 1px; }
.ct-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; color: ${SLATE}; background: transparent;
  border: none; border-radius: 8px; cursor: pointer; text-decoration: none; flex-shrink: 0; }
.ct-icon-btn:hover, .ct-icon-btn[data-open="true"] { background: ${LIGHT}; color: ${AZURE}; }
.ct-icon-btn:focus-visible { outline: 2px solid rgba(0,120,212,0.5); outline-offset: 1px; }

.ct-list { list-style: none; margin: 0; padding: 0; background: #FFFFFF; border: 1.5px solid #E3E8EF; border-radius: 14px; overflow: hidden; }
.ct-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid #F0F2F5; min-width: 0; }
.ct-row:last-child { border-bottom: none; }
.ct-row:hover { background: #FAFBFD; }
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
  .ct-name { font-size: 18px; }
}
@media (hover: none) { .ct-card:hover { transform: none; } }
@media (prefers-reduced-motion: reduce) { .ct-card { transition: none; } .ct-card:hover { transform: none; } }
`;

function MenuItem({ label, onClick, disabled = false, danger = false }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button role="menuitem" onClick={onClick} disabled={disabled}
      style={{ ...GF, display: "block", width: "100%", padding: "10px 14px", minHeight: 44, border: "none", borderBottom: "1px solid #F8FAFC", background: "#FFFFFF", textAlign: "left", cursor: disabled ? "not-allowed" : "pointer", fontSize: 13, color: danger ? "#B42318" : NAVY, fontWeight: danger ? 600 : 400 }}
      onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
      onMouseLeave={e => (e.currentTarget.style.background = "#FFFFFF")}>
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

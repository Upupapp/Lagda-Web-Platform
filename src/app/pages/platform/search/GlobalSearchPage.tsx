// Global Search page — /app/search — Command 30
// URL-driven search state via useSearchParams (q, scope, sort).
// All results are frontend-only controlled projections. Results do not grant access.
// No dangerouslySetInnerHTML. No localStorage. No eNotary scope or records.
// Burgundy (#67023B) is NEVER used in this component.

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
import {
  Search, X, AlertTriangle, Info, ChevronRight, ChevronDown,
  FileText, Inbox, Files, Users, ShieldCheck, Bell, BarChart2,
  UsersRound, Users2, CircleUser, Shield, Bookmark, Settings,
  HelpCircle, FilePlus, BookOpen,
} from "lucide-react";
import type {
  GlobalSearchResult,
  GlobalSearchScope,
  GlobalSearchResponse,
  GlobalSearchMatchField,
  GlobalSearchMatchRange,
} from "../../../models/search";
import { SEARCH_SCOPE_LABELS, VALID_SEARCH_SCOPES } from "../../../models/search";
import { globalSearchService } from "../../../services/mock/global-search.service";
import { TabStrip } from "../../../components/platform/TabStrip";

// ── Design tokens ─────────────────────────────────────────────────────────────

const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SLATE  = "#64748B";
const SILVER = "#8A9BAE";
const GOLD   = "#C9960C";
const GREEN  = "#16A34A";
const RED    = "#DC2626";
const AMBER  = "#D97706";
const VIOLET = "#7C3AED";
const GF     = { fontFamily: "'Geist', sans-serif" };

// ── Safe text highlighting ────────────────────────────────────────────────────

function renderHighlighted(text: string, ranges: GlobalSearchMatchRange[]): ReactNode {
  if (!ranges || ranges.length === 0) return text;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const { start, end } of ranges) {
    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(
      <mark
        key={`hl-${start}`}
        style={{ background: "rgba(0,120,212,0.2)", color: "inherit", borderRadius: 2, padding: "0 1px" }}
      >
        {text.slice(start, end)}
      </mark>
    );
    cursor = end;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

function getFieldRanges(matchedFields: GlobalSearchMatchField[], field: "title" | "description"): GlobalSearchMatchRange[] {
  return matchedFields.find((f) => f.field === field)?.ranges ?? [];
}

// ── Result type color / icon ──────────────────────────────────────────────────

// `size` matches lucide's own LucideProps (string | number) so lucide icons assign cleanly.
type IconComp = React.ComponentType<{ size?: string | number; "aria-hidden"?: boolean | "true" | "false" }>;

const TYPE_ICON_MAP: Partial<Record<GlobalSearchResult["type"], IconComp>> = {
  "document":             FileText,
  "document-draft":       FilePlus,
  "recipient-assignment": Inbox,
  "template":             Files,
  "contact":              Users,
  "contact-group":        UsersRound,
  "workspace-member":     CircleUser,
  "team":                 Users2,
  "role":                 Shield,
  "verification-record":  ShieldCheck,
  "notification":         Bell,
  "report-definition":    BarChart2,
  "saved-report-view":    Bookmark,
  "settings-route":       Settings,
  "help-resource":        HelpCircle,
  "public-resource":      BookOpen,
};

const TYPE_COLORS: Partial<Record<GlobalSearchResult["type"], string>> = {
  "document":             AZURE,
  "document-draft":       AMBER,
  "recipient-assignment": AZURE,
  "template":             VIOLET,
  "contact":              GREEN,
  "contact-group":        GREEN,
  "workspace-member":     SLATE,
  "team":                 SLATE,
  "role":                 SLATE,
  "verification-record":  GREEN,
  "notification":         GOLD,
  "report-definition":    VIOLET,
  "saved-report-view":    VIOLET,
  "settings-route":       SILVER,
  "help-resource":        GOLD,
  "public-resource":      GOLD,
};

const TYPE_LABELS: Partial<Record<GlobalSearchResult["type"], string>> = {
  "document":             "Document",
  "document-draft":       "Draft",
  "recipient-assignment": "My Action",
  "template":             "Template",
  "contact":              "Contact",
  "contact-group":        "Group",
  "workspace-member":     "Member",
  "team":                 "Team",
  "role":                 "Role",
  "verification-record":  "Verification",
  "notification":         "Notification",
  "report-definition":    "Report",
  "saved-report-view":    "Saved View",
  "settings-route":       "Settings",
  "help-resource":        "Help",
  "public-resource":      "Resource",
};

// ── Availability badge ────────────────────────────────────────────────────────

function AvailabilityBadge({ availability }: { availability: GlobalSearchResult["availability"] }) {
  if (availability === "available") return null;
  const map: Partial<Record<typeof availability, [string, string]>> = {
    archived:              ["Archived",             SILVER],
    unavailable:           ["Unavailable",           RED],
    restricted:            ["Restricted",            AMBER],
    stale:                 ["May be outdated",       AMBER],
    "feature-unavailable": ["Feature unavailable",   SILVER],
    "workspace-restricted":["Workspace restricted",  AMBER],
    "team-restricted":     ["Team restricted",       AMBER],
  };
  const [label, color] = map[availability] ?? ["Unknown", SILVER];
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color,
      background: `${color}1A`, borderRadius: 4, padding: "2px 6px",
    }}>
      {label}
    </span>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  completed: GREEN, pending: AZURE, signed: GREEN,
  draft: AMBER, expired: RED, archived: SILVER,
  declined: RED, voided: SILVER, verified: GREEN,
  active: GREEN,
};

function StatusBadge({ status, label }: { status?: string; label?: string }) {
  if (!status || !label) return null;
  const color = STATUS_COLORS[status] ?? SLATE;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color,
      background: `${color}1A`, borderRadius: 4, padding: "2px 6px",
    }}>
      {label}
    </span>
  );
}

// ── Result card ───────────────────────────────────────────────────────────────

function ResultCard({ result, onNavigate }: {
  result:     GlobalSearchResult;
  onNavigate: (path: string, label: string) => void;
}) {
  const IconComp = TYPE_ICON_MAP[result.type] ?? FileText;
  const typeColor = TYPE_COLORS[result.type] ?? SLATE;
  const typeLabel = TYPE_LABELS[result.type] ?? "Item";
  const titleRanges = getFieldRanges(result.matchedFields, "title");
  const descRanges  = getFieldRanges(result.matchedFields, "description");
  const isUnavailable = result.availability !== "available" && result.availability !== "stale";

  return (
    <button
      onClick={() => !isUnavailable && onNavigate(result.destination.path, result.title)}
      disabled={isUnavailable}
      aria-label={`${result.title}${result.description ? ` — ${result.description}` : ""}${isUnavailable ? " (unavailable)" : ""}`}
      style={{
        width: "100%", display: "flex", alignItems: "flex-start", gap: 12,
        padding: "14px 20px", background: "#fff", border: "1px solid #E2E8F0",
        borderRadius: 10, cursor: isUnavailable ? "default" : "pointer",
        textAlign: "left", opacity: isUnavailable ? 0.6 : 1,
        transition: "border-color 0.15s, box-shadow 0.15s",
        outline: "none",
      }}
      className="gs-result-card"
    >
      {/* Type icon */}
      <span style={{
        flexShrink: 0, width: 36, height: 36,
        background: `${typeColor}14`,
        borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
        color: typeColor, marginTop: 1,
      }}>
        <IconComp size={18} aria-hidden />
      </span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: typeColor,
            background: `${typeColor}14`, borderRadius: 4, padding: "2px 6px",
            flexShrink: 0,
          }}>
            {typeLabel}
          </span>
          <span style={{
            ...GF, fontSize: 14, fontWeight: 600, color: "#0F172A",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            flex: 1,
          }}>
            {renderHighlighted(result.title, titleRanges)}
          </span>
          <AvailabilityBadge availability={result.availability} />
          <StatusBadge status={result.status} label={result.statusLabel} />
        </div>
        {result.description && (
          <div style={{
            ...GF, fontSize: 13, color: SLATE, marginTop: 3,
            overflow: "hidden", textOverflow: "ellipsis",
            display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2,
          }}>
            {renderHighlighted(result.description, descRanges)}
          </div>
        )}
        {(result.workspaceContext || result.teamContext) && (
          <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            {result.workspaceContext && (
              <span style={{ ...GF, fontSize: 11, color: SILVER }}>{result.workspaceContext}</span>
            )}
            {result.teamContext && (
              <span style={{ ...GF, fontSize: 11, color: SILVER }}>· {result.teamContext}</span>
            )}
          </div>
        )}
      </div>

      {/* Navigate arrow */}
      {!isUnavailable && (
        <ChevronRight size={16} aria-hidden style={{ color: SILVER, flexShrink: 0, marginTop: 10 }} />
      )}
    </button>
  );
}

// ── Result group ──────────────────────────────────────────────────────────────

function ResultGroup({ group, onNavigate, onScopeExpand }: {
  group:         GlobalSearchResponse["groups"][number];
  onNavigate:    (path: string, label: string) => void;
  onScopeExpand: (scope: GlobalSearchScope) => void;
}) {
  return (
    <section aria-label={`${group.label} results`} style={{ marginBottom: 24 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 10,
      }}>
        <h2 style={{
          ...GF, fontSize: 12, fontWeight: 700, letterSpacing: "0.07em",
          textTransform: "uppercase", color: SLATE, margin: 0,
        }}>
          {group.label}
          <span style={{ marginLeft: 8, fontWeight: 400, color: SILVER }}>
            ({group.totalCount})
          </span>
        </h2>
        {group.hasMore && (
          <button
            onClick={() => onScopeExpand(group.scope)}
            style={{
              ...GF, fontSize: 12, color: AZURE,
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 3,
            }}
          >
            See all <ChevronRight size={12} aria-hidden />
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {group.results.map((result) => (
          <ResultCard
            key={result.id}
            result={result}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </section>
  );
}

// ── Scope tab bar ─────────────────────────────────────────────────────────────

const SCOPE_ICONS: Partial<Record<GlobalSearchScope, IconComp>> = {
  documents:        FileText,
  "my-actions":     Inbox,
  templates:        Files,
  contacts:         Users,
  "people-and-teams": Users2,
  verification:     ShieldCheck,
  notifications:    Bell,
  reports:          BarChart2,
  settings:         Settings,
  help:             HelpCircle,
};

function ScopeTabBar({ current, onChange, counts }: {
  current:  GlobalSearchScope;
  onChange: (s: GlobalSearchScope) => void;
  counts:   Partial<Record<GlobalSearchScope, number>>;
}) {
  return (
    <TabStrip as="tablist" label="Search scope" activeKey={current}
      style={{ borderBottom: "2px solid #E2E8F0", marginBottom: 24 }}
    >
      {VALID_SEARCH_SCOPES.map((sc) => {
        const IconComp = sc === "all" ? Search : (SCOPE_ICONS[sc] ?? Search);
        const isActive = sc === current;
        const count    = counts[sc];
        return (
          <button
            key={sc}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(sc)}
            style={{
              ...GF, fontSize: 13, fontWeight: isActive ? 600 : 400,
              color: isActive ? AZURE : SLATE,
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 12px",
              borderBottom: `2px solid ${isActive ? AZURE : "transparent"}`,
              marginBottom: -2,
              display: "flex", alignItems: "center", gap: 5,
              whiteSpace: "nowrap", flexShrink: 0,
              transition: "color 0.15s",
              outline: "none",
            }}
            className="gs-scope-tab"
          >
            <IconComp size={13} aria-hidden />
            {SEARCH_SCOPE_LABELS[sc]}
            {count !== undefined && count > 0 && (
              <span style={{
                background: isActive ? AZURE : "#E2E8F0",
                color: isActive ? "#fff" : SLATE,
                fontSize: 10, fontWeight: 700,
                borderRadius: 10, padding: "1px 5px", minWidth: 16, textAlign: "center",
              }}>
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        );
      })}
    </TabStrip>
  );
}

// ── Sort controls ─────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "relevance",  label: "Relevance" },
  { value: "updated-at", label: "Last updated" },
  { value: "title",      label: "Title" },
];

function SortControl({ sort, onChange }: {
  sort:     string;
  onChange: (s: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ ...GF, fontSize: 12, color: SLATE }}>Sort:</span>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <select
          value={sort}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Sort results"
          style={{
            ...GF, fontSize: 12, color: "#0F172A",
            background: "#fff", border: "1px solid #E2E8F0",
            borderRadius: 6, padding: "4px 28px 4px 8px",
            appearance: "none", cursor: "pointer", outline: "none",
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown size={12} aria-hidden style={{ position: "absolute", right: 8, color: SLATE, pointerEvents: "none" }} />
      </div>
    </div>
  );
}

// ── Search summary banner ─────────────────────────────────────────────────────

function SearchSummary({ response, query }: { response: GlobalSearchResponse; query: string }) {
  const total = response.totalPermittedCount;
  return (
    <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 16px" }}>
      {total === 0 ? (
        <>No demonstration results for <strong style={{ color: "#0F172A" }}>"{query}"</strong></>
      ) : (
        <>
          Showing <strong>{total}</strong> demonstration result{total !== 1 ? "s" : ""} for{" "}
          <strong style={{ color: "#0F172A" }}>"{query}"</strong>
        </>
      )}
      {" "}— not live indexed data.
    </p>
  );
}

// ── Demo notice ───────────────────────────────────────────────────────────────

function DemoNotice() {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      background: "#EFF6FF", border: "1px solid #BFDBFE",
      borderRadius: 8, padding: "10px 14px", marginBottom: 20,
    }}>
      <Info size={15} aria-hidden style={{ color: AZURE, flexShrink: 0, marginTop: 1 }} />
      <p style={{ ...GF, fontSize: 13, color: "#1E40AF", margin: 0 }}>
        <strong>Demonstration search</strong> — Results are controlled projections from frontend fixtures,
        not a live index. Results do not grant access; every destination revalidates permissions before navigation.
        No document content, signatures, field values, or authentication evidence is included in search results.
      </p>
    </div>
  );
}

// ── Empty / no-results state ──────────────────────────────────────────────────

function NoResultsState({ query, scope, onScopeReset }: {
  query:        string;
  scope:        GlobalSearchScope;
  onScopeReset: () => void;
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "48px 24px", gap: 12, textAlign: "center",
    }}>
      <AlertTriangle size={36} aria-hidden style={{ color: "#CBD5E1" }} />
      <h2 style={{ ...GF, fontSize: 18, fontWeight: 600, color: "#0F172A", margin: 0 }}>
        No results for "{query}"
      </h2>
      <p style={{ ...GF, fontSize: 14, color: SLATE, margin: 0, maxWidth: 360 }}>
        No demonstration projections match this search.
        {scope !== "all" && " Try searching all sections or use different keywords."}
      </p>
      {scope !== "all" && (
        <button
          onClick={onScopeReset}
          style={{
            ...GF, fontSize: 14, color: "#fff", background: AZURE,
            border: "none", borderRadius: 8, padding: "8px 20px",
            cursor: "pointer", marginTop: 4,
          }}
        >
          Search all sections
        </button>
      )}
    </div>
  );
}

// ── No-query state ────────────────────────────────────────────────────────────

function NoQueryState({ onSearch }: { onSearch: (q: string) => void }) {
  const suggestions = [
    "agreement", "template", "pending", "verify",
    "contact", "report", "settings", "help",
  ];
  return (
    <div style={{ padding: "24px 0" }}>
      <h2 style={{ ...GF, fontSize: 14, fontWeight: 600, color: SLATE, margin: "0 0 16px" }}>
        Try searching for…
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSearch(s)}
            style={{
              ...GF, fontSize: 13, color: "#0F172A",
              background: "#F1F5F9", border: "1px solid #E2E8F0",
              borderRadius: 20, padding: "6px 14px", cursor: "pointer",
              transition: "background 0.15s",
            }}
            className="gs-chip"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div role="status" aria-label="Loading search results" style={{ padding: "8px 0" }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{
          height: 80, background: "#F8FAFC", border: "1px solid #E2E8F0",
          borderRadius: 10, marginBottom: 8, animation: "gs-pulse 1.4s ease-in-out infinite",
        }} />
      ))}
      <span style={{ position: "absolute", left: -9999, top: "auto" }}>Loading…</span>
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────────────────

export function GlobalSearchPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const paramQ     = params.get("q") ?? "";
  const paramScope = (params.get("scope") ?? "all") as GlobalSearchScope;
  const paramSort  = params.get("sort") ?? "relevance";

  const [inputValue, setInputValue] = useState(paramQ);
  const [response,   setResponse]   = useState<GlobalSearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Validate scope from URL (cannot be used to expand permissions)
  const scope = VALID_SEARCH_SCOPES.includes(paramScope) ? paramScope : "all";

  // Counts per scope for the tab bar
  const scopeCounts: Partial<Record<GlobalSearchScope, number>> = {};
  if (response) {
    for (const group of response.groups) {
      scopeCounts[group.scope] = group.totalCount;
    }
  }

  // Run search when URL params change
  useEffect(() => {
    if (!paramQ || paramQ.trim().length < 2) {
      setResponse(null);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      const res = globalSearchService.search({
        query:       paramQ.trim(),
        scope,
        sort:        paramSort as GlobalSearchRequest["sort"],
        maxPerGroup: 8,
        perPage:     20,
      });
      setResponse(res);
      setIsSearching(false);
    }, 120);
    return () => clearTimeout(timer);
  }, [paramQ, scope, paramSort]);

  // Sync input with URL param
  useEffect(() => {
    setInputValue(paramQ);
  }, [paramQ]);

  function commitSearch(q: string) {
    const newParams = new URLSearchParams(params);
    if (q.trim().length >= 2) {
      newParams.set("q", q.trim());
    } else {
      newParams.delete("q");
    }
    newParams.set("scope", scope);
    setParams(newParams, { replace: true });
  }

  function handleScopeChange(s: GlobalSearchScope) {
    const newParams = new URLSearchParams(params);
    newParams.set("scope", s);
    setParams(newParams, { replace: true });
  }

  function handleSortChange(s: string) {
    const newParams = new URLSearchParams(params);
    newParams.set("sort", s);
    setParams(newParams, { replace: true });
  }

  function handleNavigate(path: string, label: string) {
    globalSearchService.addRecentDestination(label, path);
    navigate(path);
  }

  function handleScopeExpand(s: GlobalSearchScope) {
    handleScopeChange(s);
  }

  const isQuerying = paramQ.trim().length >= 2;
  const hasResults = !!response && response.groups.length > 0;

  return (
    <main
      id="main-content"
      aria-label="Global Search"
      style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 60px" }}
    >
      {/* Page heading */}
      <h1 style={{
        ...GF, fontSize: 22, fontWeight: 700, color: "#0F172A",
        margin: "0 0 20px", letterSpacing: "-0.02em",
      }}>
        Search
      </h1>

      {/* Demo notice */}
      <DemoNotice />

      {/* Search input */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10,
        padding: "10px 14px", marginBottom: 20,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
        className="gs-input-wrap"
      >
        <Search size={18} aria-hidden style={{ color: SILVER, flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="search"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commitSearch(inputValue); }}
          onBlur={() => commitSearch(inputValue)}
          placeholder="Search documents, contacts, templates, settings…"
          autoFocus
          aria-label="Search"
          autoComplete="off"
          spellCheck={false}
          maxLength={200}
          style={{
            flex: 1, border: "none", outline: "none", background: "none",
            ...GF, fontSize: 15, color: "#0F172A", caretColor: AZURE,
          }}
        />
        {inputValue && (
          <button
            onClick={() => { setInputValue(""); commitSearch(""); inputRef.current?.focus(); }}
            aria-label="Clear search"
            style={{ background: "none", border: "none", cursor: "pointer", color: SLATE, padding: 4, display: "flex" }}
          >
            <X size={15} aria-hidden />
          </button>
        )}
        <button
          onClick={() => commitSearch(inputValue)}
          aria-label="Search"
          style={{
            background: AZURE, border: "none", borderRadius: 7,
            color: "#fff", padding: "6px 14px",
            ...GF, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          Search
        </button>
      </div>

      {/* Scope tabs + sort */}
      {isQuerying && (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <ScopeTabBar current={scope} onChange={handleScopeChange} counts={scopeCounts} />
          </div>
          <div style={{ paddingTop: 2, flexShrink: 0 }}>
            <SortControl sort={paramSort} onChange={handleSortChange} />
          </div>
        </div>
      )}

      {/* States */}
      {!isQuerying && (
        <NoQueryState onSearch={(q) => { setInputValue(q); commitSearch(q); }} />
      )}

      {isQuerying && isSearching && (
        <LoadingSkeleton />
      )}

      {isQuerying && !isSearching && response && (
        <div aria-live="polite" aria-atomic="false">
          <SearchSummary response={response} query={paramQ.trim()} />

          {hasResults ? (
            <div>
              {response.groups.map((group) => (
                <ResultGroup
                  key={group.scope}
                  group={group}
                  onNavigate={handleNavigate}
                  onScopeExpand={handleScopeExpand}
                />
              ))}
            </div>
          ) : (
            <NoResultsState
              query={paramQ.trim()}
              scope={scope}
              onScopeReset={() => handleScopeChange("all")}
            />
          )}
        </div>
      )}

      {/* Open in command palette shortcut */}
      <div style={{
        marginTop: 32, padding: "12px 16px",
        background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <kbd style={{
          fontFamily: "monospace", fontSize: 12, color: SLATE,
          background: "#fff", border: "1px solid #E2E8F0",
          borderRadius: 4, padding: "2px 6px",
        }}>⌘K</kbd>
        <span style={{ ...GF, fontSize: 13, color: SLATE }}>
          Press Ctrl+K anywhere in the platform to open the command palette.
        </span>
      </div>

      <style>{`
        .gs-result-card:hover { border-color: #BFDBFE !important; box-shadow: 0 2px 8px rgba(0,120,212,0.1) !important; }
        .gs-scope-tab:hover { color: #0F172A !important; }
        .gs-chip:hover { background: #E2E8F0 !important; }
        .gs-input-wrap:focus-within { border-color: #93C5FD !important; box-shadow: 0 0 0 3px rgba(0,120,212,0.12) !important; }
        @keyframes gs-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (max-width: 639px) {
          main { padding: 16px 12px 40px !important; }
        }
      `}</style>
    </main>
  );
}

// GlobalSearchRequest type needed locally (re-used from models/search)
type GlobalSearchRequest = import("../../../models/search").GlobalSearchRequest;

// Command Palette and Global Search Dialog — Command 30
// Replaces SearchDialog. Opens via Ctrl+K / Cmd+K or the header search button.
// All results are frontend-only controlled projections. Results do not grant access.
// Every destination revalidates permissions before navigation.
// No dangerouslySetInnerHTML. No localStorage. No eNotary scope or records.
// Burgundy (#67023B) is NEVER used in this component.

import {
  useState, useEffect, useRef, useCallback, useId, type ReactNode,
} from "react";
import { useNavigate } from "react-router";
import {
  Search, X, History, Clock, ArrowRight, LayoutDashboard, FileText, Inbox,
  Files, Users, ShieldCheck, Bell, BarChart2, Building2, FilePlus, FilePlus2,
  UserPlus, UsersRound, UserPlus2, Users2, Bookmark, CircleUser, Lock,
  PenLine, BellRing, CreditCard, Shield, Puzzle, HelpCircle, BookOpen,
  Scale, FileSearch, MessageCircle, Settings, Pin, PinOff, ChevronRight,
  AlertTriangle, Info,
} from "lucide-react";
import type {
  GlobalSearchResult,
  GlobalSearchScope,
  GlobalSearchResponse,
  CommandPaletteCommand,
  GlobalSearchSuggestion,
  GlobalSearchMatchField,
  GlobalSearchMatchRange,
} from "../../models/search";
import { SEARCH_SCOPE_LABELS, VALID_SEARCH_SCOPES } from "../../models/search";
import { globalSearchService } from "../../services/mock/global-search.service";
import { Z } from "../../utils/z-index";

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

// ── Icon registry (string name → Lucide component) ────────────────────────────

// Lucide icons accept `size?: string | number` — the registry must match that
// contract exactly, otherwise the icon components are not assignable to it.
const ICON_MAP: Record<string, React.ComponentType<{ size?: string | number; "aria-hidden"?: boolean | "true" | "false" }>> = {
  LayoutDashboard, FileText, Inbox, Files, Users, ShieldCheck, Bell, BarChart2,
  Building2, Search, FilePlus, FilePlus2, UserPlus, UsersRound, UserPlus2,
  Users2, Bookmark, CircleUser, Lock, PenLine, BellRing, CreditCard, Shield,
  Puzzle, HelpCircle, BookOpen, Scale, FileSearch, MessageCircle, Settings,
  History, Clock, ArrowRight, Pin,
};

function DynIcon({ name, size = 16 }: { name: string; size?: number }) {
  const C = ICON_MAP[name];
  if (!C) return null;
  return <C size={size} aria-hidden />;
}

// ── Safe text highlighting ────────────────────────────────────────────────────
// Splits text into plain/highlighted spans using pre-computed ranges.
// Never uses dangerouslySetInnerHTML.

function renderHighlighted(text: string, ranges: GlobalSearchMatchRange[]): ReactNode {
  if (!ranges || ranges.length === 0) return text;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const { start, end } of ranges) {
    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(
      <mark
        key={`hl-${start}`}
        style={{ background: "rgba(0,120,212,0.35)", color: "inherit", borderRadius: 2, padding: "0 1px" }}
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

// ── Result type color / label ─────────────────────────────────────────────────

function getTypeColor(type: GlobalSearchResult["type"]): string {
  switch (type) {
    case "document":             return AZURE;
    case "document-draft":       return AMBER;
    case "recipient-assignment": return AZURE;
    case "template":             return VIOLET;
    case "contact":              return GREEN;
    case "contact-group":        return GREEN;
    case "workspace-member":     return SLATE;
    case "team":                 return SLATE;
    case "role":                 return SLATE;
    case "verification-record":  return GREEN;
    case "notification":         return GOLD;
    case "report-definition":    return VIOLET;
    case "saved-report-view":    return VIOLET;
    case "settings-route":       return SILVER;
    case "help-resource":        return GOLD;
    case "public-resource":      return GOLD;
    case "navigation-command":   return AZURE;
    case "quick-action":         return GREEN;
    default:                     return SLATE;
  }
}

function getTypeIcon(type: GlobalSearchResult["type"]): string {
  switch (type) {
    case "document":             return "FileText";
    case "document-draft":       return "FilePlus";
    case "recipient-assignment": return "Inbox";
    case "template":             return "Files";
    case "contact":              return "Users";
    case "contact-group":        return "UsersRound";
    case "workspace-member":     return "CircleUser";
    case "team":                 return "Users2";
    case "role":                 return "Shield";
    case "verification-record":  return "ShieldCheck";
    case "notification":         return "Bell";
    case "report-definition":    return "BarChart2";
    case "saved-report-view":    return "Bookmark";
    case "settings-route":       return "Settings";
    case "help-resource":        return "HelpCircle";
    case "public-resource":      return "BookOpen";
    case "navigation-command":   return "ArrowRight";
    case "quick-action":         return "FilePlus";
    default:                     return "FileText";
  }
}

// ── Availability badge ────────────────────────────────────────────────────────

function AvailabilityBadge({ availability }: { availability: GlobalSearchResult["availability"] }) {
  if (availability === "available") return null;
  const labels: Partial<Record<typeof availability, string>> = {
    archived: "Archived", unavailable: "Unavailable", restricted: "Restricted",
    stale: "May be outdated", "feature-unavailable": "Feature unavailable",
    "workspace-restricted": "Workspace restricted", "team-restricted": "Team restricted",
  };
  const colors: Partial<Record<typeof availability, string>> = {
    archived: SILVER, unavailable: RED, restricted: AMBER,
    stale: AMBER, "feature-unavailable": SILVER,
    "workspace-restricted": AMBER, "team-restricted": AMBER,
  };
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
      color: colors[availability] ?? SILVER,
      background: `${colors[availability] ?? SILVER}22`,
      borderRadius: 4, padding: "1px 5px", flexShrink: 0,
    }}>
      {labels[availability]}
    </span>
  );
}

// ── Demo notice ───────────────────────────────────────────────────────────────

function DemoNotice() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      fontSize: 11, color: SILVER,
      padding: "4px 16px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <Info size={11} aria-hidden />
      <span>
        Search results are demonstration projections — not live indexed data. Results do not grant access.
      </span>
    </div>
  );
}

// ── Result item ───────────────────────────────────────────────────────────────

interface ResultItemProps {
  result:    GlobalSearchResult;
  isActive:  boolean;
  onActivate: () => void;
  onHover:    () => void;
  itemId:     string;
}

function ResultItem({ result, isActive, onActivate, onHover, itemId }: ResultItemProps) {
  const typeColor = getTypeColor(result.type);
  const iconName  = getTypeIcon(result.type);
  const titleRanges = getFieldRanges(result.matchedFields, "title");
  const descRanges  = getFieldRanges(result.matchedFields, "description");

  return (
    <li role="none">
      <button
        id={itemId}
        role="option"
        aria-selected={isActive}
        onClick={onActivate}
        onMouseEnter={onHover}
        style={{
          width: "100%", display: "flex", alignItems: "flex-start", gap: 10,
          padding: "9px 16px", border: "none", cursor: "pointer", textAlign: "left",
          background: isActive ? "rgba(0,120,212,0.12)" : "transparent",
          transition: "background 0.1s",
          outline: "none",
        }}
      >
        {/* Type icon */}
        <span style={{
          flexShrink: 0, width: 28, height: 28,
          background: `${typeColor}1A`,
          borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
          color: typeColor, marginTop: 1,
        }}>
          <DynIcon name={iconName} size={14} />
        </span>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
          }}>
            <span style={{
              ...GF, fontSize: 13, fontWeight: 500, color: "#F8FAFC",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
            }}>
              {renderHighlighted(result.title, titleRanges)}
            </span>
            <AvailabilityBadge availability={result.availability} />
          </div>
          {result.description && (
            <div style={{
              ...GF, fontSize: 12, color: SILVER, marginTop: 1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {renderHighlighted(result.description, descRanges)}
            </div>
          )}
          {(result.workspaceContext || result.statusLabel) && (
            <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
              {result.statusLabel && (
                <span style={{ fontSize: 10, color: SLATE, fontWeight: 500 }}>
                  {result.statusLabel}
                </span>
              )}
              {result.workspaceContext && (
                <span style={{ fontSize: 10, color: SLATE }}>
                  {result.workspaceContext}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Navigate arrow */}
        <ChevronRight size={14} aria-hidden style={{ color: SLATE, flexShrink: 0, marginTop: 7 }} />
      </button>
    </li>
  );
}

// ── Command item ──────────────────────────────────────────────────────────────

interface CommandItemProps {
  cmd:        CommandPaletteCommand;
  isActive:   boolean;
  isPinned:   boolean;
  onActivate: () => void;
  onHover:    () => void;
  onPin:      () => void;
  itemId:     string;
}

function CommandItem({ cmd, isActive, isPinned, onActivate, onHover, onPin, itemId }: CommandItemProps) {
  return (
    <li role="none" style={{ position: "relative" }}>
      <button
        id={itemId}
        role="option"
        aria-selected={isActive}
        onClick={onActivate}
        onMouseEnter={onHover}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "8px 16px", border: "none", cursor: "pointer", textAlign: "left",
          background: isActive ? "rgba(0,120,212,0.12)" : "transparent",
          transition: "background 0.1s", outline: "none",
        }}
      >
        <span style={{
          flexShrink: 0, width: 26, height: 26,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
          color: SILVER,
        }}>
          <DynIcon name={cmd.icon} size={13} />
        </span>
        <span style={{ ...GF, fontSize: 13, color: "#E2E8F0", flex: 1 }}>{cmd.label}</span>
        {cmd.isPinnable && (
          <button
            onClick={(e) => { e.stopPropagation(); onPin(); }}
            aria-label={isPinned ? `Unpin ${cmd.label}` : `Pin ${cmd.label}`}
            title={isPinned ? "Unpin" : "Pin to top"}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 4,
              color: isPinned ? AZURE : SLATE, display: "flex", alignItems: "center",
            }}
            tabIndex={-1}
          >
            {isPinned ? <PinOff size={12} aria-hidden /> : <Pin size={12} aria-hidden />}
          </button>
        )}
      </button>
    </li>
  );
}

// ── No-query state ────────────────────────────────────────────────────────────

interface NoQueryStateProps {
  recentQueries:    ReturnType<typeof globalSearchService.getRecentQueries>;
  recentDests:      ReturnType<typeof globalSearchService.getRecentDestinations>;
  pinnedCommands:   CommandPaletteCommand[];
  commandsByGroup:  Partial<Record<string, CommandPaletteCommand[]>>;
  suggestions:      GlobalSearchSuggestion[];
  pinnedIds:        string[];
  activeIndex:      number;
  onQuerySelect:    (query: string, scope?: GlobalSearchScope) => void;
  onDestSelect:     (path: string) => void;
  onCommandSelect:  (cmd: CommandPaletteCommand) => void;
  onPinToggle:      (id: string) => void;
  onRemoveRecent:   (id: string) => void;
  flatItems:        FlatItem[];
  setActiveIndex:   (i: number) => void;
}

function NoQueryState({
  recentQueries, recentDests, pinnedCommands, commandsByGroup,
  suggestions, pinnedIds, activeIndex,
  onQuerySelect, onDestSelect, onCommandSelect, onPinToggle, onRemoveRecent,
  flatItems, setActiveIndex,
}: NoQueryStateProps) {
  const sectionStyle: React.CSSProperties = {
    padding: "8px 0 4px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
  };
  const sectionLabel: React.CSSProperties = {
    ...GF, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
    color: SLATE, textTransform: "uppercase",
    padding: "0 16px 4px", display: "block",
  };

  return (
    <div>
      {/* Pinned commands */}
      {pinnedCommands.length > 0 && (
        <div style={sectionStyle}>
          <span style={sectionLabel}>Pinned</span>
          <ul role="listbox" aria-label="Pinned commands" style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {pinnedCommands.map((cmd) => {
              const fi = flatItems.findIndex((f) => f.id === `cmd-${cmd.id}`);
              return (
                <CommandItem
                  key={cmd.id}
                  cmd={cmd}
                  isActive={activeIndex === fi}
                  isPinned
                  onActivate={() => onCommandSelect(cmd)}
                  onHover={() => fi >= 0 && setActiveIndex(fi)}
                  onPin={() => onPinToggle(cmd.id)}
                  itemId={`cp-item-cmd-${cmd.id}`}
                />
              );
            })}
          </ul>
        </div>
      )}

      {/* Recent queries */}
      {recentQueries.length > 0 && (
        <div style={sectionStyle}>
          <span style={sectionLabel}>Recent searches</span>
          <ul role="listbox" aria-label="Recent searches" style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {recentQueries.slice(0, 5).map((rq) => {
              const fi = flatItems.findIndex((f) => f.id === `rq-${rq.id}`);
              return (
                <li key={rq.id} role="none">
                  <button
                    id={`cp-item-rq-${rq.id}`}
                    role="option"
                    aria-selected={activeIndex === fi}
                    onClick={() => onQuerySelect(rq.query, rq.scope)}
                    onMouseEnter={() => fi >= 0 && setActiveIndex(fi)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "7px 16px", border: "none", cursor: "pointer", textAlign: "left",
                      background: activeIndex === fi ? "rgba(0,120,212,0.12)" : "transparent",
                      transition: "background 0.1s", outline: "none",
                    }}
                  >
                    <History size={13} aria-hidden style={{ color: SLATE, flexShrink: 0 }} />
                    <span style={{ ...GF, fontSize: 13, color: "#CBD5E1", flex: 1 }}>{rq.query}</span>
                    {rq.scope && rq.scope !== "all" && (
                      <span style={{ fontSize: 10, color: SLATE }}>{SEARCH_SCOPE_LABELS[rq.scope]}</span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveRecent(rq.id); }}
                      aria-label={`Remove "${rq.query}" from recent searches`}
                      style={{ background: "none", border: "none", cursor: "pointer", color: SLATE, padding: 2, display: "flex" }}
                      tabIndex={-1}
                    >
                      <X size={11} aria-hidden />
                    </button>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Recent destinations */}
      {recentDests.length > 0 && (
        <div style={sectionStyle}>
          <span style={sectionLabel}>Recent pages</span>
          <ul role="listbox" aria-label="Recent pages" style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {recentDests.slice(0, 4).map((rd) => {
              const fi = flatItems.findIndex((f) => f.id === `rd-${rd.id}`);
              return (
                <li key={rd.id} role="none">
                  <button
                    id={`cp-item-rd-${rd.id}`}
                    role="option"
                    aria-selected={activeIndex === fi}
                    onClick={() => onDestSelect(rd.path)}
                    onMouseEnter={() => fi >= 0 && setActiveIndex(fi)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "7px 16px", border: "none", cursor: "pointer", textAlign: "left",
                      background: activeIndex === fi ? "rgba(0,120,212,0.12)" : "transparent",
                      transition: "background 0.1s", outline: "none",
                    }}
                  >
                    <Clock size={13} aria-hidden style={{ color: SLATE, flexShrink: 0 }} />
                    <span style={{ ...GF, fontSize: 13, color: "#CBD5E1", flex: 1 }}>{rd.label}</span>
                    <span style={{ fontSize: 10, color: SLATE }}>{rd.path.replace("/app/", "").split("/")[0]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Navigate commands */}
      {(commandsByGroup["Navigate"] ?? []).length > 0 && (
        <div style={sectionStyle}>
          <span style={sectionLabel}>Navigate</span>
          <ul role="listbox" aria-label="Navigate commands" style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {(commandsByGroup["Navigate"] ?? []).map((cmd) => {
              const fi = flatItems.findIndex((f) => f.id === `cmd-${cmd.id}`);
              return (
                <CommandItem
                  key={cmd.id}
                  cmd={cmd}
                  isActive={activeIndex === fi}
                  isPinned={pinnedIds.includes(cmd.id)}
                  onActivate={() => onCommandSelect(cmd)}
                  onHover={() => fi >= 0 && setActiveIndex(fi)}
                  onPin={() => onPinToggle(cmd.id)}
                  itemId={`cp-item-cmd-${cmd.id}`}
                />
              );
            })}
          </ul>
        </div>
      )}

      {/* Create commands */}
      {(commandsByGroup["Create"] ?? []).length > 0 && (
        <div style={sectionStyle}>
          <span style={sectionLabel}>Create</span>
          <ul role="listbox" aria-label="Create commands" style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {(commandsByGroup["Create"] ?? []).map((cmd) => {
              const fi = flatItems.findIndex((f) => f.id === `cmd-${cmd.id}`);
              return (
                <CommandItem
                  key={cmd.id}
                  cmd={cmd}
                  isActive={activeIndex === fi}
                  isPinned={pinnedIds.includes(cmd.id)}
                  onActivate={() => onCommandSelect(cmd)}
                  onHover={() => fi >= 0 && setActiveIndex(fi)}
                  onPin={() => onPinToggle(cmd.id)}
                  itemId={`cp-item-cmd-${cmd.id}`}
                />
              );
            })}
          </ul>
        </div>
      )}

      {/* Help default suggestions (if no recents at all) */}
      {recentQueries.length === 0 && recentDests.length === 0 && (
        <div style={sectionStyle}>
          <span style={sectionLabel}>Suggestions</span>
          <ul role="listbox" aria-label="Suggestions" style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {suggestions.slice(0, 4).map((sug) => {
              const fi = flatItems.findIndex((f) => f.id === `sug-${sug.id}`);
              return (
                <li key={sug.id} role="none">
                  <button
                    id={`cp-item-sug-${sug.id}`}
                    role="option"
                    aria-selected={activeIndex === fi}
                    onClick={() => sug.query ? onQuerySelect(sug.query) : undefined}
                    onMouseEnter={() => fi >= 0 && setActiveIndex(fi)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "7px 16px", border: "none", cursor: "pointer", textAlign: "left",
                      background: activeIndex === fi ? "rgba(0,120,212,0.12)" : "transparent",
                      transition: "background 0.1s", outline: "none",
                    }}
                  >
                    <ArrowRight size={13} aria-hidden style={{ color: AZURE, flexShrink: 0 }} />
                    <span style={{ ...GF, fontSize: 13, color: "#CBD5E1" }}>{sug.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Results state ─────────────────────────────────────────────────────────────

interface ResultsStateProps {
  response:       GlobalSearchResponse;
  activeIndex:    number;
  flatItems:      FlatItem[];
  setActiveIndex: (i: number) => void;
  onResultSelect: (result: GlobalSearchResult) => void;
  query:          string;
}

function ResultsState({ response, activeIndex, flatItems, setActiveIndex, onResultSelect, query }: ResultsStateProps) {
  return (
    <div>
      {response.groups.map((group) => (
        <div key={group.scope} style={{ padding: "8px 0 4px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{
            ...GF, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
            color: SLATE, textTransform: "uppercase",
            padding: "0 16px 4px", display: "block",
          }}>
            {group.label}
          </span>
          <ul role="listbox" aria-label={`${group.label} results`} style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {group.results.map((result) => {
              const itemId = `cp-item-res-${result.id}`;
              const fi = flatItems.findIndex((f) => f.id === `res-${result.id}`);
              return (
                <ResultItem
                  key={result.id}
                  result={result}
                  isActive={activeIndex === fi}
                  onActivate={() => onResultSelect(result)}
                  onHover={() => fi >= 0 && setActiveIndex(fi)}
                  itemId={itemId}
                />
              );
            })}
          </ul>
          {group.hasMore && (
            <button
              style={{
                ...GF, fontSize: 12, color: AZURE, padding: "4px 16px",
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
              }}
              onClick={() => window.location.assign(`/app/search?q=${encodeURIComponent(query)}&scope=${group.scope}`)}
            >
              See all in {group.label}
              <ChevronRight size={12} aria-hidden />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Flat item registry for keyboard nav ───────────────────────────────────────

interface FlatItem {
  id:     string;   // unique logical id
  domId:  string;   // DOM element id
  type:   "result" | "command" | "recent-query" | "recent-dest" | "suggestion";
}

// ── Component props ───────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open:    boolean;
  onClose: () => void;
}

// ── Main component ────────────────────────────────────────────────────────────

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate   = useNavigate();
  const dialogId   = useId();
  const inputId    = `${dialogId}-input`;
  const listboxId  = `${dialogId}-listbox`;

  const dialogRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<Element | null>(null);

  const [query,        setQuery]        = useState("");
  const [scope,        setScope]        = useState<GlobalSearchScope>("all");
  const [response,     setResponse]     = useState<GlobalSearchResponse | null>(null);
  const [isSearching,  setIsSearching]  = useState(false);
  const [activeIndex,  setActiveIndex]  = useState(-1);
  const [commands,     setCommands]     = useState<CommandPaletteCommand[]>([]);
  const [commandsByGroup, setCommandsByGroup] = useState<Partial<Record<string, CommandPaletteCommand[]>>>({});
  const [pinnedIds,    setPinnedIds]    = useState<string[]>([]);
  const [recentQueries, setRecentQueries] = useState(globalSearchService.getRecentQueries());
  const [recentDests,   setRecentDests]   = useState(globalSearchService.getRecentDestinations());
  const [suggestions,   setSuggestions]   = useState(globalSearchService.getSuggestions());

  const isQuerying = query.trim().length >= 2;

  // ── Open / close lifecycle ────────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
      setQuery("");
      setScope("all");
      setResponse(null);
      setActiveIndex(-1);
      setCommands(globalSearchService.listCommands());
      setCommandsByGroup(globalSearchService.getCommandsByGroup() as Partial<Record<string, CommandPaletteCommand[]>>);
      setPinnedIds(globalSearchService.getPinnedCommandIds());
      setRecentQueries(globalSearchService.getRecentQueries());
      setRecentDests(globalSearchService.getRecentDestinations());
      setSuggestions(globalSearchService.getSuggestions());
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      // Restore focus to the element that opened the palette
      setTimeout(() => {
        if (triggerRef.current instanceof HTMLElement) {
          triggerRef.current.focus();
        }
      }, 10);
    }
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ── Debounced search ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!isQuerying) {
      setResponse(null);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      const res = globalSearchService.search({ query: query.trim(), scope, maxPerGroup: 5 });
      setResponse(res);
      setIsSearching(false);
      setActiveIndex(-1);
    }, 180);
    return () => clearTimeout(timer);
  }, [query, scope, isQuerying]);

  // ── Build flat items list for keyboard nav ────────────────────────────────

  const flatItems: FlatItem[] = [];

  if (!isQuerying) {
    // Pinned commands
    const pinned = commands.filter((c) => pinnedIds.includes(c.id) && c.isPinnable);
    for (const cmd of pinned) {
      flatItems.push({ id: `cmd-${cmd.id}`, domId: `cp-item-cmd-${cmd.id}`, type: "command" });
    }
    // Recent queries
    for (const rq of recentQueries.slice(0, 5)) {
      flatItems.push({ id: `rq-${rq.id}`, domId: `cp-item-rq-${rq.id}`, type: "recent-query" });
    }
    // Recent destinations
    for (const rd of recentDests.slice(0, 4)) {
      flatItems.push({ id: `rd-${rd.id}`, domId: `cp-item-rd-${rd.id}`, type: "recent-dest" });
    }
    // Navigate commands
    for (const cmd of commandsByGroup["Navigate"] ?? []) {
      if (!pinnedIds.includes(cmd.id)) {
        flatItems.push({ id: `cmd-${cmd.id}`, domId: `cp-item-cmd-${cmd.id}`, type: "command" });
      }
    }
    // Create commands
    for (const cmd of commandsByGroup["Create"] ?? []) {
      flatItems.push({ id: `cmd-${cmd.id}`, domId: `cp-item-cmd-${cmd.id}`, type: "command" });
    }
    // Default suggestions (only if no recents)
    if (recentQueries.length === 0 && recentDests.length === 0) {
      for (const sug of suggestions.slice(0, 4)) {
        flatItems.push({ id: `sug-${sug.id}`, domId: `cp-item-sug-${sug.id}`, type: "suggestion" });
      }
    }
  } else if (response) {
    for (const group of response.groups) {
      for (const result of group.results) {
        flatItems.push({ id: `res-${result.id}`, domId: `cp-item-res-${result.id}`, type: "result" });
      }
    }
  }

  const activeItemDomId = activeIndex >= 0 && activeIndex < flatItems.length
    ? flatItems[activeIndex]?.domId
    : undefined;

  // ── Keyboard handler ──────────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => {
        if (i <= 0) { inputRef.current?.focus(); return -1; }
        return i - 1;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex < 0) return;
      const item = flatItems[activeIndex];
      if (!item) return;
      document.getElementById(item.domId)?.click();
    }
  }, [flatItems, activeIndex, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (activeItemDomId) {
      document.getElementById(activeItemDomId)?.scrollIntoView({ block: "nearest" });
    }
  }, [activeItemDomId]);

  // ── Close on outside click ────────────────────────────────────────────────

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  // ── Action handlers ───────────────────────────────────────────────────────

  function handleNavigate(path: string, resultLabel?: string) {
    if (resultLabel) {
      globalSearchService.addRecentDestination(resultLabel, path);
    }
    onClose();
    navigate(path);
  }

  function handleResultSelect(result: GlobalSearchResult) {
    if (result.availability !== "available" && result.availability !== "stale") return;
    if (result.demonstrationOnly) {
      globalSearchService.addRecentDestination(result.title, result.destination.path);
    }
    if (query.trim().length >= 2) {
      globalSearchService.addRecentQuery(query.trim(), scope === "all" ? undefined : scope);
    }
    setRecentQueries(globalSearchService.getRecentQueries());
    setRecentDests(globalSearchService.getRecentDestinations());
    onClose();
    navigate(result.destination.path);
  }

  function handleCommandSelect(cmd: CommandPaletteCommand) {
    if (cmd.destination) {
      handleNavigate(cmd.destination.path, cmd.label);
    }
  }

  function handleQuerySelect(q: string, sc?: GlobalSearchScope) {
    setQuery(q);
    if (sc) setScope(sc);
    setTimeout(() => inputRef.current?.focus(), 10);
  }

  function handleDestSelect(path: string) {
    handleNavigate(path);
  }

  function handlePinToggle(cmdId: string) {
    const isPinned = pinnedIds.includes(cmdId);
    if (isPinned) {
      globalSearchService.unpinCommand(cmdId);
    } else {
      globalSearchService.pinCommand(cmdId);
    }
    setPinnedIds(globalSearchService.getPinnedCommandIds());
  }

  function handleRemoveRecentQuery(id: string) {
    globalSearchService.removeRecentQuery(id as Parameters<typeof globalSearchService.removeRecentQuery>[0]);
    setRecentQueries(globalSearchService.getRecentQueries());
    setSuggestions(globalSearchService.getSuggestions());
  }

  function handleScopeChange(s: GlobalSearchScope) {
    setScope(s);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  // ── No results ────────────────────────────────────────────────────────────

  const hasResults = !!response && response.groups.length > 0;
  const noResults  = isQuerying && !isSearching && response && response.groups.length === 0;

  // ── Pinned commands for no-query state ───────────────────────────────────
  const pinnedCommands = commands.filter((c) => pinnedIds.includes(c.id) && c.isPinnable);

  if (!open) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={handleBackdropClick}
        style={{
          position: "fixed", inset: 0, zIndex: Z.palette,
          background: "rgba(7,17,31,0.75)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        id={dialogId}
        aria-label="Command palette"
        aria-modal
        onKeyDown={handleKeyDown}
        style={{
          position: "fixed", zIndex: Z.palette + 1,
          top: 0, left: 0, right: 0, bottom: 0,
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "60px 16px 16px",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "100%", maxWidth: 600,
            background: "#0B1829",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            overflow: "hidden",
            display: "flex", flexDirection: "column",
            maxHeight: "calc(100vh - 120px)",
            pointerEvents: "all",
          }}
          className="cp-panel"
        >
          {/* Search input row */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}>
            <Search size={16} aria-hidden style={{ color: SILVER, flexShrink: 0 }} />
            <input
              ref={inputRef}
              id={inputId}
              type="search"
              role="combobox"
              aria-expanded={flatItems.length > 0}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={activeItemDomId}
              aria-label="Search or navigate"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" && flatItems.length > 0) {
                  e.preventDefault();
                  setActiveIndex(0);
                } else {
                  handleKeyDown(e);
                }
              }}
              placeholder="Search documents, contacts, settings…"
              autoComplete="off"
              spellCheck={false}
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                ...GF, fontSize: 15, color: "#F8FAFC",
                caretColor: AZURE,
              }}
            />
            {query && (
              <button
                onClick={() => { setQuery(""); setActiveIndex(-1); inputRef.current?.focus(); }}
                aria-label="Clear search"
                style={{ background: "none", border: "none", cursor: "pointer", color: SLATE, padding: 4, display: "flex" }}
              >
                <X size={14} aria-hidden />
              </button>
            )}
            <kbd
              onClick={onClose}
              title="Close"
              aria-label="Press Escape to close"
              style={{
                ...GF, fontSize: 11, color: SLATE, cursor: "pointer",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 4, padding: "2px 6px", fontFamily: "monospace",
              }}
            >
              Esc
            </kbd>
          </div>

          {/* Scope tabs — only shown when actively querying */}
          {isQuerying && (
            <div
              role="tablist"
              aria-label="Search scope"
              style={{
                display: "flex", gap: 0, overflowX: "auto",
                padding: "0 12px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                scrollbarWidth: "none",
              }}
            >
              {VALID_SEARCH_SCOPES.map((sc) => (
                <button
                  key={sc}
                  role="tab"
                  aria-selected={scope === sc}
                  onClick={() => handleScopeChange(sc)}
                  style={{
                    ...GF, fontSize: 12, fontWeight: scope === sc ? 600 : 400,
                    color: scope === sc ? AZURE : SILVER,
                    background: "none", border: "none", cursor: "pointer",
                    padding: "8px 10px",
                    borderBottom: `2px solid ${scope === sc ? AZURE : "transparent"}`,
                    whiteSpace: "nowrap", flexShrink: 0,
                    transition: "color 0.15s, border-color 0.15s",
                  }}
                >
                  {SEARCH_SCOPE_LABELS[sc]}
                </button>
              ))}
            </div>
          )}

          {/* Demo notice — always shown */}
          <DemoNotice />

          {/* Results body */}
          <div
            id={listboxId}
            style={{ overflowY: "auto", flex: 1, minHeight: 0 }}
            aria-live="polite"
            aria-atomic="false"
            aria-label="Search results"
          >
            {/* Loading */}
            {isSearching && (
              <div role="status" aria-live="polite" style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "28px 16px", gap: 10, color: SILVER,
              }}>
                <span style={{ ...GF, fontSize: 13 }}>Searching…</span>
              </div>
            )}

            {/* No results */}
            {noResults && !isSearching && (
              <div role="status" style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "28px 16px", gap: 8,
              }}>
                <AlertTriangle size={24} aria-hidden style={{ color: SLATE }} />
                <span style={{ ...GF, fontSize: 14, color: SILVER }}>
                  No results for <strong style={{ color: "#F8FAFC" }}>"{query.trim()}"</strong>
                </span>
                {scope !== "all" && (
                  <button
                    onClick={() => handleScopeChange("all")}
                    style={{ ...GF, fontSize: 13, color: AZURE, background: "none", border: "none", cursor: "pointer" }}
                  >
                    Search all sections instead
                  </button>
                )}
                <span style={{ ...GF, fontSize: 12, color: SLATE }}>
                  Try different keywords or{" "}
                  <button
                    onClick={() => navigate(`/app/search?q=${encodeURIComponent(query.trim())}`)}
                    style={{ ...GF, fontSize: 12, color: AZURE, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    open full search
                  </button>
                </span>
              </div>
            )}

            {/* Query results */}
            {isQuerying && hasResults && !isSearching && response && (
              <ResultsState
                response={response}
                activeIndex={activeIndex}
                flatItems={flatItems}
                setActiveIndex={setActiveIndex}
                onResultSelect={handleResultSelect}
                query={query.trim()}
              />
            )}

            {/* No-query state */}
            {!isQuerying && (
              <NoQueryState
                recentQueries={recentQueries}
                recentDests={recentDests}
                pinnedCommands={pinnedCommands}
                commandsByGroup={commandsByGroup}
                suggestions={suggestions}
                pinnedIds={pinnedIds}
                activeIndex={activeIndex}
                onQuerySelect={handleQuerySelect}
                onDestSelect={handleDestSelect}
                onCommandSelect={handleCommandSelect}
                onPinToggle={handlePinToggle}
                onRemoveRecent={handleRemoveRecentQuery}
                flatItems={flatItems}
                setActiveIndex={setActiveIndex}
              />
            )}
          </div>

          {/* Footer */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 16px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            flexWrap: "wrap", gap: 8,
          }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                ["↑↓", "Navigate"],
                ["↵", "Open"],
                ["Esc", "Close"],
              ].map(([key, label]) => (
                <span key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <kbd style={{
                    ...GF, fontFamily: "monospace", fontSize: 10,
                    color: SILVER, background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 3, padding: "1px 4px",
                  }}>{key}</kbd>
                  <span style={{ ...GF, fontSize: 11, color: SLATE }}>{label}</span>
                </span>
              ))}
            </div>
            <button
              onClick={() => {
                onClose();
                navigate(`/app/search${query ? `?q=${encodeURIComponent(query.trim())}` : ""}`);
              }}
              style={{
                ...GF, fontSize: 11, color: AZURE,
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 3,
              }}
            >
              Open full search
              <ChevronRight size={11} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .cp-panel { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
        @media (max-width: 639px) {
          .cp-panel {
            border-radius: 0 !important;
            max-height: 100vh !important;
          }
        }
      `}</style>
    </>
  );
}

// Backward-compatible re-export — anything still importing SearchDialog gets CommandPalette
export { CommandPalette as SearchDialog };

// Global search dialog — Ctrl+K or click to open.
// Uses local mock data only. No server requests.

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { Search, FileText, Files, Users, HelpCircle, X } from "lucide-react";
import { mockSearchService } from "../../services/mock/search.service";
import type { SearchResultGroup, SearchResult } from "../../models";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const BORDER = "rgba(255,255,255,0.08)";

const TYPE_ICONS: Record<SearchResult["type"], React.ElementType> = {
  document: FileText,
  template: Files,
  contact:  Users,
  help:     HelpCircle,
};

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery]     = useState("");
  const [groups, setGroups]   = useState<SearchResultGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActive] = useState(-1);
  const inputRef   = useRef<HTMLInputElement>(null);
  const navigate   = useNavigate();

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setGroups([]);
      setActive(-1);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Search on query change
  useEffect(() => {
    if (query.length < 2) { setGroups([]); return; }
    let cancelled = false;
    setLoading(true);
    mockSearchService.search(query).then((results) => {
      if (!cancelled) { setGroups(results); setLoading(false); setActive(-1); }
    });
    return () => { cancelled = true; };
  }, [query]);

  // Flatten results for keyboard navigation
  const allItems: SearchResult[] = groups.flatMap((g) => g.items);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0 && allItems[activeIdx]) {
      navigate(allItems[activeIdx].path);
      onClose();
    }
  }, [allItems, activeIdx, navigate, onClose]);

  if (!open) return null;

  const showEmpty = query.length >= 2 && !loading && groups.length === 0;
  let globalIdx = -1;

  return (
    <div
      role="dialog"
      aria-label="Search"
      aria-modal
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: 80,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
        aria-hidden
      />

      {/* Panel */}
      <div
        style={{
          position: "relative", zIndex: 1,
          width: "100%", maxWidth: 560,
          background: "#0B1929",
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
      >
        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
          <Search size={18} style={{ color: "#475569", flexShrink: 0 }} aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search documents, templates, contacts…"
            aria-label="Search"
            aria-autocomplete="list"
            aria-controls="search-results"
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "white", ...GF, fontSize: 15,
              fontFamily: "'Geist', sans-serif",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", padding: 2 }}
            >
              <X size={16} aria-hidden />
            </button>
          )}
          <kbd style={{ ...GM, fontSize: 11, color: "#334155", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "2px 6px" }}>
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div id="search-results" role="listbox" aria-label="Search results" style={{ maxHeight: 420, overflowY: "auto" }}>
          {loading && (
            <div style={{ padding: "20px 16px", color: "#475569", ...GF, fontSize: 13 }} role="status" aria-live="polite">
              Searching…
            </div>
          )}

          {showEmpty && (
            <div style={{ padding: "24px 16px", textAlign: "center" }}>
              <p style={{ color: "#475569", ...GF, fontSize: 14, margin: "0 0 4px" }}>No results for "{query}"</p>
              <p style={{ color: "#334155", ...GF, fontSize: 12, margin: 0 }}>Try a different search term.</p>
            </div>
          )}

          {query.length < 2 && !loading && (
            <div style={{ padding: "16px" }}>
              <p style={{ color: "#334155", ...GM, fontSize: 10, letterSpacing: "0.06em", margin: "0 0 10px" }}>QUICK TIPS</p>
              {[
                "Search by document title or status",
                "Find contacts by name or organisation",
                "Search for templates by name",
              ].map((tip) => (
                <div key={tip} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <Search size={12} style={{ color: "#334155" }} aria-hidden />
                  <span style={{ color: "#475569", ...GF, fontSize: 12 }}>{tip}</span>
                </div>
              ))}
            </div>
          )}

          {groups.map((group) => (
            <div key={group.type}>
              <div style={{ padding: "8px 14px 4px" }}>
                <span style={{ color: "#334155", ...GM, fontSize: 10, letterSpacing: "0.06em", fontWeight: 600 }}>
                  {group.label.toUpperCase()}
                </span>
              </div>
              {group.items.map((item) => {
                globalIdx++;
                const idx = globalIdx;
                const isActive = idx === activeIdx;
                const Icon = TYPE_ICONS[item.type];
                return (
                  <button
                    key={item.id}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => { navigate(item.path); onClose(); }}
                    onMouseEnter={() => setActive(idx)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "9px 14px",
                      background: isActive ? "rgba(0,120,212,0.12)" : "transparent",
                      border: "none", cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={14} style={{ color: "#64748b" }} aria-hidden />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 500, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p style={{ color: "#475569", ...GF, fontSize: 11, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                    <span style={{ color: "#334155", ...GM, fontSize: 10 }}>↵</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{ padding: "8px 16px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ color: "#334155", ...GM, fontSize: 10 }}>↑↓ navigate</span>
          <span style={{ color: "#334155", ...GM, fontSize: 10 }}>↵ select</span>
          <span style={{ color: "#334155", ...GM, fontSize: 10 }}>Esc close</span>
          <span style={{ marginLeft: "auto", color: "#1E293B", ...GM, fontSize: 10 }}>Searches mock data only</span>
        </div>
      </div>
    </div>
  );
}

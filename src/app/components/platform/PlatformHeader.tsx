// Platform top bar — shown in the authenticated shell on desktop/tablet.
// Contains: breadcrumb / page title, search trigger, notification bell, help link.

import { useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router";
import { Search, HelpCircle } from "lucide-react";
import { Link } from "react-router";
import { NotificationMenu } from "./NotificationMenu";
import { SearchDialog } from "./SearchDialog";

const GF    = { fontFamily: "'Geist', sans-serif" };
const BORDER = "rgba(255,255,255,0.07)";

interface PlatformHeaderProps {
  pageTitle?: string;
}

// Derive a readable page title from the URL path
function deriveTitle(pathname: string): string {
  const parts = pathname.replace(/^\/app\/?/, "").split("/").filter(Boolean);
  if (parts.length === 0) return "Dashboard";
  return parts
    .map((p) => p.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(" › ");
}

export function PlatformHeader({ pageTitle }: PlatformHeaderProps) {
  const { pathname } = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const title = pageTitle ?? deriveTitle(pathname);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // Keyboard shortcut: Ctrl+K / Cmd+K opens search
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header
        aria-label="Platform header"
        style={{
          position: "sticky", top: 0, zIndex: 40,
          height: 52,
          background: "rgba(248,250,252,0.95)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #E2E8F0",
          display: "flex", alignItems: "center",
          padding: "0 20px", gap: 12,
        }}
      >
        {/* Page title / breadcrumb */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              color: "#0F172A",
              ...GF,
              fontSize: 15,
              fontWeight: 700,
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </h1>
        </div>

        {/* Search button */}
        <button
          onClick={openSearch}
          aria-label="Open search (Ctrl+K)"
          title="Search (Ctrl+K)"
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#F1F5F9", border: "1px solid #E2E8F0",
            borderRadius: 8, padding: "6px 10px",
            color: "#64748B", cursor: "pointer",
            ...GF, fontSize: 13,
            minHeight: 36, minWidth: 36,
          }}
          className="header-search-btn"
        >
          <Search size={14} aria-hidden />
          <span style={{ display: "none" }} className="search-label">Search…</span>
          <kbd style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, color: "#94A3B8", display: "none" }} className="search-kbd">
            ⌘K
          </kbd>
        </button>

        {/* Notification bell */}
        <div style={{ color: "#64748B" }}>
          <NotificationMenu align="right" />
        </div>

        {/* Help */}
        <Link
          to="/help"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Help Center (opens in new tab)"
          title="Help Center"
          style={{ color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, textDecoration: "none" }}
          className="header-help-btn"
        >
          <HelpCircle size={18} aria-hidden />
        </Link>
      </header>

      <SearchDialog open={searchOpen} onClose={closeSearch} />

      <style>{`
        .header-search-btn:hover { background: #E2E8F0 !important; }
        .header-search-btn:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
        .header-help-btn:hover { color: #0078D4 !important; background: rgba(0,120,212,0.08) !important; }
        .header-help-btn:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
        @media (min-width: 640px) {
          .search-label { display: inline !important; }
          .search-kbd { display: inline !important; }
        }
      `}</style>
    </>
  );
}

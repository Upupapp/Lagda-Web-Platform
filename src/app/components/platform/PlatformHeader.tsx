// Platform top bar — shown in the authenticated shell on desktop/tablet.
// Contains: breadcrumb / page title, search trigger, notification bell, help link.

import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { useLocation } from "react-router";
import { Search, HelpCircle, Compass } from "lucide-react";
import { Link } from "react-router";
import { NotificationMenu } from "./NotificationMenu";
import { useTour } from "../../tour/TourContext";
// Lazily loaded. The palette reaches the global search service, which builds
// providers over every domain and therefore imports the transaction, template,
// contact, workflow, collaboration and automation fixtures. Statically importing
// it here put all of that in the entry chunk for every user on every page,
// whether or not they ever press Ctrl+K.
const CommandPalette = lazy(() =>
  import("./CommandPalette").then(m => ({ default: m.CommandPalette })),
);
import { Z } from "../../utils/z-index";
import { isPaletteShortcut, paletteShortcutLabel } from "../../utils/keyboard-shortcuts";

const GF    = { fontFamily: "'Geist', sans-serif" };

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
  const { restartTour } = useTour();

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // Ctrl+K / ⌘K toggles the palette. See utils/keyboard-shortcuts for why
  // the comparison is case-insensitive.
  const shortcut = paletteShortcutLabel();
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (isPaletteShortcut(e)) {
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
          position: "sticky", top: 0, zIndex: Z.shell,
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
          aria-label={`Open search (${shortcut})`}
          title={`Search (${shortcut})`}
          aria-keyshortcuts="Control+K Meta+K"
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#F1F5F9", border: "1px solid #E2E8F0",
            borderRadius: 8, padding: "6px 10px",
            color: "#64748B", cursor: "pointer",
            ...GF, fontSize: 13,
            minHeight: 44, minWidth: 44,
          }}
          className="header-search-btn"
          data-guide="header-search-btn"
        >
          <Search size={14} aria-hidden />
          <span style={{ display: "none" }} className="search-label">Search…</span>
          {/* #5B6776, not #94A3B8. The muted slate is correct on the dark
              navy sidebar (7.39:1) and quietly wrong on this light control:
              #94A3B8 on #F1F5F9 is 2.34:1, which fails AA even for large
              text, and this is 10px. #5B6776 is 5.26:1 and still reads as a
              hint rather than as a label. */}
          <kbd style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, color: "#5B6776", display: "none" }} className="search-kbd">
            {shortcut}
          </kbd>
        </button>

        {/* Notification bell */}
        <div style={{ color: "#64748B" }} data-guide="header-notification-bell">
          <NotificationMenu align="right" />
        </div>

        {/* Restart tour */}
        <button
          onClick={restartTour}
          aria-label="Restart product tour"
          title="Restart product tour"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 44, height: 44, borderRadius: 8,
            background: "transparent", border: "none",
            color: "#94A3B8", cursor: "pointer",
          }}
          className="header-help-btn"
          data-guide="header-restart-tour-btn"
        >
          <Compass size={18} aria-hidden />
        </button>

        {/* Help */}
        <Link
          to="/help"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Help Center (opens in new tab)"
          title="Help Center"
          style={{ color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 8, textDecoration: "none" }}
          className="header-help-btn"
          data-guide="header-help-link"
        >
          <HelpCircle size={18} aria-hidden />
        </Link>
      </header>

      {searchOpen && (
        <Suspense fallback={null}>
          <CommandPalette open={searchOpen} onClose={closeSearch} />
        </Suspense>
      )}

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

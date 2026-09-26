// The Manage workspace shell — mounted ONCE for /app/workspace/*.
//
// ── What it owns ───────────────────────────────────────────────────────────
//
// The workspace header (initials, name, the viewer's role) and a single row
// of section banners. Every Manage page renders inside the content area
// below the row, through <Outlet/>: the pages keep their own content and
// actions, and their title becomes the section heading (see ManagePage in
// real/manage-ui.tsx) instead of a second page header.
//
// ── Why a route layout ─────────────────────────────────────────────────────
//
// Each section used to be a page with its own header, so moving between
// them rebuilt the whole screen. As a layout route the header and banners
// stay mounted, only the content area changes, and the URL still decides
// what is shown — so deep links, reloads and browser back/forward all work
// exactly as before. PlatformLayout keys its page wrapper so that moving
// within /app/workspace does not remount this shell (see pageKeyFor there).
//
// ── Counts ─────────────────────────────────────────────────────────────────
//
// With a real backend the counts are the overview's own figures, loaded once
// here and shared with the Overview section through context. They are asked
// for only when the viewer's role may read them, and re-read whenever the
// section changes, so a decision made on one page shows on the banners by
// the time you look at them. The demo build reads the demo services.

import {
  Suspense, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Link, Outlet, useLocation } from "react-router";
import { usePlatform } from "../../../../context/PlatformContext";
import { useWorkspaceAccess, useWorkspaceMode, backendRoleFromPlatform, type WorkspaceAccess } from "../../../../hooks/useWorkspaceAccess";
import { REAL_ROLE_LABELS } from "../../../../services/real/workspace-admin.service";
import { mockWorkspaceAdminService } from "../../../../services/mock/workspace-admin.service";
import { listJoinRequests, listJoinTickets } from "../../../../services/real/workspace-join.service";
import { memberRoleLabel } from "../../../../models/workspace-admin";
import {
  useRealOverviewData, overviewGates, bannerCountsOf, initialsOf,
  type BannerCounts, type Count, type OverviewData,
} from "../real/overview-data";
import { WorkspaceShellContext, type WorkspaceShellValue } from "./workspace-shell-context";
import {
  sectionKeyForPath, isSectionDetailPath, visibleSections,
  type WorkspaceSection, type WorkspaceSectionKey,
} from "./sections";

const NAVY = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER = "#8A9BAE";
const BORDER = "#E3E8EF";
const LIGHT = "#F0F7FF";

// ── Entry ──────────────────────────────────────────────────────────────────

export function WorkspaceShell() {
  const { isReal, workspaceId } = useWorkspaceMode();
  if (isReal && workspaceId !== null) return <RealWorkspaceShell key={workspaceId} workspaceId={workspaceId} />;
  return <DemoWorkspaceShell />;
}

/**
 * A key that changes whenever the section does (so counts are re-read on
 * arrival) or when a page asks for it.
 */
function useSectionRefreshKey(): [string, () => void] {
  const { pathname } = useLocation();
  const section = sectionKeyForPath(pathname) ?? "overview";
  const [manual, setManual] = useState(0);
  const refresh = useCallback(() => { setManual(n => n + 1); }, []);
  return [`${section}:${String(manual)}`, refresh];
}

function RealWorkspaceShell({ workspaceId }: { workspaceId: string }) {
  const platform = usePlatform();
  const access = useWorkspaceAccess();
  const [refreshKey, refresh] = useSectionRefreshKey();
  const data = useRealOverviewData(workspaceId, overviewGates(access), true, refreshKey);

  const name = data.name ?? platform.currentWorkspace?.name ?? "Workspace";
  const role = access.role;
  // A member who cannot read the roster still gets their own title from /access.
  const roleLabel = data.me ? memberRoleLabel(data.me)
    : access.roleTitle ?? (role ? REAL_ROLE_LABELS[role] : "—");

  return (
    <ShellFrame name={name} roleLabel={roleLabel} access={access}
      counts={bannerCountsOf(data)} realOverview={data} refreshCounts={refresh} demo={false} />
  );
}

interface DemoFigures { name: string | null; initials: string | null; counts: BannerCounts }

const DEMO_LOADING: DemoFigures = {
  name: null, initials: null,
  counts: { members: null, joinRequests: null, invitations: null, joinLinks: null },
};

/** The demo build's figures: the fictional workspace and the demo join store. */
function useDemoFigures(refreshKey: string): DemoFigures {
  const [figures, setFigures] = useState<DemoFigures>(DEMO_LOADING);
  useEffect(() => {
    let cancelled = false;
    const patch = (next: { name?: string; initials?: string; counts?: Partial<BannerCounts> }) => {
      if (cancelled) return;
      setFigures(f => ({ ...f, ...next, counts: { ...f.counts, ...next.counts } }));
    };
    mockWorkspaceAdminService.getWorkspace()
      .then(({ workspace }) => {
        patch({ name: workspace.name, initials: workspace.initials,
          counts: { members: workspace.activeMembers, invitations: workspace.pendingInvitations } });
      })
      .catch(() => { patch({ counts: { members: "error", invitations: "error" } }); });
    listJoinRequests("demo", "pending")
      .then(list => { patch({ counts: { joinRequests: list.length } }); })
      .catch(() => { patch({ counts: { joinRequests: "error" } }); });
    listJoinTickets("demo")
      .then(list => { patch({ counts: { joinLinks: list.filter(t => t.state === "sent" && t.usedAt === null && t.request === null).length } }); })
      .catch(() => { patch({ counts: { joinLinks: "error" } }); });
    return () => { cancelled = true; };
  }, [refreshKey]);
  return figures;
}

function DemoWorkspaceShell() {
  const platform = usePlatform();
  const access = useWorkspaceAccess();
  const [refreshKey, refresh] = useSectionRefreshKey();
  const figures = useDemoFigures(refreshKey);
  const role = backendRoleFromPlatform(platform.role);
  const name = figures.name ?? platform.currentWorkspace?.name ?? "Workspace";
  return (
    <ShellFrame name={name} initials={figures.initials ?? undefined}
      roleLabel={role ? REAL_ROLE_LABELS[role] : "Member"} access={access}
      counts={figures.counts} realOverview={null} refreshCounts={refresh} demo />
  );
}

// ── Frame ──────────────────────────────────────────────────────────────────

function ShellFrame({ name, initials, roleLabel, access, counts, realOverview, refreshCounts, demo }: {
  name: string; initials?: string; roleLabel: string; access: WorkspaceAccess; counts: BannerCounts;
  realOverview: OverviewData | null; refreshCounts: () => void; demo: boolean;
}) {
  const location = useLocation();
  const current = sectionKeyForPath(location.pathname);
  const sections = visibleSections(access, current);
  const focusedPath = useRef(location.pathname);

  const value = useMemo<WorkspaceShellValue>(
    () => ({ realOverview, refreshCounts, focusedPath }),
    [realOverview, refreshCounts],
  );

  return (
    <WorkspaceShellContext.Provider value={value}>
      <div className="ws-shell" data-testid="workspace-shell">
        <header className="ws-shell-header">
          <div className="ws-shell-inner">
            <div className="ws-identity">
              <div aria-hidden className="ws-initials">{initials ?? initialsOf(name)}</div>
              <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                <div className="ws-eyebrow">Manage workspace</div>
                <h1 data-testid="workspace-name" className="ws-name">{name}</h1>
                <div className="ws-role">
                  You are <strong data-testid="your-role" style={{ color: NAVY }}>{roleLabel}</strong> in this workspace
                </div>
              </div>
              {demo && <span className="ws-demo-pill">Demonstration</span>}
            </div>
            <SectionBanners sections={sections} current={current}
              detail={isSectionDetailPath(location.pathname)} counts={counts} />
          </div>
        </header>

        <div className="ws-shell-inner ws-shell-content">
          {/* Only this area waits for a section's code. The header and the
              banners above it never unmount. */}
          <Suspense fallback={<SectionSkeleton />}>
            <div key={location.pathname} className="ws-section-enter">
              <Outlet />
            </div>
          </Suspense>
        </div>

        <style>{SHELL_CSS}</style>
      </div>
    </WorkspaceShellContext.Provider>
  );
}

function SectionSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading section" data-testid="workspace-section-loading">
      <div className="lagda-skeleton" style={{ height: 26, width: 220, maxWidth: "60%", background: "#E2E8F0", borderRadius: 8, marginBottom: 20 }} />
      {[120, 220].map(h => (
        <div key={h} className="lagda-skeleton" style={{ height: h, background: "#E9EEF4", borderRadius: 12, marginBottom: 16 }} />
      ))}
    </div>
  );
}

// ── Banners ────────────────────────────────────────────────────────────────

function countText(count: Count): string | null {
  if (count === null || count === "error") return null;
  return String(count);
}

function SectionBanners({ sections, current, detail, counts }: {
  sections: WorkspaceSection[]; current: WorkspaceSectionKey | null; detail: boolean; counts: BannerCounts;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [fade, setFade] = useState({ left: false, right: false });
  const activeIndex = Math.max(0, sections.findIndex(s => s.key === current));
  // Roving tab stop: Tab enters the row once, on the current section; the
  // arrow keys move between banners inside it.
  const [rove, setRove] = useState(activeIndex);
  const labelId = useId();

  useEffect(() => { setRove(activeIndex); }, [activeIndex]);

  const measure = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setFade(f => {
      const next = { left: el.scrollLeft > 2, right: max - el.scrollLeft > 2 };
      return next.left === f.left && next.right === f.right ? f : next;
    });
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(measure);
      observer.observe(el);
    } else {
      window.addEventListener("resize", measure);
    }
    return () => {
      el.removeEventListener("scroll", measure);
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, sections.length]);

  // Keep the current banner in view on a scrolling row. The row is scrolled
  // directly rather than with scrollIntoView, which can also scroll the page.
  useLayoutEffect(() => {
    const el = listRef.current;
    const active = el?.querySelector<HTMLElement>('[data-active="true"]');
    if (!el || !active || el.scrollWidth <= el.clientWidth) return;
    const a = active.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (a.left >= r.left + 8 && a.right <= r.right - 8) return;
    const target = el.scrollLeft + (a.left - r.left) - (r.width - a.width) / 2;
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (typeof el.scrollTo === "function") el.scrollTo({ left: Math.max(0, target), behavior: reduce ? "auto" : "smooth" });
    else el.scrollLeft = Math.max(0, target);
  }, [current, sections.length]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLUListElement>) => {
    const links = Array.from(listRef.current?.querySelectorAll<HTMLAnchorElement>("a[data-ws-banner]") ?? []);
    const i = links.findIndex(l => l === document.activeElement);
    if (i < 0 || links.length === 0) return;
    let next: number;
    if (e.key === "ArrowRight") next = (i + 1) % links.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + links.length) % links.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = links.length - 1;
    else return;
    e.preventDefault();
    setRove(next);
    links[next]?.focus();
  };

  return (
    <nav aria-labelledby={labelId} className="ws-strip"
      data-fade-left={fade.left ? "true" : undefined} data-fade-right={fade.right ? "true" : undefined}>
      <span id={labelId} className="ws-visually-hidden">Workspace sections</span>
      <ul ref={listRef} className="ws-tabs" onKeyDown={onKeyDown} data-testid="workspace-banners">
        {sections.map((s, i) => {
          const active = s.key === current;
          const count = s.countKey ? countText(counts[s.countKey]) : null;
          const attention = s.attention === true && count !== null && count !== "0";
          return (
            <li key={s.key}>
              <Banner section={s} active={active} exact={active && !detail} count={count}
                attention={attention} tabIndex={i === rove ? 0 : -1} onFocus={() => { setRove(i); }} />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Banner({ section, active, exact, count, attention, tabIndex, onFocus }: {
  section: WorkspaceSection; active: boolean; exact: boolean; count: string | null;
  attention: boolean; tabIndex: number; onFocus: () => void;
}) {
  const Icon = section.icon;
  const countLabel = count === null ? null
    : section.key === "join-requests" ? `${count} waiting`
    : section.key === "invitations" ? `${count} pending`
    : section.key === "join-links" ? `${count} active`
    : `${count} total`;
  return (
    <Link to={section.path} data-ws-banner="" data-testid={`banner-${section.key}`}
      data-active={active ? "true" : "false"} aria-current={exact ? "page" : active ? "true" : undefined}
      // The count is read with the label ("Join requests, 2 waiting"); the
      // badge itself is decoration.
      aria-label={countLabel === null ? undefined : `${section.label}, ${countLabel}`}
      title={section.hint} tabIndex={tabIndex} onFocus={onFocus} className="ws-tab">
      <span aria-hidden className="ws-tab-icon"><Icon size={17} strokeWidth={1.9} /></span>
      <span className="ws-tab-label">{section.label}</span>
      {count !== null && (
        <span aria-hidden className="ws-tab-count" data-tone={attention ? "attention" : undefined}
          data-testid={`banner-count-${section.key}`}>{count}</span>
      )}
      <span aria-hidden className="ws-tab-bar" />
    </Link>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
//
// A style block rather than inline objects because the banner row changes
// SHAPE at two widths, and that has to be right on the first paint: a hook
// reading the viewport would render the desktop row on a phone for a frame.

const SHELL_CSS = `
.ws-shell { background: #F8FAFC; min-height: 100%; padding-bottom: 48px; overflow-x: clip; }
.ws-shell-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; box-sizing: border-box; min-width: 0; }
.ws-shell-header { position: relative; background: #FFFFFF; border-bottom: 1px solid ${BORDER}; padding: 22px 0 18px; }
.ws-shell-header::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, ${NAVY} 0%, #0B3A66 45%, ${AZURE} 100%); }
.ws-identity { display: flex; align-items: center; gap: 14px; min-width: 0; margin-bottom: 18px; }
.ws-initials { width: 46px; height: 46px; border-radius: 12px; background: ${LIGHT}; border: 1.5px solid #BAD7F5; color: ${AZURE};
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  font-family: 'Geist Mono', monospace; font-size: 14px; font-weight: 700; letter-spacing: 0.02em; }
.ws-eyebrow { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 600; color: ${SILVER}; text-transform: uppercase; letter-spacing: 0.1em; }
.ws-name { font-family: 'Geist', sans-serif; font-size: 22px; font-weight: 800; color: ${NAVY}; margin: 2px 0 0; line-height: 1.2; overflow-wrap: anywhere; }
.ws-role { font-family: 'Geist', sans-serif; font-size: 13px; color: ${SLATE}; margin-top: 3px; }
.ws-demo-pill { flex-shrink: 0; align-self: flex-start; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: #92400E; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 999px; padding: 3px 9px; }
.ws-visually-hidden { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

.ws-strip { position: relative; min-width: 0; background: linear-gradient(180deg, #F7FAFD 0%, #EEF3F8 100%); border: 1.5px solid ${BORDER}; border-radius: 12px; padding: 3px; }
/* The 3px of list padding is room for the focus ring and the active shadow,
   which the scrolling list would otherwise clip. */
.ws-tabs { list-style: none; margin: 0; padding: 3px; display: flex; gap: 6px; min-width: 0;
  overflow-x: auto; overflow-y: hidden; scrollbar-width: none; -ms-overflow-style: none; scroll-snap-type: x proximity; overscroll-behavior-x: contain;
  --ws-fade-l: 0px; --ws-fade-r: 0px;
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 var(--ws-fade-l), #000 calc(100% - var(--ws-fade-r)), transparent 100%);
  mask-image: linear-gradient(to right, transparent 0, #000 var(--ws-fade-l), #000 calc(100% - var(--ws-fade-r)), transparent 100%); }
.ws-tabs::-webkit-scrollbar { display: none; }
.ws-strip[data-fade-left] .ws-tabs { --ws-fade-l: 28px; }
.ws-strip[data-fade-right] .ws-tabs { --ws-fade-r: 28px; }
.ws-tabs > li { flex: 1 1 0; min-width: 76px; scroll-snap-align: center; display: flex; }

.ws-tab { position: relative; flex: 1 1 auto; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px;
  min-height: 78px; padding: 10px 6px 13px; border-radius: 9px; border: 1.5px solid transparent; background: transparent;
  text-decoration: none; color: ${NAVY}; outline: none; -webkit-tap-highlight-color: transparent;
  transition: background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, color 160ms ease; }
.ws-tab:hover { background: rgba(255,255,255,0.85); border-color: #D5DEE8; }
.ws-tab:focus-visible { box-shadow: 0 0 0 3px rgba(0,120,212,0.35); border-color: ${AZURE}; }
.ws-tab[data-active="true"] { background: #FFFFFF; border-color: #BAD7F5; color: ${AZURE};
  box-shadow: 0 1px 2px rgba(7,17,31,0.06), 0 6px 16px -8px rgba(0,120,212,0.35); }
.ws-tab[data-active="true"]:focus-visible { box-shadow: 0 0 0 3px rgba(0,120,212,0.35); }
.ws-tab-icon { width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  background: #FFFFFF; border: 1px solid #DCE4ED; color: #2F4A66; transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease; }
.ws-tab:hover .ws-tab-icon { border-color: #BAD7F5; color: ${AZURE}; }
.ws-tab[data-active="true"] .ws-tab-icon { background: ${AZURE}; border-color: ${AZURE}; color: #FFFFFF; }
.ws-tab-label { font-family: 'Geist', sans-serif; font-size: 12.5px; font-weight: 600; line-height: 1.25; text-align: center; letter-spacing: 0.005em; }
.ws-tab-count { position: absolute; top: 6px; right: 6px; box-sizing: border-box; min-width: 20px; height: 18px; padding: 0 6px; border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 700;
  background: #E9EEF4; color: #475569; border: 1px solid transparent; }
.ws-tab[data-active="true"] .ws-tab-count { background: #E6F1FB; color: ${AZURE}; }
.ws-tab .ws-tab-count[data-tone="attention"] { background: #FFF8E1; color: #8A5A00; border-color: #F5D98B; }
.ws-tab-bar { position: absolute; left: 22%; right: 22%; bottom: 4px; height: 3px; border-radius: 3px; background: ${AZURE};
  transform: scaleX(0); transform-origin: center; transition: transform 180ms ease; }
.ws-tab[data-active="true"] .ws-tab-bar { transform: scaleX(1); }

/* 1024-1279: ten banners share a narrower column; tighten, never truncate. */
@media (min-width: 1024px) and (max-width: 1279px) {
  .ws-tabs { gap: 4px; }
  .ws-tabs > li { min-width: 66px; }
  .ws-tab { padding: 9px 4px 12px; }
  .ws-tab-label { font-size: 11.5px; }
}

/* Tablet and phone: compact horizontal banners in a scrolling, snapping row. */
@media (max-width: 1023px) {
  .ws-tabs > li { flex: 0 0 auto; min-width: 0; }
  .ws-tab { flex-direction: row; gap: 8px; min-height: 42px; padding: 0 12px 0 7px; }
  .ws-tab-icon { width: 28px; height: 28px; border-radius: 7px; }
  .ws-tab-label { white-space: nowrap; font-size: 13px; }
  .ws-tab-count { position: static; }
  .ws-tab-bar { left: 10px; right: 10px; bottom: 2px; height: 2.5px; }
}

@media (max-width: 767px) {
  .ws-shell-inner { padding: 0 16px; }
  .ws-shell-header { padding: 16px 0 12px; }
  .ws-identity { gap: 12px; margin-bottom: 14px; }
  .ws-initials { width: 40px; height: 40px; border-radius: 10px; font-size: 13px; }
  .ws-name { font-size: 20px; }
  .ws-strip { padding: 2px; }
  .ws-tab { min-height: 44px; }
}

.ws-shell-content { padding-top: 24px; min-height: 60vh; }
@media (max-width: 767px) { .ws-shell-content { padding-top: 18px; } }

/* The section heading receives focus on every section change. It is a
   programmatic target, not a control, so it takes no focus ring. */
.ws-section-heading:focus { outline: none; }

/* backwards, not both: a retained transform would make this wrapper the
   containing block for every position:fixed dialog inside a section (see
   lagda-page-enter in theme.css). */
.ws-section-enter { animation: ws-section-in 180ms cubic-bezier(0.2, 0.7, 0.2, 1) backwards; }
@keyframes ws-section-in { from { opacity: 0; translate: 0 6px; } to { opacity: 1; translate: 0 0; } }

@media (prefers-reduced-motion: reduce) {
  .ws-section-enter { animation: none; }
  .ws-tab, .ws-tab-icon, .ws-tab-bar { transition: none; }
}
`;

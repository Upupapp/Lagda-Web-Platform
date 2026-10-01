// The Workspace shell — mounted ONCE for /app/workspace/*.
//
// ── What it owns ───────────────────────────────────────────────────────────
//
// The workspace header (initials, name, the viewer's role), the gear that
// opens Workspace settings at its top right, the row of four parts
// (Overview, People, Organisation, Activity log) and, for the parts that
// have them, a row of tabs. Every page renders inside the content area
// below, through <Outlet/>: the pages keep their own content and actions,
// and their title becomes the section heading (see ManagePage in
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

import type React from "react";
import {
  Suspense, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
} from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useWorkspaceAllows } from "../../../../hooks/usePlans";
import { lastAppPage, DEFAULT_APP_PAGE } from "../../../../services/last-app-page";
import { Settings, X, Mail, Link2 } from "lucide-react";
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
  WORKSPACE_ROOT, sectionKeyForPath, locateWorkspacePath, visibleParts, visibleTabs, workspaceSettingsEntry,
  type VisiblePart, type WorkspaceLocation, type WorkspaceTab, type WorkspaceTabKey,
} from "./sections";

const NAVY = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER = "#8A9BAE";
const BORDER = "#E3E8EF";
const LIGHT = "#F0F7FF";

// ── Entry ──────────────────────────────────────────────────────────────────

/**
 * Free: there is no Workspace to manage (the side panel has no link to it), so
 * opening /app/workspace — typed in, or an old bookmark — goes straight back
 * to the page before it. Personal and Business are never moved; a plan not
 * read yet moves nobody.
 *
 * Back is the last app page this tab showed; after a typed-in URL (which
 * reloads the app) it is the browser's own Back, and Home when there is
 * nothing to go back to — or Back did not leave Workspace.
 */
function useFreeWorkspaceBounce(): boolean {
  const free = useWorkspaceAllows("personal") === false;
  const navigate = useNavigate();
  useEffect(() => {
    if (!free) return;
    const home = () => { void navigate(DEFAULT_APP_PAGE, { replace: true }); };
    const previous = lastAppPage();
    if (previous !== null) { void navigate(previous, { replace: true }); return; }
    if (window.history.length <= 1) { home(); return; }
    window.history.back();
    const fallback = window.setTimeout(home, FREE_BACK_FALLBACK_MS);
    return () => { window.clearTimeout(fallback); };
  }, [free, navigate]);
  return free;
}

/** How long Back gets to leave Workspace before Home is used instead. */
const FREE_BACK_FALLBACK_MS = 1200;

export function WorkspaceShell() {
  const { isReal, workspaceId } = useWorkspaceMode();
  const bounced = useFreeWorkspaceBounce();
  if (bounced) return null;
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
  const where = locateWorkspacePath(location.pathname);
  const parts = visibleParts(access, where);
  const currentPart = parts.find(p => p.key === where.part) ?? null;
  const onSettings = where.part === "settings";
  const tabs = onSettings ? visibleTabs("settings", access, where.tab) : currentPart?.tabs ?? [];
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
              <div className="ws-identity-text">
                <div className="ws-eyebrow">Workspace</div>
                <h1 data-testid="workspace-name" className="ws-name">{name}</h1>
                <div className="ws-role">
                  You are <strong data-testid="your-role" style={{ color: NAVY }}>{roleLabel}</strong> in this workspace
                </div>
              </div>
              {demo && <span className="ws-demo-pill">Demonstration</span>}
              <SettingsGear to={workspaceSettingsEntry(access)} active={onSettings} />
            </div>
            <PartsNav parts={parts} current={where.part} detail={where.detail || where.tab !== null} counts={counts} />
          </div>
        </header>

        <div className="ws-shell-inner ws-shell-content">
          {onSettings && <SettingsHeading />}
          {tabs.length > 0 && (
            <TabRow label={onSettings ? "Workspace settings" : `${currentPart?.label ?? "Workspace"} tabs`}
              tabs={tabs} current={where.tab} detail={where.detail} counts={counts}
              pathname={location.pathname} />
          )}
          {where.tab === "invite" && <InviteMethodSwitch pathname={location.pathname} counts={counts} />}
          {/* Only this area waits for a section's code. The header, the parts
              and the tabs above it never unmount. */}
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

// ── Workspace settings: the gear ───────────────────────────────────────────
//
// The gear is the only way into Workspace settings, and the only control in
// the header's top-right corner. Its label appears on hover and on keyboard
// focus; screen readers read it from aria-label.

function SettingsGear({ to, active }: { to: string; active: boolean }) {
  return (
    <Link to={to} className="ws-gear" data-testid="workspace-settings-gear" aria-label="Workspace Settings"
      data-active={active ? "true" : "false"} aria-current={active ? "true" : undefined}>
      <Settings size={20} strokeWidth={1.9} aria-hidden />
      <span aria-hidden className="ws-gear-tip">Workspace Settings</span>
    </Link>
  );
}

function SettingsHeading() {
  return (
    <div className="ws-settings-head" data-testid="workspace-settings-heading">
      <span aria-hidden className="ws-settings-head-icon"><Settings size={17} strokeWidth={1.9} /></span>
      <span className="ws-settings-head-text">
        <span className="ws-eyebrow">Workspace</span>
        <span className="ws-settings-head-title">Workspace Settings</span>
      </span>
      <Link to={WORKSPACE_ROOT} className="ws-settings-close" aria-label="Close Workspace Settings" data-testid="workspace-settings-close">
        <X size={18} strokeWidth={2} aria-hidden />
      </Link>
    </div>
  );
}

// ── Scrolling rows ─────────────────────────────────────────────────────────

/** Sets data-fade-left / data-fade-right on `el` while it can still scroll that way. */
function useScrollEdges(ref: React.RefObject<HTMLElement | null>, contentKey: number) {
  const [edges, setEdges] = useState({ left: false, right: false });
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges(f => {
      const next = { left: max > 2 && el.scrollLeft > 2, right: max > 2 && max - el.scrollLeft > 2 };
      return next.left === f.left && next.right === f.right ? f : next;
    });
  }, [ref]);
  useEffect(() => {
    const el = ref.current;
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
  }, [ref, measure, contentKey]);
  return edges;
}

/** Scrolls a row (never the page) so its current item is in view. */
function useKeepActiveInView(ref: React.RefObject<HTMLElement | null>, key: string | null) {
  useLayoutEffect(() => {
    const el = ref.current;
    const active = el?.querySelector<HTMLElement>('[data-active="true"]');
    if (!el || !active || el.scrollWidth <= el.clientWidth) return;
    const a = active.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (a.left >= r.left + 8 && a.right <= r.right - 8) return;
    const target = el.scrollLeft + (a.left - r.left) - (r.width - a.width) / 2;
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (typeof el.scrollTo === "function") el.scrollTo({ left: Math.max(0, target), behavior: reduce ? "auto" : "smooth" });
    else el.scrollLeft = Math.max(0, target);
  }, [ref, key]);
}

// ── Parts ──────────────────────────────────────────────────────────────────

function countText(count: Count): string | null {
  if (count === null || count === "error") return null;
  return String(count);
}

function countLabelFor(key: string, count: string): string {
  if (key === "join-requests") return `${count} waiting`;
  if (key === "invite") return `${count} pending`;
  return `${count} total`;
}

function PartsNav({ parts, current, detail, counts }: {
  parts: VisiblePart[]; current: WorkspaceLocation["part"]; detail: boolean; counts: BannerCounts;
}) {
  const labelId = useId();
  const waiting = countText(counts.joinRequests);
  return (
    <nav aria-labelledby={labelId} className="ws-parts-nav">
      <span id={labelId} className="ws-visually-hidden">Workspace</span>
      <ul className="ws-parts" data-testid="workspace-parts" style={{ "--ws-parts": String(parts.length) } as React.CSSProperties}>
        {parts.map(part => {
          const active = part.key === current;
          const Icon = part.icon;
          // People carries the requests waiting on the viewer; nothing else
          // is urgent enough for the top row.
          const badge = part.key === "people" && part.tabs.some(t => t.key === "join-requests") && waiting !== null && waiting !== "0"
            ? waiting : null;
          return (
            <li key={part.key}>
              <Link to={part.path} className="ws-part" data-ws-part="" data-testid={`part-${part.key}`}
                data-active={active ? "true" : "false"}
                aria-current={active ? (detail ? "true" : "page") : undefined}
                aria-label={badge === null ? undefined : `${part.label}, ${badge} waiting`}
                title={part.hint}>
                <span aria-hidden className="ws-part-icon">
                  <Icon size={19} strokeWidth={1.9} />
                  {badge !== null && <span className="ws-part-dot" data-testid={`part-count-${part.key}`}>{badge}</span>}
                </span>
                <span className="ws-part-text">
                  <span className="ws-part-label">{part.label}</span>
                  <span className="ws-part-hint">{badge !== null ? `${badge} waiting for you` : part.hint}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────────

function TabRow({ label, tabs, current, detail, counts, pathname }: {
  label: string; tabs: WorkspaceTab[]; current: WorkspaceTabKey | null; detail: boolean; counts: BannerCounts; pathname: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const edges = useScrollEdges(listRef, tabs.length);
  useKeepActiveInView(listRef, current);
  const labelId = useId();
  return (
    <nav aria-labelledby={labelId} className="ws-tabrow"
      data-fade-left={edges.left ? "true" : undefined} data-fade-right={edges.right ? "true" : undefined}>
      <span id={labelId} className="ws-visually-hidden">{label}</span>
      <ul ref={listRef} className="ws-subtabs" data-testid="workspace-tabs">
        {tabs.map(tab => {
          const active = tab.key === current;
          const count = tab.countKey ? countText(counts[tab.countKey]) : null;
          const attention = tab.attention === true && count !== null && count !== "0";
          const Icon = tab.icon;
          // The Invite tab covers two pages; "page" only on the one its link opens.
          const exact = active && !detail && pathname === tab.path;
          return (
            <li key={tab.key}>
              <Link to={tab.path} className="ws-subtab" data-testid={`tab-${tab.key}`}
                data-active={active ? "true" : "false"} aria-current={exact ? "page" : active ? "true" : undefined}
                aria-label={count === null ? undefined : `${tab.label}, ${countLabelFor(tab.key, count)}`}
                title={tab.hint}>
                <Icon size={16} strokeWidth={1.9} aria-hidden />
                <span>{tab.label}</span>
                {count !== null && (
                  <span aria-hidden className="ws-subtab-count" data-tone={attention ? "attention" : undefined}
                    data-testid={`tab-count-${tab.key}`}>{count}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ── Invite people: email invitation or join link ───────────────────────────

function InviteMethodSwitch({ pathname, counts }: { pathname: string; counts: BannerCounts }) {
  const methods = [
    { path: `${WORKSPACE_ROOT}/invitations`, label: "Email invitation", hint: "We email a personal invitation to one address", icon: Mail, count: countText(counts.invitations), noun: "pending" },
    { path: `${WORKSPACE_ROOT}/join-links`, label: "Join link", hint: "A single-use link you share yourself, or we email it", icon: Link2, count: countText(counts.joinLinks), noun: "active" },
  ];
  return (
    <nav aria-label="How to invite" className="ws-method" data-testid="invite-method-switch">
      {methods.map(m => {
        const active = pathname === m.path || pathname.startsWith(`${m.path}/`);
        const Icon = m.icon;
        return (
          <Link key={m.path} to={m.path} className="ws-method-option" data-active={active ? "true" : "false"}
            aria-current={active ? "page" : undefined} data-testid={`invite-method-${m.path.endsWith("links") ? "link" : "email"}`}
            aria-label={m.count === null ? undefined : `${m.label}, ${m.count} ${m.noun}`} title={m.hint}>
            <Icon size={16} strokeWidth={1.9} aria-hidden />
            <span>{m.label}</span>
            {m.count !== null && <span aria-hidden className="ws-subtab-count">{m.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
//
// A style block rather than inline objects because the parts and tab rows
// change SHAPE at two widths, and that has to be right on the first paint: a
// hook reading the viewport would render the desktop row on a phone for a
// frame.

const SHELL_CSS = `
.ws-shell { background: #F8FAFC; min-height: 100%; padding-bottom: 48px; overflow-x: clip; }
.ws-shell-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; box-sizing: border-box; min-width: 0; }
.ws-shell-header { position: relative; background: #FFFFFF; border-bottom: 1px solid ${BORDER}; padding: 22px 0 18px; }
.ws-shell-header::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, ${NAVY} 0%, #0B3A66 45%, ${AZURE} 100%); }
.ws-identity { display: flex; align-items: center; gap: 14px; min-width: 0; margin-bottom: 18px; }
.ws-identity-text { min-width: 0; flex: 1 1 auto; }
.ws-initials { width: 46px; height: 46px; border-radius: 12px; background: ${LIGHT}; border: 1.5px solid #BAD7F5; color: ${AZURE};
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  font-family: 'Geist Mono', monospace; font-size: 14px; font-weight: 700; letter-spacing: 0.02em; }
.ws-eyebrow { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 600; color: ${SILVER}; text-transform: uppercase; letter-spacing: 0.1em; }
.ws-name { font-family: 'Geist', sans-serif; font-size: 22px; font-weight: 800; color: ${NAVY}; margin: 2px 0 0; line-height: 1.2; overflow-wrap: anywhere; }
.ws-role { font-family: 'Geist', sans-serif; font-size: 13px; color: ${SLATE}; margin-top: 3px; }
.ws-demo-pill { flex-shrink: 0; align-self: flex-start; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: #92400E; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 999px; padding: 3px 9px; }
.ws-visually-hidden, .st-visually-hidden { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

/* The gear: top-right, 44px target, its label on hover and keyboard focus. */
.ws-gear { position: relative; flex-shrink: 0; align-self: flex-start; width: 44px; height: 44px; box-sizing: border-box; border-radius: 12px;
  display: inline-flex; align-items: center; justify-content: center; color: #2F4A66; background: #FFFFFF; border: 1.5px solid #DCE4ED;
  text-decoration: none; outline: none; -webkit-tap-highlight-color: transparent;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease; }
.ws-gear svg { transition: transform 320ms cubic-bezier(0.2, 0.7, 0.2, 1); }
.ws-gear:hover { border-color: #BAD7F5; color: ${AZURE}; background: ${LIGHT}; }
.ws-gear:hover svg { transform: rotate(60deg); }
.ws-gear:focus-visible { box-shadow: 0 0 0 3px rgba(0,120,212,0.35); border-color: ${AZURE}; }
.ws-gear[data-active="true"] { background: ${AZURE}; border-color: ${AZURE}; color: #FFFFFF; box-shadow: 0 6px 16px -8px rgba(0,120,212,0.55); }
.ws-gear-tip { position: absolute; top: calc(100% + 8px); right: 0; z-index: 5; pointer-events: none; white-space: nowrap;
  font-family: 'Geist', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 0.01em; color: #FFFFFF; background: ${NAVY};
  padding: 6px 10px; border-radius: 7px; box-shadow: 0 8px 20px -8px rgba(7,17,31,0.45);
  opacity: 0; transform: translateY(-3px); transition: opacity 140ms ease, transform 140ms ease; }
.ws-gear-tip::before { content: ""; position: absolute; top: -4px; right: 16px; width: 8px; height: 8px; background: ${NAVY}; transform: rotate(45deg); border-radius: 1px; }
.ws-gear:hover .ws-gear-tip, .ws-gear:focus-visible .ws-gear-tip { opacity: 1; transform: translateY(0); }
@media (hover: none) { .ws-gear:hover .ws-gear-tip { opacity: 0; } .ws-gear:hover svg { transform: none; } }

/* Parts: four cards on a wide screen, a four-up icon bar on a phone. */
.ws-parts-nav { min-width: 0; }
.ws-parts { list-style: none; margin: 0; padding: 0; display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 10px; min-width: 0; }
.ws-parts > li { display: flex; min-width: 0; }
.ws-part { position: relative; flex: 1 1 auto; box-sizing: border-box; display: flex; align-items: center; gap: 12px; min-width: 0;
  min-height: 72px; padding: 12px 14px; border-radius: 12px; border: 1.5px solid ${BORDER};
  background: linear-gradient(180deg, #FFFFFF 0%, #F7FAFD 100%); color: ${NAVY}; text-decoration: none; outline: none;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, color 160ms ease; }
.ws-part:hover { border-color: #C9D5E3; box-shadow: 0 1px 2px rgba(7,17,31,0.05), 0 6px 14px -10px rgba(7,17,31,0.25); }
.ws-part:focus-visible { box-shadow: 0 0 0 3px rgba(0,120,212,0.35); border-color: ${AZURE}; }
.ws-part[data-active="true"] { background: #EFF6FF; border-color: ${AZURE}; color: #005A9E;
  box-shadow: 0 0 0 3px rgba(0,120,212,0.12), 0 8px 18px -12px rgba(0,120,212,0.5); }
.ws-part-icon { position: relative; width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  background: #FFFFFF; border: 1px solid #DCE4ED; color: #2F4A66; transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease; }
.ws-part:hover .ws-part-icon { border-color: #BAD7F5; color: ${AZURE}; }
.ws-part[data-active="true"] .ws-part-icon { background: ${AZURE}; border-color: ${AZURE}; color: #FFFFFF; }
.ws-part-dot { position: absolute; top: -7px; right: -9px; min-width: 20px; height: 20px; box-sizing: border-box; padding: 0 6px; border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700;
  background: #FFF8E1; color: #8A5A00; border: 1.5px solid #F5D98B; }
.ws-part-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ws-part-label { font-family: 'Geist', sans-serif; font-size: 14px; font-weight: 700; line-height: 1.25; white-space: nowrap; }
.ws-part-hint { font-family: 'Geist', sans-serif; font-size: 12px; font-weight: 500; color: ${SLATE}; line-height: 1.35;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ws-part[data-active="true"] .ws-part-hint { color: #2F5F8A; }

/* Workspace settings heading, above its tabs. */
.ws-settings-head { display: flex; align-items: center; gap: 12px; min-width: 0; margin-bottom: 12px; }
.ws-settings-head-icon { width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  background: ${AZURE}; color: #FFFFFF; }
.ws-settings-head-text { display: flex; flex-direction: column; min-width: 0; flex: 1 1 auto; }
.ws-settings-head-title { font-family: 'Geist', sans-serif; font-size: 16px; font-weight: 800; color: ${NAVY}; line-height: 1.25; }
.ws-settings-close { flex-shrink: 0; width: 40px; height: 40px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center;
  color: ${SLATE}; border: 1.5px solid transparent; text-decoration: none; outline: none; }
.ws-settings-close:hover { background: #EEF2F7; color: ${NAVY}; }
.ws-settings-close:focus-visible { box-shadow: 0 0 0 3px rgba(0,120,212,0.35); border-color: ${AZURE}; }

/* Tabs: an underlined row that scrolls sideways when it runs out of room. */
.ws-tabrow { position: relative; min-width: 0; margin-bottom: 20px; border-bottom: 1.5px solid ${BORDER}; }
.ws-subtabs { list-style: none; margin: 0; padding: 0 2px; display: flex; gap: 4px; min-width: 0;
  overflow-x: auto; overflow-y: hidden; scrollbar-width: none; -ms-overflow-style: none; scroll-snap-type: x proximity; overscroll-behavior-x: contain;
  --ws-fade-l: 0px; --ws-fade-r: 0px;
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 var(--ws-fade-l), #000 calc(100% - var(--ws-fade-r)), transparent 100%);
  mask-image: linear-gradient(to right, transparent 0, #000 var(--ws-fade-l), #000 calc(100% - var(--ws-fade-r)), transparent 100%); }
.ws-subtabs::-webkit-scrollbar { display: none; }
.ws-tabrow[data-fade-left] .ws-subtabs { --ws-fade-l: 28px; }
.ws-tabrow[data-fade-right] .ws-subtabs { --ws-fade-r: 28px; }
.ws-subtabs > li { flex: 0 0 auto; scroll-snap-align: start; display: flex; }
.ws-subtab { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 14px; margin-bottom: -1.5px; white-space: nowrap;
  font-family: 'Geist', sans-serif; font-size: 14px; font-weight: 600; color: ${SLATE}; text-decoration: none; outline: none;
  border-bottom: 2.5px solid transparent; border-radius: 8px 8px 0 0; -webkit-tap-highlight-color: transparent;
  transition: color 140ms ease, border-color 140ms ease, background-color 140ms ease; }
.ws-subtab:hover { color: ${NAVY}; border-bottom-color: #CBD5E1; background: rgba(241,245,249,0.7); }
.ws-subtab:focus-visible { box-shadow: inset 0 0 0 2px rgba(0,120,212,0.45); }
.ws-subtab[data-active="true"] { color: #005A9E; border-bottom-color: ${AZURE}; font-weight: 700; }
.ws-subtab-count { box-sizing: border-box; min-width: 20px; height: 18px; padding: 0 6px; border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 700;
  background: #E9EEF4; color: #475569; border: 1px solid transparent; }
.ws-subtab[data-active="true"] .ws-subtab-count, .ws-method-option[data-active="true"] .ws-subtab-count { background: #E6F1FB; color: ${AZURE}; }
.ws-subtab .ws-subtab-count[data-tone="attention"] { background: #FFF8E1; color: #8A5A00; border-color: #F5D98B; }

/* Invite people: a two-way switch between email invitation and join link. */
.ws-method { display: inline-flex; gap: 4px; padding: 4px; margin-bottom: 20px; border-radius: 12px; background: #EEF2F7; border: 1px solid ${BORDER};
  max-width: 100%; box-sizing: border-box; }
.ws-method-option { flex: 1 1 0; min-width: 0; display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; padding: 0 16px;
  border-radius: 9px; font-family: 'Geist', sans-serif; font-size: 13.5px; font-weight: 600; color: #475569; text-decoration: none; white-space: nowrap;
  outline: none; -webkit-tap-highlight-color: transparent; transition: background-color 140ms ease, color 140ms ease, box-shadow 140ms ease; }
.ws-method-option:hover { color: ${NAVY}; }
.ws-method-option:focus-visible { box-shadow: 0 0 0 3px rgba(0,120,212,0.35); }
.ws-method-option[data-active="true"] { background: #FFFFFF; color: ${NAVY}; font-weight: 700; box-shadow: 0 1px 3px rgba(7,17,31,0.14); }

/* The parts follow the width of the row itself, not the window, because the
   side panel takes a different share of the screen at every size. */
.ws-parts-nav { container-type: inline-size; container-name: ws-parts; }

/* Under ~960px of row: tighten, keep the hints. */
@container ws-parts (max-width: 960px) {
  .ws-parts { gap: 8px; }
  .ws-part { gap: 10px; padding: 10px 12px; }
  .ws-part-icon { width: 36px; height: 36px; }
  .ws-part-hint { font-size: 11.5px; }
}

/* Under ~760px: the hints go; one compact row of icon and name. */
@container ws-parts (max-width: 760px) {
  .ws-part { min-height: 56px; padding: 8px 12px; gap: 10px; }
  .ws-part-icon { width: 34px; height: 34px; border-radius: 9px; }
  .ws-part-hint { display: none; }
  .ws-part-label { font-size: 13.5px; }
}

/* Under ~600px: a four-up icon bar, name under icon — every part in reach,
   nothing scrolls, no name ever broken mid-word. */
@container ws-parts (max-width: 600px) {
  .ws-parts { gap: 6px; padding: 4px; border-radius: 14px; background: #F1F5F9; border: 1px solid ${BORDER}; }
  .ws-part { flex-direction: column; justify-content: center; gap: 5px; min-height: 64px; padding: 8px 2px 7px; border-radius: 10px;
    border-color: transparent; background: transparent; text-align: center; }
  .ws-part:hover { box-shadow: none; border-color: transparent; }
  .ws-part[data-active="true"] { background: #FFFFFF; border-color: #BAD7F5; box-shadow: 0 1px 3px rgba(7,17,31,0.12); }
  .ws-part-icon { width: 32px; height: 32px; }
  .ws-part-text { align-items: center; }
  .ws-part-label { font-size: 12px; line-height: 1.2; }
  .ws-part-dot { top: -6px; right: -12px; min-width: 18px; height: 18px; font-size: 10px; padding: 0 5px; }
}
@container ws-parts (max-width: 340px) {
  .ws-part-label { font-size: 10.5px; }
  .ws-part-icon { width: 28px; height: 28px; }
}

/* Phone: tighter header, full-bleed tab row, a two-way invite switch. */
@media (max-width: 767px) {
  .ws-shell-inner { padding: 0 16px; }
  .ws-shell-header { padding: 16px 0 12px; }
  .ws-identity { gap: 12px; margin-bottom: 14px; }
  .ws-initials { width: 40px; height: 40px; border-radius: 10px; font-size: 13px; }
  /* Centred, and always stacked in this order — eyebrow, name, role —
     whatever the name's length: a column, never a wrapping row (a row
     would put a short name beside "Workspace"). Long names wrap, centred. */
  .ws-identity-text { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .ws-identity-text > * { max-width: 100%; }
  .ws-name { font-size: 15px; }
  .ws-role { font-size: 12.5px; }
  .ws-demo-pill { display: none; }
  .ws-subtab { padding: 0 12px; font-size: 13.5px; }
  .ws-tabrow { margin-left: -16px; margin-right: -16px; padding: 0 12px; }
  .ws-method { display: flex; width: 100%; }
  .ws-method-option { padding: 0 8px; font-size: 13px; }
}

.ws-shell-content { padding-top: 20px; min-height: 60vh; }
@media (max-width: 767px) { .ws-shell-content { padding-top: 14px; } }

/* The section heading receives focus on every section change. It is a
   programmatic target, not a control, so it takes no focus ring. */
.ws-section-heading:focus, .st-section-heading:focus { outline: none; }

/* backwards, not both: a retained transform would make this wrapper the
   containing block for every position:fixed dialog inside a section (see
   lagda-page-enter in theme.css). */
.ws-section-enter { animation: ws-section-in 180ms cubic-bezier(0.2, 0.7, 0.2, 1) backwards; }
@keyframes ws-section-in { from { opacity: 0; translate: 0 6px; } to { opacity: 1; translate: 0 0; } }

@media (prefers-reduced-motion: reduce) {
  .ws-section-enter { animation: none; }
  .ws-part, .ws-part-icon, .ws-subtab, .ws-gear, .ws-gear svg, .ws-gear-tip, .ws-method-option { transition: none; }
  .ws-gear:hover svg { transform: none; }
}
`;

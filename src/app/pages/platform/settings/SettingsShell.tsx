// The settings shell — mounted ONCE for /app/settings/* by the router.
//
// ── Layout ─────────────────────────────────────────────────────────────────
//
// A header with two labelled strips of section banners — Personal and
// Workspace — and the current section rendered in the area below them. The
// URL decides what is shown, so deep links, reloads and back/forward work as
// they always did; only the content area changes when you move between
// sections, with a short transition (none under reduced motion).
//
// It follows the Manage shell (workspace/shell/WorkspaceShell.tsx): roving
// focus across the banners, aria-current on the one you are in, the section
// heading focused on arrival, and a banner row that becomes a horizontally
// scrolling, snapping strip on small screens with the current banner kept in
// view and fades at the edges that can still scroll. On phones the two
// strips become one row.
//
// ── Pages ──────────────────────────────────────────────────────────────────
//
// Every section renders `SettingsPage`, which draws the section heading and,
// in the demo build, the preview note. The primitives at the end (SCard,
// SSection, SField, the buttons, StatusBadge…) are shared by every section.

import React, {
  createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, Suspense,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Link, Outlet, useLocation } from "react-router";
import { Settings2, UserRound, Building2, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePlatform } from "../../../context/PlatformContext";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import {
  SETTINGS_ROOT, SETTINGS_SECTIONS, SETTINGS_GROUP_LABELS, SECURITY_TABS, settingsSectionForPath,
  type SettingsGroup, type SettingsSection,
} from "./sections";

// ── Tokens ─────────────────────────────────────────────────────────────────
//
// Every text colour here passes 4.5:1 on white and on the light tints it is
// used over. AZURE is the brand fill; AZURE_TEXT is its text-safe shade for
// links and labels on tinted backgrounds.

export const SET = {
  NAVY: "#07111F",
  INK: "#1E293B",
  SLATE: "#475569",
  MUTED: "#5B6B7F",
  BORDER: "#E2E8F0",
  CANVAS: "#F8FAFC",
  AZURE: "#0078D4",
  AZURE_TEXT: "#005A9E",
  TEAL: "#0F766E",
  TEAL_TEXT: "#115E59",
  DANGER: "#B91C1C",
  SUCCESS: "#15803D",
  FONT: "'Geist', sans-serif",
  MONO: "'Geist Mono', monospace",
} as const;

const GF = { fontFamily: SET.FONT };

export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "accent" | "teal";

/** Tinted background, dark text, matching border — never text on its own colour. */
export const TONES: Record<Tone, { bg: string; fg: string; border: string; dot: string }> = {
  success: { bg: "#DCFCE7", fg: "#166534", border: "#BBF7D0", dot: "#16A34A" },
  warning: { bg: "#FEF3C7", fg: "#92400E", border: "#FDE68A", dot: "#D97706" },
  danger:  { bg: "#FEE2E2", fg: "#991B1B", border: "#FECACA", dot: "#DC2626" },
  info:    { bg: "#E6F1FB", fg: "#0B4F8A", border: "#BAD7F5", dot: "#0078D4" },
  neutral: { bg: "#F1F5F9", fg: "#334155", border: "#E2E8F0", dot: "#64748B" },
  accent:  { bg: "#FEF9C3", fg: "#854D0E", border: "#FDE68A", dot: "#CA8A04" },
  teal:    { bg: "#CCFBF1", fg: "#115E59", border: "#99F6E4", dot: "#0F766E" },
};

const GROUP_TONE: Record<SettingsGroup, { accent: string; text: string; tint: string; line: string }> = {
  personal:  { accent: SET.AZURE, text: SET.AZURE_TEXT, tint: "#EFF6FD", line: "#BAD7F5" },
  workspace: { accent: SET.TEAL,  text: SET.TEAL_TEXT,  tint: "#EFFBF8", line: "#99E1D6" },
};

// ── Live or preview ────────────────────────────────────────────────────────

/**
 * Whether a settings path saves to a real account.
 *
 * With a backend, every section does except Integrations, which is not built
 * yet. The demo build has no account to save to, so every section there is a
 * preview — and says so under its heading.
 */
export function isLiveSettingsPath(pathname: string, real: boolean = USE_REAL_BACKEND): boolean {
  if (!real) return false;
  return !pathname.startsWith(`${SETTINGS_ROOT}/integrations`);
}

function PreviewNote({ overview }: { overview: boolean }) {
  return (
    <p data-testid="settings-preview-note" style={{
      ...GF, margin: "10px 0 0", display: "flex", gap: 8, alignItems: "flex-start",
      fontSize: 12.5, lineHeight: 1.55, color: TONES.warning.fg, maxWidth: "70ch",
      background: TONES.warning.bg, border: `1px solid ${TONES.warning.border}`, borderRadius: 8, padding: "8px 12px",
    }}>
      <Info size={15} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
      <span>
        <strong style={{ fontWeight: 700 }}>Preview.</strong>{" "}
        {overview
          ? "This demo is not connected to an account. The figures are samples, and nothing here is saved."
          : "You can try these controls, but nothing on this page is saved — your changes are gone when you reload."}
      </span>
    </p>
  );
}

/** The save confirmation for a section that does not save. */
export function PreviewSaved() {
  return (
    <span role="status" style={{ ...GF, fontSize: 13, color: SET.SUCCESS }}>
      Applied for this visit only — not saved to your account.
    </span>
  );
}

// ── Shell context ──────────────────────────────────────────────────────────

interface ShellValue {
  /** The last path whose heading took focus, so a re-render does not steal it again. */
  focusedPath: React.MutableRefObject<string>;
}

const ShellContext = createContext<ShellValue | null>(null);

// ── Section page wrapper ───────────────────────────────────────────────────

interface SettingsPageProps {
  title: string;
  /** "Security › Password" style trail; the part before the last › becomes the eyebrow. */
  breadcrumb?: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * A settings section: its heading, the preview note in the demo build, and
 * its content. The heading takes focus when you arrive from another section,
 * so a screen-reader user hears where they landed.
 */
export function SettingsPage({ title, breadcrumb, description, icon, actions, children }: SettingsPageProps) {
  const shell = useContext(ShellContext);
  const { pathname } = useLocation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const section = settingsSectionForPath(pathname);
  const Icon = icon ?? section?.icon ?? Settings2;
  const tone = GROUP_TONE[section?.group ?? "personal"];
  const crumbs = breadcrumb?.split(" › ") ?? [];
  const eyebrow = crumbs.length > 1 ? crumbs.slice(0, -1).join(" › ") : section ? SETTINGS_GROUP_LABELS[section.group] : "Settings";
  const overview = pathname === SETTINGS_ROOT || pathname === `${SETTINGS_ROOT}/`;

  useEffect(() => {
    if (!shell || shell.focusedPath.current === pathname) return;
    shell.focusedPath.current = pathname;
    headingRef.current?.focus({ preventScroll: true });
  }, [shell, pathname]);

  return (
    <section aria-labelledby={headingId} data-testid="settings-section" style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0, flex: "1 1 260px" }}>
          <span aria-hidden style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: tone.tint, border: `1px solid ${tone.line}`, color: tone.text,
          }}>
            <Icon size={20} strokeWidth={1.9} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: SET.MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: SET.MUTED }}>
              {eyebrow}
            </div>
            <h2 ref={headingRef} id={headingId} tabIndex={-1} className="st-section-heading"
              style={{ ...GF, fontSize: 20, fontWeight: 800, color: SET.NAVY, margin: "2px 0 0", lineHeight: 1.25, overflowWrap: "anywhere", letterSpacing: "-0.005em" }}>
              {title}
            </h2>
            {description && (
              <div style={{ ...GF, fontSize: 13.5, color: SET.SLATE, marginTop: 4, lineHeight: 1.55, maxWidth: "72ch" }}>{description}</div>
            )}
          </div>
        </div>
        {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>{actions}</div>}
      </div>
      {!isLiveSettingsPath(pathname) && (
        <div style={{ marginTop: -8, marginBottom: 16 }}><PreviewNote overview={overview} /></div>
      )}
      {children}
    </section>
  );
}

function ContentFallback() {
  return (
    <div aria-busy="true" aria-label="Loading section" style={{ minHeight: "40vh" }}>
      <div className="lagda-skeleton" style={{ height: 26, width: 220, maxWidth: "60%", background: "#E2E8F0", borderRadius: 8, marginBottom: 20 }} />
      {[120, 200].map(h => (
        <div key={h} className="lagda-skeleton" style={{ height: h, background: "#E9EEF4", borderRadius: 12, marginBottom: 16 }} />
      ))}
    </div>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────

export function SettingsLayout() {
  const location = useLocation();
  const platform = usePlatform();
  const focusedPath = useRef(location.pathname);
  const value = useMemo<ShellValue>(() => ({ focusedPath }), []);
  const current = settingsSectionForPath(location.pathname);
  const onSecurity = current?.key === "security";
  const live = USE_REAL_BACKEND;
  const userName = platform.user?.displayName ?? platform.user?.fullName ?? null;
  const workspaceName = platform.currentWorkspace?.name ?? null;

  return (
    <ShellContext.Provider value={value}>
      <div className="st-shell" data-testid="settings-shell">
        <header className="st-header">
          <div className="st-inner">
            <div className="st-identity">
              <span aria-hidden className="st-identity-icon"><Settings2 size={22} strokeWidth={1.8} /></span>
              <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                <div className="st-eyebrow">Account and workspace</div>
                <h1 className="st-title">Settings</h1>
                {(userName || workspaceName) && (
                  <div className="st-sub">
                    {userName && <>Signed in as <strong>{userName}</strong></>}
                    {userName && workspaceName && <span aria-hidden> · </span>}
                    {workspaceName && <>Workspace <strong>{workspaceName}</strong></>}
                  </div>
                )}
              </div>
              {!live && <span className="st-demo-pill">Demo build</span>}
            </div>
            <SettingsBanners current={current} pathname={location.pathname} workspaceName={workspaceName} />
          </div>
        </header>

        <div className="st-inner st-content">
          {onSecurity && <SecurityTabs pathname={location.pathname} />}
          <main id="main-content" className="st-main">
            {/* Only this area waits for a section's code; the header and the
                banners above never unmount. */}
            <Suspense fallback={<ContentFallback />}>
              <div key={location.pathname} className="st-section-enter">
                <Outlet />
              </div>
            </Suspense>
          </main>
        </div>

        <style>{SHELL_CSS}</style>
      </div>
    </ShellContext.Provider>
  );
}

// ── Banners ────────────────────────────────────────────────────────────────

/** Updates the fade attributes of a scrolling row from its scroll position. */
function measureScroller(el: HTMLElement) {
  const max = el.scrollWidth - el.clientWidth;
  const left = max > 2 && el.scrollLeft > 2;
  const right = max > 2 && max - el.scrollLeft > 2;
  if ((el.dataset.fadeLeft === "true") !== left) el.dataset.fadeLeft = left ? "true" : "false";
  if ((el.dataset.fadeRight === "true") !== right) el.dataset.fadeRight = right ? "true" : "false";
}

/** Scrolls a row (never the page) so `active` sits in the middle of it. */
function centerIn(el: HTMLElement, active: HTMLElement) {
  if (el.scrollWidth <= el.clientWidth + 1) return;
  const a = active.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  if (a.left >= r.left + 8 && a.right <= r.right - 8) return;
  const target = el.scrollLeft + (a.left - r.left) - (r.width - a.width) / 2;
  const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (typeof el.scrollTo === "function") el.scrollTo({ left: Math.max(0, target), behavior: reduce ? "auto" : "smooth" });
  else el.scrollLeft = Math.max(0, target);
}

function SettingsBanners({ current, pathname, workspaceName }: {
  current: SettingsSection | null; pathname: string; workspaceName: string | null;
}) {
  const navRef = useRef<HTMLElement>(null);
  const labelId = useId();
  const groups: SettingsGroup[] = ["personal", "workspace"];
  const ordered = groups.flatMap(g => SETTINGS_SECTIONS.filter(s => s.group === g));
  const activeIndex = current ? ordered.findIndex(s => s.key === current.key) : -1;
  const rove = useRef(Math.max(0, activeIndex));
  rove.current = Math.max(0, activeIndex);

  const measureAll = useCallback(() => {
    navRef.current?.querySelectorAll<HTMLElement>("[data-scroller]").forEach(measureScroller);
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const scrollers = Array.from(nav.querySelectorAll<HTMLElement>("[data-scroller]"));
    const onScroll = (e: Event) => { if (e.currentTarget instanceof HTMLElement) measureScroller(e.currentTarget); };
    scrollers.forEach(s => { s.addEventListener("scroll", onScroll, { passive: true }); });
    measureAll();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(measureAll);
      scrollers.forEach(s => { observer?.observe(s); });
    } else {
      window.addEventListener("resize", measureAll);
    }
    return () => {
      scrollers.forEach(s => { s.removeEventListener("scroll", onScroll); });
      observer?.disconnect();
      window.removeEventListener("resize", measureAll);
    };
  }, [measureAll]);

  // Keep the current banner in view in whichever row is scrolling at this width.
  useLayoutEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('a[data-active="true"]');
    if (!nav || !active) return;
    nav.querySelectorAll<HTMLElement>("[data-scroller]").forEach(s => {
      if (s.contains(active)) centerIn(s, active);
    });
    measureAll();
  }, [current?.key, measureAll]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    const links = Array.from(navRef.current?.querySelectorAll<HTMLAnchorElement>("a[data-st-banner]") ?? []);
    const i = links.findIndex(l => l === document.activeElement);
    if (i < 0 || links.length === 0) return;
    let next: number;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % links.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + links.length) % links.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = links.length - 1;
    else return;
    e.preventDefault();
    links.forEach((l, idx) => { l.tabIndex = idx === next ? 0 : -1; });
    links[next]?.focus();
  };

  let index = -1;
  return (
    <nav ref={navRef} aria-labelledby={labelId} className="st-nav" onKeyDown={onKeyDown}>
      <span id={labelId} className="st-visually-hidden">Settings sections</span>
      <div className="st-rows" data-scroller="" data-testid="settings-banners">
        {groups.map(group => {
          const items = SETTINGS_SECTIONS.filter(s => s.group === group);
          if (items.length === 0) return null;
          const GroupIcon = group === "personal" ? UserRound : Building2;
          const groupLabelId = `${labelId}-${group}`;
          return (
            <div key={group} className="st-group" data-group={group} role="group" aria-labelledby={groupLabelId}>
              <div id={groupLabelId} className="st-group-label">
                <GroupIcon size={13} aria-hidden strokeWidth={2} />
                <span>{SETTINGS_GROUP_LABELS[group]}</span>
                {group === "workspace" && workspaceName && (
                  <span className="st-group-extra"> · {workspaceName}</span>
                )}
              </div>
              <ul className="st-tabs" data-scroller="">
                {items.map(section => {
                  index += 1;
                  const active = current?.key === section.key;
                  const exact = active && pathname === section.path;
                  return (
                    <li key={section.key}>
                      <Banner section={section} active={active} exact={exact} tabIndex={index === rove.current ? 0 : -1} />
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function Banner({ section, active, exact, tabIndex }: {
  section: SettingsSection; active: boolean; exact: boolean; tabIndex: number;
}) {
  const Icon = section.icon;
  return (
    <Link to={section.path} data-st-banner="" data-testid={`settings-banner-${section.key}`}
      data-active={active ? "true" : "false"} data-group={section.group}
      aria-current={exact ? "page" : active ? "true" : undefined}
      title={section.hint} tabIndex={tabIndex} className="st-tab">
      <span aria-hidden className="st-tab-icon"><Icon size={17} strokeWidth={1.9} /></span>
      <span className="st-tab-label">{section.label}</span>
      <span aria-hidden className="st-tab-bar" />
    </Link>
  );
}

// ── Security tab row ───────────────────────────────────────────────────────

function SecurityTabs({ pathname }: { pathname: string }) {
  const listRef = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    const el = listRef.current;
    const active = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (el && active) centerIn(el, active);
    if (el) measureScroller(el);
  }, [pathname]);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => { measureScroller(el); };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); };
  }, []);
  return (
    <nav aria-label="Security" className="st-subnav" data-testid="security-tabs">
      <ul ref={listRef} className="st-subtabs" data-scroller="">
        {SECURITY_TABS.map(tab => {
          const selected = pathname === tab.path;
          return (
            <li key={tab.path}>
              <Link to={tab.path} aria-current={selected ? "page" : undefined} className="st-subtab">{tab.label}</Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
//
// A style block because the banner rows change SHAPE at two widths, and that
// has to be right on the first paint.

const P = GROUP_TONE.personal;
const W = GROUP_TONE.workspace;

const SHELL_CSS = `
.st-shell { background: ${SET.CANVAS}; min-height: 100%; padding-bottom: 48px; overflow-x: clip; }
.st-inner { max-width: 1120px; margin: 0 auto; padding: 0 24px; box-sizing: border-box; min-width: 0; }
.st-header { position: relative; background: #FFFFFF; border-bottom: 1px solid ${SET.BORDER}; padding: 22px 0 18px; }
.st-header::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, ${SET.NAVY} 0%, #0B3A66 45%, ${SET.AZURE} 80%, ${SET.TEAL} 100%); }
.st-identity { display: flex; align-items: center; gap: 14px; min-width: 0; margin-bottom: 18px; }
.st-identity-icon { width: 46px; height: 46px; border-radius: 12px; background: #F0F7FF; border: 1.5px solid #BAD7F5; color: ${SET.AZURE_TEXT};
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.st-eyebrow { font-family: ${SET.MONO}; font-size: 10px; font-weight: 600; color: ${SET.MUTED}; text-transform: uppercase; letter-spacing: 0.1em; }
.st-title { font-family: ${SET.FONT}; font-size: 22px; font-weight: 800; color: ${SET.NAVY}; margin: 2px 0 0; line-height: 1.2; }
.st-sub { font-family: ${SET.FONT}; font-size: 13px; color: ${SET.SLATE}; margin-top: 3px; overflow-wrap: anywhere; }
.st-sub strong { color: ${SET.INK}; font-weight: 600; }
.st-demo-pill { flex-shrink: 0; align-self: flex-start; font-family: ${SET.MONO}; font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: ${TONES.warning.fg}; background: ${TONES.warning.bg}; border: 1px solid ${TONES.warning.border}; border-radius: 999px; padding: 3px 9px; }
.st-visually-hidden { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

.st-nav { min-width: 0; }
.st-rows { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.st-group { min-width: 0; border: 1px solid ${SET.BORDER}; border-radius: 12px; padding: 10px 10px 8px; background: linear-gradient(180deg, #FAFBFD 0%, #F3F6FA 100%); }
.st-group-label { display: flex; align-items: center; gap: 6px; padding: 0 4px 8px; font-family: ${SET.MONO}; font-size: 10.5px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; min-width: 0; white-space: nowrap; }
.st-group[data-group="personal"] .st-group-label { color: ${P.text}; }
.st-group[data-group="workspace"] .st-group-label { color: ${W.text}; }
.st-group-extra { font-family: ${SET.FONT}; text-transform: none; letter-spacing: 0; font-weight: 600; color: ${SET.SLATE}; overflow: hidden; text-overflow: ellipsis; }
.st-tabs { list-style: none; margin: 0; padding: 3px; display: flex; gap: 8px; min-width: 0;
  overflow-x: auto; overflow-y: hidden; scrollbar-width: none; -ms-overflow-style: none; scroll-snap-type: x proximity; overscroll-behavior-x: contain; }
.st-tabs::-webkit-scrollbar, .st-rows::-webkit-scrollbar, .st-subtabs::-webkit-scrollbar { display: none; }
.st-tabs > li { flex: 1 1 0; min-width: 0; max-width: 210px; display: flex; scroll-snap-align: center; }

[data-scroller] { --st-fade-l: 0px; --st-fade-r: 0px;
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 var(--st-fade-l), #000 calc(100% - var(--st-fade-r)), transparent 100%);
  mask-image: linear-gradient(to right, transparent 0, #000 var(--st-fade-l), #000 calc(100% - var(--st-fade-r)), transparent 100%); }
[data-scroller][data-fade-left="true"] { --st-fade-l: 28px; }
[data-scroller][data-fade-right="true"] { --st-fade-r: 28px; }

.st-tab { position: relative; flex: 1 1 auto; box-sizing: border-box; display: flex; align-items: center; gap: 10px; min-width: 0;
  min-height: 56px; padding: 8px 12px 10px 8px; border-radius: 10px; border: 1.5px solid ${SET.BORDER}; background: #FFFFFF;
  text-decoration: none; color: ${SET.INK}; outline: none; -webkit-tap-highlight-color: transparent;
  transition: background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, color 160ms ease; }
.st-tab:hover { border-color: #C9D5E3; box-shadow: 0 1px 2px rgba(7,17,31,0.05); }
.st-tab:focus-visible { box-shadow: 0 0 0 3px rgba(0,120,212,0.35); border-color: ${SET.AZURE}; }
.st-tab-icon { width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease; }
.st-tab[data-group="personal"] .st-tab-icon { background: ${P.tint}; border: 1px solid ${P.line}; color: ${P.text}; }
.st-tab[data-group="workspace"] .st-tab-icon { background: ${W.tint}; border: 1px solid ${W.line}; color: ${W.text}; }
.st-tab-label { font-family: ${SET.FONT}; font-size: 13px; font-weight: 600; line-height: 1.25; min-width: 0; overflow-wrap: anywhere; }
.st-tab-bar { position: absolute; left: 12px; right: 12px; bottom: 3px; height: 3px; border-radius: 3px;
  transform: scaleX(0); transform-origin: center; transition: transform 180ms ease; }
.st-tab[data-group="personal"] .st-tab-bar { background: ${P.accent}; }
.st-tab[data-group="workspace"] .st-tab-bar { background: ${W.accent}; }
.st-tab[data-active="true"] { box-shadow: 0 1px 2px rgba(7,17,31,0.06), 0 6px 16px -10px rgba(7,17,31,0.35); }
.st-tab[data-active="true"][data-group="personal"] { background: ${P.tint}; border-color: ${P.accent}; color: ${P.text}; }
.st-tab[data-active="true"][data-group="workspace"] { background: ${W.tint}; border-color: ${W.accent}; color: ${W.text}; }
.st-tab[data-active="true"][data-group="personal"] .st-tab-icon { background: ${P.accent}; border-color: ${P.accent}; color: #FFFFFF; }
.st-tab[data-active="true"][data-group="workspace"] .st-tab-icon { background: ${W.accent}; border-color: ${W.accent}; color: #FFFFFF; }
.st-tab[data-active="true"] .st-tab-label { font-weight: 700; }
.st-tab[data-active="true"] .st-tab-bar { transform: scaleX(1); }
.st-tab[data-active="true"]:focus-visible { box-shadow: 0 0 0 3px rgba(0,120,212,0.35); }

/* 1024-1279: tighter cards, labels may wrap to two lines — never truncated. */
@media (min-width: 1024px) and (max-width: 1279px) {
  .st-tabs { gap: 6px; }
  .st-tab { gap: 8px; padding: 8px 8px 10px 7px; }
  .st-tab-icon { width: 30px; height: 30px; }
  .st-tab-label { font-size: 12.5px; }
}

/* Tablet: each strip is a compact row that scrolls and snaps. */
@media (max-width: 1023px) {
  .st-tabs > li { flex: 0 0 auto; max-width: none; }
  .st-tab { min-height: 44px; padding: 0 14px 0 6px; gap: 8px; }
  .st-tab-icon { width: 30px; height: 30px; border-radius: 8px; }
  .st-tab-label { white-space: nowrap; }
  .st-tab-bar { bottom: 2px; height: 2.5px; }
}

/* Phone: the two strips become ONE scrolling row; each group keeps a small
   label at its start so Personal and Workspace still read as two sets. */
@media (max-width: 767px) {
  .st-inner { padding: 0 16px; }
  .st-header { padding: 16px 0 12px; }
  .st-identity { gap: 12px; margin-bottom: 14px; }
  .st-identity-icon { width: 40px; height: 40px; border-radius: 10px; }
  .st-title { font-size: 20px; }
  .st-rows { flex-direction: row; align-items: stretch; gap: 10px; overflow-x: auto; overflow-y: hidden; scrollbar-width: none;
    scroll-snap-type: x proximity; overscroll-behavior-x: contain; border: 1px solid ${SET.BORDER}; border-radius: 12px;
    background: linear-gradient(180deg, #FAFBFD 0%, #F3F6FA 100%); padding: 6px; }
  .st-group { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; border: 0; padding: 0; background: none; border-radius: 0; }
  .st-group + .st-group { border-left: 1px solid ${SET.BORDER}; padding-left: 10px; }
  .st-group-label { padding: 0 2px; font-size: 9.5px; writing-mode: vertical-rl; transform: rotate(180deg); letter-spacing: 0.12em; }
  .st-group-label svg { display: none; }
  .st-group-extra { display: none; }
  .st-tabs { overflow: visible; padding: 0; mask-image: none !important; -webkit-mask-image: none !important; }
}

.st-content { padding-top: 22px; min-height: 60vh; }
@media (max-width: 767px) { .st-content { padding-top: 16px; } }
.st-main { min-width: 0; }

.st-subnav { margin-bottom: 18px; min-width: 0; }
.st-subtabs { list-style: none; margin: 0; padding: 0 2px; display: flex; gap: 4px; border-bottom: 1.5px solid ${SET.BORDER};
  overflow-x: auto; overflow-y: hidden; scrollbar-width: none; scroll-snap-type: x proximity; }
.st-subtabs > li { flex: 0 0 auto; scroll-snap-align: start; }
.st-subtab { display: inline-flex; align-items: center; min-height: 42px; padding: 0 14px; margin-bottom: -1.5px; white-space: nowrap;
  font-family: ${SET.FONT}; font-size: 13.5px; font-weight: 600; color: ${SET.SLATE}; text-decoration: none;
  border-bottom: 2.5px solid transparent; transition: color 140ms ease, border-color 140ms ease; outline: none; border-radius: 6px 6px 0 0; }
.st-subtab:hover { color: ${SET.INK}; border-bottom-color: #CBD5E1; }
.st-subtab:focus-visible { box-shadow: inset 0 0 0 2px rgba(0,120,212,0.45); }
.st-subtab[aria-current="page"] { color: ${SET.AZURE_TEXT}; border-bottom-color: ${SET.AZURE}; font-weight: 700; }

.st-section-heading:focus { outline: none; }

/* backwards, not both: a retained transform would make this wrapper the
   containing block for every position:fixed dialog inside a section. */
.st-section-enter { animation: st-section-in 180ms cubic-bezier(0.2, 0.7, 0.2, 1) backwards; }
@keyframes st-section-in { from { opacity: 0; translate: 0 6px; } to { opacity: 1; translate: 0 0; } }

@media (prefers-reduced-motion: reduce) {
  .st-section-enter { animation: none; }
  .st-tab, .st-tab-icon, .st-tab-bar, .st-subtab { transition: none; }
}

@media print {
  .st-header, .st-subnav { display: none !important; }
  .st-shell { background: #FFFFFF; padding: 0; }
}
`;

// ── Shared primitives ──────────────────────────────────────────────────────

export function SCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    // position: relative keeps absolutely-positioned descendants (visually
    // hidden table text, for one) inside the card's own scroll containers,
    // instead of widening the page.
    <div className="st-card" style={{
      position: "relative", background: "#FFFFFF", border: `1px solid ${SET.BORDER}`, borderRadius: 12,
      padding: "clamp(16px, 3vw, 22px) clamp(16px, 3vw, 24px)", marginBottom: 16, minWidth: 0,
      boxShadow: "0 1px 2px rgba(7,17,31,0.04)", ...style,
    }}>
      {children}
    </div>
  );
}

export function SSection({ title, icon: Icon, description, actions, children, style }: {
  title: string; icon?: LucideIcon; description?: React.ReactNode; actions?: React.ReactNode;
  children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <SCard style={style}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0, flex: "1 1 220px" }}>
          {Icon && (
            <span aria-hidden style={{ color: SET.AZURE_TEXT, display: "flex", marginTop: 1, flexShrink: 0 }}><Icon size={18} strokeWidth={1.9} /></span>
          )}
          <div style={{ minWidth: 0 }}>
            <h3 style={{ ...GF, fontSize: 15, fontWeight: 700, color: SET.NAVY, margin: 0, lineHeight: 1.35 }}>{title}</h3>
            {description && <div style={{ ...GF, fontSize: 13, color: SET.SLATE, marginTop: 3, lineHeight: 1.5 }}>{description}</div>}
          </div>
        </div>
        {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>{actions}</div>}
      </div>
      {children}
    </SCard>
  );
}

export function SField({ label, help, required, children, htmlFor }: {
  label: string; help?: string; required?: boolean; children: React.ReactNode; htmlFor?: string;
}) {
  const LabelTag = htmlFor ? "label" : "div";
  return (
    <div style={{ display: "flex", gap: "8px 20px", marginBottom: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ flex: "0 1 220px", minWidth: 140, paddingTop: 8 }}>
        <LabelTag {...(htmlFor ? { htmlFor } : {})} style={{ ...GF, fontSize: 13, fontWeight: 600, color: SET.NAVY, display: "block" }}>
          {label}{required && <span aria-label="required" style={{ color: SET.DANGER, marginLeft: 3 }}>*</span>}
        </LabelTag>
        {help && <div style={{ ...GF, fontSize: 12.5, color: SET.SLATE, marginTop: 3, lineHeight: 1.45 }}>{help}</div>}
      </div>
      <div style={{ flex: "1 1 260px", minWidth: 0 }}>{children}</div>
    </div>
  );
}

export const INPUT_STYLE: React.CSSProperties = {
  ...GF, fontSize: 13.5, padding: "9px 12px", minHeight: 40,
  border: "1.5px solid #CBD5E1", borderRadius: 8, color: SET.NAVY,
  width: "100%", boxSizing: "border-box", background: "#FFFFFF",
};

export const BTN_PRIMARY: React.CSSProperties = {
  ...GF, fontSize: 13.5, fontWeight: 600, padding: "9px 18px", minHeight: 40,
  border: `1.5px solid ${SET.AZURE}`, borderRadius: 8, background: SET.AZURE, color: "#FFFFFF",
  cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
};

export const BTN_SECONDARY: React.CSSProperties = {
  ...GF, fontSize: 13.5, fontWeight: 600, padding: "9px 18px", minHeight: 40,
  border: "1.5px solid #CBD5E1", borderRadius: 8, background: "#FFFFFF", color: SET.INK,
  cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  textDecoration: "none",
};

export const BTN_DANGER: React.CSSProperties = {
  ...GF, fontSize: 13.5, fontWeight: 600, padding: "9px 18px", minHeight: 40,
  border: "1.5px solid #FECACA", borderRadius: 8, background: "#FEF2F2", color: "#991B1B",
  cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
};

export function Skeleton({ h = 40, mb = 12 }: { h?: number; mb?: number }) {
  return <div className="lagda-skeleton" aria-hidden style={{ height: h, background: "#E2E8F0", borderRadius: 8, marginBottom: mb }} />;
}

/** A tinted pill with dark text. Optional leading dot. */
export function Badge({ tone, children, dot = false, icon: Icon }: {
  tone: Tone; children: React.ReactNode; dot?: boolean; icon?: LucideIcon;
}) {
  const t = TONES[tone];
  return (
    <span style={{
      ...GF, fontSize: 11.5, fontWeight: 700, lineHeight: 1.3, padding: "3px 9px", borderRadius: 999,
      background: t.bg, color: t.fg, border: `1px solid ${t.border}`,
      display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
    }}>
      {dot && <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: t.dot, flexShrink: 0 }} />}
      {Icon && <Icon size={12} aria-hidden strokeWidth={2.2} />}
      {children}
    </span>
  );
}

const COLOR_TONE: Record<string, Tone> = {
  "#16A34A": "success", "#15803D": "success", "#166534": "success",
  "#D97706": "warning", "#92400E": "warning",
  "#DC2626": "danger", "#B91C1C": "danger", "#991B1B": "danger",
  "#0078D4": "info", "#005A9E": "info",
  "#C9960C": "accent", "#CA8A04": "accent",
  "#0F766E": "teal",
};

/** Older call signature: a colour. Mapped to a tone so the text stays readable. */
export function StatusBadge({ label, color, tone }: { label: string; color?: string; tone?: Tone }) {
  return <Badge tone={tone ?? COLOR_TONE[(color ?? "").toUpperCase()] ?? "neutral"}>{label}</Badge>;
}

/** A plain on/off switch. The visible label is the row's text; pass its id. */
export function Switch({ checked, onChange, disabled, labelledBy, describedBy, label, busy }: {
  checked: boolean; onChange: (next: boolean) => void; disabled?: boolean;
  labelledBy?: string; describedBy?: string; label?: string; busy?: boolean;
}) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-labelledby={labelledBy} aria-describedby={describedBy}
      aria-label={labelledBy ? undefined : label} aria-busy={busy || undefined}
      onClick={() => { if (!disabled) onChange(!checked); }} disabled={disabled}
      className="st-switch"
      style={{
        position: "relative", flexShrink: 0, width: 44, height: 26, borderRadius: 999, padding: 0,
        border: `1.5px solid ${checked ? SET.AZURE : "#94A3B8"}`, background: checked ? SET.AZURE : "#E2E8F0",
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1,
        transition: "background-color 150ms ease, border-color 150ms ease",
      }}>
      <span aria-hidden style={{
        position: "absolute", top: 2, left: 2, width: 19, height: 19, borderRadius: "50%", background: "#FFFFFF",
        boxShadow: "0 1px 2px rgba(7,17,31,0.25)", transform: checked ? "translateX(18px)" : "translateX(0)",
        transition: "transform 150ms ease",
      }} />
      <style>{`.st-switch:focus-visible { outline: 3px solid rgba(0,120,212,0.45); outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { .st-switch, .st-switch span { transition: none !important; } }`}</style>
    </button>
  );
}

/** A tinted notice block with an icon. */
export function Notice({ tone, icon: Icon = Info, children, role }: {
  tone: Tone; icon?: LucideIcon; children: React.ReactNode; role?: "status" | "alert" | "note";
}) {
  const t = TONES[tone];
  return (
    <div role={role} style={{
      display: "flex", gap: 10, alignItems: "flex-start", background: t.bg, border: `1px solid ${t.border}`,
      borderRadius: 10, padding: "10px 14px", marginBottom: 16, ...GF, fontSize: 13, lineHeight: 1.55, color: t.fg,
    }}>
      <Icon size={16} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

/** A labelled figure. */
export function StatTile({ label, value, note, icon: Icon, tone = "neutral" }: {
  label: string; value: React.ReactNode; note?: React.ReactNode; icon?: LucideIcon; tone?: Tone;
}) {
  const t = TONES[tone];
  return (
    <div style={{ border: `1px solid ${SET.BORDER}`, borderRadius: 10, padding: "12px 14px", background: "#FFFFFF", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, ...GF, fontSize: 12, fontWeight: 600, color: SET.SLATE }}>
        {Icon && <span aria-hidden style={{ display: "flex", color: t.fg }}><Icon size={14} strokeWidth={2} /></span>}
        <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{label}</span>
      </div>
      <div style={{ fontFamily: SET.MONO, fontSize: 22, fontWeight: 700, color: SET.NAVY, marginTop: 6, lineHeight: 1.2, overflowWrap: "anywhere" }}>{value}</div>
      {note && <div style={{ ...GF, fontSize: 12, color: SET.SLATE, marginTop: 4, lineHeight: 1.45 }}>{note}</div>}
    </div>
  );
}

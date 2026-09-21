// Shared settings shell — sidebar navigation + page layout.
//
// ── The shell mounts once ─────────────────────────────────────────────────
//
// `SettingsLayout` is a ROUTE layout: the router renders it once for
// /app/settings/* and swaps only what is inside its <Outlet>. Before this,
// each of the sixteen pages rendered its own copy of the shell, so moving
// between sections tore down the sidebar and built another one — and since
// every page is its own lazy chunk, the gap showed as a blank flash of the
// whole area. It read as a full page load because it structurally was one.
//
// `SettingsPage` is now a thin wrapper kept for its call signature, so no
// page had to be rewritten. It renders its children and publishes its title
// to the layout through context; the layout owns the header.

import React, {
  createContext, useContext, useLayoutEffect, useMemo, useState, Suspense,
} from "react";
import { Link, useLocation, Outlet } from "react-router";
import { isCapabilityInActiveProfile } from "../../../config/capability-resolver";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";

/** Same tier as the platform's own fixed bars. See components/system z-index. */
const Z_SHELL = 30;
/**
 * Bar height plus its padding — what the content column must clear.
 *
 * 44px pill + 8px padding top and bottom = 60, plus the 1px border, rounded
 * up. Derived rather than guessed: when the pill height changed from 40 to
 * 44 this had to move with it, and a magic number would have quietly left
 * the last control under the bar.
 */
const BOTTOM_NAV_CLEARANCE = 62;

/**
 * Which settings sections are backed by a real API.
 *
 * ── Why a list here, rather than a banner each page imports ───────────────
 *
 * Every unwired page used to render a shared `DEMO_NOTICE` itself, which made
 * "is this section live?" a fact each page asserted about itself. Wiring a
 * section then meant remembering to delete two lines in it — and that is
 * exactly what went wrong: Profile was connected to GET /me and PATCH
 * /me/profile, the banner was removed, and a success message reading "Profile
 * updated in this frontend demonstration" was left behind, telling people
 * their saved name had been discarded when it had not.
 *
 * With the list, wiring a section is adding its path here. The preview note
 * then disappears everywhere it appeared, for that section, at once.
 */
const LIVE_SETTINGS_PATHS = [
  "/app/settings/profile",
  "/app/settings/signatures",
];

export function isLiveSettingsPath(pathname: string): boolean {
  return LIVE_SETTINGS_PATHS.some(
    live => pathname === live || pathname.startsWith(`${live}/`));
}

/**
 * The preview note, in place of the old bordered yellow block.
 *
 * ── Why smaller is MORE honest here ───────────────────────────────────────
 *
 * The unwired pages already disclose at the point of action, thoroughly —
 * "Password update simulated. No real credential was changed.", "Session
 * revocation simulated. No production session was invalidated.", and so on,
 * around thirty-five such lines. Those appear when somebody acts.
 *
 * The block at the top was the least load-bearing of those disclosures and
 * the most expensive: it was also the one that had scrolled off the screen by
 * the time anyone pressed Save. Shrinking it costs nothing that was doing
 * work, and returns roughly 40-55px above the fold on every settings page at
 * phone width.
 *
 * What it must never become is a hint. The clause that does the honest work —
 * nothing is saved, changes are gone when you reload — is stated plainly, and
 * is never behind a tooltip or a "learn more".
 */
function PreviewNote({ overview }: { overview: boolean }) {
  return (
    <p style={{
      ...GF, margin: "8px 0 0", display: "flex", gap: 7, alignItems: "baseline",
      fontSize: "clamp(11.5px, 3vw, 12.5px)", lineHeight: 1.55,
      color: "#92400E", maxWidth: "62ch",
    }}>
      <span aria-hidden style={{
        flexShrink: 0, width: 6, height: 6, borderRadius: "50%",
        background: "#D97706", transform: "translateY(-1px)",
      }} />
      <span>
        <strong style={{ fontWeight: 700 }}>Preview.</strong>{" "}
        {overview
          // The overview has no controls of its own, so "nothing is saved"
          // would describe a page that never claimed to save anything.
          ? "The figures below are sample data, and most sections here do not save changes yet. Profile and Signatures & Initials are live."
          : "You can try these controls, but nothing on this page is saved — your changes are gone when you reload."}
      </span>
    </p>
  );
}

/**
 * The save confirmation for a section that does not save.
 *
 * Replaces four separately-worded variants that said the same thing four
 * ways. Pages whose bespoke message names a specific simulated side effect —
 * a credential not changed, a session not revoked — keep theirs: those are
 * more informative than anything generic.
 */
export function PreviewSaved() {
  return (
    <span role="status" style={{ ...GF, fontSize: 13, color: "#16A34A" }}>
      Applied for this visit only — not saved to your account.
    </span>
  );
}

interface SettingsNavItem {
  path:     string;
  label:    string;
  group:    "personal" | "workspace";
  sub?:     { path: string; label: string }[];
  /** When set, the entry is shown only if this capability is in the active profile. */
  capability?: string;
}

const ALL_SETTINGS_NAV: SettingsNavItem[] = [
  { path: "/app/settings/profile",       label: "Profile",           group: "personal" },
  { path: "/app/settings/preferences",   label: "Preferences",       group: "personal" },
  { path: "/app/settings/security",      label: "Security",          group: "personal",
    sub: [
      { path: "/app/settings/security/password", label: "Password" },
      { path: "/app/settings/security/mfa",      label: "Multi-Factor Auth" },
      { path: "/app/settings/security/sessions", label: "Active Sessions" },
      { path: "/app/settings/security/activity", label: "Security Activity" },
    ]
  },
  { path: "/app/settings/notifications", label: "Notifications",     group: "personal" },
  { path: "/app/settings/signatures",    label: "Signatures & Initials", group: "personal" },
  { path: "/app/settings/data-and-privacy", label: "Data & Privacy", group: "personal" },
  { path: "/app/settings/branding",      label: "Branding",          group: "workspace" },
  { path: "/app/settings/billing",       label: "Billing & Plan",    group: "workspace" },
  { path: "/app/settings/usage",         label: "Usage",             group: "workspace" },
  // Integrations is post-launch and its route is capability-guarded. Linking to it
  // from the launch profile would produce a dead end.
  { path: "/app/settings/integrations",  label: "Integrations",      group: "workspace", capability: "integrations" },
];

export const SETTINGS_NAV: SettingsNavItem[] =
  ALL_SETTINGS_NAV.filter((n) => !n.capability || isCapabilityInActiveProfile(n.capability));

/**
 * One entry, and the reason it was overflowing.
 *
 * The nav declared `width: 220` inside a panel that is `width: 220` with
 * `padding: "16px 8px"` — so 220px of nav in a 204px content box, and the
 * selected item's background bled past the panel's rounded border. Fixed at
 * the source: the nav fills its parent (`width: "100%"`) rather than
 * restating a number that stopped being true when the padding was added.
 *
 * ── Hover and selection ───────────────────────────────────────────────────
 *
 * Both were doing the same thing before — a wash of the same blue — so a
 * hovered item and the current one were hard to tell apart while the pointer
 * was moving. Now selection carries an accent bar and a heavier weight, and
 * hover is a neutral grey that reads as "you could go here" rather than "you
 * are here". The bar is inset via padding, never a negative offset, so it
 * cannot reintroduce the overflow this comment is about.
 */
function NavEntry({ item }: { item: SettingsNavItem }) {
  const loc = useLocation();
  const [hovered, setHovered] = useState(false);
  const isActive = loc.pathname === item.path || (item.path !== "/app/settings" && loc.pathname.startsWith(item.path));
  const showSubs = item.sub && (loc.pathname.startsWith(item.path));
  const selected = isActive && !showSubs;

  return (
    <li>
      <Link
        to={item.path}
        aria-current={selected ? "page" : undefined}
        onMouseEnter={() => { setHovered(true); }}
        onMouseLeave={() => { setHovered(false); }}
        onFocus={() => { setHovered(true); }}
        onBlur={() => { setHovered(false); }}
        style={{
          display: "block",
          width: "100%",
          boxSizing: "border-box",
          // The 3px of the left edge is the accent bar's lane, present in
          // every state so the label never shifts when one is selected.
          padding: "7px 12px 7px 11px",
          borderLeft: `3px solid ${selected ? AZURE : "transparent"}`,
          borderRadius: 6,
          textDecoration: "none",
          ...GF,
          fontSize: 13,
          fontWeight: selected ? 600 : 400,
          color: selected ? AZURE : NAVY,
          background: selected ? "#EBF5FB" : hovered ? "#F1F5F9" : "transparent",
          transition: "background 120ms ease, color 120ms ease",
        }}
      >
        {item.label}
      </Link>
      {showSubs && item.sub && (
        <ul style={{ listStyle: "none", margin: "2px 0 4px", padding: "0 0 0 18px" }}>
          {item.sub.map(s => <SubNavEntry key={s.path} sub={s} />)}
        </ul>
      )}
    </li>
  );
}

function SubNavEntry({ sub }: { sub: { path: string; label: string } }) {
  const loc = useLocation();
  const [hovered, setHovered] = useState(false);
  const selected = loc.pathname === sub.path;

  return (
    <li>
      <Link
        to={sub.path}
        aria-current={selected ? "page" : undefined}
        onMouseEnter={() => { setHovered(true); }}
        onMouseLeave={() => { setHovered(false); }}
        onFocus={() => { setHovered(true); }}
        onBlur={() => { setHovered(false); }}
        style={{
          display: "block",
          width: "100%",
          boxSizing: "border-box",
          padding: "6px 10px 6px 9px",
          borderLeft: `3px solid ${selected ? AZURE : "transparent"}`,
          borderRadius: 6,
          textDecoration: "none",
          ...GF,
          fontSize: 12,
          fontWeight: selected ? 600 : 400,
          color: selected ? AZURE : SLATE,
          background: selected ? "#EBF5FB" : hovered ? "#F1F5F9" : "transparent",
          transition: "background 120ms ease, color 120ms ease",
        }}
      >
        {sub.label}
      </Link>
    </li>
  );
}

export function SettingsSidebar() {
  const personal = SETTINGS_NAV.filter(n => n.group === "personal");
  const workspace = SETTINGS_NAV.filter(n => n.group === "workspace");

  return (
    <nav aria-label="Settings navigation" style={{ width: "100%", minWidth: 0 }}>
      <div style={{ ...GF, fontSize: 10, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 14px 6px" }}>Personal</div>
      <ul style={{ listStyle: "none", margin: "0 0 16px", padding: 0 }}>
        {personal.map(item => <NavEntry key={item.path} item={item} />)}
      </ul>
      <div style={{ ...GF, fontSize: 10, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 14px 6px" }}>Workspace</div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {workspace.map(item => <NavEntry key={item.path} item={item} />)}
      </ul>
      <div style={{ marginTop: 16, borderTop: "1px solid #E3E8EF", paddingTop: 12 }}>
        <Link to="/app/workspace" style={{ ...GF, fontSize: 12, color: SLATE, textDecoration: "none", padding: "5px 14px", display: "block" }}>
          ← Workspace Admin
        </Link>
        <Link to="/app/dashboard" style={{ ...GF, fontSize: 12, color: SLATE, textDecoration: "none", padding: "5px 14px", display: "block" }}>
          ← Dashboard
        </Link>
      </div>
    </nav>
  );
}

// ── Bottom navigation, for anything narrower than a desktop ────────────────
//
// ── Why 1024 and not 768 ──────────────────────────────────────────────────
//
// The platform's own breakpoint is 768: at 767 and below it swaps its sidebar
// for a top bar and drawer. But at 768-1023 it shows the FULL desktop
// sidebar, and settings then added a second 220px rail beside it. On a 768px
// tablet that is most of the width spent on navigation before any content.
//
// So settings moves to the bottom at 1024, which covers phones and the whole
// tablet range, and leaves the desktop layout exactly as it was.
//
// ── Why a scroller rather than a fitted bar ───────────────────────────────
//
// There are eleven top-level entries with labels like "Signatures & Initials".
// They do not fit across a phone, and the usual answers — truncating to
// icons, or hiding half behind "More" — either lose the labels that make the
// sections findable or bury the ones that lost a coin toss.
//
// A scroller keeps every label. What makes it usable rather than a place
// things hide is that the current item is scrolled into view on arrival, so
// the bar always opens showing you where you are.

function SettingsBottomNav() {
  const loc = useLocation();
  const activeRef = React.useRef<HTMLAnchorElement | null>(null);

  React.useEffect(() => {
    // `nearest` on the inline axis moves the strip only as far as it must,
    // and `block: "nearest"` stops the browser scrolling the PAGE to reach a
    // bar that is already fixed to the bottom of it.
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [loc.pathname]);

  const items = SETTINGS_NAV;
  // `.at(-1)` is ES2022 and this project's lib predates it, so plain indexing.
  const personal = items.filter(i => i.group === "personal");
  const lastPersonal = personal.length > 0
    ? personal[personal.length - 1]?.path
    : undefined;

  return (
    <nav
      aria-label="Settings navigation"
      className="settings-bottom-nav"
      style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: Z_SHELL,
        background: "#FFFFFF", borderTop: "1px solid #E3E8EF",
        // Clears the iOS home indicator. Zero everywhere it does not apply.
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -2px 10px rgba(7,17,31,0.06)",
        // Fade the two ends so the strip reads as "there is more this way"
        // rather than as a list that happens to stop at the screen edge. The
        // mask is the affordance; without it a scroller looks truncated.
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)",
        maskImage:
          "linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)",
      }}
    >
      <ul
        style={{
          display: "flex", gap: 6, listStyle: "none", margin: 0,
          padding: "8px 16px", overflowX: "auto", overflowY: "hidden",
          scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
          // Each pill settles under the thumb rather than half-off the edge.
          scrollSnapType: "x proximity",
        }}
      >
        {items.map(item => (
          <React.Fragment key={item.path}>
            <BottomEntry item={item} activeRef={activeRef} />
            {item.path === lastPersonal && (
              // The grouping is carried by headings in the sidebar. A bar has
              // no room for those, so the boundary becomes a rule — without
              // it, "Data & Privacy" and "Branding" read as one flat list.
              <li aria-hidden style={{
                flex: "0 0 auto", width: 1, alignSelf: "stretch",
                background: "#E3E8EF", margin: "2px 4px",
              }} />
            )}
          </React.Fragment>
        ))}
      </ul>
    </nav>
  );
}

function BottomEntry({ item, activeRef }: {
  item: SettingsNavItem;
  activeRef: React.MutableRefObject<HTMLAnchorElement | null>;
}) {
  const loc = useLocation();
  const selected = loc.pathname === item.path
    || (item.path !== "/app/settings" && loc.pathname.startsWith(item.path));

  return (
    <li style={{ flex: "0 0 auto" }}>
      <Link
        to={item.path}
        ref={selected ? activeRef : undefined}
        aria-current={selected ? "page" : undefined}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          // 44px: the product's minimum comfortable touch target. This bar is
          // operated by a thumb at the bottom of a phone, which is the worst
          // place to be a few pixels short.
          minHeight: 44, padding: "0 16px", borderRadius: 999,
          scrollSnapAlign: "center",
          textDecoration: "none", whiteSpace: "nowrap",
          ...GF, fontSize: 13, fontWeight: selected ? 700 : 500,
          color: selected ? "#FFFFFF" : NAVY,
          background: selected ? AZURE : "#F1F5F9",
          transition: "background 120ms ease, color 120ms ease",
        }}
      >
        {item.label}
      </Link>
    </li>
  );
}

interface SettingsPageProps {
  title:       string;
  breadcrumb?: string;
  children:    React.ReactNode;
}

// ── Title plumbing ──────────────────────────────────────────────────────────

interface PageHeading { title: string; breadcrumb?: string }

/**
 * How a page tells the layout what to put in the header.
 *
 * The alternative was deriving the heading from the path in the layout, which
 * needs no context — but several pages have titles that differ from their nav
 * label, and a lookup table would silently print the wrong one the first time
 * those drifted apart. The page already knows its title; this just carries it.
 */
const HeadingContext = createContext<((heading: PageHeading) => void) | null>(null);

/**
 * The per-page wrapper. Renders its children, and publishes its heading.
 *
 * `useLayoutEffect` rather than `useEffect` so the header updates in the same
 * commit the content does. With `useEffect` the new section's body paints for
 * one frame under the previous section's title.
 */
export function SettingsPage({ title, breadcrumb, children }: SettingsPageProps) {
  const publish = useContext(HeadingContext);
  useLayoutEffect(() => {
    publish?.({ title, breadcrumb });
  }, [publish, title, breadcrumb]);

  return <>{children}</>;
}

/**
 * The quiet fallback for the content column.
 *
 * Deliberately NOT a spinner. Chunks are small and usually arrive within a
 * frame or two; a spinner that appears and vanishes that fast reads as a
 * glitch. Holding the column's height keeps the sidebar and header still and
 * stops the page jumping when the content lands.
 */
function ContentFallback() {
  return <div style={{ minHeight: "40vh" }} aria-busy="true" />;
}

/**
 * The settings shell. Mounted once for /app/settings/* by the router.
 */
export function SettingsLayout() {
  const [heading, setHeading] = useState<PageHeading>({ title: "Settings" });
  // Stable identity: a new function each render would re-fire every page's
  // publishing effect on every render of the layout.
  const publish = useMemo(() => (next: PageHeading) => { setHeading(next); }, []);

  return (
    <HeadingContext.Provider value={publish}>
      <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
        <header className="settings-header" style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: "16px 24px" }}>
          {heading.breadcrumb && (
            <nav aria-label="Breadcrumb" style={{ marginBottom: 6 }}>
              <ol style={{ display: "flex", gap: 6, listStyle: "none", margin: 0, padding: 0, ...GF, fontSize: 12, color: SILVER }}>
                <li><Link to="/app/settings" style={{ color: AZURE, textDecoration: "none" }}>Settings</Link></li>
                {heading.breadcrumb.split(" › ").map((crumb, i, arr) => [
                  <li key={`sep-${i}`} aria-hidden>›</li>,
                  <li key={`crumb-${i}`} style={{ color: i === arr.length - 1 ? SLATE : AZURE }}>
                    {crumb}
                  </li>,
                ])}
              </ol>
            </nav>
          )}
          <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>
            {heading.title}
          </h1>
          {/* Decided once, here, from the route — not asserted by each page
              about itself. See LIVE_SETTINGS_PATHS. */}
          {!isLiveSettingsPath(location.pathname) && (
            <PreviewNote overview={location.pathname === "/app/settings"} />
          )}
        </header>

        <div style={{ display: "flex", gap: 0, maxWidth: 1100, margin: "0 auto" }}>
          {/* Unchanged at >=1024. Hidden below it, where the bottom bar takes
              over — the markup and styles here are exactly what shipped. */}
          <div className="settings-side-nav" style={{ padding: "24px 0 24px 24px", display: "flex" }}>
            <div style={{ width: 220, flexShrink: 0, background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "16px 8px", alignSelf: "flex-start", position: "sticky", top: 24 }}>
              <SettingsSidebar />
            </div>
          </div>

          {/* Only this column suspends. The sidebar and header above never
              unmount, which is the whole point of the layout route. */}
          <main id="main-content" className="settings-main" style={{ flex: 1, minWidth: 0 }}>
            <Suspense fallback={<ContentFallback />}>
              <Outlet />
            </Suspense>
          </main>
        </div>

        <SettingsBottomNav />

        <style>{`
          /* Desktop and up: the sidebar, exactly as before. */
          @media (min-width: 1024px) {
            .settings-side-nav   { display: flex !important; }
            .settings-bottom-nav { display: none !important; }
            .settings-main       { padding: 24px 24px 48px !important; }
          }
          /* Phones and tablets: bottom bar, and the rail steps aside. */
          @media (max-width: 1023px) {
            .settings-side-nav   { display: none !important; }
            .settings-bottom-nav { display: block !important; }
            .settings-main {
              /* Gutters shrink with the viewport; the bottom clears the fixed
                 bar AND the home indicator, so the last control is reachable
                 rather than sitting under either. */
              padding: 16px clamp(12px, 4vw, 24px)
                       calc(${BOTTOM_NAV_CLEARANCE}px + env(safe-area-inset-bottom, 0px) + 24px) !important;
            }
            .settings-header { padding: 12px clamp(12px, 4vw, 24px) !important; }
          }
          /* The strip scrolls; it should not advertise it with a scrollbar. */
          .settings-bottom-nav ul::-webkit-scrollbar { display: none; }
        `}</style>
      </div>
    </HeadingContext.Provider>
  );
}

// Shared form primitives

export function SCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "20px 24px", marginBottom: 16, ...style }}>
      {children}
    </div>
  );
}

export function SSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <SCard>
      <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>{title}</h2>
      {children}
    </SCard>
  );
}

export function SField({ label, help, required, children }: { label: string; help?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ flex: "0 0 200px", minWidth: 140, paddingTop: 8 }}>
        <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY }}>
          {label}{required && <span aria-label="required" style={{ color: "#DC2626", marginLeft: 3 }}>*</span>}
        </div>
        {help && <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 3, lineHeight: 1.4 }}>{help}</div>}
      </div>
      <div style={{ flex: "1 1 260px", minWidth: 180 }}>{children}</div>
    </div>
  );
}

export const INPUT_STYLE: React.CSSProperties = {
  ...GF, fontSize: 13, padding: "9px 12px",
  border: "1.5px solid #D1D9E0", borderRadius: 8,
  width: "100%", outline: "none", boxSizing: "border-box",
  background: "#FFFFFF",
};

export const BTN_PRIMARY: React.CSSProperties = {
  ...GF, fontSize: 13, fontWeight: 600, padding: "9px 20px",
  border: "none", borderRadius: 8, background: AZURE, color: "#FFFFFF",
  cursor: "pointer",
};

export const BTN_SECONDARY: React.CSSProperties = {
  ...GF, fontSize: 13, fontWeight: 500, padding: "9px 20px",
  border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", color: NAVY,
  cursor: "pointer",
};

export const BTN_DANGER: React.CSSProperties = {
  ...GF, fontSize: 13, fontWeight: 600, padding: "9px 20px",
  border: "1.5px solid #FECACA", borderRadius: 8, background: "#FEF2F2", color: "#991B1B",
  cursor: "pointer",
};

export function Skeleton({ h = 40, mb = 12 }: { h?: number; mb?: number }) {
  return <div style={{ height: h, background: "#E2E8F0", borderRadius: 8, marginBottom: mb }} />;
}

export function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ ...GF, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: `${color}22`, color, display: "inline-block" }}>
      {label}
    </span>
  );
}

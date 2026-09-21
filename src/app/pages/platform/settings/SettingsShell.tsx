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

export const DEMO_NOTICE = (
  <div role="note" style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "8px 14px", marginBottom: 18, ...GF, fontSize: 12, color: "#92400E" }}>
    Frontend demonstration — all changes are session-local and reset on page reload. No backend services are connected.
  </div>
);

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
        <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: "16px 24px" }}>
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
        </header>

        <div style={{ display: "flex", gap: 0, maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ padding: "24px 0 24px 24px", display: "flex" }}>
            <div style={{ width: 220, flexShrink: 0, background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "16px 8px", alignSelf: "flex-start", position: "sticky", top: 24 }}>
              <SettingsSidebar />
            </div>
          </div>

          {/* Only this column suspends. The sidebar and header above never
              unmount, which is the whole point of the layout route. */}
          <main id="main-content" style={{ flex: 1, padding: "24px 24px 48px", minWidth: 0 }}>
            <Suspense fallback={<ContentFallback />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
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

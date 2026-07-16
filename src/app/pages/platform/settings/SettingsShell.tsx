// Shared settings shell — sidebar navigation + page layout.
// All 15 settings routes import this.
// No Burgundy. No eNotary. No Tailwind.

import React from "react";
import { Link, useLocation } from "react-router";

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
}

export const SETTINGS_NAV: SettingsNavItem[] = [
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
  { path: "/app/settings/data-and-privacy", label: "Data & Privacy", group: "personal" },
  { path: "/app/settings/branding",      label: "Branding",          group: "workspace" },
  { path: "/app/settings/billing",       label: "Billing & Plan",    group: "workspace" },
  { path: "/app/settings/usage",         label: "Usage",             group: "workspace" },
  { path: "/app/settings/integrations",  label: "Integrations",      group: "workspace" },
];

function NavEntry({ item }: { item: SettingsNavItem }) {
  const loc = useLocation();
  const isActive = loc.pathname === item.path || (item.path !== "/app/settings" && loc.pathname.startsWith(item.path));
  const showSubs = item.sub && (loc.pathname.startsWith(item.path));

  return (
    <li>
      <Link to={item.path} style={{
        display: "block", padding: "6px 14px", borderRadius: 6, textDecoration: "none",
        ...GF, fontSize: 13, fontWeight: isActive && !showSubs ? 600 : 400,
        color: isActive ? AZURE : NAVY,
        background: isActive && !showSubs ? "#EBF5FB" : "transparent",
      }}>
        {item.label}
      </Link>
      {showSubs && item.sub && (
        <ul style={{ listStyle: "none", margin: "2px 0 4px", padding: "0 0 0 24px" }}>
          {item.sub.map(s => {
            const sa = loc.pathname === s.path;
            return (
              <li key={s.path}>
                <Link to={s.path} style={{
                  display: "block", padding: "5px 10px", borderRadius: 6, textDecoration: "none",
                  ...GF, fontSize: 12, fontWeight: sa ? 600 : 400,
                  color: sa ? AZURE : SLATE,
                  background: sa ? "#EBF5FB" : "transparent",
                }}>
                  {s.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

export function SettingsSidebar() {
  const personal = SETTINGS_NAV.filter(n => n.group === "personal");
  const workspace = SETTINGS_NAV.filter(n => n.group === "workspace");

  return (
    <nav aria-label="Settings navigation" style={{ width: 220, flexShrink: 0 }}>
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

export function SettingsPage({ title, breadcrumb, children }: SettingsPageProps) {
  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: "16px 24px" }}>
        {breadcrumb && (
          <nav aria-label="Breadcrumb" style={{ marginBottom: 6 }}>
            <ol style={{ display: "flex", gap: 6, listStyle: "none", margin: 0, padding: 0, ...GF, fontSize: 12, color: SILVER }}>
              <li><Link to="/app/settings" style={{ color: AZURE, textDecoration: "none" }}>Settings</Link></li>
              {breadcrumb.split(" › ").map((crumb, i, arr) => [
                <li key={`sep-${i}`} aria-hidden>›</li>,
                <li key={`crumb-${i}`} style={{ color: i === arr.length - 1 ? SLATE : AZURE }}>
                  {crumb}
                </li>,
              ])}
            </ol>
          </nav>
        )}
        <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>{title}</h1>
      </header>

      <div style={{ display: "flex", gap: 0, maxWidth: 1100, margin: "0 auto" }}>
        {/* Sidebar */}
        <div style={{ padding: "24px 0 24px 24px", display: "flex" }}>
          <div style={{ width: 220, flexShrink: 0, background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "16px 8px", alignSelf: "flex-start", position: "sticky", top: 24 }}>
            <SettingsSidebar />
          </div>
        </div>

        {/* Main content */}
        <main id="main-content" style={{ flex: 1, padding: "24px 24px 48px", minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
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

import { Outlet, Link, useLocation, NavLink } from "react-router";
import { LagdaLogo } from "../components/brand/LagdaLogo";

// Authenticated platform shell — left-sidebar layout.
// Navy sidebar + white content area. Responsive: sidebar collapses to icons on ≤768px.

const NAVY = "#07111F";
const NAVY2 = "#0B1929";
const BORDER = "rgba(255,255,255,0.07)";
const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

const NAV_ITEMS = [
  { to: "/app/documents", label: "Documents",  icon: "📄" },
  { to: "/app/templates", label: "Templates",  icon: "📑" },
  { to: "/app/contacts",  label: "Contacts",   icon: "📇" },
  { to: "/app/activity",  label: "Activity",   icon: "📋" },
  { to: "/app/settings",  label: "Settings",   icon: "⚙️" },
];

export function PlatformLayout() {
  const { pathname } = useLocation();

  return (
    <div style={{ minHeight: "100vh", display: "flex", ...GF }}>
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside
        aria-label="Platform navigation"
        style={{
          width: 220, flexShrink: 0,
          background: NAVY,
          borderRight: `1px solid ${BORDER}`,
          display: "flex", flexDirection: "column",
          position: "sticky", top: 0, height: "100vh",
          overflowY: "auto",
          zIndex: 50,
        }}
        className="platform-sidebar"
      >
        {/* Logo + workspace */}
        <div style={{ padding: "18px 20px 12px", borderBottom: `1px solid ${BORDER}` }}>
          <Link to="/" style={{ display: "block", textDecoration: "none", marginBottom: 14 }}>
            <LagdaLogo variant="white-horizontal" size="sm" decorative />
          </Link>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`,
            borderRadius: 8, padding: "7px 10px", cursor: "pointer",
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 5,
              background: "#0078D4", display: "flex", alignItems: "center",
              justifyContent: "center", ...GM, fontSize: 9, color: "white", fontWeight: 700, flexShrink: 0,
            }}>NL</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Northbridge Legal
              </p>
              <p style={{ color: "#475569", ...GM, fontSize: 9, margin: 0 }}>Professional</p>
            </div>
            <span style={{ color: "#334155", fontSize: 10 }}>▾</span>
          </div>
        </div>

        {/* Nav links */}
        <nav aria-label="Platform sections" style={{ flex: 1, padding: "10px 10px" }}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV_ITEMS.map(({ to, label, icon }) => {
              const active = pathname === to || (to !== "/app" && pathname.startsWith(to));
              return (
                <li key={to}>
                  <NavLink
                    to={to}
                    aria-current={active ? "page" : undefined}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 10px", borderRadius: 8, textDecoration: "none",
                      background: active ? "rgba(0,120,212,0.14)" : "transparent",
                      border: active ? "1px solid rgba(0,120,212,0.25)" : "1px solid transparent",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span aria-hidden style={{ fontSize: 14, width: 18, textAlign: "center" }}>{icon}</span>
                    <span style={{
                      color: active ? "#38bdf8" : "#64748b",
                      ...GF, fontSize: 13, fontWeight: active ? 600 : 400,
                    }}>
                      {label}
                    </span>
                    {to === "/app/documents" && (
                      <span style={{
                        marginLeft: "auto", background: "rgba(0,120,212,0.14)",
                        color: "#0078D4", ...GM, fontSize: 9, fontWeight: 700,
                        padding: "1px 6px", borderRadius: 999,
                      }}>8</span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>

          {/* Quick action */}
          <div style={{ marginTop: 20 }}>
            <Link
              to="/app/prepare"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, background: "#0078D4", color: "white",
                borderRadius: 8, padding: "9px 14px", textDecoration: "none",
                ...GF, fontSize: 13, fontWeight: 600, minHeight: 36,
              }}
            >
              <span aria-hidden>+</span> Prepare Document
            </Link>
          </div>
        </nav>

        {/* User footer */}
        <div style={{
          padding: "12px 16px", borderTop: `1px solid ${BORDER}`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "rgba(0,120,212,0.2)", display: "flex",
            alignItems: "center", justifyContent: "center",
            ...GM, fontSize: 10, color: "#38bdf8", fontWeight: 700, flexShrink: 0,
          }}>AR</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Ana Reyes
            </p>
            <p style={{ color: "#475569", ...GM, fontSize: 9, margin: 0 }}>Owner</p>
          </div>
          <Link to="/sign-in" style={{ color: "#334155", fontSize: 12, textDecoration: "none" }} title="Sign out">↩</Link>
        </div>
      </aside>

      {/* ── Content ──────────────────────────────────────────────── */}
      <main
        id="main-content"
        style={{ flex: 1, background: "#F8FAFC", minWidth: 0, overflowX: "auto" }}
        tabIndex={-1}
      >
        <Outlet />
      </main>

      <style>{`
        .platform-sidebar a:hover span[style] { color: white !important; }
        .platform-sidebar a:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; border-radius: 8px; }
        @media (max-width: 768px) {
          .platform-sidebar { width: 56px !important; }
          .platform-sidebar span[style*="color: #64748b"], .platform-sidebar p, .platform-sidebar .hide-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}

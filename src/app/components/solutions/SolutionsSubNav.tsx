import { useLocation, Link } from "react-router";
import { SOLUTIONS_NAV } from "../../pages/public/solutions/content";
import { Z } from "../../utils/z-index";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

const GROUPS = ["Legal", "Business", "Property & Services", "Public & Institutional"] as const;
const GROUP_COLORS: Record<string, string> = {
  "Legal": "#38bdf8",
  "Business": "#0078D4",
  "Property & Services": "#22C55E",
  "Public & Institutional": "#a78bfa",
};

export function SolutionsSubNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Solutions navigation"
      style={{
        position: "sticky", top: 72, zIndex: Z.sticky,
        background: "rgba(7,17,31,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        padding: "0 24px",
        display: "flex", gap: 0, overflowX: "auto",
        scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
      }}>
        {GROUPS.map((group) => {
          const items = SOLUTIONS_NAV.filter((n) => n.group === group);
          const isGroupActive = items.some((n) => pathname === n.path || pathname.startsWith(n.path + "/"));
          return (
            <div key={group} style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
              {/* Group label — non-interactive */}
              <div style={{
                display: "flex", alignItems: "center",
                padding: "0 12px 0 16px",
                borderRight: "1px solid rgba(255,255,255,0.06)",
                flexShrink: 0,
              }}>
                <span style={{
                  color: isGroupActive ? GROUP_COLORS[group] : "#334155",
                  ...GM, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                  textTransform: "uppercase", whiteSpace: "nowrap",
                  transition: "color 0.15s ease",
                }}>
                  {group}
                </span>
              </div>
              {/* Links for this group */}
              {items.map((item) => {
                const active = pathname === item.path || pathname.startsWith(item.path + "/");
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={active ? "page" : undefined}
                    style={{
                      textDecoration: "none", flexShrink: 0,
                      display: "flex", alignItems: "center",
                      padding: "14px 14px",
                      borderBottom: active ? `2px solid ${GROUP_COLORS[group]}` : "2px solid transparent",
                      transition: "border-color 0.15s ease, color 0.15s ease",
                    }}
                  >
                    <span style={{
                      ...GF, fontSize: 13,
                      fontWeight: active ? 700 : 500,
                      color: active ? "white" : "#64748b",
                      whiteSpace: "nowrap",
                      transition: "color 0.15s ease",
                    }}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
      <style>{`
        nav[aria-label="Solutions navigation"] ::-webkit-scrollbar { display: none; }
        nav[aria-label="Solutions navigation"] a:hover span { color: white !important; }
      `}</style>
    </nav>
  );
}

export function SolPageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SolutionsSubNav />
      {children}
    </>
  );
}

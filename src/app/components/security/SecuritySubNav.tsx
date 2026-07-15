import { Link, useLocation } from "react-router";
import { SECURITY_SUBNAV } from "../../pages/public/security/content";

const GF = { fontFamily: "'Geist', sans-serif" };

export function SecuritySubNav() {
  const { pathname } = useLocation();

  const isActive = (path: string) => {
    if (path === "/security") return pathname === "/security" || pathname === "/security/";
    return pathname.startsWith(path);
  };

  return (
    <nav
      aria-label="Security pages"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(7,17,31,0.95)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 72,
        zIndex: 40,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        <ul
          role="list"
          style={{
            display: "flex",
            gap: 0,
            listStyle: "none",
            margin: 0,
            padding: 0,
            whiteSpace: "nowrap",
          }}
        >
          {SECURITY_SUBNAV.map((item) => {
            const active = isActive(item.path);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  aria-current={active ? "page" : undefined}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "12px 14px",
                    ...GF,
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? "white" : "#64748b",
                    textDecoration: "none",
                    borderBottom: active ? "2px solid #0078D4" : "2px solid transparent",
                    marginBottom: -1,
                    transition: "color 0.15s ease, border-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "#94a3b8"; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "#64748b"; }}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <style>{`nav[aria-label="Security pages"] ::-webkit-scrollbar { display: none; }`}</style>
    </nav>
  );
}

export function SecurityPageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SecuritySubNav />
      {children}
    </>
  );
}

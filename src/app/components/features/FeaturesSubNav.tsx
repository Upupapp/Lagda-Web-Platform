import { Link, useLocation } from "react-router";
import { FEATURES_GROUPS } from "../../pages/public/features/content";

const GF = { fontFamily: "'Geist', sans-serif" };

export function FeaturesSubNav() {
  const { pathname } = useLocation();

  const activeGroup = FEATURES_GROUPS.find((g) =>
    g.paths.some((p) => {
      if (g.groupKey === "overview") return pathname === "/features" || pathname === "/features/";
      return pathname.startsWith(p);
    })
  );

  return (
    <nav
      aria-label="Features sections"
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
          {FEATURES_GROUPS.map((group) => {
            const active = activeGroup?.groupKey === group.groupKey;
            return (
              <li key={group.groupKey}>
                <Link
                  to={group.linkTo}
                  aria-current={active ? "page" : undefined}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "12px 16px",
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
                  {group.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <style>{`nav[aria-label="Features sections"] ::-webkit-scrollbar { display: none; }`}</style>
    </nav>
  );
}

export function FeaturesPageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FeaturesSubNav />
      {children}
    </>
  );
}

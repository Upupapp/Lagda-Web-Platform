import { Link } from "react-router";
import { LagdaLogo } from "@/app/components/brand/LagdaLogo";
import { FOOTER_COLUMNS } from "@/app/config/nav.config";

export function PublicFooter() {
  const year = new Date().getFullYear();
  const GF = { fontFamily: "'Geist', sans-serif" };

  return (
    <footer
      role="contentinfo"
      style={{
        background: "#060e1a",
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* eNotary compliance notice */}
      <div style={{
        background: "rgba(103,2,59,0.1)",
        borderBottom: "1px solid rgba(176,18,98,0.2)",
        padding: "10px 48px",
        textAlign: "center",
      }}>
        <p style={{
          margin: 0,
          color: "#94a3b8",
          fontFamily: "'Geist Mono', monospace",
          fontSize: 11,
          letterSpacing: "0.02em",
        }}>
          LAGDA eSignature is available now.{" "}
          <span style={{ color: "#b01262", fontWeight: 600 }}>
            LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules.
          </span>
        </p>
      </div>

      {/* Main footer body */}
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "64px 48px 48px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "260px repeat(6, 1fr)",
          gap: "0 40px",
          alignItems: "start",
        }}>
          {/* Brand column */}
          <div>
            <Link to="/esignature" style={{ display: "inline-block", marginBottom: 16 }}>
              <LagdaLogo variant="white-horizontal" size="sm" decorative />
            </Link>
            <p style={{
              color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0, marginBottom: 20,
            }}>
              The Philippine-first electronic signature and document verification platform for legal, business, and institutional workflows.
            </p>
            <p style={{
              color: "#334155", ...GF, fontSize: 11, lineHeight: 1.5, margin: 0,
            }}>
              A product of{" "}
              <span style={{ color: "#64748b", fontWeight: 600 }}>UpUp Technologies</span>
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <h3 style={{
                  color: col.isComingSoon ? "#67023b" : "white",
                  ...GF, fontSize: 12, fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase", margin: 0,
                }}>
                  {col.heading}
                </h3>
                {col.isComingSoon && (
                  <span style={{
                    background: "rgba(103,2,59,0.3)", color: "#fce7f3",
                    border: "1px solid rgba(176,18,98,0.4)", borderRadius: 999,
                    padding: "1px 6px", fontSize: 9, fontWeight: 700, ...GF,
                  }}>
                    Soon
                  </span>
                )}
              </div>
              <ul role="list" style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.path}
                      style={{
                        color: link.isComingSoon ? "#475569" : "#64748b",
                        ...GF, fontSize: 13, textDecoration: "none",
                        transition: "color 0.18s ease",
                        display: "inline-flex", alignItems: "center", gap: 6,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = link.isComingSoon ? "#94a3b8" : "#e2e8f0"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = link.isComingSoon ? "#475569" : "#64748b"; }}
                    >
                      {link.label}
                      {link.isComingSoon && (
                        <span style={{ color: "#67023b", fontSize: 10, fontWeight: 600, ...GF }}>↗</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          marginTop: 48,
          paddingTop: 24,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <p style={{ margin: 0, color: "#334155", ...GF, fontSize: 12 }}>
            © {year} UpUp Technologies. LAGDA and the LAGDA shield mark are trademarks of UpUp Technologies.
          </p>
          <div style={{ display: "flex", gap: 20 }}>
            {[
              { label: "Privacy Policy",   path: "/legal/privacy" },
              { label: "Terms of Service", path: "/legal/terms" },
              { label: "Accessibility",    path: "/legal/accessibility" },
            ].map((l) => (
              <Link
                key={l.label}
                to={l.path}
                style={{
                  color: "#475569", ...GF, fontSize: 12, textDecoration: "none",
                  transition: "color 0.18s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#94a3b8"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#475569"; }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

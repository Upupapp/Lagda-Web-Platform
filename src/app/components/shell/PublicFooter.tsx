import { Link } from "react-router";
import {
  Layers, Lightbulb, ShieldCheck, BookOpen, Gem, ScrollText,
  PenLine, Workflow, GitBranch, LayoutTemplate, Users, Diamond,
  Scale, Building2, Landmark, Home, Coins,
  Shield, IdCard, FileCheck2, Lock, Activity,
  CircleHelp, Headset, Mail, Eye, Map,
  ChevronRight, type LucideIcon,
} from "lucide-react";
import lagdaLogoFull from "../../../brand elements/svg/LagdaLogoPrimaryHorizontalFullColor.svg";
import { FOOTER_COLUMNS } from "@/app/config/nav.config";

// ── Icon system ──────────────────────────────────────────────────────────────
// The footer's link config (nav.config.ts) is shared with the header mega-menu
// and carries no icon data, so the icon-per-column and icon-per-link mapping
// lives here, keyed by the same heading/label strings. A label with no entry
// falls back to a plain dot bullet rather than breaking, so new footer links
// added without an icon still render.
const HEADING_ICON: Record<string, LucideIcon> = {
  "Product": Layers,
  "Solutions": Lightbulb,
  "Security & Trust": ShieldCheck,
  "Resources": BookOpen,
  "eNotary": Gem,
  "Legal": ScrollText,
};

const LINK_ICON: Record<string, LucideIcon> = {
  // Product
  "eSignature": PenLine,
  "Document Workflows": Workflow,
  "Core Workflow": GitBranch,
  "Document Verification": ShieldCheck,
  "Templates & Branding": LayoutTemplate,
  "Team & Enterprise": Users,
  "Pricing": Diamond,
  // Solutions
  "Lawyers": Scale,
  "Law Firms": Building2,
  "Business Teams": Users,
  "Government / LGU": Landmark,
  "Real Estate": Home,
  "Finance": Coins,
  // Security & Trust
  "Security Overview": Shield,
  "Trust Center": ShieldCheck,
  "Identity Verification": IdCard,
  "Audit Trail": FileCheck2,
  "Privacy": Lock,
  "Service Status": Activity,
  // Resources
  "Guides": BookOpen,
  "FAQ": CircleHelp,
  "Legal Framework": Scale,
  "Help Center": Headset,
  "Contact": Mail,
  // eNotary
  "Overview": Eye,
  "Roadmap": Map,
  "Join Waitlist": Users,
  // Legal
  "Privacy Policy": ShieldCheck,
  "Terms of Service": ScrollText,
  "Accessibility": IdCard,
};

function ColumnHeader({ heading, isComingSoon }: { heading: string; isComingSoon?: boolean }) {
  const Icon = HEADING_ICON[heading] ?? Layers;
  const GF = { fontFamily: "'Geist', sans-serif" };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: isComingSoon ? "4px 14px 4px 4px" : "4px 14px 4px 4px",
        borderRadius: 999,
        background: isComingSoon ? "#07111F" : "#EAF6FF",
        border: isComingSoon ? "1px solid #07111F" : "1px solid rgba(0,120,212,0.18)",
        marginBottom: 18,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: isComingSoon ? "#67023B" : "#0078D4",
          color: "#ffffff",
        }}
      >
        <Icon size={15} strokeWidth={2.25} />
      </span>
      <span style={{
        color: isComingSoon ? "#ffffff" : "#07111F",
        ...GF, fontSize: 11.5, fontWeight: 700,
        letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap",
      }}>
        {heading}
      </span>
      {isComingSoon && (
        <span style={{
          background: "#ffffff", color: "#67023B",
          borderRadius: 999, padding: "2px 9px", fontSize: 9.5, fontWeight: 700, ...GF,
        }}>
          Soon
        </span>
      )}
    </div>
  );
}

function FooterLinkRow({ label, path, isComingSoon }: { label: string; path: string; isComingSoon?: boolean }) {
  const Icon = LINK_ICON[label];
  const GF = { fontFamily: "'Geist', sans-serif" };

  return (
    <li>
      <Link
        to={path}
        className="pf-row"
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "6px 8px", borderRadius: 10,
          textDecoration: "none",
          transition: "background 0.15s ease",
        }}
      >
        <span
          aria-hidden
          className="pf-row-icon"
          style={{
            width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: isComingSoon ? "rgba(148,163,184,0.14)" : "rgba(0,120,212,0.1)",
            color: isComingSoon ? "#94A3B8" : "#0078D4",
            transition: "background 0.15s ease, color 0.15s ease",
          }}
        >
          {Icon ? <Icon size={13} strokeWidth={2.25} /> : <span style={{ width: 4, height: 4, borderRadius: "50%", background: "currentColor" }} />}
        </span>
        <span style={{
          color: isComingSoon ? "#94A3B8" : "#334155",
          ...GF, fontSize: 13, flex: 1, minWidth: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {label}
        </span>
        <ChevronRight
          size={13}
          className="pf-row-chevron"
          aria-hidden
          style={{ color: "#CBD5E1", flexShrink: 0, transition: "transform 0.15s ease, color 0.15s ease" }}
        />
      </Link>
    </li>
  );
}

export function PublicFooter() {
  const year = new Date().getFullYear();
  const GF = { fontFamily: "'Geist', sans-serif" };

  const FOOTER_CSS = `
    .pf-body { max-width: 1440px; margin: 0 auto; padding: 64px 48px 48px; }
    .pf-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 0 40px;
      align-items: start;
      overflow: auto;
    }
    .pf-brand-banner {
      padding-top: 36px;
      margin-top: 36px;
      border-top: 1px solid rgba(0,0,0,0.08);
    }
    /* Tablet: links in three columns. */
    @media (max-width: 1024px) {
      .pf-body { padding: 56px 32px 40px; }
      .pf-grid { grid-template-columns: repeat(3, 1fr); gap: 32px 24px; }
    }
    /* Phone: two columns of links. */
    @media (max-width: 767px) {
      .pf-body { padding: 48px 20px 32px; }
      .pf-grid { grid-template-columns: repeat(2, 1fr); gap: 28px 20px; }
      .pf-brand-banner { padding-top: 28px; margin-top: 28px; }
    }
    @media (max-width: 380px) {
      .pf-grid { grid-template-columns: 1fr; }
    }
    /* Footer links are the densest tap targets on the public site. */
    .pf-grid a, .pf-bottom a { display: inline-flex; align-items: center; min-height: 44px; }
    .pf-row:hover { background: rgba(0,120,212,0.06); }
    .pf-row:hover .pf-row-chevron { transform: translateX(2px); color: #0078D4; }
  `;

  return (
    <>
      <style>{FOOTER_CSS}</style>
    <footer
      role="contentinfo"
      style={{
        background: "#f8fafb",
        borderTop: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      {/* eNotary compliance notice */}
      <div style={{
        background: "rgba(103,2,59,0.06)",
        borderBottom: "1px solid rgba(176,18,98,0.18)",
        padding: "10px 48px",
        textAlign: "center",
      }}>
        <p style={{
          margin: 0,
          color: "#64748B",
          fontFamily: "'Geist Mono', monospace",
          fontSize: 11,
          letterSpacing: "0.02em",
        }}>
          LAGDA eSignature is available now.{" "}
          <span style={{ color: "#67023B", fontWeight: 600 }}>
            LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules.
          </span>
        </p>
      </div>

      {/* Main footer body.
          The column count is set in CSS rather than inline because it has to
          change with the viewport, and an inline style cannot carry a media
          query. It previously could not: `260px repeat(6, 1fr)` was fixed at
          every width, so on a 390px phone the footer alone pushed the page
          about 600px sideways — on EVERY public page, since the footer is part
          of the shell. */}
      <div className="pf-body">
        <div className="pf-grid">
          {/* Link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <ColumnHeader heading={col.heading} isComingSoon={col.isComingSoon} />
              <ul role="list" style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 2 }}>
                {col.links.map((link) => (
                  <FooterLinkRow key={link.label} label={link.label} path={link.path} isComingSoon={link.isComingSoon} />
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Brand banner — full-width, sits below the link columns, centered:
            big logo first, then the description, then the "product of" line. */}
        <div className="pf-brand-banner" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          {/* The logo inside is marked decorative, so without a label on the link
              itself this reads to a screen reader as "link" and nothing more —
              axe reports it as a serious link-name violation. */}
          <Link to="/esignature" aria-label="LAGDA — go to the eSignature home page" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 44, marginBottom: 18 }}>
            <img src={lagdaLogoFull} alt="LAGDA" style={{ display: "block", width: 220, maxWidth: "100%", height: "auto", objectFit: "contain" }} />
          </Link>
          <p style={{
            color: "#334155", ...GF, fontSize: 14, lineHeight: 1.65, margin: 0, marginBottom: 10, maxWidth: 560,
          }}>
            The Philippine-first electronic signature and document verification platform for legal, business, and institutional workflows.
          </p>
          <p style={{
            color: "#64748B", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0,
          }}>
            A product of{" "}
            <span style={{ color: "#334155", fontWeight: 600 }}>UpUp Technologies</span>
          </p>
        </div>

        {/* Bottom bar */}
        <div className="pf-bottom" style={{
          marginTop: 48,
          paddingTop: 24,
          borderTop: "1px solid rgba(0,0,0,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <p style={{ margin: 0, color: "#64748B", ...GF, fontSize: 12 }}>
            © {year} UpUp Technologies. LAGDA and the LAGDA shield mark are trademarks of UpUp Technologies.
          </p>
          <div style={{ display: "flex", gap: 20 }}>
            {[
              { label: "Sign In",          path: "/sign-in" },
              { label: "Privacy Policy",   path: "/legal/privacy" },
              { label: "Terms of Service", path: "/legal/terms" },
              { label: "Accessibility",    path: "/legal/accessibility" },
            ].map((l) => (
              <Link
                key={l.label}
                to={l.path}
                style={{
                  color: "#64748B", ...GF, fontSize: 12, textDecoration: "none",
                  transition: "color 0.18s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#07111F"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
        </footer>
    </>
  );
}

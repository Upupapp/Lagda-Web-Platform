import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useAccountCta } from "@/app/hooks/useSignedIn";
import { ENOTARY_DIRECTORY_PATH } from "@/app/config/enotary-directory";
import imgLagdaLogo from "@/assets/landing/lagda-logo.png";
import imgLagdaLogoNavy from "@/assets/landing/lagda-logo-navy.png";
import "./landing.css";

/*
 * The landing page's header and footer, shared by the pages built in its style
 * (the home page and the eNotary waitlist). Both must sit inside an element
 * with className="lgl-root", which landing.css scopes its rules to.
 */

/** Logo, main navigation, Sign in and the account button; a menu toggle below 1024px. */
export function LandingHeader() {
  const cta = useAccountCta();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header id="site-header" className={menuOpen ? "lgl-hdr-open" : undefined} style={{ position: "relative", zIndex: "5", background: "#ffffff", borderBottom: "1px solid #EEF1F5" }}>
      <div className="lgl-wide" style={{ boxSizing: "border-box", padding: "0 32px", minHeight: "72px", display: "flex", alignItems: "center", gap: "12px 32px" }}>
        <div className="lgl-hdr-left">
          <Link aria-label="LAGDA home" style={{ display: "flex", flex: "none" }} to="/">
            <img src={imgLagdaLogo} alt="LAGDA.io" style={{ width: "140px", height: "auto", display: "block" }} />
          </Link>
          <nav id="main-nav" className="lgl-hdr-nav" aria-label="Main">
            <Link to="/esignature">
              eSignature
            </Link>
            {" "}
            <Link to="/solutions">
              Solutions
            </Link>
            {" "}
            <Link to="/pricing">
              Pricing
            </Link>
            {" "}
            <Link to="/security">
              Security
            </Link>
            {" "}
            <Link to="/resources">
              Resources
            </Link>
            {" "}
            <Link to="/enotary">
              eNotary
            </Link>
          </nav>
        </div>
        <div className="lgl-hdr-actions">
          {!cta.signedIn && (
            <Link className="lgl-hdr-signin" style={{ display: "inline-flex", alignItems: "center", minHeight: "40px", padding: "0 14px", color: "#0B1730", fontSize: "14px", fontWeight: "600" }} to="/sign-in">
              Sign in
            </Link>
          )}
          {" "}
          <Link className="lgl-hdr-cta lgl-btn-primary" style={{ display: "inline-flex", alignItems: "center", minHeight: "40px", padding: "0 18px", borderRadius: "10px", background: "#0B3981", color: "#ffffff", fontSize: "14px", fontWeight: "600", whiteSpace: "nowrap" }} to={cta.path}>
            {cta.signedIn ? cta.label : "Get started free"}
          </Link>
          {" "}
          <button type="button" className="lgl-hdr-toggle" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-controls="main-nav" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 6h14M3 10h14M3 14h14" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

/** Brand, link columns, the eNotary disclaimer and the legal links. */
export function LandingFooter() {
  // The home page has a Verify section to scroll to; elsewhere, the Verify page.
  const onHome = useLocation().pathname === "/";
  const verifyStyle = { color: "#C9B2EC", fontSize: "13px", fontWeight: "600" };
  return (
    <footer style={{ background: "#082A60", color: "#C7D3E6", borderTop: "4px solid #5B2A86" }}>
      <div className="lgl-wide" style={{ maxWidth: "1240px", margin: "0 auto", boxSizing: "border-box", padding: "40px 32px 0" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "28px 96px", paddingBottom: "32px" }}>
          <div style={{ flex: "1 1 340px", maxWidth: "360px" }}>
            <img src={imgLagdaLogoNavy} alt="LAGDA.io" style={{ width: "120px", height: "auto", display: "block", marginBottom: "12px", mixBlendMode: "lighten" }} />
            <p style={{ margin: "0 0 10px", color: "#C7D3E6", fontSize: "13px", lineHeight: "1.5", textWrap: "pretty" }}>
              The Philippine-first electronic signature and document verification platform for legal, business, and institutional work.
            </p>
            {onHome ? (
              <a href="#verify" style={verifyStyle}>
                Verify a document →
              </a>
            ) : (
              <Link to="/verify" style={verifyStyle}>
                Verify a document →
              </Link>
            )}
          </div>
          <nav aria-label="Footer" className="lgl-ftr-nav" style={{ flex: "999 1 600px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "28px 24px" }}>
            <div>
              <p style={{ margin: "0 0 10px", color: "#C9B2EC", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em" }}>
                PRODUCT
              </p>
              <ul style={{ margin: "0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/esignature">
                    eSignature
                  </Link>
                </li>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/esignature/core-workflow">
                    Core workflow
                  </Link>
                </li>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/esignature/templates-and-branding">
                    Templates &amp; branding
                  </Link>
                </li>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/esignature/team-and-enterprise">
                    Team &amp; enterprise
                  </Link>
                </li>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/pricing">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p style={{ margin: "0 0 10px", color: "#C9B2EC", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em" }}>
                SOLUTIONS
              </p>
              <ul style={{ margin: "0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/solutions/law-firms">
                    Lawyers &amp; law firms
                  </Link>
                </li>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/solutions/business-teams">
                    Business teams
                  </Link>
                </li>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/solutions/government-and-lgu">
                    Government &amp; LGUs
                  </Link>
                </li>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/solutions/real-estate">
                    Real estate
                  </Link>
                </li>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/solutions/hr-and-recruitment">
                    HR &amp; finance
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p style={{ margin: "0 0 10px", color: "#C9B2EC", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em" }}>
                TRUST
              </p>
              <ul style={{ margin: "0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/security">
                    Security overview
                  </Link>
                </li>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/security/trust-center">
                    Trust center
                  </Link>
                </li>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/security/identity-verification">
                    Identity verification
                  </Link>
                </li>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/security/audit-trail">
                    Audit trail
                  </Link>
                </li>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/security/privacy-and-data-protection">
                    Privacy &amp; data
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p style={{ margin: "0 0 10px", color: "#C9B2EC", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em" }}>
                HELP
              </p>
              <ul style={{ margin: "0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/help">
                    Help center
                  </Link>
                </li>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/resources/guides">
                    Guides
                  </Link>
                </li>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/resources/faq">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/contact">
                    Contact us
                  </Link>
                </li>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/service-status">
                    Service status
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p style={{ margin: "0 0 10px", color: "#C9B2EC", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em" }}>
                ENOTARY
              </p>
              <ul style={{ margin: "0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                <li>
                  <a style={{ color: "#E2E9F3" }} href={ENOTARY_DIRECTORY_PATH}>
                    Notary directory
                  </a>
                </li>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/enotary/accreditation-roadmap">
                    Roadmap
                  </Link>
                </li>
                <li>
                  <Link style={{ color: "#E2E9F3" }} to="/enotary/waitlist">
                    Join the waitlist
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>
        <div style={{ padding: "16px 0 28px", borderTop: "1px solid #24508F" }}>
          <p style={{ margin: "0 0 10px", maxWidth: "900px", color: "#B3C3DC", fontSize: "12px", lineHeight: "1.5" }}>
            Some documents may still require wet signatures, notarization, personal appearance, or other formalities. Users remain responsible for the requirements that apply to each transaction. LAGDA eNotary is coming soon, subject to Supreme Court accreditation and applicable rules.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px 24px", color: "#B3C3DC", fontSize: "12px" }}>
            <p style={{ margin: "0" }}>
              © 2026 UpUp Technologies. LAGDA and the LAGDA shield mark are trademarks of UpUp Technologies.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
              <Link style={{ color: "#E2E9F3" }} to="/legal/privacy">
                Privacy Policy
              </Link>
              <Link style={{ color: "#E2E9F3" }} to="/legal/terms">
                Terms of Service
              </Link>
              <Link style={{ color: "#E2E9F3" }} to="/legal/accessibility">
                Accessibility
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

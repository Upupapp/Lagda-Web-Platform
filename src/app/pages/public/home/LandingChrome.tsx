import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { useAccountCta } from "@/app/hooks/useSignedIn";
import { ENOTARY_DIRECTORY_PATH, isStaticSitePath } from "@/app/config/enotary-directory";
import { TOP_NAV, type NavSection } from "@/app/config/nav.config";
import { Z } from "@/app/utils/z-index";
import imgLagdaLogo from "@/assets/landing/lagda-logo.png";
import imgLagdaLogoNavy from "@/assets/landing/lagda-logo-navy.png";
import "./landing.css";

/*
 * The site's header and footer, in the landing page's style. The home page,
 * the waitlist and every page under PublicLayout use them. Both must sit
 * inside an element with className="lgl-root", which landing.css scopes its
 * rules to.
 */

/** The section a path belongs to: its own page or one of its menu pages. */
function sectionOf(pathname: string): NavSection | undefined {
  const within = (path: string) => pathname === path || pathname.startsWith(path.replace(/\/$/, "") + "/");
  if (pathname.startsWith("/features")) return TOP_NAV[0];
  return TOP_NAV.find((section) => [section.path, ...section.items.map((item) => item.path)].some(within));
}

/** A client-side link, or a full page load for the static Notary Directory. */
function NavLink({ to, className, children, current }: { to: string; className?: string; children: ReactNode; current?: boolean }) {
  const aria = current ? "page" : undefined;
  return isStaticSitePath(to)
    ? <a href={to} className={className} aria-current={aria}>{children}</a>
    : <Link to={to} className={className} aria-current={aria}>{children}</Link>;
}

/**
 * Logo, main navigation, Sign in and the account button. Each section opens a
 * menu of its pages on hover or keyboard focus, so no page needs a second bar
 * of tabs. Below 1024px a toggle shows the sections, each of which expands.
 */
export function LandingHeader() {
  const cta = useAccountCta();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  // After a menu link is used the menu closes, even with the pointer still on
  // it, until the pointer leaves the navigation or it takes focus again.
  const [rested, setRested] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const lastPath = useRef(pathname);
  const active = sectionOf(pathname);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    setMenuOpen(false);
    setExpanded(null);
    setRested(true);
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && navRef.current?.contains(focused)) focused.blur();
  }, [pathname]);

  return (
    <>
    {/* Below 1024px the open menu dims the page; a tap outside it closes it. */}
    {menuOpen && <div className="lgl-hdr-scrim" aria-hidden="true" onClick={() => setMenuOpen(false)} />}
    <header id="site-header" className={menuOpen ? "lgl-hdr-open" : undefined} style={{ position: "relative", zIndex: Z.shell, background: "#ffffff", borderBottom: "1px solid #EEF1F5" }}>
      <div className="lgl-wide" style={{ boxSizing: "border-box", padding: "0 32px", minHeight: "72px", display: "flex", alignItems: "center", gap: "12px 32px" }}>
        <div className="lgl-hdr-left">
          <Link aria-label="LAGDA home" style={{ display: "flex", flex: "none" }} to="/">
            <img src={imgLagdaLogo} alt="LAGDA.io" style={{ width: "140px", height: "auto", display: "block" }} />
          </Link>
          <nav
            id="main-nav"
            ref={navRef}
            className={rested ? "lgl-hdr-nav lgl-nav-rested" : "lgl-hdr-nav"}
            aria-label="Main"
            onMouseLeave={() => setRested(false)}
            onFocus={() => setRested(false)}
            onKeyDown={(e) => {
              if (e.key !== "Escape") return;
              setRested(true);
              setExpanded(null);
              setMenuOpen(false);
            }}
          >
            {TOP_NAV.map((section, index) => {
              const isActive = section === active;
              const isOpen = expanded === section.label;
              const listId = `lgl-nav-${section.id}`;
              // The last two sections open their menus leftwards, inside the window.
              const atEnd = index >= TOP_NAV.length - 2;
              return (
                <div key={section.label} className={["lgl-nav-item", isActive && "lgl-nav-active", isOpen && "lgl-nav-expanded", atEnd && "lgl-nav-end"].filter(Boolean).join(" ")}>
                  <NavLink to={section.path} className="lgl-nav-top" current={isActive && pathname === section.path}>
                    {section.label}
                  </NavLink>
                  <button
                    type="button"
                    className="lgl-nav-more"
                    aria-expanded={isOpen}
                    aria-controls={listId}
                    aria-label={`${section.label} pages`}
                    onClick={() => setExpanded(isOpen ? null : section.label)}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 6l4 4 4-4" />
                    </svg>
                  </button>
                  <div className="lgl-nav-panel">
                    <ul id={listId} className={section.items.length > 4 ? "lgl-nav-list lgl-nav-two" : "lgl-nav-list"}>
                      {section.items.map((item) => (
                        <li key={item.path + item.label}>
                          <NavLink to={item.path} current={pathname === item.path}>
                            <span className="lgl-nav-label">{item.label}</span>
                            {item.description && <span className="lgl-nav-desc">{item.description}</span>}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
            {/* Phones hide the header's Sign in (landing.css); the menu offers it. */}
            {!cta.signedIn && (
              <Link to="/sign-in" className="lgl-nav-signin">Sign in</Link>
            )}
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
              <path d={menuOpen ? "M5 5l10 10M15 5L5 15" : "M3 6h14M3 10h14M3 14h14"} />
            </svg>
          </button>
        </div>
      </div>
    </header>
    </>
  );
}

/** Brand, link columns, the eNotary disclaimer and the legal links. */
export function LandingFooter() {
  // The landing page (at / and /esignature) has a Verify section to scroll
  // to; elsewhere, the Verify page.
  const { pathname } = useLocation();
  const onHome = pathname === "/" || pathname === "/esignature";
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

import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import { LagdaLogo } from "@/app/components/brand/LagdaLogo";
import { TOP_NAV, type NavSection, type NavItem } from "@/app/config/nav.config";
import { haptic } from "@/app/utils/haptic";
import { Z } from "../../utils/z-index";

// ── Chevron icon ──────────────────────────────────────────────────────────────
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", flexShrink: 0 }}
    >
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Mega dropdown panel ───────────────────────────────────────────────────────
function MegaPanel({
  section,
  onClose,
}: {
  section: NavSection;
  onClose: () => void;
}) {
  const isAzure = section.accent === "azure";
  const accentColor  = isAzure ? "#0078d4" : "#b01262";
  const accentBg     = isAzure ? "rgba(0,120,212,0.06)" : "rgba(103,2,59,0.06)";
  const accentBorder = isAzure ? "rgba(0,120,212,0.18)" : "rgba(103,2,59,0.25)";
  const GF = { fontFamily: "'Geist', sans-serif" };

  return (
    <div
      role="menu"
      aria-label={section.menuTitle}
      style={{
        background: "rgba(10,20,36,0.97)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: `1px solid ${accentBorder}`,
        borderRadius: 20,
        padding: 24,
        boxShadow: `0 24px 64px rgba(0,0,0,0.48), 0 0 0 1px ${accentBorder}`,
        minWidth: 720,
        maxWidth: 880,
        animation: "dropdownEnter 0.2s ease-out both",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <p style={{ color: "white", ...GF, fontSize: 15, fontWeight: 700, margin: 0, marginBottom: 4 }}>
              {section.menuTitle}
            </p>
            <p style={{ color: "#94A3B8", ...GF, fontSize: 13, margin: 0 }}>
              {section.menuDescription}
            </p>
          </div>
          <Link
            to={section.path}
            role="menuitem"
            onClick={onClose}
            style={{
              background: accentColor,
              color: "white",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              ...GF,
              textDecoration: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "filter 0.15s ease, transform 0.15s ease",
              display: "inline-block",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.12)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = ""; e.currentTarget.style.transform = ""; }}
          >
            {section.menuCtaLabel} →
          </Link>
        </div>
        {section.menuCtaNote && (
          <p style={{ color: "#94a3b8", fontFamily: "'Geist Mono', monospace", fontSize: 11, margin: 0, marginTop: 8 }}>
            {section.menuCtaNote}
          </p>
        )}
      </div>

      {/* Items grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 4 }}>
        {section.items.map((item: NavItem) => (
          <Link
            key={item.label}
            to={item.path}
            role="menuitem"
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 10,
              textDecoration: "none",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = accentBg; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{
              width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginTop: 7,
              background: item.isComingSoon ? "#b01262" : accentColor,
            }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "white", ...GF, fontSize: 13, fontWeight: 600 }}>
                  {item.label}
                </span>
                {item.isComingSoon && (
                  <span style={{
                    background: "rgba(103,2,59,0.25)", color: "#fce7f3",
                    border: "1px solid rgba(176,18,98,0.4)", borderRadius: 999,
                    padding: "1px 7px", fontSize: 10, fontWeight: 600, ...GF,
                  }}>
                    Coming Soon
                  </span>
                )}
              </div>
              <p style={{ color: "#94A3B8", ...GF, fontSize: 12, margin: 0, marginTop: 2 }}>
                {item.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Mobile drawer ─────────────────────────────────────────────────────────────
function MobileDrawer({ onClose }: { onClose: () => void }) {
  const [openSection, setOpenSection] = useState<string | null>(null);

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Escape closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const GF = { fontFamily: "'Geist', sans-serif" };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, background: "rgba(7,17,31,0.7)", zIndex: Z.drawerScrim,
          backdropFilter: "blur(4px)", animation: "fadeIn 0.22s ease",
        }}
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "min(400px, 100vw)", background: "#07111f", zIndex: Z.drawer,
          overflowY: "auto", borderLeft: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "-24px 0 64px rgba(0,0,0,0.5)",
          animation: "slideInRight 0.25s ease-out",
        }}
      >
        {/* Top bar */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <Link to="/" onClick={onClose}>
            <LagdaLogo variant="white-horizontal" size="md" decorative />
          </Link>
          <button
            onClick={() => { haptic("selection"); onClose(); }}
            aria-label="Close menu"
            style={{
              color: "#94A3B8", background: "none", border: "none", cursor: "pointer",
              padding: 8, fontSize: 20, lineHeight: 1,
              minWidth: 44, minHeight: 44,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Primary CTAs */}
        <div style={{ padding: "16px 24px 0", display: "flex", flexDirection: "column", gap: 8 }}>
          <Link
            to="/create-account"
            onClick={() => { haptic("light"); onClose(); }}
            style={{
              background: "#0078d4", color: "white", borderRadius: 10,
              padding: "14px 20px", fontSize: 14, fontWeight: 700, ...GF,
              textDecoration: "none", textAlign: "center", display: "block",
            }}
          >
            Create Free Account
          </Link>
          <Link
            to="/sign-in"
            onClick={onClose}
            style={{
              background: "transparent", color: "white",
              border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10,
              padding: "12px 20px", fontSize: 14, fontWeight: 500, ...GF,
              textDecoration: "none", textAlign: "center", display: "block",
            }}
          >
            Sign In
          </Link>
        </div>

        {/* Accordion nav */}
        <div style={{ padding: "8px 0" }}>
          {TOP_NAV.map((nav) => {
            const isOpen = openSection === nav.id;
            const isEnotary = nav.id === "enotary";
            const accentColor = isEnotary ? "#b01262" : "#0078d4";

            return (
              <div key={nav.id}>
                <button
                  aria-expanded={isOpen}
                  aria-controls={`mobile-section-${nav.id}`}
                  onClick={() => { haptic("selection"); setOpenSection(isOpen ? null : nav.id); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "14px 24px", background: "transparent",
                    border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "white", ...GF, fontSize: 14, fontWeight: 600 }}>
                      {nav.label}
                    </span>
                    {nav.badge && (
                      <span style={{
                        background: "rgba(103,2,59,0.3)", color: "#fce7f3",
                        border: "1px solid rgba(176,18,98,0.4)", borderRadius: 999,
                        padding: "1px 7px", fontSize: 10, fontWeight: 600, ...GF,
                      }}>
                        {nav.badge}
                      </span>
                    )}
                  </div>
                  <Chevron open={isOpen} />
                </button>

                {/* Accordion body */}
                {isOpen && (
                  <div
                    id={`mobile-section-${nav.id}`}
                    style={{ background: "rgba(255,255,255,0.02)", padding: "4px 0 8px" }}
                  >
                    {nav.items.map((item) => (
                      <Link
                        key={item.label}
                        to={item.path}
                        onClick={() => { haptic("selection"); onClose(); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "11px 24px 11px 36px", textDecoration: "none",
                        }}
                      >
                        <div style={{
                          width: 4, height: 4, borderRadius: "50%", flexShrink: 0,
                          background: item.isComingSoon ? "#b01262" : accentColor,
                        }} />
                        <span style={{
                          color: item.isComingSoon ? "#94a3b8" : "#e2e8f0",
                          ...GF, fontSize: 13,
                        }}>
                          {item.label}
                        </span>
                        {item.isComingSoon && (
                          <span style={{ color: "#b01262", ...GF, fontSize: 11, marginLeft: "auto" }}>
                            Coming Soon
                          </span>
                        )}
                      </Link>
                    ))}
                    {/* Section CTA */}
                    <Link
                      to={nav.path}
                      onClick={() => { haptic("light"); onClose(); }}
                      style={{
                        display: "block", margin: "8px 24px 0",
                        padding: "10px 16px",
                        background: isEnotary ? "rgba(103,2,59,0.25)" : "rgba(0,120,212,0.15)",
                        color: isEnotary ? "#fce7f3" : "#38bdf8",
                        border: `1px solid ${isEnotary ? "rgba(176,18,98,0.3)" : "rgba(0,120,212,0.3)"}`,
                        borderRadius: 8, ...GF, fontSize: 12, fontWeight: 600, textDecoration: "none",
                        textAlign: "center",
                      }}
                    >
                      {nav.menuCtaLabel} →
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom quick links */}
        <div style={{
          padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex", flexDirection: "column", gap: 10, marginTop: "auto",
        }}>
          <Link to="/verify" onClick={onClose} style={{ color: "#94A3B8", ...GF, fontSize: 13, textDecoration: "none" }}>
            Verify Document
          </Link>
          <Link to="/contact" onClick={onClose} style={{ color: "#94A3B8", ...GF, fontSize: 13, textDecoration: "none" }}>
            Contact Sales
          </Link>
          <div style={{
            background: "rgba(103,2,59,0.15)", border: "1px solid rgba(176,18,98,0.25)",
            borderRadius: 8, padding: "8px 12px", marginTop: 4,
          }}>
            <p style={{
              color: "#b01262", fontFamily: "'Geist Mono', monospace", fontSize: 10,
              fontWeight: 600, margin: 0,
            }}>
              LAGDA eNotary status: Coming Soon — Subject to Supreme Court Accreditation
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Public header ─────────────────────────────────────────────────────────────
export function PublicHeader() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const openTimer  = useRef<ReturnType<typeof setTimeout>>();
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const navRef = useRef<HTMLElement>(null);

  // Scroll detection
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setOpenDropdown(null);
    setMobileOpen(false);
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpenDropdown(null); setMobileOpen(false); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  function startOpen(id: string) {
    clearTimeout(closeTimer.current);
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => setOpenDropdown(id), 420);
  }
  function startClose() {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 240);
  }
  function cancelClose() { clearTimeout(closeTimer.current); }

  const GF = { fontFamily: "'Geist', sans-serif" };

  return (
    <>
      <header
        ref={navRef}
        role="banner"
        style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: Z.shell }}
      >
        <nav aria-label="Main navigation">
          <div
            style={{
              height: 72,
              background: scrolled ? "rgba(7,17,31,0.88)" : "rgba(7,17,31,1)",
              backdropFilter: scrolled ? "blur(20px) saturate(160%)" : "none",
              WebkitBackdropFilter: scrolled ? "blur(20px) saturate(160%)" : "none",
              borderBottom: scrolled ? "1px solid rgba(0,120,212,0.18)" : "1px solid rgba(255,255,255,0.08)",
              boxShadow: scrolled ? "0 2px 32px rgba(0,120,212,0.08)" : "none",
              transition: "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
            }}
          >
            <div style={{
              maxWidth: 1440, margin: "0 auto", padding: "0 48px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              height: "100%",
            }}>
              {/* Logo */}
              <Link to="/esignature" aria-label="LAGDA — go to home" style={{ display: "flex", alignItems: "center", flexShrink: 0, minHeight: 44 }}>
                <LagdaLogo variant="white-horizontal" size="md" decorative />
              </Link>

              {/* Desktop nav */}
              <ul
                role="list"
                style={{ gap: 4, alignItems: "center", margin: 0, padding: 0, listStyle: "none" }}
                className="phdr-desktop-nav"
              >
                {TOP_NAV.map((nav) => {
                  const isActive = pathname.startsWith(nav.matchPrefix);
                  const isEnotary = nav.id === "enotary";
                  const isOpen = openDropdown === nav.id;
                  const accentColor = isEnotary ? "#b01262" : "#0078d4";
                  // Both accents fail as TEXT on the navy header: #0078D4 is
                  // 4.18:1 and #B01262 is 2.80:1, against 4.5:1. They are correct
                  // as fills behind white text, which is why the fill above keeps
                  // them. The active nav item is the one thing in the header that
                  // has to be readable, so its label uses the glow variants —
                  // Azure Glow #38BDF8 at 8.84:1, and a lightened burgundy at
                  // 5.11:1 that stays in the eNotary colour family.
                  const accentTextColor = isEnotary ? "#D4589A" : "#38BDF8";

                  return (
                    <li
                      key={nav.id}
                      style={{ position: "relative" }}
                      onMouseEnter={() => startOpen(nav.id)}
                      onMouseLeave={startClose}
                    >
                      <button
                        aria-current={isActive ? "page" : undefined}
                        aria-expanded={isOpen}
                        aria-haspopup="menu"
                        onClick={() => {
                          setOpenDropdown(isOpen ? null : nav.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setOpenDropdown(nav.id);
                          }
                        }}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          padding: "8px 10px 8px 12px",
                          display: "flex", alignItems: "center", gap: 4,
                          color: isActive ? accentTextColor : "#94a3b8",
                          fontSize: 13, fontWeight: isActive ? 600 : 500, ...GF,
                          transition: "color 0.18s ease",
                          borderBottom: isActive ? `2px solid ${accentColor}` : "2px solid transparent",
                        }}
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "white"; }}
                        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "#94a3b8"; }}
                      >
                        {nav.label}
                        {nav.badge && (
                          <span style={{
                            background: "rgba(103,2,59,0.3)", color: "#fce7f3",
                            border: "1px solid rgba(176,18,98,0.4)", borderRadius: 999,
                            padding: "1px 6px", fontSize: 9, fontWeight: 700, marginLeft: 2,
                          }}>
                            {nav.badge}
                          </span>
                        )}
                        <span style={{ marginLeft: 2, opacity: 0.6 }}>
                          <Chevron open={isOpen} />
                        </span>
                      </button>

                      {/* Mega panel */}
                      {isOpen && (
                        <div
                          style={{
                            position: "absolute",
                            top: "calc(100% + 8px)",
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: Z.dropdown,
                          }}
                          onMouseEnter={cancelClose}
                          onMouseLeave={startClose}
                        >
                          <MegaPanel
                            section={nav}
                            onClose={() => setOpenDropdown(null)}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Right actions */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                {/* Sign In — desktop */}
                <Link
                  to="/sign-in"
                  className="phdr-signin"
                  style={{
                    color: "white", fontSize: 13, fontWeight: 600, ...GF,
                    textDecoration: "none", padding: 8,
                    transition: "color 0.18s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#38bdf8"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "white"; }}
                >
                  Sign In
                </Link>

                {/* Create Account — desktop */}
                <Link
                  to="/create-account"
                  className="phdr-cta"
                  onClick={() => haptic("light")}
                  style={{
                    background: "#0078d4", color: "white", borderRadius: 10,
                    padding: "10px 20px", fontSize: 13, fontWeight: 700, ...GF,
                    textDecoration: "none", whiteSpace: "nowrap",
                    boxShadow: "0 4px 12px rgba(0,120,212,0.25)",
                    transition: "filter 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease",
                    alignItems: "center",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = "brightness(1.1)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,120,212,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = "";
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,120,212,0.25)";
                  }}
                >
                  Create Free Account
                </Link>

                {/* Hamburger — mobile/tablet */}
                <button
                  className="phdr-hamburger"
                  onClick={() => { haptic("selection"); setMobileOpen(true); }}
                  aria-label="Open navigation menu"
                  aria-expanded={mobileOpen}
                  aria-controls="mobile-nav"
                  style={{
                    background: "none", border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 8, padding: "8px 10px", cursor: "pointer", color: "white",
                    // The only route to navigation on a phone. A 14px icon with
                    // 8px padding measured 30px; the accessibility rules ask for
                    // 44px and this is the control that most deserves it.
                    minWidth: 44, minHeight: 44,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
                    <path d="M0 1h18M0 7h18M0 13h18" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div id="mobile-nav">
          <MobileDrawer onClose={() => { haptic("selection"); setMobileOpen(false); }} />
        </div>
      )}

      <style>{`
        /* Desktop nav / CTA: hidden on mobile, flex on ≥1024px */
        .phdr-desktop-nav { display: none !important; }
        .phdr-signin      { display: none !important; }
        .phdr-cta         { display: none !important; }
        .phdr-hamburger   { display: flex !important; }
        @media (min-width: 1024px) {
          .phdr-desktop-nav { display: flex !important; }
          .phdr-signin      { display: block !important; }
          .phdr-cta         { display: inline-flex !important; }
          .phdr-hamburger   { display: none !important; }
        }
        @keyframes dropdownEnter {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

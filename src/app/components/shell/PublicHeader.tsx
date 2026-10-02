import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import lagdaHeaderLogo from "../../../brand elements/svg/LagdaLogoPrimaryHorizontalFullColor_Header.svg";
import { TOP_NAV } from "@/app/config/nav.config";
import { haptic } from "@/app/utils/haptic";
import { Z } from "../../utils/z-index";
import { usePlatform } from "../../context/PlatformContext";
import { UserAvatar } from "../platform/UserAvatar";
import {
  Signature, Layers, Tag, ShieldCheck, BookOpen, Stamp, Compass, X,
  type LucideIcon,
} from "lucide-react";

// ── Top-nav icons ─────────────────────────────────────────────────────────────
const NAV_ICONS: Record<string, LucideIcon> = {
  esignature: Signature,
  solutions: Layers,
  pricing: Tag,
  security: ShieldCheck,
  resources: BookOpen,
  enotary: Stamp,
};
function navIcon(id: string): LucideIcon {
  return NAV_ICONS[id] ?? Compass;
}

// ── Logo ──────────────────────────────────────────────────────────────────────
// The header SVG draws the wordmark on a 1086×814 canvas with a lot of empty
// space around it (the wordmark occupies roughly x 88–1004, y 267–507), so
// `object-fit: contain` in a normal box shrinks it to ~80px wide. Like the
// platform header, we crop to the wordmark: a fixed box sized from the
// wordmark's aspect ratio, and the image scaled and offset inside it. The box
// width is one CSS variable (`--phdr-logo-w`), set per breakpoint below, so
// every other dimension follows from it.
function HeaderLogo({ className }: { className?: string }) {
  return (
    <span className={`phdr-logo${className ? ` ${className}` : ""}`}>
      <img src={lagdaHeaderLogo} alt="LAGDA" className="phdr-logo-img" />
    </span>
  );
}

// ── Chevron icon ──────────────────────────────────────────────────────────────
/** Signed in: the account's avatar, linking to the dashboard. */
function DashboardButton({ block, onNavigate }: { block?: boolean; onNavigate?: () => void }) {
  const { user } = usePlatform();
  if (!user) return null;
  return (
    <Link
      to="/app/dashboard"
      onClick={onNavigate}
      aria-label={`Go to dashboard, signed in as ${user.displayName}`}
      title="Go to dashboard"
      style={{
        display: block ? "flex" : "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: block ? "10px 16px" : "4px 12px 4px 4px", minHeight: 36, borderRadius: block ? 10 : 999,
        border: "1px solid #D7DEE8", background: "#FFFFFF", color: "#07111F", textDecoration: "none",
        fontFamily: "'Geist', sans-serif", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
        boxShadow: "0 2px 6px rgba(7,17,31,0.06)",
      }}
    >
      <UserAvatar user={user} size={28} fontSize={11} />
      <span>Dashboard</span>
    </Link>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className="phdr-chev"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease",
        flexShrink: 0,
      }}
    >
      <path
        d="M2 4l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Mobile drawer ─────────────────────────────────────────────────────────────
function MobileDrawer({ onClose }: { onClose: () => void }) {
  const { sessionStatus } = usePlatform();
  const { pathname } = useLocation();
  const [openSection, setOpenSection] = useState<string | null>(null);

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Escape closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
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
          position: "fixed",
          inset: 0,
          background: "rgba(7,17,31,0.4)",
          zIndex: Z.drawerScrim,
          backdropFilter: "blur(4px)",
          animation: "fadeIn 0.22s ease",
        }}
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(400px, 100vw)",
          background: "#ffffff",
          zIndex: Z.drawer,
          overflowY: "auto",
          borderLeft: "1px solid rgba(7,17,31,0.08)",
          boxShadow: "-24px 0 64px rgba(7,17,31,0.18)",
          animation: "slideInRight 0.25s ease-out",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            padding: "14px 16px 14px 24px",
            minHeight: 72,
            boxSizing: "border-box",
            borderBottom: "1px solid rgba(7,17,31,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <HeaderLogo className="phdr-logo--drawer" />
          <button
            onClick={() => {
              haptic("selection");
              onClose();
            }}
            aria-label="Close menu"
            className="phdr-iconbtn"
            style={{
              color: "#334155",
              background: "#FFFFFF",
              border: "1px solid rgba(7,17,31,0.12)",
              borderRadius: 10,
              cursor: "pointer",
              padding: 8,
              lineHeight: 1,
              minWidth: 44,
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {/* Primary CTAs */}
        <div
          style={{
            padding: "16px 24px 0",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {sessionStatus === "authenticated" ? (
            <DashboardButton block onNavigate={onClose} />
          ) : sessionStatus === "unauthenticated" ? (
            <>
          <Link
            to="/create-account"
            onClick={() => {
              haptic("light");
              onClose();
            }}
            style={{
              background: "#0B3A82",
              color: "white",
              borderRadius: 10,
              padding: "14px 20px",
              fontSize: 14,
              fontWeight: 700,
              ...GF,
              textDecoration: "none",
              textAlign: "center",
              display: "block",
            }}
          >
            Create Free Account
          </Link>
          <Link
            to="/sign-in"
            onClick={onClose}
            style={{
              background: "transparent",
              color: "#07111F",
              border: "1px solid rgba(7,17,31,0.16)",
              borderRadius: 10,
              padding: "12px 20px",
              fontSize: 14,
              fontWeight: 500,
              ...GF,
              textDecoration: "none",
              textAlign: "center",
              display: "block",
            }}
          >
            Sign In
          </Link>
            </>
          ) : null}
        </div>

        {/* Accordion nav */}
        <div style={{ padding: "8px 0" }}>
          {TOP_NAV.map((nav) => {
            const isOpen = openSection === nav.id;
            const isEnotary = nav.id === "enotary";
            const accentColor = isEnotary ? "#b01262" : "#0078d4";
            const isCurrent = pathname.startsWith(nav.matchPrefix);
            const NavIcon = navIcon(nav.id);

            return (
              <div key={nav.id}>
                <button
                  aria-expanded={isOpen}
                  aria-controls={`mobile-section-${nav.id}`}
                  aria-current={isCurrent ? "page" : undefined}
                  className="phdr-drawer-row"
                  data-open={isOpen ? "true" : "false"}
                  data-current={isCurrent ? "true" : "false"}
                  onClick={() => {
                    haptic("selection");
                    setOpenSection(isOpen ? null : nav.id);
                  }}
                  style={{
                    ["--phdr-accent" as string]: accentColor,
                    ["--phdr-tint" as string]: isEnotary ? "rgba(176,18,98,0.07)" : "rgba(0,120,212,0.07)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    minHeight: 56,
                    padding: "10px 20px 10px 24px",
                    border: "none",
                    borderBottom: "1px solid rgba(7,17,31,0.06)",
                    cursor: "pointer",
                    color: "#334155",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <span className="phdr-drawer-ico" aria-hidden="true">
                      <NavIcon size={18} strokeWidth={1.9} />
                    </span>
                    <span
                      style={{
                        color: "#07111F",
                        ...GF,
                        fontSize: 15,
                        fontWeight: 600,
                      }}
                    >
                      {nav.label}
                    </span>
                    {nav.badge && (
                      <span
                        style={{
                          background: "rgba(103,2,59,0.1)",
                          color: "#67023B",
                          border: "1px solid rgba(176,18,98,0.25)",
                          borderRadius: 999,
                          padding: "1px 7px",
                          fontSize: 10,
                          fontWeight: 600,
                          ...GF,
                        }}
                      >
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
                    className="phdr-drawer-body"
                    style={{ background: "#F8FAFC", padding: "6px 0 12px", borderBottom: "1px solid rgba(7,17,31,0.06)" }}
                  >
                    {nav.items.map((item) => (
                      <Link
                        key={item.label}
                        to={item.path}
                        onClick={() => {
                          haptic("selection");
                          onClose();
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          minHeight: 44,
                          padding: "10px 24px 10px 70px",
                          textDecoration: "none",
                        }}
                        className="phdr-drawer-link"
                      >
                        <div
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            flexShrink: 0,
                            background: item.isComingSoon
                              ? "#b01262"
                              : accentColor,
                          }}
                        />
                        <span
                          style={{
                            color: item.isComingSoon ? "#64748B" : "#1E293B",
                            ...GF,
                            fontSize: 13,
                          }}
                        >
                          {item.label}
                        </span>
                        {item.isComingSoon && (
                          <span
                            style={{
                              color: "#b01262",
                              ...GF,
                              fontSize: 11,
                              marginLeft: "auto",
                            }}
                          >
                            Coming Soon
                          </span>
                        )}
                      </Link>
                    ))}
                    {/* Section CTA */}
                    <Link
                      to={nav.path}
                      onClick={() => {
                        haptic("light");
                        onClose();
                      }}
                      style={{
                        display: "block",
                        margin: "8px 24px 0 70px",
                        padding: "10px 16px",
                        background: isEnotary
                          ? "rgba(103,2,59,0.08)"
                          : "rgba(0,120,212,0.08)",
                        color: isEnotary ? "#67023B" : "#0078d4",
                        border: `1px solid ${isEnotary ? "rgba(176,18,98,0.25)" : "rgba(0,120,212,0.25)"}`,
                        borderRadius: 8,
                        ...GF,
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: "none",
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
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(7,17,31,0.08)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: "auto",
          }}
        >
          <Link
            to="/verify"
            onClick={onClose}
            style={{
              color: "#334155",
              ...GF,
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            Verify Document
          </Link>
          <Link
            to="/contact"
            onClick={onClose}
            style={{
              color: "#334155",
              ...GF,
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            Contact Sales
          </Link>
          <div
            style={{
              background: "rgba(103,2,59,0.06)",
              border: "1px solid rgba(176,18,98,0.2)",
              borderRadius: 8,
              padding: "8px 12px",
              marginTop: 4,
            }}
          >
            <p
              style={{
                color: "#b01262",
                fontFamily: "'Geist Mono', monospace",
                fontSize: 10,
                fontWeight: 600,
                margin: 0,
              }}
            >
              LAGDA eNotary status: Coming Soon — Subject to Supreme Court
              Accreditation
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Public header ─────────────────────────────────────────────────────────────
export function PublicHeader() {
  const { sessionStatus } = usePlatform();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Scroll detection
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const GF = { fontFamily: "'Geist', sans-serif" };

  return (
    <>
      <header
        ref={navRef}
        role="banner"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: Z.shell,
        }}
      >
        <nav aria-label="Main navigation">
          <div
            style={{
              height: 72,
              background: scrolled ? "rgba(255,255,255,0.92)" : "#ffffff",
              backdropFilter: scrolled ? "blur(20px) saturate(160%)" : "none",
              WebkitBackdropFilter: scrolled
                ? "blur(20px) saturate(160%)"
                : "none",
              borderBottom: scrolled
                ? "1px solid rgba(7,17,31,0.1)"
                : "1px solid rgba(7,17,31,0.08)",
              boxShadow: scrolled ? "0 2px 24px rgba(7,17,31,0.06)" : "none",
              transition:
                "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
            }}
          >
            <div
              style={{
                maxWidth: 1440,
                margin: "0 auto",
                gap: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                height: "100%",
              }}
              className="phdr-inner"
            >
              {/* Logo — brand mark only, not a link */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                  minHeight: 44,
                }}
              >
                <HeaderLogo />
              </div>

              {/* Desktop nav: one link per section. Each section's own pages
                  are the tabs under the header on that page, so a second
                  list of them here would only repeat those. */}
              <ul
                role="list"
                style={{
                  gap: 2,
                  alignItems: "center",
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                }}
                className="phdr-desktop-nav"
              >
                {TOP_NAV.map((nav) => {
                  const isActive = pathname.startsWith(nav.matchPrefix);
                  const isEnotary = nav.id === "enotary";
                  const accentColor = isEnotary ? "#b01262" : "#0078d4";
                  // Darker than the accent so it stays AA on the tinted pill.
                  const accentTextColor = isEnotary ? "#9E1058" : "#0062AF";
                  const NavIcon = navIcon(nav.id);

                  return (
                    <li key={nav.id}>
                      <Link
                        to={nav.path}
                        aria-current={isActive ? "page" : undefined}
                        className="phdr-navbtn"
                        data-active={isActive ? "true" : "false"}
                        style={{
                          ["--phdr-accent" as string]: accentColor,
                          ["--phdr-accent-text" as string]: accentTextColor,
                          ["--phdr-tint" as string]: isEnotary ? "rgba(176,18,98,0.07)" : "rgba(0,120,212,0.07)",
                          fontWeight: isActive ? 600 : 500,
                          textDecoration: "none",
                          ...GF,
                        }}
                      >
                        <span className="phdr-navico" aria-hidden="true">
                          <NavIcon size={16} strokeWidth={1.9} />
                        </span>
                        {nav.label}
                        {nav.badge && (
                          <span
                            style={{
                              background: "rgba(103,2,59,0.1)",
                              color: "#67023B",
                              border: "1px solid rgba(176,18,98,0.25)",
                              borderRadius: 999,
                              padding: "1px 6px",
                              fontSize: 9,
                              fontWeight: 700,
                              marginLeft: 2,
                            }}
                          >
                            {nav.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* Right actions */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexShrink: 0,
                }}
              >
                {sessionStatus === "authenticated" ? (
                  <DashboardButton />
                ) : sessionStatus === "unauthenticated" ? (
                  <>
                {/* Sign In — desktop */}
                <Link
                  to="/sign-in"
                  className="phdr-signin"
                  style={{
                    color: "#07111F",
                    fontSize: 13,
                    fontWeight: 600,
                    ...GF,
                    textDecoration: "none",
                    padding: "9px 15px",
                    minHeight: 36,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #D7DEE8",
                    borderRadius: 8,
                    background: "#FFFFFF",
                    boxShadow: "0 2px 6px rgba(7,17,31,0.06)",
                    transition:
                      "color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#0078d4";
                    e.currentTarget.style.borderColor = "#A9CDEE";
                    e.currentTarget.style.boxShadow =
                      "0 4px 10px rgba(0,120,212,0.10)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#07111F";
                    e.currentTarget.style.borderColor = "#D7DEE8";
                    e.currentTarget.style.boxShadow =
                      "0 2px 6px rgba(7,17,31,0.06)";
                    e.currentTarget.style.transform = "";
                  }}
                >
                  Sign In
                </Link>

                {/* Create Account — desktop */}
                <Link
                  to="/create-account"
                  className="phdr-cta"
                  onClick={() => haptic("light")}
                  style={{
                    background: "#0B3A82",
                    color: "white",
                    borderRadius: 8,
                    padding: "9px 16px",
                    minHeight: 36,
                    fontSize: 13,
                    fontWeight: 700,
                    ...GF,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    boxShadow: "0 4px 12px rgba(11,58,130,0.24)",
                    transition:
                      "filter 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease",
                    alignItems: "center",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = "brightness(1.12)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 18px rgba(11,58,130,0.30)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = "";
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(11,58,130,0.24)";
                  }}
                >
                  Create Free Account
                </Link>

                  </>
                ) : null}

                {/* Hamburger — mobile/tablet */}
                <button
                  className="phdr-hamburger"
                  onClick={() => {
                    haptic("selection");
                    setMobileOpen(true);
                  }}
                  aria-label="Open navigation menu"
                  aria-expanded={mobileOpen}
                  aria-controls="mobile-nav"
                  style={{
                    background: "none",
                    border: "1px solid rgba(7,17,31,0.14)",
                    borderRadius: 8,
                    padding: "8px 10px",
                    cursor: "pointer",
                    color: "#07111F",
                    minWidth: 44,
                    minHeight: 44,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="18"
                    height="14"
                    viewBox="0 0 18 14"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M0 1h18M0 7h18M0 13h18"
                      stroke="#07111F"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
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
          <MobileDrawer
            onClose={() => {
              haptic("selection");
              setMobileOpen(false);
            }}
          />
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

        /* Header gutters: phone → tablet → desktop. */
        .phdr-inner { padding: 0 16px; }
        @media (min-width: 640px)  { .phdr-inner { padding: 0 24px; } }
        @media (min-width: 1280px) { .phdr-inner { padding: 0 40px; } }

        /* Logo crop — see HeaderLogo. Wordmark box = 916×240 canvas units,
           offset (88, 267) inside the 1086×814 canvas. */
        .phdr-logo {
          --phdr-logo-w: 118px;
          display: block;
          width: var(--phdr-logo-w);
          height: calc(var(--phdr-logo-w) * 0.2620);
          overflow: hidden;
          flex-shrink: 0;
        }
        .phdr-logo-img {
          display: block;
          max-width: none;
          width: calc(var(--phdr-logo-w) * 1.1856);
          height: auto;
          margin-left: calc(var(--phdr-logo-w) * -0.0961);
          margin-top: calc(var(--phdr-logo-w) * -0.2915);
        }
        @media (min-width: 640px)  { .phdr-logo { --phdr-logo-w: 128px; } }
        @media (min-width: 1280px) { .phdr-logo { --phdr-logo-w: 144px; } }
        .phdr-logo.phdr-logo--drawer { --phdr-logo-w: 124px; }

        /* Top-nav triggers: icon + label pill, underline indicator. */
        .phdr-navbtn {
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
          height: 40px;
          padding: 0 8px 0 9px;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: #334155;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
          transition: color 180ms ease, background-color 180ms ease;
        }
        .phdr-navbtn::after {
          content: "";
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: 3px;
          height: 2px;
          border-radius: 2px;
          background: var(--phdr-accent);
          transform: scaleX(0);
          transform-origin: center;
          opacity: 0;
          transition: transform 200ms cubic-bezier(0.22, 0.8, 0.24, 1), opacity 160ms ease;
        }
        .phdr-navico {
          display: inline-flex;
          color: #64748B;
          transition: color 180ms ease;
        }
        .phdr-navbtn:hover { color: #07111F; background: rgba(7,17,31,0.045); }
        .phdr-navbtn:hover .phdr-navico { color: var(--phdr-accent); }
        .phdr-navbtn:hover::after { transform: scaleX(0.35); opacity: 0.55; }
        .phdr-navbtn[data-open="true"] { color: var(--phdr-accent-text); background: var(--phdr-tint); }
        .phdr-navbtn[data-open="true"] .phdr-navico { color: var(--phdr-accent); }
        .phdr-navbtn[data-open="true"]::after { transform: scaleX(1); opacity: 1; }
        .phdr-navbtn[data-active="true"] { color: var(--phdr-accent-text); }
        .phdr-navbtn[data-active="true"] .phdr-navico { color: var(--phdr-accent); }
        .phdr-navbtn[data-active="true"]::after { transform: scaleX(1); opacity: 1; }
        .phdr-navbtn:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
        /* The desktop row must hold the logo, six triggers, the Coming Soon
           badge and both CTAs on one line. Measured budgets:
             1024–1199  labels only (icons + chevrons would clip the CTA)
             1200–1359  icons + labels, chevrons tucked away
             ≥1360      icons + labels + chevrons */
        @media (min-width: 1024px) and (max-width: 1199px) {
          .phdr-navico { display: none !important; }
          .phdr-navbtn { padding: 0 8px; }
        }
        @media (min-width: 1024px) and (max-width: 1359px) {
          .phdr-navchev { display: none !important; }
        }
        @media (min-width: 1200px) and (max-width: 1359px) {
          .phdr-navbtn { padding: 0 10px 0 9px; }
        }
        @media (min-width: 1360px) {
          .phdr-navbtn { padding: 0 10px 0 11px; }
        }

        /* Mobile drawer rows. */
        .phdr-drawer-row { background: transparent; transition: background-color 180ms ease; }
        .phdr-drawer-row:hover { background: #F8FAFC; }
        .phdr-drawer-row[data-open="true"] { background: var(--phdr-tint); }
        .phdr-drawer-row:focus-visible { outline: 2px solid #0078D4; outline-offset: -2px; }
        .phdr-drawer-ico {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: #F1F5F9;
          color: #475569;
          transition: background-color 180ms ease, color 180ms ease;
        }
        .phdr-drawer-row[data-open="true"] .phdr-drawer-ico,
        .phdr-drawer-row[data-current="true"] .phdr-drawer-ico {
          background: var(--phdr-accent);
          color: #FFFFFF;
        }
        .phdr-drawer-link { transition: background-color 160ms ease; }
        .phdr-drawer-link:hover { background: rgba(7,17,31,0.04); }
        .phdr-drawer-link:focus-visible { outline: 2px solid #0078D4; outline-offset: -2px; }
        .phdr-iconbtn:hover { background: #F8FAFC !important; color: #07111F !important; }
        .phdr-iconbtn:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }

        @media (prefers-reduced-motion: reduce) {
          .phdr-navbtn, .phdr-navbtn::after, .phdr-navico,
          .phdr-drawer-row, .phdr-drawer-ico, .phdr-drawer-link { transition: none; }
          .phdr-chev { transition: none !important; }
        }
      `}</style>
    </>
  );
}

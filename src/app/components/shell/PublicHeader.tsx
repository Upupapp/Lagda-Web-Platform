import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import { isStaticSitePath } from "../../config/enotary-directory";
import lagdaHeaderLogo from "../../assets/brand/LagdaLogoPrimaryHorizontalFullColor.png";
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
            const accentColor = isEnotary ? "#b01262" : "#1b3a66";
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
                    ["--phdr-tint" as string]: isEnotary ? "rgba(176,18,98,0.07)" : "#e6f0fa",
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
                        reloadDocument={isStaticSitePath(item.path)}
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
                      reloadDocument={isStaticSitePath(nav.path)}
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

  // Scroll detection. Past the first 24px the header shrinks (64px → 54px);
  // its live height is published as --phdr-h so the sticky section tabs and
  // the top-right wave stay right under it.
  useEffect(() => {
    const root = document.documentElement;
    let last: boolean | null = null;
    const onScroll = () => {
      const condensed = window.scrollY > 24;
      if (condensed === last) return;
      last = condensed;
      setScrolled(condensed);
      root.style.setProperty("--phdr-h", condensed ? "54px" : "64px");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      root.style.removeProperty("--phdr-h");
    };
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
        data-condensed={scrolled ? "true" : "false"}
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
            className="phdr-bar"
            style={{
              height: "var(--phdr-h, 64px)",
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
                "height 0.28s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
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
                  // Navy for LAGDA's sections; eNotary keeps its burgundy.
                  const accentColor = isEnotary ? "#b01262" : "#1b3a66";
                  // Darker than the accent so it stays AA on the tinted pill.
                  const accentTextColor = isEnotary ? "#9E1058" : "#1b3a66";
                  const NavIcon = navIcon(nav.id);

                  return (
                    <li key={nav.id}>
                      <Link
                        to={nav.path}
                        // The eNotary tab leads to the static Notary Directory: a full page load.
                        reloadDocument={isStaticSitePath(nav.path)}
                        aria-current={isActive ? "page" : undefined}
                        className="phdr-navbtn"
                        data-active={isActive ? "true" : "false"}
                        style={{
                          ["--phdr-accent" as string]: accentColor,
                          ["--phdr-accent-text" as string]: accentTextColor,
                          ["--phdr-tint" as string]: isEnotary ? "rgba(176,18,98,0.07)" : "#e6f0fa",
                          ["--phdr-ring" as string]: isEnotary ? "rgba(176,18,98,0.22)" : "#c9ddf1",
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
                {/* Sign In — desktop: a plain link beside the one filled button. */}
                <Link to="/sign-in" className="phdr-signin" style={{ ...GF, display: "inline-flex" }}>
                  Sign In
                </Link>

                {/* Create Account — desktop: a compact navy pill. */}
                <Link
                  to="/create-account"
                  className="phdr-cta"
                  onClick={() => haptic("light")}
                  style={GF}
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
          .phdr-signin      { display: inline-flex !important; }
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

        /* Top nav, minimized: the six sections as compact text pills in one
           light capsule (no icons, no underline). The current section is navy
           on the app's pale sky tint; eNotary keeps its burgundy. */
        .phdr-desktop-nav {
          padding: 3px !important;
          gap: 2px !important;
          background: rgba(255,255,255,0.78);
          border: 1px solid #e1e9f3;
          border-radius: 999px;
          box-shadow: 0 1px 2px rgba(20,41,77,0.04);
        }
        .phdr-navbtn {
          position: relative;
          display: flex;
          align-items: center;
          gap: 5px;
          height: 32px;
          padding: 0 12px;
          border: none;
          border-radius: 999px;
          background: transparent;
          color: #334155;
          font-size: 13px;
          letter-spacing: 0.005em;
          cursor: pointer;
          white-space: nowrap;
          transition: color 180ms ease, background-color 180ms ease, box-shadow 180ms ease;
        }
        .phdr-navico { display: none !important; }
        .phdr-navchev { display: none !important; }
        .phdr-navbtn:hover { color: #1b3a66; background: #eef5fc; }
        .phdr-navbtn[data-open="true"],
        .phdr-navbtn[data-active="true"] {
          color: var(--phdr-accent-text);
          background: var(--phdr-tint);
          box-shadow: inset 0 0 0 1px var(--phdr-ring, transparent);
        }
        .phdr-navbtn:focus-visible { outline: 2px solid #1b3a66; outline-offset: 2px; }
        /* Narrow desktops: a little tighter so everything stays on one line. */
        @media (min-width: 1024px) and (max-width: 1199px) {
          .phdr-navbtn { padding: 0 9px; font-size: 12.5px; }
        }

        /* Sign In: a plain navy link. Create Free Account: the one filled
           button, a compact navy pill. */
        .phdr-signin {
          align-items: center;
          height: 32px;
          padding: 0 12px;
          border-radius: 999px;
          color: #1b3a66;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
          transition: background-color 160ms ease, color 160ms ease;
        }
        .phdr-signin:hover { background: #eef5fc; text-decoration: underline; text-decoration-color: #4a9ad8; text-underline-offset: 4px; }
        .phdr-signin:focus-visible { outline: 2px solid #1b3a66; outline-offset: 2px; }
        .phdr-cta {
          align-items: center;
          height: 34px;
          padding: 0 16px;
          border-radius: 999px;
          background: #1b3a66;
          color: #FFFFFF;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
          box-shadow: 0 8px 16px -10px rgba(27,58,102,0.7);
          transition: background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }
        .phdr-cta:hover { background: #14294d; box-shadow: 0 10px 20px -10px rgba(20,41,77,0.75); transform: translateY(-1px); }
        .phdr-cta:focus-visible { outline: 2px solid #1b3a66; outline-offset: 3px; }

        /* The logo settles a little smaller with the header as the page scrolls. */
        .phdr-logo { transform-origin: left center; transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1); }
        header[data-condensed="true"] .phdr-logo { transform: scale(0.9); }

        /* Mobile drawer rows. */
        .phdr-drawer-row { background: transparent; transition: background-color 180ms ease; }
        .phdr-drawer-row:hover { background: #F8FAFC; }
        .phdr-drawer-row[data-open="true"] { background: var(--phdr-tint); }
        .phdr-drawer-row:focus-visible { outline: 2px solid #1b3a66; outline-offset: -2px; }
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
        .phdr-drawer-link:focus-visible { outline: 2px solid #1b3a66; outline-offset: -2px; }
        .phdr-iconbtn:hover { background: #F8FAFC !important; color: #07111F !important; }
        .phdr-iconbtn:focus-visible { outline: 2px solid #1b3a66; outline-offset: 2px; }

        @media (prefers-reduced-motion: reduce) {
          .phdr-navbtn, .phdr-navbtn::after, .phdr-navico,
          .phdr-drawer-row, .phdr-drawer-ico, .phdr-drawer-link,
          .phdr-signin, .phdr-cta, .phdr-logo, .phdr-bar { transition: none !important; }
          .phdr-cta:hover { transform: none; }
          .phdr-chev { transition: none !important; }
        }
      `}</style>
    </>
  );
}

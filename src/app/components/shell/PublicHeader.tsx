import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import lagdaHeaderLogo from "../../../brand elements/svg/LagdaLogoPrimaryHorizontalFullColor_Header.svg";
import {
  TOP_NAV,
  type NavSection,
  type NavItem,
} from "@/app/config/nav.config";
import { haptic } from "@/app/utils/haptic";
import { Z } from "../../utils/z-index";

// ── Chevron icon ──────────────────────────────────────────────────────────────
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
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

// ── Mega dropdown panel ───────────────────────────────────────────────────────
function MegaPanel({
  section,
  onClose,
}: {
  section: NavSection;
  onClose: () => void;
}) {
  const isAzure = section.accent === "azure";
  const accentColor = isAzure ? "#0078d4" : "#b01262";
  const accentBg = isAzure ? "rgba(0,120,212,0.06)" : "rgba(103,2,59,0.06)";
  const accentBorder = isAzure ? "rgba(0,120,212,0.18)" : "rgba(103,2,59,0.2)";
  const GF = { fontFamily: "'Geist', sans-serif" };

  return (
    <div
      role="menu"
      aria-label={section.menuTitle}
      style={{
        background: "#ffffff",
        border: `1px solid ${accentBorder}`,
        borderRadius: 20,
        padding: 24,
        boxShadow:
          "0 24px 64px rgba(7,17,31,0.16), 0 2px 8px rgba(7,17,31,0.06)",
        minWidth: 720,
        maxWidth: 880,
        animation: "dropdownEnter 0.2s ease-out both",
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: "1px solid rgba(7,17,31,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <p
              style={{
                color: "#07111F",
                ...GF,
                fontSize: 15,
                fontWeight: 700,
                margin: 0,
                marginBottom: 4,
              }}
            >
              {section.menuTitle}
            </p>
            <p style={{ color: "#64748B", ...GF, fontSize: 13, margin: 0 }}>
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
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = "brightness(1.12)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = "";
              e.currentTarget.style.transform = "";
            }}
          >
            {section.menuCtaLabel} →
          </Link>
        </div>
        {section.menuCtaNote && (
          <p
            style={{
              color: "#64748B",
              fontFamily: "'Geist Mono', monospace",
              fontSize: 11,
              margin: 0,
              marginTop: 8,
            }}
          >
            {section.menuCtaNote}
          </p>
        )}
      </div>

      {/* Items grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 4,
        }}
      >
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
            onMouseEnter={(e) => {
              e.currentTarget.style.background = accentBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                flexShrink: 0,
                marginTop: 7,
                background: item.isComingSoon ? "#b01262" : accentColor,
              }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    color: "#07111F",
                    ...GF,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </span>
                {item.isComingSoon && (
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
                    Coming Soon
                  </span>
                )}
              </div>
              <p
                style={{
                  color: "#64748B",
                  ...GF,
                  fontSize: 12,
                  margin: 0,
                  marginTop: 2,
                }}
              >
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
            padding: "20px 24px",
            borderBottom: "1px solid rgba(7,17,31,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <img
            src={lagdaHeaderLogo}
            alt="LAGDA"
            style={{
              display: "block",
              width: 150,
              height: 44,
              objectFit: "contain",
              objectPosition: "left center",
            }}
          />
          <button
            onClick={() => {
              haptic("selection");
              onClose();
            }}
            aria-label="Close menu"
            style={{
              color: "#64748B",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 8,
              fontSize: 20,
              lineHeight: 1,
              minWidth: 44,
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
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
                  onClick={() => {
                    haptic("selection");
                    setOpenSection(isOpen ? null : nav.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "14px 24px",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid rgba(7,17,31,0.06)",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span
                      style={{
                        color: "#07111F",
                        ...GF,
                        fontSize: 14,
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
                    style={{ background: "#F8FAFB", padding: "4px 0 8px" }}
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
                          padding: "11px 24px 11px 36px",
                          textDecoration: "none",
                        }}
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
                        margin: "8px 24px 0",
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
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout>>();
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
      if (e.key === "Escape") {
        setOpenDropdown(null);
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

  function startOpen(id: string) {
    clearTimeout(closeTimer.current);
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => setOpenDropdown(id), 420);
  }
  function startClose() {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 240);
  }
  function cancelClose() {
    clearTimeout(closeTimer.current);
  }

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
                padding: "0 48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                height: "100%",
              }}
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
                <img
                  src={lagdaHeaderLogo}
                  alt="LAGDA"
                  style={{
                    display: "block",
                    width: 190,
                    height: 54,
                    objectFit: "contain",
                    objectPosition: "left center",
                  }}
                />
              </div>

              {/* Desktop nav */}
              <ul
                role="list"
                style={{
                  gap: 4,
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
                  const isOpen = openDropdown === nav.id;
                  const accentColor = isEnotary ? "#b01262" : "#0078d4";
                  const accentTextColor = isEnotary ? "#B01262" : "#0078D4";

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
                          if (
                            e.key === "ArrowDown" ||
                            e.key === "Enter" ||
                            e.key === " "
                          ) {
                            e.preventDefault();
                            setOpenDropdown(nav.id);
                          }
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "8px 10px 8px 12px",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          color: isActive ? accentTextColor : "#334155",
                          fontSize: 13,
                          fontWeight: isActive ? 600 : 500,
                          ...GF,
                          transition: "color 0.18s ease",
                          borderBottom: isActive
                            ? `2px solid ${accentColor}`
                            : "2px solid transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive)
                            e.currentTarget.style.color = "#07111F";
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive)
                            e.currentTarget.style.color = "#334155";
                        }}
                      >
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
                        <span style={{ marginLeft: 2, opacity: 0.6 }}>
                          <Chevron open={isOpen} />
                        </span>
                      </button>

                      {/* Mega panel.
                          `position: fixed` anchored to the viewport center, not
                          the trigger's own <li> — the panel is up to 880px wide,
                          and centering it under a trigger near either edge of the
                          nav (eSignature on the left, eNotary on the right) would
                          push it straight off the edge of the screen. Anchoring
                          to the viewport instead keeps it fully visible no matter
                          which item opened it. */}
                      {isOpen && (
                        <div
                          style={{
                            position: "fixed",
                            top: 80,
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexShrink: 0,
                }}
              >
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
      `}</style>
    </>
  );
}

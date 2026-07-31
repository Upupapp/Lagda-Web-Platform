import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router";

// ── URL → view state ──────────────────────────────────────────────────────────
// Navigation is now URL-driven: PublicHeader renders <Link> elements; App.tsx
// reads the current pathname and derives the active section/tab.
// No state machine, no bidirectional effects, no URL sync loops.

type Section = "pricing" | "resources";
type PricingTab = "pricing-main" | "compare-plans";
type ResourcesTab = "guides" | "faq";

type UrlState = {
  section: Section;
  pricingTab?: PricingTab;
  resourcesTab?: ResourcesTab;
};

function pathToState(pathname: string): UrlState | null {
  const p = pathname.replace(/\/$/, "");
  if (p === "/pricing")                                        return { section: "pricing",    pricingTab: "pricing-main" };
  if (p === "/pricing/compare")                                return { section: "pricing",    pricingTab: "compare-plans" };
  if (p === "/resources" || p === "/resources/guides")         return { section: "resources",  resourcesTab: "guides" };
  if (p === "/resources/faq")                                  return { section: "resources",  resourcesTab: "faq" };
  return null;
}

import DLagdaPricingMainPage from "@/imports/DLagdaPricingMainPage/index";
import DLagdaPricingComparePlans from "@/imports/DLagdaPricingComparePlans/index";
import DLagdaResourcesGuides from "@/imports/DLagdaResourcesGuides/index";
import DLagdaResourcesFaq from "@/imports/DLagdaResourcesFaq/index";

// CSS overrides applied globally to fix Figma-import rendering.
// See inline comments for rationale on each rule.
const globalOverrides = `
  /* ── LOCKED NAV / FOOTER BEHAVIOR ──────────────────────────────────────────
     PublicHeader (PublicLayout) is the single shell nav. PublicFooter replaces
     all imported footers. No Figma import's nav or footer should ever be visible.

     Rule 1 — Hide every imported screen's embedded navbar universally.
     Rule 2 — Hide every imported screen's embedded footer universally.
     Rule 3 — Hide the eSignature "Jump to:" in-page anchor strip.
  ─────────────────────────────────────────────────────────────────────────── */

  /* Rule 1: navbar suppression */
  [data-name="navbar"],
  [data-name="main-nav"] {
    display: none !important;
  }

  /* Rule 2: footer suppression — real footer is rendered by PublicFooter */
  [data-name="footer"],
  [data-name="Footer"] {
    display: none !important;
  }

  /* Hide the "RESOURCES & EDUCATION" eyebrow badge in the Guides hero */
  [data-name="d-lagda-resources-guides"] [data-name="hero"] [data-name="badge"] {
    display: none !important;
  }

  /* Rule 3: in-page anchor nav */
  [data-name="jump-nav"] {
    display: none !important;
  }

  /* PricingMainPage absolute navbar residual padding */
  [data-name="d-lagda-pricing-main page"] {
    padding-top: 0 !important;
  }

  /* Root page containers: stretch children to full width */
  [data-name="d-lagda-resources-guides"],
  [data-name="d-lagda-resources-faq"] {
    align-items: stretch !important;
  }

  [data-name="faq-row-1"] { align-items: center !important; }
  [data-name="featured-section"] { align-items: center !important; }
  [data-name="workflow-strip"] > div:not([aria-hidden]) { align-items: center !important; }

  [data-name="Trust Badges - Section"] [class*="e6e6e6"] { color: black !important; }

  [data-name^="Row:"] { height: auto !important; min-height: 90px; }

  [data-name^="Card:"] {
    height: auto !important; min-height: 220px;
    flex: 1 1 auto !important; width: auto !important; max-width: 600px;
  }
  [data-name^="Card:"] > div:not([aria-hidden]) { height: auto !important; min-height: inherit; }
  [data-name="Cards Row 1"], [data-name="Cards Row 2"] { align-items: stretch !important; }

  /* ═══════════════════════════════════════════════════════════════════════════
     ANIMATIONS AND INTERACTIONS
     ═══════════════════════════════════════════════════════════════════════════ */

  @keyframes dropdownEnter {
    from { opacity: 0; transform: translateY(-6px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @media (min-width: 1024px) {
    .hidden.lg\\:block { display: block !important; }
    .hidden.lg\\:flex  { display: flex !important; }
    .lg\\:hidden       { display: none !important; }
  }

  @keyframes lagdaPageEnter {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .lagda-page-enter {
    animation: lagdaPageEnter 0.28s ease-out both;
  }

  [data-name="Frame"].relative.rounded-\\[16px\\],
  [data-name^="Card:"],
  [data-name="Trust Badges - Section"] [data-name="Frame"],
  .lagda-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease !important;
    will-change: transform;
  }
  [data-name="Frame"].relative.rounded-\\[16px\\]:hover,
  [data-name^="Card:"]:hover {
    transform: translateY(-4px) !important;
    box-shadow: 0 12px 32px rgba(0,0,0,0.18) !important;
  }
  [data-name^="Card:"]:not([class*="\\#67023b"]):hover,
  [data-name="Trust Badges - Section"] [data-name="Frame"]:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,0.14), 0 0 0 1.5px rgba(0,120,212,0.35) !important;
  }
  [data-name^="Card:"][class*="\\#67023b"]:hover,
  [class*="\\#67023b"][data-name^="Card:"]:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,0.14), 0 0 0 1.5px rgba(176,18,98,0.35) !important;
  }

  [data-name^="CTA:"], [data-name="button"], [data-name="cta-primary"], [data-name="cta-secondary"] {
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease !important;
    cursor: pointer;
  }
  [data-name^="CTA:"]:hover, [data-name="button"]:hover, [data-name="cta-primary"]:hover {
    transform: translateY(-1px) !important;
    box-shadow: 0 6px 20px rgba(0,120,212,0.32) !important;
    filter: brightness(1.08);
  }
  [data-name^="CTA:"]:active, [data-name="button"]:active, [data-name="cta-primary"]:active {
    transform: translateY(1px) !important;
    box-shadow: none !important;
  }
  [data-name="CTA: Join Waitlist"]:hover, [data-name="CtaJoinWaitlist"]:hover {
    box-shadow: 0 6px 20px rgba(176,18,98,0.4) !important;
    filter: brightness(1.1);
  }

  button:focus-visible, a:focus-visible, [role="button"]:focus-visible {
    outline: 2px solid #0078d4 !important;
    outline-offset: 3px !important;
    border-radius: 4px;
  }

  [data-name*="Business"][data-name*="Plan"], [data-name*="Recommended"] {
    box-shadow: 0 0 0 1.5px rgba(0,120,212,0.4), 0 8px 32px rgba(0,120,212,0.12) !important;
  }

  tr:hover, [data-name*="row"]:hover, [data-name*="Row"]:hover {
    background: rgba(0,120,212,0.04) !important;
    transition: background 0.15s ease !important;
  }

  [data-name$="-Section"] + [data-name$="-Section"]::before {
    content: '';
    display: block;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(0,120,212,0.12), transparent);
  }

  [data-name="icon-circle"], [data-name="Frame"][class*="rounded-\\[14px\\]"], [data-name="Icon"] {
    transition: transform 0.2s ease !important;
  }
  [data-name^="Card:"]:hover [data-name="icon-circle"],
  [data-name^="Card:"]:hover [data-name="Icon"] {
    transform: translateY(-2px) !important;
  }

  @media (prefers-reduced-motion: reduce) {
    .lagda-page-enter { animation: none !important; }
    [data-name^="Card:"], [data-name^="CTA:"], [data-name="button"],
    [data-name="cta-primary"], [data-name="icon-circle"], [data-name="Icon"] {
      transition: none !important;
      animation: none !important;
    }
    [data-name^="Card:"]:hover, [data-name^="CTA:"]:hover, [data-name="button"]:hover {
      transform: none !important;
    }
  }
`;

export default function App() {
  const { pathname } = useLocation();

  // Derive current view entirely from URL — no state, no effects for sync.
  const parsed        = pathToState(pathname);
  const section       = (parsed?.section      ?? "pricing");
  const pricingTab    = (parsed?.pricingTab   ?? "pricing-main");
  const resourcesTab  = (parsed?.resourcesTab ?? "guides");

  // Page animation key — increments on pathname change to trigger CSS enter animation.
  const pageKey  = useRef(0);
  const prevPath = useRef(pathname);
  if (prevPath.current !== pathname) {
    pageKey.current += 1;
    prevPath.current  = pathname;
  }

  // Scroll-reveal via IntersectionObserver.
  const revealObserver = useRef<IntersectionObserver | null>(null);
  const attachReveal = useCallback(() => {
    revealObserver.current?.disconnect();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    revealObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = "1";
            (entry.target as HTMLElement).style.transform = "translateY(0)";
            revealObserver.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.07, rootMargin: "0px 0px -32px 0px" }
    );

    const sectionSelectors = [
      '[data-name$="-Section"]',
      '[data-name="Identity Verification"]',
      '[data-name="Trust Badges - Section"]',
      '[data-name="LAGDA eNotary - Coming Soon"]',
      '[data-name="Audit Trail - Section"]',
      '[data-name="Two Columns"]',
      '[data-name="Document Verification Architecture"]',
      '[data-name="Signer Accountability and Audit Trail"]',
    ];

    const seen = new Set<Element>();
    sectionSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        const rect = el.getBoundingClientRect();
        if (rect.top > window.innerHeight * 0.85) {
          (el as HTMLElement).style.opacity = "0";
          (el as HTMLElement).style.transform = "translateY(12px)";
          (el as HTMLElement).style.transition = "opacity 0.4s ease-out, transform 0.4s ease-out";
          revealObserver.current?.observe(el);
        }
      });
    });
  }, []);

  useEffect(() => {
    const id = setTimeout(attachReveal, 80);
    return () => { clearTimeout(id); revealObserver.current?.disconnect(); };
  }, [pathname, attachReveal]);

  // contentPullUp: hides the Figma-embedded navbar.
  // PublicLayout's <main> already adds 72px top-padding for the fixed header.
  // Negative marginTop here slides the Figma content up so its nav area goes
  // behind the fixed PublicHeader, effectively hiding it without display:none.
  const pricingPullUp   = pricingTab   === "compare-plans" ? 80 : 0;
  const resourcesPullUp = resourcesTab === "faq"           ? 72  : 80;
  const contentPullUp   = section === "pricing"   ? pricingPullUp
    : section === "resources" ? resourcesPullUp
    : 0;


  return (
    <>
      {/* Global CSS overrides for Figma imports — nav/footer suppression + polish */}
      <style>{globalOverrides}</style>

      {/* overflow-x-auto: all Figma imports are 1440px wide */}
      <div style={{ overflowX: "auto" }}>
        {/* Negative marginTop slides the Figma nav/sub-nav behind the fixed PublicHeader */}
        <div style={{ marginTop: -contentPullUp }}>
          {/* key forces remount on navigation, triggering the CSS entry animation */}
          <div
            key={pageKey.current}
            className="lagda-page-enter"
            style={{ width: 1440, minWidth: 1440, marginLeft: "auto", marginRight: "auto" }}
          >
            {section === "pricing"    && pricingTab === "pricing-main"         && <DLagdaPricingMainPage />}
            {section === "pricing"    && pricingTab === "compare-plans"        && <DLagdaPricingComparePlans />}
            {section === "resources"  && resourcesTab === "guides"             && <DLagdaResourcesGuides />}
            {section === "resources"  && resourcesTab === "faq"                && <DLagdaResourcesFaq />}
          </div>
        </div>
      </div>
    </>
  );
}

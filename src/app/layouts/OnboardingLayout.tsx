// C13 — Onboarding layout shell.
// Separate from AuthLayout: shows step progress, branding, and nav chrome.
// Used by the four /onboarding/* steps (Profile · Workspace · Security · Review).

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { LogOut, type LucideIcon } from "lucide-react";
import { ONBOARDING_STEPS, type OnboardingProgress, type OnboardingStepId } from "../models/auth";
import { useOnboarding } from "../context/OnboardingContext";
import { Z } from "../utils/z-index";
import lagdaHeaderLogo from "../../brand elements/svg/LagdaLogoPrimaryHorizontalFullColor_Header.svg";
// The shared design system, rather than this file's own hex constants. See
// components/system/design-system.tsx for why onboarding and the signer are
// deliberately on one palette.
import {
  T, PhaseBanner, ActionButton, useViewport,
} from "../components/system/design-system";
import { useSignOutFlow } from "../hooks/useSignOutFlow";
import { ONBOARDING_HELP } from "../pages/onboarding/onboarding-help";
import { OnboardingInfoFab, INFO_PANEL_WIDTH } from "./OnboardingInfoFab";

const GF = { fontFamily: "'Geist', sans-serif" };

interface OnboardingLayoutProps {
  children: ReactNode;
  /** Override to hide the progress bar */
  showProgress?: boolean;
}

// Removed from view but not from the accessibility tree. `display: none` and
// `visibility: hidden` would hide it from screen readers too.
const SR_ONLY: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

// Fallback-URL guard: which progress flag must be true before a step is
// reachable. "review" has no flag of its own — it requires every step
// before it. Maps 1:1 with ONBOARDING_STEPS order in models/auth.ts.
const PROGRESS_KEY_BY_STEP: Partial<Record<OnboardingStepId, keyof OnboardingProgress>> = {
  profile: "profile",
  workspace: "workspace",
  security: "security",
};

/** At or below this width the stepper collapses to "Step N of 4" and the
 *  action bar is pinned to the bottom of the screen. */
const NARROW_MAX = 639;
/** At and above this width the info button opens a docked side panel. */
const PANEL_MIN = 900;
/** Height of the pinned phone action bar, excluding the safe-area inset. */
const ACTION_BAR_HEIGHT = 68;

function isStepDone(id: OnboardingStepId, progress: OnboardingProgress): boolean {
  const key = PROGRESS_KEY_BY_STEP[id];
  return key ? progress[key] : false;
}

export function OnboardingLayout({
  children,
  showProgress = true,
}: OnboardingLayoutProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { pendingUser, progress, reset } = useOnboarding();
  const { width } = useViewport();
  const isNarrow = width <= NARROW_MAX;
  const isWide = width >= PANEL_MIN;
  const [infoOpen, setInfoOpen] = useState(false);

  // Keeps the current card in view when the strip scrolls.
  const currentCardRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    currentCardRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  });

  // A new step starts at the top. Continue sits at the bottom of a long form,
  // and the router keeps the scroll position across the navigation, so the
  // next step would otherwise open scrolled past its own heading.
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  // The docked info panel starts where the sticky header + stepper ends. That
  // height changes with the breakpoint and with the email wrapping, so it is
  // measured rather than written down.
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const [stickyHeight, setStickyHeight] = useState(0);
  useLayoutEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const measure = () => setStickyHeight(el.getBoundingClientRect().height);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const currentStepMeta = ONBOARDING_STEPS.find((s) =>
    pathname.startsWith(s.path),
  );
  const currentStepNumber = currentStepMeta?.stepNumber ?? 0;
  // Never on /mfa/setup (it does not use this layout; the guard keeps that
  // true if it ever does).
  const showInfo = currentStepMeta !== undefined && !pathname.startsWith("/mfa");
  const panelOpen = showInfo && infoOpen && isWide;

  // Fallback URL: a visitor who deep-links past a step they haven't actually
  // completed lands back on the earliest step that still needs attention,
  // instead of a broken or misleadingly-empty page.
  useEffect(() => {
    if (!currentStepMeta) return;
    const requiredBefore = ONBOARDING_STEPS.filter((s) => s.stepNumber < currentStepMeta.stepNumber);
    const blocking = requiredBefore.find((s) => {
      const key = PROGRESS_KEY_BY_STEP[s.id];
      return key && !progress[key];
    });
    if (blocking) {
      void navigate(blocking.path, { replace: true });
    }
  }, [currentStepMeta, progress, navigate]);

  const { requestSignOut, confirmDialog } = useSignOutFlow(() => { reset(); });
  const handleSignOut = requestSignOut;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5FAFF",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Geist', sans-serif",
        // Room for the pinned phone action bar, so the footer's last line is
        // never underneath it.
        paddingBottom: isNarrow && showInfo
          ? `calc(${ACTION_BAR_HEIGHT}px + env(safe-area-inset-bottom))`
          : 0,
      }}
    >
      {/* Header and step cards stick TOGETHER — one sticky wrapper has no
          second top offset to keep in sync with the first one's height. */}
      <div ref={stickyRef} style={{ position: "sticky", top: 0, zIndex: Z.sticky, background: "#F5F9FF" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid #DBEAFE",
          background: "#FFFFFF",
        }}
      >
        <div className="onboarding-brand" aria-label="LAGDA" style={{ flexShrink: 0 }}>
          <img src={lagdaHeaderLogo} alt="LAGDA" />
        </div>

        {/* minWidth: 0 is what stops the email pushing Sign out off the
            screen. */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1, justifyContent: "flex-end" }}>
          {pendingUser && (
            <span
              title={pendingUser.email}
              className="ob-header-email"
              style={{
                color: "#64748B", ...GF, fontSize: 12,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {pendingUser.email}
            </span>
          )}
          <button
            onClick={handleSignOut}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#64748B",
              ...GF,
              fontSize: 12,
              padding: "6px 10px",
              minHeight: 44,
              borderRadius: 6,
            }}
            className="ob-signout-btn"
            aria-label="Sign out"
          >
            <LogOut size={14} aria-hidden style={{ flexShrink: 0 }} />
            <span className="ob-signout-label">Sign out</span>
          </button>
        </div>
      </header>

      {/* Progress indicator */}
      {showProgress && currentStepMeta && (
        <nav
          aria-label="Onboarding progress"
          style={{
            display: "flex",
            padding: isNarrow ? "10px 16px 12px" : "14px clamp(12px, 4vw, 24px) 14px",
            borderBottom: "1px solid #E3EDF7",
          }}
        >
          {isNarrow ? (
            // A phone has no room for four cards: one line says where you
            // are, the bar says how far along.
            <div style={{ width: "100%" }}>
              <p style={{ ...GF, margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#07111F" }}>
                Step {currentStepNumber} of {ONBOARDING_STEPS.length}
                <span style={{ color: "#64748B", fontWeight: 600 }}> · {currentStepMeta.label}</span>
              </p>
              <div
                role="progressbar"
                aria-label={`Step ${currentStepNumber} of ${ONBOARDING_STEPS.length}`}
                aria-valuemin={0}
                aria-valuemax={ONBOARDING_STEPS.length}
                aria-valuenow={currentStepNumber}
                style={{ height: 6, borderRadius: 3, background: "#E3EDF7", overflow: "hidden" }}
              >
                <div
                  className="ob-progress-fill"
                  style={{
                    height: "100%", borderRadius: 3, background: "#0078D4",
                    width: `${(currentStepNumber / ONBOARDING_STEPS.length) * 100}%`,
                    transition: "width 200ms ease",
                  }}
                />
              </div>
            </div>
          ) : (
            <>
              <p style={SR_ONLY}>
                Step {currentStepNumber} of {ONBOARDING_STEPS.length}
              </p>
              {/* Cards, each carrying the step's name. A done step shows ✓ and
                  links back so it can be edited; a later step stays inert
                  until every step before it is saved. */}
              <ol
                className="ob-step-cards"
                style={{
                  display: "flex", alignItems: "stretch", gap: 8,
                  listStyle: "none", margin: 0, padding: "0 0 4px",
                  overflowX: "auto", scrollbarWidth: "none", width: "100%",
                }}
              >
                {ONBOARDING_STEPS.map((step, i) => {
                  const isCurrent = step.id === currentStepMeta.id;
                  const isDone = isStepDone(step.id, progress);
                  const reachable = ONBOARDING_STEPS
                    .filter((s) => s.stepNumber < step.stepNumber)
                    .every((s) => isStepDone(s.id, progress));
                  const clickable = !isCurrent && (isDone || reachable);
                  // Auto margins centre the strip while there is room and
                  // collapse to zero when it scrolls, so the first card is
                  // never pushed out of reach.
                  const edge = i === 0
                    ? { marginLeft: "auto" }
                    : i === ONBOARDING_STEPS.length - 1 ? { marginRight: "auto" } : {};
                  const cardStyle: React.CSSProperties = {
                    ...GF, display: "flex", alignItems: "center",
                    gap: "clamp(8px, 1.4vw, 12px)",
                    minWidth: "clamp(128px, 14vw, 190px)",
                    minHeight: "clamp(46px, 5vw, 60px)",
                    padding: "0 clamp(12px, 1.6vw, 18px)", borderRadius: 12,
                    border: isCurrent ? "1.5px solid #0078D4" : "1px solid #E3E8EF",
                    background: isCurrent ? "#EBF4FC" : "#FFFFFF",
                    textDecoration: "none",
                    boxSizing: "border-box",
                  };
                  const showCheck = isDone && !isCurrent;
                  const inner = (
                    <>
                      <span
                        aria-hidden
                        style={{
                          width: "clamp(24px, 2.4vw, 32px)", height: "clamp(24px, 2.4vw, 32px)",
                          borderRadius: "50%", flexShrink: 0,
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          fontSize: "clamp(11px, 1.1vw, 14px)", fontWeight: 700,
                          background: isDone || isCurrent ? "#0078D4" : "#EEF2F6",
                          color: isDone || isCurrent ? "#FFFFFF" : "#8A9BAE",
                        }}
                      >
                        {showCheck ? "✓" : step.stepNumber}
                      </span>
                      <span style={{
                        fontSize: "clamp(12.5px, 1.25vw, 16px)",
                        fontWeight: isCurrent ? 700 : 600,
                        color: isCurrent ? "#0078D4" : isDone || clickable ? "#07111F" : "#8A9BAE",
                        whiteSpace: "nowrap",
                      }}>
                        {step.label}
                        {showCheck && <span style={SR_ONLY}> (done)</span>}
                      </span>
                    </>
                  );
                  return (
                    <li key={step.id} style={{ flexShrink: 0, ...edge }}>
                      {clickable ? (
                        <Link to={step.path} className="ob-step-link" style={cardStyle}>
                          {inner}
                        </Link>
                      ) : (
                        <div
                          ref={isCurrent ? currentCardRef : undefined}
                          aria-current={isCurrent ? "step" : undefined}
                          aria-disabled={isCurrent ? undefined : true}
                          style={cardStyle}
                        >
                          {inner}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </nav>
      )}
      </div>

      {/* Content */}
      <main
        id="onboarding-main"
        tabIndex={-1}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: isNarrow ? 20 : 32,
          paddingBottom: isNarrow ? 32 : 48,
          paddingLeft: 16,
          // The docked info panel takes the right-hand 340px: the column
          // narrows and the card re-centres in what is left, so the panel
          // never covers it. Between 640 and 900 the round button floats at
          // the right edge, so the column keeps clear of that too.
          paddingRight: panelOpen
            ? INFO_PANEL_WIDTH + 16
            : showInfo && !isNarrow && !isWide ? 76 : 16,
          transition: "padding-right 180ms ease",
          outline: "none",
          minWidth: 0,
        }}
      >
        <div style={{ width: "100%", maxWidth: 560 }}>{children}</div>
      </main>

      {showInfo && currentStepMeta && (
        <OnboardingInfoFab
          help={ONBOARDING_HELP[currentStepMeta.id]}
          open={infoOpen}
          onOpenChange={setInfoOpen}
          mode={isWide ? "panel" : "sheet"}
          panelTop={stickyHeight}
          fabBottom={isNarrow
            ? `calc(${ACTION_BAR_HEIGHT + 12}px + env(safe-area-inset-bottom))`
            : "24px"}
        />
      )}

      {confirmDialog}

      {/* Footer */}
      <footer
        className="onboarding-footer"
        style={{
          borderTop: "1px solid #DBEAFE",
          padding: "28px 24px 18px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          flexWrap: "wrap",
          background: "#FFFFFF",
          textAlign: "center",
        }}
      >
        <img
          className="onboarding-footer-logo"
          src={lagdaHeaderLogo}
          alt="LAGDA"
        />
        <p className="onboarding-footer-description">
          The Philippine-first electronic signature and document verification
          platform for legal, business, and institutional workflows.
        </p>
        <p className="onboarding-footer-product">
          A product of UpUp Technologies
        </p>
        <p className="onboarding-footer-copyright">
          © 2026 UpUp Technologies. LAGDA and the LAGDA shield mark are
          trademarks of UpUp Technologies.
        </p>
        <div className="onboarding-footer-links">
          {[
            { label: "Privacy Policy", to: "/legal/privacy" },
            { label: "Terms", to: "/legal/terms" },
            { label: "Help Center", to: "/help" },
          ].map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              style={{
                color: "#64748B",
                ...GF,
                fontSize: 11,
                textDecoration: "none",
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </footer>

      <style>{`
        .ob-signout-btn:hover { color: #0078D4 !important; background: #EAF6FF !important; }
        .onboarding-brand { display: flex; align-items: center; flex-shrink: 0; }
        .onboarding-brand img { display: block; width: 200px; height: 58px; object-fit: cover; object-position: left center; }
        .ob-header-email { max-width: 34ch; }
        .ob-step-link:hover { border-color: #76BDF2 !important; }
        .ob-step-link:focus-visible { outline: 3px solid #9CCBF2; outline-offset: 2px; }

        @media (max-width: 640px) {
          .onboarding-brand img { width: 118px; height: 34px; }
          .ob-header-email { max-width: 22ch; font-size: 11px; }
        }
        @media (max-width: 480px) {
          .ob-signout-label { display: none; }
          .ob-header-email  { max-width: 16ch; }
        }
        .onboarding-footer-logo { display: block; width: 205px; height: 65px; object-fit: cover; margin-bottom: 3px; position: relative; top: 13px; }
        .onboarding-footer p { max-width: 680px; margin: 0; line-height: 1.55; }
        .onboarding-footer-description { color: #334155; font-size: 12px; }
        .onboarding-footer-product { color: #64748B; font-size: 11px; font-weight: 600; }
        .onboarding-footer-copyright { color: #94A3B8; font-size: 10px; }
        .onboarding-footer-links { display: flex; justify-content: center; flex-wrap: wrap; gap: 20px; margin-top: 6px; }
        .onboarding-footer-links a { color: #64748B; font-size: 11px; text-decoration: none; }
        .onboarding-footer-links a:hover { color: #0078D4; }
        #onboarding-main:focus { outline: none; }
        @media (max-width: 480px) {
          .onboarding-brand img { width: 155px; height: 48px; }
          .onboarding-footer { padding: 24px 16px 16px !important; }
          .onboarding-footer-logo { width: 189px; height: 60px; top: 17px; }
          .onboarding-footer-links { gap: 12px 18px; }
        }
        @media (prefers-reduced-motion: reduce) {
          #onboarding-main, .ob-progress-fill { transition: none !important; }
        }
      `}</style>
    </div>
  );
}

// ── Shared onboarding action footer ──────────────────────────────────────────

interface OnboardingActionsProps {
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  backLabel?: string;
  submitting?: boolean;
  disabled?: boolean;
  showBack?: boolean;
}

export function OnboardingActions({
  onBack,
  onContinue,
  continueLabel = "Continue",
  backLabel = "Back",
  submitting = false,
  disabled = false,
  showBack = true,
}: OnboardingActionsProps) {
  const { width } = useViewport();
  const isNarrow = width <= NARROW_MAX;

  const continueButton = onContinue && (
    <ActionButton
      onClick={onContinue}
      disabled={disabled || submitting}
      full={isNarrow || !showBack}
    >
      {submitting ? "Saving…" : continueLabel}
    </ActionButton>
  );
  const backButton = showBack && onBack && (
    <ActionButton kind="secondary" onClick={onBack} disabled={submitting} full={isNarrow}>
      {backLabel}
    </ActionButton>
  );

  // Primary FIRST in the DOM, so a keyboard and a screen reader reach
  // Continue before Back — then visually reversed, where Back-on-the-left is
  // the convention people expect.
  if (isNarrow) {
    // Phones: pinned to the bottom of the screen, within thumb reach and
    // clear of the home indicator. OnboardingLayout pads the page so nothing
    // ends up underneath it, and lifts the info button above it.
    return (
      <div
        className="ob-actions ob-actions--bar"
        data-testid="onboarding-actions"
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: Z.sticky,
          display: "flex", flexDirection: "row-reverse", gap: 10,
          padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
          background: "#FFFFFF", borderTop: "1px solid #DBEAFE",
          boxShadow: "0 -6px 18px rgba(7,17,31,0.06)",
          boxSizing: "border-box",
        }}
      >
        {continueButton && <div style={{ flex: 2, minWidth: 0, display: "flex" }}>{continueButton}</div>}
        {backButton && <div style={{ flex: 1, minWidth: 0, display: "flex" }}>{backButton}</div>}
      </div>
    );
  }

  return (
    <div
      className="ob-actions"
      data-testid="onboarding-actions"
      style={{
        display: "flex",
        flexDirection: "row-reverse",
        gap: 10,
        marginTop: 28,
        alignItems: "stretch",
        justifyContent: showBack ? "space-between" : "flex-end",
      }}
    >
      {continueButton}
      {backButton}
    </div>
  );
}

// ── Shared onboarding card ────────────────────────────────────────────────────

interface OnboardingCardProps {
  /**
   * The step's icon. Optional only so this component cannot break a caller
   * that has not been given one yet; every onboarding step passes one.
   */
  icon?: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * The surface each onboarding step sits on: an icon banner (PhaseBanner, as
 * an h2 — the page's heading structure is the layout's) over the form.
 */
export function OnboardingCard({
  icon,
  title,
  description,
  children,
}: OnboardingCardProps) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: "clamp(20px, 5vw, 32px) clamp(16px, 4.5vw, 28px)",
        minWidth: 0,
      }}
    >
      {icon
        ? (
          <PhaseBanner
            as="h2"
            icon={icon}
            title={title}
            {...(description === undefined ? {} : { description })}
          />
        )
        : (
          <>
            <h2
              style={{
                color: T.ink,
                ...GF,
                fontSize: "clamp(18px, 4.6vw, 20px)",
                fontWeight: 800,
                margin: "0 0 6px",
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </h2>
            {description && (
              <p
                style={{
                  color: T.inkSoft,
                  ...GF,
                  fontSize: "clamp(13px, 3.4vw, 14px)",
                  margin: "0 0 24px",
                  lineHeight: 1.6,
                }}
              >
                {description}
              </p>
            )}
          </>
        )}
      {children}
    </div>
  );
}

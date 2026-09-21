// C13 — Onboarding layout shell.
// Separate from AuthLayout: shows step progress, branding, and nav chrome.
// Used by all /onboarding/* routes.

import { useEffect, useRef, type ReactNode } from "react";
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

const GF = { fontFamily: "'Geist', sans-serif" };

interface OnboardingLayoutProps {
  children: ReactNode;
  /** Override to hide the progress bar (used on /onboarding/complete) */
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
/**
 * The rail's view of the steps, derived from `ONBOARDING_STEPS` rather than
 * written out again — a second list is a second thing to forget to update.
 */

const PROGRESS_KEY_BY_STEP: Partial<Record<OnboardingStepId, keyof OnboardingProgress>> = {
  profile: "profile",
  "use-case": "useCase",
  workspace: "workspace",
  security: "security",
  notifications: "notifications",
};

export function OnboardingLayout({
  children,
  showProgress = true,
}: OnboardingLayoutProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { pendingUser, progress, reset } = useOnboarding();

  // Determine current step
  // Keeps the current card in view when the strip scrolls. A strip that
  // opens at step one while you are on step four has to be explored before
  // it can be read.
  const currentCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    currentCardRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  });

  const currentStepMeta = ONBOARDING_STEPS.find((s) =>
    pathname.startsWith(s.path),
  );
  const currentStepNumber = currentStepMeta?.stepNumber ?? 0;

  // Fallback URL: a visitor who deep-links (bookmark, typed URL, browser
  // back/forward, or a refresh that lost in-memory progress) past a step
  // they haven't actually completed lands back on the earliest step that
  // still needs attention, instead of a broken or misleadingly-empty page.
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
      }}
    >
      {/* Top bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid #DBEAFE",
          position: "sticky",
          top: 0,
          zIndex: Z.sticky,
          background: "#FFFFFF",
        }}
      >
        {/* The logo shrinks rather than holding its desktop size. It is the
            least useful thing in this header on a phone — the person is
            already inside the product and knows whose it is. */}
        <div className="onboarding-brand" aria-label="LAGDA" style={{ flexShrink: 0 }}>
          <img src={lagdaHeaderLogo} alt="LAGDA" />
        </div>

        {/* minWidth: 0 is what stops the email pushing Sign out off the
            screen. A flex item defaults to min-width:auto, so a long address
            refuses to shrink and shoves its siblings out of the row instead
            of truncating. That is why the button was unreachable on a phone. */}
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
              borderRadius: 6,
            }}
            className="ob-signout-btn"
            aria-label="Sign out"
          >
            <LogOut size={14} aria-hidden style={{ flexShrink: 0 }} />
            {/* The label drops below 480px, where the address and a labelled
                button cannot both fit. aria-label carries the meaning. */}
            <span className="ob-signout-label">Sign out</span>
          </button>
        </div>
      </header>

      {/* Progress indicator */}
      {showProgress && currentStepNumber > 0 && (
        <nav
          aria-label="Onboarding progress"
          style={{
            display: "flex", justifyContent: "center",
            padding: "16px clamp(12px, 4vw, 24px) 0",
          }}
        >
          {/* The rail marks the current step with `aria-current`, but not how
              many remain — and the count is the part that tells someone
              whether to keep going. */}
          <p style={SR_ONLY}>
            Step {currentStepNumber} of {ONBOARDING_STEPS.length}
          </p>
          {/* Cards rather than a rail of dots.
              *
              * The rail showed position and nothing else: six numbered dots
              * say "you are on the fourth of six" and leave what the fourth
              * one IS to be discovered by arriving at it. A card carries the
              * step's name, so the sequence can be read before it is walked —
              * which is the difference between knowing how much is left and
              * knowing what is left.
              *
              * The same strip on both breakpoints, scrolling when six cards
              * do not fit, with the current one centred on arrival. */}
          <ol
            className="ob-step-cards"
            style={{
              display: "flex", alignItems: "stretch", gap: 8,
              listStyle: "none", margin: 0, padding: "0 0 4px",
              overflowX: "auto", scrollbarWidth: "none", width: "100%",
            }}
          >
            {ONBOARDING_STEPS.map(step => {
              const isCurrent = step.id === currentStepMeta?.id;
              const isDone = currentStepMeta !== undefined
                && step.stepNumber < currentStepMeta.stepNumber;
              return (
                <li key={step.id} style={{ flexShrink: 0 }}>
                  <div
                    ref={isCurrent ? currentCardRef : undefined}
                    aria-current={isCurrent ? "step" : undefined}
                    style={{
                      ...GF, display: "flex", alignItems: "center", gap: 8,
                      minWidth: 132, padding: "9px 12px", borderRadius: 10,
                      border: isCurrent ? "1.5px solid #0078D4" : "1px solid #E3E8EF",
                      background: isCurrent ? "#EBF4FC" : "#FFFFFF",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700,
                        background: isDone || isCurrent ? "#0078D4" : "#EEF2F6",
                        color: isDone || isCurrent ? "#FFFFFF" : "#8A9BAE",
                      }}
                    >
                      {isDone ? "✓" : step.stepNumber}
                    </span>
                    <span style={{
                      fontSize: 12.5,
                      fontWeight: isCurrent ? 700 : 600,
                      color: isCurrent ? "#0078D4" : isDone ? "#07111F" : "#8A9BAE",
                      whiteSpace: "nowrap",
                    }}>
                      {step.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {/* Content */}
      <main
        id="onboarding-main"
        tabIndex={-1}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "32px 16px 48px",
          outline: "none",
        }}
      >
        <div style={{ width: "100%", maxWidth: 520 }}>{children}</div>
      </main>

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

        /* Below 640px the header has room for a mark, an address and a
           button — but not a 200px wordmark and a labelled button. The logo
           halves and the button keeps its icon only. */
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
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
        #onboarding-main:focus { outline: none; }
        @media (max-width: 480px) {
          .onboarding-brand img { width: 155px; height: 48px; }
          .onboarding-footer { padding: 24px 16px 16px !important; }
          .onboarding-footer-logo { width: 189px; height: 60px; top: 17px; }
          .onboarding-footer-links { gap: 12px 18px; }
          nav[aria-label="Onboarding progress"] { gap: 0; padding: 16px 12px 0; }
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
  const { isCompact } = useViewport();

  // Primary FIRST in the DOM, so a keyboard and a screen reader reach
  // Continue before Back — then visually reversed on a wide screen, where
  // Back-on-the-left is the convention people expect. On a phone the row
  // stacks and Continue stays on top, which is also where a thumb is.
  return (
    <div
      style={{
        display: "flex",
        flexDirection: isCompact ? "column" : "row-reverse",
        gap: 10,
        marginTop: 28,
        alignItems: "stretch",
        justifyContent: showBack ? "space-between" : "flex-end",
      }}
    >
      {onContinue && (
        <ActionButton
          onClick={onContinue}
          disabled={disabled || submitting}
          full={isCompact || !showBack}
        >
          {submitting ? "Saving…" : continueLabel}
        </ActionButton>
      )}
      {showBack && onBack && (
        <ActionButton
          kind="secondary"
          onClick={onBack}
          disabled={submitting}
          full={isCompact}
        >
          {backLabel}
        </ActionButton>
      )}
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
 * The surface each onboarding step sits on.
 *
 * The title used to be a bare `<h1>` over a paragraph. It is a BANNER now —
 * icon, wash, and the description inside it — for the same reason the signer
 * screens are: someone three steps into a wizard reads the shape of a screen
 * before they read its sentence, and an icon plus a tone says "this is the
 * security step" faster than the word "Security" does.
 *
 * `PhaseBanner` renders an `h2` here rather than its default `h1`: the page
 * already has a heading structure, and two `h1`s on one screen is a real
 * accessibility defect rather than a stylistic preference.
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
        // Fluid: 28px of side padding at 320px leaves under 260px of usable
        // width, which is what made the workspace step's inputs feel boxed in.
        padding: "clamp(20px, 5vw, 32px) clamp(16px, 4.5vw, 28px)",
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

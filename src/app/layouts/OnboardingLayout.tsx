// C13 — Onboarding layout shell.
// Separate from AuthLayout: shows step progress, branding, and nav chrome.
// Used by all /onboarding/* routes.

import { useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { LogOut } from "lucide-react";
import { ONBOARDING_STEPS, type OnboardingProgress, type OnboardingStepId } from "../models/auth";
import { useOnboarding } from "../context/OnboardingContext";
import { usePlatform } from "../context/PlatformContext";
import { Z } from "../utils/z-index";
import { TabStrip } from "../components/platform/TabStrip";
import lagdaHeaderLogo from "../../brand elements/svg/LagdaLogoPrimaryHorizontalFullColor_Header.svg";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

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

function StepDot({
  step,
  isCurrent,
  isDone,
}: {
  step: number;
  isCurrent: boolean;
  isDone: boolean;
  label: string;
}) {
  const bg = isDone ? "#0078D4" : isCurrent ? "#07111F" : "#EAF6FF";
  const border = isDone ? "#0078D4" : isCurrent ? "#0078D4" : "#BAE0FA";
  const color = isDone ? "white" : isCurrent ? "white" : "#64748B";

  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: bg,
        border: `2px solid ${border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color,
        fontFamily: "'Geist Mono', monospace",
        fontSize: 11,
        fontWeight: 700,
        flexShrink: 0,
        transition: "background 0.2s, border-color 0.2s",
      }}
      aria-hidden
    >
      {isDone ? "✓" : step}
    </div>
  );
}

// Fallback-URL guard: which progress flag must be true before a step is
// reachable. "review" has no flag of its own — it requires every step
// before it. Maps 1:1 with ONBOARDING_STEPS order in models/auth.ts.
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
  const { signOut: platformSignOut } = usePlatform();

  // Determine current step
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
      navigate(blocking.path, { replace: true });
    }
  }, [currentStepMeta, progress, navigate]);

  function handleSignOut() {
    reset();
    platformSignOut();
    navigate("/sign-in", { replace: true });
  }

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
        <div className="onboarding-brand" aria-label="LAGDA">
          <img src={lagdaHeaderLogo} alt="LAGDA" />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {pendingUser && (
            <span style={{ color: "#64748B", ...GF, fontSize: 12 }}>
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
            <LogOut size={14} aria-hidden />
            Sign out
          </button>
        </div>
      </header>

      {/* Progress indicator */}
      {showProgress && currentStepNumber > 0 && (
        <nav aria-label="Onboarding progress">
          {/* The dots are aria-hidden and each label carries aria-current, so a
              screen reader hears WHICH step is current but not how many remain.
              The count is the part that tells someone whether to keep going. */}
          <p style={SR_ONLY}>
            Step {currentStepNumber} of {ONBOARDING_STEPS.length}
          </p>
          <TabStrip
            as="scroller"
            className="onboarding-progress-strip"
            label="Onboarding progress"
            activeKey={pathname}
            style={{ justifyContent: "center", padding: "20px 24px 0" }}
          >
            {ONBOARDING_STEPS.map((step, i) => {
              const isDone = step.stepNumber < currentStepNumber;
              const isCurrent = step.stepNumber === currentStepNumber;
              return (
                <div
                  key={step.id}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  {i > 0 && (
                    <div
                      style={{
                        width: 32,
                        height: 2,
                        background:
                          isDone || isCurrent
                            ? "rgba(0,120,212,0.4)"
                            : "#DBEAFE",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <StepDot
                      step={step.stepNumber}
                      isCurrent={isCurrent}
                      isDone={isDone}
                      label={step.label}
                    />
                    <span
                      style={{
                        color: isCurrent
                          ? "#07111F"
                          : isDone
                            ? "#64748B"
                            : "#94A3B8",
                        ...GF,
                        fontSize: 10,
                        fontWeight: isCurrent ? 700 : 500,
                        whiteSpace: "nowrap",
                      }}
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </TabStrip>
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
          .onboarding-progress-strip { display: grid !important; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0 !important; overflow: visible; padding: 12px 4px 0 !important; mask-image: none; -webkit-mask-image: none; }
          .onboarding-progress-strip > div { min-width: 0 !important; flex-shrink: 1 !important; justify-content: center; }
          .onboarding-progress-strip > div > div:first-child { display: none; }
          .onboarding-progress-strip > div > div:last-child { min-width: 0; width: 100%; }
          .onboarding-progress-strip > div > div:last-child > span { max-width: 100%; white-space: normal !important; overflow-wrap: anywhere; font-size: 8px !important; line-height: 1.15; text-align: center; }
          .onboarding-progress-strip > div > div:last-child > div { width: 24px; height: 24px; font-size: 9px; }
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
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        marginTop: 28,
        alignItems: "center",
        justifyContent: showBack ? "space-between" : "flex-end",
      }}
    >
      {showBack && onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "#FFFFFF",
            border: "1px solid #CBD5E1",
            borderRadius: 8,
            color: "#475569",
            ...GF,
            fontSize: 14,
            fontWeight: 600,
            padding: "11px 20px",
            cursor: "pointer",
            minHeight: 44,
          }}
          className="ob-back-btn"
          disabled={submitting}
        >
          {backLabel}
        </button>
      )}
      {onContinue && (
        <button
          type="button"
          onClick={onContinue}
          disabled={disabled || submitting}
          aria-busy={submitting}
          style={{
            background:
              disabled || submitting ? "rgba(0,120,212,0.4)" : "#0078D4",
            border: "none",
            borderRadius: 8,
            color: "white",
            ...GF,
            fontSize: 14,
            fontWeight: 700,
            padding: "11px 24px",
            cursor: disabled || submitting ? "not-allowed" : "pointer",
            minHeight: 44,
            flex: showBack ? undefined : 1,
            transition: "background 0.15s",
          }}
          className="ob-continue-btn"
        >
          {submitting ? "Saving…" : continueLabel}
        </button>
      )}
      <style>{`
        .ob-back-btn:hover:not(:disabled) { border-color: #94A3B8 !important; color: #07111F !important; background: #F8FBFF !important; }
        .ob-back-btn:active:not(:disabled) { background: #EAF6FF !important; transform: translateY(1px); }
        .ob-continue-btn:hover:not(:disabled) { background: #006BBE !important; box-shadow: 0 5px 12px rgba(0,120,212,0.22); transform: translateY(-1px); }
        .ob-continue-btn:active:not(:disabled) { background: #005BA9 !important; transform: translateY(1px); box-shadow: none; }
      `}</style>
    </div>
  );
}

// ── Shared onboarding card ────────────────────────────────────────────────────

interface OnboardingCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function OnboardingCard({
  title,
  description,
  children,
}: OnboardingCardProps) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #DBEAFE",
        borderRadius: 16,
        padding: "32px 28px",
      }}
    >
      <h1
        style={{
          color: "#07111F",
          ...GF,
          fontSize: 20,
          fontWeight: 800,
          margin: "0 0 6px",
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h1>
      {description && (
        <p
          style={{
            color: "#475569",
            ...GF,
            fontSize: 14,
            margin: "0 0 24px",
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

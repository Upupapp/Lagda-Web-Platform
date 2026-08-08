// C13 — Onboarding layout shell.
// Separate from AuthLayout: shows step progress, branding, and nav chrome.
// Used by all /onboarding/* routes.

import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { LogOut } from "lucide-react";
import { LagdaLogo } from "../components/brand/LagdaLogo";
import { ONBOARDING_STEPS } from "../models/auth";
import { useOnboarding } from "../context/OnboardingContext";
import { usePlatform } from "../context/PlatformContext";
import { Z } from "../utils/z-index";
import { TabStrip } from "../components/platform/TabStrip";

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
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
  overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0,
};

function StepDot({ step, isCurrent, isDone }: { step: number; isCurrent: boolean; isDone: boolean; label: string }) {
  const bg = isDone ? "#0078D4" : isCurrent ? "#07111F" : "rgba(255,255,255,0.06)";
  const border = isDone ? "#0078D4" : isCurrent ? "#0078D4" : "rgba(255,255,255,0.15)";
  const color = isDone ? "white" : isCurrent ? "white" : "#475569";

  return (
    <div style={{
      width: 28, height: 28, borderRadius: "50%",
      background: bg, border: `2px solid ${border}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color, fontFamily: "'Geist Mono', monospace", fontSize: 11, fontWeight: 700,
      flexShrink: 0,
      transition: "background 0.2s, border-color 0.2s",
    }} aria-hidden>
      {isDone ? "✓" : step}
    </div>
  );
}

export function OnboardingLayout({ children, showProgress = true }: OnboardingLayoutProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { pendingUser, reset } = useOnboarding();
  const { signOut: platformSignOut } = usePlatform();

  // Determine current step
  const currentStepMeta = ONBOARDING_STEPS.find((s) => pathname.startsWith(s.path));
  const currentStepNumber = currentStepMeta?.stepNumber ?? 0;

  function handleSignOut() {
    reset();
    platformSignOut();
    navigate("/sign-in", { replace: true });
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#07111F",
      display: "flex", flexDirection: "column",
      fontFamily: "'Geist', sans-serif",
    }}>
      {/* Top bar */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "sticky", top: 0, zIndex: Z.sticky,
        background: "#07111F",
      }}>
        <Link to="/" aria-label="LAGDA — Go to homepage" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <LagdaLogo variant="white-horizontal" size="sm" decorative />
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {pendingUser && (
            <span style={{ color: "#475569", ...GF, fontSize: 12 }}>{pendingUser.email}</span>
          )}
          <button
            onClick={handleSignOut}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none", cursor: "pointer",
              color: "#475569", ...GF, fontSize: 12, padding: "6px 10px",
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
          <TabStrip as="scroller" label="Onboarding progress" activeKey={pathname}
            style={{ justifyContent: "center", padding: "20px 24px 0" }}>
          {ONBOARDING_STEPS.map((step, i) => {
            const isDone    = step.stepNumber < currentStepNumber;
            const isCurrent = step.stepNumber === currentStepNumber;
            return (
              <div key={step.id} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && (
                  <div style={{
                    width: 32, height: 2,
                    background: isDone || isCurrent ? "rgba(0,120,212,0.4)" : "rgba(255,255,255,0.08)",
                    flexShrink: 0,
                  }} />
                )}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <StepDot step={step.stepNumber} isCurrent={isCurrent} isDone={isDone} label={step.label} />
                  <span style={{
                    color: isCurrent ? "white" : isDone ? "#64748B" : "#334155",
                    ...GF, fontSize: 10, fontWeight: isCurrent ? 700 : 500,
                    whiteSpace: "nowrap",
                  }} aria-current={isCurrent ? "step" : undefined}>
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
      <main id="onboarding-main" tabIndex={-1} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 16px 48px", outline: "none" }}>
        <div style={{ width: "100%", maxWidth: 520 }}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "16px 24px", display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
        {[
          { label: "Privacy Policy", to: "/legal/privacy" },
          { label: "Terms", to: "/legal/terms" },
          { label: "Help Center", to: "/help" },
        ].map(({ label, to }) => (
          <Link key={to} to={to} style={{ color: "#334155", ...GF, fontSize: 11, textDecoration: "none" }}>{label}</Link>
        ))}
      </footer>

      <style>{`
        .ob-signout-btn:hover { color: #64748B !important; background: rgba(255,255,255,0.04) !important; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
        #onboarding-main:focus { outline: none; }
        @media (max-width: 480px) {
          nav[aria-label="Onboarding progress"] { gap: 0; padding: 16px 12px 0; }
        }
      `}</style>
    </div>
  );
}

// ── Shared onboarding action footer ──────────────────────────────────────────

interface OnboardingActionsProps {
  onBack?:      () => void;
  onContinue?:  () => void;
  continueLabel?: string;
  backLabel?:    string;
  submitting?:   boolean;
  disabled?:     boolean;
  showBack?:     boolean;
}

export function OnboardingActions({
  onBack, onContinue, continueLabel = "Continue",
  backLabel = "Back", submitting = false, disabled = false, showBack = true,
}: OnboardingActionsProps) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 28, alignItems: "center", justifyContent: showBack ? "space-between" : "flex-end" }}>
      {showBack && onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "none", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8, color: "#64748B", ...GF, fontSize: 14, fontWeight: 600,
            padding: "11px 20px", cursor: "pointer", minHeight: 44,
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
            background: disabled || submitting ? "rgba(0,120,212,0.4)" : "#0078D4",
            border: "none", borderRadius: 8, color: "white",
            ...GF, fontSize: 14, fontWeight: 700,
            padding: "11px 24px", cursor: disabled || submitting ? "not-allowed" : "pointer",
            minHeight: 44, flex: showBack ? undefined : 1,
            transition: "background 0.15s",
          }}
          className="ob-continue-btn"
        >
          {submitting ? "Saving…" : continueLabel}
        </button>
      )}
      <style>{`
        .ob-back-btn:hover:not(:disabled) { border-color: rgba(255,255,255,0.25) !important; color: white !important; }
        .ob-continue-btn:hover:not(:disabled) { background: #006BBE !important; }
      `}</style>
    </div>
  );
}

// ── Shared onboarding card ────────────────────────────────────────────────────

interface OnboardingCardProps {
  title:       string;
  description?: string;
  children:    ReactNode;
}

export function OnboardingCard({ title, description, children }: OnboardingCardProps) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 16, padding: "32px 28px",
    }}>
      <h1 style={{ color: "white", ...GF, fontSize: 20, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
        {title}
      </h1>
      {description && (
        <p style={{ color: "#64748B", ...GF, fontSize: 14, margin: "0 0 24px", lineHeight: 1.6 }}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

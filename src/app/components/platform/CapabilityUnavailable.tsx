// CapabilityUnavailable — C35
// Safe unavailable state for gated or restricted capabilities.
// Shown instead of the actual page when a capability is not available
// in the current launch profile, permission set, or feature configuration.
//
// Requirements:
//  - Provides one H1
//  - Offers safe navigation to the fallback route
//  - Does NOT expose restricted data, counts, or capability IDs
//  - Does NOT advertise Enterprise Preview features to default-profile users
//  - Does NOT use the eNotary disclaimer for unrelated eSignature features
//  - Remains non-indexable (enforced by router metadata and PlatformLayout)

import { Link } from "react-router";
import type { CapabilityResolutionOutcome } from "../../models/product-capability";
// Imported from the modules directly, NOT from "./index". The barrel re-exports
// CommandPalette, which reaches the global search service and every fixture it
// indexes — and this component is imported statically by router.tsx, so going
// through the barrel put all of that in the entry chunk for every visitor. It
// was also a cycle: the barrel imports this file.
import { PageHeader } from "./PageHeader";
import { AppContent } from "./AppContentLayout";

const NAVY  = "#07111F";
const SLATE6 = "#64748B";
const SLATE4 = "#94A3B8";
const SLATE2 = "#E2E8F0";
const AZURE  = "#0078D4";
const GF     = { fontFamily: "'Geist', 'Inter', system-ui, sans-serif" };

interface CapabilityUnavailableProps {
  /** The resolution outcome that caused gating */
  outcome:           CapabilityResolutionOutcome;
  /** Human-readable reason shown to the user */
  reasonLabel:       string;
  /** Safe route to navigate to */
  safeFallbackRoute: string;
  /** Optional custom title */
  title?:            string;
  /** Optional custom description */
  description?:      string;
}

const OUTCOME_ICONS: Partial<Record<CapabilityResolutionOutcome, string>> = {
  "unavailable-profile":    "🔒",
  "unavailable-permission": "🚫",
  "unavailable-feature":    "⚙️",
  "unavailable-plan":       "📋",
  "development-only":       "🛠️",
  "future-product":         "🔮",
  "deferred":               "📅",
};

const OUTCOME_TITLES: Partial<Record<CapabilityResolutionOutcome, string>> = {
  "unavailable-profile":    "Not Available in Current Profile",
  "unavailable-permission": "Permission Required",
  "unavailable-feature":    "Feature Not Enabled",
  "unavailable-plan":       "Plan Upgrade Required",
  "development-only":       "Development Only",
  "future-product":         "Coming Soon",
  "deferred":               "Not Yet Available",
};

const OUTCOME_FALLBACK_LABELS: Partial<Record<CapabilityResolutionOutcome, string>> = {
  "unavailable-profile":    "Return to Dashboard",
  "unavailable-permission": "Return to Dashboard",
  "unavailable-feature":    "Return to Dashboard",
  "unavailable-plan":       "View Billing",
  "development-only":       "Return to Dashboard",
  "future-product":         "Return to Home",
  "deferred":               "Return to Dashboard",
};

const OUTCOME_FALLBACK_ROUTES: Partial<Record<CapabilityResolutionOutcome, string>> = {
  "unavailable-plan":  "/app/settings/billing",
  "future-product":    "/enotary",
};

export function CapabilityUnavailable({
  outcome,
  reasonLabel,
  safeFallbackRoute,
  title,
  description,
}: CapabilityUnavailableProps) {
  const icon         = OUTCOME_ICONS[outcome]         ?? "🔒";
  const defaultTitle = OUTCOME_TITLES[outcome]        ?? "Not Available";
  const fallbackLbl  = OUTCOME_FALLBACK_LABELS[outcome] ?? "Return to Dashboard";
  const fallbackRoute = OUTCOME_FALLBACK_ROUTES[outcome] ?? safeFallbackRoute;

  const heading = title ?? defaultTitle;
  const body    = description ?? reasonLabel;

  return (
    <>
      <PageHeader title={heading} />
      <AppContent>
        <div
          role="main"
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "80px 24px", textAlign: "center",
            maxWidth: 480, margin: "0 auto",
          }}
        >
          <div
            aria-hidden
            style={{
              fontSize: 48, marginBottom: 20, lineHeight: 1,
              filter: "grayscale(0.2)",
            }}
          >
            {icon}
          </div>

          <h1
            style={{
              ...GF, fontSize: 22, fontWeight: 700, color: NAVY,
              margin: "0 0 12px",
            }}
          >
            {heading}
          </h1>

          {body && (
            <p style={{ ...GF, fontSize: 14, color: SLATE6, lineHeight: 1.6, margin: "0 0 28px" }}>
              {body}
            </p>
          )}

          <Link
            to={fallbackRoute}
            style={{
              ...GF, fontSize: 14, fontWeight: 600, color: "#fff",
              background: AZURE, borderRadius: 8, padding: "10px 20px",
              textDecoration: "none", display: "inline-block",
            }}
          >
            {fallbackLbl}
          </Link>

          {outcome === "unavailable-profile" && (
            <p style={{ ...GF, fontSize: 11, color: SLATE4, margin: "20px 0 0", lineHeight: 1.5 }}>
              This capability is not included in the current product profile.
            </p>
          )}

          {outcome === "future-product" && (
            <p
              style={{
                ...GF, fontSize: 12, color: SLATE6, margin: "20px 0 0",
                padding: "12px 16px", background: "#FFF5F9",
                border: `1px solid ${SLATE2}`, borderRadius: 8, lineHeight: 1.6,
              }}
            >
              LAGDA eNotary is Coming Soon — Subject to Supreme Court Accreditation
              and applicable rules.
            </p>
          )}
        </div>
      </AppContent>
    </>
  );
}

// ── CapabilityGuard ───────────────────────────────────────────────────────────
// Wrap a route element. Resolves the capability and either renders children
// or shows CapabilityUnavailable. Children are never imported in the guard
// (lazy imports ensure Enterprise Preview modules aren't pulled into the
// default bundle unless the capability is actually rendered).

import { type ReactNode } from "react";
import { useCapability } from "../../context/PlatformContext";

interface CapabilityGuardProps {
  capabilityId: string;
  children:     ReactNode;
}

export function CapabilityGuard({ capabilityId, children }: CapabilityGuardProps) {
  const resolution = useCapability(capabilityId);

  if (!resolution.available) {
    return (
      <CapabilityUnavailable
        outcome={resolution.outcome}
        reasonLabel={resolution.reasonLabel}
        safeFallbackRoute={resolution.safeFallbackRoute}
      />
    );
  }

  return <>{children}</>;
}

import { createBrowserRouter } from "react-router";
import App from "./app/App";
import { PublicLayout } from "./app/layouts/PublicLayout";
import { AuthLayout } from "./app/layouts/AuthLayout";
import { PlatformLayout } from "./app/layouts/PlatformLayout";
import { NotFound } from "./app/pages/public/NotFound";
import { DevPlaceholder } from "./app/pages/shared/DevPlaceholder";
import { PlatformIndex } from "./app/pages/platform/PlatformIndex";
import { SignIn } from "./app/pages/auth/SignIn";
import { DesignSystemShowcase } from "./app/pages/dev/DesignSystemShowcase";
import { Home } from "./app/pages/public/Home";
import { EsigOverview } from "./app/pages/public/esignature/EsigOverview";
import { EsigCoreWorkflow } from "./app/pages/public/esignature/EsigCoreWorkflow";
import { EsigVerificationAudit } from "./app/pages/public/esignature/EsigVerificationAudit";
import { EsigAdvancedCapabilities } from "./app/pages/public/esignature/EsigAdvancedCapabilities";
import { EsigTemplatesBranding } from "./app/pages/public/esignature/EsigTemplatesBranding";
import { EsigTeamEnterprise } from "./app/pages/public/esignature/EsigTeamEnterprise";

// ── Features pages (Command 7) ─────────────────────────────────────────────────
import { FeaturesOverview } from "./app/pages/public/features/FeaturesOverview";
import { DocPrep } from "./app/pages/public/features/DocPrep";
import { ParticipantRoles } from "./app/pages/public/features/ParticipantRoles";
import { ParallelSigning } from "./app/pages/public/features/ParallelSigning";
import { SequentialSigning } from "./app/pages/public/features/SequentialSigning";
import { SignerAuth } from "./app/pages/public/features/SignerAuth";
import { IdentityAwareSigning } from "./app/pages/public/features/IdentityAwareSigning";
import { AuditTrail } from "./app/pages/public/features/AuditTrail";
import { DocVerification } from "./app/pages/public/features/DocVerification";
import { Templates } from "./app/pages/public/features/Templates";
import { Contacts } from "./app/pages/public/features/Contacts";
import { CompanyBranding } from "./app/pages/public/features/CompanyBranding";
import { Notifications } from "./app/pages/public/features/Notifications";
import { TeamWorkspaces } from "./app/pages/public/features/TeamWorkspaces";
import { StoragePlanLimits } from "./app/pages/public/features/StoragePlanLimits";
import { ApiIntegrations } from "./app/pages/public/features/ApiIntegrations";

// ── Solutions pages (Command 8) ────────────────────────────────────────────────
import { SolutionsOverview } from "./app/pages/public/solutions/SolutionsOverview";
import { Lawyers } from "./app/pages/public/solutions/Lawyers";
import { LawFirms } from "./app/pages/public/solutions/LawFirms";
import { BusinessTeams } from "./app/pages/public/solutions/BusinessTeams";
import { GovernmentLGU } from "./app/pages/public/solutions/GovernmentLGU";
import { RealEstate } from "./app/pages/public/solutions/RealEstate";
import { HRRecruitment } from "./app/pages/public/solutions/HRRecruitment";
import { Finance } from "./app/pages/public/solutions/Finance";
import { Procurement } from "./app/pages/public/solutions/Procurement";
import { Education } from "./app/pages/public/solutions/Education";
import { HealthcareWellness } from "./app/pages/public/solutions/HealthcareWellness";

// ── Security pages (Command 7) ─────────────────────────────────────────────────
import { SecurityOverview } from "./app/pages/public/security/SecurityOverview";
import { TrustCenter } from "./app/pages/public/security/TrustCenter";
import { AccountSecurity } from "./app/pages/public/security/AccountSecurity";
import { SecuritySignerAuth } from "./app/pages/public/security/SecuritySignerAuth";
import { IdentityVerification } from "./app/pages/public/security/IdentityVerification";
import { SecurityAuditTrail } from "./app/pages/public/security/SecurityAuditTrail";
import { SecurityDocVerification } from "./app/pages/public/security/SecurityDocVerification";
import { DeviceLocationEvidence } from "./app/pages/public/security/DeviceLocationEvidence";
import { SecureStorage } from "./app/pages/public/security/SecureStorage";
import { PrivacyDataProtection } from "./app/pages/public/security/PrivacyDataProtection";

// ── Router definition ─────────────────────────────────────────────────────────
//
// Route order matters: more-specific paths (auth, platform) are defined first
// so they take precedence over the public-portal catch-all.
//
// Layout boundaries:
//   /sign-in, /create-account, ...  → AuthLayout   (no marketing nav)
//   /app/*                          → PlatformLayout (authenticated shell)
//   / *                             → PublicLayout  (existing App.tsx portal)

export const router = createBrowserRouter([
  // ── Auth routes ─────────────────────────────────────────────────────────────
  {
    path: "/sign-in",
    element: (
      <AuthLayout>
        <SignIn />
      </AuthLayout>
    ),
  },
  {
    path: "/create-account",
    element: (
      <AuthLayout>
        <DevPlaceholder
          title="Create Your LAGDA Account"
          subtitle="Account registration coming soon."
        />
      </AuthLayout>
    ),
  },
  {
    path: "/verify-email",
    element: (
      <AuthLayout>
        <DevPlaceholder
          title="Verify Your Email"
          subtitle="Email verification flow coming soon."
        />
      </AuthLayout>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <AuthLayout>
        <DevPlaceholder
          title="Forgot Password"
          subtitle="Password reset coming soon."
        />
      </AuthLayout>
    ),
  },
  {
    path: "/reset-password",
    element: (
      <AuthLayout>
        <DevPlaceholder
          title="Reset Password"
          subtitle="Password reset coming soon."
        />
      </AuthLayout>
    ),
  },
  {
    path: "/mfa",
    element: (
      <AuthLayout>
        <DevPlaceholder
          title="Two-Factor Authentication"
          subtitle="MFA verification coming soon."
        />
      </AuthLayout>
    ),
  },
  {
    path: "/invitation",
    element: (
      <AuthLayout>
        <DevPlaceholder
          title="Accept Invitation"
          subtitle="Team invitation flow coming soon."
        />
      </AuthLayout>
    ),
  },
  {
    path: "/onboarding",
    element: (
      <AuthLayout>
        <DevPlaceholder
          title="Welcome to LAGDA"
          subtitle="Onboarding flow coming soon."
        />
      </AuthLayout>
    ),
  },

  // ── Platform (authenticated customer) routes ─────────────────────────────────
  {
    path: "/app",
    element: <PlatformLayout />,
    children: [
      { index: true, element: <PlatformIndex /> },
      {
        path: "*",
        element: (
          <DevPlaceholder
            title="Platform Page"
            subtitle="This platform screen will be built in a later command."
            showBack
          />
        ),
      },
    ],
  },

  // ── Public portal ────────────────────────────────────────────────────────────
  // App.tsx manages all public portal sub-navigation internally via URL sync.
  // Existing Figma-imported screens are rendered through the App state machine.
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      // Root → Home page
      { index: true, element: <Home /> },

      // ── eSignature product pages (Command 6 — production React pages) ────────
      { path: "esignature", element: <EsigOverview /> },
      { path: "esignature/core-workflow", element: <EsigCoreWorkflow /> },
      { path: "esignature/verification-and-audit", element: <EsigVerificationAudit /> },
      { path: "esignature/advanced-capabilities", element: <EsigAdvancedCapabilities /> },
      { path: "esignature/templates-and-branding", element: <EsigTemplatesBranding /> },
      { path: "esignature/team-and-enterprise", element: <EsigTeamEnterprise /> },
      // ── Security pages (Command 7 — production React pages) ──────────────────
      { path: "security",                              element: <SecurityOverview /> },
      { path: "security/trust-center",                element: <TrustCenter /> },
      { path: "security/account-security",            element: <AccountSecurity /> },
      { path: "security/signer-authentication",       element: <SecuritySignerAuth /> },
      { path: "security/identity-verification",       element: <IdentityVerification /> },
      { path: "security/audit-trail",                 element: <SecurityAuditTrail /> },
      { path: "security/document-verification",       element: <SecurityDocVerification /> },
      { path: "security/device-and-location-evidence", element: <DeviceLocationEvidence /> },
      { path: "security/secure-storage",              element: <SecureStorage /> },
      { path: "security/privacy-and-data-protection", element: <PrivacyDataProtection /> },

      // ── Solutions pages (Command 8 — production React pages) ─────────────────
      { path: "solutions",                              element: <SolutionsOverview /> },
      { path: "solutions/lawyers",                      element: <Lawyers /> },
      { path: "solutions/law-firms",                    element: <LawFirms /> },
      { path: "solutions/business-teams",               element: <BusinessTeams /> },
      { path: "solutions/government-and-lgu",           element: <GovernmentLGU /> },
      { path: "solutions/real-estate",                  element: <RealEstate /> },
      { path: "solutions/hr-and-recruitment",           element: <HRRecruitment /> },
      { path: "solutions/finance",                      element: <Finance /> },
      { path: "solutions/procurement",                  element: <Procurement /> },
      { path: "solutions/education",                    element: <Education /> },
      { path: "solutions/healthcare-and-wellness",      element: <HealthcareWellness /> },
      { path: "pricing/*", element: <App /> },
      { path: "resources/*", element: <App /> },

      // ── eNotary — Coming Soon (all subroutes) ────────────────────────────────
      // Legal constraint: must never imply eNotary is live, accredited, or purchasable
      {
        path: "enotary",
        element: (
          <DevPlaceholder
            title="LAGDA eNotary"
            subtitle="Electronic notarization services are in development. Register your interest below."
            isEnotary
          />
        ),
      },
      {
        path: "enotary/*",
        element: (
          <DevPlaceholder
            title="LAGDA eNotary"
            subtitle="This section will be available once LAGDA eNotary reaches its development milestone."
            isEnotary
          />
        ),
      },

      // ── Document Verification (public) ───────────────────────────────────────
      {
        path: "verify",
        element: (
          <DevPlaceholder
            title="Verify a Document"
            subtitle="Enter a Verification ID or scan a QR code to verify a LAGDA-signed document."
          />
        ),
      },
      {
        path: "verify/*",
        element: (
          <DevPlaceholder
            title="Document Verification"
            subtitle="Public document verification coming soon."
          />
        ),
      },

      // ── Features pages (Command 7 — production React pages) ─────────────────
      { path: "features",                           element: <FeaturesOverview /> },
      { path: "features/document-preparation",      element: <DocPrep /> },
      { path: "features/participant-roles",         element: <ParticipantRoles /> },
      { path: "features/parallel-signing",          element: <ParallelSigning /> },
      { path: "features/sequential-signing",        element: <SequentialSigning /> },
      { path: "features/signer-authentication",     element: <SignerAuth /> },
      { path: "features/identity-aware-signing",    element: <IdentityAwareSigning /> },
      { path: "features/audit-trail",               element: <AuditTrail /> },
      { path: "features/document-verification",     element: <DocVerification /> },
      { path: "features/templates",                 element: <Templates /> },
      { path: "features/contacts",                  element: <Contacts /> },
      { path: "features/company-branding",          element: <CompanyBranding /> },
      { path: "features/notifications",             element: <Notifications /> },
      { path: "features/team-workspaces",           element: <TeamWorkspaces /> },
      { path: "features/storage-and-plan-limits",   element: <StoragePlanLimits /> },
      { path: "features/api-and-integrations",      element: <ApiIntegrations /> },

      // ── Help and Contact ──────────────────────────────────────────────────────
      {
        path: "help",
        element: (
          <DevPlaceholder
            title="Help Center"
            subtitle="Product documentation and support coming soon."
          />
        ),
      },
      {
        path: "contact",
        element: (
          <DevPlaceholder
            title="Contact LAGDA"
            subtitle="Contact page coming soon."
          />
        ),
      },
      {
        path: "service-status",
        element: (
          <DevPlaceholder
            title="Service Status"
            subtitle="Real-time service status coming soon."
          />
        ),
      },

      // ── Legal pages ───────────────────────────────────────────────────────────
      {
        path: "legal/privacy",
        element: (
          <DevPlaceholder
            title="Privacy Policy"
            subtitle="Our privacy policy is coming soon."
          />
        ),
      },
      {
        path: "legal/terms",
        element: (
          <DevPlaceholder
            title="Terms of Service"
            subtitle="Terms of service coming soon."
          />
        ),
      },
      {
        path: "legal/accessibility",
        element: (
          <DevPlaceholder
            title="Accessibility Statement"
            subtitle="Accessibility statement coming soon."
          />
        ),
      },
      {
        path: "legal/*",
        element: (
          <DevPlaceholder
            title="Legal"
            subtitle="This legal page is coming soon."
            showBack
          />
        ),
      },

      // ── 404 ──────────────────────────────────────────────────────────────────
      { path: "*", element: <NotFound /> },
    ],
  },

  // ── Dev-only routes (not linked from public navigation) ─────────────────────
  // /dev/design-system — component showcase for design system validation
  {
    path: "/dev/design-system",
    element: <DesignSystemShowcase />,
  },
]);

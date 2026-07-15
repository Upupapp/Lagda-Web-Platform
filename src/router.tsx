import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { PublicLayout } from "./app/layouts/PublicLayout";
import { AuthLayout } from "./app/layouts/AuthLayout";
import { PlatformLayout } from "./app/layouts/PlatformLayout";
import { NotFound } from "./app/pages/public/NotFound";
import { DevPlaceholder } from "./app/pages/shared/DevPlaceholder";

// ── Lazy-loaded page families ─────────────────────────────────────────────────
// Each family shares a chunk, keeping the initial bundle small.
// PublicLayout wraps the Outlet in <Suspense> so no per-route fallback needed.
// Auth routes use an inline <AuthSuspense> wrapper below.

// Auth
const SignIn            = lazy(() => import("./app/pages/auth/SignIn").then(m => ({ default: m.SignIn })));
const CreateAccount     = lazy(() => import("./app/pages/auth/CreateAccount").then(m => ({ default: m.CreateAccount })));
const VerifyEmail       = lazy(() => import("./app/pages/auth/VerifyEmail").then(m => ({ default: m.VerifyEmail })));
const ForgotPassword    = lazy(() => import("./app/pages/auth/ForgotPassword").then(m => ({ default: m.ForgotPassword })));
const ResetPassword     = lazy(() => import("./app/pages/auth/ResetPassword").then(m => ({ default: m.ResetPassword })));
const MfaChallenge      = lazy(() => import("./app/pages/auth/MfaChallenge").then(m => ({ default: m.MfaChallenge })));
const MfaSetup          = lazy(() => import("./app/pages/auth/MfaSetup").then(m => ({ default: m.MfaSetup })));
const RecoveryCodes     = lazy(() => import("./app/pages/auth/RecoveryCodes").then(m => ({ default: m.RecoveryCodes })));
const AcceptInvitation  = lazy(() => import("./app/pages/auth/AcceptInvitation").then(m => ({ default: m.AcceptInvitation })));
const AccountLocked     = lazy(() => import("./app/pages/auth/AccountLocked").then(m => ({ default: m.AccountLocked })));
const LinkError         = lazy(() => import("./app/pages/auth/LinkError").then(m => ({ default: m.LinkError })));

// Onboarding
const OnboardingProfile       = lazy(() => import("./app/pages/onboarding/OnboardingProfile").then(m => ({ default: m.OnboardingProfile })));
const OnboardingUseCase       = lazy(() => import("./app/pages/onboarding/OnboardingUseCase").then(m => ({ default: m.OnboardingUseCase })));
const OnboardingWorkspace     = lazy(() => import("./app/pages/onboarding/OnboardingWorkspace").then(m => ({ default: m.OnboardingWorkspace })));
const OnboardingSecurity      = lazy(() => import("./app/pages/onboarding/OnboardingSecurity").then(m => ({ default: m.OnboardingSecurity })));
const OnboardingNotifications = lazy(() => import("./app/pages/onboarding/OnboardingNotifications").then(m => ({ default: m.OnboardingNotifications })));
const OnboardingReview        = lazy(() => import("./app/pages/onboarding/OnboardingReview").then(m => ({ default: m.OnboardingReview })));
const OnboardingComplete      = lazy(() => import("./app/pages/onboarding/OnboardingComplete").then(m => ({ default: m.OnboardingComplete })));

// Home
const Home = lazy(() => import("./app/pages/public/Home").then(m => ({ default: m.Home })));

// eSignature family
const EsigOverview            = lazy(() => import("./app/pages/public/esignature/EsigOverview").then(m => ({ default: m.EsigOverview })));
const EsigCoreWorkflow        = lazy(() => import("./app/pages/public/esignature/EsigCoreWorkflow").then(m => ({ default: m.EsigCoreWorkflow })));
const EsigVerificationAudit   = lazy(() => import("./app/pages/public/esignature/EsigVerificationAudit").then(m => ({ default: m.EsigVerificationAudit })));
const EsigAdvancedCapabilities= lazy(() => import("./app/pages/public/esignature/EsigAdvancedCapabilities").then(m => ({ default: m.EsigAdvancedCapabilities })));
const EsigTemplatesBranding   = lazy(() => import("./app/pages/public/esignature/EsigTemplatesBranding").then(m => ({ default: m.EsigTemplatesBranding })));
const EsigTeamEnterprise      = lazy(() => import("./app/pages/public/esignature/EsigTeamEnterprise").then(m => ({ default: m.EsigTeamEnterprise })));

// Features family
const FeaturesOverview  = lazy(() => import("./app/pages/public/features/FeaturesOverview").then(m => ({ default: m.FeaturesOverview })));
const DocPrep           = lazy(() => import("./app/pages/public/features/DocPrep").then(m => ({ default: m.DocPrep })));
const ParticipantRoles  = lazy(() => import("./app/pages/public/features/ParticipantRoles").then(m => ({ default: m.ParticipantRoles })));
const ParallelSigning   = lazy(() => import("./app/pages/public/features/ParallelSigning").then(m => ({ default: m.ParallelSigning })));
const SequentialSigning = lazy(() => import("./app/pages/public/features/SequentialSigning").then(m => ({ default: m.SequentialSigning })));
const SignerAuth        = lazy(() => import("./app/pages/public/features/SignerAuth").then(m => ({ default: m.SignerAuth })));
const IdentityAwareSigning = lazy(() => import("./app/pages/public/features/IdentityAwareSigning").then(m => ({ default: m.IdentityAwareSigning })));
const AuditTrail        = lazy(() => import("./app/pages/public/features/AuditTrail").then(m => ({ default: m.AuditTrail })));
const DocVerification   = lazy(() => import("./app/pages/public/features/DocVerification").then(m => ({ default: m.DocVerification })));
const Templates         = lazy(() => import("./app/pages/public/features/Templates").then(m => ({ default: m.Templates })));
const Contacts          = lazy(() => import("./app/pages/public/features/Contacts").then(m => ({ default: m.Contacts })));
const CompanyBranding   = lazy(() => import("./app/pages/public/features/CompanyBranding").then(m => ({ default: m.CompanyBranding })));
const Notifications     = lazy(() => import("./app/pages/public/features/Notifications").then(m => ({ default: m.Notifications })));
const TeamWorkspaces    = lazy(() => import("./app/pages/public/features/TeamWorkspaces").then(m => ({ default: m.TeamWorkspaces })));
const StoragePlanLimits = lazy(() => import("./app/pages/public/features/StoragePlanLimits").then(m => ({ default: m.StoragePlanLimits })));
const ApiIntegrations   = lazy(() => import("./app/pages/public/features/ApiIntegrations").then(m => ({ default: m.ApiIntegrations })));

// Solutions family
const SolutionsOverview = lazy(() => import("./app/pages/public/solutions/SolutionsOverview").then(m => ({ default: m.SolutionsOverview })));
const Lawyers           = lazy(() => import("./app/pages/public/solutions/Lawyers").then(m => ({ default: m.Lawyers })));
const LawFirms          = lazy(() => import("./app/pages/public/solutions/LawFirms").then(m => ({ default: m.LawFirms })));
const BusinessTeams     = lazy(() => import("./app/pages/public/solutions/BusinessTeams").then(m => ({ default: m.BusinessTeams })));
const GovernmentLGU     = lazy(() => import("./app/pages/public/solutions/GovernmentLGU").then(m => ({ default: m.GovernmentLGU })));
const RealEstate        = lazy(() => import("./app/pages/public/solutions/RealEstate").then(m => ({ default: m.RealEstate })));
const HRRecruitment     = lazy(() => import("./app/pages/public/solutions/HRRecruitment").then(m => ({ default: m.HRRecruitment })));
const Finance           = lazy(() => import("./app/pages/public/solutions/Finance").then(m => ({ default: m.Finance })));
const Procurement       = lazy(() => import("./app/pages/public/solutions/Procurement").then(m => ({ default: m.Procurement })));
const Education         = lazy(() => import("./app/pages/public/solutions/Education").then(m => ({ default: m.Education })));
const HealthcareWellness= lazy(() => import("./app/pages/public/solutions/HealthcareWellness").then(m => ({ default: m.HealthcareWellness })));

// Security family
const SecurityOverview       = lazy(() => import("./app/pages/public/security/SecurityOverview").then(m => ({ default: m.SecurityOverview })));
const TrustCenter            = lazy(() => import("./app/pages/public/security/TrustCenter").then(m => ({ default: m.TrustCenter })));
const AccountSecurity        = lazy(() => import("./app/pages/public/security/AccountSecurity").then(m => ({ default: m.AccountSecurity })));
const SecuritySignerAuth     = lazy(() => import("./app/pages/public/security/SecuritySignerAuth").then(m => ({ default: m.SecuritySignerAuth })));
const IdentityVerification   = lazy(() => import("./app/pages/public/security/IdentityVerification").then(m => ({ default: m.IdentityVerification })));
const SecurityAuditTrail     = lazy(() => import("./app/pages/public/security/SecurityAuditTrail").then(m => ({ default: m.SecurityAuditTrail })));
const SecurityDocVerification= lazy(() => import("./app/pages/public/security/SecurityDocVerification").then(m => ({ default: m.SecurityDocVerification })));
const DeviceLocationEvidence = lazy(() => import("./app/pages/public/security/DeviceLocationEvidence").then(m => ({ default: m.DeviceLocationEvidence })));
const SecureStorage          = lazy(() => import("./app/pages/public/security/SecureStorage").then(m => ({ default: m.SecureStorage })));
const PrivacyDataProtection  = lazy(() => import("./app/pages/public/security/PrivacyDataProtection").then(m => ({ default: m.PrivacyDataProtection })));

// Pricing family
const PricingOverview  = lazy(() => import("./app/pages/public/pricing/PricingOverview").then(m => ({ default: m.PricingOverview })));
const ComparePlans     = lazy(() => import("./app/pages/public/pricing/ComparePlans").then(m => ({ default: m.ComparePlans })));
const SigningRequests  = lazy(() => import("./app/pages/public/pricing/SigningRequests").then(m => ({ default: m.SigningRequests })));
const StorageLimits    = lazy(() => import("./app/pages/public/pricing/StorageLimits").then(m => ({ default: m.StorageLimits })));
const TemplatesByPlan  = lazy(() => import("./app/pages/public/pricing/TemplatesByPlan").then(m => ({ default: m.TemplatesByPlan })));
const AuthByPlan       = lazy(() => import("./app/pages/public/pricing/AuthByPlan").then(m => ({ default: m.AuthByPlan })));
const EnterprisePricing= lazy(() => import("./app/pages/public/pricing/EnterprisePricing").then(m => ({ default: m.EnterprisePricing })));
const PricingFaq       = lazy(() => import("./app/pages/public/pricing/PricingFaq").then(m => ({ default: m.PricingFaq })));

// Resources family
const ResourcesOverview = lazy(() => import("./app/pages/public/resources/ResourcesOverview").then(m => ({ default: m.ResourcesOverview })));
const ResourcesFaq      = lazy(() => import("./app/pages/public/resources/ResourcesFaq").then(m => ({ default: m.ResourcesFaq })));
const GuidesOverview    = lazy(() => import("./app/pages/public/resources/GuidesOverview").then(m => ({ default: m.GuidesOverview })));
const LegalFramework    = lazy(() => import("./app/pages/public/resources/LegalFramework").then(m => ({ default: m.LegalFramework })));
const VerificationGuide = lazy(() => import("./app/pages/public/resources/VerificationGuide").then(m => ({ default: m.VerificationGuide })));
const AuthGuide         = lazy(() => import("./app/pages/public/resources/AuthGuide").then(m => ({ default: m.AuthGuide })));
const TemplatesGuide    = lazy(() => import("./app/pages/public/resources/TemplatesGuide").then(m => ({ default: m.TemplatesGuide })));
const SecurityGuide     = lazy(() => import("./app/pages/public/resources/SecurityGuide").then(m => ({ default: m.SecurityGuide })));
const HelpCenter        = lazy(() => import("./app/pages/public/resources/HelpCenter").then(m => ({ default: m.HelpCenter })));
const ContactPage       = lazy(() => import("./app/pages/public/resources/ContactPage").then(m => ({ default: m.ContactPage })));
const ServiceStatus     = lazy(() => import("./app/pages/public/resources/ServiceStatus").then(m => ({ default: m.ServiceStatus })));

// Legal family
const Privacy      = lazy(() => import("./app/pages/public/legal/Privacy").then(m => ({ default: m.Privacy })));
const Terms        = lazy(() => import("./app/pages/public/legal/Terms").then(m => ({ default: m.Terms })));
const Accessibility= lazy(() => import("./app/pages/public/legal/Accessibility").then(m => ({ default: m.Accessibility })));

// eNotary family (all pages labeled Coming Soon)
const EnotaryOverview     = lazy(() => import("./app/pages/public/enotary/EnotaryOverview").then(m => ({ default: m.EnotaryOverview })));
const FutureCapabilities  = lazy(() => import("./app/pages/public/enotary/FutureCapabilities").then(m => ({ default: m.FutureCapabilities })));
const AccreditationRoadmap= lazy(() => import("./app/pages/public/enotary/AccreditationRoadmap").then(m => ({ default: m.AccreditationRoadmap })));
const EnotaryWaitlist     = lazy(() => import("./app/pages/public/enotary/EnotaryWaitlist").then(m => ({ default: m.EnotaryWaitlist })));
const EnotaryFaq          = lazy(() => import("./app/pages/public/enotary/EnotaryFaq").then(m => ({ default: m.EnotaryFaq })));

// Conversion flows (Command 10)
const BookADemo      = lazy(() => import("./app/pages/public/demo/BookADemo").then(m => ({ default: m.BookADemo })));
const VerifyDocument = lazy(() => import("./app/pages/public/verify/VerifyDocument").then(m => ({ default: m.VerifyDocument })));

// Dev only
const DesignSystemShowcase = lazy(() => import("./app/pages/dev/DesignSystemShowcase").then(m => ({ default: m.DesignSystemShowcase })));

// ── Platform (authenticated) pages ────────────────────────────────────────────
const PlatformDashboard   = lazy(() => import("./app/pages/platform/PlatformDashboard").then(m => ({ default: m.PlatformDashboard })));
const DocumentsPage       = lazy(() => import("./app/pages/platform/documents/DocumentsPage").then(m => ({ default: m.DocumentsPage })));
const PlatformPlaceholder = lazy(() => import("./app/pages/platform/PlatformPlaceholder").then(m => ({ default: m.PlatformPlaceholder })));
const PlatformNotFound    = lazy(() => import("./app/pages/platform/PlatformNotFound").then(m => ({ default: m.PlatformNotFound })));
const PermissionDenied    = lazy(() => import("./app/pages/platform/PermissionDenied").then(m => ({ default: m.PermissionDenied })));
const SessionExpired      = lazy(() => import("./app/pages/platform/SessionExpired").then(m => ({ default: m.SessionExpired })));

// Verify (Command 17)
const VerifyPage = lazy(() => import("./app/pages/platform/VerifyPage").then(m => ({ default: m.VerifyPage })));

// Transaction detail (Command 16)
const TransactionDetailLayout = lazy(() => import("./app/pages/platform/documents/TransactionDetailPage").then(m => ({ default: m.TransactionDetailLayout })));
const OverviewTab     = lazy(() => import("./app/pages/platform/documents/TransactionDetailPage").then(m => ({ default: m.OverviewTab })));
const ParticipantsTab = lazy(() => import("./app/pages/platform/documents/TransactionDetailPage").then(m => ({ default: m.ParticipantsTab })));
const ActivityTab     = lazy(() => import("./app/pages/platform/documents/TransactionDetailPage").then(m => ({ default: m.ActivityTab })));
const EvidenceTab     = lazy(() => import("./app/pages/platform/documents/TransactionDetailPage").then(m => ({ default: m.EvidenceTab })));
const SettingsTab     = lazy(() => import("./app/pages/platform/documents/TransactionDetailPage").then(m => ({ default: m.SettingsTab })));

// ── Auth Suspense fallback ────────────────────────────────────────────────────
function AuthPageLoader() {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}
    >
      <div
        aria-hidden
        style={{ width: 28, height: 28, border: "2px solid rgba(0,120,212,0.2)", borderTopColor: "#0078D4", borderRadius: "50%", animation: "auth-spin 0.8s linear infinite" }}
      />
      <style>{`@keyframes auth-spin { to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce) { [style*="auth-spin"] { animation: none; } }`}</style>
    </div>
  );
}

function AuthPage({ children }: { children: React.ReactNode }) {
  return (
    <AuthLayout>
      <Suspense fallback={<AuthPageLoader />}>
        {children}
      </Suspense>
    </AuthLayout>
  );
}

// ── Router definition ─────────────────────────────────────────────────────────
export const router = createBrowserRouter([
  // ── Auth routes ─────────────────────────────────────────────────────────────
  {
    path: "/sign-in",
    element: <AuthPage><SignIn /></AuthPage>,
  },
  {
    path: "/create-account",
    element: <AuthPage><CreateAccount /></AuthPage>,
  },
  {
    path: "/verify-email",
    element: <AuthPage><VerifyEmail /></AuthPage>,
  },
  {
    path: "/forgot-password",
    element: <AuthPage><ForgotPassword /></AuthPage>,
  },
  {
    path: "/reset-password",
    element: <AuthPage><ResetPassword /></AuthPage>,
  },
  {
    path: "/mfa",
    element: <AuthPage><MfaChallenge /></AuthPage>,
  },
  {
    path: "/mfa/setup",
    element: <AuthPage><MfaSetup /></AuthPage>,
  },
  {
    path: "/mfa/recovery",
    element: <AuthPage><RecoveryCodes /></AuthPage>,
  },
  {
    path: "/accept-invitation",
    element: <AuthPage><AcceptInvitation /></AuthPage>,
  },
  {
    path: "/auth/account-locked",
    element: <AuthPage><AccountLocked /></AuthPage>,
  },
  {
    path: "/auth/link-error",
    element: <AuthPage><LinkError /></AuthPage>,
  },

  // ── Onboarding routes (use OnboardingLayout internally) ────────────────────
  // These pages manage their own layout, so they render fullscreen without AuthLayout.
  {
    path: "/onboarding",
    element: <Suspense fallback={null}><Navigate to="/onboarding/profile" replace /></Suspense>,
  },
  {
    path: "/onboarding/profile",
    element: <Suspense fallback={<AuthPageLoader />}><OnboardingProfile /></Suspense>,
  },
  {
    path: "/onboarding/use-case",
    element: <Suspense fallback={<AuthPageLoader />}><OnboardingUseCase /></Suspense>,
  },
  {
    path: "/onboarding/workspace",
    element: <Suspense fallback={<AuthPageLoader />}><OnboardingWorkspace /></Suspense>,
  },
  {
    path: "/onboarding/security",
    element: <Suspense fallback={<AuthPageLoader />}><OnboardingSecurity /></Suspense>,
  },
  {
    path: "/onboarding/notifications",
    element: <Suspense fallback={<AuthPageLoader />}><OnboardingNotifications /></Suspense>,
  },
  {
    path: "/onboarding/review",
    element: <Suspense fallback={<AuthPageLoader />}><OnboardingReview /></Suspense>,
  },
  {
    path: "/onboarding/complete",
    element: <Suspense fallback={<AuthPageLoader />}><OnboardingComplete /></Suspense>,
  },

  // ── Platform (authenticated customer) routes ─────────────────────────────────
  // All /app/* routes are guarded by PlatformLayout's auth check.
  // Deferred pages use PlatformPlaceholder so they render inside the shell.
  {
    path: "/app",
    element: <PlatformLayout />,
    children: [
      // Index: redirect /app → /app/dashboard
      { index: true, element: <Navigate to="/app/dashboard" replace /> },

      // Dashboard
      { path: "dashboard", element: <Suspense fallback={null}><PlatformDashboard /></Suspense> },

      // Documents
      { path: "documents",     element: <Suspense fallback={null}><DocumentsPage /></Suspense> },
      { path: "documents/new", element: <Suspense fallback={null}><PlatformPlaceholder /></Suspense> },
      // Transaction detail — nested routes (Command 16)
      {
        path: "documents/:transactionId",
        element: <Suspense fallback={null}><TransactionDetailLayout /></Suspense>,
        children: [
          { index: true,              element: <Suspense fallback={null}><OverviewTab /></Suspense> },
          { path: "participants",     element: <Suspense fallback={null}><ParticipantsTab /></Suspense> },
          { path: "activity",        element: <Suspense fallback={null}><ActivityTab /></Suspense> },
          { path: "evidence",        element: <Suspense fallback={null}><EvidenceTab /></Suspense> },
          { path: "settings",        element: <Suspense fallback={null}><SettingsTab /></Suspense> },
        ],
      },

      // Templates
      { path: "templates",         element: <Suspense fallback={null}><PlatformPlaceholder /></Suspense> },
      { path: "templates/:id",     element: <Suspense fallback={null}><PlatformPlaceholder /></Suspense> },
      { path: "templates/new",     element: <Suspense fallback={null}><PlatformPlaceholder /></Suspense> },

      // Contacts
      { path: "contacts",          element: <Suspense fallback={null}><PlatformPlaceholder /></Suspense> },
      { path: "contacts/:id",      element: <Suspense fallback={null}><PlatformPlaceholder /></Suspense> },

      // Verify (within platform) — Command 17
      { path: "verify",            element: <Suspense fallback={null}><VerifyPage /></Suspense> },

      // Notifications
      { path: "notifications",     element: <Suspense fallback={null}><PlatformPlaceholder /></Suspense> },

      // Team
      { path: "team",              element: <Suspense fallback={null}><PlatformPlaceholder /></Suspense> },
      { path: "team/members",      element: <Suspense fallback={null}><PlatformPlaceholder /></Suspense> },
      { path: "team/roles",        element: <Suspense fallback={null}><PlatformPlaceholder /></Suspense> },
      { path: "team/invitations",  element: <Suspense fallback={null}><PlatformPlaceholder /></Suspense> },

      // Settings
      { path: "settings",          element: <Suspense fallback={null}><PlatformPlaceholder /></Suspense> },
      { path: "settings/profile",  element: <Suspense fallback={null}><PlatformPlaceholder /></Suspense> },
      { path: "settings/security", element: <Suspense fallback={null}><PlatformPlaceholder /></Suspense> },
      { path: "settings/workspace",element: <Suspense fallback={null}><PlatformPlaceholder /></Suspense> },
      { path: "settings/billing",  element: <Suspense fallback={null}><PlatformPlaceholder /></Suspense> },
      { path: "settings/api",      element: <Suspense fallback={null}><PlatformPlaceholder /></Suspense> },
      { path: "settings/notifications", element: <Suspense fallback={null}><PlatformPlaceholder /></Suspense> },
      { path: "settings/appearance",element: <Suspense fallback={null}><PlatformPlaceholder /></Suspense> },
      { path: "settings/audit-log",element: <Suspense fallback={null}><PlatformPlaceholder /></Suspense> },

      // Permission / session error states
      { path: "permission-denied", element: <Suspense fallback={null}><PermissionDenied /></Suspense> },
      { path: "session-expired",   element: <Suspense fallback={null}><SessionExpired /></Suspense> },

      // Platform 404 — must be last
      { path: "*", element: <Suspense fallback={null}><PlatformNotFound /></Suspense> },
    ],
  },

  // ── Public portal ────────────────────────────────────────────────────────────
  // PublicLayout wraps <Outlet> in <Suspense> so lazy pages get a spinner.
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <Home /> },

      // ── eSignature product pages ──────────────────────────────────────────
      { path: "esignature",                          element: <EsigOverview /> },
      { path: "esignature/core-workflow",            element: <EsigCoreWorkflow /> },
      { path: "esignature/verification-and-audit",   element: <EsigVerificationAudit /> },
      { path: "esignature/advanced-capabilities",    element: <EsigAdvancedCapabilities /> },
      { path: "esignature/templates-and-branding",   element: <EsigTemplatesBranding /> },
      { path: "esignature/team-and-enterprise",      element: <EsigTeamEnterprise /> },

      // ── Security pages ────────────────────────────────────────────────────
      { path: "security",                                element: <SecurityOverview /> },
      { path: "security/trust-center",                   element: <TrustCenter /> },
      { path: "security/account-security",               element: <AccountSecurity /> },
      { path: "security/signer-authentication",          element: <SecuritySignerAuth /> },
      { path: "security/identity-verification",          element: <IdentityVerification /> },
      { path: "security/audit-trail",                    element: <SecurityAuditTrail /> },
      { path: "security/document-verification",          element: <SecurityDocVerification /> },
      { path: "security/device-and-location-evidence",   element: <DeviceLocationEvidence /> },
      { path: "security/secure-storage",                 element: <SecureStorage /> },
      { path: "security/privacy-and-data-protection",    element: <PrivacyDataProtection /> },

      // ── Solutions pages ───────────────────────────────────────────────────
      { path: "solutions",                               element: <SolutionsOverview /> },
      { path: "solutions/lawyers",                       element: <Lawyers /> },
      { path: "solutions/law-firms",                     element: <LawFirms /> },
      { path: "solutions/business-teams",                element: <BusinessTeams /> },
      { path: "solutions/government-and-lgu",            element: <GovernmentLGU /> },
      { path: "solutions/real-estate",                   element: <RealEstate /> },
      { path: "solutions/hr-and-recruitment",            element: <HRRecruitment /> },
      { path: "solutions/finance",                       element: <Finance /> },
      { path: "solutions/procurement",                   element: <Procurement /> },
      { path: "solutions/education",                     element: <Education /> },
      { path: "solutions/healthcare-and-wellness",       element: <HealthcareWellness /> },

      // ── Pricing pages ─────────────────────────────────────────────────────
      { path: "pricing",                          element: <PricingOverview /> },
      { path: "pricing/compare",                  element: <ComparePlans /> },
      { path: "pricing/signing-requests",         element: <SigningRequests /> },
      { path: "pricing/storage-limits",           element: <StorageLimits /> },
      { path: "pricing/templates-by-plan",        element: <TemplatesByPlan /> },
      { path: "pricing/authentication-by-plan",   element: <AuthByPlan /> },
      { path: "pricing/enterprise",               element: <EnterprisePricing /> },
      { path: "pricing/faq",                      element: <PricingFaq /> },

      // ── Resources pages ───────────────────────────────────────────────────
      { path: "resources",                              element: <ResourcesOverview /> },
      { path: "resources/faq",                          element: <ResourcesFaq /> },
      { path: "resources/guides",                       element: <GuidesOverview /> },
      { path: "resources/legal-framework",              element: <LegalFramework /> },
      { path: "resources/document-verification-guide",  element: <VerificationGuide /> },
      { path: "resources/authentication-guide",         element: <AuthGuide /> },
      { path: "resources/templates-guide",              element: <TemplatesGuide /> },
      { path: "resources/security-guide",               element: <SecurityGuide /> },
      { path: "help",                                   element: <HelpCenter /> },
      { path: "contact",                                element: <ContactPage /> },
      { path: "service-status",                         element: <ServiceStatus /> },

      // ── eNotary pages (Coming Soon — not accredited) ──────────────────────
      { path: "enotary",                          element: <EnotaryOverview /> },
      { path: "enotary/future-capabilities",      element: <FutureCapabilities /> },
      { path: "enotary/accreditation-roadmap",    element: <AccreditationRoadmap /> },
      { path: "enotary/waitlist",                 element: <EnotaryWaitlist /> },
      { path: "enotary/faq",                      element: <EnotaryFaq /> },

      // ── Conversion flows (Command 10) ─────────────────────────────────────
      { path: "book-a-demo", element: <BookADemo /> },
      { path: "verify",      element: <VerifyDocument /> },

      // ── Features pages ────────────────────────────────────────────────────
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

      // ── Legal pages ───────────────────────────────────────────────────────
      { path: "legal/privacy",       element: <Privacy /> },
      { path: "legal/terms",         element: <Terms /> },
      { path: "legal/accessibility", element: <Accessibility /> },
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

      // ── 404 ──────────────────────────────────────────────────────────────
      { path: "*", element: <NotFound /> },
    ],
  },

  // ── Dev-only routes (not linked from public navigation) ─────────────────────
  {
    path: "/dev/design-system",
    element: (
      <Suspense fallback={null}>
        <DesignSystemShowcase />
      </Suspense>
    ),
  },
]);

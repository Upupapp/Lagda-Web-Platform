import { createBrowserRouter, Navigate } from "react-router";
import App from "./app/App";
import { PublicLayout } from "./app/layouts/PublicLayout";
import { AuthLayout } from "./app/layouts/AuthLayout";
import { PlatformLayout } from "./app/layouts/PlatformLayout";
import { NotFound } from "./app/pages/public/NotFound";
import { DevPlaceholder } from "./app/pages/shared/DevPlaceholder";
import { PlatformIndex } from "./app/pages/platform/PlatformIndex";
import { SignIn } from "./app/pages/auth/SignIn";
import { DesignSystemShowcase } from "./app/pages/dev/DesignSystemShowcase";

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
      // Root → redirect to eSignature overview
      { index: true, element: <Navigate to="/esignature" replace /> },

      // ── Implemented sections (App.tsx state machine handles subrouting) ──────
      { path: "esignature/*", element: <App /> },
      { path: "security/*", element: <App /> },
      { path: "solutions/*", element: <App /> },
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

      // ── Features ──────────────────────────────────────────────────────────────
      {
        path: "features",
        element: (
          <DevPlaceholder
            title="LAGDA Features"
            subtitle="Full feature index coming soon."
          />
        ),
      },
      {
        path: "features/*",
        element: (
          <DevPlaceholder
            title="Feature Detail"
            subtitle="This feature page is coming soon."
            showBack
          />
        ),
      },

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

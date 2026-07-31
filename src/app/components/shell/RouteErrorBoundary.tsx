// Route-level error boundaries (STITCH full audit, 2026-08-01).
//
// THE DEFECT THIS FIXES: `createBrowserRouter` was configured with no
// `errorElement` anywhere, and the repository contained no ErrorBoundary,
// `componentDidCatch`, or `useRouteError` of any kind. Any uncaught render or
// loader error therefore fell through to react-router's built-in error screen,
// which renders "Unexpected Application Error!", the raw error message, and —
// in development — the stack trace, outside the LAGDA shell and with no way
// back into the application.
//
// That failed five requirements of the fallback matrix at once: wrong shell, no
// H1, exposes internal information, no safe next action, no safe fallback URL.
//
// This is the router's NATIVE mechanism (`errorElement` + `useRouteError`), not
// a competing fallback architecture. 404 handling stays with the existing
// `NotFound` / `PlatformNotFound` wildcard routes; this only covers thrown
// errors, which nothing previously handled.

import { Link, isRouteErrorResponse, useRouteError } from "react-router";
import { log } from "../../utils/logger";

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const SLATE = "#64748B";
const AZURE = "#0078D4";

/**
 * Reads the error for logging only.
 *
 * The message is NEVER rendered. A thrown error can carry a batch name, a
 * recipient value, a Contact, or an internal identifier, and an error screen is
 * exactly the place where nobody is checking what leaked. `log` is the approved
 * redacting path and is a no-op outside development.
 */
function useLoggedRouteError(surface: string): { status: number | null } {
  const error = useRouteError();

  const status = isRouteErrorResponse(error) ? error.status : null;

  log.error(`Route error on the ${surface} surface`, {
    status,
    // `name` is a class name ("TypeError"), never user data. The message and
    // stack are deliberately omitted.
    name: error instanceof Error ? error.name : typeof error,
  });

  return { status };
}

interface ShellProps {
  heading: string;
  body: string;
  primaryTo: string;
  primaryLabel: string;
  secondaryTo?: string;
  secondaryLabel?: string;
}

/**
 * One H1, one explanation, one safe destination. No raw error text.
 */
function ErrorShell({
  heading, body, primaryTo, primaryLabel, secondaryTo, secondaryLabel,
}: ShellProps) {
  return (
    <main
      role="alert"
      aria-labelledby="route-error-heading"
      style={{
        ...GF,
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "72px 24px",
        textAlign: "center",
      }}
    >
      <div aria-hidden="true" style={{ fontSize: 40, marginBottom: 16, lineHeight: 1 }}>
        ⚠️
      </div>

      <h1
        id="route-error-heading"
        style={{ ...GF, margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: NAVY, letterSpacing: "-0.02em" }}
      >
        {heading}
      </h1>

      <p style={{ ...GF, margin: "0 0 28px", fontSize: 14, color: SLATE, lineHeight: 1.6, maxWidth: 460 }}>
        {body}
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          to={primaryTo}
          style={{
            ...GF, fontSize: 14, fontWeight: 600, color: "#ffffff", background: AZURE,
            borderRadius: 8, padding: "10px 20px", textDecoration: "none", display: "inline-block",
          }}
        >
          {primaryLabel}
        </Link>
        {secondaryTo && secondaryLabel && (
          <Link
            to={secondaryTo}
            style={{
              ...GF, fontSize: 14, fontWeight: 600, color: SLATE, background: "#F1F5F9",
              borderRadius: 8, padding: "10px 20px", textDecoration: "none", display: "inline-block",
            }}
          >
            {secondaryLabel}
          </Link>
        )}
      </div>

      {/* Reload is a genuine recovery here: a chunk that failed to load once
          usually loads on a second attempt. A plain <button> because it is an
          action, not a navigation. */}
      <button
        type="button"
        onClick={() => { window.location.reload(); }}
        style={{
          ...GF, marginTop: 20, fontSize: 13, color: SLATE, background: "none",
          border: "none", padding: 4, cursor: "pointer", textDecoration: "underline",
        }}
      >
        Reload this page
      </button>
    </main>
  );
}

/**
 * Public surface. Falls back to the home page — a signed-out visitor has no
 * dashboard to return to.
 */
export function PublicRouteError() {
  const { status } = useLoggedRouteError("public");

  if (status === 404) {
    return (
      <ErrorShell
        heading="Page not found"
        body="This page does not exist or may have moved."
        primaryTo="/"
        primaryLabel="Go to Home"
        secondaryTo="/contact"
        secondaryLabel="Contact us"
      />
    );
  }

  return (
    <ErrorShell
      heading="Something went wrong"
      body="This page could not be displayed. The problem is on our side, not with anything you did."
      primaryTo="/"
      primaryLabel="Go to Home"
      secondaryTo="/contact"
      secondaryLabel="Contact us"
    />
  );
}

/**
 * Authenticated surface. Returns to Documents rather than Dashboard: Documents
 * is the workspace's home for actual work, and a user without `view_dashboard`
 * would land on a restricted page.
 */
export function PlatformRouteError() {
  const { status } = useLoggedRouteError("platform");

  if (status === 404) {
    return (
      <ErrorShell
        heading="Page not found"
        body="This page does not exist, or the item it referred to is no longer available to you."
        primaryTo="/app/documents"
        primaryLabel="Go to Documents"
        secondaryTo="/app/dashboard"
        secondaryLabel="Go to Dashboard"
      />
    );
  }

  return (
    <ErrorShell
      heading="Something went wrong"
      body={
        "This page could not be displayed. Nothing was sent, changed, or lost — " +
        "LAGDA is a frontend demonstration and no request left your browser."
      }
      primaryTo="/app/documents"
      primaryLabel="Go to Documents"
      secondaryTo="/app/dashboard"
      secondaryLabel="Go to Dashboard"
    />
  );
}

/**
 * Recipient signing surface. A recipient has no LAGDA account and no dashboard,
 * so there is deliberately no internal destination — offering one would imply
 * access they do not have.
 */
export function RecipientRouteError() {
  useLoggedRouteError("recipient");

  return (
    <main
      role="alert"
      aria-labelledby="recipient-error-heading"
      style={{
        ...GF, minHeight: "60vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "72px 24px", textAlign: "center",
      }}
    >
      <div aria-hidden="true" style={{ fontSize: 40, marginBottom: 16, lineHeight: 1 }}>⚠️</div>
      <h1
        id="recipient-error-heading"
        style={{ ...GF, margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: NAVY, letterSpacing: "-0.02em" }}
      >
        This request could not be opened
      </h1>
      <p style={{ ...GF, margin: "0 0 28px", fontSize: 14, color: SLATE, lineHeight: 1.6, maxWidth: 460 }}>
        The link may have expired, or the request may no longer be available. Nothing was
        signed and no action was recorded. If you were expecting to review a document,
        contact the person who sent it to you.
      </p>
      <button
        type="button"
        onClick={() => { window.location.reload(); }}
        style={{
          ...GF, fontSize: 14, fontWeight: 600, color: "#ffffff", background: AZURE,
          border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer",
        }}
      >
        Try again
      </button>
    </main>
  );
}

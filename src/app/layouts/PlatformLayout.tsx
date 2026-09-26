// Authenticated customer-platform layout.
// Guards all /app/* routes with a mock session check.
// Desktop: fixed sidebar + scrollable content.
// Mobile (<768px): top bar + slide-in drawer (MobileNav).
// Tablet (768-1023px): same as mobile.

import { useWorkspaceBrandingSync } from "../hooks/useWorkspaceBrandingSync";
import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, Navigate, useLocation } from "react-router";
import { usePlatform } from "../context/PlatformContext";
import { USE_REAL_BACKEND } from "../services/backend-flag";
import { NotificationCenterProvider } from "../context/NotificationCenterContext";
import { PlatformSidebar } from "../components/platform/PlatformSidebar";
import { MobileNav } from "../components/platform/MobileNav";
import { PlatformHeader } from "../components/platform/PlatformHeader";
import { SKELETON_STYLE } from "../components/platform/AppContentLayout";
import { LagdaLoader } from "../components/brand/LagdaLoader";
import { TourProvider } from "../tour/TourContext";
import { buildSignInUrl } from "../utils/authReturnPath";

// ── Route loading fallback ────────────────────────────────────────────────────
function PlatformPageLoader() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", background: "#F8FAFC" }}
    >
      <LagdaLoader mode="inline" theme="light" size={28} ariaLabel="Loading page" />
      <style>{SKELETON_STYLE}</style>
    </div>
  );
}

// ── Session initializing screen — full branded splash ────────────────────────
function SessionInitializing() {
  return (
    <LagdaLoader
      mode="fullscreen"
      theme="light"
      message="Preparing your secure workspace"
      showWordmark
      spinner
    />
  );
}

const SETUP_CARD_STYLE: React.CSSProperties = {
  minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
  background: "#F8FAFC", padding: 24,
};
const SETUP_PANEL_STYLE: React.CSSProperties = {
  width: "100%", maxWidth: 420, background: "#FFFFFF", border: "1px solid #E2E8F0",
  borderRadius: 16, padding: "32px 28px", boxShadow: "0 18px 50px rgba(7,17,31,0.08)",
  fontFamily: "'Geist', sans-serif", textAlign: "center",
};

// A genuinely authenticated account with zero accessible workspaces — not an
// error, and never papered over with a fabricated one (see PlatformContext's
// WorkspaceStatus). Reached directly only when an existing account somehow
// ends up with none (e.g. left its only workspace); a brand-new account is
// normally routed here via onboarding instead — see OnboardingComplete.tsx.
function WorkspaceSetupRequired() {
  const { createWorkspace, user } = usePlatform();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim() || `${user?.displayName ?? "My"}'s Workspace`;
    setSubmitting(true);
    setError(null);
    const result = await createWorkspace(trimmed);
    setSubmitting(false);
    if (!result.ok) setError(result.error);
    // On success, workspaceStatus flips to "ready" and this component's
    // parent re-renders into the normal authenticated shell — no navigation
    // needed here.
  }

  return (
    <div style={SETUP_CARD_STYLE}>
      <div style={SETUP_PANEL_STYLE}>
        <h1 style={{ color: "#07111F", fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>Create your workspace</h1>
        <p style={{ color: "#64748B", fontSize: 13, lineHeight: 1.6, margin: "0 0 20px" }}>
          You need a workspace before you can prepare or send documents.
        </p>
        {error && (
          <div role="alert" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 12px", marginBottom: 16, textAlign: "left" }}>
            <p style={{ color: "#EF4444", fontSize: 13, margin: 0 }}>{error}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Documents"
            aria-label="Workspace name"
            disabled={submitting}
            style={{
              width: "100%", boxSizing: "border-box", padding: "11px 14px",
              borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 14, outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            style={{
              background: submitting ? "rgba(0,120,212,0.5)" : "#0078D4", color: "white",
              border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700,
              padding: "12px", minHeight: 44, cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Creating…" : "Create workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}

// The workspace list itself could not be fetched (network/server error) —
// recoverable, and deliberately distinct from WorkspaceSetupRequired: a
// retry-and-succeed here must not have created a duplicate workspace, which
// re-fetching (rather than re-creating) guarantees.
function WorkspaceLoadError() {
  const { refreshSessionFromBackend } = usePlatform();
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    await refreshSessionFromBackend();
    setRetrying(false);
  }

  return (
    <div style={SETUP_CARD_STYLE}>
      <div style={SETUP_PANEL_STYLE}>
        <h1 style={{ color: "#07111F", fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>Couldn't load your workspaces</h1>
        <p style={{ color: "#64748B", fontSize: 13, lineHeight: 1.6, margin: "0 0 20px" }}>
          Something went wrong reaching the server. Please try again.
        </p>
        <button
          onClick={handleRetry}
          disabled={retrying}
          aria-busy={retrying}
          style={{
            background: retrying ? "rgba(0,120,212,0.5)" : "#0078D4", color: "white",
            border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700,
            padding: "12px 20px", minHeight: 44, cursor: retrying ? "not-allowed" : "pointer",
          }}
        >
          {retrying ? "Retrying…" : "Try again"}
        </button>
      </div>
    </div>
  );
}

/**
 * What the page wrapper below is keyed by.
 *
 * Keying by the full path remounts the page on every navigation, which is
 * what plays the entrance animation. A section family with its own route
 * layout must not be remounted by moving inside it — Manage keeps its
 * header and banner row mounted across /app/workspace/* and animates only
 * its own content area — so the family shares one key.
 */
const PERSISTENT_LAYOUT_ROOTS = ["/app/workspace"];

function pageKeyFor(pathname: string): string {
  const root = PERSISTENT_LAYOUT_ROOTS.find(r => pathname === r || pathname.startsWith(`${r}/`));
  return root ?? pathname;
}

// ── Platform shell ────────────────────────────────────────────────────────────
export function PlatformLayout() {
  const { sessionStatus, workspaceStatus } = usePlatform();
  // 082. The current workspace's saved branding, kept current on its badge.
  useWorkspaceBrandingSync();
  const location = useLocation();
  const mainRef  = useRef<HTMLElement>(null);

  // Scroll content to top on route change
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [location.pathname]);

  if (sessionStatus === "initializing") {
    return <SessionInitializing />;
  }

  if (sessionStatus === "expired") {
    return <Navigate to={buildSignInUrl(location.pathname + location.search)} replace state={{ reason: "expired" }} />;
  }

  if (sessionStatus !== "authenticated") {
    return <Navigate to={buildSignInUrl(location.pathname + location.search)} replace />;
  }

  // Identity is proven; workspace access is a separate backend fact (see
  // PlatformContext's WorkspaceStatus). Mock-backend builds always resolve
  // straight to "ready", so these branches are inert there.
  if (USE_REAL_BACKEND && workspaceStatus === "empty") {
    return <WorkspaceSetupRequired />;
  }
  if (USE_REAL_BACKEND && workspaceStatus === "error") {
    return <WorkspaceLoadError />;
  }

  return (
    <NotificationCenterProvider>
    <TourProvider>
      {/* Exactly the viewport's height, so `.platform-main` below is the one
          scroll container. With `minHeight` the shell grew to its content and
          every page scrolled the WINDOW instead — which stops working the
          moment anything locks body scroll, leaving long pages (Edit Contact)
          with their lower half unreachable. `dvh` so a phone's collapsing
          address bar cannot hide the bottom of the page. */}
      <div style={{ display: "flex", height: "100dvh", background: "#F8FAFC" }}>
        {/* ── Desktop sidebar (hidden <768px via CSS) ─────────────── */}
        <div className="platform-desktop-nav" aria-hidden={undefined}>
          <PlatformSidebar />
        </div>

        {/* ── Mobile nav (hidden ≥768px via CSS) ─────────────────── */}
        <div className="platform-mobile-nav">
          <MobileNav />
        </div>

        {/* ── Content column ──────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          {/* Desktop header */}
          <div className="platform-desktop-header">
            <PlatformHeader />
          </div>

          {/* Skip to main content */}
          <a
            href="#plat-main"
            style={{
              position: "absolute", left: -9999, top: "auto", width: 1, height: 1, overflow: "hidden",
            }}
            className="platform-skip-link"
            onFocus={(e) => {
              e.currentTarget.style.left = "8px";
              e.currentTarget.style.top = "8px";
              e.currentTarget.style.width = "auto";
              e.currentTarget.style.height = "auto";
              e.currentTarget.style.zIndex = "9999";
              e.currentTarget.style.background = "#0078D4";
              e.currentTarget.style.color = "white";
              e.currentTarget.style.padding = "8px 16px";
              e.currentTarget.style.borderRadius = "6px";
              e.currentTarget.style.textDecoration = "none";
              e.currentTarget.style.fontFamily = "'Geist', sans-serif";
              e.currentTarget.style.fontSize = "13px";
            }}
            onBlur={(e) => {
              e.currentTarget.style.left = "-9999px";
            }}
          >
            Skip to main content
          </a>

          <main
            id="plat-main"
            ref={mainRef}
            tabIndex={-1}
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              outline: "none",
            }}
            className="platform-main"
          >
            <Suspense fallback={<PlatformPageLoader />}>
              <div key={pageKeyFor(location.pathname)} className="lagda-page-enter">
                <Outlet />
              </div>
            </Suspense>
          </main>
        </div>

        <style>{`
          /* Desktop: show sidebar, hide mobile nav */
          @media (min-width: 768px) {
            .platform-desktop-nav    { display: flex  !important; }
            .platform-mobile-nav     { display: none  !important; }
            .platform-desktop-header { display: block !important; }
            .platform-main           { padding-top: 0 !important; }
          }
          /* Mobile/tablet: hide sidebar, show mobile nav */
          @media (max-width: 767px) {
            .platform-desktop-nav    { display: none  !important; }
            .platform-mobile-nav     { display: block !important; }
            .platform-desktop-header { display: none  !important; }
            .platform-main           { padding-top: 56px !important; }
          }
          /* Focus management */
          #plat-main:focus { outline: none; }
          /* Scrollbar */
          .platform-main::-webkit-scrollbar       { width: 6px; }
          .platform-main::-webkit-scrollbar-track { background: transparent; }
          .platform-main::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
          ${SKELETON_STYLE}
        `}</style>
      </div>
    </TourProvider>
    </NotificationCenterProvider>
  );
}

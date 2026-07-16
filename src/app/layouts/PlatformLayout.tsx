// Authenticated customer-platform layout.
// Guards all /app/* routes with a mock session check.
// Desktop: fixed sidebar + scrollable content.
// Mobile (<768px): top bar + slide-in drawer (MobileNav).
// Tablet (768-1023px): same as mobile.

import { Suspense, useEffect, useRef } from "react";
import { Outlet, Navigate, useLocation } from "react-router";
import { usePlatform } from "../context/PlatformContext";
import { NotificationCenterProvider } from "../context/NotificationCenterContext";
import { PlatformSidebar } from "../components/platform/PlatformSidebar";
import { MobileNav } from "../components/platform/MobileNav";
import { PlatformHeader } from "../components/platform/PlatformHeader";
import { SKELETON_STYLE } from "../components/platform/AppContentLayout";
import { LagdaLoader } from "../components/brand/LagdaLoader";

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
      theme="dark"
      message="Preparing your secure workspace"
      showWordmark
    />
  );
}

// ── Return-route validation ───────────────────────────────────────────────────
// Only allows internal /app/* paths to prevent open redirect.
function buildReturnUrl(pathname: string): string {
  const safe = pathname.startsWith("/app") ? pathname : "/app/dashboard";
  return `/sign-in?returnTo=${encodeURIComponent(safe)}`;
}

// ── Platform shell ────────────────────────────────────────────────────────────
export function PlatformLayout() {
  const { sessionStatus } = usePlatform();
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
    return <Navigate to={buildReturnUrl(location.pathname)} replace state={{ reason: "expired" }} />;
  }

  if (sessionStatus !== "authenticated") {
    return <Navigate to={buildReturnUrl(location.pathname)} replace />;
  }

  return (
    <NotificationCenterProvider>
      <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC" }}>
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
              (e.target as HTMLAnchorElement).style.left = "8px";
              (e.target as HTMLAnchorElement).style.top = "8px";
              (e.target as HTMLAnchorElement).style.width = "auto";
              (e.target as HTMLAnchorElement).style.height = "auto";
              (e.target as HTMLAnchorElement).style.zIndex = "9999";
              (e.target as HTMLAnchorElement).style.background = "#0078D4";
              (e.target as HTMLAnchorElement).style.color = "white";
              (e.target as HTMLAnchorElement).style.padding = "8px 16px";
              (e.target as HTMLAnchorElement).style.borderRadius = "6px";
              (e.target as HTMLAnchorElement).style.textDecoration = "none";
              (e.target as HTMLAnchorElement).style.fontFamily = "'Geist', sans-serif";
              (e.target as HTMLAnchorElement).style.fontSize = "13px";
            }}
            onBlur={(e) => {
              (e.target as HTMLAnchorElement).style.left = "-9999px";
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
              <div key={location.pathname} className="lagda-page-enter">
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
    </NotificationCenterProvider>
  );
}

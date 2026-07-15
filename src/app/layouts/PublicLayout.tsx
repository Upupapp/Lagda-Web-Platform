import { Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import { SkipLink, PublicHeader, PublicFooter } from "@/app/components/shell";

export function PublicLayout() {
  const { pathname } = useLocation();

  // Scroll to top on every route change.
  // App.tsx no longer needs its own scroll logic since navigation is URL-driven.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div style={{ background: "#07111F", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Skip link — visible only on keyboard focus, appears above the header */}
      <SkipLink />

      {/* Fixed 72px header — sits above all content at z-50 */}
      <PublicHeader />

      {/* Main content area — 72px top padding clears the fixed header.
          App.tsx still applies its own marginTop: -contentPullUp to hide
          Figma-imported navbars/sub-navbars inside each imported screen. */}
      <main
        id="main-content"
        tabIndex={-1}
        style={{ flex: 1, paddingTop: 72, outline: "none" }}
      >
        <Outlet />
      </main>

      {/* Canonical footer — replaces the suppressed Figma import footers */}
      <PublicFooter />
    </div>
  );
}

import { Outlet, useLocation } from "react-router";
import { useEffect } from "react";

// Thin shell for all public portal routes.
// The existing App.tsx manages its own nav and page content as one unit.
// This layout exists to:
//   1. Establish the route boundary that separates public from auth and platform
//   2. Provide a future mount point for a global footer and cookie banner
//   3. Enable per-route scroll restoration via useLocation

export function PublicLayout() {
  const { pathname } = useLocation();

  // Scroll to top on route change (covers links from DevPlaceholder, NotFound, etc.)
  // App.tsx handles its own scroll on internal state changes.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return <Outlet />;
}

import { Outlet, useLocation } from "react-router";
import { useEffect, Suspense } from "react";
import { SkipLink } from "@/app/components/shell";
import { usePageMeta } from "@/app/hooks/usePageMeta";
import { useStructuredData } from "@/app/hooks/useStructuredData";

/**
 * The layout for the home page (`/`) only. It keeps what PublicLayout does
 * that isn't visual (skip link, page meta, structured data, scroll to top on
 * route change, the main landmark and the Suspense around the outlet), but
 * renders no PublicHeader, PublicFooter or wave backdrop and sets no public
 * theme mark: the landing page brings its own announcement bar, header and
 * footer (pages/public/home/LandingPage.tsx).
 */
export function LandingLayout() {
  const { pathname } = useLocation();

  usePageMeta();
  useStructuredData();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <>
      <SkipLink />
      <main id="main-content" tabIndex={-1} style={{ outline: "none" }}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
    </>
  );
}

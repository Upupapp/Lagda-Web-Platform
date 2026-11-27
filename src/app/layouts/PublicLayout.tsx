import { Outlet, useLocation } from "react-router";
import { useEffect, Suspense } from "react";
import { SkipLink } from "@/app/components/shell";
import { LandingHeader, LandingFooter } from "@/app/pages/public/home/LandingChrome";
import { usePageMeta } from "@/app/hooks/usePageMeta";
import { useStructuredData } from "@/app/hooks/useStructuredData";
import { useAppShellTheme } from "@/app/hooks/useAppShellTheme";
import { usePublicMotion, usePublicReveal } from "@/app/hooks/usePublicMotion";

function PageLoader() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: "2px solid rgba(11,57,129,0.2)",
          borderTopColor: "#0B3981",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
        aria-hidden
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce) { [style*="spin"] { animation: none; border: 2px solid #0B3981; } }`}</style>
    </div>
  );
}

/** The landing page's header and footer sit in their own .lgl-root, the
 *  scope landing.css styles, so the pages between them keep the app's CSS. */
const CHROME: React.CSSProperties = { fontFamily: "'Geist', sans-serif", color: "#0B1730" };

export function PublicLayout() {
  const { pathname } = useLocation();

  usePageMeta();
  useStructuredData();
  // The public type, the navy accents and the section bands
  // (styles/app-shell.css, styles/public-shell.css).
  useAppShellTheme("public");
  // Each page opens with its heading rising; sections below the fold rise into
  // view as the page scrolls. Never with reduced motion (hooks/usePublicMotion.ts).
  usePublicMotion();
  usePublicReveal(pathname);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    // .lgl-page: on wide, short laptop windows the whole page is drawn at 80%,
    // the same as the landing page (landing.css).
    <div
      className="lgl-page"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
      }}
    >
      <SkipLink />
      {/* The landing page's header: one bar, each section's pages in its menu. */}
      <div className="lgl-root" style={CHROME}>
        <LandingHeader />
      </div>
      <main
        id="main-content"
        tabIndex={-1}
        style={{ flex: 1, outline: "none", position: "relative" }}
      >
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <div className="lgl-root" style={CHROME}>
        <LandingFooter />
      </div>
    </div>
  );
}

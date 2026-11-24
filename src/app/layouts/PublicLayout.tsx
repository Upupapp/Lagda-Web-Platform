import { Outlet, useLocation } from "react-router";
import { useEffect, Suspense } from "react";
import { SkipLink, PublicHeader, PublicFooter } from "@/app/components/shell";
import { usePageMeta } from "@/app/hooks/usePageMeta";
import { useStructuredData } from "@/app/hooks/useStructuredData";
import { AppWaveBackdrop } from "@/app/components/platform/AppWaveBackdrop";
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
          border: "2px solid rgba(0,120,212,0.2)",
          borderTopColor: "#0078D4",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
        aria-hidden
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce) { [style*="spin"] { animation: none; border: 2px solid #0078D4; } }`}</style>
    </div>
  );
}

export function PublicLayout() {
  const { pathname } = useLocation();

  usePageMeta();
  useStructuredData();
  // The navy accents, the Libre Caslon headings and the wave backdrop's
  // colours (styles/app-shell.css, styles/public-shell.css).
  useAppShellTheme("public");
  // Each page opens with its heading rising; sections below the fold rise into
  // view as the page scrolls. Never with reduced motion (hooks/usePublicMotion.ts).
  usePublicMotion();
  usePublicReveal(pathname);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* The wave backdrop, pinned to the window behind every public page,
          its top-right wave starting under the fixed header. It eases in from
          the corners when the site first opens and then stays put: it belongs
          to this layout, so moving between pages does not replay it. */}
      <AppWaveBackdrop fixed underHeader enter />
      <SkipLink />
      <PublicHeader />
      {/* Positioned (no z-index) so the page paints above the backdrop. */}
      <main
        id="main-content"
        tabIndex={-1}
        style={{ flex: 1, paddingTop: 64, outline: "none", position: "relative" }}
      >
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <div style={{ position: "relative" }}>
        <PublicFooter />
      </div>
    </div>
  );
}

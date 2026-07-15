import { Outlet, useLocation } from "react-router";
import { useEffect, Suspense } from "react";
import { SkipLink, PublicHeader, PublicFooter } from "@/app/components/shell";
import { usePageMeta } from "@/app/hooks/usePageMeta";
import { useStructuredData } from "@/app/hooks/useStructuredData";

function PageLoader() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}
    >
      <div style={{ width: 32, height: 32, border: "2px solid rgba(0,120,212,0.2)", borderTopColor: "#0078D4", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} aria-hidden />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce) { [style*="spin"] { animation: none; border: 2px solid #0078D4; } }`}</style>
    </div>
  );
}

export function PublicLayout() {
  const { pathname } = useLocation();

  usePageMeta();
  useStructuredData();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div style={{ background: "#07111F", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <SkipLink />
      <PublicHeader />
      <main
        id="main-content"
        tabIndex={-1}
        style={{ flex: 1, paddingTop: 72, outline: "none" }}
      >
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}

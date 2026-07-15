// Single reusable placeholder for all deferred /app routes.
// Shows the route name, a "Coming Soon" badge, and the Prepare Document CTA.

import { useLocation } from "react-router";
import { Clock, FilePlus } from "lucide-react";
import { Link } from "react-router";
import { AppContent, PageHeader } from "../../components/platform";

const GF = { fontFamily: "'Geist', sans-serif" };

function labelFromPath(pathname: string): string {
  const parts = pathname.replace(/^\/app\/?/, "").split("/").filter(Boolean);
  if (parts.length === 0) return "Dashboard";
  return parts
    .map((p) => p.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(" › ");
}

export function PlatformPlaceholder() {
  const { pathname } = useLocation();
  const label = labelFromPath(pathname);

  return (
    <>
      <PageHeader
        title={label}
        status={
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: "rgba(201,150,12,0.10)", color: "#92400E",
            border: "1px solid rgba(201,150,12,0.20)",
            borderRadius: 999, padding: "2px 8px",
            fontFamily: "'Geist', sans-serif", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.04em", textTransform: "uppercase",
          }}>
            <Clock size={10} aria-hidden />
            Coming Soon
          </span>
        }
      />

      <AppContent style={{ maxWidth: 680 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "48px 24px" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: "rgba(0,120,212,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 20, color: "#0078D4",
          }}>
            <Clock size={28} aria-hidden />
          </div>

          <h2 style={{ color: "#0F172A", ...GF, fontSize: 20, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            {label} is coming soon
          </h2>
          <p style={{ color: "#64748B", ...GF, fontSize: 15, margin: "0 0 28px", lineHeight: 1.65, maxWidth: 480 }}>
            This section is part of the LAGDA customer platform and will be available during the next development phase. In the meantime, you can continue preparing documents.
          </p>

          <Link
            to="/app/documents/new"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#0078D4", color: "white",
              border: "none", borderRadius: 8,
              padding: "10px 20px",
              ...GF, fontSize: 14, fontWeight: 700,
              textDecoration: "none",
              transition: "background 0.15s",
            }}
            className="plat-placeholder-cta"
          >
            <FilePlus size={16} aria-hidden />
            Prepare a Document
          </Link>
        </div>

        <div role="note" aria-label="Frontend demonstration notice" style={{ marginTop: 8, padding: "12px 16px", background: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0" }}>
          <p style={{ color: "#94A3B8", ...GF, fontSize: 12, margin: 0, lineHeight: 1.6, textAlign: "center" }}>
            Frontend demonstration — this placeholder represents a deferred feature module.
          </p>
        </div>
      </AppContent>

      <style>{`.plat-placeholder-cta:hover { background: #006BBE !important; }`}</style>
    </>
  );
}

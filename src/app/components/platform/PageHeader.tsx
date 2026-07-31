// Reusable platform page header component.
// Provides consistent title, description, breadcrumbs, and primary actions.

import { Link } from "react-router";
import { ChevronRight } from "lucide-react";

const GF = { fontFamily: "'Geist', sans-serif" };

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface PageHeaderProps {
  // ReactNode, not string: the component's only use of `title` is
  // `<h1>{title}</h1>`, and FolderDetailPage renders an inline rename input in
  // that slot. The narrower `string` type never matched what the component
  // actually accepts.
  title: React.ReactNode;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  status?: React.ReactNode;
  tabs?: React.ReactNode;
  compact?: boolean;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  status,
  tabs,
  compact = false,
}: PageHeaderProps) {
  return (
    <div style={{ background: "white", borderBottom: "1px solid #E2E8F0" }}>
      <div style={{ padding: compact ? "16px 24px 12px" : "20px 24px 0" }}>
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" style={{ marginBottom: 6 }}>
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
              {breadcrumbs.map((crumb, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {i > 0 && <ChevronRight size={12} style={{ color: "#94A3B8" }} aria-hidden />}
                  {crumb.to ? (
                    <Link to={crumb.to} style={{ color: "#64748B", ...GF, fontSize: 12, textDecoration: "none" }} className="breadcrumb-link">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span style={{ color: "#0F172A", ...GF, fontSize: 12, fontWeight: 500 }} aria-current="page">
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: description ? 4 : (tabs ? 0 : 16) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ color: "#0F172A", ...GF, fontSize: compact ? 18 : 22, fontWeight: 800, margin: 0, letterSpacing: "-0.02em", textWrap: "balance" }}>
              {title}
            </h1>
            {status && <div>{status}</div>}
          </div>

          {/* Actions */}
          {(primaryAction || secondaryActions) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {secondaryActions}
              {primaryAction}
            </div>
          )}
        </div>

        {/* Description */}
        {description && (
          <p style={{ color: "#64748B", ...GF, fontSize: 14, margin: "0 0 16px", lineHeight: 1.6, maxWidth: 640 }}>
            {description}
          </p>
        )}
      </div>

      {/* Tabs */}
      {tabs && (
        <div style={{ padding: "0 24px" }}>
          {tabs}
        </div>
      )}

      <style>{`
        .breadcrumb-link:hover { color: #0078D4 !important; }
      `}</style>
    </div>
  );
}

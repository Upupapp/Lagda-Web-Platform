// Standardized platform page error state.
// Used when a page-level operation fails (API error, not-found, permission-denied).
// Pure inline styles — no Tailwind.

import { Link } from "react-router";
import type { ReactNode } from "react";

const GF = { fontFamily: "'Geist', sans-serif" };

type ErrorKind =
  | "generic"
  | "not-found"
  | "permission-denied"
  | "session-expired"
  | "service-unavailable"
  | "empty-results";

interface PageErrorProps {
  kind?: ErrorKind;
  title?: string;
  description?: string;
  action?: ReactNode;
  onRetry?: () => void;
}

const KIND_CONFIG: Record<ErrorKind, { icon: string; title: string; description: string }> = {
  "generic": {
    icon: "⚠️",
    title: "Something went wrong",
    description: "We couldn't complete this request. Please try again or return to the dashboard.",
  },
  "not-found": {
    icon: "🔍",
    title: "Not Found",
    description: "The item you're looking for doesn't exist or may have been moved.",
  },
  "permission-denied": {
    icon: "🔒",
    title: "Permission Required",
    description: "You don't have access to this page. Contact your workspace administrator.",
  },
  "session-expired": {
    icon: "🕐",
    title: "Session Expired",
    description: "Your session has ended. Please sign in again to continue.",
  },
  "service-unavailable": {
    icon: "🔌",
    title: "Service Unavailable",
    description: "This service is temporarily unavailable. Please try again in a moment.",
  },
  "empty-results": {
    icon: "📄",
    title: "No Results",
    description: "No items match your current search or filter criteria.",
  },
};

export function PageError({ kind = "generic", title, description, action, onRetry }: PageErrorProps) {
  const cfg = KIND_CONFIG[kind];
  const heading = title ?? cfg.title;
  const body = description ?? cfg.description;

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px",
        textAlign: "center",
      }}
    >
      <div aria-hidden="true" style={{ fontSize: 40, marginBottom: 16, lineHeight: 1 }}>
        {cfg.icon}
      </div>

      <h2 style={{ ...GF, margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#07111F" }}>
        {heading}
      </h2>

      <p style={{ ...GF, margin: "0 0 28px", fontSize: 14, color: "#64748B", lineHeight: 1.6, maxWidth: 400 }}>
        {body}
      </p>

      {action ?? (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                ...GF,
                fontSize: 14,
                fontWeight: 600,
                color: "#ffffff",
                background: "#0078D4",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                cursor: "pointer",
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#006CC1"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#0078D4"; }}
            >
              Try Again
            </button>
          )}
          <Link
            to="/app/dashboard"
            style={{
              ...GF,
              fontSize: 14,
              fontWeight: 600,
              color: "#64748B",
              background: "#F1F5F9",
              borderRadius: 8,
              padding: "10px 20px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Return to Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Inline section-level error (non-page) ──────────────────────────────────
interface SectionErrorProps {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function SectionError({ message, onRetry, compact = false }: SectionErrorProps) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: compact ? "center" : "flex-start",
        gap: 10,
        padding: compact ? "10px 14px" : "14px 16px",
        background: "#FEE2E2",
        border: "1px solid #FECACA",
        borderRadius: 8,
        ...GF,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
      <span style={{ fontSize: 13, color: "#7F1D1D", flex: 1, lineHeight: 1.5 }}>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            ...GF,
            fontSize: 12,
            fontWeight: 600,
            color: "#DC2626",
            background: "none",
            border: "1px solid #FECACA",
            borderRadius: 6,
            padding: "4px 10px",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

// Empty state — always includes a clear heading and CTA, never just "No items."
// Pure inline styles only — no Tailwind classes.
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "default" | "muted";
}

const GF = { fontFamily: "'Geist', sans-serif" };

export function EmptyState({ icon, title, description, action, tone = "default" }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        textAlign: "center",
        opacity: tone === "muted" ? 0.75 : 1,
      }}
    >
      {icon && (
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 52,
            height: 52,
            borderRadius: 12,
            background: "#EAF6FF",
            color: "#0078D4",
            marginBottom: 16,
          }}
        >
          {icon}
        </div>
      )}

      <h3
        style={{
          ...GF,
          margin: "0 0 6px",
          fontSize: 16,
          fontWeight: 600,
          color: "#07111F",
        }}
      >
        {title}
      </h3>

      {description && (
        <p
          style={{
            ...GF,
            margin: action ? "0 0 20px" : 0,
            fontSize: 14,
            color: "#64748B",
            lineHeight: 1.6,
            maxWidth: 360,
          }}
        >
          {description}
        </p>
      )}

      {action && <div>{action}</div>}
    </div>
  );
}

// Shared empty-state component for document lists, search results, etc.
// Always includes a clear heading and CTA — never just "No items."
import type { ReactNode } from "react";
import { cn } from "./utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "default" | "muted";
  className?: string;
}

export function EmptyState({ icon, title, description, action, tone = "default", className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        tone === "muted" && "opacity-75",
        className,
      )}
    >
      {icon && (
        <div
          className="mb-4 flex items-center justify-center rounded-xl p-3"
          style={{
            background: "#EAF6FF",
            color: "#0078D4",
            width: 52,
            height: 52,
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      <h3
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 600,
          color: "#07111F",
          fontFamily: "'Geist', sans-serif",
          marginBottom: 6,
        }}
      >
        {title}
      </h3>

      {description && (
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: "#64748B",
            fontFamily: "'Geist', sans-serif",
            lineHeight: 1.6,
            maxWidth: 360,
            marginBottom: action ? 20 : 0,
          }}
        >
          {description}
        </p>
      )}

      {action && <div>{action}</div>}
    </div>
  );
}

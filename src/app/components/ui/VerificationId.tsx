// Monospace display for verification IDs, transaction IDs, and technical values.
// Uses Geist Mono for legibility and tabular numerals for alignment.
import { cn } from "./utils";

interface VerificationIdProps {
  id: string;
  prefix?: string;
  label?: string;
  truncate?: boolean;
  copyable?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function VerificationId({
  id,
  prefix,
  label,
  truncate = false,
  size = "md",
  className,
}: VerificationIdProps) {
  const displayId = prefix ? `${prefix}${id}` : id;
  const truncatedId = truncate
    ? `${displayId.slice(0, 8)}…${displayId.slice(-6)}`
    : displayId;

  return (
    <span
      className={cn("inline-flex flex-col gap-0.5 items-start", className)}
      title={truncate ? displayId : undefined}
    >
      {label && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "#94A3B8",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontFamily: "'Geist Mono', monospace",
          }}
        >
          {label}
        </span>
      )}
      <code
        aria-label={label ? `${label}: ${id}` : id}
        style={{
          fontFamily: "'Geist Mono', 'Courier New', monospace",
          fontVariantNumeric: "tabular-nums",
          fontSize: size === "sm" ? 11 : size === "lg" ? 15 : 13,
          color: "#334155",
          background: "#f3f3f5",
          border: "1px solid rgba(0,0,0,0.07)",
          borderRadius: 4,
          padding: size === "sm" ? "1px 6px" : "2px 8px",
          letterSpacing: "0.03em",
          lineHeight: 1.5,
          display: "inline-block",
          userSelect: "all",
        }}
      >
        {truncatedId}
      </code>
    </span>
  );
}

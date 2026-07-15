// Centralized document/workflow status presentation.
// Never uses color as the only signal — every status has a label.
// Maps TransactionStatus values from src/app/models/index.ts.
import type { TransactionStatus } from "../../models";
import { DOCUMENT_STATUS_MAP } from "../../data/status-map";
import { cn } from "./utils";

interface StatusChipProps {
  status: TransactionStatus;
  showIcon?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function StatusChip({ status, showIcon = true, size = "md", className }: StatusChipProps) {
  const presentation = DOCUMENT_STATUS_MAP[status];
  if (!presentation) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600", className)}>
        {status}
      </span>
    );
  }

  const { label, bgColor, textColor, borderColor, icon } = presentation;
  const iconSize = size === "sm" ? 10 : 12;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        className,
      )}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        border: `1px solid ${borderColor}`,
      }}
      aria-label={`Status: ${label}`}
    >
      {showIcon && icon && (
        <span
          aria-hidden="true"
          style={{
            width: iconSize,
            height: iconSize,
            borderRadius: "50%",
            backgroundColor: textColor,
            opacity: 0.7,
            flexShrink: 0,
            display: "inline-block",
          }}
        />
      )}
      {label}
    </span>
  );
}

// eNotary Coming Soon badge.
// Must always include visible "Coming Soon" text — do not rely on color or icon alone.
// Legal constraint: never suggest eNotary is live, active, or purchasable.
import type React from "react";
import { cn } from "./utils";
import { APP_CONFIG } from "../../config/app.config";

interface ComingSoonBadgeProps {
  /** Show the full legal disclaimer (use on eNotary feature cards and pages) */
  showDisclaimer?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
}

export function ComingSoonBadge({
  showDisclaimer = false,
  size = "md",
  className,
  style,
}: ComingSoonBadgeProps) {
  return (
    <span className={cn("inline-flex flex-col gap-1 items-start", className)} style={style}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide",
          size === "sm"  && "px-2 py-0.5 text-[10px]",
          size === "md"  && "px-2.5 py-1 text-[11px]",
          size === "lg"  && "px-3 py-1 text-xs",
        )}
        style={{
          background: "#FCE7F3",
          color: "#67023B",
          border: "1px solid #F9A8D4",
          letterSpacing: "0.08em",
        }}
      >
        {/* Dot indicator */}
        <span
          aria-hidden="true"
          style={{
            width: size === "lg" ? 7 : 6,
            height: size === "lg" ? 7 : 6,
            borderRadius: "50%",
            backgroundColor: "#B01262",
            flexShrink: 0,
            display: "inline-block",
          }}
        />
        Coming Soon
      </span>

      {showDisclaimer && (
        <p
          style={{
            margin: 0,
            fontSize: 11,
            color: "#67023B",
            fontFamily: "'Geist', sans-serif",
            lineHeight: 1.5,
            maxWidth: 320,
          }}
        >
          {APP_CONFIG.legal.enotaryDisclaimer}
        </p>
      )}
    </span>
  );
}

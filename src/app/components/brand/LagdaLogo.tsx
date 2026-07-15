// Official LAGDA logo component.
//
// Image-first: serves official PNG files from /brand/ (public folder).
// Falls back to inline SVG placeholder until official PNGs are present.
// To activate official logos: drop files into public/brand/ — no code change needed.
//
// Variants:
//   colored-horizontal  — colored icon + Deep Navy wordmark   (light backgrounds)
//   white-horizontal    — white icon + White wordmark          (dark/navy backgrounds)
//   black-horizontal    — mono icon + Black wordmark           (monochrome/print)
//   colored-icon        — colored square, no wordmark          (compact contexts)
//   white-icon          — white square, no wordmark            (dark compact contexts)
//   mono-icon           — navy square, no wordmark             (monochrome compact)
//   stacked-colored     — colored icon + centered wordmark     (presentations, social)

import { useState } from "react";

export type LogoVariant =
  | "colored-horizontal"
  | "white-horizontal"
  | "black-horizontal"
  | "colored-icon"
  | "white-icon"
  | "mono-icon"
  | "stacked-colored";

export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

interface LagdaLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  /** Pass true when an adjacent visible label makes the logo decorative */
  decorative?: boolean;
  /** Override the alt text (default: "LAGDA") */
  alt?: string;
  className?: string;
}

// Official PNG files served from /public/brand/.
// Drop the files there; they take effect immediately with no code change.
const PNG_SRCS: Partial<Record<LogoVariant, string>> = {
  "colored-horizontal": "/brand/Lagda-colored-logo-horizontal-whitebg-withtext.png",
  "white-horizontal":   "/brand/Lagda-white-logo-horizontal-bluebg-withtext.png",
  "black-horizontal":   "/brand/Lagda-black-logo-horizontal-whitebg-withtext.png",
  "colored-icon":       "/brand/Lagda-colored-logo-square-whitebg-withouttext.png",
  "white-icon":         "/brand/Lagda-white-logo-square-bluebg-withouttext.png",
  "stacked-colored":    "/brand/Lagda-colored-logo-square-whitebg-withtext.png",
};

// Placeholder SVG path used until official PNGs land.
// This is NOT the official logo geometry — it is a shield placeholder only.
const PLACEHOLDER_PATH =
  "M20 9C20.1761 9 20.3347 9.03884 20.4609 9.09766L20.5762 9.16211C23.3215 11.0792 27.2476 12.5996 30.5 12.5996C30.6958 12.5996 30.8502 12.6643 30.9355 12.7324C30.9755 12.7644 30.9926 12.7903 30.998 12.8008C30.9989 12.8024 30.9996 12.8037 31 12.8047V21.1982C31 23.8536 29.8587 25.8341 27.9609 27.3916C26.0274 28.9784 23.3127 30.1167 20.248 30.9717C20.1003 31.0116 19.9352 31.0087 19.791 30.9658L19.7812 30.9629L19.7715 30.9609L19.1992 30.7979C16.3603 29.9677 13.8563 28.8766 12.041 27.3896C10.1418 25.8338 9 23.8536 9 21.1982V12.8047C9.00042 12.8037 9.00111 12.8024 9.00195 12.8008C9.00738 12.7903 9.02447 12.7644 9.06445 12.7324C9.14978 12.6643 9.3042 12.5996 9.5 12.5996C12.7531 12.5996 16.6943 11.0667 19.4238 9.16211C19.561 9.06836 19.7652 9 20 9ZM18.5 21.1162L16.125 19.2168L14.875 20.7793L17.875 23.1787L18.5 23.6777L19.125 23.1787L25.125 18.3789L24.5 17.5986L23.875 16.8174L18.5 21.1162Z";

const ICON_SIZES: Record<LogoSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

const WORDMARK_SIZES: Record<LogoSize, { name: number; tagline: number; gap: number }> = {
  xs: { name: 13, tagline: 6,  gap: 6  },
  sm: { name: 17, tagline: 7,  gap: 8  },
  md: { name: 20, tagline: 9,  gap: 10 },
  lg: { name: 24, tagline: 10, gap: 12 },
  xl: { name: 32, tagline: 12, gap: 16 },
};

interface IconConfig {
  rectFill: string;
  strokeColor: string;
}

const ICON_CONFIGS: Record<LogoVariant, IconConfig> = {
  "colored-horizontal": { rectFill: "#0078D4", strokeColor: "#ffffff" },
  "white-horizontal":   { rectFill: "#0078D4", strokeColor: "#ffffff" },
  "black-horizontal":   { rectFill: "#07111F", strokeColor: "#ffffff" },
  "colored-icon":       { rectFill: "#0078D4", strokeColor: "#ffffff" },
  "white-icon":         { rectFill: "rgba(255,255,255,0.12)", strokeColor: "#ffffff" },
  "mono-icon":          { rectFill: "#07111F", strokeColor: "#ffffff" },
  "stacked-colored":    { rectFill: "#0078D4", strokeColor: "#ffffff" },
};

interface WordmarkConfig {
  nameColor: string;
  taglineColor: string;
  align: "left" | "center";
}

const WORDMARK_CONFIGS: Record<LogoVariant, WordmarkConfig | null> = {
  "colored-horizontal": { nameColor: "#07111F", taglineColor: "#0078D4", align: "left" },
  "white-horizontal":   { nameColor: "#ffffff", taglineColor: "#60A5FA", align: "left" },
  "black-horizontal":   { nameColor: "#07111F", taglineColor: "#334155", align: "left" },
  "colored-icon": null,
  "white-icon":   null,
  "mono-icon":    null,
  "stacked-colored": { nameColor: "#07111F", taglineColor: "#0078D4", align: "center" },
};

function imgStyle(variant: LogoVariant, iconSize: number): React.CSSProperties {
  if (variant === "stacked-colored") {
    return { height: Math.round(iconSize * 1.6), width: "auto", display: "block" };
  }
  if (variant.endsWith("-icon")) {
    return { width: iconSize, height: iconSize, objectFit: "contain", display: "block" };
  }
  // horizontal
  return { height: iconSize, width: "auto", display: "block" };
}

export function LagdaLogo({
  variant = "colored-horizontal",
  size = "md",
  decorative = false,
  alt = "LAGDA",
  className,
}: LagdaLogoProps) {
  const [imgErr, setImgErr] = useState(false);

  const iconSize = ICON_SIZES[size];
  const iconCfg  = ICON_CONFIGS[variant];
  const wordCfg  = WORDMARK_CONFIGS[variant];
  const wordSz   = WORDMARK_SIZES[size];
  const rx        = Math.round(iconSize * 0.2);
  const pngSrc   = PNG_SRCS[variant];

  const wrapperProps = {
    className,
    role: decorative ? undefined : "img" as const,
    "aria-label": decorative ? undefined : alt,
  };

  // ── Official PNG (image-first) ──────────────────────────────────────────────
  if (pngSrc && !imgErr) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }} {...wrapperProps}>
        <img
          src={pngSrc}
          alt=""
          aria-hidden="true"
          style={imgStyle(variant, iconSize)}
          onError={() => setImgErr(true)}
          draggable={false}
        />
      </span>
    );
  }

  // ── SVG fallback (used until official PNGs land in public/brand/) ───────────
  const placeholderIcon = (
    <svg
      fill="none"
      viewBox="0 0 40 40"
      width={iconSize}
      height={iconSize}
      style={{ flexShrink: 0 }}
      aria-hidden="true"
      focusable="false"
    >
      <rect fill={iconCfg.rectFill} height="40" rx={rx} width="40" />
      <path d={PLACEHOLDER_PATH} stroke={iconCfg.strokeColor} strokeWidth="2" />
    </svg>
  );

  // Icon-only variants
  if (!wordCfg) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }} {...wrapperProps}>
        {placeholderIcon}
      </span>
    );
  }

  // Stacked variant (icon above centered wordmark)
  if (variant === "stacked-colored") {
    return (
      <span
        style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: wordSz.gap * 0.6, flexShrink: 0 }}
        {...wrapperProps}
      >
        {placeholderIcon}
        <span
          style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}
          aria-hidden="true"
        >
          <span style={{ fontFamily: "'Geist', 'Inter', sans-serif", fontWeight: 800, fontSize: wordSz.name, color: wordCfg.nameColor, letterSpacing: "0.12em", marginBottom: -2 }}>
            LAGDA
          </span>
          <span style={{ fontFamily: "'Geist Mono', 'Courier New', monospace", fontWeight: 600, fontSize: wordSz.tagline, color: wordCfg.taglineColor, letterSpacing: "0.2em" }}>
            BY UPUP TECHNOLOGIES
          </span>
        </span>
      </span>
    );
  }

  // Horizontal variants (icon + wordmark side by side)
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: wordSz.gap, flexShrink: 0 }}
      {...wrapperProps}
    >
      {placeholderIcon}
      <span
        style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}
        aria-hidden="true"
      >
        <span
          style={{
            fontFamily: "'Geist', 'Inter', sans-serif",
            fontWeight: 800,
            fontSize: wordSz.name,
            color: wordCfg.nameColor,
            letterSpacing: "0.12em",
            marginBottom: -2,
          }}
        >
          LAGDA
        </span>
        <span
          style={{
            fontFamily: "'Geist Mono', 'Courier New', monospace",
            fontWeight: 600,
            fontSize: wordSz.tagline,
            color: wordCfg.taglineColor,
            letterSpacing: "0.2em",
          }}
        >
          BY UPUP TECHNOLOGIES
        </span>
      </span>
    </span>
  );
}

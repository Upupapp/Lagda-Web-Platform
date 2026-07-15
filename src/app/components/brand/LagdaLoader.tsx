// Branded loading component using the official LAGDA shield mark.
//
// Modes:
//   fullscreen — Centered overlay, brand sequence (~2.6s), optional wordmark fade-in
//   inline     — Small spinner area, subtle, non-blocking
//   button     — Minimal, fits inside a button control
//
// Animation uses CSS keyframes (no JS animation library required).
// Framer Motion is available in the project but not needed here —
// CSS animations are lighter and degrade gracefully with reduced motion.

import { useEffect, useState } from "react";
import { APP_CONFIG } from "../../config/app.config";

export type LoaderMode = "fullscreen" | "inline" | "button";
export type LoaderTheme = "dark" | "light";

interface LagdaLoaderProps {
  mode?: LoaderMode;
  theme?: LoaderTheme;
  message?: string;
  showWordmark?: boolean;
  size?: number;
  ariaLabel?: string;
  className?: string;
}

const SHIELD_PATH =
  "M20 9C20.1761 9 20.3347 9.03884 20.4609 9.09766L20.5762 9.16211C23.3215 11.0792 27.2476 12.5996 30.5 12.5996C30.6958 12.5996 30.8502 12.6643 30.9355 12.7324C30.9755 12.7644 30.9926 12.7903 30.998 12.8008C30.9989 12.8024 30.9996 12.8037 31 12.8047V21.1982C31 23.8536 29.8587 25.8341 27.9609 27.3916C26.0274 28.9784 23.3127 30.1167 20.248 30.9717C20.1003 31.0116 19.9352 31.0087 19.791 30.9658L19.7812 30.9629L19.7715 30.9609L19.1992 30.7979C16.3603 29.9677 13.8563 28.8766 12.041 27.3896C10.1418 25.8338 9 23.8536 9 21.1982V12.8047C9.00042 12.8037 9.00111 12.8024 9.00195 12.8008C9.00738 12.7903 9.02447 12.7644 9.06445 12.7324C9.14978 12.6643 9.3042 12.5996 9.5 12.5996C12.7531 12.5996 16.6943 11.0667 19.4238 9.16211C19.561 9.06836 19.7652 9 20 9ZM18.5 21.1162L16.125 19.2168L14.875 20.7793L17.875 23.1787L18.5 23.6777L19.125 23.1787L25.125 18.3789L24.5 17.5986L23.875 16.8174L18.5 21.1162Z";

// ── CSS keyframes as a style string ─────────────────────────────────────────
const LOADER_STYLES = `
@keyframes lagda-icon-entrance {
  0%   { opacity: 0; transform: scale(0.94); }
  40%  { opacity: 1; transform: scale(1.00); }
  100% { opacity: 1; transform: scale(1.00); }
}

@keyframes lagda-gold-sweep {
  0%   { opacity: 0; transform: translateX(-100%) rotate(-25deg); }
  25%  { opacity: 0.55; }
  60%  { opacity: 0.55; }
  100% { opacity: 0; transform: translateX(100%) rotate(-25deg); }
}

@keyframes lagda-azure-pulse {
  0%, 100% { opacity: 0; }
  50%       { opacity: 0.18; }
}

@keyframes lagda-wordmark-in {
  0%   { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes lagda-inline-spin {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes lagda-subtle-pulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  @keyframes lagda-icon-entrance {
    0%, 100% { opacity: 1; transform: scale(1); }
  }
  @keyframes lagda-gold-sweep    { 0%, 100% { opacity: 0; } }
  @keyframes lagda-azure-pulse   { 0%, 100% { opacity: 0; } }
  @keyframes lagda-wordmark-in   { 0%, 100% { opacity: 1; transform: none; } }
  @keyframes lagda-inline-spin   { 0%, 100% { transform: rotate(0deg); } }
  @keyframes lagda-subtle-pulse  { 0%, 100% { opacity: 1; } }
}
`;

// ── Button mode ──────────────────────────────────────────────────────────────
function ButtonLoader({ theme = "dark", ariaLabel }: Pick<LagdaLoaderProps, "theme" | "ariaLabel">) {
  const ringColor = theme === "dark" ? "rgba(255,255,255,0.15)" : "rgba(0,120,212,0.15)";
  const dotColor  = theme === "dark" ? "#ffffff" : "#0078D4";
  return (
    <span
      role="status"
      aria-label={ariaLabel ?? "Loading"}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16 }}
    >
      <style>{LOADER_STYLES}</style>
      <span
        style={{
          display: "block",
          width: 14,
          height: 14,
          borderRadius: "50%",
          border: `2px solid ${ringColor}`,
          borderTopColor: dotColor,
          animation: "lagda-inline-spin 0.7s linear infinite",
        }}
        aria-hidden="true"
      />
    </span>
  );
}

// ── Inline mode ──────────────────────────────────────────────────────────────
function InlineLoader({
  size = 32,
  theme = "dark",
  message,
  ariaLabel,
}: Pick<LagdaLoaderProps, "size" | "theme" | "message" | "ariaLabel">) {
  const iconSize = size ?? 32;
  const rx = Math.round(iconSize * 0.2);
  const textColor = theme === "dark" ? "#94A3B8" : "#64748B";

  return (
    <div
      role="status"
      aria-label={ariaLabel ?? (message ?? "Loading LAGDA")}
      aria-live="polite"
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8 }}
    >
      <style>{LOADER_STYLES}</style>
      <div style={{ position: "relative", width: iconSize, height: iconSize, animation: "lagda-subtle-pulse 1.8s ease-in-out infinite" }} aria-hidden="true">
        <svg fill="none" viewBox="0 0 40 40" width={iconSize} height={iconSize} style={{ display: "block" }}>
          <rect fill="#0078D4" height="40" rx={rx} width="40" />
          <path d={SHIELD_PATH} stroke="white" strokeWidth="2" />
        </svg>
      </div>
      {message && (
        <p style={{ margin: 0, fontSize: 12, color: textColor, fontFamily: "'Geist Mono', monospace", letterSpacing: "0.05em" }}>
          {message}
        </p>
      )}
    </div>
  );
}

// ── Fullscreen mode ──────────────────────────────────────────────────────────
function FullscreenLoader({
  message,
  showWordmark = true,
  theme = "dark",
  ariaLabel,
}: Pick<LagdaLoaderProps, "message" | "showWordmark" | "theme" | "ariaLabel">) {
  const [wordmarkVisible, setWordmarkVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setWordmarkVisible(true), 900);
    return () => clearTimeout(t);
  }, []);

  const bg       = theme === "dark" ? "#07111F" : "#ffffff";
  const msgColor = theme === "dark" ? "#64748B" : "#94A3B8";
  const nameColor   = theme === "dark" ? "#ffffff" : "#07111F";
  const tagColor    = theme === "dark" ? "#0078D4" : "#0078D4";

  return (
    <div
      role="status"
      aria-label={ariaLabel ?? "Loading LAGDA"}
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        background: bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        zIndex: 9999,
        fontFamily: "'Geist', sans-serif",
      }}
    >
      <style>{LOADER_STYLES}</style>

      {/* Icon with animation layers */}
      <div style={{ position: "relative", width: 64, height: 64 }} aria-hidden="true">
        {/* Base icon — entrance animation */}
        <div style={{ animation: "lagda-icon-entrance 0.8s cubic-bezier(0.4,0,0.2,1) both" }}>
          <svg fill="none" viewBox="0 0 40 40" width="64" height="64" style={{ display: "block" }}>
            <rect fill="#0078D4" height="40" rx="8" width="40" />
            <path d={SHIELD_PATH} stroke="white" strokeWidth="2" />
          </svg>
        </div>

        {/* Gold sweep overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 13,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-20%",
              left: 0,
              width: "60%",
              height: "140%",
              background: "linear-gradient(90deg, transparent 0%, rgba(201,150,12,0.65) 50%, transparent 100%)",
              animation: "lagda-gold-sweep 2.6s cubic-bezier(0.4,0,0.2,1) 0.4s both",
            }}
          />
        </div>

        {/* Azure illumination pulse */}
        <div
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: 16,
            background: "radial-gradient(circle, rgba(0,120,212,0.4) 0%, transparent 70%)",
            animation: "lagda-azure-pulse 2.6s ease-in-out 0.3s both",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            opacity: wordmarkVisible ? 1 : 0,
            transform: wordmarkVisible ? "translateY(0)" : "translateY(6px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
          aria-hidden="true"
        >
          <span
            style={{
              fontFamily: "'Geist', sans-serif",
              fontWeight: 800,
              fontSize: 20,
              color: nameColor,
              letterSpacing: "0.12em",
            }}
          >
            LAGDA
          </span>
          <span
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontWeight: 600,
              fontSize: 9,
              color: tagColor,
              letterSpacing: "0.2em",
            }}
          >
            BY UPUP TECHNOLOGIES
          </span>
        </div>
      )}

      {/* Optional message */}
      {message && (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: msgColor,
            fontFamily: "'Geist Mono', monospace",
            letterSpacing: "0.05em",
            opacity: wordmarkVisible ? 1 : 0,
            transition: "opacity 0.5s ease 0.2s",
          }}
          aria-live="polite"
        >
          {message}
        </p>
      )}

      {/* Screen reader text */}
      <span className="sr-only">{ariaLabel ?? APP_CONFIG.name}</span>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export function LagdaLoader({
  mode = "inline",
  theme = "dark",
  message,
  showWordmark = true,
  size,
  ariaLabel,
  className,
}: LagdaLoaderProps) {
  if (mode === "button") return <ButtonLoader theme={theme} ariaLabel={ariaLabel} />;
  if (mode === "fullscreen") {
    return (
      <FullscreenLoader
        message={message}
        showWordmark={showWordmark}
        theme={theme}
        ariaLabel={ariaLabel}
      />
    );
  }
  return (
    <div className={className}>
      <InlineLoader size={size ?? 32} theme={theme} message={message} ariaLabel={ariaLabel} />
    </div>
  );
}

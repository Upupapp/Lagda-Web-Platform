import { useState } from "react";
import { Link } from "react-router";

export interface AnnouncementBannerProps {
  message: string;
  linkLabel?: string;
  linkPath?: string;
  tone?: "info" | "warning" | "enotary";
  dismissible?: boolean;
}

const TONE_STYLES = {
  info: {
    bg: "rgba(0,120,212,0.12)",
    border: "rgba(0,120,212,0.25)",
    text: "#38bdf8",
    linkColor: "#0078D4",
  },
  warning: {
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.25)",
    text: "#f59e0b",
    linkColor: "#f59e0b",
  },
  enotary: {
    bg: "rgba(103,2,59,0.15)",
    border: "rgba(176,18,98,0.3)",
    text: "#fce7f3",
    linkColor: "#b01262",
  },
};

export function AnnouncementBanner({
  message,
  linkLabel,
  linkPath,
  tone = "info",
  dismissible = true,
}: AnnouncementBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const s = TONE_STYLES[tone];
  const GF = { fontFamily: "'Geist', sans-serif" };

  return (
    <div
      role="banner"
      aria-label="Site announcement"
      style={{
        background: s.bg,
        borderBottom: `1px solid ${s.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "8px 20px",
        position: "relative",
        zIndex: 60,
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: s.text, ...GF, textAlign: "center" }}>
        {message}
        {linkLabel && linkPath && (
          <>
            {" "}
            <Link
              to={linkPath}
              style={{ color: s.linkColor, fontWeight: 600, textDecoration: "underline" }}
            >
              {linkLabel}
            </Link>
          </>
        )}
      </p>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss announcement"
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            color: s.text,
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: "4px 6px",
            opacity: 0.6,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

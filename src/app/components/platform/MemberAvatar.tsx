// A workspace member's face: their photo when they have one, otherwise their
// initials on a colour picked from their name (the same person is always the
// same colour). Used by People & Teams and the activity log.

import { useEffect, useState } from "react";

const TONES = ["#0078D4", "#7C3AED", "#0F766E", "#B45309", "#BE185D", "#1D4ED8", "#15803D", "#9333EA"];

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]![0] ?? "" : "";
  return (first + last).toUpperCase();
}

function toneFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length]!;
}

export function MemberAvatar({ name, url, size = 32, ring = false, testId }: {
  name: string;
  url?: string | undefined;
  size?: number;
  /** A white ring, for faces laid over a coloured card or stacked together. */
  ring?: boolean;
  testId?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [url]);
  const photo = !!url && !failed;
  return (
    <span data-testid={testId} data-photo={photo ? "true" : "false"} style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: photo ? "#FFFFFF" : toneFor(name), color: "#FFFFFF",
      fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: Math.max(9, Math.round(size * 0.38)),
      border: ring ? "2px solid #FFFFFF" : "none",
      boxShadow: ring ? "0 1px 4px rgba(7,17,31,0.18)" : undefined,
    }}>
      {photo
        ? <img src={url} alt="" onError={() => { setFailed(true); }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <span aria-hidden>{initialsFor(name)}</span>}
    </span>
  );
}

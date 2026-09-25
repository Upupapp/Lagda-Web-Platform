// The signed-in person's avatar: their profile photo when they have one,
// their initials otherwise. One component, so every place that draws the
// user draws the SAME thing — and a new photo, which is a new versioned URL
// on the session user, shows up everywhere at once.

import { useEffect, useState } from "react";
import type { UserSummary } from "../../models";

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(w => w.length > 0);
  const first = words[0];
  if (first === undefined) return "?";
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  return `${first[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

export function UserAvatar({ user, size, fontSize }: {
  user: Pick<UserSummary, "displayName" | "avatarUrl">;
  size: number;
  fontSize: number;
}) {
  // A broken image (deleted elsewhere, a network blip) falls back to the
  // initials rather than an empty circle. Reset when the photo changes.
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [user.avatarUrl]);

  const circle = {
    width: size, height: size, borderRadius: "50%", flexShrink: 0,
  } as const;

  if (user.avatarUrl !== undefined && !broken) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        aria-hidden
        onError={() => { setBroken(true); }}
        style={{ ...circle, objectFit: "cover", display: "block" }}
      />
    );
  }
  return (
    <div aria-hidden style={{
      ...circle, background: "#EAF6FF",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Geist Mono', monospace", fontSize, color: "#0078D4", fontWeight: 700,
    }}>
      {initialsOf(user.displayName)}
    </div>
  );
}

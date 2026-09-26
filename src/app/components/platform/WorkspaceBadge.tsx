// A workspace's badge: its logo when one is saved (082), otherwise its
// initials on its brand colour (or the workspace's default colour). A logo
// that fails to load falls back to the initials rather than a broken image.

import React, { useEffect, useState } from "react";
import type { PlatformWorkspace } from "../../models";

const GM = { fontFamily: "'Geist Mono', monospace" };

export function WorkspaceBadge({
  workspace, size, radius, fontSize,
}: {
  workspace: Pick<PlatformWorkspace, "initials" | "accentColor" | "brandColor" | "logoUrl" | "name">;
  size: number;
  radius: number;
  fontSize: number;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [workspace.logoUrl]);
  const background = workspace.brandColor ?? workspace.accentColor;

  if (workspace.logoUrl && !broken) {
    return (
      <span style={{
        width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: "hidden",
        background: "#FFFFFF", border: "1px solid #E3E8EF", boxSizing: "border-box",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}>
        <img
          src={workspace.logoUrl}
          alt=""
          onError={() => { setBroken(true); }}
          style={{ maxWidth: "88%", maxHeight: "88%", objectFit: "contain", display: "block" }}
        />
      </span>
    );
  }
  return (
    <span aria-hidden style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0, background,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      ...GM, fontSize, color: "#FFFFFF", fontWeight: 700,
    }}>
      {workspace.initials}
    </span>
  );
}

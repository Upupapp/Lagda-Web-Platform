// A route guard for a plain feature flag.
//
// ── Why this is not CapabilityGuard ───────────────────────────────────────
//
// CapabilityGuard answers "is this product capability available to this
// workspace, given its plan, profile and permissions", and renders an
// explanatory screen naming the reason. That is the right shape for something
// a customer could obtain — Bulk Send on a higher plan, say.
//
// These flags are a different question. They hide surfaces that exist only as
// frontend demonstrations and that no customer can unlock, because there is
// nothing behind them to unlock. Showing someone a considered "this feature is
// unavailable on your plan" page for a screen that will never be sold to them
// would be a worse lie than the demonstration was.
//
// So this redirects instead: with the flag off, the route simply is not part
// of the application.
//
// ── Why a redirect and not a 404 ──────────────────────────────────────────
//
// `replace` matters. These paths are reachable from stale links, bookmarks and
// the browser's own autocomplete. A pushed history entry would leave the user
// pressing Back into a route that bounces them forward again.

import { Navigate } from "react-router";
import { type ReactNode } from "react";
import { usePlatform } from "../../context/PlatformContext";
import type { PlatformFeatureFlag } from "../../models";

export interface FeatureGuardProps {
  flag: PlatformFeatureFlag;
  /** Where to send someone who lands here with the flag off. */
  fallback?: string;
  children: ReactNode;
}

export function FeatureGuard({
  flag,
  fallback = "/app/dashboard",
  children,
}: FeatureGuardProps) {
  const { hasFlag } = usePlatform();

  if (!hasFlag(flag)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}

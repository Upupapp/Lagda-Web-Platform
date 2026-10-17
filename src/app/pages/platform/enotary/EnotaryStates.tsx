// What every eNotary page says while it loads, when it cannot load, and
// where eNotary is not offered to this account.

import { Link } from "react-router";
import { AlertTriangle, RefreshCw } from "lucide-react";
import {
  ActionButton, ActionRow, Notice, GF, T,
} from "../../../components/system/design-system";
import { EnotaryFrame } from "./EnotaryChrome";

/** Said wherever eNotary is not offered to this account. */
export function EnotaryNotOffered() {
  return (
    <EnotaryFrame tone="neutral" description="Not available on this account yet.">
      <p style={{ ...GF, margin: 0, fontSize: 14 }}>
        <Link to="/app/dashboard" style={{ color: T.azureDeep, fontWeight: 700 }}>Back to Home</Link>
      </p>
    </EnotaryFrame>
  );
}

export function EnotaryLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <EnotaryFrame tone="neutral">
      <div role="status" aria-live="polite" style={{ minHeight: 216 }}>
        <p style={{ ...GF, margin: 0, fontSize: 14, color: T.inkSoft }}>{label}</p>
      </div>
    </EnotaryFrame>
  );
}

export function EnotaryLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <EnotaryFrame tone="neutral">
      <Notice icon={AlertTriangle} tone="danger">This page could not be loaded. Check your connection and try again.</Notice>
      <ActionRow><ActionButton icon={RefreshCw} kind="secondary" onClick={onRetry}>Try again</ActionButton></ActionRow>
    </EnotaryFrame>
  );
}

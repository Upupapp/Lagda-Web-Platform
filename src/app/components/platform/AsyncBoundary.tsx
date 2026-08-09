// Renders the three states of an async read: loading, failed, ready.
//
// Pairs with `useAsyncData`. The point is that a surface cannot accidentally
// ship two of the three — the commonest omission being the failure branch,
// which is invisible until something actually fails and then presents as a
// permanent spinner.

import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { AsyncStatus } from "../../hooks/useAsyncData";

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const SLATE = "#64748B";
const SLATE_DARK = "#334155";
const BORDER = "#E2E8F0";

// ── Skeletons ────────────────────────────────────────────────────────────────
// Preferred over a spinner: a skeleton reserves the space the content will take,
// so the page does not jump when it arrives. `aria-hidden` because the shapes
// mean nothing read aloud — the live region on the boundary announces instead.

export function SkeletonLine({ width = "100%", height = 12 }: { width?: number | string; height?: number }) {
  return (
    <span
      aria-hidden
      className="lagda-skeleton"
      style={{ display: "block", width, height, borderRadius: 6, background: "#E2E8F0" }}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div
      aria-hidden
      style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}
    >
      <SkeletonLine width="55%" height={14} />
      <div style={{ height: 10 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <SkeletonLine width={i === lines - 1 ? "70%" : "100%"} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCardGrid({ count = 4, minWidth = 300 }: { count?: number; minWidth?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`, gap: 14 }}>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export function SkeletonStatRow({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} aria-hidden style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px" }}>
          <SkeletonLine width={48} height={24} />
          <div style={{ height: 8 }} />
          <SkeletonLine width="70%" height={10} />
        </div>
      ))}
    </div>
  );
}

// ── Retry panel ──────────────────────────────────────────────────────────────

export interface RetryPanelProps {
  /** What could not be loaded, in the user's words. "workflow runs", not "GET /runs". */
  what: string;
  onRetry: () => void;
  /** Overrides the default explanation when something more specific is known. */
  description?: string;
}

/**
 * A failure the user can act on.
 *
 * `role="alert"` so it is announced when it replaces the skeleton, and the
 * retry is a real button so it is reachable by keyboard. The copy says what
 * failed, why it might have, and what to do — never "Something went wrong".
 */
export function RetryPanel({ what, onRetry, description }: RetryPanelProps) {
  return (
    <div
      role="alert"
      style={{
        background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 12,
        padding: "28px 24px", textAlign: "center",
      }}
    >
      <AlertTriangle size={20} color="#B45309" aria-hidden style={{ marginBottom: 10 }} />
      <h3 style={{ ...GF, margin: "0 0 8px", fontSize: 15.5, fontWeight: 700, color: NAVY }}>
        We couldn’t load {what}.
      </h3>
      <p style={{ ...GF, margin: "0 auto 16px", fontSize: 13.5, color: SLATE, lineHeight: 1.65, maxWidth: 420 }}>
        {description ?? "This is a frontend demonstration, so nothing was lost — the data simply did not come back. Try again, and if it keeps happening the demonstration data may need reloading."}
      </p>
      <button
        type="button"
        onClick={onRetry}
        style={{
          ...GF, minHeight: 44, padding: "0 18px", borderRadius: 8,
          border: `1px solid ${BORDER}`, background: "#FFFFFF", color: SLATE_DARK,
          fontSize: 14, fontWeight: 600, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 8,
        }}
      >
        <RefreshCw size={14} aria-hidden />
        Try again
      </button>
    </div>
  );
}

// ── Boundary ─────────────────────────────────────────────────────────────────

export interface AsyncBoundaryProps {
  status: AsyncStatus;
  /** What is being loaded, for both the announcement and the failure copy. */
  what: string;
  onRetry: () => void;
  /** Shown while loading. A skeleton shaped like the real content. */
  skeleton: ReactNode;
  children: ReactNode;
  errorDescription?: string;
}

export function AsyncBoundary({
  status, what, onRetry, skeleton, children, errorDescription,
}: AsyncBoundaryProps) {
  if (status === "loading") {
    return (
      <>
        {/* The skeleton is aria-hidden, so this carries the announcement. */}
        <p role="status" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
          Loading {what}…
        </p>
        {skeleton}
      </>
    );
  }
  if (status === "full-error") {
    return <RetryPanel what={what} onRetry={onRetry} description={errorDescription} />;
  }
  return <>{children}</>;
}

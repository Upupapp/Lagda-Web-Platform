// Small pieces every page of the notary on-ramp shares: the honest note about
// where eNotary stands, status pills, form fields, a ticking clock and a
// "now" that re-renders once a second.
//
// Presentational. What a page says and does is the page's.

import { useEffect, useId, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { GF, T, TAP } from "../../../components/system/design-system";
import { E } from "./EnotaryChrome";
import { Scale } from "lucide-react";
import type { InvitationStatus } from "../../../services/real/enotary-invitations.service";

/** Said on every page of this phase. LAGDA eNotary is not accredited and sessions are not open. */
export const ONRAMP_NOTE =
  "Online notarial sessions are not currently available. LAGDA eNotary is subject to Supreme Court accreditation and applicable rules. "
  + "A notary's fee is paid directly to the notary, who confirms it: LAGDA does not hold the money. Nothing is booked or notarized yet.";

/** Said instead, once the server offers sessions (117). The pilot is named for what it is. */
export const PILOT_NOTE =
  "LAGDA eNotary is a pilot. Online sessions are held with notaries who applied and were approved on LAGDA; LAGDA eNotary is subject to Supreme Court "
  + "accreditation and applicable rules. A notary's fee is paid directly to the notary, who confirms it: LAGDA does not hold the money.";

let sessionsOffered = false;
const offeredListeners = new Set<() => void>();
/** A page that has seen the server answer for sessions says so; every note then speaks of the pilot. */
export function markSessionsOffered(): void {
  if (sessionsOffered) return;
  sessionsOffered = true;
  offeredListeners.forEach(listener => { listener(); });
}
function useSessionsOffered(): boolean {
  return useSyncExternalStore(
    listener => { offeredListeners.add(listener); return () => { offeredListeners.delete(listener); }; },
    () => sessionsOffered, () => false,
  );
}

/** The note, as a quiet paragraph at the foot of a page. */
export function OnrampNote({ extra, tone = "plain" }: { extra?: ReactNode; tone?: "plain" | "maroon" }) {
  const offered = useSessionsOffered();
  const maroon = tone === "maroon";
  return (
    <p data-testid="onramp-note" style={{ ...GF, margin: "22px 0 0", padding: "14px 18px", borderRadius: 12, background: maroon ? "#FFFFFF" : "#EEF2F8", border: `1px solid ${E.line}`, borderLeft: maroon ? `4px solid ${E.maroon}` : `1px solid ${E.line}`, fontSize: 12.5, color: E.text, lineHeight: 1.65, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <Scale size={17} aria-hidden style={{ flex: "0 0 auto", marginTop: 1, color: maroon ? E.maroon : E.navy }} />
      <span><strong style={{ color: E.ink }}>{offered ? "Pilot programme notice." : "Notice."}</strong> {offered ? PILOT_NOTE : ONRAMP_NOTE}{extra !== undefined && <> {extra}</>}</span>
    </p>
  );
}

const STATUS_WORDS: Record<InvitationStatus, { label: string; fg: string; bg: string; edge: string }> = {
  awaiting: { label: "Waiting for the notary", fg: E.skyDeep, bg: E.skyWash, edge: E.skyLine },
  claimed: { label: "Notary verified", fg: E.skyDeep, bg: E.skyWash, edge: E.skyLine },
  accepted: { label: "Accepted", fg: E.ok, bg: E.okWash, edge: "#B7E3CA" },
  declined: { label: "Declined", fg: "#8A3B12", bg: "#FFF1E6", edge: "#F0C9A8" },
  expired: { label: "Expired", fg: E.quiet, bg: E.wash, edge: E.line },
  revoked: { label: "Cancelled", fg: E.quiet, bg: E.wash, edge: E.line },
};

export function statusLabel(status: InvitationStatus): string {
  return STATUS_WORDS[status].label;
}

export function StatusPill({ status, label }: { status: InvitationStatus; label?: string }) {
  const words = STATUS_WORDS[status];
  return (
    <span
      data-testid="status-pill" data-status={status}
      style={{
        ...GF, display: "inline-flex", alignItems: "center", minHeight: 26, padding: "0 11px", borderRadius: 999,
        fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", color: words.fg, background: words.bg, border: `1px solid ${words.edge}`,
      }}
    >
      {label ?? words.label}
    </span>
  );
}

/** Re-renders every `everyMs`, and gives the time. For countdowns. */
export function useNow(everyMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => { setNow(Date.now()); }, everyMs);
    return () => { clearInterval(id); };
  }, [everyMs]);
  return now;
}

export const fieldStyle = (invalid = false): CSSProperties => ({
  ...GF, fontSize: 15, width: "100%", boxSizing: "border-box", padding: "10px 13px", minHeight: TAP,
  border: `1.5px solid ${invalid ? T.danger : T.borderStrong}`, borderRadius: 10, background: "#FFFFFF", color: T.ink,
});

export const labelStyle: CSSProperties = { ...GF, display: "block", fontSize: 13.5, fontWeight: 700, color: T.ink, marginBottom: 6 };
export const hintStyle: CSSProperties = { ...GF, margin: "6px 0 0", fontSize: 12.5, color: E.quiet, lineHeight: 1.5 };

/** A labelled single-line field. */
export function TextField({
  label, value, onChange, hint, error, type = "text", maxLength, placeholder, inputMode, autoComplete, required,
}: {
  label: string; value: string; onChange: (value: string) => void; hint?: string; error?: string | null;
  type?: string; maxLength?: number; placeholder?: string; inputMode?: "text" | "numeric" | "tel" | "email"; autoComplete?: string;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={labelStyle}>{label}{required === true && <span aria-hidden="true" style={{ color: T.danger }}> *</span>}</label>
      <input
        id={id} type={type} value={value} maxLength={maxLength} placeholder={placeholder} inputMode={inputMode}
        autoComplete={autoComplete} required={required} aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-e` : hint ? `${id}-h` : undefined}
        onChange={event => { onChange(event.target.value); }} style={fieldStyle(Boolean(error))}
      />
      {error ? <p id={`${id}-e`} role="alert" style={{ ...hintStyle, color: T.danger }}>{error}</p>
        : hint !== undefined && <p id={`${id}-h`} style={hintStyle}>{hint}</p>}
    </div>
  );
}

/** A plain link-looking anchor styled as a button, 44px tall. */
export const linkButton = (kind: "primary" | "secondary" | "maroon" = "primary"): CSSProperties => ({
  ...GF, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: TAP, padding: "0 20px",
  borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none", boxSizing: "border-box",
  ...(kind === "primary" ? { background: E.sky, color: "#FFFFFF", border: "none" }
    : kind === "maroon" ? { background: E.maroon, color: "#FFFFFF", border: "none" }
      : { background: "#FFFFFF", color: T.ink, border: `1px solid ${T.borderStrong}` }),
});

/** The thin card inside a page. */
export function Panel({ children, tone = "plain", testId }: { children: ReactNode; tone?: "plain" | "sky" | "maroon"; testId?: string }) {
  return (
    <section
      data-testid={testId}
      style={{
        margin: "0 0 18px", padding: "16px 18px", borderRadius: 12, boxSizing: "border-box",
        background: tone === "sky" ? E.skyWash : tone === "maroon" ? E.maroonWash : "#FFFFFF",
        border: `1px solid ${tone === "sky" ? E.skyLine : tone === "maroon" ? E.maroonLine : E.line}`,
      }}
    >
      {children}
    </section>
  );
}

export function PanelTitle({ children }: { children: ReactNode }) {
  return <h3 style={{ ...GF, margin: "0 0 8px", fontSize: 15.5, fontWeight: 800, color: E.navy }}>{children}</h3>;
}

export const bodyText: CSSProperties = { ...GF, margin: "0 0 12px", fontSize: 14.5, color: E.text, lineHeight: 1.6 };

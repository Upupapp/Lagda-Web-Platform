// What a person sees around a visit to the identity verification partner's
// page: the agreement, the wait while the page is open in another tab, a
// review, no result yet, not available. Drawn once, for the signing page, My
// Settings and the eNotary gate.
//
// Presentational only. How the page is opened and how the result is asked
// for is in `provider-session.ts`; what an answer means is the caller's.

import {
  forwardRef, useEffect, useRef, type CSSProperties, type ReactNode,
} from "react";
import { AlertTriangle, Clock, ExternalLink, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { ActionButton, ActionRow, Notice, GF, T, TAP } from "../system/design-system";
import { IDENTITY_FACE_TAB_HEADING } from "../../models/identity-check";
import type { ProviderPhase, ProviderSessionState } from "./provider-session";

// ── Look ────────────────────────────────────────────────────────────────────

export const SR_ONLY: CSSProperties = {
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden",
  clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0, opacity: 0,
};

export const PROVIDER_BODY: CSSProperties = {
  ...GF, margin: "0 0 12px", fontSize: "clamp(13px, 3.4vw, 14px)", color: T.inkSoft, lineHeight: 1.6,
  overflowWrap: "anywhere",
};

const STYLES = `
  .idh-stage { animation: idh-in 180ms ease both; min-height: 216px; }
  @keyframes idh-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  .idh-spin { animation: idh-spin 900ms linear infinite; }
  @keyframes idh-spin { to { transform: rotate(360deg); } }
  .idh-heading:focus { outline: none; }
  .idh-heading:focus-visible { outline: 2px solid ${T.azure}; outline-offset: 4px; border-radius: 4px; }
  @media (prefers-reduced-motion: reduce) {
    .idh-stage, .idh-spin { animation: none; }
  }
`;

/** The stage's entrance and the spinner, both still under reduced motion. */
export function ProviderStyles() {
  return <style>{STYLES}</style>;
}

// ── Small pieces ────────────────────────────────────────────────────────────

/**
 * A state's heading. It takes the focus when the state changes, so a screen
 * reader says where the person now is; it is not in the tab order.
 */
export const ProviderHeading = forwardRef<HTMLHeadingElement, { children: ReactNode; level?: 2 | 3 }>(
  function ProviderHeading({ children, level = 2 }, ref) {
    const Tag = level === 2 ? "h2" : "h3";
    return (
      <Tag
        ref={ref} tabIndex={-1} className="idh-heading"
        style={{ ...GF, margin: "0 0 8px", fontSize: "clamp(16px, 4.2vw, 18px)", fontWeight: 800, color: T.ink, lineHeight: 1.3 }}
      >
        {children}
      </Tag>
    );
  },
);

/** Said politely to a screen reader, and seen by nobody. */
export function ProviderLive({ children }: { children: string }) {
  return <div role="status" aria-live="polite" style={SR_ONLY}>{children}</div>;
}

export type ProviderNoteValue = { readonly text: string; readonly quiet: boolean } | null;

/** What a button press said: a plain remark, or a problem. */
export function ProviderNote({ note, testId = "provider-session-note" }: { note: ProviderNoteValue; testId?: string }) {
  if (note === null) return null;
  return note.quiet
    ? <p data-testid={testId} style={PROVIDER_BODY}>{note.text}</p>
    : <Notice icon={AlertTriangle} tone="danger">{note.text}</Notice>;
}

/** The agreement: nothing is opened until it is ticked on this screen. */
export function ProviderConsent({ id, checked, disabled, onChange, children }: {
  id: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void; children: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      style={{
        ...GF, display: "flex", alignItems: "flex-start", gap: 10, minHeight: TAP, padding: "10px 12px",
        borderRadius: 10, cursor: "pointer", boxSizing: "border-box",
        fontSize: "clamp(13px, 3.4vw, 14px)", color: T.ink, lineHeight: 1.5,
        background: checked ? T.azureWash : T.surface, border: `1px solid ${checked ? "#B7DAF5" : T.border}`,
      }}
    >
      <input
        id={id} type="checkbox" checked={checked} disabled={disabled}
        onChange={event => { onChange(event.target.checked); }}
        style={{ width: 20, height: 20, flexShrink: 0, marginTop: 1, accentColor: T.azure }}
      />
      <span style={{ minWidth: 0 }}>{children}</span>
    </label>
  );
}

/** The usual reasons a check with an ID is not passed. */
export function ProviderDeclinedCauses() {
  return (
    <>
      <p style={{ ...PROVIDER_BODY, marginBottom: 6 }}>This usually happens when:</p>
      <ul style={{ ...PROVIDER_BODY, paddingLeft: 20, listStyle: "disc" }}>
        <li style={{ display: "list-item", marginBottom: 4 }}>the photo of the ID is blurry, dark or cut off</li>
        <li style={{ display: "list-item", marginBottom: 4 }}>your face is not clearly lit, or something covers it</li>
        <li style={{ display: "list-item" }}>the ID belongs to someone else, or has expired</li>
      </ul>
    </>
  );
}

// ── The states every caller shares ──────────────────────────────────────────

interface PanelBase {
  /** The state's heading, already drawn (the caller owns its focus). */
  readonly heading: ReactNode;
  readonly note?: ReactNode;
  /** Under the buttons: the signing page's "Decline to sign", say. */
  readonly footer?: ReactNode;
  /** Anything in flight: no button may be pressed. */
  readonly busy: boolean;
}

/** The partner's page is open in another tab, and this one waits. */
export function ProviderTabPanel({ heading, note, footer, busy, face, opening, checking, onOpenAgain, onCheckAgain }: PanelBase & {
  face: boolean; opening: boolean; checking: boolean; onOpenAgain: () => void; onCheckAgain: () => void;
}) {
  return (
    <>
      {heading}
      {face ? (
        <p style={PROVIDER_BODY}>
          We opened our identity verification partner&rsquo;s secure page in a new tab. Scan the code
          it shows with your phone and take the short selfie there. This page will continue by
          itself when you are done.
        </p>
      ) : (
        <p style={PROVIDER_BODY}>
          We opened our identity verification partner&rsquo;s secure page in a new tab. Scan the code
          it shows with your phone and complete the check there. This page will continue by
          itself when you are done.
        </p>
      )}
      {note}
      <ActionRow>
        <ActionButton icon={opening ? Loader2 : ExternalLink} onClick={onOpenAgain} disabled={busy} full>
          {opening ? "Opening…" : face ? "Open the face check again" : "Open the verification page again"}
        </ActionButton>
        <ActionButton icon={checking ? Loader2 : RefreshCw} kind="secondary" onClick={onCheckAgain} disabled={busy} full>
          {checking ? "Checking…" : "Check again"}
        </ActionButton>
      </ActionRow>
      {footer}
    </>
  );
}

/** A person at the partner is looking at it. */
export function ProviderReviewPanel({ heading, note, footer, busy, checking, onCheckAgain, children }: PanelBase & {
  checking: boolean; onCheckAgain: () => void;
  /** Where they can come back to. */
  children: ReactNode;
}) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Clock size={22} aria-hidden style={{ color: T.azure, flexShrink: 0, marginTop: 1 }} />
        {heading}
      </div>
      <p style={PROVIDER_BODY}>{children}</p>
      {note}
      <ActionRow>
        <ActionButton icon={checking ? Loader2 : RefreshCw} kind="secondary" onClick={onCheckAgain} disabled={busy} full>
          {checking ? "Checking…" : "Check again"}
        </ActionButton>
      </ActionRow>
      {footer}
    </>
  );
}

/** Nothing has arrived, and nothing is asking any more. */
export function ProviderNotReceivedPanel({ heading, note, footer, busy, face, opening, checking, onCheckAgain, onContinue }: PanelBase & {
  face: boolean; opening: boolean; checking: boolean; onCheckAgain: () => void; onContinue: () => void;
}) {
  return (
    <>
      {heading}
      <p style={PROVIDER_BODY}>
        If you finished the check, it can take a moment to reach us. If you left before
        finishing, you can continue where you stopped.
      </p>
      {note}
      <ActionRow>
        <ActionButton icon={checking ? Loader2 : RefreshCw} onClick={onCheckAgain} disabled={busy} full>
          {checking ? "Checking…" : "Check again"}
        </ActionButton>
        <ActionButton icon={opening ? Loader2 : ShieldCheck} kind="secondary" onClick={onContinue} disabled={busy} full>
          {opening ? "Opening…" : face ? "Continue face check" : "Continue verification"}
        </ActionButton>
      </ActionRow>
      {footer}
    </>
  );
}

/** The partner cannot be reached, or the check is switched off for now. */
export function ProviderUnavailablePanel({ heading, note, footer, busy, retry, opening, checking, onRetry }: PanelBase & {
  retry: "session" | "refresh"; opening: boolean; checking: boolean; onRetry: () => void;
}) {
  const working = retry === "session" ? opening : checking;
  return (
    <>
      {heading}
      <p style={PROVIDER_BODY}>Please try again in a few minutes.</p>
      {note}
      <ActionRow>
        <ActionButton icon={working ? Loader2 : RefreshCw} onClick={onRetry} disabled={busy} full>
          {working ? (retry === "session" ? "Opening…" : "Checking…") : "Try again"}
        </ActionButton>
      </ActionRow>
      {footer}
    </>
  );
}

/** One answer is on its way: nothing to press. */
export function ProviderArrivingPanel({ heading }: { heading: ReactNode }) {
  return (
    <div style={{ textAlign: "center", padding: "24px 0" }}>
      <Loader2 size={28} aria-hidden className="idh-spin" style={{ color: T.azure }} />
      {heading}
      <p style={{ ...PROVIDER_BODY, marginBottom: 0 }}>This takes a moment. Keep this page open.</p>
    </div>
  );
}

// ── The whole wait, drawn from `useProviderSession` ─────────────────────────

export const PROVIDER_HEADINGS: Readonly<Record<Exclude<ProviderPhase, "idle">, string>> = {
  "tab": "Finish the verification in the new tab",
  "waiting": "Checking for your result…",
  "review": "Your verification is being reviewed",
  "not-received": "We have not received your result yet",
  "declined": "We could not verify your identity",
  "unavailable": "Identity verification is not available right now",
};

/**
 * Every state of a wait, for a page that uses `useProviderSession`. Draws
 * nothing while the page's own screen is the one to show (`idle`).
 */
export function ProviderSessionView({ session, level = 2, context, testId = "provider-session" }: {
  session: ProviderSessionState;
  level?: 2 | 3;
  /** Passed to `start` by every button here that opens a visit again. */
  context?: string | undefined;
  testId?: string;
}) {
  const { phase, opening, checking, busy } = session;
  const face = session.kind === "face";
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (phase !== "idle") headingRef.current?.focus({ preventScroll: true });
  }, [phase]);

  if (phase === "idle") return null;

  const title = phase === "tab" && face ? IDENTITY_FACE_TAB_HEADING : PROVIDER_HEADINGS[phase];
  const heading = <ProviderHeading ref={headingRef} level={level}>{title}</ProviderHeading>;
  const note = <ProviderNote note={session.note} />;
  const again = () => { session.start(context); };

  let body: ReactNode;
  if (phase === "tab") {
    body = (
      <ProviderTabPanel
        heading={heading} note={note} busy={busy} face={face} opening={opening} checking={checking}
        onOpenAgain={again} onCheckAgain={session.checkAgain}
      />
    );
  } else if (phase === "review") {
    body = (
      <ProviderReviewPanel heading={heading} note={note} busy={busy} checking={checking} onCheckAgain={session.checkAgain}>
        This can take a few minutes. You can keep this page open, or come back to it later.
      </ProviderReviewPanel>
    );
  } else if (phase === "not-received") {
    body = (
      <ProviderNotReceivedPanel
        heading={heading} note={note} busy={busy} face={face} opening={opening} checking={checking}
        onCheckAgain={session.checkAgain} onContinue={again}
      />
    );
  } else if (phase === "declined") {
    body = (
      <>
        {heading}
        <ProviderDeclinedCauses />
        {note}
        <ActionRow>
          <ActionButton icon={opening ? Loader2 : RefreshCw} onClick={again} disabled={busy} full>
            {opening ? "Opening…" : "Try again"}
          </ActionButton>
        </ActionRow>
      </>
    );
  } else if (phase === "unavailable") {
    body = (
      <ProviderUnavailablePanel
        heading={heading} note={note} busy={busy} retry={session.retry} opening={opening} checking={checking}
        onRetry={session.retry === "session" ? again : session.checkAgain}
      />
    );
  } else {
    // Back from the partner's page: the result is asked for by itself, and a
    // button is there for anyone who would rather not wait for the next ask.
    body = (
      <>
        <ProviderArrivingPanel heading={heading} />
        {note}
        <ActionRow>
          <ActionButton icon={checking ? Loader2 : RefreshCw} kind="secondary" onClick={session.checkAgain} disabled={busy} full>
            {checking ? "Checking…" : "Check again"}
          </ActionButton>
        </ActionRow>
      </>
    );
  }

  return (
    <div data-testid={testId}>
      <ProviderStyles />
      <div key={phase} className="idh-stage" data-testid={`${testId}-${phase}`}>{body}</div>
    </div>
  );
}

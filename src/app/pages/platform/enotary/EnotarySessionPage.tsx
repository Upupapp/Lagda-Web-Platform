// /app/enotary/session?role=client|attorney — the eNotary ENVIRONMENT SHELL.
//
// HONESTY FIRST. This is the room, not the session. It shows where a
// notarial session will take place and names its steps; none of them works
// yet, and the page says so in a labelled notice. There is no lawyer here,
// simulated or otherwise, no video and no document.
//
// Reachable only with a grant. The access is read again on arrival (never
// taken from the page before), and without a standing grant the person is
// sent to the gate. The server is what keeps anyone out; this is the same
// answer, shown.
//
// The grant has an end. When it comes while the page is open, the page says
// so and offers the way back to the gate, instead of going on looking valid.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router";
import { Clock, Info, UserRound, BadgeCheck, ShieldCheck, type LucideIcon } from "lucide-react";
import { Notice, GF, T, TAP } from "../../../components/system/design-system";
import { EnotaryFrame, EnotaryHeading, EnotaryRail, E, SERIF } from "./EnotaryChrome";
import { EnotaryNext } from "./EnotaryNext";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import {
  realEnotaryAccessService, enotaryGrantStands, type EnotaryAccess,
} from "../../../services/real/enotary-access.service";
import { publishEnotaryAvailable } from "../../../hooks/useAccountFeatures";
import {
  ENOTARY_PREVIEW_NOTICE, ENOTARY_STEPS, enotaryAccessPath, enotaryRole, enotaryRoleLabel, identityWhenLabel,
} from "../../../models/identity-check";
import { EnotaryLoading, EnotaryLoadError, EnotaryNotOffered } from "./EnotaryStates";

type Loaded =
  | { readonly kind: "loading" }
  | { readonly kind: "error" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "ready"; readonly access: EnotaryAccess };

const FIRST_STEP = ENOTARY_STEPS[0]?.id ?? "";
/** How often the access is read again while the environment is open. */
export const SESSION_REREAD_MS = 60_000;

/** One fact about the person's access: a small label over the fact itself. */
function AccessTile({ icon: Icon, label, info, lawyer = false, verified = false }: {
  icon: LucideIcon; label: string; info: string; lawyer?: boolean; verified?: boolean;
}) {
  const accent = verified ? E.ok : lawyer ? E.maroon : E.skyDeep;
  return (
    <div style={{
      ...GF, display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 12,
      background: verified ? E.okWash : lawyer ? E.maroonWash : E.skyWash,
      border: `1px solid ${verified ? "#BFE3CC" : lawyer ? E.maroonLine : E.skyLine}`,
    }}>
      <span aria-hidden="true" style={{
        flexShrink: 0, display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 10,
        background: E.paper, color: accent,
      }}>
        <Icon size={17} />
      </span>
      <div style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: E.quiet }}>
          {label}
        </span>
        <span style={{ display: "block", marginTop: 3, fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: E.navy, lineHeight: 1.3, overflowWrap: "anywhere" }}>
          {info}
        </span>
      </div>
    </div>
  );
}

export function EnotarySessionPage() {
  const [params] = useSearchParams();
  const role = enotaryRole(params.get("role"));
  const [loaded, setLoaded] = useState<Loaded>(USE_REAL_BACKEND ? { kind: "loading" } : { kind: "unavailable" });
  /** The grant ran out while the page was open. */
  const [ended, setEnded] = useState(false);
  /** The server took the grant away while the page was open. */
  const [revoked, setRevoked] = useState(false);
  const endedHeadingRef = useRef<HTMLHeadingElement>(null);

  const load = useCallback(() => {
    if (!USE_REAL_BACKEND) return () => { /* nothing was asked */ };
    let cancelled = false;
    setLoaded({ kind: "loading" });
    realEnotaryAccessService.read(role).then(
      access => {
        if (cancelled) return;
        const available = access?.available === true;
        if (role === "client" || available) publishEnotaryAvailable(available);
        setLoaded(access !== null && available ? { kind: "ready", access } : { kind: "unavailable" });
      },
      () => { if (!cancelled) setLoaded({ kind: "error" }); },
    );
    return () => { cancelled = true; };
  }, [role]);

  useEffect(() => load(), [load]);

  const access = loaded.kind === "ready" ? loaded.access : null;
  /** Decided once per answer: whether the person arrived with a grant. */
  const [arrivedWith, setArrivedWith] = useState<EnotaryAccess | null>(null);
  const admitted = access !== null && (arrivedWith === access || enotaryGrantStands(access, Date.now()));
  useEffect(() => {
    if (access !== null && enotaryGrantStands(access, Date.now())) setArrivedWith(access);
  }, [access]);

  // The end of the grant, by this device's clock: a timer for the moment, and
  // a look at the clock whenever the tab comes back (timers sleep in a hidden tab).
  const grantedUntil = admitted ? access.grantedUntil : null;
  useEffect(() => {
    if (grantedUntil === null) return;
    const until = Date.parse(grantedUntil);
    if (!Number.isFinite(until)) return;
    const check = () => { if (Date.now() >= until) setEnded(true); };
    check();
    // Longer than a timer can hold is checked when the tab comes back instead.
    const wait = until - Date.now();
    const timer = wait > 0 && wait < 2_000_000_000 ? window.setTimeout(check, wait) : null;
    const onVisible = () => { if (!document.hidden) check(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
    };
  }, [grantedUntil]);

  // The grant can also be taken away before its time (a notary whose approval
  // was removed). The access is read again every minute while the tab shows,
  // and when it comes back to the front. A read that fails changes nothing.
  const admittedRef = useRef(false);
  admittedRef.current = admitted && !ended && !revoked;
  const untilRef = useRef<string | null>(null);
  untilRef.current = grantedUntil;
  useEffect(() => {
    if (!USE_REAL_BACKEND) return;
    let gone = false;
    let asking = false;
    const reread = () => {
      if (asking || document.hidden || !admittedRef.current) return;
      asking = true;
      realEnotaryAccessService.read(role).then(
        next => {
          if (gone || !admittedRef.current) return;
          if (next === null || !next.available) { setLoaded({ kind: "unavailable" }); return; }
          if (enotaryGrantStands(next, Date.now())) { setLoaded({ kind: "ready", access: next }); return; }
          // Run out by the clock: say so. Taken away before its time: the gate says why.
          const until = untilRef.current === null ? Number.NaN : Date.parse(untilRef.current);
          if (next.required !== "attorney-approval" && Number.isFinite(until) && Date.now() >= until) setEnded(true);
          else setRevoked(true);
        },
        () => { /* the next read will say */ },
      ).finally(() => { asking = false; });
    };
    const timer = window.setInterval(reread, SESSION_REREAD_MS);
    const onVisible = () => { if (!document.hidden) reread(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", reread);
    return () => {
      gone = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", reread);
    };
  }, [role]);

  useEffect(() => {
    if (ended) endedHeadingRef.current?.focus({ preventScroll: true });
  }, [ended]);

  if (loaded.kind === "loading") return <EnotaryLoading label="Opening eNotary…" />;
  if (loaded.kind === "error") return <EnotaryLoadError onRetry={() => { load(); }} />;
  if (access === null) return <EnotaryNotOffered />;
  // No grant: the gate says what is needed.
  if (!admitted || revoked) return <Navigate to={enotaryAccessPath(role)} replace />;

  const until = identityWhenLabel(access.grantedUntil);
  // An ID whose name could not be read still verifies the person: no name is shown then.
  const verifiedName = access.account.verifiedName;
  const named = verifiedName !== null && verifiedName.trim() !== "";

  if (ended) {
    return (
      <EnotaryFrame tone={role === "attorney" ? "attorney" : "client"} badge={enotaryRoleLabel(role)} eyebrow="Notarial session">
        <div role="status" aria-live="polite" data-testid="enotary-session-ended" style={{ minHeight: 160 }}>
          <h2
            ref={endedHeadingRef} tabIndex={-1} className="eno-ended-heading"
            style={{ ...GF, margin: "0 0 8px", fontSize: "clamp(16px, 4.2vw, 18px)", fontWeight: 800, color: T.ink, lineHeight: 1.3 }}
          >
            Your access has ended
          </h2>
          <p style={{ ...GF, margin: "0 0 20px", fontSize: 14, color: T.inkSoft, lineHeight: 1.6 }}>
            Your access has ended. Confirm it is you again.
          </p>
          <Link
            to={enotaryAccessPath(role)} className="eno-again" data-testid="enotary-session-again"
            style={{
              ...GF, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: TAP,
              padding: "0 24px", borderRadius: 10, background: T.azure, color: T.surface,
              fontSize: "clamp(13px, 3.4vw, 14px)", fontWeight: 700, textDecoration: "none", boxSizing: "border-box",
            }}
          >
            <ShieldCheck size={16} aria-hidden /> Confirm it is you
          </Link>
        </div>
        <style>{`
          .eno-ended-heading:focus { outline: none; }
          .eno-again:focus-visible { outline: 2px solid ${T.azureDeep}; outline-offset: 2px; }
        `}</style>
      </EnotaryFrame>
    );
  }

  return (
    <EnotaryFrame
      wide tone={role === "attorney" ? "attorney" : "client"} badge="Preview"
      eyebrow="Notarial session" description="Where your notarial session will take place."
    >
      <div data-testid="enotary-session">
        {/* Eight steps do not fit a phone: one row that scrolls sideways, and
            nothing wider than the screen. */}
        <div style={{ minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
          <EnotaryRail steps={ENOTARY_STEPS} current={FIRST_STEP} label="eNotary steps" />
        </div>
        <div data-testid="enotary-preview-notice" role="note" aria-label="Preview">
          <Notice icon={Info} tone="info">{ENOTARY_PREVIEW_NOTICE}</Notice>
        </div>
        <EnotaryHeading>Your access</EnotaryHeading>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" }}>
          <AccessTile icon={UserRound} label="Your role" info={enotaryRoleLabel(role)} lawyer={role === "attorney"} />
          <AccessTile
            icon={BadgeCheck} label={named ? "Verified name" : "Identity"}
            info={named ? verifiedName : "Verified"} verified
          />
          <AccessTile
            icon={Clock} label="Access"
            info={until !== null ? `Access valid until ${until}` : "Access valid for this visit"}
          />
        </div>
        <EnotaryNext role={role} />
      </div>
    </EnotaryFrame>
  );
}

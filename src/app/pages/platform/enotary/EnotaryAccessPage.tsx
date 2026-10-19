// /app/enotary/access?role=client|attorney — the eNotary identity gate.
//
// The server decides everything. GET /me/enotary/access says what stands
// between this person and the environment (`required`) or that nothing does
// (`granted`); this page shows that, and where a check is asked it opens the
// identity verification partner's page and waits for the result with the
// shared implementation (components/identity), asking the server every few
// seconds. It never depends on being told.
//
//   attorney-approval  a notary not yet approved: nothing to do but go back
//   full               ID and face check
//   face               a quick face check against an earlier verification
//   profile-name       verified, but the ID's name is not the profile's
//   none / granted     identity confirmed: on to the environment
//
// A face check that is not passed shows as the server moving from `face` to
// `full`: the page moves with it and says why.
//
// This page lets nobody in. "Enter eNotary" is a link; the environment asks
// the server again on arrival, and the server is what keeps anyone out.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import {
  AlertTriangle, ArrowLeft, BadgeCheck, Loader2, LogIn, RefreshCw, ScanFace, ShieldCheck, Smartphone, UserRoundX,
} from "lucide-react";
import {
  ActionButton, ActionRow, Notice, GF, T, TAP,
} from "../../../components/system/design-system";
import { ApiError } from "../../../services/api-client";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import {
  realEnotaryAccessService, enotaryGrantStands, type EnotaryAccess,
} from "../../../services/real/enotary-access.service";
import { publishEnotaryAvailable } from "../../../hooks/useAccountFeatures";
import {
  ENOTARY_PATH, IDENTITY_ENOTARY_AGREEMENT, IDENTITY_CHECK_KEPT_NOTE, IDENTITY_FACE_BODY, IDENTITY_FACE_BUTTON,
  IDENTITY_FACE_DECLINED_GATE, IDENTITY_FACE_HEADING, IDENTITY_FACE_LATER_NOTE, IDENTITY_FACE_PHONE_NOTICE,
  PROFILE_SETTINGS_PATH, enotaryAccessStorageKey, enotaryRole, enotaryRoleLabel, enotarySessionPath,
  identityWhenLabel, providerReturned, rememberEnotaryRole, type EnotaryRole, type IdentityCheckKind,
} from "../../../models/identity-check";
import {
  describeProviderError, useProviderSession, type ProviderOutcome, type ProviderTab,
} from "../../../components/identity/provider-session";
import {
  ProviderConsent, ProviderHeading, ProviderLive, ProviderNote, ProviderSessionView, ProviderStyles, PROVIDER_BODY,
} from "../../../components/identity/ProviderSessionParts";
import { EnotaryLoading, EnotaryLoadError, EnotaryNotOffered } from "./EnotaryStates";
import { EnotaryFrame } from "./EnotaryChrome";
import { EnotaryNext } from "./EnotaryNext";
import { withProcess } from "../../../config/process-screens";

/**
 * What an answer means while the gate waits. What was waited on is the kind
 * of the visit that was opened, or failing that what the server asked for
 * when it was (`context`).
 */
function interpret(answer: EnotaryAccess, context: string, kind: IdentityCheckKind | null): ProviderOutcome {
  if (!answer.available) return "moved";
  if (answer.granted || answer.required === "none") return "done";
  if (answer.pendingReview) return "review";
  const waitedOn = kind ?? (context === "face" || context === "full" ? context : null);
  // The server now asks for something else: the wait is over, show that.
  if (waitedOn !== null && answer.required !== waitedOn) return "moved";
  if (answer.lastOutcome === "declined") return "declined";
  return "pending";
}

export interface EnotaryAccessPageProps {
  /** Test seams, as on the signing page's check. */
  readonly openTab?: () => ProviderTab | null;
  readonly navigate?: (url: string) => void;
  readonly touch?: boolean;
}

type Loaded =
  | { readonly kind: "loading" }
  | { readonly kind: "error" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "ready"; readonly access: EnotaryAccess };

const BACK_LINK = (
  <p style={{ ...GF, margin: "20px 0 0", fontSize: 14 }}>
    <Link
      to={ENOTARY_PATH} data-testid="enotary-back"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: TAP, color: T.azureDeep, fontWeight: 700, textDecoration: "none" }}
    >
      <ArrowLeft size={16} aria-hidden /> Back
    </Link>
  </p>
);

export function EnotaryAccessPage(props: EnotaryAccessPageProps = {}) {
  const [params] = useSearchParams();
  const role = enotaryRole(params.get("role"));
  // One gate per role: another role is another question, asked from the start.
  return <EnotaryGate key={role} role={role} {...props} />;
}

function EnotaryGate({ role, openTab, navigate, touch }: EnotaryAccessPageProps & { role: EnotaryRole }) {
  const location = useLocation();
  const [returned] = useState(() => providerReturned(location.state));
  const [loaded, setLoaded] = useState<Loaded>(USE_REAL_BACKEND ? { kind: "loading" } : { kind: "unavailable" });
  const [agreed, setAgreed] = useState(false);
  /** The face check was not passed, and the server now asks for the ID. */
  const [faceDeclined, setFaceDeclined] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [recheckNote, setRecheckNote] = useState<{ text: string; quiet: boolean } | null>(null);
  const [said, setSaid] = useState("");
  const consentId = useId();
  const aliveRef = useRef(true);
  const resumedRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const declinedRef = useRef(false);
  const waitedKindRef = useRef<IdentityCheckKind | null>(null);

  const take = useCallback((access: EnotaryAccess | null) => {
    const available = access?.available === true;
    // Only the client's answer is the menu's: a notary not yet approved is
    // still a person eNotary is offered to.
    if (role === "client" || available) publishEnotaryAvailable(available);
    setLoaded(access !== null && available ? { kind: "ready", access } : { kind: "unavailable" });
  }, [role]);

  const load = useCallback(() => {
    if (!USE_REAL_BACKEND) return;
    setLoaded(current => (current.kind === "ready" ? current : { kind: "loading" }));
    realEnotaryAccessService.read(role)
      .then(access => { if (aliveRef.current) take(access); })
      .catch(() => { if (aliveRef.current) setLoaded({ kind: "error" }); });
  }, [role, take]);

  useEffect(() => {
    aliveRef.current = true;
    // Kept across the trip to the partner, for the page it sends the browser back to.
    rememberEnotaryRole(role);
    load();
    return () => { aliveRef.current = false; };
  }, [load, role]);

  const session = useProviderSession<EnotaryAccess>({
    storageKey: enotaryAccessStorageKey(role),
    startSession: () => withProcess("enotary-access", "", () => realEnotaryAccessService.startSession(role)),
    refresh: () => realEnotaryAccessService.refresh(role),
    interpret,
    onAnswer: (answer, outcome) => {
      take(answer);
      if (outcome === "moved" && answer.required === "full" && waitedKindRef.current === "face") {
        setFaceDeclined(true);
        setAgreed(false);
        setSaid(IDENTITY_FACE_DECLINED_GATE);
      }
      if (outcome === "done") {
        setFaceDeclined(false);
        setSaid("Identity confirmed.");
      }
    },
    // The server says the check is no longer wanted, or is not this person's
    // to do: what it now says is read again, and shown.
    onRefused: error => {
      const code = error instanceof ApiError ? error.body?.code : undefined;
      if (code !== "enotary_access_not_required" && code !== "enotary_attorney_not_approved"
        && code !== "enotary_profile_name_mismatch") return false;
      load();
      return true;
    },
    declinedBefore: () => declinedRef.current,
    returned: USE_REAL_BACKEND && returned,
    openTab, navigate, touch,
  });

  const access = loaded.kind === "ready" ? loaded.access : null;
  declinedRef.current = access?.lastOutcome === "declined";
  // What the visit being waited on asked for: its own word, or what was asked when it was opened.
  if (session.phase !== "idle" && session.kind !== null) waitedKindRef.current = session.kind;

  // A review already under way when the page is opened: show it, not Start.
  useEffect(() => {
    if (access === null || resumedRef.current) return;
    resumedRef.current = true;
    if (access.pendingReview && !access.granted) session.resume("review");
  }, [access, session]);

  const entered = access !== null && enotaryGrantStands(access, Date.now());
  const required = access?.required ?? "none";
  const waiting = session.phase !== "idle";
  const stateKey = loaded.kind !== "ready" ? loaded.kind
    : waiting ? "waiting" : entered ? "granted" : required === "none" ? "ended" : required;

  // The new state's heading takes the focus. Not on arrival: the page title has that.
  const firstKey = useRef(stateKey);
  useEffect(() => {
    if (firstKey.current === stateKey || firstKey.current === "loading") { firstKey.current = stateKey; return; }
    firstKey.current = stateKey;
    if (stateKey !== "waiting") headingRef.current?.focus({ preventScroll: true });
  }, [stateKey]);

  const begin = (kind: "face" | "full") => {
    waitedKindRef.current = kind;
    setRecheckNote(null);
    session.start(kind);
  };

  /** "Check again" where nothing is being waited on: reads what the server now says. */
  const recheck = () => {
    if (rechecking) return;
    setRechecking(true);
    setRecheckNote(null);
    const before = access?.required;
    realEnotaryAccessService.read(role).then(
      next => {
        if (!aliveRef.current) return;
        take(next);
        // Anything else it now says (a face check, the ID, a grant) is simply shown.
        if (next !== null && next.available && next.required === before && !next.granted) {
          setRecheckNote({ text: "Nothing has changed yet.", quiet: true });
          setSaid("Nothing has changed yet.");
        }
      },
      (error: unknown) => {
        if (!aliveRef.current) return;
        setRecheckNote({ text: describeProviderError(error), quiet: false });
      },
    ).finally(() => { if (aliveRef.current) setRechecking(false); });
  };

  if (loaded.kind === "loading") return <EnotaryLoading />;
  if (loaded.kind === "error") return <EnotaryLoadError onRetry={load} />;
  if (access === null) return <EnotaryNotOffered />;

  const phoneNotice = (text: React.ReactNode) => !session.touch && (
    <div data-testid="enotary-phone-notice"><Notice icon={Smartphone} tone="info">{text}</Notice></div>
  );
  const consent = (
    <ProviderConsent id={consentId} checked={agreed} disabled={session.opening} onChange={setAgreed}>
      {IDENTITY_ENOTARY_AGREEMENT}
    </ProviderConsent>
  );
  const verifiedName = access.account.verifiedName;
  const until = identityWhenLabel(access.grantedUntil);

  let body: React.ReactNode;
  if (waiting) {
    body = <ProviderSessionView session={session} context={waitedKindRef.current ?? undefined} testId="enotary-session" />;
  } else if (entered) {
    body = (
      <div data-testid="enotary-granted">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <BadgeCheck size={22} aria-hidden style={{ color: T.success, flexShrink: 0, marginTop: 1 }} />
          <ProviderHeading ref={headingRef}>Identity confirmed</ProviderHeading>
        </div>
        <p data-testid="enotary-granted-until" style={PROVIDER_BODY}>
          {until !== null ? `Identity confirmed. You can enter until ${until}.` : "Identity confirmed. You can enter now."}
        </p>
        <div style={{ marginTop: 20 }}>
          <Link
            to={enotarySessionPath(role)} className="eno-enter" data-testid="enotary-enter"
            style={{
              ...GF, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: TAP,
              padding: "0 24px", borderRadius: 10, background: T.azure, color: T.surface,
              fontSize: "clamp(13px, 3.4vw, 14px)", fontWeight: 700, textDecoration: "none", boxSizing: "border-box",
            }}
          >
            <LogIn size={16} aria-hidden /> Enter eNotary
          </Link>
        </div>
        <EnotaryNext role={role} />
      </div>
    );
  } else if (required === "attorney-approval") {
    body = (
      <div data-testid="enotary-attorney-approval">
        <ProviderHeading ref={headingRef}>Not yet approved to notarize</ProviderHeading>
        <p style={PROVIDER_BODY}>
          Your account is not yet approved to notarize on LAGDA. Approval of notaries is not open yet.
        </p>
      </div>
    );
  } else if (required === "profile-name") {
    body = (
      <div data-testid="enotary-profile-name">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <UserRoundX size={22} aria-hidden style={{ color: "#B45309", flexShrink: 0, marginTop: 1 }} />
          <ProviderHeading ref={headingRef}>The name on your ID does not match your profile</ProviderHeading>
        </div>
        <p style={PROVIDER_BODY}>
          The name on your ID ({verifiedName ?? "not available"}) does not match the name on your profile.
          Update your profile name, then come back.
        </p>
        <p style={PROVIDER_BODY}>
          <Link to={PROFILE_SETTINGS_PATH} style={{ color: T.azureDeep, fontWeight: 700 }}>Open profile settings</Link>
        </p>
        {/* Room kept for what "Check again" says, so the button does not move under a finger. */}
        <div style={{ minHeight: 34 }}><ProviderNote note={recheckNote} testId="enotary-recheck-note" /></div>
        <ActionRow align="end">
          <ActionButton icon={rechecking ? Loader2 : RefreshCw} kind="secondary" onClick={recheck} disabled={rechecking} full>
            {rechecking ? "Checking…" : "Check again"}
          </ActionButton>
        </ActionRow>
      </div>
    );
  } else if (required === "face") {
    body = (
      <div data-testid="enotary-face">
        <ProviderHeading ref={headingRef}>{IDENTITY_FACE_HEADING}</ProviderHeading>
        <p style={PROVIDER_BODY}>{IDENTITY_FACE_BODY}</p>
        {phoneNotice(IDENTITY_FACE_PHONE_NOTICE)}
        <ProviderNote note={session.note} />
        {consent}
        <ActionRow align="end">
          <ActionButton icon={session.opening ? Loader2 : ScanFace} onClick={() => { begin("face"); }} disabled={!agreed || session.busy} full>
            {session.opening ? "Opening…" : IDENTITY_FACE_BUTTON}
          </ActionButton>
        </ActionRow>
      </div>
    );
  } else if (required === "full") {
    body = (
      <div data-testid="enotary-full">
        <ProviderHeading ref={headingRef}>Verify your identity</ProviderHeading>
        {faceDeclined && (
          <div data-testid="enotary-face-declined">
            <Notice icon={AlertTriangle} tone="warn">{IDENTITY_FACE_DECLINED_GATE}</Notice>
          </div>
        )}
        <p style={PROVIDER_BODY}>
          Before you enter LAGDA eNotary, we need to verify who you are with a valid ID and a face
          check. It takes about two minutes.
        </p>
        {session.touch ? (
          <p style={PROVIDER_BODY}>
            When you continue, you will be taken to our identity verification partner&rsquo;s secure
            page. There you will photograph your ID and take a short selfie video check with this
            device, and then you will be brought back here.
          </p>
        ) : (
          <p style={PROVIDER_BODY}>
            When you continue, our identity verification partner&rsquo;s secure page opens in a new
            tab. There you will photograph your ID and take a short selfie video check, and this
            page continues by itself when you are done.
          </p>
        )}
        <p data-testid="enotary-kept-note" style={PROVIDER_BODY}>
          Our partner checks your ID and selfie. {IDENTITY_CHECK_KEPT_NOTE} {IDENTITY_FACE_LATER_NOTE}
        </p>
        {phoneNotice(<>Have your phone ready. You will scan a code and take the photos with your phone&rsquo;s camera.</>)}
        <ProviderNote note={session.note} />
        {consent}
        <ActionRow align="end">
          <ActionButton icon={session.opening ? Loader2 : ShieldCheck} onClick={() => { begin("full"); }} disabled={!agreed || session.busy} full>
            {session.opening ? "Opening…" : "Verify my identity"}
          </ActionButton>
        </ActionRow>
      </div>
    );
  } else {
    // `none`, but the time the server gave has passed by this device's clock.
    body = (
      <div data-testid="enotary-ended">
        <ProviderHeading ref={headingRef}>Your access has ended</ProviderHeading>
        <p style={PROVIDER_BODY}>Check again to see what is needed to enter.</p>
        <div style={{ minHeight: 34 }}><ProviderNote note={recheckNote} testId="enotary-recheck-note" /></div>
        <ActionRow align="end">
          <ActionButton icon={rechecking ? Loader2 : RefreshCw} onClick={recheck} disabled={rechecking} full>
            {rechecking ? "Checking…" : "Check again"}
          </ActionButton>
        </ActionRow>
      </div>
    );
  }

  return (
    <EnotaryFrame
      tone={role === "attorney" ? "attorney" : "client"} badge={enotaryRoleLabel(role)}
      eyebrow="Identity confirmation" description="Before you enter, we confirm who you are."
    >
      <ProviderStyles />
      <ProviderLive>{session.announcement}</ProviderLive>
      <ProviderLive>{said}</ProviderLive>
      <div data-testid={`enotary-gate-${stateKey}`} style={{ minHeight: 216 }}>{body}</div>
      {BACK_LINK}
      <style>{`.eno-enter:focus-visible { outline: 2px solid ${T.azureDeep}; outline-offset: 2px; }`}</style>
    </EnotaryFrame>
  );
}

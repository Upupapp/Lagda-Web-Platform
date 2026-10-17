// /app/settings/identity — "Identity verification": a person verifying their
// own LAGDA account, once, with a valid ID and a face check.
//
// With a backend: GET /me/identity says whether this is offered at all and
// where the account stands; POST /me/identity/session opens a visit to the
// identity verification partner's page; POST /me/identity/session/refresh
// asks the partner for the result; DELETE /me/identity removes it.
//
// ── Where it is not offered ────────────────────────────────────────────────
//
// A server that does not know the route (404) or answers `available: false`
// means this account is not offered it. The menu entry is hidden then
// (useAccountFeatures), and a direct visit says so plainly, with nothing to
// press. The demo build has no server: nothing is asked and it says the same.
//
// ── The wait ───────────────────────────────────────────────────────────────
//
// Opening the partner's page and waiting for its result is the shared
// implementation (components/identity). This page never depends on being
// told the result: it asks, every few seconds, for as long as it waits.
//
// ── What this browser is given ─────────────────────────────────────────────
//
// The name read from the person's OWN ID, to show them. Never an ID number,
// a photo or an image: the server keeps none.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { AlertTriangle, BadgeCheck, Loader2, RefreshCw, ScanFace, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { SettingsPage, SCard, Badge, Skeleton, SET } from "./SettingsShell";
import { formatDate } from "./settings-data";
import { usePlatform } from "../../../context/PlatformContext";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import { useConfirm } from "../../../components/platform/ConfirmDialog";
import { ActionButton, ActionRow, Notice, GF, T } from "../../../components/system/design-system";
import {
  realAccountIdentityService, describeAccountIdentityError, type AccountIdentity,
} from "../../../services/real/account-identity.service";
import { publishAccountIdentity } from "../../../hooks/useAccountFeatures";
import {
  IDENTITY_ACCOUNT_AGREEMENT, IDENTITY_CHECK_KEPT_NOTE, IDENTITY_FACE_LATER_NOTE, PROFILE_SETTINGS_PATH,
  ACCOUNT_IDENTITY_STORAGE_KEY, providerReturned,
} from "../../../models/identity-check";
import { recallInvite } from "../../public/enotary/invite-memory";
import { useProviderSession, type ProviderOutcome, type ProviderTab } from "../../../components/identity/provider-session";
import {
  ProviderConsent, ProviderHeading, ProviderLive, ProviderNote, ProviderSessionView, ProviderStyles, PROVIDER_BODY,
} from "../../../components/identity/ProviderSessionParts";

const HEADING = {
  title: "Identity verification",
  description: "Verify who you are once, so your account shows as verified.",
  icon: ScanFace,
};

/** A date the server named, in the settings pages' own format. Null when it is not one. */
function dateLabel(at: string | null): string | null {
  if (at === null) return null;
  const ms = Date.parse(at);
  return Number.isFinite(ms) ? formatDate(ms) : null;
}

/**
 * What an answer means while this page waits. `context` is when the account
 * was last verified as the visit was opened ("" if never), so renewing is not
 * mistaken for done by the verification already held.
 */
function interpret(answer: AccountIdentity, context: string): ProviderOutcome {
  if (!answer.available) return "moved";
  if (answer.pendingReview) return "review";
  if (answer.status === "verified" && (answer.verifiedAt ?? "") !== context) return "done";
  if (answer.lastOutcome === "declined") return "declined";
  return "pending";
}

export interface IdentityVerificationPageProps {
  /** Test seams, as on the signing page's check. */
  readonly openTab?: () => ProviderTab | null;
  readonly navigate?: (url: string) => void;
  readonly touch?: boolean;
}

type Loaded =
  | { readonly kind: "loading" }
  | { readonly kind: "error" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "ready"; readonly identity: AccountIdentity };

export function IdentityVerificationPage({ openTab, navigate, touch }: IdentityVerificationPageProps = {}) {
  const location = useLocation();
  const platform = usePlatform();
  const [returned] = useState(() => providerReturned(location.state));
  const [loaded, setLoaded] = useState<Loaded>(USE_REAL_BACKEND ? { kind: "loading" } : { kind: "unavailable" });
  const [agreed, setAgreed] = useState(false);
  /** "Verify again" was pressed on a verification that still stands. */
  const [renewing, setRenewing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [said, setSaid] = useState("");
  const { confirm, confirmDialog } = useConfirm();
  const consentId = useId();
  const aliveRef = useRef(true);
  const resumedRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  /** The server already says the last visit was declined. */
  const declinedRef = useRef(false);

  const take = useCallback((identity: AccountIdentity | null) => {
    publishAccountIdentity(identity);
    setLoaded(identity?.available === true ? { kind: "ready", identity } : { kind: "unavailable" });
  }, []);

  const load = useCallback(() => {
    if (!USE_REAL_BACKEND) return;
    setLoaded(current => (current.kind === "ready" ? current : { kind: "loading" }));
    realAccountIdentityService.read()
      .then(identity => { if (aliveRef.current) take(identity); })
      .catch(() => { if (aliveRef.current) setLoaded({ kind: "error" }); });
  }, [take]);

  useEffect(() => {
    aliveRef.current = true;
    load();
    return () => { aliveRef.current = false; };
  }, [load]);

  const session = useProviderSession<AccountIdentity>({
    storageKey: ACCOUNT_IDENTITY_STORAGE_KEY,
    startSession: () => realAccountIdentityService.startSession(),
    refresh: () => realAccountIdentityService.refresh(),
    interpret,
    onAnswer: (answer, outcome) => {
      take(answer);
      if (outcome === "done") {
        setRenewing(false);
        setAgreed(false);
        setFeedback(null);
        setSaid("Your identity is verified.");
      }
    },
    declinedBefore: () => declinedRef.current,
    returned: USE_REAL_BACKEND && returned,
    openTab, navigate, touch,
  });

  const identity = loaded.kind === "ready" ? loaded.identity : null;
  declinedRef.current = identity?.lastOutcome === "declined";

  // A visit opened elsewhere, or long ago: show where it stands, not Start.
  useEffect(() => {
    if (identity === null || resumedRef.current) return;
    resumedRef.current = true;
    if (identity.pendingReview) session.resume("review");
    else if (identity.status === "pending") session.resume("not-received");
  }, [identity, session]);

  const baseline = identity?.status === "verified" ? identity.verifiedAt ?? "" : "";
  const begin = () => { session.start(baseline); };

  const remove = () => {
    confirm({
      title: "Remove your identity verification?",
      body: "Your account will no longer show as verified, and your next check will need your ID again.",
      confirmLabel: "Remove my verification",
      destructive: true,
      onConfirm: async () => {
        setRemoving(true);
        setFeedback(null);
        try {
          await realAccountIdentityService.remove();
          if (!aliveRef.current) return;
          setRenewing(false);
          setAgreed(false);
          setFeedback({ tone: "success", text: "Your identity verification was removed." });
          setSaid("Your identity verification was removed.");
          try {
            take(await realAccountIdentityService.read());
          } catch {
            // The removal stands; what is shown is what it leaves behind.
            if (identity !== null) {
              take({
                available: true, status: "unverified", verifiedName: null, verifiedAt: null, validUntil: null,
                pendingReview: false, canUseFaceCheck: false, nameMatchesProfile: null,
              });
            }
          }
        } catch (error) {
          if (aliveRef.current) setFeedback({ tone: "danger", text: describeAccountIdentityError(error) });
        } finally {
          if (aliveRef.current) setRemoving(false);
        }
      },
    });
  };

  const waiting = session.phase !== "idle";
  const stateKey = loaded.kind !== "ready" ? loaded.kind
    : waiting ? "waiting"
      : identity?.status === "verified" && !renewing ? "verified"
        : identity?.status === "expired" ? "expired" : renewing ? "renew" : "start";

  // The new state's heading takes the focus, so a screen reader says where
  // the person now is. Not on arrival: the section heading has that.
  const firstKey = useRef(stateKey);
  useEffect(() => {
    if (firstKey.current === stateKey || firstKey.current === "loading") { firstKey.current = stateKey; return; }
    firstKey.current = stateKey;
    if (stateKey !== "waiting") headingRef.current?.focus({ preventScroll: true });
  }, [stateKey]);

  if (loaded.kind === "error") {
    return (
      <SettingsPage {...HEADING}>
        <Notice icon={AlertTriangle} tone="danger">Your identity verification could not be loaded.</Notice>
        <ActionRow><ActionButton icon={RefreshCw} kind="secondary" onClick={load}>Try again</ActionButton></ActionRow>
      </SettingsPage>
    );
  }
  if (loaded.kind === "loading") {
    return <SettingsPage {...HEADING}><Skeleton h={120} mb={12} /><Skeleton h={76} /></SettingsPage>;
  }
  if (identity === null) {
    return (
      <SettingsPage {...HEADING}>
        <SCard>
          <p data-testid="identity-unavailable" style={{ ...GF, fontSize: 14, color: SET.SLATE, margin: 0, lineHeight: 1.6 }}>
            Not available on this account yet.
          </p>
        </SCard>
      </SettingsPage>
    );
  }

  // The server compares the ID's name with the account's display name.
  const profileName = platform.user?.displayName ?? platform.user?.fullName ?? "";
  const verifiedOn = dateLabel(identity.verifiedAt);
  const validUntil = dateLabel(identity.validUntil);

  const startForm = (title: string, button: string, lead: React.ReactNode) => (
    <div data-testid="identity-start">
      <ProviderHeading ref={headingRef} level={3}>{title}</ProviderHeading>
      {lead}
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
      <p data-testid="identity-kept-note" style={PROVIDER_BODY}>
        Our partner checks your ID and selfie. {IDENTITY_CHECK_KEPT_NOTE} {IDENTITY_FACE_LATER_NOTE}
      </p>
      {!session.touch && (
        <Notice icon={Smartphone} tone="info">
          Have your phone ready. You will scan a code and take the photos with your phone&rsquo;s camera.
        </Notice>
      )}
      <ProviderNote note={session.note} />
      <ProviderConsent id={consentId} checked={agreed} disabled={session.opening} onChange={setAgreed}>
        {IDENTITY_ACCOUNT_AGREEMENT}
      </ProviderConsent>
      <ActionRow>
        <ActionButton icon={session.opening ? Loader2 : ShieldCheck} onClick={begin} disabled={!agreed || session.busy} full>
          {session.opening ? "Opening…" : button}
        </ActionButton>
        {renewing && (
          <ActionButton kind="secondary" onClick={() => { setRenewing(false); setAgreed(false); }} disabled={session.busy} full>
            Cancel
          </ActionButton>
        )}
      </ActionRow>
    </div>
  );

  let body: React.ReactNode;
  if (waiting) {
    body = <ProviderSessionView session={session} level={3} context={baseline} testId="identity-session" />;
  } else if (identity.status === "verified" && !renewing) {
    body = (
      <div data-testid="identity-verified">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
          <BadgeCheck size={22} aria-hidden style={{ color: T.success, flexShrink: 0, marginTop: 2 }} />
          <div style={{ minWidth: 0, flex: "1 1 200px" }}>
            <ProviderHeading ref={headingRef} level={3}>
              {identity.verifiedName !== null && identity.verifiedName.trim() !== ""
                ? `Verified as ${identity.verifiedName}` : "Your identity is verified"}
            </ProviderHeading>
          </div>
          <Badge tone="success" icon={BadgeCheck}>Verified</Badge>
        </div>
        <dl style={{ ...GF, margin: "0 0 12px", fontSize: 13.5, color: SET.SLATE, lineHeight: 1.7 }}>
          {verifiedOn !== null && <div><dt style={{ display: "inline" }}>Verified on </dt><dd style={{ display: "inline", margin: 0, color: SET.INK, fontWeight: 600 }}>{verifiedOn}</dd></div>}
          {validUntil !== null && <div><dt style={{ display: "inline" }}>Valid until </dt><dd style={{ display: "inline", margin: 0, color: SET.INK, fontWeight: 600 }}>{validUntil}</dd></div>}
        </dl>
        {recallInvite() !== null && (
          <p data-testid="identity-back-to-invite" style={PROVIDER_BODY}>
            <Link to={recallInvite() ?? "/"} style={{ display: "inline-flex", alignItems: "center", minHeight: 44, color: T.azureDeep, fontWeight: 700 }}>Back to the notary request you were opening</Link>
          </p>
        )}
        {identity.canUseFaceCheck && (
          <p data-testid="identity-face-later" style={PROVIDER_BODY}>Later checks will use a quick face check.</p>
        )}
        {identity.nameMatchesProfile === "mismatch" && (
          <div data-testid="identity-name-mismatch">
            <Notice icon={AlertTriangle} tone="warn">
              The name on your ID ({identity.verifiedName ?? "not available"}) is different from the name on your
              profile ({profileName}). Documents that ask for an identity check compare these names. Update your
              profile name if it is wrong.{" "}
              <Link to={PROFILE_SETTINGS_PATH} style={{ color: "inherit", fontWeight: 700, textDecoration: "underline" }}>
                Open profile settings
              </Link>
            </Notice>
          </div>
        )}
        <ActionRow>
          <ActionButton icon={RefreshCw} kind="secondary" onClick={() => { setFeedback(null); setRenewing(true); }} disabled={removing} full>
            Verify again
          </ActionButton>
          <ActionButton icon={removing ? Loader2 : Trash2} kind="secondary" onClick={remove} disabled={removing} full>
            {removing ? "Removing…" : "Remove my verification"}
          </ActionButton>
        </ActionRow>
      </div>
    );
  } else if (identity.status === "expired") {
    body = startForm("Your verification has expired", "Verify again", (
      <p data-testid="identity-expired" style={PROVIDER_BODY}>
        {validUntil !== null ? `Your verification expired on ${validUntil}.` : "Your verification has expired."}
      </p>
    ));
  } else if (renewing) {
    body = startForm("Verify your identity again", "Verify again", (
      <p style={PROVIDER_BODY}>
        Verifying again replaces your current verification once the new one is passed. Until then
        nothing changes.
      </p>
    ));
  } else {
    body = startForm("Verify your identity", "Verify my identity", (
      <p style={PROVIDER_BODY}>
        Verify once with a valid ID and a face check. Your account shows as verified, and later checks
        only need a quick face check instead of your ID.
      </p>
    ));
  }

  return (
    <SettingsPage {...HEADING}>
      {confirmDialog}
      <ProviderStyles />
      <ProviderLive>{session.announcement}</ProviderLive>
      <ProviderLive>{said}</ProviderLive>
      {feedback !== null && (
        <Notice icon={feedback.tone === "success" ? BadgeCheck : AlertTriangle} tone={feedback.tone}>{feedback.text}</Notice>
      )}
      {/* The column sits in the middle of the card and its headings and
          sentences are centred. Lists, the agreement and the notices keep
          their own left edge: a centred list or a centred checkbox label
          is harder to read, not tidier. */}
      <style>{`
        .idv-centred { text-align: center; }
        .idv-centred ul, .idv-centred ol, .idv-centred label, .idv-centred [role="note"], .idv-centred [role="alert"] { text-align: left; }
      `}</style>
      <SCard>
        <div
          data-testid={`identity-state-${stateKey}`} className="idv-centred"
          style={{ maxWidth: 620, minHeight: 216, margin: "0 auto" }}
        >
          {body}
        </div>
      </SCard>
    </SettingsPage>
  );
}

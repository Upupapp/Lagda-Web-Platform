// /enotary/invite/:token — a notary opens the link or QR code a client gave them.
//
// Public: the address can be opened signed out. The page asks the public lookup
// (which says only whether the link is open, ended or unknown, and the notary's
// name while it is open). "Continue" sends a signed-out visitor through sign-in
// or account creation and back to this same address; a signed-in one claims the
// invitation.
//
// The server decides the claim, in this order: the link is still open; the
// account has a verified identity; the verified name matches the notary the
// client chose. Each refusal has its own screen. A success goes to the notary
// desk, where the application (first time) and the request wait.
//
// Nothing here promises a video call, a payment or a notarization. Phase 1 ends
// when the notary accepts or declines.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { AlertTriangle, ArrowRight, BadgeCheck, Clock, LinkIcon, LogIn, ScanFace, ShieldCheck, UserRoundX, UserPlus } from "lucide-react";
import { ActionButton, ActionRow, GF, Notice, T, TAP } from "../../../components/system/design-system";
import { usePlatform } from "../../../context/PlatformContext";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import {
  errorCode, errorStatus, realEnotaryInvitationsService, refusedState, type PublicLookupState,
} from "../../../services/real/enotary-invitations.service";
import { NOTARY_INVITE_TOKEN, notaryInvitePath } from "../../../utils/authReturnPath";
import lagdaHeaderLogo from "../../../assets/brand/LagdaLogoPrimaryHorizontalFullColor.png";
import { E, EnotaryFrame, EnotaryHeading } from "../../platform/enotary/EnotaryChrome";
import { OnrampNote, bodyText, linkButton } from "../../platform/enotary/onramp-ui";
import { expiryLabel } from "../../platform/enotary/requests/expiry";
import { forgetInvite, rememberInvite } from "./invite-memory";
import { withProcess } from "../../../config/process-screens";

type Phase =
  | { kind: "loading" }
  | { kind: "open"; notaryName: string; expiresAt: string | null }
  | { kind: "ended"; state: Exclude<PublicLookupState, "open"> }
  | { kind: "claiming"; notaryName: string; expiresAt: string | null }
  | { kind: "identity-required"; notaryName: string }
  | { kind: "name-mismatch" }
  | { kind: "not-offered" }
  | { kind: "error"; notaryName: string | null; expiresAt: string | null };

const ENDED_WORDS: Record<Exclude<PublicLookupState, "open">, { title: string; text: string }> = {
  expired: {
    title: "This request has expired",
    text: "The time to answer it has passed. Ask the client to renew it: they can send you a new link or card from their LAGDA account.",
  },
  revoked: {
    title: "The client cancelled this request",
    text: "The link no longer works. If you still want to help them, ask them to send a new one.",
  },
  used: {
    title: "This request was already taken",
    text: "Another LAGDA account has already opened it, so it cannot be opened again. If that was not you, ask the client to send a new link.",
  },
  unknown: {
    title: "This link is not valid",
    text: "Check that you opened the whole link, or scan the client's QR card again. If it still fails, ask the client for a new one.",
  },
};

export function NotaryInvitePage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const platform = usePlatform();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const alive = useRef(true);
  const headingRef = useRef<HTMLDivElement>(null);
  const path = notaryInvitePath(token);
  const signedIn = platform.sessionStatus === "authenticated" && platform.user !== null;
  const known = platform.sessionStatus !== "initializing";

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  // What is this link? Public: asked even when signed out.
  const look = useCallback(() => {
    if (!NOTARY_INVITE_TOKEN.test(token) || !USE_REAL_BACKEND) { setPhase({ kind: "ended", state: "unknown" }); return; }
    setPhase({ kind: "loading" });
    realEnotaryInvitationsService.lookup(token).then(
      found => {
        if (!alive.current) return;
        if (found.state === "open") setPhase({ kind: "open", notaryName: found.notaryName ?? "the notary", expiresAt: found.expiresAt ?? null });
        else setPhase({ kind: "ended", state: found.state });
      },
      error => {
        if (!alive.current) return;
        // A server with the feature off answers 404 to everything.
        setPhase(errorStatus(error) === 404 ? { kind: "not-offered" } : { kind: "error", notaryName: null, expiresAt: null });
      },
    );
  }, [token]);

  useEffect(() => { look(); }, [look]);

  useEffect(() => {
    if (path !== null) rememberInvite(path);
  }, [path]);

  useEffect(() => {
    if (phase.kind !== "loading") headingRef.current?.focus({ preventScroll: true });
  }, [phase.kind]);

  const claim = () => {
    if (phase.kind !== "open" && phase.kind !== "identity-required" && phase.kind !== "error") return;
    const notaryName = phase.kind === "open" || phase.kind === "identity-required" ? phase.notaryName : phase.notaryName ?? "the notary";
    const expiresAt = phase.kind === "open" ? phase.expiresAt : null;
    setPhase({ kind: "claiming", notaryName, expiresAt });
    withProcess("enotary-claim", "", () => realEnotaryInvitationsService.claim(token)).then(
      () => { forgetInvite(); if (alive.current) void navigate("/app/enotary/desk", { replace: true }); },
      (error: unknown) => {
        if (!alive.current) return;
        const code = errorCode(error);
        const status = errorStatus(error);
        if (status === 401) { void navigate(`/sign-in?returnTo=${encodeURIComponent(path ?? "/")}`); return; }
        if (code === "identity_required") { setPhase({ kind: "identity-required", notaryName }); return; }
        if (code === "notary_name_mismatch") { setPhase({ kind: "name-mismatch" }); return; }
        if (code === "enotary_invitation_unavailable" || status === 410) {
          const state = refusedState(error);
          if (state !== null && state !== "open") { setPhase({ kind: "ended", state }); return; }
          // The refusal did not say which: the public lookup does.
          realEnotaryInvitationsService.lookup(token).then(
            found => { if (alive.current) setPhase({ kind: "ended", state: found.state === "open" ? "unknown" : found.state }); },
            () => { if (alive.current) setPhase({ kind: "ended", state: "unknown" }); },
          );
          return;
        }
        if (status === 404) { setPhase({ kind: "not-offered" }); return; }
        setPhase({ kind: "error", notaryName, expiresAt });
      },
    );
  };

  const signInUrl = `/sign-in?returnTo=${encodeURIComponent(path ?? "/")}`;
  const createUrl = `/create-account?returnTo=${encodeURIComponent(path ?? "/")}`;

  const wide = (body: ReactNode) => (
    <div style={{ minHeight: "100dvh", background: E.ground, display: "flex", flexDirection: "column" }}>
      <header style={{ background: "#FFFFFF", borderBottom: `1px solid ${E.line}`, height: 56, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }}>
        <img src={lagdaHeaderLogo} alt="LAGDA" style={{ display: "block", width: "clamp(110px, 30vw, 152px)", aspectRatio: "200 / 58", height: "auto", objectFit: "cover", objectPosition: "left center" }} />
      </header>
      <main style={{ flex: 1 }}>{body}</main>
    </div>
  );

  const heading = (text: string) => (
    <div ref={headingRef} tabIndex={-1} style={{ outline: "none" }}><EnotaryHeading>{text}</EnotaryHeading></div>
  );

  let content: ReactNode;
  switch (phase.kind) {
    case "loading":
    case "claiming":
      content = (
        <div role="status" aria-live="polite" data-testid="invite-loading" style={{ minHeight: 160 }}>
          <p style={{ ...bodyText, color: E.quiet }}>{phase.kind === "claiming" ? "Opening the request…" : "Checking the link…"}</p>
        </div>
      );
      break;
    case "open":
      content = (
        <div data-testid="invite-open">
          {heading(`A client has asked Atty. ${phase.notaryName}`)}
          <p style={bodyText}>
            A LAGDA client with a verified identity asked <strong>{phase.notaryName}</strong> to take a request on LAGDA eNotary.
            If that is you, here is what happens next.
          </p>
          {phase.expiresAt !== null && expiryLabel(phase.expiresAt) !== "" && (
            <p style={{ ...bodyText, display: "flex", alignItems: "center", gap: 8, color: E.skyDeep, fontWeight: 600 }}>
              <Clock size={16} aria-hidden /> Open until {expiryLabel(phase.expiresAt)}
            </p>
          )}
          <ol style={{ ...bodyText, paddingLeft: 22, listStyle: "decimal" }} data-testid="invite-steps">
            <li>Sign in to LAGDA, or create an account.</li>
            <li>Verify your identity with a valid ID and a face check.</li>
            <li>LAGDA checks that the name on your ID is the notary the client chose.</li>
            <li>If this is your first time, you send a short application that a LAGDA reviewer approves.</li>
            <li>You see the request on your notary desk and accept or decline it.</li>
          </ol>
          <Notice icon={ShieldCheck} tone="info">
            Only the notary the client named can take this request. Do not pass this link on.
          </Notice>
          {!known ? null : signedIn ? (
            <ActionRow align="end">
              <ActionButton icon={ArrowRight} onClick={claim} full>Continue</ActionButton>
            </ActionRow>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
              <Link to={signInUrl} style={{ ...linkButton("maroon"), width: "100%" }}><LogIn size={16} aria-hidden /> Sign in to continue</Link>
              <Link to={createUrl} style={{ ...linkButton("secondary"), width: "100%" }}><UserPlus size={16} aria-hidden /> Create a LAGDA account</Link>
            </div>
          )}
        </div>
      );
      break;
    case "ended": {
      const words = ENDED_WORDS[phase.state];
      content = (
        <div data-testid={`invite-${phase.state}`}>
          <Notice icon={AlertTriangle} tone="warn">{words.title}</Notice>
          {heading(words.title)}
          <p style={bodyText}>{words.text}</p>
          {signedIn && <p style={bodyText}><Link to="/app/enotary/desk" style={{ ...linkButton("secondary"), color: T.azureDeep }}>Go to your notary desk</Link></p>}
        </div>
      );
      break;
    }
    case "identity-required":
      content = (
        <div data-testid="invite-identity-required">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <ScanFace size={22} aria-hidden style={{ color: E.maroon, flexShrink: 0, marginTop: 3 }} />
            {heading("Verify your identity first")}
          </div>
          <p style={bodyText}>
            To take a request for <strong>{phase.notaryName}</strong>, your LAGDA account must be verified with a valid ID and a face check.
            It takes about two minutes, and you only do it once.
          </p>
          <ActionRow align="end">
            <Link to="/app/settings/identity" style={{ ...linkButton("maroon"), flex: 1 }}><BadgeCheck size={16} aria-hidden /> Verify my identity</Link>
            <ActionButton kind="secondary" onClick={claim} full>I have verified. Continue</ActionButton>
          </ActionRow>
        </div>
      );
      break;
    case "name-mismatch":
      content = (
        <div data-testid="invite-name-mismatch">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <UserRoundX size={22} aria-hidden style={{ color: "#B45309", flexShrink: 0, marginTop: 3 }} />
            {heading("This request is for a different notary")}
          </div>
          <p style={bodyText}>
            The name on your verified ID is not the name of the notary the client chose, so this request cannot be opened with your account.
            Nothing was changed on your account or on the request.
          </p>
          <p style={bodyText}>If you are the notary the client meant, check that you are signed in with your own account. Otherwise, ask the client to send the request to the right notary.</p>
          <p style={bodyText}><Link to="/app/enotary/desk" style={{ ...linkButton("secondary"), color: T.azureDeep }}>Go to your notary desk</Link></p>
        </div>
      );
      break;
    case "not-offered":
      content = (
        <div data-testid="invite-not-offered">
          {heading("Notary requests are not open here")}
          <p style={bodyText}>LAGDA is not taking notary requests at this address right now. Please try again later, or ask the client.</p>
        </div>
      );
      break;
    case "error":
      content = (
        <div data-testid="invite-error">
          <Notice icon={LinkIcon} tone="danger">The request could not be opened. Check your connection and try again.</Notice>
          <ActionRow align="end">
            <ActionButton onClick={() => { if (phase.notaryName === null) look(); else claim(); }} full>Try again</ActionButton>
          </ActionRow>
        </div>
      );
      break;
  }

  return wide(
    <EnotaryFrame tone="attorney" badge="Notary" eyebrow="A request for you" description="Open a client's request to a notary public.">
      <div style={{ ...GF, minHeight: TAP * 3 }}>{content}</div>
      <OnrampNote />
    </EnotaryFrame>,
  );
}

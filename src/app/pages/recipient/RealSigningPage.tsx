// REAL recipient signing ceremony — P2. Deliberately a fresh, self-contained
// flow rather than a rewrite of the mock RecipientContext state machine:
// that mock models steps (auth-challenge OTP, approver/reviewer decisions,
// signature-library adoption) with NO backend counterpart. This page uses
// only what packages/api/src/signing-access-routes.ts and
// signing-ceremony-routes.ts actually implement today (see
// services/real/signing-access.service.ts and signing-submission.service.ts).
//
// SECURITY: this page NEVER imports PlatformContext, api-client's
// apiRequest, or anything from the sender/workspace realm. All calls go
// through recipient-api-client.ts, which reads the SEPARATE
// `lagda_signing_csrf` cookie — see that file's header. A recipient here has
// no LAGDA session and none is required.
//
// BOUNDARY (P2 §17): stops at a backend-confirmed submission. Never claims
// "completed" or shows a final/sealed document — that state does not exist
// in the backend yet (see the P1.5/master-audit findings on the unwired
// completion pipeline).
import { useProcessing } from "../../services/processing.service";
import { realSigningAccountLinkService }
  from "../../services/real/signing-account-link.service";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import {
  realSigningAccessService, type CeremonyView,
} from "../../services/real/signing-access.service";
import {
  realSigningSubmissionService, type SubmittedFieldValue, type SigningDeclineReason,
} from "../../services/real/signing-submission.service";
import { type SignatureValue } from "../../components/recipient/SignatureCapture";
import {
  PositionedSigningSurface,
} from "../../components/recipient/PositionedSigningSurface";
import { ApiError } from "../../services/api-client";
import {
  SignerCard, PhaseBanner, Notice, ActionButton, ActionRow, StepRail,
  IdentityStrip, T, GF as SIGNER_GF,
} from "../../components/recipient/signer-ui";
import {
  FileSignature, ShieldCheck, CheckCircle2, XCircle, Clock, AlertTriangle,
  Ban, ArrowLeft, Send, Loader2, SkipForward,
} from "lucide-react";
import { DECLINE_REASON_CATEGORIES } from "../../models/recipient";
import { SigningEntryChoice } from "../../components/recipient/SigningEntryChoice";
import { LagdaLoader } from "../../components/brand/LagdaLoader";
import { useMinimumSplash } from "../../hooks/useMinimumSplash";
import { ceremonyWording } from "../../services/participant-wording";

// The signer palette lives in `signer-ui`. Only the font alias survives the
// redesign: every colour this page used is now applied by a primitive from
// that module rather than inline here, which is the point of having it.
const GF     = SIGNER_GF;

/**
 * Masks the address this document was sent to.
 *
 * The signer knows their own address, so this is not for them — it is for the
 * case where a link has been forwarded. Whoever is holding it can see WHICH
 * mailbox was addressed well enough to recognise their own, without the page
 * handing a full address to someone the sender never wrote to.
 *
 * Fails closed: anything that does not look like an address is replaced
 * wholesale rather than partially revealed.
 */
function maskRecipientEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "your email address";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const kept = local.slice(0, Math.min(3, local.length));
  return `${kept}${"•".repeat(3)}${domain}`;
}

// "choose" sits in front of "consent": how you sign is asked before what
// you agree to, because signing in changes what the consent screen can
// offer. It is skipped once an account is already linked — there is no
// choice left to make at that point.
type Phase = "loading" | "unavailable" | "choose" | "consent" | "ceremony" | "submitted" | "declined" | "decline-form" | "skipped";

// ── Continuing from the app ───────────────────────────────────────────────
//
// "Continue signing" in Documents lands on /sign/continue#<code>. The code is
// in the FRAGMENT, which a browser never sends to a server or puts in a
// Referer. It is read once and the fragment is cleared at once, so a reload,
// the history entry or a copied address cannot replay it; the server burns it
// on first use anyway.
const CONTINUE_SEGMENT = "continue";
let takenAppCode: string | null | undefined;
function takeAppCode(): string | null {
  if (takenAppCode !== undefined) return takenAppCode;
  const raw = window.location.hash.replace(/^#/, "");
  takenAppCode = raw === "" ? null : decodeURIComponent(raw);
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return takenAppCode;
}

const APP_CODE_UNUSABLE =
  "This signing session could not be opened. Go back to Documents and choose "
  + "Continue signing again. The step expires after two minutes.";

/**
 * "Go to Documents", shown only on /sign/continue.
 *
 * Every other /sign/:token route is the emailed link, reachable by someone
 * with no LAGDA session at all -- a button back into the authenticated app
 * would be a dead end for them. /sign/continue is reachable ONLY from
 * Documents -> Continue signing, which already required a signed-in
 * session a moment earlier, so sending them back there is always right.
 *
 * A plain navigation, not a react-router Link: this page's security header
 * forbids importing anything from the workspace/sender realm, and a full
 * navigation is what actually crosses from the recipient route into the
 * authenticated app rather than something a client-side router could route
 * around.
 */
function GoToDocumentsButton() {
  return (
    <ActionRow>
      <ActionButton
        kind="secondary"
        onClick={() => { window.location.assign("/app/documents"); }}
      >
        Go to Documents
      </ActionButton>
    </ActionRow>
  );
}

const SPLASH_MIN_MS = 1500;
const SPLASH_EXIT_MS = 240;

export function RealSigningPage() {
  const { requestId: token } = useParams<{ requestId: string }>();
  const [phase, setPhase] = useState<Phase>("loading");
  // The focus handler is registered once per phase change but runs later,
  // after an await. It reads the CURRENT phase through this rather than the
  // one captured when it was created.
  const phaseRef = useRef<Phase>("loading");
  phaseRef.current = phase;
  // Branded splash: at least SPLASH_MIN_MS on every arrival (email link or
  // the Documents button), longer if the link is still being checked, then
  // a short fade so the page underneath never flashes in.
  const splash = useMinimumSplash(phase !== "loading", SPLASH_MIN_MS, SPLASH_EXIT_MS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [view, setView] = useState<CeremonyView | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  // The ADOPTED representations, not raw text. A signature may now be drawn,
  // typed or uploaded, and the first and last are not text at all — so the
  // ceremony holds what will be submitted rather than what was typed.
  const [signature, setSignature] = useState<SignatureValue | null>(null);
  const [initials, setInitials] = useState<SignatureValue | null>(null);
  const { run } = useProcessing();
  const [linkError, setLinkError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [declineReason, setDeclineReason] = useState<SigningDeclineReason>("not-agree");

  // Same NEW-KEY / RETRY-SAME-KEY / RETIRE-ON-SUCCESS rule as sender Send
  // (ConfirmationPage) — one submission per ceremony, in-memory only.
  const submitKeyRef = useRef<string | null>(null);

  const enterCeremony = async () => {
    try {
      const ceremony = await realSigningAccessService.enter();
      applyView(ceremony);
    } catch (err) {
      setErrorMessage(describeError(err));
      setPhase("unavailable");
    }
  };

  const applyView = (ceremony: CeremonyView) => {
    setView(ceremony);
    // Signing requires a signed-in LAGDA account. Nothing past this screen is
    // reachable until the ceremony reports an account link.
    //
    // The gate is checked BEFORE consent rather than inside it. It used to
    // live on the consent branch only, so a signer whose consent was already
    // accepted — someone returning to a link they had opened before — went
    // straight to the ceremony and never met it at all.
    //
    // FRONTEND ONLY, and it matters to say so: the ceremony endpoints still
    // accept a submission from an unlinked recipient. This makes signing in
    // the only path the product offers; it does not make it the only path the
    // server permits.
    if (ceremony.accountLink === undefined) {
      setPhase("choose");
      return;
    }
    if (ceremony.consent.required && !ceremony.consent.accepted && ceremony.access.mayAcceptConsent) {
      setPhase("consent");
      return;
    }
    setPhase("ceremony");
    // The document is fetched by `PositionedSigningSurface`, which needs the
    // BYTES for pdf.js rather than an object URL for an iframe. Prefetching
    // here as well would download it twice.
  };

  useEffect(() => {
    if (!token) {
      setErrorMessage(LINK_UNUSABLE);
      setPhase("unavailable");
      return;
    }
    const fromApp = token === CONTINUE_SEGMENT;
    void (async () => {
      try {
        if (fromApp) {
          const code = takeAppCode();
          if (code === null) throw new Error("no code");
          await realSigningAccessService.continueFromApp(code);
        } else {
          await realSigningAccessService.bootstrap(token);
        }
        await enterCeremony();
      } catch {
        if (fromApp) {
          setErrorMessage(APP_CODE_UNUSABLE);
          setPhase("unavailable");
          return;
        }
        // ONE message for every bootstrap failure, deliberately.
        //
        // `describeError` used to surface the server's own text here, which in
        // production meant a signer met "One or more fields contain invalid
        // values" — a form-validation string, on a page with no form, telling
        // them nothing they could act on.
        //
        // It also leaked. The backend collapses expired, revoked, already-
        // completed and never-existed into a single error precisely so that
        // holding a link cannot be used to learn which of those is true. Echoing
        // its status codes back would have re-opened that by the side door.
        setErrorMessage(LINK_UNUSABLE);
        setPhase("unavailable");
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Waiting for an earlier signer ─────────────────────────────────────────
  //
  // A document routed in sequence leaves later signers on "Not yet your turn"
  // until the person ahead of them finishes. Nothing pushed that change, so
  // the screen said "check back later" and meant it literally: the signer had
  // to reload by hand, and someone who does not think to will simply sit on a
  // stale page while their turn passes.
  //
  // `read()` rather than `enter()` — `enter()` records a first-entry
  // timestamp, which is a real, one-time side effect and must not be repeated
  // on a timer (the service's own comment says so).
  //
  // Polling, not a socket: there is no push infrastructure here, and adding
  // one for this would be far more machinery than the problem needs. 15s is
  // slow enough to be negligible traffic and fast enough that a signer who is
  // waiting notices their turn arriving.
  useEffect(() => {
    if (phase !== "ceremony" || view === null) return;
    if (view.access.mayProceedToInput) return;   // already their turn

    let cancelled = false;
    const timer = setInterval(() => {
      void (async () => {
        try {
          const fresh = await realSigningAccessService.read();
          // A failed poll is ignored on purpose: the signer is not waiting on
          // this request and an error banner over "not yet your turn" would
          // report a problem they cannot act on.
          if (!cancelled) setView(fresh);
        } catch { /* transient — the next tick tries again */ }
      })();
    }, 15000);

    return () => { cancelled = true; clearInterval(timer); };
  }, [phase, view]);

  // Refetch when this tab comes back to the front.
  //
  // Confirming an account happens in ANOTHER tab, and the poll below only
  // runs while waiting for an earlier signer — so without this, someone who
  // confirmed came back to a ceremony that still offered them the sign-in
  // button and no saved signature, and had to work out that a reload was
  // needed. Focus is the one moment we know something may have changed
  // elsewhere.
  useEffect(() => {
    if (phase !== "ceremony" && phase !== "consent" && phase !== "choose") return;
    const onFocus = () => {
      void (async () => {
        try {
          const fresh = await realSigningAccessService.read();
          setView(fresh);
          // They went to confirm and came back confirmed. Move on rather
          // than leaving them staring at a choice they have just made.
          if (fresh.accountLink !== undefined && phaseRef.current === "choose") {
            applyView(fresh);
          }
        } catch { /* transient; the signer can still act on what is shown */ }
      })();
    };
    // Both, because neither alone covers every way a signer comes back.
    //
    // `focus` misses the case where the signing tab was already the focused
    // tab of its window — closing the sign-in tab then reveals it without
    // refocusing it. `visibilitychange` catches that, and also covers a phone
    // returning from the background. Together they double-fire on the common
    // path, which costs one cheap refetch and is the right trade: a missed
    // event strands the signer on a screen that has silently gone stale.
    const onVisible = () => { if (!document.hidden) onFocus(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [phase]);

  /**
   * Opens the workspace realm in a NEW TAB and stays put.
   *
   * This tab's URL still carries the 43-character access credential. The
   * backend sets `Referrer-Policy: no-referrer` precisely so that URL cannot
   * leak, and navigating away to sign in would put the credential into
   * history, into a `returnTo` parameter, and into whatever the destination
   * logs. So the signing tab never moves.
   *
   * `window.open` is called BEFORE the await. A popup opened after an await
   * is no longer attributable to the click that started it and browsers block
   * it — so the tab is opened first and pointed somewhere once the code
   * exists.
   */
  const handleSignInToConfirm = () => {
    setLinkError(null);
    // NO `noopener` here, deliberately, and it cost a live bug to learn why.
    //
    // `window.open` with `noopener` returns null BY SPECIFICATION — the
    // browser severs the handle. So the blank tab opened, this code read null,
    // concluded the popup had been blocked, and left an orphaned blank tab
    // sitting there while telling the signer to allow pop-ups. Both halves of
    // that were wrong.
    //
    // Without it the handle comes back and the tab can be pointed somewhere.
    // The opener reference that creates is severed by the child itself on
    // mount: it is our own page on our own origin, and it disowns its opener
    // in its first effect.
    const tab = window.open("", "_blank");
    void (async () => {
      try {
        const minted = await realSigningAccountLinkService.mintHandoff();
        const target = `/app/link-signing?code=${encodeURIComponent(minted.code)}`;
        if (tab === null) {
          // Popup blocked. Say so rather than silently doing nothing — and do
          // not fall back to navigating this tab, which is the one thing the
          // whole approach exists to avoid.
          setLinkError(
            "Your browser blocked the new tab. Allow pop-ups for this site and try again.",
          );
          return;
        }
        tab.location.replace(target);
      } catch {
        tab?.close();
        setLinkError("That could not be started. Please try again.");
      }
    })();
  };

  const handleAcceptConsent = async () => {
    if (!view) return;
    try {
      const updated = await realSigningAccessService.acceptConsent(view.consent.requiredVersion);
      applyView(updated);
    } catch (err) {
      setErrorMessage(describeError(err));
    }
  };

  // Memoised: `useRealDocument` re-runs when the loader's identity changes,
  // so an inline closure would refetch the PDF on every render.
  const loadDocumentBlob = useCallback(
    () => realSigningAccessService.documentBlob(), []);

  // An approver approves or skips (069). Their signature and initials boxes
  // are never asked for — the final document draws APPROVED / SKIPPED there
  // — and their other fields are optional, so only what they fill is sent.
  const approverCeremony = view?.recipient.type === "approver";
  const isOutcomeLabelled = (f: { type: string }) =>
    approverCeremony && (f.type === "signature" || f.type === "initials");
  const surfaceFields = view?.fields.filter((f) => !isOutcomeLabelled(f)) ?? [];
  const assignedFields = surfaceFields.filter((f) => f.valueAuthority === "RECIPIENT_SUPPLIED");
  const needsSignature = assignedFields.some((f) => f.type === "signature");
  const needsInitials  = assignedFields.some((f) => f.type === "initials");

  const buildFieldValues = (): SubmittedFieldValue[] => {
    const all = assignedFields.map((f): SubmittedFieldValue => {
      if (f.type === "signature") return { kind: "signature", fieldId: f.fieldId };
      if (f.type === "initials")  return { kind: "initials", fieldId: f.fieldId };
      if (f.type === "checkbox")  return { kind: "checkbox", fieldId: f.fieldId, checked: values[f.fieldId] === true };
      return { kind: "text", fieldId: f.fieldId, text: typeof values[f.fieldId] === "string" ? (values[f.fieldId] as string) : "" };
    });
    if (!approverCeremony) return all;
    // Left empty by an approver: not sent, so the outcome label is drawn.
    return all.filter((v) => v.kind === "checkbox" ? v.checked
      : v.kind === "text" ? v.text.trim() !== "" : true);
  };

  const missingRequired = assignedFields.filter((f) => {
    if (!f.required) return false;
    if (f.type === "signature") return signature === null;
    if (f.type === "initials")  return initials === null;
    if (f.type === "checkbox")  return values[f.fieldId] !== true;
    return !values[f.fieldId] || String(values[f.fieldId]).trim() === "";
  });

  const handleSubmit = async () => {
    if (!view || submitting) return;
    if (missingRequired.length > 0) {
      setErrorMessage(`Complete all required fields first: ${missingRequired.map((f) => f.label).join(", ")}.`);
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      // The signer's last act. It is also the slowest request in the ceremony
      // — the server seals the document and writes the audit trail — and the
      // one where a signer who sees nothing happening will click again.
      await run(
        {
          message: "Finalising your signature",
          detail: "Sealing the document and recording the audit trail.",
        },
        async () => {
      if (!submitKeyRef.current) submitKeyRef.current = crypto.randomUUID();
      await realSigningSubmissionService.submit({
        fieldValues: buildFieldValues(),
        // Sent exactly as captured. `missingRequired` above has already
        // refused a null for a required field, so a non-null here is a
        // representation the signer actually adopted.
        ...(needsSignature && signature !== null ? { signature } : {}),
        ...(needsInitials && initials !== null ? { initials } : {}),
      }, submitKeyRef.current);
      submitKeyRef.current = null; // confirmed — never reused
      setPhase("submitted");
        },
      );
    } catch (err) {
      setErrorMessage(describeSubmissionError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // 069. An approver passes on approving: the request moves on without them.
  // Their counterpart to a signer's decline, which the backend refuses from
  // an approver.
  const handleSkip = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await run({ message: "Recording your decision" }, async () => {
        await realSigningSubmissionService.skip();
        setPhase("skipped");
      });
    } catch (err) {
      setErrorMessage(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    // This had no in-flight guard at all: a second click sent a second decline.
    if (submitting) return;
    setSubmitting(true);
    try {
      await run({ message: "Recording your decision" }, async () => {
        await realSigningSubmissionService.decline(declineReason);
        setPhase("declined");
      });
    } catch (err) {
      setErrorMessage(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (splash !== "gone") {
    return (
      <LagdaLoader
        mode="fullscreen"
        theme="light"
        message="Opening your document securely"
        ariaLabel="Opening your document"
        showWordmark
        spinner
        isExiting={splash === "exiting"}
      />
    );
  }

  if (phase === "loading") {
    return (
      <SignerCard>
        <PhaseBanner
          icon={Loader2}
          tone="neutral"
          title="Opening your document"
          description="Checking your signing link and loading the document you were sent."
        />
      </SignerCard>
    );
  }

  if (phase === "unavailable") {
    return (
      <SignerCard>
        <PhaseBanner
          icon={XCircle}
          tone="danger"
          badge="Link closed"
          title="This link can't be used"
          description={errorMessage
            ?? "This signing link is invalid or has expired. Contact the sender for a new link."}
        />
        {token === CONTINUE_SEGMENT && <GoToDocumentsButton />}
      </SignerCard>
    );
  }

  if (phase === "submitted") {
    return (
      <SignerCard>
        <StepRail current="done" />
        {/* Says only what the backend actually does.

            A completion notice was removed from this screen once, because the
            promise was false: `NOTIFICATION_TYPES` had four members and none
            of them was a completion, so no producer existed and no completion
            email was ever sent.

            BACKEND-38 Phase 2 changed that. `SIGNING_COMPLETED` is a real
            notification type with a real producer: the finalization
            transaction that seals the document also writes the intent, and
            transport delivers it to the sender. So the sentence below is
            restored — but hedged exactly as far as the truth requires:

              "once every required participant has completed" — because this
              signer may not be the last one, and nothing is sent until the
              request as a whole finishes and its final seal succeeds;

              "automatically" rather than "has been" — the intent is durable
              and retried, but at this instant the email has not been sent,
              and claiming delivery is the same category of error as the
              original copy. */}
        <PhaseBanner
          icon={CheckCircle2}
          tone="success"
          badge="Complete"
          title={ceremonyWording(view?.recipient.type ?? "signer").doneTitle}
          description="You can close this page — nothing further is needed from you."
        />
        <Notice icon={ShieldCheck} tone="neutral">
          Once every required participant has completed their part, the sender is
          notified automatically. If you need confirmation of the completed
          document, contact the sender directly.
        </Notice>
      </SignerCard>
    );
  }

  if (phase === "skipped") {
    return (
      <SignerCard>
        <StepRail current="done" />
        <PhaseBanner
          icon={CheckCircle2}
          tone="neutral"
          badge="Skipped"
          title="You skipped this approval"
          description="The request continues to the next participant. Nothing further is needed from you."
        />
      </SignerCard>
    );
  }

  if (phase === "declined") {
    return (
      <SignerCard>
        {/* "The sender has been notified" is false here, and — unlike the
            submitted screen above — it is STILL false after BACKEND-38
            Phase 2. That phase added `SIGNING_COMPLETED` only. There is no
            decline notification type and no producer, so nothing tells the
            sender this happened.

            The decline IS recorded — it ends the request for everyone and
            revokes every grant — so that is what this says instead. */}
        <PhaseBanner
          icon={Ban}
          tone="warn"
          badge="Closed"
          title="You declined this request"
          description="Your decline was recorded and this signing request is now closed."
        />
        <Notice icon={AlertTriangle} tone="neutral">
          If you declined by mistake, contact the sender — a new request would
          have to be sent.
        </Notice>
      </SignerCard>
    );
  }

  if (phase === "choose" && view) {
    return (
      // `wide` (860px) rather than the default 560px, and it is load-bearing
      // rather than cosmetic. The panels ask for a 280px minimum column; at
      // 560px the card's inner width is ~512px, so two columns plus the gap
      // (578px) never fit and the grid silently collapsed to one. This is the
      // only ceremony screen with a wide card — kept wide now that it is a
      // single panel so the explanation reads as a paragraph, not a column.
      <SignerCard wide>
        <SigningEntryChoice
          documentTitle={view.request.documentTitle}
          maskedEmail={maskRecipientEmail(view.recipient.email)}
          onContinueWithAccount={handleSignInToConfirm}
        />
        {linkError !== null && (
          <p role="alert" style={{
            ...GF, margin: "10px 0 0", fontSize: 12.5, color: T.danger,
            lineHeight: 1.5, textAlign: "center",
          }}>
            {linkError}
          </p>
        )}
      </SignerCard>
    );
  }

  if (phase === "consent" && view) {
    return (
      <SignerCard>
        <StepRail current="consent" />
        <PhaseBanner
          icon={ShieldCheck}
          tone="info"
          badge="Required"
          title="Consent to sign electronically"
          description={`Before you can open "${view.request.documentTitle}", please confirm you consent to sign and be identified electronically for this transaction.`}
        />
        {errorMessage !== null && (
          <Notice icon={AlertTriangle} tone="danger">{errorMessage}</Notice>
        )}
        <ActionRow>
          <ActionButton
            icon={ShieldCheck}
            onClick={() => void handleAcceptConsent()}
            full
          >
            I consent — continue
          </ActionButton>
        </ActionRow>

        {/* Signing in is entirely optional and changes nothing about this
            ceremony — it records that the account and this recipient are the
            same person. Placed after the primary action, and worded so that
            not doing it reads as a normal choice rather than a lesser one. */}
        {view.accountLink === undefined ? (
          <div style={{ marginTop: 4 }}>
            <button
              type="button"
              onClick={handleSignInToConfirm}
              style={{
                ...GF, minHeight: 44, width: "100%", borderRadius: 10,
                border: `1px solid ${T.border}`, background: "transparent",
                color: T.inkSoft, fontSize: "clamp(12.5px, 3.3vw, 13px)",
                cursor: "pointer", lineHeight: 1.5, padding: "8px 12px",
              }}
            >
              Have a LAGDA account? Sign in to confirm it&rsquo;s you
            </button>
            {linkError !== null && (
              <p role="alert" style={{
                ...GF, margin: "8px 0 0", fontSize: 12, color: T.danger,
                lineHeight: 1.5,
              }}>
                {linkError}
              </p>
            )}
          </div>
        ) : (
          <p style={{
            ...GF, margin: "4px 0 0", fontSize: 12, color: T.success,
            lineHeight: 1.5, textAlign: "center",
          }}>
            Signed in as {view.accountLink.maskedEmail}
          </p>
        )}
      </SignerCard>
    );
  }

  if (phase === "decline-form" && view) {
    return (
      <SignerCard>
        <PhaseBanner
          icon={Ban}
          tone="warn"
          title="Decline this request"
          description="Tell the sender why, so they know what to do next. This closes the request for everyone."
        />

        <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
          <legend style={{
            ...GF, fontSize: 12, fontWeight: 700, color: T.silver,
            letterSpacing: "0.05em", textTransform: "uppercase", padding: 0,
            marginBottom: 8,
          }}>
            Reason
          </legend>
          {DECLINE_REASON_CATEGORIES.map((r) => {
            const selected = declineReason === r.id;
            return (
              <label
                key={r.id}
                style={{
                  ...GF, display: "flex", alignItems: "center", gap: 10,
                  // A full-width, 44px-tall target: a mis-tap here closes
                  // somebody's contract for the wrong stated reason.
                  minHeight: 44, padding: "8px 12px", marginBottom: 8,
                  borderRadius: 10, cursor: "pointer",
                  fontSize: "clamp(13px, 3.4vw, 14px)", color: T.ink,
                  background: selected ? T.azureWash : T.surface,
                  border: `1px solid ${selected ? "#B7DAF5" : T.border}`,
                }}
              >
                <input
                  type="radio" name="decline-reason" checked={selected}
                  onChange={() => { setDeclineReason(r.id); }}
                  style={{ width: 18, height: 18, flexShrink: 0, accentColor: T.azure }}
                />
                <span style={{ minWidth: 0 }}>{r.label}</span>
              </label>
            );
          })}
        </fieldset>

        {errorMessage !== null && (
          <Notice icon={AlertTriangle} tone="danger">{errorMessage}</Notice>
        )}

        <ActionRow>
          <ActionButton
            kind="danger" icon={Ban}
            onClick={() => void handleDecline()} full
          >
            Confirm decline
          </ActionButton>
          <ActionButton
            kind="secondary" icon={ArrowLeft}
            onClick={() => { setPhase("ceremony"); }} full
          >
            Back to document
          </ActionButton>
        </ActionRow>
      </SignerCard>
    );
  }

  if (phase === "ceremony" && view) {
    if (!view.access.mayProceedToInput) {
      return (
        <SignerCard>
          <StepRail current="sign" />
          <PhaseBanner
            icon={Clock}
            tone="warn"
            badge="Waiting"
            title="Not yet your turn"
            description="An earlier participant may still need to complete their part, or the request isn't currently active. Check back later — your link stays valid."
          />
          <IdentityStrip
            name={view.recipient.name}
            role={view.recipient.type}
            documentTitle={view.request.documentTitle}
          />
        </SignerCard>
      );
    }

    const isApprover = view.recipient.type === "approver";
    const wording = ceremonyWording(view.recipient.type);
    return (
      <SignerCard wide>
        <StepRail current="sign" />
        <PhaseBanner
          icon={FileSignature}
          tone="info"
          badge="Step 2 of 3"
          title={view.request.documentTitle}
          description={wording.description}
        />
        <IdentityStrip
          name={view.recipient.name}
          role={view.recipient.type}
          documentTitle={view.request.documentTitle}
        />

        {errorMessage !== null && (
          <Notice icon={AlertTriangle} tone="danger">{errorMessage}</Notice>
        )}

        {/* The document, with this signer's fields where the sender placed
            them. Replaces an `<iframe>` preview that sat beside an unrelated
            list of inputs: the signer could read the document and could fill
            fields, but nothing showed WHERE a signature would land.

            The source PDF is never modified — field positions live in the
            database as normalised rects and the merge draws them only at
            completion. What is shown is the original document plus a
            positioned overlay. */}
        {view.access.mayViewDocument && (
          <div style={{ marginBottom: 24 }}>
            <PositionedSigningSurface
              loadBlob={loadDocumentBlob}
              prepared={view.preparedSignatures}
              fields={surfaceFields}
              signature={signature}
              initials={initials}
              textValues={values}
              onSignature={setSignature}
              onInitials={setInitials}
              onTextValue={(fieldId, value) => {
                setValues(current => ({ ...current, [fieldId]: value }));
              }}
              disabled={submitting}
            />
          </div>
        )}

        {/* No separate field list. Every field this signer owns is filled on
            the page above, where its position is visible — a second copy of
            the same inputs would be two places to fill one value and two
            things to keep in step. */}

        {/* The action bar STICKS to the bottom of the viewport.
            A signer scrolled to page 9 of a contract should not have to scroll
            back to find Submit, and on a phone the button would otherwise sit
            below an unknown amount of document. */}
        <div
          style={{
            position: "sticky", bottom: 0, zIndex: 1,
            marginTop: 8, paddingTop: 12,
            paddingBottom: "max(12px, env(safe-area-inset-bottom))",
            background: "linear-gradient(to bottom, rgba(245,247,250,0), #F5F7FA 28%)",
          }}
        >
          <ActionRow>
            <ActionButton
              icon={submitting ? Loader2 : Send}
              onClick={() => void handleSubmit()}
              disabled={submitting}
              full
            >
              {submitting ? "Submitting…" : wording.action}
            </ActionButton>
            {isApprover ? (
              // Approvers cannot decline — the backend refuses it (069). Their
              // alternative to approving is skipping.
              <ActionButton
                kind="secondary"
                icon={SkipForward}
                onClick={() => void handleSkip()}
                disabled={submitting}
                full
              >
                Skip
              </ActionButton>
            ) : (
              <ActionButton
                kind="secondary"
                icon={Ban}
                onClick={() => { setPhase("decline-form"); }}
                disabled={submitting}
                full
              >
                Decline
              </ActionButton>
            )}
          </ActionRow>
        </div>
      </SignerCard>
    );
  }

  return null;
}

/**
 * The submit path's error wording.
 *
 * Separate from `describeError` because one refusal here has a remedy the
 * signer can act on, and the generic envelope message does not mention it.
 *
 * The backend refuses a typed signature its renderer cannot draw — it checks
 * while the signer is still present precisely so this can be said. A name with
 * characters the embedded face has no glyphs for, or one in a script its
 * shaper cannot lay out, is a hard stop for typing and completely fine for
 * drawing. Saying only "could not be accepted" would leave the one group of
 * signers affected by that check with no way forward.
 */
function describeSubmissionError(err: unknown): string {
  if (err instanceof ApiError) {
    const unrenderable = err.body?.details?.find(
      (detail) => detail.code === "signature-unrenderable");
    if (unrenderable) {
      const control = unrenderable.field === "initials" ? "initials" : "signature";
      return `Your typed ${control} can't be drawn into this document. `
        + `Switch to Draw or Upload above, or try a different spelling.`;
    }
  }
  return describeError(err);
}

/**
 * What a signer is told when a link will not open, whatever the reason.
 *
 * Says what to do next, names no cause, and is identical for every failure.
 */
const LINK_UNUSABLE =
  "This signing link can no longer be opened. It may have expired, already "
  + "been used, or been replaced by a newer one. Ask the sender to send you a "
  + "new link.";

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Your signing session has ended. Open your signing link again to continue.";
    if (err.status === 403) return "This action could not be verified. Reload the page and try again.";
    return err.message;
  }
  return "Something went wrong. Please try again.";
}

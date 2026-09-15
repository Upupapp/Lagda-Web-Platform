// Firebase-provider email-verification action handler — the page Firebase's
// own verification email links to (see Console setup: Action URL
// customization must point here). P2 Firebase migration mission §10-§13.
//
// TWO SEPARATE CONFIRMATIONS, IN ORDER:
//   1. Firebase applies its own action code (proves the visitor controls the
//      mailbox, to Firebase's own satisfaction).
//   2. LAGDA's backend independently re-checks that with the Admin SDK and
//      only THEN marks the LAGDA account verified (finalizeExternalEmailVerification).
// Step 1 alone never grants app access — this page never navigates into
// /app on Firebase's word; only after step 2 succeeds does it route to
// /sign-in, same destination the non-Firebase /verify-email flow already
// uses (never straight into onboarding — no session exists yet either way).
//
// Never exposes: Firebase internal exceptions, the raw oobCode, the custom
// token, or any service-account detail. Only the same small error
// vocabulary /verify-email already uses (invalid/expired/temporary).

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  applyFirebaseVerificationAction,
} from "../../services/firebase-verification";
import { realAuthService } from "../../services/real/auth.service";
import { sanitizeOnboardingReturnTo } from "../../utils/authReturnPath";

const GF = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";

type PageState =
  | "verifying" | "verified" | "invalid" | "expired" | "already-verified" | "temporary-failure";

export function FirebaseVerificationAction() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [state, setState] = useState<PageState>("verifying");
  const ran = useRef(false);

  const oobCode = params.get("oobCode");
  const mode = params.get("mode");
  const challengeId = params.get("challengeId");
  const returnTo = params.get("returnTo") ?? "/onboarding/profile";

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      if (mode !== "verifyEmail" || !oobCode || !challengeId) {
        setState("invalid");
        return;
      }

      // Step 1: best-effort only. We try to apply Firebase's action code
      // ourselves, in case nothing else has yet — but we do NOT gate on the
      // outcome. A single-use oobCode can be consumed by something other
      // than this exact page load (an email client's link-scanner/safe-
      // browsing prefetch is a known, common cause) while Firebase's own
      // server-side emailVerified flag still ends up correctly set. Treating
      // "this browser's attempt to apply the code failed" as fatal would
      // wrongly dead-end a real, already-verified user — so Step 1's result
      // is informational only; Step 2 (below) is the actual source of truth.
      await applyFirebaseVerificationAction(oobCode);

      // Step 2: LAGDA's own server-side confirmation. This is the ONLY call
      // that can mark the LAGDA account verified, and it independently
      // re-checks Firebase's own server-side state via the Admin SDK — it
      // needs only `challengeId`, never the client's own oobCode outcome.
      // So it is always attempted, even when Step 1 above reported failure.
      try {
        const result = await realAuthService.finalizeFirebaseVerification(challengeId);
        if (!result.verified) {
          setState("invalid");
          return;
        }
        setState("verified");
        setTimeout(() => navigate(
          `/sign-in?returnTo=${encodeURIComponent(sanitizeOnboardingReturnTo(returnTo))}`,
          { replace: true },
        ), 1200);
      } catch {
        setState("temporary-failure");
      }
    })();
  }, [mode, oobCode, challengeId, returnTo, navigate]);

  const copy: Record<PageState, { title: string; body: string }> = {
    verifying: { title: "Verifying your email…", body: "This will only take a moment." },
    verified: { title: "Email verified", body: "Redirecting you to sign in…" },
    invalid: {
      title: "This link is not valid",
      body: "The verification link is invalid or has already been used. Request a new one from the sign-in page.",
    },
    expired: {
      title: "This link has expired",
      body: "Request a new verification email and try again.",
    },
    "already-verified": {
      title: "Already verified",
      body: "Your email is already verified — you can sign in.",
    },
    "temporary-failure": {
      title: "Something went wrong",
      body: "We couldn't complete verification right now. Please try again in a moment.",
    },
  };
  const { title, body } = copy[state];

  // Content only — the surrounding card/branding shell is AuthLayout,
  // applied by the router's <AuthPage> wrapper, same as VerifyEmail.tsx.
  return (
    <div style={{ ...GF, textAlign: "center", padding: "8px 0" }}>
      {state === "verifying" && (
        <div
          role="status" aria-live="polite"
          style={{
            width: 28, height: 28, border: "2px solid rgba(0,120,212,0.2)",
            borderTopColor: AZURE, borderRadius: "50%",
            animation: "fva-spin 0.8s linear infinite", margin: "0 auto 16px",
          }}
          aria-label="Verifying"
        />
      )}
      <h1 style={{ fontSize: 20, fontWeight: 800, color: "#07111F", margin: "0 0 8px" }}>{title}</h1>
      <p style={{ fontSize: 14, color: "#64748B", margin: "0 0 20px", lineHeight: 1.6 }}>{body}</p>
      {state !== "verifying" && state !== "verified" && (
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <Link to="/sign-in" style={{ color: AZURE, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            ← Back to Sign In
          </Link>
          <Link to="/verify-email" style={{ color: AZURE, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            Request a new link
          </Link>
        </div>
      )}
      <style>{"@keyframes fva-spin { to { transform: rotate(360deg); } }"}</style>
    </div>
  );
}

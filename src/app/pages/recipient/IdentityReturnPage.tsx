// /sign/identity/return — where the identity verification partner sends the
// browser when a participant has finished on its page.
//
// The partner adds its own values to the address (a session id, a status).
// They are UNTRUSTED: anyone can type them. This page never reads, shows or
// acts on them, and takes them out of the address bar before anything else,
// so they are not in history, a screenshot or a shared tab either. Whether
// the check was passed is asked of LAGDA's own server, by the signing page.
//
// All this page does is find out whether this device still has the
// participant's signing session (the same cookie the signing page uses):
//
//   it has   → on to the signing page, told through router state (never the
//              address) that the participant has just come back, so it asks
//              for the result every few seconds
//   it has not → there is nothing to continue here. That is a computer whose
//              session ran out, or a phone the check was finished on while
//              the computer that started it waits. The page cannot tell
//              which, so it says what to do in either case.
//
// SECURITY: like the signing page, this never imports PlatformContext or the
// workspace client.

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, Loader2, MonitorSmartphone, RefreshCw } from "lucide-react";
import {
  SignerCard, PhaseBanner, Notice, ActionButton, ActionRow,
} from "../../components/recipient/signer-ui";
import { realSigningAccessService } from "../../services/real/signing-access.service";
import { ApiError } from "../../services/api-client";
import { SIGNING_CONTINUE_PATH, identityReturnState } from "../../models/identity-check";

const PAGE_TITLE = "Identity Check — LAGDA eSignature";

type Phase = "returning" | "no-session" | "unreachable";

export function IdentityReturnPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("returning");
  const [attempt, setAttempt] = useState(0);
  /** One question per try, however many times the effect is run. */
  const readingRef = useRef<Promise<unknown> | null>(null);

  useEffect(() => {
    // Out of the address bar before anything else happens.
    if (window.location.search !== "" || window.location.hash !== "") {
      window.history.replaceState(null, "", window.location.pathname);
    }
    const previous = document.title;
    document.title = PAGE_TITLE;
    // One person's way back from a check is nothing a search engine should hold.
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (robots === null) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex, nofollow";
    return () => { document.title = previous; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    // `read()`, never `enter()`: it writes nothing, and they entered before they left.
    readingRef.current ??= realSigningAccessService.read();
    readingRef.current.then(
      () => {
        if (cancelled) return;
        void navigate(SIGNING_CONTINUE_PATH, { replace: true, state: identityReturnState(Date.now()) });
      },
      (error: unknown) => {
        if (cancelled) return;
        readingRef.current = null;
        setPhase(error instanceof ApiError && error.status === 401 ? "no-session" : "unreachable");
      },
    );
    return () => { cancelled = true; };
  }, [attempt, navigate]);

  const retry = useCallback(() => {
    setPhase("returning");
    setAttempt(count => count + 1);
  }, []);

  if (phase === "no-session") {
    return (
      <SignerCard>
        <PhaseBanner
          icon={MonitorSmartphone} tone="neutral" title="Nothing more is needed on this device"
          description="You can return to your computer. It will continue by itself."
        />
        <Notice tone="neutral">
          Started on this device instead? Your signing session has ended. Open your signing
          link again to continue.
        </Notice>
      </SignerCard>
    );
  }

  if (phase === "unreachable") {
    return (
      <SignerCard>
        <PhaseBanner
          icon={AlertTriangle} tone="warn" title="We could not bring you back to your document"
          description="Check your connection, then try again. You can also open your signing link again."
        />
        <ActionRow>
          <ActionButton icon={RefreshCw} onClick={retry} full>Try again</ActionButton>
        </ActionRow>
      </SignerCard>
    );
  }

  return (
    <SignerCard>
      <div role="status" aria-live="polite">
        <PhaseBanner
          icon={Loader2} tone="neutral" title="Returning to your document…"
          description="This takes a moment. Keep this page open."
        />
      </div>
    </SignerCard>
  );
}

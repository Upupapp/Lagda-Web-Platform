// /sign/identity/handoff#<token> — the identity check, continued on a phone.
//
// Reached by scanning the QR code a participant's computer shows. There is no
// sign-in and no session here: the token in the link's FRAGMENT is the whole
// credential. A fragment is never sent to a server and never appears in a
// Referer; it is read once, taken out of the address bar at once (so it is
// not in history, a screenshot or a shared tab), and kept in memory only. A
// reload therefore ends the visit, and the computer can simply show a new
// code.
//
// The stages are the signing page's own (`IdentityCheckStages`), run against
// the hand-off link instead of a ceremony. What differs is the end: a phone
// has no document to go on to, so it says "done" and the computer, which has
// been watching, continues by itself.
//
// SECURITY: like the signing page, this never imports PlatformContext or the
// workspace client. Its two requests carry the token in the body and no
// cookie at all.

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, XCircle } from "lucide-react";
import {
  SignerCard, PhaseBanner, ActionButton, ActionRow,
} from "../../components/recipient/signer-ui";
import { IdentityCheckStages } from "../../components/recipient/IdentityCheckStep";
import {
  realIdentityHandoffService, identityHandoffRetryable, type IdentityHandoffSession,
} from "../../services/real/identity-handoff.service";
import type {
  CeremonyIdentityCheck, IdentityCheckSubmission,
} from "../../services/real/signing-access.service";
import { identityHandoffTimeLeft } from "../../models/identity-check";

const PAGE_TITLE = "Identity Check — LAGDA eSignature";

type Phase =
  | { readonly kind: "opening" }
  | { readonly kind: "ready"; readonly session: IdentityHandoffSession; readonly deadline: number | null }
  /** The connection, not the link: the same link can be tried again. */
  | { readonly kind: "unreachable" }
  | { readonly kind: "ended" };

function readToken(): string {
  const raw = window.location.hash.replace(/^#/, "");
  if (raw === "") return "";
  try { return decodeURIComponent(raw); } catch { return raw; }
}

/** How the stages are told where this participant stands. */
function standingOf(session: IdentityHandoffSession): CeremonyIdentityCheck {
  const locked = session.status === "locked" || session.attemptsRemaining <= 0;
  return {
    required: true,
    status: locked ? "locked" : "pending",
    mode: session.mode,
    attemptsRemaining: session.attemptsRemaining,
    verifiedAt: null,
    idTypes: session.idTypes,
  };
}

export function IdentityHandoffPage() {
  // Read during the first render and held here: never in storage, and not in
  // state, so it is in no devtools snapshot of this component's props.
  const tokenRef = useRef<string | null>(null);
  tokenRef.current ??= readToken();
  const [phase, setPhase] = useState<Phase>({ kind: "opening" });
  /** One opening per attempt, however many times the effect is run. */
  const openingRef = useRef<Promise<IdentityHandoffSession> | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Out of the address bar before anything else happens.
    if (window.location.hash !== "") {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    const previous = document.title;
    document.title = PAGE_TITLE;
    // A link to one person's check is nothing a search engine should hold.
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
    const token = tokenRef.current ?? "";
    if (token === "") { setPhase({ kind: "ended" }); return; }
    let cancelled = false;
    openingRef.current ??= realIdentityHandoffService.open(token);
    openingRef.current.then(
      session => {
        if (cancelled) return;
        const now = Date.now();
        const left = identityHandoffTimeLeft(session.expiresAt, now);
        setPhase({ kind: "ready", session, deadline: left === null ? null : now + left });
      },
      (error: unknown) => {
        if (cancelled) return;
        openingRef.current = null;
        setPhase(identityHandoffRetryable(error) ? { kind: "unreachable" } : { kind: "ended" });
      },
    );
    return () => { cancelled = true; };
  }, [attempt]);

  const submit = useCallback(
    (input: IdentityCheckSubmission) => realIdentityHandoffService.submit(tokenRef.current ?? "", input), []);

  const end = useCallback(() => {
    // Nothing more can be done with it: let it go.
    tokenRef.current = "";
    setPhase({ kind: "ended" });
  }, []);

  if (phase.kind === "opening") {
    return (
      <SignerCard>
        <PhaseBanner
          icon={Loader2} tone="neutral" title="Opening the identity check"
          description="Checking the code you scanned."
        />
      </SignerCard>
    );
  }

  if (phase.kind === "unreachable") {
    return (
      <SignerCard>
        <PhaseBanner
          icon={AlertTriangle} tone="warn" title="The identity check could not be opened"
          description="Check your connection, then try again. Keep this page open: reloading it loses the code you scanned."
        />
        <ActionRow>
          <ActionButton
            icon={RefreshCw} full
            onClick={() => { setPhase({ kind: "opening" }); setAttempt(count => count + 1); }}
          >
            Try again
          </ActionButton>
        </ActionRow>
      </SignerCard>
    );
  }

  if (phase.kind === "ended") {
    return (
      <SignerCard>
        <PhaseBanner
          icon={XCircle} tone="warn" badge="Link ended" title="This link has ended"
          description="Go back to your computer and get a new code."
        />
      </SignerCard>
    );
  }

  return (
    <SignerCard>
      <IdentityCheckStages
        identityCheck={standingOf(phase.session)}
        documentTitle={phase.session.documentTitle}
        transport={{ kind: "handoff", submit, deadline: phase.deadline, onEnded: end }}
      />
    </SignerCard>
  );
}

// /app/settings/identity/return and /app/enotary/return — where the identity
// verification partner sends the browser after a check a signed-in person
// started from My Settings or from the eNotary gate.
//
// The partner adds its own values to the address (a session id, a status).
// They are UNTRUSTED: anyone can type them. This page never reads, shows or
// acts on them, and takes them out of the address bar before anything else,
// so they are not in history, a screenshot or a shared tab either. Whether
// the check was passed is asked of LAGDA's own server, by the page this one
// routes to.
//
// All it does is route:
//
//   signed in   → on to the page that started the check, told through router
//                 state (never the address) that the person has just come
//                 back, so it starts asking for the result
//   signed out  → the ordinary sign-in, with that same page as the way back.
//                 Never this address: it would carry the partner's values.
//
// It sits outside the platform shell on purpose. The shell's own signed-out
// redirect keeps the address it was reached at, query and all.
//
// From the Notary Directory: the directory (a static page outside this app)
// starts the same account check, and marks this tab before it leaves
// (config/enotary-directory). Where that mark is here, the page does not route
// on but offers the way back to the directory, a full page load, where the
// directory asks LAGDA's server for the result itself.
//
// Nothing depends on this page being reached. The device that FINISHES the
// check is the one sent here, and that is often a phone the person is not
// signed in on (and, against a developer's server, a phone that cannot open
// the address at all). The page that started the check keeps asking by itself.

import { useLayoutEffect, useState } from "react";
import { Navigate } from "react-router";
import { ArrowLeft, Loader2, ScanFace } from "lucide-react";
import { usePlatform } from "../../../context/PlatformContext";
import { GF, PhaseBanner, SurfaceCard, T, TAP } from "../../../components/system/design-system";
import { ENOTARY_DIRECTORY_PATH, identityCheckStartedFromDirectory } from "../../../config/enotary-directory";
import { buildSignInUrl } from "../../../utils/authReturnPath";
import {
  ACCOUNT_IDENTITY_PATH, enotaryAccessPath, providerReturnState, rememberedEnotaryRole,
} from "../../../models/identity-check";

function stripAddress(): void {
  if (window.location.search !== "" || window.location.hash !== "") {
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }
}

function ProviderReturnPage({ destination, fromDirectory = () => false }: {
  destination: () => string;
  /** The check was started from the Notary Directory in this tab. */
  fromDirectory?: () => boolean;
}) {
  const { sessionStatus } = usePlatform();
  // Out of the address bar before anything else happens, and decided once.
  const [to] = useState(() => { stripAddress(); return destination(); });
  const [state] = useState(() => providerReturnState(Date.now()));
  const [backToDirectory] = useState(fromDirectory);

  useLayoutEffect(() => {
    stripAddress();
    // One person's way back from a check is nothing a search engine should hold.
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (robots === null) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex, nofollow";
  }, []);

  if (backToDirectory) {
    return (
      <SurfaceCard>
        <PhaseBanner
          icon={ScanFace} tone="neutral" title="Back from the identity check"
          description="Return to the Notary Directory to see the result and continue."
        />
        <a
          href={ENOTARY_DIRECTORY_PATH} data-testid="identity-return-directory"
          style={{
            ...GF, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            minHeight: TAP, padding: "0 22px", borderRadius: 10, boxSizing: "border-box",
            background: T.azure, color: T.surface, fontSize: 14.5, fontWeight: 700, textDecoration: "none",
          }}
        >
          <ArrowLeft size={16} aria-hidden /> Back to the Notary Directory
        </a>
      </SurfaceCard>
    );
  }
  if (sessionStatus === "initializing") {
    return (
      <SurfaceCard>
        <div role="status" aria-live="polite">
          <PhaseBanner icon={Loader2} tone="neutral" title="Returning…" description="This takes a moment. Keep this page open." />
        </div>
      </SurfaceCard>
    );
  }
  if (sessionStatus !== "authenticated") {
    return (
      <Navigate
        to={buildSignInUrl(to)} replace
        {...(sessionStatus === "expired" ? { state: { reason: "expired" } } : {})}
      />
    );
  }
  return <Navigate to={to} replace state={state} />;
}

/** /app/settings/identity/return */
export function IdentityVerificationReturnPage() {
  return <ProviderReturnPage destination={() => ACCOUNT_IDENTITY_PATH} fromDirectory={identityCheckStartedFromDirectory} />;
}

/** /app/enotary/return — back to the gate, for the role the check was started for. */
export function EnotaryReturnPage() {
  return <ProviderReturnPage destination={() => enotaryAccessPath(rememberedEnotaryRole())} />;
}

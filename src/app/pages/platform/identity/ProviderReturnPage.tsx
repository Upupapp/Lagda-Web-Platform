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
// Nothing depends on this page being reached. The device that FINISHES the
// check is the one sent here, and that is often a phone the person is not
// signed in on (and, against a developer's server, a phone that cannot open
// the address at all). The page that started the check keeps asking by itself.

import { useLayoutEffect, useState } from "react";
import { Navigate } from "react-router";
import { Loader2 } from "lucide-react";
import { usePlatform } from "../../../context/PlatformContext";
import { PhaseBanner, SurfaceCard } from "../../../components/system/design-system";
import { buildSignInUrl } from "../../../utils/authReturnPath";
import {
  ACCOUNT_IDENTITY_PATH, enotaryAccessPath, providerReturnState, rememberedEnotaryRole,
} from "../../../models/identity-check";

function stripAddress(): void {
  if (window.location.search !== "" || window.location.hash !== "") {
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }
}

function ProviderReturnPage({ destination }: { destination: () => string }) {
  const { sessionStatus } = usePlatform();
  // Out of the address bar before anything else happens, and decided once.
  const [to] = useState(() => { stripAddress(); return destination(); });
  const [state] = useState(() => providerReturnState(Date.now()));

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
  return <ProviderReturnPage destination={() => ACCOUNT_IDENTITY_PATH} />;
}

/** /app/enotary/return — back to the gate, for the role the check was started for. */
export function EnotaryReturnPage() {
  return <ProviderReturnPage destination={() => enotaryAccessPath(rememberedEnotaryRole())} />;
}

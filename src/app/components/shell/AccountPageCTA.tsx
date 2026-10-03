// The closing call-to-action of a public page, aware of whether the visitor
// is signed in.
//
// Signed out (or while the session is still loading), it renders exactly as
// written. Signed in, the "Create Free Account" button (any button pointing at
// /create-account) becomes "Go to Dashboard" — or "Prepare Document" when
// `kind="prepare"` — and the heading and sub-line switch to their signed-in
// versions when the page gives them.

import type { ComponentProps } from "react";
import { PageCTA } from "../esignature/EsigPageShell";
import { useAccountCta } from "../../hooks/useSignedIn";

type PageCTAProps = ComponentProps<typeof PageCTA>;

const CREATE_ACCOUNT = "/create-account";

export function AccountPageCTA({
  kind = "dashboard",
  signedInHeading,
  signedInSub,
  ...props
}: PageCTAProps & {
  kind?: "dashboard" | "prepare";
  /** Heading for a signed-in visitor; the normal heading when not given. */
  signedInHeading?: string;
  /**
   * Sub-line for a signed-in visitor. `true` uses the standard signed-in
   * sentence; a string replaces it; not given keeps the normal sub-line.
   */
  signedInSub?: string | true;
}) {
  const cta = useAccountCta(kind);
  if (!cta.signedIn) return <PageCTA {...props} />;

  const next: PageCTAProps = { ...props };
  if (props.primaryPath === CREATE_ACCOUNT) {
    next.primaryLabel = cta.label;
    next.primaryPath = cta.path;
  }
  if (props.secondaryPath === CREATE_ACCOUNT) {
    next.secondaryLabel = cta.label;
    next.secondaryPath = cta.path;
  }
  if (signedInHeading) next.heading = signedInHeading;
  if (signedInSub === true) next.sub = cta.sub;
  else if (typeof signedInSub === "string") next.sub = signedInSub;
  return <PageCTA {...next} />;
}

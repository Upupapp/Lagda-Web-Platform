// Whether the visitor on a public (marketing) page is signed in, and the
// account call-to-action that fits them.
//
// The public pages invite visitors to create an account. A visitor who is
// already signed in should be sent into the app instead, not asked to sign
// up again. Until the session is known ("initializing") the pages keep the
// signed-out wording, so a signed-out visitor never sees the buttons change.
//
// Public pages are also rendered on their own (in tests, and anywhere outside
// <PlatformProvider>); there the visitor counts as signed out.

import { usePlatform } from "../context/PlatformContext";

export function useSignedIn(): boolean {
  try {
    return usePlatform().sessionStatus === "authenticated";
  } catch {
    return false;
  }
}

export interface AccountCta {
  label: string;
  path: string;
  /** A sentence for under a page's closing heading. */
  sub: string;
}

/**
 * The account call-to-action for a public page.
 * - "dashboard": the general one — create an account, or go to the dashboard.
 * - "prepare": where the page is about sending a first document — create an
 *   account, or start preparing a document.
 */
export function useAccountCta(kind: "dashboard" | "prepare" = "dashboard"): AccountCta & { signedIn: boolean } {
  const signedIn = useSignedIn();
  if (!signedIn) {
    return {
      signedIn,
      label: "Create Free Account",
      path: "/create-account",
      sub: "Create a free LAGDA account and send your first document today.",
    };
  }
  return kind === "prepare"
    ? { signedIn, label: "Prepare Document", path: "/app/prepare", sub: "You're signed in. Prepare a document and send it for signing." }
    : { signedIn, label: "Go to Dashboard", path: "/app/dashboard", sub: "You're signed in. Pick up where you left off in your dashboard." };
}

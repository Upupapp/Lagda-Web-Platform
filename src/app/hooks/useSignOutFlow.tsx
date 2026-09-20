// Signing out: confirm, then show what is happening while it happens.
//
// Sign-out had no confirmation anywhere — sidebar, mobile drawer and the
// onboarding header all signed you out on a single click, and the sidebar
// button sits directly under the workspace switcher. It also awaited a real
// network call with no feedback at all, and one call site dropped the promise
// entirely, so a slow sign-out looked like a dead button.
//
// Both halves live here rather than in each of the three call sites, so the
// wording, the destructive styling and the redirect cannot drift apart.

import { useCallback } from "react";
import { useNavigate } from "react-router";
import { usePlatform } from "../context/PlatformContext";
import { useConfirm } from "../components/platform/ConfirmDialog";
import { useProcessing } from "../services/processing.service";

export interface SignOutFlow {
  /** Opens the confirmation. Signing out only happens if it is accepted. */
  requestSignOut: () => void;
  /** Render this somewhere in the component's JSX. */
  confirmDialog: React.ReactElement | null;
}

/**
 * @param beforeSignOut Ran after confirmation, before the sign-out request —
 *   for callers that must close a drawer or reset local state first.
 */
export function useSignOutFlow(beforeSignOut?: () => void): SignOutFlow {
  const { signOut } = usePlatform();
  const { run } = useProcessing();
  const { confirm, confirmDialog } = useConfirm();
  const navigate = useNavigate();

  const requestSignOut = useCallback(() => {
    confirm({
      title: "Sign out of LAGDA?",
      body: "You will need to sign in again to reach your documents. Anything you have already sent keeps going.",
      confirmLabel: "Sign out",
      cancelLabel: "Stay signed in",
      destructive: true,
      onConfirm: async () => {
        beforeSignOut?.();
        await run(
          {
            message: "Signing you out",
            detail: "Ending your session and clearing this device.",
          },
          async () => {
            await signOut();
          },
        );
        // After the session is gone, not before: a failed sign-out that had
        // already navigated would leave a signed-in session behind a
        // signed-out screen.
        void navigate("/sign-in");
      },
    });
  }, [confirm, beforeSignOut, run, signOut, navigate]);

  return { requestSignOut, confirmDialog };
}

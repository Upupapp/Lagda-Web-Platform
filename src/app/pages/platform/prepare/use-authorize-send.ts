// What pressing Authorize does: a deliberate pause the sender can read, then
// on to the confirmation page, which is where the send itself happens.
//
// It lives here, not in the Authorization step, because the button is in the
// footer of the preparation layout: the place Continue sits on every other
// step. The step shows what is about to be sent; the footer carries the one
// way forward.

import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useProcessing } from "../../../services/processing.service";

export function useAuthorizeSend(): () => void {
  const navigate = useNavigate();
  const { run: runProcessing } = useProcessing();

  return useCallback(() => {
    void (async () => {
      await runProcessing(
        {
          message: "Authorizing",
          detail: "Preparing your document for sending.",
          // Long enough to read. A confirmation that flickers past leaves
          // somebody unsure whether they pressed the button at all.
          minDuration: 1200,
        },
        // Nothing to await: the real send happens on the confirmation page,
        // which owns the idempotency keys and the failure handling. This
        // step's only job is the deliberate pause and the navigation.
        async () => Promise.resolve(true),
      );
      void navigate("/app/prepare/confirmation");
    })();
  }, [navigate, runProcessing]);
}

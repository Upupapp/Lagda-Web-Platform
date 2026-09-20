// Opening the Prepare flow, with the branded modal shown first.
//
// ── Why this is a click handler and not a route-level effect ───────────────
//
// Showing the modal on arrival at /app/prepare would have been one file
// instead of eleven, but it would also fire on a back-button return and on a
// pasted URL, where nothing is being launched and a modal is just a stutter.
// The modal belongs to the ACT of starting, so it hangs off the act.
//
// ── Why the links stay links ──────────────────────────────────────────────
//
// Every entry point is an <a> today. Turning them into buttons would cost
// middle-click, ctrl-click, "open in new tab" and the status-bar URL preview —
// all of which people use on a primary navigation item. So the href stays
// exactly as it was and this only intercepts the plain left-click, which is
// the one case where we want to show something first.

import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useProcessing } from "../services/processing.service";

/** Long enough to read the mark, short enough not to feel like a wait. */
const PREPARE_HOLD_MS = 1000;

/** A click that has its own meaning to the browser, which we must not steal. */
function isModifiedClick(event: React.MouseEvent): boolean {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

export function usePrepareLaunch() {
  const { run } = useProcessing();
  const navigate = useNavigate();

  /**
   * Attach to a <Link to={path}> as `onClick`. Leaves modified clicks alone so
   * they open a tab the way the user asked.
   */
  const onPrepareClick = useCallback(
    (path = "/app/prepare") =>
      (event: React.MouseEvent) => {
        if (isModifiedClick(event)) return;
        event.preventDefault();
        void (async () => {
          await run(
            {
              message: "Opening document preparation",
              detail: "Getting your workspace ready.",
              // There is no work to wait for here — the modal IS the
              // transition, so the hold is the whole point.
              minDuration: PREPARE_HOLD_MS,
            },
            async () => undefined,
          );
          void navigate(path);
        })();
      },
    [run, navigate],
  );

  return { onPrepareClick };
}

// Loading, failure and retry for a single async read.
//
// WHY THIS EXISTS. A scan of the platform found 104 service calls across 32
// files chained as `service.thing().then(setState)` with no `.catch` and no try.
// That shape has one failure mode and it is the worst kind: if the promise
// rejects, the state never fills, the component's loading branch never exits,
// and the user is left on a spinner forever. Nothing throws where a boundary
// can see it, nothing is logged, and the promise rejection is unhandled. The
// screen simply waits, and so does the person looking at it.
//
// The state vocabulary is deliberately the one DocumentsPage already used —
// "loading" | "ready" | "full-error" — rather than a new one, so the two do not
// have to be learned separately.

import { useCallback, useEffect, useRef, useState } from "react";
import { log } from "../utils/logger";

export type AsyncStatus = "loading" | "ready" | "full-error";

export interface AsyncData<T> {
  status: AsyncStatus;
  /** Populated only when `status` is `"ready"`. */
  data: T | null;
  /** Re-runs the loader. Safe to hand straight to a retry button. */
  retry: () => void;
}

/**
 * Runs `load` on mount and whenever `deps` change.
 *
 * The loader is passed an AbortSignal-like `cancelled` flag rather than being
 * cancelled outright, because the mock services return plain promises with no
 * abort support. What matters is that a resolved promise from a previous deps
 * value can never overwrite the current one — the stale-response race that
 * makes a list briefly show the wrong filter's results.
 *
 * @param label Used in the failure log line. Should say what was being loaded.
 */
export function useAsyncData<T>(
  load: () => Promise<T>,
  deps: readonly unknown[],
  label: string,
): AsyncData<T> {
  const [status, setStatus] = useState<AsyncStatus>("loading");
  const [data, setData] = useState<T | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Held in a ref so changing the loader identity every render — which it does,
  // because callers pass an inline arrow — does not restart the effect.
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setData(null);

    loadRef.current().then(
      result => {
        if (cancelled) return;
        setData(result);
        setStatus("ready");
      },
      error => {
        if (cancelled) return;
        // The user gets a retry; whoever debugs it gets the reason. `log`
        // redacts before emitting.
        log.warn(`${label} failed to load`, error);
        setStatus("full-error");
      },
    );

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);

  return { status, data, retry };
}

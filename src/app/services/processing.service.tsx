// The service that puts ProcessingModal on screen.
//
// ── Why `run` is the API and `show`/`hide` are the escape hatch ────────────
//
// Every bug this kind of modal has is the same bug: the work ended down a path
// that forgot to call hide(). An early `return` on a validation failure, a
// throw from the third request in a chain, a 409 that branches to a retry.
// The modal is not dismissible — that is deliberate, since cancelling it would
// not cancel the request behind it — so a missed hide() is an application the
// user has to reload.
//
// `run` makes that unrepresentable: the hide lives in a `finally`, so it fires
// on success, on throw and on early return alike. Prefer it everywhere. The
// imperative pair remains exported for the rare case where the work does not
// fit inside one function.
//
// ── Ref-counting ──────────────────────────────────────────────────────────
//
// Concurrent operations are real here: the upload step fires one `run` per
// dropped file. A count, not a boolean, so the modal lifts when the LAST one
// finishes rather than the first.
//
// ── The two timings ───────────────────────────────────────────────────────
//
// APPEAR_DELAY_MS — work that finishes in under 180ms never shows a modal at
// all. Flashing a dialog for one frame is noise, not feedback.
// MIN_DISPLAY_MS — but once it IS up, it stays long enough to be read. A modal
// that appears and vanishes within 100ms reads as a glitch and the user cannot
// tell what happened.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ProcessingModal,
  PROCESSING_EXIT_MS,
  type ProcessingStep,
} from "../components/brand/ProcessingModal";

export interface ProcessingOptions {
  /** What is happening, in the user's terms. */
  message: string;
  /** Optional second line: reassurance, or what happens next. */
  detail?: string;
  /** Optional phase checklist for multi-stage work. */
  steps?: ProcessingStep[];
  /**
   * Hold the CALLER for at least this long, even if the work finishes sooner.
   *
   * This is the one setting here that deliberately delays the application, so
   * it is opt-in and never a default. It exists for transitions where the
   * modal is the point — clicking "Prepare Document" should show what is
   * starting before the route changes underneath it.
   *
   * It applies only when the work succeeds. A failure is reported at once:
   * making someone wait to be told something went wrong is just rude.
   */
  minDuration?: number;
}

/** Handed to the body of `run` so it can narrate its own progress. */
export interface ProcessingController {
  update: (next: Partial<ProcessingOptions>) => void;
}

interface ProcessingContextValue {
  run: <T>(
    options: ProcessingOptions,
    work: (controller: ProcessingController) => Promise<T>,
  ) => Promise<T>;
  show: (options: ProcessingOptions) => void;
  update: (next: Partial<ProcessingOptions>) => void;
  hide: () => void;
  isProcessing: boolean;
}

const noop = () => {};

// The default value runs the work without any modal. That way a component
// rendered outside the provider — a unit test, a Storybook-style harness —
// still performs its operation correctly instead of throwing.
const ProcessingContext = createContext<ProcessingContextValue>({
  run: (_options, work) => work({ update: noop }),
  show: noop,
  update: noop,
  hide: noop,
  isProcessing: false,
});

const APPEAR_DELAY_MS = 180;

/**
 * How long the modal stays up once it has appeared.
 *
 * Raised from 450ms so the mark completes a full pass of its animation rather
 * than being cut off mid-sweep. This is purely how long the MODAL lingers —
 * `run` still resolves the moment the work does, so nothing downstream waits
 * on it. Navigation, state updates and error handling all proceed at their
 * own speed while the modal fades out over the top; a test pins that.
 *
 * The one exception is an explicit `minDuration`, which is opt-in per call.
 */
const MIN_DISPLAY_MS = 1400;

export function ProcessingProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [options, setOptions] = useState<ProcessingOptions>({ message: "Working…" });

  const count = useRef(0);
  const visibleRef = useRef(false);
  const shownAt = useRef(0);
  const appearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((next: ProcessingOptions) => {
    count.current += 1;
    setOptions(next);

    // A show() arriving mid-exit cancels the exit rather than queueing behind
    // it, so back-to-back operations look like one continuous wait.
    clearTimeout(hideTimer.current);
    clearTimeout(unmountTimer.current);
    if (visibleRef.current) setExiting(false);

    if (count.current === 1 && !visibleRef.current) {
      clearTimeout(appearTimer.current);
      appearTimer.current = setTimeout(() => {
        // Re-check: the work may have finished inside the delay, in which case
        // the modal must never appear.
        if (count.current > 0) {
          visibleRef.current = true;
          shownAt.current = Date.now();
          setVisible(true);
        }
      }, APPEAR_DELAY_MS);
    }
  }, []);

  const update = useCallback((next: Partial<ProcessingOptions>) => {
    setOptions(current => ({ ...current, ...next }));
  }, []);

  const hide = useCallback(() => {
    count.current = Math.max(0, count.current - 1);
    if (count.current > 0) return;

    clearTimeout(appearTimer.current);
    if (!visibleRef.current) return;

    const remaining = Math.max(0, MIN_DISPLAY_MS - (Date.now() - shownAt.current));
    hideTimer.current = setTimeout(() => {
      setExiting(true);
      unmountTimer.current = setTimeout(() => {
        visibleRef.current = false;
        setVisible(false);
        setExiting(false);
      }, PROCESSING_EXIT_MS);
    }, remaining);
  }, []);

  const run = useCallback(
    async <T,>(
      opts: ProcessingOptions,
      work: (controller: ProcessingController) => Promise<T>,
    ): Promise<T> => {
      show(opts);
      const startedAt = Date.now();
      try {
        const result = await work({ update });
        if (opts.minDuration !== undefined) {
          const remaining = opts.minDuration - (Date.now() - startedAt);
          if (remaining > 0) {
            await new Promise<void>(resolve => setTimeout(resolve, remaining));
          }
        }
        return result;
      } finally {
        hide();
      }
    },
    [show, hide, update],
  );

  useEffect(
    () => () => {
      clearTimeout(appearTimer.current);
      clearTimeout(hideTimer.current);
      clearTimeout(unmountTimer.current);
    },
    [],
  );

  const value = useMemo<ProcessingContextValue>(
    () => ({ run, show, update, hide, isProcessing: visible }),
    [run, show, update, hide, visible],
  );

  return (
    <ProcessingContext.Provider value={value}>
      {children}
      {visible && (
        <ProcessingModal
          message={options.message}
          detail={options.detail}
          steps={options.steps}
          isExiting={exiting}
        />
      )}
    </ProcessingContext.Provider>
  );
}

export function useProcessing() {
  return useContext(ProcessingContext);
}

/** Builds a checklist where everything before `activeId` is done. */
export function buildSteps(
  labels: { id: string; label: string }[],
  activeId: string,
): ProcessingStep[] {
  const activeIndex = labels.findIndex(step => step.id === activeId);
  return labels.map((step, index) => ({
    ...step,
    state: activeIndex === -1 || index > activeIndex ? "pending" : index < activeIndex ? "done" : "active",
  }));
}

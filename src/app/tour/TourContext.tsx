// Product Tour engine — context + provider.
// Config-driven: reads GuideStep[] from tourConfig.ts. Filters steps by
// permission/capability/condition BEFORE assigning step numbers, so the
// "Step X of N" counter a viewer sees never counts steps they can't reach.
// Handles cross-route navigation with a bounded poll for the target element.

import {
  createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode,
} from "react";
import { useNavigate, useLocation } from "react-router";
import { usePlatform } from "../context/PlatformContext";
import { TOUR_STEPS } from "./tourConfig";
import type { GuideStep, TourStatus } from "./types";
import { readTourState, writeTourState } from "./useTourPersistence";
import { ENABLE_PRODUCT_TOUR } from "./featureFlag";
import { TourOverlay } from "./TourOverlay";
import { TourCoachmark } from "./TourCoachmark";

const DEFAULT_TARGET_TIMEOUT_MS = 3000;
const SETTLE_POLL_INTERVAL_MS = 150;
const SETTLE_POLL_MAX_MS = 1500;
// Mirrors PlatformLayout.tsx's 768px desktop/mobile chrome breakpoint. Both
// the desktop header and the mobile nav drawer are always mounted (CSS
// display:none hides the inactive one), so a step whose target lives in one
// but not the other needs to pick the right `data-guide` value for whichever
// chrome is actually visible at the current width.
const MOBILE_BREAKPOINT = 768;

function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;
}

function effectiveTarget(step: GuideStep): string | undefined {
  return isMobileViewport() && step.mobileTarget ? step.mobileTarget : step.target;
}

interface TourContextValue {
  isActive: boolean;
  currentStep: GuideStep | null;
  stepIndex: number;
  stepCount: number;
  start: () => void;
  next: () => void;
  back: () => void;
  skip: () => void;
  finish: () => void;
  restartTour: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

function hasGuideTarget(target: string): boolean {
  if (typeof document === "undefined") return false;
  return document.querySelector(`[data-guide="${target}"]`) !== null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTarget(target: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (hasGuideTarget(target)) return true;
    await sleep(100);
  }
  return hasGuideTarget(target);
}

export function TourProvider({ children }: { children: ReactNode }) {
  if (!ENABLE_PRODUCT_TOUR) {
    return <>{children}</>;
  }
  return <TourProviderInner>{children}</TourProviderInner>;
}

function TourProviderInner({ children }: { children: ReactNode }) {
  const platform = usePlatform();
  const { hasPermission, resolveCapability } = platform;
  const navigate = useNavigate();
  const location = useLocation();

  const [eligibleSteps, setEligibleSteps] = useState<GuideStep[]>([]);
  const [stepIndex, setStepIndex] = useState(-1);
  const [isActive, setIsActive] = useState(false);
  const [autoStartChecked, setAutoStartChecked] = useState(false);

  const previouslyFocused = useRef<HTMLElement | null>(null);
  const navigationGuard = useRef(0); // increments to invalidate in-flight advances

  const isStepEligible = useCallback((step: GuideStep): boolean => {
    if (step.permission && !hasPermission(step.permission)) return false;
    if (step.anyPermission && !step.anyPermission.some((p) => hasPermission(p))) return false;
    if (step.capability && !resolveCapability(step.capability).available) return false;
    if (step.condition && !step.condition()) return false;
    return true;
  }, [hasPermission, resolveCapability]);

  const computeEligibleSteps = useCallback((): GuideStep[] => {
    return TOUR_STEPS.filter(isStepEligible);
  }, [isStepEligible]);

  const endTour = useCallback((finalStatus: Extract<TourStatus, "completed" | "skipped">) => {
    setIsActive(false);
    setStepIndex(-1);
    setEligibleSteps([]);
    navigationGuard.current += 1;
    writeTourState({
      tourId: "authenticated-platform",
      tourVersion: 1,
      status: finalStatus,
      ...(finalStatus === "completed" ? { completedAt: new Date().toISOString() } : { skippedAt: new Date().toISOString() }),
    });
    // Restore focus to whatever had it before the tour started.
    const el = previouslyFocused.current;
    previouslyFocused.current = null;
    if (el && document.contains(el)) {
      try { el.focus(); } catch { /* ignore */ }
    }
  }, []);

  const goToStep = useCallback(async (index: number, steps: GuideStep[]) => {
    const guard = ++navigationGuard.current;
    const step = steps[index];
    if (!step) return;

    if (step.route && step.route !== location.pathname) {
      navigate(step.route);
    }

    const target = effectiveTarget(step);
    if (target) {
      const timeout = step.targetTimeoutMs ?? DEFAULT_TARGET_TIMEOUT_MS;
      const found = await waitForTarget(target, timeout);
      if (guard !== navigationGuard.current) return; // superseded by another action
      if (!found) {
        if (step.fallback === "end") {
          endTour("skipped");
          return;
        }
        // Default fallback "skip": advance past this step without freezing.
        const next = index + 1;
        if (next < steps.length) {
          void goToStep(next, steps);
        } else {
          endTour("completed");
        }
        return;
      }
      const el = document.querySelector(`[data-guide="${target}"]`);
      el?.scrollIntoView({ block: "center", behavior: "auto" });
    }

    setStepIndex(index);
    writeTourState({
      tourId: "authenticated-platform",
      tourVersion: 1,
      status: "in_progress",
      lastStepId: step.id,
    });
  }, [location.pathname, navigate, endTour]);

  const beginWithSteps = useCallback(async (steps: GuideStep[]) => {
    if (steps.length === 0) return;
    previouslyFocused.current = (document.activeElement as HTMLElement) ?? null;
    setEligibleSteps(steps);
    setIsActive(true);
    await goToStep(0, steps);
  }, [goToStep]);

  const start = useCallback(() => {
    // Let the current route's async sections (My Actions, Notifications,
    // Bulk Send) finish their post-mount effects before we decide which
    // optional steps are eligible — otherwise a data-dependent step could be
    // wrongly excluded just because it hadn't rendered yet.
    const deadline = Date.now() + SETTLE_POLL_MAX_MS;
    const settle = () => {
      if (Date.now() >= deadline) {
        void beginWithSteps(computeEligibleSteps());
        return;
      }
      setTimeout(() => {
        void beginWithSteps(computeEligibleSteps());
      }, SETTLE_POLL_INTERVAL_MS);
    };
    settle();
  }, [beginWithSteps, computeEligibleSteps]);

  const restartTour = useCallback(() => {
    navigationGuard.current += 1;
    setIsActive(false);
    setStepIndex(-1);
    start();
  }, [start]);

  const next = useCallback(() => {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= eligibleSteps.length) {
      endTour("completed");
      return;
    }
    void goToStep(nextIndex, eligibleSteps);
  }, [stepIndex, eligibleSteps, goToStep, endTour]);

  const back = useCallback(() => {
    const prevIndex = stepIndex - 1;
    if (prevIndex < 0) return;
    void goToStep(prevIndex, eligibleSteps);
  }, [stepIndex, eligibleSteps, goToStep]);

  const skip = useCallback(() => {
    endTour("skipped");
  }, [endTour]);

  const finish = useCallback(() => {
    endTour("completed");
  }, [endTour]);

  // Auto-start ONLY when: authenticated, on exactly /app/dashboard, and the
  // stored status is "not_started". Never auto-reopens after skip/complete.
  useEffect(() => {
    if (autoStartChecked) return;
    if (platform.sessionStatus !== "authenticated") return;
    if (location.pathname !== "/app/dashboard") return;
    setAutoStartChecked(true);
    const stored = readTourState();
    if (stored.status === "not_started") {
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform.sessionStatus, location.pathname, autoStartChecked]);

  const currentStep = isActive ? eligibleSteps[stepIndex] ?? null : null;

  const value: TourContextValue = {
    isActive,
    currentStep,
    stepIndex,
    stepCount: eligibleSteps.length,
    start,
    next,
    back,
    skip,
    finish,
    restartTour,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
      {isActive && currentStep && (
        <>
          <TourOverlay target={effectiveTarget(currentStep)} />
          <TourCoachmark
            step={currentStep}
            stepNumber={stepIndex + 1}
            stepCount={eligibleSteps.length}
            canGoBack={stepIndex > 0}
            isLastStep={stepIndex === eligibleSteps.length - 1}
            onNext={next}
            onBack={back}
            onSkip={skip}
          />
        </>
      )}
    </TourContext.Provider>
  );
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) {
    // Feature flag off, or used outside PlatformLayout's authenticated shell.
    // Return a harmless no-op shape instead of throwing, so callers like
    // UserMenu's "Take a Tour" item never crash the app.
    return {
      isActive: false,
      currentStep: null,
      stepIndex: -1,
      stepCount: 0,
      start: () => {},
      next: () => {},
      back: () => {},
      skip: () => {},
      finish: () => {},
      restartTour: () => {},
    };
  }
  return ctx;
}

// C13 — Onboarding state context.
// Lives alongside PlatformProvider in main.tsx so it's available through all auth/onboarding routes.
//
// LOCAL_PERSISTENCE: mirrored to localStorage (see services/local-persistence.ts)
// so a refresh mid-signup/mid-onboarding doesn't lose progress — there is no
// backend session yet to resume from instead. No sensitive values (password,
// tokens) are held here, same as before; only what's needed to resume the
// wizard. See that file's header for how to remove this layer later.

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type {
  PendingAuthUser,
  OnboardingDraft,
  OnboardingProgress,
  OnboardingStepId,
} from "../models/auth";
import { DEFAULT_ONBOARDING_DRAFT, EMPTY_ONBOARDING_PROGRESS } from "../models/auth";
import { readJSON, writeJSON, removeKey, PERSISTENCE_KEYS } from "../services/local-persistence";

// ── Context shape ─────────────────────────────────────────────────────────────

export interface OnboardingContextValue {
  // The user going through auth/onboarding (not yet a platform session)
  pendingUser:    PendingAuthUser | null;
  draft:          OnboardingDraft;
  progress:       OnboardingProgress;
  mfaSetupDone:   boolean;
  // Where to land after onboarding completes — set when account creation
  // was started from a `?returnTo=` continuation link (e.g. a visitor sent
  // to Create Account from an expired-session redirect). In-memory only,
  // same as the rest of this context; never written to storage. Defaults to
  // the normal dashboard when no continuation was in flight.
  returnTo:        string | null;

  // Actions
  setPendingUser:  (user: PendingAuthUser | null) => void;
  setReturnTo:     (path: string | null) => void;
  updateProfile:   (p: Partial<OnboardingDraft["profile"]>) => void;
  updateUseCase:   (p: Partial<OnboardingDraft["useCase"]>) => void;
  updateWorkspace: (p: Partial<OnboardingDraft["workspace"]>) => void;
  updateSecurity:  (p: Partial<OnboardingDraft["security"]>) => void;
  updateNotifications: (p: Partial<OnboardingDraft["notifications"]>) => void;
  markStepDone:    (step: OnboardingStepId) => void;
  setMfaSetupDone: (done: boolean) => void;
  markComplete:    () => void;
  reset:           () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// LOCAL_PERSISTENCE
interface PersistedOnboardingState {
  pendingUser:  PendingAuthUser | null;
  draft:        OnboardingDraft;
  progress:     OnboardingProgress;
  mfaSetupDone: boolean;
  returnTo:     string | null;
}

// LOCAL_PERSISTENCE — structural guard, same reasoning as PrepareContext's
// isUsablePreparationDraft(): a well-formed object from an earlier app
// version can still be the wrong shape for this one.
function isUsableOnboardingState(v: unknown): v is PersistedOnboardingState {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return !!s.draft && !!s.progress && typeof s.mfaSetupDone === "boolean";
}

function readSavedOnboarding(): PersistedOnboardingState | null {
  try {
    const raw = readJSON<PersistedOnboardingState>(PERSISTENCE_KEYS.onboardingState);
    if (isUsableOnboardingState(raw)) return raw;
  } catch {
    // fall through
  }
  removeKey(PERSISTENCE_KEYS.onboardingState); // drop whatever unusable value was there
  return null;
}

const savedOnboarding = readSavedOnboarding(); // LOCAL_PERSISTENCE

// ── Provider ──────────────────────────────────────────────────────────────────

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [pendingUser,  setPendingUserState]  = useState<PendingAuthUser | null>(savedOnboarding?.pendingUser ?? null);
  const [draft,        setDraft]             = useState<OnboardingDraft>(savedOnboarding?.draft ?? DEFAULT_ONBOARDING_DRAFT);
  const [progress,     setProgress]          = useState<OnboardingProgress>(savedOnboarding?.progress ?? EMPTY_ONBOARDING_PROGRESS);
  const [mfaSetupDone, setMfaSetupDoneState] = useState(savedOnboarding?.mfaSetupDone ?? false);
  const [returnTo,     setReturnToState]     = useState<string | null>(savedOnboarding?.returnTo ?? null);

  // LOCAL_PERSISTENCE — real-time write-through. Skipped entirely once there
  // is nothing worth resuming (no pending user and no progress), so a
  // visitor who never started signup doesn't get an empty record written.
  useEffect(() => {
    if (!pendingUser && !progress.profile && !progress.useCase) {
      removeKey(PERSISTENCE_KEYS.onboardingState);
      return;
    }
    const snapshot: PersistedOnboardingState = { pendingUser, draft, progress, mfaSetupDone, returnTo };
    writeJSON(PERSISTENCE_KEYS.onboardingState, snapshot);
  }, [pendingUser, draft, progress, mfaSetupDone, returnTo]);

  const setReturnTo = useCallback((path: string | null) => {
    setReturnToState(path);
  }, []);

  const setPendingUser = useCallback((user: PendingAuthUser | null) => {
    setPendingUserState(user);
    if (user) {
      // Pre-populate displayName in profile draft
      setDraft((d) => ({ ...d, profile: { ...d.profile, displayName: user.displayName } }));
    }
  }, []);

  const updateProfile       = useCallback((p: Partial<OnboardingDraft["profile"]>) =>
    setDraft((d) => ({ ...d, profile: { ...d.profile, ...p } })), []);

  const updateUseCase       = useCallback((p: Partial<OnboardingDraft["useCase"]>) =>
    setDraft((d) => ({ ...d, useCase: { ...d.useCase, ...p } })), []);

  const updateWorkspace     = useCallback((p: Partial<OnboardingDraft["workspace"]>) =>
    setDraft((d) => ({ ...d, workspace: { ...d.workspace, ...p } })), []);

  const updateSecurity      = useCallback((p: Partial<OnboardingDraft["security"]>) =>
    setDraft((d) => ({ ...d, security: { ...d.security, ...p } })), []);

  const updateNotifications = useCallback((p: Partial<OnboardingDraft["notifications"]>) =>
    setDraft((d) => ({ ...d, notifications: { ...d.notifications, ...p } })), []);

  const markStepDone = useCallback((step: OnboardingStepId) => {
    setProgress((prev) => {
      switch (step) {
        case "profile":       return { ...prev, profile: true };
        case "use-case":      return { ...prev, useCase: true };
        case "workspace":     return { ...prev, workspace: true };
        case "security":      return { ...prev, security: true };
        case "notifications": return { ...prev, notifications: true };
        case "review":        return prev; // review just confirms, markComplete does it
        default:              return prev;
      }
    });
  }, []);

  const setMfaSetupDone = useCallback((done: boolean) => setMfaSetupDoneState(done), []);

  const markComplete = useCallback(() => {
    setProgress((prev) => ({ ...prev, complete: true }));
  }, []);

  const reset = useCallback(() => {
    setPendingUserState(null);
    setDraft(DEFAULT_ONBOARDING_DRAFT);
    setProgress(EMPTY_ONBOARDING_PROGRESS);
    setMfaSetupDoneState(false);
    setReturnToState(null);
    removeKey(PERSISTENCE_KEYS.onboardingState); // LOCAL_PERSISTENCE
  }, []);

  return (
    <OnboardingContext.Provider value={{
      pendingUser, draft, progress, mfaSetupDone, returnTo,
      setPendingUser, setReturnTo, updateProfile, updateUseCase, updateWorkspace,
      updateSecurity, updateNotifications, markStepDone, setMfaSetupDone,
      markComplete, reset,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used inside <OnboardingProvider>");
  return ctx;
}

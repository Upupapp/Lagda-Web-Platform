// C13 — Onboarding state context.
// Lives alongside PlatformProvider in main.tsx so it's available through all auth/onboarding routes.
// Holds in-memory draft state only — no localStorage, no sessionStorage, no sensitive values.

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type {
  PendingAuthUser,
  OnboardingDraft,
  OnboardingProgress,
  OnboardingStepId,
} from "../models/auth";
import { DEFAULT_ONBOARDING_DRAFT, EMPTY_ONBOARDING_PROGRESS } from "../models/auth";

// ── Context shape ─────────────────────────────────────────────────────────────

export interface OnboardingContextValue {
  // The user going through auth/onboarding (not yet a platform session)
  pendingUser:    PendingAuthUser | null;
  draft:          OnboardingDraft;
  progress:       OnboardingProgress;
  mfaSetupDone:   boolean;

  // Actions
  setPendingUser:  (user: PendingAuthUser | null) => void;
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

// ── Provider ──────────────────────────────────────────────────────────────────

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [pendingUser,  setPendingUserState]  = useState<PendingAuthUser | null>(null);
  const [draft,        setDraft]             = useState<OnboardingDraft>(DEFAULT_ONBOARDING_DRAFT);
  const [progress,     setProgress]          = useState<OnboardingProgress>(EMPTY_ONBOARDING_PROGRESS);
  const [mfaSetupDone, setMfaSetupDoneState] = useState(false);

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
  }, []);

  return (
    <OnboardingContext.Provider value={{
      pendingUser, draft, progress, mfaSetupDone,
      setPendingUser, updateProfile, updateUseCase, updateWorkspace,
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

// C13 — Onboarding state context.
// Lives alongside PlatformProvider in main.tsx so it's available through all auth/onboarding routes.
//
// With a real backend each onboarding step SAVES to the backend when the
// person presses Continue; this draft is then only the wizard's memory of what
// was answered (so Back and the Review screen can show it). In the demo build
// (no VITE_API_BASE_URL) the draft is the only store.
//
// LOCAL_PERSISTENCE: mirrored to localStorage (see services/local-persistence.ts)
// so a refresh mid-signup/mid-onboarding doesn't lose progress. No sensitive
// values (password, tokens) are held here; only what's needed to resume the
// wizard. See that file's header for how to remove this layer later.

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type {
  PendingAuthUser,
  OnboardingDraft,
  OnboardingProgress,
  OnboardingStepId,
} from "../models/auth";
import { createDefaultOnboardingDraft, EMPTY_ONBOARDING_PROGRESS } from "../models/auth";
import { readJSON, writeJSON, removeKey, PERSISTENCE_KEYS } from "../services/local-persistence";

// ── Context shape ─────────────────────────────────────────────────────────────

export interface OnboardingContextValue {
  // The user going through auth/onboarding (not yet a platform session)
  pendingUser:    PendingAuthUser | null;
  draft:          OnboardingDraft;
  progress:       OnboardingProgress;
  mfaSetupDone:   boolean;
  // Where to land after onboarding completes — set when account creation
  // was started from a `?returnTo=` continuation link. Defaults to the normal
  // dashboard when no continuation was in flight.
  returnTo:        string | null;

  // Actions
  setPendingUser:  (user: PendingAuthUser | null) => void;
  setReturnTo:     (path: string | null) => void;
  updateProfile:   (p: Partial<OnboardingDraft["profile"]>) => void;
  updateWorkspace: (p: Partial<OnboardingDraft["workspace"]>) => void;
  updateSecurity:  (p: Partial<OnboardingDraft["security"]>) => void;
  markStepDone:    (step: OnboardingStepId) => void;
  setMfaSetupDone: (done: boolean) => void;
  markComplete:    () => void;
  reset:           () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// LOCAL_PERSISTENCE — bumped when the draft's shape changes. A record saved by
// the six-step wizard (version absent) is discarded rather than half-read.
const PERSISTED_VERSION = 2;

interface PersistedOnboardingState {
  version:      number;
  pendingUser:  PendingAuthUser | null;
  draft:        OnboardingDraft;
  progress:     OnboardingProgress;
  mfaSetupDone: boolean;
  returnTo:     string | null;
}

// LOCAL_PERSISTENCE — structural guard: a well-formed object from an earlier
// app version can still be the wrong shape for this one.
function isUsableOnboardingState(v: unknown): v is PersistedOnboardingState {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  if (s.version !== PERSISTED_VERSION) return false;
  const draft = s.draft as Record<string, unknown> | undefined;
  return !!draft && !!draft.profile && !!draft.workspace && !!draft.security
    && !!s.progress && typeof s.mfaSetupDone === "boolean";
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

// ── Provider ──────────────────────────────────────────────────────────────────

export function OnboardingProvider({ children }: { children: ReactNode }) {
  // Read once per provider mount (not at module load) so a test, or a second
  // provider, sees the current storage rather than a snapshot.
  const [saved] = useState(readSavedOnboarding);
  const [pendingUser,  setPendingUserState]  = useState<PendingAuthUser | null>(saved?.pendingUser ?? null);
  const [draft,        setDraft]             = useState<OnboardingDraft>(saved?.draft ?? createDefaultOnboardingDraft);
  const [progress,     setProgress]          = useState<OnboardingProgress>(saved?.progress ?? EMPTY_ONBOARDING_PROGRESS);
  const [mfaSetupDone, setMfaSetupDoneState] = useState(saved?.mfaSetupDone ?? false);
  const [returnTo,     setReturnToState]     = useState<string | null>(saved?.returnTo ?? null);

  // LOCAL_PERSISTENCE — real-time write-through. Skipped entirely once there
  // is nothing worth resuming.
  useEffect(() => {
    if (!pendingUser && !progress.profile && !progress.workspace) {
      removeKey(PERSISTENCE_KEYS.onboardingState);
      return;
    }
    const snapshot: PersistedOnboardingState = {
      version: PERSISTED_VERSION, pendingUser, draft, progress, mfaSetupDone, returnTo,
    };
    writeJSON(PERSISTENCE_KEYS.onboardingState, snapshot);
  }, [pendingUser, draft, progress, mfaSetupDone, returnTo]);

  const setReturnTo = useCallback((path: string | null) => {
    setReturnToState(path);
  }, []);

  const setPendingUser = useCallback((user: PendingAuthUser | null) => {
    setPendingUserState(user);
    if (user) {
      // Pre-populate the name fields the person has not filled in yet.
      setDraft((d) => ({
        ...d,
        profile: {
          ...d.profile,
          fullName: d.profile.fullName || user.displayName,
          displayName: d.profile.displayName || user.displayName,
        },
      }));
    }
  }, []);

  const updateProfile   = useCallback((p: Partial<OnboardingDraft["profile"]>) =>
    setDraft((d) => ({ ...d, profile: { ...d.profile, ...p } })), []);

  const updateWorkspace = useCallback((p: Partial<OnboardingDraft["workspace"]>) =>
    setDraft((d) => ({ ...d, workspace: { ...d.workspace, ...p } })), []);

  const updateSecurity  = useCallback((p: Partial<OnboardingDraft["security"]>) =>
    setDraft((d) => ({ ...d, security: { ...d.security, ...p } })), []);

  const markStepDone = useCallback((step: OnboardingStepId) => {
    setProgress((prev) => {
      switch (step) {
        case "profile":   return { ...prev, profile: true };
        case "workspace": return { ...prev, workspace: true };
        case "security":  return { ...prev, security: true };
        case "review":    return prev; // review just confirms, markComplete does it
        default:          return prev;
      }
    });
  }, []);

  const setMfaSetupDone = useCallback((done: boolean) => setMfaSetupDoneState(done), []);

  const markComplete = useCallback(() => {
    setProgress((prev) => ({ ...prev, complete: true }));
  }, []);

  const reset = useCallback(() => {
    setPendingUserState(null);
    setDraft(createDefaultOnboardingDraft());
    setProgress(EMPTY_ONBOARDING_PROGRESS);
    setMfaSetupDoneState(false);
    setReturnToState(null);
    removeKey(PERSISTENCE_KEYS.onboardingState); // LOCAL_PERSISTENCE
  }, []);

  return (
    <OnboardingContext.Provider value={{
      pendingUser, draft, progress, mfaSetupDone, returnTo,
      setPendingUser, setReturnTo, updateProfile, updateWorkspace,
      updateSecurity, markStepDone, setMfaSetupDone,
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

// Pre-auth document continuation — holds the metadata for a document a
// visitor selected on the public site BEFORE creating an account or signing
// in, so "Continue Preparing" doesn't make them start over.
//
// PRIVACY / SECURITY, matching the existing rule in UploadStep.tsx /
// PrepareContext.tsx:
//   • Browser File objects are NEVER held here — only PrepFile metadata
//     (name, size, mime type), exactly what the authenticated Documents step
//     already stores. No file contents are read, buffered, hashed, or
//     transmitted at any point.
//   • In-memory only. Never written to localStorage/sessionStorage/cookies.
//     Mounted above the router (see main.tsx) so it survives the client-side
//     route changes between the public site, auth, onboarding, and the
//     platform — but a hard refresh clears it, same as OnboardingContext.
//   • One-shot and scoped: claimPending() requires the caller to present the
//     exact continuationId issued when the files were selected (carried via
//     the existing `?returnTo=` chain, e.g. `/app/prepare?resumeId=<id>`).
//     A stale pending selection left behind by a visitor who never finished
//     signing in can therefore never be silently inherited by a different
//     account that happens to sign in afterward in the same tab — the resume
//     link is what authorizes the claim, not merely "some pending state
//     exists". claimPending() also clears state immediately, so it can only
//     ever be consumed once.

import { createContext, useContext, useCallback, useState, type ReactNode } from "react";
import type { PrepFile } from "../models/prepare";

export interface PendingPreparation {
  continuationId: string;
  files: PrepFile[];
  title: string;
}

interface PendingPreparationContextValue {
  pending: PendingPreparation | null;
  /** Replaces the held selection and returns its continuationId. */
  setPending: (files: PrepFile[], title: string) => string;
  /** Returns and clears the pending selection if `resumeId` matches. */
  claimPending: (resumeId: string) => PendingPreparation | null;
  clearPending: () => void;
}

const PendingPreparationContext = createContext<PendingPreparationContextValue | null>(null);

function generateContinuationId(): string {
  return `pp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function PendingPreparationProvider({ children }: { children: ReactNode }) {
  const [pending, setPendingState] = useState<PendingPreparation | null>(null);

  const setPending = useCallback((files: PrepFile[], title: string) => {
    const continuationId = generateContinuationId();
    setPendingState({ continuationId, files, title });
    return continuationId;
  }, []);

  const claimPending = useCallback((resumeId: string): PendingPreparation | null => {
    if (!pending || pending.continuationId !== resumeId) return null;
    setPendingState(null);
    return pending;
  }, [pending]);

  const clearPending = useCallback(() => setPendingState(null), []);

  return (
    <PendingPreparationContext.Provider value={{ pending, setPending, claimPending, clearPending }}>
      {children}
    </PendingPreparationContext.Provider>
  );
}

export function usePendingPreparation(): PendingPreparationContextValue {
  const ctx = useContext(PendingPreparationContext);
  if (!ctx) throw new Error("usePendingPreparation must be used inside PendingPreparationProvider");
  return ctx;
}

// Pre-auth document continuation — holds the metadata for a document a
// visitor selected on the public site BEFORE creating an account or signing
// in, so "Continue Preparing" doesn't make them start over.
//
// PRIVACY / SECURITY, matching the existing rule in UploadStep.tsx /
// PrepareContext.tsx:
//   • Browser File objects are NEVER held here — only PrepFile metadata
//     (name, size, mime type), exactly what the authenticated Documents step
//     already stores. No file contents are read, buffered, hashed, or
//     transmitted at any point. See RAW FILE RULE below — this is the one
//     thing that does NOT change with persistence.
//
// LOCAL_PERSISTENCE — durability (P0.5): this used to be in-memory only, so
// a refresh between the public upload and finishing sign-in/verification
// silently lost the selection. It's now write-through to localStorage (the
// same abstraction PlatformContext/OnboardingContext/PrepareContext already
// use), bounded to PENDING_PREPARATION_TTL_MS and validated on every read —
// see hydratePending() below. What is persisted is exactly the same
// metadata that was always held (file name/size/type, title, the
// continuation id) — never file bytes.
//
//   • One-shot and ID-matched: claimPending() requires the caller to present
//     the exact continuationId issued when the files were selected (carried
//     via the existing `?returnTo=` chain, e.g. `/app/prepare?resumeId=<id>`).
//     A stale pending selection left behind by a visitor who never finished
//     signing in can therefore never be silently inherited by a different
//     account that happens to sign in afterward in the same browser — the
//     resume link is what authorizes the claim, not merely "some pending
//     state exists". claimPending() also clears state (memory AND storage)
//     immediately, so it can only ever be consumed once. Only one pending
//     preparation is held at a time, matching the architecture this extends
//     — setting a new one replaces whatever was there.
//   • Cleared on sign-out (see the registerSessionCleanup call below): once
//     someone signs out, a browser reverts to "anonymous", and a stale
//     unclaimed pre-auth selection should not linger for the next visitor
//     (or a different account) on that browser to inherit.
//
// FUTURE BACKEND HANDOFF (not implemented yet): today, "claimed" means
// handed to PrepareContext's own local draft state. Once real backend
// document/draft creation exists, claiming should instead mean "handed to a
// real backend draft, then this record is retired" — a single call at the
// point of claimPending() in PrepareEntryPage.tsx, not a redesign of this
// file. Each pending preparation already carries everything that handoff
// needs (files, title, continuationId) and nothing it doesn't (no file
// bytes, no server state) — this file's job stops at "recoverable browser
// metadata," and stays that way.

import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from "react";
import type { PrepFile, PrepFileState } from "../models/prepare";
import { readJSON, writeJSON, removeKey, PERSISTENCE_KEYS } from "../services/local-persistence";
import { registerSessionCleanup } from "../services/session-lifecycle";

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

// 24h — the same order of magnitude as the backend's own email-verification
// link lifetime (EMAIL_VERIFICATION_TTL_MS), since finishing register →
// verify → sign-in is the exact window this needs to survive. Longer would
// mean silently resurrecting a document selection from a visit the person
// has likely forgotten about; shorter would defeat the point of surviving a
// same-day email check.
const PENDING_PREPARATION_TTL_MS = 24 * 60 * 60 * 1000;
const SCHEMA_VERSION = 1;

interface PersistedPendingPreparation {
  version: number;
  continuationId: string;
  files: PrepFile[];
  title: string;
  createdAt: number;
}

const PREP_FILE_STATES: readonly PrepFileState[] = [
  "ready", "unsupported-type", "empty-file", "demonstration-size-limit",
  "duplicate", "unavailable", "removed",
];

function isPrepFile(v: unknown): v is PrepFile {
  if (!v || typeof v !== "object") return false;
  const f = v as Record<string, unknown>;
  return (
    typeof f.id === "string" && f.id.length > 0 &&
    typeof f.fileName === "string" && f.fileName.length > 0 &&
    typeof f.fileSizeBytes === "number" && Number.isFinite(f.fileSizeBytes) &&
    typeof f.mimeType === "string" &&
    typeof f.fileState === "string" && PREP_FILE_STATES.includes(f.fileState as PrepFileState) &&
    typeof f.order === "number"
  );
}

// Treats every restored field as untrusted browser state: wrong types, a
// schema from an earlier version, or a hand-edited value must fall back to
// "nothing pending" rather than hand malformed data to the rest of the app.
function isUsablePendingPreparation(v: unknown): v is PersistedPendingPreparation {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  if (p.version !== SCHEMA_VERSION) return false;
  if (typeof p.continuationId !== "string" || p.continuationId.length === 0) return false;
  if (typeof p.title !== "string") return false;
  if (typeof p.createdAt !== "number" || !Number.isFinite(p.createdAt)) return false;
  if (!Array.isArray(p.files) || p.files.length === 0) return false;
  return p.files.every(isPrepFile);
}

/** Reads, validates, and age-checks the persisted record. Never throws. */
function hydratePending(): PendingPreparation | null {
  let raw: unknown;
  try {
    raw = readJSON<unknown>(PERSISTENCE_KEYS.pendingPreparation);
  } catch {
    raw = null;
  }
  if (!isUsablePendingPreparation(raw)) {
    removeKey(PERSISTENCE_KEYS.pendingPreparation); // drop whatever unusable value was there
    return null;
  }
  if (Date.now() - raw.createdAt > PENDING_PREPARATION_TTL_MS) {
    removeKey(PERSISTENCE_KEYS.pendingPreparation); // expired — never silently resurrected
    return null;
  }
  return { continuationId: raw.continuationId, files: raw.files, title: raw.title };
}

// Registered once at module load (same pattern every other localStorage-
// owning feature in session-lifecycle.ts follows) — not inside the
// component, so it exists even if the provider never mounts, and isn't
// re-registered on every render.
registerSessionCleanup({
  id: "pending-preparation",
  onSignOut: () => removeKey(PERSISTENCE_KEYS.pendingPreparation),
});

export function PendingPreparationProvider({ children }: { children: ReactNode }) {
  const [pending, setPendingState] = useState<PendingPreparation | null>(null);

  // LOCAL_PERSISTENCE — restore a selection saved before a refresh/new tab.
  useEffect(() => {
    const restored = hydratePending();
    if (restored) setPendingState(restored);
  }, []);

  const setPending = useCallback((files: PrepFile[], title: string) => {
    const continuationId = generateContinuationId();
    const next: PendingPreparation = { continuationId, files, title };
    setPendingState(next);
    writeJSON<PersistedPendingPreparation>(PERSISTENCE_KEYS.pendingPreparation, {
      version: SCHEMA_VERSION, ...next, createdAt: Date.now(),
    });
    return continuationId;
  }, []);

  const claimPending = useCallback((resumeId: string): PendingPreparation | null => {
    if (!pending || pending.continuationId !== resumeId) return null;
    setPendingState(null);
    removeKey(PERSISTENCE_KEYS.pendingPreparation);
    return pending;
  }, [pending]);

  const clearPending = useCallback(() => {
    setPendingState(null);
    removeKey(PERSISTENCE_KEYS.pendingPreparation);
  }, []);

  return (
    <PendingPreparationContext.Provider value={{ pending, setPending, claimPending, clearPending }}>
      {children}
    </PendingPreparationContext.Provider>
  );
}

function generateContinuationId(): string {
  return `pp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function usePendingPreparation(): PendingPreparationContextValue {
  const ctx = useContext(PendingPreparationContext);
  if (!ctx) throw new Error("usePendingPreparation must be used inside PendingPreparationProvider");
  return ctx;
}

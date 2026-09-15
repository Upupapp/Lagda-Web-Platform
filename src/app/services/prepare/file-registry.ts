// In-memory-only retention of the actual browser File selected for a
// PrepFile, keyed by the same PrepFile.id used everywhere else (pending
// preparation, the authenticated draft, etc.).
//
// WHY THIS IS SEPARATE FROM EVERY PERSISTED MODEL: PendingPreparationContext
// and PrepareContext's draft both hold PrepFile METADATA only — by explicit,
// deliberate design (see PendingPreparationContext.tsx's own header) — and
// both are now localStorage-backed. A File object must never enter either:
// it isn't serializable in any safe form, and the raw-file rule this
// codebase enforces exists specifically to keep bytes out of localStorage.
//
// This module is a plain, non-React, module-level Map — never written to
// storage, never part of any Context value. That is what makes it safe to
// populate from BOTH the public pre-auth intake and the authenticated
// upload step using the same id: as long as the SPA's JS context survives
// (same tab, no refresh) between selecting a file publicly and reaching
// `/app/prepare` after signing in, the real File is still here and can be
// uploaded directly — no re-selection needed ("Case A"). A refresh, a
// closed tab, or opening a verification link in a new tab clears this
// module's memory exactly like any other page state ("Case B"), and the
// UI must ask the visitor to re-select — see UploadStep.tsx's handling of a
// PrepFile with no entry here.
const registry = new Map<string, File>();

export function setFileRef(id: string, file: File): void {
  registry.set(id, file);
}

export function getFileRef(id: string): File | undefined {
  return registry.get(id);
}

export function clearFileRef(id: string): void {
  registry.delete(id);
}

export function clearAllFileRefs(): void {
  registry.clear();
}

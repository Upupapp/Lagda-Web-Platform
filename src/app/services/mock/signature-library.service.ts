// Mock Signature Library Service.
// Module-level in-memory state — no localStorage, no sessionStorage, no upload.
// All entries are deterministic demonstration fixtures.
// No biometric data. No identity verification. No eNotary.
// Resets on full page reload (module reinitialisation).

import { ok, fail } from "../../models/errors";
import type { ServiceResult } from "../../models/errors";
import type {
  SignatureLibraryEntry,
  SignatureLibraryEntryId,
  SignatureLibraryEntryKind,
  SignatureDefaultState,
  CreateTypedInput,
  CreateDrawnInput,
  RenameEntryInput,
  ReplaceTypedInput,
  ReplaceDrawnInput,
} from "../../models/signature-library";

// ── Fixture drawn data URLs (synthetic SVG paths — not real signatures) ───────

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Synthetic flowing cursive stroke — does not reproduce any real person's signature
const DRAWN_SIG_URL = svgDataUrl(
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80">' +
  '<path d="M10 55 C30 20 50 22 70 50 C90 70 110 18 130 45 C150 62 170 22 190 48 C210 65 230 28 250 46 L300 50"' +
  ' fill="none" stroke="#07111F" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
);

// Synthetic two-stroke initials pattern — does not reproduce any real person's initials
const DRAWN_INITIALS_URL = svgDataUrl(
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80">' +
  '<path d="M10 65 L10 20 M10 43 L35 43 M35 20 L35 65"' +
  ' fill="none" stroke="#07111F" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M55 20 L55 65 Q85 65 85 43 Q85 20 55 20"' +
  ' fill="none" stroke="#07111F" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
);

// ── Initial fixture library ───────────────────────────────────────────────────

function buildInitialLibrary(): SignatureLibraryEntry[] {
  return [
    {
      id:           "sig-typed-full-default" as SignatureLibraryEntryId,
      kind:         "signature",
      displayName:  "Full Signature",
      representation: { method: "typed", typedText: "M. Reyes", styleIndex: 0 },
      status:       "active",
      defaultState: "default-signature",
      createdAt:    "2026-06-06T09:00:00+08:00",
      updatedAt:    "2026-07-10T14:22:00+08:00",
      usageSummary: { demonstrationUseCount: 7, lastSelectedAt: "2026-07-14T11:00:00+08:00", commonRole: "Signer" },
      demonstrationOnly: true,
    },
    {
      id:           "sig-typed-short" as SignatureLibraryEntryId,
      kind:         "signature",
      displayName:  "Short Signature",
      representation: { method: "typed", typedText: "M.R.", styleIndex: 2 },
      status:       "active",
      defaultState: "non-default",
      createdAt:    "2026-06-15T10:00:00+08:00",
      updatedAt:    "2026-06-15T10:00:00+08:00",
      usageSummary: { demonstrationUseCount: 2, lastSelectedAt: "2026-07-01T09:15:00+08:00", commonRole: "Approver" },
      demonstrationOnly: true,
    },
    {
      id:           "sig-drawn-demo" as SignatureLibraryEntryId,
      kind:         "signature",
      displayName:  "Drawn Signature",
      representation: { method: "drawn", dataUrl: DRAWN_SIG_URL },
      status:       "active",
      defaultState: "non-default",
      createdAt:    "2026-07-01T16:30:00+08:00",
      updatedAt:    "2026-07-01T16:30:00+08:00",
      usageSummary: { demonstrationUseCount: 1, lastSelectedAt: "2026-07-08T14:00:00+08:00", commonRole: "Signer" },
      demonstrationOnly: true,
    },
    {
      id:           "initials-typed-default" as SignatureLibraryEntryId,
      kind:         "initials",
      displayName:  "Default Initials",
      representation: { method: "typed", typedText: "M.R.", styleIndex: 1 },
      status:       "active",
      defaultState: "default-initials",
      createdAt:    "2026-06-06T09:05:00+08:00",
      updatedAt:    "2026-07-10T14:22:00+08:00",
      usageSummary: { demonstrationUseCount: 6, lastSelectedAt: "2026-07-14T11:00:00+08:00", commonRole: "Signer" },
      demonstrationOnly: true,
    },
    {
      id:           "initials-drawn-demo" as SignatureLibraryEntryId,
      kind:         "initials",
      displayName:  "Drawn Initials",
      representation: { method: "drawn", dataUrl: DRAWN_INITIALS_URL },
      status:       "active",
      defaultState: "non-default",
      createdAt:    "2026-07-02T10:00:00+08:00",
      updatedAt:    "2026-07-02T10:00:00+08:00",
      usageSummary: { demonstrationUseCount: 0, lastSelectedAt: null, commonRole: null },
      demonstrationOnly: true,
    },
    {
      id:           "sig-archived-demo" as SignatureLibraryEntryId,
      kind:         "signature",
      displayName:  "Archived Signature",
      representation: { method: "typed", typedText: "Maria R.", styleIndex: 3 },
      status:       "archived",
      defaultState: "non-default",
      createdAt:    "2026-05-01T08:00:00+08:00",
      updatedAt:    "2026-06-01T12:00:00+08:00",
      usageSummary: { demonstrationUseCount: 3, lastSelectedAt: "2026-05-28T10:00:00+08:00", commonRole: "Signer" },
      demonstrationOnly: true,
    },
    {
      id:           "sig-invalid-demo" as SignatureLibraryEntryId,
      kind:         "signature",
      displayName:  "Unavailable Entry",
      representation: { method: "drawn", dataUrl: null }, // missing representation
      status:       "invalid",
      defaultState: "non-default",
      createdAt:    "2026-04-15T08:00:00+08:00",
      updatedAt:    "2026-05-01T09:00:00+08:00",
      usageSummary: { demonstrationUseCount: 0, lastSelectedAt: null, commonRole: null },
      demonstrationOnly: true,
    },
  ];
}

// ── Module-level state ────────────────────────────────────────────────────────

let _library: SignatureLibraryEntry[] = buildInitialLibrary();
let _counter = 200;

function nextId(kind: SignatureLibraryEntryKind): SignatureLibraryEntryId {
  return `${kind === "signature" ? "sig" : "initials"}-user-${++_counter}` as SignatureLibraryEntryId;
}

function nowIso(): string {
  return new Date("2026-07-16T08:00:00+08:00").toISOString();
}

function isDefaultKind(entry: SignatureLibraryEntry): boolean {
  return entry.defaultState === "default-signature" || entry.defaultState === "default-initials";
}

// Clear default state from all entries of the same kind before setting a new default
function clearDefault(kind: SignatureLibraryEntryKind): void {
  _library = _library.map(e =>
    e.kind === kind && isDefaultKind(e)
      ? { ...e, defaultState: "non-default" as SignatureDefaultState }
      : e
  );
}

function resolveDefaultState(kind: SignatureLibraryEntryKind, setAsDefault: boolean): SignatureDefaultState {
  if (!setAsDefault) return "non-default";
  return kind === "signature" ? "default-signature" : "default-initials";
}

// ── Service ───────────────────────────────────────────────────────────────────

export const signatureLibraryService = {

  /** Returns all library entries for the current user (demo). */
  getLibrary(): ServiceResult<SignatureLibraryEntry[]> {
    return ok([..._library]);
  },

  /** Returns active entries, optionally filtered by kind. */
  getActiveEntries(kind?: SignatureLibraryEntryKind): SignatureLibraryEntry[] {
    return _library.filter(e => e.status === "active" && (!kind || e.kind === kind));
  },

  /** Returns archived entries. */
  getArchivedEntries(kind?: SignatureLibraryEntryKind): SignatureLibraryEntry[] {
    return _library.filter(e => e.status === "archived" && (!kind || e.kind === kind));
  },

  /** Returns the default entry for the given kind, or null. */
  getDefaultEntry(kind: SignatureLibraryEntryKind): SignatureLibraryEntry | null {
    const targetState: SignatureDefaultState =
      kind === "signature" ? "default-signature" : "default-initials";
    return _library.find(e => e.defaultState === targetState && e.status === "active") ?? null;
  },

  /** Returns one entry by ID. */
  getEntry(id: SignatureLibraryEntryId): ServiceResult<SignatureLibraryEntry> {
    const entry = _library.find(e => e.id === id);
    if (!entry) return fail("NOT_FOUND");
    return ok({ ...entry });
  },

  /** Creates a new typed signature or initials entry. */
  createTyped(input: CreateTypedInput): ServiceResult<SignatureLibraryEntry> {
    if (!input.displayName.trim()) return fail("REQUIRED_FIELD", "displayName");
    if (!input.typedText.trim()) return fail("REQUIRED_FIELD", "typedText");
    if (input.typedText.trim().length < 1) return fail("INVALID_INPUT", "typedText");

    if (input.setAsDefault) clearDefault(input.kind);

    const entry: SignatureLibraryEntry = {
      id:           nextId(input.kind),
      kind:         input.kind,
      displayName:  input.displayName.trim(),
      representation: {
        method:     "typed",
        typedText:  input.typedText.trim(),
        styleIndex: input.styleIndex,
      },
      status:       "active",
      defaultState: resolveDefaultState(input.kind, input.setAsDefault),
      createdAt:    nowIso(),
      updatedAt:    nowIso(),
      usageSummary: { demonstrationUseCount: 0, lastSelectedAt: null, commonRole: null },
      demonstrationOnly: true,
    };
    _library = [..._library, entry];
    return ok({ ...entry });
  },

  /** Creates a new drawn signature or initials entry. */
  createDrawn(input: CreateDrawnInput): ServiceResult<SignatureLibraryEntry> {
    if (!input.displayName.trim()) return fail("REQUIRED_FIELD", "displayName");
    if (!input.dataUrl) return fail("REQUIRED_FIELD", "dataUrl");

    if (input.setAsDefault) clearDefault(input.kind);

    const entry: SignatureLibraryEntry = {
      id:           nextId(input.kind),
      kind:         input.kind,
      displayName:  input.displayName.trim(),
      representation: { method: "drawn", dataUrl: input.dataUrl },
      status:       "active",
      defaultState: resolveDefaultState(input.kind, input.setAsDefault),
      createdAt:    nowIso(),
      updatedAt:    nowIso(),
      usageSummary: { demonstrationUseCount: 0, lastSelectedAt: null, commonRole: null },
      demonstrationOnly: true,
    };
    _library = [..._library, entry];
    return ok({ ...entry });
  },

  /** Renames an entry display name. Representation is unchanged. */
  rename(id: SignatureLibraryEntryId, input: RenameEntryInput): ServiceResult<SignatureLibraryEntry> {
    const idx = _library.findIndex(e => e.id === id);
    const current = _library[idx];
    if (!current) return fail("NOT_FOUND");
    if (!input.displayName.trim()) return fail("REQUIRED_FIELD", "displayName");

    const updated = { ...current, displayName: input.displayName.trim(), updatedAt: nowIso() };
    _library = [..._library.slice(0, idx), updated, ..._library.slice(idx + 1)];
    return ok({ ...updated });
  },

  /** Replaces typed representation. Entry ID and default state preserved. */
  replaceTyped(id: SignatureLibraryEntryId, input: ReplaceTypedInput): ServiceResult<SignatureLibraryEntry> {
    const idx = _library.findIndex(e => e.id === id);
    const current = _library[idx];
    if (!current) return fail("NOT_FOUND");
    if (!input.typedText.trim()) return fail("REQUIRED_FIELD", "typedText");

    const updated = {
      ...current,
      representation: { method: "typed" as const, typedText: input.typedText.trim(), styleIndex: input.styleIndex },
      status: "active" as const,
      updatedAt: nowIso(),
    };
    _library = [..._library.slice(0, idx), updated, ..._library.slice(idx + 1)];
    return ok({ ...updated });
  },

  /** Replaces drawn representation. Entry ID and default state preserved. */
  replaceDrawn(id: SignatureLibraryEntryId, input: ReplaceDrawnInput): ServiceResult<SignatureLibraryEntry> {
    const idx = _library.findIndex(e => e.id === id);
    const current = _library[idx];
    if (!current) return fail("NOT_FOUND");
    if (!input.dataUrl) return fail("REQUIRED_FIELD", "dataUrl");

    const updated = {
      ...current,
      representation: { method: "drawn" as const, dataUrl: input.dataUrl },
      status: "active" as const,
      updatedAt: nowIso(),
    };
    _library = [..._library.slice(0, idx), updated, ..._library.slice(idx + 1)];
    return ok({ ...updated });
  },

  /** Sets the entry as default for its kind. Clears previous default of same kind. */
  setDefault(id: SignatureLibraryEntryId): ServiceResult<SignatureLibraryEntry> {
    const idx = _library.findIndex(e => e.id === id);
    const entry = _library[idx];
    if (!entry) return fail("NOT_FOUND");
    if (entry.status !== "active") return fail("INVALID_STATE");

    clearDefault(entry.kind);

    const targetState: SignatureDefaultState =
      entry.kind === "signature" ? "default-signature" : "default-initials";
    // clearDefault preserves order and length, so idx still addresses this entry;
    // defaultState is the only field it rewrites and it is overwritten here anyway.
    const updated = { ...entry, defaultState: targetState, updatedAt: nowIso() };
    _library = [..._library.slice(0, idx), updated, ..._library.slice(idx + 1)];
    return ok({ ...updated });
  },

  /** Archives an entry. Clears default state if it was default. */
  archive(id: SignatureLibraryEntryId): ServiceResult<SignatureLibraryEntry> {
    const idx = _library.findIndex(e => e.id === id);
    const current = _library[idx];
    if (!current) return fail("NOT_FOUND");
    if (current.status === "archived") return fail("INVALID_STATE");

    const updated = {
      ...current,
      status: "archived" as const,
      defaultState: "non-default" as SignatureDefaultState,
      updatedAt: nowIso(),
    };
    _library = [..._library.slice(0, idx), updated, ..._library.slice(idx + 1)];
    return ok({ ...updated });
  },

  /** Restores an archived entry to active. Does not restore default state. */
  restore(id: SignatureLibraryEntryId): ServiceResult<SignatureLibraryEntry> {
    const idx = _library.findIndex(e => e.id === id);
    const current = _library[idx];
    if (!current) return fail("NOT_FOUND");
    if (current.status !== "archived") return fail("INVALID_STATE");

    const updated = { ...current, status: "active" as const, updatedAt: nowIso() };
    _library = [..._library.slice(0, idx), updated, ..._library.slice(idx + 1)];
    return ok({ ...updated });
  },

  /** Removes an entry from the demonstration library. Not secure deletion. */
  remove(id: SignatureLibraryEntryId): ServiceResult<undefined> {
    const idx = _library.findIndex(e => e.id === id);
    if (idx < 0) return fail("NOT_FOUND");
    _library = _library.filter(e => e.id !== id);
    return ok(undefined);
  },

  /** Resets library to initial fixture state. */
  reset(): void {
    _library = buildInitialLibrary();
    _counter = 200;
  },

  /** Clears sensitive in-memory state without full reset. */
  clearSensitiveState(): void {
    // Drawn data URLs are in-memory; all are cleared on page reload.
    // This is a no-op placeholder for future reauthentication or session-clear hooks.
  },
};

// Signature and Initials Library domain models.
// All state is in-memory. No persistence, no upload, no backend.
// No biometric data. No identity verification. No eNotary controls.
// Burgundy (#67023B) is never used here — eNotary-only.

// ── Branded ID ────────────────────────────────────────────────────────────────

export type SignatureLibraryEntryId = string & { readonly __brand: "SignatureLibraryEntryId" };

// ── Core enumerations ─────────────────────────────────────────────────────────

export type SignatureLibraryEntryKind = "signature" | "initials";

export type SignatureRepresentationMethod = "typed" | "drawn";

export type SignatureLibraryEntryStatus = "active" | "archived" | "invalid";

export type SignatureDefaultState = "default-signature" | "default-initials" | "non-default";

// ── Representation variants ───────────────────────────────────────────────────

export interface TypedSignatureRepresentation {
  method: "typed";
  typedText:  string;
  styleIndex: number;
}

export interface DrawnSignatureRepresentation {
  method:  "drawn";
  dataUrl: string | null; // in-memory only — never stored, uploaded, or downloaded
}

export type SignatureRepresentation =
  | TypedSignatureRepresentation
  | DrawnSignatureRepresentation;

// ── Usage summary (fictional demo data only) ──────────────────────────────────

export interface SignatureUsageSummary {
  demonstrationUseCount: number;
  lastSelectedAt:        string | null; // ISO, deterministic fixture
  commonRole:            string | null;
}

// ── Library entry ─────────────────────────────────────────────────────────────

export interface SignatureLibraryEntry {
  id:             SignatureLibraryEntryId;
  kind:           SignatureLibraryEntryKind;
  displayName:    string;
  representation: SignatureRepresentation;
  status:         SignatureLibraryEntryStatus;
  defaultState:   SignatureDefaultState;
  createdAt:      string; // ISO, deterministic fixture
  updatedAt:      string; // ISO, deterministic fixture
  usageSummary:   SignatureUsageSummary;
  demonstrationOnly: true;
}

export interface UserSignatureLibrary {
  entries: SignatureLibraryEntry[];
}

// ── Service input types ───────────────────────────────────────────────────────

export interface CreateTypedInput {
  kind:         SignatureLibraryEntryKind;
  displayName:  string;
  typedText:    string;
  styleIndex:   number;
  setAsDefault: boolean;
}

export interface CreateDrawnInput {
  kind:         SignatureLibraryEntryKind;
  displayName:  string;
  dataUrl:      string;
  setAsDefault: boolean;
}

export interface RenameEntryInput {
  displayName: string;
}

export interface ReplaceTypedInput {
  typedText:  string;
  styleIndex: number;
}

export interface ReplaceDrawnInput {
  dataUrl: string;
}

// ── Action availability ───────────────────────────────────────────────────────

export type SignatureLibraryActionId =
  | "view-entry"
  | "create-signature"
  | "create-initials"
  | "rename-entry"
  | "replace-entry"
  | "set-default-signature"
  | "set-default-initials"
  | "archive-entry"
  | "restore-entry"
  | "remove-entry-demonstration"
  | "use-entry-for-request"
  | "create-one-time";

export interface SignatureActionAvailability {
  available: boolean;
  reason?:   string;
}

export type SignatureActionMap = Partial<Record<SignatureLibraryActionId, SignatureActionAvailability>>;

// ── Library scenarios ─────────────────────────────────────────────────────────

export type SignatureLibraryScenario =
  | "standard"
  | "empty"
  | "typed-only"
  | "archived"
  | "partial-error"
  | "full-error";

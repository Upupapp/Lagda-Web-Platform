// What every Place Fields validation issue means and what its one-click fix
// does. Read by BOTH the Validation panel (for its fix-button labels) and the
// editor's Help panel (for the "Validate & Auto-fix" section), and keyed on
// FIELD_ISSUE_CODES — so an issue code with no explanation is a type error,
// and the help can never describe a fix the panel does not offer.

import type { FieldIssueCode } from "../../models/field-editor";

export interface IssueGuideEntry {
  /** Short name for the check. */
  readonly title: string;
  readonly severity: "error" | "warning";
  /** What it means, in one sentence. */
  readonly meaning: string;
  /** The panel's fix button text, or null when there is no automatic fix. */
  readonly fixLabel: string | null;
  /** What pressing the fix actually does. */
  readonly fixDoes: string | null;
}

export const FIELD_ISSUE_GUIDE: Record<FieldIssueCode, IssueGuideEntry> = {
  NO_DOCUMENTS: {
    title: "No documents", severity: "error",
    meaning: "There is no document to place fields on.",
    fixLabel: "Go to Documents step", fixDoes: "Opens the Documents step so you can add a file.",
  },
  UNASSIGNED_FIELD: {
    title: "Unassigned field", severity: "error",
    meaning: "A field has nobody to complete it.",
    fixLabel: "Fix it for me",
    fixDoes: "Assigns it to the only participant who can complete that field type; when several can, it selects the field so you choose.",
  },
  FIELD_OUT_OF_BOUNDS: {
    title: "Outside the page", severity: "error",
    meaning: "Part of a field extends past the edge of the page.",
    fixLabel: "Fix it for me", fixDoes: "Moves the field fully back onto the page, keeping its size.",
  },
  UNKNOWN_PARTICIPANT: {
    title: "Removed participant", severity: "error",
    meaning: "A field is assigned to someone who is no longer on this document.",
    fixLabel: "Fix it for me",
    fixDoes: "Reassigns it to the single eligible participant, or clears the assignment so you can pick.",
  },
  INCOMPATIBLE_ROLE: {
    title: "Wrong role for the field", severity: "error",
    meaning: "The assigned participant's role cannot complete this field type (for example, a Reviewed over Name on a signer).",
    fixLabel: "Fix it for me",
    fixDoes: "Reassigns it to the single eligible participant, or clears the assignment so you can pick.",
  },
  BLOCKING_FIELD_ON_NON_BLOCKING_ROLE: {
    title: "Required field for a viewer", severity: "error",
    meaning: "Viewers and copy recipients never act, so a required field for them could never be completed.",
    fixLabel: "Fix it for me", fixDoes: "Makes that field optional.",
  },
  SIGNER_MISSING_SIGNATURE: {
    title: "Signer without a signature", severity: "error",
    meaning: "A signer has no Signature or Signature over Name field.",
    fixLabel: "Auto-Fix",
    fixDoes: "Adds a Signature over Name for them in the bottom row of the last page, beside any others, without covering existing fields.",
  },
  REVIEWER_MISSING_REVIEW_BLOCK: {
    title: "Reviewer without a review stamp", severity: "warning",
    meaning: "A reviewer has no Reviewed over Name field, so their review leaves no mark on the document.",
    fixLabel: "Auto-Fix",
    fixDoes: "Adds a Reviewed over Name for them in the bottom row of the last page, beside any others.",
  },
  ACK_RECIPIENT_MISSING_ACK_FIELD: {
    title: "Acknowledgment without a checkbox", severity: "warning",
    meaning: "An acknowledgment recipient has nothing to tick to confirm receipt.",
    fixLabel: "Auto-Fix", fixDoes: "Adds a required checkbox for them at the centre of the current page.",
  },
  FIELD_OVERLAP: {
    title: "Overlapping fields", severity: "warning",
    meaning: "Two fields on the same page cover each other substantially.",
    fixLabel: "Fix it for me", fixDoes: "Moves the first field down (or up, near the bottom) until they separate.",
  },
  NEAR_PAGE_EDGE: {
    title: "Too close to the edge", severity: "warning",
    meaning: "A field sits within 3% of the page edge, where some viewers and printers clip.",
    fixLabel: "Fix it for me", fixDoes: "Moves it just inside the safe margin.",
  },
  DOCUMENT_NO_PARTICIPANT_FIELDS: {
    title: "Document with no fields", severity: "warning",
    meaning: "One of the documents has nothing for any participant to complete.",
    fixLabel: null, fixDoes: null,
  },
  UNSUPPORTED_BACKEND_TYPE: {
    title: "Field type that cannot be saved", severity: "error",
    meaning: "This field type is not supported for a real send and would never reach the server.",
    fixLabel: "Remove this field", fixDoes: "Deletes that field.",
  },
  UNSAVED_EDITS: {
    title: "Unsaved changes", severity: "error",
    meaning: "Your latest placement exists only in this browser.",
    fixLabel: "Save now", fixDoes: "Saves every field to the server — the same save Continue performs.",
  },
};

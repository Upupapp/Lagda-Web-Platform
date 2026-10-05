// What each participant role DOES, in words — one place, so the signing page
// and the Participants record never disagree about it.
//
// Reviewers and acknowledgment recipients submit through the same path as a
// signer and end in the same `signed` state; only the words differ. Approvers
// have their own states (069) and their own pair of actions.

export interface CeremonyWording {
  /** The main button. */
  readonly action: string;
  /** The screen shown once it is recorded. */
  readonly doneTitle: string;
  /** Under the document title while filling. */
  readonly description: string;
  /**
   * What the person is asked before the action is recorded, or null for a
   * signer: adopting a signature and filling the fields is already a
   * deliberate act, and a one-button role has nothing like it.
   */
  readonly confirm: { readonly title: string; readonly lead: string; readonly points: readonly string[] } | null;
}

/** Said to all three: the record is theirs, and it stays. */
const ON_THE_RECORD = "It is recorded under your name with the date and time, and it becomes part of this document's audit trail.";
const CANNOT_UNDO = "It cannot be undone or changed afterwards. If you are unsure, choose Cancel and read the document again.";

export function ceremonyWording(type: string): CeremonyWording {
  switch (type) {
    case "approver":
      return {
        action: "Approve",
        doneTitle: "Your approval was recorded",
        description: "Review the document, then approve it — or skip it. Filling any highlighted field is optional; your signature spots will read APPROVED or SKIPPED on the final document.",
        confirm: {
          title: "Confirm your approval",
          lead: "By choosing Continue, you formally approve this document.",
          points: [
            "The document moves on to the next participants, who will see that you approved it.",
            ON_THE_RECORD, CANNOT_UNDO,
          ],
        },
      };
    case "reviewer":
      return {
        action: "Mark as reviewed",
        doneTitle: "Your review was recorded",
        description: "Review the document and complete any highlighted fields, then mark it as reviewed.",
        confirm: {
          title: "Confirm your review",
          lead: "By choosing Continue, you formally state that you have reviewed this document.",
          points: [
            "The document moves on to the next participants, who will see that you reviewed it.",
            ON_THE_RECORD, CANNOT_UNDO,
          ],
        },
      };
    case "acknowledgment-recipient":
      return {
        action: "Acknowledge",
        doneTitle: "Your acknowledgment was recorded",
        description: "Read the document and complete any highlighted fields to confirm you've received it.",
        confirm: {
          title: "Confirm your acknowledgment",
          lead: "By choosing Continue, you formally acknowledge that you have received and read this document.",
          points: [
            "The sender and the other participants will see that you acknowledged it.",
            ON_THE_RECORD, CANNOT_UNDO,
          ],
        },
      };
    default:
      return {
        action: "Submit signature",
        doneTitle: "Your signature was recorded",
        description: "Read the document, then fill the highlighted fields. Tap a marked box to add your signature.",
        confirm: null,
      };
  }
}

/** The word for a finished `signed` participant, by role. */
export function completedWord(type: string): string {
  if (type === "reviewer") return "Reviewed";
  if (type === "acknowledgment-recipient") return "Acknowledged";
  return "Signed";
}

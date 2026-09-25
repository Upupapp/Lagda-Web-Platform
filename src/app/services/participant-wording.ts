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
}

export function ceremonyWording(type: string): CeremonyWording {
  switch (type) {
    case "approver":
      return {
        action: "Approve",
        doneTitle: "Your approval was recorded",
        description: "Review the document, then approve it — or skip it. Filling any highlighted field is optional; your signature spots will read APPROVED or SKIPPED on the final document.",
      };
    case "reviewer":
      return {
        action: "Mark as reviewed",
        doneTitle: "Your review was recorded",
        description: "Review the document and complete any highlighted fields, then mark it as reviewed.",
      };
    case "acknowledgment-recipient":
      return {
        action: "Acknowledge",
        doneTitle: "Your acknowledgment was recorded",
        description: "Read the document and complete any highlighted fields to confirm you've received it.",
      };
    default:
      return {
        action: "Submit signature",
        doneTitle: "Your signature was recorded",
        description: "Read the document, then fill the highlighted fields. Tap a marked box to add your signature.",
      };
  }
}

/** The word for a finished `signed` participant, by role. */
export function completedWord(type: string): string {
  if (type === "reviewer") return "Reviewed";
  if (type === "acknowledgment-recipient") return "Acknowledged";
  return "Signed";
}

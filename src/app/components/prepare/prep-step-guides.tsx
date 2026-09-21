// What each preparation step is for, and what it needs from you.
//
// ── Why this exists ────────────────────────────────────────────────────────
//
// The help panel could already tell you what was WRONG. It could not tell you
// what a step was FOR. Those are different questions, and the second one is
// the one someone has on their first pass: "Routing" is not self-explanatory,
// and a panel that stays silent until you have already made a mistake is a
// panel that only ever speaks to correct you.
//
// So each step gets a banner of one or two words, an icon, a sentence saying
// what the step decides, and a checklist of what it actually requires —
// marked Required or Optional, because a list of field names does not tell
// anyone which ones they must fill in.
//
// ── What this is NOT ───────────────────────────────────────────────────────
//
// It is not validation. Nothing here decides whether a step is complete; that
// stays with `validateDraftState()` (demo) and `computeSendReadiness()`
// (real backend), which the panel reads separately. Duplicating those rules
// as prose would create a second, quieter source of truth that drifts — the
// requirement list below describes the SHAPE of a step, and the blockers
// underneath it report the live state.

import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  FileText, Users, Route, ShieldCheck, SlidersHorizontal, ClipboardCheck,
  PenLine,
} from "lucide-react";
import type { PreparationStepId } from "../../models/prepare";
import { PREPARATION_STEPS } from "../../models/prepare";

export interface GuideRequirement {
  /** What the step asks for, in the words the step itself uses. */
  readonly label: string;
  /** Why it is asked for, or what happens without it. */
  readonly info: string;
  readonly required: boolean;
}

export interface StepGuide {
  /**
   * One or two words. This is a banner, not a sentence — it names where you
   * are at a glance, and the description underneath carries the meaning.
   */
  readonly banner: string;
  readonly icon: LucideIcon;
  /** What this step decides, in one line. */
  readonly description: string;
  readonly requirements: readonly GuideRequirement[];
}

/**
 * Icons match each step's own `StepBanner`, so the panel and the page agree.
 *
 * `fields` has no StepBanner of its own — it runs as a full-canvas editor —
 * so `PenLine` is chosen here to match what the step does rather than to
 * match a banner that does not exist.
 */
export const PREP_STEP_GUIDES: Record<PreparationStepId, StepGuide> = {
  upload: {
    banner: "Documents",
    icon: FileText,
    description:
      "The file everyone will sign, and what this transaction is called.",
    requirements: [
      {
        label: "At least one document",
        info: "PDF or Word. This is the file signers open and the file that gets sealed.",
        required: true,
      },
      {
        label: "Transaction title",
        info: "Shown in the signing invitation and in everyone's records — name it as the recipient would recognise it.",
        required: true,
      },
    ],
  },

  participants: {
    banner: "Participants",
    icon: Users,
    description:
      "Who receives this document, and what each of them is being asked to do.",
    requirements: [
      {
        label: "Full name",
        info: "Appears on the certificate and in the audit trail.",
        required: true,
      },
      {
        label: "Email address",
        info: "Where the signing link is sent. A typo here means the document reaches nobody.",
        required: true,
      },
      {
        label: "Role",
        info: "Signer, approver, reviewer or copy recipient — this decides which fields they can be given.",
        required: true,
      },
      {
        label: "At least one signer or approver",
        info: "A document with only reviewers and copies has nothing to complete.",
        required: true,
      },
    ],
  },

  routing: {
    banner: "Routing",
    icon: Route,
    description:
      "The order people are asked in — one after another, or all at once.",
    requirements: [
      {
        label: "Every participant placed in a step",
        info: "Anyone left out is never invited, however complete the rest of the setup is.",
        required: true,
      },
      {
        label: "Signing order",
        info: "Participants sharing a step are invited together and can sign in parallel; separate steps wait for the one before.",
        required: false,
      },
    ],
  },

  authentication: {
    banner: "Authentication",
    icon: ShieldCheck,
    description:
      "How much proof a recipient gives that they are who the link was sent to.",
    requirements: [
      {
        label: "Authentication method",
        info: "Email link alone, or an emailed one-time code before the document opens.",
        required: true,
      },
    ],
  },

  settings: {
    banner: "Settings",
    icon: SlidersHorizontal,
    description:
      "Expiry, reminders, and the message that arrives with the invitation.",
    requirements: [
      {
        label: "Expiration date",
        info: "Must be in the future. After it passes the links stop working.",
        required: false,
      },
      {
        label: "Reminders",
        info: "How often a participant who has not signed is nudged.",
        required: false,
      },
      {
        label: "Message to recipients",
        info: "Included in the invitation email. Context here is often why someone signs promptly.",
        required: false,
      },
    ],
  },

  review: {
    banner: "Review",
    icon: ClipboardCheck,
    description:
      "The last look at everything above before this leaves your hands.",
    requirements: [
      {
        label: "Documents and participants confirmed",
        info: "Once sent, changing either means preparing the document again.",
        required: true,
      },
    ],
  },

  fields: {
    banner: "Place Fields",
    icon: PenLine,
    description:
      "Where each participant signs, initials, or fills something in.",
    requirements: [
      {
        label: "A signature field per signer",
        info: "A signer with no field has nothing to complete and cannot finish.",
        required: true,
      },
      {
        label: "Every field assigned",
        info: "An unassigned field belongs to nobody and is never shown to anyone.",
        required: true,
      },
      {
        label: "Fields inside the page",
        info: "A field placed past the edge cannot be drawn onto the sealed document.",
        required: true,
      },
    ],
  },
  authorization: {
    banner: "Authorization",
    icon: BadgeCheck,
    description:
      "The last step before anyone is emailed. Confirm you are authorised to send this document on behalf of your organisation.",
    requirements: [
      {
        label: "Everything before this is complete",
        info: "Authorization is the release, not a place to fix things. Any step still incomplete has to be finished first.",
        required: true,
      },
      {
        label: "You are authorised to send it",
        info: "Pressing Authorize emails a real signing link to every participant. It cannot be recalled once sent.",
        required: true,
      },
    ],
  },

};

/**
 * Which step a path is on.
 *
 * Shared with `PrepareLayout`, which owns the wizard's Previous/Continue and
 * needs the same answer. Two copies of this would be two places to update
 * when a route moves.
 */
export function currentStepFromPath(pathname: string): PreparationStepId | null {
  for (const step of PREPARATION_STEPS) {
    if (pathname === step.route || pathname.startsWith(step.route + "?")) {
      return step.id;
    }
  }
  return null;
}

// What the "About this step" button says on each onboarding step.
//
// Three short answers per step, because those are the three things someone
// hesitating over a form actually wants to know: why it's asked, where it
// goes, and whether they're stuck with it.

import type { OnboardingStepId } from "../../models/auth";

export interface OnboardingStepHelp {
  title: string;
  why: string;
  where: string;
  later: string;
}

export const ONBOARDING_HELP: Record<OnboardingStepId, OnboardingStepHelp> = {
  profile: {
    title: "Your profile",
    why:
      "Your name appears on documents you send and on signatures you place, so recipients know who "
      + "they are dealing with. Your time zone keeps deadlines and timestamps accurate.",
    where: "Your profile — change it anytime in Settings → Profile.",
    later:
      "Yes. Name, job title and sender name are in Settings → Profile; time zone, date and time "
      + "format are in Settings → Preferences.",
  },
  workspace: {
    title: "Your workspace",
    why:
      "A workspace holds your documents, templates and contacts. Choosing personal, team or joining "
      + "an existing one decides who else can see them.",
    where:
      "A workspace you create is saved to your account as soon as you continue. A join request goes "
      + "to that workspace's owners and administrators for approval.",
    later:
      "You can rename a workspace in Workspace → Settings, invite teammates from Workspace → Members, "
      + "and create or join another workspace at any time.",
  },
  security: {
    title: "Account security",
    why:
      "Your electronic signature can be legally binding. Two-step verification stops someone who learns "
      + "your password from signing as you.",
    where: "Your account security — manage it in Settings → Security.",
    later:
      "You can turn two-step verification on or off, and review signed-in devices, anytime in "
      + "Settings → Security.",
  },
  review: {
    title: "Review",
    why: "A last look before you start, so nothing is set up without you seeing it.",
    where: "Each step was saved when you pressed Continue — this page only shows what was saved.",
    later: "Every row has an Edit link, and all of it can be changed later in Settings.",
  },
};

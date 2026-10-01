// The loading screen for each important action, in one place.
//
// Every action a person confirms — answering an invitation, sharing a
// document, adding a contact, sending a plan request, launching a template —
// shows the processing screen for at least PROCESS_HOLD_MS, worded for THAT
// action and tagged with what kind of work it is. Two seconds reads as
// "something real happened", and the screen blocks a second click meanwhile.
//
// Rules the processing service already keeps, and which matter here:
//   · A FAILURE is shown at once — nobody waits two seconds to hear "no".
//   · The hold only delays the caller after the work succeeds.
// Rules for callers:
//   · A confirm dialog may stay open underneath (blurred) so that an error
//     can still be shown inside it; the screen covers its buttons meanwhile.
//   · Not for background work (autosave, counts, search-as-you-type): those
//     stay silent or show an inline spinner.

import type { LucideIcon } from "lucide-react";
import {
  MailOpen, MailX, Undo2, Share2, UserMinus, Trash2, Send, RefreshCcw, ShieldCheck,
  Fingerprint, KeyRound, UserPlus, UserCheck, UserX, Archive, ArchiveRestore, Search,
  Crown, FilePen, LayoutTemplate, Rocket, Link2, Users, UserCog, FileX, Save, Inbox,
  Network, ArrowLeftRight,
} from "lucide-react";
import { runProcess, type ProcessingOptions } from "../services/processing.service";

/** How long an important action's screen stays up, at least. */
export const PROCESS_HOLD_MS = 2000;

interface Screen {
  readonly tag: string;
  readonly icon: LucideIcon;
  readonly message: (who: string) => string;
  readonly detail: string;
}

/** `who` fills a name in where one reads better ("Joining Reyes Law Office…"). */
const SCREENS = {
  // ── Invitations ──────────────────────────────────────────────────────────
  "invitation-accept": { tag: "Invitation", icon: MailOpen, message: w => w ? `Joining ${w}…` : "Accepting the invitation…", detail: "Sending your request to the workspace owner." },
  "invitation-decline": { tag: "Invitation", icon: MailX, message: () => "Declining the invitation…", detail: "The sender will see your reason." },
  "invitation-undo-decline": { tag: "Invitation", icon: Undo2, message: () => "Withdrawing your decline…", detail: "The invitation becomes yours to answer again." },
  // ── Documents shared with you ────────────────────────────────────────────
  "shared-accept": { tag: "Shared document", icon: Inbox, message: () => "Accepting the shared document…", detail: "It will appear under Shared with me." },
  "shared-reject": { tag: "Shared document", icon: MailX, message: () => "Rejecting the shared document…", detail: "The owner will see that you declined." },
  "shared-undo-reject": { tag: "Shared document", icon: Undo2, message: () => "Withdrawing your rejection…", detail: "The document goes back to Pending." },
  "shared-remove-access": { tag: "Shared document", icon: UserMinus, message: () => "Removing your access…", detail: "You will no longer see this document." },
  "shared-delete": { tag: "Shared document", icon: Trash2, message: () => "Deleting it from your list…", detail: "The owner's document is not affected." },
  // ── Sharing your documents ───────────────────────────────────────────────
  "share-create": { tag: "Sharing", icon: Share2, message: w => w ? `Sharing with ${w}…` : "Sharing the document…", detail: "They will get an email with a secure link." },
  "share-update": { tag: "Sharing", icon: Share2, message: () => "Updating the share…", detail: "A new email address starts a fresh invitation." },
  "share-remove": { tag: "Sharing", icon: UserMinus, message: w => w ? `Removing ${w}'s access…` : "Removing access…", detail: "Their link stops working straight away." },
  "access-approve": { tag: "Access request", icon: UserCheck, message: () => "Approving the access request…", detail: "They will be able to open the document." },
  "access-reject": { tag: "Access request", icon: UserX, message: () => "Rejecting the access request…", detail: "They will be told the request was declined." },
  "access-undo": { tag: "Access request", icon: Undo2, message: () => "Withdrawing the rejection…", detail: "The request goes back to Pending." },
  "access-remove": { tag: "Access request", icon: UserMinus, message: () => "Removing their access…", detail: "Their access to the document ends now." },
  "access-delete": { tag: "Access request", icon: Trash2, message: () => "Deleting the request…", detail: "It is removed from your list." },
  // ── Signing ──────────────────────────────────────────────────────────────
  "resend-new": { tag: "Resend", icon: Send, message: () => "Sending to the new recipients…", detail: "A new signing request is created for them." },
  "resend-same": { tag: "Resend", icon: RefreshCcw, message: () => "Resending to the same participants…", detail: "Each one gets a fresh signing link." },
  "send-for-signature": { tag: "Signing request", icon: Send, message: () => "Sending for signature…", detail: "Each participant gets a secure signing link." },
  "discard-draft": { tag: "Preparation", icon: FileX, message: () => "Discarding this preparation…", detail: "The draft and its files are removed." },
  // ── Verification ─────────────────────────────────────────────────────────
  "verify-lookup": { tag: "Verification", icon: ShieldCheck, message: () => "Looking up the verification record…", detail: "Checking the ID against the sealed records." },
  "verify-integrity": { tag: "Integrity check", icon: Fingerprint, message: () => "Checking the document's fingerprint…", detail: "Comparing your file with the sealed record. The file is not stored." },
  "verify-access-request": { tag: "Verification", icon: KeyRound, message: () => "Requesting access to the document…", detail: "The owner will be asked to approve it." },
  "verify-code-send": { tag: "Verification", icon: KeyRound, message: () => "Sending your access code…", detail: "Check your inbox for a six-digit code." },
  "verify-code-check": { tag: "Verification", icon: KeyRound, message: () => "Checking your code…", detail: "Opening the record once it matches." },
  // ── Contacts ─────────────────────────────────────────────────────────────
  "contact-create": { tag: "Contacts", icon: UserPlus, message: w => w ? `Adding ${w} to your contacts…` : "Adding the contact…", detail: "Saved to this workspace's contact list." },
  "contact-update": { tag: "Contacts", icon: Save, message: () => "Saving the contact…", detail: "Your changes are saved to this workspace." },
  "contact-delete": { tag: "Contacts", icon: Trash2, message: () => "Deleting the contact…", detail: "It is removed from this workspace." },
  "contact-archive": { tag: "Contacts", icon: Archive, message: w => w ? `Archiving ${w}…` : "Archiving the contacts…", detail: "Archived contacts can be restored at any time." },
  "contact-restore": { tag: "Contacts", icon: ArchiveRestore, message: () => "Restoring the contact…", detail: "It returns to your active contacts." },
  "contact-lookup": { tag: "Find people", icon: Search, message: () => "Looking for that person…", detail: "Only people who allow it can be found by email." },
  "contact-request-send": { tag: "Contact request", icon: UserPlus, message: () => "Sending your contact request…", detail: "They will be asked to accept it." },
  "contact-request-accept": { tag: "Contact request", icon: UserCheck, message: w => w ? `Adding ${w} to your contacts…` : "Accepting the contact request…", detail: "You will each appear in the other's contacts." },
  "contact-request-decline": { tag: "Contact request", icon: UserX, message: () => "Declining the contact request…", detail: "They will not be added to your contacts." },
  "contact-request-cancel": { tag: "Contact request", icon: Undo2, message: () => "Cancelling your contact request…", detail: "It is withdrawn before they answer." },
  // ── Plans ────────────────────────────────────────────────────────────────
  "plan-request": { tag: "Plan request", icon: Crown, message: w => w ? `Sending your ${w} plan request…` : "Sending your plan request…", detail: "The approver gets an email to confirm it." },
  "plan-request-cancel": { tag: "Plan request", icon: Undo2, message: () => "Cancelling your plan request…", detail: "You stay on your current plan." },
  // ── Templates ────────────────────────────────────────────────────────────
  "template-generate": { tag: "Template", icon: FilePen, message: () => "Generating your document…", detail: "Rendering the content into a PDF and saving it." },
  "template-open": { tag: "Use template", icon: LayoutTemplate, message: w => w ? `Opening ${w}…` : "Opening the template…", detail: "Setting up the roles for you to fill in." },
  "template-launch": { tag: "Review & launch", icon: Rocket, message: () => "Launching your signing request…", detail: "Taking your document and participants to Prepare." },
  "template-delete": { tag: "Template", icon: Trash2, message: () => "Deleting the template…", detail: "Documents already sent from it are not affected." },
  "template-archive": { tag: "Template", icon: Archive, message: () => "Archiving the template…", detail: "It can be restored later." },
  // ── Workspace ────────────────────────────────────────────────────────────
  "member-invite": { tag: "Members", icon: Users, message: w => w ? `Inviting ${w}…` : "Sending the invitation…", detail: "They will get an email to join this workspace." },
  "member-role": { tag: "Members", icon: UserCog, message: () => "Changing the member's role…", detail: "Their access changes as soon as it is saved." },
  "member-remove": { tag: "Members", icon: UserMinus, message: () => "Removing the member…", detail: "They lose access to this workspace." },
  "join-link-create": { tag: "Join link", icon: Link2, message: () => "Creating the join link…", detail: "Anyone with it can ask to join." },
  "join-request-decide": { tag: "Join request", icon: UserCheck, message: () => "Recording your decision…", detail: "The person will be told the outcome." },
  // ── People & Teams ───────────────────────────────────────────────────────
  "member-move": { tag: "People & Teams", icon: Network, message: w => w ? `Moving ${w}…` : "Changing the team…", detail: "They keep their workspace role and access." },
  "member-title": { tag: "People & Teams", icon: Save, message: () => "Saving the position…", detail: "Shown wherever the team is listed." },
  "member-swap": { tag: "People & Teams", icon: ArrowLeftRight, message: w => w ? `Swapping positions with ${w}…` : "Swapping positions…", detail: "Both titles change together." },
  "member-access": { tag: "Members", icon: KeyRound, message: () => "Saving their access…", detail: "Their title and privileges change now." },
  "team-member-remove": { tag: "People & Teams", icon: UserMinus, message: w => w ? `Removing ${w} from the team…` : "Removing them from the team…", detail: "They stay in the workspace." },
  "contact-to-team": { tag: "People & Teams", icon: UserPlus, message: w => w ? `Adding ${w}…` : "Adding the contact to the team…", detail: "Members join the team at once; others get an invitation first." },
  "team-member-add": { tag: "People & Teams", icon: UserPlus, message: w => w ? `Adding ${w}…` : "Adding them to the team…", detail: "Their workspace role and access stay the same." },
  "team-rename": { tag: "People & Teams", icon: Save, message: () => "Renaming the team…", detail: "The new name shows everywhere straight away." },
  "team-delete": { tag: "People & Teams", icon: Trash2, message: w => w ? `Deleting ${w}…` : "Deleting the team…", detail: "It is removed for good. The Activity log keeps its name." },
  "team-create": { tag: "People & Teams", icon: Network, message: w => w ? `Creating ${w}…` : "Creating the team…", detail: "Add people to it straight after." },
} as const satisfies Record<string, Screen>;

export type ProcessKind = keyof typeof SCREENS;

/** The processing options for `kind`, held for PROCESS_HOLD_MS. */
export function processScreen(kind: ProcessKind, who = ""): ProcessingOptions {
  const s: Screen = SCREENS[kind];
  return { message: s.message(who.trim()), detail: s.detail, tag: { label: s.tag, icon: s.icon }, minDuration: PROCESS_HOLD_MS };
}

export const PROCESS_KINDS = Object.keys(SCREENS) as ProcessKind[];

/** Runs `work` behind `kind`'s loading screen (held PROCESS_HOLD_MS on success). */
export function withProcess<T>(kind: ProcessKind, who: string, work: () => Promise<T>): Promise<T> {
  return runProcess(processScreen(kind, who), work);
}

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
//
// The result (2026-10-22): an action with `done` wording is followed, in the
// screen's place, by how it ended: its success title and what happens next, or
// "It did not go through" with the reason the caller passes to withProcess
// (the same words the page shows). The eNotary actions have it.

import type { LucideIcon } from "lucide-react";
import {
  MailOpen, MailX, Undo2, Share2, UserMinus, Trash2, Send, RefreshCcw, ShieldCheck,
  Fingerprint, KeyRound, UserPlus, UserCheck, UserX, Archive, ArchiveRestore, Search,
  Crown, FilePen, LayoutTemplate, Rocket, Link2, Users, UserCog, FileX, Save, Inbox,
  Network, ArrowLeftRight, Ban, RotateCcw, Stamp, FileUp, Video, QrCode, Banknote, BadgeCheck, ClipboardCheck,
  PhoneOff, FileCheck, ScrollText, Mail, Package, PenLine,
} from "lucide-react";
import { runProcess, type ProcessingOptions } from "../services/processing.service";

/** How long an important action's screen stays up, at least. */
export const PROCESS_HOLD_MS = 2000;

interface Screen {
  readonly tag: string;
  readonly icon: LucideIcon;
  readonly message: (who: string) => string;
  readonly detail: string;
  /** The result once it has gone through: a short title and what happens next. */
  readonly done?: (who: string) => { readonly title: string; readonly detail: string };
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
  "plan-request": { tag: "Plan request", icon: Crown, message: w => w ? `Sending your ${w} payment details…` : "Sending your payment details…", detail: "LAGDA gets an email to confirm the payment." },
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
  // ── A document's life: cancel, restore, the Recycle Bin, deletion ─────────
  "document-cancel": { tag: "Documents", icon: Ban, message: w => w ? `Cancelling “${w}”…` : "Cancelling the signing request…", detail: "Every signing link stops working." },
  "document-restore": { tag: "Documents", icon: RotateCcw, message: w => w ? `Restoring “${w}”…` : "Restoring the signing request…", detail: "New links go to everyone who has not acted yet." },
  "document-trash": { tag: "Recycle Bin", icon: Trash2, message: w => w ? `Moving “${w}” to the Recycle Bin…` : "Moving it to the Recycle Bin…", detail: "Nothing is erased. It can be restored." },
  "draft-delete": { tag: "Documents", icon: FileX, message: w => w ? `Deleting the draft “${w}”…` : "Deleting the draft…", detail: "Its file, participants and fields are erased." },
  "document-delete": { tag: "Documents", icon: FileX, message: w => w ? `Deleting “${w}”…` : "Deleting the document…", detail: "It is erased for good." },
  "bin-restore": { tag: "Recycle Bin", icon: ArchiveRestore, message: w => w ? `Restoring “${w}” from the Recycle Bin…` : "Restoring it from the Recycle Bin…", detail: "It goes back to the list it came from." },
  "bin-delete": { tag: "Recycle Bin", icon: FileX, message: w => w ? `Permanently deleting “${w}”…` : "Permanently deleting the document…", detail: "The document, its signatures and its history are erased." },
  "bin-empty": { tag: "Recycle Bin", icon: FileX, message: () => "Emptying the Recycle Bin…", detail: "Each document, its signatures and its history are erased." },
  "deletion-request": { tag: "Recycle Bin", icon: Send, message: () => "Sending your request to the owner…", detail: "The workspace owner decides whether it is deleted." },
  "deletion-approve": { tag: "Deletion request", icon: UserCheck, message: () => "Approving and deleting the document…", detail: "Everyone who had access is told, with your reason." },
  "deletion-disapprove": { tag: "Deletion request", icon: UserX, message: () => "Disapproving the deletion request…", detail: "The document stays in the Recycle Bin." },
  "signed-remove": { tag: "Signed by me", icon: Trash2, message: () => "Removing it from your Signed by me list…", detail: "Nothing is erased for anyone else." },
  "deleted-notice-remove": { tag: "Documents", icon: Trash2, message: () => "Removing the deleted-document notice…", detail: "It leaves your list." },
  // ── LAGDA eNotary ───────────────────────────────────────────────────────
  "enotary-access": { tag: "eNotary", icon: Stamp, message: () => "Opening LAGDA eNotary…", detail: "Setting up your eNotary pages." },
  "enotary-claim": { tag: "Notary request", icon: Stamp, message: () => "Opening the request…", detail: "Checking your identity and that this request is for you." },
  "enotary-take": { tag: "Notary request", icon: Stamp, message: w => w ? `Taking the request from ${w}…` : "Taking the request…", detail: "Checking your identity, then moving it to your waiting list.",
    done: w => ({ title: "Request taken", detail: w ? `The request from ${w} is on your waiting list. You can accept or decline it now.` : "It is on your waiting list. You can accept or decline it now." }) },
  "enotary-accept": { tag: "Notary request", icon: BadgeCheck, message: w => w ? `Accepting the request from ${w}…` : "Accepting the request…", detail: "The client is told, and is asked to pay if you set a fee.",
    done: () => ({ title: "Request accepted", detail: "The client is told, and is asked to pay if you set a fee." }) },
  "enotary-decline": { tag: "Notary request", icon: MailX, message: w => w ? `Declining the request from ${w}…` : "Declining the request…", detail: "The client is told. This cannot be undone.",
    done: () => ({ title: "Request declined", detail: "The client is told." }) },
  "enotary-payment-confirm": { tag: "Payment", icon: Banknote, message: w => w ? `Confirming the payment from ${w}…` : "Confirming the payment…", detail: "The client is told.",
    done: () => ({ title: "Payment confirmed", detail: "The client is told." }) },
  "enotary-payment-missing": { tag: "Payment", icon: Banknote, message: () => "Telling the client the payment did not arrive…", detail: "They can send the reference again.",
    done: () => ({ title: "The client is told", detail: "The payment did not arrive. They can send the reference again." }) },
  "enotary-payment-proof": { tag: "Payment", icon: Banknote, message: () => "Sending your payment reference…", detail: "The notary checks it in their own bank or wallet app.",
    done: () => ({ title: "Payment reference sent", detail: "The notary checks it in their own bank or wallet app." }) },
  "enotary-qr-save": { tag: "Payment QR", icon: QrCode, message: () => "Saving your payment QR…", detail: "Reading the code, then saving where clients pay you.",
    done: () => ({ title: "Payment QR saved", detail: "Clients can be asked to pay you through it." }) },
  "enotary-qr-remove": { tag: "Payment QR", icon: Trash2, message: () => "Removing your payment QR…", detail: "Clients can no longer be asked to pay you through LAGDA.",
    done: () => ({ title: "Payment QR removed", detail: "Clients can no longer be asked to pay you through LAGDA." }) },
  "enotary-request-revoke": { tag: "Notary request", icon: Undo2, message: () => "Cancelling your request…", detail: "The notary's link stops working.",
    done: () => ({ title: "Request cancelled", detail: "The notary's link no longer works." }) },
  "enotary-request-renew": { tag: "Notary request", icon: RefreshCcw, message: () => "Making a new request…", detail: "A new link and QR card, good for a limited time.",
    done: () => ({ title: "New request made", detail: "It has a new link and QR card, good for a limited time." }) },
  "enotary-request-email": { tag: "Notary request", icon: Mail, message: () => "Saving the notary's email…", detail: "It is kept with your request.",
    done: () => ({ title: "Notary's email saved", detail: "It is kept with your request." }) },
  "enotary-session-start": { tag: "Notary session", icon: Video, message: () => "Starting the session…", detail: "A private room is made for you and the notary.",
    done: () => ({ title: "Session started", detail: "A private room is ready for you and the notary." }) },
  "enotary-document-add": { tag: "Notary session", icon: FileUp, message: () => "Adding your document…", detail: "Checking the file, then sharing it with the notary only.",
    done: () => ({ title: "Document added", detail: "It is shared with the notary only." }) },
  "enotary-document-replace": { tag: "Notary session", icon: FileUp, message: () => "Replacing your document…", detail: "The notary sees the new file once it is in.",
    done: () => ({ title: "Document replaced", detail: "The notary sees the new file." }) },
  "enotary-room-open": { tag: "Notary session", icon: Video, message: () => "Opening the room…", detail: "The client can join as soon as it is open.",
    done: () => ({ title: "Room open", detail: "The client can join now." }) },
  "enotary-consent": { tag: "Notary session", icon: ClipboardCheck, message: () => "Recording your confirmation…", detail: "The notary can then record the act.",
    done: () => ({ title: "Confirmation recorded", detail: "The notary can now record the act." }) },
  "enotary-finalize": { tag: "Notary session", icon: FileCheck, message: () => "Finalizing your document…", detail: "It can no longer be replaced. The notary is told.",
    done: () => ({ title: "Document finalized", detail: "It can no longer be replaced. The notary is told." }) },
  "enotary-identity": { tag: "Notary session", icon: ClipboardCheck, message: () => "Recording that you confirmed their identity…", detail: "This goes into the audit trail.",
    done: () => ({ title: "Identity confirmed", detail: "It is in the audit trail." }) },
  "enotary-act": { tag: "Notary session", icon: Stamp, message: () => "Sending the act and fee to the client…", detail: "The client approves it.",
    done: () => ({ title: "Sent to the client", detail: "The client approves the act and the fee." }) },
  "enotary-approve": { tag: "Notary session", icon: ClipboardCheck, message: () => "Recording your approval…", detail: "A fee is opened for payment to the notary.",
    done: () => ({ title: "Approval recorded", detail: "The notary is told. Any fee is paid to the notary directly." }) },
  "enotary-notarize": { tag: "Notary session", icon: Stamp, message: () => "Recording the notarial act…", detail: "Sealing the document and writing the register entry. This cannot be undone.",
    done: () => ({ title: "Document notarized", detail: "The sealed document and its register entry are ready." }) },
  "enotary-session-cancel": { tag: "Notary session", icon: PhoneOff, message: () => "Calling off the session…", detail: "Nothing is notarized. The other person is told.",
    done: () => ({ title: "Session called off", detail: "Nothing is notarized. The other person is told." }) },
  "enotary-session-reopen-request": { tag: "Notary session", icon: Mail, message: () => "Emailing your notary…", detail: "They are told you want to continue. Nothing is charged.",
    done: w => ({ title: "Email sent to your notary", detail: `We emailed ${w === "" ? "your notary" : w} that you want to continue. You are told as soon as they open the session again.` }) },
  "enotary-session-reopen": { tag: "Notary session", icon: Video, message: () => "Opening the session again…", detail: "The client is told. The same document and request carry on.",
    done: () => ({ title: "Session open again", detail: "The client is told. The same document and request carry on." }) },
  "enotary-seal-save": { tag: "Notary seal", icon: Stamp, message: () => "Saving your seal…", detail: "Documents you notarize from now on carry it as shown.",
    done: () => ({ title: "Seal saved", detail: "Documents you notarize from now on carry it as shown." }) },
  "enotary-signature-save": { tag: "Notary seal", icon: PenLine, message: () => "Saving your signature…", detail: "Only you can see this picture. It is drawn where you drop it on each document.",
    done: () => ({ title: "Signature saved", detail: "Only you can see this picture. It is drawn where you drop it on each document." }) },
  "enotary-signature-remove": { tag: "Notary seal", icon: Trash2, message: () => "Removing your signature…", detail: "Documents you notarize from now on carry no signature picture.",
    done: () => ({ title: "Signature removed", detail: "Documents you notarize from now on carry no signature picture." }) },
  "enotary-register-export": { tag: "Notary Book", icon: ScrollText, message: () => "Preparing your spreadsheet…", detail: "Your entries, one row each, ready to open in a spreadsheet.",
    done: () => ({ title: "Spreadsheet ready", detail: "Your entries, one row each, are saved like any download." }) },
  "enotary-register-report": { tag: "Notary Book", icon: FileCheck, message: () => "Preparing the monthly report…", detail: "A cover letter to the Clerk of Court and the month's entries. You read, sign and submit it.",
    done: () => ({ title: "Monthly report ready", detail: "It is saved like any download. You read, sign and submit it." }) },
  "enotary-copy-stage": { tag: "Certified copy", icon: Package, message: () => "Updating the copy's journey…", detail: "The client sees the new step at once.",
    done: () => ({ title: "Copy updated", detail: "The client sees the new step at once." }) },
  "enotary-copy-quote": { tag: "Certified copy", icon: Banknote, message: () => "Sending your fee for the copies…", detail: "The client is told and pays you directly.",
    done: () => ({ title: "Fee sent", detail: "The client is told the fee, and pays it to your QR." }) },
  "enotary-copy-decline": { tag: "Certified copy", icon: MailX, message: () => "Declining the copies…", detail: "The client is told.",
    done: () => ({ title: "Copies declined", detail: "The client is told." }) },
  "enotary-copy-cancel": { tag: "Certified copy", icon: Undo2, message: () => "Cancelling your request for copies…", detail: "The notary is told.",
    done: () => ({ title: "Request for copies cancelled", detail: "The notary is told." }) },
  "enotary-copy-proof": { tag: "Certified copy", icon: Banknote, message: () => "Sending your payment reference…", detail: "The notary checks it in their own bank or wallet app.",
    done: () => ({ title: "Payment reference sent", detail: "The notary checks it in their own bank or wallet app, then prepares your copies." }) },
  "enotary-copy-pay-confirm": { tag: "Certified copy", icon: Banknote, message: () => "Confirming the payment for the copies…", detail: "The client is told.",
    done: () => ({ title: "Payment confirmed", detail: "The client is told. Prepare the copies next." }) },
  "enotary-copy-pay-missing": { tag: "Certified copy", icon: Banknote, message: () => "Telling the client the payment did not arrive…", detail: "They can send the reference again.",
    done: () => ({ title: "The client is told", detail: "The payment did not arrive. They can send the reference again." }) },
  "enotary-copy-fulfil": { tag: "Certified copy", icon: Package, message: () => "Issuing the copies…", detail: "The client is told at once.",
    done: () => ({ title: "Copies issued", detail: "The client is told, and can see them in the session." }) },
  "enotary-copy-received": { tag: "Certified copy", icon: Package, message: () => "Recording that you received the copies…", detail: "The notary is told.",
    done: () => ({ title: "Marked as received", detail: "The notary is told. Thank you." }) },
  "enotary-copy-request": { tag: "Certified copy", icon: FileCheck, message: () => "Asking for your certified copy…", detail: "The notary is told and will answer in the session.",
    done: () => ({ title: "Certified copy requested", detail: "The notary is told and will answer in the session." }) },
  "enotary-application-submit": { tag: "Notary application", icon: ScrollText, message: () => "Sending your application…", detail: "A LAGDA reviewer will look at it. You can withdraw it while it is open.",
    done: () => ({ title: "Application sent", detail: "A LAGDA reviewer will look at it. You can withdraw it while it is open." }) },
  "enotary-application-withdraw": { tag: "Notary application", icon: Undo2, message: () => "Withdrawing your application…", detail: "You can start a new one at any time.",
    done: () => ({ title: "Application withdrawn", detail: "You can start a new one at any time." }) },
  "enotary-application-file": { tag: "Notary application", icon: FileUp, message: () => "Uploading your file…", detail: "It is checked for viruses before the reviewer can open it.",
    done: () => ({ title: "File uploaded", detail: "It is checked for viruses before the reviewer can open it." }) },
  "enotary-application-file-remove": { tag: "Notary application", icon: Trash2, message: () => "Removing the file…", detail: "It is erased from your application.",
    done: () => ({ title: "File removed", detail: "It is erased from your application." }) },
  "enotary-review-approve": { tag: "Notary review", icon: UserCheck, message: () => "Approving the notary…", detail: "They are told, and can begin to answer requests.",
    done: () => ({ title: "Notary approved", detail: "They are told, and can begin to answer requests." }) },
  "enotary-review-reject": { tag: "Notary review", icon: UserX, message: () => "Recording the decision…", detail: "The notary is told the reason.",
    done: () => ({ title: "Decision recorded", detail: "The notary is told the reason." }) },
} as const satisfies Record<string, Screen>;

export type ProcessKind = keyof typeof SCREENS;

/** The processing options for `kind`, held for PROCESS_HOLD_MS, and followed by its result when it has `done` wording. */
export function processScreen(kind: ProcessKind, who = "", failure?: (error: unknown) => string): ProcessingOptions {
  const s: Screen = SCREENS[kind];
  const done = s.done?.(who.trim());
  return {
    message: s.message(who.trim()), detail: s.detail, tag: { label: s.tag, icon: s.icon }, minDuration: PROCESS_HOLD_MS,
    ...(done === undefined ? {} : { result: { success: done, ...(failure === undefined ? {} : { failure }) } }),
  };
}

export const PROCESS_KINDS = Object.keys(SCREENS) as ProcessKind[];

/**
 * Runs `work` behind `kind`'s loading screen (held PROCESS_HOLD_MS on success), then shows how it ended where the kind
 * has `done` wording. `failure` words a failure as the page does; without it a failure shows no result.
 */
export function withProcess<T>(kind: ProcessKind, who: string, work: () => Promise<T>, failure?: (error: unknown) => string): Promise<T> {
  return runProcess(processScreen(kind, who, failure), work);
}

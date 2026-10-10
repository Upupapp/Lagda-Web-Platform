// The optional identity check ("ID and face verification"): the words and the
// vocabulary both realms share.
//
// Kept free of any API client on purpose. The participant's signing page may
// not import anything from the sender's realm, and the sender's pages may not
// use the recipient client, yet both must name an ID the same way.
//
// ── Test mode ──────────────────────────────────────────────────────────────
//
// No provider is connected. Where the mode is `test` the check is SIMULATED:
// nothing is compared and nobody is identified. Every screen that shows a
// result in that mode must say so, and must not call it a verification.

export type IdentityCheckMode = "test" | "live";

/** What the sender's option is called. */
export const IDENTITY_CHECK_OPTION_LABEL = "ID and face verification";
/** The link every participant already has, as the Authentication step names it. */
export const SECURE_LINK_LABEL = "Secure Invitation Link";
/** The two together, for a participant who has the option switched on. */
export const SECURE_LINK_PLUS_IDENTITY_LABEL = `${SECURE_LINK_LABEL} + ${IDENTITY_CHECK_OPTION_LABEL}`;

export const IDENTITY_CHECK_TEST_MODE_NOTICE =
  "Test mode. The check is simulated: no identity is actually verified, and the document's history will say so.";

/**
 * What the sender is told the check asks of a participant where it is done on
 * the identity verification partner's page.
 */
export const IDENTITY_CHECK_HOSTED_EXPLAINER =
  "The participant is taken to a secure verification page to show an ID and complete a face check "
  + "before they can open the document. "
  + "This is in addition to their secure invitation link, not instead of it.";

// ── How long a pass counts ──────────────────────────────────────────────────

/**
 * A passed check counts for this many hours, for every document in the SAME
 * workspace that asks the check of the SAME email address.
 *
 * FOR WORDING ONLY. The server enforces the real window and decides who is
 * asked; nothing here lets anybody through or keeps anybody out. Every
 * sentence that names the duration is built from this one number.
 */
export const IDENTITY_CHECK_VALID_HOURS = 24;

const VALID_FOR = `${String(IDENTITY_CHECK_VALID_HOURS)} hours`;

/** Said to the participant straight after a real pass. */
export const IDENTITY_CHECK_VALID_NOTE =
  `Your identity is verified for the next ${VALID_FOR}. During that time you can open and sign other `
  + "documents from this sender's workspace without verifying again.";

/** The same moment in test mode, where nothing was verified and nothing may say it was. */
export const IDENTITY_CHECK_VALID_NOTE_TEST =
  `In test mode this result is kept for ${VALID_FOR}, as a real verification would be.`;

/** Said to the sender, under what the check asks of a participant. */
export const IDENTITY_CHECK_VALID_SENDER_NOTE =
  `A participant who passes is not asked again for ${VALID_FOR} on this workspace's documents.`;

/** A date and time in the reader's own locale: "9 Oct 2026, 10:00 am". */
function whenLabel(at: Date): string {
  return at.toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

/**
 * What a participant is told when they are NOT asked, because an earlier
 * pass still counts. `null` when there is nothing to say: no check asked of
 * them, not passed, or no record of when.
 *
 * In test mode nothing was verified, and the sentence does not say it was.
 */
export function identityCheckStandingNote(
  check: {
    readonly required: boolean; readonly status: string;
    readonly mode: IdentityCheckMode | null; readonly verifiedAt: string | null;
  } | undefined,
): string | null {
  if (check === undefined || !check.required || check.status !== "passed" || check.verifiedAt === null) return null;
  const verified = new Date(check.verifiedAt);
  if (Number.isNaN(verified.getTime())) return null;
  const until = new Date(verified.getTime() + IDENTITY_CHECK_VALID_HOURS * 60 * 60 * 1000);
  return check.mode === "test"
    ? `Identity check completed in test mode ${whenLabel(verified)}. Kept until ${whenLabel(until)}.`
    : `Identity verified ${whenLabel(verified)}. Valid until ${whenLabel(until)}. `
      + "You will not be asked again for this workspace's documents until then.";
}

const ID_TYPE_LABELS: Readonly<Record<string, string>> = {
  "philsys-national-id": "Philippine Identification (PhilSys) Card / ePhilID",
  "philippine-passport": "Philippine Passport",
  "drivers-license": "Driver's License (LTO)",
  "umid": "UMID (SSS / GSIS)",
  "sss-id": "SSS ID",
  "gsis-ecard": "GSIS e-Card",
  "prc-id": "PRC ID (Professional Regulation Commission)",
  "owwa-ofw-id": "OWWA / OFW ID",
  "seafarers-book": "Seafarer's Record Book (SIRB)",
  "postal-id": "Postal ID",
  "voters-id": "Voter's ID / Voter's Certification",
  "senior-citizen-id": "Senior Citizen ID",
  "pwd-id": "PWD ID (NCDA)",
  "ibp-id": "Integrated Bar of the Philippines (IBP) ID",
  "government-office-id": "Government office or GOCC ID",
  "foreign-passport": "Foreign Passport",
  "acr-icard": "Alien Certificate of Registration (ACR I-Card)",
  // What the identity verification partner reports: a kind, not a named card.
  "passport": "Passport",
  "other-id": "Other government ID",
};

const ID_TYPE_GROUPS: readonly { readonly label: string; readonly ids: readonly string[] }[] = [
  { label: "National and travel", ids: ["philsys-national-id", "philippine-passport", "drivers-license"] },
  {
    label: "Social security and employment",
    ids: ["umid", "sss-id", "gsis-ecard", "prc-id", "owwa-ofw-id", "seafarers-book"],
  },
  {
    label: "Civil and sectoral",
    ids: ["postal-id", "voters-id", "senior-citizen-id", "pwd-id", "ibp-id", "government-office-id"],
  },
  { label: "For foreign nationals", ids: ["foreign-passport", "acr-icard"] },
];

/** The name of a kind of ID. An id this build does not know still reads. */
export function identityIdTypeLabel(idType: string): string {
  return ID_TYPE_LABELS[idType] ?? idType.replace(/-/g, " ");
}

export interface IdentityIdTypeGroup {
  readonly label: string;
  readonly options: readonly { readonly id: string; readonly label: string }[];
}

/**
 * The kinds of ID the SERVER lists, grouped for a select. Nothing the server
 * did not list is offered; anything it lists that this build has no group for
 * goes under "Other" rather than being dropped.
 */
export function groupIdentityIdTypes(offered: readonly string[]): IdentityIdTypeGroup[] {
  const remaining = new Set(offered);
  const groups: IdentityIdTypeGroup[] = [];
  for (const group of ID_TYPE_GROUPS) {
    const options = group.ids.filter(id => remaining.has(id)).map(id => ({ id, label: identityIdTypeLabel(id) }));
    for (const option of options) remaining.delete(option.id);
    if (options.length > 0) groups.push({ label: group.label, options });
  }
  if (remaining.size > 0) {
    groups.push({ label: "Other", options: [...remaining].map(id => ({ id, label: identityIdTypeLabel(id) })) });
  }
  return groups;
}

/** A passport has one page to show; no back is asked for. */
export function identityIdHasBack(idType: string): boolean {
  return idType !== "philippine-passport" && idType !== "foreign-passport";
}

/** Roles that act on a document. Viewers and copy recipients cannot be asked for a check. */
export function roleCanBeAskedForIdentityCheck(role: string): boolean {
  return role === "signer" || role === "approver" || role === "reviewer" || role === "acknowledgment-recipient";
}

// ── Continuing on a phone ───────────────────────────────────────────────────

/** How long a link to continue on a phone is good for. */
export const IDENTITY_HANDOFF_LIFETIME_MS = 10 * 60 * 1000;

/**
 * How long a hand-off link has left, by this device's clock. `null` when the
 * answer cannot be believed: a link the server has just handed over is never
 * already over, nor good for longer than its lifetime, so either means this
 * device's clock is wrong and the server's word is the only one to go by.
 */
export function identityHandoffTimeLeft(expiresAt: string, now: number): number | null {
  const left = Date.parse(expiresAt) - now;
  if (!Number.isFinite(left) || left <= 0 || left > IDENTITY_HANDOFF_LIFETIME_MS + 60_000) return null;
  return left;
}

// ── Coming back from the identity verification partner ─────────────────────

/** Where the partner sends the browser when the participant has finished. */
export const IDENTITY_RETURN_PATH = "/sign/identity/return";

/**
 * The signing page's address for a participant whose signing session is
 * already open: the same one "Continue signing" in Documents uses.
 */
export const SIGNING_CONTINUE_PATH = "/sign/continue";

/** How long after coming back the result is asked for every few seconds. */
export const IDENTITY_RETURN_FAST_WINDOW_MS = 20_000;

/**
 * What the return page hands the signing page, in router state and never in
 * the address: that the participant has just come back, and when.
 */
export interface IdentityReturnState {
  readonly identityReturnedAt: number;
}

export function identityReturnState(now: number): IdentityReturnState {
  return { identityReturnedAt: now };
}

/** When the participant came back, or null when router state does not say so. */
export function identityReturnedAt(state: unknown): number | null {
  if (typeof state !== "object" || state === null) return null;
  const at = (state as { identityReturnedAt?: unknown }).identityReturnedAt;
  return typeof at === "number" && Number.isFinite(at) ? at : null;
}

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

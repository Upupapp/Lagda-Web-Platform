// The wording of the notary session's location record, in ONE place.
//
// STATUS: DRAFT for legal review. Nothing here is recorded or printed on a
// certificate yet; the review page (/enotary/wording-draft) shows it so the
// lawyer can judge it. Change the text here and the page changes with it.

export const WORDING_STATUS = "Draft for legal review";

/** The sentence a notarization certificate would carry about where each person was. */
export const CERTIFICATE_LOCATION_SENTENCE =
  "At the time of this notarial act, [Client name] connected from [City, Province], Philippines, and [Notary name] connected from "
  + "[City, Province], Philippines, as determined from the network address at [date and time, Philippine time]. "
  + "This is an approximate location and is supporting evidence only.";

/** The same sentence when a location is outside the Philippines or could not be found. */
export const CERTIFICATE_LOCATION_UNCONFIRMED =
  "At the time of this notarial act, the location of [Client name] could not be confirmed as within the Philippines. "
  + "The notary has been informed.";

/** What each person would read and agree to before a session starts. */
export const LOCATION_CONSENT_TEXT =
  "To help verify where this notarization takes place, LAGDA records your IP address and the approximate city it points to "
  + "when the session starts, when you confirm, and when the act is recorded. It is kept with the notarization record for "
  + "[retention period to be decided] and is shown on the notarization certificate. Contact [privacy contact] about your data.";
export const LOCATION_CONSENT_CHECKBOX = "I understand and agree.";

export interface WordingQuestion { readonly id: string; readonly question: string; readonly note: string }

/** The points the reviewer is asked to settle. */
export const WORDING_REVIEW_QUESTIONS: readonly WordingQuestion[] = [
  { id: "accuracy", question: "Is the certificate sentence accurate and appropriate to print on a notarization certificate?", note: "It states an approximate location from the network address and says so." },
  { id: "outside", question: "What should happen when a person is outside the Philippines, or the location cannot be found?", note: "The draft issues the certificate with the second sentence and informs the notary. Blocking the act is the alternative." },
  { id: "consent", question: "Is the consent text enough, and should it be a tick box before the room opens?", note: "It names what is recorded, when, why and for how long, in plain words." },
  { id: "retention", question: "How long may IP addresses and locations be kept?", note: "The draft keeps them with the notarial record, then deletes or anonymizes them. The number of years is still to be decided." },
  { id: "contact", question: "Who is the privacy contact named in the consent?", note: "Left as a placeholder until a name and email are given." },
];

// The canonical LAGDA eNotary disclaimer.
//
// WHY THIS MODULE EXISTS. This sentence is a legal position, not copy. LAGDA
// eNotary is not accredited, so every surface that mentions it must say so in
// the same words. A scan found the sentence stated in 36 places of which only
// 2 imported a shared constant: 19 were hard-coded literals and 15 were variant
// wordings. All 36 were substantively correct, so nothing was wrong today — but
// nothing connected them either. If the accreditation position ever changes,
// whoever updates it has 36 independent edits to find, and the ones they miss
// keep asserting the old position on a regulated activity.
//
// It lives in `config/` rather than beside the eNotary page content because
// config, shell, onboarding and public pages all need it. Importing a page's
// content module from the app shell would drag page copy into the entry chunk.
// This module has no imports so it costs a string wherever it is used.

/**
 * The exact sentence required wherever LAGDA eNotary is presented to a user.
 *
 * Use verbatim. If a surface needs to add something, append a new sentence
 * after it rather than rewording this one.
 *
 * Enforcement is on rendered pages, not on this string: exact-match against
 * source was tried and rejected, because several pages legitimately phrase the
 * statement differently in context. `tests/trust/enotary-disclosure.spec.ts`
 * asserts the substantive rule instead — the status never appears on screen
 * without the accreditation condition beside it.
 */
export const ENOTARY_DISCLAIMER =
  "LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules.";

/**
 * The same statement split for surfaces that emphasise the status visually —
 * typically `<strong>{ENOTARY_STATUS}</strong>{ENOTARY_QUALIFIER}`.
 *
 * Provided so that a page wanting emphasis does not have to retype the sentence
 * and drift from it. Concatenating these two yields `ENOTARY_DISCLAIMER`
 * exactly, which is asserted in the test rather than left to inspection.
 */
export const ENOTARY_STATUS = "LAGDA eNotary is Coming Soon";
export const ENOTARY_QUALIFIER =
  " and Subject to Supreme Court Accreditation and applicable rules.";

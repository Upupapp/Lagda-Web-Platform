# Electronic signature consent

**Status: IMPLEMENTED.** The feature is real. The *text* is not yet.

## What the product has

`ConsentPage.tsx` is a complete screen: a scrollable disclosure, a checkbox that
is never pre-checked, "I Agree and Continue", and "Decline". It is reached
BEFORE the document and it gates the flow —
`RequestAccessPage.handleBegin()` goes access → consent → review, and
`CONSENT_ACCEPT` is what sets `step: "review"`.

That answers §84 from the product rather than from preference: LAGDA gates the
document behind consent, model B.

## Who must consent

The four field-eligible roles: `signer`, `approver`, `reviewer`,
`acknowledgment-recipient`. Not `viewer`, not `carbon-copy`.

This was derived from the six shipped scenarios — `consentRequired: true` for
the first four and `false` for the last two — and then found to be exactly
`canHoldFields`, BACKEND-31's existing predicate. So the code reuses that rather
than declaring a second list that would have to be kept in step. Someone asked
to put something on the document consents to doing it electronically; someone
merely shown the document does not.

## One type

`electronic-records-and-signature`. One screen, one checkbox, one type. §73
warns against collapsing several distinct consents into one boolean; the inverse
warning applies equally, and modelling four types where the product shows one
would be inventing product.

## The text is NOT stored, and that is the point

The disclosure the product renders closes with: *"This disclosure is provided
for demonstration purposes only. No legally binding electronic signature
transaction is created by participating in this demonstration."*

Storing that in a row and calling it evidence would be worse than storing
nothing, **because it would look like a legal record.** §74 warns against
`accepted = true` with no idea what was accepted; §134 says a stable version
reference can beat duplicating text. Both point here.

What is stored: `consent_type`, `consent_version`, `accepted_at`,
`signing_session_id`, `authentication_method`.

The default version is **`v0-demonstration`**, named after what it actually is
so an acceptance of demo copy can never be mistaken for an acceptance of
operative copy. Counsel's first real text becomes `v1`.

## Versioning

The required version is **system policy** (`RECIPIENT_CONSENT_VERSION`), not
per-request: the immutable recipient row has no consent column and adding one is
a BACKEND-32 change. §141 permits either provided the lifecycle point is clear,
and this one is — the version configured when the ceremony is presented.

**The consequence, stated rather than hidden:** rotating the version asks
already-accepted recipients again. Their old acceptance stays on record and
remains an acceptance of the old words; it is not an acceptance of the new ones.
A test asserts exactly this. Freezing per request at send is the alternative,
recorded as an open decision for when legal copy actually rotates.

An acceptance is **append-only**. A new version is a new row (§136); the unique
constraint is on `(workspace, request, recipient, type, version)` and the runtime
role has no UPDATE privilege.

## The endpoint

`POST /signing/ceremony/consent` — recipient session cookie **and** recipient
CSRF token.

**The client sends one value: `consentVersion`.** Not a recipient id, not a
request id, not an `acceptedAt`, not a user id — everything else comes from the
session or the backend clock. The version is checked against what the ceremony
is currently asking for, so a client cannot accept an obsolete disclosure it was
never shown (§140). A test asserts a client-supplied time is ignored: the row
carries the backend Clock.

## Idempotency

No `Idempotency-Key`. The unique constraint makes acceptance converge: a repeat
is a no-op that returns the same state, and two concurrent acceptances produce
exactly one row — asserted in both the use-case suite and integration. §138
asks for the decision to be documented; this is it. A generic idempotency record
would add a second mechanism for a property the schema already has.

## CSRF realm

The submitted header digests under `lagda.recipient-signing-csrf` and is
compared against this session's own digest. A workspace-realm token digests
under a different domain, so it cannot match — the realms are separated by the
derivation, not by a name check.

## What consent is not

Not authentication — that already happened, and BACKEND-34 records how.
Not a signature — nothing has been signed, and a test asserts the request state
and the absence of any seal.

It unlocks the document and the fields. It puts nothing on the page.

## BACKEND-36 must revalidate

Consent recorded here is not permission cached for later. **BACKEND-36 must
re-check, transactionally, that an acceptance of the currently required version
exists before accepting any signature** (§86). A recipient could consent, leave
the tab open across a version rotation, and submit — and the value on the page
would be governed by a disclosure they never saw.

## Declining

`ConsentPage` has a Decline button that sets `step: "declined"`. BACKEND-35
implements no decline: §0 excludes it by name and BACKEND-37 owns it. Refusing
the disclosure currently blocks signing and nothing more, which §83 permits
explicitly — it must not be silently treated as declining the document.

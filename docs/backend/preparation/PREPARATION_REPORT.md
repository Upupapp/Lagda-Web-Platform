# BACKEND-30 — Document preparation report

## Product inventory

| Feature | Status |
|---|---|
| **PREPARATION** | **IMPLEMENTED** |
| **ADD / MOVE / RESIZE / DELETE FIELD** | **IMPLEMENTED** — via whole-layout save |
| **REQUIRED FLAG** | **IMPLEMENTED** |
| **FIELD LABEL, Z-ORDER** | **IMPLEMENTED** |
| **SIGNATURE / INITIALS / DATE SIGNED / TEXT / CHECKBOX** | **IMPLEMENTED** |
| **FULL-NAME / EMAIL / TITLE / COMPANY** | **IMPLEMENTED** — render as text |
| **MULTILINE-TEXT / ACKNOWLEDGMENT** | **DEFERRED** — no renderer |
| **RADIO / DROPDOWN** | **DEFERRED / NOT_IN_PRODUCT** |
| **PREFILL (sender-text)** | **DEFERRED** — different authority semantics (§39) |
| **RECIPIENT ASSIGNMENT** | **FOUNDATION_ONLY** — an opaque slot; BACKEND-31 owns it |
| **READY / LOCK** | **FOUNDATION_ONLY** — `locked_at` exists, nothing sets it |
| **PREPARED ARTIFACT** | **NOT_IN_PRODUCT** — metadata only |

→ [PREPARATION_PRODUCT_INVENTORY.md](./PREPARATION_PRODUCT_INVENTORY.md)

## What the pre-read settled without a decision

**The coordinate model needed none.** BACKEND-09 fixed and documented it:
normalized 0–1, top-left origin, `y` to the field's top edge, 1-based pages, out
of bounds rejected rather than clipped, conversion in `toPdfRect` alone. §54,
§59, §60 and §61 were all answered by existing architecture, and the job was to
not invent a second model.

A consequence that keeps paying: **normalized coordinates mean bounds validation
needs no page dimensions**, so `x + width <= 1` is a database CHECK as well as a
domain rule.

## The three findings

**1. The editor offers 13 field types; the sealer renders 5.** A field a sender
can place but the signed document can never show is a promise the system cannot
keep. Nine are implemented — the five renderable directly plus the four
text-shaped identity fields — with `renderTypeFor` as the single mapping and a
guard asserting every preparation type maps onto a `SealableFieldType`.

**2. Every `FieldDefinition` carries `demonstrationOnly: true`**, and
`prepare.ts` opens with *"The preparation flow is FRONTEND-ONLY."* The same
signal as contacts' `merge-demonstration`. It did not stop the command — the
geometry and the five renderable types are unambiguous — but it is why the
marginal four types are DEFERRED rather than adopted because they appear in a
union.

**3. Rotation was never inspected, and it silently misplaces every field.**
`page.getSize()` returns the unrotated mediabox while a viewer renders the
rotated page. Nothing in LAGDA knew a page could be rotated. This predates
BACKEND-30 — the sealer has always had it — and §63 forbids ignoring it.

The inspector now records a rotated page count, it is persisted on the artifact,
and **preparation refuses a rotated document** rather than misplacing fields on
it. Unknown rotation is refused too: assuming unrotated would silently accept
the case the check exists to catch.

## Verification

| Gate | Result |
|---|---|
| typecheck · lint · build · `npm run check` | **PASS** |
| unit | **PASS** — 1388 |
| integration | **PASS** — 476, 49 skipped (S3) |
| migration up + down | **PASS** |
| migration from zero | **PASS** — fresh database, both compound FKs verified via `pg_constraint` |
| frontend checks | **NOT APPLICABLE** — no frontend contract changed |

152 new tests: 38 core, 35 use-case, 16 route, 39 architecture, 24 integration.

→ [PREPARATION_TEST_MATRIX.md](./PREPARATION_TEST_MATRIX.md)

## Three things the tests caught

**A real bug in my own design.** Lazy creation inserts at revision 1, but a
client that opened an unprepared document correctly sends `expectedRevision: 0`
— so **every first save 409'd**. The use-case suite caught it immediately. The
fix distinguishes "this call created the row" (translate) from "it already
existed" (the client's value stands, and a racing first save *should* conflict).

**A fake that cannot model a real race.** The concurrent-create test failed
because the in-memory fake rolls back by restoring a whole-store snapshot, so a
losing transaction discards the winner's committed writes too. That is a fake
artifact, not a defect — the test moved to integration where the rollback is
real, and the unit suite keeps the weaker claim it can honestly make.

**A guard matching the SQL it was reading.** The "stores no submitted value"
assertion matched the `values` keyword. Tightened to a column-position regex,
with the reason at the assertion — the third time this project has hit
detector-versus-intent and the second time the fix improved the code being
checked.

## Honest gaps

**A rotated document cannot be prepared at all.** A contract scanned sideways is
refused with a clear message. Correct, and a real limitation — **OD-124**, and
the highest-priority thing this command leaves. Lifting it means teaching the
renderer about rotation, not relaxing the check.

**`locked_at` has no writer.** Deliberate: the freeze belongs to
signing-request creation, and inventing the transition would mean inventing the
state that triggers it. The column exists so every mutation conditions on it
from the start, and the refusal is tested by setting it directly.

**Non-multiple-of-90 rotation is rejected but not tested** — it needs a crafted
PDF fixture the inspection suite does not have. Stated rather than claimed.

**Recipient assignment is an opaque slot with no foreign key.** Nothing
validates it against anything, because there is nothing to validate against.
BACKEND-31 must migrate it — [PREPARATION_RECIPIENT_HANDOFF.md](./PREPARATION_RECIPIENT_HANDOFF.md).

**No frontend coordinate fixtures.** The backend cannot detect a bad
viewport→normalized conversion: `0.5` looks identical whether computed correctly
or by luck. **OD-126**, for whoever wires the editor to these routes.

**Whole-layout replace rewrites every row on every autosave.** Bounded at 500
and acceptable; not a targeted update.

**Pre-auth and removed-member denial are by composition**, the same label the
last three commands used.

**OD-069 unchanged.** Seventeen auth routes remain uncomposed, so a browser
still cannot sign in to reach any of this.

## BACKEND-31 handoff

The repository is ready. The seam is one nullable, unconstrained
`participant_slot` column that dereferences nothing.

What BACKEND-31 must respect, in full:
[PREPARATION_RECIPIENT_HANDOFF.md](./PREPARATION_RECIPIENT_HANDOFF.md).

The short version: a recipient is its own identity, snapshots contact data
rather than dereferencing it, uses a **compound** foreign key, and must not be
assumed to belong to the preparation rather than the signing request — that
depends on whether one document can be sent twice, which is BACKEND-32's answer.

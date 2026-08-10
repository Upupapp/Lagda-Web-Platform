# Recipient handoff — what BACKEND-31 must do

BACKEND-30 places fields. It does **not** know who signs them, and the seam it
left is deliberately thin.

## What exists today

```ts
participantSlot: string | null
```

One nullable, bounded, opaque column on `preparation_fields`. **No foreign key**,
because there is nothing to point at.

It mirrors the product's `FieldDefinition.participantId`, which the editor fills
with a local label — `"P1"`, `"P2"` — from `ParticipantEditorIdentity`. `null`
means unassigned, which the editor permits while a layout is being built (§114).

## What it is NOT

Say this plainly, because the column's shape invites all four mistakes:

| Not a | Why |
|---|---|
| `RecipientId` | No recipient table exists. BACKEND-31 creates it |
| `ContactId` | A contact is address-book data (§51). It is source material for a recipient, never a signing identity |
| `UserId` | A signer usually has no LAGDA account |
| `WorkspaceMemberId` | The member preparing the document is the **author**, not automatically a signer (§272) |

It is also **not an email address** (§50). An email is mutable display PII and
future snapshot data; using one as a durable relationship means a corrected
typo silently reassigns a field.

Nothing dereferences the slot. Nothing joins on it. The application validates
its length and stores it.

## What BACKEND-31 must deliver

### 1. `SigningRecipient` as its own identity

Separate from Contact, User, WorkspaceMembership and Invitation. Opaque, stable,
server-generated `RecipientId`.

### 2. Snapshot, do not dereference

A recipient carries the name and email **copied at creation**, not a
`ContactId` it resolves later.

Editing or archiving a contact must leave every existing recipient untouched —
the rule
[CONTACT_RECIPIENT_BOUNDARY.md](../contacts/CONTACT_RECIPIENT_BOUNDARY.md)
already states, now with a second consumer.

### 3. Migrate `participant_slot`

The column must become a real reference. The shape that fits this schema:

```sql
alter table preparation_fields
  add column assigned_recipient_id varchar(64),
  add constraint preparation_fields_recipient_fk
    foreign key (workspace_id, assigned_recipient_id)
    references signing_recipients (workspace_id, recipient_id) on delete restrict;
```

**Compound**, like every other reference added since migration 016 — a
single-column FK would let a field in one workspace name another's recipient.

Whether `participant_slot` is dropped or kept as authoring provenance is
BACKEND-31's call, but **both must not remain as live assignment authority**.
Two columns answering "who signs this field" is the drift this project has
avoided everywhere else.

### 4. Scope it correctly

Workspace-scoped at minimum. Whether a recipient belongs to a **preparation** or
to a **signing request** is the real question, and BACKEND-32's answer to
"can one document be sent twice" decides it:

- if a document may be sent more than once (nothing in the product says
  otherwise — §104), recipients almost certainly belong to the **signing
  request**, and preparation fields reference a *role* the request fills;
- if a document is sent once, recipients may sit on the preparation.

**Do not decide this by looking at BACKEND-30.** The slot is deliberately
agnostic.

### 5. Only the roles the product has

`PrepParticipantRole` is `signer | approver | reviewer | acknowledgment-recipient
| viewer | carbon-copy`. Six values, and `FIELD_ELIGIBLE_ROLES` already maps
which field types each may be assigned — read it rather than inventing a role
model.

Note `sender-text` maps to `[]`, no participant. That type is deferred here, and
its emptiness is a hint about the authority distinction §39 warns of.

### 6. Signing order only if it exists

The prepare flow has a `routing` step, which suggests order is real. Confirm it
in the product before modelling it, and do not invent parallel-versus-sequential
semantics the UI does not offer.

### 7. Email is unverified until possession is proved

A recipient's email is a **delivery address**, not an authenticated identity,
until a signing-access mechanism proves someone holds it. Same distinction
BACKEND-26 drew for invitations.

### 8. Freeze at the right boundary

Recipient mutability must stop where preparation's does: at signing-request
creation, by **snapshot** — see
[PREPARATION_EDITABILITY.md](./PREPARATION_EDITABILITY.md).

### 9. Centralized capabilities

No raw role checks. If recipient management needs its own capability, add it to
the BACKEND-27 policy alongside the operation, and read the product's
`ROLE_PERMISSIONS` first — it has been non-obvious four commands running.

## Validation BACKEND-31 unlocks

Today a field may reference any well-formed slot, because there is nothing to
check it against. Once recipients exist:

- a field's assignee must be a recipient **of this preparation or request**
  (§113) — an arbitrary id must be refused;
- whether a layout may be **saved** with unassigned fields is separate from
  whether it may be **sent** with them. Saving must stay permissive (§114):
  the editor needs to hold partial work.

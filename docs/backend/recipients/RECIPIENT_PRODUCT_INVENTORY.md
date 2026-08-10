# Recipient product inventory — BACKEND-31

Read before changing anything in `docs/backend/recipients/`.

## Sources read

| File | What it gave |
|---|---|
| `src/app/models/prepare.ts` | **`PrepParticipant`**, `PrepParticipantRole` (6), `PrepRoutingConfig`, `PrepRoutingGroup`, `RoutingMode` (4), `PrepAuthMethodId` (6), `PrepAuthAvailability` |
| `src/app/models/field-editor.ts` | `FIELD_ELIGIBLE_ROLES`, `ParticipantEditorIdentity`, `FieldDefinition.participantId` |
| `src/app/pages/platform/prepare/` | `ParticipantsStep`, `RoutingStep`, `AuthStep`, `FieldsPage`, `ReviewStep` — the routing and auth steps are real pages |
| BACKEND-28 contacts docs | The snapshot rule this command implements the other half of |
| BACKEND-30 preparation docs | `participantSlot`, the seam to migrate |

## What the product actually has

```ts
export interface PrepParticipant {
  id:                  PrepPaxId;
  name:                string;
  email:               string;
  role:                PrepParticipantRole;   // six values
  organization:        string;
  isRequired:          boolean;
  routingGroupId:      PrepGroupId | null;
  authMethodOverride:  PrepAuthMethodId | null;
}
```

Six roles, each with a distinct written meaning — not a copied vocabulary:

| Role | The product's own description |
|---|---|
| `signer` | *"Must complete all required signature fields. Blocks completion until done."* |
| `approver` | *"Must approve or reject before later participants may proceed."* |
| `reviewer` | *"Reviews the document before later signing or approval steps proceed."* |
| `acknowledgment-recipient` | *"Must acknowledge receipt or understanding where configured."* |
| `viewer` | *"May view the document. Does not block completion."* |
| `carbon-copy` | *"Receives a copy of the completed document. Does not block completion."* |

And `FIELD_ELIGIBLE_ROLES` already answers §69 for us: `viewer` and
`carbon-copy` appear in **no** field type's eligible list. The two roles that
"do not block completion" get no fields, which is coherent and is the product's
decision rather than mine.

## Classification

| Feature | Classification | Why |
|---|---|---|
| **MANUAL RECIPIENT** | **IMPLEMENT_NOW** | `EMPTY_PARTICIPANT` is the create form's starting state |
| **CONTACT-DERIVED RECIPIENT** | **IMPLEMENT_NOW** | The address book exists (BACKEND-28) and `CONTACT_RECIPIENT_BOUNDARY.md` specifies the snapshot |
| **SIGNER** | **IMPLEMENT_NOW** | The default role |
| **APPROVER / REVIEWER / ACKNOWLEDGMENT-RECIPIENT** | **IMPLEMENT_NOW as a type** | All three are fully described and appear in `FIELD_ELIGIBLE_ROLES`. Their *behaviour* — approve/reject, blocking later steps — is ceremony state and belongs to BACKEND-37 |
| **VIEWER / CARBON COPY** | **IMPLEMENT_NOW as a type** | Fully described, and explicitly field-ineligible |
| **WITNESS** | **NOT_IN_PRODUCT** | Not among the six. §31 warns against adding it on legal-plausibility grounds alone |
| **IN_PERSON SIGNER** | **NOT_IN_PRODUCT** | Nowhere in the model |
| **NAME / EMAIL** | **IMPLEMENT_NOW** | On `PrepParticipant` |
| **COMPANY** | **IMPLEMENT_NOW** | `organization` is on `PrepParticipant` and shown in the participants step |
| **PHONE** | **NOT_IN_PRODUCT** | Absent from `PrepParticipant`. §24 — do not add it for a future SMS OTP |
| **REQUIRED FLAG** | **IMPLEMENT_NOW** | `isRequired`, and distinct from field-level `required` |
| **RECIPIENT ORDER** | **IMPLEMENT_NOW** | Deterministic display order |
| **SEQUENTIAL ROUTING** | **FOUNDATION_ONLY** | Real in the product, and see below |
| **PARALLEL ROUTING** | **IMPLEMENT_NOW** | The absence of a routing step is parallel |
| **MIXED / APPROVAL-BASED ROUTING** | **DEFER** | Needs groups, completion rules and ceremony semantics |
| **FIELD ASSIGNMENT** | **IMPLEMENT_NOW** | Migrating BACKEND-30's `participantSlot` |
| **RECIPIENT EDIT / DELETE / REORDER** | **IMPLEMENT_NOW** | `ParticipantsStep` has all three |
| **DUPLICATE RECIPIENT** | **REQUIRES_REVIEW → decided below** | Nothing in the product states a rule |
| **PER-RECIPIENT AUTH METHOD** | **DEFER** | `authMethodOverride` exists; §164–168 defer it to BACKEND-34 |

## The three decisions

### 1. Six recipient types, but only their identity — never their behaviour

The temptation is to trim to `signer` and `cc` (§27). That would be wrong here:
the product has written descriptions, per-role field eligibility, and a routing
step that distinguishes approvers from signers. Reducing it would mean the
frontend has a role the backend cannot store.

What is **not** implemented is what those roles *do*. "Must approve or reject
before later participants may proceed" is ceremony state — an approval action,
a block, a transition — and BACKEND-37 owns it. BACKEND-31 stores the type and
enforces exactly one rule from it: **`viewer` and `carbon-copy` may not be
assigned fields**, because `FIELD_ELIGIBLE_ROLES` says so.

`RecipientType` is a **separate vocabulary from `WorkspaceRole`** (§32) and
shares no values by accident: `reviewer` exists in both and means entirely
different things — a workspace reviewer reads documents in the library, a
signing reviewer reviews one transaction.

### 2. Routing: store the step, defer the machinery

`RoutingStep.tsx` exists, `DEFAULT_ROUTING_CONFIG.mode` is `"sequential"`, and
`PrepRoutingGroup` has `stepNumber`, `label`, `participantIds` and
`requiredCompletionRule`. This is not speculative — but most of it is not a
property of a *recipient*.

So: each recipient carries a `routingOrder` integer — the step it acts in — and
**the mode, the groups, the labels and the completion rules are deferred**.
Reasons:

- `mode` and `requiredCompletionRule` describe the **transaction**, not the
  participant, and the transaction does not exist until BACKEND-32;
- groups need their own table and a name;
- §156 is explicit: *"BACKEND-31 only stores intended order."*

Equal `routingOrder` values mean **parallel within a step** — documented, since
§38 requires the meaning of equal values to be stated rather than assumed.

### 3. Duplicate policy: one active recipient per email per preparation

Nothing in the product states a rule, so this is a decision and it is recorded
as one.

**Chosen: `UNIQUE (workspace_id, preparation_id, normalized_email)`.**

The reasoning is the *opposite* of contacts' (§45 warns not to inherit it).
There, `legal@example.com` is legitimately several address-book entries. Here,
two recipients on one document sharing a mailbox means two invitations to the
same inbox, two signing links, and no way for the person receiving both to know
which is which — a real signing hazard rather than an untidy list.

The shared-mailbox case (§43) is the cost, and it is accepted: if a firm needs
two people at `legal@` to sign one document, they need two addresses, which is
also what any audit of that signature would want.

Preparation-local, never workspace-wide (§44): the same person signs many
documents.

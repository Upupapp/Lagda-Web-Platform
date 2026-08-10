# Signing request — product inventory

What the LAGDA product actually contains, read from `src/` in the frontend repo
and from `docs/backend-integration-handoff.md`. Not what a signing product
usually has.

## The headline finding

**There is no send action anywhere in the frontend.** No button, route, service
method or type named `send`, `sendForSignature`, `createSigningRequest` or any
variant exists in `src/`.

The prepare wizard's seven steps — upload, participants, routing,
authentication, settings, review, fields (`src/app/models/prepare.ts:45-62`) —
terminate at `/app/prepare/confirmation`, whose primary button is:

```tsx
// ConfirmationPage.tsx:250-271
<button onClick={() => {
  // No signing request is created. This marks the end of the demonstration.
  navigate("/app/documents");
}}>Complete Preparation Workflow</button>
```

It calls no service and mutates no state. The page says so in prose at lines
116-120: *"No signing request has been created. No document has been sent to any
participant."*

`docs/frontend-known-limitations.md:37` claims the "Send action in the Prepare
workflow simulates request creation". **That statement is inaccurate against the
code** — there is no Send action to simulate. Worth correcting in that document.

So the authority for *what a signing request is* is not the send UI, because
there isn't one. It is:

1. `docs/backend-integration-handoff.md:112-118`, which specifies the endpoint,
   the idempotency requirement and three validation rules;
2. the recipient-side shape `RecipientRequest`
   (`src/app/models/recipient.ts:196-211`), which is the closest thing to a
   `SigningRequest` type the product has, and which tells us what a request must
   be able to display;
3. what BACKEND-30 and BACKEND-31 actually persist, which is narrower than the
   frontend's in-memory `PreparationDraft`.

## Classification

| Concern | Classification | Evidence |
|---|---|---|
| **CREATE REQUEST** | **IMPLEMENT_NOW** | Specified in the integration handoff §10 with an idempotency requirement and three validation rules. No frontend caller yet |
| **REQUEST DRAFT** | **FOUNDATION_ONLY** | The product's "draft" is the *preparation* draft (`PreparationDraftStatus`, 17 values, none of them `sent`). A created-but-unsent request is a new concept this command introduces; it has exactly one state |
| **REQUEST TITLE** | **NOT_IN_PRODUCT** as a separate field | The prepare wizard's `details.title` (`prepare.ts:109-114`) is the *document/transaction* title, edited in step 1 and shown as the document's name. `DocumentListItem` (`documents.ts:132-167`) IS the transaction: one row carries title, status, participants and `sentAt`. There is no second request-level title anywhere |
| **DOCUMENT TITLE SNAPSHOT** | **IMPLEMENT_NOW** | `RecipientRequest.transactionTitle` (`recipient.ts:196-211`) is displayed to the signer. Document title is mutable (BACKEND-29 `renameDocument`), so a request that displayed the *current* title would retroactively rename a signed transaction |
| **MESSAGE** | **DEFER → BACKEND-33** | `settings.invitation.message` exists (`SettingsStep.tsx:227-253`, max 2000 chars) but it is **preparation** state, and BACKEND-30 persists no invitation settings at all. There is nothing to snapshot. It is email copy, which belongs with the send that uses it |
| **SUBJECT** | **DEFER → BACKEND-33** | `settings.invitation.subject`, same reasoning. Default `"Please review and complete: {title}"` (`prepare.ts:359`) |
| **RECIPIENT SNAPSHOT** | **IMPLEMENT_NOW** | BACKEND-31 persists name, email, organization, type, `order_index`, `routing_order` |
| **FIELD SNAPSHOT** | **IMPLEMENT_NOW** | BACKEND-30 persists type, 1-based page, normalized geometry, required, label, layer; BACKEND-31 added the assignment |
| **ROUTING SNAPSHOT** | **IMPLEMENT_NOW**, narrowly | BACKEND-31 persists `routing_order` per recipient, where equal values mean parallel. The frontend's richer `PrepRoutingConfig` (mode + named groups + `requiredCompletionRule`) is **not persisted by any backend command**, so there is no mode to snapshot. Snapshot the per-recipient integer and nothing more |
| **SOURCE ARTIFACT SNAPSHOT** | **IMPLEMENT_NOW** | BACKEND-30's `document_preparations.source_artifact_id` |
| **PREPARATION REVISION SNAPSHOT** | **IMPLEMENT_NOW** | BACKEND-30 has a real `revision` integer |
| **REQUEST EDIT AFTER CREATE** | **NOT_IN_PRODUCT** | Nothing creates a request, so nothing edits one. What IS editable is the preparation draft (re-enterable stepper, per-section Edit links). §30's preferred rule therefore costs nothing: keep editing in preparation |
| **REQUEST DELETE BEFORE SEND** | **NOT_IN_PRODUCT** | `discardDraft` deletes a *preparation* draft (`prepare.service.ts:381-384`). There is no unsent-request list and no delete affordance for one |
| **REQUEST CANCEL BEFORE SEND** | **NOT_IN_PRODUCT** | `cancelTransaction` exists but is gated on `isActive` — a post-send action on fixture data (`transaction-detail.service.ts:59`) |
| **EXPIRATION CONFIG** | **DEFER → BACKEND-46** | `settings.expiration.{enabled, expiresAt}` exists in the wizard (`SettingsStep.tsx:319-356`) and defaults to `enabled: false`. Not persisted by any backend command. The master sequence places expiry in BACKEND-46 |
| **REMINDER CONFIG** | **DEFER → BACKEND-46** | `settings.reminders.*` exists; `maxReminders` is in the type with no UI control at all. Not persisted |
| **SEND** | **DEFER → BACKEND-33** | Does not exist in the frontend. Specified only in the handoff |
| **SIGNER AUTHENTICATION POLICY** | **DEFER → BACKEND-34** | `settings.auth` / `PrepAuthConfig` exists in the wizard and is persisted by no backend command |
| **REQUEST LIST** | **NOT_IN_PRODUCT** | No route, no component, no `signingRequests` field anywhere in `src/`. Document sub-routes are activity, participants, evidence, workflow, settings |
| **REQUEST REVIEW (read one)** | **IMPLEMENT_NOW**, minimal | The creator needs to be able to read back what was snapshotted, and BACKEND-33 needs a projection to send from. One `GET` by id |

## One request per document, or several?

**No unique constraint.** The evidence for 1:1 is weaker than it first looks.

What argues for one: `DocumentListItem` carries a single `TransactionStatus`, so
the document list can only display one transaction per document; and
`signing-workflow.service.ts:464` refuses a second workflow per document with
`CONFLICT`.

Why that is not sufficient: the second is about `SigningWorkflow`, a **different
aggregate** with its own six-step builder and its own status enum. The first is
a fixture display shape, not a rule.

The decision is asymmetric. If the schema forbids a second request and the
product wants one, a legitimate action is blocked and a migration is needed. If
the schema permits it and the product wants only one, an application guard is
one condition — and there is no data yet to conflict with it. So: permit, and
record it.

## What the product's validation rules actually are

From the handoff, verbatim:

> Validates: all participants have email, routing is valid, at least one signing
> field per signer

Three rules, and they are the readiness gate this command enforces. Note what is
*not* there: no "every field must be assigned" in those words — but a field
assigned to nobody cannot be completed by anybody, and BACKEND-31 already made
`recipientId` nullable only for authoring. Readiness requires it (OD-127).

## No prepared artifact

The frontend has no PDF library, never retains browser `File` objects
(`UploadStep.tsx:3-4`), and a grep for `artifact|prepared.?pdf|flatten|sealed`
across `src/` returns one hit — a CSS comment.

BACKEND-30 likewise produces no bytes: preparation is metadata-only. So the
request's source is the **ORIGINAL** artifact plus the field snapshot. There is
no PREPARED artifact to choose instead.

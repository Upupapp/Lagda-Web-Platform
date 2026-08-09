# Contract Extraction Report — BACKEND-02

**Status:** Partial extraction. Frontend migration **BLOCKED** — see §8.
**Scope:** LAGDA eSignature. eNotary excluded (INV-009).

---

## 1. What was inspected

`src/app/models/` — **27 files, 11,280 lines, 1,196 exported symbols, 0 orphans**
(every file has at least one importer). Plus `backend-integration-handoff.md`
(44 sections), `backend-implementation-priority.md`, and the four BACKEND-00/01
architecture documents.

---

## 2. Model inventory and classification

Classification is by evidence — exported symbols, importers, and UI-state
signals — not by filename, as §2 requires.

| File | LOC | Exp | Imp | Class | Reason |
|---|---:|---:|---:|---|---|
| signing-workflow.ts | 1253 | 126 | 16 | MIXED | Stage routing and participant actions are domain; board/preview state is UI |
| bulk-send.ts | 1116 | 123 | 13 | MIXED | Batch/row status is domain; column mapping wizard state is UI |
| collaboration.ts | 765 | 98 | 9 | MIXED | Thread/comment/mention are domain; anchor rendering is UI |
| workflow-automation.ts | 696 | 59 | 11 | MIXED | Enterprise-preview, not launch scope; defer with the capability |
| document-organization.ts | 535 | 76 | 8 | MIXED | Folders/tags are domain; `sortDir`, selection mode are UI |
| workflow.ts | 535 | 55 | 5 | MIXED | Templates/runs are domain; builder state is UI |
| field-editor.ts | 496 | 45 | 11 | MIXED | **Coordinates are a contract**; editor interaction is UI. See §6 |
| prepare.ts | 495 | 47 | 21 | MIXED | Draft/participant/auth-method are domain; step state is UI |
| index.ts | 455 | 42 | 15 | MIXED | Permissions, roles, transaction/participant status are domain; feature flags are UI |
| workspace-admin.ts | 448 | 39 | 13 | MIXED | Members/roles/teams/invitations are domain; admin table state is UI |
| transaction-detail.ts | 437 | 40 | 4 | MIXED | Activity/evidence are domain; tab state is UI. **Conflicts — §4** |
| reports.ts | 433 | 44 | 11 | FRONTEND_ONLY | Report definitions/saved views are presentation; backend owns aggregation |
| contacts.ts | 428 | 44 | 12 | MIXED | Contact/group are domain; import wizard is UI |
| templates.ts | 399 | 44 | 14 | MIXED | Template/role/variable are domain; editor state is UI |
| search.ts | 372 | 42 | 3 | FRONTEND_ONLY | Palette/search projections are a frontend concern over other domains |
| settings.ts | 358 | 52 | 15 | MIXED | Billing/integration status may be domain; preference UI is not |
| forms.ts | 294 | 35 | 6 | FRONTEND_ONLY | Public marketing form state; no backend counterpart specified |
| recipient.ts | 272 | 29 | 20 | MIXED | Recipient/participant status is domain. **Conflicts — §4** |
| **verification.ts** | 253 | 24 | 3 | **SHARED** | **EXTRACTED.** Public API boundary, well specified in handoff §17 |
| auth.ts | 252 | 28 | 11 | MIXED | Session/MFA concepts are domain; onboarding step UI is not |
| documents.ts | 236 | 23 | 7 | MIXED | Document view/tone; **no status union at all** — see §5 |
| errors.ts | 145 | 12 | 7 | REQUIRES_REVIEW | **BACKEND-03 owns the error envelope.** Inventoried, not extracted (§23) |
| product-capability.ts | 143 | 14 | 5 | FRONTEND_ONLY | Launch-profile gating is a frontend release mechanism |
| notifications.ts | 130 | 16 | 6 | MIXED | Category/type may be domain; rendering is not |
| signature-library.ts | 126 | 20 | 6 | MIXED | Entry/status is domain; drawing canvas state is UI |
| inbox.ts | 106 | 8 | 4 | MIXED | Assignment status is domain; filter view is UI |
| dashboard.ts | 102 | 11 | 2 | FRONTEND_ONLY | Card/widget composition |

**Totals:** SHARED 1 · MIXED 19 · FRONTEND_ONLY 6 · REQUIRES_REVIEW 1 ·
DEPRECATED_CANDIDATE 0.

**MIXED dominates at 19 of 27**, which is the finding that most shapes later
commands. Every one needs splitting per §79 — the domain half to
`@lagda/contracts`, the UI half staying frontend-side. Extracting a MIXED file
wholesale would drag frontend architecture into the shared package, which is
exactly what §2 forbids.

---

## 3. What was extracted

Only `verification`, plus the primitives it needs. This is deliberate: §19 says
define contracts that are *sufficiently specified today* and do not guess
missing fields. Verification is the one domain the handoff specifies precisely
(§17), and it is the only unauthenticated public boundary.

| Module | Contents |
|---|---|
| `ids/` | 9 branded IDs — `WorkspaceId`, `UserId`, `WorkspaceMemberId`, `WorkspaceTeamId`, `TransactionId`, `DocumentId`, `TemplateId`, `ContactId`, `VerificationId`, plus schemas |
| `common/` | `TimestampSchema`, `Sha256DigestSchema`, `NonNegativeIntSchema`, `Nullable` |
| `verification/` | `VerificationRecordStatus`, `FileComparisonResult`, `PublicVerificationResponse`, `AuthenticatedVerificationResponse`, `VerificationLookupRequest` |

---

## 4. Conflicts discovered

Resolved against the §127 hierarchy, which ranks the handoff above frontend
behaviour and both above mocks.

### C-1 — `VerificationRecord` carries no hashes *(resolved: handoff wins)*

Handoff §17 defines the record as `verificationId, documentHash,
signedDocumentHash, completedAt, participantCount, issuerWorkspaceId`. The
frontend's `VerificationRecord` has **none of the hashes**, no
`participantCount`, and `workspaceName` (a display string) where the handoff
specifies `issuerWorkspaceId`.

Verification *is* hash comparison, so a model without hashes cannot express it.
The frontend even exposes `fileMatchStatus` for comparing an uploaded file with
nothing specified to compare against. Hashes restored; `issuerName` kept for
display **and** `issuerWorkspaceId` added, authenticated-only.

### C-2 — Public and authenticated fields share one interface *(resolved: split)*

The frontend mixes both in `VerificationRecord`, separated by a
`publiclyVerifiable` boolean, while the handoff specifies two endpoints with
different exposure. A single shape guarded by a boolean has to be checked
correctly at every call site forever. Two types cannot leak into one another,
and `additionalProperties: false` makes the public schema actively reject
`issuerWorkspaceId`, `transactionId` and `originalDocumentHash` — asserted by
test.

### C-3 — `FileMatchStatus` declared twice with different vocabularies

- `transaction-detail.ts`: `not-checked, match-demo, mismatch-demo, unavailable`
- `verification.ts`: 9 values including `comparison-unavailable`, `file-too-large`

Same concept, two languages, and the `-demo` values are demonstration artifacts
that must never reach an API. Replaced by `FileComparisonResult` with 5 values,
keeping the meaningful distinctions and collapsing the "cannot read your file"
cases, whose remedy is identical. Tests assert `match-demo` is rejected.

### C-4 — `AuthMethod` declared twice with different values *(deferred)*

- `index.ts`: `email-otp, sms-otp, knowledge-based, id-verification, none`
- `recipient.ts`: `invitation-access, email-code, sms-code, authenticator, account-signin, enterprise-idp, none`

Only `none` overlaps. These are two different concepts sharing a name — probably
"authentication a sender requires of a recipient" versus "how a recipient
actually authenticated". **Not resolved here**: the handoff does not specify
either, and guessing would set API semantics by accident. Recorded as **OD-009**.

### C-5 — `VerificationId` was not branded

`verification.ts:8` declares `export type VerificationId = string`, while 91
other branded IDs exist. A public verification reference and an internal
transaction reference were interchangeable. Now branded and distinct.

### C-6 — Status near-synonyms across the codebase

From 284 string-literal unions: `completed`(15) vs `complete`(3);
`cancelled`(13) vs `voided`(8) vs `revoked`(1); `declined`(10) vs `rejected`(4)
vs `failed`(1); `active`(18) vs `in-progress`(9). **Not normalized** — §12
forbids normalizing by guessing, and these span domains not yet extracted.
Recorded as **OD-010** for the domains that own them.

### C-7 — `documents.ts` declares no status union

The document domain has `DocumentView` and `StatusTone` but no `DocumentStatus`;
transaction status lives in `index.ts` as `TransactionStatus`. Whether the
product has one lifecycle or two is a domain question for BACKEND-07.

---

## 5. Status matrix (§107)

Only for statuses actually extracted. Everything else awaits its domain.

| Domain | Type | Allowed values | Source | Notes |
|---|---|---|---|---|
| verification | `VerificationRecordStatus` | `verified`, `not-found`, `revoked`, `expired` | Handoff §17 + frontend `TransactionRecordStatus` | `not-found` is a first-class outcome, not an error |
| verification | `FileComparisonResult` | `not-compared`, `match`, `mismatch`, `file-unreadable`, `comparison-unavailable` | Consolidated from two conflicting declarations (C-3) | `-demo` values removed |

Serialized values are kebab-case, matching the dominant convention (737 of 1,182
values). Changing any is an API change (§13).

---

## 6. ID matrix (§108)

| ID | Serialized | Public? | Runtime validation | Notes |
|---|---|---|---|---|
| `WorkspaceId` | string | No | non-empty | **The tenant key.** Makes INV-003 compiler-checkable |
| `UserId` | string | No | non-empty | |
| `WorkspaceMemberId` | string | No | non-empty | |
| `WorkspaceTeamId` | string | No | non-empty | |
| `TransactionId` | string | No | non-empty | Name kept from the frontend (§111) |
| `DocumentId` | string | No | non-empty | |
| `TemplateId` | string | No | non-empty | |
| `ContactId` | string | No | non-empty | |
| `VerificationId` | string | **Yes** | non-empty | Public reference; deliberately not `TransactionId` |

Branded at compile time, plain strings at runtime — `JSON.stringify` behaves
predictably and no transport handling is needed. **Format is not constrained**:
generation strategy is BACKEND-06's, and freezing a prefix convention in a
shared contract would decide it prematurely.

The gap this closes: the frontend types `workspaceId` as `WorkspaceId` in 6
declarations and as plain `string` in 21, and `transactionId`, `documentId` and
`userId` have no branded type at all.

---

## 7. Resolver matrix (§109)

| Resolver | Classification | Note |
|---|---|---|
| `collaboration.resolver.ts` (4 resolvers) | FRONTEND ABSTRACTION | Visibility/actions/mentions/anchors fail closed client-side; the backend must enforce independently, never trust these |
| `signing-workflow.validation.ts` | REQUIRES REVIEW | Validation rules are domain and belong in `core`; BACKEND-07 |
| `signing-workflow.resolver.ts` | REQUIRES REVIEW | Stage/progress resolution is domain; BACKEND-07 |
| `capability-resolver.ts` | FRONTEND ABSTRACTION | Launch-profile gating, a release mechanism |
| `preparation-resolution.ts` | REQUIRES REVIEW | Policy/automation resolution; enterprise-preview |
| 24 `services/mock/*` | TEMPORARY MOCK BOUNDARY | **Preserved.** The frontend needs them to run until endpoints exist (§110) |

No resolver was extracted. None is a serialized contract; each is behaviour over
contracts.

---

## 8. Frontend migration — BLOCKED

**Not performed.** The mechanism to do it safely does not exist.

BACKEND-01 established the backend as a separate repository. §51 therefore
requires a controlled, versioned private package. Every available route is
closed:

| Mechanism | Why not |
|---|---|
| Private registry / GitHub Packages | Requires publishing — an external action, and neither repo has a remote |
| Git dependency | Requires a remote; both repos are local-only |
| `file:` path reference | §51 forbids it as a source of truth, and it would **break frontend CI**, which checks out only the frontend repo |
| Copy the files | §98 and the entire purpose of this command |

§120 forbids pretending cross-repo compatibility CI exists, and §54 forbids
uncontrolled `*`/`latest`. So the honest position is that migration is blocked
on a decision, not on effort.

**Consequence:** the frontend still owns its definitions, and `@lagda/contracts`
is authoritative only for the backend. Contract drift between the two is
currently possible. This is stated plainly rather than claimed solved (§97).

**Recorded as OD-005 (still open, now precise) and OD-011.**

---

## 9. Security review (§102, §131)

Extracted response contracts audited for exposure. No contract contains a
password, hash of a password, session secret, reset token, OTP, signing access
token, storage key, or infrastructure detail.

Specific decisions:

- `signedDocumentHash` **is** public — it is what enables independent
  verification without trusting the response.
- `originalDocumentHash` is **not** public — publishing the pre-signature digest
  would let a caller test guesses about the source document.
- `issuerWorkspaceId` is **not** public; `issuerName` is, because a verifier
  needs to know who issued a document but not an addressable identifier.
- No participant names, emails, IP addresses, or device evidence appear
  anywhere in verification contracts (§65).

---

## 10. Serialization review (§132)

No `Date`, `BigInt`, `Map`, `Set`, `Buffer`, or class instance appears in any
contract. Timestamps are RFC 3339 UTC strings; IDs and digests are strings.
A JSON round-trip is asserted by test.

`undefined` versus `null` is deliberate: `Type.Optional` means "key may be
absent", `Nullable` means "key present, value known-empty". With
`exactOptionalPropertyTypes` these are not interchangeable.

---

## 11. Defects found in this command's own work

- **Test files were being emitted into `dist/`**, and `files: ["dist"]` would
  have shipped them. Fixed by excluding `**/*.test.ts` from every package build.
- That exclusion then put package tests outside every TypeScript project, and
  ESLint reported a **parse error** — meaning every type-aware rule silently
  stopped running on them. Fixed by adding them to `tsconfig.tools.json`.
- **`format: "date-time"` does not validate.** TypeBox's `Value.Check` rejects a
  value whose format is unregistered, while Ajv (Fastify) ignores unknown
  formats — so one schema would behave differently in two places. Replaced with
  an explicit RFC 3339 UTC `pattern`, which needs no registry and no import side
  effect. Found by a test that supplied a valid timestamp and watched it fail.

---

## 12. Handoff to BACKEND-03

BACKEND-03 owns the API error envelope and pagination. Inventoried, not built:

- `models/errors.ts` (145 lines, 7 importers) holds the current frontend error
  vocabulary. Several domains additionally declare their own error unions
  (`BulkSendError`, `CollaborationError`, `OrgErrorCode`), and `full-error` and
  `permission-denied` each appear in 10 different unions.
- **No pagination convention exists to inherit.** Neither page/pageSize nor
  cursor/limit appears consistently in the frontend models, so BACKEND-03
  chooses rather than preserves.
- Unknown-field policy is established for requests: **reject**
  (`additionalProperties: false`). Responses should stay permissive to additive
  fields. BACKEND-03 should apply this consistently.

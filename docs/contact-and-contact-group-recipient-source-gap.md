# Contacts and Contact Groups as a Bulk Send recipient source

Gap Closure Command 1. Closes §17 gap 2 of
`docs/bulk-send-recipient-batches-mapping-validation-and-draft-projections.md`.
Frontend demonstration only.

---

## 1. What the gap was

The Bulk Send source selector offered three sources — Demonstration Dataset,
Structured Paste, Local CSV Preview. Contacts and Contact Groups were **already
declared** in the domain model but never surfaced:

| Already present at C33 | Location |
|---|---|
| `"contact"` and `"contact-group"` in `BulkSendRecipientRowSource` | `models/bulk-send.ts:172-177` |
| Labels for both | `models/bulk-send.ts:179-185` |
| Privacy copy for both | `models/bulk-send.ts:187-193` |
| `contactId` / `contactGroupId` on the recipient row | `models/bulk-send.ts:232-234` |
| `extra.contactIds` on `applyRecipientSource` | `services/mock/bulk-send.service.ts:516` |

So this was a wiring gap, not a modelling gap. The union was **not** extended and
no new source type was invented.

## 2. What was added

| File | Role |
|---|---|
| `services/contact-recipient-source.ts` | **new** — THE eligibility, expansion, de-duplication and payload logic |
| `components/contacts/ContactRecipientPicker.tsx` | **new** — multi-select Contacts + Contact Groups picker with expansion preview |
| `pages/platform/bulk-send/BulkSendBatchPages.tsx` | two source cards, two picker panels, commit-error handling, focus repair |
| `services/mock/bulk-send.service.ts` | group provenance + Contact-status-aware validation |
| `data/mock/contacts.ts` | workspace alignment + one cross-workspace Contact |
| `context/PlatformContext.tsx` | Contacts session cleanup on sign-out and workspace switch |

**No dependency was added.** No second Contacts system, Contact Group model,
recipient-row model, or picker library was created.

## 3. Why a second picker exists

`components/contacts/ContactPicker.tsx` was **reused where it fits and not
replaced**: it is single-select (`onSelect: (result: ContactPickerResult) => void`)
and fills one participant slot in Prepare/Templates. Bulk Send needs many people at
once plus group expansion, which that component cannot express.

`ContactRecipientPicker` therefore lives beside it in the same canonical
`components/contacts/` directory and calls the same `mockContactService`. It holds
no Contacts state of its own.

> `ContactContext` is deliberately **not** used: it is not mounted globally
> (`main.tsx` mounts LagdaLoading/Platform/Onboarding only), so `useContacts()`
> from a Bulk Send page would throw. `ContactPicker.tsx` sets the precedent of
> importing the service directly.

## 4. The canonical row path

Rows are built by exactly one call:

```ts
bulkSendService.applyRecipientSource(
  batchId, payload.headers, payload.cells, sourceKind, ctx,
  { contactIds, contactGroupIds, contactStatuses },
)
```

That funnel also runs `buildSchema`, re-suggests role and variable mappings, calls
`refresh()` (validation + duplicate engine) and writes the activity log. Bypassing
it would mean re-implementing all of that.

**Header strings are load-bearance.** The payload emits literal `"Name"`, `"Email"`,
`"Organization"` because column IDs derive from normalized header text and the
deterministic role-suggestion aliases match on exactly those words. Emitting field
keys such as `displayName` would drop every row into `invalid-mapping`.

## 5. Index alignment — the quiet failure mode

`contactIds` is read **positionally** against `cells`
(`contactId: contactIds[i] ?? null`). Filtering one array without filtering the
others in lockstep misattributes every later row to the wrong person, with no type
error and no visible symptom.

`buildContactSourcePayload` therefore emits `cells`, `contactIds`,
`contactGroupIds` and `contactStatuses` in a **single pass**, and the filter is
applied once, before that pass. Verified by execution: 0 attribution mismatches.

## 6. De-duplication — identity, not address

| Case | Behaviour |
|---|---|
| Same Contact in several selected groups | Merged into one row, provenance kept for every group |
| Contact picked directly *and* present in a group | Merged, marked "Selected directly and via …" |
| **Two different Contact records sharing an email** | **NOT merged** — both project, both flagged `ambiguous-shared-email` |

The last row is deliberate. Merging two distinct Contact records would silently
decide which person the user meant. Both are kept so the canonical duplicate engine
(`repeated-email-in-role`) flags them for review, which is the established policy.

Verified against fixtures: selecting all six groups plus one direct pick produced
11 considered → 6 rows, 5 duplicates merged, 2 flagged as sharing an address.

## 7. Eligibility

One resolver, `resolveContactEligibility`, used by the list, the expansion preview,
the summary and the payload builder, so a Contact cannot be judged eligible in one
place and ineligible in another.

`eligible · missing-email · invalid-email · archived-contact · restricted-contact ·
cross-workspace · duplicate-in-selection · duplicate-across-groups ·
ambiguous-shared-email · excluded-by-user`

Email validity uses `isValidEmailDirection` from `utils/tabular-import.ts` — the
same helper CSV rows are judged by — so contact-sourced and CSV-sourced rows are
treated identically. `normalizeEmailForComparison` is likewise reused.

**Archived and restricted Contacts now actually fail validation.**
`buildValidationContext` is synchronous while the Contacts service is async, so it
could never look a Contact up; it compared against hardcoded `ct_*` fixture IDs
that a canonical `contact-*` ID never matches. The picker now passes the statuses
it already holds through `extra.contactStatuses`, and the service unions them with
the fixture sets.

## 8. Workspace scoping — and one prerequisite change

STEP 14 requires Contacts to be queried only for the current workspace. That was
**not implementable as the fixtures stood**:

| | workspaceId |
|---|---|
| Runtime session (`MOCK_WORKSPACES[0]`) | `ws_mls_001` |
| Contacts fixtures | `ws_northbridge_001` |
| Bulk Send fixtures | `ws_northbridge_001` |

A correct `workspaceId === ctx.workspaceId` filter returns **zero Contacts** — the
picker would be permanently empty. The alternative, shipping no filter, would make
the existing privacy copy (*"Reads permitted Contacts from your Workspace"*) untrue.

**Resolution:** the Contacts fixture workspace was aligned to the session workspace
(`ws_mls_001`), and `CONTACT_OTHER_WORKSPACE` (`ws_southgate_002`) was added so the
filter is provably exercised rather than assumed. Verified: 8 fixtures → 7 visible,
0 cross-workspace leaks.

Filtering happens at the service boundary in `filterVisibleContacts`, applied to
list results **and** to group members, so an out-of-workspace Contact never reaches
a list, a count, an expansion, or a projection.

> **Not fixed here (out of scope):** the Bulk Send *fixture batches* are still
> stamped `ws_northbridge_001`, so `listBatches` filters them out at runtime and
> they are invisible. Reaching this flow requires creating a batch in-session,
> which stamps the session workspace. That is a pre-existing defect, recorded not
> repaired.

## 9. Team scope

The canonical Contacts service exposes **no team scoping** — no method takes a team
argument and `ContactListItem` has no `teamId`. Nothing was invented. Team scope is
therefore not enforced for Contacts, and this is listed as a backend requirement
rather than claimed as implemented.

## 10. Roles are never inferred

Projected rows carry Name, Email and Organization only. Role assignment continues
through the canonical mapping step. Nothing infers a role from a job title, a
Contact Group name, an organization, a workspace role, or team membership — a group
called "External Signers" assigns nobody the Signer role.

## 11. What is copied, and what is not

**Copied:** display name, email, organization.

**Deliberately not copied:** notes, phone, tags, group metadata, owner, usage
history, timestamps, scope, source, `demonstrationOnly`, and every other private
Contact field.

## 12. Permissions

Gated on the existing `permissions.canAddRecipients`
(`edit && hasManageContacts`, from `manage_contacts`). **No new permission was
introduced.** Only the two Contact sources are gated on it — reading Contacts is
what they additionally require; paste, CSV and the demonstration dataset keep their
existing behaviour. The picker also refuses to render its body without it.

## 13. States

Loading (contacts, groups, per-group members, commit) · empty · search-empty ·
**partial error** (one group's members fail while everything else works, with a
per-group Retry) · full error with Retry · permission-restricted · disabled primary
action **with a stated reason**.

## 14. Frontend-only language

> Selected Contacts are projected into this frontend batch draft. No request,
> invitation, email, SMS message, recipient session, or production transaction was
> created or delivered.

No surface says imported, invited, sent, synchronized, notified, or created. The
primary action reads **"Add N Recipients"**, never Send or Invite.

## 15. Defects found and fixed along the way

| Defect | Effect before |
|---|---|
| `commit()` had no `else` branch | A denied or archived batch produced no error, no announcement, and a silently unchanged screen |
| `buildRows` hardcoded `contactGroupId: null` | Group provenance could never be recorded |
| Contact statuses invisible to validation | Archived/restricted Contacts from the real Contacts system validated as clean |
| `mockContactService.clearSessionState()` had no caller | Contact session state survived sign-out and workspace switch — now a live path for Contact data |
| Silent 500-row truncation | Counts disagreed with no message; now disclosed as "N selected, N added" |
| Focus lost after adding | The source selector unmounts on success; focus fell to `<body>` |
| Disabled Add with no reason | Button read "Add 0 Recipients" and explained nothing |

## 16. Verification performed

- **Executable probes** against real fixtures: per-contact eligibility,
  cross-workspace exclusion (0 leaks), group expansion, de-duplication
  (11 → 6, 5 merged, 2 flagged), index alignment (0 mismatches), exclusion, and
  confirmation that group membership is unchanged after excluding someone.
- Full-repo strict type-check: **160 before, 160 after** — zero added.
- `npm run build` passes in the enterprise-preview profile.
- STITCH `flow` scope run — see §15.
- **No automated tests**: the repository still has no test framework, `tsconfig.json`
  or ESLint, and this command was explicitly not to add one.

## 17. Backend requirements

See `docs/backend-integration-handoff.md` §43.

## 18. The other five gaps remain open

Gap 2 is closed. Gaps 1, 3, 4, 5, 6 (and 7–9) are untouched and still recorded in
§17 of the Bulk Send feature document.

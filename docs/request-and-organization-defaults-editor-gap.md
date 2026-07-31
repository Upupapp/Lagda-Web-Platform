# Request and Organization Defaults editor

Gap Closure Command 3. Closes §17 gap 4 of
`docs/bulk-send-recipient-batches-mapping-validation-and-draft-projections.md`.
Frontend demonstration only.

---

## 1. The seven layers, and which actually exist

The repository already models a full inheritance stack. What it does **not** have
is a producer for most of it. This distinction is the whole story of this command.

| Layer | Source id | Store exists? | Produced by any code? |
|---|---|---|---|
| Explicit recipient/row value | *(not a default source)* | yes — `row.values` | yes, Gap Closure Command 2 |
| Request override | `user` | n/a — the resolved value carries it | **no, until this command** |
| Saved configuration | `saved-configuration` | yes — `SavedConfiguration.defaults` | no — never applied to a batch |
| Template | `template` | yes | **yes** — `buildDefaults()` |
| Workflow Policy | `workflow-policy` | no | no — deferred by design |
| Automation Rule | `automation-rule` | no | no — deferred by design |
| Workspace default | `workspace-default` | **no store anywhere** | no |
| Product default | `product-default` | n/a | **yes** — `buildDefaults()` |

`BULK_SEND_DEFAULT_PRECEDENCE` (`models/bulk-send.ts:485`) already declares the
order, and `BulkSendResolvedValue<T>` already carries `{ value, source, conflict,
conflictExplanation }` per field. **No second resolver and no second precedence
model was created.**

## 2. What the gap actually was

`buildDefaults()` produced only `template` and `product-default` values, and no
code path could ever set `source: "user"`. Nine defaults were resolved, displayed
as source pills on the Review screen, and completely uneditable.

## 3. Organization Defaults — why the scope is not editable

The command asks for an Organization Defaults scope "**where the canonical
architecture supports that scope**". It does not.

Canonical `WorkspaceSettings` (`models/workspace-admin.ts:342`) holds:

```
workspaceId · name · slug · billingEmail · defaultMemberRoleId · defaultMemberRoleName
requireMfaForAdmins · allowMemberInvites · sessionTimeoutMinutes
```

**None of those is a request or signing default.** There is no workspace-level
store for routing mode, authentication direction, consent, expiration, sender
message, or any other field this editor covers. `workspace-default` exists as a
source label and a precedence entry that nothing produces.

Building the scope would mean inventing a workspace signing-defaults store —
precisely the "second Organization Settings architecture" the command forbids, and
a violation of pre-flight rule 28 ("only expose fields already supported by
canonical models").

**Decision: the Workspace scope is present in the editor and states plainly that
no workspace-level value exists to inherit from or write to.** It is explicitly
*not* framed as a permission problem, because it is not one — nothing is being
withheld from the user. Recorded as a backend and product requirement instead.

## 4. What was added

| File | Role |
|---|---|
| `services/bulk-send-defaults.ts` | **new** — field metadata, formatting, validation, dependencies, impact, change preview |
| `components/bulk-send/RequestDefaultsEditor.tsx` | **new** — the editor |
| `services/mock/bulk-send.service.ts` | `updateRequestDefaults`, `restoreRequestDefaults` |
| `models/bulk-send.ts` | one additive activity type, `defaults-updated` |
| `pages/platform/bulk-send/BulkSendBatchPages.tsx` | resolved-defaults display + Edit Defaults entry point |

**No dependency added.** No form library, no state library, no data grid.

## 5. The two service methods

Both are minimal extensions of the existing boundary, not a new service:

```ts
updateRequestDefaults(batchId, overrides, ctx): Promise<ServiceResult<BulkSendBatch>>
restoreRequestDefaults(batchId, fields | "all", ctx): Promise<ServiceResult<BulkSendBatch>>
```

An override is simply the canonical resolved value carrying `source: "user"`, the
top of the precedence order. Restoring recomputes the field from `buildDefaults()`
— the same resolver that produced it originally — so inheritance is never
reimplemented. Both call `refresh()`, so validation, duplicates, row statuses and
readiness recompute exactly as for any other write.

Both refuse when the batch is archived; `updateRequestDefaults` also refuses once
Draft Projections exist, because defaults describe how requests *will be* prepared.

## 6. The nine editable fields

`requestTitlePattern` · `senderMessage` · `routingMode` · `authMethod` ·
`consentRequired` · `dueDateDirection` · `expirationDirection` ·
`completionCopyDirection` · `verificationDirection`

Grouped into Request, Recipients, Delivery, Timing, Security. Each carries
centralized metadata: type, options, max length, impact scope, whether it is
direction-only, and its dependents. Nothing is scattered into components.

**Read-only and never editable here:** every provenance and system field — row IDs,
source type, contact/group IDs, batch status, validation output, duplicate keys,
projection IDs, workspace and team scope. No credential, token, secret, or
Evidence configuration is exposed.

## 7. Row overrides always win — proven, not asserted

A default is a fallback. A recipient row the user edited keeps its own value.

Verified by execution: after editing row 1 and then changing `consentRequired`,
the row still read `EDITED`; after **resetting every request override**, it still
read `EDITED`. The editor also shows the count of rows keeping their own values
before you save, rather than after.

## 8. Policy and Automation stay disconnected

The Command 32 engine is **not imported and not called**. `workflow-policy` and
`automation-rule` are reported as *"not evaluated"*, never simulated, and are not
editable from this surface. Verified: the only sources any field resolves to are
`template` and `product-default` (plus `user` once you override).

## 9. Validation and dependencies

One centralized path, `validateDefaultsDraft`, returning stable codes
(`defaults-title-required`, `defaults-unsupported-<field>`,
`defaults-too-long-<field>`, `defaults-due-without-expiration`,
`defaults-no-auth-no-consent`), each with a severity and a corrective action. No
raw regex or enum member ever reaches the user.

Dependencies are surfaced, never auto-applied: a due date without an expiration is
a warning, and intending neither authentication nor consent is a warning. Nothing
silently rewrites another field.

## 10. A bug the probe caught

Template fixture `tpl-policy-acknowledgment` carries an authentication method of
`"email-code"`, which is **not** a member of `PrepAuthMethodId` — one of the 160
pre-existing strict type errors.

A `<select>` whose value matches no `<option>` silently renders the first option.
Opening the editor and pressing Save would therefore have **changed the batch's
authentication direction without the user asking**. The editor now surfaces the
real inherited value as an explicit "not a supported option" entry and explains
that leaving it alone changes nothing.

## 11. Save, Cancel, Reset

**Save** blocks duplicate submission, keeps the editor open and preserves entered
values on failure, and closes only on success. It announces *"Request Defaults
updated in this preparation draft"* — never saved, deployed, applied, or scheduled.
Its disabled state always states a reason.

**Cancel** discards the working copy with confirmation when something meaningful
would be lost, via the existing `useBulkSendConfirm` dialog. **No second
route-blocking system.** Nothing is autosaved.

**Reset all request overrides** requires confirmation and states the count.
**Restore inherited value** is per field and needs no confirmation — it is
immediately visible and reversible.

## 12. Impact preview

Before saving, each change shows previous → next value, previous → next source, the
impact scope (`existing and future rows`, `future rows only`, or `direction only`),
and how many rows keep their own explicit values. Followed by the frontend-only
notice.

## 13. Permissions, state, cleanup

Gated on the existing `permissions.canEditBatch`; **no new permission**. Archived
and already-projected batches are read-only with the reason stated. The editor
closes on workspace change; sign-out and account change replace the batch context
entirely.

## 14. STITCH — `flow` scope

P0 clean: no `localStorage`, no `sessionStorage`, no defaults in URLs or route
metadata, no logging of messages or subjects. No Automation or Policy service is
imported. One defect found and fixed: the Save button was disabled without stating
why.

## 15. Verification performed

Executable probe against the real service confirmed: inherited sources display
correctly; overriding sets `user` on only the fields changed; untouched fields keep
their source; **row values are untouched by a defaults change**; a row with an
explicit edit survives both a defaults change and a full reset; restore returns one
field to `Template`; reset-all returns `user`-sourced count to zero; validation
emits the expected stable codes; and Policy/Automation are never produced.

Full-repo strict type-check **160 before, 160 after**. Both launch profiles build.
No test framework, `tsconfig.json`, or ESLint added.

## 16. Backend requirements

See `docs/backend-integration-handoff.md` §45.

## 17. Remaining gaps

Gap 4 is closed. Still recorded in §17:

1. Testing infrastructure
5. Policy and Automation resolution — modelled, deliberately not wired
6. Notifications, Reports, Search, Command Palette, Dashboard, platform-nav
7. Saved configuration create/rename/apply have no UI entry point

Carried forward from this command:

- **No workspace-level defaults store** (§3) — the Organization scope cannot be
  built without one.
- **Saved configurations hold `defaults` that are never applied to a batch** — the
  `saved-configuration` layer exists in the model and in storage but nothing reads
  it during resolution.

Plus, from earlier commands: email duplicate detection requires a Template, and
Team scope is not enforced for Contacts.

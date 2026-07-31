# Policy and Automation resolution in preparation

Gap Closure Command 4. Closes §17 gap 5 of
`docs/bulk-send-recipient-batches-mapping-validation-and-draft-projections.md`.
Frontend demonstration only.

---

## 1. The capability finding that shaped everything

The command asks for Policy resolution to be available independently *"only when
the actual repository architecture classifies it as a launch capability"*, and says
explicitly: **inspect the real capability registry before deciding.**

Inspected. **There is exactly one capability — `workflow-automation` — and it owns
both Rules and Policies.** No separate Policy capability exists. It is
`enterprise-preview`, so it is unavailable in `launch-default`.

Consequence, stated plainly rather than worked around:

| Profile | Policy resolution | Automation resolution | Engine called? |
|---|---|---|---|
| `launch-default` | not available | not available | **never** |
| `enterprise-preview` | available | available | yes |
| `development` | available | available | yes |

Creating a separate `policy` capability to make Policy available at launch would
have been inventing product scope. It was not done.

**Verified by execution**, not by reading: with the engine instrumented to count
calls, `launch-default` produced **0 engine calls** and status
`capability-disabled`; `enterprise-preview` produced 4 calls and a real result.

## 2. What was reused

Everything. The Command 32 engine is the only evaluator:

| Engine method | Used for |
|---|---|
| `runSimulation(AutoSimTriggerContext)` | Rule matching, projected changes, skip reasons |
| `resolveDefaultsForContext({templateActive})` | Policy-resolved reminder / completion / invitation direction |
| `listPolicies()` | Active Policy definitions |
| `listConflicts()` | Conflict detection |

**No second Rule engine, no second Policy evaluator, no second conflict detector,
and no Rule logic in any component.** No dependency added.

## 3. What was created

| File | Role |
|---|---|
| `services/preparation-resolution.ts` | **new** — thin preparation-facing boundary over the C32 engine |
| `components/bulk-send/PreparationResolutionPanel.tsx` | **new** — review panel, presentation only |
| `pages/platform/bulk-send/BulkSendBatchPages.tsx` | summary, panel, apply path, final-review gate |

## 4. Three defects the probe caught

The integration type-checked, built cleanly, and returned **nothing**. All three
causes were found by running the engine directly, not by reading it.

**1. Wrong trigger kind.** `template_used` was the intuitive choice for batch
preparation. **No Rule in the engine's fixtures uses it** — matched=0, changes=0.
Batch preparation produces Draft transactions, so `transaction_created` is correct;
it matches a real Rule and yields three projected changes.

**2. Policy requirements were always empty.** The code filtered
`simulation.projectedChanges` for `source === "policy"`. The simulation **only ever
emits `source: "rule"`**. Policy values come from `resolveDefaultsForContext()` and
`listPolicies()` instead, which is now where requirements are derived.

**3. Real conflicts were hidden.** Conflicts were filtered to
`simulation.conflictsDetected`, which is empty for most trigger contexts — so two
genuinely open conflicts, one at `error` severity, never surfaced.

A fourth, found while fixing #2: the security Policy stores its value under
`signerMinAuth` (not `minimumAuthMethod`) and uses underscores (`email_otp`) where
`PrepAuthMethodId` uses hyphens (`email-otp`). Comparing them raw would have
reported **every** batch as violating the Policy.

## 5. Policy versus Automation — the split is the engine's own

`AutoSimProjectedChange.source` is already `"policy" | "rule"`. That distinction was
not invented here.

- **Policy → requirement.** Mandatory. Labelled *"Required by Policy"*, and
  *"Required by Policy — blocking"* when blocking.
- **Rule → recommendation.** Optional. Labelled *"Automation recommendation —
  optional"*, unchecked by default, applied only on explicit acceptance.

Both labels are **text**, never colour or icon alone.

## 6. Blocking — deliberately calibrated

Verified lifecycle:

| Batch state | Status | Blocking |
|---|---|---|
| Template default auth | resolved-with-requirements | 0 |
| Authentication set to "none" | resolved-with-requirements | **1 — blocked** |
| Repaired to email-otp | resolved-with-requirements | 0 |

A **blocking Policy requirement blocks the final review** and clears on repair.

Conflicts are treated more carefully. Every unresolved conflict is **surfaced**,
because an open one means resolution cannot be fully relied on. But only a conflict
that **affected this evaluation** blocks. Blocking on an unrelated workspace-level
fixture conflict would have permanently prevented Draft Projections for a reason the
user cannot address from the preparation screen. Non-affecting conflicts are
labelled *"Workspace conflict — did not affect this evaluation"*.

Blocking conflicts cannot be dismissed. Optional recommendations can.

## 7. Input minimization

The engine receives **counts, kinds and flags only** — 18 scalar fields.

Verified by execution: the serialized input contains no recipient name, email
address, or organization from the batch.

Never included: recipient names, emails, organizations, cell values, Contact IDs,
Contact notes, document content, field values, signatures, authentication tokens,
access links, consent evidence, IP addresses, device identifiers. Raw input is never
logged.

## 8. Evaluation triggers and staleness

Evaluation runs on first load of the batch, on explicit **Re-evaluate**, and after
recommendations are applied. **Never on a keystroke.** A `evaluating` flag prevents
duplicate concurrent runs.

`computeInputVersion()` fingerprints the already-minimized input. A result carries
the version it was produced from; when the batch's current version differs, the
result is **stale**: Apply is disabled, the panel says so, and the final review
blocks. Results whose version no longer matches are discarded rather than shown.

Verified: changing one request default changes the fingerprint.

## 9. Applying recommendations

An accepted recommendation is written through the **existing**
`bulkSendService.updateRequestDefaults`, so it becomes an ordinary request override
with `source: "user"` — the user accepted it, so it is recorded as their choice, and
it remains traceable and revertible through the Gap 3 editor. **No new mutation
path.** No recipient row is touched. Applying marks the prior result stale and
forces re-evaluation.

Recommendations targeting fields this frontend cannot change are shown as
**"not applicable"** with the reason, never as fake successes. With the current
fixtures all three matched recommendations target `settings.reminders.*`, which the
batch has no counterpart for — so they honestly report as not applicable. The apply
path is typed and wired but no fixture currently exercises it.

## 10. What the engine can never do here

No Rule output can grant access, bypass a permission, apply a signature, complete a
participant, advance a Workflow stage, create Evidence, send email or SMS, or
schedule a reminder. The boundary returns typed data only; nothing in it is executed.

## 11. Cleanup

Workspace switch clears the result, the open panel, the error, and the
evaluated-version marker. Sign-out and account change replace the batch context
entirely. Nothing is written to `localStorage` or `sessionStorage`.

## 12. STITCH — `flow` scope

P0 clean: no storage, no URLs, no logging, no `eval`, no `dangerouslySetInnerHTML`.
Rule and Policy names are rendered as plain text. Conflict sources are shown as
**counts** (`2 Rule(s)`, `1 Policy(ies)`), never another Team's private definitions.

## 13. Verification performed

Executable probes across both profiles confirmed: engine never called in
`launch-default` (0 calls) and called in `enterprise-preview` (4); input minimization
with no recipient data; fingerprint changes on edit; the blocking-Policy lifecycle;
conflicts surfaced with correct blocking calibration; and recommendations reported
honestly as not applicable.

Full-repo strict type-check **160 before, 160 after**. Both profiles build.
No test framework, `tsconfig.json`, or ESLint added.

## 14. Backend requirements

See `docs/backend-integration-handoff.md` §46.

## 15. Remaining gaps

Gap 5 is closed. Still recorded in §17:

1. Testing infrastructure
6. Notifications, Reports, Search, Command Palette, Dashboard, platform-nav
7. Saved configuration create/rename/apply have no UI entry point

Carried forward from this command:

- **Policy resolution is unavailable at launch**, because it shares the
  `workflow-automation` enterprise-preview capability. If Policy is meant to govern
  launch preparation, it needs its own capability classification — a product
  decision, not a code change.
- **No fixture exercises the apply path.** Every currently matching recommendation
  targets a reminder field the batch does not model.
- **`transaction_created` is an approximation.** The engine has no
  preparation-specific trigger kind; a backend should define one.

Plus, from earlier commands: no workspace-level defaults store, inert
`saved-configuration` layer, email duplicates require a Template, and Team scope is
not enforced for Contacts.

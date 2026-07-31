# Bulk Send preparation as a platform provider

Gap Closure Command 5 — §17 gap 6. Frontend demonstration only.

Bulk Send was fully built and completely invisible. Seven platform surfaces —
Global Search, the Command Palette, the Dashboard, Reports, Notifications, the
Documents workspace, and platform navigation — had no idea it existed. This
command registered it with each of them through that surface's own canonical
registry.

---

## 1. The finding that shaped everything: dormant flags

The capability registry had declared the integration since Command 33:

```
searchVisibility:         true    // no provider registered
commandPaletteVisibility: true    // no commands registered
dashboardVisibility:      false
navigationVisibility:     false
```

Two flags claimed an integration that did not exist. A flag is a declaration of
intent; it is not an implementation. Nothing read `searchVisibility` — the search
service builds its providers from `SCOPE_BUILDERS`, and Bulk Send was not in it.

This is the third time in this series that a "gated everywhere" arrangement
looked from the outside exactly like a feature that had been deleted. It is worth
naming as a pattern: **a capability flag and the code that honours it are two
different things, and only one of them is load-bearing.**

`dashboardVisibility` is now `true`, because an implementation backs it.
`navigationVisibility` stays `false` deliberately — see §7.

---

## 2. Canonical feature name

The command said to use the name already established in the repository and not to
rename it. Checked before writing anything:

- Routes: `/app/bulk-send`, `/app/bulk-send/:batchId/recipients`, …
- Models: `BULK_SEND_BATCH_STATUS_LABELS`, `BulkSendBatch`, `BULK_SEND_*`
- Registry: `id: "bulk-send"`, `label: "Bulk Send"`
- Existing UI labels: "Bulk Send"

**"Bulk Send" is the canonical name** and is used unchanged everywhere, including
in search results, palette commands, the Dashboard section header, and the report
family label ("Bulk Send Preparation").

---

## 3. No central contribution manifest exists

There is no single registry that all seven surfaces read. Each owns its own:

| Surface | Canonical registry | How Bulk Send registers |
| --- | --- | --- |
| Global Search | `SCOPE_BUILDERS` in `global-search.service.ts` | `buildPreparationResults` added to the `documents` scope |
| Command Palette | `ALL_COMMANDS` in the same file | `PREPARATION_COMMANDS` spread in |
| Dashboard | Section components in `PlatformDashboard.tsx` | `PreparationSection`, gated by `resolveCapability` |
| Reports | `ReportFamily` union + `runReport` switch | a sixth family, `preparation` |
| Notifications | `FIXTURES` in `notification-center.service.ts` | `PREPARATION_FIXTURES`, gated separately |
| Documents | `DocumentListItem.bulkSendSource` | `PreparationBadge`, secondary to status |
| Navigation | `PRIMARY_NAV` in `platform.nav.ts` | deliberately absent, with rationale in-file |

Per STEP 2, each contribution registers through the registry that already exists.
No second search, palette, dashboard, reports, notification or navigation system
was created.

---

## 4. The shared safe projection

`src/app/services/preparation-platform-projection.ts` is the one thing all seven
surfaces read.

**Why it exists.** A batch holds recipient names, email addresses, organizations,
pasted text and CSV cell values. None of that may reach a search index, a
dashboard count, a notification body, a report row, or a URL. The projection is
the enforcement point: **if a field is not on it, no surface can leak it.**

What it carries: batch ID, batch name, platform status + label, the underlying
batch status label, Template name, team name, row counts, ready counts, issue
counts, duplicate counts, attention reasons, timestamps, workspace ID (for
filtering, never rendered), and a route built here rather than assembled by a
caller.

What it structurally cannot carry: recipient names, email addresses,
organizations, Contact IDs, Contact Group membership, pasted text, CSV cell
values, source file names, private request messages, authentication or consent
values, Policy internals, Automation expressions, access links, or tokens.

Route builders live here too, so no surface hand-assembles a path and no private
value can be appended to one. Batch IDs are validated against
`/^[A-Za-z0-9_-]{1,64}$/` and URL-encoded; anything else falls back to the list
route.

---

## 5. Three defects the probe caught

None of these were visible to the type checker or to either build.

**(a) The projection read raw fixtures and reported nonsense.** Fixtures ship with
`validation: EMPTY_VALIDATION_SUMMARY` and `roleMappings: []`. Validation is
computed by the service's `refresh()`, which `getBatch` calls on every read but
`listBatches` does not. Reading fixtures directly reported every batch as having
zero issues. Fixed by adding `bulkSendService.snapshotForPlatform(workspaceId,
teamId)` — a synchronous, workspace-and-team-scoped accessor that runs the
canonical `refresh()` — and having the projection consume that. Validation stays
owned by the service; callers get the result, never their own copy of the rules.

**(b) The projection re-derived readiness and disagreed with the feature.** It
inspected `roleMappings` itself and reported "Mapping required" for a batch the
service considered `ready-in-demonstration`. That is a second derivation of
something the service already decides — precisely what these commands forbid.
`toPlatformStatus` is now a pure mapping from the service-computed status.

**(c) A read path mutated the store.** `refresh()` stamps
`updatedAtDemonstration` with the current time. The Dashboard calls the
projection during render, so every paint would have reset every batch's
"last updated" to now, and the report's Last Updated column would always have
read as this instant. `snapshotForPlatform` now refreshes a deep copy and
restores the original timestamp: reading a batch is not editing it.

A fourth issue was found and repaired before probing: the batch fixtures were
stamped `ws_northbridge_001` while the session holds `ws_mls_001`, so every
fixture batch was invisible at runtime — the search provider would have returned
nothing. Three occurrences realigned. The remaining "Northbridge Legal" strings
in that file are recipient *cell values* and were correctly left alone.

---

## 6. Audiences — who is never notified

The single most important constraint in this command.

Preparation notifications go to **the person doing the preparation work**. They
never go to a recipient, a Contact, or a Contact Group member. Being named in a
batch is not a relationship with the platform: a Contact has no account, no
session and no notification inbox, and preparing a batch must never be the thing
that creates one.

Workspace Administrators were also **not** added to the audience. A batch in
progress is not an administrative event, and a blanket admin audience would turn
ordinary preparation work into something watched.

Notification bodies carry batch names, statuses and counts only. Bodies are the
easiest place in a platform to leak data because they travel — read in lists, in
previews, and out of context.

Neither notification implies a send. "Ready for review" is not "sent",
"delivered", or "signed", and the detail body says so explicitly.

Preparation notifications sit in the launch-core `documents` category, so the
existing category-to-capability gate could not reach them. A per-feature gate was
added: without it, a profile lacking Bulk Send would show a notification whose
action leads to a guarded route — and the notification itself would be how the
user learned the feature exists.

---

## 7. Navigation — a decision, not an omission

Bulk Send is **not** in `PRIMARY_NAV`, and `navigationVisibility` stays `false`.

Reasons, recorded in `config/platform.nav.ts` so nobody "fixes" it later:

1. It is an Enterprise Preview capability. A top-level item would rank it
   alongside Documents and Templates, above launch features, in every profile
   that has it.
2. It is entered from context — from Documents, or from a Template being sent to
   many recipients. A standalone entry point invites starting a batch before
   there is a Template to send, the state the feature handles worst.
3. Nothing is unreachable: the Command Palette, Global Search, the Dashboard
   card, the Reports family, and the Documents provenance link all lead there.

**This is not a permission decision.** Hidden navigation is presentation, never
authorization. The routes stay guarded by `CapabilityGuard` and the service's own
permission checks, and a user who can reach them can still reach them by direct
URL.

---

## 8. Command Palette — navigation only

Three commands: Open Bulk Send, Create Bulk Send Batch, Open Saved Bulk Send
Configurations. Every one opens authoritative UI.

None sends a request, notifies a recipient, marks a batch ready, applies a
recommendation, removes rows, executes Automation, or schedules anything. The
palette must never be a way to bypass a confirmation, a validation step, or an
authoritative form.

---

## 9. Reports — a family, not a second surface

`preparation` joins `ReportFamily` as a sixth family and inherits the whole
existing architecture: the same query, date range, saved views, export preview,
share preview, schedule preview, family navigation, and restricted state.

Because the family maps are `Record<ReportFamily, …>`, the type checker forced
every one to be filled in — including the export preview's `includedColumns`,
which is where a careless addition would have leaked. Those columns are Batch,
Preparation Status, Template, Scope, Recipient Rows, Ready Rows, Issues, Last
Updated. There is deliberately **no recipient table, no recipient column, and no
Contact or Contact Group breakdown**: this family reports how much preparation is
outstanding, never who is in a batch.

It is the only availability-gated family. `availableReportFamilies()` is exported
and used by both the family nav and the Overview page, so the two cannot drift
apart, and the route is wrapped in `CapabilityGuard` so a stale bookmark or
shared URL lands on the standard unavailable state.

---

## 10. Documents — secondary to document status

A document created from a batch has a real document status. Where it came from is
context, not state.

`PreparationBadge` renders next to `VerificationBadge` in both the row and card
layouts — never in the Status cell, never styled to compete with `StatusBadge`.
It reads `DocumentListItem.bulkSendSource`, which the Bulk Send service attaches
to Draft Projections and which holds opaque IDs and safe labels only. When the
capability is out of profile it degrades to plain provenance text rather than a
link into a guarded route.

---

## 11. Cleanup

`notificationCenterService.clearSessionState()` was added and is called from
`PlatformContext` on both `signOut()` and `switchWorkspace()`. Read and dismissed
state belongs to one signed-in session in one workspace; preparation
notifications additionally reference a batch in the workspace being left.

Search, palette, dashboard and report contributions hold no state of their own —
they read the projection, which reads the service, which already clears on
sign-out (`resetBulkSendDemonstration`) and workspace switch
(`clearWorkspaceScopedBulkSend`).

---

## 12. Verification performed

- **Strict type-check:** 160 errors, unchanged from baseline. Zero introduced.
- **Both builds:** `launch-default` and `enterprise-preview` both succeed.
- **Executable probe, both profiles** (temporary `src/__probe.ts`, bundled with
  esbuild and run under node, then deleted):
  - `enterprise-preview`: 6 summaries, statuses matching the service
    (`Ready for review`, `Needs attention` ×2, `Draft Projections created`,
    `Draft`, `Archived`), 5 search results, 3 palette commands, 6 report rows,
    2 notifications — **all checks passed**.
  - `launch-default`: 0 summaries, 0 search results, 0 palette commands, 0 report
    rows, 0 notifications — **all checks passed**. The gate closes completely.
  - **PII scan:** 32 identifying values (recipient names, emails, organizations,
    source file names) and 27 other cell values checked against ~15 KB of
    serialized output from every surface. Zero identifying values appeared. The
    one non-identifying hit, "Code of Conduct 2026", is a substring of the batch
    name "Code of Conduct 2026 Acknowledgment" — user-authored text published by
    design, not a leak.

---

## 13. STITCH — `platform` scope

Escalated from `changed`: the change set touches a route definition, search-result
destinations, Command Palette destinations, notification destinations, dashboard
cards and the navigation registry, and the last four escalate to `platform` by
rule.

**Destination integrity**, verified by matching every emitted destination against
the route table parsed out of `router.tsx` rather than a hand-written list:
36 destinations across the projection, search, palette, notifications and reports
— **all 36 resolve**, and **all 36 land on a capability-guarded route**. No path
contains an email address or a space. Hostile batch IDs (`../../etc/passwd`,
`x@y.com`, `<script>`, `'; DROP TABLE--`, a 200-character string, empty) all fall
back to the list route.

**Workspace isolation:** another workspace's ID yields zero batches; an empty
workspace ID yields zero rather than matching everything.

Two defects found and repaired:

- **P2 — Saved Views could not filter to the new family.** `ReportsSavedPage`
  built its family filter from a hardcoded array that omitted `preparation`. A
  view saved from the preparation report appeared under "All Families" with no way
  to filter to it. Now built from `availableReportFamilies()`, the same
  availability-gated list the family nav and Overview use, so the three cannot
  drift apart.
- **P3 — the Share panel's exclusion list was generic.** It listed participant
  data and signatures but said nothing about recipients, and a user deciding
  whether to share sees only that panel. Recipient names, Contact records, and
  uploaded/pasted values are now named explicitly for this family.

**Fallback coverage:** unknown route → existing wildcard; disabled capability →
`CapabilityGuard` on every bulk-send route and on `/app/reports/preparation`;
missing permission → `ReportsRestricted` before the capability check, so a user
without `view_reports` is told that rather than told the feature is unavailable;
invalid batch ID → `isSafeBulkSendId` then `NOT_FOUND`; empty result → the
Dashboard section renders nothing rather than an empty card, and report tables
render "No data in this demonstration period."

**Accessibility:** one `<h1>` per destination via `ReportPageHeader`; `<main>` and
section `aria-label`s on every new region; the Documents badge is a `Link` with
text plus an `aria-hidden` icon, not an icon-only control.

**Honest limitation:** the repository has no browser-testing framework, so none of
this was verified in a real browser. Focus behaviour across SPA route transitions,
virtual-keyboard behaviour, and 200%-zoom layout for the new Dashboard section and
report page are **unverified**. Adding Playwright is out of scope here.

---

## 14. Backend requirements

1. **A list endpoint that returns validated batch summaries.** The frontend
   currently re-runs validation on read because fixtures ship unvalidated. The
   backend should return `status`, `validation` counts and duplicate counts
   already computed, so no client re-derives them.
2. **Provider payloads must exclude recipient data at the source.** The projection
   enforces this on the frontend, but the API should not return recipient rows to
   a search, dashboard, or report call at all.
3. **Notification generation on state transition**, addressed to the batch's
   preparers only — never to recipients, Contacts, or Contact Group members, and
   never to Workspace Administrators by default. Deduplicate per batch per
   condition.
4. **Report aggregation server-side**, returning counts only. Export and schedule
   endpoints must reject any request for recipient-level columns from this family.
5. **Team scoping for batches** — `snapshotForPlatform` accepts a `teamId` and the
   service filters on it, but team membership itself is not modelled.

---

## 15. Remaining gaps

- Notification fixtures are static. Nothing generates a notification when a batch
  actually changes state, because there is no backend to observe the change.
- The Documents provenance badge only appears on Draft Projections created
  in-session; no fixture document carries `bulkSendSource`.
- No automated tests. The repository still has no test framework, `tsconfig.json`,
  or ESLint — that is Gap Closure Command 6.
- Saved configuration create/rename/apply still have no UI entry point (§17 item
  7), the honest remainder of Command 33.

# MVP Consolidation — Re-Audit at HEAD `7c6713b`

**Date:** 2026-07-31
**Supersedes in part:** `docs/mvp-consolidation-audit.md` (written 2026-07-16 at C32)
**Method:** static audit plus an **executable probe** of the real resolver against the
real registry in each launch profile. Behavioural claims below were run, not inferred.

---

## 1. Why this document exists

Command 35 was written on the premise that *"the repository contains implementation
only through Command 32"* and that *"Commands 33 and 34 are intentionally excluded."*

**Neither is true of this repository.** At HEAD `7c6713b`:

| Claim in the command | Actual state |
|---|---|
| Repo is at C32 | Repo is at **C37** |
| C33 Bulk Send not implemented | **Implemented**, 9 routes, `enterprise-preview` |
| C34 Collaboration not implemented | **Implemented**, 9 routes, `enterprise-preview` |
| C35 machinery must be created | **Already exists** — registry, resolver, profiles, guards, 11 docs |

So Command 35 was executed here as what it actually is at this point in the
project: a **consolidation re-audit**. The C35 machinery was built when the repo was
at C32; C33/C34/C36/C37 landed afterwards and the consolidation drifted. Nothing was
rebuilt, and nothing was deleted — consistent with the command's own rules
("Avoid deleting advanced modules solely because they are not in the MVP").

---

## 2. The headline defect: Automation was unreachable in every profile

`workflow-automation` is classified `enterprise-preview`, which the profile allowlist
permits in both the `enterprise-preview` and `development` profiles.

But `DEFAULT_PLATFORM_FLAGS.automationEnabled` was hardcoded `false` and **nothing
ever derived it from the active profile**, while the registry entry declares
`featureRequirements: ["automationEnabled"]`. The resolver checks feature flags at
step 5, *after* the profile allowlist at step 4. Result:

```
PROFILE = enterprise-preview      (Owner permissions, real flags)
workflow-automation   enterprise-preview   no:unavailable-feature      <-- BEFORE
bulk-send             enterprise-preview   AVAILABLE(preview)
document-collaboration enterprise-preview  AVAILABLE(preview)
```

Workflow Automation — an entire implemented module — resolved unavailable in
**launch-default, enterprise-preview and development alike**. The comment above the
flag said *"Enable via VITE_LAUNCH_PROFILE=enterprise-preview at build time"*, which
was simply not what the code did.

This is the same failure class as the C37 STITCH-2 finding and the C33/C34
`deferred`-classification problem: a capability that is gated everywhere is not
gated, it is deleted-by-accident.

**Fix:** `automationEnabled: ACTIVE_LAUNCH_PROFILE !== "launch-default"`.

```
PROFILE = enterprise-preview
workflow-automation   enterprise-preview   AVAILABLE(preview)          <-- AFTER
PROFILE = launch-default
workflow-automation   enterprise-preview   no:unavailable-profile      <-- still hidden
```

---

## 3. Module-scope capability gates were dead in every profile

`global-search.service.ts` gated Automation (and, after C34, Collaboration) with:

```ts
const ctx = buildCapabilityContext(ACTIVE_LAUNCH_PROFILE, [], {});
return resolveCapability(capabilityId("workflow-automation"), ctx).available;
```

`buildCapabilityContext` closes over the arrays it is given:

```ts
hasPermission:  (p) => permissions.includes(p),   // [] -> always false
hasFeatureFlag: (f) => flags[f] === true,         // {} -> always false
```

So any capability declaring a permission or feature requirement resolved
`unavailable-*` regardless of profile. Probed across all 29 capabilities, the
module-scope column was `no:unavailable-feature` for 20 of them — including
`documents`, `templates`, `contacts` and `notifications`.

Consequence: `isAutomationSearchEnabled()` and `isCollaborationSearchEnabled()` were
**permanently false**. The C32 Automation search gate produced the right launch-default
answer for the wrong reason, and the C34 Collaboration search/palette integration
never activated in any profile.

> This one is partly self-inflicted: the C34 integration copied the existing broken
> pattern rather than questioning it.

**Fix:** a new `isCapabilityInActiveProfile(id)` in `capability-resolver.ts` that
answers only the profile question (future-product → deferred → development-only →
allowlist) and deliberately does **not** check permissions or flags, because module
scope has neither. Per-user enforcement is unchanged and still happens where it
belongs: `CapabilityGuard` on the route, and `requiresPermission` on every search
result and command.

---

## 4. Three post-launch capabilities were reachable by direct URL

`post-launch` is not in the `launch-default` allowlist, so these resolve
`unavailable-profile`. Their routes were nonetheless unguarded:

| Capability | Route | Was | Now |
|---|---|---|---|
| `advanced-document-organization` | `/app/documents/saved-views`, `/:viewId` | unguarded | `CapabilityGuard` |
| `advanced-reports` | `/app/reports/saved` | unguarded | `CapabilityGuard` |
| `integrations` | `/app/settings/integrations`, `/:integrationId` | unguarded | `CapabilityGuard` |

Guarding a route is only half the fix — a link that lands on "not available" is a
dead end and still discloses the feature. Entry points removed in the launch profile:

- `DocumentsPage` saved-views side-panel section
- `ReportsShared` "Saved Views" tab, `ReportsOverviewPage` "view all" link
- `ReportDetailPage` back-links now fall back to `/app/reports`
- `SettingsShell` nav entry, `SettingsOverviewPage` quick-link card
- Global Search: `buildOrgSavedViewResults`, the Integrations settings entry
- Command Palette: `cmd_doc_savedviews`, `cmd_savedrep`, `cmd_integrations`

---

## 5. `/dev/design-system` was live in production

The only `/dev/*` route was registered unconditionally with no guard — reachable by
direct URL in every profile. Being unlinked from navigation is not the same as being
unavailable (C35 principle #7).

It is now registered **only** when `development-scenarios` is in the active profile;
otherwise the path does not exist and falls through to `NotFound`.

That page also carried *"LAGDA eNotary will enable **legally compliant** electronic
notarization once Supreme Court accreditation is confirmed"* — an unsupported legal
claim and a forward promise, replaced with the canonical disclaimer.

---

## 6. Resolver named the wrong feature to the user

`resolveCapability` hardcoded, for **any** enterprise-preview capability blocked by
profile:

> "Workflow Automation is an Enterprise Preview capability not included in the current product profile."

With three enterprise-preview capabilities, a user opening a gated **Bulk Send** or
**Collaboration** route was told about *Workflow Automation*. Now uses each
capability's own `unavailableReason`. (The same line contained a ternary whose two
branches were identical — removed.)

---

## 7. A notification claimed a delivery that never happened

`notif-int-001` read *"All webhook events … were delivered successfully … No failed
deliveries detected"* and *"Your webhook integration endpoints have been receiving and
acknowledging all document lifecycle events without error."*

No webhook is configured, sent, received, or acknowledged anywhere in this frontend.
Rewritten to state plainly that nothing was sent. It also pointed at
`/app/settings/integrations`, now a guarded route — so notification fixtures are now
filtered by capability, and this one is absent from the launch profile entirely.

`InvitationsPage` likewise announced *"Invitation sent."* via `role="status"` when no
email is sent. Now: *"Invitation added to this demonstration. No email was sent."*
The **button** still reads "Send invitation" — C35 STEP 24 lists "Send" as preferred
product vocabulary, and the page already carries a notice that emails are not sent.

---

## 8. Verified sound — recorded so it is not re-litigated

| Area | Finding |
|---|---|
| `CapabilityGuard` | Resolves **before** rendering children. No data flash. Does not expose capability IDs. |
| Dashboard | Already uses `resolveCapability("workflow-automation")`, not a raw flag. Correct. |
| Profile derivation | `VITE_LAUNCH_PROFILE` build-time only. No query parameter can elevate a profile. |
| Bulk Send / Collaboration / Signing Workflow routes | All 22 correctly guarded. |
| Notification destinations | Only one pointed at a gated route; now fixed. |
| `App.tsx` + `src/imports/**` (15 MB Figma material) | **Orphaned** — `main.tsx` uses `router.tsx` directly and nothing imports `App.tsx`. Never enters the bundle graph. Recorded, not deleted. |

---

## 9. Known deviation from the command text

Command 35 STEP 38 requires the eNotary disclaimer to read exactly:

> Coming Soon — Subject to Supreme Court Accreditation and applicable rules.

The repository consistently uses, in ~30 places:

> LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules.

That form is declared a **hard constraint by an earlier command** at
`src/app/pages/public/enotary/content.ts:2` and exported as `ENOTARY_DISCLAIMER`.
The two differ only in `and` vs `—`; the protective content is identical.

**Deliberately not changed.** Mass-rewriting ~30 legal-adjacent disclaimer strings to
swap a conjunction for an em dash is high-churn, low-value, and legal wording is the
user's call rather than an assistant's. Flagged here for a decision.

---

## 10. Residual gaps — honest

1. **`routeIds` in the registry is decorative.** Declared on all 29 capabilities and
   **consumed by no code**. It drifted silently (it claimed `advanced-reports` owned
   `app-reports-saved` while that route sat unguarded) and is exactly why §4 went
   unnoticed. It should either drive the guards or be deleted.
2. **No automated tests.** The repo still has no test framework, no `tsconfig.json`
   and no ESLint, so C35's STEP 63 suites cannot be written or run. The executable
   resolver probe used here is a substitute, not a replacement.
3. **Navigation gates on feature flags, not capabilities.** `platform.nav.ts` has no
   capability field; the sidebar filters on `permission` + `featureFlag`. It now
   produces the correct result for Automation because the flag is profile-derived,
   but a future capability whose flag is not wired would slip through.
4. **160 pre-existing strict type errors**, unchanged by this work.
5. Public-portal, pricing, mock-success and route-metadata dimensions were audited by
   sweep; findings not yet folded in are tracked separately.

---

## 11. Verification performed

- Executable resolver probe across all 29 capabilities × `launch-default` and
  `enterprise-preview`, before and after the fixes.
- Full-repo strict type-check: **160 errors before, 160 after** — zero added.
  (Baseline measured by stashing the changes and re-running, not assumed.)
- `npm run build` passes.
- **No dependency added or removed.**

# Signing Workflow — Post-Implementation Audit (SWEEP · STITCH · BRAND · MOBILEVIEW · TEST)

Five audit passes run against the Command 37 Signing Workflow development.

- Repository: `C:\Users\paulg\OneDrive\Desktop\LAGDA`
- Audited commit: `004212a` (C37)
- Scope: the 15 files created and 9 files modified by C37
- Result: **7 findings — 6 fixed, 1 accepted with rationale.** Plus 10 pre-existing
  defects surfaced outside C37 scope and left untouched.

---

## SWEEP

| # | Check | Result |
|---|-------|--------|
| 1 | `react-router-dom` imports | CLEAN — all imports use `react-router` |
| 2 | `window.location.href =` assignment | CLEAN — navigation uses `useNavigate` / `<Link>` |
| 3 | Real network calls (`fetch`, `axios`, `XMLHttpRequest`, `WebSocket`, `EventSource`) | CLEAN |
| 4 | `console.*` in production paths | CLEAN |
| 5 | `localStorage` / `sessionStorage` writes | CLEAN |
| 6 | `dangerouslySetInnerHTML` | CLEAN |
| 7 | Burgundy `#67023B` outside eNotary | CLEAN (comments only) |
| 8 | Tailwind utility classes in inline-style modules | CLEAN — every `className` is `wf-` prefixed |
| 9 | Forbidden legal claims | CLEAN |
| 10 | eNotary / notarial terms | CLEAN (comments only) |
| 11 | `Math.random` / non-deterministic IDs | CLEAN — monotonic counter |
| 12 | Dead exports | **SWEEP-3** |
| 13 | Native browser dialogs | **SWEEP-1** |
| 14 | Fixture clock discipline | **SWEEP-2** |

### SWEEP-1 — Native `window.confirm` (Medium) — FIXED
C37 contained the **only six uses of `window.confirm` in the entire repository**. Every
other module uses a focus-trapped in-app dialog. Native `confirm` is unstyled, cannot carry
LAGDA brand, is not focus-managed by the app, and is suppressed in some embedded contexts.

**Fix:** added `WorkflowConfirmDialog` + `useWorkflowConfirm()` to `WorkflowPrimitives.tsx`
(`role="alertdialog"`, labelled title/body, Tab trap, Escape to close, focus restored to the
opener, destructive variant). All six call sites converted. The replacement copy is also more
honest — the remove and delete dialogs now state that no invitation is withdrawn and no
completed action is undone.

### SWEEP-2 — `demo-clock` not used for mutation timestamps (Low) — ACCEPTED
`src/app/utils/demo-clock.ts` exists to keep fixture dates deterministic and says "do not use
`Date.now()`". C37 uses `new Date().toISOString()` in three places in the service.

**Accepted, not changed.** All three are *mutation* timestamps recording when the user acted
in this session, not fixture data — the fixtures themselves use hardcoded ISO strings, which
is correct. Note that `demo-clock` currently has exactly one consumer repo-wide
(`reporting.service.ts`), so adoption is a broader open question, not a C37 regression.

### SWEEP-3 — Dead export `ActionPill` (Low) — FIXED
Exported from the workflow barrel and defined in `WorkflowPrimitives.tsx`, never referenced.
Same class of finding as the earlier STITCH pass that removed `SETTINGS_NAV`. Definition and
barrel entry both removed.

---

## STITCH

| # | Check | Result |
|---|-------|--------|
| 1 | Every internal link target resolves to a registered route | PASS |
| 2 | Static `workflow/*` paths registered before `workflow/stages/:stageId` | PASS |
| 3 | Tab active-state across `/workflow`, `/create`, `/review`, `/stages/:id` | PASS (`startsWith`) |
| 4 | Direct load / refresh of all four routes | PASS — parent loads the transaction before rendering `<Outlet>` |
| 5 | Browser Back / Forward | PASS — view and step changes use `replace: true`, so no history loop |
| 6 | Capability + permission guards on direct route load | PASS |
| 7 | Cross-shell navigation | **STITCH-1** |
| 8 | Primary journey reachability in fixtures | **STITCH-2** |
| 9 | Field Placement round trip | **STITCH-3** |

### STITCH-1 — Public links opened in the same tab (Medium) — FIXED
`<Link to="/help">` on the empty state and `<Link to="/contact">` on the error state navigated
in the same tab. Both are **public-site** routes, so a sender mid-task was dropped out of the
authenticated shell. The established convention (`PlatformHeader`, `UserMenu`) is
`target="_blank" rel="noopener noreferrer"` with an "(opens in new tab)" accessible name.

**Fix:** both links now follow that convention.

> Pre-existing, out of scope: `PermissionDenied.tsx:47` links to `/help` in the same tab.
> Lower impact (terminal error state), but it is the same inconsistency.

### STITCH-2 — The from-scratch creation journey was unreachable (High) — FIXED
`CONFIGURATION_LOCKED_STATUSES` locks workflow editing for every transaction status except
`draft`. In the C16 transaction fixtures **`txn_004` is the only draft** — and C37 seeded
`wf_004` onto it. Consequence:

- every document *without* a workflow (`txn_005` sent, `txn_007` archived) was **locked**, so
  its empty state correctly showed a read-only explanation instead of a CTA;
- the only *unlocked* document already had a workflow, so it never showed the empty state.

The empty-state CTA, the from-scratch creation flow, and the recipient-order conversion were
therefore **not reachable anywhere in the demonstration**. (The builder, review, and result
screens remained reachable via "Edit Workflow" on `txn_004`.)

**Fix:** `wf_004` removed; `txn_004` is now reserved as the editable, workflow-free document.
Its configuration-issue demonstrations were moved onto `wf_008`, which is already the
"blocked / needs attention" document. `DOCUMENTS_WITHOUT_WORKFLOW` and the fixture
documentation were updated, and the reasoning is recorded in the fixture file so a future
command does not re-seed `txn_004`.

While relocating, a second-order issue was caught and fixed in the same pass: the first
version of the moved stage introduced two people who are not participants on `txn_008`, which
would have made the Workflow tab disagree with the Participants tab. The stage now uses only
`txn_008`'s real participants, and reusing Rina Evangelista across two stages additionally
exercises the "assigned in more than one stage" advisory.

### STITCH-3 — Field Placement round trip is conditional (Low) — ACCEPTED, DOCUMENTED
"Open Field Placement" passes a validated `returnTo`, and `FieldsPage` honours it. But the
field editor is bound to an active preparation draft; without one, `PrepareLayout`'s guard
redirects to `/app/prepare`. From Document Details the user therefore lands on the preparation
entry page with no explanation of why.

**Accepted for now.** Fixing it properly means either lifting field placement out of the
preparation draft or synthesising a draft from a sent transaction — both are real architectural
changes well beyond an audit pass. Recorded in known limitations and the backend handoff.

---

## BRAND

| # | Check | Result |
|---|-------|--------|
| 1 | Azure primary / Navy structure / Light Azure current-stage | PASS |
| 2 | Burgundy absent | PASS |
| 3 | Gold used sparingly | PASS — defined, used only as an available token |
| 4 | Geist typography throughout | PASS |
| 5 | Logo: canonical C36 component reused, no second registry | PASS |
| 6 | Logo used once, `decorative`, never in a button / stage icon / drag handle / progress marker | PASS |
| 7 | Logo never recoloured, cropped, traced, rotated, animated | PASS |
| 8 | Logo asset resolves (`/brand/LagdaLogoIconFullColorSquare.png` exists) | PASS |
| 9 | Motion 120–220ms, no pulsing, no confetti, reduced-motion honoured | PASS |
| 10 | eSignature / eNotary separation | PASS |
| 11 | Status never colour-only or icon-only | PASS |
| 12 | Raw brand tokens vs. implemented tokens | **BRAND-1** |

### BRAND-1 — Brand doc tokens diverge from the implemented palette (Medium, systemic) — NOT a C37 defect
The official brand guideline lists `Light Azure Surface #EAF6FF`, `Cool Gray #E5E7EB`, and
`Success Green #22C55E`. Measured across the platform:

| Brand-doc token | Uses in platform | Token actually used | Uses |
|---|---|---|---|
| `#EAF6FF` Light Azure | **0** | `#F0F9FF` | 7 |
| `#E5E7EB` Cool Gray | **0** | `#E2E8F0` | 201 |
| `#22C55E` Success Green | **0** | `#166534` (text) | 33 |

C37 matches the **implemented** convention in every case, so it is internally consistent with
Document Details, Documents, Templates and the rest of the platform. The divergence is
systemic and predates C37: the codebase uses accessible text-on-tint pairs derived from the
brand's semantic roles rather than the raw swatches.

**No change made.** Aligning C37 alone would make it the only inconsistent surface. This needs
a design-system reconciliation — either update the brand doc to record the derived accessible
pairs, or run a repo-wide token migration. Recommended as its own command.

> Also noted: the brand memory lists logo filenames (`Lagda-colored-logo-square-whitebg-withouttext.png`)
> that do not match what C36 shipped (`LagdaLogoIconFullColorSquare.png`). The files on disk
> match the code, so nothing is broken — the memory note is stale.

---

## MOBILEVIEW

| # | Check | Result |
|---|-------|--------|
| 1 | No page-level horizontal scroll; only `.wf-board-scroll` scrolls | PASS |
| 2 | Board becomes a vertical stack below 860px | PASS |
| 3 | Split layout collapses at 1100px | PASS |
| 4 | Sticky action bar is in-flow, respects `env(safe-area-inset-bottom)` | PASS |
| 5 | Long names / emails wrap (`overflow-wrap: anywhere`) | PASS |
| 6 | Full-screen preview and editor sheets on mobile | PASS |
| 7 | Reorder never requires dragging on any viewport | PASS |
| 8 | Relative sizing → 200% zoom retains all actions | PASS |
| 9 | Touch targets ≥ 44px | **MV-1** |
| 10 | Checkbox/radio hit areas | **MV-2** |
| 11 | Breakpoint alignment with the project's 768px threshold | **MV-3** |

### MV-1 — Sub-44px touch targets (Medium) — FIXED
Four instances below the LAGDA 44px minimum — the same class of defect the earlier LAGDA
MOBILEVIEW pass fixed (MobileNav close 36→44, PlatformHeader search/help 36→44):

- `WorkflowBoard.tsx` — Duplicate Stage and **Delete Stage** icon buttons at 36×36
  (a destructive control at 36px is the worst case)
- `WorkflowStyles.tsx` — `.wf-btn-sm` `min-height: 36px`, used widely
- `WorkflowSummaryHeader.tsx` — disclosure toggle pinned to 36px inline

**Fix:** added a `≤860px` rule raising `.wf-btn-sm` to 44px and `.wf-icon-btn-sm` to 44×44;
tagged both board icon buttons with `wf-icon-btn-sm`; removed the inline `minHeight: 36`
override so the disclosure toggle inherits the rule. Desktop keeps 36px where pointer
precision makes it safe, so list density is unchanged.

### MV-2 — Checkbox label without a 44px hit area (Low) — FIXED
The "Issues only" filter label in `WorkflowViews.tsx` had no `minHeight`, giving an ~18px
target. Every other checkbox/radio in C37 already sits inside a `minHeight: 44` label.
**Fix:** `minHeight: 44` added.

### MV-3 — Breakpoint is 860px, project convention is 768px (Low) — ACCEPTED
C37 uses 1100/860; the project standardised on 768px elsewhere. 860px is deliberate: two
300px board columns plus a connector and page padding need roughly 700px, so switching at
768px would leave the board cramped in the 768–860px band. Documented rather than changed.

---

## TEST

This is a status report, not a passed gate. **The repository has no test framework, no
`tsconfig.json`, no `typescript` dependency, and no ESLint configuration**, and `npm run check`
is an alias for `vite build` (esbuild — it strips types without checking them).

### What was actually run

| Gate | Command | Result |
|------|---------|--------|
| Production build | `npm run build` | **PASS** — 6.4s |
| Strict type-check of C37 | temporary config + `npx -y -p typescript@5.6.3 tsc` | **PASS** — 0 errors in C37 files |
| Static safety sweep | 14 pattern checks (see SWEEP) | **PASS** |
| Route-target integrity | every `to=` / `navigate()` target traced to a registered route | **PASS** |
| Journey reachability | traced against the fixture set | **FAIL → fixed** (STITCH-2) |

### What could not be run
Unit, component, service-contract, domain-integrity, route, permission, workspace-scope,
notification, accessibility, browser, and responsive test suites — no framework exists.
Automated a11y checks and real-viewport responsive verification were likewise not possible;
those properties are built in by construction and verified by code reading only.

### Pre-existing defects surfaced (outside C37 scope, NOT fixed)
The strict type-check found 10 real errors in code C37 did not author:

| File | Line(s) | Defect | Runtime impact |
|------|---------|--------|----------------|
| `capability-resolver.ts` | 36 | `ImportMeta` cast without `unknown` | None — cosmetic |
| `PlatformContext.tsx` | 186 | `PlatformFlags` cast without `unknown` | None — cosmetic |
| `global-search.service.ts` | 617, 623, 627, 629 | `OrgSavedView.description` does not exist | **Real** — saved-view descriptions are never searchable; the field is always `undefined` |
| `global-search.service.ts` | 669, 673, 687, 691 | Automation results emit `subtitle` / `matchFields` / `score` instead of `description` / `matchedFields` / `matchScore` | **Real** — automation search results render without a subtitle and at default relevance |

Two of these are genuine user-visible bugs in C30/C31/C32 search. They were left untouched
because this pass was scoped to recent development. **Recommend a follow-up to fix all 10 and
then land `tsconfig.json` + a `typecheck` script**, which is already an open project TODO.

---

## Verification after fixes

- `npm run build` — passes (6.4s)
- Strict type-check of all C37 files — 0 errors
- `window.confirm` in C37 — 0 occurrences (one explanatory comment remains)
- `WorkflowTab` chunk 96.7 kB (23.6 kB gzip), up 2.9 kB for the in-app confirm dialog

# Document Collaboration — Pre-Implementation Audit (Command 34)

- Repository: `C:\Users\paulg\OneDrive\Desktop\Lagda`
- Branch: `master`, HEAD `d74dea8` (C33 Bulk Send)
- Working tree at audit time: clean (only pre-existing untracked `.claude/`)

---

## 1. Command-sequencing conflict — same shape as C33, resolved by precedent

C34 is being executed after Commands 35 and 37, so the same three contradictions apply:

| Source | Statement |
|---|---|
| C35 capability registry | `document-collaboration` classified `maturity: "deferred"`, `frontendReady: "not-started"` |
| C37 brief | "Commands 33 and 34 were not implemented. Do not implement their Bulk Send or Collaboration scope." |
| C37 acceptance criteria | #130 — "No Collaboration was added." |
| `backend-integration-handoff.md` | "Commands 33 (Bulk Send) and 34 (Real-time Collaboration) were not implemented." |

`resolveCapability()` evaluates `deferred` **before** the profile allowlist and returns
unavailable in every profile, so building the routes under that classification would leave the
whole feature unreachable — the C37 STITCH-2 defect again.

**Resolution:** reclassify `document-collaboration` to **`enterprise-preview`** with
`enabledByDefault: false`, applying the decision the user already made for `bulk-send` in C33.
Not re-asked, because the situation is identical and the precedent is settled.

> Note on the handoff wording: C34 is **not** "Real-time Collaboration". Real-time
> collaboration, presence, typing indicators, live cursors, WebSockets, and Server-Sent Events
> are all on this command's explicit *do-not-implement* list. C34 is asynchronous internal
> review — threads, comments, mentions, and review records.

---

## 2. Existing collaboration code

**There is none.** Every search term returned no implementation:

| Search | Result |
|---|---|
| collaboration, thread, comment, reply | **None.** Only the deferred registry entry. One unrelated marketing string in `BusinessTeams.tsx` ("outside the email thread"). |
| mention, `@mention` | **None.** Only "eNotary is NEVER mentioned" comments in prepare-step files. |
| reviewer, internal review, changesRequested | **None as a feature.** `RecipientContext.tsx:72` has a *recipient* "Reviewer decision" — that is a participant role (C20), not internal review, and must stay separate. |
| resolve / reopen | **Not for collaboration.** `workflow-automation.ts` and `workspace-admin.ts` have `resolvedAt` for *conflicts* and *activity* — different domains. `ConflictsPage` has resolve UI worth mirroring stylistically. |
| annotation, personal note | **None for documents.** `reports.ts` has `ReportAnnotationId` + a 500-char plain-text in-memory annotation — a good precedent for Personal Draft Notes. |
| WebSocket, EventSource, presence, typing indicator, live cursor | **None anywhere.** Only prose on public eNotary pages describing future audio-video sessions. |
| `dangerouslySetInnerHTML` | **Not used in app code.** Several files carry explicit "No dangerouslySetInnerHTML" comments. The one real historic use was removed by the C35 SWEEP. |
| localStorage comments/review | **None.** |

### Adjacent things worth reusing

| Existing | Reuse for C34 |
|---|---|
| `contacts.ts` — `GRP_INTERNAL = "grp-internal-reviewers"`, tags `tag-internal` / `tag-reviewer`, a "Compliance Reviewer" contact | Directory *context* only. A Contact is **not** automatically a mentionable Workspace Member — C34 forbids mentioning Contacts without Workspace membership. |
| `reports.ts` annotation pattern (plain text, capped, in-memory) | Personal Draft Notes |
| `ConflictsPage` resolve/resolved split | Thread resolution UI shape |
| `notification-center.service.ts` (C28) | Mention and reply Notification fixtures — no second notification system |
| `WorkflowConfirmDialog` / `BulkSendKit` confirm pattern | Never `window.confirm` (C37 audit finding) |
| `CapabilityGuard`, `ServiceResult`, `RouteMeta`, `PageHeader`, `AppContent` | Unchanged |

---

## 3. Boundaries that must hold

The audit confirms four systems already exist that C34 must **not** duplicate or contaminate:

1. **Transaction Activity** — `models/transaction-detail.ts` `ActivityEvent`, 30+ event types.
   Collaboration Activity is a *separate*, explicitly non-immutable frontend record.
2. **Evidence** — `EvidenceSection`, `DeviceNetworkSummary`. Collaboration never writes here.
3. **My Actions** — `models/inbox.ts` recipient assignments. Internal reviewers are **not**
   participants and must never appear in My Actions.
4. **Participants** — `TransactionParticipant` with `ParticipantRole`. Internal review is not a
   participant role, and reviewer assignment is not participant assignment.

`RecipientContext.tsx` already has a recipient-facing "Reviewer decision" — the single highest
confusion risk in this command. Internal review must use distinct types and distinct vocabulary.

---

## 4. Gaps and risks

| # | Gap | Handling |
|---|---|---|
| 1 | No test framework, `tsconfig.json`, or ESLint | STEP 79/84 suites cannot be written or run. Verification is production build + strict type-check via temporary config. |
| 2 | `document-collaboration` is `deferred` → unreachable | Reclassified to `enterprise-preview` (§1). |
| 3 | Plain-text safety has no existing helper | Reuse the `normalizeBulkSendText` approach: strip control chars, collapse whitespace, cap length. Never `dangerouslySetInnerHTML`; React escapes by default. |
| 4 | "Reviewer" is overloaded (recipient role vs internal reviewer) | Internal types are named `CollaborationReviewer*` and never reuse `ParticipantRole`. |
| 5 | Several docs named in C34 do not exist (`document-details.md`, `document-activity.md`, `document-evidence.md`, `prepare-document-workflow.md`, `field-placement-editor.md`, `recipient-signing-experience.md`, `authentication-flows.md`, `onboarding-flows.md`, `contacts-and-participant-directory.md`) | Only existing files updated; no placeholder docs invented. |
| 6 | 137 pre-existing repo-wide strict type errors | Unchanged. New files must add zero. |

---

## 5. Deliberately NOT implemented

Production backend, persistence, real-time collaboration, presence, typing indicators, live
cursors, WebSockets, Server-Sent Events, real mention/email/SMS/push delivery, participant-visible
delivery, external-recipient conversation, attachments of any kind, comment/review exports,
immutable audit records, Evidence creation, PDF annotation, document redaction or editing, field
editing through comments, participant actions, signature/initials application, approval,
rejection, acknowledgment, consent, authentication, access changes, routing changes, Verification
mutation, electronic notarization, accreditation workflows.

**No dependency will be added** — no chat SDK, realtime SDK, WebSocket library, rich-text
editor, Markdown renderer, attachment uploader, PDF annotation library, or presence library.
Comments are plain text in a plain `<textarea>`.

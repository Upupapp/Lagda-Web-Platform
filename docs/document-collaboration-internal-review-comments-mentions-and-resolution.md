# Document Collaboration — Internal Review, Comments, Mentions, and Resolution

Command 34. Frontend demonstration only.

---

## 1. Purpose and scope

Asynchronous **internal** review of a document: threads, plain-text comments, mentions,
internal reviewer responses, and resolution — for people inside the workspace who
**already have access** to the document.

**This is not real-time collaboration.** Presence, typing indicators, live cursors,
WebSockets, and Server-Sent Events are on the explicit do-not-implement list and none
of them exists in the code. `backend-integration-handoff.md` previously described
Command 34 as "Real-time Collaboration"; that wording has been corrected.

| Collaboration is | Collaboration is not |
|---|---|
| Internal discussion attached to a document | A chat product |
| A record of who is reviewing internally | Participant approval or legal approval |
| Frontend demonstration state | Evidence, an audit trail, or a delivery receipt |
| A pointer to part of a document | An annotation on the PDF |

## 2. Capability classification — the same reversal as C33

`document-collaboration` was registered by C35 as `maturity: "deferred"`.
`resolveCapability()` evaluates `deferred` **before** the profile allowlist and returns
unavailable in *every* profile, so building routes under it would produce a feature
unreachable everywhere — the C37 STITCH-2 defect class.

Reclassified to **`enterprise-preview`**, `enabledByDefault: false`, applying the
Enterprise Preview decision the user already made for `bulk-send` in C33 rather than
re-asking. It is fully built, stays out of the default launch profile, and becomes
usable with `VITE_LAUNCH_PROFILE=enterprise-preview`.

This reverses three earlier recorded statements, noted here rather than left to
contradict: C35's deferred classification, C37's "do not implement Collaboration",
and C37 acceptance criterion #130. See `docs/document-collaboration-audit.md` §1.

## 3. Canonical route family

| Route | Purpose |
|---|---|
| `/app/documents/:transactionId/collaboration` | Thread list for one document (a tab) |
| `/app/documents/:transactionId/collaboration/new` | Start a discussion |
| `/app/documents/:transactionId/collaboration/:threadId` | Thread details, comments, resolution |
| `/app/documents/:transactionId/review` | Internal review — reviewers and responses |
| `/app/collaboration` | Collaboration Center overview |
| `/app/collaboration/assigned` | Reviews assigned to me |
| `/app/collaboration/mentions` | My mentions |
| `/app/collaboration/blocking` | Blocking discussions |
| `/app/collaboration/resolved` | Resolved discussions |

`collaboration/new` is registered **before** `collaboration/:threadId` to prevent
shadowing. There is no `/app/comments`, `/app/threads`, `/app/chat`, or `/app/messages`.

Collaboration reaches the document tab bar as a **tab**, not as a top-level sidebar
item — the same shape as the C37 Workflow tab.

## 4. Visibility — five levels, one resolver

```
internal-workspace     Permitted Workspace Members who already have document access
internal-team          Permitted Members of the selected Team who already have access
owner-and-reviewers    Owner, sender, and explicitly assigned internal reviewers
participant-visible    A controlled recipient projection — separate permission required
personal-draft-note    You only. Not Admins, not reviewers, not participants.
```

`DEFAULT_COLLAB_VISIBILITY` is `internal-workspace`. **Participant Visible is never a
default and is never reachable by accident.** Internal content never becomes
Participant Visible automatically.

**`resolveThreadVisibility()` is the only implementation.** Every read path calls it —
list, detail, search, mentions, Collaboration Center, and the counts on the document.
Its order is deliberate:

1. **Personal Draft Notes first, and absolutely.** A Workspace Administrator, the
   document owner, and an assigned reviewer are all denied equally. There is no
   elevation path, and the note's *existence* is not disclosed either.
2. **Document access before thread rules.** A thread can never be the reason someone
   reaches a document they could not otherwise open.
3. **Workspace boundary**, then thread visibility.

Outcomes are `allowed` / `restricted` / `unavailable`. A `restricted` thread may appear
as a row saying only that a discussion exists — never its title, body, author, or
participants — so a count is never silently wrong. `getThread()` refuses `restricted`
at the service boundary; the caller is never handed content it is trusted to hide.

## 5. The four centralized resolvers — `services/collaboration.resolver.ts`

One implementation each. No screen, component, or hook re-implements any of it.
All four fail **closed**.

1. **`resolveThreadVisibility`** — who may see a thread, and how much (§4).
2. **`resolveThreadActions`** — returns availability **and a reason** for all 22
   actions. No control anywhere is silently disabled; a disabled control with no
   explanation was a repeat finding in earlier audits.
3. **`resolveMentionEligibility`** — who may be mentioned (§6).
4. **`resolveAnchor`** — where a reference points and whether it still resolves (§7).

Plus the shared derivations that must not diverge between screens: `buildReviewSummary`,
`resolvePreparationReadiness`, `applyCollaborationQuery`, `sortThreadSummaries`.

## 6. Mentions — a pointer, never a grant

Only members who **already have access to this document** *and* would already be able
to read a thread at that visibility are eligible. Everyone else is excluded **by count
only** — listing their names would itself leak Workspace membership to someone not
entitled to see it.

- Personal Draft Notes cannot mention anyone: no notification, nobody else can see it,
  so a mention would be meaningless and misleading.
- **Contacts are never mentionable.** A Contact is a directory entry, not a Workspace
  Member; mentioning one would imply an access relationship that does not exist.
- Suspended, deactivated, and other-workspace members are excluded.
- Capped at 10 per comment, enforced in `clampMentions()` at the model boundary.
- **Re-validated at write time**, not only in the picker: a caller that skipped the
  picker cannot mention someone without access.

Fixtures prove each exclusion: Paolo Diaz (no document access), Teodoro Salazar
(suspended), Beatriz Ocampo (another workspace).

## 7. Anchors — references, not annotations

Eleven anchor types (document, page, template field, participant role, routing stage,
transaction setting, verification, folder, tag, bulk-send review, preparation step).

An anchor carries an opaque resource ID and a safe label. It contains **no** PDF text,
document body, signature or initials representation, recipient field value,
authentication or consent evidence, IP address, device information, access token, or
Evidence payload. Nothing here modifies a PDF.

A **stale** anchor never breaks its thread: the thread stays readable and the anchor
degrades to a labelled, non-navigable line with an explanation. `thr_004` is seeded
against a removed field so this path is demonstrable rather than theoretical.

## 8. Plain text only

Comments are typed into a plain `<textarea>`, normalised by
`normalizeCollaborationText()` (control characters stripped, whitespace collapsed,
length capped), stored as plain text, and rendered as plain text through React's
normal escaping.

**`dangerouslySetInnerHTML` appears nowhere in this feature**, and no rich-text editor,
Markdown renderer, HTML sanitiser, emoji picker, attachment uploader, chat SDK,
realtime SDK, WebSocket library, or presence library was added. **No dependency was
added at all.**

Limits: comment 2000, Personal Draft Note 1000, title 140, resolution summary 600,
review name 120, mentions 10.

## 9. Internal review

Statuses: draft · review-requested-demonstration · in-review · changes-requested ·
ready-for-preparation · resolved · archived · unavailable.

- **Assigning a reviewer never grants document access.** A reviewer without access is
  shown as `unavailable` **with the reason**, rather than silently treated as assigned
  or quietly given entry. `rev_001` includes exactly this case.
- **You can only record your own response.** `updateMyReviewerResponse()` looks the
  caller up in the reviewer list and refuses if they are not there. There is no path
  to respond on anyone else's behalf.
- "Ready for Preparation" is **internal readiness direction only**. It is not
  participant approval, not legal approval, and not Evidence.
- Internal reviewers are **not** participants and never appear in My Actions.

## 10. Blocking and preparation readiness

`blocking-demonstration` produces frontend preparation **warnings** and nothing else.
It enforces nothing in production and never blocks a participant action. Every surface
that shows it repeats that sentence (`COLLAB_BLOCKING_NOTICE`).

`resolvePreparationReadiness()` combines blocking threads, missing reviewer responses,
and attention-flagged threads into warnings — never into enforcement.

## 11. Resolution

Resolving records a summary, who resolved it, and when. The wording is always
"Resolved in Frontend State", and every surface adds: *this does not complete the
transaction and is not proof that review occurred.*

Reopening **preserves the prior resolution** in `priorResolutions` rather than
discarding it, so the record that a resolution was once made is never quietly erased.
`thr_003` demonstrates a reopened thread with its earlier resolution intact.

Archiving is **not deletion** — content is retained exactly as it was.

Removing a comment clears its body and mentions immediately, so removed text is not
retained anywhere it could later be read back.

## 12. Permissions

**No new `PlatformPermission` values.** `buildCollaborationPermissionContext()` maps the
existing ones in exactly one place: `view_documents` → read, `prepare_documents` →
write/resolve/mention, `manage_team` additionally required to moderate others' comments
and to mark blocking.

`manage_workspace` is deliberately **not** sufficient for private thread access. Being a
Workspace Administrator never automatically grants access to a private document thread
or to anyone's Personal Draft Notes.

Participant Visible requires a **separate entitlement** (`canCreateParticipantVisible`),
false in every current scenario. Existing Participant Visible threads stay readable; new
ones cannot be created, and the UI explains why rather than hiding the option.

## 13. Storage and privacy

Nothing is written to `localStorage` or `sessionStorage`. Threads, comment bodies,
Personal Draft Notes, mentions, reviewer responses, and collaboration activity live in
memory only and are cleared on:

- **sign-out** — `resetCollaborationDemonstration()`
- **workspace switch** — `clearWorkspaceScopedCollaboration(workspaceId)`

Both are wired in `PlatformContext`. Comment text must never survive into the next
account's session.

**No comment content appears in any URL, route title, route description, breadcrumb,
analytics name, or metadata.** Route titles are generic ("Discussion | LAGDA") and carry
no thread title, member name, document name, or dynamic ID. Nothing is logged.

Collaboration activity records carry a type, a timestamp, an actor, and a safe
description — never comment text, note text, or removed content.

## 14. Boundaries with existing systems

| System | Boundary |
|---|---|
| **Transaction Activity** (`ActivityEvent`) | Untouched. Collaboration Activity is separate and explicitly not immutable. |
| **Evidence** | Never written. Comments create no Evidence. |
| **My Actions** (`models/inbox.ts`) | Never touched. Internal reviewers are not participants. |
| **Participants** (`ParticipantRole`) | Never reused. Internal types are `CollaborationReviewer*`. |
| **Verification** | Read-only reference at most. Never mutated. |
| **Notifications** (C28) | No second notification system. |

`RecipientContext.tsx` already has a recipient-facing "Reviewer decision" — the highest
confusion risk in this command. Every internal type is prefixed `Collaboration*`, so the
two can never be conflated.

## 15. Integrations wired

- **Document Details** — a Collaboration tab, capability-gated, requiring only read
  access (someone who can read a document should see the discussion about it).
- **Global Search** — thread **titles** only, `internal-workspace` visibility only, plus
  Collaboration Center and My Mentions destinations. Comment bodies, Personal Draft
  Notes, mention text, resolution summaries, and restricted-thread titles are never
  searched or surfaced. Team-scoped and owner-and-reviewers threads are excluded because
  that check needs a per-viewer context the search module does not have — excluded
  rather than guessed at.
- **Command Palette** — four navigation commands, present only when the capability
  resolves available. None posts a comment, mentions anyone, resolves a thread, or
  changes a review response.
- **Session lifecycle** — sign-out and workspace-switch cleanup (§13).

## 16. Fixtures

Eleven threads across six documents, exercising: needs-attention, blocking, reopened
with prior resolution, stale anchor, Personal Draft Note, resolved with an edited and a
removed comment, team-scoped (restricted for non-members), Participant Visible,
archived, and one deliberately in **another workspace** so the workspace boundary is
exercised rather than merely asserted.

Two reviews (one with a no-access reviewer), three mentions (one whose destination is
gone), and two documents with no collaboration at all so the empty state is reachable.

All fictional; reserved example domains; stable IDs; internal member IDs and the
workspace ID match the C37 signing-workflow directory.

**Recorded inconsistency, not silently absorbed:** `MOCK_CURRENT_USER` and the
workspace-admin fixtures use `ws_mls_001`, while the document fixtures still carry the
older `ws_northbridge_001`. Collaboration is scoped to the **session** workspace so its
visibility check is live rather than vacuous. This pre-existing repository
inconsistency is left for a separate reconciliation.

## 17. Forbidden claims — none made

No claim of legally valid review, legally binding approval, Supreme Court approval or
accreditation, full compliance, certification, notarization, blockchain verification,
tamper-proofing, or an immutable audit trail. No eNotary thread, comment, mention,
review, or workflow exists. **Burgundy #67023B appears nowhere in this feature.**

## 18. Verification performed

- `npm run build` — **passes**. Chunks: `CollaborationThreadPages` 19.9 kB,
  `CollaborationTab` 7.5 kB, `CollaborationReviewPage` 7.0 kB,
  `CollaborationCenterPage` 6.7 kB, `useCollaboration` 15.2 kB.
- Strict type-check of every new and modified file — **zero errors**.
- Full-repo strict type-check: **160 errors before C34, 160 after** — zero added.
- **No dependency added or removed.**

## 19. Known limitations — honest

1. **No automated tests.** The repository still has no test framework, `tsconfig.json`,
   or ESLint, so the command's test steps could not be written or run. Verification is
   the production build plus strict type-check via a temporary config.
2. **Reviewer assignment has no UI editor.** `saveReview()` accepts reviewers,
   required counts, categories, and the blocking policy, and is exercised by type; the
   review screen currently reads and lets you record **your own** response only.
3. **Visibility, priority, and category changes are service-only.** The methods exist
   and are permission-checked; the thread screen exposes resolve, reopen, blocking,
   archive, and restore, but not a visibility or category editor.
4. **Comment editing has no UI entry point.** `editComment()` exists and enforces
   authorship; the screen offers removal, not in-place editing.
5. **Notifications, Reports, and Dashboard are not wired.** Global Search and the
   Command Palette are (§15); a mention creates no Notification Center entry.
6. **Prepare Document, Field Placement, and participant configuration do not yet link
   into collaboration.** The anchor types and destinations exist; the reverse links
   from those screens are not placed.
7. **`teamId` on newly created team-scoped threads is fixed to the Legal Review team.**
   There is no team picker yet.
8. Pre-existing repo type errors are unchanged (160 full-repo, including
   `data/mock/templates.ts`).

Items 2–7 are the honest remainder of Command 34.

# Audit trail — product inventory

**Command:** BACKEND-43 §0 · **Date:** 2026-08-11
**Method:** read the LAGDA frontend and the backend as they stand. No audit
surface invented, no compliance dashboard assumed.

## The finding that reframes the command

**The evidence store has zero producers.** `evidence_events` has existed since
migration 003 with thirteen event types, a closed actor model, RLS, forced
privilege separation and a timeline index. Searching every non-test file in
`packages/application`, `packages/api` and `packages/worker` for a call to
`.append(` returns **only the repository contract test suite**.

Not one use case writes an evidence event. Not request creation, not send, not
authentication, not the ceremony, not consent, not submission, not any
completion step, not final sealing.

This is not a discovery so much as a confirmation — it is written down in
`signing-ceremony.ts`:

> **Evidence events.** `evidence_events` exists and NO use case in this codebase
> writes one — not request creation, not send. Writing the first one here would
> produce a trail with a hole in the middle. […] Wiring the lifecycle into
> evidence is one cross-cutting command's job.

**BACKEND-43 is that command.** §8 anticipates finding a partially populated
store and asks to "finalize event taxonomy, ensure event producers are complete,
create projection/read model". The taxonomy exists and is good; the producers do
not exist at all. So the weight of this command sits in §146 — eight authoritative
transitions that must each gain a transactionally-coupled, idempotent event —
rather than in the projection.

## What the product actually has

### The real surface: the transaction detail timeline

`TransactionDetailPage.tsx` renders an activity timeline from `ActivityEvent`,
filtered by category, paginated, with an expandable detail row per event. This
is **the** private audit surface in the product.

The model in `models/transaction-detail.ts` declares **37** `ActivityEventType`
values against the backend's 13. The difference is not drift: the frontend's set
covers delivery (`invitation-delivered`, `-bounced`), reminders, workflow
mechanics (`routing-step-started`) and settings changes — most of which are
BACKEND-44/45 territory or general workspace audit rather than signing evidence.
`EVIDENCE_ARCHITECTURE.md` §3 already recorded that split deliberately.

### The privacy policy is already decided, in the product

Measured from `TransactionDetailPage.tsx`, not inferred:

| Line | Statement |
|---|---|
| 5 | "Never log OTPs, tokens, or passwords. **Never display raw IP/location/device data.**" |
| 838 | "**Email addresses are masked for privacy.** Contact details are visible to workspace owners only." |
| 875 | Renders `p.emailMasked`, never a raw address |
| 1235 | "Aggregate device and network region summaries only. Exact IP addresses, precise location coordinates…" |

The timeline row itself displays `actorName`, `actorType` and `participantName`.
No IP, no user agent, no email address.

So §187/§188 do not need a judgement call — the product has made it. The backend
must match it rather than propose its own.

### The marketing pages are not the product

`pages/public/features/AuditTrail.tsx`, `pages/public/security/SecurityAuditTrail.tsx`
and `pages/public/esignature/EsigVerificationAudit.tsx` all contain audit
timelines with export affordances. All three are **marketing pages** built from
hardcoded `content.ts` arrays.

They are the only place an "export audit trail" affordance appears anywhere in
the codebase. §113 asks whether BACKEND-43 should build an export; the answer is
that the product has no export UI, only an advertisement of one.

A detail worth recording: the marketing page displays `LAGDA-VER-2026-004821`,
which does not match the canonical verification format BACKEND-42 enforces
(`LAGDA-VER-\d{4}-[0-9A-Za-z]{10}` — ten characters, not six digits). Marketing
copy showing an invalid reference is harmless today and would be confusing the
first time a real one appears beside it.

## Classification

| Surface | Class | Reasoning |
|---|---|---|
| **SIGNING REQUEST TIMELINE** | **IMPLEMENT_NOW** | The real product surface. `TransactionDetailPage` renders it today from mock data. |
| **WORKSPACE AUDIT VIEW** | **DEFER** | `ActivityPage.tsx` exists but spans settings, security and automation events — general workspace audit, not signing evidence. BACKEND-43 is scoped to the signing transaction (§101 request-scoped). |
| **DOCUMENT AUDIT VIEW** | **NOT_IN_PRODUCT** | No per-document audit surface distinct from the transaction timeline. |
| **RECIPIENT TIMELINE** | **FOUNDATION_ONLY** | Events carry `recipientId`, so a per-recipient filter is a projection concern. No separate UX exists. |
| **RECIPIENT LIMITED AUDIT VIEW** | **NOT_IN_PRODUCT** | The signing ceremony shows the signer their own progress, not a history. §105 makes this conditional on the UX existing; it does not. |
| **PUBLIC AUDIT SUMMARY** | **NOT_IN_PRODUCT** | §109/§110 default. BACKEND-42's projection stays the only public surface. |
| **AUDIT PDF EXPORT** | **NOT_IN_PRODUCT** | Marketing only. The completion certificate (BACKEND-40) already is the curated PDF evidence artifact (§114, §214). |
| **AUDIT CSV EXPORT** | **NOT_IN_PRODUCT** | Appears nowhere, including marketing. |
| **AUDIT JSON EXPORT** | **FOUNDATION_ONLY** | The read API response satisfies programmatic need (§115). No download packaging; BACKEND-54 owns export. |
| **FILTER EVENTS** | **IMPLEMENT_NOW** (client-side) | The page filters by category and paginates locally. Event counts per request are bounded (§91), so the API returns the full ordered set and the client filters. No server-side filter API. |
| **DOWNLOAD CERTIFICATE** | **DEFER** | The certificate artifact exists (BACKEND-40) but no download route exists anywhere — see OD-171's note that the product has no download UX. Not BACKEND-43's to add. |

## What this means for the command's shape

1. **§146 is the bulk of the work**, not §164. Eight producers, each inside the
   transaction that owns its authoritative fact.
2. **The taxonomy needs additions, not a rewrite.** The 13 existing types cover
   most of §316's inventory; completion-pipeline events (field merge,
   certificate, final seal, completion-ready) and routing activation have no
   type yet.
3. **A migration is required** (§301). `event_version`, `source_type` and
   `source_id` do not exist, and §46 forbids relying on check-then-insert for
   idempotency. `details_version` exists but is NULL whenever `details` is NULL,
   so it cannot serve as the mandatory per-event version §12 requires.
4. **The projection is small.** One request-scoped read, curated, with a
   server-side presenter — and the product's own privacy rules to obey.
5. **No export.** §113's preferred direction and the product agree.

# Completion — product inventory

**Read before the architecture.** Searched for `processing`, `completing`,
`finalizing`, `completed`, `signed document`, `final document`, `certificate`,
`download completed`, `preparing completed document`, `completion failed`,
`processing signature` across `src/app`.

## The headline finding: the product has no completion PROCESSING state at all

The frontend goes straight from "all recipients signed" to `completed`. There is
no "Finalizing", no "Preparing your document", no "Completion failed", no retry
affordance and no support-contact path for a failed completion.

That is not an omission to fill in. It is why §18–§20 are right: **the request
must stay `COMPLETION_READY` while the pipeline runs**, because there is no
product state to show for anything else, and inventing one would be inventing
product.

| Concept | Verdict | What the product actually says |
|---|---|---|
| COMPLETION AUTOMATIC START | **IMPLEMENT_NOW** | Nothing in the product asks a human to start completion. The recipient's last screen says the sender's workspace "manages access to completed document packages" — it happens on its own |
| PROCESSING STATE | **NOT_IN_PRODUCT** | Zero matches for finalizing / processing / preparing across every status map, model and page. `status-map.ts` has no such entry |
| COMPLETION RETRY | **NOT_IN_PRODUCT** (backend-only concern) | No UI, no copy, no control. Retry is infrastructure and must stay invisible |
| COMPLETION FAILURE UI | **NOT_IN_PRODUCT** | No "completion failed" copy anywhere. §147's generic message has nowhere to render yet |
| FINAL DOCUMENT DOWNLOAD | **DEFER** | `TransactionDetailPage` imports a `Download` icon and no completed-document download flow exists. `CompletionPage.tsx:144` tells the recipient to "Contact the sender directly if you require a copy" |
| CERTIFICATE DOWNLOAD | **DEFER** | No certificate concept in `transaction-detail.ts` at all |
| COMPLETED STATE | **IMPLEMENT_NOW (guard only)** | `status-map.ts` — "All parties have completed the required actions", `isTerminal: true`. BACKEND-38 defines when it is LEGAL; BACKEND-41 makes it reachable |
| MANUAL RETRY | **NOT_IN_PRODUCT** | No control. §143 defers it to BACKEND-59 |
| MANUAL SUPPORT REPAIR | **NOT_IN_PRODUCT** | Same |

## What the product DOES have that constrains completion

**A verification record with an optional `verificationId`.**
`transaction-detail.ts:320,341` — `VerificationRecordSummary` with a
`recordStatus` and an optional id. `CompletionPage.tsx:138` frames it as
"Verification (Production Context)". So the verification identity has a product
home, and BACKEND-38 must leave a slot for it rather than generate one (§201).

**Three artifact types, already in the database since migration 003.**
`original`, `sealed`, `completion-certificate`. There is **no
merged-candidate type**, which is the product-and-schema confirmation of the
architectural decision recorded in `COMPLETION_ARCHITECTURE.md`: field merge and
certificate rendering are not separately persisted artifacts in LAGDA, because
`DocumentSealer.seal()` produces the sealed document and the certificate
together as its two outputs.

## Consequences for the request state model

Because there is no processing state in the product:

- `SigningRequest.state` stays `completion-ready` for the whole pipeline.
- **No `COMPLETING` request state is introduced** (§19). The `CompletionRun`
  carries processing state, and a sender-facing projection can derive
  "finalizing" from `request = completion-ready` + `run = processing` on the day
  the product grows a screen for it (§146).
- Nothing user-visible changes until `completed`, which is exactly what §295
  requires the frontend to honour.

## What this inventory refuses to invent

A processing status, a failure status, a retry button, a download route, a
certificate viewer, and a support-repair flow. Every one of them is a real
product surface with real copy decisions, and none of them exists. The backend
records the facts they would need — run state, failure classification, attempt
count, artifact identities — and stops there.

# Signing state data classification

| Value | Class | Notes |
|---|---|---|
| `signing_requests.state` | WORKFLOW STATE | Bounded enum. Safe as a metric label and in a sender-facing DTO |
| `signing_request_recipient_activation.recipient_state` | WORKFLOW STATE | Bounded enum. Says a position, never an identity |
| `.activated_at` | WORKFLOW / EVIDENCE METADATA | When their turn came |
| `signing_recipient_progress.first_entered_at` | WORKFLOW / EVIDENCE METADATA | BACKEND-35's, unchanged |
| `.signed_at` | **EVIDENCE METADATA** | The authoritative signing instant. Equal to `recipient_submissions.accepted_at` by construction |
| `.submission_id` | INTERNAL SIGNING RECORD ID | Traceability. Never projected to a recipient |
| `.declined_at` | EVIDENCE METADATA | |
| `.decline_reason` | WORKFLOW METADATA | A closed five-value code. The free-text note is deliberately not stored |
| `signing_request_recipients.routing_order` | WORKFLOW METADATA | An integer. Not a metric label — unbounded in principle |
| `signing_requests.completion_ready_at` | WORKFLOW METADATA | The transition time. **Not** `completed_at` |
| `.terminated_at`, `.termination_reason` | WORKFLOW METADATA | Bounded |
| `.cancellation_note` | **WORKSPACE-AUTHORED CONTENT** | Bounded at 200. Never logged, never in telemetry, never sent to a recipient |
| `signing_workflow_advance_intents.*` | INTERNAL IDENTIFIERS | Opaque ids, a bounded trigger, an attempt count, a bounded failure code. No RLS, and this row is why that is acceptable |

## What never appears in state telemetry

- recipient email or name (§197)
- signature content or any field value (§199)
- an access credential, a digest, or a signing URL (§198)
- a workspace, request, recipient or submission id as a METRIC LABEL (§277)

The advance returns `WorkflowAdvanceOutcome` — six bounded values — plus counts.
Counts, never lists: a list of activated recipients would be unbounded
cardinality and a disclosure in the same field.

An architecture guard asserts the workflow module never mentions
`recipientEmail`, `recipientName`, `credentialDigest`, `rawToken`, `textValue`
or `rasterBytes`.

## The one place unbounded text could have entered a durable row

`signing_workflow_advance_intents.last_failure_code`. It takes a code from a
closed set, is bounded at 64 characters by the column, and the repository slices
to that width rather than trusting the caller. The reconciler's catch block
deliberately does NOT pass the error object: an exception message is unbounded
text that may carry a value from the row it failed on.

## What a recipient is told

`SigningBlocker` — five values, all safe to hand to the recipient who asked.
They have already authenticated as themselves, so "the sender cancelled this"
discloses nothing they are not entitled to, and is the difference between a
usable product and a mysterious one.

The recipient is never told the cancellation NOTE. That is the sender's words
about their own document.

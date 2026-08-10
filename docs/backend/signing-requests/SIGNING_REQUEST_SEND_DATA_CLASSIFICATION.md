# Send data classification

| Item | Class | Log? | Metric label? | On the wire? |
|---|---|---|---|---|
| `sentAt` | Workflow state | Yes | No | Yes |
| Request `state` | Workflow state | Yes | No | Yes |
| **Raw bootstrap credential** | **SECRET** | **Never** | Never | **Never** |
| **Full signing URL** | **SECRET** | **Never** | Never | **Never** |
| `credential_digest` | Sensitive | **Never** | Never | **Never** |
| `sealed_credential` | **SECRET at rest**, encrypted | **Never** | Never | **Never** |
| `SigningAccessGrantId` | Internal | Not routinely | Never | **No** |
| `DeliveryIntentId` | Internal | Not routinely | Never | **No** |
| Recipient email / name (in the intent) | **PII** | **Never** | Never | Only via the request detail |
| `document_title` (in the intent) | Business-sensitive | **Never** | Never | Via the request detail |
| `sender_display_name`, `workspace_name` | Business metadata | **Never** | Never | No |
| Activation state | Workflow state | Aggregate only | No | Counts only |
| `routingShape` | Derived, 3 values | Yes | **Yes** — bounded | No |
| Recipient / activated counts | Operational | Yes | **No** — unbounded | Yes |
| Subject / message | N/A | — | — | — (not in product) |

## What is logged

```
signing_request.sent
  workspaceId, signingRequestId, actorUserId,
  activatedRecipientCount, waitingRecipientCount
```

A security event as well as telemetry: it records that a sender committed a
workflow. It does **not** prove any recipient received anything, and the name
deliberately does not say "delivered".

Nothing else. No recipient, no credential, no digest, no link, no title, no
delivery intent id. The route test asserts the whole serialized line against
real PII fixtures — a name, an address, a matter title and a field label.

## What is measured

`signing_request_send_results_total`, labelled `result`, `routingShape`,
`processRole`.

`routingShape` is bounded to three values and derived by the domain.
Deliberately **not** the recipient count, the cohort number, the request id or
the workspace id: the first two are unbounded, the last two would make one time
series per document — and a metric label is the most widely replicated string in
an observability stack, which is the last place a credential should be able to
reach.

## The credential's lifetime in memory

Generated in one local, passed to the sealer, and referenced nowhere else — not
a log, not an error message, not a return value, not a queue payload. It is not
placed in the exception context of any failure, and the sealer's failure mode
throws a message that names no value.

## Provider payloads

BACKEND-45 must not log a provider request that contains the rendered email:
that body holds the signing URL. Redact at the boundary.

## Retention and erasure

Grants and intents cascade from the request recipient, which cascades from the
request.

OD-110 (erasure) now reaches its **fourth** place, and this one has an unusual
property: the delivery intent holds a recipient's email in a record whose
purpose is operational rather than legal. Once BACKEND-45 has dispatched it, the
snapshot has no further use — a retention rule that clears dispatched intents
after a window would reduce the PII surface without touching the legal record.
Not implemented; recorded as a concrete option OD-110 can take.

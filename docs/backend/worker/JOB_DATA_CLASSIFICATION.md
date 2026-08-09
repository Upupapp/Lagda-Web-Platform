# Job Data Classification — BACKEND-16

A job payload is a **durable row in a database table**. It survives restarts,
appears in backups, and is readable by anyone with database access. It is not a
function argument.

## The rule

**Jobs carry identifiers. Handlers reload authoritative state.**

| Allowed in a payload | Never in a payload |
|---|---|
| Resource IDs (`workspaceId`, `documentId`) | Document content or any file bytes |
| A batch size, a bound, a count | Names, email addresses, phone numbers |
| An enum discriminant | Session tokens, CSRF tokens, API keys |
| A digest already stored elsewhere | Signature images, drawn marks |
| A UTC instant that is part of the *intent* | A password or credential of any kind |

Two reasons beyond privacy:

1. **Payloads go stale.** A name copied into a payload at enqueue is wrong by the
   time a delayed job runs. Reloading by ID is correct by construction.
2. **Payload size is bounded** at 16 KiB, and enqueue refuses anything larger. A
   payload that large means someone is queueing a resource rather than a
   reference to one.

## Validation at execution time

Payloads are validated by the handler at runtime, **not** trusted because LAGDA
wrote them. A queue holds rows written by a *previous deployment*, and may hold
rows written by an operator by hand.

`parseCleanupPayload` rejects `{}`, `{ batchSize: 0 }`, `{ batchSize: "many" }`,
`{ batchSize: 10, extra: true }` and `null` — each as a `TerminalJobError`, since
no amount of retrying will make a malformed payload valid. `additionalProperties`
is false: an unexpected field means the payload was written against a different
contract.

## Job type names are a persistence contract

Once a name has been written to a durable queue row, renaming it strands every
job already enqueued under the old name — they are never consumed and never
fail, they simply sit there. `JOB_TYPES` is a closed union for this reason, and
adding to it is cheap while changing it is not (INV-197).

## What the logs contain

The worker logs the **result shape** of a handler, never `job.data`:

```ts
...(typeof result === "object" && result !== null ? result : {}),
```

A payload may carry resource identifiers, and a full dump is how those reach log
aggregation. Fields logged per job: `jobId`, `jobType`, `attempt`, `durationMs`,
`result`, and on failure `errorCategory` and `error` (INV-198).

`error` is the exception's message. **A handler that puts a payload value into an
error message would leak it**, and nothing prevents that today — the API's log
redaction (`redactLogObject`, `scrubSecretsFromText`) is not applied to worker
output, because the worker does not import `@lagda/api`. This is a real gap, not
a theoretical one, recorded as OD-049.

## Tenancy

Every job declares `tenantScope` explicitly — `"workspace"` or `"system"` — as a
discriminant, never an optional `workspaceId` where `undefined` means "global".
That is the shape BACKEND-07 rejected, because it makes the most dangerous value
the easiest to produce by accident (INV-202).

Both jobs defined so far are `system`. **No workspace-scoped job exists yet**, so
the question of how a worker establishes RLS tenant context for a job is
unanswered and untested (OD-045). The `WorkspaceJobContext` type exists and its
`workspaceId` is non-optional, but nothing constructs one.

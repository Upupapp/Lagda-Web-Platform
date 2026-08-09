# Upload Consistency — BACKEND-18

Object storage and PostgreSQL are not transactionally atomic and never will be.
This document says exactly what happens at each failure point. No vague language.

## The ordering, and why

```
1. receive under a bound        no state yet
2. write QUARANTINE object      bytes exist, nothing references them
3. insert upload row            row references the quarantine object
4. inspect + scan               no state change
5. write ACCEPTED object        bytes exist at the artifact key
6. commit: artifact row + upload status = accepted     ONE transaction
7. delete quarantine            best effort
```

**Bytes before metadata, always.** The reverse ordering produces a row claiming
an artifact whose bytes do not exist — a document the product believes it has,
which is far worse than bytes nobody references.

## Every failure window

### A. Quarantine write fails (step 2)

- **State:** nothing. No object, no row.
- **Client:** `503 storage-failure`.
- **Recovery:** none needed. The client retries.

### B. Upload row insert fails (step 3)

- **State:** an orphan quarantine object. No row.
- **Client:** the request errors.
- **Recovery:** the object is unreferenced and private. It is **not** reachable
  by the cleanup job, which reads rows — so this specific orphan persists until a
  storage-side lifecycle rule removes it. That gap is real and recorded (OD-061);
  a quarantine bucket lifecycle rule is the intended fix, and it is a deployment
  setting rather than code.

### C. Inspection or scan rejects (step 4)

- **State:** quarantine object + row marked `rejected` with a reason.
- **Client:** `415` / `422` / `503` by reason.
- **Recovery:** the cleanup job deletes the quarantine object from the row.
  Deleting inline was deliberately avoided — a rejection path that performs
  storage I/O is a rejection path that can itself fail.

### D. Accepted-object write fails (step 5)

- **State:** quarantine object + row. **No accepted object, no artifact row.**
- **Client:** `503 storage-failure`, upload marked `failed`.
- **Recovery:** the quarantine copy is deliberately **not deleted** — it is the
  only remaining copy and a retry would need it.

### E. Acceptance transaction fails (step 6) — the dangerous one

- **State:** accepted bytes exist at the artifact key. **No artifact row.**
  Quarantine object still present.
- **Client:** `503`, upload marked `failed`. **Nothing user-visible was
  accepted**, which is the property that matters.
- **Recovery:** the orphan accepted object is private and unreferenced.
  Nothing serves it, because serving requires an artifact row, which requires a
  tenant-scoped lookup.
- **Why it is not deleted:** the transaction outcome is uncertain at that moment.
  Deleting on uncertainty is how a real artifact gets destroyed. A retry mints a
  new artifact id and therefore a new key, so it cannot collide; and if a retry
  ever reused the id, BACKEND-17's create-once semantics converge on identical
  bytes and refuse different ones.
- **Tested:** the acceptance transaction is forced to fail and the test asserts
  no artifact was committed, the upload is `failed`, and exactly one orphan
  object remains.

### F. Quarantine delete fails (step 7)

- **State:** everything succeeded; the quarantine object lingers.
- **Client:** **`201 accepted`.** The upload is complete and the accepted copy is
  authoritative.
- **Recovery:** the cleanup job removes it later.
- **Why the request still succeeds:** failing here would tell a user their
  document was rejected because LAGDA could not tidy up. Tested.

## What the database enforces on its own

Two CHECK constraints, so an orchestration bug cannot record an impossible
state:

- an upload with status `accepted` **must** name an artifact, and a
  non-accepted upload **must not**;
- an upload with status `rejected` or `failed` **must** carry a reason.

A compound foreign key `(workspace_id, accepted_artifact_id)` makes cross-tenant
promotion structurally impossible rather than merely unlikely.

Both constraints are tested by attempting the impossible insert directly.

## No long transactions

The only transaction spans step 6: one insert plus one update. Nothing about
file transfer, PDF parsing or malware scanning happens inside a transaction —
those take seconds, and a transaction held open across them would hold a
connection and its locks for the duration of an antivirus scan.

## Quarantine cleanup

- **Driven by DATABASE rows, never by listing a bucket.** A cleanup job that
  lists a bucket to decide what to delete is a job that can delete something
  real.
- **Bounded by a horizon**, so an upload still being processed is never offered
  for cleanup.
- **Idempotent.** Deleting an absent object succeeds; a cleared row is not
  returned again. Running cleanup twice is a no-op, and that is tested.
- **Rows are never deleted.** Only quarantine bytes. Knowing that a malware
  upload happened is precisely the record an incident review needs, and the
  runtime role has no `DELETE` grant on the table at all.

The cleanup **schedule** is not yet registered as a worker job. The repository
primitive, the horizon and the idempotency are implemented and tested; wiring
the recurring job needs a retention duration, which is unresolved (OD-062).

## What is NOT claimed

- No atomicity between PostgreSQL and object storage.
- No exactly-once processing.
- No automatic reconciliation of orphan objects. Windows B and E leave objects
  that only a lifecycle rule or a future reconciliation job will remove.

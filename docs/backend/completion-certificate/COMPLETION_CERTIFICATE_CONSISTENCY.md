# Completion certificate — consistency

**Command:** BACKEND-40

## CompletionRun integration

The `certificate` step is one of four in the run's ledger, executed by
`processCompletionRun` through the optional runner map BACKEND-39 established.
An unwired build parks the run with `step-not-implemented` rather than failing
requests terminally.

**Precondition:** `field-merge` SUCCEEDED and its named artifact present,
resolved by identity — never "the latest merged artifact" (§119).

## Step output

One accepted CERTIFICATE step per run, carrying the certificate `ArtifactId`.
The artifact record carries kind, media type, **observed** size, SHA-256 and
creation time; `certificateVersion` and `rendererVersion` come from the
generator result and are also rendered onto the page.

`acceptStep` returns false when the step already has an output. That is not an
error — it is a retry discovering the previous attempt's work, and §117 requires
it be REUSED rather than replaced.

## Failure windows

| Window | Run state | Recovery |
|---|---|---|
| Build/precondition failure | `failed-terminal` | Deterministic; the records must be fixed |
| Render failure (unrenderable name, unknown method) | `failed-terminal` | None — retrying reproduces it |
| Render failure (typeface unavailable) | `waiting-retry` | A redeploy fixes it |
| Upload failure | `waiting-retry` | Retry re-renders under a NEW artifact id |
| Upload OK, DB fails | `waiting-retry` | Object private and unreferenced; OD-160 sweeps it |
| DB OK, worker dies | claimable again | Retry finds the accepted step and reuses it |

Ordering is **bytes THEN row** (INV-226), asserted by a test rather than trusted
to a comment.

## Orphan objects

No certificate-specific cleanup exists, deliberately (§132).
Uploaded-but-uncommitted certificate objects are ordinary completion orphans and
are OD-160's to collect when that sweeper is built. A bespoke cleanup path would
be a second mechanism doing the same job with different bugs.

## Deleting on uncertainty

Never (§78). A failed metadata transaction leaves the object in place: deleting
on an uncertain transaction outcome is how a real artifact gets destroyed.

## Immutability of inputs

Source and merged artifacts are read and never written. A test asserts they are
byte-identical before and after a certificate run (§222).

## Duplicate workers

Cannot produce two accepted certificates: the run is claimed by a conditional
UPDATE before any step runs (BACKEND-39's restructure), and `acceptStep`'s
unique key makes a second acceptance impossible even if two attempts raced.

## Retry determinism, and its one caveat

Two renders of the SAME model are byte-identical. Two ATTEMPTS are not, because
each stamps its own `generatedAt` — which is exactly why an accepted output is
reused rather than regenerated. Without reuse, one run could hold two
authoritative certificates differing only in a timestamp, and nothing would say
which was canonical.

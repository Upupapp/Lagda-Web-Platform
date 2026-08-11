# Final completion — consistency and recovery

**Command:** BACKEND-41

Object storage and PostgreSQL cannot commit together. This is where the windows
are stated rather than pretended away.

## The choreography

```
seal (in memory)  ->  verify digests  ->  upload  ->  ONE DB transaction
```

Bytes before rows, always. A row naming an object that does not exist is a
completion the pipeline believes in and cannot deliver; the reverse leaves a
private, unreferenced object, which is recoverable.

## Every window, and what happens

| Crash / failure point | State afterwards | Recovery |
|---|---|---|
| Before sealing | Nothing written | Retry re-seals; nothing was accepted |
| Sealer fails | Nothing written, no object | Classified retryable or terminal by the sealer's own error; request stays `completion-ready` |
| Seal returns empty bytes | Nothing written | Refused before upload (§119). Would otherwise complete a request whose final artifact is empty |
| Input digest mismatch | Nothing written, no object | **Terminal.** Storage did not return the accepted bytes; sealing them anyway would make the wrong document authoritative and immutable at once |
| Upload fails | No object, no rows | Retryable. Request stays `completion-ready` (§257) |
| **Upload succeeds, DB fails** | Object exists, NO completion | Request stays non-completed (§258). The object is private, unreferenced and a reconciliation candidate. **Not deleted** — deleting on an uncertain transaction outcome is how a real artifact is destroyed (§78). A retry seals again under a NEW artifact id; the abandoned object is OD-160's to collect |
| DB commits, worker dies before responding | Completion exists | The next attempt finds it and returns `already-completed` without sealing (§109, §183) |
| Two workers reach finalization | One completion | The run claim admits one worker; `UNIQUE (signing_request_id)` is the second layer, so the race is lost cheaply rather than after the expensive work (§177) |

## The one window that is NOT self-healing

**A request marked `completed` whose final object is missing or whose digest no
longer matches.**

This is a critical integrity incident (§110, §111). LAGDA must **never**:

- silently move the request back to `completion-ready`,
- re-seal and overwrite the recorded digest, or
- repoint the completion at a different artifact.

`completed` is terminal and legally significant, and the completion row has no
UPDATE or DELETE grant — so the database will not permit the repair even if code
tried. Resolution is a deliberate, human-directed action.

The same reasoning is why **migration 028's `down` refuses** when completed
requests exist rather than reverting them.

## Why retry cannot produce a second authoritative artifact

Three independent constraints, in the order they bite:

1. The run must be **claimed** — a conditional UPDATE that exactly one worker
   wins.
2. `acceptStep` has a unique key per `(run, step)`, so one FINAL_SEAL output is
   accepted.
3. `signing_request_completions` has `UNIQUE (signing_request_id)`.

If a retry reaches sealing before any output was accepted, it may seal again —
and that is correct, because seal output is **not** byte-deterministic (§95): it
carries a timestamp. Only one result becomes authoritative, and it is the one
the constraints admit.

## What a failure never does

- It never modifies accepted submissions or field values (§187).
- It never discards the merged candidate or the certificate (§188, §189) —
  a retry reuses them.
- It never asks a recipient to sign again (§190).

A completion failure is an infrastructure problem. The signatures are already
legally significant and are untouched by it.

# What a public verification response may say

**Command:** BACKEND-42 · **Date:** 2026-08-11

## The allowlist

Six fields. Each earns its place; the test suite asserts the absence of
everything else against the whole wire body, not against a shape.

| Field | Why it is publishable |
|---|---|
| `schemaVersion` | The public contract version, so a consumer knows what it may rely on. Not the seal version, not the pipeline version. |
| `verificationId` | The caller supplied it. Echoing it confirms what was resolved. |
| `completedAt` | When **LAGDA** completed the final artifact. Not any signer's action time — that would disclose individual behaviour. |
| `participantCount` | How many acted. Never who. |
| `finalDocument.digest` | The authoritative byte-integrity value. Public by construction: it is the thing a holder compares against. |
| `seal.*` | Scheme, version, algorithm and a fixed description of what the seal is. |

## The refusals, and the reasoning behind each

**Names and email addresses.** The commonest request, and the one that cannot
be undone. `/verify` is `isIndexable: true` in the product's route config, so a
name on this endpoint is a name in a search index. There is no field for one and
no dependency that could supply one.

**Document title or filename.** A filename routinely carries the counterparty,
the matter, the amount. `Acme-Termination-Final.pdf` discloses more than a name
would.

**Any per-signer detail.** Timestamps, IP addresses, user agents, authentication
method, signature images, field values. All of it exists in the evidence record,
and all of it stays behind authorization.

**The state of a non-completed request.** Covered by the two-outcome rule.

**The original (pre-signature) document hash.** Present on the record and
deliberately not projected. It identifies the file *before* signing; publishing
it would let a holder of the original confirm that it became a completed LAGDA
document, which is a disclosure about a transaction they may no longer be party
to. Only the signed digest is published, because only the signed digest is what
a verifier's copy should hash to.

**Anything about the workspace.** Not the id, not the name, not a count. A
verification reference must not reveal tenancy — see the alphabet note in
`security/verification-id.ts`, which also refuses to encode the workspace into
the identifier itself.

## The negative test

The suite lowercases the entire response body and asserts it contains none of:

```
workspace  signingrequest  documentid  artifact  completionrun
sealid     storage         bucket      s3        recipient      email
```

A shape assertion misses a nested field; a substring sweep over the wire does
not. The same sweep runs against the file-check response.

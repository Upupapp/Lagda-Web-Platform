# File comparison

**Command:** BACKEND-42 · **Date:** 2026-08-11

```
POST /public/verifications/:verificationId/file-check
```

## What it is

A byte comparison. The uploaded file is streamed through SHA-256 and the digest
is compared against the completed artifact's `signed_document_hash`. That is the
entire operation.

## What it is not

**Not an upload.** The bytes create no `Document`, no `Artifact`, no object in
storage, and are never written to disk. They exist as a sequence of chunks
passing through a hash and are gone when the request ends.

**Not parsed.** No PDF library touches them. No page is rendered, no text is
extracted, no embedded JavaScript can run. Comparing bytes requires none of it,
and each one would be a path by which a stranger's file reaches code that does
something other than add to a digest.

The guarantee is structural, and the test asserts it structurally: the module's
entire public API is

```ts
Object.keys(module) === ["MAX_VERIFICATION_FILE_BYTES", "hashStream"]
```

One constant and one function returning a digest. There is nothing else to call.

## The digest is computed server-side

A client-supplied hash is a claim about a file nobody checked. Accepting one
would make the comparison decorative.

The route computes it and the use case takes it already computed — which is also
why `compareUploadedFile` never sees bytes and is trivially testable. The test
sends a correct digest in an `X-SHA256` header alongside deliberately wrong
bytes and asserts the answer is still `matches: false`.

## The bound

**25 MB**, enforced by counting bytes as they arrive:

- `Content-Length` is never consulted. It is supplied by the caller, and a
  chunked upload need not send one at all.
- On exceeding, the stream is **destroyed**, not drained. An attacker announcing
  a 10 GB body must not get 10 GB read before the rejection. The test counts how
  many chunks the producer was actually asked for against an endless stream and
  asserts fewer than 40 — 25 MB plus read-ahead slack, nowhere near unbounded.
- Fastify's `bodyLimit` is set to the same value, so there are two independent
  ceilings rather than one.

Memory stays bounded at the hash state plus one chunk, never the whole document.

### The content-type parser, and why it is scoped

Fastify answers 415 for a content type it has no parser for, and **every**
built-in parser buffers the whole body before the handler runs — which would
pull 25 MB into memory before anything checked its size and defeat the streaming
bound entirely.

So these routes register a no-op wildcard parser that hands the request through
untouched, and `hashStream` consumes `request.raw`. It is registered **inside a
Fastify plugin scope**. On the root instance it would change how every other
endpoint in the app treats an unrecognised body — a route module reaching out
and altering forty routes it has nothing to do with.

## A mismatch is a 200

The comparison succeeded; the bytes differ. Returning an error status would tell
a caller their request was wrong when it was answered correctly, and would
invite a UI to render a normal result as a failure.

It is also **not evidence of forgery**, and the wording must not suggest it is.
The commonest cause by far is a viewer that re-saved the PDF — which changes
bytes without changing anything a reader would notice.

## Refusals

| Condition | Response |
|---|---|
| Unknown or malformed reference | `404`, byte-identical to the GET route's |
| Over 25 MB | `413 verification_file_too_large` |
| Empty body | `400 verification_file_invalid` |
| Connection broken mid-body | `400 verification_file_invalid` |

An empty body is refused rather than hashed: zero bytes produce a valid,
well-known digest that would simply never match, answering "no match" to someone
who sent nothing. That is a worse answer than a refusal.

A broken upload never surfaces the underlying error, which can carry socket and
filesystem detail — the test asserts that `ECONNRESET` and `/var/tmp` do not
reach the caller.

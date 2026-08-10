# Recipient document access

`GET /signing/ceremony/document`

## The delivery model: BACKEND STREAM

§24 offers streaming or a presigned URL and §25 leans presigned. The decision
went the other way, and the reason is not preference:

**`ObjectStorage` has four operations — `putObject`, `getObject`, `headObject`,
`deleteObject` — and none of them mints a URL.** §25 permits presigning "if the
storage architecture supports it". It does not. Adding it would mean a new port
operation, a provider capability, and a bearer credential with a TTL to get
right, in a command that does not otherwise need one.

What streaming gives up is Range support, which nothing currently wants (below).
What it avoids is an entire class of credential.

| | |
|---|---|
| Model | **BACKEND STREAM** |
| Source | `signing_requests.source_artifact_id`, joined |
| Authorization | recipient session + full ceremony signability + consent |
| TTL | **NOT APPLICABLE** — no URL is issued |
| Range | `Accept-Ranges: none` |
| Cache | `Cache-Control: private, no-store` |
| Storage key | never leaves the application layer |

## The artifact cannot drift

`getSourceArtifact()` **takes no argument**. It joins
`signing_requests -> document_artifacts` on `source_artifact_id`, so there is no
call that could ask for the document's current artifact.

Three layers say the same thing and none of them relies on the others:

1. **The type.** No parameter exists.
2. **The query.** The join key is the frozen id.
3. **The database.** A restrictive policy admits only the artifact the session's
   request froze — integration asserts the recipient realm sees one artifact
   where the workspace realm sees two.

Worth recording separately: `document_artifacts_one_original_idx` already
forbids a document holding two `original` artifacts, so drift cannot arise from
a re-upload at all. The test that proves the point had to use a `sealed`
artifact, because the schema refused the more obvious fixture.

## Range requests

**NOT APPLICABLE, and honestly signalled.**

`DocumentReviewPage.tsx:2` says it: *"Shows fictional CSS page previews (no real
PDF)"*. There is no PDF library in the frontend — no `pdfjs-dist`, no
`react-pdf`, nothing in `dependencies`. Nothing fetches a PDF, so nothing asks
for a range.

The header is `Accept-Ranges: none` rather than absent or `bytes`. Claiming
`bytes` while ignoring `Range` would corrupt a viewer's render; saying `none`
makes it fetch whole, which is correct and slow rather than fast and wrong.

**When a real viewer lands** — pdf.js will want ranges for a large document —
the change is: add `getObjectRange` to the port, honour `Range` in this handler,
and switch the header. The authorization is unchanged, because it is per
request, not per URL.

## Download versus view

`Content-Disposition: inline`. The ceremony shows a document; it does not hand
out a file. The product has no download affordance anywhere in the recipient
flow, and adding one because the bytes are technically reachable would be a
product decision nobody made (§27).

## What never appears

No bucket, no storage key, no internal path, no artifact id header, no
`X-Storage-*`. The key exists in the application layer and reaches the storage
adapter; the route never sees it, so it cannot leak it by accident.

The digest IS exposed, in the ceremony projection rather than a header. That is
deliberate: a recipient who can record an integrity identifier can later prove
they were shown these exact bytes, which is worth more to them than the digest
is worth to an attacker who already has authorized access to the document.

## Failure

Missing bytes are an integrity failure and produce
`SigningDocumentUnavailableError`. **There is no fallback artifact and there
must not be one** (§204). The request stays `sent`; storage being down is not a
state transition, and a test asserts it.

The database transaction is closed before any byte moves (§90, §144).
Authorization and metadata come out of a committed transaction; the storage call
happens after it.

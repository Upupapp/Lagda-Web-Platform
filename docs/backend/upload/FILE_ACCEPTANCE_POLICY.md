# File Acceptance Policy — BACKEND-18

## What is accepted

**PDF only.**

Handoff §7 lists "PDF (primary), DOCX, DOC (future)". *Future* means not now,
and accepting a DOCX while labelling it a PDF would put a document nobody can
sign into the signing ceremony. A DOCX, a PNG, a ZIP or an HTML file named
`contract.pdf` is refused with `unsupported-file-type`.

## How type is determined

Content, in two stages, both required:

1. **Signature detection** (`file-type`) — what the bytes actually are. This is
   what names the rejection when an HTML file arrives as `.pdf`.
2. **Structural parse** (pdf-lib, inside `@lagda/sealing`) — does it parse, does
   it have a page tree, are the page sizes usable.

Detection alone is insufficient: a polyglot begins with a valid PDF signature.
Parsing alone is insufficient: it gives no clear answer about what a rejected
file *was*. Removing either makes tests fail.

## Limits

| Limit | Value | Kind |
|---|---|---|
| Maximum file size | **25 MB**, configurable | **PRODUCT — NOT DECIDED.** Handoff §7 says "to be determined (suggest 25MB)". The suggestion is the default (OD-056) |
| Maximum pages | **2 000** | **TECHNICAL SAFETY.** Not a plan limit. A small file can declare a pathological page tree, and field placement and rendering must not be handed one |
| Minimum size | 1 byte | A zero-byte file is not a document |
| Minimum pages | 1 | Nothing can be signed on a zero-page PDF, and field placement has nowhere to place anything |
| Absolute technical ceiling | 512 MB (storage adapter) | A backstop, far above the product limit |

## Encrypted PDFs: REJECTED, explicitly

Password-protected PDFs are refused at upload with
`encrypted-pdf-unsupported`, not accepted and then discovered to be unreadable
during preparation or signing.

The parser is loaded with `ignoreEncryption: false` so encryption throws rather
than producing an unusable document. Flipping that flag makes a test fail.

## Malformed PDFs: REJECTED

Two distinct failures, both covered:

- **Unparseable** — a truncated or corrupt body. Caught by the parser.
- **No page tree / zero pages** — parses, but has nothing to sign. Caught
  separately, because pdf-lib reads some structurally empty documents without
  complaint.

Each is probed independently: removing either check leaves the other's tests
green, which is how a half-removed guarantee would otherwise hide. The zero-page
case needed a hand-built PDF, because pdf-lib **adds a default page** when
saving an empty document — so the obvious fixture silently produced a one-page
file and proved nothing.

## Malware: MANDATORY

Every accepted document has passed a real malware scan. There is no
configuration that disables it, and no environment in which uploads work without
a scanner — see MALWARE_SCANNING.md.

## Active PDF content: NOT sanitized

This is the most important limitation on this page, so it is stated plainly.

PDFs can contain JavaScript, launch actions, embedded files, form actions and
external references. **LAGDA does not remove any of them.** What LAGDA does:

- refuses files a real antivirus engine flags,
- refuses files that do not parse,
- never executes, renders or opens a PDF outside the parser,
- never rewrites the bytes, so the digest keeps describing the uploaded file.

**AV plus parsing is not sanitization**, and nothing in the codebase claims it
is. Full active-content stripping requires a dedicated, proven sanitizer, and it
would produce *different bytes* — which under LAGDA's integrity model is a
**different artifact** with its own digest and provenance, not a quiet rewrite of
the original. That is BACKEND-56's decision to make deliberately (OD-059).

## No conversion, no OCR

Office formats are not converted to PDF. No OCR. Out of scope, and both would
mean accepting bytes LAGDA then rewrites.

## Duplicates are allowed

Two workspaces uploading identical PDFs get **two artifacts**. The digest is
content identity, not row identity.

Storage is deliberately not deduplicated across tenants: sharing one object
between workspaces would entangle deletion, retention and privacy for a saving
LAGDA does not need. Within one workspace, duplicate uploads are permitted — the
product has not asked for them to be blocked, and a stored hash makes it easy to
surface later if it does.

## The client's opinion counts for nothing

Filename, extension, `Content-Type` and `Content-Length` are all attacker
controlled. Each is either ignored or kept as diagnostic metadata. A frontend
may pre-validate for a friendlier experience; the backend re-checks everything
regardless.

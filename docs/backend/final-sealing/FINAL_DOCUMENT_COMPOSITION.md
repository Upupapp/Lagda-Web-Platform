# Final document composition

**Command:** BACKEND-41 · **Owner:** `@lagda/sealing`

## The layout

```
[ merged signed document pages ]   <- every accepted field value rendered
[ completion certificate pages ]   <- appended, last
```

Signed pages first, certificate last (§18). One downloadable file that carries
its own completion record, rather than two files a recipient must keep together.

## Where composition lives, and why there

Inside `@lagda/sealing`, reached through a **semantic byte input** on
`SealRequest` — `completionCertificate` — never an `appendPages()` method on the
port.

§21 and §22 point the same way. Page-level manipulation must not escape the
sealing package, and the seam must stay implementable by a future Java or .NET
signer that has no pdf-lib. A remote signer receives two documents and an
instruction to seal them as one; it is never told how to manipulate pages.

## How the pages are copied

`copyPages`, not a page reference. The certificate is a separate document, and
copying brings its resources — the embedded Noto Sans subset above all — into
the final file. A reference would produce a PDF whose last pages render blank
everywhere except the machine that produced it.

## Idempotency is NOT in the appender

Deliberately. §124 forbids appending the certificate twice on retry, and the
control is the **FINAL_SEAL step accepting exactly one output** — not the
appender trying to detect whether it has run before.

It could not do so reliably, and an attempt would silently mask a genuine
double-composition bug. Each seal call composes from the original inputs, never
from its own output, so sealing twice produces two three-page documents rather
than one six-page document. A test asserts exactly that.

## What is refused

| Condition | Error |
|---|---|
| Certificate is not a PDF | `InvalidPdfError` |
| Certificate is empty | `InvalidSealInputError` |
| Certificate has no readable page tree | `InvalidPdfError` |
| Certificate has zero pages | `InvalidPdfError` |

The zero-page case matters: it would seal silently and produce a final document
that simply lacks its completion record.

## No visual seal mark, no QR

Neither is in the product, and both are `NOT_IN_PRODUCT` / `DEFER` in the §0
inventory.

Omitting the QR also avoids an ordering problem entirely. A QR encoding the
verification identity would have to exist **before** the bytes are sealed, which
forces the identity to be created before finalization and reserved across
retries. Since nothing in the product asks for it, the identity is created in
the finalization transaction instead, where its uniqueness is free.

## Determinism

Composition is deterministic given the same inputs. The final BYTES are not
claimed to be, because the seal carries `sealedAt` — and §95 is explicit that
retry output may differ. That is why exactly one output is *accepted* rather
than assumed identical.

# Completion certificate — test matrix

**Command:** BACKEND-40 · **Measured 2026-08-11**

Results are what the suites actually assert. Where a row is narrower than its
name suggests, the scope is stated rather than rounded up.

| Area | Case | Result | Where |
|---|---|---|---|
| Input | immutable SigningRequest snapshot | **PASS** | step: title from the frozen snapshot |
| Input | immutable recipient snapshots | **PASS** | integration: name/email from `signing_request_recipients` |
| Input | authoritative submissions | **PASS** | integration: `accepted_at` per signer |
| Input | authoritative auth facts | **PASS** | integration: submission vs consent-row discriminator |
| Input | Contact changes irrelevant | **PASS (structural)** | no contact read exists — query + import audit |
| Input | profile changes irrelevant | **PASS (structural)** | no profile read exists |
| Input | Preparation changes irrelevant | **PASS (structural)** | no preparation read exists |
| Identity | `signedAt` from submission | **PASS** | builder + integration |
| Identity | Unicode names survive the query | **PASS** | integration: "Peñaflor Ubaldo" |
| Auth | exact method wording | **PASS** | renderer: total `Record` |
| Auth | no identity overclaim | **PASS** | source scan: no "Identity verified" literal |
| Auth | unknown method fails closed | **PASS** | builder + renderer, both terminal |
| Auth | bound to the accepted submission | **PASS** | integration: consent row records a different method |
| View | exact entry semantics | **PASS** | rendered as "Signing session entered"; source-scanned |
| Consent | exact version/time | **PASS** | integration: stray consent row not selected |
| Consent | partial consent refused | **PASS** | builder: 3 cases |
| Consent | absent consent permitted | **PASS** | builder + integration |
| Privacy | OTP/token omitted | **PASS (structural)** | no model field |
| Privacy | raw signature omitted | **PASS (structural)** | no model field |
| Privacy | field values omitted | **PASS (structural)** | no model field |
| Privacy | IP omitted | **PASS (structural)** | no model field; LAGDA stores none as evidence |
| Privacy | user agent omitted | **PASS (structural)** | no model field |
| Privacy | email masked | **PASS** | builder; 8 masking cases incl. malformed |
| Integrity | source hash shown | **PASS** | step asserts the source digest is certified |
| Integrity | merged hash NOT shown | **PASS** | step: merged digest absent from the model |
| Integrity | no fake final hash | **PASS (structural)** | no model field |
| Integrity | no self-hash circularity | **PASS (structural)** | digest computed after render, stored as metadata |
| Layout | Unicode names | **PASS** | 4 diacritic cases |
| Layout | unrenderable name fails | **PASS** | terminal `UnrenderableTextError` |
| Layout | long names wrap | **PASS** | output grows rather than truncating |
| Layout | many recipients paginate | **PASS** | 30 participants → 5 pages |
| Layout | deterministic ordering | **PASS** | integration: fixture declared out of order |
| Layout | deterministic time formatting | **PASS** | fixed `YYYY-MM-DD HH:mm:ss UTC` |
| Layout | byte determinism | **PASS** | same model → identical digest; and changes when the model changes |
| Artifact | new ArtifactId | **PASS** | step |
| Artifact | SHA-256 of exact bytes | **PASS** | generator + step |
| Artifact | size observed, not claimed | **PASS** | generator |
| Artifact | correct artifact kind | **PASS** | step: `completion-certificate` |
| Artifact | inputs unchanged | **PASS** | step: source and merged byte-identical after a run |
| Retry | existing success reused | **PASS** | step: generator not called |
| Retry | duplicate worker | **PASS (inherited)** | conditional claim + `acceptStep` unique key (BACKEND-38/39) |
| Recovery | field-merge not succeeded | **PASS** | step refuses |
| Recovery | merged artifact missing | **PASS** | `output-missing` |
| Recovery | source artifact missing | **PASS** | `source-artifact-missing` |
| Storage | upload failure | **PASS** | retryable, no row written |
| Storage | upload OK / DB fails | **PASS** | `database-unavailable`, object left in place |
| Storage | bytes before row | **PASS** | ordering asserted |
| Tenant | cross-request fact rejected | **PASS** | integration: another request's signer absent, with a negative control |
| Tenant | cross-workspace fact rejected | **PASS (inherited)** | RLS + workspace-scoped query |
| RLS | runtime worker role | **PASS (inherited)** | existing RLS suites; no new grant or scope added |
| Boundary | no `DocumentSealer` | **PASS** | no import; architecture guard |
| Boundary | no COMPLETED state | **PASS (structural)** | the step performs no request transition |
| Boundary | no public verification | **PASS (structural)** | no route added |
| Boundary | no second PDF library | **PASS** | manifest guard: exactly `pdf-lib` + `@pdf-lib/fontkit`, sealing only |
| Logging | certificate/PII hidden | **PASS** | refusal messages carry bounded reasons and code points, never values |
| Metrics | bounded labels | **N/A** | no certificate metric added; §244 is optional and nothing consumes one |

## Two honest scope notes

**"PASS (structural)"** means the property is guaranteed by a type or an absence
rather than by an executed assertion over output — for example, the model has no
`completedAt` field, so no renderer can draw one. These are stronger than
runtime checks, not weaker, but they are a different kind of evidence and are
labelled as such.

**Text-content assertions are not byte searches.** Certificate text is not
searchable in the output: the embedded font encodes glyph indices into a
compressed stream, and a search for "Certificate of Completion" — a string
definitely drawn — finds nothing. Absence assertions therefore run against the
model and against a scan of the renderer source, the latter with a positive
control proving it can find literals that are present.

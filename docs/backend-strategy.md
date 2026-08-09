# Backend Strategy — Node now, dedicated signing service later

**Status:** Draft for review. No backend code exists yet.
**Scope:** LAGDA eSignature only. eNotary backend work remains prohibited — see
`backend-integration-handoff.md` §36.
**Companion docs:** `backend-integration-handoff.md` (44 sections, the endpoint
and contract specification) and `backend-implementation-priority.md` (P0–P3 and
the 10-week order). This document does not restate either; it decides the
*platform* and the *seam*, and both of those remain deliberately compatible with
the sequence already agreed there.

---

## 1. The decision

Build the backend in **Node.js 22 LTS with TypeScript**, as a single deployable
service, and design one seam — document sealing — so that it can later be
replaced by a dedicated Java or .NET service without touching the rest of the
system.

This is one decision with two halves. The first half is what to build now. The
second half is the escape hatch, designed now and used only if a specific
trigger fires. Building the escape hatch is cheap. Retrofitting it is not.

---

## 2. Why Node, specifically for LAGDA

Three reasons, in order of weight.

**The frontend already contains the domain model.** `src/app/models/` is 27
files and 11,253 lines: branded ID types, discriminated status unions, and the
resolver contracts built across C33–C37. A TypeScript backend shares those
definitions. Any other language re-declares all of them by hand, and every
re-declaration is a place where the two sides can disagree about a status value
or an ID shape without anything failing loudly. For a product whose correctness
lives largely in those types, this is the dominant consideration.

**The specification fits Node's strengths.** The handoff calls for SHA-256
hashing (§17), server-side PDF field-overlay merging (§8), completion-certificate
generation (§15), and immutable evidence logs (§16). It contains **no** mention
of PAdES, PKCS, X.509, PKI, HSM, or RFC 3161 timestamping — verified by search
across all of `docs/`. The verification model is hash-based: `documentHash`,
`signedDocumentHash`, `verificationId`. This matters because the serious
argument against Node for eSignature is its thinner certificate-signing
ecosystem compared with Java (EU DSS, iText) or .NET — and that argument does
not apply to the scope actually specified.

**The operational stack already exists.** Servana and GetHired both run
Node + PostgreSQL + PM2 on Linode. Deployment, process supervision, database
conventions, and backup practice transfer immediately rather than being learned.

### What would have argued against Node

Had the specification required qualified electronic signatures, PAdES-LTV, or
PNPKI integration at launch, the recommendation would have been different — not
because Node cannot do it, but because the mature, audited libraries live
elsewhere. That requirement does not exist today. Section 5 covers what happens
when it does.

---

## 3. What gets built now

The platform decision changes nothing about sequence. The six phases in handoff
§34 and the P0–P3 ordering in `backend-implementation-priority.md` stand as
written:

| Phase | Content | Priority |
|---|---|---|
| 1 | Authentication, sessions, MFA | P0 |
| 2 | Upload, PDF processing, document list and detail | P0 |
| 3 | Signing-request creation, invitations, recipient flow | P0 |
| 4 | Signature adoption, completion, verification records | P0 |
| 5 | Templates, contacts, workspace admin, notifications | P1 |
| 6 | Settings, billing, integrations, export and closure | P2–P3 |

The frontend's 24 mock services (14,289 lines under
`src/app/services/mock/`) are the interface contract. Each has a real method
surface the backend must satisfy; they are not sketches. The migration path for
each is: keep the service module's exported signature, replace its body with an
HTTP call. Nothing in the pages layer should change.

---

## 4. The sealing seam

This is the load-bearing design decision in this document.

**Definition.** All document-integrity operations sit behind one port. Nothing
else in the codebase touches PDF bytes or computes a document hash.

```
interface DocumentSealer {
  hashDocument(bytes): DocumentHash
  mergeFields(pdf, fields): Pdf
  generateCompletionCertificate(evidence): Pdf
  sealDocument(pdf, evidence): SealResult
}
```

Today `sealDocument` produces a SHA-256 hash and a verification record — exactly
what handoff §17 specifies. Later, a different implementation of the same port
may produce a PAdES signature with an embedded certificate chain and a
timestamp. Callers do not change.

**Four rules keep the seam real.** A seam that is not enforced is decoration,
and this codebase has already shipped one decorative field — `RouteMeta.status`,
declared on 225 routes and read by no code, which drifted precisely because
nothing consumed it.

1. **No PDF library import outside the sealing package.** Enforce with an ESLint
   `no-restricted-imports` rule, not a convention. A convention will be broken.
2. **`SealResult` is a value object**, never a library type. If a `pdf-lib`
   object escapes the package, the seam is already gone.
3. **Every evidence record stores `sealAlgorithm` and `sealVersion` from day
   one**, even while there is only one value. Records written before a migration
   must stay interpretable after it. This is the cheapest thing on this list and
   the most expensive to add retroactively.
4. **The port is called only from the completion pipeline**, never from a route
   handler. One caller is a swap; twenty callers is a rewrite.

---

## 5. When to extract the signing service

Migration is **trigger-based, not scheduled**. Any one of these justifies the
work; none of them are certain to occur.

- eNotary accreditation requires PAdES-LTV or PNPKI integration.
- A customer contractually requires qualified or court-admissible signatures.
- Long-term validation demands a timestamp authority and certificate-chain
  revocation checking.
- PDF throughput becomes a measured bottleneck — measured, not assumed.

**What moves:** the `DocumentSealer` implementation, certificate and key
custody, timestamp-authority integration.

**What stays in Node:** everything else — auth, workspaces, documents, prepare,
recipients, templates, contacts, notifications, reports, search. That is the
overwhelming majority of the surface, and none of it benefits from a JVM.

**Interface across the boundary:** synchronous HTTP for hashing and merging,
asynchronous job for sealing, since certificate operations and timestamp-authority
round-trips have latency that a request should not hold open.

### Why not build the Java service now

Handoff §36 prohibits eNotary backend work before accreditation. Building a
certificate-signing service today would be speculative work against a product
that is not accredited, driven by requirements nobody has written. The seam
costs roughly a day. The service costs weeks and would need rewriting once the
actual accreditation requirements are published.

---

## 6. Skeleton — brief

**What this skeleton is:** the smallest structure that lets Phase 1 (auth) begin
while keeping the sealing seam, the shared types, and the tenancy boundary
correct from the first commit. Those three are the things that are painful to
introduce later.

**What it is not:** an implementation of any endpoint, an ORM choice defended in
depth, or infrastructure-as-code. Endpoint work follows the existing P0 order.

**Non-negotiables carried from the handoff:**

- Workspace tenancy enforced at the data-access layer, not in route handlers
  (§6). Every query is workspace-scoped by construction.
- httpOnly secure cookies for sessions; CSRF tokens on all state-changing
  endpoints (§29).
- Idempotency keys on send, invite, plan change, signature submission, and OTP
  delivery (§28).
- Structured JSON logging (§31), with the redaction discipline the frontend's
  `utils/logger.ts` already applies.
- RA 10173 (Philippine Data Privacy Act) obligations, including export and
  erasure endpoints (§25, §30).
- Upload validation by magic bytes plus AV scan (§29) — never by file extension
  or client-supplied MIME type.

---

## 7. Skeleton — the work list

Monorepo using npm workspaces, mirroring the frontend's conventions
(TypeScript strict, ESLint 9 flat config, Vitest).

```
lagda-backend/
  packages/
    contracts/   shared types + API schemas
    db/          migrations, repositories, tenancy scoping
    core/        domain logic, no I/O
    sealing/     the DocumentSealer port + Node adapter
    api/         HTTP layer
    worker/      queue consumers
  infra/         deployment, migrations runner
```

### Work items

| # | Item | Package | Why first |
|---|---|---|---|
| 1 | Repo, TS strict, ESLint, Vitest, CI | — | Matches frontend gates from commit one |
| 2 | `contracts` — import the 27 frontend model files as the source of truth | contracts | Prevents the duplication Node was chosen to avoid |
| 3 | Error envelope + pagination types (§26, §27) | contracts | Every endpoint depends on these |
| 4 | PostgreSQL schema + migration runner | db | — |
| 5 | **Workspace-scoped repository base** — scoping by construction | db | Retrofitting tenancy is how cross-tenant leaks happen |
| 6 | `DocumentSealer` port + SHA-256 Node adapter + the ESLint import restriction | sealing | Cheapest now, most expensive later |
| 7 | `sealAlgorithm` / `sealVersion` on the evidence schema | db | Must exist before the first real record is written |
| 8 | Fastify app, health check, structured logging (§31) | api | — |
| 9 | Session middleware — httpOnly cookies, CSRF (§29) | api | Gates every subsequent endpoint |
| 10 | Idempotency-key middleware (§28) | api | Five operations require it |
| 11 | Rate limiting to the §29 thresholds | api | — |
| 12 | Queue (`pg-boss`, Postgres-backed — no new infrastructure) | worker | Email and PDF work is asynchronous |
| 13 | Object storage adapter (Linode S3-compatible) | db/api | — |
| 14 | Upload pipeline: magic-byte check, AV scan, hash (§7, §29) | api/core | First real use of the sealing port |
| 15 | **Phase 1 auth endpoints** — P0-1 to P0-8 | api/core | The agreed starting point |

Items 1–14 are foundation; item 15 is where the existing P0 sequence begins.
Nothing above reorders that sequence.

### Proposed dependencies

| Concern | Choice | Note |
|---|---|---|
| Runtime | Node 22 LTS | **Not** the Node 14 GetHired is pinned to |
| HTTP | Fastify | Schema-first validation pairs with `contracts` |
| Database | PostgreSQL | Already operated for Servana and GetHired |
| Queue | pg-boss | Postgres-backed; avoids adding Redis |
| PDF | pdf-lib | Confined to `sealing` |
| Passwords | argon2id | — |
| Logging | pino | JSON, satisfies §31 |

---

## 8. Open questions

These need a decision before item 4, and none should be resolved by assumption.

1. **Data residency.** §30 raises cross-border transfer restrictions. Linode's
   Singapore region is where Servana runs; whether Philippine data may reside
   there is a legal question, not a technical one.
2. **Document retention.** §9 defers to "workspace plan terms", which do not yet
   exist.
3. **Email provider.** §12 specifies delivery requirements but no vendor.
4. **AV scanning.** §29 requires it; whether that is ClamAV self-hosted or a
   managed service affects the upload pipeline's latency budget.
5. **Contracts sharing mechanism.** Whether `contracts` imports the frontend
   models via a path reference, a published package, or a generation step. This
   determines whether the two repositories can drift.

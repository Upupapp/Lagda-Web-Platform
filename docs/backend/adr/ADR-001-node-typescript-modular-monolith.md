# ADR-001 — Node.js + TypeScript modular monolith for the LAGDA eSignature backend

- **Status:** Accepted
- **Established by:** BACKEND-00
- **Scope:** LAGDA eSignature backend. eNotary is out of scope (INV-009).
- **Supersedes:** nothing. First backend ADR.

---

## Decision

The LAGDA eSignature backend is built as a **modular monolith on Node.js 24 LTS
with TypeScript** in strict mode, using PostgreSQL, Fastify, Pino, Vitest,
ESLint 9 flat config, npm workspaces, and `pg-boss` for PostgreSQL-backed jobs.

Document finalization is implemented in Node behind a single `DocumentSealer`
port, so that certificate-backed signing may later be delegated to a dedicated
Java or .NET service without redesigning the application.

---

## Context

**The frontend already carries substantial domain knowledge.** `src/app/models/`
is 27 files and 11,253 lines — branded ID types, 50 status unions, and the
resolver contracts built across C33–C37. A further 24 mock services totalling
14,289 lines define the method surfaces a backend must satisfy. A TypeScript
backend can share those definitions through a common contracts package. Any
other language re-declares them by hand, and every re-declaration is a place
where the two sides can disagree about a status value or an ID shape without
anything failing loudly.

**The current specification is hash-and-evidence based, not certificate based.**
`backend-integration-handoff.md` requires SHA-256 hashing (§17), server-side PDF
field-overlay merging (§8), completion-certificate generation (§15), and
immutable evidence logs (§16). A search across all of `docs/` returns **zero**
mentions of PAdES, PKCS, X.509, PKI, HSM, or RFC 3161 timestamping, and the
verification model is `documentHash` / `signedDocumentHash` / `verificationId`.

This matters because the strongest argument against Node for an eSignature
product is its thinner certificate-signing ecosystem next to Java (EU DSS,
iText) or .NET. That argument does not apply to the scope actually specified.
**It is the fact this decision turns on, and it is the fact most likely to
change** — which is why the escape hatch below is mandatory rather than optional.

**Node and PostgreSQL are already operated in-house.** Two sibling products run
Node with PostgreSQL and PM2 on Linode. Deployment, process supervision,
database conventions, and backup practice transfer rather than being learned.

**Current scale does not justify distribution.** No measured throughput problem
exists. Microservices, Kafka, Redis, and Kubernetes would add operational
surface against imagined bottlenecks.

---

## Consequences

### Positive

- One canonical set of shared contracts; no hand-maintained duplicate model layer.
- Reduced drift between frontend and backend domain definitions.
- Faster implementation against a known operating environment.
- Simple initial deployment: one release, two process roles (`lagda-api`,
  `lagda-worker`).
- Domain logic testable without a server or database, given the package boundaries.

### Trade-offs

- **The certificate-signing ecosystem may later favour Java or .NET.** This is
  the accepted risk, and the reason the `DocumentSealer` seam is mandatory.
- TypeScript types do not validate at runtime, so runtime schemas are required at
  every external boundary — additional discipline the compiler will not enforce.
- A modular monolith's boundaries are only as real as their enforcement. This
  repository has already shipped a decorative contract (`RouteMeta.status`,
  declared on 225 routes, read by no code, drifted), so boundaries must be
  executable rather than documented.
- Node's single-threaded model makes CPU-bound PDF work a genuine consideration
  at scale; it belongs in the worker role, and it is one of the extraction
  triggers below.

---

## Escape hatch — `DocumentSealer`

All document-integrity and finalization work sits behind one high-level port:

```ts
interface DocumentSealer {
  seal(request: SealRequest): Promise<SealResult>;
}
```

Merging fields, hashing, certificate generation, and signature application are
**internal** to `packages/sealing`. They are not application services.

Four rules make the seam real, all traceable to invariants:

1. **INV-001** — no PDF library import outside `packages/sealing`, enforced by
   ESLint rather than convention.
2. **INV-008** — `SealRequest` and `SealResult` are LAGDA-owned structures; no
   library type crosses the seam into an application interface, a database
   record, or an API response.
3. **Seal metadata** — every finalization and evidence record carries
   `sealScheme`, `sealVersion`, and `digestAlgorithm` from the first record
   written. This is the cheapest item and the only one that cannot be added
   retroactively: records created under one scheme must stay verifiable after
   another is introduced.
4. **INV-002** — one caller. `DocumentSealer` is invoked only from the
   signing-completion use case. One caller is a swap; twenty callers is a rewrite.

```
CompleteSigningRequest → DocumentSealer → NodeDocumentSealer
CompleteSigningRequest → DocumentSealer → RemoteDocumentSealer → Java/.NET
```

---

## Extraction triggers

Extraction to a dedicated Java or .NET signing service is **requirement-based** —
never scheduled, never assumed. Any one of the following justifies it:

- accreditation requires a certificate-backed signature profile;
- PNPKI integration becomes mandatory;
- a customer contract requires cryptographic functionality unavailable or
  impractical in the Node implementation;
- trusted timestamp authority integration is required;
- certificate-chain validation or revocation requirements materially justify a
  specialised stack;
- key custody or HSM integration strongly favours another platform;
- **measured** PDF/signing throughput demonstrates the sealing subsystem is a
  bottleneck.

**What would move:** the `DocumentSealer` implementation, certificate and key
custody, timestamp-authority integration.

**What stays in Node:** auth, workspaces, documents, prepare, recipients,
templates, contacts, notifications, reports, search — the overwhelming majority
of the surface, none of which benefits from a JVM.

### Why the service is not being built now

`backend-integration-handoff.md` §36 prohibits eNotary backend work before
accreditation. A certificate-signing service today would be speculative work
against a product that is not accredited, driven by requirements nobody has
written, and would likely need rewriting once the real accreditation rules are
published.

---

## Closed decisions

Not reopened without a new concrete requirement and a superseding ADR:

backend language TypeScript · runtime family Node · architecture modular
monolith · primary database PostgreSQL · HTTP framework Fastify · structured
logger Pino · queue `pg-boss` on PostgreSQL · initial finalization implemented in
Node · future signing escape hatch `DocumentSealer` · current backend scope
eSignature · eNotary backend deferred · tenant boundary is the workspace.

The Node major version may advance during routine supported-LTS maintenance
without amending this ADR, unless compatibility requires otherwise.

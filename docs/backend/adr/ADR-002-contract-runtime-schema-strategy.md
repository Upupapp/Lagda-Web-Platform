# ADR-002 — TypeBox as the contract runtime-schema strategy

- **Status:** Accepted
- **Established by:** BACKEND-02
- **Relates to:** ADR-001 (Fastify), INV-021, INV-022

---

## Decision

`@lagda/contracts` defines runtime schemas with **TypeBox**
(`@sinclair/typebox`), and TypeScript types are **derived** from those schemas
via `Static<typeof Schema>` rather than declared separately.

---

## Context

TypeScript types vanish at runtime, so a shared package of interfaces validates
nothing at a trust boundary. Contracts need a runtime representation, and
maintaining an interface plus a separate validator plus a separate documentation
model for the same structure guarantees the three drift.

The realistic candidates were TypeBox and Zod.

**Fastify decides it.** ADR-001 already chose Fastify, whose native validation
is JSON Schema, compiled by Ajv. TypeBox *is* JSON Schema — `Type.Object({…})`
evaluates to a plain JSON Schema object, so a contract schema can be handed
directly to a Fastify route. Zod is not JSON Schema and would need a conversion
layer at every route, which is precisely the "recreate API validation manually
in Fastify" outcome §55 warns against.

Secondary factors, none of which reversed the above:

- **OpenAPI.** JSON Schema is the native input to OpenAPI generation. Zod needs
  a converter, and converters lose fidelity on the awkward cases.
- **Browser cost.** The frontend is a first-class consumer. TypeBox schemas are
  plain objects with zero runtime dependencies; Zod ships a validator engine.
- **Frontend ergonomics.** Zod's are better — expressive refinements, friendlier
  errors, wider familiarity. This is the real cost of the decision.

## Alternatives

**Zod.** Better developer experience, worse architectural fit. Rejected because
the conversion layer would sit on the hottest path in the system — every request
of every endpoint — and because §14 directs the choice on architecture fit
rather than popularity.

**Both.** Rejected outright. Two schema systems means two definitions of the
same contract and a synchronization problem, which is the drift this package
exists to prevent.

**Interfaces plus hand-written validators.** Rejected: the drift is guaranteed
rather than possible.

---

## Consequences

### Positive

- One definition per contract; the type cannot disagree with the validator.
- Schemas are directly consumable by Fastify with no adapter (BACKEND-11).
- A clear path to OpenAPI without a lossy conversion step.
- No runtime dependencies reach the browser beyond TypeBox itself.

### Trade-offs

- Ergonomics are worse than Zod's, particularly for refinements and error
  messages. Accepted deliberately.
- JSON Schema expresses some constraints awkwardly. Cross-field rules belong in
  `core` as domain invariants rather than being forced into a schema.
- **`format` keywords are not portable.** TypeBox's `Value.Check` *rejects* a
  value whose format is unregistered, while Ajv *ignores* unknown formats unless
  `ajv-formats` is loaded. The same schema therefore behaves differently in the
  two validators this package must satisfy. Contracts use explicit `pattern`
  constraints instead — self-contained, no registry, no import side effect
  (§36). This was found by a test that supplied a valid timestamp and watched
  the schema reject it, not by reading documentation.

---

## Conventions established

- Schema first, type derived: `export type X = Static<typeof XSchema>`.
- Requests set `additionalProperties: false` — silently accepting an unexpected
  field on a mutation hides a client defect.
- Responses stay permissive to additive fields, so a frontend does not break
  when the backend adds one.
- Canonical serialized values are also exported as `as const` arrays for runtime
  iteration, derived from the same source as the schema so the two cannot drift.
- No numeric enums. String literal unions only, for JSON friendliness.

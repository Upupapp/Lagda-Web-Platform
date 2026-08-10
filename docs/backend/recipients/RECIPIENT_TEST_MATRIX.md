# Recipient test matrix

135 assertions across five suites. What each layer can prove, and what it
cannot.

| Suite | File | Count |
|---|---|---|
| Domain | `packages/core/src/recipients/recipients.test.ts` | 22 |
| Use cases | `packages/application/src/recipients/recipients.test.ts` | 46 |
| HTTP | `packages/api/src/recipients/recipient-routes.test.ts` | 22 |
| Architecture | `tests/architecture/recipients.test.ts` | 24 |
| Integration (real PostgreSQL) | `packages/db/src/recipients.integration.test.ts` | 21 |

## By claim

| Claim | Where it is proven | How |
|---|---|---|
| A contact edit does not change a recipient | Use case | Edit the contact directly in the store; re-read the recipient |
| A contact **delete** does not destroy a recipient | Integration | Delete as the owner role; assert name, email and tenancy intact, provenance NULL |
| A recipient edit does not change the contact | Use case | Assert the contact's `updatedAt` is unmoved |
| Adding a recipient creates no contact | Use case | Address-book count unchanged |
| The contact is read exactly once | Architecture | Count of `uow.contacts.*` in the module is exactly `["uow.contacts.findById"]` |
| Nothing can refresh from a contact | Architecture | Four forbidden identifiers across six files |
| One address, one recipient per preparation | Use case + Integration | Application check, then a genuinely concurrent pair of transactions |
| Case-insensitive comparison | Use case | `JUAN@X.COM` refused after `juan@x.com` |
| Plus tags are different addresses | Domain + Use case | Folds differ; second add succeeds |
| The fold is locale-independent | Domain | Turkish dotless-I case |
| The same address on another document is fine | Use case + Integration | Second preparation accepts it |
| Renaming onto another's address is refused | Use case | PATCH → `DuplicateRecipientError` |
| Keeping your own address on edit is fine | Use case | The self-exclusion |
| The duplicate error names no address | Use case | Message asserted not to contain the email |
| A field may name a recipient of its own preparation | Use case + Integration | Save succeeds; row present |
| A field may **not** name another preparation's recipient | Use case + Integration | Validation error; foreign-key violation. Same workspace both times |
| A field may not name a viewer or carbon-copy | Use case | Both refused; approver accepted |
| An unassigned field is allowed | Use case + Integration | `recipientId: null` saves |
| An assigned recipient cannot be deleted | Use case + Integration | `RecipientHasFieldsError` with the count; FK violation; fields still present |
| An assigned recipient cannot be demoted to viewer | Use case | Refused with the count |
| Deletion renumbers densely | Use case | 0,1 after removing the middle of three |
| Reorder needs the complete list | Use case | Partial, repeated and foreign ids all refused |
| Reorder leaves routing order alone | Use case | `routingOrder: 3` survives |
| Equal routing orders are permitted | Use case + Domain | Two recipients at step 2 |
| Ordering is dense and 0-based | Domain | `normalizeOrder` |
| RLS hides another tenant's recipients | Integration | As the runtime role, both directions |
| Cross-tenant preparation or contact linkage | Integration | Constraint violations |
| The runtime role has no bypass | Integration | `pg_roles` read |
| Unknown type, routing < 1, unfolded key, blank name | Integration | Four CHECK constraints, **plus a positive fixture** so the negatives mean something |
| Anonymous is refused on all five routes | HTTP | Real `createApp`; nothing written |
| CSRF is required on mutations | HTTP | 403 without the header |
| An auditor may read, not write | HTTP + Use case | 200 / 404 |
| A non-member gets 404 | HTTP + Use case | Hidden, not 403 |
| Client-chosen id, provenance, order index refused | HTTP | 422 each |
| Every authentication and ceremony claim refused | HTTP | Six payloads, 422 each, nothing written |
| `witness` is refused | HTTP + Domain | Closed union; six types, no witness |
| A contact id cannot be mixed with a name | HTTP | The union's `additionalProperties: false` |
| No name, email or contact id in telemetry | HTTP | Whole serialized log line, real fixtures |
| No comparison key or identity claim in a response | Use case + HTTP | Serialized body asserted |
| No account lookup anywhere | Architecture | Forbidden calls; distinct brands |
| Nothing is sent | Architecture | No mailer, no queue |
| No signing evidence written | Architecture | No `uow.evidence` |
| No PDF, storage or sealer reached | Architecture | Five forbidden imports |
| No new capability | Architecture | No `recipient.*` in `WORKSPACE_CAPABILITIES` |
| No role literal in the routes | Architecture | Plus the BACKEND-27 guard, unchanged |
| `participant_slot` is gone, not deprecated | Architecture | Dropped in the migration; absent from three files |

## What each layer cannot prove

**The domain suite** cannot prove anything about persistence, tenancy or
concurrency. It pins the fold, the eligibility rule and the ordering semantics —
the decisions that would otherwise only be visible three layers up.

**The use-case suite** runs against fakes whose transaction rollback restores a
whole-store snapshot. It therefore cannot model a genuine race: the loser's
rollback would discard the winner's writes. Every concurrency claim is proven in
integration instead, and the fakes reproduce the *constraints* — the duplicate
unique and the delete RESTRICT — so a use case that forgot a check fails here
too rather than passing and failing later.

**The HTTP suite** proves what the schema refuses and what the log carries. It
uses the real `createApp` for the scope's protections, and a bare Fastify with a
captured logger for telemetry, because `createApp` builds its logger from
configuration.

**The architecture suite** greps source. It uses a comment-stripping helper, and
a second helper that also strips SQL line comments — every assertion measuring
the *distance* between two SQL clauses needs them gone, or the guard fails
because someone documented the constraint it is checking.

**The integration suite** is the only place RLS, the compound keys, the CHECK
constraints and real concurrency are exercised. It runs as the `lagda_app`
runtime role, not the owner.

## Deliberate absences

- **No test asserts a recipient cannot sign.** There is no signing, so there is
  nothing to assert against.
- **No rate-limit test.** None is applied — see the report.
- **No pre-authentication test specific to recipients.** The scope hook is
  tested once, centrally; these routes inherit it by composition.
- **No frontend coordinate or ordering fixtures.** OD-126 stands; the frontend
  does not yet call these routes.

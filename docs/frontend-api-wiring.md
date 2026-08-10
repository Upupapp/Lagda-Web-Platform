# Frontend API wiring — FRONTEND-01

**Written:** 2026-08-10, after BACKEND-34.
**Status:** proposed scope, not started.

FRONTEND-01 builds the foundation the other wiring commands run on: a generated
client, an HTTP layer that understands two authentication realms, a seam where
mocks can be swapped one service at a time, and one real vertical slice that
proves all three.

**It wires no screens beyond that slice.** A foundation whose first consumer is
hypothetical is a foundation that fits nothing.

---

## 1. What is actually there — measured, 2026-08-10

| | |
|---|---|
| HTTP client in the frontend | **None.** No `fetch(` outside `src/test/setup.ts`, no axios, no client dependency |
| Route entries in `src/app/config/routes.ts` | **225** |
| Backend HTTP routes | **57**, of which **55** carry TypeBox schemas |
| OpenAPI generation | **Already registered** — `@fastify/swagger`, generation only, no route exposed ([create-app.ts:171](../../lagda-backend/packages/api/src/app/create-app.ts)) |
| Mock services | **19** under `src/app/services/mock/` |
| Direct imports of `services/mock/*` | **98**, no barrel, no indirection |

### The seam was designed and never built

[frontend-service-layer.md](frontend-service-layer.md) §1 says each mock adapter
can be "replaced by a real API adapter without changing any consumer
component."

That is not the case today. Ninety-eight call sites import
`../../services/mock/contacts.service` and bind `mockContactService` by name.
There is no barrel and no factory, so replacing an adapter means editing every
consumer of it.

The intent was right; the indirection is missing. Building it is the first
structural task, and it is mechanical.

---

## 2. Goal

At the end of FRONTEND-01:

1. Backend route schemas generate frontend types. Drift is a **compile error**.
2. One HTTP layer handles cookies, CSRF, the error envelope, request ids and
   **two** distinct 401 behaviours.
3. Every consumer imports from a seam, not from `mock/`.
4. One end-to-end journey runs against a real API with no fixture underneath.
5. Any other service can be migrated one at a time without touching consumers.

---

## 3. Non-goals

- **Not** migrating all 19 services. One slice.
- **Not** the recipient signing flow — see §5.
- **Not** deleting mock services. They stay as the fallback and as the test
  double until each is retired deliberately.
- **Not** exposing the OpenAPI document over HTTP. That is OD-029 and stays
  deferred; a build artifact is not an endpoint.
- **Not** a design change anywhere.

---

## 4. Work items, in order

### A. Emit the OpenAPI document as a build artifact (backend)

`app.swagger()` already returns it — `packages/api/src/api.test.ts:461` calls it
today. Add a script that boots the app with fake dependencies, writes
`openapi.json`, and publishes it from CI.

**No route is exposed.** OD-029 remains open, untouched, and this does not
prejudge it.

### B. Generate the client (frontend)

Generate types from `openapi.json` into `src/app/api/generated/`. Commit the
generated output so a frontend build never depends on a backend build, and fail
CI when the checked-in output differs from a fresh generation — that failure is
the drift alarm and the whole point of the exercise.

**No hand-written request or response type may exist.** A hand-written type is a
copy of a contract that silently stops being one.

### C. The HTTP layer

One module. Everything below is a decision the backend has already made, so
these are transcriptions, not choices:

| Concern | What the backend expects |
|---|---|
| Cookies | `credentials: "include"` — every credential is a cookie, none is a header |
| CSRF | Read the non-HttpOnly cookie, send `X-CSRF-Token` ([headers/index.ts:74](../../lagda-backend/packages/contracts/src/api/headers/index.ts)) |
| Error envelope | `{ error: { code, message, details?, requestId? } }` — `ApiErrorSchema`. `message` is explicitly *"never authoritative for client behaviour"*: branch on `code` |
| Request id | `X-Request-Id`, echoed as a header and in the error body; surface it so a support ticket names a log line |
| Idempotency | `Idempotency-Key` on create and send |
| Uploads | `FormData` — **never set `Content-Type` yourself**, the boundary is generated |

**Two realms, two 401 behaviours, and this is the one that will be got wrong.**

| Realm | Cookies | 401 code | Correct response |
|---|---|---|---|
| Workspace actor | `lagda_session` + `lagda_csrf` | `AUTHENTICATION_REQUIRED` | Redirect to sign-in |
| Signing recipient | `lagda_signing_session` + `lagda_signing_csrf` | `RECIPIENT_AUTHENTICATION_REQUIRED` | Send back to the emailed link. **Never** to sign-in |

A recipient has no account. Redirecting a signer to a login page they can never
satisfy is the failure mode to design against, and the distinct error code exists
precisely so the client can tell them apart. Branch on the **code**, not the
status.

### D. The service seam

Create `src/app/services/index.ts` exporting each service through one name, and
repoint all 98 imports in a single mechanical commit with **no behaviour
change** — every export still resolves to the mock.

Do this **before** any wiring. Done afterwards it is 98 edits interleaved with
feature work; done first it is one reviewable diff whose test suite must pass
unchanged.

Then a service migrates by changing one line in the barrel.

### E. Session lifecycle

`src/app/services/session-lifecycle.ts` already exists and already solves the
right problem — services register their own cleanup rather than the shell
importing them all. Real sessions expire; the API layer must call the registry
on a 401 in the workspace realm, and nothing new is needed for it.

### F. The proving slice — the **sender** path

Log in → workspace → upload a document → prepare → add recipients → create a
signing request → send.

**Not the recipient flow**, even though it looks like the better first slice —
nine self-contained pages, no workspace auth, no capabilities. **The endpoints
do not exist.** BACKEND-35 and BACKEND-36 have not been written, so wiring
`/sign` today means wiring against nothing.

The sender path is complete backend-side: auth and sessions, workspaces,
contacts, documents, upload, preparation, recipients, request creation, send.
It exercises cookies, CSRF, uploads, idempotency and capability-driven 403s —
every mechanism the foundation claims to handle.

It stops at **send**, which is honest: nothing delivers the email yet. Nothing in
the worker consumes `signing_delivery_intents`, and BACKEND-45 has not been
built.

### G. Mark Email Code as what it is

`PREP_AUTH_METHODS` in `src/app/models/prepare.ts:207` declares `email-otp`
("Email Code") with **`availability: "active"`** — no badge, fully selectable,
sitting beside `sms-otp` ("Plan") and knowledge-based ("Enterprise").

Nothing implements it. No per-request authentication policy is persisted
anywhere in the backend, and
[AuthChallengePage.tsx](../src/app/pages/recipient/AuthChallengePage.tsx) is a
working six-digit screen whose own copy reads *"Demo: Enter 000000, 123456, or
111111 to pass. No real code was sent."*

**Today this is disclosed**, in fairness: `AuthStep.tsx:315` says selections are
"stored only in this browser session." The risk is that this line is a
frontend-demo disclaimer, and demo disclaimers are exactly what gets deleted
when an app goes real. Delete that sentence while `email-otp` is still `active`
and a sender is choosing a security control for a legal document that silently
does not exist.

**The fix is one word.** Set `availability: "planned"` — the mechanism already
exists, renders a "Coming soon" badge and disables the card
(`AuthStep.tsx:28`). Restore it to `active` when OD-140 is answered and
BACKEND-45 can deliver a code.

Not blocked by anything, and it should not wait for the rest of FRONTEND-01.

---

## 5. Traps found while reading

**`UnavailablePage.tsx:124`** re-reads the credential from
`window.location.pathname` for its Retry button. Under the fragment carrier
(OD-144) there is nothing there; under the path carrier it undoes the cleanup.
Retry must go through the session already held.

**No `/sign` route without a parameter.** Only `/sign/:requestId` exists. A
fragment link never fills a path parameter.

**`RequestAccessPage.tsx:25`** already has the explicit "Begin" button that
should trigger the bootstrap POST. The scanner-safe shape exists in the UI
already — it calls a fixture.

**Launch profiles.** `VITE_LAUNCH_PROFILE` gates capabilities at build time
(`capability-resolver.ts:30`). Backend capabilities are runtime and
role-derived. Two capability systems that do not know about each other will
disagree, and the frontend one must never be treated as authorization.

**Fixtures are load-bearing in UI logic**, not just in data. Several components
derive behaviour from fixture shapes that a real API will not reproduce. This is
what will make the estimate wrong if it is treated as "swap the data source."

---

## 6. Gates

| Gate | Requirement |
|---|---|
| Typecheck | Pass, with **zero** hand-written API types |
| Lint | Pass |
| Tests | Pass, and the seam commit changes no test |
| Contract drift | CI regenerates the client and fails on any diff |
| The slice | Runs against a real local API, no fixture in the path |
| Mock parity | Every migrated service keeps its mock, selectable for tests |

**Definition of done:** a developer can migrate the next service by changing one
line in the barrel and writing one adapter, and can find out at compile time
when the backend changes underneath them.

---

## 7. Open questions

1. **Who owns this.** Recommended: whoever runs the backend command series, as a
   numbered series with the same gates. The value in 34 backend commands came
   from the discipline, not the code, and this is the boundary where losing it
   costs most. If it must be split, the generated client is what makes a split
   survivable.
2. **Generated client committed or built?** Recommended committed, so the
   frontend never needs a backend build, with CI failing on drift.
3. **API origin and cookies.** Same site or cross-origin? `SameSite=Lax` on
   every credential means a cross-origin API needs deliberate CORS and cookie
   work. The backend already restricts `allowedHeaders` to `Content-Type`,
   `X-CSRF-Token`, `Idempotency-Key`.
4. **What replaces a fixture that has no endpoint.** Several mock services front
   features no backend command has built. Each needs a decision: hide it, keep
   it mock and label it, or schedule the backend work.

---

## 8. Sizing, honestly

225 route entries is not 225 screens of work — much of it is marketing and
static. But this is not "wiring" either. Session expiry, the error contract,
upload progress, optimistic state, and unpicking fixtures that currently carry
UI logic are each real work.

FRONTEND-01 as scoped here is the small part. The track is measured in months.

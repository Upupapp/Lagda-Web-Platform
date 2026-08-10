# Scanner-safe signing links

## The problem

Email security gateways, link previews, corporate proxies and bots fetch links
before a human ever sees them. Some fetch every link in every message.

If a `GET` performed the credential exchange, a scanner would authenticate the
recipient — creating a session, recording an authentication fact, and (under a
one-time credential model) consuming the only link the recipient had.

Worse: any future "viewed" or "consent" event inferred from that fetch would be
a record that a person opened a document when a machine did.

## The flow

```
email  →  GET  https://app.lagda.example/sign/<credential>
                    │
                    │  a FRONTEND route. Renders. Mutates nothing.
                    │  A scanner that stops here has changed nothing.
                    ▼
          the page reads the token from the path
                    │
                    │  explicit user action
                    ▼
          POST /signing-access/bootstrap  { token }
                    │
                    ▼
          session cookies + a landing view
```

**Nothing on the backend changes until the POST.** The only `GET` the backend
exposes in this surface is `/signing/context`, which reads an already-established
session and mutates nothing.

Architecture guards assert it: the bootstrap route is registered with
`app.post`, the only `app.get` in the file is the context read, and the route
file contains no `:token` path parameter.

## Why the credential is in the body, not the path

A token in a URL path is a token in:

- the browser's history;
- the `Referer` header of every outbound link on the page;
- server access logs, load-balancer logs and CDN logs;
- analytics payloads;
- error-reporting breadcrumbs.

A token in a POST body is in none of them.

The emailed link necessarily carries it in the path — an email can only be a
URL — which is why the frontend's first job is to get it out of there.

## What the frontend must do

Not implemented here; §277 says do not redesign the UX. These are requirements,
recorded so whoever builds the real flow has them:

1. **Treat the path segment as a credential**, not as a request id. See the
   contract gap below.
2. **POST it** to `/signing-access/bootstrap` on an explicit user action.
3. **Remove it from the URL immediately** — `history.replaceState` to a clean
   path — so a back button, a shared screenshot or a copied URL does not carry
   it.
4. **Never persist it.** No `localStorage`, no `sessionStorage`. Transient
   in-memory, then the HttpOnly cookie. The recipient models already carry a
   privacy comment asserting nothing is persisted; this extends it to the token.
5. **Send no token-bearing URL to analytics or error reporting.** Scrub the
   path before any breadcrumb.
6. **Do not infer "signed" from a successful bootstrap.** Authentication is not
   signing, and the page must not say it is.

The backend helps where it can: every signing-access response carries
`Referrer-Policy: no-referrer` and `Cache-Control: no-store`.

## What is NOT recorded on a GET

Nothing. Specifically:

| Not recorded | Owner when it is |
|---|---|
| A recipient session | this command, on POST only |
| An authentication fact | this command, on POST only |
| `viewed` | BACKEND-35, and only when an authenticated recipient enters the ceremony |
| Consent | BACKEND-35, and only as an explicit act |
| Any signature | BACKEND-36 |

Even the POST records only that a session was created. It does not mark the
document viewed — a signer who bootstraps and closes the tab has viewed nothing.

## The cross-repo contract gap

The frontend route is `/sign/:requestId` and resolves the parameter through a
fixture `Map`. BACKEND-33's link builder emits `/sign/<43-char credential>`.

They do not agree. The backend's shape is correct — an emailed link must carry a
bearer credential, not a guessable id — and the frontend's is demo scaffolding
whose lookup would simply miss.

Recorded rather than patched. Whoever wires the real flow reconciles it, and the
six requirements above are what they need.

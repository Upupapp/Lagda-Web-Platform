# Request Context

Three values, three different levels of trust. Conflating them is how a
client-supplied string becomes evidence.

| Value | Provenance | Trust |
|---|---|---|
| `requestId` | **Server-generated** every request | Authoritative |
| `ip` | Server-observed connection, plus proxy config | **Conditional** |
| `userAgent` | Client-supplied header | **Untrusted**, bounded |

## Request ID

`req_` plus a 32-character hex UUID, from `node:crypto`'s `randomUUID`.

**The server always generates it.** An inbound `request-id` header is ignored
entirely (`requestIdHeader: false`). API_CONVENTIONS §9 requires this because a
client value flows into logs, and a client-chosen value could also carry CRLF
into a response header. A test sends `attacker\r\nX-Injected: yes` and asserts
the injected header does not appear.

Opaque by construction: it encodes no user, workspace or business timestamp, so
it cannot become a covert channel for identifiers that belong in a body.

It appears in three places, always the same value:

- the `X-Request-Id` response header, on **every** response including 404s
- `error.requestId` in the canonical error envelope
- every log line for that request

A request ID is **not** an idempotency key. It is new every attempt; an
idempotency key is deliberately the same across retries.

## Observed IP

```ts
interface ObservedIpAddress {
  value: string | null;
  provenance: "socket" | "trusted-proxy" | "unavailable";
}
```

Provenance travels **with** the value, because by the time a use case holds an
address it has no way to know whether a proxy was trusted. A future evidence
writer can then refuse to persist an address it cannot stand behind.

- `socket` — the connection's remote address. Trustworthy as a fact, but it is
  the *proxy's* address when one exists.
- `trusted-proxy` — resolved from forwarded headers under explicit configuration.
- `unavailable` — no address could be determined.

See [TRUST_PROXY.md](./TRUST_PROXY.md). The default trusts nothing, and
`TRUST_PROXY=true` is rejected outright.

## User agent

Untrusted client text, truncated to 512 characters before it can reach a log line
or a database column.

Never parsed into a claimed device identity. A user-agent string is a
self-report; calling it a verified device would overstate what it proves, and
BACKEND-10's data classification marks it PII-adjacent for exactly that reason.

It is untrusted **input**, so anything rendering it later must escape it.

## What is NOT here

No authenticated actor, no workspace, no session. Those are BACKEND-13 and
BACKEND-27, and they belong to a different trust level — *resolved*, not
*observed*.

This is deliberately not a mutable context bag. A grab-bag every plugin writes
into becomes impossible to reason about precisely when it matters most: during an
incident, deciding whether a field was observed or supplied.

## The rule that matters

**No field here may ever be read from a request body.**

A client that can name its own IP address is describing itself, not being
observed. A future API must accept the *business action* and derive evidence from
the server's own view — never:

```json
{ "eventType": "SIGNATURE_SUBMITTED", "occurredAt": "...", "ip": "1.2.3.4" }
```

INV-104 states this. BACKEND-11 supplies the type that makes the safe path the
easy one; BACKEND-36 must not undo it.

## Handoff

**BACKEND-10 evidence writers** take `ObservedRequestMetadata` and map:
`requestId` → correlation only, never evidence identity; `ip.value` →
`evidence_events.client_ip` **only when** provenance is `trusted-proxy`;
`userAgent` → `client_user_agent`.

**BACKEND-12** adds workspace and actor to the log context once BACKEND-13
resolves them.

# Trust Proxy

## Why this document exists

`X-Forwarded-For` is a request header. Any client can send one, and any client
can send several.

If the API believes it unconditionally, then the "observed client IP" that
BACKEND-10 reserved a column for — the one destined to become **signing
evidence** — is a value the signer chose. Not observed. Supplied.

That is the whole problem, and it is why this is a document rather than a line
of configuration.

## The default is to trust nothing

```
TRUST_PROXY=          # or unset, or "false"
```

With this, Fastify does not parse forwarded headers at all. `request.ip` is the
socket's remote address, and a spoofed header has no effect whatsoever.

A test proves it: with proxy trust off, a request carrying
`X-Forwarded-For: 203.0.113.99` from `127.0.0.1` resolves to `127.0.0.1`.

## `TRUST_PROXY=true` is rejected

Not defaulted away from — **rejected**, with an error that stops the process.

```
TRUST_PROXY=true is not accepted. It trusts the entire X-Forwarded-For chain,
which lets any client choose the IP recorded as signing evidence.
```

`true` means "believe the whole chain". Behind one reverse proxy, a client
sending `X-Forwarded-For: 1.2.3.4` produces a chain of `1.2.3.4, <real client>`,
and the leftmost entry — the attacker's — is taken as the client. There is no
deployment in which `true` is the considered answer, so accepting it would only
ever record a mistake.

## The two forms that are accepted

### Hop count — the normal production answer

```
TRUST_PROXY=1        # exactly one reverse proxy in front of this process
```

Fastify counts **from the right**, discarding everything further left. With one
nginx in front, the rightmost entry is the address nginx observed, and the
attacker's prepended values are ignored.

The number must equal the real number of proxies. Too high and spoofing works
again; too low and every client appears to be the proxy.

### Explicit addresses

```
TRUST_PROXY=10.0.0.4,10.0.0.5
```

For a known, fixed set of proxies. More precise than a hop count and more work
to keep accurate.

## Impact on evidence

BACKEND-10 created `evidence_events.client_ip` and left it **unwritten**, on
purpose. This command does not change that.

The metadata type carries provenance alongside the value:

```ts
type IpProvenance = "socket" | "trusted-proxy" | "unavailable";
```

So a future evidence writer can refuse to persist an address it cannot stand
behind, instead of silently recording one. Provenance is `"socket"` whenever
proxy trust is off — accurate, and accurately useless as evidence of a remote
signer's location when the process sits behind a proxy.

**Until production proxy topology is configured and verified, forwarded IP data
must not be described as authoritative evidence.** BACKEND-56 and BACKEND-65 own
that verification.

## Protocol trust follows the same rule

`X-Forwarded-Proto` is equally forgeable. Any future logic that depends on
"was this request HTTPS?" — a Secure cookie decision, an absolute link — must
not read it unless proxy trust is configured.

Better still, do not depend on it at all: BACKEND-13 should decide the Secure
flag from configuration, and link generation should use a configured canonical
base URL rather than anything derived from the request.

## The Host header is not trusted either

Nothing in this process makes a security decision from `Host`, and nothing
generates an absolute URL from it. A signing link built from an attacker-supplied
`Host` is a phishing link with LAGDA's signature on it.

BACKEND-19+ and BACKEND-44 must build links from configuration.

## Deployment checklist — BACKEND-65

1. How many proxies terminate the connection before the API? That number is
   `TRUST_PROXY`. Count them; do not assume one.
2. Does the proxy **overwrite** `X-Forwarded-For` or **append** to it? nginx's
   `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for` appends,
   preserving anything the client sent — which is exactly why the hop count
   matters.
3. Is the API reachable directly, bypassing the proxy? If so, the hop count is
   wrong for those requests and the bypass must be closed at the firewall.
4. Verify by sending a spoofed header through the real proxy and confirming the
   logged IP is the real one.

Until steps 1–4 are done and verified, leave `TRUST_PROXY` unset. An unset value
gives a useless-but-honest IP; a wrong value gives a convincing false one.

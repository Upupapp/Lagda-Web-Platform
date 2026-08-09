# Rate Limit Policy Catalog — BACKEND-15

Every threshold here is **sourced from the integration handoff**. None is
invented — where the handoff is silent the policy is absent, and the feature
command owns it. A number nobody chose is a number nobody can defend when it
starts blocking a customer.

A test asserts every policy carries a handoff citation.

## Implemented policies

| Policy | Scope | Limit | Window | Failure | Source | Consumer |
|---|---|---|---|---|---|---|
| `auth.signin.ip` | ip | 5 | 1 min | **closed** | §317 sign-in 5/min | BACKEND-20 |
| `auth.signin.account` | account | 5 | 1 min | **closed** | §317, applied per account | BACKEND-20 |
| `otp.deliver.account` | account | 3 | 10 min | **closed** | §317 OTP delivery 3/10min | BACKEND-23 |
| `otp.verify.challenge` | challenge | 5 | 15 min | **closed** | §145 OTP 5 attempts / 15 min | BACKEND-23 |
| `verification.public.ip` | ip | 20 | 1 min | open | §317 verification 20/min | BACKEND-42 |
| `api.write.user` | user | 100 | 1 min | open | §317 write endpoints 100/min per user | feature routes |
| `search.query.user` | user | 120 | 1 min | open | §583 search 120/min per user | BACKEND-48 |
| `commands.execute.user` | user | 60 | 1 min | open | §583 commands 60/min per user | BACKEND-48 |

**Status: FRAMEWORK_READY.** The policies exist, are validated at startup and
are enforceable today. None has a production consumer, because no feature
endpoint exists — that is the feature command's work, not a gap here.

## Why sign-in carries two policies

The handoff gives one number. Applying it to **both** IP and account is a
strictly tighter reading, not an invented value, and it is necessary:

- Per-IP alone is defeated by an attacker rotating addresses.
- Per-account alone is defeated by spraying one password across many accounts
  from one host.

Both must allow for the request to proceed.

## Why OTP issuance and verification differ

Different abuse problems entirely:

- **Issuance** costs money and spams a recipient. 3 per 10 minutes.
- **Verification** brute-forces a six-digit space, where 5 attempts per 15
  minutes is the difference between infeasible and trivial.

Merging them into one "OTP limit" would either allow far too many guesses or
block legitimate resends.

## Planned — thresholds NOT yet specified

The handoff is silent on these. They are listed so the framework's coverage is
visible, with **TBD** rather than a guessed number.

| Operation | Likely scopes | Command | Threshold |
|---|---|---|---|
| Password recovery request | ip + account | BACKEND-22 | **TBD** |
| Password reset submission | ip + account | BACKEND-22 | **TBD** |
| Email verification resend | account | BACKEND-21 | **TBD** |
| Workspace invitation create | workspace + user | BACKEND-26 | **TBD** |
| Invitation resend | workspace | BACKEND-26 | **TBD** |
| Send signing request | workspace + user | BACKEND-33 | **TBD** |
| Signing-access invalid attempt | ip + recipient | BACKEND-34 | **TBD** |
| Signature submission | recipient + ip | BACKEND-36 | **TBD** |
| Document upload | workspace + user | BACKEND-18 | **TBD** — plus size and concurrency, which a request counter alone cannot express |
| Report generation | workspace | BACKEND-49 | **TBD** |
| API key requests | api key | BACKEND-52 | **TBD** — must not reuse human session scope |

## Adding a policy

1. Add it to `RATE_LIMIT_POLICIES` with a **sourced** threshold. Validation
   rejects an empty source.
2. Choose the scope type. Pair IP with a semantic scope wherever an identity
   exists.
3. Choose the failure mode: **fail-closed** for anything guarding a credential,
   fail-open for a volumetric ceiling.
4. Add a row here.

Validation refuses a limit below 1 — a limit of 0 silently disables the
operation it protects, and a security control that quietly blocks everything is
as much a defect as one that allows everything.

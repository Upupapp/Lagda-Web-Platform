# BACKEND-23 — MFA test matrix

44 integration tests against real PostgreSQL, 20 route tests, 21 probes.

| Area | Case | Result |
|---|---|---|
| Product | actual factor classified from the frontend | **PASS** |
| Secret | stored encrypted, plaintext absent from the row | **PASS** |
| Secret | round-trips through the box | **PASS** |
| Secret | tampered ciphertext refused | **PASS** |
| Secret | fresh IV per encryption | **PASS** |
| Secret | wrong key cannot open | **PASS** |
| Code | leading zero preserved, handled as a string | **PASS** |
| Code | skew window is ±1 step, wider offsets refused | **PASS** |
| Code | replay of an authenticated code refused | **PASS** |
| Code | enrolment code cannot be replayed as a login | **PASS** |
| Enrolment | begun factor is NOT active | **PASS** |
| Enrolment | confirmation enables and issues 10 recovery codes | **PASS** |
| Enrolment | wrong code does not enable | **PASS** |
| Enrolment | re-enrolling an enabled account refused | **PASS** |
| Login | password alone yields no session for an MFA account | **PASS** |
| Login | non-MFA account unchanged (BACKEND-20 preserved) | **PASS** |
| Login | wrong password reveals nothing about MFA | **PASS** |
| Login | no ceremony created for a failed password | **PASS** |
| Verify | correct code completes and consumes | **PASS** |
| Verify | wrong code increments, issues nothing | **PASS** |
| Verify | correct code after exhaustion still fails | **PASS** |
| Verify | 8 concurrent wrong attempts cost exactly 5 | **PASS** |
| Verify | 4 concurrent identical codes → one session | **PASS** |
| Verify | 2 codes from different steps → one session | **PASS** |
| Verify | expired ceremony refused | **PASS** |
| Verify | cross-user code refused | **PASS** |
| Verify | malformed code costs an attempt | **PASS** |
| Recovery | code completes the ceremony, single-use | **PASS** |
| Recovery | 2 different codes concurrently → one session | **PASS** |
| Recovery | cross-user code refused and not burned | **PASS** |
| Disable | requires the current password | **PASS** |
| Disable | removes codes, revokes ceremonies | **PASS** |
| Disable | password alone authenticates afterwards | **PASS** |
| Pre-auth | stored as a digest only | **PASS** |
| Pre-auth | malformed credential refused without a query | **PASS** |
| Pre-auth | 10-minute absolute expiry, 5 max attempts | **PASS** |
| Pre-auth | distinct cookie, `Path=/auth`, httpOnly | **PASS** |
| Pre-auth | cleared on success and on exhaustion | **PASS** |
| Pre-auth | never appears in a response body | **PASS** |
| Pre-auth | cannot resolve a user on settings routes | **PASS** (route-level; see OD-069) |
| Session | fresh session after MFA, not the pre-auth value | **PASS** |
| Session | no session issued on any rejection | **PASS** |
| Reset | password reset revokes pending ceremonies | **PASS** |
| Reset | password reset leaves MFA enabled | **PASS** |
| Domains | a reset token cannot satisfy MFA | **PASS** |
| Repository | `consumeIfUsable` refuses exhausted / consumed / expired | **PASS** |
| Repository | `recordFailedAttempt` never passes the ceiling | **PASS** |
| Database | one active factor per user | **PASS** |
| Database | unknown factor type refused | **PASS** |
| Database | attempts above maximum refused | **PASS** |
| Response | no attempt count disclosed | **PASS** |
| Response | replay indistinguishable from a wrong code | **PASS** |
| Response | unknown fields rejected | **PASS** |
| Response | no GET mutation | **PASS** |
| Migration | from zero | **PASS** |

## Probes — 19 of 21 catch

**Caught:** ignore the attempt ceiling · drop the ceiling from the UPDATE ·
make wrong codes free · let an exhausted ceremony be consumed · accept a
replayed time step · drop the watermark condition · accept an expired ceremony ·
drop the user scope from recovery consume · enable MFA without verifying ·
disable without the password · skip the MFA requirement at login · let a
ceremony survive a password reset · widen the skew window · issue a session on a
rejection · reuse the pre-auth credential as the session token · acknowledge a
replay · reuse a fixed IV · consume race (recovery path, 3/3)

**Did not catch, and why:**

- *consume race (TOTP path)* — unreachable while the replay watermark serializes
  first. Genuine defence in depth; the recovery-path equivalent is reachable and
  is caught 3/3.
- *tag-length guard in the secret box* — redundant with GCM's own
  authentication, which is tested directly by the tampered-ciphertext and
  wrong-key tests.

Four probes caught nothing on the **first** run and exposed real gaps, now
fixed: masked repository conditions, an untested skew window, a vacuous route
assertion, and two untested concurrency paths.

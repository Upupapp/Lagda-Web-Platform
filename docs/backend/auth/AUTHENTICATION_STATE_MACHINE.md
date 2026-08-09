# Authentication state machine

```
                       START
                         |
                         v
                 PASSWORD_REQUIRED
                         |
        +----------------+----------------+
        | wrong / unknown                 | correct
        v                                 v
  INVALID_CREDENTIALS              email verified?
  (identical for both)                    |
                            +-------------+-------------+
                            | no                        | yes
                            v                           v
              EMAIL_VERIFICATION_REQUIRED      MFA required?
                                                        |
                                    +-------------------+------------------+
                                    | no                                   | yes
                                    v                                      v
                             AUTHENTICATED                          MFA_REQUIRED
                          (fresh session +                    (pre-auth cookie only,
                            CSRF cookies)                      NO session, NO CSRF)
                                                                       |
                                        +------------------------------+
                                        |                              |
                                correct code                    wrong / replayed
                                        |                              |
                                        v                              v
                                 AUTHENTICATED              attempts remaining?
                              (FRESH session; pre-auth          |          |
                               consumed and cleared)          yes         no
                                                               |          |
                                                        MFA_REQUIRED   restart at
                                                        (try again)    PASSWORD_REQUIRED
                                                                       (cookie cleared)
```

## Properties

**A client cannot jump states.** Every transition is server-derived. `MFA_REQUIRED`
is reached only by a correct password against an MFA-enabled account, and
`AUTHENTICATED` only by consuming a pending authentication.

**MFA_REQUIRED is not an error.** It is HTTP 200 with
`{ status: "mfa-required", factor: "TOTP" }`. A password was validly processed
and the ceremony is continuing. This is why the success body now carries an
explicit `status` — 200 alone no longer means authenticated, and a client
inferring success from the status code would treat a half-finished ceremony as a
login.

**A wrong password never enters MFA_REQUIRED,** so MFA enrolment is not
discoverable by anyone who does not already hold the password.

**Restart paths.** An expired ceremony, an exhausted ceremony and a missing
pre-auth cookie all return the user to `PASSWORD_REQUIRED` with the cookie
cleared. The password proof has an absolute 10-minute life that nothing extends.

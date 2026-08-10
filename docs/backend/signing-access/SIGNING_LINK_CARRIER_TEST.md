# Signing link carrier test — the OD-144 gate

**Decision:** the signing link will carry its credential in the **URL fragment**
(`/sign#t=<43 chars>`), *if and only if* this test passes in every inbox below.

**Why a gate at all.** The fragment is never transmitted to any server, so the
credential never reaches an access log — including Netlify's, which is where
this frontend deploys (site `0497e1ef…`) and whose edge logs you cannot purge.
That is the whole reason to prefer it. The one thing that can defeat it is a
corporate link rewriter that drops the fragment, and that is a measurement, not
an argument.

**Failure is safe.** A stripped fragment means the signer lands on a page with
no credential — a visible dead end and a support ticket, not a silent security
hole. That is why the gate is worth running rather than worth avoiding.

---

## This cannot be run through the product

`signing_delivery_intents` rows are persisted by BACKEND-33 and **nothing
consumes them** — no worker handler references the table. BACKEND-45 has not
been built, so LAGDA cannot send an email at all today.

That does not block the measurement, because the question has nothing to do with
LAGDA. It is: *does this mail path preserve a URL fragment?* Any link answers it.

Run the probe standalone. When BACKEND-45 exists, nothing here needs re-running
unless the sending domain changes — rewriters key off the recipient's tenant
policy, not the sender.

---

## Setup

`docs/backend/signing-access/link-carrier-probe/` contains `index.html` and
`_redirects`. Drag that folder onto <https://app.netlify.com/drop> — no account
needed, no build, and you get a throwaway `*.netlify.app` host in about ten
seconds. Delete the site when you are done.

Use a **throwaway host, not the LAGDA domain.** Rewriters treat unknown domains
no differently for rewriting purposes, and you do not want a probe page sitting
on the production origin.

Then send **one email** to each inbox containing all three links. Send it from a
normal mailbox — the sender does not matter, the recipient's tenant policy does.

Replace `PROBE` with your Netlify host:

```
Fragment  https://PROBE.netlify.app/sign#t=TESTONLY-no-real-credential-AAAAAAAAAAAAAAA
Query     https://PROBE.netlify.app/sign?t=TESTONLY-no-real-credential-AAAAAAAAAAAAAAA
Path      https://PROBE.netlify.app/sign/TESTONLY-no-real-credential-AAAAAAAAAAAAAAA
```

The test value is exactly **43 characters** and uses the base64url alphabet, the
same shape a real credential has. Length is the tell: 43 means intact, fewer
means truncated, absent means stripped.

Send it as **plain text and as HTML**, in separate messages. Some rewriters only
touch anchor hrefs and leave bare text alone, which would give a false pass.

---

## Inboxes

| # | Inbox | What it represents |
|---|---|---|
| 1 | Gmail (consumer) | the largest single bucket of PH signers |
| 2 | Outlook.com / Hotmail (consumer) | second consumer bucket |
| 3 | **Microsoft 365 with Safe Links ON** | **the decisive one** — most PH SMEs are on M365, and Defender rewrites every external URL |
| 4 | Google Workspace (business) | business Gmail, different policy surface from consumer |
| 5–7 | Two or three real customer corporate domains | whatever your first customers actually use |

Inbox 3 decides this. If Safe Links preserves the fragment, the other rewriters
almost certainly will; if it strips it, the option is dead regardless of the
rest.

---

## Procedure

**Step 1 — read the raw message first, before clicking anything.**

This is faster and more definitive than clicking, and it costs nothing.

- Gmail: ⋮ → *Show original*
- Outlook / M365: *…* → *View* → *View message source*

Find the anchor `href`. If it was rewritten it will look like
`https://….safelinks.protection.outlook.com/?url=<encoded>&data=…`. URL-decode
the `url` parameter and check whether `#t=TESTONLY-…` is still on the end.

Record what you see verbatim. **If the fragment is absent from the raw source,
the option has already failed for that tenant** — no click needed.

**Step 2 — click each link, desktop.** The probe page states the verdict itself
in one line. Press *Copy result* and paste it into the table below.

**Step 3 — click each link, mobile.** iOS Mail, the Gmail app and the Outlook
app each hand URLs to a browser differently, and the Outlook mobile app in
particular has its own in-app browser. Do not skip this — mobile is where most
signers will open the link.

**Step 4 — record every result, including the passes.** A pass you did not write
down is a test someone re-runs in six months.

---

## Results

Fill this in. `SURVIVED` / `MANGLED (n chars)` / `STRIPPED`.

| # | Inbox | Rewriter seen | Raw source | Desktop click | Mobile click |
|---|---|---|---|---|---|
| 1 | Gmail consumer | | | | |
| 2 | Outlook.com | | | | |
| 3 | M365 + Safe Links | | | | |
| 4 | Google Workspace | | | | |
| 5 | customer domain A | | | | |
| 6 | customer domain B | | | | |
| 7 | customer domain C | | | | |

---

## Outcome

**All SURVIVED → take the fragment.** Two lines in
`createSigningLinkBuilder` ([signing-delivery.ts:99](../../../../lagda-backend/packages/api/src/security/signing-delivery.ts)):

```ts
const url = new URL(base);
url.pathname = `${base.pathname.replace(/\/+$/, "")}/sign`;
url.hash = `t=${encodeURIComponent(rawCredential)}`;
return url.toString();
```

Then update the frontend contract in SIGNING_LINK_SCANNER_SAFETY.md, and note
that the SPA needs a **`/sign` route with no parameter** — today only
`/sign/:requestId` exists.

**Any STRIPPED or MANGLED → keep the path form**, which already works and needs
no change, and pay for it deliberately:

1. Serve `/sign/*` from an origin whose logs you control and can purge. Netlify
   edge logs are not that.
2. `<meta name="referrer" content="no-referrer">` on the document, so the full
   URL never leaves in a `Referer` to any third-party asset.
3. `history.replaceState` immediately after the exchange — cosmetic, since the
   log entry was written before your JS ran, but it keeps the credential out of
   screenshots and shoulder-surfing.
4. Write down in OD-144 that the credential is knowingly present in access logs
   for the 14-day grant lifetime, so nobody later assumes it is not.

**Mixed → the fragment fails.** A carrier that works for six tenants and not the
seventh is a carrier that silently locks out one customer's entire company.
Take the path form for everyone rather than branching on the recipient's
provider, which you cannot detect at send time anyway.

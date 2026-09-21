// The workspace half of the account-binding handoff.
//
// ── Why this page is under /app ───────────────────────────────────────────
//
// Not for the navigation — nothing links here — but because `returnTo` only
// accepts `/app` paths. Living here means a visitor who is not signed in is
// sent through the existing auth gate and comes back with the code still in
// the URL, and none of that had to be written.
//
// ── Why it opens in its own tab ───────────────────────────────────────────
//
// The signing tab does not navigate. Its URL still carries the 43-character
// access credential, and the backend sets `Referrer-Policy: no-referrer`
// specifically so that URL cannot leak; navigating it to a sign-in page would
// put the credential in history, in a `returnTo` parameter, and in whatever
// the destination logs. So the signing tab opens this one and stays put.
//
// ── Why it asks for a password ────────────────────────────────────────────
//
// Because of what confirming now means. It hands a saved signature to that
// ceremony, and from then on one confirmation applies the account holder's
// handwriting to a binding document. A session alone should not be able to do
// that — it turns a stolen session from "read my documents" into "sign as me".
//
// Asked ONCE, here, at the moment the capability is granted. Not at every use,
// which would only train people to type a password without reading what is in
// front of them.
//
// ── Why it grants nothing else ────────────────────────────────────────────
//
// Claiming records that an account and a recipient are the same person. It
// opens no ceremony and makes no document readable. The signing tab is still
// gated by the credential it already had, which is the property that makes
// the whole feature safe to add.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { realSigningAccountLinkService }
  from "../../services/real/signing-account-link.service";
import { GF, T, TAP } from "../../components/system/design-system";

type Phase = "asking" | "claiming" | "done" | "failed" | "missing";

export function LinkSigningPage() {
  const [params] = useSearchParams();
  const code = params.get("code");
  const [phase, setPhase] = useState<Phase>(code === null ? "missing" : "asking");
  const [password, setPassword] = useState("");
  const [preparedCount, setPreparedCount] = useState(0);
  const passwordId = useId();
  // A code may be claimed exactly once, and a REFUSED attempt spends it too —
  // that is what stops a stolen code being retried against account after
  // account. So a double submit would burn the code and report failure for an
  // attempt the signer only made once.
  const claiming = useRef(false);

  const claim = useCallback(async (value: string, secret: string) => {
    if (claiming.current) return;
    claiming.current = true;
    setPhase("claiming");
    try {
      const result = await realSigningAccountLinkService.claimHandoff(value, secret);
      setPreparedCount(result.preparedCount);
      setPhase("done");
    } catch {
      setPhase("failed");
    } finally {
      claiming.current = false;
    }
  }, []);

  // Disown the opener, immediately.
  //
  // The signing tab has to keep a handle to point this tab somewhere —
  // `window.open` with `noopener` returns null and cannot be navigated. That
  // handle leaves this page able to reach back and navigate the signing tab,
  // which still carries the access credential in its URL. This page has no
  // reason to do that, so it gives up the ability in its first effect rather
  // than relying on never using it.
  useEffect(() => {
    try { window.opener = null; } catch { /* already severed */ }
  }, []);

  const frame = {
    ...GF,
    display: "grid",
    placeItems: "center",
    minHeight: "60vh",
    padding: "clamp(16px, 5vw, 32px)",
    textAlign: "center",
  } as const;

  const card = {
    maxWidth: "46ch",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "clamp(10px, 3vw, 16px)",
  } as const;

  if (phase === "asking" || phase === "claiming") {
    const busy = phase === "claiming";
    return (
      <div style={frame}>
        <form
          style={{ ...card, width: "min(38ch, 100%)" }}
          onSubmit={event => {
            event.preventDefault();
            if (code !== null && password.length > 0) void claim(code, password);
          }}
        >
          <Lock size={30} color={T.azure} aria-hidden />
          <h1 style={{
            ...GF, margin: 0, fontSize: "clamp(17px, 4.6vw, 20px)",
            fontWeight: 800, color: T.ink,
          }}>
            Confirm it&rsquo;s you
          </h1>
          <p style={{ ...GF, margin: 0, fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6 }}>
            Enter your password to confirm this signing request was addressed to
            your account. If you have a saved signature, it will be made
            available for this document.
          </p>

          <label
            htmlFor={passwordId}
            style={{ ...GF, alignSelf: "flex-start", fontSize: 12, color: T.inkSoft }}
          >
            Password
          </label>
          <input
            id={passwordId}
            type="password"
            autoComplete="current-password"
            value={password}
            disabled={busy}
            onChange={event => { setPassword(event.target.value); }}
            style={{
              ...GF, width: "100%", minHeight: TAP, padding: "0 12px",
              borderRadius: 8, border: `1px solid ${T.borderStrong}`,
              fontSize: 14, color: T.ink, boxSizing: "border-box",
            }}
          />

          <button
            type="submit"
            disabled={busy || password.length === 0}
            style={{
              ...GF, width: "100%", minHeight: TAP, borderRadius: 8,
              border: "none",
              background: busy || password.length === 0 ? "#8AB8D8" : T.azure,
              color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: busy || password.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Confirming…" : "Confirm"}
          </button>
        </form>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div style={frame}>
        <div style={card}>
          <CheckCircle2 size={34} color={T.success} aria-hidden />
          <h1 style={{
            ...GF, margin: 0, fontSize: "clamp(17px, 4.6vw, 20px)",
            fontWeight: 800, color: T.ink,
          }}>
            That&rsquo;s you confirmed
          </h1>
          <p style={{ ...GF, margin: 0, fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6 }}>
            {preparedCount > 0
              ? "Your saved signature is ready to use. Go back to the tab where you opened your signing link and carry on. You can close this one."
              : "Go back to the tab where you opened your signing link and carry on. You can close this one."}
          </p>
          {preparedCount === 0 && (
            <p style={{ ...GF, margin: 0, fontSize: 12, color: T.silver, lineHeight: 1.6 }}>
              You have no saved signature yet. You can still sign by drawing,
              typing or uploading one.
            </p>
          )}
        </div>
      </div>
    );
  }

  // `missing` and `failed` say the same thing, and deliberately.
  //
  // A code can fail because it is unknown, expired, already used, or belongs
  // to a different account. Telling the visitor which would let someone
  // holding a code learn that a particular address has an account here — the
  // backend collapses all of those into one refusal for that reason, and a
  // page that helpfully expanded it would undo the whole precaution.
  return (
    <div style={frame}>
      <div style={card}>
        <AlertCircle size={34} color={T.warn} aria-hidden />
        <h1 style={{
          ...GF, margin: 0, fontSize: "clamp(17px, 4.6vw, 20px)",
          fontWeight: 800, color: T.ink,
        }}>
          This link can&rsquo;t be used
        </h1>
        <p style={{ ...GF, margin: 0, fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6 }}>
          Sign-in links are only good for a couple of minutes and can be used
          once. Go back to your signing tab and choose to sign in again.
        </p>
        <a
          href="/app/dashboard"
          style={{
            ...GF, minHeight: TAP, display: "inline-flex", alignItems: "center",
            padding: "0 18px", borderRadius: 8, background: T.azure,
            color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none",
          }}
        >
          Go to my dashboard
        </a>
      </div>
    </div>
  );
}

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
// ── Why it grants nothing ─────────────────────────────────────────────────
//
// Claiming records that an account and a recipient are the same person. It
// opens no ceremony and makes no document readable. The signing tab is still
// gated by the credential it already had, which is the property that makes
// the whole feature safe to add.

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { realSigningAccountLinkService }
  from "../../services/real/signing-account-link.service";
import { GF, T, TAP } from "../../components/system/design-system";

type Phase = "claiming" | "done" | "failed" | "missing";

export function LinkSigningPage() {
  const [params] = useSearchParams();
  const code = params.get("code");
  const [phase, setPhase] = useState<Phase>(code === null ? "missing" : "claiming");
  // A code may be claimed exactly once. React 18 mounts effects twice in
  // development, and the second run would spend the code and report failure
  // for a claim that had already succeeded.
  const claimed = useRef(false);

  const claim = useCallback(async (value: string) => {
    if (claimed.current) return;
    claimed.current = true;
    try {
      await realSigningAccountLinkService.claimHandoff(value);
      setPhase("done");
    } catch {
      setPhase("failed");
    }
  }, []);

  useEffect(() => {
    if (code !== null) void claim(code);
  }, [code, claim]);

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

  if (phase === "claiming") {
    return (
      <div style={frame}>
        <div style={card}>
          <p role="status" style={{ ...GF, fontSize: 14, color: T.inkSoft }}>
            Confirming it is you…
          </p>
        </div>
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
            Go back to the tab where you opened your signing link and carry on.
            You can close this one.
          </p>
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
          Sign-in links are only good for a couple of minutes. Go back to your
          signing tab and choose to sign in again.
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

// After a successful signature: "Save this as your default signature?"
//
// Asked only of a signer whose account is linked to this ceremony and who has
// no signature saved in Settings yet. It never runs before the submission is
// confirmed and nothing it does can change that outcome — a failed save is
// reported here and the document stays signed.
//
// It writes to the ACCOUNT's library, so it goes through the workspace-realm
// client (as `signing-account-link.service` already does for the handoff
// claim). No session there — an expired sign-in, another browser — simply
// means the question is not asked.

import { useEffect, useState } from "react";
import { CheckCircle2, PenLine } from "lucide-react";
import type { SignatureValue } from "./SignatureCapture";
import {
  realUserSignatureService, type SignaturePurpose,
} from "../../services/real/user-signatures.service";

type Phase = "checking" | "asking" | "saving" | "saved" | "declined" | "failed" | "hidden";

const GF = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";

type SavableMark = Extract<SignatureValue, { method: "typed" } | { method: "drawn" }>;

/** The mark alone: provenance describes a capture, not a preference. */
export function savableMark(value: SignatureValue | null): SavableMark | null {
  if (value === null) return null;
  if (value.method === "typed") return { method: "typed", text: value.text, styleIndex: value.styleIndex };
  if (value.method === "drawn") return { method: "drawn", base64: value.base64 };
  return null;
}

export function SaveSignaturePrompt({
  eligible, signature, initials,
}: {
  /** An account is linked to this ceremony, in a build with a real backend. */
  eligible: boolean;
  signature: SignatureValue | null;
  initials: SignatureValue | null;
}) {
  const mark = savableMark(signature);
  const [phase, setPhase] = useState<Phase>(eligible && mark !== null ? "checking" : "hidden");
  const [alsoInitials, setAlsoInitials] = useState<SavableMark | null>(null);

  useEffect(() => {
    if (phase !== "checking") return;
    let cancelled = false;
    realUserSignatureService.list().then(saved => {
      if (cancelled) return;
      const has = (p: SignaturePurpose) => saved.some(s => s.purpose === p);
      if (has("signature")) { setPhase("hidden"); return; }
      setAlsoInitials(has("initials") ? null : savableMark(initials));
      setPhase("asking");
    }).catch(() => { if (!cancelled) setPhase("hidden"); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "hidden" || phase === "checking" || mark === null) return null;

  const save = async () => {
    setPhase("saving");
    try {
      await realUserSignatureService.save("signature", mark);
      if (alsoInitials !== null) {
        // Initials are a bonus. Missing them must not turn a saved signature
        // into a reported failure.
        await realUserSignatureService.save("initials", alsoInitials).catch(() => undefined);
      }
      setPhase("saved");
    } catch {
      setPhase("failed");
    }
  };

  const preview = mark.method === "drawn"
    ? <img src={`data:image/png;base64,${mark.base64}`} alt="Your signature" style={{ maxHeight: 56, maxWidth: "100%", objectFit: "contain" }} />
    : <span style={{ fontFamily: "'Times New Roman', Times, serif", fontStyle: "italic", fontSize: 24, color: "#0F172A", overflowWrap: "anywhere" }}>{mark.text}</span>;

  return (
    <section
      aria-live="polite"
      aria-label="Save your signature"
      style={{
        ...GF, border: "1px solid #BFDBFE", background: "#F8FBFF", borderRadius: 12,
        padding: "16px 18px", marginTop: 16, boxSizing: "border-box", maxWidth: "100%",
      }}
    >
      {phase === "saved" ? (
        <p style={{ ...GF, margin: 0, fontSize: 13.5, color: "#065F46", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden />
          Saved as your default signature{alsoInitials !== null ? " and initials" : ""}. It will be ready the next time you sign.
        </p>
      ) : phase === "declined" ? (
        <p style={{ ...GF, margin: 0, fontSize: 13, color: "#475569" }}>
          Okay — it wasn&apos;t saved. You can add one any time in Settings under Signatures &amp; Initials.
        </p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
            <PenLine size={17} color={AZURE} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
            <div style={{ minWidth: 0 }}>
              <p style={{ ...GF, margin: "0 0 3px", fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                Save this signature as your default signature?
              </p>
              <p style={{ ...GF, margin: 0, fontSize: 12.5, color: "#64748B", lineHeight: 1.5 }}>
                It will be saved to your Settings so it is ready for future signing.
                {alsoInitials !== null ? " Your initials will be saved too." : ""}
              </p>
            </div>
          </div>
          <div style={{
            background: "white", border: "1px dashed #CBD5E1", borderRadius: 8,
            padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", minHeight: 56,
          }}>
            {preview}
          </div>
          {phase === "failed" && (
            <p role="alert" style={{ ...GF, margin: "0 0 10px", fontSize: 12.5, color: "#B91C1C", lineHeight: 1.5 }}>
              It couldn&apos;t be saved just now. Your document is still signed — you can try again, or add it later in Settings.
            </p>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => { void save(); }}
              disabled={phase === "saving"}
              style={{
                ...GF, flex: "1 1 140px", minHeight: 44, fontSize: 14, fontWeight: 700,
                color: "white", background: phase === "saving" ? "#94A3B8" : AZURE,
                border: "none", borderRadius: 8, cursor: phase === "saving" ? "default" : "pointer",
              }}
            >
              {phase === "saving" ? "Saving…" : phase === "failed" ? "Try again" : "Yes, save it"}
            </button>
            <button
              type="button"
              onClick={() => setPhase("declined")}
              disabled={phase === "saving"}
              style={{
                ...GF, flex: "1 1 140px", minHeight: 44, fontSize: 14, fontWeight: 600,
                color: "#334155", background: "white", border: "1px solid #CBD5E1", borderRadius: 8, cursor: "pointer",
              }}
            >
              No, thanks
            </button>
          </div>
        </>
      )}
    </section>
  );
}

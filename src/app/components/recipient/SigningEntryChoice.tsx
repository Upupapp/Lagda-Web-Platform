// The first thing a signer sees: sign in to your LAGDA account to continue.
//
// ── What changed, and why this is one panel now ────────────────────────────
//
// This was a choice between two panels: sign without an account, or sign
// with one. Signing now requires a signed-in account, so the no-account panel
// is gone and what remains is a single, required step rather than an offer.
//
// A required step has to explain itself in a way an optional one does not.
// Someone who was sent a contract and now meets a sign-in wall will reasonably
// ask why, and whether they need to create an account just to sign one thing.
// The panel answers both before they have to ask: what signing in does for
// this document, and that creating an account is free and happens in the
// same flow.
//
// ── What it deliberately does not say ─────────────────────────────────────
//
// It does not claim signing in makes the signature legally stronger or the
// session more secure than it was. The signing link is still what proves this
// document is yours to sign; the account confirms who you are and keeps your
// signature for next time. Overstating that would be untrue, and on the one
// screen where somebody decides whether to trust the product, it would be the
// worst place to be caught out.
//
// ── Layout ────────────────────────────────────────────────────────────────
//
// One centred card, capped in width so the explanation reads as a paragraph
// rather than a banner. Every size is fluid, and it is usable at 320px.

import { ShieldCheck, PenLine, History, UserPlus, ArrowRight, Mail } from "lucide-react";
import lagdaHeaderLogo from "../../../brand elements/svg/LagdaLogoPrimaryHorizontalFullColor_Header.svg";
import { GF, T, TAP, useViewport } from "../system/design-system";

export interface SigningEntryChoiceProps {
  /** The document being signed, so the request is about something concrete. */
  readonly documentTitle: string;
  /** Masked. Shown so a signer can confirm which address this was sent to. */
  readonly maskedEmail: string;
  readonly onContinueWithAccount: () => void;
  readonly disabled?: boolean;
}

function Point({ icon: Icon, children }: {
  icon: typeof ShieldCheck; children: React.ReactNode;
}) {
  return (
    <li style={{
      ...GF, display: "flex", gap: 10, alignItems: "flex-start",
      fontSize: "clamp(12.5px, 3.3vw, 13.5px)", lineHeight: 1.55,
      color: "rgba(255,255,255,0.9)",
    }}>
      <Icon size={16} aria-hidden style={{ flexShrink: 0, marginTop: 2, color: "#7FD1FF" }} />
      <span>{children}</span>
    </li>
  );
}

export function SigningEntryChoice({
  documentTitle, maskedEmail, onContinueWithAccount, disabled = false,
}: SigningEntryChoiceProps) {
  const { isCompact } = useViewport();

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: "clamp(14px, 4vw, 20px)",
      width: "100%", maxWidth: 560, marginInline: "auto",
    }}>
      <header style={{ textAlign: "center" }}>
        <h1 style={{
          ...GF, margin: 0, fontSize: "clamp(19px, 5vw, 25px)",
          fontWeight: 800, color: T.ink, lineHeight: 1.3,
        }}>
          Sign in to sign this document
        </h1>
        <p style={{
          ...GF, margin: "8px auto 0", maxWidth: "52ch",
          fontSize: "clamp(12.5px, 3.4vw, 14px)", color: T.inkSoft, lineHeight: 1.6,
        }}>
          You&rsquo;ve been asked to sign <strong style={{ color: T.ink }}>{documentTitle}</strong>.
          Signing requires your LAGDA account.
        </p>
      </header>

      <section
        aria-labelledby="signin-required"
        style={{
          display: "flex", flexDirection: "column",
          gap: "clamp(12px, 3vw, 16px)",
          padding: "clamp(18px, 5vw, 28px)",
          borderRadius: 16,
          background: `linear-gradient(160deg, ${T.ink} 0%, #0B2137 55%, ${T.azureDeep} 100%)`,
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 10px 30px rgba(7,17,31,0.18)",
        }}
      >
        {/* The brand SVG. It is full colour — navy lettering — and there is
            no white SVG, so it sits on a white chip rather than directly on
            the dark gradient, where the wordmark would all but disappear. */}
        <div aria-hidden style={{
          alignSelf: "flex-start", background: "#FFFFFF", borderRadius: 10,
          padding: "4px 10px", lineHeight: 0,
        }}>
          <img
            src={lagdaHeaderLogo}
            alt=""
            style={{
              display: "block",
              width: isCompact ? 132 : 168,
              aspectRatio: "200 / 58",
              height: "auto",
              objectFit: "cover",
              objectPosition: "left center",
            }}
          />
        </div>

        <h2 id="signin-required" style={{
          ...GF, margin: 0, fontSize: "clamp(16px, 4.2vw, 18px)",
          fontWeight: 800, color: "#FFFFFF",
        }}>
          Sign in with your LAGDA account
        </h2>

        {/* The address the request was sent to. Signing in with a different
            account is refused, and saying which address to use up front is
            cheaper than letting someone discover it after typing a password. */}
        <p style={{
          ...GF, margin: 0, display: "flex", alignItems: "center", gap: 8,
          fontSize: "clamp(12px, 3.2vw, 13px)", color: "rgba(255,255,255,0.78)",
          lineHeight: 1.5, flexWrap: "wrap",
        }}>
          <Mail size={14} aria-hidden style={{ flexShrink: 0 }} />
          Use the account for <strong style={{ color: "#FFFFFF" }}>{maskedEmail}</strong> — the
          address this document was sent to.
        </p>

        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          <Point icon={ShieldCheck}>
            Confirms it&rsquo;s really you signing, against your own account.
          </Point>
          <Point icon={PenLine}>
            Use a saved signature, or draw, type or upload one here.
          </Point>
          <Point icon={History}>
            Keeps a record of what you&rsquo;ve signed in your account.
          </Point>
          <Point icon={UserPlus}>
            No account yet? Create one free in the next step, then come back
            to this tab.
          </Point>
        </ul>

        <button
          type="button"
          onClick={onContinueWithAccount}
          disabled={disabled}
          style={{
            ...GF,
            minHeight: TAP + 4,
            marginTop: 4,
            borderRadius: 10,
            border: "none",
            background: "#FFFFFF",
            color: T.ink,
            fontSize: "clamp(14px, 3.6vw, 15px)",
            fontWeight: 700,
            cursor: disabled ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
          }}
        >
          Sign in &amp; continue <ArrowRight size={16} aria-hidden />
        </button>
      </section>

      {/* Said once, plainly. Somebody meeting a sign-in wall on a document
          they were sent should know what happens to this tab while they sign
          in, because the sign-in opens a second one. */}
      <p style={{
        ...GF, margin: 0, textAlign: "center", fontSize: 12,
        color: T.silver, lineHeight: 1.6, maxWidth: "58ch", marginInline: "auto",
      }}>
        Signing in opens a new tab. Keep this one open — it continues to the
        document on its own once you&rsquo;re signed in.
      </p>
    </div>
  );
}

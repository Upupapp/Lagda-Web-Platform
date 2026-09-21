// The first thing a signer sees: two ways to sign this document.
//
// ── Why a choice at all ───────────────────────────────────────────────────
//
// Signing without an account is the whole product, and it works. Adding an
// account path could easily read as "the real way, and a lesser way for
// people who will not sign up" — which would be both untrue and the sort of
// pressure a signing product should not apply. Someone asked to sign a
// contract did not choose to be here.
//
// So the no-account panel is FIRST and is written as a complete, confident
// offer, not a fallback. It explains the security properties it actually has
// rather than apologising for what it lacks.
//
// The account panel is allowed to sell — that is what was asked for, and
// there is a real benefit to sell: a signature you keep instead of redrawing
// on every document. What it must not do is imply the other path is unsafe.
//
// ── Layout ────────────────────────────────────────────────────────────────
//
// `repeat(auto-fit, minmax(...))` rather than a breakpoint, so the panels sit
// side by side where there is room and stack where there is not — reflowing
// when the content needs it rather than at a width someone guessed. Every
// size is fluid `clamp()` and the whole thing is usable at 320px.

import { ShieldCheck, Lock, PenLine, Clock, Check, ArrowRight } from "lucide-react";
import { LagdaLogo } from "../brand/LagdaLogo";
import { GF, T, TAP, useViewport } from "../system/design-system";

export interface SigningEntryChoiceProps {
  /** The document being signed, so the choice is about something concrete. */
  readonly documentTitle: string;
  /** Masked. Shown so a signer can tell which address this was sent to. */
  readonly maskedEmail: string;
  readonly onContinueWithoutAccount: () => void;
  readonly onContinueWithAccount: () => void;
  readonly disabled?: boolean;
}

function Point({ icon: Icon, children }: {
  icon: typeof ShieldCheck; children: React.ReactNode;
}) {
  return (
    <li style={{
      ...GF, display: "flex", gap: 8, alignItems: "flex-start",
      fontSize: "clamp(12px, 3.2vw, 13px)", lineHeight: 1.55, color: T.inkSoft,
    }}>
      <Icon size={15} aria-hidden style={{ flexShrink: 0, marginTop: 2, color: T.azure }} />
      <span>{children}</span>
    </li>
  );
}

export function SigningEntryChoice({
  documentTitle, maskedEmail,
  onContinueWithoutAccount, onContinueWithAccount, disabled = false,
}: SigningEntryChoiceProps) {
  const { isCompact } = useViewport();

  const panel = {
    display: "flex",
    flexDirection: "column" as const,
    gap: "clamp(10px, 2.6vw, 14px)",
    padding: "clamp(16px, 4.5vw, 24px)",
    borderRadius: 16,
    minWidth: 0,
  };

  const button = {
    ...GF,
    minHeight: TAP,
    borderRadius: 10,
    fontSize: "clamp(13px, 3.4vw, 14px)",
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(14px, 4vw, 22px)" }}>
      <header style={{ textAlign: "center" }}>
        <h1 style={{
          ...GF, margin: 0, fontSize: "clamp(18px, 5vw, 24px)",
          fontWeight: 800, color: T.ink, lineHeight: 1.3,
        }}>
          How would you like to sign?
        </h1>
        <p style={{
          ...GF, margin: "8px auto 0", maxWidth: "52ch",
          fontSize: "clamp(12.5px, 3.4vw, 13.5px)", color: T.inkSoft, lineHeight: 1.6,
        }}>
          You&rsquo;ve been asked to sign <strong style={{ color: T.ink }}>{documentTitle}</strong>,
          sent to {maskedEmail}. Both options below produce the same legally
          binding signature.
        </p>
      </header>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
        gap: "clamp(12px, 3vw, 18px)",
        alignItems: "stretch",
      }}>
        {/* ── Without an account ──────────────────────────────────────────
            First, and written as a complete offer. Someone asked to sign a
            contract did not choose to be here, and should not be made to feel
            they are taking the lesser road for declining to sign up. */}
        <section
          aria-labelledby="choice-guest"
          style={{ ...panel, background: T.surface, border: `1px solid ${T.border}` }}
        >
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            alignSelf: "flex-start", padding: "5px 10px", borderRadius: 999,
            background: T.successWash, border: "1px solid #B7E3CA",
          }}>
            <ShieldCheck size={14} aria-hidden style={{ color: T.success }} />
            <span style={{
              ...GF, fontSize: 11, fontWeight: 700, color: T.success,
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>
              Secure session
            </span>
          </div>

          <h2 id="choice-guest" style={{
            ...GF, margin: 0, fontSize: "clamp(15px, 4vw, 17px)",
            fontWeight: 800, color: T.ink,
          }}>
            Sign without a LAGDA account
          </h2>

          <p style={{
            ...GF, margin: 0, fontSize: "clamp(12.5px, 3.3vw, 13px)",
            color: T.inkSoft, lineHeight: 1.6,
          }}>
            No sign-up, no password, nothing to remember. The link in your email
            is what proves this document is yours to sign.
          </p>

          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 9 }}>
            <Point icon={Lock}>
              Your session is protected by a one-time link that only works for
              you, and only for this document.
            </Point>
            <Point icon={ShieldCheck}>
              Everything you send is encrypted in transit, and your signature is
              recorded with a tamper-evident audit trail.
            </Point>
            <Point icon={PenLine}>
              Draw, type or upload your signature — whichever suits the device
              you&rsquo;re on.
            </Point>
            <Point icon={Clock}>
              Takes about a minute. You&rsquo;ll get a copy of the completed
              document by email.
            </Point>
          </ul>

          <div style={{ flex: 1 }} />

          <button
            type="button"
            onClick={onContinueWithoutAccount}
            disabled={disabled}
            style={{
              ...button,
              background: T.ink,
              color: "#FFFFFF",
              border: "none",
            }}
          >
            Continue without an account <ArrowRight size={16} aria-hidden />
          </button>
          <span style={{
            ...GF, fontSize: 11.5, color: T.silver, textAlign: "center", lineHeight: 1.5,
          }}>
            Recommended if you just need to sign this once
          </span>
        </section>

        {/* ── With an account ─────────────────────────────────────────────
            Allowed to sell, because there is something real to sell. What it
            must never do is imply the other panel is unsafe — it is not, and
            saying so would be both false and coercive. */}
        <section
          aria-labelledby="choice-account"
          style={{
            ...panel,
            // The brand gradient, used here and nowhere else in the ceremony:
            // this is the one screen making an offer rather than carrying out
            // an instruction.
            background: `linear-gradient(160deg, ${T.ink} 0%, #0B2137 55%, ${T.azureDeep} 100%)`,
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 10px 30px rgba(7,17,31,0.18)",
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 10, flexWrap: "wrap",
          }}>
            {/* Deliberately the largest logo in the ceremony. This is the
                only panel doing brand work rather than instructing, and at
                `md` it read as a favicon stranded in the corner. */}
            <LagdaLogo variant="white-horizontal" size={isCompact ? "lg" : "xl"} decorative />
            <span style={{
              ...GF, fontSize: 10.5, fontWeight: 700, color: "#7FD1FF",
              letterSpacing: "0.12em", textTransform: "uppercase",
            }}>
              Faster next time
            </span>
          </div>

          <h2 id="choice-account" style={{
            ...GF, margin: 0, fontSize: "clamp(15px, 4vw, 17px)",
            fontWeight: 800, color: "#FFFFFF",
          }}>
            Sign with your LAGDA account
          </h2>

          <p style={{
            ...GF, margin: 0, fontSize: "clamp(12.5px, 3.3vw, 13px)",
            color: "rgba(255,255,255,0.78)", lineHeight: 1.6,
          }}>
            Save your signature once and apply it to every document you&rsquo;re
            sent — this one included.
          </p>

          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 9 }}>
            {[
              "Your saved signature, ready to apply in one tap",
              "Your signing history in one place",
              "Your identity confirmed against your account on every signature",
              "Works on any device you're signed in to",
            ].map(line => (
              <li key={line} style={{
                ...GF, display: "flex", gap: 8, alignItems: "flex-start",
                fontSize: "clamp(12px, 3.2vw, 13px)", lineHeight: 1.55,
                color: "rgba(255,255,255,0.88)",
              }}>
                <Check size={15} aria-hidden style={{ flexShrink: 0, marginTop: 2, color: "#7FD1FF" }} />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <div style={{ flex: 1 }} />

          <button
            type="button"
            onClick={onContinueWithAccount}
            disabled={disabled}
            style={{
              ...button,
              background: "#FFFFFF",
              color: T.ink,
              border: "none",
            }}
          >
            Sign in &amp; continue <ArrowRight size={16} aria-hidden />
          </button>
          <span style={{
            ...GF, fontSize: 11.5, color: "rgba(255,255,255,0.65)",
            textAlign: "center", lineHeight: 1.5,
          }}>
            No account yet? You can create one in the next step — it&rsquo;s free.
          </span>
        </section>
      </div>

      {/* Said once, plainly, under both. A signer choosing the left-hand panel
          should not be left wondering what they gave up. */}
      <p style={{
        ...GF, margin: 0, textAlign: "center", fontSize: 11.5,
        color: T.silver, lineHeight: 1.6, maxWidth: "60ch",
        marginInline: "auto",
      }}>
        Either way you&rsquo;ll be asked to consent to sign electronically, you
        can read the document in full before signing, and the signature carries
        the same legal weight.
      </p>
    </div>
  );
}

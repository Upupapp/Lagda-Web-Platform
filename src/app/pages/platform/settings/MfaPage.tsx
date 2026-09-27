// /app/settings/security/mfa — two-step verification.
//
// With a backend the status is `/me`'s security summary (mfaEnabled,
// mfaFactor, recoveryCodesRemaining). Setting it up is the existing
// /mfa/setup flow, opened with `?from=settings` so it returns here. The demo
// build shows the same page with the demo status.

import { Link } from "react-router";
import { ShieldCheck, ShieldAlert, Smartphone, LifeBuoy, ArrowRight } from "lucide-react";
import { SettingsPage, SSection, Badge, Skeleton, BTN_PRIMARY, BTN_SECONDARY, SET, Notice } from "./SettingsShell";
import { useSecuritySummary } from "./settings-data";

const GF = { fontFamily: SET.FONT };

const MFA_SETUP_PATH = "/mfa/setup?from=settings";

export function MfaPage() {
  const { mfa, error, reload } = useSecuritySummary();
  const heading = {
    title: "Two-step verification",
    breadcrumb: "Security › Two-step verification",
    description: "A code from an authenticator app, asked for after your password, so a stolen password alone cannot open your account.",
  };

  if (error) return (
    <SettingsPage {...heading}>
      <Notice tone="danger" role="alert">Your two-step verification status could not be loaded.</Notice>
      <button type="button" onClick={reload} style={BTN_SECONDARY}>Try again</button>
    </SettingsPage>
  );
  if (mfa === null) return <SettingsPage {...heading}><Skeleton h={150} mb={16} /><Skeleton h={110} /></SettingsPage>;

  return (
    <SettingsPage {...heading}>
      <SSection title="Status" icon={mfa.enabled ? ShieldCheck : ShieldAlert}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: "1 1 260px" }}>
            <span aria-hidden style={{ width: 42, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              background: mfa.enabled ? "#DCFCE7" : "#FEF3C7", color: mfa.enabled ? "#166534" : "#92400E" }}>
              <Smartphone size={20} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ ...GF, fontSize: 14.5, fontWeight: 700, color: SET.NAVY }}>Authenticator app</span>
                <span data-testid="mfa-status">{mfa.enabled ? <Badge tone="success" dot>On</Badge> : <Badge tone="warning" dot>Off</Badge>}</span>
              </div>
              <div style={{ ...GF, fontSize: 13, color: SET.SLATE, marginTop: 3, lineHeight: 1.5 }}>
                {mfa.enabled
                  ? "You are asked for a code from your authenticator app each time you sign in."
                  : "Only your password protects your account. Turn on two-step verification to add a second check."}
              </div>
            </div>
          </div>
          {!mfa.enabled && (
            <Link to={MFA_SETUP_PATH} data-testid="mfa-setup-link" style={{ ...BTN_PRIMARY, textDecoration: "none" }}>
              Set up two-step verification <ArrowRight size={15} aria-hidden />
            </Link>
          )}
        </div>
      </SSection>

      <SSection title="Recovery codes" icon={LifeBuoy}>
        {mfa.enabled ? (
          <p style={{ ...GF, fontSize: 13.5, color: SET.INK, margin: 0, lineHeight: 1.6 }}>
            {mfa.recoveryCodesRemaining === null
              ? "Use a recovery code to sign in if you lose your phone."
              : <>You have <strong data-testid="mfa-recovery-remaining">{mfa.recoveryCodesRemaining}</strong> unused recovery code{mfa.recoveryCodesRemaining === 1 ? "" : "s"}. Each works once, if you lose your phone.</>}
          </p>
        ) : (
          <p style={{ ...GF, fontSize: 13.5, color: SET.SLATE, margin: 0, lineHeight: 1.6 }}>
            You receive a set of single-use recovery codes when you set up two-step verification. Keep them somewhere safe — they let you sign in if you lose your phone.
          </p>
        )}
      </SSection>
    </SettingsPage>
  );
}

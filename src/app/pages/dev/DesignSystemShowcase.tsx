// Design system development showcase — not linked from public navigation.
// Only accessible at /dev/design-system.
// Demonstrates all foundational design system components for validation.

import { useState, useRef } from "react";
import { LagdaLogo } from "../../components/brand/LagdaLogo";
import { LagdaLoader } from "../../components/brand/LagdaLoader";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { StatusChip } from "../../components/ui/StatusChip";
import { ComingSoonBadge } from "../../components/ui/ComingSoonBadge";
import { EmptyState } from "../../components/ui/EmptyState";
import { VerificationId } from "../../components/ui/VerificationId";
import { DOCUMENT_STATUS_MAP, VERIFICATION_STATUS_MAP } from "../../data/status-map";
import { useLagdaLoading } from "../../services/loading.service";
import type { TransactionStatus } from "../../models";
import { Link } from "react-router";

// ── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 64 }}>
      <div style={{ borderBottom: "1px solid rgba(0,0,0,0.08)", paddingBottom: 12, marginBottom: 28 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: "#0078D4",
            fontFamily: "'Geist Mono', monospace",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

// ── Token swatch ─────────────────────────────────────────────────────────────
function ColorSwatch({ hex, name, label }: { hex: string; name: string; label?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 100 }}>
      <div
        style={{
          width: "100%",
          height: 48,
          borderRadius: 8,
          background: hex,
          border: "1px solid rgba(0,0,0,0.08)",
        }}
        aria-label={`Color swatch: ${name}`}
      />
      <div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#07111F" }}>{name}</p>
        <p style={{ margin: 0, fontSize: 11, color: "#64748B", fontFamily: "'Geist Mono', monospace" }}>
          {hex}
          {label && <> — {label}</>}
        </p>
      </div>
    </div>
  );
}

// ── TypeSpec row ─────────────────────────────────────────────────────────────
function TypeRow({ role, size, weight, sample }: { role: string; size: string; weight: string; sample: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 24,
        padding: "12px 0",
        borderBottom: "1px solid rgba(0,0,0,0.05)",
      }}
    >
      <span style={{ width: 160, fontSize: 11, color: "#64748B", fontFamily: "'Geist Mono', monospace", flexShrink: 0 }}>
        {role}
      </span>
      <span style={{ width: 80, fontSize: 11, color: "#94A3B8", fontFamily: "'Geist Mono', monospace", flexShrink: 0 }}>
        {size}
      </span>
      <span style={{ width: 80, fontSize: 11, color: "#94A3B8", fontFamily: "'Geist Mono', monospace", flexShrink: 0 }}>
        {weight}
      </span>
      <span style={{ fontSize: size, fontWeight: weight, color: "#07111F" }}>
        {sample}
      </span>
    </div>
  );
}

// ── Fullscreen loader with smooth exit ───────────────────────────────────────
function FullscreenPreview({ theme }: { theme: "dark" | "light" }) {
  const [mounted,   setMounted]   = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout>>();

  function launch() {
    clearTimeout(exitTimer.current);
    setIsExiting(false);
    setMounted(true);
    exitTimer.current = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => { setMounted(false); setIsExiting(false); }, 240);
    }, 3000);
  }

  const label = theme === "dark" ? "Preview fullscreen (dark, 3s)" : "Preview fullscreen (light, 3s)";
  const variant = theme === "dark" ? "navy" as const : "primary-outline" as const;

  return (
    <>
      <Button variant={variant} size="md" onClick={launch}>{label}</Button>
      {mounted && (
        <LagdaLoader
          mode="fullscreen"
          theme={theme}
          message="Preparing your secure workspace"
          showWordmark
          isExiting={isExiting}
        />
      )}
    </>
  );
}

// ── Main showcase ─────────────────────────────────────────────────────────────
export function DesignSystemShowcase() {
  const [inlineMsg] = useState("Verifying document record");
  const { show, hide } = useLagdaLoading();

  const ALL_STATUSES = Object.keys(DOCUMENT_STATUS_MAP) as TransactionStatus[];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafb",
        fontFamily: "'Geist', 'Inter', sans-serif",
        color: "#07111F",
      }}
    >
      {/* Dev header */}
      <div
        style={{
          background: "#07111F",
          borderBottom: "1px solid rgba(0,120,212,0.2)",
          padding: "12px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <LagdaLogo variant="white-horizontal" size="sm" />
          <span
            style={{
              fontSize: 11,
              color: "#0078D4",
              fontFamily: "'Geist Mono', monospace",
              background: "rgba(0,120,212,0.12)",
              border: "1px solid rgba(0,120,212,0.25)",
              borderRadius: 6,
              padding: "3px 8px",
            }}
          >
            Design System — Command 3
          </span>
        </div>
        <Link
          to="/esignature"
          style={{ fontSize: 12, color: "#475569", textDecoration: "none" }}
        >
          ← Back to Portal
        </Link>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 32px" }}>
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 700, color: "#07111F" }}>
            LAGDA Design System
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: "#64748B", lineHeight: 1.6 }}>
            Component showcase — Command 3. Not linked from production navigation.
          </p>
        </div>

        {/* ── LOGO VARIANTS ─────────────────────────────────────────────────── */}
        <Section title="Logo Variants" id="logo">
          <div style={{ display: "grid", gap: 24 }}>
            {/* Light surface row */}
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>
                Light surface (colored-horizontal, colored-icon)
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 32,
                  alignItems: "center",
                  flexWrap: "wrap",
                  background: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <LagdaLogo variant="colored-horizontal" size="xs" />
                <LagdaLogo variant="colored-horizontal" size="sm" />
                <LagdaLogo variant="colored-horizontal" size="md" />
                <LagdaLogo variant="colored-horizontal" size="lg" />
                <div style={{ width: 1, height: 40, background: "rgba(0,0,0,0.08)" }} />
                <LagdaLogo variant="colored-icon" size="xs" />
                <LagdaLogo variant="colored-icon" size="sm" />
                <LagdaLogo variant="colored-icon" size="md" />
                <LagdaLogo variant="colored-icon" size="lg" />
              </div>
            </div>

            {/* Dark surface row */}
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>
                Dark surface (white-horizontal, white-icon)
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 32,
                  alignItems: "center",
                  flexWrap: "wrap",
                  background: "#07111F",
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <LagdaLogo variant="white-horizontal" size="xs" />
                <LagdaLogo variant="white-horizontal" size="sm" />
                <LagdaLogo variant="white-horizontal" size="md" />
                <LagdaLogo variant="white-horizontal" size="lg" />
                <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.1)" }} />
                <LagdaLogo variant="white-icon" size="xs" />
                <LagdaLogo variant="white-icon" size="sm" />
                <LagdaLogo variant="white-icon" size="md" />
              </div>
            </div>

            {/* Mono row */}
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>
                Monochrome (black-horizontal, mono-icon)
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 32,
                  alignItems: "center",
                  flexWrap: "wrap",
                  background: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <LagdaLogo variant="black-horizontal" size="sm" />
                <LagdaLogo variant="black-horizontal" size="md" />
                <div style={{ width: 1, height: 40, background: "rgba(0,0,0,0.08)" }} />
                <LagdaLogo variant="mono-icon" size="xs" />
                <LagdaLogo variant="mono-icon" size="sm" />
                <LagdaLogo variant="mono-icon" size="md" />
              </div>
            </div>
          </div>
        </Section>

        {/* ── COLORS ────────────────────────────────────────────────────────── */}
        <Section title="Brand Colors" id="colors">
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, color: "#334155" }}>
                Azure (eSignature — active product)
              </p>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <ColorSwatch hex="#0078D4" name="Azure" label="--lagda-azure" />
                <ColorSwatch hex="#006CC1" name="Azure Hover" label="--lagda-azure-hover" />
                <ColorSwatch hex="#005BA9" name="Azure Active" label="--lagda-azure-active" />
                <ColorSwatch hex="#38BDF8" name="Azure Glow" label="--lagda-azure-glow" />
                <ColorSwatch hex="#EAF6FF" name="Azure Surface" label="--lagda-azure-surface" />
                <ColorSwatch hex="#BAE0FA" name="Azure Border" label="--lagda-azure-border" />
              </div>
            </div>
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, color: "#334155" }}>
                Navy (background, navigation)
              </p>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <ColorSwatch hex="#07111F" name="Deep Navy" label="--lagda-navy" />
                <ColorSwatch hex="#0B2344" name="Midnight Azure" label="--lagda-navy-mid" />
              </div>
            </div>
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, color: "#334155" }}>
                Burgundy (eNotary — future regulated capability)
              </p>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <ColorSwatch hex="#67023B" name="Burgundy" label="--lagda-burgundy" />
                <ColorSwatch hex="#B01262" name="Burgundy Hover" label="--lagda-burgundy-hover" />
                <ColorSwatch hex="#FCE7F3" name="Burgundy Surface" label="--lagda-burgundy-surface" />
                <ColorSwatch hex="#F9A8D4" name="Burgundy Border" label="--lagda-burgundy-border" />
              </div>
            </div>
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, color: "#334155" }}>
                Gold (verification, completion, premium accents)
              </p>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <ColorSwatch hex="#C9960C" name="Gold" label="--lagda-gold" />
                <ColorSwatch hex="#FCD34D" name="Gold Light" label="--lagda-gold-light" />
                <ColorSwatch hex="#FFFBEB" name="Gold Surface" label="--lagda-gold-surface" />
              </div>
            </div>
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, color: "#334155" }}>
                Semantic
              </p>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <ColorSwatch hex="#16A34A" name="Success" />
                <ColorSwatch hex="#DCFCE7" name="Success Surface" />
                <ColorSwatch hex="#D97706" name="Warning" />
                <ColorSwatch hex="#FEF3C7" name="Warning Surface" />
                <ColorSwatch hex="#DC2626" name="Error" />
                <ColorSwatch hex="#FEE2E2" name="Error Surface" />
              </div>
            </div>
          </div>
        </Section>

        {/* ── TYPOGRAPHY ────────────────────────────────────────────────────── */}
        <Section title="Typography" id="type">
          <div
            style={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 12,
              padding: "4px 24px 0",
            }}
          >
            <div style={{ display: "flex", gap: 24, padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <span style={{ width: 160, fontSize: 11, fontWeight: 700, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>Role</span>
              <span style={{ width: 80, fontSize: 11, fontWeight: 700, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>Size</span>
              <span style={{ width: 80, fontSize: 11, fontWeight: 700, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>Weight</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>Sample</span>
            </div>
            <TypeRow role="Display" size="40px" weight="700" sample="LAGDA eSignature" />
            <TypeRow role="Hero Heading" size="32px" weight="700" sample="Prepare, send, and verify" />
            <TypeRow role="Page Title" size="24px" weight="700" sample="Document Transactions" />
            <TypeRow role="Section Heading" size="20px" weight="600" sample="Authentication Methods" />
            <TypeRow role="Card Heading" size="16px" weight="600" sample="Service Contract — Santos Law" />
            <TypeRow role="Body Large" size="17px" weight="400" sample="Send documents for signature and receive legally compliant records." />
            <TypeRow role="Body" size="15px" weight="400" sample="Documents sent for signature are tracked and recorded in the audit trail." />
            <TypeRow role="Body Small" size="13px" weight="400" sample="Viewing a document starts the audit trail record for this transaction." />
            <TypeRow role="Label" size="13px" weight="600" sample="Document Status" />
            <TypeRow role="Caption" size="11px" weight="500" sample="Last updated 14 July 2026" />
          </div>
          <div style={{ marginTop: 20 }}>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>
              Monospace (Geist Mono) — verification IDs, timestamps, technical values
            </p>
            <code
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 14,
                color: "#334155",
                background: "#f3f3f5",
                borderRadius: 6,
                padding: "8px 16px",
                display: "inline-block",
                letterSpacing: "0.03em",
              }}
            >
              VRF-2026-LAGDA-0019-MNLA · 2026-07-14T10:32:14+08:00
            </code>
          </div>
        </Section>

        {/* ── BUTTONS ───────────────────────────────────────────────────────── */}
        <Section title="Buttons" id="buttons">
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>
                Primary (Azure) — active eSignature and current-product actions
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Button variant="primary" size="sm">Create Account</Button>
                <Button variant="primary" size="md">Prepare Document</Button>
                <Button variant="primary" size="lg">Get Started Free</Button>
                <Button variant="primary" disabled>Disabled</Button>
              </div>
            </div>
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>
                Primary Outline — secondary active-product CTAs
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Button variant="primary-outline" size="sm">Book a Demo</Button>
                <Button variant="primary-outline" size="md">Verify Document</Button>
                <Button variant="primary-outline" size="lg">Contact Sales</Button>
              </div>
            </div>
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>
                eNotary (Burgundy) — waitlist and future-product actions ONLY
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Button variant="enotary" size="sm">Join Waitlist</Button>
                <Button variant="enotary" size="md">Join the eNotary Waitlist</Button>
                <Button variant="enotary-outline" size="md">Learn About eNotary</Button>
              </div>
            </div>
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>
                Destructive — irreversible or destructive actions
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Button variant="destructive" size="sm">Delete</Button>
                <Button variant="destructive" size="md">Void Transaction</Button>
              </div>
            </div>
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>
                Ghost / Link
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Button variant="ghost" size="md">Cancel</Button>
                <Button variant="link" size="md">View details</Button>
                <Button variant="navy" size="md">Navy CTA</Button>
              </div>
            </div>
          </div>
        </Section>

        {/* ── BADGES ────────────────────────────────────────────────────────── */}
        <Section title="Badges" id="badges">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Badge variant="azure">eSignature</Badge>
            <Badge variant="azure-subtle">Active</Badge>
            <Badge variant="navy">Enterprise</Badge>
            <Badge variant="burgundy">eNotary</Badge>
            <Badge variant="burgundy-subtle">Coming Soon</Badge>
            <Badge variant="success">Verified</Badge>
            <Badge variant="success-subtle">Completed</Badge>
            <Badge variant="warning-subtle">Needs Review</Badge>
            <Badge variant="error-subtle">Failed</Badge>
            <Badge variant="gold">Premium</Badge>
            <Badge variant="gold-subtle">Gold Plan</Badge>
            <Badge variant="muted">Archived</Badge>
            <Badge variant="outline">Draft</Badge>
          </div>
        </Section>

        {/* ── STATUS CHIPS ──────────────────────────────────────────────────── */}
        <Section title="Document Status Chips" id="status">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {ALL_STATUSES.map((s) => (
              <StatusChip key={s} status={s} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ALL_STATUSES.map((s) => (
              <StatusChip key={s} status={s} size="sm" />
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>
              Verification status (distinct from transaction status)
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(Object.keys(VERIFICATION_STATUS_MAP) as (keyof typeof VERIFICATION_STATUS_MAP)[]).map((s) => {
                const p = VERIFICATION_STATUS_MAP[s];
                return (
                  <span
                    key={s}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 10px",
                      borderRadius: 9999,
                      fontSize: 12,
                      fontWeight: 500,
                      background: p.bgColor,
                      color: p.textColor,
                      border: `1px solid ${p.borderColor}`,
                    }}
                  >
                    {p.label}
                  </span>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ── COMING SOON ───────────────────────────────────────────────────── */}
        <Section title="eNotary Coming Soon Badge" id="coming-soon">
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 11, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>sm</p>
              <ComingSoonBadge size="sm" />
            </div>
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 11, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>md</p>
              <ComingSoonBadge size="md" />
            </div>
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 11, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>lg</p>
              <ComingSoonBadge size="lg" />
            </div>
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 11, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>With legal disclaimer</p>
              <ComingSoonBadge showDisclaimer />
            </div>
          </div>
          <div
            style={{
              marginTop: 24,
              padding: 20,
              background: "#FCE7F3",
              border: "1px solid #F9A8D4",
              borderRadius: 12,
              maxWidth: 520,
            }}
          >
            <ComingSoonBadge size="md" style={{ marginBottom: 12 }} />
            <p style={{ margin: "12px 0 0", fontSize: 14, color: "#67023B", fontFamily: "'Geist', sans-serif", lineHeight: 1.6 }}>
              LAGDA eNotary will enable legally compliant electronic notarization once Supreme Court accreditation is confirmed.
            </p>
          </div>
        </Section>

        {/* ── VERIFICATION ID ───────────────────────────────────────────────── */}
        <Section title="Verification ID Display" id="verid">
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
            <VerificationId id="2026-LAGDA-0019-MNLA" prefix="VRF-" label="Verification ID" />
            <VerificationId id="txn_northbridge_001" label="Transaction ID" />
            <VerificationId id="2026-LAGDA-9999-CEBU" prefix="VRF-" truncate size="sm" />
            <VerificationId id="2026-07-14T10:32:14+08:00" label="Signed At" size="lg" />
          </div>
        </Section>

        {/* ── EMPTY STATE ───────────────────────────────────────────────────── */}
        <Section title="Empty State" id="empty">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, overflow: "hidden" }}>
              <EmptyState
                title="No documents yet"
                description="Prepare your first document for signature to get started."
                action={<Button variant="primary" size="md">Prepare Document</Button>}
              />
            </div>
            <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, overflow: "hidden" }}>
              <EmptyState
                title="No matching verification record"
                description="The verification ID you entered does not match any record in the LAGDA database."
                tone="muted"
              />
            </div>
          </div>
        </Section>

        {/* ── LOADING COMPONENT ─────────────────────────────────────────────── */}
        <Section title="Loading Component" id="loader">
          {/* Inline modes */}
          <div style={{ display: "flex", gap: 48, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 32 }}>
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 11, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>inline (dark)</p>
              <div style={{ background: "#07111F", padding: 24, borderRadius: 12, display: "inline-block" }}>
                <LagdaLoader mode="inline" theme="dark" message={inlineMsg} size={40} />
              </div>
            </div>
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 11, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>inline (light)</p>
              <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", padding: 24, borderRadius: 12, display: "inline-block" }}>
                <LagdaLoader mode="inline" theme="light" message="Preparing your secure workspace" size={32} />
              </div>
            </div>
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 11, color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>button mode</p>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Button variant="primary" size="md" disabled>
                  <LagdaLoader mode="button" theme="dark" />
                  Sending…
                </Button>
                <Button variant="primary-outline" size="md" disabled>
                  <LagdaLoader mode="button" theme="light" />
                  Verifying…
                </Button>
              </div>
            </div>
          </div>

          {/* Fullscreen previews — each manages its own exit animation */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
            <FullscreenPreview theme="dark" />
            <FullscreenPreview theme="light" />
          </div>

          {/* Loading service demo */}
          <div>
            <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, color: "#334155" }}>
              Loading service — use case examples
            </p>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#64748B" }}>
              Each button calls <code style={{ fontFamily: "'Geist Mono', monospace", background: "#f3f3f5", padding: "1px 6px", borderRadius: 4 }}>useLagdaLoading().show()</code> then hides after a delay. Ref-counted: rapid clicks merge correctly.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[
                { label: "Initial portal load",        msg: "Loading LAGDA",                          ms: 2800 },
                { label: "Document Verification",      msg: "Verifying document record",               ms: 2200 },
                { label: "Prepare Document",           msg: "Preparing your secure workspace",         ms: 1800 },
                { label: "Contact Sales form",         msg: "Submitting your request",                 ms: 1600 },
                { label: "Book a Demo",                msg: "Booking your demo session",               ms: 1400 },
                { label: "Create Account",             msg: "Creating your LAGDA account",             ms: 2000 },
                { label: "eNotary Waitlist",           msg: "Registering your interest",               ms: 1500 },
              ].map(({ label, msg, ms }) => (
                <Button
                  key={label}
                  variant="primary-outline"
                  size="sm"
                  onClick={() => { show(msg); setTimeout(hide, ms); }}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Reduced-motion note */}
          <div
            style={{
              marginTop: 24,
              padding: "12px 16px",
              background: "#EAF6FF",
              border: "1px solid #BAE0FA",
              borderRadius: 8,
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: "#005BA9" }}>
              <strong>Reduced motion:</strong> All animation keyframes (gold sweep, azure pulse, diamond pulse, entrance scale, exit fade) collapse to static or very subtle opacity changes via <code style={{ fontFamily: "'Geist Mono', monospace", background: "rgba(0,120,212,0.08)", padding: "1px 5px", borderRadius: 4 }}>@media (prefers-reduced-motion: reduce)</code>. The loading message and aria-live region remain fully accessible.
            </p>
          </div>
        </Section>

        {/* ── SURFACES ──────────────────────────────────────────────────────── */}
        <Section title="Surfaces and Cards" id="surfaces">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {[
              { label: "Default card", bg: "#ffffff", border: "rgba(0,0,0,0.09)", text: "#07111F" },
              { label: "Muted card", bg: "#f8fafb", border: "rgba(0,0,0,0.07)", text: "#07111F" },
              { label: "Azure info panel", bg: "#EAF6FF", border: "#BAE0FA", text: "#005BA9" },
              { label: "Burgundy eNotary panel", bg: "#FCE7F3", border: "#F9A8D4", text: "#67023B" },
              { label: "Success panel", bg: "#DCFCE7", border: "#86EFAC", text: "#15803D" },
              { label: "Warning panel", bg: "#FEF3C7", border: "#FDE68A", text: "#B45309" },
              { label: "Error panel", bg: "#FEE2E2", border: "#FECACA", text: "#B91C1C" },
              { label: "Navy dark section", bg: "#07111F", border: "rgba(0,120,212,0.2)", text: "#ffffff" },
            ].map(({ label, bg, border, text }) => (
              <div
                key={label}
                style={{
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: text }}>{label}</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: text, opacity: 0.65 }}>
                  Sample content area
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── SHADOWS ───────────────────────────────────────────────────────── */}
        <Section title="Shadows" id="shadows">
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              { name: "Subtle", shadow: "0 1px 2px rgba(7,17,31,0.05)" },
              { name: "Card", shadow: "0 1px 4px rgba(7,17,31,0.07), 0 0 1px rgba(7,17,31,0.04)" },
              { name: "Elevated", shadow: "0 4px 16px rgba(7,17,31,0.10), 0 1px 4px rgba(7,17,31,0.05)" },
              { name: "Dialog", shadow: "0 8px 40px rgba(7,17,31,0.18), 0 2px 8px rgba(7,17,31,0.07)" },
              { name: "Azure Glow", shadow: "0 4px 20px rgba(0,120,212,0.22)" },
              { name: "Gold Glow", shadow: "0 4px 16px rgba(201,150,12,0.30)" },
            ].map(({ name, shadow }) => (
              <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 96,
                    height: 64,
                    background: "#ffffff",
                    borderRadius: 10,
                    boxShadow: shadow,
                  }}
                />
                <span style={{ fontSize: 11, color: "#64748B", fontFamily: "'Geist Mono', monospace" }}>{name}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── MOTION ────────────────────────────────────────────────────────── */}
        <Section title="Motion Tokens" id="motion">
          <div
            style={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 12,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {[
              { name: "Fast interaction", dur: "100ms", ease: "cubic-bezier(0.4,0,0.2,1)", use: "hover, focus, selection" },
              { name: "Standard", dur: "200ms", ease: "cubic-bezier(0.4,0,0.2,1)", use: "most transitions" },
              { name: "Page reveal", dur: "350ms", ease: "cubic-bezier(0,0,0.2,1)", use: "route change, content load" },
              { name: "Dialog", dur: "250ms", ease: "cubic-bezier(0.4,0,0.2,1)", use: "modal/drawer open/close" },
              { name: "Brand load", dur: "2600ms", ease: "cubic-bezier(0.4,0,0.2,1)", use: "fullscreen loader sequence" },
            ].map(({ name, dur, ease, use }) => (
              <div key={name} style={{ display: "flex", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
                <span style={{ width: 140, fontSize: 13, fontWeight: 600, color: "#07111F", flexShrink: 0 }}>{name}</span>
                <code style={{ fontSize: 12, color: "#0078D4", fontFamily: "'Geist Mono', monospace", width: 60, flexShrink: 0 }}>{dur}</code>
                <code style={{ fontSize: 11, color: "#64748B", fontFamily: "'Geist Mono', monospace", flexShrink: 0 }}>{ease}</code>
                <span style={{ fontSize: 12, color: "#94A3B8" }}>{use}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── ESIG vs ENOTARY ───────────────────────────────────────────────── */}
        <Section title="eSignature vs eNotary Visual Rules" id="product-colors">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div
              style={{
                background: "#EAF6FF",
                border: "1px solid #BAE0FA",
                borderRadius: 12,
                padding: 24,
              }}
            >
              <Badge variant="azure" style={{ marginBottom: 12 }}>LAGDA eSignature</Badge>
              <h3 style={{ margin: "12px 0 8px", fontSize: 16, fontWeight: 700, color: "#07111F" }}>
                Active Product
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
                Azure and Deep Navy. Used for all current eSignature features, primary actions, verification,
                security messaging, and active navigation.
              </p>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#005BA9" }}>
                Azure means: "Available now."
              </p>
            </div>
            <div
              style={{
                background: "#FCE7F3",
                border: "1px solid #F9A8D4",
                borderRadius: 12,
                padding: 24,
              }}
            >
              <ComingSoonBadge size="md" style={{ marginBottom: 4 }} />
              <h3 style={{ margin: "12px 0 8px", fontSize: 16, fontWeight: 700, color: "#07111F" }}>
                Future Regulated Capability
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
                Burgundy only for eNotary, waitlist, accreditation messaging, and future roadmap.
                Never used for active eSignature primary actions.
              </p>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#67023B" }}>
                Burgundy means: "Future regulated capability."
              </p>
            </div>
          </div>
        </Section>

        {/* ── FOCUS ─────────────────────────────────────────────────────────── */}
        <Section title="Focus States" id="focus">
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748B" }}>
            Tab through these to verify keyboard focus rings.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Button variant="primary">Focus me (Tab)</Button>
            <Button variant="primary-outline">And me</Button>
            <Button variant="enotary">And me</Button>
            <Button variant="ghost">And me</Button>
            <input
              type="text"
              placeholder="Type something"
              style={{
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 14,
                fontFamily: "'Geist', sans-serif",
                outline: "none",
              }}
              onFocus={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(0,120,212,0.25)"; (e.currentTarget as HTMLElement).style.borderColor = "#0078D4"; }}
              onBlur={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = ""; (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.12)"; }}
            />
          </div>
        </Section>

        {/* ── BREAKPOINTS ───────────────────────────────────────────────────── */}
        <Section title="Breakpoints" id="breakpoints">
          <div
            style={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {[
              { name: "xs", value: "375px", description: "Small mobile — iPhone SE" },
              { name: "sm", value: "640px", description: "Mobile — standard phone landscape" },
              { name: "md", value: "768px", description: "Tablet — portrait iPad" },
              { name: "lg", value: "1024px", description: "Desktop — small laptop" },
              { name: "xl", value: "1280px", description: "Wide desktop — standard monitor" },
              { name: "2xl", value: "1440px", description: "Full design width — max page layout" },
            ].map(({ name, value, description }, i) => (
              <div
                key={name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 100px 1fr",
                  gap: 16,
                  padding: "12px 20px",
                  borderBottom: i < 5 ? "1px solid rgba(0,0,0,0.05)" : "none",
                  alignItems: "center",
                }}
              >
                <code style={{ fontFamily: "'Geist Mono', monospace", fontSize: 13, fontWeight: 700, color: "#0078D4" }}>{name}</code>
                <code style={{ fontFamily: "'Geist Mono', monospace", fontSize: 13, color: "#334155" }}>{value}</code>
                <span style={{ fontSize: 13, color: "#64748B" }}>{description}</span>
              </div>
            ))}
          </div>
        </Section>

      </div>

    </div>
  );
}

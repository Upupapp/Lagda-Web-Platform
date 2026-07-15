import { Link } from "react-router";
import {
  EnotaryPageShell, EnotaryStatusBanner, EnotaryDisclaimer,
  EnotarySection, EnotaryHeading, AccreditationTimeline,
} from "../../../components/enotary/EnotaryComponents";
import { ROADMAP_STAGES } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
const BURGUNDY = "#67023B";

const STATUS_LEGEND = [
  { color: "#22C55E",  label: "In progress",            desc: "Currently underway" },
  { color: "#38bdf8",  label: "Planned",                 desc: "Scheduled for a future stage" },
  { color: BURGUNDY,   label: "Future regulatory step",  desc: "Depends on regulatory process" },
  { color: "#475569",  label: "After required approval", desc: "Follows accreditation and launch" },
];

const WHY_ACCREDITATION = [
  { heading: "Electronic notarization is regulated by the Supreme Court", body: "The Supreme Court of the Philippines has rule-making authority over notarial practice. Any remote or electronic notarization platform must be approved under applicable court rules." },
  { heading: "Accreditation confirms technical and operational compliance", body: "Before operating, LAGDA must demonstrate that its identity-verification, session-control, evidence-capture, and record-keeping systems meet required standards." },
  { heading: "Notary Publics must operate within an approved framework", body: "Commissioned Notary Publics may only perform electronic notarial acts through an accredited system. There is no private pathway around this requirement." },
  { heading: "We do not operate without it", body: "LAGDA will not offer electronic notarization — in any form, including pilot or beta — before required accreditation and approvals are obtained." },
];

export function AccreditationRoadmap() {
  return (
    <EnotaryPageShell>
      <EnotaryStatusBanner />

      {/* Hero */}
      <section style={{ padding: "64px 24px 48px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <p style={{ color: BURGUNDY, ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 14 }}>ENOTARY / ACCREDITATION ROADMAP</p>
          <h1 style={{ color: "white", ...GF, fontSize: "clamp(24px, 4vw, 44px)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
            Accreditation Roadmap
          </h1>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 16, lineHeight: 1.7, maxWidth: 620, margin: "0 0 24px" }}>
            LAGDA eNotary requires Supreme Court accreditation and applicable regulatory approvals before it can operate. This page describes our progress and the stages ahead.
          </p>
          <EnotaryDisclaimer />
        </div>
      </section>

      {/* Why accreditation */}
      <EnotarySection id="why">
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <EnotaryHeading sub="Understanding why Supreme Court accreditation is required — not optional — for LAGDA eNotary to operate.">Why accreditation is required</EnotaryHeading>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
            {WHY_ACCREDITATION.map(({ heading, body }) => (
              <div key={heading} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "18px 20px" }}>
                <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>{heading}</p>
                <p style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.65, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </EnotarySection>

      {/* Timeline */}
      <EnotarySection id="timeline" light bordered>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <EnotaryHeading sub="Our current stage and the stages ahead — subject to regulatory timelines outside our control.">Accreditation stages</EnotaryHeading>

          {/* Legend */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32, padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
            {STATUS_LEGEND.map(({ color, label, desc }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
                <span style={{ color: "#64748b", ...GF, fontSize: 12 }}><strong style={{ color: "white" }}>{label}</strong> — {desc}</span>
              </div>
            ))}
          </div>

          <AccreditationTimeline stages={ROADMAP_STAGES} />
        </div>
      </EnotarySection>

      {/* Regulatory note */}
      <EnotarySection id="regulatory-note" bordered>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <EnotaryHeading>Important notes on this roadmap</EnotaryHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "This roadmap reflects LAGDA's internal planning stages, not any regulatory commitment or timeline set by the Supreme Court.",
              "Regulatory review and accreditation stages are controlled by external bodies. LAGDA cannot predict or commit to their timelines.",
              "The stages labeled 'Future regulatory step' and 'After required approval' depend entirely on regulatory outcomes outside LAGDA's control.",
              "LAGDA will not represent the service as accredited, approved, or available until all required approvals are formally obtained.",
              "This roadmap may change. No specific date is published for any stage.",
            ].map((note) => (
              <div key={note} style={{ display: "flex", gap: 12, padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}>
                <span style={{ color: "#475569", flexShrink: 0 }}>—</span>
                <span style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.65 }}>{note}</span>
              </div>
            ))}
          </div>
        </div>
      </EnotarySection>

      {/* Waitlist CTA */}
      <EnotarySection id="updates" light bordered>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ color: "white", ...GF, fontSize: "clamp(18px, 2.5vw, 26px)", fontWeight: 900, margin: "0 0 12px" }}>Receive updates</h2>
          <p style={{ color: "#64748b", ...GF, fontSize: 14, lineHeight: 1.7, margin: "0 0 22px" }}>
            We will notify waitlist subscribers when there are significant updates on LAGDA eNotary's accreditation progress.
          </p>
          <Link to="/enotary/waitlist" style={{ display: "inline-block", background: BURGUNDY, color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "12px 26px", borderRadius: 8, textDecoration: "none" }}>
            Join the waitlist
          </Link>
          <p style={{ color: "#334155", ...GF, fontSize: 12, marginTop: 12 }}>
            Joining the waitlist does not create an account, confirm eligibility, or guarantee access.
          </p>
        </div>
      </EnotarySection>
    </EnotaryPageShell>
  );
}

import { Link } from "react-router";
import {
  EnotaryPageShell, EnotaryStatusBanner, EnotaryDisclaimer,
  EnotarySection, EnotaryHeading, FutureConceptCard,
} from "../../../components/enotary/EnotaryComponents";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
const BURGUNDY = "#67023B";

const SEPARATION_POINTS = [
  { heading: "Different legal framework", body: "Electronic notarization is a regulated judicial function subject to separate laws, rules, and Supreme Court oversight." },
  { heading: "Requires separate accreditation", body: "LAGDA eNotary requires Supreme Court accreditation before it can operate. LAGDA eSignature does not." },
  { heading: "Different participant roles", body: "eSignature involves senders and signers. Electronic notarization involves parties, a commissioned Notary Public, and distinct notarial acts — none of which are available through LAGDA today." },
  { heading: "Not included in any plan", body: "LAGDA eNotary is not bundled with any LAGDA eSignature plan. It will be a separate regulated product when available." },
];

export function EnotaryOverview() {
  return (
    <EnotaryPageShell>
      <EnotaryStatusBanner />

      {/* Hero */}
      <section style={{ padding: "72px 24px 56px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ background: "rgba(103,2,59,0.15)", border: "1px solid rgba(103,2,59,0.3)", color: BURGUNDY, ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", padding: "4px 10px", borderRadius: 4 }}>COMING SOON — FUTURE REGULATED PRODUCT</span>
          </div>
          <h1 style={{ color: "white", ...GF, fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.025em", margin: "0 0 20px" }}>
            LAGDA eNotary
          </h1>
          <p style={{ color: "#94a3b8", ...GF, fontSize: "clamp(15px, 2vw, 18px)", lineHeight: 1.7, maxWidth: 680, margin: "0 0 28px" }}>
            LAGDA is exploring a future electronic notarization product for the Philippines — subject to Supreme Court accreditation and applicable rules. This service is not currently available.
          </p>
          <EnotaryDisclaimer />
        </div>
      </section>

      {/* What it is */}
      <EnotarySection id="what-it-is">
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <EnotaryHeading sub="Understanding what electronic notarization is and why it requires special regulatory treatment.">What is electronic notarization?</EnotaryHeading>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {[
              { label: "A regulated judicial act", body: "Notarization is a function performed by commissioned Notary Publics under the Rules on Notarial Practice. Any remote or electronic version is subject to Supreme Court rulemaking." },
              { label: "Remote appearance and authentication", body: "Electronic notarization involves confirming the identity and physical presence of parties through technology — not just electronic signing." },
              { label: "Requires legal authority to operate", body: "A platform cannot offer electronic notarization without Supreme Court accreditation. LAGDA does not currently have this accreditation." },
              { label: "Distinct from eSignature", body: "Electronic signing and electronic notarization are different processes with different legal requirements. They are separate services." },
            ].map(({ label, body }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "20px 22px" }}>
                <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>{label}</p>
                <p style={{ color: "#94A3B8", ...GF, fontSize: 13, lineHeight: 1.65, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </EnotarySection>

      {/* Separation from eSignature */}
      <EnotarySection id="separation" light bordered>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <EnotaryHeading sub="LAGDA eSignature and LAGDA eNotary are separate products with distinct requirements.">eNotary is separate from eSignature</EnotaryHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {SEPARATION_POINTS.map(({ heading, body }) => (
              <div key={heading} style={{ display: "flex", gap: 14, padding: "14px 18px", background: "rgba(103,2,59,0.05)", border: "1px solid rgba(103,2,59,0.15)", borderRadius: 9 }}>
                <span style={{ color: BURGUNDY, fontSize: 16, marginTop: 1, flexShrink: 0 }}>≠</span>
                <div>
                  <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{heading}</p>
                  <p style={{ color: "#94A3B8", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </EnotarySection>

      {/* Future concepts */}
      <EnotarySection id="concepts" bordered>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <EnotaryHeading sub="Concepts being explored for when LAGDA eNotary becomes available — subject to accreditation.">Future concepts under exploration</EnotaryHeading>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <FutureConceptCard label="Remote appearance verification">
              Secure audio-video sessions to confirm participant identity and presence for notarial acts, subject to applicable rules.
            </FutureConceptCard>
            <FutureConceptCard label="Notarial act workflows">
              Structured workflows for oaths, acknowledgments, jurats, and other notarial acts — subject to Supreme Court approval.
            </FutureConceptCard>
            <FutureConceptCard label="Evidence and session records">
              Records of notarial sessions and evidence of compliance, for use in dispute resolution or verification — subject to applicable rules.
            </FutureConceptCard>
            <FutureConceptCard label="Notarial register direction">
              Direction for Notary Publics to maintain electronic notarial registers in compliance with applicable rules.
            </FutureConceptCard>
          </div>
        </div>
      </EnotarySection>

      {/* Waitlist CTA */}
      <EnotarySection id="waitlist" light bordered>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: BURGUNDY, ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 12 }}>STAY INFORMED</p>
          <h2 style={{ color: "white", ...GF, fontSize: "clamp(20px, 3vw, 32px)", fontWeight: 900, lineHeight: 1.15, margin: "0 0 14px" }}>Join the waitlist</h2>
          <p style={{ color: "#94A3B8", ...GF, fontSize: 15, lineHeight: 1.7, margin: "0 0 24px" }}>
            Receive updates on LAGDA eNotary as we progress toward accreditation. Joining the waitlist does not create an account, guarantee access, or reserve accreditation.
          </p>
          <Link to="/enotary/waitlist" style={{ display: "inline-block", background: BURGUNDY, color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "13px 28px", borderRadius: 8, textDecoration: "none" }}>
            Join the waitlist
          </Link>
          <p style={{ color: "#7C8DA4", ...GF, fontSize: 12, marginTop: 14 }}>
            No purchase required. Waitlist registration does not create a LAGDA account.
          </p>
        </div>
      </EnotarySection>

      {/* Nav links */}
      <EnotarySection id="learn-more" bordered>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 20 }}>LEARN MORE</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {[
              { label: "Future Capabilities", path: "/enotary/future-capabilities", sub: "Concepts under exploration" },
              { label: "Accreditation Roadmap", path: "/enotary/accreditation-roadmap", sub: "Our path to Supreme Court accreditation" },
              { label: "eNotary FAQ", path: "/enotary/faq", sub: "Common questions answered" },
            ].map(({ label, path, sub }) => (
              <Link key={path} to={path} style={{ display: "block", textDecoration: "none", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "16px 20px", transition: "border-color 0.15s" }}>
                <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{label}</p>
                <p style={{ color: "#8A9BAE", ...GF, fontSize: 12, margin: 0 }}>{sub}</p>
              </Link>
            ))}
          </div>
        </div>
      </EnotarySection>
    </EnotaryPageShell>
  );
}

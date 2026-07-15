import { Link } from "react-router";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

const LAST_REVIEWED = "July 2026";

function LegalSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ paddingTop: 36, paddingBottom: 12, borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 28 }}>
      <h2 id={`${id}-h`} style={{ color: "white", ...GF, fontSize: "clamp(17px, 2.5vw, 22px)", fontWeight: 800, margin: "0 0 14px" }}>{title}</h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "#94a3b8", ...GF, fontSize: 15, lineHeight: 1.75, margin: "0 0 14px" }}>{children}</p>;
}

function Pending({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "#475569", ...GF, fontSize: 14, lineHeight: 1.65, margin: "0 0 14px" }}>[{children} — pending legal review before publication]</p>;
}

export function Terms() {
  return (
    <div style={{ background: "#07111F", minHeight: "100vh", color: "white", ...GF }}>
      <section style={{ padding: "72px 24px 48px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>LEGAL</p>
          <h1 style={{ color: "white", ...GF, fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 14px" }}>Terms of Service</h1>
          <p style={{ color: "#64748b", ...GF, fontSize: 15, margin: "0 0 10px" }}>UpUp Technologies — LAGDA Platform</p>
          <div style={{ display: "inline-flex", gap: 12, alignItems: "center" }}>
            <span style={{ color: "#C9960C", ...GM, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: "rgba(201,150,12,0.1)", border: "1px solid rgba(201,150,12,0.2)" }}>DRAFT — PENDING LEGAL REVIEW</span>
            <span style={{ color: "#334155", ...GM, fontSize: 10 }}>Structure reviewed: {LAST_REVIEWED}</span>
          </div>
          <p style={{ color: "#475569", ...GF, fontSize: 13, lineHeight: 1.65, marginTop: 14 }}>
            These terms of service have been structured as part of the frontend development phase. They require formal legal review and approval before publication. Sections marked as pending require legal confirmation of specific terms.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px 80px" }}>

        <LegalSection id="agreement" title="Agreement to terms">
          <P>By accessing or using LAGDA eSignature and related services operated by UpUp Technologies, you agree to be bound by these Terms of Service. If you are using LAGDA on behalf of an organization, you represent that you have authority to bind that organization.</P>
          <P>If you do not agree to these terms, do not use the LAGDA platform.</P>
        </LegalSection>

        <LegalSection id="eligibility" title="Eligibility">
          <P>You must be of legal age to enter into binding agreements in your jurisdiction. Use of LAGDA by minors is subject to applicable legal requirements and may require guardian involvement.</P>
          <Pending>Minimum age, minor-account requirements, and jurisdiction-specific eligibility</Pending>
        </LegalSection>

        <LegalSection id="accounts" title="Accounts">
          <P>You are responsible for maintaining the confidentiality of your account credentials. You are responsible for all activities that occur under your account. You must notify LAGDA immediately of any unauthorized access or suspected security breach.</P>
          <P>LAGDA reserves the right to suspend or terminate accounts that violate these terms or applicable law.</P>
        </LegalSection>

        <LegalSection id="workspaces" title="Workspaces">
          <P>Workspace administrators are responsible for managing workspace members, roles, and settings. Organizations using Business or Enterprise plans are responsible for ensuring their workspace members comply with these terms.</P>
        </LegalSection>

        <LegalSection id="acceptable-use" title="Acceptable use">
          <P>You agree not to use LAGDA to:</P>
          <ul style={{ padding: "0 0 0 20px", margin: "0 0 14px", color: "#94a3b8" }}>
            {[
              "Violate applicable laws or regulations",
              "Process documents that require formalities LAGDA eSignature cannot satisfy",
              "Deceive or impersonate participants",
              "Upload content that infringes third-party rights",
              "Attempt to circumvent platform security controls",
              "Use the platform in a way that harms other users or the platform's availability",
            ].map(i => <li key={i} style={{ ...GF, fontSize: 14, lineHeight: 1.7, marginBottom: 4 }}>{i}</li>)}
          </ul>
        </LegalSection>

        <LegalSection id="document-responsibility" title="Document and signing responsibility">
          <P>Users are responsible for determining whether electronic signing is appropriate for each document and transaction. LAGDA does not determine or guarantee the legal validity or sufficiency of any specific signed document.</P>
          <P>Some documents may still require wet signatures, notarization, personal appearance, witnesses, or other legal formalities that LAGDA eSignature does not provide. Users remain responsible for determining the requirements that apply to each transaction.</P>
        </LegalSection>

        <LegalSection id="enotary-separation" title="LAGDA eNotary — separation from these terms">
          <P>LAGDA eNotary is a separate future regulated product. It is Coming Soon and Subject to Supreme Court Accreditation and applicable rules. These Terms of Service do not govern any eNotary service. Separate terms will apply when eNotary becomes available, subject to required accreditation and approvals.</P>
        </LegalSection>

        <LegalSection id="plans-billing" title="Plans and billing">
          <Pending>Billing terms, payment methods, renewal, cancellation, refund policy, tax treatment</Pending>
          <P>Plan features and limits are confirmed in the plan selected at time of subscription. LAGDA reserves the right to modify plan availability and pricing with reasonable notice.</P>
        </LegalSection>

        <LegalSection id="disclaimers" title="Disclaimers">
          <P>LAGDA eSignature is provided on an "as is" and "as available" basis. LAGDA does not guarantee that the platform will be available without interruption or error, that every signed document will satisfy applicable legal requirements, or that the platform is free from all security vulnerabilities.</P>
        </LegalSection>

        <LegalSection id="liability" title="Limitation of liability">
          <Pending>Liability caps, excluded damages, jurisdiction-specific limitations</Pending>
        </LegalSection>

        <LegalSection id="changes" title="Changes to terms">
          <P>LAGDA may update these terms from time to time. Material changes will be communicated through the platform or by email. Continued use after changes are communicated constitutes acceptance.</P>
        </LegalSection>

        <LegalSection id="governing-law" title="Governing law">
          <Pending>Governing law, dispute resolution, arbitration terms, jurisdiction</Pending>
        </LegalSection>

        <LegalSection id="contact" title="Contact">
          <P>Questions about these terms may be directed through the <Link to="/contact" style={{ color: "#38bdf8", textDecoration: "none" }}>Contact page</Link>.</P>
        </LegalSection>

        <div style={{ marginTop: 40, padding: "16px 20px", background: "rgba(201,150,12,0.06)", border: "1px solid rgba(201,150,12,0.15)", borderRadius: 10 }}>
          <p style={{ color: "#C9960C", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>LEGAL REVIEW REQUIRED BEFORE PUBLICATION</p>
          <p style={{ color: "#475569", ...GF, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
            This document is a structural draft prepared during the frontend development phase. It requires review and approval by qualified legal counsel before it can be published as the official LAGDA Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
}

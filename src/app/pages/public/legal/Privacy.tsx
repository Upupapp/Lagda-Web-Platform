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

function UL({ items }: { items: string[] }) {
  return <ul style={{ padding: "0 0 0 20px", margin: "0 0 14px" }}>{items.map(i => <li key={i} style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.7, marginBottom: 4 }}>{i}</li>)}</ul>;
}

export function Privacy() {
  return (
    <div style={{ background: "#07111F", minHeight: "100vh", color: "white", ...GF }}>
      <section style={{ padding: "72px 24px 48px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>LEGAL</p>
          <h1 style={{ color: "white", ...GF, fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 14px" }}>Privacy Policy</h1>
          <p style={{ color: "#64748b", ...GF, fontSize: 15, margin: "0 0 10px" }}>UpUp Technologies — LAGDA Platform</p>
          <div style={{ display: "inline-flex", gap: 12, alignItems: "center" }}>
            <span style={{ color: "#C9960C", ...GM, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: "rgba(201,150,12,0.1)", border: "1px solid rgba(201,150,12,0.2)" }}>DRAFT — PENDING LEGAL REVIEW</span>
            <span style={{ color: "#334155", ...GM, fontSize: 10 }}>Structure reviewed: {LAST_REVIEWED}</span>
          </div>
          <p style={{ color: "#475569", ...GF, fontSize: 13, lineHeight: 1.65, marginTop: 14 }}>
            This privacy policy structure has been prepared as part of the frontend development phase. It requires formal legal review and approval before publication. Content marked as pending requires legal confirmation.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px 80px" }}>
        <LegalSection id="introduction" title="Introduction">
          <P>UpUp Technologies operates the LAGDA platform, including LAGDA eSignature and related services. This Privacy Policy describes how we collect, use, and protect information in connection with the LAGDA platform.</P>
          <P>By using LAGDA, you agree to the collection and use of information in accordance with this policy. If you are using LAGDA on behalf of an organization, you represent that you have the authority to bind that organization to this policy.</P>
        </LegalSection>

        <LegalSection id="scope" title="Scope">
          <P>This policy applies to information collected through the LAGDA platform, including:</P>
          <UL items={[
            "LAGDA eSignature — the document preparation and signing workflow service",
            "Document Verification — the public verification service",
            "Account management and workspace features",
            "Contact and support interactions",
          ]} />
          <P>LAGDA eNotary — a future regulated product — is subject to separate privacy terms that will be published when that product becomes available, subject to Supreme Court accreditation and applicable rules.</P>
        </LegalSection>

        <LegalSection id="information-collected" title="Information we collect">
          <P><strong style={{ color: "white" }}>Account information:</strong> Name, email address, organization name, and role provided when creating an account.</P>
          <P><strong style={{ color: "white" }}>Workspace information:</strong> Workspace name, workspace members, roles, and administrative settings.</P>
          <P><strong style={{ color: "white" }}>Document and participant data:</strong> Documents uploaded or prepared using LAGDA. Participant names, email addresses, and mobile numbers where provided for signing invitations.</P>
          <P><strong style={{ color: "white" }}>Authentication data:</strong> Records of authentication events, including method used, timestamp, and result. Authentication codes themselves are not stored.</P>
          <P><strong style={{ color: "white" }}>Audit and verification data:</strong> Records of transaction events — invitation delivery, document access, authentication, signing, and completion — stored to support the audit trail and verification functions.</P>
          <P><strong style={{ color: "white" }}>Usage and device data:</strong> Browser type, approximate device location where available, IP address, and interaction logs used to support signing evidence and security monitoring.</P>
          <P><strong style={{ color: "white" }}>Contact and support data:</strong> Information submitted through contact or support forms.</P>
        </LegalSection>

        <LegalSection id="purposes" title="Purposes of processing">
          <UL items={[
            "Providing and operating the LAGDA eSignature service",
            "Delivering secure signing invitations to participants",
            "Recording audit evidence for completed transactions",
            "Enabling Document Verification",
            "Account management and workspace administration",
            "Customer support and communication",
            "Service improvement and security monitoring",
            "Compliance with applicable legal obligations",
          ]} />
        </LegalSection>

        <LegalSection id="public-verification" title="Public verification">
          <P>Completed transactions receive a Verification ID. Public verification shows transaction status and completion date. By default, participant names and document content are not displayed in public verification results. Senders may control additional disclosure through workspace settings.</P>
        </LegalSection>

        <LegalSection id="sharing" title="Sharing and service providers">
          <P>LAGDA does not sell personal information. We may share information with service providers who assist in operating the platform — including hosting, infrastructure, email delivery, and security services — subject to appropriate confidentiality and data-handling requirements.</P>
          <P style={{ color: "#475569" }}>[Specific service provider list and data-processing agreements — pending legal review before publication]</P>
        </LegalSection>

        <LegalSection id="retention" title="Retention">
          <P>We retain account information while an account is active. Transaction records and audit trails are retained to support verification and dispute resolution, subject to applicable legal obligations and plan terms.</P>
          <P style={{ color: "#475569" }}>[Specific retention periods — pending confirmation and legal review before publication]</P>
        </LegalSection>

        <LegalSection id="security" title="Security">
          <P>LAGDA uses technical and organizational measures to protect the information we process. We do not guarantee that all risks can be eliminated. Users are responsible for protecting their own account credentials and for reporting security concerns promptly.</P>
        </LegalSection>

        <LegalSection id="rights" title="Rights and requests">
          <P>Depending on applicable law, you may have rights to access, correct, delete, or restrict the processing of personal information. To make a request, contact us using the contact information below.</P>
          <P style={{ color: "#475569" }}>[Rights-handling procedure and jurisdictional detail — pending legal review before publication]</P>
        </LegalSection>

        <LegalSection id="changes" title="Changes to this policy">
          <P>We may update this policy from time to time. Material changes will be communicated through the platform or by email. Continued use of LAGDA after changes are communicated constitutes acceptance of the updated policy.</P>
        </LegalSection>

        <LegalSection id="contact" title="Contact">
          <P>For privacy questions, requests, or concerns, contact us through the <Link to="/contact" style={{ color: "#38bdf8", textDecoration: "none" }}>Contact page</Link> and select "Security or privacy" as the category.</P>
          <P style={{ color: "#475569" }}>[Registered address, data protection officer, regulatory registration — pending legal review and corporate confirmation before publication]</P>
        </LegalSection>

        <div style={{ marginTop: 40, padding: "16px 20px", background: "rgba(201,150,12,0.06)", border: "1px solid rgba(201,150,12,0.15)", borderRadius: 10 }}>
          <p style={{ color: "#C9960C", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>LEGAL REVIEW REQUIRED BEFORE PUBLICATION</p>
          <p style={{ color: "#475569", ...GF, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
            This document is a structural draft prepared during the frontend development phase. Sections marked "pending legal review" require review and approval by qualified legal counsel before this policy can be published as the official LAGDA Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

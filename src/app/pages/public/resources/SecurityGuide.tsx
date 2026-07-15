import { Link } from "react-router";
import {
  ResourcesPageShell, GuideLayout, GuideHero, GuideSection, GuidePara, GuideCallout, GuideList, EduDisclaimer,
} from "../../../components/resources/ResourceComponents";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function SecurityGuide() {
  return (
    <ResourcesPageShell>
      <GuideLayout
        hero={
          <GuideHero
            eyebrow="Security Guide"
            title="Security layers in LAGDA eSignature."
            sub="An overview of how LAGDA approaches security — from account protection to document integrity and public verification."
          />
        }
      >
        <GuideSection id="layers" title="Security in layers">
          <GuidePara>
            LAGDA eSignature security operates across multiple layers, each addressing a different aspect of the document workflow. No single layer eliminates all risk — together they create a layered, defensible record.
          </GuidePara>
        </GuideSection>

        <GuideSection id="account-security" title="1. Account security">
          <GuidePara>
            Your LAGDA account is protected by password requirements and multi-factor authentication options. Account security controls who can log in and prepare documents, not who can sign.
          </GuidePara>
          <GuideList items={[
            "Strong password requirements",
            "Multi-factor authentication options",
            "Session management and timeout",
            "Account access review",
          ]} />
          <GuidePara>
            <Link to="/security/account-security" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 600 }}>Account Security →</Link>
          </GuidePara>
        </GuideSection>

        <GuideSection id="signing-access" title="2. Signing-request access control">
          <GuidePara>
            Each participant in a LAGDA transaction receives a unique secure invitation. This invitation is specific to their email address and provides access only to the documents and actions assigned to that participant.
          </GuidePara>
          <GuidePara>
            Forwarding a signing link does not transfer the signer's legal identity. Authentication steps add further confirmation that the recipient is the intended person.
          </GuidePara>
        </GuideSection>

        <GuideSection id="signer-auth" title="3. Signer authentication">
          <GuidePara>
            Signer authentication methods add additional confirmation at the moment of signing. Available methods include email OTP, SMS OTP, authenticator app, and enterprise SSO, depending on your plan.
          </GuidePara>
          <GuidePara>
            <Link to="/security/signer-authentication" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 600 }}>Signer Authentication →</Link>
          </GuidePara>
        </GuideSection>

        <GuideSection id="document-integrity" title="4. Document integrity">
          <GuidePara>
            When a transaction is completed, LAGDA records information about the finalized document. This allows a comparison to be performed later during verification — confirming whether a file presented for review matches the original completed document.
          </GuidePara>
          <GuideCallout
            text="LAGDA records document fingerprint information to support comparison. This does not prevent external parties from creating altered copies — it enables detection during verification."
          />
        </GuideSection>

        <GuideSection id="audit-evidence" title="5. Audit trail and evidence">
          <GuidePara>
            Every significant event in a transaction is recorded — invitation delivery, document access, authentication, signature adoption, approval, and completion. These records are available in the audit trail and completion report.
          </GuidePara>
          <GuideList items={[
            "Timestamps for all key events",
            "Authentication method and result",
            "Approximate device and browser context where available",
            "Signing sequence and participant completion status",
          ]} />
          <GuidePara>
            <Link to="/security/audit-trail" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 600 }}>Audit Trail →</Link>
          </GuidePara>
        </GuideSection>

        <GuideSection id="public-verification" title="6. Public verification">
          <GuidePara>
            Completed transactions receive a Verification ID and QR code. Anyone with this identifier can check the status of the transaction at lagda.io/verify — confirming that the record exists and, where file comparison is performed, that a supplied document matches the original.
          </GuidePara>
          <GuidePara>
            <Link to="/features/document-verification" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 600 }}>Document Verification →</Link>
          </GuidePara>
        </GuideSection>

        <GuideSection id="workspace-governance" title="7. Workspace governance">
          <GuidePara>
            Business and Enterprise plans include role-based access control, usage administration, and workspace settings that help organizations manage who can send, access templates, and administer the workspace.
          </GuidePara>
          <GuidePara>
            <Link to="/security/account-security" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 600 }}>Account and Access Security →</Link>
          </GuidePara>
        </GuideSection>

        <GuideSection id="user-responsibility" title="8. User responsibility">
          <GuidePara>
            LAGDA provides security tools, but users are responsible for:
          </GuidePara>
          <GuideList items={[
            "Protecting their account credentials",
            "Choosing authentication methods appropriate to each transaction",
            "Sending documents only to the intended participants",
            "Reviewing workspace access regularly",
            "Determining which document types are appropriate for electronic signing",
            "Complying with applicable legal and organizational requirements",
          ]} />
        </GuideSection>

        <GuideSection id="what-we-do-not-claim" title="What LAGDA does not claim">
          <GuidePara>
            LAGDA does not represent that its platform is invulnerable, certified to any specific standard, or compliant with any specific regulation. Security controls are designed to be layered and defensible, not absolute.
          </GuidePara>
          <GuideList items={[
            "LAGDA does not claim invulnerability or immunity from all attacks",
            "LAGDA does not claim specific encryption algorithm standards without approval",
            "LAGDA does not claim specific data residency without approval",
            "LAGDA does not claim a specific security certification without verification",
            "LAGDA does not claim specific uptime guarantees without approval",
          ]} />
        </GuideSection>

        <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link to="/security" style={{ color: "#38bdf8", ...GF, fontSize: 13, textDecoration: "none", fontWeight: 600 }}>Security Overview →</Link>
          <Link to="/security/trust-center" style={{ color: "#38bdf8", ...GF, fontSize: 13, textDecoration: "none", fontWeight: 600 }}>Trust Center →</Link>
          <Link to="/legal/privacy" style={{ color: "#38bdf8", ...GF, fontSize: 13, textDecoration: "none", fontWeight: 600 }}>Privacy Policy →</Link>
          <Link to="/contact" style={{ color: "#38bdf8", ...GF, fontSize: 13, textDecoration: "none", fontWeight: 600 }}>Contact →</Link>
        </div>

        <EduDisclaimer />
      </GuideLayout>
    </ResourcesPageShell>
  );
}

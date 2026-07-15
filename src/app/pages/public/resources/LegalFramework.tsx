import { Link } from "react-router";
import {
  ResourcesPageShell, GuideLayout, GuideHero, GuideSection, GuidePara, GuideCallout, GuideList, EduDisclaimer,
} from "../../../components/resources/ResourceComponents";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function LegalFramework() {
  return (
    <ResourcesPageShell>
      <GuideLayout
        hero={
          <GuideHero
            eyebrow="Legal Framework"
            title="Electronic signatures — general educational context."
            sub="This page provides general educational information about electronic signatures, records, and related concepts. It does not constitute legal advice. Requirements depend on the document, parties, transaction, applicable law, and required formalities."
          />
        }
      >
        <GuideCallout
          label="EDUCATIONAL INFORMATION — NOT LEGAL ADVICE"
          text="This page provides general educational information and does not constitute legal advice. Requirements may depend on the document, parties, transaction, applicable law, and required formalities. Consult a qualified legal professional for advice on specific documents and transactions."
          color="#C9960C"
        />

        <GuideSection id="purpose" title="Purpose and scope">
          <GuidePara>
            This page provides general educational context on how electronic signatures, digital records, and document authentication work conceptually. It is intended to help LAGDA users understand the environment in which electronic document workflows operate — not to provide legal conclusions about specific documents, transactions, or jurisdictions.
          </GuidePara>
          <GuidePara>
            Legal requirements for electronic signatures in the Philippines may derive from applicable statutes, rules, court issuances, and other regulatory instruments. These may change. LAGDA does not paraphrase or interpret legal requirements in a way that should be relied upon without independent legal review.
          </GuidePara>
        </GuideSection>

        <GuideSection id="electronic-signatures" title="Electronic signatures as a concept">
          <GuidePara>
            An electronic signature is broadly any electronic sound, symbol, or process attached to or associated with a document and used by a person with the intent to sign. This broad definition encompasses a wide range of implementations — from a typed name to a cryptographically verified digital signature.
          </GuidePara>
          <GuidePara>
            LAGDA eSignature provides an electronic workflow in which participants access a document through a secure link, authenticate using a configured method, review the document, and adopt a signature or complete their role. This generates an audit record that can be independently verified.
          </GuidePara>
        </GuideSection>

        <GuideSection id="attribution" title="Attribution and identity">
          <GuidePara>
            Attribution is the connection between a signature and the person who placed it. A useful electronic signature workflow should support attribution through:
          </GuidePara>
          <GuideList items={[
            "Delivery of the invitation to a specific known email address",
            "A configured authentication step that the participant completes",
            "Recording of contextual evidence including timestamp and device information",
            "A verifiable audit record of the complete signing event",
          ]} />
          <GuidePara>
            LAGDA records these events and makes them available in the audit trail and completion report. The strength of attribution depends in part on the authentication method chosen by the sender.
          </GuidePara>
        </GuideSection>

        <GuideSection id="intent-consent" title="Intent and consent">
          <GuidePara>
            For an electronic signature to be meaningful, the participant should intend to sign and have had reasonable opportunity to review the document. LAGDA's workflow requires participants to access the document, optionally authenticate, and actively adopt their signature — which supports the presence of intent and review.
          </GuidePara>
          <GuidePara>
            LAGDA does not determine whether a given participant's intent satisfies legal requirements for a specific document type. Users are responsible for designing workflows appropriate to the documents they are processing.
          </GuidePara>
        </GuideSection>

        <GuideSection id="document-integrity" title="Document integrity">
          <GuidePara>
            Document integrity refers to the assurance that a document has not been changed since it was finalized. LAGDA records information about the completed document that supports a comparison when someone presents a copy for verification.
          </GuidePara>
          <GuidePara>
            Where file comparison is supported in Document Verification, a user presenting a file that does not match the recorded version will receive a mismatch result. This does not guarantee that all possible modifications can be detected, and it does not substitute for cryptographic certificate-based signature methods where those are required.
          </GuidePara>
        </GuideSection>

        <GuideSection id="records-retention" title="Records and retention">
          <GuidePara>
            LAGDA maintains records of completed transactions, including audit trails, completion reports, and verification records. How long records are retained depends on plan terms and organizational settings. Users and organizations are responsible for their own record-keeping obligations.
          </GuidePara>
          <GuidePara>
            LAGDA does not determine or guarantee what retention period applies to a specific document type. Organizations should confirm their own obligations.
          </GuidePara>
        </GuideSection>

        <GuideSection id="documents-requiring-formalities" title="Documents requiring additional formalities">
          <GuidePara>
            Not all documents are appropriate for electronic signing. Some documents require wet signatures, notarization, personal appearance, witnesses, registration, or other formalities that electronic signing alone does not satisfy. Examples that may require additional formalities include:
          </GuidePara>
          <GuideList items={[
            "Documents required to be notarized",
            "Documents required to be executed before witnesses",
            "Deeds and instruments requiring registration with a government registry",
            "Wills, codicils, and certain estate documents",
            "Court documents requiring wet signature or personal filing",
            "Documents subject to regulated authentication procedures",
          ]} />
          <GuidePara>
            This list is illustrative, not exhaustive. Users are responsible for determining the requirements that apply to each transaction.
          </GuidePara>
          <GuideCallout
            label="RESPONSIBLE USE"
            text="Some documents may still require wet signatures, notarization, personal appearance, witnesses, or other legal formalities. Users remain responsible for determining the requirements that apply to each transaction."
            color="#C9960C"
          />
        </GuideSection>

        <GuideSection id="esig-vs-notarization" title="Electronic signing versus notarization">
          <GuidePara>
            Electronic signing and electronic notarization are separate processes with different requirements, controls, and legal standing.
          </GuidePara>
          <GuidePara>
            Electronic signing — as provided by LAGDA eSignature — is a workflow that facilitates obtaining signatures and approvals electronically, with audit evidence and verification. It does not involve a notary public.
          </GuidePara>
          <GuidePara>
            Electronic notarization involves a licensed notary public performing notarial acts remotely, subject to specific legal frameworks, controls, and accreditation requirements.
          </GuidePara>
          <GuideCallout
            label="LAGDA ENOTARY — FUTURE PRODUCT"
            text="LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules. It is not currently available. Electronic notarization through LAGDA is not currently possible."
            color="#67023B"
          />
        </GuideSection>

        <GuideSection id="responsibility" title="Organization and user responsibility">
          <GuidePara>
            LAGDA provides tools for electronic document workflows. It does not determine whether a given document type, transaction, or use is legally valid, appropriate, or sufficient for any specific purpose. Organizations and individuals using LAGDA are responsible for:
          </GuidePara>
          <GuideList items={[
            "Determining whether electronic signing is appropriate for a specific document",
            "Ensuring participants have a genuine opportunity to review the document",
            "Selecting authentication appropriate to the transaction",
            "Complying with applicable laws, regulations, policies, and formalities",
            "Maintaining records as required by their obligations",
            "Seeking legal advice where required",
          ]} />
        </GuideSection>

        <div style={{ marginTop: 40 }}>
          <EduDisclaimer />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
            <Link to="/security/trust-center" style={{ color: "#38bdf8", ...GF, fontSize: 13, textDecoration: "none", fontWeight: 600 }}>Trust Center →</Link>
            <Link to="/features/audit-trail" style={{ color: "#38bdf8", ...GF, fontSize: 13, textDecoration: "none", fontWeight: 600 }}>Audit Trail →</Link>
            <Link to="/features/document-verification" style={{ color: "#38bdf8", ...GF, fontSize: 13, textDecoration: "none", fontWeight: 600 }}>Document Verification →</Link>
            <Link to="/enotary" style={{ color: "#c084fc", ...GF, fontSize: 13, textDecoration: "none", fontWeight: 600 }}>LAGDA eNotary →</Link>
          </div>
        </div>
      </GuideLayout>
    </ResourcesPageShell>
  );
}

// The Terms of Service, written for what LAGDA offers today: electronic
// signatures under Philippine law, workspaces, plans in test mode, and an
// eNotary product that is not yet available. See docs/legal-review.md for the
// choices counsel is asked to confirm (liability cap, venue, billing terms).

import { Link } from "react-router";
import { LegalShell, Section, H3, P, UL, Facts, Plain, resetSections, COMPANY, type TocEntry } from "./LegalKit";

const META = {
  title: "Terms of Service",
  version: "1.0",
  date: "5 October 2026",
  summary: "The agreement between you and UpUp Technologies for using LAGDA: what the service is, what you may use it for, what we promise, and what we do not.",
};

const TOC: readonly TocEntry[] = [
  { id: "agreement", title: "The agreement" },
  { id: "service", title: "What LAGDA is" },
  { id: "eligibility", title: "Who may use it" },
  { id: "accounts", title: "Your account" },
  { id: "workspaces", title: "Workspaces and members" },
  { id: "esignatures", title: "Electronic signatures and their legal effect" },
  { id: "your-responsibility", title: "Your responsibilities for documents" },
  { id: "signers", title: "If you are signing" },
  { id: "acceptable-use", title: "Acceptable use" },
  { id: "content", title: "Your content and our service" },
  { id: "plans", title: "Plans, prices and billing" },
  { id: "availability", title: "Availability and changes to the service" },
  { id: "termination", title: "Ending the agreement" },
  { id: "disclaimers", title: "What we do not promise" },
  { id: "liability", title: "Limits on our liability" },
  { id: "indemnity", title: "Your responsibility to us" },
  { id: "enotary", title: "LAGDA eNotary" },
  { id: "law", title: "Governing law and disputes" },
  { id: "general", title: "General terms" },
  { id: "contact", title: "Contact" },
];

export function Terms() {
  resetSections();
  return (
    <LegalShell meta={META} toc={TOC}>
      <Section id="agreement" title="The agreement">
        <P>These Terms of Service are a contract between you and {COMPANY} (“LAGDA”, “we”, “us”). You accept them when you create a LAGDA account, when you use LAGDA on behalf of an organisation, or when you sign a document through LAGDA. The <Link to="/legal/privacy">Privacy Policy</Link> is part of this agreement.</P>
        <P>If you use LAGDA for an organisation, you confirm that you are authorised to bind it, and “you” includes that organisation. If you do not agree to these terms, do not use LAGDA.</P>
        <P>When you create an account we record the version of these terms you accepted and when.</P>
      </Section>

      <Section id="service" title="What LAGDA is">
        <P>LAGDA eSignature lets you upload a document, place signature and other fields on it, send it to named participants, collect their electronic signatures or approvals in the order you choose, and receive a completed document that is sealed with a cryptographic digest and recorded in an audit trail. Document Verification lets anyone with a Verification ID or QR code confirm that a completed record exists and that a file matches it.</P>
        <P>LAGDA also provides workspaces for teams, reusable templates, a contacts list, document sharing between accounts, and email and in-app notifications. The features available to you depend on your plan (section 11).</P>
        <P>LAGDA is a tool. It does not give legal advice, does not review your documents, and does not take part in your agreements with other parties.</P>
      </Section>

      <Section id="eligibility" title="Who may use it">
        <P>You must be at least eighteen (18) years old and able to enter into a binding contract. You may not use LAGDA if the law of your country prohibits it, or if we have previously closed your account for breaking these terms.</P>
      </Section>

      <Section id="accounts" title="Your account">
        <UL items={[
          "Give true and current information when you register, and keep it up to date.",
          "Keep your password and recovery codes secret. Turn on two-step verification if you handle documents for others.",
          "You are responsible for everything done through your account until you tell us it has been compromised. Tell us at once through the Contact page (Security topic) if you suspect unauthorised access.",
          "One person, one account. You may belong to several workspaces with one account.",
          "We verify your email address before you can send documents, because signing links and notices are delivered to email.",
        ]} />
      </Section>

      <Section id="workspaces" title="Workspaces and members">
        <P>A workspace belongs to its owner. The owner, and administrators the owner appoints, control who is a member, each member’s role, join links, branding and settings. Members act within the role they are given; LAGDA enforces those roles, and the owner is responsible for choosing them.</P>
        <P>An organisation whose workspace members use LAGDA is responsible for its members’ compliance with these terms. Documents, contacts and templates created in a workspace belong to the workspace, not to the individual member, and remain there if the member leaves.</P>
        <P>An invitation to join a workspace is an offer by the owner; accepting it makes you a member at once, in the role the owner chose. A join link lets you ask to join; an owner or administrator decides.</P>
      </Section>

      <Section id="esignatures" title="Electronic signatures and their legal effect">
        <Plain>In the Philippines an electronic signature is generally as valid as a handwritten one, provided it can be shown who signed and that the document was not changed afterwards. LAGDA is built to produce that proof. But some documents still need a notary, witnesses or a wet signature, and LAGDA cannot replace those.</Plain>
        <P>The Electronic Commerce Act of 2000 (Republic Act No. 8792) and the Rules on Electronic Evidence recognise electronic documents and electronic signatures, and provide that an electronic signature is admissible and may be relied upon where it can be shown that a method was used to identify the signer and to indicate their approval, that the method was reliable for the purpose, and that the signer agreed to be bound.</P>
        <P>For every document, LAGDA records who was invited, the email the invitation went to, when the link was opened, the signer’s acceptance of the electronic signature disclosure and its version, each field they completed, the exact time of each step, and the digest of the final document. Where a signer used a LAGDA account, the account’s identity is recorded alongside the name the sender typed. This record is the audit trail, and it is available to the parties and through Document Verification.</P>
        <P>LAGDA is not a certification authority under the Electronic Commerce Act, does not issue digital certificates, and does not verify a signer’s identity against government records. A signer is identified by control of the email address the sender chose, by any LAGDA account they sign in with, and by the signing-page record. You decide whether that is sufficient for your document.</P>
      </Section>

      <Section id="your-responsibility" title="Your responsibilities for documents">
        <P>You are responsible for each document you send through LAGDA, including:</P>
        <UL items={[
          "Deciding whether electronic signing is appropriate and lawful for that document. Some documents require notarisation, personal appearance, witnesses, registration or a handwritten signature (for example deeds of sale and other instruments affecting real property, wills, and documents a law or rule requires to be notarised). LAGDA eSignature does not provide any of those.",
          "Having the right to upload the document and to send it to the participants you name.",
          "Giving correct names and email addresses, since LAGDA identifies a participant by the address you provide.",
          "Choosing signing order, deadlines and settings, and reviewing the completed document.",
          "Keeping your own copy of completed documents where your business or the law requires it.",
        ]} />
        <P>LAGDA shows a Verification ID and seal on completed documents. It does not add a notarial certificate, government seal or any statement about legal validity, and you must not represent that it does.</P>
      </Section>

      <Section id="signers" title="If you are signing">
        <P>A signing link is personal to you and the document named in it. Do not forward it. Before you sign, LAGDA shows you an electronic signature disclosure; by accepting it you agree to sign electronically, to receive the completed document electronically, and to LAGDA keeping the record described in section 6. You may decline to sign, and may withdraw consent before you complete the document, by using the Decline option.</P>
        <P>Your use of a signing link is governed by these terms whether or not you have a LAGDA account. The sender, not LAGDA, is responsible for the content of the document and for whether they may ask you to sign it.</P>
      </Section>

      <Section id="acceptable-use" title="Acceptable use">
        <P>You must not use LAGDA to:</P>
        <UL items={[
          "Break any law, or send a document for a purpose that is unlawful or fraudulent",
          "Sign as, or pretend to be, someone you are not, or sign using a link addressed to someone else",
          "Send documents to people who have no connection with them, or in a way that amounts to spam or harassment",
          "Upload content that infringes another person’s rights, or that contains malware",
          "Probe, scan or test the security of LAGDA other than through our responsible disclosure process, or interfere with its operation",
          "Copy, resell or sublicense the service, or use it to build a competing service",
          "Share an account, or let someone outside your organisation act through your workspace",
        ]} />
        <P>We may suspend or close an account, or refuse a document, that we reasonably believe breaks these rules, and we will tell you why unless the law prevents it.</P>
      </Section>

      <Section id="content" title="Your content and our service">
        <P>You keep every right in the documents and data you put into LAGDA. You give us only the permission we need to provide the service: to store, process, transmit, scan, seal and display your content to the people you direct it to, and to keep the records described in section 6 for the retention periods in the Privacy Policy.</P>
        <P>We keep every right in LAGDA itself: its software, design, trademarks and documentation. These terms do not transfer any of them to you.</P>
        <P>If you send us feedback or suggestions, we may use them without obligation to you.</P>
      </Section>

      <Section id="plans" title="Plans, prices and billing">
        <Plain>LAGDA is in test mode. You can choose a paid plan and the features switch on, but no money is taken and no card is asked for. The billing terms below will apply from the date we announce that payments are live.</Plain>
        <Facts caption="Plans" rows={[
          ["Free", "One document sent for signing; unlimited signing of documents sent to you; verification; two-step verification."],
          ["Personal", "For an individual: a monthly allowance of documents, your branding, sharing, templates and the chatbot."],
          ["Business", "For a team, priced per member: everything in Personal plus members, roles, teams, join links and the workspace activity log."],
          ["Enterprise", "Not yet available."],
        ]} />
        <P>Current prices and limits are on the <Link to="/pricing">Pricing page</Link>, which is part of these terms. A plan belongs to a person; a workspace uses its owner’s plan.</P>
        <H3>When payments are live</H3>
        <UL items={[
          "Plans are monthly and paid in advance. Prices are in Philippine pesos and include value-added tax at the rate in force.",
          "A plan renews each month until you cancel. Cancel at any time in Plan & Billing; the plan stays active until the end of the month you have paid for, then returns to Free.",
          "Fees already paid are not refunded, except where the law requires it or where we fail to provide the service for a substantial part of a month, in which case we credit that part.",
          "If a payment fails we will tell you and give you at least seven (7) days to fix it before the plan returns to Free. Your documents and records are not deleted when a plan ends; features above the Free plan simply stop.",
          "We may change prices with at least thirty (30) days’ notice by email; the new price applies from your next renewal after the notice period.",
          "An invoice is issued for every payment and is available in Plan & Billing.",
        ]} />
      </Section>

      <Section id="availability" title="Availability and changes to the service">
        <P>We aim to keep LAGDA available at all times but do not guarantee uninterrupted service. We may suspend the service for maintenance, security or legal reasons, and will give notice in advance when we can. Current status is shown on the <Link to="/service-status">Service Status</Link> page.</P>
        <P>We improve LAGDA continually and may add, change or remove features. If we remove a feature that a paid plan is advertised as including, we will give at least thirty (30) days’ notice, and you may cancel for a pro-rated credit of any prepaid fee.</P>
      </Section>

      <Section id="termination" title="Ending the agreement">
        <P><strong>By you.</strong> You may close your account at any time from My Settings › Data & Privacy. If you own a workspace with other members, transfer ownership first. Documents you sent that others have signed, and their audit trails, stay available to those parties; your account data is otherwise deleted as the Privacy Policy describes.</P>
        <P><strong>By us.</strong> We may suspend or close your account if you materially break these terms, if the law requires it, or if an account has been unused for twenty-four (24) months (after at least thirty (30) days’ notice by email). Where reasonable we will tell you first and give you a chance to put things right.</P>
        <P>Sections 6, 10, 14, 15, 16 and 18 continue to apply after the agreement ends.</P>
      </Section>

      <Section id="disclaimers" title="What we do not promise">
        <P>LAGDA is provided “as is” and “as available”. To the extent the law allows, we make no warranty, express or implied, including of merchantability, fitness for a particular purpose, or non-infringement. In particular, we do not promise that:</P>
        <UL items={[
          "any particular document signed through LAGDA will be valid, enforceable or admissible in a given case, which depends on the document, the parties and the law that applies to them",
          "a signer is who the sender believes they are, beyond the identification described in section 6",
          "the service will be free of errors or interruptions, or that every email will be delivered",
          "the service meets any regulatory, professional or industry standard that we have not stated in writing",
        ]} />
        <P>Nothing in these terms limits a right that Philippine law gives you as a consumer and does not allow to be limited.</P>
      </Section>

      <Section id="liability" title="Limits on our liability">
        <Plain>If something goes wrong and it is our fault, the most we will pay is what you paid us in the past year, or ₱5,000 if you were on the Free plan. We are not liable for indirect losses such as lost profits. We do not limit our liability for fraud, gross negligence or anything the law says we cannot limit.</Plain>
        <P>To the fullest extent permitted by law, {COMPANY}’s total liability to you for all claims arising out of or relating to LAGDA or these terms, whether in contract, tort or otherwise, is limited to the greater of (a) the total fees you paid to us in the twelve (12) months before the event giving rise to the claim, and (b) five thousand Philippine pesos (₱5,000).</P>
        <P>We are not liable for any indirect, incidental, special, consequential or punitive damages, or for loss of profits, revenue, business, goodwill or data, even if we were told they were possible.</P>
        <P>These limits do not apply to liability for fraud, bad faith, gross negligence, death or personal injury, or any other liability that cannot be limited under the Civil Code of the Philippines or other applicable law.</P>
      </Section>

      <Section id="indemnity" title="Your responsibility to us">
        <P>If a third party brings a claim against {COMPANY} because of a document you sent, content you uploaded, or your breach of these terms or the law, you will defend us against that claim and pay the damages and reasonable legal costs that result. We will tell you promptly about any such claim and let you control its defence, provided you do not settle in a way that admits fault on our part without our consent.</P>
      </Section>

      <Section id="enotary" title="LAGDA eNotary">
        <P>LAGDA eNotary is a separate, planned product for electronic notarisation. It is not yet offered, is subject to accreditation by the Supreme Court of the Philippines and to the rules it issues, and is not governed by these terms. Nothing in LAGDA eSignature constitutes notarisation. When eNotary becomes available, separate terms will apply and will be presented before you use it.</P>
      </Section>

      <Section id="law" title="Governing law and disputes">
        <P>These terms are governed by the laws of the Republic of the Philippines.</P>
        <P>If you have a dispute with us, contact us first through the Contact page; we will try in good faith to resolve it within thirty (30) days. If we cannot, the dispute will be brought exclusively before the proper courts of the city where {COMPANY} has its principal office, as stated in section 20, and you and we submit to their jurisdiction. Where the law gives you, as a consumer, the right to bring a claim in your own locality or before a government agency, that right is not affected.</P>
      </Section>

      <Section id="general" title="General terms">
        <UL items={[
          <><strong>Changes to these terms.</strong> We may update these terms. The version and date at the top will change, and if the change affects your rights we will notify signed-in users in the app and by email at least fourteen (14) days before it takes effect. If you continue to use LAGDA after that date you accept the new terms; if you do not agree, close your account before then.</>,
          <><strong>Notices.</strong> We send notices to the email address on your account. You send notices to us through the Contact page.</>,
          <><strong>Whole agreement.</strong> These terms, the Privacy Policy and the Pricing page are the whole agreement between you and us about LAGDA and replace any earlier terms.</>,
          <><strong>Severability.</strong> If a court finds part of these terms unenforceable, the rest remains in force.</>,
          <><strong>No waiver.</strong> If we do not enforce a term, we may still enforce it later.</>,
          <><strong>Assignment.</strong> You may not transfer this agreement. We may transfer it to a successor of our business, with notice to you.</>,
          <><strong>Language.</strong> These terms are written in English. A translation is for convenience only; the English text governs.</>,
        ]} />
      </Section>

      <Section id="contact" title="Contact">
        <P>{COMPANY}, operator of LAGDA. Questions about these terms may be sent through the <Link to="/contact">Contact page</Link>.</P>
        <P>The company’s registered name, address and registration number are being settled and will be added here when complete. The principal office named in section 18 will be stated at the same time.</P>
      </Section>
    </LegalShell>
  );
}

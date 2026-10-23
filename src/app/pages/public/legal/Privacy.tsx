// The Privacy Policy, written for what LAGDA does today.
//
// Every statement about what is collected, where it is kept and for how long
// is taken from the running system (the backend's evidence model, its
// configured providers and its lifetimes), not from what a product like this
// usually says. Where the system records nothing, the policy says nothing is
// recorded. See docs/legal-review.md for the choices counsel is asked to
// confirm.

import { Link } from "react-router";
import { LegalShell, Section, H3, P, UL, Facts, Plain, resetSections, COMPANY, type TocEntry } from "./LegalKit";

const META = {
  title: "Privacy Policy",
  version: "1.3",
  date: "23 October 2026",
  summary: "How LAGDA collects, uses, keeps and protects personal information when you create an account, prepare and send documents, or sign a document someone sent you.",
};

const TOC: readonly TocEntry[] = [
  { id: "who", title: "Who we are" },
  { id: "scope", title: "What this policy covers" },
  { id: "collected", title: "What we collect" },
  { id: "signers", title: "If you are signing a document" },
  { id: "purposes", title: "Why we use it, and on what basis" },
  { id: "sharing", title: "Who we share it with" },
  { id: "location", title: "Where it is kept" },
  { id: "retention", title: "How long we keep it" },
  { id: "security", title: "How we protect it" },
  { id: "rights", title: "Your rights" },
  { id: "children", title: "Children" },
  { id: "cookies", title: "Cookies and local storage" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "How to reach us" },
];

export function Privacy() {
  resetSections();
  return (
    <LegalShell meta={META} toc={TOC}>
      <Section id="who" title="Who we are">
        <P>{COMPANY} operates LAGDA, an electronic signature and document verification platform for people and organisations in the Philippines, at lagda.io. In this policy, “LAGDA”, “we” and “us” mean {COMPANY}.</P>
        <P>We are the personal information controller for the account, workspace and usage data described below. When you prepare and send a document, you (or the organisation whose workspace you use) decide what the document contains and who signs it; for the content of those documents we act on your instructions.</P>
        <P>{COMPANY}’s registered office details and its registration with the National Privacy Commission are being settled and will be added here when complete. Until then, every request under this policy is handled through the Contact page (section 14).</P>
      </Section>

      <Section id="scope" title="What this policy covers">
        <P>This policy applies to:</P>
        <UL items={[
          "LAGDA eSignature: creating an account, preparing, sending and signing documents, and keeping their records",
          "Document Verification: checking a completed document by its Verification ID, QR code or file",
          "Workspaces: membership, invitations, join links, roles, contacts and document sharing between accounts",
          "The public website at lagda.io, including the Contact, Book a Demo and eNotary waitlist forms",
        ]} />
        <P>LAGDA eNotary, remote notarization with a notary public on a video call, is offered as a pilot, subject to Supreme Court accreditation. This policy covers its location check (section 3); the rest of its terms are shown in the service before a request is made. Joining its waitlist is covered by this policy.</P>
      </Section>

      <Section id="collected" title="What we collect">
        <P>We collect only what each feature needs. Nothing below is collected for advertising, and we do not buy data about you from anyone.</P>

        <H3>When you create and use an account</H3>
        <Facts caption="Account information" rows={[
          ["You give us", "Your name, email address, password (stored only as a secure hash, never readable by us), and optionally your organisation, intended use, job title, department, profile photo and display name."],
          ["Security settings", "Whether two-step verification is on, the secret for your authenticator app (stored encrypted), unused recovery codes (stored hashed), and a list of your signed-in sessions with the time each was started and last used."],
          ["Preferences", "Your time zone, date and number formats, notification settings, and whether other LAGDA users may find you by your exact email address."],
          ["Saved signatures", "Signature and initial images you choose to save for reuse."],
        ]} />

        <H3>When you prepare and send documents</H3>
        <Facts caption="Document and transaction information" rows={[
          ["Documents", "The files you upload (PDF or Word), the fields you place on them, and the completed, sealed version once everyone has signed."],
          ["Participants", "The name, email address, organisation and role of each person you add to a document, and any contacts you save for reuse."],
          ["Signing records", "For every document: when it was created, sent, opened, consented to, signed, approved, declined, cancelled, expired or completed, and by whom. This is the audit trail that gives a signed document its evidential value, and it is kept as long as the document is (section 8)."],
          ["Workspace activity", "Changes to members, roles, teams, join links, branding and settings, recorded with the member who made them."],
          ["Plan requests", "Which plan you asked for and when. LAGDA is in test mode: no payment details are collected and no money is moved."],
        ]} />

        <H3>Collected automatically</H3>
        <Facts caption="Technical information" rows={[
          ["Server logs", "Each request to our servers is logged with its time, the address it came from (IP address), the page or action requested and the result. These logs are used for security and for diagnosing faults, and are kept briefly (section 8)."],
          ["Email delivery", "Which emails LAGDA sent you, when, and whether they could be delivered."],
          ["Not collected", "LAGDA does not record device names or a history of your sign-ins in your account, and does not use analytics or advertising trackers on the website or in the app. It records a precise location only in a LAGDA eNotary session, when you share it (below)."],
        ]} />

        <H3>In a LAGDA eNotary session: where you are</H3>
        <P>The Rules on Electronic Notarization (A.M. No. 24-10-14-SC) require every party to an electronic notarization to be in the Philippines, which the notary must confirm through the facility’s location function, and require the facility to detect VPNs and other tools that hide where a person is. So in a session room, LAGDA checks the location of the client and of the notary.</P>
        <Facts caption="The eNotary location check" rows={[
          ["When", "Only in a session room, after the room explains the check, when you press “Share my location”; and, once you have allowed it, again just before the notary records the act. Never outside a session, and never in the background."],
          ["What is recorded", "For each check: your device’s position (latitude and longitude, to about one metre), how precise the device says it is, the city or municipality and province it falls in, the result, and the time. If your browser gives no position, only that it did not and why."],
          ["The connection check", "The internet address your browser connects from is compared, on LAGDA’s own servers, with free public lists of VPN, hosting and Tor addresses (X4BNet’s VPN and datacenter lists, MIT licence; the Tor Project’s exit list), which LAGDA downloads daily. The address is not sent to any other company, and LAGDA does not keep it; only the result is kept."],
          ["Who sees it", "Only you and the other party of that request. They see your city or municipality and province, how precise the check was and when it was made, never your exact position. The notarized document and the notary’s register record that all parties were within the Philippines, with each party’s city or municipality and province."],
          ["Your declaration", "Once your location is verified, you confirm a statement that you are physically present at that place in the Philippines, as Rule III, Section 2(c) of the Rules requires each party to disclose their actual physical location. The declaration, the place and the time are kept with the session and stated on the notarized document."],
          ["Your address", "The address you type in the room, in your own words, is kept beside the check, as the Rules also ask each party to state where they are."],
        ]} />
        <P>The personal information of the parties to an electronic notarization is processed under the Data Privacy Act of 2012 and is shared with the Supreme Court of the Philippines as the Rules and the Supreme Court’s guidelines on sharing electronic notarization data require: the notarized document and the notary’s electronic notarial book are transmitted to the Supreme Court, and its authorized officers may inspect them. Otherwise, information from an electronic notarization is disclosed only on the order of a court or where a law requires it.</P>

        <H3>When you contact us</H3>
        <P>Messages sent through the Contact, Book a Demo and eNotary waitlist forms are stored with the name, email address and any details you include, so that we can reply and keep a record of the conversation.</P>
      </Section>

      <Section id="signers" title="If you are signing a document">
        <Plain>Someone sent you a document through LAGDA. We keep a record of your signature and of how it was made, because that record is what makes the signed document reliable. The sender can see it; so can anyone the sender shares the completed document with.</Plain>
        <P>You do not need a LAGDA account to sign. When a sender adds you to a document we receive your name, email address and organisation from them, and we email you a private signing link. When you use it we record:</P>
        <UL items={[
          "That the link was opened, and that you accepted the electronic signature disclosure (with the version of the disclosure text you accepted)",
          "Your signature or initials as you drew, typed or uploaded them, and every field you filled in",
          "The exact time of each step, and the fact that the link you used was the one addressed to your email",
          "If you signed from a LAGDA account instead, the name and email of that account, which the sender can see alongside the name they typed for you",
        ]} />
        <P>Your signing link works for 14 days and may be re-issued by the sender. If the sender set an expiration date, signing closes at the end of that day, Philippine time. You may decline to sign at any time and give a reason; the reason is shown to the sender.</P>
        <P>The completed document, the names of all participants and the audit trail are available to the sender, to the sender’s workspace according to its roles, and to the other participants of the same document. Public verification (section 6) shows only what is listed there.</P>
      </Section>

      <Section id="purposes" title="Why we use it, and on what basis">
        <P>Under the Data Privacy Act of 2012 we need a lawful basis for each use. These are ours:</P>
        <Facts caption="Purposes and bases" rows={[
          ["Providing the service you asked for", "Creating your account, sending your documents, delivering signing links, recording signatures, producing completed documents and their verification records. Basis: performance of a contract with you, and the Electronic Commerce Act’s requirements for reliable electronic signatures and records."],
          ["Keeping the record of a signed document", "Retaining the completed document and its audit trail so that the parties can prove what was signed, when and by whom. Basis: the legitimate interests of the parties in evidence of their agreement, and our legal obligation to keep electronic records reliable."],
          ["Security", "Checking passwords and codes, keeping sessions, scanning uploaded files for malware, rate limiting, server logs. Basis: our legitimate interest in keeping the service and your data safe."],
          ["Telling you what happened", "Emails and in-app notices about documents waiting for you, documents completed, invitations, and changes to your account. Basis: performance of the contract. You can turn off non-essential emails in Notification settings; security emails cannot be turned off."],
          ["Answering you", "Replying to messages sent through the website. Basis: your request."],
          ["The eNotary location check", "Confirming that every party to an electronic notarization is in the Philippines, and keeping that record with the notarization. Basis: compliance with the Rules on Electronic Notarization, which require it."],
          ["Legal obligations", "Responding to lawful orders and keeping the records the law requires. Basis: compliance with law."],
        ]} />
        <P>We do not use your information for advertising, do not sell it, and do not make automated decisions about you that have legal or similarly significant effects.</P>
      </Section>

      <Section id="sharing" title="Who we share it with">
        <P>We share personal information only with the service providers below, each of which processes it on our instructions, and with the people you choose to share it with through LAGDA itself.</P>
        <Facts caption="Service providers" rows={[
          ["Akamai Connected Cloud (Linode)", "Hosts LAGDA’s application servers, database and document storage. Location: Singapore."],
          ["Netlify", "Serves the LAGDA website and web application to your browser."],
          ["Google (Firebase Authentication)", "Sends and checks the email verification link when you create an account or change your email."],
          ["Google (Gmail)", "Sends LAGDA’s email notifications: signing links, completion notices, invitations, password resets and security codes."],
          ["OPSWAT MetaDefender", "Scans every uploaded file for malware before LAGDA accepts it. The file is sent to OPSWAT for analysis; OPSWAT’s own privacy terms govern what it retains about the scan."],
        ]} />
        <P>The eNotary connection check uses public lists that LAGDA downloads to its own servers (X4BNet’s VPN and datacenter lists and the Tor Project’s exit list). Their publishers receive nothing about you.</P>
        <P>Within LAGDA, information is visible to the people you share it with: the participants of a document, the members of a workspace according to their roles, and anyone you share a completed document with. If you let people find you by email, another LAGDA user who types your exact address can see your name, title and photo and send you a contact request.</P>
        <H3>Public verification</H3>
        <P>Anyone who has a completed document’s Verification ID or QR code can check it at lagda.io/verify. That check shows only: that a completed record exists, its completion date, how many participants it had, and the cryptographic digest and seal of the final document. It does not show the document, participant names or email addresses. A participant may request access to the full record by proving their email address with a code; the owner may share it with others.</P>
        <P>We disclose information to authorities only when required by Philippine law or a valid order, and we tell the account holder unless the law forbids it.</P>
      </Section>

      <Section id="location" title="Where it is kept">
        <P>LAGDA’s servers, database and document storage are in Singapore, operated by Akamai Connected Cloud. The website is delivered through Netlify’s global network. Google and OPSWAT may process the specific items listed in section 6 in other countries.</P>
        <P>Because this means personal information of people in the Philippines leaves the country, we rely on contracts with each provider that require them to protect it to a standard consistent with the Data Privacy Act, and we keep the list in section 6 current. If we move the main storage to the Philippines, we will update this policy.</P>
      </Section>

      <Section id="retention" title="How long we keep it">
        <Plain>Signed documents and their audit trails are kept for a long time on purpose, because they are evidence. Everything short-lived (codes, links, sessions) expires by itself.</Plain>
        <Facts caption="Retention periods" rows={[
          ["Completed documents, their audit trails and verification records", "Ten (10) years from completion, the period within which an action on a written contract may be brought under the Civil Code, and longer where another law requires it. They are kept even if the sender’s account is closed, because the other parties rely on them."],
          ["Drafts and unsent documents", "Until you delete them, or 90 days after the workspace that holds them is closed."],
          ["Cancelled, declined and expired requests", "Kept with their records as above, since they document what was and was not signed."],
          ["eNotary location checks and declarations", "With the record of the notarial session they belong to, for as long as that record is kept, since they show that the parties were in the Philippines when the act was done."],
          ["Notarized documents and the electronic notarial book", "For the duration of the notary’s electronic notarial commission, or longer where a court of competent jurisdiction directs, as Rule XII, Section 2 of the Rules on Electronic Notarization requires."],
          ["Account information", "While your account is open, and for 30 days after it is closed so that a mistaken closure can be reversed. After that the account is deleted; your name stays on records of documents you signed or sent, as part of their audit trail."],
          ["Workspace activity log", "While the workspace exists."],
          ["Website messages (Contact, Book a Demo, waitlist)", "Two (2) years from the last reply."],
          ["Server logs", "Thirty (30) days, then deleted automatically."],
          ["Sign-in sessions", "Seven (7) days from sign-in, or until you sign out."],
          ["Signing links", "Fourteen (14) days; a signer’s session on the signing page lasts up to eight (8) hours."],
          ["Verification and security codes", "Ten (10) minutes. Two-step sign-in attempts also expire after ten (10) minutes."],
          ["Workspace invitations and plan requests", "Seven (7) days."],
        ]} />
      </Section>

      <Section id="security" title="How we protect it">
        <UL items={[
          "All traffic between your browser and LAGDA is encrypted (HTTPS).",
          "Passwords are stored only as salted hashes. Authenticator secrets and signing-link credentials are stored encrypted with keys kept outside the database.",
          "Every signing link is unique to one person and one document, is sent only to that person’s email, and stops working when it expires, when the document ends, or when the sender re-issues it.",
          "Each workspace’s data is separated at the database level, so one workspace cannot read another’s.",
          "Completed documents are sealed with a cryptographic digest, so any later change to the file can be detected by verification.",
          "Uploaded files are scanned for malware before they are accepted.",
          "Accounts can turn on two-step verification with an authenticator app, and can sign out other sessions at any time.",
        ]} />
        <P>No system is perfectly secure. If we learn of a breach that is likely to cause you real risk, we will tell you and the National Privacy Commission within the time the law requires (72 hours from knowledge of it); for a breach that touches an electronic notarization, we will also tell the Supreme Court’s office that oversees electronic notarization. Please report any security concern to us through the Contact page under the Security topic, or see our <Link to="/security/trust-center">responsible disclosure</Link> page.</P>
      </Section>

      <Section id="rights" title="Your rights">
        <P>Under the Data Privacy Act you have the right to:</P>
        <UL items={[
          "Be informed about how your personal information is processed (this policy)",
          "Access the personal information we hold about you",
          "Correct information that is wrong or incomplete",
          "Object to processing, and withdraw consent where consent is the basis",
          "Have information erased or blocked when it is no longer needed or was unlawfully obtained",
          "Receive a copy of your information in a usable electronic format (data portability)",
          "Be indemnified for damages caused by inaccurate, incomplete, outdated, false, unlawfully obtained or unauthorised use of your personal information",
          "Complain to the National Privacy Commission",
        ]} />
        <P>You can change your name, photo, preferences, notification settings and security settings yourself in <strong>My Settings</strong>. To ask for a copy of your data or to close your account, use <strong>My Settings › Data & Privacy</strong>, which sends your request to us with the right topic; we will confirm receipt and reply within fifteen (15) working days.</P>
        <P>Two limits apply. First, we cannot erase a signed document or its audit trail at one party’s request while another party still has the right to rely on it; we can remove your account while keeping that record. Second, if you own a workspace with other members, you must hand ownership to someone else before the account can be closed.</P>
      </Section>

      <Section id="children" title="Children">
        <P>LAGDA accounts are for people aged eighteen (18) and over. We do not knowingly collect information from children. A document may name a minor as a participant only where the law allows a minor to sign it; the sender is responsible for that judgement.</P>
      </Section>

      <Section id="cookies" title="Cookies and local storage">
        <P>LAGDA uses only the cookies it needs to work:</P>
        <Facts caption="Cookies" rows={[
          ["Session cookie", "Keeps you signed in. Expires after seven days or when you sign out."],
          ["Security token", "Protects forms against cross-site request forgery. Lives with the session."],
          ["Sign-in ticket", "Carries a sign-in that is waiting for its two-step code. Expires after ten minutes."],
          ["Signing-page session", "Keeps a signer on the document they opened from their link. Expires after eight hours."],
        ]} />
        <P>The app also stores small preferences in your browser (for example which tab you had open and whether you have seen the welcome tour). These stay on your device and are never sent to us. We use no third-party, advertising or analytics cookies.</P>
      </Section>

      <Section id="changes" title="Changes to this policy">
        <P>When we change this policy we will update the version and date at the top. If a change affects your rights or how we use your information, we will tell signed-in users in the app and by email at least fourteen (14) days before it takes effect. Earlier versions are available on request.</P>
      </Section>

      <Section id="contact" title="How to reach us">
        <P>For any question or request about your personal information, use the <Link to="/contact?topic=privacy">Contact page</Link> and choose the Privacy topic. Requests are handled by {COMPANY}’s data protection officer, a lawyer who is one of LAGDA’s founders.</P>
        <P>The company’s registered address and a direct email address for privacy requests are not yet published; they will be added here when the company’s registration details are settled. You may also complain to the National Privacy Commission of the Philippines at privacy.gov.ph.</P>
      </Section>
    </LegalShell>
  );
}

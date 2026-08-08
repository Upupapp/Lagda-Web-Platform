import { Link } from "react-router";
import {
  ResourcesPageShell, GuideLayout, GuideHero, GuideSection, GuidePara, GuideCallout, GuideList, EduDisclaimer,
} from "../../../components/resources/ResourceComponents";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function TemplatesGuide() {
  return (
    <ResourcesPageShell>
      <GuideLayout
        hero={
          <GuideHero
            eyebrow="Templates Guide"
            title="Building and using LAGDA templates."
            sub="A template is a reusable document workflow that can include the document file, fields, participant roles, routing, authentication rules, reminders, and branding."
          />
        }
      >
        <GuideSection id="what-is" title="What is a LAGDA template?">
          <GuidePara>
            A LAGDA template is a reusable configuration that captures all the elements of a document workflow: the document file, required fields, participant role placeholders, routing order, authentication requirements for each participant, reminder schedule, expiration settings, signing instructions, and company branding.
          </GuidePara>
          <GuidePara>
            A template is not simply a stored document. It is the complete workflow configuration that LAGDA applies when you start a new transaction from the template.
          </GuidePara>
        </GuideSection>

        <GuideSection id="template-vs-document" title="Template versus document">
          <GuidePara>
            A document file is the PDF or other content participants review and sign. A template captures the workflow that is applied to a document — including who signs, in what order, how, and with what settings.
          </GuidePara>
          <GuidePara>
            When you create a transaction from a template, LAGDA uses the template's workflow configuration but creates a new transaction. Changing participant details or sending instructions for one transaction does not alter the underlying template.
          </GuidePara>
        </GuideSection>

        <GuideSection id="template-elements" title="What a template can include">
          <GuideList items={[
            "Document file — the PDF that participants will view and sign",
            "Fields — signature, initial, date, text, and other required fields with positions configured",
            "Participant-role placeholders — generic roles (e.g., 'Client', 'Authorizing Officer') filled with real contacts when starting a transaction",
            "Routing — parallel, sequential, or mixed order defined in the template",
            "Authentication rules — per-role authentication method requirements",
            "Reminder schedule — automatic follow-up timing for pending actions",
            "Expiration settings — transaction deadline from the date of sending",
            "Signing instructions — messages displayed to each participant",
            "Branding — company logo, colors, and email customization (Business and Enterprise plans)",
          ]} />
        </GuideSection>

        <GuideSection id="plan-access" title="Template access by plan">
          <GuidePara>
            Personal templates are available on all plans and are owned by the individual sender. Shared workspace templates — visible and usable by all authorized senders in a workspace — require Business or Enterprise.
          </GuidePara>
          <GuidePara>
            Template quantity limits, permission controls, and Enterprise-managed template features will be confirmed at launch.
          </GuidePara>
        </GuideSection>

        <GuideSection id="examples" title="Common template examples">
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { title: "Engagement letter",     desc: "A professional services engagement template with variable client name, scope, and fee. Sequential routing: client signs first, then the sending organization countersigns." },
              { title: "Employee onboarding",   desc: "A multi-document onboarding packet including employment contract, policy acknowledgments, and NDA. Sequential routing with HR countersign." },
              { title: "Vendor agreement",       desc: "A supplier agreement with configurable vendor participant and internal approval routing." },
              { title: "Lease workflow",         desc: "A property lease with tenant, lessor, and optional witness participant placeholders. Authentication configured per participant role." },
              { title: "Internal approval",      desc: "A department approval template with sequential routing through department head and officer." },
              { title: "Client acknowledgment",  desc: "A service acknowledgment or consent form with client signature first, then practitioner countersign." },
            ].map(({ title, desc }) => (
              <div key={title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, padding: "12px 16px" }}>
                <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>{title}</p>
                <p style={{ color: "#94A3B8", ...GF, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{desc}</p>
              </div>
            ))}
          </div>
        </GuideSection>

        <GuideSection id="testing" title="Testing a template">
          <GuidePara>
            Before using a template in production, test it by sending a transaction to a test email address or internal collaborator. Confirm that:
          </GuidePara>
          <GuideList items={[
            "Fields are positioned correctly on the document",
            "Participant roles have the right authentication configured",
            "Routing order reflects your intended workflow",
            "Reminders are set to appropriate intervals",
            "Branding appears correctly in signing invitations",
            "Signing instructions are clear to participants",
          ]} />
        </GuideSection>

        <GuideSection id="updating" title="Updating and archiving templates">
          <GuidePara>
            When you update a template, existing transactions started from the previous version are not affected — they retain the configuration that was active when they were created. Only new transactions started after the update will use the new version.
          </GuidePara>
          <GuidePara>
            Templates you no longer need can be archived or deactivated to keep your template library organized without deleting the associated historical transactions.
          </GuidePara>
        </GuideSection>

        <div style={{ marginTop: 40, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link to="/features/templates" style={{ display: "inline-flex", alignItems: "center", background: "#0078D4", color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "11px 22px", borderRadius: 8, textDecoration: "none", minHeight: 44 }}>Explore Templates →</Link>
          <Link to="/pricing/templates-by-plan" style={{ display: "inline-flex", alignItems: "center", color: "#38bdf8", ...GF, fontSize: 14, fontWeight: 600, padding: "11px 0", textDecoration: "none" }}>Templates by plan →</Link>
        </div>

        <EduDisclaimer />
      </GuideLayout>
    </ResourcesPageShell>
  );
}

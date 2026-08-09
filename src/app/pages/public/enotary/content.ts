// LAGDA eNotary section — content, nav, FAQ.
// HARD CONSTRAINT: Every page must include "LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules."
// Burgundy (#67023B) is the controlled future-product accent for eNotary.
// No purchase actions, no active notary roles, no accreditation claims.

export const ENOTARY_SUBNAV = [
  { label: "Overview",             path: "/enotary"                      },
  { label: "Future Capabilities",  path: "/enotary/future-capabilities"  },
  { label: "Accreditation Roadmap",path: "/enotary/accreditation-roadmap"},
  { label: "Waitlist",             path: "/enotary/waitlist"             },
  { label: "FAQ",                  path: "/enotary/faq"                  },
];

// Re-exported so the eNotary pages can keep importing it from their own content
// module. The sentence itself is defined once in config/enotary-disclaimer.ts,
// which has no imports and is therefore safe for the shell and config to use too.
export { ENOTARY_DISCLAIMER } from "../../../config/enotary-disclaimer";

export const ENOTARY_FAQ_GROUPS = [
  {
    id: "about",
    title: "About LAGDA eNotary",
    items: [
      {
        id: "what-is-enotary",
        q: "What is LAGDA eNotary?",
        a: "LAGDA eNotary is a planned future product that aims to support remote electronic notarial workflows in the Philippines. It is Coming Soon and Subject to Supreme Court Accreditation and applicable rules. It is not currently available.",
      },
      {
        id: "is-it-available",
        q: "Is the service available now?",
        a: "No. LAGDA eNotary is not currently available. It is Coming Soon and Subject to Supreme Court Accreditation and applicable rules. No notarial acts can be performed through LAGDA at this time.",
      },
      {
        id: "is-lagda-accredited",
        q: "Is LAGDA accredited by the Supreme Court?",
        a: "No. LAGDA eNotary is Subject to Supreme Court Accreditation and applicable rules. LAGDA does not currently represent the service as accredited, approved, or operational.",
      },
      {
        id: "enotary-vs-esig",
        q: "Is eNotary the same as eSignature?",
        a: "No. LAGDA eSignature is a currently available electronic document signing service. LAGDA eNotary is a separate future regulated product that would facilitate electronic notarial acts — subject to Supreme Court accreditation and applicable rules. They are distinct products with different legal frameworks, requirements, and oversight.",
      },
    ],
  },
  {
    id: "access",
    title: "Access and Purchase",
    items: [
      {
        id: "can-book",
        q: "Can I book a notary through LAGDA?",
        a: "No. LAGDA eNotary is not available. Notary booking is not possible. This feature may become available in the future, subject to Supreme Court accreditation and applicable rules.",
      },
      {
        id: "can-purchase",
        q: "Can I purchase LAGDA eNotary now?",
        a: "No. LAGDA eNotary is not available for purchase. It is Coming Soon and Subject to Supreme Court Accreditation and applicable rules.",
      },
      {
        id: "included-in-esig",
        q: "Is eNotary included in my eSignature plan?",
        a: "No. LAGDA eNotary is a separate future regulated product and is not included in any current LAGDA eSignature plan.",
      },
    ],
  },
  {
    id: "notaries",
    title: "For Notaries",
    items: [
      {
        id: "notaries-apply",
        q: "Can notaries apply or register with LAGDA now?",
        a: "LAGDA eNotary is not yet available for notary registration or appointment. You may join the waitlist to receive updates. Joining the waitlist does not create eligibility, reserve accreditation, appoint a notary, or guarantee access.",
      },
      {
        id: "notary-role",
        q: "Will LAGDA support a Notary Public role?",
        a: "This is a planned future concept for when LAGDA eNotary becomes available, subject to Supreme Court accreditation and applicable rules. No active notary role currently exists in LAGDA.",
      },
    ],
  },
  {
    id: "future",
    title: "Future Plans",
    items: [
      {
        id: "eligible-docs",
        q: "What documents may be eligible for electronic notarization?",
        a: "This will depend on applicable rules, Supreme Court accreditation requirements, and the specific notarial acts covered. LAGDA does not speculate on which document types will be eligible. Final eligibility depends on approved rules.",
      },
      {
        id: "remote-appearance",
        q: "Will remote appearance be supported?",
        a: "This is a planned future concept, subject to Supreme Court accreditation and applicable rules. LAGDA does not make specific commitments about approved features until accreditation requirements are confirmed.",
      },
      {
        id: "sessions-recorded",
        q: "Will notarial sessions be recorded?",
        a: "Session recording is a conceptual feature under consideration, subject to applicable rules and accreditation requirements. Nothing is confirmed at this stage.",
      },
      {
        id: "when-launch",
        q: "When will LAGDA eNotary launch?",
        a: "LAGDA does not publish a launch date for eNotary. Any future launch depends on Supreme Court accreditation, applicable rules, technical readiness, operational readiness, and other required approvals. We will notify waitlist subscribers when there are updates.",
      },
      {
        id: "waitlist-access",
        q: "Does joining the waitlist guarantee access?",
        a: "No. Joining the waitlist does not create an account, confirm eligibility, reserve accreditation, appoint a notary, or guarantee access to any future LAGDA eNotary service.",
      },
    ],
  },
];

export const FUTURE_CAPABILITY_CATEGORIES = [
  {
    id: "identity",
    label: "Identity and Appearance",
    status: "Future concept — subject to accreditation",
    capabilities: [
      "Secure remote appearance verification",
      "Identity-document review",
      "Live audio-video session capability",
      "Credential verification concepts",
    ],
  },
  {
    id: "document",
    label: "Document and Notarial Act",
    status: "Future concept — subject to applicable rules",
    capabilities: [
      "Document review within session",
      "Participant oath or acknowledgment workflow",
      "Notarial register direction",
      "Electronic seal or certificate architecture",
    ],
  },
  {
    id: "evidence",
    label: "Evidence and Records",
    status: "Future concept — subject to accreditation",
    capabilities: [
      "Session evidence and audit records",
      "Completion documentation",
      "Verification records",
      "Secure storage for notarial records",
    ],
  },
  {
    id: "operations",
    label: "Operations",
    status: "Future concept",
    capabilities: [
      "Notary assignment and scheduling",
      "Organization administration",
      "Payment and fee direction",
      "Compliance monitoring concepts",
    ],
  },
];

export const ROADMAP_STAGES = [
  { id: "research",    label: "Legal and Regulatory Research",         status: "In progress",           desc: "Review of applicable statutes, court issuances, and regulatory requirements for remote electronic notarization." },
  { id: "architecture",label: "Product and Security Architecture",     status: "In progress",           desc: "Design of identity verification, session controls, document handling, and evidence systems." },
  { id: "identity",   label: "Identity and Session-Control Design",    status: "In progress",           desc: "Remote appearance and credential-verification workflow design." },
  { id: "dp-review",  label: "Data Protection Review",                 status: "Planned",               desc: "Privacy impact assessment and data-handling design for notarial session records." },
  { id: "validation", label: "Notary Workflow Validation",             status: "Planned",               desc: "Workflow review with legal and notarial expertise." },
  { id: "testing",    label: "Technical Testing",                      status: "Planned",               desc: "Security and functional testing of the complete technical system." },
  { id: "formal-prep",label: "Formal Accreditation Preparation",      status: "Future regulatory step", desc: "Preparation of accreditation submission materials in accordance with applicable requirements." },
  { id: "review",     label: "Regulatory Review and Accreditation",   status: "Future regulatory step", desc: "Formal review by the Supreme Court and other applicable regulatory bodies." },
  { id: "launch",     label: "Controlled Launch",                     status: "After required approval", desc: "Service launch only after all required accreditation and approvals are obtained." },
  { id: "compliance", label: "Ongoing Compliance and Operational Review", status: "After launch",      desc: "Continuous monitoring, compliance reporting, and operational review." },
];

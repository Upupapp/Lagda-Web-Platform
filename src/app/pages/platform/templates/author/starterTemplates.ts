// A ready-made starting point for the author editor — "type all the needed
// contents" starts faster from a real, professionally-worded draft than
// from a blank page. Built as a `FlowDocument` directly (not ProseMirror
// JSON) so it round-trips through the exact same converter the editor's own
// content does, and is bound to the template's OWN role slots when they
// exist — "Employer"/"Employee"-shaped roles get real field anchors; a
// template with different or no roles yet still gets the wording, with
// signature lines left as plain bracketed placeholders to fill in later.

import type { FlowDocument, DocumentBlock, TemplateRolePlaceholder } from "../../../../models/templates";

const bold = (text: string) => ({ kind: "text" as const, text, marks: [{ kind: "bold" as const }] });
const plain = (text: string) => ({ kind: "text" as const, text });

function signatureBlock(
  roleLabel: string, slot: TemplateRolePlaceholder | undefined,
): DocumentBlock[] {
  const signatureRun = slot?.backendSlotId
    ? [{ kind: "fieldAnchor" as const, fieldType: "signature" as const, slotId: slot.backendSlotId, required: true, label: `${roleLabel} Signature` }]
    : [plain(`[${roleLabel} Signature]`)];
  const dateRun = slot?.backendSlotId
    ? [{ kind: "fieldAnchor" as const, fieldType: "date-signed" as const, slotId: slot.backendSlotId, required: true, label: `${roleLabel} Date` }]
    : [plain("[Date]")];

  return [
    { kind: "paragraph", content: [bold(`${roleLabel}:`)] },
    { kind: "paragraph", content: [plain("Signature: "), ...signatureRun] },
    { kind: "paragraph", content: [plain("Date: "), ...dateRun] },
  ];
}

/**
 * "Employment Offer Letter" — a formal, single-position offer with
 * compensation, start date, at-will status and a signature block per
 * party. Binds to the first two role slots BY POSITION when the template
 * has any (typically an Employer/HR role and the Employee), leaving plain
 * bracketed placeholders otherwise so the wording is still useful before
 * roles are configured.
 */
export function employmentOfferLetterStarter(
  placeholders: readonly TemplateRolePlaceholder[],
): FlowDocument {
  const employer = placeholders[0];
  const employee = placeholders[1] ?? placeholders[0];

  const content: DocumentBlock[] = [
    { kind: "heading", level: 1, align: "center", content: [plain("Employment Offer Letter")] },
    { kind: "paragraph", align: "center", content: [{ kind: "variable", key: "effective_date", label: "Effective Date" }] },
    { kind: "paragraph", content: [
      plain("This Employment Offer Letter (the "), bold("“Agreement”"),
      plain(") is entered into between "),
      { kind: "variable", key: "employer_name", label: "Employer Name" },
      plain(" (the "), bold("“Employer”"), plain(") and "),
      { kind: "variable", key: "employee_name", label: "Employee Name" },
      plain(" (the "), bold("“Employee”"), plain(")."),
    ] },
    {
      kind: "orderedList",
      content: [
        {
          kind: "listItem",
          content: [
            { kind: "paragraph", content: [bold("Position. "), plain("The Employee is offered the position of "), { kind: "variable", key: "job_title", label: "Job Title" }, plain(", reporting to "), { kind: "variable", key: "reports_to", label: "Reports To" }, plain(".")] },
          ],
        },
        {
          kind: "listItem",
          content: [
            { kind: "paragraph", content: [bold("Start Date. "), plain("Employment under this Agreement begins on "), { kind: "variable", key: "start_date", label: "Start Date" }, plain(".")] },
          ],
        },
        {
          kind: "listItem",
          content: [
            { kind: "paragraph", content: [bold("Compensation. "), plain("The Employee will be paid an annual salary of "), { kind: "variable", key: "annual_salary", label: "Annual Salary" }, plain(", payable in accordance with the Employer's standard payroll schedule.")] },
          ],
        },
        {
          kind: "listItem",
          content: [
            { kind: "paragraph", content: [bold("At-Will Employment. "), plain("Employment under this Agreement is at-will and may be terminated by either party at any time, with or without cause or notice, subject to applicable law.")] },
          ],
        },
        {
          kind: "listItem",
          content: [
            { kind: "paragraph", content: [bold("Confidentiality. "), plain("The Employee agrees to keep confidential all proprietary and business information disclosed during employment, both during and after the employment relationship.")] },
          ],
        },
        {
          kind: "listItem",
          content: [
            { kind: "paragraph", content: [bold("Governing Law. "), plain("This Agreement is governed by the laws of the jurisdiction in which the Employer principally operates.")] },
          ],
        },
      ],
    },
    { kind: "paragraph", content: [plain("By signing below, both parties agree to the terms of this Agreement.")] },
    { kind: "pageBreak" },
    ...signatureBlock("Employer", employer),
    { kind: "paragraph", content: [] },
    ...signatureBlock("Employee", employee),
  ];

  return { kind: "flowDocument", content };
}

export interface StarterTemplate {
  id: string;
  label: string;
  description: string;
  build: (placeholders: readonly TemplateRolePlaceholder[]) => FlowDocument;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "employment-offer-letter",
    label: "Employment Offer Letter",
    description: "Position, start date, compensation, at-will status and a signature block for both parties.",
    build: employmentOfferLetterStarter,
  },
];

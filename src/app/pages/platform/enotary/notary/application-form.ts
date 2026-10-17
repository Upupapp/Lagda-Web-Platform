// The notary application form as data: the steps, the fields on each, what is
// required, and how the server's refusals read.
//
// The server is the authority on whether an application is complete. This is
// what lets the form say what is missing before it asks, and put a refusal
// next to the field it is about.

import { ApiError } from "../../../../services/api-client";
import {
  missingFromRefusal, REQUIRED_FILE_KINDS, FILE_MAX_BYTES, FILE_MEDIA_TYPES, FILE_KIND_LABEL,
  type ApplicationFields, type ApplicationFile, type ApplicationFileKind,
} from "../../../../services/real/notary-applications.service";
import { errorCode } from "../../../../services/real/enotary-invitations.service";

export type ApplyStep = "personal" | "credentials" | "documents" | "agreement" | "review";

export const APPLY_STEPS: readonly { readonly id: ApplyStep; readonly label: string }[] = [
  { id: "personal", label: "Personal & office" },
  { id: "credentials", label: "Credentials" },
  { id: "documents", label: "Documents" },
  { id: "agreement", label: "Agreement & listing" },
  { id: "review", label: "Review & submit" },
];

export type TextFieldKey = Exclude<keyof ApplicationFields, "listingConsent" | "agreementVersion">;

export interface FieldSpec {
  readonly key: TextFieldKey;
  readonly label: string;
  readonly step: ApplyStep;
  readonly required: boolean;
  readonly hint?: string;
  readonly type?: "text" | "date" | "tel";
  readonly max: number;
}

export const FIELDS: readonly FieldSpec[] = [
  { key: "office", label: "Office or law firm", step: "personal", required: true, max: 160, hint: "As it should appear to clients." },
  { key: "city", label: "City or municipality", step: "personal", required: true, max: 80 },
  { key: "province", label: "Province", step: "personal", required: true, max: 80 },
  { key: "phone", label: "Phone number", step: "personal", required: true, max: 32, type: "tel", hint: "For LAGDA to reach you about this application." },
  { key: "rollNo", label: "Roll of Attorneys number", step: "credentials", required: true, max: 40 },
  { key: "ibpNo", label: "IBP number", step: "credentials", required: true, max: 40 },
  { key: "ibpChapter", label: "IBP chapter", step: "credentials", required: false, max: 80 },
  { key: "ptrNo", label: "PTR number", step: "credentials", required: true, max: 40 },
  { key: "ptrYear", label: "PTR year", step: "credentials", required: false, max: 4 },
  { key: "mcleComplianceNo", label: "MCLE compliance number", step: "credentials", required: false, max: 40 },
  { key: "mclePeriod", label: "MCLE compliance period", step: "credentials", required: false, max: 80, hint: "For example: 7th compliance period." },
  { key: "commissionNo", label: "Notarial commission number", step: "credentials", required: true, max: 40 },
  { key: "commissionCourt", label: "Court or executive judge that issued the commission", step: "credentials", required: true, max: 160 },
  { key: "commissionValidFrom", label: "Commission valid from", step: "credentials", required: true, max: 10, type: "date" },
  { key: "commissionValidUntil", label: "Commission valid until", step: "credentials", required: true, max: 10, type: "date", hint: "After this date you can no longer accept requests." },
  { key: "notarialJurisdiction", label: "Notarial jurisdiction", step: "credentials", required: true, max: 160, hint: "The city or province named in your commission." },
];

export const fieldsOf = (step: ApplyStep): readonly FieldSpec[] => FIELDS.filter(field => field.step === step);

export type FieldErrors = Partial<Record<TextFieldKey | "files" | "agreement" | "listing", string>>;

export interface FormValues extends ApplicationFields {
  /** Ticked in this session or on an earlier save. */
  agreementAccepted: boolean;
}

/** What is missing on one step, as messages keyed by field. Dates are checked for order and the future. */
export function validateStep(step: ApplyStep, values: FormValues, files: readonly ApplicationFile[], today: string): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of fieldsOf(step)) {
    const value = values[field.key].trim();
    if (field.required && value === "") errors[field.key] = `Enter the ${field.label.charAt(0).toLowerCase()}${field.label.slice(1)}.`;
    else if (field.key === "ptrYear" && value !== "" && !/^(19|20)\d{2}$/.test(value)) errors.ptrYear = "Enter a four-digit year.";
  }
  if (step === "credentials") {
    const from = values.commissionValidFrom;
    const until = values.commissionValidUntil;
    if (until !== "" && errors.commissionValidUntil === undefined && until <= today) errors.commissionValidUntil = "The commission must still be valid. Enter a date in the future.";
    if (from !== "" && until !== "" && errors.commissionValidUntil === undefined && until < from) errors.commissionValidUntil = "This date is before the date it starts.";
  }
  if (step === "documents") {
    const missing = REQUIRED_FILE_KINDS.filter(kind => !files.some(file => file.kind === kind && file.scanState !== "infected"));
    if (missing.length > 0) errors.files = `Add ${missing.map(kind => FILE_KIND_LABEL[kind].toLowerCase()).join(", ")}.`;
  }
  if (step === "agreement") {
    if (!values.agreementAccepted) errors.agreement = "Read the agreement and tick the box to accept it.";
    if (!values.listingConsent) errors.listing = "Tick the box to agree to be listed. Without it LAGDA cannot show your name to clients.";
  }
  return errors;
}

/** The first step with something missing, or null when every step is complete. */
export function firstIncompleteStep(values: FormValues, files: readonly ApplicationFile[], today: string): ApplyStep | null {
  for (const step of APPLY_STEPS) {
    if (step.id === "review") continue;
    if (Object.keys(validateStep(step.id, values, files, today)).length > 0) return step.id;
  }
  return null;
}

/** Local date as YYYY-MM-DD, for comparing with date inputs. */
export function todayIso(now: Date = new Date()): string {
  return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Why a file cannot be added, before it is sent. Null: send it. */
export function fileProblem(file: { name: string; size: number; type: string }, kind: ApplicationFileKind): string | null {
  void kind;
  if (!FILE_MEDIA_TYPES.includes(file.type)) return `${file.name} is not a PDF, JPEG or PNG file.`;
  if (file.size > FILE_MAX_BYTES) return `${file.name} is larger than 10 MB.`;
  if (file.size === 0) return `${file.name} is empty.`;
  return null;
}

export function fileSizeLabel(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${String(Math.max(1, Math.round(bytes / 1024)))} KB`;
}

export const SCAN_WORDS = {
  pending: "Checking for viruses…",
  clean: "Checked",
  infected: "Rejected: a virus was found. Remove it and add a clean copy.",
  failed: "Could not be checked. Remove it and add it again.",
} as const;

const FIELD_BY_NAME = new Map<string, string>(FIELDS.map(field => [field.key.toLowerCase(), field.label]));

/** A name from the server's missing list ("roll_no", "commissionNo", "roll file") in the form's own words. */
export function missingLabel(name: string): string {
  const flat = name.replace(/[_\-\s]/g, "").toLowerCase();
  const field = FIELD_BY_NAME.get(flat);
  if (field !== undefined) return field;
  if (/photo/.test(flat)) return "Your photo";
  if (/commission.*file|commissionfile/.test(flat)) return "Notarial commission document";
  if (/roll.*file|rollfile/.test(flat)) return "Roll of Attorneys document";
  if (/agreement/.test(flat)) return "The agreement";
  if (/listing/.test(flat)) return "Consent to be listed";
  return name;
}

export interface SubmitProblem {
  readonly kind: "incomplete" | "scanning" | "identity" | "other";
  readonly text: string;
  readonly missing: readonly string[];
}

/** What a refused submission says, in plain words. */
export function describeSubmitError(error: unknown): SubmitProblem {
  const code = errorCode(error);
  if (code === "application_incomplete") {
    const missing = missingFromRefusal(error).map(missingLabel);
    return { kind: "incomplete", text: "Some required items are still missing.", missing };
  }
  if (code === "file_scan_pending") {
    return { kind: "scanning", text: "A document is still being checked for viruses. Wait a moment, then submit again.", missing: [] };
  }
  if (code === "identity_required" || code === "notary_identity_required") {
    return { kind: "identity", text: "Verify your identity first. Your application is sent once your account shows as verified.", missing: [] };
  }
  if (error instanceof ApiError && error.status === 0) {
    return { kind: "other", text: "Could not reach the server. Check your connection and try again.", missing: [] };
  }
  if (error instanceof ApiError && error.status === 429) {
    return { kind: "other", text: "Too many tries in a short time. Wait a minute, then try again.", missing: [] };
  }
  return { kind: "other", text: "That could not be done right now. Please try again.", missing: [] };
}

/** Field errors a refused save carries (422 with details), put next to their fields. */
export function fieldErrorsFromRefusal(error: unknown): FieldErrors {
  const out: FieldErrors = {};
  if (!(error instanceof ApiError)) return out;
  for (const detail of error.body?.details ?? []) {
    const key = FIELDS.find(field => field.key === detail.field)?.key;
    if (key !== undefined) out[key] = detail.message !== "" ? detail.message : "This was not accepted.";
  }
  return out;
}

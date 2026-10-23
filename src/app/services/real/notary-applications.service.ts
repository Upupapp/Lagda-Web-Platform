// Notary on-ramp, phase 1: a notary's application (first time) and the
// LAGDA administrators' review of it.
//
// Workspace realm (apiRequest, apiUpload), about the PERSON: `/me/notary/...`
// for the applicant and `/admin/notary-applications` for reviewers. A switched
// off server answers 404 everywhere; `read` and `adminList` answer `null` then.
//
// The server decides everything: who may review (404 for anyone else), when an
// application is complete, and when a file has been scanned. This file only
// carries the questions and answers, and reads the file and missing-field lists
// loosely, since both are lists the server owns.

import { apiRequest, apiUpload } from "../api-client";
import { errorStatus } from "./enotary-invitations.service";
import type { NotaryApplicationStatus } from "./enotary-invitations.service";

export type ApplicationFileKind = "commission" | "roll" | "ibp" | "ptr" | "mcle" | "photo" | "other";
export type ScanState = "pending" | "clean" | "infected" | "failed";

export interface ApplicationFile {
  id: string;
  kind: ApplicationFileKind;
  filename: string;
  mediaType: string;
  sizeBytes: number;
  scanState: ScanState;
}

/** The fields of the form, as the server stores them. All strings so a draft can be partial. */
export interface ApplicationFields {
  office: string;
  /** 127. The office's street address, printed on the notarized document. */
  officeAddress: string;
  city: string;
  province: string;
  phone: string;
  rollNo: string;
  ibpNo: string;
  ibpChapter: string;
  ptrNo: string;
  ptrYear: string;
  /** 127. Where and when (YYYY-MM-DD) the PTR was issued. */
  ptrPlace: string;
  ptrIssuedOn: string;
  mcleComplianceNo: string;
  mclePeriod: string;
  /** 129. When the MCLE compliance was had, and the ULAS compliance and its date (YYYY-MM-DD), which the electronic
   * notarial certificate states (Rule X, Sec. 2(k)). */
  mcleComplianceDate: string;
  ulasComplianceNo: string;
  ulasComplianceDate: string;
  commissionNo: string;
  commissionCourt: string;
  commissionValidFrom: string;
  commissionValidUntil: string;
  notarialJurisdiction: string;
  listingConsent: boolean;
  agreementVersion: string | null;
}

export interface NotaryApplication extends ApplicationFields {
  status: NotaryApplicationStatus;
  /** As on the ID, copied from the verified identity at submission. */
  legalName: string | null;
  directoryId: string | null;
  agreementAcceptedAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export interface ApplicationAgreement { version: string; text: string }

export interface ApplicationView {
  application: NotaryApplication | null;
  files: ApplicationFile[];
  agreement: ApplicationAgreement;
}

/** The dates the server takes beside the text fields, not among them. */
const DATE_KEYS: ReadonlySet<string> = new Set(["commissionValidFrom", "commissionValidUntil", "ptrIssuedOn", "mcleComplianceDate", "ulasComplianceDate"]);

export const EMPTY_FIELDS: ApplicationFields = {
  office: "", officeAddress: "", city: "", province: "", phone: "", rollNo: "", ibpNo: "", ibpChapter: "", ptrNo: "", ptrYear: "",
  ptrPlace: "", ptrIssuedOn: "", mcleComplianceNo: "", mclePeriod: "", mcleComplianceDate: "", ulasComplianceNo: "", ulasComplianceDate: "",
  commissionNo: "", commissionCourt: "", commissionValidFrom: "",
  commissionValidUntil: "", notarialJurisdiction: "", listingConsent: false, agreementVersion: null,
};

export const FILE_KIND_LABEL: Record<ApplicationFileKind, string> = {
  commission: "Notarial commission", roll: "Roll of Attorneys", ibp: "IBP membership", ptr: "PTR",
  mcle: "MCLE compliance", photo: "Your photo", other: "Other",
};
/** Files the server needs before it accepts a submission. */
export const REQUIRED_FILE_KINDS: readonly ApplicationFileKind[] = ["commission", "roll", "photo"];
export const FILE_MAX_BYTES = 10 * 1024 * 1024;
export const FILE_MEDIA_TYPES: readonly string[] = ["application/pdf", "image/jpeg", "image/png"];

export interface AdminApplicationRow {
  userId: string;
  legalName: string | null;
  office: string;
  city: string;
  status: NotaryApplicationStatus;
  submittedAt: string | null;
  commissionValidUntil: string | null;
}

export type NameMatch = "match" | "close" | "mismatch";

export interface AdminApplicationDetail {
  userId: string;
  application: NotaryApplication;
  files: ApplicationFile[];
  /** `profileName` is the name on the account; `nameMatch` compares it with the verified ID's name. */
  account: { verifiedName: string | null; profileName: string | null; nameMatch: NameMatch | null; email: string | null };
  /** The directory entry whose name equals the legal name, if one does, and whether another notary already holds it. */
  candidate: { directoryId: string; name: string; taken: boolean } | null;
  invitations: { id: string; status: string; clientName: string | null; notaryName: string; createdAt: string }[];
}

type Bag = Record<string, unknown>;
const text = (value: unknown): string => (typeof value === "string" ? value : "");
const nullable = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);

/** A file as the server lists it; the id and scan state may come under either spelling. */
export function readFile(raw: unknown): ApplicationFile {
  const bag = (raw ?? {}) as Bag;
  const scan = text(bag.scanState ?? bag.scanStatus ?? bag.scan);
  return {
    id: text(bag.id ?? bag.fileId),
    kind: (text(bag.kind) || "other") as ApplicationFileKind,
    filename: text(bag.filename),
    mediaType: text(bag.mediaType),
    sizeBytes: typeof bag.sizeBytes === "number" ? bag.sizeBytes : 0,
    scanState: scan === "clean" || scan === "infected" || scan === "failed" ? scan : "pending",
  };
}

/** The server keeps the text fields under `fields` and the two dates beside them; this keeps them flat, with "" for nothing. */
function readApplication(raw: unknown): NotaryApplication | null {
  if (raw === null || typeof raw !== "object") return null;
  const bag = raw as Bag;
  const inner = (bag.fields ?? {}) as Bag;
  const fields = { ...EMPTY_FIELDS };
  for (const key of Object.keys(EMPTY_FIELDS) as (keyof ApplicationFields)[]) {
    if (key === "listingConsent") fields.listingConsent = bag.listingConsent === true;
    else if (key === "agreementVersion") fields.agreementVersion = nullable(bag.agreementVersion);
    else (fields as unknown as Bag)[key] = text(inner[key] ?? bag[key]);
  }
  return {
    ...fields,
    status: (text(bag.status) || "draft") as NotaryApplicationStatus,
    legalName: nullable(bag.legalName), directoryId: nullable(bag.directoryId),
    agreementAcceptedAt: nullable(bag.agreementAcceptedAt), submittedAt: nullable(bag.submittedAt),
    reviewedAt: nullable(bag.reviewedAt), reviewNote: nullable(bag.reviewNote),
  };
}

function readView(raw: unknown): ApplicationView {
  const bag = (raw ?? {}) as Bag;
  const agreement = (bag.agreement ?? {}) as Bag;
  // The agreement is a list of paragraphs.
  const paragraphs = Array.isArray(agreement.text) ? agreement.text.filter((item): item is string => typeof item === "string") : [text(agreement.text)];
  return {
    application: readApplication(bag.application),
    files: Array.isArray(bag.files) ? bag.files.map(readFile) : [],
    agreement: { version: text(agreement.version), text: paragraphs.join("\n\n") },
  };
}

/** The names a 409 `application_incomplete` lists: one detail for each missing item. */
export function missingFromRefusal(error: unknown): string[] {
  const body = (error as { body?: Bag }).body;
  if (body === undefined) return [];
  const direct = body.missing;
  if (Array.isArray(direct)) return direct.filter((item): item is string => typeof item === "string");
  const details = body.details;
  if (Array.isArray(details)) {
    return details.map(item => text((item as Bag).field) || text((item as Bag).code) || text((item as Bag).message)).filter(item => item !== "");
  }
  return [];
}

class RealNotaryApplicationsService {
  /** The applicant's own application. `null`: applications are not offered. */
  async read(): Promise<ApplicationView | null> {
    try {
      return readView(await apiRequest<unknown>("/me/notary/application"));
    } catch (error) {
      if (errorStatus(error) === 404) return null;
      throw error;
    }
  }

  /**
   * Saves what the form holds. The server wants the text fields together under
   * `fields`, the two dates beside them, and the agreement as "accept it now";
   * an empty box is saved as nothing.
   */
  async save(patch: Partial<ApplicationFields>): Promise<ApplicationView> {
    const fields: Record<string, string | null> = {};
    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (key === "listingConsent") body.listingConsent = value === true;
      else if (key === "agreementVersion") { if (typeof value === "string" && value !== "") body.acceptAgreement = true; }
      else if (DATE_KEYS.has(key)) body[key] = typeof value === "string" && value !== "" ? value : null;
      else fields[key] = typeof value === "string" && value !== "" ? value : null;
    }
    if (Object.keys(fields).length > 0) body.fields = fields;
    return readView(await apiRequest<unknown>("/me/notary/application", { method: "PUT", body }));
  }

  /** 409 `application_incomplete` (with the missing list) | `file_scan_pending`. */
  async submit(): Promise<ApplicationView> {
    return readView(await apiRequest<unknown>("/me/notary/application/submit", { method: "POST", body: {} }));
  }

  async withdraw(): Promise<ApplicationView> {
    return readView(await apiRequest<unknown>("/me/notary/application/withdraw", { method: "POST", body: {} }));
  }

  async upload(kind: ApplicationFileKind, file: File): Promise<ApplicationFile> {
    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);
    const answer = await apiUpload<unknown>("/me/notary/application/files", form);
    const bag = (answer ?? {}) as Bag;
    return readFile(bag.file ?? answer);
  }

  async removeFile(id: string): Promise<void> {
    await apiRequest<unknown>(`/me/notary/application/files/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  /** Where the owner (or a reviewer) opens a file: streamed through the API, never a public address. */
  fileUrl(id: string): string {
    return `/me/notary/application/files/${encodeURIComponent(id)}`;
  }

  /** Reviewers only. `null` for anyone else (the server answers 404). */
  async adminList(status?: string): Promise<AdminApplicationRow[] | null> {
    try {
      const query = status !== undefined && status !== "" ? `?status=${encodeURIComponent(status)}` : "";
      const answer = await apiRequest<{ applications: Bag[] }>(`/admin/notary-applications${query}`);
      return (answer.applications ?? []).map(row => ({
        userId: text(row.userId), legalName: nullable(row.legalName), office: text(row.office), city: text(row.city),
        status: (text(row.status) || "submitted") as NotaryApplicationStatus,
        submittedAt: nullable(row.submittedAt), commissionValidUntil: nullable(row.commissionValidUntil),
      }));
    } catch (error) {
      if (errorStatus(error) === 404) return null;
      throw error;
    }
  }

  async adminGet(userId: string): Promise<AdminApplicationDetail | null> {
    try {
      const raw = await apiRequest<Bag>(`/admin/notary-applications/${encodeURIComponent(userId)}`);
      const account = (raw.account ?? {}) as Bag;
      const comparison = (raw.nameComparison ?? {}) as Bag;
      const match = text(account.nameMatch ?? comparison.withProfileName);
      const application = readApplication(raw.application ?? raw);
      if (application === null) return null;
      return {
        userId,
        application,
        files: Array.isArray(raw.files) ? raw.files.map(readFile) : [],
        account: {
          verifiedName: nullable(account.verifiedName), email: nullable(account.email), profileName: nullable(account.displayName),
          nameMatch: match === "match" || match === "close" || match === "mismatch" ? match : null,
        },
        candidate: nullable(comparison.candidateDirectoryId) === null ? null : {
          directoryId: text(comparison.candidateDirectoryId), name: text(comparison.candidateName), taken: comparison.candidateTaken === true,
        },
        invitations: Array.isArray(raw.invitations)
          ? (raw.invitations as Bag[]).map(item => ({
            id: text(item.id), status: text(item.status), clientName: nullable(item.clientName), notaryName: text(item.notaryName), createdAt: text(item.createdAt),
          }))
          : [],
      };
    } catch (error) {
      if (errorStatus(error) === 404) return null;
      throw error;
    }
  }

  adminFileUrl(userId: string, fileId: string): string {
    return `/admin/notary-applications/${encodeURIComponent(userId)}/files/${encodeURIComponent(fileId)}`;
  }

  async approve(userId: string, input: { directoryId?: string; note?: string }): Promise<void> {
    const body: { directoryId?: string; note?: string } = {};
    if (input.directoryId !== undefined && input.directoryId !== "") body.directoryId = input.directoryId;
    if (input.note !== undefined && input.note.trim() !== "") body.note = input.note.trim();
    await apiRequest<unknown>(`/admin/notary-applications/${encodeURIComponent(userId)}/approve`, { method: "POST", body });
  }

  async reject(userId: string, reason: string): Promise<void> {
    await apiRequest<unknown>(`/admin/notary-applications/${encodeURIComponent(userId)}/reject`, {
      method: "POST", body: { reason: reason.trim().slice(0, 400) },
    });
  }
}

export const realNotaryApplicationsService = new RealNotaryApplicationsService();

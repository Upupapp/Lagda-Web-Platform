// Real document service — talks to Lagda-Backend's workspace-scoped
// document + upload routes. Bounded to exactly this phase's needs: create a
// document, upload its bytes. No listing/detail/folders/tags — those belong
// to the later Documents-domain integration.
//
// Every call takes workspaceId explicitly rather than reading it itself —
// the CALLER must pass PlatformContext.currentWorkspace.id (the one
// canonical, backend-verified active workspace). This service never reads
// localStorage or any other workspace source (see PlatformContext's P1
// authority boundary).

import { apiRequest, apiUpload, ApiError } from "../api-client";

/**
 * The document's accepted bytes, or null before any upload has landed.
 *
 * `mediaType` is SERVER-DETECTED by content sniffing during the upload
 * pipeline — never the type the browser claimed — so it is the only
 * trustworthy answer to "what kind of file is this".
 */
export interface RealDocumentSource {
  mediaType: string;
  sizeBytes: number;
  pageCount: number | null;
  uploadedAt: string;
}

export interface RealDocument {
  documentId: string;
  title: string;
  originalFilename: string | null;
  createdByUserId: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
  source: RealDocumentSource | null;
  /** The Verification ID of the latest sealed completion, or null. */
  verificationId?: string | null;
  /**
   * On a create or a rename: the server saved a different title than the one
   * asked for, because that one was already used in the workspace (it adds
   * " (2)", " (3)"…). `title` is always the one saved. Absent from an older
   * server, which means false.
   */
  titleAdjusted?: boolean;
}

/** What a title would be saved as. `changed`: not as it was typed. */
export interface TitleSuggestion {
  requested: string;
  title: string;
  changed: boolean;
}

export interface RealDocumentListResult {
  items: RealDocument[];
  total: number;
  page: number;
  perPage: number;
  hasNextPage: boolean;
}

export interface RealUploadResult {
  uploadId: string;
  artifactId: string;
  byteSize: number;
  mediaType: string;
  pageCount: number;
  pageSizes: unknown;
  originalFilename: string | null;
  digest: string;
}

export interface UploadCapacityStatus {
  available: boolean;
  message?: string;
}

class RealDocumentService {
  // POST /workspaces/{workspaceId}/documents — creates the document record.
  // Must succeed (and its id be kept) BEFORE any upload attempt: the upload
  // route is addressed by documentId, and this is the one call that mints
  // one. Callers must persist the returned id immediately so a retry never
  // creates a second document for the same intended file (see
  // UploadStep.tsx's uploadFile()).
  // GET /workspaces/{workspaceId}/documents — the workspace's documents,
  // each with its server-detected `source.mediaType`. The signing-request
  // list the Documents page is built on deliberately carries no file-type
  // information (it is a workflow row, not a file row), so this is where a
  // type-accurate icon has to come from.
  async list(workspaceId: string, params?: { page?: number; perPage?: number }): Promise<RealDocumentListResult> {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set("page", String(params.page));
    if (params?.perPage !== undefined) query.set("perPage", String(params.perPage));
    const qs = query.toString();
    return apiRequest<RealDocumentListResult>(
      `/workspaces/${encodeURIComponent(workspaceId)}/documents${qs ? `?${qs}` : ""}`,
    );
  }

  /**
   * One document, by id.
   *
   * The list endpoint is paged at 100, so finding a document by scanning it
   * works until a workspace has more than that and then quietly stops. This
   * asks for the one that is wanted.
   */
  async get(workspaceId: string, documentId: string): Promise<RealDocument> {
    return apiRequest<RealDocument>(
      `/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(documentId)}`,
    );
  }

  /** The title the sender typed on Prepare. Until this, it was never sent. */
  async rename(workspaceId: string, documentId: string, title: string): Promise<RealDocument> {
    return apiRequest<RealDocument>(
      `/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(documentId)}`,
      { method: "PATCH", body: { title } },
    );
  }

  /**
   * What `title` would be saved as in this workspace, before anything is
   * saved. `excludeDocumentId` leaves that document's own title out of the
   * comparison, for a document that is being renamed.
   *
   * `null` when there is nothing to say: an older server without the route
   * (404), or a title the server would refuse (422).
   */
  async titleSuggestion(
    workspaceId: string, title: string, excludeDocumentId?: string,
  ): Promise<TitleSuggestion | null> {
    const query = new URLSearchParams({ title });
    if (excludeDocumentId !== undefined) query.set("excludeDocumentId", excludeDocumentId);
    try {
      const result = await apiRequest<Partial<TitleSuggestion>>(
        `/workspaces/${encodeURIComponent(workspaceId)}/documents/title-suggestion?${query.toString()}`,
      );
      if (typeof result.title !== "string" || result.title === "") return null;
      return { requested: result.requested ?? title, title: result.title, changed: result.changed === true };
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 422)) return null;
      throw error;
    }
  }

  async create(workspaceId: string, title: string): Promise<RealDocument> {
    return apiRequest<RealDocument>(`/workspaces/${encodeURIComponent(workspaceId)}/documents`, {
      method: "POST",
      body: { title },
    });
  }

  // POST /workspaces/{workspaceId}/documents/{documentId}/upload — the
  // actual bytes. One multipart file part; field name doesn't matter to the
  // backend (it scans every part for the first one of type "file").
  async upload(workspaceId: string, documentId: string, file: File): Promise<RealUploadResult> {
    const formData = new FormData();
    formData.append("file", file, file.name);
    return apiUpload<RealUploadResult>(
      `/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(documentId)}/upload`,
      formData,
    );
  }

  // GET /upload-capacity — proactive check, so the UI can disable the upload
  // affordance BEFORE a user picks a file rather than only ever finding out
  // from a failed POST. Not workspace-scoped on the backend (capacity is a
  // fact about the deployment, not a tenant), so no workspaceId here either.
  // The actual upload call is still the real gate — see UploadStep.tsx's own
  // catch block, which already surfaces the backend's exact message on a
  // real rejection regardless of what this check reported a moment earlier.
  async checkUploadCapacity(): Promise<UploadCapacityStatus> {
    return apiRequest<UploadCapacityStatus>("/upload-capacity");
  }
}

export const realDocumentService = new RealDocumentService();

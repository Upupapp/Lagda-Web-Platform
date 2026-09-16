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

import { apiRequest, apiUpload } from "../api-client";

export interface RealDocument {
  documentId: string;
  title: string;
  originalFilename: string | null;
  createdByUserId: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
  source: unknown;
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

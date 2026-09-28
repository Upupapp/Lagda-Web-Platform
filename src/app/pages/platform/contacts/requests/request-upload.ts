// Uploading a file in answer to a contact request (086): the ordinary
// create-then-upload path, addressed to the REQUEST's workspace.

import { buildSteps } from "../../../../services/processing.service";
import { realDocumentService } from "../../../../services/real/document.service";
import { contactRequestErrorMessage } from "../../../../services/real/contact-request.service";
import { ApiError } from "../../../../services/api-client";

export const ACCEPT = ".pdf,.doc,.docx,.png,.jpg,.jpeg";

export const UPLOAD_STAGES = [
  { id: "transfer", label: "Transferring your file" },
  { id: "process", label: "Securing and preparing it" },
  { id: "answer", label: "Completing the request" },
];

/** The ordinary create-then-upload path, into the request's workspace. */
export async function uploadIntoWorkspace(
  workspaceId: string, file: File,
  update: (steps: ReturnType<typeof buildSteps>) => void,
): Promise<string> {
  // A failed capacity probe is not a refusal; the upload itself is the gate.
  const capacity = await realDocumentService.checkUploadCapacity().catch((): { available: boolean; message?: string } => ({ available: true }));
  if (!capacity.available) throw new Error(capacity.message ?? "Uploads are temporarily unavailable.");
  const created = await realDocumentService.create(workspaceId, file.name);
  update(buildSteps(UPLOAD_STAGES, "process"));
  await realDocumentService.upload(workspaceId, created.documentId, file);
  update(buildSteps(UPLOAD_STAGES, "answer"));
  return created.documentId;
}

export function uploadError(err: unknown): string {
  // The capacity refusal, and the upload route's own file refusals (too
  // large, unsupported type), already say exactly what is wrong.
  if (err instanceof ApiError) {
    if ((err.status === 413 || err.status === 415) && err.message !== "") return err.message;
    return contactRequestErrorMessage(err, "complete");
  }
  if (err instanceof Error && err.message !== "") return err.message;
  return contactRequestErrorMessage(err, "complete");
}

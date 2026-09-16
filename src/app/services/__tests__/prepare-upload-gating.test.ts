// B1 fix — Continue must not advance past a file whose REAL upload hasn't
// actually succeeded, even though the file's client-side fileState is
// already "ready" (fileState is set at selection time, before any network
// call). Regression test for: validateDraftState() ignoring PrepFile.uploadStatus
// entirely, which let the Prepare wizard's "Continue" navigate past an
// in-flight or failed upload with zero validation errors.

import { describe, it, expect } from "vitest";
import { validateDraftState } from "../mock/prepare.service";
import { DRAFT_SINGLE_SIGNER } from "../../data/mock/prepare";
import type { PreparationDraft } from "../../models/prepare";

function withFileUploadStatus(
  draft: PreparationDraft,
  uploadStatus: PreparationDraft["files"][number]["uploadStatus"],
  uploadError?: string,
): PreparationDraft {
  return {
    ...draft,
    files: draft.files.map((f, i) => (i === 0 ? { ...f, uploadStatus, uploadError } : f)),
  };
}

describe("validateDraftState — upload status gating (B1)", () => {
  it("is valid on the baseline fixture (uploadStatus absent = mock mode, not gated)", () => {
    const result = validateDraftState(DRAFT_SINGLE_SIGNER);
    expect(result.errors.filter(e => e.stepId === "upload")).toHaveLength(0);
    expect(result.stepValidity.upload).toBe(true);
  });

  it("blocks the upload step while a file is still uploading", () => {
    const draft = withFileUploadStatus(DRAFT_SINGLE_SIGNER, "uploading");
    const result = validateDraftState(draft);
    expect(result.stepValidity.upload).toBe(false);
    expect(result.errors.some(e => e.stepId === "upload" && e.code === "UPLOAD_IN_PROGRESS")).toBe(true);
  });

  it("blocks the upload step while a file is still processing", () => {
    const draft = withFileUploadStatus(DRAFT_SINGLE_SIGNER, "processing");
    const result = validateDraftState(draft);
    expect(result.stepValidity.upload).toBe(false);
  });

  it("blocks the upload step and surfaces the error when a file's upload failed", () => {
    const draft = withFileUploadStatus(DRAFT_SINGLE_SIGNER, "failed", "Network error");
    const result = validateDraftState(draft);
    expect(result.stepValidity.upload).toBe(false);
    const issue = result.errors.find(e => e.stepId === "upload" && e.code === "UPLOAD_FAILED");
    expect(issue?.message).toContain("Network error");
  });

  it("blocks the upload step when a file needs re-selection", () => {
    const draft = withFileUploadStatus(DRAFT_SINGLE_SIGNER, "needs-reselection");
    const result = validateDraftState(draft);
    expect(result.stepValidity.upload).toBe(false);
  });

  it("does not block once the upload has actually completed", () => {
    const draft = withFileUploadStatus(DRAFT_SINGLE_SIGNER, "uploaded");
    const result = validateDraftState(draft);
    expect(result.errors.filter(e => e.stepId === "upload")).toHaveLength(0);
    expect(result.stepValidity.upload).toBe(true);
  });

  it("a blocked upload step cascades into readyForFieldPlacement being false", () => {
    const draft = withFileUploadStatus(DRAFT_SINGLE_SIGNER, "failed", "Network error");
    const result = validateDraftState(draft);
    expect(result.readyForFieldPlacement).toBe(false);
  });
});

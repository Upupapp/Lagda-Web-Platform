// Step 1 of 7: Documents — file selection and transaction details.
// PRIVACY / SECURITY:
//   • browser File objects are NEVER put into PrepFile/draft state — that
//     stays metadata-only (name, size, type), which IS what's persisted to
//     localStorage as this step's local draft.
//   • when USE_REAL_BACKEND, the actual File is instead held transiently in
//     file-registry.ts (in-memory only, never serialized) and uploaded for
//     real — see uploadFile() below. Mock builds still perform no upload.
// Burgundy (#67023B) is NEVER used here. eNotary is NEVER mentioned.

import React, { useRef, useEffect, useCallback, useState } from "react";
import { FileText } from "lucide-react";
import { usePrepare } from "../../../context/PrepareContext";
import { usePlatform } from "../../../context/PlatformContext";
import type { PrepFile } from "../../../models/prepare";
import { DEFAULT_TRANSACTION_DETAILS } from "../../../models/prepare";
import { classifyFilesWithRefs, humanFileSize, fileStateLabel } from "../../../services/prepare/file-intake";
import { setFileRef, getFileRef, clearFileRef } from "../../../services/prepare/file-registry";
import { realDocumentService } from "../../../services/real/document.service";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import { ApiError } from "../../../services/api-client";
import { StepBanner, StepTwoColumn, RailCard } from "../../../components/prepare/StepBanner";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const GOLD   = "#C9960C";
const humanSize = humanFileSize;

// ── File row ──────────────────────────────────────────────────────────────────

function UploadStatusLine({ file, onRetry, onReselect }: {
  file: PrepFile;
  onRetry: (id: string) => void;
  onReselect: (id: string, files: FileList) => void;
}) {
  const reselectRef = useRef<HTMLInputElement>(null);

  if (!USE_REAL_BACKEND || file.fileState !== "ready") return null;

  switch (file.uploadStatus) {
    case "uploading":
      return <div style={{ ...GF, fontSize: 11.5, color: AZURE, marginTop: 3 }}>Uploading…</div>;
    case "processing":
      // Truthful, generic wording — the backend doesn't expose separate
      // scan-progress stages, so no percentage/stage is fabricated here.
      return <div style={{ ...GF, fontSize: 11.5, color: AZURE, marginTop: 3 }}>Securely processing your document…</div>;
    case "uploaded":
      return <div style={{ ...GF, fontSize: 11.5, color: "#2E7D32", marginTop: 3 }}>✓ Uploaded and verified</div>;
    case "failed":
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
          <span style={{ ...GF, fontSize: 11.5, color: "#C0392B" }}>{file.uploadError ?? "Upload failed."}</span>
          <button
            onClick={() => onRetry(file.id)}
            style={{ ...GF, fontSize: 11.5, color: AZURE, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
          >
            Retry
          </button>
        </div>
      );
    case "needs-reselection":
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
          <span style={{ ...GF, fontSize: 11.5, color: GOLD }}>
            We restored your document setup. Please re-select "{file.fileName}" to continue.
          </span>
          <button
            onClick={() => reselectRef.current?.click()}
            style={{ ...GF, fontSize: 11.5, color: AZURE, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", flexShrink: 0 }}
          >
            Select file
          </button>
          <input
            ref={reselectRef}
            type="file"
            accept=".pdf,.doc,.docx"
            aria-label={`Re-select file for "${file.fileName}"`}
            style={{ display: "none" }}
            onChange={(e) => { if (e.target.files) onReselect(file.id, e.target.files); e.target.value = ""; }}
          />
        </div>
      );
    default:
      return null;
  }
}

function FileRow({
  file,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
  onRetryUpload,
  onReselect,
}: {
  file: PrepFile;
  index: number;
  total: number;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRemove: (id: string) => void;
  onRetryUpload: (id: string) => void;
  onReselect: (id: string, files: FileList) => void;
}) {
  const { text: stateText, color: stateColor } = fileStateLabel(file.fileState);
  const isError = file.fileState === "unsupported-type" || file.fileState === "empty-file" || file.fileState === "unavailable";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 10,
        border: `1px solid ${isError ? "#F0D07A" : "#E3E8EF"}`,
        background: isError ? "#FEF9EC" : "#FAFBFC",
      }}
    >
      {/* Order handle */}
      <span
        aria-hidden="true"
        style={{ fontSize: 11, fontWeight: 700, color: SILVER, minWidth: 18, textAlign: "center" }}
      >
        {index + 1}
      </span>

      {/* File icon */}
      <span aria-hidden="true" style={{ fontSize: 18, flexShrink: 0 }}>
        {file.mimeType === "application/pdf" ? "📄" : "📝"}
      </span>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            ...GF,
            fontSize: 14,
            fontWeight: 600,
            color: NAVY,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {file.fileName}
        </div>
        <div style={{ ...GF, fontSize: 12, color: stateColor, marginTop: 2 }}>
          {stateText} · {humanSize(file.fileSizeBytes)}
          {file.demoPageCount !== undefined && ` · ~${file.demoPageCount} pages`}
        </div>
        <UploadStatusLine file={file} onRetry={onRetryUpload} onReselect={onReselect} />
      </div>

      {/* Reorder */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button
          onClick={() => onMoveUp(file.id)}
          disabled={index === 0}
          aria-label={`Move "${file.fileName}" up`}
          style={{
            ...GF,
            width: 28,
            height: 28,
            border: `1px solid #D1D9E0`,
            borderRadius: 6,
            background: index === 0 ? "#F5F7FA" : "#FFFFFF",
            color: index === 0 ? "#D1D9E0" : NAVY,
            cursor: index === 0 ? "not-allowed" : "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ↑
        </button>
        <button
          onClick={() => onMoveDown(file.id)}
          disabled={index === total - 1}
          aria-label={`Move "${file.fileName}" down`}
          style={{
            ...GF,
            width: 28,
            height: 28,
            border: `1px solid #D1D9E0`,
            borderRadius: 6,
            background: index === total - 1 ? "#F5F7FA" : "#FFFFFF",
            color: index === total - 1 ? "#D1D9E0" : NAVY,
            cursor: index === total - 1 ? "not-allowed" : "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ↓
        </button>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(file.id)}
        aria-label={`Remove "${file.fileName}"`}
        style={{
          ...GF,
          width: 28,
          height: 28,
          border: "none",
          borderRadius: 6,
          background: "transparent",
          color: GOLD,
          cursor: "pointer",
          fontSize: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ── Drop zone ─────────────────────────────────────────────────────────────────

function DropZone({
  onFilesSelected,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  disabled = false,
}: {
  onFilesSelected: (files: FileList) => void;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={disabled ? undefined : onDragOver}
      onDragLeave={disabled ? undefined : onDragLeave}
      onDrop={disabled ? undefined : onDrop}
      onClick={disabled ? undefined : () => inputRef.current?.click()}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={disabled
        ? "Uploads are currently unavailable. See the notice above."
        : "Select files to add. Accepts PDF, DOC, or DOCX files."}
      onKeyDown={disabled ? undefined : e => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
      style={{
        border: `2px dashed ${isDragOver && !disabled ? AZURE : "#C8D3DC"}`,
        borderRadius: 12,
        padding: "40px 24px",
        textAlign: "center",
        background: disabled ? "#F1F3F5" : isDragOver ? "#F0F7FF" : "#FAFBFC",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.15s ease",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        multiple
        disabled={disabled}
        aria-label="File input"
        style={{ display: "none" }}
        onChange={e => e.target.files && onFilesSelected(e.target.files)}
      />
      <div aria-hidden="true" style={{ fontSize: 32, marginBottom: 12 }}>
        {disabled ? "🚫" : "📂"}
      </div>
      <div style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 6 }}>
        {disabled ? "Uploads temporarily unavailable" : "Drop files here, or click to select"}
      </div>
      <div style={{ ...GF, fontSize: 13, color: SILVER }}>
        PDF, DOC, or DOCX · Up to 20 MB per file (demonstration limit) · Up to 10 files
      </div>
    </div>
  );
}

// ── Folder + tag selector (lightweight, no real backend) ──────────────────────

// Lightweight fixture: these match workspace IDs used in documents.ts
const FOLDERS = [
  { id: "folder_active",    name: "Active Transactions" },
  { id: "folder_contracts", name: "Contracts" },
  { id: "folder_hr",        name: "HR Documents" },
  { id: "folder_legal",     name: "Legal" },
  { id: "folder_archive",   name: "Archive" },
];
const TAGS = [
  { id: "tag_urgent",       name: "Urgent" },
  { id: "tag_nda",          name: "NDA" },
  { id: "tag_contract",     name: "Contract" },
  { id: "tag_hr",           name: "HR" },
  { id: "tag_compliance",   name: "Compliance" },
  { id: "tag_reviewed",     name: "Reviewed" },
];

function FolderTagSelector({
  selectedFolderId,
  selectedTagIds,
  onFolderChange,
  onTagsChange,
}: {
  selectedFolderId: string | null;
  selectedTagIds:   string[];
  onFolderChange:   (id: string | null) => void;
  onTagsChange:     (ids: string[]) => void;
}) {
  const toggleTag = (id: string) => {
    if (selectedTagIds.includes(id)) {
      onTagsChange(selectedTagIds.filter(t => t !== id));
    } else {
      onTagsChange([...selectedTagIds, id]);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Folder */}
      <div>
        <label
          htmlFor="prep-folder"
          style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY, display: "block", marginBottom: 6 }}
        >
          Folder <span style={{ color: SILVER, fontWeight: 400 }}>(optional)</span>
        </label>
        <select
          id="prep-folder"
          value={selectedFolderId ?? ""}
          onChange={e => onFolderChange(e.target.value || null)}
          style={{
            ...GF,
            width: "100%",
            padding: "9px 12px",
            borderRadius: 8,
            border: "1px solid #D1D9E0",
            background: "#FFFFFF",
            color: NAVY,
            fontSize: 14,
          }}
        >
          <option value="">No folder</option>
          {FOLDERS.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 8 }}>
          Tags <span style={{ color: SILVER, fontWeight: 400 }}>(optional)</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {TAGS.map(t => {
            const active = selectedTagIds.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggleTag(t.id)}
                aria-pressed={active}
                style={{
                  ...GF,
                  padding: "5px 12px",
                  borderRadius: 20,
                  border: `1px solid ${active ? AZURE : "#D1D9E0"}`,
                  background: active ? "#EBF4FC" : "#FFFFFF",
                  color: active ? AZURE : NAVY,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Upload step ───────────────────────────────────────────────────────────────

export function UploadStep() {
  const {
    draft,
    updateFiles,
    updateDetails,
    setStep,
    validate,
  } = usePrepare();
  const { currentWorkspace } = usePlatform();

  const [isDragOver, setIsDragOver] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  // Which file's re-selection input just received a file that didn't match
  // the expected metadata — holds both candidates until the visitor picks
  // one (see ReselectMismatch below).
  const [mismatch, setMismatch] = useState<{ prepFileId: string; candidate: File } | null>(null);
  // Proactive: checked once on mount so the drop zone can be disabled BEFORE
  // a visitor picks a file, rather than only ever finding out from a failed
  // upload. `null` while unchecked (or on a mock build) — never treated as
  // "unavailable", so a check that hasn't resolved yet never blocks the UI.
  const [capacity, setCapacity] = useState<{ available: boolean; message?: string } | null>(null);

  useEffect(() => {
    setStep("upload");
    return () => {};
  }, [setStep]);

  // Deep-link from the Prepare Help panel: ?highlightField=title focuses and
  // scrolls to the title input so a "title is missing" item is actionable,
  // not just informative. Runs once per mount.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("highlightField") !== "title") return;
    const timer = window.setTimeout(() => {
      const el = document.getElementById("prep-title");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLInputElement | null)?.focus();
    }, 50);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!USE_REAL_BACKEND) return;
    let cancelled = false;
    void realDocumentService.checkUploadCapacity()
      .then(status => { if (!cancelled) setCapacity(status); })
      // A failed check is not itself a reason to block uploads — the real
      // upload call is still the authoritative gate, and its own error
      // surfaces normally if storage genuinely has no room.
      .catch(() => { if (!cancelled) setCapacity(null); });
    return () => { cancelled = true; };
  }, []);

  const files      = draft?.files ?? [];
  const details    = draft?.details ?? DEFAULT_TRANSACTION_DETAILS;
  const validation = draft ? validate() : null;

  // Kept in sync with `files` so uploadFile()'s multi-step async patches
  // (uploading → processing → uploaded/failed) always build on the latest
  // known state rather than the stale closure from when the upload started —
  // `files` itself only updates on the next render.
  const filesRef = useRef(files);
  useEffect(() => { filesRef.current = files; }, [files]);

  const patchFile = useCallback((id: string, patch: Partial<PrepFile>) => {
    const next = filesRef.current.map(f => f.id === id ? { ...f, ...patch } : f);
    filesRef.current = next;
    updateFiles(next);
  }, [updateFiles]);

  // Real backend document creation + upload for one file. Safe to call
  // repeatedly for the same file (retry, or re-running after a refresh
  // restored the draft) — it never re-creates a document once
  // backendDocumentId is set, and never re-uploads once uploadStatus is
  // "uploaded" or already in flight.
  const uploadFile = useCallback(async (prepFileId: string) => {
    if (!USE_REAL_BACKEND) return;
    const pf = filesRef.current.find(f => f.id === prepFileId);
    if (!pf || pf.fileState !== "ready") return;
    if (pf.uploadStatus === "uploaded" || pf.uploadStatus === "uploading" || pf.uploadStatus === "processing") return;
    if (!currentWorkspace) return; // PlatformLayout's gate should prevent this; defensive only.

    const rawFile = getFileRef(pf.id);
    if (!rawFile) {
      patchFile(pf.id, { uploadStatus: "needs-reselection", uploadError: undefined });
      return;
    }

    patchFile(pf.id, { uploadStatus: "uploading", uploadError: undefined });
    try {
      // Only created once per file, ever — backendDocumentId is persisted
      // (via patchFile → updateFiles → the existing Prepare-draft
      // LOCAL_PERSISTENCE write-through) the instant creation succeeds, so a
      // retry after a failed upload — or resuming after a refresh with the
      // File still in memory — reuses the same real document instead of
      // minting a second one.
      let documentId = filesRef.current.find(f => f.id === pf.id)?.backendDocumentId;
      if (!documentId) {
        const created = await realDocumentService.create(currentWorkspace.id, pf.fileName);
        documentId = created.documentId;
        patchFile(pf.id, { backendDocumentId: documentId });
      }
      patchFile(pf.id, { uploadStatus: "processing" });
      const result = await realDocumentService.upload(currentWorkspace.id, documentId, rawFile);
      patchFile(pf.id, {
        uploadStatus: "uploaded",
        backendArtifactId: result.artifactId,
        backendDigest: result.digest,
      });
      // The backend now holds the bytes — no reason to keep them in memory.
      clearFileRef(pf.id);
    } catch (err) {
      patchFile(pf.id, {
        uploadStatus: "failed",
        uploadError: err instanceof ApiError
          ? err.message
          : "Something went wrong uploading this file. Please try again.",
      });
    }
  }, [currentWorkspace, patchFile]);

  // Covers files that arrived via resume (PrepareEntryPage's claimPending →
  // createDraft({initialFiles: ...})) rather than through addFiles() in
  // THIS component instance — e.g. the pre-auth continuation flow. Each
  // "ready" file with no uploadStatus yet gets one attempt: uploadFile()
  // itself decides whether that means a real upload (the registry survived,
  // "Case A") or "needs-reselection" (it didn't, "Case B") — this effect
  // only has to ask.
  useEffect(() => {
    if (!USE_REAL_BACKEND) return;
    for (const f of files) {
      if (f.fileState === "ready" && f.uploadStatus === undefined) void uploadFile(f.id);
    }
    // Runs once per distinct file-id set landing in this draft, not on every
    // patch uploadFile() itself makes to those same files.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.map(f => f.id).join(",")]);

  // ── File operations ─────────────────────────────────────────────────────────

  const addFiles = useCallback((fileList: FileList) => {
    const classified = classifyFilesWithRefs(Array.from(fileList), files);
    if (classified.length === 0) return;
    for (const { prepFile, file } of classified) {
      if (prepFile.fileState === "ready") setFileRef(prepFile.id, file);
    }
    const newEntries = classified.map(c => c.prepFile);
    updateFiles([...files, ...newEntries]);
    filesRef.current = [...files, ...newEntries];
    for (const entry of newEntries) {
      if (entry.fileState === "ready") void uploadFile(entry.id);
    }
  }, [files, updateFiles, uploadFile]);

  const handleReselect = useCallback((prepFileId: string, fileList: FileList) => {
    const file = fileList[0];
    if (!file) return;
    const pf = filesRef.current.find(f => f.id === prepFileId);
    if (!pf) return;
    const matches = file.name === pf.fileName && file.size === pf.fileSizeBytes;
    if (!matches) {
      setMismatch({ prepFileId, candidate: file });
      return;
    }
    setFileRef(prepFileId, file);
    patchFile(prepFileId, { uploadStatus: undefined });
    void uploadFile(prepFileId);
  }, [patchFile, uploadFile]);

  const confirmMismatch = useCallback((useCandidate: boolean) => {
    if (!mismatch) return;
    if (useCandidate) {
      const { prepFileId, candidate } = mismatch;
      setFileRef(prepFileId, candidate);
      patchFile(prepFileId, {
        fileName: candidate.name,
        fileSizeBytes: candidate.size,
        mimeType: candidate.type || "application/octet-stream",
        uploadStatus: undefined,
      });
      void uploadFile(prepFileId);
    }
    setMismatch(null);
  }, [mismatch, patchFile, uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleMoveUp = useCallback((id: string) => {
    const idx = files.findIndex(f => f.id === id);
    if (idx <= 0) return;
    const next = [...files];
    [next[idx - 1], next[idx]] = [next[idx]!, next[idx - 1]!];
    updateFiles(next.map((f, i) => ({ ...f, order: i })));
  }, [files, updateFiles]);

  const handleMoveDown = useCallback((id: string) => {
    const idx = files.findIndex(f => f.id === id);
    if (idx < 0 || idx >= files.length - 1) return;
    const next = [...files];
    [next[idx], next[idx + 1]] = [next[idx + 1]!, next[idx]!];
    updateFiles(next.map((f, i) => ({ ...f, order: i })));
  }, [files, updateFiles]);

  const handleRemove = useCallback((id: string) => {
    clearFileRef(id); // drop any retained File — nothing left in this draft to upload it for
    updateFiles(files.filter(f => f.id !== id).map((f, i) => ({ ...f, order: i })));
  }, [files, updateFiles]);

  // ── Details ─────────────────────────────────────────────────────────────────

  const handleTitleChange = useCallback((value: string) => {
    updateDetails({ ...details, title: value });
    if (!value.trim()) {
      setTitleError("A transaction title is required.");
    } else if (value.length > 200) {
      setTitleError("Title must be 200 characters or fewer.");
    } else {
      setTitleError(null);
    }
  }, [details, updateDetails]);

  const fileErrors = validation?.errors.filter(e => e.stepId === "upload") ?? [];
  const atLimit  = files.length >= 10;
  const readyCount = files.filter(f => f.fileState === "ready").length;
  const totalBytes = files.reduce((sum, f) => sum + f.fileSizeBytes, 0);
  const folderName = FOLDERS.find(f => f.id === details.folderId)?.name ?? null;
  const uploadsDisabled = capacity?.available === false;

  const main = (
    <div style={{ ...GF, width: "100%" }}>
      {/* Storage-capacity notice — only ever shown for a real, checked
          "unavailable" answer, never for an unchecked or mock state. */}
      {uploadsDisabled && (
        <div
          role="alert"
          style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10,
            padding: "12px 16px", marginBottom: 16,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 18, lineHeight: "20px" }}>⚠️</span>
          <div>
            <div style={{ ...GF, fontSize: 13.5, fontWeight: 700, color: "#991B1B" }}>
              Document storage is currently full
            </div>
            <div style={{ ...GF, fontSize: 13, color: "#7F1D1D", marginTop: 2 }}>
              {capacity?.message
                ?? "Uploads are temporarily disabled until additional capacity is added. "
                  + "Please try again later."}
            </div>
          </div>
        </div>
      )}

      {/* Drop zone */}
      {!atLimit && (
        <div style={{ marginBottom: 20 }}>
          <DropZone
            onFilesSelected={addFiles}
            isDragOver={isDragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            disabled={uploadsDisabled}
          />
        </div>
      )}

      {atLimit && (
        <div
          style={{
            ...GF,
            padding: "10px 14px",
            borderRadius: 8,
            background: "#FEF9EC",
            border: "1px solid #F0D07A",
            fontSize: 13,
            color: GOLD,
            marginBottom: 20,
          }}
        >
          Maximum of 10 files per transaction reached.
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
          {files.map((f, idx) => (
            <FileRow
              key={f.id}
              file={f}
              index={idx}
              total={files.length}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onRemove={handleRemove}
              onRetryUpload={uploadFile}
              onReselect={handleReselect}
            />
          ))}
        </div>
      )}

      {/* A re-selected file that doesn't match the expected one — offer a
          clear corrective path rather than silently substituting it. */}
      {mismatch && (
        <div
          role="alertdialog"
          aria-label="Selected file does not match"
          style={{
            ...GF, marginBottom: 20, padding: "14px 16px", borderRadius: 10,
            background: "#FEF9EC", border: "1px solid #F0D07A",
          }}
        >
          <p style={{ fontSize: 13, color: "#8A6A16", margin: "0 0 10px", lineHeight: 1.6 }}>
            "{mismatch.candidate.name}" ({humanSize(mismatch.candidate.size)}) doesn't match the
            document we expected. Use it anyway, or keep looking for the original file?
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => confirmMismatch(true)}
              style={{ ...GF, fontSize: 12.5, fontWeight: 600, color: "white", background: AZURE, border: "none", borderRadius: 6, padding: "7px 14px", cursor: "pointer" }}
            >
              Use this file
            </button>
            <button
              onClick={() => confirmMismatch(false)}
              style={{ ...GF, fontSize: 12.5, fontWeight: 600, color: NAVY, background: "#FFFFFF", border: "1px solid #D1D9E0", borderRadius: 6, padding: "7px 14px", cursor: "pointer" }}
            >
              Keep looking
            </button>
          </div>
        </div>
      )}

      {/* Validation errors from service */}
      {fileErrors.length > 0 && (
        <ul
          aria-live="polite"
          style={{
            ...GF,
            listStyle: "none",
            margin: "0 0 20px",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #F0D07A",
            background: "#FEF9EC",
            fontSize: 13,
            color: "#8A6A16",
          }}
        >
          {fileErrors.map(e => <li key={e.id}>• {e.message}</li>)}
        </ul>
      )}

      {/* Transaction title */}
      <div style={{ marginBottom: 24 }}>
        <label
          htmlFor="prep-title"
          style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY, display: "block", marginBottom: 6 }}
        >
          Transaction title <span style={{ color: GOLD }}>*</span>
        </label>
        <input
          id="prep-title"
          type="text"
          value={details.title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="e.g. Employment Agreement — Maria Santos"
          maxLength={200}
          aria-invalid={!!titleError}
          aria-describedby={titleError ? "prep-title-error" : undefined}
          style={{
            ...GF,
            width: "100%",
            padding: "9px 12px",
            borderRadius: 8,
            border: `1px solid ${titleError ? "#F0D07A" : "#D1D9E0"}`,
            background: "#FFFFFF",
            color: NAVY,
            fontSize: 14,
            boxSizing: "border-box",
          }}
        />
        {titleError && (
          <div id="prep-title-error" role="alert" style={{ ...GF, fontSize: 12, color: GOLD, marginTop: 4 }}>
            {titleError}
          </div>
        )}
        <div style={{ ...GF, fontSize: 11, color: SILVER, marginTop: 4 }}>
          {details.title.length}/200 characters
        </div>
      </div>

      {/* Internal description */}
      <div style={{ marginBottom: 28 }}>
        <label
          htmlFor="prep-description"
          style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY, display: "block", marginBottom: 6 }}
        >
          Internal note <span style={{ color: SILVER, fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea
          id="prep-description"
          value={details.description}
          onChange={e => updateDetails({ ...details, description: e.target.value })}
          placeholder="Internal reference note — not visible to participants"
          rows={3}
          maxLength={1000}
          style={{
            ...GF,
            width: "100%",
            padding: "9px 12px",
            borderRadius: 8,
            border: "1px solid #D1D9E0",
            background: "#FFFFFF",
            color: NAVY,
            fontSize: 14,
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
        <div style={{ ...GF, fontSize: 11, color: SILVER, marginTop: 4 }}>
          Not shown to participants
        </div>
      </div>

      {/* Folder + tags */}
      <FolderTagSelector
        selectedFolderId={details.folderId}
        selectedTagIds={details.tagIds}
        onFolderChange={folderId => updateDetails({ ...details, folderId })}
        onTagsChange={tagIds => updateDetails({ ...details, tagIds })}
      />

      {/* Demo notice */}
      <div
        style={{
          ...GF,
          marginTop: 32,
          padding: "14px 16px",
          borderRadius: 8,
          background: "#F5F7FA",
          border: "1px solid #E3E8EF",
          fontSize: 12,
          color: SILVER,
          lineHeight: 1.6,
        }}
      >
        {USE_REAL_BACKEND ? (
          <>
            <strong style={{ color: "#4B5E70" }}>Your document is uploaded securely</strong>
            <br />
            Every file is scanned for malware before it's stored. Participants, routing, and
            other setup below stays local to this browser until you finish preparing the
            transaction.
          </>
        ) : (
          <>
            <strong style={{ color: "#4B5E70" }}>Frontend demonstration</strong>
            <br />
            No files are uploaded, read, or stored. Only the file name, size, and type are
            used to validate your selection. Your documents remain on your device and are
            not transmitted in this demonstration.
          </>
        )}
      </div>
    </div>
  );

  const rail = (
    <>
      <RailCard title="Files added">
        {files.length === 0 ? (
          <p style={{ ...GF, fontSize: 12, color: SILVER, margin: 0 }}>
            No files added yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {files.map(f => {
              const { text, color } = fileStateLabel(f.fileState);
              return (
                <div key={f.id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span
                    style={{
                      ...GF, fontSize: 12, fontWeight: 600, color: NAVY,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
                    }}
                  >
                    {f.fileName}
                  </span>
                  <span style={{ ...GF, fontSize: 11, color, flexShrink: 0, textAlign: "right" }}>
                    {text} · {humanSize(f.fileSizeBytes)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </RailCard>
      <RailCard title="Transaction summary">
        <div style={{ ...GF, fontSize: 12, color: "#4B5E70", display: "flex", flexDirection: "column", gap: 6 }}>
          <div>Total size: <strong style={{ color: NAVY }}>{humanSize(totalBytes)}</strong></div>
          <div>Folder: <strong style={{ color: NAVY }}>{folderName ?? "None"}</strong></div>
          <div>Tags: <strong style={{ color: NAVY }}>{details.tagIds.length || "None"}</strong></div>
        </div>
      </RailCard>
    </>
  );

  return (
    <div style={GF}>
      <StepBanner
        icon={FileText}
        eyebrow="Step 1 of 7"
        title="Documents"
        description="Select the documents for this transaction. Only file names and sizes are used — no file contents are read or stored in this demonstration."
        meta={files.length === 0 ? "No files added" : `${readyCount} of ${files.length} file${files.length !== 1 ? "s" : ""} ready`}
      />
      <StepTwoColumn main={main} rail={rail} />
    </div>
  );
}

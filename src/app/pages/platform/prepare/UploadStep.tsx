// Step 1 of 7: Documents — file selection and transaction details.
// PRIVACY / SECURITY:
//   • browser File objects are NEVER passed to domain state.
//   • only metadata (name, size, type) is stored in PrepFile.
//   • no file contents are read, buffered, or hashed.
//   • this is a frontend demonstration — no uploads occur.
// Burgundy (#67023B) is NEVER used here. eNotary is NEVER mentioned.

import React, { useRef, useEffect, useCallback, useState } from "react";
import { usePrepare } from "../../../context/PrepareContext";
import type { PrepFile, PrepFileState } from "../../../models/prepare";
import { DEFAULT_TRANSACTION_DETAILS } from "../../../models/prepare";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const GOLD   = "#C9960C";

const DEMO_SIZE_LIMIT_BYTES = 20 * 1024 * 1024; // 20 MB demo limit
const ALLOWED_MIME_TYPES    = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_EXTENSIONS    = [".pdf", ".doc", ".docx"];

function humanSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileStateLabel(s: PrepFileState): { text: string; color: string } {
  switch (s) {
    case "ready":
      return { text: "Ready", color: "#2E7D32" };
    case "unsupported-type":
      return { text: "Unsupported type — PDF, DOC, or DOCX only", color: "#C0392B" };
    case "empty-file":
      return { text: "Empty file — cannot be used", color: "#C0392B" };
    case "demonstration-size-limit":
      return { text: "File too large for demonstration (20 MB limit)", color: GOLD };
    case "duplicate":
      return { text: "Duplicate filename", color: GOLD };
    case "unavailable":
      return { text: "File unavailable", color: "#C0392B" };
    case "removed":
      return { text: "Removed", color: SILVER };
    default:
      return { text: s, color: SILVER };
  }
}

function classifyFile(file: File, existingNames: Set<string>): PrepFileState {
  if (file.size === 0) return "empty-file";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const byMime = ALLOWED_MIME_TYPES.has(file.type);
  const byExt  = ALLOWED_EXTENSIONS.includes(`.${ext}`);
  if (!byMime && !byExt) return "unsupported-type";
  if (file.size > DEMO_SIZE_LIMIT_BYTES) return "demonstration-size-limit";
  if (existingNames.has(file.name)) return "duplicate";
  return "ready";
}

function generateFileId(): string {
  return `pf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── File row ──────────────────────────────────────────────────────────────────

function FileRow({
  file,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  file: PrepFile;
  index: number;
  total: number;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRemove: (id: string) => void;
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
        border: `1px solid ${isError ? "#F5C6CB" : "#E3E8EF"}`,
        background: isError ? "#FFF5F5" : "#FAFBFC",
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
          color: "#C0392B",
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
}: {
  onFilesSelected: (files: FileList) => void;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Select files to add. Accepts PDF, DOC, or DOCX files."
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
      style={{
        border: `2px dashed ${isDragOver ? AZURE : "#C8D3DC"}`,
        borderRadius: 12,
        padding: "40px 24px",
        textAlign: "center",
        background: isDragOver ? "#F0F7FF" : "#FAFBFC",
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        multiple
        aria-label="File input"
        style={{ display: "none" }}
        onChange={e => e.target.files && onFilesSelected(e.target.files)}
      />
      <div aria-hidden="true" style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
      <div style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 6 }}>
        Drop files here, or click to select
      </div>
      <div style={{ ...GF, fontSize: 13, color: SILVER }}>
        PDF, DOC, or DOCX · Up to 20 MB per file (demonstration limit) · Up to 10 files
      </div>
    </div>
  );
}

// ── Folder + tag selector (lightweight, no real backend) ──────────────────────

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

  const [isDragOver, setIsDragOver] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    setStep("upload");
    return () => {};
  }, [setStep]);

  const files      = draft?.files ?? [];
  const details    = draft?.details ?? DEFAULT_TRANSACTION_DETAILS;
  const validation = draft ? validate() : null;

  // ── File operations ─────────────────────────────────────────────────────────

  const addFiles = useCallback((fileList: FileList) => {
    const currentNames = new Set(files.map(f => f.fileName));
    const newEntries: PrepFile[] = [];

    Array.from(fileList).forEach((file, i) => {
      if (files.length + newEntries.length >= 10) return;
      const state = classifyFile(file, currentNames);
      currentNames.add(file.name);
      newEntries.push({
        id:            generateFileId(),
        fileName:      file.name,
        fileSizeBytes: file.size,
        mimeType:      file.type || "application/octet-stream",
        fileState:     state,
        order:         files.length + newEntries.length,
        demoPageCount: file.type === "application/pdf"
          ? Math.max(1, Math.floor(file.size / 40000))
          : undefined,
      });
    });

    if (newEntries.length > 0) {
      updateFiles([...files, ...newEntries]);
    }
  }, [files, updateFiles]);

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
  const hasReady = files.some(f => f.fileState === "ready");
  const atLimit  = files.length >= 10;

  return (
    <div style={{ ...GF, maxWidth: 620 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>
          Documents
        </h2>
        <p style={{ fontSize: 13, color: SILVER, margin: 0, lineHeight: 1.6 }}>
          Select the documents for this transaction. Only file names and sizes are used —
          no file contents are read or stored in this demonstration.
        </p>
      </div>

      {/* Drop zone */}
      {!atLimit && (
        <div style={{ marginBottom: 20 }}>
          <DropZone
            onFilesSelected={addFiles}
            isDragOver={isDragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
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
            />
          ))}
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
            border: "1px solid #F5C6CB",
            background: "#FFF5F5",
            fontSize: 13,
            color: "#C0392B",
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
          Transaction title <span style={{ color: "#C0392B" }}>*</span>
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
            border: `1px solid ${titleError ? "#F5C6CB" : "#D1D9E0"}`,
            background: "#FFFFFF",
            color: NAVY,
            fontSize: 14,
            boxSizing: "border-box",
          }}
        />
        {titleError && (
          <div id="prep-title-error" role="alert" style={{ ...GF, fontSize: 12, color: "#C0392B", marginTop: 4 }}>
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
        <strong style={{ color: "#4B5E70" }}>Frontend demonstration</strong>
        <br />
        No files are uploaded, read, or stored. Only the file name, size, and type are
        used to validate your selection. Your documents remain on your device and are
        not transmitted in this demonstration.
      </div>
    </div>
  );
}

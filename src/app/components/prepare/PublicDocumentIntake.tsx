// Public, pre-auth document intake — shown as a modal, triggered by the
// "Try The Document-Upload Now!" CTA (see HeroSection.tsx) or by navigating
// to "/home?openUpload=1" from another page (see EsigCoreWorkflow.tsx).
//
// SCOPE BOUNDARY: this component only ever performs Upload → Validate →
// Preview, exactly the bounded first slice of the real preparation workflow.
// It never asks for recipients, routing, authentication methods, field
// placement, or sending — those stay behind the authentication boundary in
// the real /app/prepare/* flow. It reuses the same classifyFiles() the
// authenticated Documents step uses, so a file accepted here is guaranteed
// to be accepted there too.
//
// PRIVACY: browser File objects are read for metadata only (name, size,
// type) and never retained — see file-intake.ts and
// PendingPreparationContext.tsx for the full rationale.

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { X, UploadCloud, FileText, FileType } from "lucide-react";
import { usePlatform } from "../../context/PlatformContext";
import { usePendingPreparation } from "../../context/PendingPreparationContext";
import type { PrepFile } from "../../models/prepare";
import {
  classifyFiles,
  humanFileSize,
  fileStateLabel,
  MAX_FILES_PER_TRANSACTION,
} from "../../services/prepare/file-intake";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
const NAVY = "#07111F";
const AZURE = "#0078D4";
const SILVER = "#64748B";

export function UploadDocumentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const platform = usePlatform();
  const { setPending, clearPending } = usePendingPreparation();

  const [files, setFiles] = useState<PrepFile[]>([]);
  const [title, setTitle] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const hasReady = files.some((f) => f.fileState === "ready");
  const atLimit = files.length >= MAX_FILES_PER_TRANSACTION;

  // Lock background scroll while open, restore focus target, close on Escape.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const addFiles = useCallback((fileList: FileList) => {
    const newEntries = classifyFiles(Array.from(fileList), files);
    if (newEntries.length > 0) setFiles((prev) => [...prev, ...newEntries]);
  }, [files]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const chooseAnother = useCallback(() => {
    setFiles([]);
    setTitle("");
    clearPending();
  }, [clearPending]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleContinue = useCallback(() => {
    const readyFiles = files.filter((f) => f.fileState === "ready");
    if (readyFiles.length === 0) return;
    const continuationId = setPending(readyFiles, title.trim());
    // Same destination whether or not the visitor is authenticated:
    // PlatformLayout lets an authenticated visitor straight through, and
    // redirects everyone else to sign-in/create-account with this exact URL
    // preserved as `returnTo` — see authReturnPath.ts and PrepareEntryPage.
    navigate(`/app/prepare?resumeId=${continuationId}`);
  }, [files, title, setPending, navigate]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(7,17,31,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      className="upload-modal-overlay"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="intake-heading"
        className="upload-modal-panel"
        style={{
          background: "#ffffff",
          borderRadius: 20,
          width: "100%",
          maxWidth: 640,
          maxHeight: "min(88vh, 780px)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(7,17,31,0.28)",
          overflow: "hidden",
        }}
      >
        {/* Header — sticky within the panel */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            padding: "24px 24px 20px",
            borderBottom: "1px solid rgba(0,0,0,0.07)",
            background: "linear-gradient(135deg, #F0F7FF 0%, #FFFFFF 100%)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: AZURE, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,120,212,0.28)",
            }}
          >
            <UploadCloud size={22} color="#FFFFFF" strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: AZURE, ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "2px 0 4px" }}>
              Start now
            </p>
            <h2 id="intake-heading" style={{ color: NAVY, ...GF, fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
              Upload a document to get started
            </h2>
            <p style={{ color: SILVER, ...GF, fontSize: 12.5, lineHeight: 1.6, margin: "6px 0 0" }}>
              1. Upload your document · 2. Create or access your account · 3. Continue preparing and send it
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            aria-label="Close"
            style={{
              flexShrink: 0, width: 32, height: 32, borderRadius: 8,
              border: "1px solid rgba(0,0,0,0.1)", background: "#FFFFFF", color: NAVY,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <X size={16} strokeWidth={2.25} />
          </button>
        </div>

        {/* Body — scrolls internally, header/footer stay put */}
        <div style={{ overflowY: "auto", padding: "24px", flex: 1 }}>
          {files.length === 0 && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Select a document to upload. Accepts PDF, DOC, or DOCX files."
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
              style={{
                border: `2px dashed ${isDragOver ? AZURE : "#C8D3DC"}`,
                borderRadius: 12,
                padding: "40px 20px",
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
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
              />
              <div aria-hidden="true" style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
              <div style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 6 }}>
                Drop a document here, or click to select
              </div>
              <div style={{ ...GF, fontSize: 12.5, color: SILVER }}>
                PDF, DOC, or DOCX · Up to 20 MB · No account required to try this
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {files.map((f) => {
                const { text, color } = fileStateLabel(f.fileState);
                const isError = f.fileState !== "ready";
                return (
                  <div
                    key={f.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 16px", borderRadius: 10,
                      border: `1px solid ${isError ? "#F5C6CB" : "#E3E8EF"}`,
                      background: isError ? "#FFF5F5" : "#FAFBFC",
                    }}
                  >
                    <span aria-hidden="true" style={{ flexShrink: 0, color: AZURE }}>
                      {f.mimeType === "application/pdf" ? <FileText size={18} /> : <FileType size={18} />}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...GF, fontSize: 14, fontWeight: 600, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {f.fileName}
                      </div>
                      <div style={{ ...GF, fontSize: 12, color, marginTop: 2 }}>
                        {text} · {humanFileSize(f.fileSizeBytes)}
                        {f.demoPageCount !== undefined && ` · ~${f.demoPageCount} pages`}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(f.id)}
                      aria-label={`Remove "${f.fileName}"`}
                      style={{ ...GF, width: 28, height: 28, border: "none", borderRadius: 6, background: "transparent", color: "#C0392B", cursor: "pointer", fontSize: 16, flexShrink: 0 }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              {!atLimit && (
                <button
                  onClick={() => inputRef.current?.click()}
                  style={{ ...GF, alignSelf: "flex-start", background: "none", border: "none", color: AZURE, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "4px 0" }}
                >
                  + Add another document
                </button>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                multiple
                aria-label="File input"
                style={{ display: "none" }}
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
              />
            </div>
          )}

          {hasReady && (
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="intake-title" style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY, display: "block", marginBottom: 6 }}>
                Document title <span style={{ color: SILVER, fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="intake-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Employment Agreement — Maria Santos"
                maxLength={200}
                style={{ ...GF, width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 8, border: "1px solid #D1D9E0", background: "#FFFFFF", color: NAVY, fontSize: 14 }}
              />
            </div>
          )}

          <div style={{ ...GF, paddingTop: 16, borderTop: "1px solid #E3E8EF", fontSize: 11.5, color: SILVER, lineHeight: 1.6 }}>
            <strong style={{ color: "#4B5E70" }}>Frontend demonstration.</strong> No files are uploaded, read, or stored — only
            the file name, size, and type are used to validate your selection here and inside your workspace.
            Recipients, routing, and sending are configured after you create or access your account.
          </div>
        </div>

        {/* Footer — sticky within the panel */}
        {hasReady && (
          <div
            style={{
              flexShrink: 0,
              display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
              padding: "16px 24px", borderTop: "1px solid rgba(0,0,0,0.07)", background: "#FAFBFC",
            }}
          >
            <button
              onClick={handleContinue}
              style={{
                ...GF, padding: "12px 26px", borderRadius: 10, border: "none",
                background: AZURE, color: "#FFFFFF", fontSize: 14.5, fontWeight: 700,
                cursor: "pointer", minHeight: 46,
              }}
            >
              Continue Preparing →
            </button>
            <button
              onClick={chooseAnother}
              style={{
                ...GF, padding: "12px 18px", borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.14)", background: "#FFFFFF", color: NAVY,
                fontSize: 13.5, fontWeight: 600, cursor: "pointer", minHeight: 46,
              }}
            >
              Choose Another Document
            </button>
            {platform.sessionStatus !== "authenticated" && (
              <span style={{ ...GF, fontSize: 11.5, color: SILVER }}>
                Create an account to continue preparing your document.
              </span>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes upload-modal-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes upload-modal-rise { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .upload-modal-overlay { animation: upload-modal-fade 0.18s ease; }
        .upload-modal-panel { animation: upload-modal-rise 0.22s cubic-bezier(0.16,1,0.3,1); }
        @media (prefers-reduced-motion: reduce) {
          .upload-modal-overlay, .upload-modal-panel { animation: none; }
        }
        @media (max-width: 640px) {
          .upload-modal-overlay { padding: 0; align-items: flex-end; }
          .upload-modal-panel { max-width: 100%; max-height: 92vh; border-radius: 20px 20px 0 0; }
        }
      `}</style>
    </div>
  );
}

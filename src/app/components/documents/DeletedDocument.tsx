// What is left of a document its owner permanently deleted, for the people
// who had access to it.
//
// The card keeps the workspace's own banner (colour and logo), like every
// other document card, so it is recognisably THAT workspace's document. Its
// body is the notice: a struck-through document icon and "Deleted Document".
// "View Details" opens the owner's formal notice in the centre of the page:
// who deleted it (photo and name), from which workspace, when, and why.

import { useEffect, useId, useRef } from "react";
import { FileX2, X, CalendarDays, Trash2, Quote } from "lucide-react";
import { BrandBand } from "../../pages/platform/settings/branding-preview";
import { MemberAvatar } from "../platform/MemberAvatar";
import { Z } from "../../utils/z-index";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
const NAVY = "#07111F";
const SLATE = "#475569";
const BORDER = "#E2E8F0";

export interface DeletedDocumentInfo {
  id: string;
  title: string;
  /** ISO date-time. */
  deletedAt: string;
  reason: string | null;
  owner: { name: string; avatarUrl?: string | undefined };
  workspace: { name: string; primaryColor: string; logoUrl: string | null };
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function DeletedDocumentCard({ info, onViewDetails, onRemove }: {
  info: DeletedDocumentInfo;
  onViewDetails: () => void;
  /** Takes the notice off this person's own list. */
  onRemove?: () => void;
}) {
  return (
    <li data-testid="deleted-document-card" style={{
      position: "relative", listStyle: "none", minWidth: 0, display: "flex", flexDirection: "column",
      background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden",
      boxShadow: "0 1px 2px rgba(7,17,31,0.05)",
    }}>
      <BrandBand variant="card" compact subtitle="Deleted document"
        branding={{ displayName: info.workspace.name, primaryColor: info.workspace.primaryColor, logoPreviewUrl: info.workspace.logoUrl }} />
      <div style={{ padding: "18px 16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", flex: 1 }}>
        <span aria-hidden style={{
          width: 56, height: 56, borderRadius: 16, background: "#FEF2F2", border: "1px solid #FECACA",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>
          <FileX2 size={28} color="#B91C1C" />
        </span>
        <span style={{ ...GF, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#991B1B" }}>
          Deleted Document
        </span>
        <h3 title={info.title} style={{
          ...GF, fontSize: 14.5, fontWeight: 700, color: NAVY, margin: 0, lineHeight: 1.35, overflowWrap: "anywhere",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{info.title}</h3>
        <p style={{ ...GF, fontSize: 12.5, color: SLATE, margin: 0, lineHeight: 1.5 }}>
          The owner permanently deleted this document. It can no longer be opened.
        </p>
      </div>
      <div style={{ padding: "10px 12px 12px 16px", borderTop: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <time dateTime={info.deletedAt} style={{ ...GF, fontSize: 12, color: SLATE }}>Deleted {formatWhen(info.deletedAt)}</time>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          {onRemove && (
            <button type="button" onClick={onRemove} className="deleted-doc-remove"
              aria-label={`Remove ${info.title} from my list`} title="Remove from my list"
              style={{
                width: 36, height: 36, borderRadius: 8, border: `1px solid ${BORDER}`, background: "#FFFFFF", color: SLATE,
                display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0,
              }}>
              <Trash2 size={15} aria-hidden />
            </button>
          )}
          <button type="button" onClick={onViewDetails} data-testid="deleted-document-details"
            style={{
              ...GF, minHeight: 36, padding: "0 14px", borderRadius: 8, border: "1px solid #0078D4", background: "#FFFFFF",
              color: "#005A9E", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
            View Details
          </button>
        </span>
      </div>
    </li>
  );
}

/** The owner's notice, in the centre of the page at every width. */
export function DeletionDetailsPanel({ info, onClose }: { info: DeletedDocumentInfo; onClose: () => void }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("keydown", onKey, true); opener?.focus(); };
  }, [onClose]);
  const color = info.workspace.primaryColor;
  const initials = info.workspace.name.split(/\s+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div data-testid="deletion-details-scrim"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: Z.modal, background: "rgba(7, 17, 31, 0.6)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxSizing: "border-box",
      }}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} data-testid="deletion-details"
        style={{
          ...GF, position: "relative", background: "#FFFFFF", borderRadius: 18, width: "100%", maxWidth: 520,
          maxHeight: "calc(100dvh - 32px)", overflowY: "auto", boxSizing: "border-box",
          boxShadow: "0 24px 60px -12px rgba(7, 17, 31, 0.55)",
        }}>
        {/* The workspace's own colours, as the header of its notice. */}
        <div style={{
          position: "relative", height: 104, overflow: "hidden", borderRadius: "18px 18px 0 0",
          backgroundImage: `linear-gradient(135deg, ${color} 0%, ${color} 55%, rgba(7,17,31,0.55) 160%)`,
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "14px 14px 0 18px", boxSizing: "border-box",
        }}>
          <svg aria-hidden viewBox="0 0 520 104" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.18 }}>
            <path d="M0 70 C 120 30, 220 110, 340 60 S 520 40, 520 40 L520 104 L0 104 Z" fill="#FFFFFF" />
            <path d="M0 88 C 140 60, 260 120, 400 78 S 520 70, 520 70 L520 104 L0 104 Z" fill="#FFFFFF" />
          </svg>
          <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0, color: "#FFFFFF" }}>
            {info.workspace.logoUrl
              ? <img src={info.workspace.logoUrl} alt="" style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.95)", objectFit: "contain", padding: 3, boxSizing: "border-box" }} />
              : <span aria-hidden style={{ ...GF, width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.95)", color: NAVY, fontSize: 13, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{initials}</span>}
            <span style={{ minWidth: 0 }}>
              <span style={{ ...GM, display: "block", fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.9 }}>Notice from</span>
              <span style={{ ...GF, display: "block", fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 1px 2px rgba(7,17,31,0.25)" }}>{info.workspace.name}</span>
            </span>
          </span>
          <button ref={closeRef} type="button" aria-label="Close" onClick={onClose}
            style={{ position: "relative", width: 36, height: 36, borderRadius: 10, border: "none", background: "rgba(255,255,255,0.92)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* The owner, overlapping the header like a letter's seal. */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "0 22px", marginTop: -36, position: "relative" }}>
          <span style={{ borderRadius: "50%", boxShadow: "0 8px 20px -8px rgba(7,17,31,0.45)", flexShrink: 0 }}>
            <MemberAvatar name={info.owner.name} url={info.owner.avatarUrl} size={72} ring />
          </span>
          {/* Below the band, never across its edge. */}
          <div style={{ minWidth: 0, paddingTop: 42 }}>
            <p style={{ ...GF, fontSize: 16, fontWeight: 800, color: NAVY, margin: 0, overflowWrap: "anywhere" }}>{info.owner.name}</p>
            <p style={{ ...GF, fontSize: 12.5, color: SLATE, margin: "1px 0 0" }}>Workspace owner</p>
          </div>
        </div>

        <div style={{ padding: "16px 22px 22px" }}>
          <span style={{ ...GF, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 999, padding: "4px 10px" }}>
            <FileX2 size={13} aria-hidden /> Document deleted
          </span>
          <h2 id={titleId} style={{ ...GF, fontSize: 19, fontWeight: 800, color: NAVY, margin: "10px 0 4px", lineHeight: 1.3, overflowWrap: "anywhere" }}>{info.title}</h2>
          <p style={{ ...GF, display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: SLATE, margin: 0 }}>
            <CalendarDays size={14} aria-hidden /> <time dateTime={info.deletedAt}>{formatWhen(info.deletedAt)}</time>
          </p>

          <p style={{ ...GF, fontSize: 13.5, color: "#1F2937", lineHeight: 1.6, margin: "14px 0 0" }}>
            This document was permanently deleted by the owner of <strong>{info.workspace.name}</strong>. The document,
            its signatures and its history have been erased and can no longer be opened or downloaded, by anyone.
          </p>

          <figure style={{ margin: "14px 0 0", padding: "14px 16px", borderRadius: 12, background: "#F8FAFC", border: `1px solid ${BORDER}`, borderLeft: `4px solid ${color}` }}>
            <figcaption style={{ ...GF, display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: SLATE, marginBottom: 6 }}>
              <Quote size={13} aria-hidden /> The owner&rsquo;s reason
            </figcaption>
            <blockquote data-testid="deletion-reason" style={{ ...GF, margin: 0, fontSize: 14, color: NAVY, lineHeight: 1.6, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {info.reason !== null && info.reason.trim() !== "" ? info.reason : "No reason was given."}
            </blockquote>
          </figure>

          <p style={{ ...GF, fontSize: 12, color: "#64748B", lineHeight: 1.55, margin: "12px 0 0" }}>
            You can remove this notice from your own list at any time. If you kept a downloaded copy of the document,
            it is unaffected.
          </p>
        </div>
      </div>
    </div>
  );
}

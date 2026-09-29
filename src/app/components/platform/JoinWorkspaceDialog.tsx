// "Join another workspace", from the workspace menu (078's join links).
//
// The same request the /join/<token> page and onboarding send: paste the link
// someone shared, see which workspace it is for and who sent it, add your name
// and an optional reason, and send. Nobody joins from here — the owner or an
// administrator approves the request, and the approved workspace then appears
// in the workspace menu (it re-reads the list each time it opens).
//
// Reuses the join service's parser, preview, request and wording, so every
// outcome reads exactly as it does on the join page and in onboarding.

import { useEffect, useId, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { ModalFrame, modalButtonStyle } from "../contact-requests/ModalFrame";
import { usePlatform } from "../../context/PlatformContext";
import {
  extractJoinToken, previewJoinLink, submitJoinRequest,
  JOIN_MESSAGES, JOIN_REASON_MAX, JOIN_FULL_NAME_MAX,
} from "../../services/real/workspace-join.service";

const GF = { fontFamily: "'Geist', sans-serif" } as const;
const NAVY = "#07111F";
const SLATE = "#64748B";
const BORDER = "#D1D9E0";
export const JOIN_PREVIEW_DEBOUNCE_MS = 400;

type Preview =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ok"; token: string; workspaceName: string; invitedByName: string | null }
  | { status: "bad"; message: string };

type Outcome = { tone: "success" | "info"; workspaceName: string; text: string };

const inputStyle: React.CSSProperties = {
  ...GF, width: "100%", boxSizing: "border-box", fontSize: 14, color: NAVY,
  border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", background: "#FFFFFF",
};
const labelStyle: React.CSSProperties = { ...GF, display: "block", fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 };

export function JoinWorkspaceDialog({ onClose }: { onClose: () => void }) {
  const { user } = usePlatform();
  const ids = { link: useId(), name: useId(), reason: useId(), status: useId() };
  const [link, setLink] = useState("");
  const [fullName, setFullName] = useState(user?.fullName || user?.displayName || "");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<Preview>({ status: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  // Check the link as it is typed or pasted, once typing pauses.
  useEffect(() => {
    const raw = link.trim();
    if (raw === "") { setPreview({ status: "idle" }); return; }
    let stale = false;
    setPreview({ status: "checking" });
    const handle = setTimeout(() => {
      const token = extractJoinToken(raw);
      if (token === null) { setPreview({ status: "bad", message: JOIN_MESSAGES.invalid }); return; }
      void previewJoinLink(token).then(result => {
        if (stale) return;
        if (result.kind === "ok") {
          setPreview({ status: "ok", token, workspaceName: result.workspaceName, invitedByName: result.invitedByName });
        } else {
          setPreview({ status: "bad", message: result.kind === "used" ? JOIN_MESSAGES.used
            : result.kind === "invalid" ? JOIN_MESSAGES.invalid : JOIN_MESSAGES.error });
        }
      });
    }, JOIN_PREVIEW_DEBOUNCE_MS);
    return () => { stale = true; clearTimeout(handle); };
  }, [link]);

  const name = fullName.trim();
  const canSend = preview.status === "ok" && name !== "" && !sending;

  async function send() {
    if (preview.status !== "ok") {
      setError(link.trim() === "" ? "Paste the join link someone shared with you." : JOIN_MESSAGES.invalid);
      return;
    }
    if (name === "") { setError("Enter your full name."); return; }
    setError(null);
    setSending(true);
    const trimmedReason = reason.trim();
    const result = await submitJoinRequest(preview.token, { fullName: name, reason: trimmedReason === "" ? null : trimmedReason });
    setSending(false);
    switch (result.kind) {
      case "sent":
        setOutcome({
          tone: "success", workspaceName: result.workspaceName,
          text: `Request sent. ${result.workspaceName}'s owner or an administrator will review it, and you'll be notified when they decide. Once approved, it appears in your workspace menu.`,
        });
        return;
      case "pending":
        setOutcome({ tone: "info", workspaceName: preview.workspaceName, text: JOIN_MESSAGES.pending });
        return;
      case "used":
        setPreview({ status: "bad", message: JOIN_MESSAGES.used });
        setError(JOIN_MESSAGES.used);
        return;
      case "invalid":
        setPreview({ status: "bad", message: JOIN_MESSAGES.invalid });
        setError(JOIN_MESSAGES.invalid);
        return;
      case "already-member":
        setError(JOIN_MESSAGES.alreadyMember);
        return;
      default:
        setError(result.reason === "email-unverified" ? JOIN_MESSAGES.emailUnverified : result.message);
    }
  }

  if (outcome !== null) {
    return (
      <ModalFrame title="Join another workspace" subtitle={outcome.workspaceName} onClose={onClose}
        footer={<button type="button" onClick={onClose} style={modalButtonStyle("primary")}>Done</button>}>
        <div role="status" style={{
          ...GF, display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.55, color: NAVY,
          background: outcome.tone === "success" ? "#F0FDF4" : "#EFF6FF",
          border: `1px solid ${outcome.tone === "success" ? "#BBF7D0" : "#BFDBFE"}`, borderRadius: 10, padding: "12px 14px",
        }}>
          <CheckCircle2 size={18} aria-hidden style={{ color: outcome.tone === "success" ? "#15803D" : "#1D4ED8", flexShrink: 0, marginTop: 1 }} />
          <span>{outcome.text}</span>
        </div>
      </ModalFrame>
    );
  }

  return (
    <ModalFrame title="Join another workspace" subtitle="Use the join link someone shared with you." onClose={onClose} busy={sending}
      footer={<>
        <button type="button" onClick={onClose} disabled={sending} style={modalButtonStyle("secondary", sending)}>Cancel</button>
        <button type="button" onClick={() => { void send(); }} disabled={!canSend} style={modalButtonStyle("primary", !canSend)}>
          <Send size={15} aria-hidden /> {sending ? "Sending…" : "Send request"}
        </button>
      </>}>
      <form onSubmit={e => { e.preventDefault(); void send(); }} style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <div>
          <label htmlFor={ids.link} style={labelStyle}>Join link</label>
          <input id={ids.link} type="text" value={link} autoFocus autoComplete="off" spellCheck={false}
            placeholder="https://…/join/…" aria-describedby={ids.status}
            onChange={e => { setLink(e.target.value); setError(null); }} style={inputStyle} />
          <div id={ids.status} aria-live="polite" style={{ ...GF, fontSize: 13, marginTop: 6, lineHeight: 1.5, minHeight: 20 }}>
            {preview.status === "checking" && <span style={{ color: SLATE }}>Checking the link…</span>}
            {preview.status === "ok" && (
              <span style={{ color: NAVY }}>
                Join <strong>{preview.workspaceName}</strong>
                {preview.invitedByName ? <>, invited by {preview.invitedByName}</> : null}
              </span>
            )}
            {preview.status === "bad" && <span style={{ color: "#B42318" }}>{preview.message}</span>}
            {preview.status === "idle" && <span style={{ color: SLATE }}>Paste the whole link, or just the code at its end.</span>}
          </div>
        </div>

        <div>
          <label htmlFor={ids.name} style={labelStyle}>Your full name</label>
          <input id={ids.name} type="text" value={fullName} maxLength={JOIN_FULL_NAME_MAX} autoComplete="name"
            onChange={e => { setFullName(e.target.value); setError(null); }} style={inputStyle} />
        </div>

        <div>
          <label htmlFor={ids.reason} style={labelStyle}>
            Why are you joining? <span style={{ fontWeight: 400, color: SLATE }}>(optional)</span>
          </label>
          <textarea id={ids.reason} value={reason} maxLength={JOIN_REASON_MAX} rows={3}
            onChange={e => { setReason(e.target.value); setError(null); }}
            style={{ ...inputStyle, resize: "vertical", minHeight: 76 }} />
          <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 4, textAlign: "right" }}>
            {reason.length} / {JOIN_REASON_MAX}
          </div>
        </div>

        {error !== null && (
          <div role="alert" style={{ ...GF, fontSize: 13, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 12px" }}>
            {error}
          </div>
        )}
        <p style={{ ...GF, fontSize: 12, color: SLATE, margin: 0, lineHeight: 1.5 }}>
          Nobody joins straight away: the workspace&apos;s owner or an administrator approves each request. Your current workspace is unaffected.
        </p>
      </form>
    </ModalFrame>
  );
}

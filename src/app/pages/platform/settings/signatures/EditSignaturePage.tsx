// /app/settings/signatures/:signatureId/edit — Rename, Replace, Set Default, Archive, Restore, Remove.
// Action is selected via ?action= query param. No second drawing engine.
// No localStorage. No upload. No identity verification. No eNotary. No Burgundy.

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router";
import {
  SettingsPage, SCard, DEMO_NOTICE, BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER, INPUT_STYLE, Skeleton,
} from "../SettingsShell";
import { signatureLibraryService } from "../../../../services/mock/signature-library.service";
import { TYPED_SIGNATURE_STYLES } from "../../../../models/recipient";
import type { SignatureLibraryEntry, SignatureLibraryEntryId } from "../../../../models/signature-library";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SLATE  = "#64748B";
const SILVER = "#8A9BAE";
const AMBER  = "#D97706";
const GREEN  = "#16A34A";
const RED    = "#DC2626";

type EditAction = "choose" | "rename" | "replace" | "set-default" | "archive" | "restore" | "remove";

// ── Inline preview ────────────────────────────────────────────────────────────

function EntryPreview({ entry }: { entry: SignatureLibraryEntry }) {
  const rep = entry.representation;
  if (rep.method === "typed") {
    const style = TYPED_SIGNATURE_STYLES[rep.styleIndex] ?? TYPED_SIGNATURE_STYLES[0];
    return (
      <div
        aria-label={`Preview: ${rep.typedText}`}
        style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFBFC", border: "1px solid #E3E8EF", borderRadius: 8 }}
      >
        <span style={{ fontFamily: style.fontFamily, fontSize: Math.min(style.fontSize, 24), fontStyle: style.fontStyle, color: NAVY, padding: "0 12px", textAlign: "center", wordBreak: "break-word" }}>
          {rep.typedText}
        </span>
      </div>
    );
  }
  if (rep.method === "drawn" && rep.dataUrl) {
    return (
      <div style={{ height: 64, border: "1px solid #E3E8EF", borderRadius: 8, overflow: "hidden", background: "#FAFBFC" }}>
        <img src={rep.dataUrl} alt="Current representation" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
    );
  }
  return (
    <div style={{ height: 64, border: "1.5px dashed #D1D9E0", borderRadius: 8, background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ ...GF, fontSize: 12, color: SILVER }}>No preview</span>
    </div>
  );
}

// ── Rename form ───────────────────────────────────────────────────────────────

function RenameForm({ entry, onDone }: { entry: SignatureLibraryEntry; onDone: (updated: SignatureLibraryEntry) => void }) {
  const [name, setName] = useState(entry.displayName);
  const [err,  setErr]  = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function submit() {
    if (!name.trim()) { setErr("Entry name is required."); return; }
    setBusy(true);
    const r = signatureLibraryService.rename(entry.id, { displayName: name.trim() });
    if (r.ok) { onDone(r.data); }
    else { setErr("Could not rename entry."); setBusy(false); }
  }

  return (
    <div>
      <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 14px" }}>
        Renaming only changes the display name. The visual representation is unchanged.
      </p>
      <label htmlFor="rename-input" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
        New name <span aria-label="required" style={{ color: RED }}>*</span>
      </label>
      <input
        id="rename-input"
        type="text"
        value={name}
        onChange={e => { setName(e.target.value); setErr(null); }}
        maxLength={60}
        style={{ ...INPUT_STYLE, borderColor: err ? RED : undefined }}
        aria-invalid={!!err}
        aria-describedby={err ? "rename-error" : undefined}
      />
      {err && <div id="rename-error" role="alert" style={{ ...GF, fontSize: 12, color: RED, marginTop: 4 }}>{err}</div>}
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button onClick={submit} disabled={busy} style={{ ...BTN_PRIMARY }}>
          {busy ? "Saving…" : "Save Name"}
        </button>
        <Link to={`/app/settings/signatures/${entry.id}`} style={{ ...BTN_SECONDARY, textDecoration: "none", display: "inline-block" }}>
          Cancel
        </Link>
      </div>
    </div>
  );
}

// ── Replace form ──────────────────────────────────────────────────────────────

function ReplaceForm({ entry, onDone }: { entry: SignatureLibraryEntry; onDone: (updated: SignatureLibraryEntry) => void }) {
  const [method,    setMethod]    = useState<"typed" | "drawn">(entry.representation.method);
  const [typedText, setTypedText] = useState(entry.representation.method === "typed" ? entry.representation.typedText : "");
  const [styleIndex,setStyleIndex]= useState(entry.representation.method === "typed" ? entry.representation.styleIndex : 0);
  const [err,       setErr]       = useState<string | null>(null);
  const [busy,      setBusy]      = useState(false);

  // Canvas state — in-memory only
  const canvasRef           = useRef<HTMLCanvasElement>(null);
  const [drawing,    setDrawing]    = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [drawnDataUrl, setDrawnDataUrl] = useState<string | null>(null);

  useEffect(() => { return () => { setDrawnDataUrl(null); }; }, []);
  useEffect(() => { if (method === "drawn") { setDrawnDataUrl(null); setHasDrawing(false); } }, [method]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width  / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }
  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!canvasRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath(); ctx.moveTo(x, y); setDrawing(true);
  }
  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y); ctx.strokeStyle = NAVY; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
    setHasDrawing(true);
  }
  function handlePointerUp() {
    if (!canvasRef.current) return;
    setDrawing(false);
    if (hasDrawing || drawing) setDrawnDataUrl(canvasRef.current.toDataURL("image/png"));
  }
  function clearCanvas() {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasDrawing(false); setDrawnDataUrl(null);
  }

  function submit() {
    if (method === "typed") {
      if (!typedText.trim()) { setErr("Text is required."); return; }
      setBusy(true);
      const r = signatureLibraryService.replaceTyped(entry.id, { typedText: typedText.trim(), styleIndex });
      if (r.ok) { onDone(r.data); }
      else { setErr("Could not replace representation."); setBusy(false); }
    } else {
      if (!drawnDataUrl || !hasDrawing) { setErr("Please draw your replacement representation."); return; }
      setBusy(true);
      const r = signatureLibraryService.replaceDrawn(entry.id, { dataUrl: drawnDataUrl });
      if (r.ok) { onDone(r.data); }
      else { setErr("Could not replace representation."); setBusy(false); }
    }
  }

  const kindLabel = entry.kind === "signature" ? "Signature" : "Initials";

  return (
    <div>
      <div style={{ marginBottom: 14, padding: "10px 14px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, ...GF, fontSize: 12, color: "#92400E" }}>
        Replacing this representation affects only future frontend selections. It does not modify previously completed document demonstrations.
      </div>

      <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 8px" }}>Current:</p>
      <div style={{ marginBottom: 16 }}><EntryPreview entry={entry} /></div>

      {/* Method toggle */}
      <div role="tablist" aria-label="Replacement method" style={{ display: "flex", gap: 4, background: "#F5F7FA", borderRadius: 8, padding: 4, marginBottom: 16 }}>
        {(["typed", "drawn"] as const).map(m => (
          <button
            key={m}
            role="tab"
            aria-selected={method === m}
            onClick={() => setMethod(m)}
            style={{
              ...GF, flex: 1, padding: "8px 0", borderRadius: 6, border: "none",
              background: method === m ? "#FFFFFF" : "transparent",
              color: method === m ? NAVY : SILVER,
              fontSize: 13, fontWeight: method === m ? 700 : 500, cursor: "pointer",
              boxShadow: method === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {m === "typed" ? "Type" : "Draw"}
          </button>
        ))}
      </div>

      {method === "typed" && (
        <>
          <label htmlFor="replace-text" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
            {entry.kind === "initials" ? "Replacement initials" : "Replacement name"} <span aria-label="required" style={{ color: RED }}>*</span>
          </label>
          <input
            id="replace-text"
            type="text"
            value={typedText}
            onChange={e => { setTypedText(e.target.value); setErr(null); }}
            placeholder={entry.kind === "initials" ? "e.g. M.R." : "e.g. Maria Reyes"}
            style={{ ...INPUT_STYLE, marginBottom: 12 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {TYPED_SIGNATURE_STYLES.map((s, i) => (
              <button
                key={i}
                onClick={() => setStyleIndex(i)}
                aria-pressed={styleIndex === i}
                aria-label={`Style: ${s.label}`}
                style={{
                  padding: "8px 12px", borderRadius: 7,
                  border: `1.5px solid ${styleIndex === i ? AZURE : "#E3E8EF"}`,
                  background: styleIndex === i ? "#EBF4FC" : "#FAFBFC",
                  cursor: "pointer", textAlign: "left",
                }}
              >
                <span style={{ fontFamily: s.fontFamily, fontSize: Math.min(s.fontSize, 22), fontStyle: s.fontStyle, color: NAVY, display: "block" }}>
                  {typedText || (entry.kind === "initials" ? "M.R." : "Your Signature")}
                </span>
                <span style={{ ...GF, fontSize: 10, color: SILVER }}>{s.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {method === "drawn" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY }}>
              Draw replacement {kindLabel.toLowerCase()} <span aria-label="required" style={{ color: RED }}>*</span>
            </div>
            <button onClick={clearCanvas} style={{ ...GF, background: "none", border: "none", cursor: "pointer", color: SLATE, fontSize: 12, fontWeight: 600 }}>Clear</button>
          </div>
          <canvas
            ref={canvasRef}
            width={480}
            height={entry.kind === "initials" ? 100 : 130}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            aria-label={`Drawing surface — draw replacement ${kindLabel.toLowerCase()}`}
            style={{
              display: "block", width: "100%",
              height: entry.kind === "initials" ? 100 : 130,
              border: `1.5px dashed ${err && !hasDrawing ? RED : "#D1D9E0"}`,
              borderRadius: 8, background: "#FAFBFC", cursor: "crosshair", touchAction: "none", marginBottom: 6,
            }}
          />
          {!hasDrawing && <p style={{ ...GF, fontSize: 12, color: SILVER, textAlign: "center" }}>Draw above with your mouse or finger</p>}
          <button onClick={() => setMethod("typed")} style={{ ...GF, background: "none", border: "none", color: AZURE, fontSize: 13, cursor: "pointer", padding: "0 0 12px", fontWeight: 600 }}>
            Type instead →
          </button>
        </>
      )}

      {err && <div role="alert" style={{ ...GF, fontSize: 12, color: RED, marginBottom: 10 }}>{err}</div>}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={submit} disabled={busy} style={{ ...BTN_PRIMARY }}>
          {busy ? "Replacing…" : "Replace Representation"}
        </button>
        <Link to={`/app/settings/signatures/${entry.id}`} style={{ ...BTN_SECONDARY, textDecoration: "none", display: "inline-block" }}>
          Cancel
        </Link>
      </div>
    </div>
  );
}

// ── Set Default confirmation ───────────────────────────────────────────────────

function SetDefaultPanel({ entry, onDone }: { entry: SignatureLibraryEntry; onDone: (updated: SignatureLibraryEntry) => void }) {
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState<string | null>(null);
  const kindLabel = entry.kind === "signature" ? "Signature" : "Initials";

  function submit() {
    setBusy(true);
    const r = signatureLibraryService.setDefault(entry.id);
    if (r.ok) { onDone(r.data); }
    else { setErr("Could not update default."); setBusy(false); }
  }

  return (
    <div>
      <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 10px" }}>
        Set <strong>{entry.displayName}</strong> as your default {kindLabel.toLowerCase()}?
        Any previous default {kindLabel.toLowerCase()} will be replaced in the demonstration.
      </p>
      <p style={{ ...GF, fontSize: 12, color: SILVER, margin: "0 0 16px" }}>
        Your default is suggested during signing but you must still explicitly adopt it for each signing request.
        A default does not automatically complete any signature field.
      </p>
      {err && <div role="alert" style={{ ...GF, fontSize: 12, color: RED, marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={submit} disabled={busy} style={{ ...BTN_PRIMARY }}>
          {busy ? "Updating…" : `Set as Default ${kindLabel}`}
        </button>
        <Link to={`/app/settings/signatures/${entry.id}`} style={{ ...BTN_SECONDARY, textDecoration: "none", display: "inline-block" }}>Cancel</Link>
      </div>
    </div>
  );
}

// ── Archive / Restore / Remove panels ────────────────────────────────────────

function ArchivePanel({ entry, onDone }: { entry: SignatureLibraryEntry; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState<string | null>(null);
  const isDefault = entry.defaultState !== "non-default";

  function submit() {
    setBusy(true);
    const r = signatureLibraryService.archive(entry.id);
    if (r.ok) { onDone(); } else { setErr("Could not archive."); setBusy(false); }
  }

  return (
    <div>
      {isDefault && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 14px", marginBottom: 14, ...GF, fontSize: 12, color: "#92400E" }}>
          This is currently your default. Archiving it will clear the default. You can set a new default from another entry.
        </div>
      )}
      <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 10px" }}>
        Archive <strong>{entry.displayName}</strong>? Archived entries are removed from signing selection and will not be suggested as defaults.
      </p>
      <p style={{ ...GF, fontSize: 12, color: SILVER, margin: "0 0 16px" }}>
        You can restore this entry at any time from the Archived view.
      </p>
      {err && <div role="alert" style={{ ...GF, fontSize: 12, color: RED, marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={submit} disabled={busy} style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 20px", border: "1.5px solid #FDE68A", borderRadius: 8, background: "#FFFBEB", color: AMBER, cursor: busy ? "not-allowed" : "pointer" }}>
          {busy ? "Archiving…" : "Archive Entry"}
        </button>
        <Link to={`/app/settings/signatures/${entry.id}`} style={{ ...BTN_SECONDARY, textDecoration: "none", display: "inline-block" }}>Cancel</Link>
      </div>
    </div>
  );
}

function RestorePanel({ entry, onDone }: { entry: SignatureLibraryEntry; onDone: (updated: SignatureLibraryEntry) => void }) {
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState<string | null>(null);

  function submit() {
    setBusy(true);
    const r = signatureLibraryService.restore(entry.id);
    if (r.ok) { onDone(r.data); } else { setErr("Could not restore."); setBusy(false); }
  }

  return (
    <div>
      <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 10px" }}>
        Restore <strong>{entry.displayName}</strong> to active state? It will become available for signing selection again.
        Default status is not restored automatically.
      </p>
      {err && <div role="alert" style={{ ...GF, fontSize: 12, color: RED, marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={submit} disabled={busy} style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 20px", border: "1.5px solid #BBF7D0", borderRadius: 8, background: "#F0FDF4", color: GREEN, cursor: busy ? "not-allowed" : "pointer" }}>
          {busy ? "Restoring…" : "Restore Entry"}
        </button>
        <Link to={`/app/settings/signatures/${entry.id}`} style={{ ...BTN_SECONDARY, textDecoration: "none", display: "inline-block" }}>Cancel</Link>
      </div>
    </div>
  );
}

function RemovePanel({ entry, onDone }: { entry: SignatureLibraryEntry; onDone: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState<string | null>(null);

  function submit() {
    if (!confirmed) { setErr("Please confirm to proceed."); return; }
    setBusy(true);
    const r = signatureLibraryService.remove(entry.id);
    if (r.ok) { onDone(); } else { setErr("Could not remove."); setBusy(false); }
  }

  return (
    <div>
      <div style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 8, padding: "12px 14px", marginBottom: 14, ...GF, fontSize: 12, color: "#991B1B" }}>
        <strong>This only removes the entry from the current frontend demonstration state.</strong> No backend data is deleted because no backend is connected.
        This action cannot be undone in the current session. Consider archiving instead.
      </div>
      <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 14px" }}>
        You are about to remove <strong>{entry.displayName}</strong> from your demonstration library.
      </p>
      <label style={{ ...GF, fontSize: 13, color: NAVY, display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", marginBottom: 16 }}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => { setConfirmed(e.target.checked); setErr(null); }}
          style={{ marginTop: 2 }}
        />
        <span>I understand this removes the entry from the current frontend demonstration only and does not constitute secure deletion.</span>
      </label>
      {err && <div role="alert" style={{ ...GF, fontSize: 12, color: RED, marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={submit} disabled={busy || !confirmed} style={{ ...BTN_DANGER, opacity: (!confirmed || busy) ? 0.6 : 1, cursor: (!confirmed || busy) ? "not-allowed" : "pointer" }}>
          {busy ? "Removing…" : "Remove from Demonstration"}
        </button>
        <Link to={`/app/settings/signatures/${entry.id}`} style={{ ...BTN_SECONDARY, textDecoration: "none", display: "inline-block" }}>Cancel</Link>
      </div>
    </div>
  );
}

// ── Main edit page ────────────────────────────────────────────────────────────

export function EditSignaturePage() {
  const { signatureId } = useParams<{ signatureId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawAction = searchParams.get("action") ?? "choose";
  const action: EditAction = (["choose","rename","replace","set-default","archive","restore","remove"] as EditAction[]).includes(rawAction as EditAction)
    ? rawAction as EditAction
    : "choose";

  const [loading,  setLoading]  = useState(true);
  const [entry,    setEntry]    = useState<SignatureLibraryEntry | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!signatureId) { setNotFound(true); setLoading(false); return; }
    const r = signatureLibraryService.getEntry(signatureId as SignatureLibraryEntryId);
    if (r.ok) { setEntry(r.data); } else { setNotFound(true); }
    setLoading(false);
  }, [signatureId]);

  const navToDetail = useCallback(() => {
    navigate(`/app/settings/signatures/${signatureId}`);
  }, [navigate, signatureId]);

  const navToLib = useCallback(() => {
    navigate("/app/settings/signatures");
  }, [navigate]);

  if (!loading && notFound) {
    return (
      <SettingsPage title="Entry Not Found" breadcrumb="Signatures and Initials › Not Found">
        <SCard style={{ textAlign: "center", padding: 32 }}>
          <div style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 10 }}>Entry Not Found</div>
          <Link to="/app/settings/signatures" style={{ ...BTN_SECONDARY, textDecoration: "none", display: "inline-block" }}>
            ← Signatures and Initials
          </Link>
        </SCard>
      </SettingsPage>
    );
  }

  const kindLabel = entry?.kind === "signature" ? "Signature" : "Initials";
  const title     = entry ? `Edit ${entry.displayName}` : "Edit Entry";
  const breadcrumb = `Signatures and Initials › ${entry?.displayName ?? "Entry"} › Edit`;

  const actionLabels: Record<EditAction, string> = {
    choose: "Choose action",
    rename: "Rename",
    replace: "Replace Representation",
    "set-default": `Set as Default ${kindLabel}`,
    archive: "Archive",
    restore: "Restore",
    remove: "Remove from Demonstration",
  };

  const heading = action === "choose" ? title : `${entry?.displayName ?? ""} — ${actionLabels[action]}`;

  return (
    <SettingsPage title={heading} breadcrumb={breadcrumb}>
      {DEMO_NOTICE}
      {loading && <SCard><Skeleton h={64} mb={12} /><Skeleton h={40} /></SCard>}

      {!loading && entry && (
        <SCard>
          {/* Action chooser */}
          {action === "choose" && (
            <>
              <h2 style={{ ...GF, fontSize: 15, fontWeight: 800, color: NAVY, margin: "0 0 8px" }}>
                {title}
              </h2>
              <div style={{ marginBottom: 16 }}><EntryPreview entry={entry} /></div>
              <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 16px" }}>What would you like to do?</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {entry.status === "active" && (
                  <>
                    <Link to={`?action=rename`}       style={{ ...BTN_SECONDARY, textDecoration: "none", display: "inline-block" }}>Rename</Link>
                    <Link to={`?action=replace`}      style={{ ...BTN_SECONDARY, textDecoration: "none", display: "inline-block" }}>Replace Representation</Link>
                    {entry.defaultState === "non-default" && (
                      <Link to={`?action=set-default`} style={{ ...BTN_SECONDARY, textDecoration: "none", display: "inline-block" }}>Set as Default {kindLabel}</Link>
                    )}
                    <Link to={`?action=archive`}      style={{ ...GF, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-block", padding: "9px 20px", border: "1.5px solid #FDE68A", borderRadius: 8, background: "#FFFBEB", color: AMBER }}>Archive</Link>
                  </>
                )}
                {entry.status === "archived" && (
                  <Link to={`?action=restore`}        style={{ ...GF, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-block", padding: "9px 20px", border: "1.5px solid #BBF7D0", borderRadius: 8, background: "#F0FDF4", color: GREEN }}>Restore</Link>
                )}
                <Link to={`?action=remove`}           style={{ ...BTN_DANGER, textDecoration: "none", display: "inline-block" }}>Remove from Demonstration</Link>
                <Link to={`/app/settings/signatures/${entry.id}`} style={{ ...GF, fontSize: 13, color: AZURE, textDecoration: "none", paddingTop: 6 }}>← Back to entry</Link>
              </div>
            </>
          )}

          {/* Specific action forms */}
          {action !== "choose" && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                <h2 style={{ ...GF, fontSize: 15, fontWeight: 800, color: NAVY, margin: 0 }}>
                  {actionLabels[action]}
                </h2>
                <Link to="?" style={{ ...GF, fontSize: 13, color: AZURE, textDecoration: "none" }}>← All actions</Link>
              </div>

              {action === "rename"       && <RenameForm   entry={entry} onDone={updated => { setEntry(updated); navToDetail(); }} />}
              {action === "replace"      && <ReplaceForm  entry={entry} onDone={updated => { setEntry(updated); navToDetail(); }} />}
              {action === "set-default"  && <SetDefaultPanel entry={entry} onDone={updated => { setEntry(updated); navToDetail(); }} />}
              {action === "archive"      && <ArchivePanel  entry={entry} onDone={navToLib} />}
              {action === "restore"      && <RestorePanel  entry={entry} onDone={updated => { setEntry(updated); navToDetail(); }} />}
              {action === "remove"       && <RemovePanel   entry={entry} onDone={navToLib} />}
            </>
          )}
        </SCard>
      )}
    </SettingsPage>
  );
}

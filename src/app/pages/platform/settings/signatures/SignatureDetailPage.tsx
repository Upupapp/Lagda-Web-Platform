// /app/settings/signatures/:signatureId — View one library entry.
// Personal to the current authenticated user only.
// No raw stroke data. No identity verification claims. No eNotary. No Burgundy.

import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  SettingsPage, SCard, DEMO_NOTICE, BTN_SECONDARY, BTN_DANGER, Skeleton, StatusBadge,
} from "../SettingsShell";
import { signatureLibraryService } from "../../../../services/mock/signature-library.service";
import { TYPED_SIGNATURE_STYLES } from "../../../../models/recipient";
import type { SignatureLibraryEntry, SignatureLibraryEntryId } from "../../../../models/signature-library";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SLATE  = "#64748B";
const SILVER = "#8A9BAE";
const GOLD   = "#C9960C";
const GREEN  = "#16A34A";
const AMBER  = "#D97706";
const RED    = "#DC2626";

// ── Preview ───────────────────────────────────────────────────────────────────

function EntryPreview({ entry }: { entry: SignatureLibraryEntry }) {
  const rep = entry.representation;
  if (rep.method === "typed") {
    const style = TYPED_SIGNATURE_STYLES[rep.styleIndex] ?? TYPED_SIGNATURE_STYLES[0];
    return (
      <div
        aria-label={`${entry.kind === "signature" ? "Signature" : "Initials"} preview: ${rep.typedText}`}
        style={{
          width: "100%", minHeight: 80, maxHeight: 120,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#FAFBFC", border: "1px solid #E3E8EF", borderRadius: 10, overflow: "hidden",
        }}
      >
        <span style={{
          fontFamily: style.fontFamily, fontSize: style.fontSize,
          fontStyle:  style.fontStyle,  color: NAVY, padding: "8px 24px",
          textAlign: "center", wordBreak: "break-word",
        }}>
          {rep.typedText}
        </span>
      </div>
    );
  }
  if (rep.method === "drawn" && rep.dataUrl) {
    return (
      <div style={{ width: "100%", height: 100, border: "1px solid #E3E8EF", borderRadius: 10, overflow: "hidden", background: "#FAFBFC" }}>
        <img
          src={rep.dataUrl}
          alt={`${entry.kind === "signature" ? "Signature" : "Initials"} preview`}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
    );
  }
  return (
    <div
      aria-label="No preview available"
      style={{
        width: "100%", height: 80, border: "1.5px dashed #D1D9E0", borderRadius: 10,
        background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <span style={{ ...GF, fontSize: 13, color: SILVER }}>Preview unavailable</span>
    </div>
  );
}

// ── Meta row ──────────────────────────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
      <div style={{ ...GF, fontSize: 12, fontWeight: 600, color: SILVER, flex: "0 0 140px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ ...GF, fontSize: 13, color: NAVY, flex: 1 }}>
        {value}
      </div>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}

// ── Confirm remove dialog ─────────────────────────────────────────────────────

function ConfirmRemoveDialog({
  entry,
  onConfirm,
  onCancel,
}: { entry: SignatureLibraryEntry; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Remove from Demonstration"
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(7,17,31,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E3E8EF", padding: 28, maxWidth: 440, width: "100%", boxShadow: "0 8px 32px rgba(7,17,31,0.12)" }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ ...GF, fontSize: 16, fontWeight: 800, color: NAVY, margin: "0 0 10px" }}>
          Remove from Demonstration?
        </h2>
        <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 10px" }}>
          This removes <strong>{entry.displayName}</strong> from your frontend demonstration library. This only changes the current in-memory state — it does not delete any backend data, because no backend is connected.
        </p>
        <p style={{ ...GF, fontSize: 12, color: SILVER, margin: "0 0 20px" }}>
          To keep this entry but stop it from appearing in selection, consider archiving it instead.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ ...BTN_SECONDARY, flex: "0 0 auto" }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ ...GF, fontSize: 13, fontWeight: 700, padding: "9px 20px", border: "none", borderRadius: 8, background: RED, color: "#FFFFFF", cursor: "pointer", flex: 1 }}>
            Remove from Demonstration
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function SignatureDetailPage() {
  const { signatureId } = useParams<{ signatureId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading]     = useState(true);
  const [entry, setEntry]         = useState<SignatureLibraryEntry | null>(null);
  const [notFound, setNotFound]   = useState(false);
  const [notice, setNotice]       = useState<string | null>(null);
  const [busy, setBusy]           = useState(false);
  const [showRemove, setShowRemove] = useState(false);

  function load() {
    if (!signatureId) { setNotFound(true); setLoading(false); return; }
    const result = signatureLibraryService.getEntry(signatureId as SignatureLibraryEntryId);
    if (result.ok) {
      setEntry(result.data);
    } else {
      setNotFound(true);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [signatureId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSetDefault() {
    if (!entry) return;
    setBusy(true);
    const result = signatureLibraryService.setDefault(entry.id);
    if (result.ok) { setEntry(result.data); setNotice("Default updated."); }
    else { setNotice("Could not update default."); }
    setBusy(false);
  }

  function handleArchive() {
    if (!entry) return;
    setBusy(true);
    const result = signatureLibraryService.archive(entry.id);
    if (result.ok) { setEntry(result.data); setNotice("Entry archived."); }
    else { setNotice("Could not archive entry."); }
    setBusy(false);
  }

  function handleRestore() {
    if (!entry) return;
    setBusy(true);
    const result = signatureLibraryService.restore(entry.id);
    if (result.ok) { setEntry(result.data); setNotice("Entry restored."); }
    else { setNotice("Could not restore entry."); }
    setBusy(false);
  }

  function handleRemove() {
    if (!entry) return;
    const result = signatureLibraryService.remove(entry.id);
    if (result.ok) { navigate("/app/settings/signatures", { replace: true }); }
    else { setNotice("Could not remove entry."); setShowRemove(false); }
  }

  // ── Not found ────────────────────────────────────────────────────────────────

  if (!loading && notFound) {
    return (
      <SettingsPage title="Entry Not Found" breadcrumb="Signatures and Initials › Not Found">
        <SCard style={{ textAlign: "center", padding: "32px 24px" }}>
          <div style={{ ...GF, fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Entry Not Found</div>
          <p style={{ ...GF, fontSize: 13, color: SLATE, marginBottom: 20 }}>
            This signature or initials entry could not be found. It may have been removed.
          </p>
          <Link to="/app/settings/signatures" style={{ ...BTN_SECONDARY, textDecoration: "none", display: "inline-block" }}>
            ← Return to Signatures and Initials
          </Link>
        </SCard>
      </SettingsPage>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  const kindLabel   = entry?.kind === "signature" ? "Signature" : "Initials";
  const title       = entry?.displayName ? `${entry.displayName} — ${kindLabel}` : "Signature Details";
  const breadcrumb  = `Signatures and Initials › ${entry?.displayName ?? "Details"}`;
  const isDefault   = entry?.defaultState !== "non-default";
  const isArchived  = entry?.status === "archived";
  const isInvalid   = entry?.status === "invalid";
  const isActive    = entry?.status === "active";

  return (
    <SettingsPage title={title} breadcrumb={breadcrumb}>
      {DEMO_NOTICE}

      {notice && (
        <div role="status" aria-live="polite" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "8px 14px", marginBottom: 14, ...GF, fontSize: 12, color: "#15803D", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", ...GF, fontSize: 14, color: "#15803D" }}>×</button>
        </div>
      )}

      {loading && <SCard><Skeleton h={80} mb={12} /><Skeleton h={48} mb={10} /><Skeleton h={48} /></SCard>}

      {!loading && entry && (
        <>
          {/* Preview */}
          <SCard>
            <div style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <h2 style={{ ...GF, fontSize: 15, fontWeight: 800, color: NAVY, margin: 0 }}>{entry.displayName}</h2>
              {isDefault && <StatusBadge label={entry.kind === "signature" ? "Default Signature" : "Default Initials"} color={GOLD} />}
            </div>
            <EntryPreview entry={entry} />
          </SCard>

          {/* Metadata */}
          <SCard>
            <h2 style={{ ...GF, fontSize: 12, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>
              Entry Details
            </h2>
            <MetaRow label="Kind"   value={<StatusBadge label={entry.kind === "signature" ? "Signature" : "Initials"} color={AZURE} />} />
            <MetaRow label="Method" value={entry.representation.method === "typed" ? "Typed" : "Drawn"} />
            <MetaRow label="Status" value={
              <StatusBadge
                label={isActive ? "Active" : isArchived ? "Archived" : "Invalid"}
                color={isActive ? GREEN : isArchived ? AMBER : RED}
              />
            } />
            <MetaRow label="Default" value={isDefault ? `Yes — ${entry.kind === "signature" ? "Default Signature" : "Default Initials"}` : "No"} />
            <MetaRow label="Created" value={formatDate(entry.createdAt)} />
            <MetaRow label="Updated" value={formatDate(entry.updatedAt)} />
          </SCard>

          {/* Usage summary — labeled as demonstration data */}
          <SCard>
            <h2 style={{ ...GF, fontSize: 12, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>
              Usage <span style={{ fontSize: 10, color: AMBER, fontWeight: 600 }}>(demonstration data only)</span>
            </h2>
            <MetaRow label="Demonstrations" value={`Used in ${entry.usageSummary.demonstrationUseCount} signing demonstration${entry.usageSummary.demonstrationUseCount !== 1 ? "s" : ""}`} />
            <MetaRow label="Last selected"  value={formatDate(entry.usageSummary.lastSelectedAt)} />
            <MetaRow label="Common role"    value={entry.usageSummary.commonRole ?? "—"} />
            <p style={{ ...GF, fontSize: 11, color: SILVER, margin: "8px 0 0" }}>
              Usage history is fictional demonstration data. It does not represent real transaction records.
            </p>
          </SCard>

          {/* Invalid state guidance */}
          {isInvalid && (
            <SCard style={{ border: "1.5px solid #FECACA" }}>
              <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: RED, marginBottom: 6 }}>
                This entry is unavailable.
              </div>
              <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 14px" }}>
                The representation for this entry is missing or unsupported. You can replace it or remove it from the demonstration.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <Link to={`/app/settings/signatures/${entry.id}/edit?action=replace`} style={{ ...BTN_SECONDARY, textDecoration: "none", display: "inline-block" }}>
                  Replace
                </Link>
                <button onClick={() => setShowRemove(true)} style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 20px", border: "1.5px solid #FECACA", borderRadius: 8, background: "#FEF2F2", color: RED, cursor: "pointer" }}>
                  Remove
                </button>
              </div>
            </SCard>
          )}

          {/* Actions */}
          {!isInvalid && (
            <SCard>
              <h2 style={{ ...GF, fontSize: 12, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>
                Actions
              </h2>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {isActive && (
                  <>
                    <Link to={`/app/settings/signatures/${entry.id}/edit?action=rename`}   style={{ ...BTN_SECONDARY, textDecoration: "none", display: "inline-block" }}>Rename</Link>
                    <Link to={`/app/settings/signatures/${entry.id}/edit?action=replace`}  style={{ ...BTN_SECONDARY, textDecoration: "none", display: "inline-block" }}>Replace</Link>
                    {!isDefault && (
                      <button onClick={handleSetDefault} disabled={busy} style={{ ...BTN_SECONDARY, cursor: busy ? "not-allowed" : "pointer" }}>
                        {busy ? "Updating…" : `Set as Default ${kindLabel}`}
                      </button>
                    )}
                    <button onClick={handleArchive} disabled={busy} style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 20px", border: "1.5px solid #FDE68A", borderRadius: 8, background: "#FFFBEB", color: AMBER, cursor: busy ? "not-allowed" : "pointer" }}>
                      Archive
                    </button>
                  </>
                )}

                {isArchived && (
                  <>
                    <button onClick={handleRestore} disabled={busy} style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 20px", border: "1.5px solid #BBF7D0", borderRadius: 8, background: "#F0FDF4", color: GREEN, cursor: busy ? "not-allowed" : "pointer" }}>
                      {busy ? "Restoring…" : "Restore"}
                    </button>
                  </>
                )}

                <button onClick={() => setShowRemove(true)} style={{ ...BTN_DANGER }}>
                  Remove from Demonstration
                </button>
              </div>
            </SCard>
          )}

          {/* Privacy and legal notices */}
          <SCard style={{ background: "#F8FAFC" }}>
            <div style={{ ...GF, fontSize: 12, color: SLATE, lineHeight: 1.7 }}>
              <strong>Personal and private.</strong> This entry is visible only to you. Workspace Administrators and other members cannot view your signature representations.
              <br />
              <strong>Frontend demonstration only.</strong> This entry is not persisted to a backend. It resets on page reload. No data is uploaded, encrypted, or synchronized.
              <br />
              <strong>No identity verification.</strong> A reusable signature representation does not independently verify identity or determine the legal effect of any document. Explicit adoption is required for each signing request.
            </div>
          </SCard>

          <div style={{ padding: "4px 0" }}>
            <Link to="/app/settings/signatures" style={{ ...GF, fontSize: 13, color: AZURE, textDecoration: "none" }}>
              ← Signatures and Initials
            </Link>
          </div>
        </>
      )}

      {showRemove && entry && (
        <ConfirmRemoveDialog entry={entry} onConfirm={handleRemove} onCancel={() => setShowRemove(false)} />
      )}
    </SettingsPage>
  );
}

// /app/settings/signatures — Signature and Initials Library overview.
// Personal to the current authenticated user.
// No Burgundy. No eNotary. No biometric claims. No identity verification claims.
// All entries are frontend demonstration state only.

import React, { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import {
  SettingsPage, SCard, DEMO_NOTICE, BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER,
  Skeleton, StatusBadge,
} from "../SettingsShell";
import { signatureLibraryService } from "../../../../services/mock/signature-library.service";
import { TYPED_SIGNATURE_STYLES } from "../../../../models/recipient";
import type {
  SignatureLibraryEntry,
  SignatureLibraryEntryId,
  SignatureLibraryEntryKind,
} from "../../../../models/signature-library";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SLATE  = "#64748B";
const SILVER = "#8A9BAE";
const GOLD   = "#C9960C";
const GREEN  = "#16A34A";
const AMBER  = "#D97706";
const RED    = "#DC2626";

type ViewFilter = "all" | "signatures" | "initials" | "archived";

// ── Shared preview renderer ───────────────────────────────────────────────────

function EntryPreview({
  entry, width = 200, height = 56,
}: { entry: SignatureLibraryEntry; width?: number; height?: number }) {
  const rep = entry.representation;
  if (rep.method === "typed") {
    const style = TYPED_SIGNATURE_STYLES[rep.styleIndex] ?? TYPED_SIGNATURE_STYLES[0];
    return (
      <div
        aria-label={`${entry.kind === "signature" ? "Signature" : "Initials"} preview: ${rep.typedText}`}
        style={{
          width, height,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#FAFBFC", border: "1px solid #E3E8EF", borderRadius: 6, overflow: "hidden",
        }}
      >
        <span style={{
          fontFamily: style?.fontFamily,
          fontSize: style ? Math.min(style.fontSize * 0.75, 18) : 18,
          fontStyle:  style?.fontStyle,
          color: NAVY, padding: "4px 8px", textAlign: "center", wordBreak: "break-word",
        }}>
          {rep.typedText}
        </span>
      </div>
    );
  }
  if (rep.method === "drawn" && rep.dataUrl) {
    return (
      <div style={{ width, height, border: "1px solid #E3E8EF", borderRadius: 6, overflow: "hidden", background: "#FAFBFC" }}>
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
        width, height, border: "1.5px dashed #D1D9E0", borderRadius: 6,
        background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <span style={{ ...GF, fontSize: 11, color: SILVER }}>Unavailable</span>
    </div>
  );
}

// ── Entry card ────────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  onSetDefault,
  onArchive,
  onRestore,
  busy,
}: {
  entry:        SignatureLibraryEntry;
  onSetDefault: (id: SignatureLibraryEntryId) => void;
  onArchive:    (id: SignatureLibraryEntryId) => void;
  onRestore:    (id: SignatureLibraryEntryId) => void;
  busy:         SignatureLibraryEntryId | null;
}) {
  const isDefault  = entry.defaultState !== "non-default";
  const isArchived = entry.status === "archived";
  const isInvalid  = entry.status === "invalid";
  const isBusy     = busy === entry.id;

  const methodLabel = entry.representation.method === "typed" ? "Typed" : "Drawn";

  let statusColor = GREEN;
  let statusLabel = "Active";
  if (isArchived) { statusColor = AMBER; statusLabel = "Archived"; }
  if (isInvalid)  { statusColor = RED;   statusLabel = "Invalid";  }

  return (
    <article
      aria-label={`${entry.displayName} — ${entry.kind}`}
      style={{
        background: "#FFFFFF",
        border: `1.5px solid ${isDefault ? "#FDE68A" : "#E3E8EF"}`,
        borderRadius: 10,
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        position: "relative",
      }}
    >
      {isDefault && (
        <div style={{
          position: "absolute", top: 10, right: 10,
          ...GF, fontSize: 10, fontWeight: 700, color: GOLD,
          background: "#FFFBEB", border: "1px solid #FDE68A",
          borderRadius: 999, padding: "2px 8px",
        }}>
          Default
        </div>
      )}

      <EntryPreview entry={entry} width={180} height={50} />

      <div>
        <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4, paddingRight: 60 }}>
          {entry.displayName}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <StatusBadge label={entry.kind === "signature" ? "Signature" : "Initials"} color={AZURE} />
          <StatusBadge label={methodLabel} color={SLATE} />
          <StatusBadge label={statusLabel} color={statusColor} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
        {!isArchived && !isInvalid && (
          <Link
            to={`/app/settings/signatures/${entry.id}`}
            style={{ ...GF, fontSize: 12, fontWeight: 600, color: AZURE, textDecoration: "none", border: `1px solid ${AZURE}`, borderRadius: 6, padding: "5px 10px" }}
          >
            View
          </Link>
        )}

        {!isArchived && !isInvalid && !isDefault && (
          <button
            onClick={() => onSetDefault(entry.id)}
            disabled={isBusy}
            style={{ ...GF, fontSize: 12, fontWeight: 500, color: SLATE, background: "#F5F7FA", border: "1px solid #E3E8EF", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}
          >
            {isBusy ? "Setting…" : "Set as Default"}
          </button>
        )}

        {!isArchived && (
          <button
            onClick={() => onArchive(entry.id)}
            disabled={isBusy}
            style={{ ...GF, fontSize: 12, fontWeight: 500, color: AMBER, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}
          >
            Archive
          </button>
        )}

        {isArchived && (
          <button
            onClick={() => onRestore(entry.id)}
            disabled={isBusy}
            style={{ ...GF, fontSize: 12, fontWeight: 500, color: GREEN, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}
          >
            Restore
          </button>
        )}

        <Link
          to={`/app/settings/signatures/${entry.id}`}
          style={{ ...GF, fontSize: 12, fontWeight: 500, color: SLATE, textDecoration: "none", background: "#F5F7FA", border: "1px solid #E3E8EF", borderRadius: 6, padding: "5px 10px" }}
        >
          Edit
        </Link>
      </div>
    </article>
  );
}

// ── Default summary strip ─────────────────────────────────────────────────────

function DefaultStrip({ kind, entry }: { kind: SignatureLibraryEntryKind; entry: SignatureLibraryEntry | null }) {
  const label = kind === "signature" ? "Default Signature" : "Default Initials";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      background: "#FAFBFC", border: "1px solid #E3E8EF",
      borderRadius: 8, padding: "10px 14px",
    }}>
      <div style={{ flex: "0 0 auto" }}>
        {entry ? (
          <EntryPreview entry={entry} width={80} height={36} />
        ) : (
          <div style={{ width: 80, height: 36, border: "1.5px dashed #D1D9E0", borderRadius: 6, background: "#F8FAFC" }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...GF, fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
          {label}
        </div>
        {entry ? (
          <div style={{ ...GF, fontSize: 13, color: NAVY, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {entry.displayName}
            <span style={{ ...GF, fontSize: 11, color: SLATE, fontWeight: 400, marginLeft: 6 }}>
              ({entry.representation.method === "typed" ? "Typed" : "Drawn"})
            </span>
          </div>
        ) : (
          <div style={{ ...GF, fontSize: 13, color: SILVER }}>
            No default set —{" "}
            <Link
              to={`/app/settings/signatures/new?kind=${kind}`}
              style={{ color: AZURE, textDecoration: "none", fontWeight: 600 }}
            >
              Create one
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptySection({ kind, view }: { kind: SignatureLibraryEntryKind; view: ViewFilter }) {
  if (view === "archived") {
    return (
      <div style={{ textAlign: "center", padding: "24px 0", ...GF, fontSize: 13, color: SILVER }}>
        No archived entries.
      </div>
    );
  }
  const label = kind === "signature" ? "signature" : "initials";
  return (
    <div style={{ textAlign: "center", padding: "28px 0", border: "1.5px dashed #D1D9E0", borderRadius: 10 }}>
      <div style={{ ...GF, fontSize: 14, color: SLATE, marginBottom: 8 }}>
        No {label} entries yet.
      </div>
      <div style={{ ...GF, fontSize: 12, color: SILVER, marginBottom: 14 }}>
        You can still use a one-time signature when signing a document.
      </div>
      <Link
        to={`/app/settings/signatures/new?kind=${kind}`}
        style={{ ...BTN_PRIMARY, textDecoration: "none", display: "inline-block" }}
      >
        Create {kind === "signature" ? "Signature" : "Initials"}
      </Link>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function SignaturesLibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawView = searchParams.get("view") ?? "all";
  const view: ViewFilter = (["all", "signatures", "initials", "archived"] as ViewFilter[]).includes(rawView as ViewFilter)
    ? rawView as ViewFilter
    : "all";

  const [loading, setLoading]   = useState(true);
  const [entries, setEntries]   = useState<SignatureLibraryEntry[]>([]);
  const [error, setError]       = useState<string | null>(null);
  const [busy, setBusy]         = useState<SignatureLibraryEntryId | null>(null);
  const [notice, setNotice]     = useState<string | null>(null);

  const loadLibrary = useCallback(() => {
    setLoading(true);
    setError(null);
    const result = signatureLibraryService.getLibrary();
    if (result.ok) {
      setEntries(result.data);
    } else {
      setError("The Signature Library is temporarily unavailable.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadLibrary(); }, [loadLibrary]);

  const activeSignatures = entries.filter(e => e.status === "active" && e.kind === "signature");
  const activeInitials   = entries.filter(e => e.status === "active" && e.kind === "initials");
  const archived         = entries.filter(e => e.status === "archived");
  const defaultSig       = entries.find(e => e.defaultState === "default-signature" && e.status === "active") ?? null;
  const defaultInit      = entries.find(e => e.defaultState === "default-initials"  && e.status === "active") ?? null;

  function showSig()  { return view === "all" || view === "signatures"; }
  function showInit() { return view === "all" || view === "initials"; }
  function showArch() { return view === "archived"; }

  const handleSetDefault = useCallback((id: SignatureLibraryEntryId) => {
    setBusy(id);
    const result = signatureLibraryService.setDefault(id);
    if (result.ok) {
      loadLibrary();
      setNotice("Default updated.");
    } else {
      setNotice("Could not update default. Please try again.");
    }
    setBusy(null);
  }, [loadLibrary]);

  const handleArchive = useCallback((id: SignatureLibraryEntryId) => {
    setBusy(id);
    const result = signatureLibraryService.archive(id);
    if (result.ok) {
      loadLibrary();
      setNotice("Entry archived.");
    } else {
      setNotice("Could not archive entry.");
    }
    setBusy(null);
  }, [loadLibrary]);

  const handleRestore = useCallback((id: SignatureLibraryEntryId) => {
    setBusy(id);
    const result = signatureLibraryService.restore(id);
    if (result.ok) {
      loadLibrary();
      setNotice("Entry restored to active.");
    } else {
      setNotice("Could not restore entry.");
    }
    setBusy(null);
  }, [loadLibrary]);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    ...GF, fontSize: 13, fontWeight: active ? 700 : 400,
    color: active ? AZURE : SLATE,
    background: active ? "#EBF4FC" : "transparent",
    border: `1.5px solid ${active ? AZURE : "#E3E8EF"}`,
    borderRadius: 6, padding: "6px 14px", cursor: "pointer",
  });

  return (
    <SettingsPage title="Signatures and Initials" breadcrumb="Signatures and Initials">
      {DEMO_NOTICE}

      {/* Notice strip */}
      <div role="note" style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 8, padding: "8px 14px", marginBottom: 18, ...GF, fontSize: 12, color: "#0369A1" }}>
        Signature and initials entries are retained only in frontend demonstration state. They are not uploaded, encrypted, synchronized, or stored by a backend.
        A reusable signature representation does not independently verify identity or determine the legal effect of a document.
      </div>

      {/* Inline notice */}
      {notice && (
        <div role="status" aria-live="polite" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "8px 14px", marginBottom: 14, ...GF, fontSize: 12, color: "#15803D", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", ...GF, fontSize: 14, color: "#15803D" }}>×</button>
        </div>
      )}

      {/* View filter tabs */}
      <div role="tablist" aria-label="Filter entries" style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {(["all", "signatures", "initials", "archived"] as ViewFilter[]).map(v => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => setSearchParams(v === "all" ? {} : { view: v })}
            style={tabStyle(view === v)}
          >
            {v === "all" ? "All" : v === "signatures" ? "Signatures" : v === "initials" ? "Initials" : "Archived"}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <SCard style={{ border: "1.5px solid #FECACA" }}>
          <div style={{ ...GF, fontSize: 14, color: RED, marginBottom: 10 }}>{error}</div>
          <button onClick={loadLibrary} style={BTN_SECONDARY}>Retry</button>
        </SCard>
      )}

      {/* Loading state */}
      {loading && !error && (
        <SCard>
          <Skeleton h={56} mb={12} />
          <Skeleton h={120} mb={10} />
          <Skeleton h={120} />
        </SCard>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Defaults summary */}
          {(view === "all" || view === "signatures" || view === "initials") && (
            <SCard>
              <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>
                Current Defaults
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                {(view === "all" || view === "signatures") && (
                  <DefaultStrip kind="signature" entry={defaultSig} />
                )}
                {(view === "all" || view === "initials") && (
                  <DefaultStrip kind="initials"   entry={defaultInit} />
                )}
              </div>
              <p style={{ ...GF, fontSize: 11, color: SILVER, marginTop: 10, marginBottom: 0 }}>
                A default is suggested during signing but you must still explicitly adopt it for each request.
              </p>
            </SCard>
          )}

          {/* Signatures section */}
          {showSig() && (
            <SCard>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                  Signatures
                </h2>
                <Link to="/app/settings/signatures/new?kind=signature" style={{ ...BTN_PRIMARY, textDecoration: "none", fontSize: 12, padding: "7px 14px" }}>
                  + Create Signature
                </Link>
              </div>

              {activeSignatures.length === 0 ? (
                <EmptySection kind="signature" view={view} />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {activeSignatures.map(e => (
                    <EntryCard
                      key={e.id} entry={e}
                      onSetDefault={handleSetDefault} onArchive={handleArchive} onRestore={handleRestore}
                      busy={busy}
                    />
                  ))}
                </div>
              )}
            </SCard>
          )}

          {/* Initials section */}
          {showInit() && (
            <SCard>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                  Initials
                </h2>
                <Link to="/app/settings/signatures/new?kind=initials" style={{ ...BTN_PRIMARY, textDecoration: "none", fontSize: 12, padding: "7px 14px" }}>
                  + Create Initials
                </Link>
              </div>
              <p style={{ ...GF, fontSize: 11, color: SLATE, marginTop: -8, marginBottom: 12 }}>
                Initials are only required when a document includes Initials fields.
              </p>

              {activeInitials.length === 0 ? (
                <EmptySection kind="initials" view={view} />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {activeInitials.map(e => (
                    <EntryCard
                      key={e.id} entry={e}
                      onSetDefault={handleSetDefault} onArchive={handleArchive} onRestore={handleRestore}
                      busy={busy}
                    />
                  ))}
                </div>
              )}
            </SCard>
          )}

          {/* Archived section */}
          {showArch() && (
            <SCard>
              <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>
                Archived
              </h2>
              {archived.length === 0 ? (
                <EmptySection kind="signature" view="archived" />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {archived.map(e => (
                    <EntryCard
                      key={e.id} entry={e}
                      onSetDefault={handleSetDefault} onArchive={handleArchive} onRestore={handleRestore}
                      busy={busy}
                    />
                  ))}
                </div>
              )}
            </SCard>
          )}

          {/* Invalid entries hidden from normal view but noted */}
          {view === "all" && entries.some(e => e.status === "invalid") && (
            <div role="note" style={{ ...GF, fontSize: 11, color: AMBER, padding: "8px 14px", border: "1px solid #FDE68A", borderRadius: 8 }}>
              Some entries are unavailable and cannot be used for signing. Visit the entry to Replace or Remove it.{" "}
              {entries.filter(e => e.status === "invalid").map(e => (
                <Link key={e.id} to={`/app/settings/signatures/${e.id}`} style={{ color: AZURE, textDecoration: "none", fontWeight: 600, marginLeft: 4 }}>
                  {e.displayName}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </SettingsPage>
  );
}

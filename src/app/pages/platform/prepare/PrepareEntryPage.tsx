import { ON_LIGHT } from "../../../utils/on-light";
// Entry screen for the guided preparation workflow at /app/prepare.
// Shows three paths: Start with Files, Use a Template, Resume a Draft.
// Permission gate: users without prepareFlowEnabled see a plan-upgrade notice.
// Burgundy (#67023B) is NEVER used here. eNotary is NEVER mentioned.

import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { usePrepare } from "../../../context/PrepareContext";
import { usePlatform } from "../../../context/PlatformContext";
import { usePendingPreparation } from "../../../context/PendingPreparationContext";
import { useProcessing } from "../../../services/processing.service";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import { useDraftList } from "../../../hooks/useDraftList";
import {
  UnfinishedDraftDialog, type UnfinishedDraftChoice,
} from "../../../components/prepare/UnfinishedDraftDialog";
import {
  isDraftEmpty, draftServerDocumentIds, draftDisplayTitle, draftDeleteErrorMessage,
} from "../../../services/prepare/unfinished-draft";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = ON_LIGHT.muted;

/** "8 Oct 2026, 2:15 pm": when a draft last changed. Empty if unreadable. */
export function draftChangedLabel(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return at.toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

// DraftCard and TemplateCard removed with the fixtures they rendered. Real
// drafts are listed inline below, from the same list Documents › Draft shows.
export function PrepareEntryPage() {
  const navigate  = useNavigate();
  const [params]  = useSearchParams();
  const platform = usePlatform();
  const { hasFlag } = platform;
  const { claimPending } = usePendingPreparation();
  const { createDraft, draft, deleteDraftEverywhere, saveTitle } = usePrepare();

  // Real drafts: everything unfinished the server holds.
  //
  // The SAME list Documents › Draft shows (services/documents/draft-list.ts):
  // the documents uploaded and prepared but never sent, as well as the
  // requests made and not sent yet. This page used to list only the second
  // kind, so a draft could be in Documents and missing here.
  //
  // A failed read leaves the list empty. Showing nothing is honest, and an
  // error about drafts would bury this page's actual purpose, which is
  // starting a new one.
  const realDrafts = useDraftList(platform.currentWorkspace?.id);

  const canPrepare = hasFlag("prepareFlowEnabled");
  const resumeId = params.get("resumeId");
  const { run: runProcessing } = useProcessing();
  const [resuming, setResuming] = useState(!!resumeId);
  const [resumeFailed, setResumeFailed] = useState(false);

  // Resuming a document selected before authentication. claimPending() only
  // returns a match when this exact resumeId was issued for it — a stale
  // selection left behind by a different, never-completed sign-in cannot be
  // picked up here just because something is technically still pending.
  useEffect(() => {
    if (!canPrepare || !resumeId) {
      setResuming(false);
      return;
    }
    const claimed = claimPending(resumeId);
    if (!claimed) {
      // Persisted with a bounded lifetime (see PendingPreparationContext),
      // but still not guaranteed: it may have expired, been claimed already,
      // been discarded, or never existed on this browser at all (a
      // different device, private browsing, cleared site data). Any of
      // those is expected, not an error; the visitor just re-selects the file.
      setResumeFailed(true);
      setResuming(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const draftId = await createDraft({
        source: "public-upload",
        initialFiles: claimed.files,
        initialTitle: claimed.title,
      });
      if (cancelled) return;
      if (draftId) {
        void navigate("/app/prepare/upload", { replace: true });
      } else {
        setResuming(false);
      }
    })();
    return () => { cancelled = true; };
    // Deliberately excludes claimPending/createDraft: this must run once for
    // this resumeId, not re-run when those callbacks are recreated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPrepare, resumeId]);

  // One start at a time: a second press while the first is still creating its
  // draft would make two.
  const startingRef = useRef(false);
  const [starting, setStarting] = useState(false);
  const startNew = async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    try {
      const draftId = await runProcessing(
        { message: "Starting a new preparation", detail: "Creating your draft." },
        async () => createDraft({ source: "new" }),
      );
      if (draftId) {
        void navigate("/app/prepare/upload");
      }
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  };

  // ── An unfinished draft is asked about before it is replaced ────────────────
  //
  // There is one draft slot, and "Start preparation" used to replace whatever
  // was in it without a word. A draft with anything in it (a file, a
  // participant or a title) is now asked about first. The demo build keeps
  // nothing on a server and behaves as it always did.
  const [asking, setAsking] = useState(false);
  const [askBusy, setAskBusy] = useState<UnfinishedDraftChoice | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  const handleStartNew = () => {
    if (startingRef.current) return;
    if (USE_REAL_BACKEND && draft !== null && !isDraftEmpty(draft)) {
      setAskError(null);
      setAsking(true);
      return;
    }
    void startNew();
  };

  const handleUnfinishedChoice = (choice: UnfinishedDraftChoice) => {
    if (askBusy !== null) return;
    if (choice === "continue") {
      setAsking(false);
      void navigate("/app/prepare/upload");
      return;
    }
    setAskBusy(choice);
    setAskError(null);
    void (async () => {
      try {
        // "Discard" deletes it on the server first and stops here if that
        // fails, with the draft kept. "Keep" leaves the server alone (a title
        // typed a moment ago is saved to it, best effort): only this
        // browser's slot is replaced.
        if (choice === "discard") await deleteDraftEverywhere();
        else await saveTitle();
      } catch (err) {
        setAskError(draftDeleteErrorMessage(err));
        setAskBusy(null);
        return;
      }
      setAsking(false);
      setAskBusy(null);
      await startNew();
    })();
  };

  // ── Resuming a pre-auth document selection ──────────────────────────────────

  if (resuming) {
    return (
      <div style={{ ...GF, maxWidth: 480, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }} aria-hidden="true">📄</div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: NAVY, marginBottom: 8 }}>
          Continuing your document…
        </h1>
        <p style={{ fontSize: 13, color: SILVER, margin: 0 }} role="status" aria-live="polite">
          Bringing the document you selected into your workspace.
        </p>
      </div>
    );
  }

  // ── Permission gate ───────────────────────────────────────────────────────

  if (!canPrepare) {
    return (
      <div style={{ ...GF, maxWidth: 540, margin: "60px auto", padding: "0 24px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }} aria-hidden="true">📄</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 12 }}>
          Prepare Document is not available on your current plan
        </h1>
        <p style={{ fontSize: 14, color: SILVER, lineHeight: 1.7, marginBottom: 28 }}>
          The guided preparation workflow — file selection, participant management, routing,
          authentication, and settings — is available on eligible LAGDA plans. Contact your
          workspace administrator or upgrade to unlock this feature.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link
            to="/app/documents"
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: `1px solid #D1D9E0`,
              background: "#FFFFFF",
              color: NAVY,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Back to Documents
          </Link>
        </div>
      </div>
    );
  }

  // ── Entry screen ──────────────────────────────────────────────────────────

  return (
    <div style={{ ...GF, maxWidth: 680, margin: "0 auto" }}>
      {resumeFailed && (
        <div
          role="status"
          style={{
            ...GF, marginBottom: 24, padding: "12px 16px", borderRadius: 10,
            background: "#FEF9EC", border: "1px solid #F0D07A", fontSize: 13, color: "#8A6A16",
          }}
        >
          We couldn't bring over the document you selected earlier — please choose it again below.
        </div>
      )}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: NAVY, margin: "0 0 8px" }}>
          Prepare a Document
        </h1>
        <p style={{ fontSize: 14, color: SILVER, margin: 0, lineHeight: 1.6 }}>
          Prepare your document, add participants and their order, choose settings, place fields,
          then review authentication and authorize sending.
        </p>
      </div>

      {/* Primary action */}
      <div
        style={{
          border: `2px solid ${AZURE}`,
          borderRadius: 12,
          padding: "28px 28px 24px",
          marginBottom: 32,
          background: "#F0F7FF",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: AZURE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            📄
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: NAVY, margin: "0 0 6px" }}>
              Start with files from your computer
            </h2>
            <p style={{ fontSize: 13, color: "#4B5E70", margin: "0 0 16px", lineHeight: 1.6 }}>
              Select one or more PDF or Word documents. They are uploaded to
              your workspace and scanned before anyone is invited to sign.
            </p>
            <button
              onClick={handleStartNew}
              disabled={starting}
              style={{
                ...GF,
                minHeight: 44,
                padding: "11px 28px",
                borderRadius: 8,
                border: "none",
                background: AZURE,
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 700,
                cursor: starting ? "not-allowed" : "pointer",
                opacity: starting ? 0.7 : 1,
              }}
            >
              Start preparation →
            </button>
          </div>
        </div>
      </div>

      {/* Templates removed with their fixtures.
          *
          * They offered "Use template" for templates that exist on no server.
          * On a page that now really uploads files and really sends
          * invitations, an invented starting point is no longer a harmless
          * placeholder. They return when a template API is behind them. */}

      {/* Resume a draft — the same drafts Documents › Draft shows, the one
          * most recently changed first.
          *
          * Resuming reopens preparation against that same backend document
          * rather than starting a second one beside it. */}
      {realDrafts.length > 0 && (
        <section aria-labelledby="prep-resume-heading" style={{ marginBottom: 36 }}>
          <h2 id="prep-resume-heading" style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: "0 0 14px" }}>
            Resume a draft
          </h2>
          <ul data-testid="prep-resume-list" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {realDrafts.map(item => {
              const changed = draftChangedLabel(item.changedAt);
              // The file's name, unless it is what the title already says.
              const fileName = item.fileName !== null && item.fileName !== item.title ? item.fileName : null;
              return (
                <li
                  key={item.key}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 14, flexWrap: "wrap",
                    padding: "14px 16px", borderRadius: 10,
                    border: "1px solid #E3E8EF", background: "#FAFBFC",
                  }}
                >
                  <div style={{ minWidth: 0, flex: "1 1 180px" }}>
                    <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, overflowWrap: "anywhere" }}>
                      {item.title}
                    </div>
                    {fileName !== null && (
                      <div style={{ ...GF, fontSize: 12, color: "#4B5E70", marginTop: 3, overflowWrap: "anywhere" }}>
                        {fileName}
                      </div>
                    )}
                    {changed !== "" && (
                      <div style={{ ...GF, fontSize: 12, color: SILVER, marginTop: 3 }}>
                        Last changed {changed}
                      </div>
                    )}
                  </div>
                  <button
                    aria-label={`Resume ${item.title}`}
                    onClick={() => {
                      void navigate(
                        `/app/prepare/upload?resumeDocumentId=${encodeURIComponent(item.documentId)}`);
                    }}
                    style={{
                      ...GF, minHeight: 44, padding: "0 16px", borderRadius: 8,
                      border: `1px solid ${AZURE}`, background: "#FFFFFF",
                      color: ON_LIGHT.azure, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Resume &rarr;
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {asking && draft !== null && (
        <UnfinishedDraftDialog
          title={draftDisplayTitle(draft)}
          intent="start"
          canKeep={draftServerDocumentIds(draft).length > 0}
          busy={askBusy}
          error={askError}
          onChoose={handleUnfinishedChoice}
          onCancel={() => { if (askBusy === null) setAsking(false); }}
        />
      )}

      {/* Footer notice */}
      <div
        style={{
          ...GF,
          fontSize: 12,
          color: SILVER,
          lineHeight: 1.7,
          paddingTop: 24,
          borderTop: "1px solid #E3E8EF",
        }}
      >
        <strong style={{ color: "#4B5E70" }}>About LAGDA eSignature</strong>
        <br />
        Documents you add here are uploaded to your workspace and stored there.
        Sending a transaction emails a real signing link to each participant.
        Drafts are kept on the server, so you can finish one later or on
        another device.
      </div>
    </div>
  );
}

// Entry screen for the guided preparation workflow at /app/prepare.
// Shows three paths: Start with Files, Use a Template, Resume a Draft.
// Permission gate: users without prepareFlowEnabled see a plan-upgrade notice.
// Burgundy (#67023B) is NEVER used here. eNotary is NEVER mentioned.

import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { usePrepare } from "../../../context/PrepareContext";
import { usePlatform } from "../../../context/PlatformContext";
import { usePendingPreparation } from "../../../context/PendingPreparationContext";
import { useProcessing } from "../../../services/processing.service";
import {
  realSigningRequestService, type SigningRequestListItem,
} from "../../../services/real/signing-request.service";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";

// DraftCard and TemplateCard removed with the fixtures they rendered. Real
// drafts are listed inline below, straight from the signing-request list.
export function PrepareEntryPage() {
  const navigate  = useNavigate();
  const [params]  = useSearchParams();
  const platform = usePlatform();
  const { hasFlag } = platform;
  const { claimPending } = usePendingPreparation();
  const { createDraft } = usePrepare();

  // Real drafts: signing requests the server still holds in `draft` state.
  //
  // These used to be three fixtures with invented titles and dates. Fetched
  // here rather than through PrepareContext because this is the only page
  // that lists them — the context's own draft is the one being prepared, not
  // a directory of everything unfinished.
  const [realDrafts, setRealDrafts] = useState<SigningRequestListItem[]>([]);
  useEffect(() => {
    const workspaceId = platform.currentWorkspace?.id;
    if (workspaceId === undefined) return;
    let cancelled = false;
    void realSigningRequestService.list(workspaceId, { perPage: 50 })
      .then(result => {
        if (cancelled) return;
        setRealDrafts(result.items.filter(item => item.state === "draft"));
      })
      // An empty list is the right fallback. Showing nothing is honest, and
      // an error about drafts would bury this page's actual purpose, which is
      // starting a new one.
      .catch(() => { /* leave the list empty */ });
    return () => { cancelled = true; };
  }, [platform.currentWorkspace?.id]);

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

  const handleStartNew = async () => {
    const draftId = await runProcessing(
      { message: "Starting a new preparation", detail: "Creating your draft." },
      async () => createDraft({ source: "new" }),
    );
    if (draftId) {
      void navigate("/app/prepare/upload");
    }
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
          Set up a new eSignature transaction — add files, participants, routing, and authentication
          before placing signature fields.
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
              style={{
                ...GF,
                padding: "11px 28px",
                borderRadius: 8,
                border: "none",
                background: AZURE,
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
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

      {/* Resume a draft — real signing requests still in `draft` state.
          *
          * Resuming reopens preparation against that same backend document
          * rather than starting a second one beside it. */}
      {realDrafts.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: "0 0 14px" }}>
            Resume a draft
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {realDrafts.map(item => (
              <div
                key={item.signingRequestId}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 14, flexWrap: "wrap",
                  padding: "14px 16px", borderRadius: 10,
                  border: "1px solid #E3E8EF", background: "#FAFBFC",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY }}>
                    {item.documentTitle}
                  </div>
                  <div style={{ ...GF, fontSize: 12, color: SILVER, marginTop: 3 }}>
                    {item.participantCount === 1
                      ? "1 participant"
                      : `${item.participantCount} participants`}
                  </div>
                </div>
                <button
                  onClick={() => {
                    void navigate(
                      `/app/prepare/upload?resumeDocumentId=${encodeURIComponent(item.documentId)}`);
                  }}
                  style={{
                    ...GF, minHeight: 38, padding: "0 16px", borderRadius: 8,
                    border: `1px solid ${AZURE}`, background: "#FFFFFF",
                    color: AZURE, fontSize: 13, fontWeight: 700, cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Resume &rarr;
                </button>
              </div>
            ))}
          </div>
        </section>
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

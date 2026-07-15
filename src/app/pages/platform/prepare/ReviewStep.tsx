// Step 6 of 7: Review — full summary before proceeding to field placement.
// Shows all draft data, validation status, and field-placement readiness.
// The "Continue to Place Fields" CTA calls markReadyForFieldPlacement() and navigates to /fields.
// Burgundy (#67023B) is NEVER used. eNotary is NEVER mentioned.
// Legal limitation notice is required before the CTA.

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { usePrepare } from "../../../context/PrepareContext";
import {
  PREPARATION_STEPS,
  PREP_PARTICIPANT_ROLE_LABELS,
  PREP_AUTH_METHODS,
  DEFAULT_PREP_SETTINGS,
  DEFAULT_ROUTING_CONFIG,
  DEFAULT_AUTH_CONFIG,
  DEFAULT_TRANSACTION_DETAILS,
  PREP_ROLE_IS_BLOCKING,
  getAuthMethodConfig,
} from "../../../models/prepare";
import type { PreparationStepId, PrepValidationIssue } from "../../../models/prepare";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const GOLD   = "#C9960C";

function humanSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SectionBlock({
  title,
  stepId,
  onEdit,
  children,
}: {
  title: string;
  stepId: PreparationStepId;
  onEdit: (id: PreparationStepId) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #E3E8EF",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          background: "#F5F7FA",
          borderBottom: "1px solid #E3E8EF",
        }}
      >
        <span style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY }}>{title}</span>
        <button
          onClick={() => onEdit(stepId)}
          style={{
            ...GF,
            fontSize: 12,
            fontWeight: 600,
            color: AZURE,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          Edit
        </button>
      </div>
      <div style={{ padding: "16px 20px" }}>
        {children}
      </div>
    </div>
  );
}

function IssueRow({ issue }: { issue: PrepValidationIssue }) {
  const isError = issue.severity === "error";
  return (
    <div
      style={{
        ...GF,
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 7,
        background: isError ? "#FFF5F5" : "#FEF9EC",
        border: `1px solid ${isError ? "#F5C6CB" : "#F0D07A"}`,
        fontSize: 13,
        color: isError ? "#C0392B" : GOLD,
        marginBottom: 6,
      }}
    >
      <span aria-hidden="true">{isError ? "!" : "⚠"}</span>
      <span>{issue.message}</span>
    </div>
  );
}

// ── Main step ─────────────────────────────────────────────────────────────────

export function ReviewStep() {
  const navigate  = useNavigate();
  const {
    draft,
    setStep,
    validate,
    markReadyForFieldPlacement,
  } = usePrepare();

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { setStep("review"); }, [setStep]);

  const goToStep = (id: PreparationStepId) => {
    const route = PREPARATION_STEPS.find(s => s.id === id)?.route;
    if (route) navigate(route);
  };

  const validation = draft ? validate() : null;
  const allIssues  = validation?.issues ?? [];
  const isReady    = validation?.readyForFieldPlacement ?? false;

  const files        = draft?.files ?? [];
  const details      = draft?.details ?? DEFAULT_TRANSACTION_DETAILS;
  const participants = draft?.participants ?? [];
  const routing      = draft?.routing ?? DEFAULT_ROUTING_CONFIG;
  const auth         = draft?.auth ?? DEFAULT_AUTH_CONFIG;
  const settings     = draft?.settings ?? DEFAULT_PREP_SETTINGS;

  const handleContinue = async () => {
    if (!isReady || isSubmitting) return;
    setIsSubmitting(true);
    const ok = await markReadyForFieldPlacement();
    setIsSubmitting(false);
    if (ok) {
      navigate("/app/prepare/fields");
    }
  };

  const readyFiles = files.filter(f => f.fileState === "ready");

  return (
    <div style={{ ...GF, maxWidth: 660 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>
          Review
        </h2>
        <p style={{ fontSize: 13, color: SILVER, margin: 0, lineHeight: 1.6 }}>
          Check all preparation settings before proceeding to place signature fields.
        </p>
      </div>

      {/* Validation summary */}
      {allIssues.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 10 }}>
            Items to review
          </div>
          {allIssues.map(i => <IssueRow key={i.id} issue={i} />)}
        </div>
      )}

      {/* Documents */}
      <SectionBlock title="Documents" stepId="upload" onEdit={goToStep}>
        {files.length === 0 ? (
          <span style={{ ...GF, fontSize: 13, color: "#C0392B" }}>No files selected</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {files.map((f, i) => (
              <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: f.fileState === "ready" ? NAVY : "#C0392B" }}>
                <span>{i + 1}. {f.fileName}</span>
                <span style={{ color: SILVER }}>{humanSize(f.fileSizeBytes)}</span>
              </div>
            ))}
          </div>
        )}
        {details.title && (
          <div style={{ ...GF, marginTop: 12, paddingTop: 12, borderTop: "1px solid #F0F2F5", fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: NAVY }}>Title: </span>
            <span style={{ color: "#4B5E70" }}>{details.title}</span>
          </div>
        )}
      </SectionBlock>

      {/* Participants */}
      <SectionBlock title="Participants" stepId="participants" onEdit={goToStep}>
        {participants.length === 0 ? (
          <span style={{ ...GF, fontSize: 13, color: "#C0392B" }}>No participants added</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {participants.map((p, i) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY }}>{p.name}</span>
                  <span style={{ ...GF, fontSize: 12, color: SILVER, marginLeft: 8 }}>{p.email}</span>
                </div>
                <span
                  style={{
                    ...GF,
                    fontSize: 11,
                    fontWeight: 600,
                    background: PREP_ROLE_IS_BLOCKING[p.role] ? "#EBF4FC" : "#F5F7FA",
                    color: PREP_ROLE_IS_BLOCKING[p.role] ? AZURE : SILVER,
                    padding: "2px 8px",
                    borderRadius: 20,
                  }}
                >
                  {PREP_PARTICIPANT_ROLE_LABELS[p.role]}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionBlock>

      {/* Routing */}
      <SectionBlock title="Routing" stepId="routing" onEdit={goToStep}>
        <div style={{ ...GF, fontSize: 13, color: NAVY, marginBottom: routing.groups.length > 0 ? 10 : 0 }}>
          Mode: <strong>{routing.mode}</strong>
        </div>
        {routing.groups.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {routing.groups.map((g) => (
              <div key={g.id} style={{ ...GF, fontSize: 12, color: "#4B5E70" }}>
                Step {g.stepNumber}: {g.label}
                {g.participantIds.length > 0 && (
                  <span style={{ color: SILVER }}>
                    {" "}· {g.participantIds.length} participant{g.participantIds.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionBlock>

      {/* Authentication */}
      <SectionBlock title="Authentication" stepId="authentication" onEdit={goToStep}>
        <div style={{ ...GF, fontSize: 13, color: NAVY, marginBottom: 6 }}>
          Default: <strong>{getAuthMethodConfig(auth.defaultMethod).label}</strong>
        </div>
        {Object.keys(auth.perParticipant).length > 0 && (
          <div style={{ ...GF, fontSize: 12, color: SILVER }}>
            {Object.keys(auth.perParticipant).length} participant{Object.keys(auth.perParticipant).length !== 1 ? "s" : ""} with custom method
          </div>
        )}
      </SectionBlock>

      {/* Settings */}
      <SectionBlock title="Settings" stepId="settings" onEdit={goToStep}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ ...GF, fontSize: 12, color: "#4B5E70" }}>
            Reminders: {settings.reminders.enabled
              ? `First after ${settings.reminders.firstReminderDays} day${settings.reminders.firstReminderDays !== 1 ? "s" : ""}, then every ${settings.reminders.repeatIntervalDays} day${settings.reminders.repeatIntervalDays !== 1 ? "s" : ""}`
              : "Disabled"}
          </div>
          <div style={{ ...GF, fontSize: 12, color: "#4B5E70" }}>
            Expiration: {settings.expiration.enabled && settings.expiration.expiresAt
              ? new Date(settings.expiration.expiresAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
              : "No expiration set"}
          </div>
          <div style={{ ...GF, fontSize: 12, color: "#4B5E70" }}>
            Verification record: {settings.completion.createVerificationRecord ? "Will be created" : "Not created"}
          </div>
        </div>
      </SectionBlock>

      {/* Field placement readiness */}
      <div
        style={{
          marginBottom: 24,
          padding: "16px 20px",
          borderRadius: 10,
          background: isReady ? "#F0FAF4" : "#FFF5F5",
          border: `1px solid ${isReady ? "#A8D5B5" : "#F5C6CB"}`,
        }}
      >
        <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: isReady ? "#2E7D32" : "#C0392B", marginBottom: 6 }}>
          {isReady ? "Ready to place fields" : "Not yet ready for field placement"}
        </div>
        <div style={{ ...GF, fontSize: 12, color: isReady ? "#388E3C" : "#C0392B", lineHeight: 1.5 }}>
          {isReady
            ? `${readyFiles.length} file${readyFiles.length !== 1 ? "s" : ""}, ${participants.length} participant${participants.length !== 1 ? "s" : ""}, and routing are configured. You may proceed to place signature fields.`
            : "Resolve all errors above before proceeding to field placement."}
        </div>
      </div>

      {/* Legal limitation notice — REQUIRED */}
      <div
        style={{
          ...GF,
          marginBottom: 28,
          padding: "14px 16px",
          borderRadius: 8,
          background: "#F5F7FA",
          border: "1px solid #E3E8EF",
          fontSize: 12,
          color: SILVER,
          lineHeight: 1.7,
        }}
      >
        <strong style={{ color: "#4B5E70" }}>Legal notice</strong>
        <br />
        LAGDA eSignature is a frontend demonstration. Proceeding to field placement does not create
        a legally binding document, does not send invitations, and does not produce a digital
        signature. The preparation workflow shown here illustrates the intended user experience
        for a future production system. No documents are uploaded, no participants are contacted,
        and no transaction records are created outside this browser session.
        <br /><br />
        The legal validity of electronic signatures in the Philippines is governed by the Electronic
        Commerce Act (Republic Act No. 8792) and its implementing rules. LAGDA does not guarantee
        the legal effect of any transaction prepared using this demonstration system.
      </div>

      {/* CTA */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          onClick={isReady && !isSubmitting ? handleContinue : undefined}
          disabled={!isReady || isSubmitting}
          aria-disabled={!isReady || isSubmitting}
          style={{
            ...GF,
            padding: "12px 32px",
            borderRadius: 8,
            border: "none",
            background: isReady ? AZURE : "#B0BEC5",
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: 700,
            cursor: isReady && !isSubmitting ? "pointer" : "not-allowed",
          }}
        >
          {isSubmitting ? "Preparing…" : "Continue to Place Fields →"}
        </button>
        {!isReady && (
          <span style={{ ...GF, fontSize: 12, color: SILVER }}>
            Resolve errors above to continue
          </span>
        )}
      </div>
    </div>
  );
}

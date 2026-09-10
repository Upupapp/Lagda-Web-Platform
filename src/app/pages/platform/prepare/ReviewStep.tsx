// Step 6 of 7: Review — full summary before proceeding to field placement.
// Shows all draft data, validation status, and field-placement readiness.
// The "Continue to Place Fields" CTA calls markReadyForFieldPlacement() and navigates to /fields.
// Burgundy (#67023B) is NEVER used. eNotary is NEVER mentioned.
// Legal limitation notice is required before the CTA.

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ClipboardCheck, Check, X, ChevronRight } from "lucide-react";
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
import { StepBanner, StepTwoColumn, RailCard } from "../../../components/prepare/StepBanner";
import { MissingItemsModal } from "../../../components/prepare/MissingItemsModal";

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

function IssueRow({ issue, onGoToStep }: { issue: PrepValidationIssue; onGoToStep: (id: PreparationStepId) => void }) {
  // Both errors and warnings use the same calm amber "reminder" tone —
  // a red error box reads as "something broke"; this is just "not done yet".
  // Clicking jumps straight to the step that owns this field, same as the
  // "See what's left" reminder modal — every issue already carries stepId.
  return (
    <button
      type="button"
      onClick={() => onGoToStep(issue.stepId)}
      style={{
        ...GF,
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        textAlign: "left",
        padding: "8px 12px",
        borderRadius: 7,
        background: "#FEF9EC",
        border: "1px solid #F0D07A",
        fontSize: 13,
        color: "#8A6A16",
        marginBottom: 6,
        cursor: "pointer",
        transition: "filter 0.12s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(0.97)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = ""; }}
    >
      <span aria-hidden="true" style={{ color: GOLD, flexShrink: 0 }}>{issue.severity === "error" ? "●" : "○"}</span>
      <span style={{ flex: 1 }}>{issue.message}</span>
      <ChevronRight size={14} color={GOLD} style={{ flexShrink: 0 }} />
    </button>
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
  const [showMissing, setShowMissing] = useState(false);

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
  const stepValidity = validation?.stepValidity;
  const checklistSteps = PREPARATION_STEPS.filter(s => s.id !== "fields" && s.id !== "review");

  const main = (
    <div style={{ ...GF, width: "100%" }}>
      {/* Validation summary */}
      {allIssues.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 10 }}>
            Items to review
          </div>
          {allIssues.map(i => <IssueRow key={i.id} issue={i} onGoToStep={goToStep} />)}
        </div>
      )}

      {/* Documents */}
      <SectionBlock title="Documents" stepId="upload" onEdit={goToStep}>
        {files.length === 0 ? (
          <span style={{ ...GF, fontSize: 13, color: GOLD, fontWeight: 600 }}>No files selected yet</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {files.map((f, i) => (
              <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: f.fileState === "ready" ? NAVY : GOLD }}>
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
          <span style={{ ...GF, fontSize: 13, color: GOLD, fontWeight: 600 }}>No participants added yet</span>
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
          background: isReady ? "#F0FAF4" : "#FEF9EC",
          border: `1px solid ${isReady ? "#A8D5B5" : "#F0D07A"}`,
        }}
      >
        <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: isReady ? "#2E7D32" : "#8A6A16", marginBottom: 6 }}>
          {isReady ? "Ready to place fields" : "Almost there — a few things left"}
        </div>
        <div style={{ ...GF, fontSize: 12, color: isReady ? "#388E3C" : "#8A6A16", lineHeight: 1.5 }}>
          {isReady
            ? `${readyFiles.length} file${readyFiles.length !== 1 ? "s" : ""}, ${participants.length} participant${participants.length !== 1 ? "s" : ""}, and routing are configured. You may proceed to place signature fields.`
            : "See the checklist on the right, or open the reminder below to jump straight to what's missing."}
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
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={isReady ? (isSubmitting ? undefined : handleContinue) : () => setShowMissing(true)}
          disabled={isSubmitting}
          style={{
            ...GF,
            padding: "12px 32px",
            borderRadius: 8,
            border: isReady ? "none" : "1px solid #F0D07A",
            background: isReady ? AZURE : "#FEF9EC",
            color: isReady ? "#FFFFFF" : GOLD,
            fontSize: 15,
            fontWeight: 700,
            cursor: isSubmitting ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting ? "Preparing…" : isReady ? "Continue to Place Fields →" : "Not ready yet →"}
        </button>
        {!isReady && (
          <button
            type="button"
            onClick={() => setShowMissing(true)}
            style={{ ...GF, fontSize: 12.5, fontWeight: 600, color: GOLD, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}
          >
            See what's left
          </button>
        )}
      </div>

      <MissingItemsModal
        open={showMissing}
        onClose={() => setShowMissing(false)}
        issues={validation?.errors ?? []}
        onGoToStep={goToStep}
      />
    </div>
  );

  const rail = (
    <RailCard title="Readiness checklist">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {checklistSteps.map(s => {
          const valid = stepValidity ? stepValidity[s.id] : false;
          return (
            <button
              key={s.id}
              onClick={() => goToStep(s.id)}
              style={{
                ...GF,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                width: "100%",
                padding: "6px 0",
                border: "none",
                background: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>{s.label}</span>
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: valid ? "#E8F5E9" : "#FEF9EC",
                  flexShrink: 0,
                }}
              >
                {valid
                  ? <Check size={12} color="#2E7D32" strokeWidth={3} />
                  : <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, display: "block" }} />}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ ...GF, marginTop: 12, paddingTop: 12, borderTop: "1px solid #F0F2F5", fontSize: 12, fontWeight: 700, color: isReady ? "#2E7D32" : "#8A6A16" }}>
        {isReady ? "All steps ready" : "A few steps still need a bit more"}
      </div>
    </RailCard>
  );

  return (
    <div style={GF}>
      <StepBanner
        icon={ClipboardCheck}
        eyebrow="Step 6 of 7"
        title="Review"
        description="Check all preparation settings before proceeding to place signature fields."
        meta={isReady ? "Ready for field placement" : "Not yet ready"}
      />
      <StepTwoColumn main={main} rail={rail} />
    </div>
  );
}

// Signing Workflow — participant configuration surface and Add Person picker.
//
// Progressive disclosure: identity and required action are always visible;
// electronic signature, routing, authentication, consent, and instructions are
// collapsed until opened.
//
// Privacy boundaries enforced here:
//   - No participant's Signature Library ever appears. A sender cannot select,
//     view, or apply another person's saved signature.
//   - No signature representation, authentication code, access token, consent
//     evidence, IP address, device evidence, or field value is rendered.
//   - Emails arrive already masked and are never unmasked.
//
// Nothing in this panel sends an invitation, grants access, or applies a signature.

import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { GF, TONES, WF } from "./WorkflowStyles";
import {
  ParticipantAvatar, ReadinessPill, WorkflowPill, describeRequirement, useWorkflowConfirm,
} from "./WorkflowPrimitives";
import type {
  SigningStage,
  SigningStageId,
  StageParticipantAction,
  StageParticipantAssignment,
  StageParticipantAuthenticationDirection,
  StageParticipantConsentDirection,
  StageParticipantNotificationDirection,
  UpdateStageParticipantInput,
  AddStageParticipantInput,
} from "../../models/signing-workflow";
import {
  AUTH_DIRECTION_LABELS,
  CONSENT_DIRECTION_LABELS,
  NOTIFICATION_DIRECTION_LABELS,
  STAGE_ACTION_DESCRIPTIONS,
  STAGE_ACTION_LABELS,
  STAGE_PARTICIPANT_ACTIONS,
  STAGE_INSTRUCTION_MAX_LENGTH,
  actionAlwaysRequiresSignature,
  actionForbidsSignature,
  actionSupportsOptionalSignature,
} from "../../models/signing-workflow";
import type { WorkflowParticipantCandidate } from "../../services/mock/signing-workflow.service";
import { Z } from "../../utils/z-index";

// ── Focus-containing sheet ────────────────────────────────────────────────────

function Sheet({
  title, onClose, children, footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      // Focus is always restored to whatever opened the sheet.
      previousFocus.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{ position: "fixed", inset: 0, zIndex: Z.modal, display: "flex", justifyContent: "flex-end" }}
    >
      <div onClick={onClose} aria-hidden style={{ position: "absolute", inset: 0, background: "rgba(7,17,31,0.42)" }} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="wf-root"
        style={{
          position: "relative", background: WF.white, width: "min(480px, 100%)",
          height: "100%", display: "flex", flexDirection: "column",
          boxShadow: "-8px 0 32px rgba(7,17,31,0.16)",
        }}
      >
        <header
          style={{
            padding: "16px 20px", borderBottom: `1px solid ${WF.slate2}`,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            flexShrink: 0,
          }}
        >
          <h2 style={{ ...GF, margin: 0, fontSize: 16, fontWeight: 700, color: WF.navy }}>{title}</h2>
          <button type="button" className="wf-icon-btn" onClick={onClose} aria-label="Close">
            <X size={17} aria-hidden />
          </button>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>{children}</div>

        {footer && (
          <footer
            style={{
              padding: "14px 20px calc(14px + env(safe-area-inset-bottom, 0px))",
              borderTop: `1px solid ${WF.slate2}`, display: "flex", gap: 10,
              justifyContent: "flex-end", flexShrink: 0, background: WF.white,
            }}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

// ── Disclosure ────────────────────────────────────────────────────────────────

function Disclosure({
  title, summary, defaultOpen, children,
}: { title: string; summary?: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const id = useId();
  return (
    <div style={{ borderTop: `1px solid ${WF.slate1}`, paddingTop: 14, marginTop: 14 }}>
      <button
        type="button"
        className="wf-btn wf-btn-ghost"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", justifyContent: "flex-start", padding: "6px 0", minHeight: 40 }}
      >
        {open ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
        <span style={{ ...GF, fontSize: 14, fontWeight: 700, color: WF.navy }}>{title}</span>
        {!open && summary && (
          <span style={{ ...GF, fontSize: 12, color: WF.slate5, marginLeft: "auto", fontWeight: 500 }}>
            {summary}
          </span>
        )}
      </button>
      {open && <div id={id} style={{ paddingTop: 10 }}>{children}</div>}
    </div>
  );
}

// ── Participant configuration ─────────────────────────────────────────────────

export interface ParticipantConfigPanelProps {
  assignment: StageParticipantAssignment;
  stage:      SigningStage;
  allStages:  SigningStage[];
  canEdit:    boolean;
  onApply:    (input: UpdateStageParticipantInput) => void;
  onRemove:   () => void;
  onOpenFieldPlacement: () => void;
  onClose:    () => void;
}

export function ParticipantConfigPanel({
  assignment, stage, allStages, canEdit, onApply, onRemove, onOpenFieldPlacement, onClose,
}: ParticipantConfigPanelProps) {
  const [action, setAction] = useState<StageParticipantAction>(assignment.action);
  const [signatureRequired, setSignatureRequired] = useState(assignment.signatureRequirement.signatureRequired);
  const [initialsRequired, setInitialsRequired] = useState(assignment.signatureRequirement.initialsRequired);
  const [auth, setAuth] = useState<StageParticipantAuthenticationDirection>(assignment.authenticationDirection);
  const [consent, setConsent] = useState<StageParticipantConsentDirection>(assignment.consentDirection);
  const [notify, setNotify] = useState<StageParticipantNotificationDirection>(assignment.notificationDirection);
  const [instruction, setInstruction] = useState(assignment.instruction ?? "");
  const [targetStageId, setTargetStageId] = useState<SigningStageId>(stage.id);
  const { confirm, confirmDialog } = useWorkflowConfirm();

  const dirty =
    action !== assignment.action
    || signatureRequired !== assignment.signatureRequirement.signatureRequired
    || initialsRequired !== assignment.signatureRequirement.initialsRequired
    || auth !== assignment.authenticationDirection
    || consent !== assignment.consentDirection
    || notify !== assignment.notificationDirection
    || instruction !== (assignment.instruction ?? "")
    || targetStageId !== stage.id;

  // Keep the signature requirement coherent with the chosen action at all times.
  function changeAction(next: StageParticipantAction) {
    setAction(next);
    if (actionForbidsSignature(next)) { setSignatureRequired(false); setInitialsRequired(false); }
    else if (actionAlwaysRequiresSignature(next)) { setSignatureRequired(true); }
  }

  const signatureLocked = actionForbidsSignature(action) || actionAlwaysRequiresSignature(action);

  // Unsaved changes are protected, but an untouched form never prompts.
  const requestClose = () => {
    if (!dirty) { onClose(); return; }
    confirm({
      title: "Discard these changes?",
      body: "The changes to this person's configuration have not been applied. They are temporary frontend state and will be cleared.",
      confirmLabel: "Discard changes",
      destructive: true,
      onConfirm: onClose,
    });
  };

  return (
    <Sheet
      title="Participant"
      onClose={requestClose}
      footer={canEdit ? (
        <>
          <button type="button" className="wf-btn wf-btn-secondary" onClick={requestClose}>
            Cancel
          </button>
          <button
            type="button"
            className="wf-btn wf-btn-primary"
            disabled={!dirty}
            onClick={() => onApply({
              action,
              signatureRequired,
              initialsRequired,
              authenticationDirection: auth,
              consentDirection: consent,
              notificationDirection: notify,
              instruction: instruction.trim() || null,
              targetStageId: targetStageId !== stage.id ? targetStageId : undefined,
            })}
          >
            Apply Changes
          </button>
        </>
      ) : (
        <button type="button" className="wf-btn wf-btn-secondary" onClick={onClose}>Close</button>
      )}
    >
      {/* ── Identity ────────────────────────────────────────────────────── */}
      <section aria-label="Identity">
        <div className="wf-row" style={{ gap: 12, flexWrap: "nowrap" }}>
          <ParticipantAvatar name={assignment.participantName} size={44} />
          <div style={{ minWidth: 0 }}>
            <p style={{ ...GF, margin: 0, fontSize: 16, fontWeight: 700, color: WF.navy, overflowWrap: "anywhere" }}>
              {assignment.participantName}
            </p>
            <p style={{ ...GF, margin: "2px 0 0", fontSize: 12, color: WF.slate5, overflowWrap: "anywhere" }}>
              {assignment.participantEmailMasked}
            </p>
            {assignment.participantOrganization && (
              <p style={{ ...GF, margin: "2px 0 0", fontSize: 12, color: WF.slate5, overflowWrap: "anywhere" }}>
                {assignment.participantOrganization}
              </p>
            )}
          </div>
        </div>
        <div className="wf-row" style={{ gap: 6, marginTop: 10 }}>
          <WorkflowPill label={describeRequirement(assignment)} tone={TONES.neutral} />
          <ReadinessPill state={assignment.fieldReadiness.state} />
        </div>
        <p style={{ ...GF, margin: "10px 0 0", fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>
          Identity is managed on the Participants tab. Editing a name or email address uses that
          flow, not this panel.
        </p>
      </section>

      {/* ── Required action ─────────────────────────────────────────────── */}
      <section aria-label="Required action" style={{ borderTop: `1px solid ${WF.slate1}`, paddingTop: 16, marginTop: 16 }}>
        <h3 style={{ ...GF, margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: WF.navy }}>
          What must this person do?
        </h3>
        <p style={{ ...GF, margin: "0 0 12px", fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>
          Every person has one explicit required action. A stage never acts on someone's behalf.
        </p>

        <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
          <legend className="wf-visually-hidden">Required action</legend>
          <div className="wf-stack" style={{ gap: 8 }}>
            {STAGE_PARTICIPANT_ACTIONS.map(a => (
              <label
                key={a}
                style={{
                  display: "flex", gap: 10, alignItems: "flex-start", padding: 12,
                  border: `1.5px solid ${a === action ? WF.azure : WF.slate2}`,
                  background: a === action ? WF.azureSoft : WF.white,
                  borderRadius: 10, cursor: canEdit ? "pointer" : "default", minHeight: 44,
                }}
              >
                <input
                  type="radio"
                  name="wf-required-action"
                  value={a}
                  checked={a === action}
                  disabled={!canEdit}
                  onChange={() => changeAction(a)}
                  style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }}
                />
                <span style={{ minWidth: 0 }}>
                  <span style={{ ...GF, display: "block", fontSize: 13, fontWeight: 700, color: WF.navy }}>
                    {STAGE_ACTION_LABELS[a]}
                  </span>
                  <span style={{ ...GF, display: "block", fontSize: 12, color: WF.slate5, lineHeight: 1.55, marginTop: 2 }}>
                    {STAGE_ACTION_DESCRIPTIONS[a]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {/* ── Electronic signature ────────────────────────────────────────── */}
      <Disclosure
        title="Electronic Signature"
        defaultOpen
        summary={signatureRequired ? "Required" : "Not required"}
      >
        <p style={{ ...GF, margin: "0 0 12px", fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>
          An electronic signature requirement is always individual. This person signs only for
          themselves, using their own fields and their own saved signature — which is private to
          them and never visible or selectable here.
        </p>

        <label className="wf-row" style={{ gap: 10, minHeight: 44, cursor: signatureLocked || !canEdit ? "default" : "pointer" }}>
          <input
            type="checkbox"
            checked={signatureRequired}
            disabled={!canEdit || signatureLocked}
            onChange={(e) => setSignatureRequired(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <span style={{ ...GF, fontSize: 13, fontWeight: 600, color: WF.slate7 }}>
            Electronic signature required
          </span>
        </label>

        <label className="wf-row" style={{ gap: 10, minHeight: 44, cursor: actionForbidsSignature(action) || !canEdit ? "default" : "pointer" }}>
          <input
            type="checkbox"
            checked={initialsRequired}
            disabled={!canEdit || actionForbidsSignature(action)}
            onChange={(e) => setInitialsRequired(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <span style={{ ...GF, fontSize: 13, fontWeight: 600, color: WF.slate7 }}>
            Initials required
          </span>
        </label>

        {actionAlwaysRequiresSignature(action) && (
          <p style={{ ...GF, margin: "8px 0 0", fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>
            Sign always requires an electronic signature, so this cannot be turned off.
          </p>
        )}
        {actionForbidsSignature(action) && (
          <p style={{ ...GF, margin: "8px 0 0", fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>
            {STAGE_ACTION_LABELS[action]} never requires an electronic signature.
          </p>
        )}
        {actionSupportsOptionalSignature(action) && (
          <p style={{ ...GF, margin: "8px 0 0", fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>
            {STAGE_ACTION_LABELS[action]} is a separate action from signing. Turn on the signature
            requirement only if this person must also sign.
          </p>
        )}

        <div
          className="wf-card"
          style={{ marginTop: 12, padding: 12, background: WF.slate0, borderColor: WF.slate2 }}
        >
          <p style={{ ...GF, margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: WF.slate7 }}>
            Field readiness
          </p>
          <p style={{ ...GF, margin: "0 0 10px", fontSize: 12, color: WF.slate6, lineHeight: 1.6 }}>
            {assignment.fieldReadiness.requiredFieldCount} required ·{" "}
            {assignment.fieldReadiness.assignedFieldCount} assigned
            {assignment.fieldReadiness.missingFieldTypes.length > 0
              && ` · missing ${assignment.fieldReadiness.missingFieldTypes.join(", ")}`}
          </p>
          <button type="button" className="wf-btn wf-btn-secondary wf-btn-sm" onClick={onOpenFieldPlacement}>
            Open Field Placement
          </button>
        </div>
      </Disclosure>

      {/* ── Routing ─────────────────────────────────────────────────────── */}
      <Disclosure title="Routing" summary={`Stage ${stage.position}, position ${assignment.position}`}>
        <label htmlFor="wf-target-stage" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 600, color: WF.slate7, marginBottom: 6 }}>
          Stage
        </label>
        <select
          id="wf-target-stage"
          className="wf-select"
          value={String(targetStageId)}
          disabled={!canEdit}
          onChange={(e) => setTargetStageId(e.target.value as SigningStageId)}
        >
          {allStages.map(s => (
            <option key={String(s.id)} value={String(s.id)}>
              Stage {s.position} — {s.name}
            </option>
          ))}
        </select>
        <p style={{ ...GF, margin: "8px 0 0", fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>
          Position {assignment.position} of {stage.assignments.length} in {stage.name}.{" "}
          {stage.executionMode === "parallel"
            ? "This stage runs in parallel, so the order is for reading only — everyone becomes eligible together."
            : "This stage runs one person after another, so position determines who acts next."}
        </p>
        <p style={{ ...GF, margin: "8px 0 0", fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>
          Moving someone changes where they act. It never completes, approves, or signs anything
          on their behalf.
        </p>
      </Disclosure>

      {/* ── Authentication ──────────────────────────────────────────────── */}
      <Disclosure title="Authentication" summary={AUTH_DIRECTION_LABELS[auth]}>
        <label htmlFor="wf-auth" className="wf-visually-hidden">Authentication direction</label>
        <select
          id="wf-auth"
          className="wf-select"
          value={auth}
          disabled={!canEdit}
          onChange={(e) => setAuth(e.target.value as StageParticipantAuthenticationDirection)}
        >
          {(Object.keys(AUTH_DIRECTION_LABELS) as StageParticipantAuthenticationDirection[]).map(k => (
            <option key={k} value={k}>{AUTH_DIRECTION_LABELS[k]}</option>
          ))}
        </select>
        <p style={{ ...GF, margin: "8px 0 0", fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>
          This records the intended authentication direction only. It does not verify identity and
          no authentication code is generated, stored, or shown here.
        </p>
      </Disclosure>

      {/* ── Consent ─────────────────────────────────────────────────────── */}
      <Disclosure title="Consent" summary={CONSENT_DIRECTION_LABELS[consent]}>
        <label htmlFor="wf-consent" className="wf-visually-hidden">Consent direction</label>
        <select
          id="wf-consent"
          className="wf-select"
          value={consent}
          disabled={!canEdit}
          onChange={(e) => setConsent(e.target.value as StageParticipantConsentDirection)}
        >
          {(Object.keys(CONSENT_DIRECTION_LABELS) as StageParticipantConsentDirection[]).map(k => (
            <option key={k} value={k}>{CONSENT_DIRECTION_LABELS[k]}</option>
          ))}
        </select>
      </Disclosure>

      {/* ── Notification direction ──────────────────────────────────────── */}
      <Disclosure title="Notification Direction" summary={NOTIFICATION_DIRECTION_LABELS[notify]}>
        <label htmlFor="wf-notify" className="wf-visually-hidden">Notification direction</label>
        <select
          id="wf-notify"
          className="wf-select"
          value={notify}
          disabled={!canEdit}
          onChange={(e) => setNotify(e.target.value as StageParticipantNotificationDirection)}
        >
          {(Object.keys(NOTIFICATION_DIRECTION_LABELS) as StageParticipantNotificationDirection[]).map(k => (
            <option key={k} value={k}>{NOTIFICATION_DIRECTION_LABELS[k]}</option>
          ))}
        </select>
        <p style={{ ...GF, margin: "8px 0 0", fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>
          This is a direction only. No notification, email, or SMS message is created, scheduled,
          or delivered.
        </p>
      </Disclosure>

      {/* ── Instructions ────────────────────────────────────────────────── */}
      <Disclosure title="Instructions" summary={instruction ? "Set" : "None"}>
        <label htmlFor="wf-instruction" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 600, color: WF.slate7, marginBottom: 6 }}>
          Private note for this person
        </label>
        <textarea
          id="wf-instruction"
          className="wf-textarea"
          value={instruction}
          maxLength={STAGE_INSTRUCTION_MAX_LENGTH}
          disabled={!canEdit}
          onChange={(e) => setInstruction(e.target.value)}
        />
        <p style={{ ...GF, margin: "6px 0 0", fontSize: 11, color: WF.slate4 }}>
          Plain text only, up to {STAGE_INSTRUCTION_MAX_LENGTH} characters.
        </p>
      </Disclosure>

      {/* ── Remove ──────────────────────────────────────────────────────── */}
      {canEdit && (
        <div style={{ borderTop: `1px solid ${WF.slate1}`, paddingTop: 16, marginTop: 16 }}>
          <button
            type="button"
            className="wf-btn wf-btn-danger wf-btn-sm"
            onClick={() => confirm({
              title: "Remove this person from the stage?",
              body: `${assignment.participantName} will be removed from "${stage.name}". This only changes the draft configuration — no invitation is withdrawn and no completed action is undone.`,
              confirmLabel: "Remove from stage",
              destructive: true,
              onConfirm: onRemove,
            })}
          >
            Remove from this stage
          </button>
        </div>
      )}

      {confirmDialog}
    </Sheet>
  );
}

// ── Add Person picker ─────────────────────────────────────────────────────────

export interface AddPersonPanelProps {
  stage:      SigningStage;
  candidates: WorkflowParticipantCandidate[];
  /** Participant IDs already assigned in this stage — shown but not selectable. */
  alreadyInStage: string[];
  /** Participant IDs assigned in a different stage — selectable, with a warning. */
  inOtherStages: Record<string, string[]>;
  onAdd:      (input: AddStageParticipantInput) => void;
  onClose:    () => void;
}

export function AddPersonPanel({
  stage, candidates, alreadyInStage, inOtherStages, onAdd, onClose,
}: AddPersonPanelProps) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<StageParticipantAction>(
    stage.type === "distribution" ? "receive-copy" : "sign",
  );
  const [signatureRequired, setSignatureRequired] = useState(stage.type !== "distribution");
  const [initialsRequired, setInitialsRequired] = useState(false);

  const normalized = query.trim().toLowerCase();
  const filtered = candidates.filter(c =>
    !normalized
    || c.name.toLowerCase().includes(normalized)
    || (c.organization ?? "").toLowerCase().includes(normalized),
  );
  const selected = candidates.find(c => c.participantId === selectedId) ?? null;
  const duplicateStages = selectedId ? (inOtherStages[selectedId] ?? []) : [];

  function changeAction(next: StageParticipantAction) {
    setAction(next);
    if (actionForbidsSignature(next)) { setSignatureRequired(false); setInitialsRequired(false); }
    else if (actionAlwaysRequiresSignature(next)) { setSignatureRequired(true); }
  }

  return (
    <Sheet
      title={`Add Person to ${stage.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="wf-btn wf-btn-secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="wf-btn wf-btn-primary"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              onAdd({
                participantId: selected.participantId,
                participantName: selected.name,
                participantEmailMasked: selected.emailMasked,
                participantOrganization: selected.organization,
                participantSource: selected.source,
                action,
                signatureRequired,
                initialsRequired,
              });
            }}
          >
            Add to Stage
          </button>
        </>
      }
    >
      <div className="wf-row" style={{ gap: 8, marginBottom: 12 }}>
        <Search size={16} color={WF.slate5} aria-hidden />
        <label htmlFor="wf-person-search" className="wf-visually-hidden">Search people</label>
        <input
          id="wf-person-search"
          className="wf-input"
          type="search"
          placeholder="Search by name or organization"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <p style={{ ...GF, margin: "0 0 12px", fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>
        Adding someone here assigns where they act. It does not grant document access, does not
        create an account, and does not send an invitation. Access is issued only through the
        document's own participant flow.
      </p>

      <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
        <legend className="wf-visually-hidden">Choose a person</legend>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 && (
            <li style={{ ...GF, fontSize: 13, color: WF.slate5, padding: "12px 0" }}>
              No one matches that search.{" "}
              <button type="button" className="wf-btn wf-btn-ghost wf-btn-sm" onClick={() => setQuery("")}>
                Clear Search
              </button>
            </li>
          )}
          {filtered.map(c => {
            const already = alreadyInStage.includes(c.participantId);
            const inputId = `wf-cand-${c.participantId}`;
            return (
              <li key={`${c.source}-${c.participantId}`}>
                <label
                  htmlFor={inputId}
                  style={{
                    display: "flex", gap: 10, alignItems: "flex-start", padding: 12, minHeight: 44,
                    border: `1.5px solid ${selectedId === c.participantId ? WF.azure : WF.slate2}`,
                    background: already ? WF.slate0 : selectedId === c.participantId ? WF.azureSoft : WF.white,
                    borderRadius: 10, cursor: already ? "not-allowed" : "pointer",
                    opacity: already ? 0.65 : 1,
                  }}
                >
                  <input
                    id={inputId}
                    type="radio"
                    name="wf-candidate"
                    checked={selectedId === c.participantId}
                    disabled={already}
                    onChange={() => setSelectedId(c.participantId)}
                    style={{ marginTop: 4, width: 18, height: 18, flexShrink: 0 }}
                  />
                  <ParticipantAvatar name={c.name} size={30} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ ...GF, display: "block", fontSize: 13, fontWeight: 700, color: WF.navy, overflowWrap: "anywhere" }}>
                      {c.name}
                    </span>
                    <span style={{ ...GF, display: "block", fontSize: 11, color: WF.slate5, overflowWrap: "anywhere" }}>
                      {c.emailMasked}{c.organization && ` · ${c.organization}`}
                    </span>
                    <span style={{ display: "inline-block", marginTop: 6 }}>
                      <WorkflowPill
                        label={
                          c.source === "document-participant" ? "Document participant"
                          : c.source === "workspace-member"   ? "Workspace member"
                          : c.source === "template-role"      ? "Template role"
                          : "Contact"
                        }
                        tone={TONES.neutral}
                      />
                    </span>
                    {already && (
                      <span style={{ ...GF, display: "block", fontSize: 11, color: WF.slate5, marginTop: 6 }}>
                        Already in this stage.
                      </span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {duplicateStages.length > 0 && (
        <div
          className="wf-card"
          style={{ marginTop: 14, padding: 12, background: TONES.warning.bg, borderColor: TONES.warning.border }}
        >
          <p className="wf-row" style={{ gap: 8, margin: 0 }}>
            <AlertTriangle size={15} color={TONES.warning.text} aria-hidden />
            <span style={{ ...GF, fontSize: 12, color: TONES.warning.text, lineHeight: 1.6 }}>
              This person is already assigned in {duplicateStages.join(", ")}. Each assignment is a
              separate action they must complete — it is not treated as one action.
            </span>
          </p>
        </div>
      )}

      {selected && (
        <section aria-label="Required action" style={{ borderTop: `1px solid ${WF.slate1}`, paddingTop: 16, marginTop: 16 }}>
          <h3 style={{ ...GF, margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: WF.navy }}>
            What must {selected.name} do?
          </h3>
          <label htmlFor="wf-add-action" className="wf-visually-hidden">Required action</label>
          <select
            id="wf-add-action"
            className="wf-select"
            value={action}
            onChange={(e) => changeAction(e.target.value as StageParticipantAction)}
          >
            {STAGE_PARTICIPANT_ACTIONS.map(a => (
              <option key={a} value={a}>{STAGE_ACTION_LABELS[a]}</option>
            ))}
          </select>
          <p style={{ ...GF, margin: "8px 0 12px", fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>
            {STAGE_ACTION_DESCRIPTIONS[action]}
          </p>

          <label className="wf-row" style={{ gap: 10, minHeight: 44 }}>
            <input
              type="checkbox"
              checked={signatureRequired}
              disabled={actionForbidsSignature(action) || actionAlwaysRequiresSignature(action)}
              onChange={(e) => setSignatureRequired(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ ...GF, fontSize: 13, fontWeight: 600, color: WF.slate7 }}>
              Electronic signature required
            </span>
          </label>
          <label className="wf-row" style={{ gap: 10, minHeight: 44 }}>
            <input
              type="checkbox"
              checked={initialsRequired}
              disabled={actionForbidsSignature(action)}
              onChange={(e) => setInitialsRequired(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ ...GF, fontSize: 13, fontWeight: 600, color: WF.slate7 }}>
              Initials required
            </span>
          </label>
        </section>
      )}
    </Sheet>
  );
}

export { Sheet as WorkflowSheet };

// C13 — Onboarding step 2 of 4: Workspace.
//
// Three choices:
//   personal / team — name a workspace. With a real backend, Continue CREATES
//                     it now (POST /workspaces via platform.createWorkspace).
//                     Coming back and continuing again RENAMES that same
//                     workspace (PATCH /workspaces/:id) — never a second one.
//                     An account that already had a workspace before
//                     onboarding keeps it; nothing new is created.
//   join            — paste a join link. It is checked as you type
//                     (POST /workspace-join/preview) and Continue sends a join
//                     request (POST /workspace-join/requests). Joining creates
//                     no workspace; membership starts when an owner or admin
//                     approves.
//
// Demo build (no VITE_API_BASE_URL): answers are kept in the onboarding draft
// and the join calls answer from a deterministic stand-in.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Building2 } from "lucide-react";
import { useOnboarding } from "../../context/OnboardingContext";
import { usePlatform, type WorkspaceStatus } from "../../context/PlatformContext";
import {
  OnboardingLayout,
  OnboardingCard,
  OnboardingActions,
} from "../../layouts/OnboardingLayout";
import type { WorkspaceScenario } from "../../models/auth";
import { USE_REAL_BACKEND } from "../../services/backend-flag";
import { ApiError } from "../../services/api-client";
import { realWorkspaceService } from "../../services/real/workspace.service";
import {
  extractJoinToken, previewJoinLink, submitJoinRequest, JOIN_MESSAGES,
} from "../../services/real/workspace-join.service";
import { Field, FieldError, FieldGroup, Notice, RadioCard } from "./onboarding-ui";
import { describedBy, inputStyle, GF, NAVY } from "./onboarding-form";
import { TeamInvitesSlot } from "./TeamInvitesSlot";
import { sendTeamInvites } from "./team-invites";

/** Onboarding's cap. The backend allows up to 200 code points
 *  (WORKSPACE_NAME_MAX_LENGTH in Lagda-Backend/packages/contracts); 100 is
 *  plenty for a name that has to fit the workspace switcher. */
const WORKSPACE_NAME_MAX = 100;
const JOIN_REASON_MAX = 500;
const PREVIEW_DEBOUNCE_MS = 400;
/** How long the "Request sent" note stays up before moving on. */
const JOIN_SENT_PAUSE_MS = 1500;

const SCENARIOS: { id: Exclude<WorkspaceScenario, "">; title: string; desc: string }[] = [
  { id: "personal", title: "Just me — a personal workspace", desc: "Your own documents, templates and contacts." },
  { id: "team", title: "With a team — invite colleagues", desc: "A shared workspace you can invite people into." },
  { id: "join", title: "Join an existing workspace", desc: "You have a join link from a workspace owner or admin." },
];

type Preview =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ok"; workspaceName: string; invitedByName: string | null }
  | { status: "bad"; message: string };

function firstNameOf(...candidates: (string | undefined | null)[]): string | null {
  for (const c of candidates) {
    const first = c?.trim().split(/\s+/)[0];
    if (first) return first;
  }
  return null;
}

export function OnboardingWorkspace() {
  const navigate = useNavigate();
  const platform = usePlatform();
  const { draft, updateWorkspace, markStepDone } = useOnboarding();
  const ws = draft.workspace;
  const scenario = ws.scenario;

  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [joinNote, setJoinNote] = useState<{ tone: "success" | "info"; text: string } | null>(null);
  const [preview, setPreview] = useState<Preview>({ status: "idle" });
  // A request already sent in an earlier visit counts until the link is edited.
  const [linkEdited, setLinkEdited] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); }, []);

  function defaultName(): string {
    const first = firstNameOf(draft.profile.fullName, platform.user?.fullName, platform.user?.displayName);
    return first ? `${first}'s Workspace` : "My Workspace";
  }

  function chooseScenario(next: WorkspaceScenario) {
    const patch: Partial<typeof ws> = { scenario: next };
    if ((next === "personal" || next === "team") && ws.workspaceName.trim() === "") {
      patch.workspaceName = defaultName();
    }
    updateWorkspace(patch);
    setScenarioError(null);
    setServerError(null);
    setJoinError(null);
  }

  // ── Join link: check it as it is typed or pasted (debounced) ────────────────
  useEffect(() => {
    if (scenario !== "join") return;
    const raw = ws.joinLink.trim();
    if (raw === "") {
      setPreview({ status: "idle" });
      return;
    }
    let stale = false;
    setPreview({ status: "checking" });
    const handle = setTimeout(() => {
      const token = extractJoinToken(raw);
      if (!token) {
        setPreview({ status: "bad", message: JOIN_MESSAGES.invalid });
        return;
      }
      void previewJoinLink(token).then((result) => {
        if (stale) return;
        switch (result.kind) {
          case "ok":
            setPreview({ status: "ok", workspaceName: result.workspaceName, invitedByName: result.invitedByName });
            break;
          case "used":
            setPreview({ status: "bad", message: JOIN_MESSAGES.used });
            break;
          case "invalid":
            setPreview({ status: "bad", message: JOIN_MESSAGES.invalid });
            break;
          default:
            setPreview({ status: "bad", message: JOIN_MESSAGES.error });
        }
      });
    }, PREVIEW_DEBOUNCE_MS);
    return () => { stale = true; clearTimeout(handle); };
  }, [scenario, ws.joinLink]);

  function finish() {
    markStepDone("workspace");
    void navigate("/onboarding/security");
  }

  /** Team workspace: create (and, where asked, email) the join links queued
   *  in TeamInvitesSlot. False keeps the person on this step to fix them. */
  async function sendQueuedInvites(workspaceId: string | null): Promise<boolean> {
    const invites = ws.teamInvites ?? [];
    if (scenario !== "team" || invites.every((i) => i.status === "done")) return true;
    if (workspaceId === null) {
      setServerError("We couldn't find your workspace to create the join links. Try again, or remove them and add them later from Workspace → Members.");
      return false;
    }
    const updated = await sendTeamInvites(workspaceId, invites);
    updateWorkspace({ teamInvites: updated });
    if (updated.some((i) => i.status === "failed")) {
      setServerError("Some join links couldn't be created. Try again, or remove them and add them later from Workspace → Members.");
      return false;
    }
    return true;
  }

  // ── Continue: personal / team ───────────────────────────────────────────────
  async function continueWithWorkspace() {
    const name = ws.workspaceName.trim();
    if (!name) { setNameError("Give your workspace a name."); focus("ws-name"); return; }
    if (name.length > WORKSPACE_NAME_MAX) {
      setNameError(`Workspace name can be at most ${WORKSPACE_NAME_MAX} characters.`);
      focus("ws-name");
      return;
    }

    if (!USE_REAL_BACKEND) {
      updateWorkspace({ workspaceName: name, savedName: name });
      setSaving(true);
      const invitesSent = await sendQueuedInvites("demo");
      setSaving(false);
      if (invitesSent) finish();
      return;
    }

    setSaving(true);
    // The workspace the queued join links belong to, once it is known.
    let workspaceId: string | null = ws.createdWorkspaceId
      ?? (ws.usedExistingWorkspace ? platform.currentWorkspace?.id ?? null : null);
    try {
      if (ws.createdWorkspaceId) {
        // Revisit: the workspace already exists — rename it, don't make another.
        if (name !== ws.savedName) await realWorkspaceService.rename(ws.createdWorkspaceId, name);
      } else if (!ws.usedExistingWorkspace) {
        let status: WorkspaceStatus = platform.workspaceStatus;
        if (status === "initializing" || status === "error") {
          const refreshed = await platform.refreshSessionFromBackend();
          status = refreshed.status === "authenticated" ? refreshed.workspaceStatus : "error";
        }
        if (status === "empty") {
          const created = await platform.createWorkspace(name);
          if (!created.ok) {
            setServerError(created.error);
            setSaving(false);
            return;
          }
          updateWorkspace({ createdWorkspaceId: created.workspace.id });
          workspaceId = created.workspace.id;
        } else if (status === "ready") {
          // The account already has a workspace (e.g. it was set up before
          // this onboarding). Use it; creating a second one is not what
          // anyone pressing Continue here expects.
          updateWorkspace({ usedExistingWorkspace: true });
          workspaceId = platform.currentWorkspace?.id ?? null;
        } else {
          setServerError("We couldn't check your workspaces right now. Please try again.");
          setSaving(false);
          return;
        }
      }
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "We couldn't save your workspace. Please try again.");
      setSaving(false);
      return;
    }
    updateWorkspace({ workspaceName: name, savedName: name });
    const invitesSent = await sendQueuedInvites(workspaceId);
    setSaving(false);
    if (invitesSent) finish();
  }

  // ── Continue: join ──────────────────────────────────────────────────────────
  async function continueWithJoin() {
    if (ws.joinRequest && !linkEdited) { finish(); return; }
    const token = extractJoinToken(ws.joinLink);
    if (!token || preview.status !== "ok") {
      setJoinError(ws.joinLink.trim() === "" ? "Paste your join link to continue." : JOIN_MESSAGES.invalid);
      focus("ws-join-link");
      return;
    }
    const reason = ws.joinReason.trim();
    if (reason.length > JOIN_REASON_MAX) {
      setJoinError(`Keep the reason under ${JOIN_REASON_MAX} characters.`);
      return;
    }
    const fullName = draft.profile.fullName.trim()
      || platform.user?.fullName || platform.user?.displayName || "";

    setSaving(true);
    const result = await submitJoinRequest(token, { fullName, reason: reason === "" ? null : reason });
    setSaving(false);
    switch (result.kind) {
      case "sent":
        updateWorkspace({ joinRequest: { workspaceName: result.workspaceName, state: "sent" } });
        setJoinNote({ tone: "success", text: "Request sent — you'll be notified when an owner or admin approves." });
        break;
      case "pending":
        updateWorkspace({ joinRequest: { workspaceName: preview.workspaceName, state: "pending" } });
        setJoinNote({ tone: "info", text: JOIN_MESSAGES.pending });
        break;
      case "used":
        setPreview({ status: "bad", message: JOIN_MESSAGES.used });
        setJoinError(JOIN_MESSAGES.used);
        return;
      case "invalid":
        setPreview({ status: "bad", message: JOIN_MESSAGES.invalid });
        setJoinError(JOIN_MESSAGES.invalid);
        return;
      case "already-member":
        setJoinError(JOIN_MESSAGES.alreadyMember);
        return;
      default:
        setServerError(result.message);
        return;
    }
    setLinkEdited(false);
    markStepDone("workspace");
    leaveTimer.current = setTimeout(() => { void navigate("/onboarding/security"); }, JOIN_SENT_PAUSE_MS);
  }

  function focus(id: string) {
    setTimeout(() => document.getElementById(id)?.focus(), 0);
  }

  async function handleContinue() {
    if (saving || joinNote) return;
    setServerError(null);
    if (scenario === "") {
      setScenarioError("Choose how you'll use LAGDA.");
      return;
    }
    if (scenario === "join") await continueWithJoin();
    else await continueWithWorkspace();
  }

  const joinReady = ws.joinRequest !== null && !linkEdited ? true : preview.status === "ok";
  const continueDisabled = scenario === "join" && !joinReady;

  return (
    <OnboardingLayout>
      <OnboardingCard
        icon={Building2}
        title="Set up your workspace"
        description="Your documents, templates and contacts live here."
      >
        <FieldGroup>
          {serverError && <Notice tone="error">{serverError}</Notice>}

          <fieldset style={{ border: "none", margin: 0, padding: 0, minWidth: 0 }}
            aria-describedby={scenarioError ? "ws-scenario-err" : undefined}>
            <legend style={{ ...GF, color: NAVY, fontSize: 15, fontWeight: 700, marginBottom: 10, padding: 0 }}>
              How will you use LAGDA? <span aria-hidden style={{ color: "#0078D4" }}>*</span>
            </legend>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SCENARIOS.map((s) => (
                <RadioCard
                  key={s.id}
                  name="ws-scenario"
                  value={s.id}
                  checked={scenario === s.id}
                  onChange={(v) => chooseScenario(v as WorkspaceScenario)}
                  title={s.title}
                  description={s.desc}
                />
              ))}
            </div>
            {scenarioError && <FieldError id="ws-scenario-err">{scenarioError}</FieldError>}
          </fieldset>

          {(scenario === "personal" || scenario === "team") && (
            <>
              <Field id="ws-name" label="Workspace name" required error={nameError ?? undefined}
                hint="You can rename it later.">
                <input
                  id="ws-name"
                  type="text"
                  value={ws.workspaceName}
                  onChange={(e) => { updateWorkspace({ workspaceName: e.target.value }); setNameError(null); }}
                  maxLength={WORKSPACE_NAME_MAX}
                  aria-required
                  aria-invalid={!!nameError}
                  aria-describedby={describedBy("ws-name", nameError ?? undefined, true)}
                  placeholder="Mabini Legal Solutions"
                  style={inputStyle(!!nameError)}
                />
              </Field>
              {scenario === "team" && <TeamInvitesSlot />}
            </>
          )}

          {scenario === "join" && (
            <>
              <Field id="ws-join-link" label="Paste your join link" required error={joinError ?? undefined}>
                <input
                  id="ws-join-link"
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={ws.joinLink}
                  onChange={(e) => {
                    updateWorkspace({ joinLink: e.target.value });
                    setLinkEdited(true);
                    setJoinError(null);
                  }}
                  aria-required
                  aria-invalid={!!joinError || preview.status === "bad"}
                  aria-describedby={joinError ? "ws-join-link-err" : "ws-join-status"}
                  placeholder="https://lagda.ph/join/…"
                  style={inputStyle(!!joinError)}
                />
              </Field>
              <div id="ws-join-status" aria-live="polite" style={{ ...GF, fontSize: 14, marginTop: -8, minHeight: 20 }}>
                {preview.status === "checking" && <span style={{ color: "#64748B" }}>Checking link…</span>}
                {preview.status === "ok" && (
                  <span style={{ color: "#1E6B41", fontWeight: 600 }}>
                    ✓ {preview.workspaceName}
                    {preview.invitedByName ? ` — invited by ${preview.invitedByName}` : ""}
                  </span>
                )}
                {preview.status === "bad" && !joinError && (
                  <span style={{ color: "#B42318", fontWeight: 600 }}>✗ {preview.message}</span>
                )}
              </div>
              <Field id="ws-join-reason" label="Reason for joining" optional
                hint="Helps the owner recognise your request.">
                <textarea
                  id="ws-join-reason"
                  value={ws.joinReason}
                  onChange={(e) => updateWorkspace({ joinReason: e.target.value })}
                  maxLength={JOIN_REASON_MAX}
                  rows={3}
                  aria-describedby="ws-join-reason-hint"
                  placeholder="I'm joining the litigation team."
                  style={{ ...inputStyle(false), resize: "vertical", lineHeight: 1.5 }}
                />
              </Field>
              {ws.joinRequest && !linkEdited && !joinNote && (
                <Notice tone="success">
                  Join request sent to {ws.joinRequest.workspaceName} — waiting for approval.
                </Notice>
              )}
              {joinNote && <Notice tone={joinNote.tone} live>{joinNote.text}</Notice>}
            </>
          )}
        </FieldGroup>

        <OnboardingActions
          onBack={() => { void navigate("/onboarding/profile"); }}
          onContinue={() => { void handleContinue(); }}
          submitting={saving}
          disabled={continueDisabled || joinNote !== null}
          continueLabel="Continue"
        />
      </OnboardingCard>
    </OnboardingLayout>
  );
}

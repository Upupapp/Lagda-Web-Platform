// Who must pass "ID and face verification" on the document being prepared.
//
// ── Why this is not part of the draft ──────────────────────────────────────
//
// The draft's `auth` (PrepAuthConfig) is demonstration-era state: it never
// reaches a server, and real mode refuses every value but "none". This is the
// opposite: the server holds the set, and this hook only mirrors it. So it
// reads and writes through its own small service and touches nothing in the
// draft, the readiness check or the demo build.
//
// ── Nothing changes unless the feature is there ────────────────────────────
//
// `status` is "off" in the demo build, outside a workspace, while the answer
// is unknown, when the server says the check is not available here, and on
// any failure to find out. Callers render nothing new for "off".

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOptionalPlatform } from "../context/PlatformContext";
import { usePrepare } from "../context/PrepareContext";
import { USE_REAL_BACKEND } from "../services/backend-flag";
import {
  realIdentityCheckService, describeIdentityRequirementError,
  type IdentityCheckAvailability,
} from "../services/real/identity-check.service";
import { roleCanBeAskedForIdentityCheck, type IdentityCheckMode } from "../models/identity-check";

export type IdentityRequirementsStatus =
  /** Render nothing new. */
  | "off"
  /** Offered here, but the workspace's plan does not include it. */
  | "plan-locked"
  /** Available; the document's current set is being read. */
  | "loading"
  | "ready";

export type IdentityRequirementsSaveState = "idle" | "saving" | "saved" | "failed";

export interface IdentityRequirementsControl {
  readonly status: IdentityRequirementsStatus;
  readonly mode: IdentityCheckMode | null;
  /**
   * `hosted`: the participant is taken to the identity verification partner's
   * page. Absent means `inline`, as from a server that does not say.
   */
  readonly flow?: "inline" | "hosted";
  /** False when there is no saved document to attach a requirement to yet. */
  readonly canEdit: boolean;
  readonly saveState: IdentityRequirementsSaveState;
  /** Why the last save failed, in plain words. */
  readonly error: string | null;
  isRequired: (email: string) => boolean;
  /** The sender already allowed this participant a lighter method. */
  isWaived: (email: string) => boolean;
  setRequired: (email: string, required: boolean) => void;
  /** Adds every signer to the set, keeping whoever is already in it. */
  requireAllSigners: () => void;
  clear: () => void;
}

const key = (email: string) => email.trim().toLowerCase();

const OFF_CONTROL: IdentityRequirementsControl = {
  status: "off", mode: null, canEdit: false, saveState: "idle", error: null,
  isRequired: () => false, isWaived: () => false,
  setRequired: () => undefined, requireAllSigners: () => undefined, clear: () => undefined,
};

export function useIdentityCheckRequirements(): IdentityRequirementsControl {
  const platform = useOptionalPlatform();
  const { draft } = usePrepare();
  const workspaceId = USE_REAL_BACKEND ? platform?.currentWorkspace?.id : undefined;
  // The same "first really uploaded file" the participant sync uses: the
  // server keeps participants, and so requirements, per document.
  const files = draft?.files ?? [];
  const documentId = files.find(file => file.backendDocumentId)?.backendDocumentId;

  const [availability, setAvailability] = useState<IdentityCheckAvailability | null>(null);
  /** The set as the screen shows it: optimistic while a save is in flight. */
  const [shown, setShown] = useState<ReadonlySet<string> | null>(null);
  const [waived, setWaived] = useState<ReadonlySet<string>>(() => new Set());
  const [saveState, setSaveState] = useState<IdentityRequirementsSaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  /** The set the server last confirmed: what a failed save rolls back to. */
  const confirmedRef = useRef<ReadonlySet<string>>(new Set());
  /** The newest set asked for while a save was already in flight. */
  const queuedRef = useRef<readonly string[] | null>(null);
  const savingRef = useRef(false);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  // Addresses of the participants who can be asked, as they stand right now.
  // Whoever left the document in the Participants step is not among them, and
  // so drops out of every set this hook sends.
  const participants = draft?.participants;
  const eligible = useMemo(
    () => (participants ?? []).filter(p => roleCanBeAskedForIdentityCheck(p.role) && p.email.trim() !== ""),
    [participants]);
  const eligibleRef = useRef(eligible);
  eligibleRef.current = eligible;

  useEffect(() => {
    setAvailability(null);
    if (workspaceId === undefined) return;
    let cancelled = false;
    realIdentityCheckService.availability(workspaceId)
      .then(result => { if (!cancelled) setAvailability(result); })
      // Not knowing is treated as not offered: the step stays as it was.
      .catch(() => { if (!cancelled) setAvailability(null); });
    return () => { cancelled = true; };
  }, [workspaceId]);

  const usable = availability !== null && availability.available && availability.planAllows;
  const [featureOff, setFeatureOff] = useState(false);

  useEffect(() => {
    setShown(null);
    setFeatureOff(false);
    setSaveState("idle");
    setError(null);
    confirmedRef.current = new Set();
    queuedRef.current = null;
    if (!usable || workspaceId === undefined) return;
    if (documentId === undefined) { setShown(new Set()); return; }
    let cancelled = false;
    realIdentityCheckService.requirements(workspaceId, documentId)
      .then(items => {
        if (cancelled) return;
        // 404: the routes are not registered, whatever availability said.
        if (items === null) { setFeatureOff(true); return; }
        const set = new Set(items.map(item => key(item.email)));
        confirmedRef.current = set;
        setShown(set);
        setWaived(new Set(items.filter(item => item.waivedAt !== null).map(item => key(item.email))));
      })
      .catch(() => { if (!cancelled) setFeatureOff(true); });
    return () => { cancelled = true; };
  }, [usable, workspaceId, documentId]);

  const save = useCallback((emails: readonly string[]) => {
    if (workspaceId === undefined || documentId === undefined) return;
    setShown(new Set(emails));
    setError(null);
    setSaveState("saving");
    if (savingRef.current) { queuedRef.current = emails; return; }
    savingRef.current = true;

    const run = async (sending: readonly string[]): Promise<void> => {
      try {
        const items = await realIdentityCheckService.replaceRequirements(workspaceId, documentId, sending);
        confirmedRef.current = new Set(items.map(item => key(item.email)));
        const next = queuedRef.current;
        queuedRef.current = null;
        if (next !== null) { await run(next); return; }
        if (!aliveRef.current) return;
        setShown(confirmedRef.current);
        setWaived(new Set(items.filter(item => item.waivedAt !== null).map(item => key(item.email))));
        setSaveState("saved");
      } catch (cause) {
        // Whatever was queued behind a failed save was built on it; drop it
        // and show what the server actually holds.
        queuedRef.current = null;
        if (!aliveRef.current) return;
        setShown(confirmedRef.current);
        setError(describeIdentityRequirementError(cause, sending));
        setSaveState("failed");
      }
    };
    void run(emails).finally(() => { savingRef.current = false; });
  }, [workspaceId, documentId]);

  /** What is switched on now, limited to people still on the document. */
  const currentAmongEligible = useCallback((): string[] => {
    const on = shown ?? new Set<string>();
    return [...new Set(eligibleRef.current.map(p => key(p.email)).filter(email => on.has(email)))];
  }, [shown]);

  const setRequired = useCallback((email: string, required: boolean) => {
    const target = key(email);
    const rest = currentAmongEligible().filter(e => e !== target);
    save(required ? [...rest, target] : rest);
  }, [currentAmongEligible, save]);

  const requireAllSigners = useCallback(() => {
    const signers = eligibleRef.current.filter(p => p.role === "signer").map(p => key(p.email));
    save([...new Set([...currentAmongEligible(), ...signers])]);
  }, [currentAmongEligible, save]);

  const clear = useCallback(() => { save([]); }, [save]);

  return useMemo<IdentityRequirementsControl>(() => {
    if (availability === null || !availability.available || featureOff) return OFF_CONTROL;
    const flow = availability.flow === "hosted" ? "hosted" as const : "inline" as const;
    if (!availability.planAllows) return { ...OFF_CONTROL, status: "plan-locked", mode: availability.mode, flow };
    return {
      status: shown === null ? "loading" : "ready",
      mode: availability.mode,
      flow,
      canEdit: shown !== null && documentId !== undefined,
      saveState, error,
      isRequired: email => shown?.has(key(email)) ?? false,
      isWaived: email => waived.has(key(email)),
      setRequired, requireAllSigners, clear,
    };
  }, [availability, featureOff, shown, waived, documentId, saveState, error, setRequired, requireAllSigners, clear]);
}

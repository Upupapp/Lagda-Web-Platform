// "ID and face verification" for a document that is being sent AGAIN.
//
// ── Why a re-send needs its own look at this ───────────────────────────────
//
// The server keeps who must pass the check by the participant's EMAIL on the
// document. A re-send to a new address therefore carried no requirement at
// all: the person replacing somebody who had to show an ID simply skipped it,
// and nothing on the dialog said so.
//
// This reads what the dialog needs to put that in front of the sender before
// they confirm: whether the check is offered here, who must pass it on the
// document as it stands, and how each participant of the request being sent
// again got on (locked out, or allowed a lighter method).
//
// It only READS. The switches are the dialog's own until Send, when the whole
// set is saved in one go, before the new request is made (see
// resend-signing.service.ts).
//
// ── When nothing is shown ──────────────────────────────────────────────────
//
// `off`: the demo build, no workspace, a workspace the check is not offered
// to, a plan that does not include it, or a server without the routes. The
// dialog is then exactly as it was. `loading` and `error` are different: the
// check IS (or may be) offered and what the document holds is not known yet,
// so the dialog must not send until it is.

import { useEffect, useMemo, useState } from "react";
import { USE_REAL_BACKEND } from "../services/backend-flag";
import { realIdentityCheckService } from "../services/real/identity-check.service";
import type { IdentityCheckMode } from "../models/identity-check";
import { identityEmailKey, useIdentityCheckAvailabilityRead } from "./useIdentityCheckRequirements";

export type ResendIdentityStatus = "off" | "loading" | "ready" | "error";

export interface ResendIdentityCheck {
  readonly status: ResendIdentityStatus;
  readonly mode: IdentityCheckMode | null;
  readonly flow: "inline" | "hosted";
  /** Addresses that must pass the check on the document now, lower-cased. */
  readonly required: ReadonlySet<string>;
  /** Address to the instant the sender allowed it a lighter method. */
  readonly waivedAt: ReadonlyMap<string, string>;
  /** Addresses locked out of the check on the request being sent again. */
  readonly locked: ReadonlySet<string>;
  /** Reads everything again, after an `error`. */
  readonly retry: () => void;
}

interface Held {
  readonly required: ReadonlySet<string>;
  readonly waivedAt: ReadonlyMap<string, string>;
  readonly locked: ReadonlySet<string>;
}

const NOTHING: Held = { required: new Set(), waivedAt: new Map(), locked: new Set() };

export function useResendIdentityCheck({ workspaceId, documentId, signingRequestId }: {
  workspaceId: string;
  documentId: string;
  /** The request being sent again, when there is one to read checks from. */
  signingRequestId?: string;
}): ResendIdentityCheck {
  const [attempt, setAttempt] = useState(0);
  const read = useIdentityCheckAvailabilityRead(USE_REAL_BACKEND ? workspaceId : undefined, attempt);
  const usable = read.availability !== null && read.availability.available && read.availability.planAllows;

  const [held, setHeld] = useState<{ state: "loading" | "ready" | "off" | "error"; value: Held }>(
    { state: "loading", value: NOTHING });

  useEffect(() => {
    setHeld({ state: "loading", value: NOTHING });
    if (!usable) return;
    let cancelled = false;
    void (async () => {
      try {
        const [requirements, checks] = await Promise.all([
          realIdentityCheckService.requirements(workspaceId, documentId),
          // How each participant got on is something to SAY, not something
          // the send depends on. If it cannot be read, nothing is said.
          signingRequestId === undefined
            ? Promise.resolve(null)
            : realIdentityCheckService.checks(workspaceId, signingRequestId).catch(() => null),
        ]);
        if (cancelled) return;
        // 404: the routes are not registered, whatever availability said.
        if (requirements === null) { setHeld({ state: "off", value: NOTHING }); return; }
        const waivedAt = new Map<string, string>();
        for (const item of requirements) if (item.waivedAt !== null) waivedAt.set(identityEmailKey(item.email), item.waivedAt);
        const locked = new Set<string>();
        for (const check of checks ?? []) {
          const email = identityEmailKey(check.email);
          if (check.status === "locked") locked.add(email);
          if (check.waivedAt !== null && !waivedAt.has(email)) waivedAt.set(email, check.waivedAt);
        }
        setHeld({
          state: "ready",
          value: { required: new Set(requirements.map(item => identityEmailKey(item.email))), waivedAt, locked },
        });
      } catch {
        if (!cancelled) setHeld({ state: "error", value: NOTHING });
      }
    })();
    return () => { cancelled = true; };
  }, [usable, workspaceId, documentId, signingRequestId, attempt]);

  return useMemo<ResendIdentityCheck>(() => {
    const retry = () => { setAttempt(n => n + 1); };
    const status: ResendIdentityStatus =
      read.state === "none" ? "off"
        : read.state === "loading" ? "loading"
          : read.state === "failed" ? "error"
            : !usable ? "off"
              : held.state;
    return {
      status,
      mode: read.availability?.mode ?? null,
      flow: read.availability?.flow === "hosted" ? "hosted" : "inline",
      required: held.value.required,
      waivedAt: held.value.waivedAt,
      locked: held.value.locked,
      retry,
    };
  }, [read, usable, held]);
}

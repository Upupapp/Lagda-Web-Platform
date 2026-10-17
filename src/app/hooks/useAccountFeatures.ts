// What the server offers THIS ACCOUNT beyond a workspace's own features:
// verifying its identity, and the eNotary gate. Read once per sign-in and
// shared, so the sidebar, the mobile drawer, the My Settings carousel and the
// account menu ask the server one question between them.
//
// ── Nothing is shown until the server says so ──────────────────────────────
//
// Both start as "not offered". A menu entry appears only after the server
// answers `available: true`; a 404 (the route is not there), a refusal or a
// network failure all leave it hidden, silently. Navigation never shows an
// error and never shows a link that leads nowhere.
//
// The demo build has no server to ask. Nothing is requested there and both
// stay "not offered" for good.
//
// Hidden navigation is presentation, never authorization: the pages ask the
// server again themselves, and the server decides.

import { useEffect, useSyncExternalStore } from "react";
import { USE_REAL_BACKEND } from "../services/backend-flag";
import { registerSessionCleanup } from "../services/session-lifecycle";
import { realAccountIdentityService, type AccountIdentity } from "../services/real/account-identity.service";
import { realEnotaryAccessService } from "../services/real/enotary-access.service";
import { realEnotaryInvitationsService } from "../services/real/enotary-invitations.service";
import { realNotaryApplicationsService } from "../services/real/notary-applications.service";

export interface AccountFeatures {
  /** "Identity verification" is offered in My Settings. */
  readonly identityAvailable: boolean;
  /** This account is verified right now. */
  readonly identityVerified: boolean;
  /** The eNotary entry is offered. */
  readonly enotaryAvailable: boolean;
  /** Requests to notaries are offered: the client's list of requests has an entry. */
  readonly notaryRequests: boolean;
  /** This account has a notary desk: an application, or a request waiting on it. */
  readonly notaryDesk: boolean;
  /** This account reviews notary applications (a LAGDA reviewer). */
  readonly notaryReview: boolean;
}

const NONE: AccountFeatures = {
  identityAvailable: false, identityVerified: false, enotaryAvailable: false,
  notaryRequests: false, notaryDesk: false, notaryReview: false,
};

let state: AccountFeatures = NONE;
const listeners = new Set<() => void>();
let subscribers = 0;
let asked = false;
/** Bumped on sign-out and reset, so an answer for the last account is dropped. */
let generation = 0;

function set(next: Partial<AccountFeatures>): void {
  const merged = { ...state, ...next };
  if (merged.identityAvailable === state.identityAvailable
    && merged.identityVerified === state.identityVerified
    && merged.enotaryAvailable === state.enotaryAvailable
    && merged.notaryRequests === state.notaryRequests
    && merged.notaryDesk === state.notaryDesk
    && merged.notaryReview === state.notaryReview) return;
  state = merged;
  for (const listener of listeners) listener();
}

/** What a page that has just read the account's identity knows; null: not offered. */
export function publishAccountIdentity(identity: AccountIdentity | null): void {
  set({
    identityAvailable: identity?.available === true,
    identityVerified: identity?.available === true && identity.status === "verified",
  });
}

/** What a page that has just read the eNotary access knows. */
export function publishEnotaryAvailable(available: boolean): void {
  set({ enotaryAvailable: available });
}

function ask(): void {
  if (!USE_REAL_BACKEND || asked) return;
  asked = true;
  const started = generation;
  realAccountIdentityService.read()
    .then(identity => { if (generation === started) publishAccountIdentity(identity); })
    .catch(() => { /* not offered, as far as navigation is concerned */ });
  realEnotaryAccessService.read("client")
    .then(access => { if (generation === started) publishEnotaryAvailable(access?.available === true); })
    .catch(() => { /* not offered, as far as navigation is concerned */ });
  // The notary on-ramp. Each is its own question, and each answer is one entry.
  realEnotaryInvitationsService.list()
    .then(list => { if (generation === started) set({ notaryRequests: list !== null }); })
    .catch(() => { /* not offered */ });
  realEnotaryInvitationsService.desk()
    .then(desk => {
      if (generation === started) set({ notaryDesk: desk !== null && (desk.applicationStatus !== "none" || desk.requests.length > 0) });
    })
    .catch(() => { /* not offered */ });
  realNotaryApplicationsService.adminList()
    .then(rows => { if (generation === started) set({ notaryReview: rows !== null }); })
    .catch(() => { /* not a reviewer, as far as navigation is concerned */ });
}

// Sign-out: the next account must not inherit this one's entries or badge.
registerSessionCleanup({
  id: "account-features",
  onSignOut: () => {
    generation += 1;
    asked = false;
    set(NONE);
  },
});

/** For tests: forget everything, including that the server was asked. */
export function resetAccountFeatures(): void {
  generation += 1;
  asked = false;
  subscribers = 0;
  state = NONE;
  listeners.clear();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const snapshot = (): AccountFeatures => state;

/** What this account is offered. Asks the server once, the first time anything needs to know. */
export function useAccountFeatures(): AccountFeatures {
  useEffect(() => {
    subscribers += 1;
    if (subscribers === 1) ask();
    return () => { subscribers = Math.max(0, subscribers - 1); };
  }, []);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

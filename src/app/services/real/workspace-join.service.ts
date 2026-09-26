// Joining a workspace with a single-use join link, always approved by an
// owner or administrator (backend 078).
//
// ── Backend contract (Lagda-Backend packages/api/src/workspaces/join-routes.ts)
//
//   The joiner (a join link is a one-time "ticket"):
//     POST /workspace-join/preview   { token }                 public
//       200 { workspaceName, invitedByName | null }
//       404 join_link_invalid  ·  410 join_link_used
//     POST /workspace-join/requests  { token, fullName, reason } signed in
//       201 { requestId, workspaceName, state: "pending" }
//       404 / 410 as above · 409 join_already_member / join_request_pending
//       403 join_email_unverified
//
//   The owner / administrator (session + CSRF):
//     GET    /workspaces/:wid/join-tickets                 → { tickets }
//     POST   /workspaces/:wid/join-tickets                 { label, recipientEmail } → draft
//     PATCH  /workspaces/:wid/join-tickets/:tid            same body, draft only
//     POST   /workspaces/:wid/join-tickets/:tid/send       { email } → sent, fresh link
//     POST   /workspaces/:wid/join-tickets/:tid/withdraw   {} → withdrawn, link dies
//     GET    /workspaces/:wid/join-requests?state=         → { requests }
//     POST   /workspaces/:wid/join-requests/:rid/approve   { roleTitle, canRequestDocuments, canAssignSigners }
//     POST   /workspaces/:wid/join-requests/:rid/decline   {}
//     PATCH  /workspaces/:wid/members/:mid/access          same body as approve
//
// A join REQUEST is not membership: nobody ever joins without an owner or
// administrator approving. A link is dead once used or withdrawn; "Send
// again" issues a NEW link and the old one stays dead. There is no
// time-based expiry.
//
// In the demo build (no VITE_API_BASE_URL) every call answers from a small
// in-memory stand-in so the whole flow can be walked end to end.

import { apiRequest, ApiError } from "../api-client";
import { USE_REAL_BACKEND } from "../backend-flag";

export const JOIN_TICKET_LABEL_MAX = 120;
export const JOIN_ROLE_TITLE_MAX = 120;
export const JOIN_REASON_MAX = 500;
export const JOIN_FULL_NAME_MAX = 200;
/** What an approved person is called when no role title was typed. */
export const NEW_COMER_LABEL = "New Comer";

export const JOIN_MESSAGES = {
  used: "Someone already used this link. Ask the workspace owner for a new one.",
  invalid: "This join link isn't valid. It may have been withdrawn. Ask the workspace owner for a new one.",
  alreadyMember: "You're already a member of this workspace.",
  pending: "You already have a request waiting for approval.",
  emailUnverified: "Verify your account's email address before asking to join a workspace.",
  error: "We couldn't check this join link right now. Try again in a moment.",
  submitError: "We couldn't send your request. Please try again.",
} as const;

// ── Joiner side ──────────────────────────────────────────────────────────────

export type JoinPreviewResult =
  | { kind: "ok"; workspaceName: string; invitedByName: string | null }
  | { kind: "used" }
  | { kind: "invalid" }
  | { kind: "error" };

export type JoinSubmitResult =
  | { kind: "sent"; workspaceName: string }
  | { kind: "used" }
  | { kind: "invalid" }
  | { kind: "already-member" }
  | { kind: "pending" }
  | { kind: "error"; message: string; reason?: "email-unverified" | "signed-out" };

export interface JoinRequestInput {
  fullName: string;
  reason: string | null;
}

// ── Owner / administrator side ───────────────────────────────────────────────

export type JoinTicketState = "draft" | "sent" | "withdrawn";
export type JoinRequestState = "pending" | "approved" | "declined";

export interface JoinTicket {
  ticketId: string;
  label: string;
  recipientEmail: string | null;
  state: JoinTicketState;
  /** The live link — only while Sent (and still unused, for Copy / QR). */
  linkUrl: string | null;
  sentAt: number | null;
  withdrawnAt: number | null;
  usedAt: number | null;
  request: null | { requestId: string; fullName: string; state: JoinRequestState };
  createdAt: number;
  updatedAt: number;
}

export interface JoinTicketInput {
  label: string;
  recipientEmail: string | null;
}

export interface JoinRequest {
  requestId: string;
  sourceKind: "ticket" | "invitation";
  ticketLabel: string | null;
  fullName: string;
  email: string;
  reason: string | null;
  requestedRole: string;
  state: JoinRequestState;
  createdAt: number;
  decidedAt: number | null;
}

export interface MemberAccessInput {
  roleTitle?: string | null;
  canRequestDocuments?: boolean;
  canAssignSigners?: boolean;
}

/** A management call failed; `message` is safe to show as-is. */
export class JoinActionError extends Error {
  readonly status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "JoinActionError";
    this.status = status;
  }
}

// Tokens are URL-safe: letters, digits and - _ . ~ — anything else (a space,
// a slash, a query string glued on) means the paste was not a link.
const TOKEN_PATTERN = /^[A-Za-z0-9._~-]{6,512}$/;

/**
 * The token out of whatever was pasted: a full link
 * (`https://host/join/<token>`, with or without a query or trailing slash),
 * a path (`/join/<token>`), or the bare token. Returns null when the input is
 * none of those.
 */
export function extractJoinToken(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;

  const marker = trimmed.lastIndexOf("/join/");
  let candidate: string;
  if (marker >= 0) {
    const after = trimmed.slice(marker + "/join/".length);
    candidate = after.split(/[?#]/)[0]?.split("/")[0] ?? "";
  } else if (/[/:?#\s]/.test(trimmed)) {
    // A URL (or anything with separators) that is not a join link.
    return null;
  } else {
    candidate = trimmed;
  }

  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    return null;
  }
  return TOKEN_PATTERN.test(candidate) ? candidate : null;
}

function errorCode(err: ApiError): string | undefined {
  return err.body?.code;
}

/** Whether a join link's token looks well formed before any call is made. */
export function isPlausibleJoinToken(token: string | undefined): token is string {
  return typeof token === "string" && TOKEN_PATTERN.test(token);
}

// ── Demo stand-in ────────────────────────────────────────────────────────────
//
// One module-level store for the demo build: tickets, requests, and any access
// an owner granted. Seeded so every tab and state has something in it.

interface DemoTicket extends JoinTicket {
  token: string | null;
}

interface DemoStore {
  tickets: DemoTicket[];
  requests: JoinRequest[];
  access: Map<string, Required<MemberAccessInput>>;
  /** Tokens of withdrawn links — dead for good, even after "Send again". */
  dead: Set<string>;
  seq: number;
}

const HOUR = 3_600_000;

function demoOrigin(): string {
  return typeof window !== "undefined" && window.location?.origin ? window.location.origin : "https://app.lagda.ph";
}

function demoToken(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let out = "";
  const bytes = new Uint8Array(43);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  for (const b of bytes) out += alphabet[b % 64];
  return out;
}

function seedDemoStore(): DemoStore {
  const now = Date.now();
  const tickets: DemoTicket[] = [
    {
      ticketId: "jt_demo_draft", label: "Finance team", recipientEmail: "finance.lead@example.com",
      state: "draft", linkUrl: null, token: null, sentAt: null, withdrawnAt: null, usedAt: null,
      request: null, createdAt: now - 2 * HOUR, updatedAt: now - 2 * HOUR,
    },
    {
      ticketId: "jt_demo_sent", label: "Litigation associate", recipientEmail: "associate@example.com",
      state: "sent", linkUrl: null, token: "demoLitigationAssociateLinkToken00000000001",
      sentAt: now - 26 * HOUR, withdrawnAt: null, usedAt: null,
      request: null, createdAt: now - 30 * HOUR, updatedAt: now - 26 * HOUR,
    },
    {
      ticketId: "jt_demo_used", label: "Front desk", recipientEmail: null,
      state: "sent", linkUrl: null, token: "demoFrontDeskLinkToken0000000000000000000002",
      sentAt: now - 72 * HOUR, withdrawnAt: null, usedAt: now - 5 * HOUR,
      request: { requestId: "jr_demo_1", fullName: "Maria Santos", state: "pending" },
      createdAt: now - 80 * HOUR, updatedAt: now - 5 * HOUR,
    },
    {
      ticketId: "jt_demo_withdrawn", label: "Summer intern", recipientEmail: "intern@example.com",
      state: "withdrawn", linkUrl: null, token: null,
      sentAt: now - 240 * HOUR, withdrawnAt: now - 200 * HOUR, usedAt: null,
      request: null, createdAt: now - 250 * HOUR, updatedAt: now - 200 * HOUR,
    },
  ];
  const requests: JoinRequest[] = [
    {
      requestId: "jr_demo_1", sourceKind: "ticket", ticketLabel: "Front desk", fullName: "Maria Santos",
      email: "maria.santos@example.com", reason: "I will handle client intake and document requests.",
      requestedRole: "member", state: "pending", createdAt: now - 5 * HOUR, decidedAt: null,
    },
    {
      requestId: "jr_demo_2", sourceKind: "invitation", ticketLabel: null, fullName: "Jose Cruz",
      email: "jose.cruz@example.com", reason: null,
      requestedRole: "member", state: "pending", createdAt: now - 9 * HOUR, decidedAt: null,
    },
    {
      requestId: "jr_demo_3", sourceKind: "ticket", ticketLabel: "Paralegal", fullName: "Liza Tan",
      email: "liza.tan@example.com", reason: "Joining the litigation team.",
      requestedRole: "member", state: "approved", createdAt: now - 120 * HOUR, decidedAt: now - 118 * HOUR,
    },
    {
      requestId: "jr_demo_4", sourceKind: "ticket", ticketLabel: "Open house", fullName: "Ramon Diaz",
      email: "ramon.diaz@example.com", reason: null,
      requestedRole: "member", state: "declined", createdAt: now - 150 * HOUR, decidedAt: now - 149 * HOUR,
    },
  ];
  return { tickets, requests, access: new Map(), dead: new Set(), seq: 0 };
}

let demo: DemoStore = seedDemoStore();

/** Test hook: puts the demo stand-in back to its seeded state. */
export function resetDemoJoinStore(): void {
  demo = seedDemoStore();
}

function presentDemo(t: DemoTicket): JoinTicket {
  const { token, ...rest } = t;
  return { ...rest, linkUrl: t.state === "sent" && token !== null ? `${demoOrigin()}/join/${token}` : null };
}

function demoTicket(ticketId: string): DemoTicket {
  const t = demo.tickets.find(x => x.ticketId === ticketId);
  if (!t) throw new JoinActionError("This join link no longer exists. Refresh and try again.", 404);
  return t;
}

function demoPreview(token: string): JoinPreviewResult {
  const lower = token.toLowerCase();
  if (lower.startsWith("used")) return { kind: "used" };
  if (lower.startsWith("invalid")) return { kind: "invalid" };
  if (demo.dead.has(token)) return { kind: "invalid" };
  const ticket = demo.tickets.find(t => t.token === token);
  if (ticket) {
    if (ticket.state !== "sent") return { kind: "invalid" };
    if (ticket.usedAt !== null) return { kind: "used" };
  }
  return { kind: "ok", workspaceName: "Mabini Legal Solutions", invitedByName: "Paul Reyes" };
}

/** Demo only: access an owner granted, for the members list to show. */
export function getDemoMemberAccess(memberId: string): Required<MemberAccessInput> | null {
  if (USE_REAL_BACKEND) return null;
  return demo.access.get(memberId) ?? null;
}

// ── Validation shared by the pages ───────────────────────────────────────────

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

/** Label + optional email, trimmed. Returns an error message or the input. */
export function validateTicketInput(label: string, email: string): { error: string } | { input: JoinTicketInput } {
  const l = label.trim();
  const e = email.trim();
  if (l === "") return { error: "Enter a label for this link." };
  if (l.length > JOIN_TICKET_LABEL_MAX) return { error: `Keep the label under ${String(JOIN_TICKET_LABEL_MAX)} characters.` };
  if (e !== "" && !isValidEmail(e)) return { error: "Enter a valid email address, or leave it blank." };
  return { input: { label: l, recipientEmail: e === "" ? null : e } };
}

// ── Calls: joiner ────────────────────────────────────────────────────────────

export async function previewJoinLink(token: string, signal?: AbortSignal): Promise<JoinPreviewResult> {
  if (!USE_REAL_BACKEND) return demoPreview(token);
  try {
    const result = await apiRequest<{ workspaceName: string; invitedByName: string | null }>(
      "/workspace-join/preview",
      { method: "POST", body: { token }, ...(signal ? { signal } : {}) },
    );
    return {
      kind: "ok",
      workspaceName: result.workspaceName,
      invitedByName: result.invitedByName ?? null,
    };
  } catch (err) {
    if (!(err instanceof ApiError)) return { kind: "error" };
    const code = errorCode(err);
    if (err.status === 410 || code === "join_link_used") return { kind: "used" };
    // 400/422 are a token the backend could not even parse — to the person
    // that is the same thing as a link that does not exist.
    if (err.status === 404 || err.status === 400 || err.status === 422 || code === "join_link_invalid") {
      return { kind: "invalid" };
    }
    return { kind: "error" };
  }
}

export async function submitJoinRequest(token: string, input: JoinRequestInput): Promise<JoinSubmitResult> {
  if (!USE_REAL_BACKEND) {
    const preview = demoPreview(token);
    if (preview.kind === "used") return { kind: "used" };
    if (preview.kind !== "ok") return { kind: "invalid" };
    const ticket = demo.tickets.find(t => t.token === token);
    const now = Date.now();
    demo.seq += 1;
    const requestId = `jr_demo_new_${String(demo.seq)}`;
    demo.requests.unshift({
      requestId, sourceKind: "ticket", ticketLabel: ticket?.label ?? "Join link",
      fullName: input.fullName, email: "you@example.com", reason: input.reason,
      requestedRole: "member", state: "pending", createdAt: now, decidedAt: null,
    });
    if (ticket) {
      ticket.usedAt = now;
      ticket.updatedAt = now;
      ticket.request = { requestId, fullName: input.fullName, state: "pending" };
    }
    return { kind: "sent", workspaceName: preview.workspaceName };
  }
  try {
    const result = await apiRequest<{ requestId: string; workspaceName: string; state: "pending" }>(
      "/workspace-join/requests",
      { method: "POST", body: { token, fullName: input.fullName, reason: input.reason } },
    );
    return { kind: "sent", workspaceName: result.workspaceName };
  } catch (err) {
    if (!(err instanceof ApiError)) return { kind: "error", message: JOIN_MESSAGES.submitError };
    const code = errorCode(err);
    if (code === "join_already_member") return { kind: "already-member" };
    if (code === "join_request_pending") return { kind: "pending" };
    if (err.status === 410 || code === "join_link_used") return { kind: "used" };
    if (err.status === 404 || code === "join_link_invalid") return { kind: "invalid" };
    if (code === "join_email_unverified") {
      return { kind: "error", message: JOIN_MESSAGES.emailUnverified, reason: "email-unverified" };
    }
    if (err.status === 401) {
      return { kind: "error", message: "Sign in to continue.", reason: "signed-out" };
    }
    return {
      kind: "error",
      message: err.body?.message ?? (err.status === 0 ? err.message : JOIN_MESSAGES.submitError),
    };
  }
}

// ── Calls: owner / administrator ─────────────────────────────────────────────

const ws = (workspaceId: string) => `/workspaces/${encodeURIComponent(workspaceId)}`;

async function manage<T>(run: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof JoinActionError) throw err;
    if (err instanceof ApiError) {
      if (err.status === 403) throw new JoinActionError("Only the owner or an administrator can do this.", 403);
      throw new JoinActionError(err.body?.message ?? (err.status === 0 ? err.message : fallback), err.status);
    }
    throw new JoinActionError(fallback);
  }
}

export async function listJoinTickets(workspaceId: string): Promise<JoinTicket[]> {
  if (!USE_REAL_BACKEND) return demo.tickets.map(presentDemo);
  return manage(async () => {
    const result = await apiRequest<{ tickets: JoinTicket[] }>(`${ws(workspaceId)}/join-tickets`);
    return result.tickets;
  }, "We couldn't load join links.");
}

export async function createJoinTicket(workspaceId: string, input: JoinTicketInput): Promise<JoinTicket> {
  if (!USE_REAL_BACKEND) {
    const now = Date.now();
    demo.seq += 1;
    const t: DemoTicket = {
      ticketId: `jt_demo_new_${String(demo.seq)}`, label: input.label, recipientEmail: input.recipientEmail,
      state: "draft", linkUrl: null, token: null, sentAt: null, withdrawnAt: null, usedAt: null,
      request: null, createdAt: now, updatedAt: now,
    };
    demo.tickets.unshift(t);
    return presentDemo(t);
  }
  return manage(() => apiRequest<JoinTicket>(`${ws(workspaceId)}/join-tickets`, {
    method: "POST", body: { label: input.label, recipientEmail: input.recipientEmail },
  }), "We couldn't save this link.");
}

export async function updateJoinTicket(
  workspaceId: string, ticketId: string, input: JoinTicketInput,
): Promise<JoinTicket> {
  if (!USE_REAL_BACKEND) {
    const t = demoTicket(ticketId);
    if (t.state !== "draft") throw new JoinActionError("Only a draft can be edited.", 409);
    t.label = input.label;
    t.recipientEmail = input.recipientEmail;
    t.updatedAt = Date.now();
    return presentDemo(t);
  }
  return manage(() => apiRequest<JoinTicket>(`${ws(workspaceId)}/join-tickets/${encodeURIComponent(ticketId)}`, {
    method: "PATCH", body: { label: input.label, recipientEmail: input.recipientEmail },
  }), "We couldn't save this link.");
}

/** Draft → Sent, or Withdrawn → Sent ("Send again"). Always a NEW link. */
export async function sendJoinTicket(
  workspaceId: string, ticketId: string, options: { email: boolean },
): Promise<JoinTicket> {
  if (!USE_REAL_BACKEND) {
    const t = demoTicket(ticketId);
    if (t.state === "sent") throw new JoinActionError("This join link is already sent.", 409);
    if (options.email && !t.recipientEmail) {
      throw new JoinActionError("Add an email address to send this link by email.", 422);
    }
    const now = Date.now();
    t.state = "sent";
    t.token = demoToken();
    t.sentAt = now;
    t.withdrawnAt = null;
    t.usedAt = null;
    t.request = null;
    t.updatedAt = now;
    return presentDemo(t);
  }
  return manage(() => apiRequest<JoinTicket>(
    `${ws(workspaceId)}/join-tickets/${encodeURIComponent(ticketId)}/send`,
    { method: "POST", body: { email: options.email } },
  ), "We couldn't send this link.");
}

export async function withdrawJoinTicket(workspaceId: string, ticketId: string): Promise<JoinTicket> {
  if (!USE_REAL_BACKEND) {
    const t = demoTicket(ticketId);
    if (t.state !== "sent") throw new JoinActionError("This join link can't be withdrawn.", 409);
    const now = Date.now();
    t.state = "withdrawn";
    if (t.token !== null) demo.dead.add(t.token);
    t.token = null;
    t.withdrawnAt = now;
    t.updatedAt = now;
    return presentDemo(t);
  }
  return manage(() => apiRequest<JoinTicket>(
    `${ws(workspaceId)}/join-tickets/${encodeURIComponent(ticketId)}/withdraw`,
    { method: "POST", body: {} },
  ), "We couldn't withdraw this link.");
}

export async function listJoinRequests(workspaceId: string, state?: JoinRequestState): Promise<JoinRequest[]> {
  if (!USE_REAL_BACKEND) {
    return demo.requests.filter(r => state === undefined || r.state === state).map(r => ({ ...r }));
  }
  return manage(async () => {
    const query = state ? `?state=${state}` : "";
    const result = await apiRequest<{ requests: JoinRequest[] }>(`${ws(workspaceId)}/join-requests${query}`);
    return result.requests;
  }, "We couldn't load join requests.");
}

/** The approve / access body, normalised: a blank title is "no title". */
export function accessBody(access: MemberAccessInput): MemberAccessInput {
  const body: MemberAccessInput = {};
  if (access.roleTitle !== undefined) {
    const title = access.roleTitle?.trim() ?? "";
    body.roleTitle = title === "" ? null : title;
  }
  if (access.canRequestDocuments !== undefined) body.canRequestDocuments = access.canRequestDocuments;
  if (access.canAssignSigners !== undefined) body.canAssignSigners = access.canAssignSigners;
  return body;
}

function decideDemo(requestId: string, next: JoinRequestState): JoinRequest {
  const r = demo.requests.find(x => x.requestId === requestId);
  if (!r) throw new JoinActionError("This request no longer exists.", 404);
  if (r.state !== "pending") throw new JoinActionError("This request was already decided.", 409);
  r.state = next;
  r.decidedAt = Date.now();
  for (const t of demo.tickets) {
    if (t.request?.requestId === requestId) t.request = { ...t.request, state: next };
  }
  return r;
}

export async function approveJoinRequest(
  workspaceId: string, requestId: string, access: MemberAccessInput,
): Promise<{ memberId: string }> {
  const body = accessBody(access);
  if (!USE_REAL_BACKEND) {
    decideDemo(requestId, "approved");
    const memberId = `mem_${requestId}`;
    demo.access.set(memberId, {
      roleTitle: body.roleTitle ?? null,
      canRequestDocuments: body.canRequestDocuments ?? false,
      canAssignSigners: body.canAssignSigners ?? false,
    });
    return { memberId };
  }
  return manage(() => apiRequest<{ memberId: string }>(
    `${ws(workspaceId)}/join-requests/${encodeURIComponent(requestId)}/approve`,
    { method: "POST", body },
  ), "We couldn't approve this request.");
}

export async function declineJoinRequest(workspaceId: string, requestId: string): Promise<void> {
  if (!USE_REAL_BACKEND) {
    decideDemo(requestId, "declined");
    return;
  }
  await manage(() => apiRequest<{ declined: true }>(
    `${ws(workspaceId)}/join-requests/${encodeURIComponent(requestId)}/decline`,
    { method: "POST", body: {} },
  ), "We couldn't decline this request.");
}

export async function updateMemberAccess(
  workspaceId: string, memberId: string, access: MemberAccessInput,
): Promise<void> {
  const body = accessBody(access);
  if (!USE_REAL_BACKEND) {
    const prev = demo.access.get(memberId);
    demo.access.set(memberId, {
      roleTitle: body.roleTitle !== undefined ? body.roleTitle : (prev?.roleTitle ?? null),
      canRequestDocuments: body.canRequestDocuments ?? prev?.canRequestDocuments ?? false,
      canAssignSigners: body.canAssignSigners ?? prev?.canAssignSigners ?? false,
    });
    return;
  }
  await manage(() => apiRequest<{ updated: true }>(
    `${ws(workspaceId)}/members/${encodeURIComponent(memberId)}/access`,
    { method: "PATCH", body },
  ), "We couldn't update this member's access.");
}

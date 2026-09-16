// Pure-logic coverage for the send-readiness gate — the single authority for
// "can this preparation become a real signing request yet" (ConfirmationPage's
// banner and the PreparationHelpFab both consume it) and buildActionUrl, the
// one place a blocker's fix-it link is assembled. No render tests here: this
// is exactly the branchy pure logic the coverage policy targets.

import { describe, it, expect } from "vitest";
import {
  computeSendReadiness,
  buildActionUrl,
  type SendReadinessAction,
} from "../prepare/send-readiness";
import {
  DEFAULT_ROUTING_CONFIG,
  DEFAULT_AUTH_CONFIG,
  DEFAULT_PREP_SETTINGS,
  DEFAULT_TRANSACTION_DETAILS,
} from "../../models/prepare";
import type { PreparationDraft, PrepFile, PrepParticipant } from "../../models/prepare";
import type { FieldDefinition } from "../../models/field-editor";

// ── Factories ─────────────────────────────────────────────────────────────────

function makeFile(over: Partial<PrepFile> = {}): PrepFile {
  return {
    id: "file_1",
    fileName: "contract.pdf",
    fileSizeBytes: 1024,
    mimeType: "application/pdf",
    fileState: "ready",
    order: 0,
    backendDocumentId: "doc_real_1",
    ...over,
  };
}

function makeParticipant(over: Partial<PrepParticipant> = {}): PrepParticipant {
  return {
    id: "rcp_1", // real backend recipient id by default (isRealRecipientId)
    name: "Signer One",
    email: "signer@example.com",
    role: "signer",
    organization: "",
    isRequired: true,
    routingGroupId: null,
    authMethodOverride: null,
    ...over,
  };
}

function makeDraft(over: Partial<PreparationDraft> = {}): PreparationDraft {
  return {
    id: "draft_1",
    status: "ready-for-field-placement",
    workspaceId: "ws_1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    sourceContext: { source: "new" },
    files: [makeFile()],
    details: DEFAULT_TRANSACTION_DETAILS,
    participants: [makeParticipant()],
    routing: DEFAULT_ROUTING_CONFIG,
    auth: DEFAULT_AUTH_CONFIG,
    settings: DEFAULT_PREP_SETTINGS,
    demonstrationOnly: true,
    ...over,
  };
}

function makeField(over: Partial<FieldDefinition> = {}): FieldDefinition {
  return {
    id: "bf_saved_1", // bf_ prefix = already persisted to backend
    type: "signature",
    documentId: "editor_doc_1",
    pageId: "editor_page_1",
    rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
    participantId: "rcp_1",
    label: "Signature",
    required: true,
    layer: 1,
    demonstrationOnly: false,
    ...over,
  };
}

const READY_INPUT = () => ({
  draft: makeDraft(),
  multiDocumentSigningGap: false,
  syncError: null,
  fields: [makeField()],
});

// ── computeSendReadiness ────────────────────────────────────────────────────────

describe("computeSendReadiness", () => {
  it("is ready with no blockers when everything is satisfied", () => {
    const result = computeSendReadiness(READY_INPUT());
    expect(result.ready).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });

  it("blocks when no file has reached real backend upload", () => {
    const result = computeSendReadiness({
      ...READY_INPUT(),
      draft: makeDraft({ files: [makeFile({ backendDocumentId: undefined })] }),
    });
    expect(result.ready).toBe(false);
    expect(result.blockers[0]!.action).toEqual({ label: "Go to Upload", route: "/app/prepare/upload" });
  });

  it("blocks on the multi-document signing gap", () => {
    const result = computeSendReadiness({ ...READY_INPUT(), multiDocumentSigningGap: true });
    expect(result.ready).toBe(false);
    expect(result.blockers.some((b) => b.message.includes("MULTI-DOCUMENT SIGNING MODEL BACKEND GAP"))).toBe(true);
  });

  it("blocks when there are no participants", () => {
    const result = computeSendReadiness({ ...READY_INPUT(), draft: makeDraft({ participants: [] }) });
    expect(result.blockers.some((b) => b.message === "No participants have been added.")).toBe(true);
  });

  it("blocks when a participant has not finished syncing (non-rcp id)", () => {
    const result = computeSendReadiness({
      ...READY_INPUT(),
      draft: makeDraft({ participants: [makeParticipant({ id: "pax_local_1" })] }),
    });
    expect(result.blockers.some((b) => b.message.includes("not finished syncing"))).toBe(true);
  });

  it("blocks on a sync error and echoes its text", () => {
    const result = computeSendReadiness({ ...READY_INPUT(), syncError: "boom" });
    expect(result.blockers.some((b) => b.message.includes("boom"))).toBe(true);
  });

  it("blocks when the default auth method is not 'none'", () => {
    const result = computeSendReadiness({
      ...READY_INPUT(),
      draft: makeDraft({ auth: { defaultMethod: "email-otp", perParticipant: {} } }),
    });
    const blocker = result.blockers.find((b) => b.action?.route === "/app/prepare/authentication");
    expect(blocker).toBeDefined();
    expect(blocker!.message).toContain("email-otp");
  });

  it("blocks per participant auth override and carries participantId in the action", () => {
    const result = computeSendReadiness({
      ...READY_INPUT(),
      draft: makeDraft({ auth: { defaultMethod: "none", perParticipant: { rcp_1: "sms-otp" } } }),
    });
    const blocker = result.blockers.find((b) => b.action?.participantId === "rcp_1");
    expect(blocker).toBeDefined();
    expect(blocker!.message).toContain("sms-otp");
  });

  it("blocks when the field state is unknown (null)", () => {
    const result = computeSendReadiness({ ...READY_INPUT(), fields: null });
    expect(result.blockers.some((b) => b.message.includes("has not been loaded/verified"))).toBe(true);
  });

  it("blocks on an unsupported field type and lists its id", () => {
    const bad = makeField({ id: "bf_bad_1", type: "multiline-text" });
    const result = computeSendReadiness({ ...READY_INPUT(), fields: [bad] });
    const blocker = result.blockers.find((b) => b.action?.label === "Fix these fields");
    expect(blocker).toBeDefined();
    expect(blocker!.action!.fieldIds).toEqual(["bf_bad_1"]);
  });

  it("blocks on locally-unsaved fields (id without bf_ prefix)", () => {
    const local = makeField({ id: "local_unsaved_1" });
    const result = computeSendReadiness({ ...READY_INPUT(), fields: [local] });
    expect(result.blockers.some((b) => b.message.includes("local, unsaved edits"))).toBe(true);
  });

  it("accumulates multiple independent blockers", () => {
    const result = computeSendReadiness({
      draft: makeDraft({ files: [makeFile({ backendDocumentId: undefined })], participants: [] }),
      multiDocumentSigningGap: false,
      syncError: "sync failed",
      fields: null,
    });
    expect(result.ready).toBe(false);
    expect(result.blockers.length).toBeGreaterThanOrEqual(3);
  });
});

// ── buildActionUrl ──────────────────────────────────────────────────────────────

describe("buildActionUrl", () => {
  it("returns the bare route when there are no params", () => {
    const action: SendReadinessAction = { label: "x", route: "/app/prepare/participants" };
    expect(buildActionUrl(action)).toBe("/app/prepare/participants");
  });

  it("encodes fieldIds as a comma list", () => {
    const url = buildActionUrl({ label: "x", route: "/app/prepare/authentication", fieldIds: ["a", "b"] });
    expect(url).toContain("focusFieldIds=a%2Cb");
  });

  it("includes highlightParticipantId", () => {
    const url = buildActionUrl({ label: "x", route: "/app/prepare/participants", participantId: "rcp_1" });
    expect(url).toContain("highlightParticipantId=rcp_1");
  });

  it("includes highlightGroupId", () => {
    const url = buildActionUrl({ label: "x", route: "/app/prepare/routing", groupId: "grp_1" });
    expect(url).toContain("highlightGroupId=grp_1");
  });

  it("forces showValidation=1 for any fields route", () => {
    const url = buildActionUrl({ label: "x", route: "/app/prepare/fields", fieldIds: ["a"] });
    expect(url).toContain("showValidation=1");
    expect(url).toContain("focusFieldIds=a");
  });

  it("does NOT add showValidation for non-fields routes", () => {
    const url = buildActionUrl({ label: "x", route: "/app/prepare/upload" });
    expect(url).not.toContain("showValidation");
  });

  it("ignores an empty fieldIds array", () => {
    const url = buildActionUrl({ label: "x", route: "/app/prepare/fields", fieldIds: [] });
    expect(url).not.toContain("focusFieldIds");
    expect(url).toContain("showValidation=1");
  });
});

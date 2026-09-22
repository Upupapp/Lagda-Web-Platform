// templates-source.ts's role-resolution facade (061): the slotId <->
// placeholderId translation, and the three-state status mapping, get their
// own direct tests for the same reason the field-placement facade does — a
// bug here would silently show the wrong "auto-assigned" person, or hide a
// real one.

vi.mock("../backend-flag", () => ({ USE_REAL_BACKEND: true }));

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTemplate, getTemplateRoleAssignments } from "../templates-source";
import type { DocumentTemplate } from "../../models/templates";

const { mockGet, mockGetFields, mockGetRoleAssignments } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockGetFields: vi.fn(),
  mockGetRoleAssignments: vi.fn(),
}));

vi.mock("../real/templates.service", async () => {
  const actual = await vi.importActual<typeof import("../real/templates.service")>(
    "../real/templates.service");
  return {
    ...actual,
    realTemplatesService: {
      get: mockGet,
      getFields: mockGetFields,
      getRoleAssignments: mockGetRoleAssignments,
    },
  };
});

const WORKSPACE = "ws_1";
const TEMPLATE_ID = "wft_1";

const WIRE = {
  workflowTemplateId: TEMPLATE_ID,
  name: "Onboarding",
  routingMode: "sequential" as const,
  roleSlots: [
    { slotId: "wfs_head", label: "Department Head", role: "approver" as const, required: true, routingStep: 1, defaultAuthMethod: "none" as const },
    { slotId: "wfs_hire", label: "New Hire", role: "signer" as const, required: true, routingStep: 2, defaultAuthMethod: "none" as const },
  ],
  completionSettings: { notifySenderOnComplete: true },
  documentId: null,
  sourceArtifactId: null,
  createdAt: "2026-09-22T09:00:00.000Z",
  updatedAt: "2026-09-22T09:00:00.000Z",
};

beforeEach(() => {
  mockGet.mockResolvedValue(WIRE);
  mockGetFields.mockResolvedValue([]);
});

describe("getTemplateRoleAssignments", () => {
  it("maps a resolved assignment's slotId to the matching placeholder, with the person's details", async () => {
    const t = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;
    const headPlaceholder = t.placeholders.find(p => p.backendSlotId === "wfs_head")!;

    mockGetRoleAssignments.mockResolvedValue([
      { slotId: "wfs_head", status: "resolved", userId: "usr_1", displayName: "Maria Santos", email: "maria@example.com" },
      { slotId: "wfs_hire", status: "manual" },
    ]);

    const assignments = await getTemplateRoleAssignments(WORKSPACE, t);

    expect(assignments).toContainEqual({
      placeholderId: headPlaceholder.id, status: "resolved",
      userId: "usr_1", displayName: "Maria Santos", email: "maria@example.com",
    });
  });

  it("reports UNRESOLVED without inventing a person", async () => {
    const t = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;
    const headPlaceholder = t.placeholders.find(p => p.backendSlotId === "wfs_head")!;

    mockGetRoleAssignments.mockResolvedValue([
      { slotId: "wfs_head", status: "unresolved" },
      { slotId: "wfs_hire", status: "manual" },
    ]);

    const assignments = await getTemplateRoleAssignments(WORKSPACE, t);
    const headAssignment = assignments.find(a => a.placeholderId === headPlaceholder.id);

    expect(headAssignment).toEqual({ placeholderId: headPlaceholder.id, status: "unresolved" });
    expect(headAssignment).not.toHaveProperty("userId");
  });

  it("drops an assignment whose slotId names no current placeholder", async () => {
    const t = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;

    mockGetRoleAssignments.mockResolvedValue([
      { slotId: "wfs_removed", status: "resolved", userId: "usr_1", displayName: "X", email: "x@example.com" },
    ]);

    const assignments = await getTemplateRoleAssignments(WORKSPACE, t);
    expect(assignments).toEqual([]);
  });

  it("falls back to MANUAL for every slot when the read fails", async () => {
    const t = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;
    mockGetRoleAssignments.mockRejectedValue(new Error("network error"));

    const assignments = await getTemplateRoleAssignments(WORKSPACE, t);
    expect(assignments).toEqual(
      t.placeholders.map(p => ({ placeholderId: p.id, status: "manual" })));
  });

  it("is MANUAL for every slot in fixture mode — no workspace, no server to ask", async () => {
    const t = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;
    const assignments = await getTemplateRoleAssignments(undefined, t);
    expect(assignments).toEqual(
      t.placeholders.map(p => ({ placeholderId: p.id, status: "manual" })));
    expect(mockGetRoleAssignments).not.toHaveBeenCalled();
  });
});

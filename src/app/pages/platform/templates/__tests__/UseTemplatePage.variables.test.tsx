// Required template variables must stay meaningful through entry, review and back navigation.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import type { ReactNode } from "react";
import { getAllMockTemplates } from "../../../../data/mock/templates";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

// Role resolution is stubbed; the real variable-entry and review steps are exercised.
const template = {
  ...getAllMockTemplates().find(t => t.status === "available" && t.placeholders.length > 0)!,
  variables: [
    { id: "v-client", internalKey: "client_name", label: "Client", type: "short-text" as const, required: true, helpText: "", placeholder: "" },
    { id: "v-notes", internalKey: "notes", label: "Notes", type: "multiline-text" as const, required: true, helpText: "", placeholder: "" },
    { id: "v-amount", internalKey: "amount", label: "Amount", type: "number" as const, required: true, helpText: "", placeholder: "" },
    { id: "v-confirmed", internalKey: "confirmed", label: "Confirmed", type: "yes-no" as const, required: true, helpText: "", placeholder: "" },
  ],
};

vi.mock("../../../../context/TemplateContext", () => ({
  TemplateProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useTemplates: () => ({ state: { activeTemplate: template, activeLoading: false, activeError: null } }),
  useActiveTemplateLoader: () => undefined,
}));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1" } }),
}));
vi.mock("../../../../hooks/usePageMeta", () => ({ usePageMeta: () => undefined }));
vi.mock("../../../../hooks/useDetailTitle", () => ({ useDetailTitle: () => undefined }));
vi.mock("../../../../hooks/useAccountNameAssist", () => ({
  useAccountNameAssist: () => ({ status: "idle", accountName: null, lookup: () => undefined, reset: () => undefined }),
}));
vi.mock("../../../../components/prepare/PeoplePicker", () => ({ PeoplePicker: () => null }));
// Every role arrives already filled in, so the wizard can be walked to Launch.
vi.mock("../../../../services/templates-source", () => ({
  getTemplateRoleAssignments: (_ws: unknown, t: typeof template) => Promise.resolve(t.placeholders.map((p, index) => ({
    placeholderId: p.id, status: "resolved", displayName: `Person ${String(index + 1)}`, email: `person${String(index + 1)}@x.com`,
  }))),
}));
vi.mock("../../../../services/prepare/template-apply", () => ({
  resolveTemplateApplication: () => ({
    ok: true, authDowngrades: [],
    application: { participants: [], routing: { mode: "sequential", groups: [] }, fields: [] },
  }),
}));
vi.mock("../../../../config/process-screens", () => ({
  withProcess: (_kind: string, _who: string, work: () => Promise<unknown>) => work(),
}));

const handOff = vi.hoisted(() => vi.fn());
vi.mock("../../../../services/prepare/template-handoff", () => ({
  TEMPLATE_HANDOFF_ROUTE: "/app/prepare/upload",
  handOffTemplateToPrepare: handOff,
}));
const lifecycle = vi.hoisted(() => ({ deleteDraftDocument: vi.fn() }));
vi.mock("../../../../services/real/document-lifecycle.service", () => ({ documentLifecycleService: lifecycle }));
vi.mock("../../../../services/real/templates.service", () => ({
  realTemplatesService: { instantiate: vi.fn() },
}));

import { UseTemplatePage } from "../UseTemplatePage";

async function variables() {
  render(<MemoryRouter initialEntries={[`/app/templates/${template.id}/use`]}><Routes><Route path="/app/templates/:templateId/use" element={<UseTemplatePage />} /></Routes></MemoryRouter>);
  const user = userEvent.setup();
  await screen.findAllByDisplayValue("person1@x.com");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("heading", { name: "Enter Variable Values" });
  await user.type(screen.getByRole("spinbutton", { name: "Amount" }), "0");
  await user.click(screen.getByRole("radio", { name: "No" }));
  return user;
}
beforeEach(() => { window.localStorage.clear(); vi.clearAllMocks(); });

describe("required template variables", () => {
  it("blocks whitespace-only required text without preparing a document", async () => {
    const user = await variables();
    await user.type(screen.getByRole("textbox", { name: "Client" }), "   ");
    await user.type(screen.getByRole("textbox", { name: "Notes" }), "QA note");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Please fill in required variable: Client.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Launch Signing Request" })).not.toBeInTheDocument();
    expect(handOff).not.toHaveBeenCalled();
  });
  it("blocks whitespace-only required multiline content", async () => {
    const user = await variables();
    await user.type(screen.getByRole("textbox", { name: "Client" }), "QA Client");
    await user.type(screen.getByRole("textbox", { name: "Notes" }), " {Enter}  ");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Please fill in required variable: Notes.")).toBeInTheDocument();
  });
  it("retains zero and No as explicit values through review and back navigation", async () => {
    const user = await variables();
    await user.type(screen.getByRole("textbox", { name: "Client" }), "QA Client");
    await user.type(screen.getByRole("textbox", { name: "Notes" }), "First line{Enter}Second line");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("button", { name: "Launch Signing Request" })).toBeInTheDocument();
    expect(screen.getByText("0", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("no", { exact: true })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("spinbutton", { name: "Amount" })).toHaveValue(0);
    expect(screen.getByRole("radio", { name: "No" })).toBeChecked();
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue("First line\nSecond line");
  });
});

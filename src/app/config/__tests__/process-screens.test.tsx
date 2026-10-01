// Every important action shows its own loading screen for at least two
// seconds: worded for that action, tagged with what kind of work it is. A
// failure is reported at once, never after the hold. And the actions the
// product treats as important are actually wired to it.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ProcessingProvider } from "../../services/processing.service";
import { PROCESS_HOLD_MS, PROCESS_KINDS, processScreen, withProcess, type ProcessKind } from "../process-screens";

describe("the catalogue", () => {
  it("gives every action a tag, an icon, its own wording and the two-second hold", () => {
    const messages = new Set<string>();
    for (const kind of PROCESS_KINDS) {
      const s = processScreen(kind);
      expect(s.tag?.label, kind).toBeTruthy();
      expect(s.tag?.icon, kind).toBeTruthy();
      expect(s.message.length, kind).toBeGreaterThan(5);
      expect(s.detail?.length, kind).toBeGreaterThan(5);
      expect(s.minDuration, kind).toBe(PROCESS_HOLD_MS);
      messages.add(`${s.tag?.label ?? ""}|${s.message}`);
    }
    expect(PROCESS_HOLD_MS).toBe(2000);
    expect(messages.size).toBe(PROCESS_KINDS.length);
  });

  it("names the person or workspace where that reads better", () => {
    expect(processScreen("invitation-accept", "Reyes Law Office").message).toBe("Joining Reyes Law Office…");
    expect(processScreen("invitation-accept").message).toBe("Accepting the invitation…");
    expect(processScreen("share-create", "Maria Santos").message).toBe("Sharing with Maria Santos…");
    expect(processScreen("plan-request", "Business").message).toBe("Sending your Business plan request…");
  });
});

describe("withProcess", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("shows the action's screen and holds it two seconds, even for instant work", async () => {
    render(<ProcessingProvider><p>page</p></ProcessingProvider>);
    let done = false;
    act(() => { void withProcess("contact-create", "Maria Santos", () => Promise.resolve("ok")).then(() => { done = true; }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(screen.getByRole("alertdialog", { name: "Adding Maria Santos to your contacts…" })).toBeTruthy();
    expect(screen.getByTestId("processing-tag")).toHaveTextContent("Contacts");
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(done).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(done).toBe(true);
  });

  it("a failure is reported at once, not after the hold", async () => {
    render(<ProcessingProvider><p>page</p></ProcessingProvider>);
    let failedAt: number | null = null;
    const start = Date.now();
    act(() => { void withProcess("plan-request", "", () => Promise.reject(new Error("no"))).catch(() => { failedAt = Date.now() - start; }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(failedAt).not.toBeNull();
    expect(failedAt!).toBeLessThan(100);
  });

  it("without the provider (a unit test) it just runs the work", async () => {
    await expect(withProcess("template-launch", "", () => Promise.resolve(7))).resolves.toBe(7);
  });
});

// The actions the product treats as important, each wired to its screen.
const WIRED: Record<string, ProcessKind[]> = {
  "pages/platform/invitations/MyInvitationsPage.tsx": ["invitation-accept", "invitation-undo-decline"],
  "pages/platform/invitations/DeclineInvitationDialog.tsx": ["invitation-decline"],
  "pages/platform/shared-documents/SharedWithMeSection.tsx": ["shared-accept", "shared-reject", "shared-undo-reject", "shared-remove-access", "shared-delete"],
  "pages/platform/shared-documents/SharedByMeSection.tsx": ["access-approve", "access-reject", "access-undo", "access-delete"],
  "components/document-sharing/ShareDocumentDialog.tsx": ["share-create", "share-update", "share-remove", "access-remove"],
  "components/documents/ResendSigningDialog.tsx": ["resend-new", "resend-same"],
  "components/verification/VerificationFlow.tsx": ["verify-lookup", "verify-integrity", "verify-access-request", "verify-code-send", "verify-code-check"],
  "pages/platform/contacts/CreateContactPage.tsx": ["contact-create"],
  "pages/platform/contacts/EditContactPage.tsx": ["contact-update"],
  "pages/platform/contacts/contacts-ui.tsx": ["contact-delete"],
  "pages/platform/contacts/ContactsPage.tsx": ["contact-archive", "contact-restore"],
  "pages/platform/contacts/ContactDetailPage.tsx": ["contact-archive", "contact-restore"],
  "pages/platform/contacts/FindPeoplePage.tsx": ["contact-lookup", "contact-request-send", "contact-request-cancel"],
  "pages/platform/contacts/PendingContactsPage.tsx": ["contact-request-accept", "contact-request-decline", "contact-request-cancel"],
  "pages/platform/settings/PlanBillingPage.tsx": ["plan-request", "plan-request-cancel"],
  "pages/platform/templates/TemplateAuthorPage.tsx": ["template-generate"],
  "pages/platform/templates/UseTemplatePage.tsx": ["template-open", "template-launch"],
  "pages/platform/templates/TemplateDetailPage.tsx": ["template-delete"],
  "context/TemplateContext.tsx": ["template-archive"],
  "pages/platform/prepare/ConfirmationPage.tsx": ["send-for-signature"],
  "pages/platform/prepare/PrepareLayout.tsx": ["discard-draft"],
  "context/WorkspaceAdminContext.tsx": ["member-invite", "member-role", "member-remove"],
  "pages/platform/workspace/join/JoinLinksSection.tsx": ["join-link-create"],
  "pages/platform/workspace/join/JoinRequestsSection.tsx": ["join-request-decide"],
  "pages/platform/workspace/real/RealPeopleTeamsPage.tsx": [
    "member-move", "member-title", "member-swap", "member-access", "member-role", "member-remove",
    "team-member-remove", "team-member-add", "contact-to-team", "team-create", "team-rename", "team-delete",
  ],
};

describe("wiring", () => {
  for (const [file, kinds] of Object.entries(WIRED)) {
    it(`${file} shows ${kinds.join(", ")}`, () => {
      const source = readFileSync(resolve(__dirname, "../..", file), "utf8");
      for (const kind of kinds) expect(source, kind).toContain(`"${kind}"`);
    });
  }

  it("every screen in the catalogue is used somewhere", () => {
    const used = new Set(Object.values(WIRED).flat());
    expect(PROCESS_KINDS.filter(k => !used.has(k))).toEqual([]);
  });
});

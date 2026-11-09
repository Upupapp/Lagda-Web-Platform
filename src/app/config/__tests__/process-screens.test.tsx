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
    expect(processScreen("plan-request", "Business").message).toBe("Confirming your Business payment…");
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
  "pages/platform/contacts/ContactsPage.tsx": ["contact-restore"],
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
  "components/documents/useDocumentLifecycle.tsx": [
    "document-cancel", "document-restore", "document-trash", "draft-delete", "document-delete", "bin-restore",
    "bin-delete", "bin-empty", "deletion-request", "deletion-approve", "deletion-disapprove", "signed-remove", "deleted-notice-remove",
  ],
  "pages/platform/workspace/real/RealPeopleTeamsPage.tsx": [
    "member-move", "member-title", "member-swap", "member-access", "member-role", "member-remove",
    "team-member-remove", "team-member-add", "contact-to-team", "team-create", "team-rename", "team-delete",
  ],
  // LAGDA eNotary: every action that takes a moment runs behind its own loading screen.
  "pages/platform/enotary/EnotaryAccessPage.tsx": ["enotary-access"],
  "pages/public/enotary/NotaryInvitePage.tsx": ["enotary-claim"],
  "pages/platform/enotary/notary/NotaryDeskPage.tsx": ["enotary-take", "enotary-accept", "enotary-accept-now", "enotary-decline", "enotary-payment-confirm", "enotary-payment-missing"],
  "pages/platform/enotary/payments/ClientPaymentPanel.tsx": ["enotary-payment-proof"],
  "pages/platform/enotary/payments/NotaryPaymentPage.tsx": ["enotary-qr-save", "enotary-qr-remove"],
  "pages/platform/enotary/requests/ClientRequestPage.tsx": ["enotary-request-revoke", "enotary-request-renew", "enotary-request-email"],
  "pages/platform/enotary/room/RoomPage.tsx": [
    "enotary-document-add", "enotary-document-replace", "enotary-room-open", "enotary-consent", "enotary-notarize", "enotary-session-cancel",
    "enotary-finalize", "enotary-identity", "enotary-act", "enotary-identity-act", "enotary-approve",
  ],
  "pages/platform/enotary/room/RoomFlow.tsx": ["enotary-payment-confirm", "enotary-payment-missing"],
  "pages/platform/enotary/notary/NotarySealPage.tsx": ["enotary-seal-save", "enotary-signature-save", "enotary-signature-remove"],
  "pages/platform/enotary/notary/NotaryRegisterPage.tsx": ["enotary-register-export", "enotary-register-report"],
  "pages/platform/enotary/RequestBin.tsx": ["enotary-bin-trash", "enotary-bin-restore", "enotary-bin-delete", "enotary-bin-restore-all", "enotary-bin-empty"],
  "pages/platform/enotary/room/SessionPanel.tsx": ["enotary-session-start", "enotary-session-start-open", "enotary-session-reopen-request", "enotary-session-reopen"],
  "pages/platform/enotary/room/CopyRequestDialog.tsx": ["enotary-copy-request"],
  "pages/platform/enotary/room/CopiesPanel.tsx": [
    "enotary-copy-stage", "enotary-copy-quote", "enotary-copy-decline", "enotary-copy-cancel", "enotary-copy-proof",
    "enotary-copy-pay-confirm", "enotary-copy-pay-missing", "enotary-copy-fulfil", "enotary-copy-received",
  ],
  "pages/platform/enotary/notary/NotaryApplyPage.tsx": [
    "enotary-application-submit", "enotary-application-withdraw", "enotary-application-file", "enotary-application-file-remove",
    "enotary-application-save",
  ],
  "pages/platform/enotary/admin/AdminNotaryApplicationPage.tsx": ["enotary-review-approve", "enotary-review-reject"],
  // 131. Every action that changes something shows the panel while it runs.
  "pages/platform/enotary/RequestDocumentPanel.tsx": ["enotary-request-document-add", "enotary-request-document-remove"],
  "pages/platform/enotary/room/ClientAddressPanel.tsx": ["enotary-address"],
  "pages/platform/enotary/room/LocationPanel.tsx": ["enotary-location-check", "enotary-location-declare"],
  "pages/public/enotary/EnotaryWaitlist.tsx": ["enotary-waitlist"],
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

// The notarial screens carry the LAGDA.io | eNotary panel; the rest of LAGDA keeps its own.
describe("the brand", () => {
  it("is eNotary for every eNotary kind, and LAGDA's own for the rest", () => {
    for (const kind of PROCESS_KINDS) {
      expect(processScreen(kind).brand, kind).toBe(kind.startsWith("enotary-") ? "enotary" : undefined);
    }
  });
});

// After the loading screen, an eNotary action says how it ended: its result in the screen's place.
describe("the result", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("every eNotary action has its result, except opening eNotary and a request (the page that opens says it)", () => {
    const missing = PROCESS_KINDS.filter(k => k.startsWith("enotary-") && !["enotary-access", "enotary-claim", "enotary-application-save", "enotary-location-check"].includes(k) && processScreen(k).result === undefined);
    expect(missing).toEqual([]);
    expect(processScreen("enotary-access").result).toBeUndefined();
    expect(processScreen("contact-create").result).toBeUndefined();
    expect(processScreen("enotary-session-reopen-request", "Atty. Aiyana Cruz").result?.success.detail).toContain("We emailed Atty. Aiyana Cruz");
  });

  it("a success follows the loading screen, then closes by itself after four seconds", async () => {
    render(<ProcessingProvider><button type="button">Ask</button></ProcessingProvider>);
    act(() => { void withProcess("enotary-session-reopen-request", "Atty. Aiyana Cruz", () => Promise.resolve("ok"), () => "no"); });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(screen.getByRole("alertdialog", { name: "Emailing your notary…" })).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    const result = screen.getByRole("alertdialog", { name: "Email sent to your notary" });
    expect(result).toHaveAttribute("data-tone", "success");
    expect(result).toHaveTextContent("We emailed Atty. Aiyana Cruz that you want to continue.");
    expect(screen.getByTestId("result-tag")).toHaveTextContent("Notary session");
    expect(screen.queryByRole("alertdialog", { name: "Emailing your notary…" })).toBeNull();
    expect(screen.getByRole("button", { name: "OK" })).toHaveFocus();
    await act(async () => { await vi.advanceTimersByTimeAsync(3900); });
    expect(screen.getByRole("alertdialog", { name: "Email sent to your notary" })).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(screen.queryByRole("alertdialog", { name: "Email sent to your notary" })).toBeNull();
  });

  it("a failure says it did not go through, with the page's own reason, and stays until OK", async () => {
    render(<ProcessingProvider><p>page</p></ProcessingProvider>);
    let caught: unknown = null;
    act(() => { void withProcess("enotary-session-reopen-request", "", () => Promise.reject(new Error("offline")), () => "Could not reach the server. Check your connection and try again.").catch((error: unknown) => { caught = error; }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(caught).toBeInstanceOf(Error);
    const result = screen.getByRole("alertdialog", { name: "It did not go through" });
    expect(result).toHaveAttribute("data-tone", "failure");
    expect(result).toHaveAccessibleDescription("Could not reach the server. Check your connection and try again.");
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(screen.getByRole("alertdialog", { name: "It did not go through" })).toBeTruthy();
    act(() => { screen.getByRole("button", { name: "OK" }).click(); });
    expect(screen.queryByRole("alertdialog", { name: "It did not go through" })).toBeNull();
  });

  it("Escape closes it, and an action without a result just closes its screen", async () => {
    render(<ProcessingProvider><p>page</p></ProcessingProvider>);
    act(() => { void withProcess("enotary-seal-save", "", () => Promise.resolve(1), () => "no"); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
    expect(screen.getByRole("alertdialog", { name: "Seal saved" })).toBeTruthy();
    act(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(screen.queryByRole("alertdialog", { name: "Seal saved" })).toBeNull();
    act(() => { void withProcess("contact-create", "Maria Santos", () => Promise.resolve(1)); });
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

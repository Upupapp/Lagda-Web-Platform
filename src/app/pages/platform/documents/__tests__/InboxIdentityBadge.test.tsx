// The identity check, said on a document's inbox card.
//
// A document that asks the signed-in person for an identity check carries a
// round button on its card's corner; pressing it opens a short note. Pinned:
//
//   - the button is there only where the server says the check is required,
//     never for an older server (no field) and never in the demo build
//   - the note's words for each status, with the verb of the list it is in
//   - "already verified" computes until when from the one constant
//   - it toggles; Escape closes it and returns focus; a press elsewhere
//     closes it; opening another card's closes the first
//   - pressing it does not start "Continue signing"
//   - its name, and that it says whether it is open and what it opens

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

const flag = vi.hoisted(() => ({ real: true }));
vi.mock("../../../../services/backend-flag", () => ({
  get USE_REAL_BACKEND() { return flag.real; },
  API_BASE_URL: "http://api.test",
}));

const toSign = vi.fn();
vi.mock("../../../../services/real/my-signing.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/my-signing.service")>();
  return {
    ...actual,
    realMySigningService: {
      documentsToSign: (...args: unknown[]) => toSign(...args) as unknown,
      signedDocuments: () => Promise.resolve([]),
      completedOtherDocuments: () => Promise.resolve([]),
      continueSigning: vi.fn(),
    },
  };
});
vi.mock("../../../../components/documents/DeletedDocumentsBlock", () => ({ DeletedDocumentsBlock: () => null }));

import { DocumentsToSignSection } from "../MySigningSections";
import { inboxIdentityNote, inboxIdentityCheckShown } from "../InboxIdentityBadge";
import { IDENTITY_CHECK_VALID_HOURS, identityCheckValidity } from "../../../../models/identity-check";
import type { InboxAction, InboxIdentityCheck } from "../../../../services/real/my-signing.service";

const check = (over: Partial<InboxIdentityCheck> = {}): InboxIdentityCheck => ({
  required: true, status: "pending", verifiedAt: null, attemptsRemaining: 3, ...over,
});

const row = (id: string, title: string, identityCheck?: InboxIdentityCheck | null) => ({
  signingRequestId: `sr_${id}`, recipientId: `srr_${id}`, documentTitle: title, recipientType: "signer",
  senderName: "Maria Santos", senderEmail: "maria@acme.test", workspaceName: "Acme Legal",
  invitedAt: "2026-09-28T00:00:00.000Z", expiresAt: "2026-10-28T00:00:00.000Z",
  ...(identityCheck === undefined ? {} : { identityCheck }),
});

function renderInbox(rows: unknown[], action: InboxAction = "sign") {
  toSign.mockResolvedValue(rows);
  return render(<MemoryRouter><DocumentsToSignSection action={action} /></MemoryRouter>);
}

const badge = (title: string) => screen.getByRole("button", { name: `Identity check for ${title}` });
const openNote = () => screen.getByRole("note");

beforeEach(() => {
  flag.real = true;
  toSign.mockReset();
});

describe("when the badge is shown", () => {
  it("is on the card of a document that asks this person for the check, and on no other", async () => {
    renderInbox([
      row("a", "Office Lease", check()),
      row("b", "NDA", check({ required: false, status: "not-required" })),
      row("c", "Board Minutes"),
      row("d", "Old Server", null),
    ]);
    const cards = await screen.findAllByTestId("to-sign-card");
    expect(cards).toHaveLength(4);
    expect(within(cards[0]!).getByTestId("inbox-identity-badge")).toBe(badge("Office Lease"));
    for (const card of cards.slice(1)) expect(within(card).queryByTestId("inbox-identity-badge")).toBeNull();
    // The card stops clipping at its edge only where there is a badge to show whole.
    expect(cards[0]!.className).toContain("mail-card-with-badge");
    expect(cards[1]!.className).toBe("mail-card");
    // No request beyond the list itself.
    expect(toSign).toHaveBeenCalledTimes(1);
  });

  it.each([
    [check({ required: true, status: "not-required" }), false],
    [check({ required: false, status: "pending" }), false],
    [check({ status: "passed" }), true],
    [check({ status: "locked" }), true],
    [check({ status: "name-mismatch" }), true],
    [null, false],
    [undefined, false],
  ])("decides from what the server says (%j → %s)", (value, shown) => {
    expect(inboxIdentityCheckShown(value)).toBe(shown);
  });

  it("is never shown in the demo build, whatever a row carries", async () => {
    flag.real = false;
    renderInbox([row("a", "Office Lease", check())]);
    await screen.findByTestId("to-sign-card");
    expect(screen.queryByTestId("inbox-identity-badge")).toBeNull();
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.getByTestId("to-sign-card").className).toBe("mail-card");
  });
});

describe("what the note says", () => {
  it.each([
    ["sign", "sign"], ["approve", "approve"], ["review", "review"], ["acknowledge", "acknowledge"],
  ] as const)("says a check is coming, with the verb of the %s list", async (action, verb) => {
    const user = userEvent.setup();
    renderInbox([row("a", "Office Lease", check())], action);
    await user.click(await screen.findByRole("button", { name: "Identity check for Office Lease" }));
    const note = openNote();
    expect(note).toHaveAccessibleName("Identity check required");
    expect(within(note).getByTestId("inbox-identity-bubble-body").textContent ?? "").toBe(
      `Before you can ${verb} this document, you will verify your identity with a valid ID and a face check. `
      + "Have your ID and your phone ready. It takes about two minutes.");
  });

  it("says an earlier pass still counts, and until when, from the one constant", async () => {
    const user = userEvent.setup();
    const verifiedAt = "2026-10-09T02:00:00.000Z";
    renderInbox([row("a", "Office Lease", check({ status: "passed", verifiedAt }))]);
    await user.click(await screen.findByRole("button", { name: "Identity check for Office Lease" }));
    const when = (at: Date) => at.toLocaleString(undefined, {
      day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
    });
    const until = when(new Date(Date.parse(verifiedAt) + IDENTITY_CHECK_VALID_HOURS * 60 * 60 * 1000));
    expect(IDENTITY_CHECK_VALID_HOURS).toBe(24);
    expect(identityCheckValidity(verifiedAt)?.until).toBe(until);
    expect(openNote()).toHaveAccessibleName("Identity already verified");
    expect(screen.getByTestId("inbox-identity-bubble-body").textContent ?? "").toBe(
      `You verified your identity on ${when(new Date(verifiedAt))}. You will not be asked again for this `
      + `workspace's documents until ${until}.`);
    // A check mark, in the same round button in the same place.
    expect(badge("Office Lease")).toHaveAttribute("data-status", "passed");
    expect(badge("Office Lease").textContent ?? "").not.toContain("?");
  });

  it("still reads when a pass carries no time", () => {
    const note = inboxIdentityNote(check({ status: "passed", verifiedAt: null }), "sign");
    expect(note.title).toBe("Identity already verified");
    expect(note.body).not.toMatch(/Invalid Date|null|undefined/);
  });

  it("says a lock, and that the sender has been told", async () => {
    const user = userEvent.setup();
    renderInbox([row("a", "Office Lease", check({ status: "locked", attemptsRemaining: 0 }))]);
    await user.click(await screen.findByRole("button", { name: "Identity check for Office Lease" }));
    expect(openNote()).toHaveAccessibleName("Identity check locked");
    expect(screen.getByTestId("inbox-identity-bubble-body").textContent ?? "").toBe(
      "The identity check for this document was not passed after 3 attempts. "
      + "The sender has been told and can let you continue another way.");
  });

  it("says a name that does not match, without the name", async () => {
    const user = userEvent.setup();
    renderInbox([row("a", "Office Lease", check({ status: "name-mismatch" }))]);
    await user.click(await screen.findByRole("button", { name: "Identity check for Office Lease" }));
    expect(openNote()).toHaveAccessibleName("Name on your ID does not match");
    expect(screen.getByTestId("inbox-identity-bubble-body").textContent ?? "").toBe(
      "Your identity was verified, but the name on your ID is different from the name on this document. "
      + "The sender has been told and can correct it or confirm it is you.");
  });

  it("treats a status this build does not know as a check that is asked", () => {
    const odd = { ...check(), status: "something-new" } as unknown as InboxIdentityCheck;
    expect(inboxIdentityNote(odd, "review").title).toBe("Identity check required");
    expect(inboxIdentityNote(odd, "review").body).toContain("Before you can review this document");
  });
});

describe("how the note opens and closes", () => {
  it("is a real button that names the document, says whether it is open, and what it opens", async () => {
    const user = userEvent.setup();
    renderInbox([row("a", "Office Lease", check())]);
    const button = await screen.findByRole("button", { name: "Identity check for Office Lease" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-expanded", "false");
    const controlled = document.getElementById(button.getAttribute("aria-controls") ?? "");
    expect(controlled).toBe(screen.getByTestId("inbox-identity-bubble"));
    // Closed: nothing of the note is exposed.
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.queryByText("Identity check required")).toBeNull();

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(openNote()).toBe(controlled);
    // Not a dialog: it takes no focus and traps none.
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(button).toHaveFocus();

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("opens from the keyboard, and Escape closes it and returns to the button", async () => {
    const user = userEvent.setup();
    renderInbox([row("a", "Office Lease", check())]);
    const button = await screen.findByRole("button", { name: "Identity check for Office Lease" });
    button.focus();
    await user.keyboard("{Enter}");
    expect(openNote()).toBeInTheDocument();
    // Focus moved into the note, then Escape.
    await user.tab();
    expect(within(openNote()).getByRole("button", { name: "Close" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("note")).toBeNull();
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("is reached after the card's content and before its actions", async () => {
    renderInbox([row("a", "Office Lease", check())]);
    const button = await screen.findByRole("button", { name: "Identity check for Office Lease" });
    const follows = (first: Element, second: Element) =>
      Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(screen.getByRole("heading", { name: "Office Lease" }), button)).toBe(true);
    expect(follows(button, screen.getByRole("button", { name: "Continue signing" }))).toBe(true);
  });

  it("closes on a press anywhere else, and not on a press inside the note", async () => {
    const user = userEvent.setup();
    renderInbox([row("a", "Office Lease", check())]);
    await user.click(await screen.findByRole("button", { name: "Identity check for Office Lease" }));
    await user.click(screen.getByTestId("inbox-identity-bubble-body"));
    expect(openNote()).toBeInTheDocument();
    await user.click(screen.getByRole("heading", { name: "Office Lease" }));
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("closes from its own Close button, back to the badge", async () => {
    const user = userEvent.setup();
    renderInbox([row("a", "Office Lease", check())]);
    await user.click(await screen.findByRole("button", { name: "Identity check for Office Lease" }));
    await user.click(within(openNote()).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("note")).toBeNull();
    expect(badge("Office Lease")).toHaveFocus();
  });

  it("shows one note at a time: opening another card's closes the first", async () => {
    const user = userEvent.setup();
    renderInbox([row("a", "Office Lease", check()), row("b", "NDA", check({ status: "locked" }))]);
    await user.click(await screen.findByRole("button", { name: "Identity check for Office Lease" }));
    expect(openNote()).toHaveAccessibleName("Identity check required");
    await user.click(badge("NDA"));
    expect(screen.getAllByRole("note")).toHaveLength(1);
    expect(openNote()).toHaveAccessibleName("Identity check locked");
    expect(badge("Office Lease")).toHaveAttribute("aria-expanded", "false");
    expect(badge("NDA")).toHaveAttribute("aria-expanded", "true");
  });

  it("does not start Continue signing, or anything else on the card", async () => {
    const user = userEvent.setup();
    const onCardClick = vi.fn();
    toSign.mockResolvedValue([row("a", "Office Lease", check())]);
    render(
      <MemoryRouter>
        <div onClick={onCardClick}><DocumentsToSignSection action="sign" /></div>
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole("button", { name: "Identity check for Office Lease" }));
    expect(openNote()).toBeInTheDocument();
    // The press went no further than the badge.
    expect(onCardClick).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText(/Proceed to signing|Enter your password/i)).toBeNull();
    await user.click(within(openNote()).getByTestId("inbox-identity-bubble-body"));
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it("keeps the note out of the list's layout, inside the viewport, and wraps long text", async () => {
    const user = userEvent.setup();
    renderInbox([row("a", "Office Lease", check())]);
    await user.click(await screen.findByRole("button", { name: "Identity check for Office Lease" }));
    const note = openNote();
    expect(note.style.position).toBe("fixed");
    // Never wider than the screen less a margin, down to a 320px phone.
    expect(note.style.width).toContain("min(288px");
    expect(note.style.width).toContain("calc(100vw - 16px)");
    expect(screen.getByTestId("inbox-identity-bubble-body").style.overflowWrap).toBe("anywhere");
    // Placed from the button: on screen, at least the margin in from the left and the top.
    expect(Number.parseFloat(note.style.left)).toBeGreaterThanOrEqual(8);
    expect(Number.parseFloat(note.style.top)).toBeGreaterThanOrEqual(8);
  });
});

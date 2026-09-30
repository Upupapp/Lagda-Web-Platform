// The side panel's pop-up counts: each unread notice is counted on exactly
// one row (Documents, Shared Documents or Contacts), and each row's bubble
// has its own icon and a spoken label. Plus the Free Home chatbot showcase.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router";

let items: { status: string; category: string; actionPath: string | null }[] = [];
vi.mock("../../../context/NotificationCenterContext", () => ({
  useOptionalNotificationCenter: () => ({ items }),
}));

import { useNavCounts } from "../../../hooks/useNavCounts";
import { NavCountBubble } from "../InvitationCountBubble";
import { ChatbotShowcase } from "../../dashboard/ChatbotShowcase";

describe("side panel counts", () => {
  it("counts each unread notice on the one row it leads to", () => {
    items = [
      { status: "unread", category: "documents", actionPath: "/app/documents/sr_1" },
      { status: "unread", category: "documents", actionPath: "/app/documents/sr_2" },
      { status: "read", category: "documents", actionPath: "/app/documents/sr_3" },
      { status: "unread", category: "documents", actionPath: "/app/shared-documents/with-me?section=pending" },
      { status: "unread", category: "my-actions", actionPath: "/app/shared-documents/by-me?section=pending" },
      { status: "unread", category: "workspace", actionPath: "/app/contacts/pending" },
    ];
    const { result } = renderHook(() => useNavCounts());
    expect(result.current).toEqual({ documents: 2, shared: 2, contacts: 1 });
  });

  it("gives each row its own bubble, hidden at zero", () => {
    const { container } = render(
      <>
        <NavCountBubble kind="documents" count={2} />
        <NavCountBubble kind="shared" count={1} />
        <NavCountBubble kind="contacts" count={3} />
        <NavCountBubble kind="invitations" count={0} />
      </>,
    );
    expect(screen.getByTestId("documents-bubble").getAttribute("aria-label")).toBe("2 unread document updates");
    expect(screen.getByTestId("shared-bubble").getAttribute("aria-label")).toBe("1 unread sharing update");
    expect(screen.getByTestId("contacts-bubble").getAttribute("aria-label")).toBe("3 unread contact requests");
    expect(screen.queryByTestId("invitation-bubble")).toBeNull();
    // Three different icons.
    const icons = [...container.querySelectorAll("svg")].map(s => s.getAttribute("class"));
    expect(new Set(icons).size).toBe(3);
  });
});

describe("chatbot showcase", () => {
  beforeEach(() => { window.localStorage.clear(); });

  it("shows the chatbot at work and leads to the plans", () => {
    render(<MemoryRouter><ChatbotShowcase /></MemoryRouter>);
    const card = screen.getByTestId("chatbot-showcase");
    expect(card.textContent).toContain("Meet the LAGDA Chatbot");
    expect(card.textContent).toContain("Draft an NDA");
    expect(screen.getByTestId("chatbot-showcase-cta").getAttribute("href")).toBe("/app/settings/plan?choose=personal");
  });

  it("hides for seven days", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<MemoryRouter><ChatbotShowcase /></MemoryRouter>);
    await user.click(screen.getByTestId("chatbot-showcase-hide"));
    expect(screen.queryByTestId("chatbot-showcase")).toBeNull();
    unmount();
    render(<MemoryRouter><ChatbotShowcase /></MemoryRouter>);
    expect(screen.queryByTestId("chatbot-showcase")).toBeNull();
  });
});

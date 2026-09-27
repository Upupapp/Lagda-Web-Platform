import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatToggle, TOOLTIP_TEXT } from "../ChatToggle";

const props = { documentEmpty: true, everOpened: false, reduced: false, right: 24, bottom: "24px", onOpen: () => undefined };
const GREETED = "lagda.chatbot.greeted.v1";

beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* ignore */ }
});

describe("the chat button", () => {
  it("wiggles while the page is blank and the chat has never been opened", () => {
    render(<ChatToggle {...props} />);
    const button = screen.getByRole("button", { name: "Open LAGDA Chatbot" });
    expect(button).toHaveAttribute("data-wiggle", "true");
    expect(button).toHaveClass("lagda-cb-wiggle");
  });

  it.each([
    ["once the page has content", { documentEmpty: false }],
    ["once the chat was opened", { everOpened: true }],
    ["under reduced motion", { reduced: true }],
  ])("stops wiggling %s", (_label, over) => {
    render(<ChatToggle {...props} {...over} />);
    const button = screen.getByRole("button", { name: "Open LAGDA Chatbot" });
    expect(button).toHaveAttribute("data-wiggle", "false");
    expect(button).not.toHaveClass("lagda-cb-wiggle");
  });

  it("names itself in a tooltip on hover and focus", async () => {
    window.localStorage.setItem(GREETED, "1");
    const user = userEvent.setup();
    render(<ChatToggle {...props} />);
    const button = screen.getByRole("button", { name: "Open LAGDA Chatbot" });
    expect(button).toHaveAttribute("title", TOOLTIP_TEXT);
    await user.hover(button);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Need help writing? Ask LAGDA Chatbot");
    await user.unhover(button);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("greets once per browser, then never again", () => {
    const view = render(<ChatToggle {...props} />);
    expect(screen.getByText(/I'm LAGDA Chatbot/)).toBeInTheDocument();
    view.unmount();
    render(<ChatToggle {...props} />);
    expect(screen.queryByText(/I'm LAGDA Chatbot/)).not.toBeInTheDocument();
  });

  it("the greeting can be dismissed, and hides by itself", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ delay: null });
      const view = render(<ChatToggle {...props} />);
      await user.click(screen.getByRole("button", { name: "Dismiss the greeting" }));
      expect(screen.queryByText(/I'm LAGDA Chatbot/)).not.toBeInTheDocument();
      view.unmount();
      window.localStorage.clear();
      render(<ChatToggle {...props} />);
      act(() => { vi.advanceTimersByTime(9100); });
      expect(screen.queryByText(/I'm LAGDA Chatbot/)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("blocked storage never breaks it, and never nags", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    render(<ChatToggle {...props} />);
    expect(screen.getByRole("button", { name: "Open LAGDA Chatbot" })).toBeInTheDocument();
    expect(screen.queryByText(/I'm LAGDA Chatbot/)).not.toBeInTheDocument();
  });

  it("opens the chat", async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(<ChatToggle {...props} onOpen={onOpen} />);
    await user.click(screen.getByRole("button", { name: "Open LAGDA Chatbot" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

// The Correspondence card's action row: three or more actions sit side by side in one
// scrolling row with an arrow at each end (the row itself is styled for phones only in CSS); fewer keep the plain row.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Eye, History, Users, Ban, Send } from "lucide-react";
import { MailCard, MailAction, MailCardList } from "../MailCard";

const branding = { displayName: "Roronoa's Workspace", primaryColor: "#0F8A3C", logoUrl: null };

const card = (actions: number) => render(
  <MailCardList label="Sent documents">
    <MailCard
      branding={branding} subtitle="Partially signed" corner="Sent Oct 9, 2026" title="Identity check phone"
      footerStart={<>
        {actions >= 1 && <MailAction icon={Users} label="Participants" onClick={() => undefined} />}
        {actions >= 2 && <MailAction icon={History} label="History" onClick={() => undefined} />}
        {actions >= 3 && <MailAction icon={Ban} label="Cancel" onClick={() => undefined} />}
      </>}
      footerEnd={<>
        {actions >= 4 && <MailAction icon={Eye} label="View" onClick={() => undefined} />}
        {actions >= 5 && <MailAction icon={Send} label="Send to new email" primary onClick={() => undefined} />}
      </>}
    />
  </MailCardList>,
);

const footer = () => screen.getByTestId("mail-card-footer");

describe("the card's actions", () => {
  it("keep the plain row with two actions", () => {
    card(2);
    expect(footer()).toHaveAttribute("data-scrolling", "false");
    expect(screen.getByTestId("mail-card-scroll-left")).toHaveAttribute("hidden");
    expect(screen.getByTestId("mail-card-scroll-right")).toHaveAttribute("hidden");
  });

  it("become one scrolling row from three actions, all five side by side in order", () => {
    card(5);
    expect(footer()).toHaveAttribute("data-scrolling", "true");
    const group = screen.getByRole("group", { name: "Document actions" });
    const names = Array.from(group.querySelectorAll("button")).map(b => b.textContent?.trim());
    expect(names).toEqual(["Participants", "History", "Cancel", "View", "Send to new email"]);
  });

  it("show an arrow only on the side that has more, and scroll that way when pressed", async () => {
    card(5);
    const group = screen.getByRole("group", { name: "Document actions" });
    Object.defineProperty(group, "scrollWidth", { configurable: true, value: 700 });
    Object.defineProperty(group, "clientWidth", { configurable: true, value: 300 });
    const scrollBy = vi.fn();
    group.scrollBy = scrollBy as unknown as typeof group.scrollBy;
    group.scrollLeft = 0;
    fireEvent.scroll(group);
    expect(screen.getByTestId("mail-card-scroll-left")).toHaveAttribute("hidden");
    const right = screen.getByTestId("mail-card-scroll-right");
    expect(right).not.toHaveAttribute("hidden");
    await userEvent.click(right);
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 210 }));
    group.scrollLeft = 400;
    fireEvent.scroll(group);
    expect(screen.getByTestId("mail-card-scroll-left")).not.toHaveAttribute("hidden");
    expect(screen.getByTestId("mail-card-scroll-right")).toHaveAttribute("hidden");
    await userEvent.click(screen.getByTestId("mail-card-scroll-left"));
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: -210 }));
  });

  it("show no arrows when all the actions already fit", () => {
    card(3);
    const group = screen.getByRole("group", { name: "Document actions" });
    Object.defineProperty(group, "scrollWidth", { configurable: true, value: 300 });
    Object.defineProperty(group, "clientWidth", { configurable: true, value: 400 });
    fireEvent.scroll(group);
    expect(footer()).toHaveAttribute("data-scrolling", "true");
    expect(screen.getByTestId("mail-card-scroll-left")).toHaveAttribute("hidden");
    expect(screen.getByTestId("mail-card-scroll-right")).toHaveAttribute("hidden");
  });
});

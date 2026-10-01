// The activity log's sentences: the actor leads with a face and a name —
// "You" for the person reading — and a member the sentence names gets a face
// too ("your" when it is the reader). The words are the backend's.

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ActivitySentence } from "../real/RealActivityPage";
import type { WorkspaceActivityEntry } from "../../../../services/real/workspace-activity.service";

const entry = (over: Partial<WorkspaceActivityEntry>): WorkspaceActivityEntry => ({
  eventId: "e1", occurredAt: Date.now(), category: "people", action: "member.role_changed",
  actorUserId: "u_ana", actorName: "Ana Reyes",
  summary: "Ana Reyes changed Jose Cruz's role from Sender to Reviewer", subjectLabel: "Jose Cruz", ...over,
});
const people = new Map([
  ["ana reyes", { userId: "u_ana", displayName: "Ana Reyes" }],
  ["jose cruz", { userId: "u_jose", displayName: "Jose Cruz" }],
]);
const photo = (userId: string | null | undefined) => (userId === "u_ana" ? "http://api.test/a.png" : undefined);

/** What a reader hears: the hidden initials behind a face are left out. */
const text = (el: HTMLElement) => {
  const copy = el.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("[aria-hidden]").forEach(n => { n.remove(); });
  return copy.textContent?.replace(/\s+/g, " ").trim();
};

describe("activity sentences", () => {
  it("says You when the reader did it, with their photo", () => {
    const { container } = render(<ActivitySentence entry={entry({})} meId="u_ana" people={people} photo={photo} />);
    expect(text(container)).toBe("You changed Jose Cruz's role from Sender to Reviewer");
    expect(container.querySelector("strong[data-you='true']")).toHaveTextContent("You");
    expect(container.querySelector("img")?.getAttribute("src")).toBe("http://api.test/a.png");
  });

  it("names someone else, and shows the subject's face with their name", () => {
    const { container } = render(<ActivitySentence entry={entry({})} meId="u_lea" people={people} photo={photo} />);
    expect(text(container)).toBe("Ana Reyes changed Jose Cruz's role from Sender to Reviewer");
    expect(container.querySelectorAll(".act-who")).toHaveLength(2);
  });

  it("says your when the reader is the one it happened to", () => {
    const { container } = render(<ActivitySentence entry={entry({})} meId="u_jose" people={people} photo={photo} />);
    expect(text(container)).toContain("changed your role from Sender to Reviewer");
  });

  it("keeps the grammar when it is You", () => {
    const { container } = render(<ActivitySentence meId="u_ana" people={people} photo={photo}
      entry={entry({ action: "invitation.accepted", summary: "Ana Reyes accepted the invitation and is waiting for approval", subjectLabel: "Ana Reyes" })} />);
    expect(text(container)).toBe("You accepted the invitation and are waiting for approval");
  });
});

import { describe, it, expect } from "vitest";
import { ceremonyWording, completedWord } from "../participant-wording";

describe("ceremonyWording", () => {
  it.each([
    ["signer", "Submit signature", "Your signature was recorded"],
    ["approver", "Approve", "Your approval was recorded"],
    ["reviewer", "Mark as reviewed", "Your review was recorded"],
    ["acknowledgment-recipient", "Acknowledge", "Your acknowledgment was recorded"],
  ])("%s", (type, action, doneTitle) => {
    expect(ceremonyWording(type)).toMatchObject({ action, doneTitle });
  });

  it("falls back to the signer's words for an unknown role", () => {
    expect(ceremonyWording("something-new").action).toBe("Submit signature");
  });
});

describe("completedWord", () => {
  it("says what each role did", () => {
    expect(completedWord("signer")).toBe("Signed");
    expect(completedWord("reviewer")).toBe("Reviewed");
    expect(completedWord("acknowledgment-recipient")).toBe("Acknowledged");
  });
});

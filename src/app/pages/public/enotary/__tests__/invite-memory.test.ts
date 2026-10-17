import { describe, it, expect, beforeEach } from "vitest";
import { forgetInvite, recallInvite, rememberInvite } from "../invite-memory";

const PATH = `/enotary/invite/${"a".repeat(43)}`;

describe("the way back to a notary invitation", () => {
  beforeEach(() => { sessionStorage.clear(); });

  it("remembers an invitation address for two hours and then forgets it", () => {
    rememberInvite(PATH, 1_000);
    expect(recallInvite(1_000 + 60_000)).toBe(PATH);
    expect(recallInvite(1_000 + 2 * 3_600_000 + 1)).toBeNull();
  });

  it("keeps nothing that is not exactly an invitation address", () => {
    for (const path of ["/app/dashboard", `${PATH}x`, "/enotary/invite/short", "https://evil.example", `${PATH}/more`]) {
      rememberInvite(path);
      expect(recallInvite()).toBeNull();
    }
  });

  it("does not trust what is in storage either", () => {
    sessionStorage.setItem("lagda-notary-invite", JSON.stringify({ path: "https://evil.example", at: Date.now() }));
    expect(recallInvite()).toBeNull();
    sessionStorage.setItem("lagda-notary-invite", "not json");
    expect(recallInvite()).toBeNull();
  });

  it("can be forgotten", () => {
    rememberInvite(PATH);
    forgetInvite();
    expect(recallInvite()).toBeNull();
  });
});

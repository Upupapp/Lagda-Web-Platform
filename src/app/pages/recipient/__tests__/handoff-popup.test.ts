// How the sign-in handoff opens its tab.
//
// This exists because the first version shipped broken in a way that read as
// correct. `window.open(..., "noopener")` returns null BY SPECIFICATION, so
// the tab opened, the code read null, concluded the popup had been blocked,
// and told the signer to allow pop-ups — while an orphaned blank tab sat
// there. Both halves of that message were wrong.
//
// A rendering test could not have caught it: jsdom's `window.open` returns a
// stub whatever flags you pass, so the bug is invisible to the only kind of
// test that would seem natural here. What CAN be checked is the source — that
// nothing reintroduces the flag which makes the handle unusable, and that the
// ordering popup blockers care about is preserved.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ceremony = readFileSync(
  resolve(process.cwd(), "src/app/pages/recipient/RealSigningPage.tsx"), "utf-8");
const claimPage = readFileSync(
  resolve(process.cwd(), "src/app/pages/platform/LinkSigningPage.tsx"), "utf-8");

describe("opening the handoff tab", () => {
  it("does not pass noopener, which would make the handle null", () => {
    const call = /window\.open\([^)]*\)/.exec(ceremony);
    expect(call, "window.open call not found").not.toBeNull();
    expect(call?.[0]).not.toMatch(/noopener/);
    expect(call?.[0]).not.toMatch(/noreferrer/);
  });

  it("opens the tab BEFORE awaiting anything", () => {
    // A popup opened after an await is no longer attributable to the click
    // that started it, and browsers block it. The open must precede the mint.
    const openAt = ceremony.indexOf("window.open(");
    const mintAt = ceremony.indexOf("mintHandoff()");
    expect(openAt).toBeGreaterThan(-1);
    expect(mintAt).toBeGreaterThan(-1);
    expect(openAt).toBeLessThan(mintAt);
  });

  it("never navigates the signing tab as a fallback", () => {
    // The signing tab's URL carries the access credential, and the backend
    // sets Referrer-Policy: no-referrer precisely so it cannot leak. A
    // fallback that navigated this tab would undo that, and a blocked popup
    // is a far smaller problem than a leaked credential.
    const handler = ceremony.slice(
      ceremony.indexOf("handleSignInToConfirm"),
      ceremony.indexOf("const handleAcceptConsent"));
    expect(handler.length).toBeGreaterThan(0);
    // `tab.location.replace(...)` is the CORRECT call — it navigates the new
    // tab. What must never appear is a navigation of THIS window, so the
    // check is anchored on the receiver rather than on the method name.
    expect(handler).not.toMatch(/window\.location\s*[=.]/);
    expect(handler).not.toMatch(/(?<![.\w])location\s*[=.]/);
  });
});

describe("the tab that opens", () => {
  it("disowns its opener", () => {
    // Keeping a handle is what lets the signing tab point this one somewhere.
    // The cost is a live reference back to a tab whose URL holds a credential,
    // and this page gives that up in its first effect rather than relying on
    // never using it.
    expect(claimPage).toMatch(/window\.opener\s*=\s*null/);
  });
});

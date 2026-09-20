// The two demonstration surfaces, and the route that used to feed them into
// the real signing flow.
//
// Every assertion here exists because the thing it checks was observed broken
// in production, not because it seemed prudent.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_PLATFORM_FLAGS } from "../../context/PlatformContext";
import { ACTIVE_LAUNCH_PROFILE } from "../capability-resolver";
import { PRIMARY_NAV } from "../platform.nav";
import {
  isSigningAccessToken,
  NotASigningTokenError,
} from "../../services/real/signing-access.service";

const routerSource = readFileSync(
  resolve(process.cwd(), "src/router.tsx"),
  "utf-8",
);

describe("demonstration surfaces are off in the production profile", () => {
  // netlify.toml pins production to VITE_LAUNCH_PROFILE="launch-default".
  // If that ever changes, this test is the thing that notices.
  it("the test run is using the default launch profile", () => {
    expect(ACTIVE_LAUNCH_PROFILE).toBe("launch-default");
  });

  it("My Actions is off", () => {
    // Twelve fixtures addressed to fictional people, shown identically to
    // every signed-in user, under a footer claiming the opposite.
    expect(DEFAULT_PLATFORM_FLAGS.recipientInboxEnabled).toBe(false);
  });

  it("the signature library is off", () => {
    // In-memory, resets on reload, never reaches the signing ceremony.
    expect(DEFAULT_PLATFORM_FLAGS.signatureLibraryEnabled).toBe(false);
  });

  it("genuinely shipped features are untouched", () => {
    // A gate that turns off more than it was aimed at is worse than no gate.
    expect(DEFAULT_PLATFORM_FLAGS.documentsEnabled).toBe(true);
    expect(DEFAULT_PLATFORM_FLAGS.prepareFlowEnabled).toBe(true);
    expect(DEFAULT_PLATFORM_FLAGS.verificationEnabled).toBe(true);
    expect(DEFAULT_PLATFORM_FLAGS.dashboardEnabled).toBe(true);
  });
});

describe("the My Actions navigation entry", () => {
  it("declares its feature flag", () => {
    // It was the ONLY nav entry with neither a permission nor a feature flag,
    // which is how it stayed reachable in production.
    const inbox = PRIMARY_NAV.find(item => item.id === "inbox");
    expect(inbox).toBeDefined();
    expect(inbox?.featureFlag).toBe("recipientInboxEnabled");
  });
});

describe("every demonstration route is guarded", () => {
  const guarded = [
    "inbox",
    "inbox/:requestId",
    "settings/signatures",
    "settings/signatures/new",
    "settings/signatures/:signatureId",
    "settings/signatures/:signatureId/edit",
  ];

  for (const path of guarded) {
    it(`${path} is wrapped in a FeatureGuard`, () => {
      // Read from the router source rather than rendering the whole app: the
      // property under test is that the guard is present at the route
      // definition, which is where a future edit would drop it.
      const index = routerSource.indexOf(`path: "${path}"`);
      expect(index, `route ${path} not found in router.tsx`).toBeGreaterThan(-1);
      const block = routerSource.slice(index, index + 400);
      expect(block).toContain("<FeatureGuard");
    });
  }

  it("guards exactly the six demonstration routes and nothing else", () => {
    const count = (routerSource.match(/<FeatureGuard flag=/g) ?? []).length;
    expect(count).toBe(guarded.length);
  });
});

describe("a mock id cannot reach the signing-access bootstrap", () => {
  // The backend pins the credential to exactly 43 characters. The inbox used
  // to hand its fixture ids to bootstrap as though they were tokens; with a
  // real backend that returned 422 and the signer saw "One or more fields
  // contain invalid values". Observed in production, not theorised.
  const FIXTURE_IDS = [
    "req-engagement-0002-marco",
    "req-psa-0001-lea",
    "req-dpa-0005-ana",
    "req-policy-review-0006",
    "req-policy-0004-sofia",
    "req-viewer-0007",
    "req-copy-0008",
    "req-locked-0009",
    "req-expired-0010",
    "req-cancelled-0011",
    "req-voided-0012",
    "req-done-0013",
  ];

  for (const id of FIXTURE_IDS) {
    it(`rejects ${id}`, () => {
      expect(isSigningAccessToken(id)).toBe(false);
    });
  }

  it("rejects the empty string and other obvious non-tokens", () => {
    for (const value of ["", "undefined", "null", "sign", "0"]) {
      expect(isSigningAccessToken(value)).toBe(false);
    }
  });

  it("accepts a credential of the length the backend requires", () => {
    // 43 characters — base64url over 32 bytes. Mirrors the server's
    // minLength/maxLength exactly; a stricter client rule would break the day
    // the server's format changed.
    expect(isSigningAccessToken("a".repeat(43))).toBe(true);
    expect(isSigningAccessToken("a".repeat(42))).toBe(false);
    expect(isSigningAccessToken("a".repeat(44))).toBe(false);
  });

  it("refuses before anything leaves the browser", async () => {
    // The guard lives in the service, not at the call site, so it holds for
    // every caller that will ever exist — not just the inbox that motivated it.
    const { realSigningAccessService } = await import(
      "../../services/real/signing-access.service"
    );
    await expect(
      realSigningAccessService.bootstrap("req-engagement-0002-marco"),
    ).rejects.toBeInstanceOf(NotASigningTokenError);
  });

  it("says nothing about why, so it cannot be used as an oracle", async () => {
    // A caller must not be able to distinguish "not a token" from "token not
    // valid". The backend collapses every bootstrap failure into one error for
    // this reason; the client must not undo that.
    const error = new NotASigningTokenError();
    expect(error.message).not.toMatch(/length|43|format|shape|malformed/i);
  });
});

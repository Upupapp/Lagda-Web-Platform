// Small pure rules from the 5 October QA round.

import { describe, it, expect, vi } from "vitest";

vi.mock("../../backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

import { documentDescription } from "../palette-search";
import { pageCountLabel, pageCountText } from "../../../pages/platform/prepare/UploadStep";

describe("search results that can be told apart (TC-49)", () => {
  const by = { name: "Christopher Cortes", email: "c@example.com" };

  it("two copies sent the same day by the same person differ by the time", () => {
    const a = documentDescription({ sentAt: "2026-09-21T02:05:00.000Z", createdAt: "2026-09-21T02:00:00.000Z", initiator: by });
    const b = documentDescription({ sentAt: "2026-09-21T07:40:00.000Z", createdAt: "2026-09-21T07:30:00.000Z", initiator: by });
    expect(a).not.toBe(b);
    expect(a).toContain("by Christopher Cortes");
  });

  it("does not repeat the status the row already shows", () => {
    const text = documentDescription({ sentAt: "2026-09-21T02:05:00.000Z", createdAt: "2026-09-21T02:00:00.000Z", initiator: by });
    expect(text).not.toMatch(/Completed|Declined|Sent ·|^Sent$/);
    expect(text.startsWith("Sent ")).toBe(true);
  });

  it("says Created for a draft that was never sent", () => {
    expect(documentDescription({ sentAt: null, createdAt: "2026-09-21T02:00:00.000Z", initiator: null })).toMatch(/^Created /);
  });
});

describe("the page count beside an uploaded file (OBS-02)", () => {
  it("is singular for one page", () => {
    expect(pageCountLabel(1, true)).toBe("1 page");
    expect(pageCountLabel(3, true)).toBe("3 pages");
  });

  it("on the live site shows the server's count, and no guess before it arrives", () => {
    expect(pageCountText({ demoPageCount: 1 }, true)).toBe("");
    expect(pageCountText({ demoPageCount: 4, pageCount: 1 }, true)).toBe(" · 1 page");
  });

  it("in the demo build keeps its estimate, marked as one", () => {
    expect(pageCountText({ demoPageCount: 1 }, false)).toBe(" · ~1 page");
    expect(pageCountText({ demoPageCount: 8 }, false)).toBe(" · ~8 pages");
  });
});

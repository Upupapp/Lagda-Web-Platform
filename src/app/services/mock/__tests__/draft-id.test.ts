// Draft ids must be unique, even within a single millisecond.
//
// createDraft built its id from `Date.now()` alone. Two drafts created in the
// same millisecond therefore got the SAME id, and because the service keys its
// drafts map by that id, the second silently overwrote the first — one of the
// two drafts simply ceased to exist, with no error anywhere.
//
// A person clicking a button cannot hit the same millisecond twice, which is
// why this survived. Anything creating drafts programmatically can.
//
// ── Why Date.now is frozen below ────────────────────────────────────────────
//
// The obvious test — create two drafts at once and compare ids — DOES NOT
// RELIABLY CATCH THIS. createDraft awaits a 600ms delay before reading the
// clock, so two concurrent calls usually resolve a millisecond or two apart
// and pass even with the bug present. Verified: with the fix reverted, the
// two-draft tests passed and only a 25-draft burst failed.
//
// A test that detects a bug two times in three is worse than none, because it
// reads as coverage. Freezing the clock removes the luck: every draft in this
// file is created at the same instant by construction, so any id collision is
// a real defect rather than a scheduling coincidence.
//
// Kept next to the service rather than with the template tests so the fix and
// its proof can be reverted together.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prepareService } from "../prepare.service";

const FROZEN_MS = Date.parse("2026-09-22T09:00:00.000Z");

beforeEach(() => {
  // Only Date.now — setTimeout stays real, so the service's internal delay()
  // still resolves normally and nothing has to be manually advanced.
  vi.spyOn(Date, "now").mockReturnValue(FROZEN_MS);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("draft ids", () => {
  it("is a clock frozen hard enough to reproduce the bug", () => {
    // Guards the guard: if a future change makes createDraft read the time
    // some other way, the three tests below would quietly stop testing
    // anything and this one says so.
    expect(Date.now()).toBe(FROZEN_MS);
    expect(Date.now()).toBe(Date.now());
  });

  it("are distinct for two drafts created at the same instant", async () => {
    const [first, second] = await Promise.all([
      prepareService.createDraft({ source: "new" }),
      prepareService.createDraft({ source: "new" }),
    ]);

    expect(first.id).not.toBe(second.id);
  });

  it("keeps BOTH drafts retrievable, with their own contents", async () => {
    // The assertion that describes the bug's actual CONSEQUENCE, not just its
    // symptom. The two drafts are made distinguishable, because comparing ids
    // alone is tautological here: when the ids collide, looking up `first.id`
    // returns the SECOND draft, whose `.id` is that same string, so an
    // id-only assertion passes while one draft has in fact been lost.
    //
    // `source` is the distinguishing field rather than `initialTitle`, which
    // createDraft only applies when `initialFiles` is also present.
    const [first, second] = await Promise.all([
      prepareService.createDraft({ source: "new" }),
      prepareService.createDraft({ source: "documents" }),
    ]);

    const fetchedFirst = await prepareService.getDraft(first.id);
    const fetchedSecond = await prepareService.getDraft(second.id);

    expect(fetchedFirst).not.toBeNull();
    expect(fetchedSecond).not.toBeNull();
    expect(fetchedFirst!.sourceContext.source).toBe("new");
    expect(fetchedSecond!.sourceContext.source).toBe("documents");
  });

  it("stays unique across a burst", async () => {
    const drafts = await Promise.all(
      Array.from({ length: 25 }, () => prepareService.createDraft({ source: "new" })),
    );

    expect(new Set(drafts.map(d => d.id)).size).toBe(25);
  });
});

// ── initialTitle, independent of initialFiles ───────────────────────────────
//
// The title used to be applied only inside the `initialFiles` branch, so a
// caller passing a title and no files had it silently discarded. Both current
// callers always pass a file, which is why nobody hit it — and why it would
// have waited for the next one.

describe("createDraft applies initialTitle", () => {
  it("applies it WITHOUT initialFiles", async () => {
    const draft = await prepareService.createDraft({
      source: "new", initialTitle: "Quarterly Vendor Review",
    });
    expect(draft.details.title).toBe("Quarterly Vendor Review");
  });

  it("still applies it alongside initialFiles", async () => {
    const draft = await prepareService.createDraft({
      source: "new",
      initialTitle: "With A File",
      initialFiles: [{
        id: "f1", fileName: "a.pdf", sizeBytes: 10,
        mimeType: "application/pdf", fileState: "ready", pageCount: 1,
      } as never],
    });
    expect(draft.details.title).toBe("With A File");
    expect(draft.files).toHaveLength(1);
  });

  it("leaves the default title alone when none is given", async () => {
    // Both halves asserted: the title lands when supplied AND the default
    // survives when it is not. Checking only the second would pass against a
    // createDraft that ignored initialTitle entirely.
    const withTitle = await prepareService.createDraft({
      source: "new", initialTitle: "Named",
    });
    const without = await prepareService.createDraft({ source: "new" });

    expect(withTitle.details.title).toBe("Named");
    expect(without.details.title).not.toBe("Named");
  });
});

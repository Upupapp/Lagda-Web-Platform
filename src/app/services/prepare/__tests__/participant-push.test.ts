// When a document's local participants have to be PUSHED to the backend.
//
// ── The defect this pins ───────────────────────────────────────────────────
//
// `syncParticipants` only ever ran from `updateParticipants` — an edit. A
// draft whose participants arrive wholesale never edits them, so nothing
// created them: `handOffTemplateToPrepare` writes the finished draft straight
// to localStorage and PrepareProvider rehydrates it.
//
// The result was invisible until the last possible moment. The Participants
// step listed everyone while `preparation_recipients` was empty, and the
// Fields step's save — which references recipients by id — was refused 422
// by `saveDocumentPreparation`, whose `assignable` map is built from exactly
// that empty list. Confirmed in production: a template-launched document had
// no preparation row at all.
//
// The inverse case matters just as much: an empty list on a document that HAS
// synced is authoritative (everyone was removed), and pushing there would
// resurrect deleted recipients.

import { describe, it, expect } from "vitest";
import { needsInitialParticipantPush } from "../participant-sync";

const local = (id: string) => ({ id });

describe("needsInitialParticipantPush", () => {
  it("pushes local participants the backend has never seen", () => {
    // The template-handoff case: ids are local (no `rcp_` prefix), the
    // backend has nothing, and nothing has ever synced.
    expect(needsInitialParticipantPush(0, [local("tpl_1"), local("tpl_2")], false)).toBe(true);
  });

  it("does NOT push when the backend already has recipients", () => {
    expect(needsInitialParticipantPush(2, [local("tpl_1")], false)).toBe(false);
  });

  it("does NOT push an empty list on a document that has already synced", () => {
    // Everyone was deliberately removed. Re-pushing would resurrect them.
    expect(needsInitialParticipantPush(0, [local("tpl_1")], true)).toBe(false);
  });

  it("does NOT push when there are no local participants", () => {
    expect(needsInitialParticipantPush(0, [], false)).toBe(false);
  });

  it("does NOT push when every local participant is already real", () => {
    // `rcp_`-prefixed ids came FROM the backend — creating them again would
    // duplicate them.
    expect(needsInitialParticipantPush(0, [local("rcp_1"), local("rcp_2")], false)).toBe(false);
  });

  it("pushes when only SOME are real — the rest still do not exist", () => {
    expect(needsInitialParticipantPush(0, [local("rcp_1"), local("tpl_2")], false)).toBe(true);
  });
});

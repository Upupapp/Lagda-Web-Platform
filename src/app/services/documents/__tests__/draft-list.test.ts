// What counts as a draft, decided in one place for Documents › Draft and for
// "Resume a draft" on the Prepare entry page.

import { describe, it, expect } from "vitest";
import {
  selectDraftList, selectUnsentDraftDocuments, unsentDraftRow, isUnsentDraft, DRAFT_REQUEST_STATES,
} from "../draft-list";
import type { RealDocument } from "../../real/document.service";
import type { SigningRequestListItem, SigningRequestState } from "../../real/signing-request.service";

const doc = (id: string, updatedAt = "2026-10-05T00:00:00.000Z", title = id): RealDocument => ({
  documentId: id, title, originalFilename: `${id}.pdf`, createdByUserId: "u1", folderId: null,
  createdAt: "2026-10-01T00:00:00.000Z", updatedAt, source: null,
});
const request = (id: string, documentId: string, state: SigningRequestState): SigningRequestListItem => ({
  signingRequestId: id, documentId, documentTitle: documentId, state, participantCount: 1,
  completedParticipantCount: 0, initiator: null, createdAt: "2026-10-02T00:00:00.000Z",
  sentAt: null, completedAt: null, expiresAt: null,
});

describe("selectUnsentDraftDocuments", () => {
  const documents = [doc("a"), doc("b"), doc("c")];

  it("is every document that never had a request and is not a template's own", () => {
    expect(selectUnsentDraftDocuments(documents, new Set(["b"]), new Set(["c"])).map(d => d.documentId)).toEqual(["a"]);
  });

  it("shows nothing until both lists are known, so nothing is briefly a draft", () => {
    expect(selectUnsentDraftDocuments(documents, null, new Set())).toEqual([]);
    expect(selectUnsentDraftDocuments(documents, new Set(), null)).toEqual([]);
  });
});

describe("unsentDraftRow", () => {
  it("is a Draft row built from the document, marked as having no request", () => {
    const row = unsentDraftRow(doc("a", "2026-10-05T00:00:00.000Z", "Deed"));
    expect(row.signingRequestId).toBe("unsent-draft:a");
    expect(row.state).toBe("draft");
    expect(row.documentTitle).toBe("Deed");
    expect(isUnsentDraft(row)).toBe(true);
    expect(isUnsentDraft(request("sr_1", "a", "draft"))).toBe(false);
  });
});

describe("selectDraftList", () => {
  it("is the unsent documents and the unsent requests, newest change first", () => {
    const list = selectDraftList(
      [doc("unsent", "2026-10-03T00:00:00.000Z"), doc("drafted", "2026-10-07T00:00:00.000Z"),
        doc("ready", "2026-10-05T00:00:00.000Z"), doc("sent", "2026-10-09T00:00:00.000Z")],
      [request("sr_1", "drafted", "draft"), request("sr_2", "ready", "ready-to-send"), request("sr_3", "sent", "sent")],
      [],
    );
    expect(list.map(entry => entry.documentId)).toEqual(["drafted", "ready", "unsent"]);
    expect(list.map(entry => entry.key)).toEqual(["sr_1", "sr_2", "unsent-draft:unsent"]);
    expect(list[0]).toEqual({
      key: "sr_1", documentId: "drafted", title: "drafted", fileName: "drafted.pdf", changedAt: "2026-10-07T00:00:00.000Z",
    });
  });

  it("covers exactly the states Documents › Draft asks the server for", () => {
    expect(DRAFT_REQUEST_STATES).toEqual(["draft", "ready-to-send"]);
  });

  it("lists a document once, however many unsent requests it has", () => {
    const list = selectDraftList([doc("a")], [request("sr_1", "a", "draft"), request("sr_2", "a", "draft")], []);
    expect(list).toHaveLength(1);
  });

  it("still lists a draft request whose document is not on the documents page", () => {
    const list = selectDraftList([], [request("sr_1", "gone", "draft")], []);
    expect(list).toEqual([{
      key: "sr_1", documentId: "gone", title: "gone", fileName: null, changedAt: "2026-10-02T00:00:00.000Z",
    }]);
  });

  it("is empty until all three lists are known", () => {
    expect(selectDraftList(undefined, [], [])).toEqual([]);
    expect(selectDraftList([doc("a")], undefined, [])).toEqual([]);
    expect(selectDraftList([doc("a")], [], undefined)).toEqual([]);
  });
});

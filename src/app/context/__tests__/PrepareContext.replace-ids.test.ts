// When the server creates the participants, their local ids are swapped for
// the server's. Everything in the draft that names a participant has to follow,
// or it is left pointing at somebody who no longer exists.

import { describe, it, expect } from "vitest";
import { prepareReducer } from "../PrepareContext";
import type { PreparationDraft } from "../../models/prepare";

type State = Parameters<typeof prepareReducer>[0];

function stateWith(draft: Partial<PreparationDraft>): State {
  return {
    draft: {
      participants: [
        { id: "pax_1", name: "Ana Reyes" },
        { id: "pax_2", name: "Ben Cruz" },
      ],
      routing: {
        mode: "sequential",
        groups: [
          { id: "g1", stepNumber: 1, participantIds: ["pax_1"] },
          { id: "g2", stepNumber: 2, participantIds: ["pax_2"] },
        ],
      },
      ...draft,
    } as unknown as PreparationDraft,
    loadState: "ready", errorMessage: null, isDirty: false, activeStepId: null,
    contacts: [], templates: [], resumableDrafts: [],
  };
}

const replacements = new Map([["pax_1", "rcp_a"], ["pax_2", "rcp_b"]]);

describe("REPLACE_PARTICIPANT_IDS", () => {
  it("carries the new ids into participants and every routing step", () => {
    const next = prepareReducer(stateWith({}), { type: "REPLACE_PARTICIPANT_IDS", replacements });
    expect(next.draft?.participants.map(p => p.id)).toEqual(["rcp_a", "rcp_b"]);
    expect(next.draft?.routing.groups.map(g => g.participantIds)).toEqual([["rcp_a"], ["rcp_b"]]);
  });

  it("carries them into the template's fields, so none is left assigned to a removed participant", () => {
    const templateFields = [
      { participantId: "pax_1", staticValue: null },
      { participantId: "pax_2", staticValue: null },
      // Filled from a variable: deliberately nobody's, and stays that way.
      { participantId: null, staticValue: "Acme Holdings" },
    ] as unknown as NonNullable<PreparationDraft["templateFields"]>;
    const next = prepareReducer(stateWith({ templateFields }), { type: "REPLACE_PARTICIPANT_IDS", replacements });
    expect(next.draft?.templateFields?.map(f => f.participantId)).toEqual(["rcp_a", "rcp_b", null]);
  });

  it("leaves a draft with no template fields without any", () => {
    const next = prepareReducer(stateWith({}), { type: "REPLACE_PARTICIPANT_IDS", replacements });
    expect(next.draft?.templateFields).toBeUndefined();
  });
});

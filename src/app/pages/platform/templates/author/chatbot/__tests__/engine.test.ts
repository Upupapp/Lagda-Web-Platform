// The LAGDA Chatbot's rule engine: intents, matching (exact > keyword >
// fuzzy, with a clarify band), entities, fallbacks and the confirm flow.

import { describe, it, expect } from "vitest";
import {
  initialState, respond, greetingReplies, hasUserTurns, scoreMatchable,
  type EngineContext, type EngineState, type EngineResult, type ChipAction,
} from "../engine";
import { isGibberish, normalize, tokens, editDistance, fuzzyEquals } from "../text";
import { KNOWN_WORDS, DOCUMENT_MATCHABLES, findDocument } from "../knowledge";
import {
  extractAmounts, extractDates, extractNames, extractCompanies, extractJobTitle, extractTerm, extractBetween,
} from "../entities";

const ctx: EngineContext = { userName: "Ana Reyes", documentHasContent: false, canSaveRoles: true, today: "March 1, 2027" };
const NDA = "recruitment-and-hr--non-disclosure-agreement-nda";
const OFFER = "recruitment-and-hr--employment-offer-letter-and-contract-agreement";
const LEASE = "real-estate-and-property--property-lease-agreement";

function say(texts: string[], c: EngineContext = ctx): { state: EngineState; last: EngineResult; all: EngineResult[] } {
  let state = initialState();
  const all: EngineResult[] = [];
  for (const t of texts) {
    const r = respond(state, { text: t }, c);
    all.push(r);
    state = r.state;
  }
  return { state, last: all[all.length - 1]!, all };
}

function act(state: EngineState, action: ChipAction, c: EngineContext = ctx): EngineResult {
  return respond(state, { action }, c);
}

const text = (r: EngineResult) => r.replies.map(x => x.text).join(" ");

describe("greeting and small talk", () => {
  it("opens with a personal greeting and starter chips, including the detailed draft", () => {
    const [g] = greetingReplies(ctx);
    expect(g!.text).toContain("Hi Ana!");
    const labels = g!.chips!.map(c => c.label);
    expect(labels).toContain("NDA");
    expect(labels).toContain("Employment offer (detailed)");
    expect(labels).toContain("Browse categories");
  });

  it.each([
    ["hello", "greeting"], ["good morning", "greeting"], ["thanks", "thanks"], ["thank you so much", "thanks"],
    ["bye", "bye"], ["help", "help"], ["what can you do", "help"], ["who are you", "identity"],
    ["do you store my data", "privacy"], ["show categories", "browse"], ["start over", "start-over"],
  ])("understands %s as %s", (input, intent) => {
    expect(say([input]).last.meta.intent).toBe(intent);
  });

  it("rotates reply variants rather than repeating one", () => {
    const a = say(["hi"]).last;
    const b = say(["hi", "hi"]).last;
    expect(text(a)).not.toBe(text(b));
  });

  it("browse lists every category as a chip", () => {
    const r = say(["browse categories"]).last;
    expect(r.replies[0]!.chips).toHaveLength(15);
  });
});

describe("matching: exact phrase > keywords > fuzzy, with a clarify band", () => {
  it("an exact alias is a certain match", () => {
    const nda = DOCUMENT_MATCHABLES.find(m => m.id === NDA)!;
    const n = normalize("nda");
    expect(scoreMatchable(nda, n, tokens(n))).toBe(1);
  });

  it("a contained phrase outranks a single keyword", () => {
    const lease = DOCUMENT_MATCHABLES.find(m => m.id === LEASE)!;
    const phrase = normalize("i need a lease agreement for my condo");
    const keyword = normalize("something about rent");
    expect(scoreMatchable(lease, phrase, tokens(phrase))).toBeGreaterThan(scoreMatchable(lease, keyword, tokens(keyword)));
  });

  it.each([
    ["I need an NDA", NDA],
    ["write a non-disclosure agreement", NDA],
    ["employment contract please", OFFER],
    ["draft a lease agreement for my apartment", LEASE],
    ["leese agreemnt", LEASE],
    ["non disclosure agreemnt", NDA],
    ["service level agreement", "sales-and-customer-agreements--service-level-agreement-sla"],
    ["an internship agreement", "education--internship-agreement"],
  ])("%s → the right document", (input, id) => {
    expect(say([input]).last.meta.intent).toBe(`doc:${id}`);
  });

  it("an ambiguous single word asks which one was meant", () => {
    const r = say(["lease"]).last;
    expect(r.meta.intent).toBe("clarify");
    const chips = r.replies[0]!.chips!.map(c => c.label);
    expect(chips).toContain("Property Lease Agreement");
    expect(chips.length).toBeGreaterThan(1);
  });

  it("typo-tolerant comparison", () => {
    expect(editDistance("agreemnt", "agreement")).toBe(1);
    expect(fuzzyEquals("confidentail", "confidential")).toBe(true);
    expect(fuzzyEquals("please", "lease")).toBe(false);
  });
});

describe("fallbacks", () => {
  it.each(["asdkjhasd", "qwertyuiop", "aaaaaaaa", "hfhfhfhfhf", "zxcvbnm", "sdfghjkl lkjhgf"])("%s is gibberish", input => {
    expect(isGibberish(input, { known: KNOWN_WORDS })).toBe(true);
    expect(say([input]).last.meta.intent).toBe("gibberish");
  });

  it.each(["Juan Dela Cruz", "50000", "NDA", "hi", "Ma. Clara de los Santos", "₱80,000 per month", "Schwartz"])("%s is not gibberish", input => {
    expect(isGibberish(input, { known: KNOWN_WORDS, lenient: true })).toBe(false);
  });

  it.each(["what's the weather today", "tell me a joke", "write python code for me", "who won the basketball game"])("%s is off-topic", input => {
    const r = say([input]).last;
    expect(r.meta.intent).toBe("off-topic");
    expect(text(r)).toMatch(/only (draft|know)|can't help|outside/i);
  });

  it.each(["should I sign this?", "is this enforceable", "can I sue my landlord", "is this legal", "I need legal advice", "what are my rights"])("%s gets the legal-advice disclaimer", input => {
    const r = say([input]).last;
    expect(r.meta.intent).toBe("legal-advice");
    expect(text(r)).toMatch(/can't give legal advice|needs a lawyer/i);
    expect(text(r)).toMatch(/lawyer/i);
  });

  it.each(["you are stupid", "this is useless", "shut up"])("%s gets a polite redirect", input => {
    const r = say([input]).last;
    expect(r.meta.intent).toBe("rude");
    expect(text(r)).toMatch(/sorry/i);
  });

  it("something it cannot place gets the no-match reply with suggestions", () => {
    const r = say(["blah"]).last;
    expect(r.meta.intent).toBe("no-match");
    expect(r.replies[0]!.chips!.length).toBeGreaterThan(0);
  });

  it("an empty message is a nudge, not an error", () => {
    expect(say([""]).last.meta.intent).toBe("empty");
  });
});

describe("entities", () => {
  it("amounts", () => {
    expect(extractAmounts("a salary of ₱80,000 per month")).toEqual(["₱80,000 per month"]);
    expect(extractAmounts("PHP 1.2 million")).toEqual(["PHP 1.2 million"]);
    expect(extractAmounts("50,000 pesos")).toEqual(["50,000 pesos"]);
    expect(extractAmounts("5% of net sales")[0]).toContain("5%");
  });

  it("dates", () => {
    expect(extractDates("starting March 1, 2027")).toEqual(["March 1, 2027"]);
    expect(extractDates("on 15 June 2027")).toEqual(["15 June 2027"]);
    expect(extractDates("from 2027-03-01")).toEqual(["2027-03-01"]);
    expect(extractDates("today")).toEqual(["today"]);
  });

  it("names, including Filipino-style names", () => {
    expect(extractNames("between Acme and Juan Dela Cruz")).toContain("Juan Dela Cruz");
    expect(extractNames("for Jose Rizal III")).toContain("Jose Rizal III");
    expect(extractNames("with Ma. Clara de los Santos")).toContain("Ma. Clara de los Santos");
    expect(extractNames("as Senior Developer")).toEqual([]);
  });

  it("companies, job titles, terms and 'between'", () => {
    expect(extractCompanies("at Acme Inc. starting Monday")).toEqual(["Acme Inc."]);
    expect(extractCompanies("with Bright Star Trading Corp")).toEqual(["Bright Star Trading Corp"]);
    expect(extractJobTitle("hire Juan as a Senior Developer at Acme")).toBe("Senior Developer");
    expect(extractJobTitle("for the position of HR Officer")).toBe("HR Officer");
    expect(extractTerm("for 2 years")).toBe("2 years");
    expect(extractBetween("an NDA between Acme Inc. and Juan Dela Cruz")).toEqual(["Acme Inc.", "Juan Dela Cruz"]);
  });

  it("fills the chosen document's slots from the first message", () => {
    const r = say(["an offer letter for Juan Dela Cruz as Senior Developer at Acme Inc. starting March 1, 2027 with a salary of ₱80,000 per month"]).last;
    expect(r.state.docId).toBe(OFFER);
    expect(r.state.slots).toMatchObject({
      partyA: "Acme Inc.", partyB: "Juan Dela Cruz", jobTitle: "Senior Developer",
      startDate: "March 1, 2027", amount: "₱80,000 per month",
    });
    // Everything asked for was given: straight to the summary.
    expect(r.state.stage).toBe("confirm");
  });
});

describe("the conversation to a confirmed draft", () => {
  it("asks two or three slot questions, then shows the summary card", () => {
    const { state, all } = say(["I need an NDA", "Acme Inc.", "Juan Dela Cruz", "mutual"]);
    expect(all[0]!.replies[1]!.text).toMatch(/sharing the confidential information/);
    expect(all[1]!.replies[1]!.text).toMatch(/receiving the information/);
    expect(all[2]!.replies[1]!.text).toMatch(/mutual/);
    const card = all[3]!.replies[1]!.card!;
    expect(card.title).toBe("Ready to write “Non-Disclosure Agreement (NDA)”?");
    expect(card.warning).toBe("This conversation will be cleared once I start writing.");
    expect(all[3]!.replies[1]!.chips!.map(c => c.label)).toEqual(["Yes, write it", "Not yet"]);
    expect(state.stage).toBe("confirm");
  });

  it("'skip' leaves a placeholder and moves on", () => {
    const { state } = say(["I need an NDA", "skip", "skip", "skip"]);
    expect(state.skipped).toEqual(["partyA", "partyB", "scope"]);
    expect(state.stage).toBe("confirm");
  });

  it("an answer that does not fit a date is asked again", () => {
    const { last } = say(["remote onboarding form", "Acme Inc.", "Juan Dela Cruz", "whenever"]);
    expect(last.meta.intent).toMatch(/^slot/);
    expect(text(last)).toMatch(/didn't catch that/);
  });

  it("Yes returns the write plan and resets the conversation", () => {
    const { state } = say(["I need an NDA", "Acme Inc.", "Juan Dela Cruz", "mutual"]);
    const yes = act(state, { type: "confirm" });
    expect(yes.write).toMatchObject({ docId: NDA, title: "Non-Disclosure Agreement (NDA)", placement: "replace" });
    expect(yes.write!.slots).toMatchObject({ partyA: "Acme Inc.", partyB: "Juan Dela Cruz", scope: "mutual" });
    expect(yes.state.docId).toBeNull();
    expect(yes.state.stage).toBe("idle");
  });

  it("typed 'yes' on the card confirms too; 'not yet' keeps chatting", () => {
    const { state } = say(["I need an NDA", "skip", "skip", "skip"]);
    expect(respond(state, { text: "yes" }, ctx).write).toBeDefined();
    const no = respond(state, { text: "not yet" }, ctx);
    expect(no.write).toBeUndefined();
    expect(no.meta.intent).toBe("not-yet");
    expect(no.replies[0]!.chips!.map(c => c.label)).toContain("Add a clause");
  });

  it("a page with content is asked 'Add below' or 'Replace everything' first", () => {
    const busy = { ...ctx, documentHasContent: true };
    const { state, last } = say(["I need an NDA", "skip", "skip", "skip"], busy);
    expect(state.stage).toBe("placement");
    expect(last.replies[1]!.chips!.map(c => c.label)).toEqual(["Add below", "Replace everything"]);
    const placed = act(state, { type: "placement", placement: "append" }, busy);
    expect(placed.state.stage).toBe("confirm");
    expect(placed.replies[0]!.card!.lines).toContainEqual({ label: "Placement", value: "Add below the existing content" });
    expect(act(placed.state, { type: "confirm" }, busy).write!.placement).toBe("append");
  });

  it("clauses and tone rules join the plan", () => {
    const { state } = say(["I need an NDA", "skip", "skip", "skip", "add a force majeure clause", "make it formal", "use headings"]);
    expect(state.clauses).toEqual(["force-majeure"]);
    expect(state.rules).toEqual(["formal", "headings"]);
    const plain = respond(state, { text: "plain language" }, ctx).state;
    expect(plain.rules).toEqual(["headings", "plain"]); // formal and plain exclude each other
  });

  it("a clause on its own becomes a clause-only draft", () => {
    const { state, last } = say(["add a data privacy clause"]);
    expect(state.clauseOnly).toEqual(["data-privacy"]);
    expect(last.replies[1]!.card!.title).toBe("Ready to write “Data Privacy clause”?");
  });

  it("the detailed employment offer starter is reachable from a chip", () => {
    const r = act(initialState(), { type: "doc", docId: "starter:employment-offer-letter" });
    expect(r.state.docId).toBe("starter:employment-offer-letter");
    expect(text(r)).toMatch(/job title/i);
  });

  it("start over clears everything", () => {
    const { state } = say(["I need an NDA", "Acme Inc.", "start over"]);
    expect(state.docId).toBeNull();
    expect(state.slots).toEqual({});
  });

  it("a chat is worth keeping only once the person has said something", () => {
    expect(hasUserTurns([{ from: "bot" }])).toBe(false);
    expect(hasUserTurns([{ from: "bot" }, { from: "user" }])).toBe(true);
  });

  it("every document the engine can pick exists", () => {
    for (const m of DOCUMENT_MATCHABLES) expect(findDocument(m.id)).toBeDefined();
  });
});

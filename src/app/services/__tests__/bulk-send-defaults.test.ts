// Request Defaults — field registry, validation, impact preview, and the two
// service methods that commit and undo an override.
//
// Gap Closure Command 3 coverage.
//
// WHAT THESE TESTS PROTECT
//
//   1. The registry in `bulk-send-defaults.ts` and the resolver in
//      `mock/bulk-send.service.ts` must describe the SAME nine fields. If a field
//      is added to `BulkSendRequestDefaults` and not to the registry, the editor
//      silently stops offering it — nothing else in the repository catches that.
//
//   2. An enum value that is not in a field's option list must be reported as
//      unsupported, never coerced to the first option. A `<select>` whose value
//      matches no `<option>` renders the first one, so a coercing formatter would
//      let "open the editor and press Save" change a security setting the user
//      never touched.
//
//   3. Changing a default must never rewrite a recipient row the user edited by
//      hand, and the count of rows that keep their own value must be visible
//      BEFORE Save.
//
//   4. An override is `source: "user"`; restoring re-runs the canonical resolver.
//      A read-only context can do neither.
//
// Everything here is fictional. Recipient values come from the fixture builders.

import { describe, it, expect } from "vitest";

import {
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORY_LABELS,
  DEFAULT_FIELD_DEFINITIONS,
  DEFAULT_IMPACT_LABELS,
  buildChangePreview,
  countRowsWithExplicitOverrides,
  describeSource,
  formatDefaultValue,
  getFieldDefinition,
  isRequestOverride,
  isUnresolvedSource,
  normalizeDefaultValue,
  readDefaultSource,
  readDefaultValue,
  validateDefaultsDraft,
  type DefaultFieldId,
  type DefaultValidationIssue,
} from "../bulk-send-defaults";

import { BULK_SEND_DEFAULT_PRECEDENCE } from "../../models/bulk-send";
import type {
  BulkSendBatch,
  BulkSendDefaultSource,
  BulkSendRequestDefaults,
  BulkSendResolvedValue,
} from "../../models/bulk-send";
import { PREP_AUTH_METHODS } from "../../models/prepare";
import type { PrepAuthMethodId, RoutingMode } from "../../models/prepare";
import { ROUTING_MODE_LABELS } from "../../models/transaction-detail";
import type { LagdaErrorCode, ServiceResult } from "../../models/errors";

import { bulkSendService } from "../mock/bulk-send.service";
import { getTemplateById } from "../mock/templates.service";
import { createTestBulkSendContext } from "../../../test/fixtures";

// ── Fixtures under test ──────────────────────────────────────────────────────
//
// Template and batch IDs that already exist in the demonstration data. Named here
// so a failure message says which fixture disappeared rather than "undefined".

const ENGAGEMENT_TEMPLATE_ID = "tpl-engagement-standard";
/** This Template's routing mode is "approval-based" — see the routing-mode test. */
const VENDOR_TEMPLATE_ID = "tpl-vendor-agreement";
const READY_BATCH_ID = "bsb_ready";
const ARCHIVED_BATCH_ID = "bsb_archived";
const PROJECTED_BATCH_ID = "bsb_partial";

/**
 * A value no LAGDA build has ever supported. Stands in for a Template configured
 * by a future backend, or by a product tier this frontend does not know about.
 * Typed as `string` first because a direct literal cast to the union is a
 * compile error — which is exactly why this class of bug reaches runtime.
 */
const UNSUPPORTED_AUTH: string = "biometric-retina-scan";

// ── Helpers ──────────────────────────────────────────────────────────────────

function expectOk<T>(result: ServiceResult<T>): T {
  if (!result.ok) throw new Error(`expected success, got failure: ${result.code}`);
  return result.data;
}

function expectFail<T>(result: ServiceResult<T>): LagdaErrorCode {
  if (result.ok) throw new Error("expected failure, got success");
  return result.code;
}

function requireDefaults(batch: BulkSendBatch): BulkSendRequestDefaults {
  if (!batch.defaults) throw new Error(`batch ${String(batch.id)} has no resolved defaults`);
  return batch.defaults;
}

function issueWithCode(issues: DefaultValidationIssue[], code: string): DefaultValidationIssue {
  const found = issues.find((i) => i.code === code);
  if (!found) {
    throw new Error(
      `expected an issue with code "${code}", got: ${issues.map((i) => i.code).join(", ") || "no issues"}`,
    );
  }
  return found;
}

function blockingCodes(issues: DefaultValidationIssue[]): string[] {
  return issues.filter((i) => i.severity === "blocking").map((i) => i.code);
}

function draftOf(id: DefaultFieldId, value: unknown): Partial<Record<DefaultFieldId, unknown>> {
  const draft: Partial<Record<DefaultFieldId, unknown>> = {};
  draft[id] = value;
  return draft;
}

function resolvedValue<T>(value: T, source: BulkSendDefaultSource): BulkSendResolvedValue<T> {
  return { value, source, conflict: false, conflictExplanation: null };
}

/** A complete resolved set, shaped exactly like `buildDefaults()` produces. */
function testDefaults(overrides: Partial<BulkSendRequestDefaults> = {}): BulkSendRequestDefaults {
  return {
    requestTitlePattern: resolvedValue("Engagement Letter — {{recipient_name}}", "template"),
    senderMessage: resolvedValue("Please review and sign at your convenience.", "template"),
    routingMode: resolvedValue<RoutingMode>("sequential", "template"),
    authMethod: resolvedValue<PrepAuthMethodId>("email-otp", "template"),
    consentRequired: resolvedValue(true, "product-default"),
    dueDateDirection: resolvedValue<string | null>(null, "product-default"),
    expirationDirection: resolvedValue<string | null>("14 days after the request begins", "template"),
    completionCopyDirection: resolvedValue<string | null>(null, "product-default"),
    verificationDirection: resolvedValue<string | null>(
      "Verification record available after completion", "product-default"),
    ...overrides,
  };
}

async function loadBatch(batchId: string): Promise<BulkSendBatch> {
  return expectOk(await bulkSendService.getBatch(batchId, createTestBulkSendContext()));
}

async function createBatchFromTemplate(templateId: string): Promise<BulkSendBatch> {
  return expectOk(await bulkSendService.createBatch(
    { name: "Request Defaults test batch", templateId }, createTestBulkSendContext()));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. The registry
// ─────────────────────────────────────────────────────────────────────────────

describe("DEFAULT_FIELD_DEFINITIONS", () => {
  it("describes exactly the fields the canonical resolver produces — no more, no fewer", async () => {
    // `buildDefaults()` in the service owns the shape of BulkSendRequestDefaults.
    // If the two ever drift, the editor stops offering a real field (or offers one
    // that cannot be saved). Comparing against a service-produced object, rather
    // than a hand-written list, is what makes this test bite.
    const batch = await createBatchFromTemplate(ENGAGEMENT_TEMPLATE_ID);
    const resolverFields = Object.keys(requireDefaults(batch)).sort();
    const registryFields = DEFAULT_FIELD_DEFINITIONS.map((d) => d.id).sort();

    expect(registryFields).toEqual(resolverFields);
  });

  it("declares each field exactly once", () => {
    const ids = DEFAULT_FIELD_DEFINITIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks every field editable for the request and none at workspace scope", () => {
    // ORGANIZATION_SCOPE_NOTICE tells the user workspace defaults do not exist
    // because WorkspaceSettings has nowhere to store them. Flipping any field to
    // organizationEditable without building that store would make the product lie.
    for (const def of DEFAULT_FIELD_DEFINITIONS) {
      expect(def.requestEditable, `${def.id} should be editable for the request`).toBe(true);
      expect(def.organizationEditable, `${def.id} claims a workspace store that does not exist`).toBe(false);
    }
  });

  it("gives every enum field options and gives non-enum fields none", () => {
    for (const def of DEFAULT_FIELD_DEFINITIONS) {
      if (def.valueType === "enum") {
        expect(def.options ?? [], `${def.id} is an enum with no options`).not.toHaveLength(0);
        const values = (def.options ?? []).map((o) => o.value);
        expect(new Set(values).size, `${def.id} repeats an option value`).toBe(values.length);
        for (const opt of def.options ?? []) {
          expect(opt.label.trim().length, `${def.id}/${opt.value} has no label`).toBeGreaterThan(0);
          // A raw union member must never be shown as though it were a label.
          expect(opt.label).not.toBe(opt.value);
        }
      } else {
        expect(def.options, `${def.id} is not an enum but carries options`).toBeUndefined();
      }
    }
  });

  it("offers every authentication method the canonical union declares", () => {
    // PREP_AUTH_METHODS is the product's list. If a method is added there and not
    // here, a Template using it resolves to a value the editor calls unsupported.
    const registryValues = (getFieldDefinition("authMethod")?.options ?? []).map((o) => o.value).sort();
    const canonicalValues = PREP_AUTH_METHODS.map((m) => String(m.id)).sort();
    expect(registryValues).toEqual(canonicalValues);
  });

  it("never invents a routing option outside the canonical RoutingMode union", () => {
    // Subset, not equality: the registry currently offers 2 of the 4 canonical
    // modes. See the reported defect — this asserts only the half that is
    // unambiguously correct, so it stays true after the gap is closed.
    const canonical = Object.keys(ROUTING_MODE_LABELS);
    for (const opt of getFieldDefinition("routingMode")?.options ?? []) {
      expect(canonical, `routingMode offers "${opt.value}", which is not a RoutingMode`)
        .toContain(opt.value);
    }
  });

  it("gives every free-text field a length limit and a label", () => {
    for (const def of DEFAULT_FIELD_DEFINITIONS) {
      expect(def.label.trim().length, `${def.id} has no label`).toBeGreaterThan(0);
      expect(def.description.trim().length, `${def.id} has no description`).toBeGreaterThan(0);
      if (def.valueType === "text" || def.valueType === "long-text" || def.valueType === "duration-direction") {
        expect(def.maxLength, `${def.id} is free text with no maxLength`).toBeGreaterThan(0);
      }
    }
  });

  it("uses only categories and impact scopes that have user-facing labels", () => {
    for (const def of DEFAULT_FIELD_DEFINITIONS) {
      expect(DEFAULT_CATEGORIES, `${def.id} uses category ${def.category}`).toContain(def.category);
      expect(DEFAULT_CATEGORY_LABELS[def.category]).toBeTruthy();
      expect(DEFAULT_IMPACT_LABELS[def.impact], `${def.id} impact ${def.impact}`).toBeTruthy();
    }
    // Every declared category is actually used — a stale category would render an
    // empty section in the editor.
    for (const category of DEFAULT_CATEGORIES) {
      expect(DEFAULT_FIELD_DEFINITIONS.some((d) => d.category === category), `${category} has no fields`).toBe(true);
    }
  });

  it("only names dependents that are real fields", () => {
    const ids = new Set(DEFAULT_FIELD_DEFINITIONS.map((d) => String(d.id)));
    for (const def of DEFAULT_FIELD_DEFINITIONS) {
      for (const dep of def.dependents ?? []) {
        expect(ids, `${def.id} depends on unknown field ${dep}`).toContain(String(dep));
        expect(String(dep), `${def.id} lists itself as a dependent`).not.toBe(String(def.id));
      }
    }
  });

  it("resolves a field by id and returns undefined for one it does not own", () => {
    expect(getFieldDefinition("authMethod")?.label).toBe("Authentication direction");
    expect(getFieldDefinition("consentRequired")?.valueType).toBe("boolean");
    expect(getFieldDefinition("notARealField" as DefaultFieldId)).toBeUndefined();
  });

  it("treats only 'user' as a request override, matching the canonical precedence head", () => {
    expect(BULK_SEND_DEFAULT_PRECEDENCE[0]).toBe("user");
    expect(isRequestOverride("user")).toBe(true);
    for (const source of BULK_SEND_DEFAULT_PRECEDENCE.filter((s) => s !== "user")) {
      expect(isRequestOverride(source), `${source} must not read as the user's own choice`).toBe(false);
    }
  });

  it("names Policy and Automation as unresolved rather than pretending they ran", () => {
    expect(isUnresolvedSource("workflow-policy")).toBe(true);
    expect(isUnresolvedSource("automation-rule")).toBe(true);
    expect(isUnresolvedSource("template")).toBe(false);
    expect(describeSource("workflow-policy")).toContain("not evaluated");
    expect(describeSource("automation-rule")).toContain("not evaluated");
    expect(describeSource("user")).toBe("Overridden for this request");
    // Every source in the union produces a non-empty sentence.
    for (const source of BULK_SEND_DEFAULT_PRECEDENCE) {
      expect(describeSource(source).trim().length, `${source} has no description`).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. validateDefaultsDraft
// ─────────────────────────────────────────────────────────────────────────────

describe("validateDefaultsDraft", () => {
  it("accepts a complete, internally consistent draft", () => {
    const issues = validateDefaultsDraft({
      requestTitlePattern: "Engagement Letter — {{recipient_name}}",
      senderMessage: "Please review and sign at your convenience.",
      routingMode: "sequential",
      authMethod: "email-otp",
      consentRequired: true,
      dueDateDirection: "Within 5 business days of receipt",
      expirationDirection: "30 days after the request begins",
      completionCopyDirection: "Sender and all participants",
      verificationDirection: "Verification record available after completion",
    });
    expect(issues).toEqual([]);
  });

  it("validates nothing for a field the user did not touch", () => {
    // The editor sends a PARTIAL draft — only the fields that changed. A validator
    // that assumed a full object would reject every partial save.
    expect(validateDefaultsDraft({})).toEqual([]);
    expect(validateDefaultsDraft({ senderMessage: "A short note." })).toEqual([]);
  });

  it("blocks an empty or whitespace-only request title", () => {
    for (const value of ["", "   ", "\t \n "]) {
      const issue = issueWithCode(validateDefaultsDraft({ requestTitlePattern: value }), "defaults-title-required");
      expect(issue.severity).toBe("blocking");
      expect(issue.field).toBe("requestTitlePattern");
      expect(issue.action).toContain("{{recipient_name}}");
    }
  });

  it("blocks text longer than the field's limit and accepts text exactly at it", () => {
    const limit = getFieldDefinition("requestTitlePattern")?.maxLength ?? 0;
    expect(limit).toBeGreaterThan(0);

    expect(validateDefaultsDraft({ requestTitlePattern: "T".repeat(limit) })).toEqual([]);

    const tooLong = issueWithCode(
      validateDefaultsDraft({ requestTitlePattern: "T".repeat(limit + 1) }),
      "defaults-too-long-requestTitlePattern");
    expect(tooLong.severity).toBe("blocking");
    expect(tooLong.message).toContain(String(limit));

    const messageLimit = getFieldDefinition("senderMessage")?.maxLength ?? 0;
    expect(blockingCodes(validateDefaultsDraft({ senderMessage: "M".repeat(messageLimit + 1) })))
      .toContain("defaults-too-long-senderMessage");
  });

  it("blocks an enum value outside the field's option list", () => {
    const issue = issueWithCode(
      validateDefaultsDraft({ authMethod: UNSUPPORTED_AUTH }),
      "defaults-unsupported-authMethod");

    expect(issue.severity).toBe("blocking");
    expect(issue.field).toBe("authMethod");
    expect(issue.message).toContain("does not support");
    expect(issue.action).toContain("listed options");
    // The user-facing text must not echo the internal union member back at them.
    expect(issue.message).not.toContain(UNSUPPORTED_AUTH);
    expect(issue.action).not.toContain(UNSUPPORTED_AUTH);
  });

  it("blocks a routing mode the field does not offer", () => {
    const issue = issueWithCode(
      validateDefaultsDraft({ routingMode: "round-robin" }),
      "defaults-unsupported-routingMode");
    expect(issue.severity).toBe("blocking");
    expect(issue.message).not.toContain("round-robin");
  });

  it("accepts every option it advertises for every enum field", () => {
    // Self-consistency: an option the editor renders must always be savable.
    for (const def of DEFAULT_FIELD_DEFINITIONS.filter((d) => d.valueType === "enum")) {
      for (const opt of def.options ?? []) {
        const issues = validateDefaultsDraft(draftOf(def.id, opt.value));
        expect(blockingCodes(issues), `${def.id} rejects its own option ${opt.value}`).toEqual([]);
      }
    }
  });

  it("never length-checks a boolean field", () => {
    expect(validateDefaultsDraft({ consentRequired: true })).toEqual([]);
    expect(validateDefaultsDraft({ consentRequired: false })).toEqual([]);
  });

  it("warns, without blocking, when a due date has no matching expiration", () => {
    const issues = validateDefaultsDraft({
      dueDateDirection: "Within 5 business days of receipt",
      expirationDirection: "",
    });
    const issue = issueWithCode(issues, "defaults-due-without-expiration");
    expect(issue.severity).toBe("warning");
    expect(blockingCodes(issues)).toEqual([]);
  });

  it("does not warn when due date and expiration are both set, or both cleared", () => {
    expect(validateDefaultsDraft({
      dueDateDirection: "Within 5 business days of receipt",
      expirationDirection: "30 days after the request begins",
    })).toEqual([]);

    // `normalizeDefaultValue` turns an emptied duration field into null, not "".
    expect(validateDefaultsDraft({ dueDateDirection: null, expirationDirection: null })).toEqual([]);
  });

  it("warns when a batch intends neither authentication nor consent", () => {
    const issues = validateDefaultsDraft({ authMethod: "none", consentRequired: false });
    const issue = issueWithCode(issues, "defaults-no-auth-no-consent");
    expect(issue.severity).toBe("warning");
    expect(issue.field).toBe("authMethod");
    // It is a warning, not a refusal: the user may legitimately want this.
    expect(blockingCodes(issues)).toEqual([]);

    expect(validateDefaultsDraft({ authMethod: "none", consentRequired: true })).toEqual([]);
    expect(validateDefaultsDraft({ authMethod: "email-otp", consentRequired: false })).toEqual([]);
  });

  it("returns stable, unique, keyable codes when several things are wrong at once", () => {
    const issues = validateDefaultsDraft({
      requestTitlePattern: "",
      authMethod: UNSUPPORTED_AUTH,
      dueDateDirection: "Within 5 business days of receipt",
      expirationDirection: "",
      consentRequired: false,
    });
    const codes = issues.map((i) => i.code);
    expect(new Set(codes).size, "duplicate codes would collide as React keys").toBe(codes.length);
    expect(codes).toEqual(expect.arrayContaining([
      "defaults-unsupported-authMethod",
      "defaults-title-required",
      "defaults-due-without-expiration",
    ]));
    // Every issue names a field the registry owns and offers a next step.
    const known = new Set(DEFAULT_FIELD_DEFINITIONS.map((d) => String(d.id)));
    for (const issue of issues) {
      expect(known).toContain(String(issue.field));
      expect(issue.action.trim().length).toBeGreaterThan(0);
      expect(issue.message.trim().length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Value formatting and the enum-outside-the-union case
// ─────────────────────────────────────────────────────────────────────────────

describe("formatDefaultValue", () => {
  it("renders booleans and empty values as words, never as raw data", () => {
    const consent = getFieldDefinition("consentRequired");
    const due = getFieldDefinition("dueDateDirection");
    if (!consent || !due) throw new Error("registry is missing a field under test");

    expect(formatDefaultValue(consent, true)).toBe("Required");
    expect(formatDefaultValue(consent, false)).toBe("Not required");
    expect(formatDefaultValue(due, null)).toBe("Not set");
    expect(formatDefaultValue(due, undefined)).toBe("Not set");
    expect(formatDefaultValue(due, "")).toBe("Not set");
  });

  it("renders a supported enum with its label, not its union member", () => {
    const auth = getFieldDefinition("authMethod");
    if (!auth) throw new Error("authMethod is missing from the registry");
    expect(formatDefaultValue(auth, "email-otp")).toBe("Email one-time code");
    expect(formatDefaultValue(auth, "none")).toBe("No additional authentication");
  });

  it("does NOT coerce an unsupported enum value to the first option", () => {
    // This is the whole point. A <select> whose value matches no <option> shows
    // the first one, so if the formatter agreed with it, "open the editor, press
    // Save" would silently downgrade authentication to whatever is listed first.
    const auth = getFieldDefinition("authMethod");
    if (!auth) throw new Error("authMethod is missing from the registry");
    const options = auth.options ?? [];
    const firstOption = options[0];
    if (!firstOption) throw new Error("authMethod has no options");

    const rendered = formatDefaultValue(auth, UNSUPPORTED_AUTH);

    expect(rendered).not.toBe(firstOption.label);
    for (const opt of options) {
      expect(rendered, `unsupported value rendered as the "${opt.value}" option`).not.toBe(opt.label);
    }
    // And the value stays recognisable, so the surrounding UI can append
    // "— not a supported option" to something the user can report.
    expect(rendered.toLowerCase()).toContain("biometric");
  });

  it("detects the unsupported value the same way the editor does", () => {
    // The editor decides to show "— not a supported option" with exactly this
    // predicate. Asserting it here means the registry can never quietly start
    // claiming the value is fine.
    const auth = getFieldDefinition("authMethod");
    if (!auth) throw new Error("authMethod is missing from the registry");
    const isSupported = (value: string) => (auth.options ?? []).some((o) => o.value === value);

    expect(isSupported(UNSUPPORTED_AUTH)).toBe(false);
    expect(isSupported("email-otp")).toBe(true);
    // ...and saving it is blocked, so the "not supported" label cannot be ignored.
    expect(blockingCodes(validateDefaultsDraft({ authMethod: UNSUPPORTED_AUTH })))
      .toContain("defaults-unsupported-authMethod");
  });
});

describe("normalizeDefaultValue", () => {
  it("coerces booleans, collapses control characters, and truncates to the limit", () => {
    const consent = getFieldDefinition("consentRequired");
    const title = getFieldDefinition("requestTitlePattern");
    if (!consent || !title) throw new Error("registry is missing a field under test");

    expect(normalizeDefaultValue(consent, "yes")).toBe(true);
    expect(normalizeDefaultValue(consent, "")).toBe(false);
    expect(normalizeDefaultValue(consent, null)).toBe(false);

    expect(normalizeDefaultValue(title, "  Engagement\tLetter\n\n— {{recipient_name}}  "))
      .toBe("Engagement Letter — {{recipient_name}}");
    expect(String(normalizeDefaultValue(title, "T".repeat(500))))
      .toHaveLength(title.maxLength ?? 0);
  });

  it("clears an emptied duration field to null, not to an empty string", () => {
    // null and "" mean different things in BulkSendRequestDefaults: unset versus
    // set-to-nothing. The change preview compares them, so this must be exact.
    for (const id of ["dueDateDirection", "expirationDirection", "completionCopyDirection"] as const) {
      const def = getFieldDefinition(id);
      if (!def) throw new Error(`${id} is missing from the registry`);
      expect(normalizeDefaultValue(def, "   "), `${id} should clear to null`).toBeNull();
    }
    const verification = getFieldDefinition("verificationDirection");
    if (!verification) throw new Error("verificationDirection is missing from the registry");
    expect(normalizeDefaultValue(verification, "   ")).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. buildChangePreview + countRowsWithExplicitOverrides
// ─────────────────────────────────────────────────────────────────────────────

describe("buildChangePreview", () => {
  it("returns nothing, and does not throw, when the batch has no resolved defaults", async () => {
    // Every batch fixture ships with `defaults: null` — a batch created without a
    // Template has nothing resolved yet. Reading `.value` off null would crash the
    // editor on open, so the guard is load-bearing.
    const batch = await loadBatch(READY_BATCH_ID);
    expect(batch.defaults).toBeNull();

    expect(buildChangePreview(batch, { requestTitlePattern: "Anything at all" })).toEqual([]);
    expect(buildChangePreview(batch, {})).toEqual([]);
  });

  it("lists only the fields whose value actually changes", async () => {
    const batch = await loadBatch(READY_BATCH_ID);
    const withDefaults: BulkSendBatch = { ...batch, defaults: testDefaults() };

    const preview = buildChangePreview(withDefaults, {
      // Same as the resolved value — must not appear.
      routingMode: "sequential",
      // Different — must appear.
      senderMessage: "Please sign before the end of the month.",
      // Untouched fields are absent from the draft entirely.
    });

    expect(preview.map((p) => p.field)).toEqual(["senderMessage"]);
    const change = preview[0];
    if (!change) throw new Error("expected one change");
    expect(change.previousValue).toBe("Please review and sign at your convenience.");
    expect(change.nextValue).toBe("Please sign before the end of the month.");
  });

  it("treats clearing an unset field as no change at all", async () => {
    const batch = await loadBatch(READY_BATCH_ID);
    const withDefaults: BulkSendBatch = { ...batch, defaults: testDefaults() };

    // dueDateDirection resolves to null. Emptying an already-empty box is not an
    // edit, and must not be announced as one.
    expect(buildChangePreview(withDefaults, { dueDateDirection: "" })).toEqual([]);
    expect(buildChangePreview(withDefaults, { dueDateDirection: null })).toEqual([]);
    expect(buildChangePreview(withDefaults, { dueDateDirection: "Within 5 business days" }))
      .toHaveLength(1);
  });

  it("names where the value comes from now and where it will come from after Save", async () => {
    const batch = await loadBatch(READY_BATCH_ID);
    const withDefaults: BulkSendBatch = {
      ...batch,
      defaults: testDefaults({
        authMethod: resolvedValue<PrepAuthMethodId>("email-otp", "template"),
        consentRequired: resolvedValue(true, "product-default"),
      }),
    };

    const preview = buildChangePreview(withDefaults, {
      authMethod: "sms-otp",
      consentRequired: false,
    });

    const auth = preview.find((p) => p.field === "authMethod");
    const consent = preview.find((p) => p.field === "consentRequired");
    if (!auth || !consent) throw new Error("expected both changes in the preview");

    expect(auth.previousSource).toBe("Template");
    expect(auth.nextSource).toBe("Overridden for this request");
    expect(auth.previousValue).toBe("Email one-time code");
    expect(auth.nextValue).toBe("SMS one-time code");

    expect(consent.previousSource).toBe("Product default");
    expect(consent.previousValue).toBe("Required");
    expect(consent.nextValue).toBe("Not required");
  });

  it("carries each field's impact scope with the sentence shown to the user", async () => {
    const batch = await loadBatch(READY_BATCH_ID);
    const withDefaults: BulkSendBatch = { ...batch, defaults: testDefaults() };

    const preview = buildChangePreview(withDefaults, {
      senderMessage: "A different note.",              // existing-and-future
      dueDateDirection: "Within 5 business days",       // future-only
      verificationDirection: "No Verification record",  // preview-only
    });

    expect(preview).toHaveLength(3);
    for (const change of preview) {
      const def = getFieldDefinition(change.field);
      expect(def?.impact).toBe(change.impact);
      expect(change.impactLabel).toBe(DEFAULT_IMPACT_LABELS[change.impact]);
      expect(change.label).toBe(def?.label);
    }
    expect(preview.find((p) => p.field === "dueDateDirection")?.impactLabel)
      .toBe("Applies only to recipients added after this change");
  });

  it("counts rows keeping their own value only for changes that reach existing rows", async () => {
    const ctx = createTestBulkSendContext();
    const batch = await loadBatch(READY_BATCH_ID);
    const firstRow = batch.rows[0];
    if (!firstRow) throw new Error("fixture batch has no rows");

    // A real hand edit through the canonical service, not a hand-built row.
    const edited = expectOk(await bulkSendService.updateRecipientRow(
      String(batch.id), String(firstRow.id),
      { c_eng_org: "Harborline Properties Group" }, ctx));

    const withDefaults: BulkSendBatch = { ...edited, defaults: testDefaults() };
    expect(countRowsWithExplicitOverrides(withDefaults)).toBe(1);

    const preview = buildChangePreview(withDefaults, {
      senderMessage: "A different note.",             // existing-and-future
      completionCopyDirection: "Sender only",          // preview-only
    });

    expect(preview.find((p) => p.field === "senderMessage")?.rowsKeepingOverrides).toBe(1);
    // A direction-only field changes nothing about existing rows, so warning that
    // rows "keep their value" would be noise.
    expect(preview.find((p) => p.field === "completionCopyDirection")?.rowsKeepingOverrides).toBe(0);
  });
});

describe("countRowsWithExplicitOverrides", () => {
  it("counts no rows in a batch nobody has edited", async () => {
    const batch = await loadBatch(READY_BATCH_ID);
    expect(batch.rows.length).toBeGreaterThan(0);
    expect(countRowsWithExplicitOverrides(batch)).toBe(0);
  });

  it("counts a row only once, however many of its cells were changed", async () => {
    const ctx = createTestBulkSendContext();
    const batch = await loadBatch(READY_BATCH_ID);
    const row = batch.rows[0];
    if (!row) throw new Error("fixture batch has no rows");

    const edited = expectOk(await bulkSendService.updateRecipientRow(
      String(batch.id), String(row.id),
      { c_eng_org: "Harborline Properties Group", c_eng_matter: "Lease Portfolio Review 2027" }, ctx));

    expect(countRowsWithExplicitOverrides(edited)).toBe(1);
  });

  it("does not count a row re-entered with the value it already had", async () => {
    const ctx = createTestBulkSendContext();
    const batch = await loadBatch(READY_BATCH_ID);
    const row = batch.rows[0];
    if (!row) throw new Error("fixture batch has no rows");
    const existing = row.values["c_eng_org"];
    expect(existing).toBeTruthy();

    const touched = expectOk(await bulkSendService.updateRecipientRow(
      String(batch.id), String(row.id), { c_eng_org: String(existing) }, ctx));

    expect(countRowsWithExplicitOverrides(touched)).toBe(0);
  });

  it("ignores excluded rows — they are not going to be prepared", async () => {
    const ctx = createTestBulkSendContext();
    const batch = await loadBatch(READY_BATCH_ID);
    const row = batch.rows[0];
    if (!row) throw new Error("fixture batch has no rows");

    const edited = expectOk(await bulkSendService.updateRecipientRow(
      String(batch.id), String(row.id), { c_eng_org: "Harborline Properties Group" }, ctx));
    expect(countRowsWithExplicitOverrides(edited)).toBe(1);

    const excluded = expectOk(await bulkSendService.excludeRows(
      String(batch.id), [String(row.id)], "Excluded during review.", ctx));
    expect(countRowsWithExplicitOverrides(excluded)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. bulkSendService.updateRequestDefaults / restoreRequestDefaults
// ─────────────────────────────────────────────────────────────────────────────

describe("bulkSendService.updateRequestDefaults", () => {
  it("records an override as source 'user' and leaves every other field inherited", async () => {
    const ctx = createTestBulkSendContext();
    const batch = await createBatchFromTemplate(ENGAGEMENT_TEMPLATE_ID);
    const before = requireDefaults(batch);
    expect(readDefaultSource(before, "senderMessage")).toBe("template");

    const updated = expectOk(await bulkSendService.updateRequestDefaults(
      String(batch.id), { senderMessage: "Please review and sign before Friday." }, ctx));
    const after = requireDefaults(updated);

    expect(readDefaultValue(after, "senderMessage")).toBe("Please review and sign before Friday.");
    expect(readDefaultSource(after, "senderMessage")).toBe("user");
    expect(isRequestOverride(readDefaultSource(after, "senderMessage"))).toBe(true);

    // Untouched fields keep the source the resolver gave them.
    expect(readDefaultSource(after, "routingMode")).toBe("template");
    expect(readDefaultSource(after, "consentRequired")).toBe("product-default");
    expect(readDefaultValue(after, "routingMode")).toBe(readDefaultValue(before, "routingMode"));
  });

  it("clears any stale conflict marking on the field it overrides", async () => {
    const ctx = createTestBulkSendContext();
    const batch = await createBatchFromTemplate(ENGAGEMENT_TEMPLATE_ID);

    const updated = expectOk(await bulkSendService.updateRequestDefaults(
      String(batch.id), { authMethod: "sms-otp" }, ctx));

    expect(requireDefaults(updated).authMethod.conflict).toBe(false);
    expect(requireDefaults(updated).authMethod.conflictExplanation).toBeNull();
  });

  it("builds the inherited set first when a batch has no resolved defaults yet", async () => {
    // Fixture batches ship with `defaults: null`. Overriding one field must not
    // leave the other eight undefined.
    const ctx = createTestBulkSendContext();
    const batch = await loadBatch(READY_BATCH_ID);
    expect(batch.defaults).toBeNull();

    const updated = expectOk(await bulkSendService.updateRequestDefaults(
      String(batch.id), { consentRequired: false }, ctx));
    const after = requireDefaults(updated);

    expect(readDefaultValue(after, "consentRequired")).toBe(false);
    expect(readDefaultSource(after, "consentRequired")).toBe("user");
    for (const def of DEFAULT_FIELD_DEFINITIONS) {
      expect(after[def.id], `${def.id} was left unresolved`).toBeDefined();
      expect(readDefaultSource(after, def.id), `${def.id} has no source`).toBeTruthy();
    }
    expect(readDefaultSource(after, "requestTitlePattern")).toBe("template");
  });

  it("ignores a key that is not a request default", async () => {
    const ctx = createTestBulkSendContext();
    const batch = await createBatchFromTemplate(ENGAGEMENT_TEMPLATE_ID);

    const updated = expectOk(await bulkSendService.updateRequestDefaults(
      String(batch.id),
      { senderMessage: "A note.", notAField: "should be dropped" } as Record<string, unknown>,
      ctx));
    const after = requireDefaults(updated) as unknown as Record<string, unknown>;

    expect(after["notAField"]).toBeUndefined();
    expect(Object.keys(after).sort()).toEqual(DEFAULT_FIELD_DEFINITIONS.map((d) => String(d.id)).sort());
  });

  it("does not rewrite recipient rows the user edited by hand", async () => {
    const ctx = createTestBulkSendContext();
    const batch = await loadBatch(READY_BATCH_ID);
    const row = batch.rows[0];
    if (!row) throw new Error("fixture batch has no rows");

    await bulkSendService.updateRecipientRow(
      String(batch.id), String(row.id), { c_eng_org: "Harborline Properties Group" }, ctx);

    const updated = expectOk(await bulkSendService.updateRequestDefaults(
      String(batch.id), { requestTitlePattern: "Renewal — {{recipient_name}}" }, ctx));

    const sameRow = updated.rows.find((r) => String(r.id) === String(row.id));
    expect(sameRow?.values["c_eng_org"]).toBe("Harborline Properties Group");
    expect(countRowsWithExplicitOverrides(updated)).toBe(1);
  });

  it("survives a later revalidation of the batch", async () => {
    // `refresh()` runs on almost every service call. If it rebuilt defaults, an
    // override would vanish the next time anything touched the batch.
    const ctx = createTestBulkSendContext();
    const batch = await createBatchFromTemplate(ENGAGEMENT_TEMPLATE_ID);
    await bulkSendService.updateRequestDefaults(String(batch.id), { authMethod: "id-verification" }, ctx);

    const revalidated = expectOk(await bulkSendService.validateBatchNow(String(batch.id), ctx));
    expect(readDefaultValue(requireDefaults(revalidated), "authMethod")).toBe("id-verification");
    expect(readDefaultSource(requireDefaults(revalidated), "authMethod")).toBe("user");
  });

  it("refuses a read-only context and leaves the stored defaults untouched", async () => {
    const readOnly = createTestBulkSendContext({ canEdit: false });
    const batch = await createBatchFromTemplate(ENGAGEMENT_TEMPLATE_ID);
    const inheritedMessage = readDefaultValue(requireDefaults(batch), "senderMessage");

    expect(await bulkSendService.updateRequestDefaults(
      String(batch.id), { senderMessage: "Should never be stored." }, readOnly)
      .then(expectFail)).toBe("PERMISSION_DENIED");

    const reread = await loadBatch(String(batch.id));
    const after = requireDefaults(reread);
    expect(readDefaultValue(after, "senderMessage")).toBe(inheritedMessage);
    expect(readDefaultSource(after, "senderMessage")).not.toBe("user");
  });

  it("refuses a context where the capability is not in the active profile", async () => {
    const batch = await createBatchFromTemplate(ENGAGEMENT_TEMPLATE_ID);
    const unavailable = createTestBulkSendContext({ capabilityAvailable: false });

    expect(await bulkSendService.updateRequestDefaults(
      String(batch.id), { senderMessage: "No." }, unavailable).then(expectFail))
      .toBe("FEATURE_UNAVAILABLE");
  });

  it("refuses an unknown batch, an archived batch, and a batch with Draft Projections", async () => {
    const ctx = createTestBulkSendContext();

    expect(await bulkSendService.updateRequestDefaults(
      "bsb_does_not_exist", { senderMessage: "No." }, ctx).then(expectFail)).toBe("NOT_FOUND");

    expect(await bulkSendService.updateRequestDefaults(
      ARCHIVED_BATCH_ID, { senderMessage: "No." }, ctx).then(expectFail)).toBe("ARCHIVED");

    // Defaults describe how a request will be prepared. Once projections exist,
    // editing them would describe something that already happened.
    expect(await bulkSendService.updateRequestDefaults(
      PROJECTED_BATCH_ID, { senderMessage: "No." }, ctx).then(expectFail)).toBe("INVALID_STATE");
  });
});

describe("bulkSendService.restoreRequestDefaults", () => {
  it("recomputes a restored field from the Template rather than blanking it", async () => {
    const ctx = createTestBulkSendContext();
    const template = getTemplateById(ENGAGEMENT_TEMPLATE_ID);
    if (!template) throw new Error(`${ENGAGEMENT_TEMPLATE_ID} is missing from the Templates fixtures`);
    const templateMessage = template.settings?.invitationMessage ?? "";
    expect(templateMessage.length).toBeGreaterThan(0);

    const batch = await createBatchFromTemplate(ENGAGEMENT_TEMPLATE_ID);
    const overridden = expectOk(await bulkSendService.updateRequestDefaults(
      String(batch.id),
      { senderMessage: "A temporary note.", authMethod: "sms-otp" },
      ctx));
    expect(readDefaultSource(requireDefaults(overridden), "senderMessage")).toBe("user");

    const restored = expectOk(await bulkSendService.restoreRequestDefaults(
      String(batch.id), ["senderMessage"], ctx));
    const after = requireDefaults(restored);

    // Restored to the Template's own value, with the Template named as the source.
    expect(readDefaultValue(after, "senderMessage")).toBe(templateMessage);
    expect(readDefaultSource(after, "senderMessage")).toBe("template");
    // The override the user did NOT restore is still theirs.
    expect(readDefaultValue(after, "authMethod")).toBe("sms-otp");
    expect(readDefaultSource(after, "authMethod")).toBe("user");
  });

  it("clears every override when asked for 'all'", async () => {
    const ctx = createTestBulkSendContext();
    const batch = await createBatchFromTemplate(ENGAGEMENT_TEMPLATE_ID);
    await bulkSendService.updateRequestDefaults(String(batch.id), {
      senderMessage: "A temporary note.",
      authMethod: "sms-otp",
      consentRequired: false,
      dueDateDirection: "Within 3 business days",
    }, ctx);

    const restored = expectOk(await bulkSendService.restoreRequestDefaults(String(batch.id), "all", ctx));
    const after = requireDefaults(restored);

    for (const def of DEFAULT_FIELD_DEFINITIONS) {
      expect(isRequestOverride(readDefaultSource(after, def.id)), `${def.id} is still overridden`).toBe(false);
    }
    // And the inherited values are back, not merely the sources.
    expect(readDefaultValue(after, "consentRequired")).toBe(true);
    expect(readDefaultValue(after, "dueDateDirection")).toBeNull();
    expect(readDefaultSource(after, "expirationDirection")).toBe("template");
  });

  it("restores a field to the product default when the Template says nothing about it", async () => {
    const ctx = createTestBulkSendContext();
    const batch = await createBatchFromTemplate(ENGAGEMENT_TEMPLATE_ID);
    await bulkSendService.updateRequestDefaults(
      String(batch.id), { verificationDirection: "No Verification record is produced." }, ctx);

    const restored = expectOk(await bulkSendService.restoreRequestDefaults(
      String(batch.id), ["verificationDirection"], ctx));
    const after = requireDefaults(restored);

    expect(readDefaultSource(after, "verificationDirection")).toBe("product-default");
    expect(readDefaultValue(after, "verificationDirection"))
      .toBe("Verification record available after completion");
  });

  it("leaves fields that were never overridden exactly as they were", async () => {
    const ctx = createTestBulkSendContext();
    const batch = await createBatchFromTemplate(ENGAGEMENT_TEMPLATE_ID);
    const before = requireDefaults(batch);

    const restored = expectOk(await bulkSendService.restoreRequestDefaults(
      String(batch.id), ["routingMode"], ctx));
    const after = requireDefaults(restored);

    expect(readDefaultValue(after, "routingMode")).toBe(readDefaultValue(before, "routingMode"));
    expect(readDefaultSource(after, "routingMode")).toBe(readDefaultSource(before, "routingMode"));
  });

  it("refuses a read-only context and leaves the override in place", async () => {
    const ctx = createTestBulkSendContext();
    const readOnly = createTestBulkSendContext({ canEdit: false });
    const batch = await createBatchFromTemplate(ENGAGEMENT_TEMPLATE_ID);
    await bulkSendService.updateRequestDefaults(String(batch.id), { senderMessage: "Mine." }, ctx);

    expect(await bulkSendService.restoreRequestDefaults(String(batch.id), ["senderMessage"], readOnly)
      .then(expectFail)).toBe("PERMISSION_DENIED");
    expect(await bulkSendService.restoreRequestDefaults(String(batch.id), "all", readOnly)
      .then(expectFail)).toBe("PERMISSION_DENIED");

    const reread = await loadBatch(String(batch.id));
    expect(readDefaultValue(requireDefaults(reread), "senderMessage")).toBe("Mine.");
    expect(readDefaultSource(requireDefaults(reread), "senderMessage")).toBe("user");
  });

  it("refuses an unknown batch and an archived batch", async () => {
    const ctx = createTestBulkSendContext();
    expect(await bulkSendService.restoreRequestDefaults("bsb_does_not_exist", "all", ctx)
      .then(expectFail)).toBe("NOT_FOUND");
    expect(await bulkSendService.restoreRequestDefaults(ARCHIVED_BATCH_ID, "all", ctx)
      .then(expectFail)).toBe("ARCHIVED");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. End-to-end: a Template value the editor does not offer
// ─────────────────────────────────────────────────────────────────────────────

describe("a resolved default the option list does not contain", () => {
  it("is inherited from the Template rather than replaced", async () => {
    // tpl-vendor-agreement routes "approval-based". The resolver keeps it; nothing
    // in the defaults pipeline may quietly rewrite a Template's own configuration.
    const batch = await createBatchFromTemplate(VENDOR_TEMPLATE_ID);
    const defaults = requireDefaults(batch);

    expect(readDefaultValue(defaults, "routingMode")).toBe("approval-based");
    expect(readDefaultSource(defaults, "routingMode")).toBe("template");
  });

  it("is never displayed as one of the options the editor does offer", async () => {
    const batch = await createBatchFromTemplate(VENDOR_TEMPLATE_ID);
    const def = getFieldDefinition("routingMode");
    if (!def) throw new Error("routingMode is missing from the registry");

    const rendered = formatDefaultValue(def, readDefaultValue(requireDefaults(batch), "routingMode"));
    for (const opt of def.options ?? []) {
      expect(rendered, `an inherited mode was rendered as the "${opt.value}" option`).not.toBe(opt.label);
    }
  });

  it("is shown as the current value in the change preview, not as the first option", async () => {
    const batch = await loadBatch(READY_BATCH_ID);
    const withUnsupported: BulkSendBatch = {
      ...batch,
      defaults: testDefaults({
        // A Template configured by a system this frontend does not know about.
        authMethod: resolvedValue(UNSUPPORTED_AUTH as PrepAuthMethodId, "template"),
      }),
    };

    const preview = buildChangePreview(withUnsupported, { authMethod: "email-otp" });
    expect(preview).toHaveLength(1);
    const change = preview[0];
    if (!change) throw new Error("expected one change");

    const options = getFieldDefinition("authMethod")?.options ?? [];
    const firstOption = options[0];
    if (!firstOption) throw new Error("authMethod has no options");

    // The user is told what they are actually replacing.
    expect(change.previousValue).not.toBe(firstOption.label);
    expect(change.previousValue.toLowerCase()).toContain("biometric");
    expect(change.nextValue).toBe("Email one-time code");
    expect(change.previousSource).toBe("Template");
  });
});

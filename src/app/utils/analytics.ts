// No-op analytics abstraction for the LAGDA frontend.
// Provides typed event definitions with no live tracking endpoint.
// Replace the adapter at integration time with a real analytics SDK.
// NEVER include: personal data, document names, field values, signatures,
// recipient emails, transaction titles, or route IDs containing private data.

import { APP_CONFIG } from "../config/app.config";
import { log } from "./logger";

// ── Event catalog ─────────────────────────────────────────────────────────────

export type LagdaAnalyticsEvent =
  | { name: "public_cta_selected";      params: { cta: string; page: string } }
  | { name: "sign_in_started";          params: Record<string, never> }
  | { name: "account_creation_started"; params: Record<string, never> }
  | { name: "onboarding_step_viewed";   params: { step: string } }
  | { name: "prepare_flow_started";     params: { source: "dashboard" | "template" | "resume" } }
  | { name: "field_editor_opened";      params: Record<string, never> }
  | { name: "template_used";            params: Record<string, never> }
  | { name: "verification_initiated";   params: { context: "public" | "authenticated" } }
  | { name: "settings_section_viewed";  params: { section: string } }
  | { name: "workspace_switched";       params: Record<string, never> }
  | { name: "sign_out";                 params: Record<string, never> };

// ── Adapter interface ─────────────────────────────────────────────────────────

interface AnalyticsAdapter {
  track(event: LagdaAnalyticsEvent): void;
}

// ── No-op adapter (active) ───────────────────────────────────────────────────

const noOpAdapter: AnalyticsAdapter = {
  track(event) {
    if (APP_CONFIG.analytics.enabled) {
      log.debug("[analytics] track", { name: event.name });
    }
  },
};

// ── Public API ────────────────────────────────────────────────────────────────

let adapter: AnalyticsAdapter = noOpAdapter;

export function setAnalyticsAdapter(a: AnalyticsAdapter): void {
  adapter = a;
}

export function track(event: LagdaAnalyticsEvent): void {
  adapter.track(event);
}

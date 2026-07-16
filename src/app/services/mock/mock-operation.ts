// Reusable helper for deterministic mock operations.
// Provides: configurable latency, cancellation, stale-request prevention, scenario control.
// Replace mock adapters with real API adapters at integration time without changing consumers.

import { APP_CONFIG } from "../../config/app.config";
import { log } from "../../utils/logger";
import type { LagdaErrorCode } from "../../models/errors";
import { fail } from "../../models/errors";
import type { ServiceResult } from "../../models/errors";

// ── Cancellation token ────────────────────────────────────────────────────────

export class OperationToken {
  private _cancelled = false;
  get cancelled() { return this._cancelled; }
  cancel() { this._cancelled = true; }
}

export const NO_OP_TOKEN = new OperationToken();

// ── Stale-request guard ───────────────────────────────────────────────────────
// Prevents a slow mock from updating a different route's state after navigation.

export class OperationScope {
  private _id: number;

  constructor() {
    this._id = Date.now();
  }

  begin(): number {
    this._id = Date.now();
    return this._id;
  }

  isCurrent(id: number): boolean {
    return this._id === id;
  }
}

// ── Core mock operation ───────────────────────────────────────────────────────

export interface MockOperationOptions {
  latency?: number;
  token?: OperationToken;
  operationName?: string;
}

export async function mockDelay(ms?: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms ?? APP_CONFIG.mockDelayMs));
}

export async function mockOp<T>(
  fn: () => T | Promise<T>,
  options: MockOperationOptions = {},
): Promise<ServiceResult<T>> {
  const { latency, token = NO_OP_TOKEN, operationName = "mock-op" } = options;

  log.debug(`[${operationName}] starting`);
  await mockDelay(latency);

  if (token.cancelled) {
    log.debug(`[${operationName}] cancelled`);
    return fail("CANCELLED");
  }

  try {
    const data = await fn();
    log.debug(`[${operationName}] success`);
    return { ok: true, data };
  } catch (e) {
    log.warn(`[${operationName}] error`, { code: (e as { code?: string }).code });
    const code: LagdaErrorCode =
      e instanceof MockServiceError ? e.code : "UNKNOWN";
    return fail(code);
  }
}

// ── Typed service error ───────────────────────────────────────────────────────

export class MockServiceError extends Error {
  constructor(public readonly code: LagdaErrorCode) {
    super(code);
    this.name = "MockServiceError";
  }
}

export function throwMock(code: LagdaErrorCode): never {
  throw new MockServiceError(code);
}

// ── Scenario-based result ─────────────────────────────────────────────────────

export type MockScenario = "success" | "not-found" | "permission-denied" | "validation-error" | "unavailable";

export interface ScenarioOptions extends MockOperationOptions {
  scenario?: MockScenario;
}

export async function mockScenarioOp<T>(
  fn: () => T | Promise<T>,
  options: ScenarioOptions = {},
): Promise<ServiceResult<T>> {
  const { scenario = "success", ...rest } = options;

  if (scenario === "not-found")        return fail("NOT_FOUND");
  if (scenario === "permission-denied") return fail("PERMISSION_DENIED");
  if (scenario === "validation-error")  return fail("INVALID_INPUT");
  if (scenario === "unavailable")       return fail("DEMO_SERVICE_UNAVAILABLE");

  return mockOp(fn, rest);
}

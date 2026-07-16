// Typed error taxonomy for the LAGDA frontend service layer.
// All codes map to safe user-facing messages. Technical detail stays in development logs only.
// Future API adapters should map backend error codes to these frontend codes.

// ── Error codes ───────────────────────────────────────────────────────────────

export type LagdaErrorCode =
  // General
  | "UNKNOWN"
  | "CANCELLED"
  | "STALE_REQUEST"
  | "DEMO_SERVICE_UNAVAILABLE"

  // Authentication
  | "AUTH_REQUIRED"
  | "SESSION_EXPIRED"
  | "INVALID_CREDENTIALS_DEMONSTRATION"
  | "MFA_REQUIRED"
  | "MFA_FAILED_DEMONSTRATION"

  // Authorization
  | "PERMISSION_DENIED"
  | "WORKSPACE_RESTRICTED"
  | "FEATURE_UNAVAILABLE"
  | "PLAN_RESTRICTED"

  // Resource
  | "NOT_FOUND"
  | "INVALID_ID"
  | "CONFLICT"
  | "ARCHIVED"
  | "RESOURCE_UNAVAILABLE"

  // Validation
  | "INVALID_INPUT"
  | "REQUIRED_FIELD"
  | "INVALID_STATE"
  | "INCOMPATIBLE_CONFIGURATION"

  // Document
  | "DOCUMENT_UNAVAILABLE"
  | "PARTICIPANT_CONFLICT"
  | "ROUTING_CONFLICT"
  | "FIELD_CONFIGURATION_INVALID"

  // Recipient
  | "REQUEST_EXPIRED"
  | "REQUEST_CANCELLED"
  | "REQUEST_VOIDED"
  | "REQUEST_ALREADY_ACTIONED"
  | "ROUTING_LOCKED"

  // Settings
  | "SECURITY_OPERATION_SIMULATION_FAILED"
  | "BILLING_UNAVAILABLE"
  | "INTEGRATION_UNAVAILABLE";

// ── Safe user-facing messages per code ───────────────────────────────────────

export const ERROR_MESSAGES: Record<LagdaErrorCode, string> = {
  UNKNOWN:                           "Something went wrong. Please try again.",
  CANCELLED:                         "The request was cancelled.",
  STALE_REQUEST:                     "This request is no longer current. Please refresh.",
  DEMO_SERVICE_UNAVAILABLE:          "This demonstration service is temporarily unavailable.",
  AUTH_REQUIRED:                     "Please sign in to continue.",
  SESSION_EXPIRED:                   "Your session has expired. Please sign in again.",
  INVALID_CREDENTIALS_DEMONSTRATION: "Incorrect email or password. (Demonstration only — no real credentials are checked.)",
  MFA_REQUIRED:                      "A verification code is required to continue.",
  MFA_FAILED_DEMONSTRATION:          "Verification code was not accepted. (Demonstration only.)",
  PERMISSION_DENIED:                 "You do not have permission to perform this action.",
  WORKSPACE_RESTRICTED:              "This Workspace is restricted. Contact your administrator.",
  FEATURE_UNAVAILABLE:               "This feature is not available in the current context.",
  PLAN_RESTRICTED:                   "This feature requires a different plan.",
  NOT_FOUND:                         "The requested item could not be found.",
  INVALID_ID:                        "The provided identifier is not valid.",
  CONFLICT:                          "This action conflicts with an existing record.",
  ARCHIVED:                          "This item has been archived and cannot be modified.",
  RESOURCE_UNAVAILABLE:              "This resource is currently unavailable.",
  INVALID_INPUT:                     "One or more fields contain invalid values.",
  REQUIRED_FIELD:                    "This field is required.",
  INVALID_STATE:                     "This action is not available in the current state.",
  INCOMPATIBLE_CONFIGURATION:        "The current configuration is incompatible with this action.",
  DOCUMENT_UNAVAILABLE:              "This document is not available.",
  PARTICIPANT_CONFLICT:              "A conflict was detected in the participant configuration.",
  ROUTING_CONFLICT:                  "The routing configuration contains a conflict.",
  FIELD_CONFIGURATION_INVALID:       "One or more field configurations are invalid.",
  REQUEST_EXPIRED:                   "This signing request has expired.",
  REQUEST_CANCELLED:                 "This signing request has been cancelled.",
  REQUEST_VOIDED:                    "This signing request has been voided.",
  REQUEST_ALREADY_ACTIONED:          "This signing request has already been completed.",
  ROUTING_LOCKED:                    "Action is not available — waiting for a prior participant.",
  SECURITY_OPERATION_SIMULATION_FAILED: "This security operation could not be demonstrated.",
  BILLING_UNAVAILABLE:               "Billing information is not available at this time.",
  INTEGRATION_UNAVAILABLE:           "This integration is not available for configuration.",
};

// ── Service result contracts ──────────────────────────────────────────────────

export interface ServiceSuccess<T> {
  ok: true;
  data: T;
}

export interface ServiceFailure {
  ok: false;
  code: LagdaErrorCode;
  message: string;
  field?: string;
}

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  hasNextPage: boolean;
}

export interface ServiceSuccessPaginated<T> {
  ok: true;
  data: PaginatedResult<T>;
}

export type PaginatedServiceResult<T> = ServiceSuccessPaginated<T> | ServiceFailure;

// ── Helpers ───────────────────────────────────────────────────────────────────

export function ok<T>(data: T): ServiceSuccess<T> {
  return { ok: true, data };
}

export function fail(code: LagdaErrorCode, field?: string): ServiceFailure {
  return { ok: false, code, message: ERROR_MESSAGES[code], field };
}

export function isFail<T>(result: ServiceResult<T>): result is ServiceFailure {
  return !result.ok;
}

export function isOk<T>(result: ServiceResult<T>): result is ServiceSuccess<T> {
  return result.ok;
}

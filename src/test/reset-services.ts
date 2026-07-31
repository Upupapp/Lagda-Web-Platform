// Centralized mock-service reset (Gap Closure Command 6).
//
// Every mock service in this repository holds module-level mutable state that
// survives across tests in the same file. This is the ONE place that knows how to
// return all of them to their fixture baseline.
//
// It reuses each service's own canonical reset — the same method
// `PlatformContext.signOut()` calls in production. It does not reach into private
// module state, so a service that changes how it resets stays correct here
// automatically.
//
// When a new mock service with mutable state is added, register it below. A test
// that mysteriously depends on execution order is almost always a missing entry.

import { bulkSendService } from "../app/services/mock/bulk-send.service";
import { mockContactService } from "../app/services/mock/contacts.service";
import { documentCollaborationService } from "../app/services/mock/document-collaboration.service";
import { documentOrganizationService } from "../app/services/mock/document-organization.service";
import { globalSearchService } from "../app/services/mock/global-search.service";
import { notificationCenterService } from "../app/services/mock/notification-center.service";
import { signingWorkflowService } from "../app/services/mock/signing-workflow.service";
import { workflowAutomationService } from "../app/services/mock/workflow-automation.service";
import { reportingService } from "../app/services/mock/reporting.service";

/**
 * Returns every mutable mock service to its fixture baseline.
 *
 * Called from `afterEach` in `src/test/setup.ts`, so individual tests do not need
 * to call it. Call it directly only when a single test needs a clean slate
 * mid-way through.
 */
export function resetAllTestServices(): void {
  bulkSendService.resetBulkSendDemonstration();
  bulkSendService.setScenario("standard");
  mockContactService.clearSessionState();
  documentCollaborationService.resetCollaborationDemonstration();
  documentOrganizationService.resetDocumentOrganizationDemonstration();
  globalSearchService.resetGlobalSearchDemonstration();
  notificationCenterService.clearSessionState();
  signingWorkflowService.resetSigningWorkflowDemonstration();
  workflowAutomationService.resetWorkflowAutomationDemonstration();
  reportingService.resetDemonstration();
}

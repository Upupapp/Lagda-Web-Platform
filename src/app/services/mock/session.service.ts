// Mock implementation of AuthService.
// Returns a simulated authenticated session with fictional data.
// Replace with RealAuthService at integration time — no consumer changes required.

import type { AuthService, SignInPayload, RegisterPayload } from "../interfaces";
import type { MockSession } from "../../models";
import { EMPTY_SESSION } from "../../models";
import { delay } from "./delay";

const MOCK_SESSION: MockSession = {
  isAuthenticated: false,
  user: null,
  workspace: null,
  subscription: null,
};

const MOCK_AUTHENTICATED_SESSION: MockSession = {
  isAuthenticated: true,
  user: {
    id: "usr_northbridge_001",
    email: "alex.santos@northbridgelegal.ph",
    displayName: "Alex Santos",
    role: "owner",
    workspaceId: "ws_northbridge_001",
  },
  workspace: {
    id: "ws_northbridge_001",
    name: "Northbridge Legal",
    slug: "northbridge-legal",
    plan: "business",
  },
  subscription: {
    plan: "business",
    cycle: "annual",
    status: "active",
    currentPeriodEnd: "2026-12-31",
    sendingRequestsUsed: 47,
    sendingRequestsLimit: 500,
    storageUsedBytes: 2_147_483_648,
    storageLimitBytes: 10_737_418_240,
  },
};

class MockAuthService implements AuthService {
  private session: MockSession = { ...MOCK_SESSION };

  async signIn(_payload: SignInPayload) {
    await delay();
    this.session = { ...MOCK_AUTHENTICATED_SESSION };
    return { success: true as const, data: this.session };
  }

  async register(_payload: RegisterPayload) {
    await delay();
    this.session = { ...MOCK_AUTHENTICATED_SESSION };
    return { success: true as const, data: this.session };
  }

  async signOut() {
    await delay(150);
    this.session = { ...EMPTY_SESSION };
  }

  getSession(): MockSession {
    return this.session;
  }
}

// Singleton instance — replace with dependency injection or context at scale
export const mockAuthService: AuthService = new MockAuthService();

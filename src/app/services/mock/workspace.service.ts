import type { WorkspaceService } from "../interfaces";
import type { WorkspaceSummary } from "../../models";
import { MOCK_WORKSPACES } from "../../data/mock/workspaces";
import { delay } from "./delay";

class MockWorkspaceService implements WorkspaceService {
  async list() {
    await delay(200);
    const data: WorkspaceSummary[] = MOCK_WORKSPACES.map(({ id, name, slug, logoUrl, plan }) => ({
      id, name, slug, logoUrl, plan,
    }));
    return { success: true as const, data };
  }

  async get(id: string) {
    await delay(150);
    const ws = MOCK_WORKSPACES.find((w) => w.id === id);
    if (!ws) return { success: false as const, error: { code: "not_found", message: "Workspace not found." } };
    const data: WorkspaceSummary = { id: ws.id, name: ws.name, slug: ws.slug, logoUrl: ws.logoUrl, plan: ws.plan };
    return { success: true as const, data };
  }
}

export const mockWorkspaceService: WorkspaceService = new MockWorkspaceService();

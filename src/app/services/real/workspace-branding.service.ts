// Real workspace branding (082) — Lagda-Backend's
//   GET/PATCH /workspaces/:wid/branding
//   PUT/DELETE /workspaces/:wid/branding/logo   (base64 PNG, no data: prefix)
//   POST /workspaces/:wid/branding/reset
//   GET /workspaces/:wid/branding/logo?v=<version>   (the PNG itself)
//
// Any member reads; owners and administrators change (`canEdit`). The display
// name IS the workspace name, so saving it renames the workspace.

import { apiRequest } from "../api-client";
import { API_BASE_URL } from "../backend-flag";

export interface RealWorkspaceBranding {
  displayName: string;
  senderDisplayName: string | null;
  footerTagline: string | null;
  primaryColor: string | null;
  logo: { version: string; width: number; height: number } | null;
  updatedAt: number | null;
  canEdit: boolean;
}

export interface WorkspaceBrandingUpdate {
  displayName?: string;
  senderDisplayName?: string | null;
  footerTagline?: string | null;
  primaryColor?: string | null;
}

const base = (workspaceId: string) => `/workspaces/${encodeURIComponent(workspaceId)}/branding`;

/** A versioned URL, so the browser can keep the image until it changes. */
export function workspaceLogoUrl(workspaceId: string, version: string): string {
  return `${API_BASE_URL}${base(workspaceId)}/logo?v=${encodeURIComponent(version)}`;
}

export const realWorkspaceBrandingService = {
  get(workspaceId: string): Promise<RealWorkspaceBranding> {
    return apiRequest<RealWorkspaceBranding>(base(workspaceId));
  },
  update(workspaceId: string, update: WorkspaceBrandingUpdate): Promise<RealWorkspaceBranding> {
    return apiRequest<RealWorkspaceBranding>(base(workspaceId), { method: "PATCH", body: update });
  },
  uploadLogo(workspaceId: string, pngBase64: string): Promise<RealWorkspaceBranding> {
    return apiRequest<RealWorkspaceBranding>(`${base(workspaceId)}/logo`, { method: "PUT", body: { image: pngBase64 } });
  },
  removeLogo(workspaceId: string): Promise<RealWorkspaceBranding> {
    return apiRequest<RealWorkspaceBranding>(`${base(workspaceId)}/logo`, { method: "DELETE" });
  },
  reset(workspaceId: string): Promise<RealWorkspaceBranding> {
    return apiRequest<RealWorkspaceBranding>(`${base(workspaceId)}/reset`, { method: "POST" });
  },
};

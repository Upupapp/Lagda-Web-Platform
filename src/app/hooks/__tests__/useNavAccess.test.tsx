import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const platform = { hasPermission: vi.fn<(p: string) => boolean>() };
const access = { can: vi.fn<(c: string) => boolean>() };
vi.mock("../../context/PlatformContext", () => ({ usePlatform: () => platform }));
vi.mock("../useWorkspaceAccess", () => ({ useWorkspaceAccess: () => access }));

import { useNavAccess } from "../useCanPrepare";

const contacts = { id: "contacts", permission: "manage_contacts" as const };
const workspace = { id: "workspace", permission: "manage_workspace" as const };

describe("what the menu shows", () => {
  beforeEach(() => { platform.hasPermission.mockReset(); access.can.mockReset(); });

  it("a Reviewer granted assign-signers gets Prepare and Contacts, though the role alone has neither", () => {
    platform.hasPermission.mockReturnValue(false);
    access.can.mockImplementation(c => c === "signing-request.create" || c === "contact.view");
    const { result } = renderHook(() => useNavAccess());
    expect(result.current.canPrepare).toBe(true);
    expect(result.current.allows(contacts)).toBe(true);
  });

  it("a capability never opens an entry it does not belong to", () => {
    platform.hasPermission.mockReturnValue(false);
    access.can.mockReturnValue(true);
    const { result } = renderHook(() => useNavAccess());
    expect(result.current.allows(workspace)).toBe(false);
  });

  it("the role still decides when it says yes, and an entry with no permission is always shown", () => {
    platform.hasPermission.mockReturnValue(true);
    access.can.mockReturnValue(false);
    const { result } = renderHook(() => useNavAccess());
    expect(result.current.allows(contacts)).toBe(true);
    expect(result.current.allows({ id: "home" })).toBe(true);
  });

  it("with neither, Prepare and Contacts stay off", () => {
    platform.hasPermission.mockReturnValue(false);
    access.can.mockReturnValue(false);
    const { result } = renderHook(() => useNavAccess());
    expect(result.current.canPrepare).toBe(false);
    expect(result.current.allows(contacts)).toBe(false);
  });
});

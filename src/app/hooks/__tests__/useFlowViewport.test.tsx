/* eslint-disable testing-library/no-node-access -- Metadata is in document.head, outside the accessible body. */
import { afterEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFlowViewport } from "../useFlowViewport";

afterEach(() => { document.querySelector('meta[name="viewport"]')?.remove(); });
describe("task-flow viewport ownership", () => {
  it("enables safe-area and keyboard layout while preserving the existing zoom directives", () => {
    const meta = document.createElement("meta"); meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1, maximum-scale=5";
    document.head.append(meta);
    const { unmount } = renderHook(useFlowViewport);
    expect(meta.content).toContain("viewport-fit=cover");
    expect(meta.content).toContain("interactive-widget=resizes-content");
    expect(meta.content).toContain("maximum-scale=5");
    expect(meta.content).not.toContain("user-scalable=no");
    unmount();
    expect(meta.content).toBe("width=device-width, initial-scale=1, maximum-scale=5");
  });
  it("matches the light flow header and restores the previous browser theme color", () => {
    const theme = document.createElement("meta"); theme.name = "theme-color"; theme.content = "#07111F";
    document.head.append(theme);
    const { unmount } = renderHook(useFlowViewport);
    expect(theme.content).toBe("#FFFFFF");
    unmount();
    expect(theme.content).toBe("#07111F");
    theme.remove();
  });
  it("removes only its own tag if there was no viewport meta", () => {
    const { unmount } = renderHook(useFlowViewport);
    expect(document.querySelector('meta[name="viewport"]')).not.toBeNull();
    unmount();
    expect(document.querySelector('meta[name="viewport"]')).toBeNull();
  });
  it("does not undo a later viewport owner's settings", () => {
    const { unmount } = renderHook(useFlowViewport);
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')!;
    meta.content = "width=device-width, initial-scale=2";
    unmount();
    expect(meta.content).toBe("width=device-width, initial-scale=2");
  });
});

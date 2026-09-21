import { describe, it, expect } from "vitest";
import {
  isPaletteShortcut, isSearchFocusShortcut, isTypingTarget,
} from "../keyboard-shortcuts";

const key = (init: KeyboardEventInit, target?: EventTarget) => {
  const event = new KeyboardEvent("keydown", init);
  if (target) Object.defineProperty(event, "target", { value: target });
  return event;
};

describe("the command palette shortcut", () => {
  it("accepts Ctrl+K and ⌘K", () => {
    expect(isPaletteShortcut(key({ key: "k", ctrlKey: true }))).toBe(true);
    expect(isPaletteShortcut(key({ key: "k", metaKey: true }))).toBe(true);
  });

  it("still works with Caps Lock on", () => {
    // The bug: the key arrives as "K" and the old strict comparison ignored it.
    expect(isPaletteShortcut(key({ key: "K", ctrlKey: true }))).toBe(true);
  });

  it("ignores K alone, and chords that merely include K", () => {
    expect(isPaletteShortcut(key({ key: "k" }))).toBe(false);
    expect(isPaletteShortcut(key({ key: "K", ctrlKey: true, shiftKey: true }))).toBe(false);
    expect(isPaletteShortcut(key({ key: "k", ctrlKey: true, altKey: true }))).toBe(false);
  });
});

describe("the search focus shortcut", () => {
  it("is / pressed outside a field", () => {
    expect(isSearchFocusShortcut(key({ key: "/" }, document.body))).toBe(true);
  });

  it("never steals / from someone typing", () => {
    for (const tag of ["input", "textarea", "select"]) {
      expect(isSearchFocusShortcut(key({ key: "/" }, document.createElement(tag)))).toBe(false);
    }
  });

  it("treats contenteditable as typing", () => {
    const div = document.createElement("div");
    Object.defineProperty(div, "isContentEditable", { value: true });
    expect(isTypingTarget(div)).toBe(true);
  });

  it("ignores / with a modifier", () => {
    expect(isSearchFocusShortcut(key({ key: "/", ctrlKey: true }, document.body))).toBe(false);
  });
});

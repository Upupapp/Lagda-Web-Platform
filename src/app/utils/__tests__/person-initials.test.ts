import { describe, expect, it } from "vitest";
import { personInitials } from "../person-initials";
describe("personInitials", () => {
  it.each([["👩🏽‍💻 Priya", "👩🏽‍💻P"], ["🦊 Fox", "🦊F"], ["Đặng Thị Ngọc Hân", "ĐH"], ["王秀英", "王"], ["  Sam   Lee ", "SL"], ["Jo", "J"], ["", "?"], ["Ana Montgomery III", "AM"]])("preserves complete initials for %s", (name, expected) => { expect(personInitials(name)).toBe(expected); });
});

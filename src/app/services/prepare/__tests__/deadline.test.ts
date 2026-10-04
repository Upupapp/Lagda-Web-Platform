// The deadline a sender picks is a DATE; the server keeps an instant. These
// pin the conversion: the end of that day in Manila, whatever zone the
// browser is in.

import { describe, it, expect } from "vitest";
import { deadlineFromDate, dateOfDeadline, todayInManila, formatDeadline } from "../deadline";

describe("deadlineFromDate", () => {
  it("is the last second of the chosen day in Manila", () => {
    // 23:59:59 at UTC+8 is 15:59:59 UTC the same day.
    expect(deadlineFromDate("2026-10-20")).toBe("2026-10-20T15:59:59.000Z");
  });

  it("refuses anything that is not a calendar date", () => {
    for (const bad of ["", "20/10/2026", "2026-10-20T00:00", "2026-13-45", null, undefined]) {
      expect(deadlineFromDate(bad), String(bad)).toBeNull();
    }
  });
});

describe("dateOfDeadline", () => {
  it("reads the Manila date back out of the instant", () => {
    expect(dateOfDeadline("2026-10-20T15:59:59.000Z")).toBe("2026-10-20");
    // 17:00 UTC is already the next day in Manila.
    expect(dateOfDeadline("2026-10-20T17:00:00.000Z")).toBe("2026-10-21");
  });

  it("round-trips with deadlineFromDate", () => {
    expect(dateOfDeadline(deadlineFromDate("2026-12-31"))).toBe("2026-12-31");
  });

  it("is empty for no deadline", () => {
    expect(dateOfDeadline(null)).toBe("");
    expect(dateOfDeadline("not a date")).toBe("");
  });
});

describe("todayInManila", () => {
  it("is the Manila calendar day, not the UTC one", () => {
    expect(todayInManila(Date.parse("2026-10-03T15:30:00.000Z"))).toBe("2026-10-03");
    expect(todayInManila(Date.parse("2026-10-03T16:30:00.000Z"))).toBe("2026-10-04");
  });
});

describe("formatDeadline", () => {
  it("names the Manila day", () => {
    expect(formatDeadline("2026-10-20T15:59:59.000Z")).toBe("October 20, 2026");
  });
});

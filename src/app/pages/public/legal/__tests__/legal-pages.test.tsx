// The legal pages read as finished text: no bracketed blanks, no character
// codes shown raw, a version and date at the top, and every contents entry
// pointing at a section that exists.
//
// "&rsquo;" inside a JS string is not decoded the way it is in JSX text, so a
// table cell built from a string showed the code itself. This renders both
// pages and reads what a visitor would.

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Privacy } from "../Privacy";
import { Terms } from "../Terms";

const PAGES = [
  // 1.3: the connection check from public lists on LAGDA's own servers; proxycheck.io no longer receives addresses (23 Oct 2026).
  { name: "Privacy Policy", Page: Privacy, sections: 14, version: "1.3", date: "23 October 2026" },
  { name: "Terms of Service", Page: Terms, sections: 20, version: "1.0", date: "5 October 2026" },
] as const;

describe.each(PAGES)("$name", ({ name, Page, sections, version, date }) => {
  function open() {
    const view = render(<MemoryRouter><Page /></MemoryRouter>);
    // What a visitor reads: the page's own <style> text is not part of it.
    const readable = view.container.cloneNode(true) as HTMLElement;
    readable.querySelectorAll("style").forEach(node => { node.remove(); });
    return { root: view.container, text: readable.textContent ?? "" };
  }

  it("shows no raw character codes and no bracketed blanks", () => {
    const { text } = open();
    expect(text.match(/&[a-z]+;/g) ?? []).toEqual([]);
    expect(text.match(/\[[^\]]{8,}\]/g) ?? []).toEqual([]);
    expect(text).not.toMatch(/pending legal review before publication/i);
  });

  it("carries its title, version and date, and no review notice", () => {
    const { root, text } = open();
    expect(root.querySelector("h1")?.textContent).toBe(name);
    expect(text).toContain(`Version ${version}`);
    expect(text).not.toMatch(/\(draft\)/i);
    expect(text).toContain(`Dated ${date}`);
    // Removed at the owner's instruction (5 Oct 2026).
    expect(root.querySelector('[role="note"]')).toBeNull();
    expect(text).not.toMatch(/under legal review/i);
  });

  it("numbers its sections, and every contents entry leads to one", () => {
    const { root } = open();
    const headings = [...root.querySelectorAll("section[id] > h2")].map(h => h.textContent ?? "");
    expect(headings).toHaveLength(sections);
    headings.forEach((heading, i) => { expect(heading.startsWith(`${String(i + 1)}. `), heading).toBe(true); });

    const targets = [...root.querySelectorAll('nav[aria-label="Contents"] a')].map(a => a.getAttribute("href") ?? "");
    expect(targets).toHaveLength(sections);
    for (const href of targets) {
      expect(root.querySelector(`section[id="${href.slice(1)}"]`), href).not.toBeNull();
    }
  });
});

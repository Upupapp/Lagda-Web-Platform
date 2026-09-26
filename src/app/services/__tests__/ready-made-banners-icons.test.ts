import { describe, expect, it } from "vitest";
import library from "../../../assets/ready_made_template.json";
import { READY_MADE_CATEGORIES, READY_MADE_TEMPLATES } from "../ready-made-templates";
import {
  bannerSlug, CARD_BANNERS, categoryBanner, FULL_BANNERS,
} from "../ready-made-banners";
import { READY_MADE_FALLBACK_ICON, READY_MADE_ICONS, readyMadeIcon } from "../ready-made-icons";

describe("ready-made category banners", () => {
  it("slugs categories the way the banner files are named", () => {
    expect(bannerSlug("R&D & Innovation")).toBe("rd-innovation");
    expect(bannerSlug("IT & Data Security")).toBe("it-data-security");
  });

  it("gives every category a banner", () => {
    expect(READY_MADE_CATEGORIES.length).toBe(15);
    for (const c of READY_MADE_CATEGORIES) {
      expect(categoryBanner(c.label), c.label).toBeDefined();
      expect(CARD_BANNERS.has(bannerSlug(c.label)), `${c.label} card copy`).toBe(true);
    }
  });

  it("uses every banner for some category", () => {
    const slugs = new Set(READY_MADE_CATEGORIES.map(c => bannerSlug(c.label)));
    expect([...FULL_BANNERS.keys()].filter(s => !slugs.has(s))).toEqual([]);
    expect([...CARD_BANNERS.keys()].filter(s => !slugs.has(s))).toEqual([]);
  });
});

describe("ready-made template icons", () => {
  it("maps every template to a dedicated icon", () => {
    expect(READY_MADE_TEMPLATES.length).toBeGreaterThan(0);
    const missing = READY_MADE_TEMPLATES.filter(t => READY_MADE_ICONS[t.title] === undefined).map(t => t.title);
    expect(missing).toEqual([]);
  });

  it("covers every document in the library, including ones not offered yet", () => {
    const titles = library.categories.flatMap(c => c.documents.map(d => d.title));
    expect(titles.filter(t => READY_MADE_ICONS[t] === undefined)).toEqual([]);
  });

  it("gives each template its own icon", () => {
    const icons = READY_MADE_TEMPLATES.map(t => READY_MADE_ICONS[t.title]);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it("falls back for an unknown title", () => {
    expect(readyMadeIcon("Nope")).toBe(READY_MADE_FALLBACK_ICON);
  });
});

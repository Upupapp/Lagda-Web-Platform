// Every help article leads somewhere real: its own address is routable, and
// every "read next" link is a page the router has. An article that linked to
// a renamed page would be the Help Center's old problem back again.

import { describe, it, expect } from "vitest";
import { HELP_ARTICLES, HELP_CATEGORIES, findHelpArticle, helpArticlePath } from "../help-articles";
import { getRouteMeta } from "../../config/routes";

describe("help articles", () => {
  it("has a unique slug per article, each of which routes", () => {
    const slugs = HELP_ARTICLES.map(a => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug, slug).toMatch(/^[a-z0-9-]+$/);
      expect(getRouteMeta(helpArticlePath(slug))?.path, slug).toBe("/help/:slug");
      expect(findHelpArticle(slug)?.slug).toBe(slug);
    }
  });

  it("links only to pages the router has", () => {
    for (const article of HELP_ARTICLES) {
      for (const link of article.related ?? []) {
        expect(getRouteMeta(link.to), `${article.slug} -> ${link.to}`).toBeDefined();
        if (link.to.startsWith("/help/")) {
          expect(findHelpArticle(link.to.slice("/help/".length)), `${article.slug} -> ${link.to}`).toBeDefined();
        }
      }
    }
  });

  it("explains each task in steps, under a listed category", () => {
    for (const article of HELP_ARTICLES) {
      expect(article.steps.length, article.slug).toBeGreaterThanOrEqual(3);
      expect(HELP_CATEGORIES).toContain(article.category);
      expect(article.summary.length, article.slug).toBeGreaterThan(30);
      expect(article.tags.length, article.slug).toBeGreaterThan(0);
    }
  });

  it("describes nothing that is not built", () => {
    const text = JSON.stringify(HELP_ARTICLES).toLowerCase();
    // Reminders exist since 111 and are described; SMS codes, eNotary and an API do not.
    for (const absent of ["sms", "authenticator code for signers", "enotary", "api key", "webhook"]) {
      expect(text, absent).not.toContain(absent);
    }
  });
});

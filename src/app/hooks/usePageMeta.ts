import { useEffect } from "react";
import { useLocation } from "react-router";
import { PUBLIC_ROUTES, AUTH_ROUTES, PLATFORM_ROUTES } from "@/app/config/routes";
import { APP_CONFIG } from "@/app/config/app.config";

const ALL_ROUTES = [...PUBLIC_ROUTES, ...AUTH_ROUTES, ...PLATFORM_ROUTES];
const SITE_ORIGIN = "https://lagda.io";

// Route metadata is declared with the same `:param` patterns the router uses —
// 39 of the entries are parametric. Matching them with `route.path === pathname`
// compared "/app/documents/:transactionId" against "/app/documents/txn_004" and
// never matched, so every document, workflow, thread, folder, contact, member,
// batch, rule and policy detail page silently fell back to the generic site
// title. The entries existed and looked wired; only the comparison was wrong.

interface RouteMatcher {
  readonly test: (pathname: string) => boolean;
  /** Static segments beat parameters, so the more specific pattern wins. */
  readonly specificity: number;
}

function compile(pattern: string): RouteMatcher {
  const segments = pattern.split("/").filter(Boolean);
  const specificity = segments.reduce((n, seg) => n + (seg.startsWith(":") ? 0 : 1), 0);
  return {
    specificity,
    test: (pathname: string) => {
      const actual = pathname.split("/").filter(Boolean);
      if (actual.length !== segments.length) return false;
      return segments.every((seg, i) => seg.startsWith(":") || seg === actual[i]);
    },
  };
}

// Compiled once at module scope; the route table is static.
const MATCHERS = ALL_ROUTES
  .map((route) => ({ route, ...compile(route.path) }))
  .sort((a, b) => b.specificity - a.specificity);

function findRoute(pathname: string) {
  // An exact hit is unambiguous and cheapest, so try it before patterns.
  const exact = ALL_ROUTES.find((r) => r.path === pathname);
  if (exact) return exact;
  return MATCHERS.find((m) => m.test(pathname))?.route;
}

function setMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
  el.content = content;
}

function setProperty(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("property", property); document.head.appendChild(el); }
  el.content = content;
}

function setCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="canonical"]`);
  if (!el) { el = document.createElement("link"); el.rel = "canonical"; document.head.appendChild(el); }
  el.href = href;
}

function setRobots(indexable: boolean) {
  setMeta("robots", indexable ? "index, follow" : "noindex, nofollow");
}

export function usePageMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Strip trailing slash for matching (except root)
    const normalPath = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
    const route = findRoute(normalPath);

    const title = route?.title ?? `${APP_CONFIG.name} — ${APP_CONFIG.tagline}`;
    const description = route?.description ?? APP_CONFIG.legal.esignatureStatement;
    const isIndexable = route?.isIndexable ?? false;
    // Never publish the pattern itself as a canonical URL — for a parametric
    // route the real pathname is the canonical one.
    const declaredCanonical = route?.canonicalPath;
    const canonicalPath =
      declaredCanonical && !declaredCanonical.includes(":") ? declaredCanonical : normalPath;

    document.title = title;
    setMeta("description", description);
    setRobots(isIndexable);
    setCanonical(`${SITE_ORIGIN}${canonicalPath}`);

    // Open Graph
    setProperty("og:title", title);
    setProperty("og:description", description);
    setProperty("og:type", "website");
    setProperty("og:url", `${SITE_ORIGIN}${canonicalPath}`);
    setProperty("og:site_name", "LAGDA");
    setProperty("og:image", `${SITE_ORIGIN}/brand/lagda-og-preview.png`);
    setProperty("og:image:width", "1200");
    setProperty("og:image:height", "630");
    setProperty("og:locale", "en_PH");

    // Twitter / X
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", `${SITE_ORIGIN}/brand/lagda-og-preview.png`);
  }, [pathname]);
}

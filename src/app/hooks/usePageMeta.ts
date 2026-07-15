import { useEffect } from "react";
import { useLocation } from "react-router";
import { PUBLIC_ROUTES, AUTH_ROUTES, PLATFORM_ROUTES } from "@/app/config/routes";
import { APP_CONFIG } from "@/app/config/app.config";

const ALL_ROUTES = [...PUBLIC_ROUTES, ...AUTH_ROUTES, ...PLATFORM_ROUTES];
const SITE_ORIGIN = "https://lagda.io";

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
    const route = ALL_ROUTES.find((r) => r.path === normalPath);

    const title = route?.title ?? `${APP_CONFIG.name} — ${APP_CONFIG.tagline}`;
    const description = route?.description ?? APP_CONFIG.legal.esignatureStatement;
    const isIndexable = route?.isIndexable ?? false;
    const canonicalPath = route?.canonicalPath ?? normalPath;

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

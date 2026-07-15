import { useEffect } from "react";
import { useLocation } from "react-router";

const SITE_ORIGIN = "https://lagda.io";
const SCRIPT_ID = "lagda-structured-data";

// Organization schema — rendered on every page
const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_ORIGIN}/#organization`,
      name: "LAGDA",
      alternateName: "UpUp Technologies",
      url: SITE_ORIGIN,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_ORIGIN}/brand/lagda-icon-azure.svg`,
      },
      description:
        "LAGDA eSignature helps Philippine professionals and organizations prepare, send, sign, track, verify, and securely manage documents online.",
      areaServed: { "@type": "Country", name: "Philippines" },
      knowsAbout: [
        "Electronic signatures",
        "Document verification",
        "Legal document automation",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_ORIGIN}/#website`,
      url: SITE_ORIGIN,
      name: "LAGDA",
      publisher: { "@id": `${SITE_ORIGIN}/#organization` },
      inLanguage: "en-PH",
    },
  ],
};

// Per-route structured data map (only for pages that warrant it)
const PAGE_SCHEMAS: Record<string, object | null> = {
  "/": ORGANIZATION_SCHEMA,
  "/contact": {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact LAGDA",
    url: `${SITE_ORIGIN}/contact`,
    description: "Contact the LAGDA team for sales, support, or partnership inquiries.",
  },
};

function injectSchema(data: object) {
  let el = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = SCRIPT_ID;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeSchema() {
  const el = document.getElementById(SCRIPT_ID);
  if (el) el.remove();
}

export function useStructuredData() {
  const { pathname } = useLocation();

  useEffect(() => {
    const schema = PAGE_SCHEMAS[pathname];
    if (schema) {
      injectSchema(schema);
    } else {
      // Inject minimal org schema on every page
      injectSchema(ORGANIZATION_SCHEMA);
    }
    return () => removeSchema();
  }, [pathname]);
}

import { Link, useLocation } from "react-router";

const SEGMENT_LABELS: Record<string, string> = {
  esignature:                "eSignature",
  "core-workflow":           "Core Workflow",
  "verification-and-audit":  "Verification & Audit",
  "advanced-capabilities":   "Advanced Capabilities",
  "templates-and-branding":  "Templates & Branding",
  "team-and-enterprise":     "Team & Enterprise",
  security:                  "Security",
  "trust-center":            "Trust Center",
  "identity-verification":   "Identity Verification",
  "audit-trail":             "Audit Trail",
  "document-verification":   "Document Verification",
  evidence:                  "Evidence",
  storage:                   "Secure Storage",
  solutions:                 "Solutions",
  lawyers:                   "Lawyers",
  "law-firms":               "Law Firms",
  business:                  "Business Teams",
  government:                "Government / LGU",
  "real-estate":             "Real Estate",
  hr:                        "HR & Recruitment",
  finance:                   "Finance",
  procurement:               "Procurement",
  pricing:                   "Pricing",
  compare:                   "Compare Plans",
  signing:                   "Signing Requests",
  templates:                 "Templates by Plan",
  enterprise:                "Enterprise",
  resources:                 "Resources",
  faq:                       "FAQ",
  legal:                     "Legal Framework",
  enotary:                   "eNotary",
  features:                  "Features",
  roadmap:                   "Roadmap",
  waitlist:                  "Join Waitlist",
  help:                      "Help Center",
  contact:                   "Contact",
  verify:                    "Verify Document",
  "service-status":          "Service Status",
  privacy:                   "Privacy Policy",
  terms:                     "Terms of Service",
  accessibility:             "Accessibility",
};

interface Crumb {
  label: string;
  path: string;
}

function useBreadcrumbs(): Crumb[] {
  const { pathname } = useLocation();
  const parts = pathname.replace(/\/$/, "").split("/").filter(Boolean);
  if (parts.length === 0) return [];

  const crumbs: Crumb[] = [{ label: "Home", path: "/esignature" }];
  let builtPath = "";
  for (const part of parts) {
    builtPath += `/${part}`;
    const label = SEGMENT_LABELS[part] ?? part.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({ label, path: builtPath });
  }
  return crumbs;
}

interface BreadcrumbProps {
  /** Only render for paths with at least this many segments (default 2). */
  minDepth?: number;
  className?: string;
}

export function Breadcrumb({ minDepth = 2, className }: BreadcrumbProps) {
  const crumbs = useBreadcrumbs();
  if (crumbs.length < minDepth) return null;

  const GF = { fontFamily: "'Geist', sans-serif" };

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol
        role="list"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          margin: 0,
          padding: "12px 0",
          listStyle: "none",
          flexWrap: "wrap",
        }}
      >
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={crumb.path} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {i > 0 && (
                <span aria-hidden="true" style={{ color: "#334155", fontSize: 12, userSelect: "none" }}>
                  /
                </span>
              )}
              {isLast ? (
                <span
                  aria-current="page"
                  style={{ color: "#94a3b8", ...GF, fontSize: 12, fontWeight: 500 }}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  style={{
                    color: "#475569", ...GF, fontSize: 12, fontWeight: 500,
                    textDecoration: "none", transition: "color 0.15s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#94a3b8"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#475569"; }}
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

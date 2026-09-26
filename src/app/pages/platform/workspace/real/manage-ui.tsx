// Shared layout pieces for the Manage pages, real and demo. Inside the
// workspace shell a page is a section of the shell's content area; on its
// own it keeps a white header with a breadcrumb. 12px-radius cards either
// way, so a real account and the demo read as one product.

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { ChevronLeft } from "lucide-react";
import { useViewport } from "../../../../hooks/useViewport";
import { buttonStyle, GF, GM, NAVY, AZURE, SLATE, SILVER, BORDER } from "../join/join-styles";
import { cardStyle } from "./manage-styles";
import { useWorkspaceShell } from "../shell/workspace-shell-context";

export { GF, GM, NAVY, AZURE, SLATE, SILVER, BORDER };

export interface Crumb { label: string; to?: string }

interface ManagePageProps {
  crumbs: Crumb[]; title: string; badge?: ReactNode; actions?: ReactNode; children: ReactNode; maxWidth?: number;
  /** Before the title: an avatar or initials. */
  leading?: ReactNode;
  /** Under the title: a description, an email address. */
  subtitle?: ReactNode;
}

/**
 * One Manage page.
 *
 * Inside the workspace shell (the normal case) this is a SECTION of the
 * shell's content area: the shell already shows the workspace header and
 * the section banners, so the page contributes only its heading, actions
 * and content. A detail page (a member, a team, a role) adds a breadcrumb
 * back to its section. On every change of path the heading takes focus, so
 * a screen reader announces where the banner click went.
 *
 * Rendered on its own it keeps the full page header it always had.
 */
export function ManagePage(props: ManagePageProps) {
  const shell = useWorkspaceShell();
  return shell ? <ManageSection {...props} /> : <ManageStandalone {...props} />;
}

function ManageSection({ crumbs, title, badge, actions, children, leading, subtitle, maxWidth }: ManagePageProps) {
  const shell = useWorkspaceShell();
  const { pathname } = useLocation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  // The workspace root needs no crumb: the banner row already says where you are.
  const trail = crumbs[0]?.to === "/app/workspace" ? crumbs.slice(1) : crumbs;
  const isDetail = trail.length > 1;

  useEffect(() => {
    if (!shell || shell.focusedPath.current === pathname) return;
    shell.focusedPath.current = pathname;
    headingRef.current?.focus({ preventScroll: true });
  }, [shell, pathname]);

  return (
    <section aria-labelledby={headingId} data-testid="workspace-section" style={{ minWidth: 0 }}>
      {isDetail && (
        <nav aria-label="Breadcrumb" style={{ marginBottom: 12 }}>
          <ol style={{ display: "flex", alignItems: "center", gap: 6, listStyle: "none", margin: 0, padding: 0, flexWrap: "wrap", ...GF, fontSize: 12.5, color: SILVER }}>
            {trail.map((c, i) => (
              <li key={`${c.label}-${String(i)}`} style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                {i > 0 && <span aria-hidden>›</span>}
                {c.to
                  ? (
                    <Link to={c.to} style={{ color: AZURE, textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, minHeight: 28 }}>
                      {i === 0 && <ChevronLeft size={15} aria-hidden />}
                      {c.label}
                    </Link>
                  )
                  : <span aria-current="page" style={{ color: SLATE, overflowWrap: "anywhere" }}>{c.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: "1 1 260px" }}>
          {leading}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0 }}>
              <h2 ref={headingRef} id={headingId} tabIndex={-1} data-section-heading="" className="ws-section-heading"
                style={{ ...GF, fontSize: 19, fontWeight: 800, color: NAVY, margin: 0, lineHeight: 1.25, overflowWrap: "anywhere", letterSpacing: "-0.005em" }}>
                {title}
              </h2>
              {badge}
            </div>
            {subtitle && <div style={{ ...GF, fontSize: 13, color: SLATE, marginTop: 4, lineHeight: 1.5, overflowWrap: "anywhere" }}>{subtitle}</div>}
          </div>
        </div>
        {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>{actions}</div>}
      </div>
      {/* The shell sets the width. A page built as a narrow form keeps its
          measure, left-aligned under the heading, instead of stretching. */}
      <div style={{ maxWidth: maxWidth !== undefined && maxWidth < 900 ? maxWidth : undefined, minWidth: 0 }}>
        {children}
      </div>
    </section>
  );
}

function ManageStandalone({ crumbs, title, badge, actions, children, maxWidth = 960, leading, subtitle }: ManagePageProps) {
  const { isNarrow } = useViewport();
  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "0 0 48px", overflowX: "hidden" }}>
      <header style={{ background: "#FFFFFF", borderBottom: `1px solid ${BORDER}`, padding: isNarrow ? "16px" : "20px 24px" }}>
        <div style={{ maxWidth, margin: "0 auto" }}>
          <nav aria-label="Breadcrumb" style={{ marginBottom: 10 }}>
            <ol style={{ display: "flex", gap: 6, listStyle: "none", margin: 0, padding: 0, flexWrap: "wrap", ...GF, fontSize: 12, color: SILVER }}>
              {crumbs.map((c, i) => (
                <li key={`${c.label}-${String(i)}`} style={{ display: "flex", gap: 6, minWidth: 0 }}>
                  {i > 0 && <span aria-hidden>›</span>}
                  {c.to
                    ? <Link to={c.to} style={{ color: AZURE, textDecoration: "none" }}>{c.label}</Link>
                    : <span style={{ color: SLATE, overflowWrap: "anywhere" }}>{c.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              {leading}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0 }}>
                  <h1 style={{ ...GF, fontSize: isNarrow ? 20 : 22, fontWeight: 800, color: NAVY, margin: 0, overflowWrap: "anywhere" }}>{title}</h1>
                  {badge}
                </div>
                {subtitle && <div style={{ ...GF, fontSize: 13, color: SLATE, marginTop: 4, lineHeight: 1.5, overflowWrap: "anywhere" }}>{subtitle}</div>}
              </div>
            </div>
            {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
          </div>
        </div>
      </header>
      <div style={{ maxWidth, margin: "24px auto 0", padding: isNarrow ? "0 16px" : "0 24px", boxSizing: "border-box" }}>
        {children}
      </div>
    </div>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" }) {
  const palette = tone === "error"
    ? { bg: "#FEF2F2", border: "#FECACA", color: "#991B1B" }
    : { bg: "#EBF4FC", border: "#BAD7F5", color: "#0B4F8A" };
  return (
    <div role={tone === "error" ? "alert" : undefined}
      style={{ background: palette.bg, border: `1px solid ${palette.border}`, borderRadius: 10, padding: "12px 16px", ...GF, fontSize: 13, color: palette.color, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div aria-busy="true" style={{ ...cardStyle, padding: 32, textAlign: "center", ...GF, fontSize: 13, color: SLATE }}>{label}</div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" style={{ ...cardStyle, padding: "28px 20px", textAlign: "center" }}>
      <p style={{ ...GF, fontSize: 14, color: "#991B1B", margin: "0 0 12px" }}>{message}</p>
      {onRetry && <button type="button" onClick={onRetry} style={buttonStyle("secondary")}>Try again</button>}
    </div>
  );
}

/** For a page this person's role does not reach. Says so plainly. */
export function NotAvailable({ crumbs, title, message }: { crumbs: Crumb[]; title: string; message: string }) {
  return (
    <ManagePage crumbs={crumbs} title={title}>
      <div style={{ ...cardStyle, padding: "32px 24px", textAlign: "center" }}>
        <p style={{ ...GF, fontSize: 14, color: SLATE, margin: "0 0 12px", lineHeight: 1.6 }}>{message}</p>
        <Link to="/app/workspace" style={{ ...GF, fontSize: 13, fontWeight: 600, color: AZURE, textDecoration: "none" }}>Back to Manage</Link>
      </div>
    </ManagePage>
  );
}

// The preparation wizard's chrome — breadcrumb on top, Previous/Continue at
// the bottom — extracted from PrepareLayout so it can be shaped per viewport
// and tested at 320px without standing up the whole wizard.
//
// ── What was wrong on a phone, measured ────────────────────────────────────
//
// The breadcrumb was a fixed 56px row holding "Documents › Prepare Document ›
// <title>". Its flex row had no `minWidth: 0`, so the title's ellipsis never
// engaged; instead "Prepare Document" wrapped to two lines and the title ran
// off the right edge of a 320px screen.
//
// The nav bar was worse. Three things in one non-wrapping row — "← Previous",
// the link "A few things still need attention — see what's left", and
// "Not ready yet →" / "Continue to Place Fields →" — each wrapping
// independently. Measured at 320px: 68px on the steps with no blocker,
// 108px on Documents, 131px on Participants and Review. Nearly a third of a
// short phone's height, spent on two buttons.
//
// ── The decisions ──────────────────────────────────────────────────────────
//
// Compact breadcrumb: one back-link. The mobile stepper directly below it
// already names the step, and the draft title is not what somebody on a phone
// mid-wizard needs to see again.
//
// Compact nav bar: Previous and Continue only. The long "see what's left" link
// goes — not shrunk, removed — because the help FAB already carries exactly
// that count as a badge and opens a panel listing exactly those items. Two
// affordances for one question is what made the bar tall. The Continue label
// shortens to what fits without losing its meaning.
//
// Nothing here decides whether a step is complete, or what "blocked" means;
// PrepareLayout still owns that and passes the answers in.

import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router";
import { ChevronLeft } from "lucide-react";
import type { PreparationStepId } from "../../models/prepare";
import { useViewport } from "../system/design-system";

const GF: CSSProperties = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const GOLD   = "#C9960C";
const DANGER = "#C0392B";

// ── Breadcrumb ─────────────────────────────────────────────────────────────

export interface PrepareBreadcrumbProps {
  readonly title: string | null;
  readonly showDiscard: boolean;
  readonly onDiscard: () => void;
}

export function PrepareBreadcrumb({ title, showDiscard, onDiscard }: PrepareBreadcrumbProps) {
  const { isCompact } = useViewport();

  const discard = showDiscard && (
    <button
      onClick={onDiscard}
      style={{
        ...GF, background: "none", border: "none", color: DANGER,
        fontSize: 13, fontWeight: 600, cursor: "pointer",
        padding: "6px 12px", borderRadius: 6, whiteSpace: "nowrap", flexShrink: 0,
        minHeight: 44,
      }}
    >
      {isCompact ? "Discard" : "Discard draft"}
    </button>
  );

  return (
    <div
      className="prep-breadcrumb"
      style={{
        ...GF,
        borderBottom: "1px solid #E3E8EF",
        padding: isCompact ? "0 12px 0 8px" : "0 40px",
        // A minimum, not a fixed height: content that needs a second line
        // grows the bar instead of overflowing it.
        minHeight: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        flexShrink: 0,
        background: "#FFFFFF",
      }}
    >
      {isCompact
        ? (
          <Link
            to="/app/documents"
            style={{
              ...GF, display: "inline-flex", alignItems: "center", gap: 2,
              color: NAVY, textDecoration: "none", fontWeight: 600, fontSize: 13,
              minHeight: 44, padding: "0 6px 0 2px", whiteSpace: "nowrap",
            }}
          >
            <ChevronLeft size={18} aria-hidden />
            Documents
          </Link>
        )
        : (
          // `minWidth: 0` on the row is what lets the title's ellipsis
          // engage; without it the row refuses to be narrower than its
          // content and the title runs off the edge instead.
          <nav
            aria-label="Breadcrumb"
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: SILVER, minWidth: 0 }}
          >
            <Link
              to="/app/documents"
              style={{ color: SILVER, textDecoration: "none", fontWeight: 500, whiteSpace: "nowrap" }}
            >
              Documents
            </Link>
            <span aria-hidden="true">›</span>
            <span style={{ color: NAVY, fontWeight: 600, whiteSpace: "nowrap" }}>Prepare Document</span>
            {title && (
              <>
                <span aria-hidden="true">›</span>
                <span
                  title={title}
                  style={{
                    color: NAVY, fontWeight: 400, maxWidth: 240, minWidth: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {title}
                </span>
              </>
            )}
          </nav>
        )}

      {discard}
    </div>
  );
}

// ── Bottom nav bar ─────────────────────────────────────────────────────────

export interface PrepareNavBarProps {
  readonly prevId: PreparationStepId | null;
  readonly nextId: PreparationStepId | null;
  readonly continueBlocked: boolean;
  readonly onPrevious: () => void;
  readonly onContinue: () => void;
  /** Opens the "what's left" reminder. Also what a blocked Continue does. */
  readonly onShowMissing: () => void;
}

/** The Continue label, at the length the screen can afford. */
export function continueLabel(
  nextId: PreparationStepId | null, blocked: boolean, compact: boolean,
): string {
  if (blocked) return compact ? "Not ready →" : "Not ready yet →";
  if (nextId === "fields") return compact ? "Place Fields →" : "Continue to Place Fields →";
  return "Continue →";
}

export function PrepareNavBar({
  prevId, nextId, continueBlocked, onPrevious, onContinue, onShowMissing,
}: PrepareNavBarProps) {
  const { isCompact } = useViewport();

  const button: CSSProperties = {
    ...GF, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
    whiteSpace: "nowrap", minHeight: 44,
    padding: isCompact ? "0 14px" : "0 24px",
  };

  let previous: ReactNode = null;
  if (prevId !== null) {
    previous = (
      <button
        onClick={onPrevious}
        aria-label={isCompact ? "Previous step" : undefined}
        style={{ ...button, border: "1px solid #D1D9E0", background: "#FFFFFF", color: NAVY }}
      >
        {isCompact ? "← Back" : "← Previous"}
      </button>
    );
  }

  return (
    <div className="prep-nav-bar">
      <div>{previous}</div>

      <div style={{ display: "flex", alignItems: "center", gap: isCompact ? 8 : 12, minWidth: 0 }}>
        {continueBlocked && !isCompact && (
          <button
            type="button"
            onClick={onShowMissing}
            style={{
              ...GF, fontSize: 12.5, fontWeight: 600, color: GOLD,
              background: "none", border: "none", cursor: "pointer",
              padding: "6px 4px", textDecoration: "underline", textUnderlineOffset: 2,
            }}
          >
            A few things still need attention — see what&rsquo;s left
          </button>
        )}
        {nextId && (
          <button
            // Clicking while blocked opens the friendly reminder instead of
            // doing nothing — a disabled button with no explanation reads
            // as broken, not as "not ready yet".
            onClick={continueBlocked ? onShowMissing : onContinue}
            aria-disabled={continueBlocked}
            style={{
              ...button,
              border: "none",
              background: continueBlocked ? "#FEF9EC" : AZURE,
              color: continueBlocked ? GOLD : "#FFFFFF",
              ...(continueBlocked ? { boxShadow: "inset 0 0 0 1px #F0D07A" } : {}),
            }}
          >
            {continueLabel(nextId, continueBlocked, isCompact)}
          </button>
        )}
      </div>
    </div>
  );
}

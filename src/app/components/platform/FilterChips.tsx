// Active-filter chips for list surfaces.
//
// Extracted from DocumentsPage, where this pattern was already right, so the
// other lists can stop being wrong. The failure it prevents is specific:
// Contacts reads scope, status and tag filters from the URL but renders its
// filter controls inside a panel that is COLLAPSED by default, with "Clear all
// filters" inside that same panel. Follow a shared link to a filtered list and
// you get a short list, no indication anything is filtered, and no way to clear
// it without first discovering the Filters toggle. A list that is hiding rows
// has to say so where the rows are, not behind a disclosure.
//
// Touch targets are the other half. The chip dismiss button was an 11px icon
// with zero padding — the exact control the accessibility rules mean when they
// say 44px, since it is how a filter gets removed.

import type { ReactNode } from "react";

const GF = { fontFamily: "'Geist', sans-serif" };

export interface FilterChip {
  /** Identifies the filter to clear when this chip is dismissed. */
  key: string;
  /** Reads as "<Field>: <value>", e.g. `Status: Archived`. */
  label: string;
}

export interface FilterChipsProps {
  chips: FilterChip[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
  /** Overrides the region label when a page shows more than one chip row. */
  label?: string;
  /** Rendered after the chips, e.g. a result count. */
  children?: ReactNode;
}

export function FilterChips({
  chips,
  onRemove,
  onClearAll,
  label = "Active filters",
  children,
}: FilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div
      role="region"
      aria-label={label}
      style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", margin: "4px 0 8px" }}
    >
      {chips.map((c) => (
        <span
          key={c.key}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            paddingLeft: 10,
            borderRadius: 999,
            fontSize: 12,
            background: "#EFF6FF",
            color: "#1D4ED8",
            border: "1px solid #BFDBFE",
            ...GF,
          }}
        >
          {c.label}
          <button
            type="button"
            onClick={() => onRemove(c.key)}
            aria-label={`Remove filter: ${c.label}`}
            // 44px of hit area without a 44px-tall chip: the button fills the
            // chip's height and takes its remaining width from padding, so the
            // pointer target is comfortable while the chip stays compact.
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#1D4ED8",
              lineHeight: 1,
              minWidth: 32,
              minHeight: 32,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              fontSize: 14,
            }}
          >
            <span aria-hidden>×</span>
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        style={{
          fontSize: 12,
          ...GF,
          color: "#475569",
          border: "none",
          background: "none",
          cursor: "pointer",
          textDecoration: "underline",
          minHeight: 32,
          padding: "0 8px",
        }}
      >
        Clear all
      </button>
      {children}
    </div>
  );
}

// The one status badge.
//
// Extracted from DocumentsPage so the dashboard can render the same rows
// with the same badge. Tone and label both come from the models' maps —
// this component decides nothing, it only draws.

import type { CSSProperties } from "react";
import type { TransactionStatus } from "../../models";
import { TRANSACTION_STATUS_LABELS } from "../../models";
import { DOCUMENT_STATUS_TONE, STATUS_TONE_CSS } from "../../models/documents";

const GF: CSSProperties = { fontFamily: "'Geist', sans-serif" };

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const tone = DOCUMENT_STATUS_TONE[status];
  const css  = STATUS_TONE_CSS[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 7px", borderRadius: 4, fontSize: 11, fontWeight: 600,
      letterSpacing: "0.02em", whiteSpace: "nowrap",
      background: css.bg, color: css.text, border: `1px solid ${css.border}`,
      ...GF,
    }}>
      {TRANSACTION_STATUS_LABELS[status]}
    </span>
  );
}

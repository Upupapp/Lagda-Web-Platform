// Style constants shared by the Manage pages' real-backend views. Kept out
// of manage-ui.tsx so Fast Refresh keeps working on it.

import type { CSSProperties } from "react";
import { GF, SLATE, BORDER } from "../join/join-styles";

export const LIGHT = "#F0F7FF";

export const cardStyle: CSSProperties = {
  background: "#FFFFFF", border: `1.5px solid ${BORDER}`, borderRadius: 12, boxSizing: "border-box", minWidth: 0,
};

export const sectionHeadingStyle: CSSProperties = {
  ...GF, fontSize: 12, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px",
};

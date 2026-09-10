import type React from "react";
import { colors } from "@tech-refresh/core/tokens";

// The board's two ghost-button geometries. Both were hand-rolled at ~20 call
// sites; the only things that ever varied were the text and border colours,
// which stay separate because several call sites pair a Bright text colour
// with a dimmer border tint.

/** Toolbar / dialog action. */
export const ghostAction = (color = colors.textDim, borderColor = colors.border): React.CSSProperties => ({
  padding: "7px 14px",
  background: "transparent",
  border: `1px solid ${borderColor}`,
  borderRadius: 8,
  color,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
});

/** Compact chip on a card. */
export const ghostChip = (color = colors.textDim, borderColor = colors.border): React.CSSProperties => ({
  padding: "3px 10px",
  background: "transparent",
  border: `1px solid ${borderColor}`,
  borderRadius: 6,
  color,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
});

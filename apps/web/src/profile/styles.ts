import type { CSSProperties } from "react";
import { colors } from "@tech-refresh/core/tokens";

export const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 11px",
  background: colors.bgDeep,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  color: colors.text,
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
};

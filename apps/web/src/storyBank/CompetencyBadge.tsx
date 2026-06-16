import React from "react";
import { COMPETENCY_COLORS } from "@tech-refresh/core/stories";
import { t } from "@tech-refresh/core/i18n";
import { colors } from "@tech-refresh/core/tokens";

export function CompetencyBadge({ competency }: { competency: string }) {
  const color = COMPETENCY_COLORS[competency] || colors.textFaint;
  const label = competency ? t(`enum.competency.${competency}` as Parameters<typeof t>[0]) : "";
  return (
    <span
      style={{
        padding: "3px 10px",
        background: `${color}20`,
        borderRadius: 20,
        color,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
      }}
    >
      {label.toUpperCase()}
    </span>
  );
}

import { t } from "@tech-refresh/core/i18n";
import { colors } from "@tech-refresh/core/tokens";

import { NODE_H, NODE_W } from "./constants";
import type { BoardEdge, BoardNode } from "./types";

type Props = {
  edge: BoardEdge;
  source: BoardNode | undefined;
  target: BoardNode | undefined;
  selected: boolean;
  onSelect: () => void;
};

export default function BoardEdgeView({ edge, source, target, selected, onSelect }: Props) {
  if (!source || !target) return null;

  const startX = source.x + (target.x >= source.x ? NODE_W : 0);
  const startY = source.y + NODE_H / 2;
  const endX = target.x + (target.x >= source.x ? 0 : NODE_W);
  const endY = target.y + NODE_H / 2;
  const midpointX = (startX + endX) / 2;
  const path = `M ${startX} ${startY} C ${midpointX} ${startY}, ${midpointX} ${endY}, ${endX} ${endY}`;

  const modeLabel = edge.mode === "sync" ? t("edge.sync") : edge.mode === "async" ? t("edge.async") : null;
  const label = [edge.protocol, modeLabel].filter(Boolean).join(" · ");

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={selected ? colors.accentBright : colors.textDim}
        strokeWidth={selected ? 3 : 2}
        // Dashed arrows mark non-blocking hops.
        strokeDasharray={edge.mode === "async" ? "6 4" : undefined}
        markerEnd="url(#arrow)"
      />
      {label && (
        <text
          x={midpointX}
          y={(startY + endY) / 2 - 6}
          textAnchor="middle"
          style={{ fontSize: 10, fontWeight: 600, fill: colors.textFaint, pointerEvents: "none" }}
        >
          {label}
        </text>
      )}
      {/* Wider invisible path makes the arrow easier to select. */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth="14"
        style={{ pointerEvents: "stroke", cursor: "pointer" }}
        onClick={onSelect}
      >
        <title>{t("edge.clickHint")}</title>
      </path>
    </g>
  );
}

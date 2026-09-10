import { colors } from "@tech-refresh/core/tokens";

import type { ArchBoardController } from "./useArchBoard";
import BoardEdgeView from "./BoardEdgeView";

type Props = Pick<
  ArchBoardController,
  "edges" | "inspectingEdgeId" | "setInspectingEdgeId" | "connectDrag" | "nodeById" | "nodeAxisPoint"
>;

export function BoardEdges({
  edges,
  inspectingEdgeId,
  setInspectingEdgeId,
  connectDrag,
  nodeById,
  nodeAxisPoint,
}: Props) {
  const toggleEdgeInspector = (edgeId: string) => {
    setInspectingEdgeId((current) => (current === edgeId ? null : edgeId));
  };

  // The preview follows the pointer until a target node is chosen.
  const source = connectDrag ? nodeById[connectDrag.from] : undefined;
  let previewPath: string | undefined;

  if (source && connectDrag) {
    const start = nodeAxisPoint(source, connectDrag);
    const midpointX = (start.x + connectDrag.x) / 2;
    previewPath = `M ${start.x} ${start.y} C ${midpointX} ${start.y}, ${midpointX} ${connectDrag.y}, ${connectDrag.x} ${connectDrag.y}`;
  }

  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            fill={colors.textDim}
          />
        </marker>
      </defs>
      {edges.map((edge) => (
        <BoardEdgeView
          key={edge.id}
          edge={edge}
          target={nodeById[edge.to]}
          source={nodeById[edge.from]}
          onSelect={() => toggleEdgeInspector(edge.id)}
          selected={inspectingEdgeId === edge.id}
        />
      ))}
      {previewPath && (
        <path
          d={previewPath}
          fill="none"
          stroke={colors.accentBright}
          strokeWidth="2"
          strokeDasharray="5 5"
          markerEnd="url(#arrow)"
        />
      )}
    </svg>
  );
}

import { colors } from "@tech-refresh/core/tokens";

import { BoardEdges } from "./BoardEdges";
import { BoardNodes } from "./BoardNodes";
import type { ArchBoardController } from "./useArchBoard";

type Props = Pick<
  ArchBoardController,
  | "nodes"
  | "edges"
  | "connectFrom"
  | "setConnectFrom"
  | "inspectingId"
  | "setInspectingId"
  | "inspectingEdgeId"
  | "setInspectingEdgeId"
  | "connectDrag"
  | "canvasRef"
  | "dragRef"
  | "connectDragRef"
  | "suppressClickRef"
  | "dragFrameRef"
  | "pendingNodesRef"
  | "nodeById"
  | "snapshot"
  | "cancelConnection"
  | "commit"
  | "removeNode"
  | "addEdge"
  | "nodeAxisPoint"
  | "startConnectionDrag"
  | "updateConnectionDrag"
  | "finishConnectionDrag"
  | "onNodePointerDown"
  | "onNodePointerMove"
  | "onNodePointerUp"
  | "onNodeClick"
>;

export function BoardCanvas(props: Props) {
  const {
    nodes,
    canvasRef,
    connectDragRef,
    updateConnectionDrag,
    finishConnectionDrag,
    dragFrameRef,
    pendingNodesRef,
    dragRef,
    cancelConnection,
  } = props;

  return (
    <>
      {/* Canvas */}
      <div
        ref={canvasRef}
        onPointerMove={(e) => {
          if (connectDragRef.current) updateConnectionDrag(e);
        }}
        onPointerUp={(e) => {
          if (connectDragRef.current) finishConnectionDrag(e);
        }}
        onPointerCancel={() => {
          if (dragFrameRef.current !== null) window.cancelAnimationFrame(dragFrameRef.current);
          dragFrameRef.current = null;
          pendingNodesRef.current = null;
          dragRef.current = null;
          cancelConnection();
        }}
        onClick={(e) => {
          if (e.target === canvasRef.current) cancelConnection();
        }}
        style={{
          position: "relative",
          flex: 1,
          minWidth: 0,
          height: "calc(100vh - 360px)",
          minHeight: 560,
          background: colors.bgDeep,
          backgroundImage: `radial-gradient(${colors.border} 1px, transparent 1px)`,
          backgroundSize: "22px 22px",
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          overflow: "auto",
        }}
      >
        {nodes.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.textFaint,
              fontSize: 13,
              pointerEvents: "none",
            }}
          >
            Add components from the palette, then click or Shift-drag between node axis handles to wire them up.
          </div>
        )}

        <BoardEdges {...props} />

        <BoardNodes {...props} />
      </div>
    </>
  );
}

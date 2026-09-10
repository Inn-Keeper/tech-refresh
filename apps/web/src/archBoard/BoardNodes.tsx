import { TYPE_COLORS, meta, STATEFUL_TYPES } from "@tech-refresh/core/arch";
import { t } from "@tech-refresh/core/i18n";
import { colors } from "@tech-refresh/core/tokens";

import { BrandIcon } from "../components/BrandIcon";
import { nodeIconName } from "../components/brandIconNames";
import { NODE_H, NODE_W } from "./constants";
import styles from "./ArchBoard.module.css";
import type { ArchBoardController } from "./useArchBoard";

type Props = Pick<
  ArchBoardController,
  | "nodes"
  | "connectFrom"
  | "inspectingId"
  | "setInspectingId"
  | "connectDragRef"
  | "snapshot"
  | "commit"
  | "removeNode"
  | "startConnectionDrag"
  | "updateConnectionDrag"
  | "finishConnectionDrag"
  | "onNodePointerDown"
  | "onNodePointerMove"
  | "onNodePointerUp"
  | "onNodeClick"
>;

export function BoardNodes({
  nodes,
  connectFrom,
  inspectingId,
  setInspectingId,
  connectDragRef,
  snapshot,
  commit,
  removeNode,
  startConnectionDrag,
  updateConnectionDrag,
  finishConnectionDrag,
  onNodePointerDown,
  onNodePointerMove,
  onNodePointerUp,
  onNodeClick,
}: Props) {
  return (
    <>
      {nodes.map((n) => {
        const spec = meta(n.type);
        const color = TYPE_COLORS[n.type];
        const isSource = connectFrom === n.id;

        const axisHandle = (side: string) => (
          <button
            className={styles.handle}
            onPointerDown={(ev) => {
              ev.stopPropagation();
              if (ev.shiftKey) startConnectionDrag(ev, n);
            }}
            onPointerMove={(ev) => {
              ev.stopPropagation();
              if (connectDragRef.current) updateConnectionDrag(ev);
            }}
            onPointerUp={(ev) => {
              ev.stopPropagation();
              if (connectDragRef.current) finishConnectionDrag(ev);
            }}
            onClick={(ev) => {
              ev.stopPropagation();
              onNodeClick(n);
            }}
            aria-label={isSource ? `Cancel connection from ${spec.label}` : `Connect ${spec.label}`}
            title={isSource ? "Cancel connection" : "Connect from here, or hold Shift and drag to another node axis"}
            style={{
              position: "absolute",
              [side]: -16,
              top: NODE_H / 2 - 16,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              background: "transparent",
              ["--node-color" as string]: color,
              cursor: "crosshair",
              padding: 0,
            }}
          />
        );

        return (
          <div
            key={n.id}
            className={styles.node}
            onPointerDown={(e) => onNodePointerDown(e, n)}
            onPointerMove={onNodePointerMove}
            onPointerUp={onNodePointerUp}
            onClick={() => onNodeClick(n)}
            tabIndex={0}
            role="group"
            aria-label={`${spec.label} node`}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onNodeClick(n);
              }
              if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
                event.preventDefault();
                const step = event.shiftKey ? 1 : 10;
                const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
                const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
                commit({
                  ...snapshot(),
                  nodes: nodes.map((node) =>
                    node.id === n.id ? { ...node, x: Math.max(0, node.x + dx), y: Math.max(0, node.y + dy) } : node,
                  ),
                });
              }
              if (event.key === "Delete" || event.key === "Backspace") {
                event.preventDefault();
                removeNode(n.id);
              }
            }}
            style={{
              position: "absolute",
              left: n.x,
              top: n.y,
              width: NODE_W,
              height: NODE_H,
              boxSizing: "border-box",
              background: colors.surface,
              border: `2px solid ${isSource ? colors.textBright : `${color}60`}`,
              borderRadius: 10,
              cursor: "grab",
              touchAction: "none",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 10px",
              boxShadow: isSource ? `0 0 0 3px ${color}30` : "none",
            }}
          >
            <BrandIcon
              name={nodeIconName(n.type)}
              color={color}
              size={18}
            />
            <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: colors.text, lineHeight: 1.2 }}>{spec.label}</span>
              {(n.partitionKey?.trim() || n.replicas) && (
                <span
                  style={{
                    fontSize: 9.5,
                    color: colors.textFaint,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {[n.partitionKey?.trim(), n.replicas ? `×${n.replicas}` : null].filter(Boolean).join(" · ")}
                </span>
              )}
            </span>
            {STATEFUL_TYPES.includes(n.type) && (
              <button
                onPointerDown={(ev) => ev.stopPropagation()}
                onClick={(ev) => {
                  ev.stopPropagation();
                  setInspectingId((current) => (current === n.id ? null : n.id));
                }}
                title={t("node.inspect")}
                style={{
                  position: "absolute",
                  bottom: -16,
                  right: -16,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "none",
                  background: inspectingId === n.id ? colors.accent : colors.border,
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BrandIcon
                  name="maintenance"
                  color={inspectingId === n.id ? colors.onAccent : colors.textDim}
                  size={10}
                />
              </button>
            )}
            <button
              onPointerDown={(ev) => ev.stopPropagation()}
              onClick={(ev) => {
                ev.stopPropagation();
                removeNode(n.id);
              }}
              title={t("board.remove")}
              style={{
                position: "absolute",
                top: -16,
                right: -16,
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "none",
                background: colors.border,
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BrandIcon
                name="close"
                color={colors.textDim}
                size={10}
              />
            </button>
            {axisHandle("left")}
            {axisHandle("right")}
          </div>
        );
      })}
    </>
  );
}

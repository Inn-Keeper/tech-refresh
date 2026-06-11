import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Canvas, DashPathEffect, Group, Path } from "@shopify/react-native-skia";
import { Easing, runOnJS, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import type { BoardEdge, BoardNode } from "@tech-refresh/core/arch";
import { colors } from "@/theme";
import { NODE_H, NODE_W, NodeView } from "./NodeView";

const EDGE_COLOR = "#94a3b8";
const EDGE_TAP_TOLERANCE = 18;

type PendingEdge = { fromId: string; x: number; y: number };

type Props = {
  nodes: BoardNode[];
  edges: BoardEdge[];
  onMoveNode: (id: string, x: number, y: number) => void;
  onRemoveNode: (id: string) => void;
  onAddEdge: (fromId: string, toId: string) => void;
  onTapEdge: (id: string) => void;
};

type EdgeGeometry = { sx: number; sy: number; tx: number; ty: number; mx: number };

function edgeGeometry(a: BoardNode, b: BoardNode): EdgeGeometry {
  const sx = a.x + (b.x >= a.x ? NODE_W : 0);
  const sy = a.y + NODE_H / 2;
  const tx = b.x + (b.x >= a.x ? 0 : NODE_W);
  const ty = b.y + NODE_H / 2;
  return { sx, sy, tx, ty, mx: (sx + tx) / 2 };
}

function bezierPath({ sx, sy, tx, ty, mx }: EdgeGeometry): string {
  return `M ${sx} ${sy} C ${mx} ${sy} ${mx} ${ty} ${tx} ${ty}`;
}

function arrowheadPath({ tx, ty, mx }: EdgeGeometry): string {
  const direction = tx >= mx ? 1 : -1;
  const back = tx - 9 * direction;
  return `M ${tx} ${ty} L ${back} ${ty - 5} L ${back} ${ty + 5} Z`;
}

/** Distance from a tap to the closest of `samples` points along the bezier. */
function distanceToEdge(geometry: EdgeGeometry, px: number, py: number, samples = 16): number {
  const { sx, sy, tx, ty, mx } = geometry;
  let min = Infinity;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const u = 1 - t;
    // Cubic bezier with control points (mx, sy) and (mx, ty).
    const bx = u ** 3 * sx + 3 * u ** 2 * t * mx + 3 * u * t ** 2 * mx + t ** 3 * tx;
    const by = u ** 3 * sy + 3 * u ** 2 * t * sy + 3 * u * t ** 2 * ty + t ** 3 * ty;
    min = Math.min(min, Math.hypot(bx - px, by - py));
  }
  return min;
}

export function BoardCanvas({ nodes, edges, onMoveNode, onRemoveNode, onAddEdge, onTapEdge }: Props) {
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const [pending, setPending] = useState<PendingEdge | null>(null);

  // Marching-ants phase for the pending connector, looping on the UI thread.
  const dashPhase = useSharedValue(0);
  useEffect(() => {
    dashPhase.value = withRepeat(withTiming(-36, { duration: 700, easing: Easing.linear }), -1);
  }, [dashPhase]);

  const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]));

  const handleConnectEnd = (x: number, y: number) => {
    setPending(null);
    const target = nodes.find(
      (node) => x >= node.x && x <= node.x + NODE_W && y >= node.y && y <= node.y + NODE_H
    );
    if (target && pending && target.id !== pending.fromId) {
      onAddEdge(pending.fromId, target.id);
    }
  };

  const handleBoardTap = (px: number, py: number) => {
    for (const edge of edges) {
      const a = nodeById[edge.from];
      const b = nodeById[edge.to];
      if (!a || !b) continue;
      if (distanceToEdge(edgeGeometry(a, b), px, py) <= EDGE_TAP_TOLERANCE) {
        onTapEdge(edge.id);
        return;
      }
    }
  };

  const boardTap = Gesture.Tap().onEnd((event) => {
    runOnJS(handleBoardTap)(event.x, event.y);
  });

  const pendingGeometry = ((): EdgeGeometry | null => {
    if (!pending || pending.x === 0) return null;
    const source = nodeById[pending.fromId];
    if (!source) return null;
    const sx = source.x + NODE_W;
    const sy = source.y + NODE_H / 2;
    return { sx, sy, tx: pending.x, ty: pending.y, mx: (sx + pending.x) / 2 };
  })();

  return (
    <GestureDetector gesture={boardTap}>
      <View
        onLayout={(event) => setBoardSize(event.nativeEvent.layout)}
        style={{
          flex: 1,
          backgroundColor: "#13161f",
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <Canvas style={{ position: "absolute", width: "100%", height: "100%" }}>
          {edges.map((edge) => {
            const a = nodeById[edge.from];
            const b = nodeById[edge.to];
            if (!a || !b) return null;
            const geometry = edgeGeometry(a, b);
            return (
              <Group key={edge.id}>
                <Path path={bezierPath(geometry)} color={EDGE_COLOR} style="stroke" strokeWidth={2} />
                <Path path={arrowheadPath(geometry)} color={EDGE_COLOR} />
              </Group>
            );
          })}
          {pendingGeometry && (
            <Path path={bezierPath(pendingGeometry)} color={colors.accent} style="stroke" strokeWidth={2}>
              <DashPathEffect intervals={[10, 8]} phase={dashPhase} />
            </Path>
          )}
        </Canvas>

        {nodes.length === 0 && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.textFaint, fontSize: 13, textAlign: "center", paddingHorizontal: 24 }}>
              Add components below, drag to arrange,{"\n"}pull from a node's ● handle to wire them up.
            </Text>
          </View>
        )}

        {nodes.map((node) => (
          <NodeView
            key={node.id}
            node={node}
            boardSize={boardSize}
            onMove={onMoveNode}
            onRemove={onRemoveNode}
            onConnectStart={(fromId) => setPending({ fromId, x: 0, y: 0 })}
            onConnectMove={(x, y) => setPending((current) => (current ? { ...current, x, y } : current))}
            onConnectEnd={handleConnectEnd}
          />
        ))}
      </View>
    </GestureDetector>
  );
}

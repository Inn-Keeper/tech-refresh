import { useRef, useState } from "react";
import type React from "react";
import { NODE_H, NODE_W } from "./constants";
import { pointerToBoard } from "./boardGeometry.js";
import { activateConnection } from "./connectionState.js";
import type { BoardNode, ConnectDrag, DragRef } from "./types";

type Props = {
  nodes: BoardNode[];
  setNodes: (nodes: BoardNode[]) => void;
  addEdge: (from: string, to: string) => void;
  onDragEnd: (nodes: BoardNode[]) => void;
};

export function useBoardPointer({ nodes, setNodes, addEdge, onDragEnd }: Props) {
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [connectDrag, setConnectDrag] = useState<ConnectDrag | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragRef | null>(null);
  const connectDragRef = useRef<ConnectDrag | null>(null);
  const suppressClickRef = useRef(false);
  const dragFrameRef = useRef<number | null>(null);
  const pendingNodesRef = useRef<BoardNode[] | null>(null);

  const cancelConnection = () => {
    connectDragRef.current = null;
    setConnectDrag(null);
    setConnectFrom(null);
  };

  // Pointer coordinates include the canvas scroll offset.
  const canvasPoint = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      ...pointerToBoard({ x: e.clientX, y: e.clientY }, rect, {
        left: canvasRef.current?.scrollLeft ?? 0,
        top: canvasRef.current?.scrollTop ?? 0,
      }),
      rect,
    };
  };

  const nodeAtPoint = (x: number, y: number, sourceId: string) =>
    nodes.find((node) => {
      if (node.id === sourceId) return false;
      const inBody = x >= node.x && x <= node.x + NODE_W && y >= node.y && y <= node.y + NODE_H;
      const leftAxis = Math.hypot(x - node.x, y - (node.y + NODE_H / 2)) <= 16;
      const rightAxis = Math.hypot(x - (node.x + NODE_W), y - (node.y + NODE_H / 2)) <= 16;
      return inBody || leftAxis || rightAxis;
    });

  const nodeAxisPoint = (node: BoardNode, target: { x: number } | null = connectDrag) => {
    const targetX = target?.x ?? node.x + NODE_W;
    const useRight = targetX >= node.x + NODE_W / 2;
    return { x: node.x + (useRight ? NODE_W : 0), y: node.y + NODE_H / 2 };
  };

  // Shift-drag connects nodes without moving them.
  const startConnectionDrag = (e: React.PointerEvent, n: BoardNode) => {
    const point = canvasPoint(e);
    if (!point) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setConnectFrom(n.id);
    const next = { from: n.id, x: point.x, y: point.y, moved: false };
    connectDragRef.current = next;
    setConnectDrag(next);
  };

  const updateConnectionDrag = (e: React.PointerEvent) => {
    const point = canvasPoint(e);
    if (!point) return;
    const current = connectDragRef.current;
    if (!current) return;
    const next = { ...current, x: point.x, y: point.y, moved: true };
    connectDragRef.current = next;
    setConnectDrag(next);
  };

  const finishConnectionDrag = (e: React.PointerEvent) => {
    const current = connectDragRef.current;
    const point = canvasPoint(e);
    if (current && point) {
      const target = nodeAtPoint(point.x, point.y, current.from);
      if (target) addEdge(current.from, target.id);
    }
    connectDragRef.current = null;
    setConnectDrag(null);
    setConnectFrom(null);
    suppressClickRef.current = true;
  };

  // Node movement is painted once per animation frame.
  const onNodePointerDown = (e: React.PointerEvent, n: BoardNode) => {
    if (e.shiftKey) {
      startConnectionDrag(e, n);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = canvasPoint(e);
    if (!point) return;
    dragRef.current = { id: n.id, dx: point.x - n.x, dy: point.y - n.y, moved: false };
  };

  const onNodePointerMove = (e: React.PointerEvent) => {
    if (connectDragRef.current) {
      updateConnectionDrag(e);
      return;
    }
    const d = dragRef.current;
    if (!d) return;
    const point = canvasPoint(e);
    if (!point) return;
    const x = Math.max(0, Math.min(point.rect.width - NODE_W, point.x - d.dx));
    const y = Math.max(0, Math.min(point.rect.height - NODE_H, point.y - d.dy));
    d.moved = true;
    const source = pendingNodesRef.current ?? nodes;
    pendingNodesRef.current = source.map((n) => (n.id === d.id ? { ...n, x, y } : n));
    if (dragFrameRef.current === null)
      dragFrameRef.current = window.requestAnimationFrame(() => {
        if (pendingNodesRef.current) setNodes(pendingNodesRef.current);
        dragFrameRef.current = null;
      });
  };

  const onNodePointerUp = (e: React.PointerEvent) => {
    if (connectDragRef.current) {
      finishConnectionDrag(e);
      return;
    }
    if (dragRef.current?.moved) {
      suppressClickRef.current = true;
      if (dragFrameRef.current !== null) window.cancelAnimationFrame(dragFrameRef.current);
      const finalNodes = pendingNodesRef.current ?? nodes;
      setNodes(finalNodes);
      onDragEnd(finalNodes);
    }
    dragFrameRef.current = null;
    pendingNodesRef.current = null;
    dragRef.current = null;
  };

  // Ignore the click emitted after a completed drag.
  const onNodeClick = (n: BoardNode) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    const next = activateConnection(connectFrom, n.id);
    if (next.edge) addEdge(next.edge.from, next.edge.to);
    setConnectFrom(next.sourceId);
  };

  return {
    connectFrom,
    setConnectFrom,
    connectDrag,
    canvasRef,
    dragRef,
    connectDragRef,
    suppressClickRef,
    dragFrameRef,
    pendingNodesRef,
    cancelConnection,
    nodeAxisPoint,
    startConnectionDrag,
    updateConnectionDrag,
    finishConnectionDrag,
    onNodePointerDown,
    onNodePointerMove,
    onNodePointerUp,
    onNodeClick,
  };
}

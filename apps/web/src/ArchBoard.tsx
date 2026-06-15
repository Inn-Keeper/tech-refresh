import React, { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TYPE_COLORS, meta, SCENARIOS, SCENARIO_CATEGORIES, evaluate } from "@tech-refresh/core/arch";
import { t } from "@tech-refresh/core/i18n";
import * as api from "./api";
import { colors, layout } from "@tech-refresh/core/tokens";
import { BrandIcon, nodeIconName } from "./BrandIcon";
import { Combobox } from "./Combobox";
import { CATEGORY_ICONS, CUSTOM_CATEGORY, NODE_H, NODE_W } from "./archBoard/constants";
import { EvalResults } from "./archBoard/EvalResults";
import { NodePalette } from "./archBoard/NodePalette";
import { SavedBoards } from "./archBoard/SavedBoards";
import { ScenarioForm } from "./archBoard/ScenarioForm";
import type { AugmentedScenario, BoardEdge, BoardNode, ConnectDrag, DragRef, SavedBoard } from "./archBoard/types";

export default function ArchBoard() {
  const [scenarioId, setScenarioId] = useState<string>((SCENARIOS[0] as AugmentedScenario).id);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [nodes, setNodes] = useState<BoardNode[]>([]);
  const [edges, setEdges] = useState<BoardEdge[]>([]);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [connectDrag, setConnectDrag] = useState<ConnectDrag | null>(null);
  const [result, setResult] = useState<ReturnType<typeof evaluate> | null>(null);
  const [savedOpen, setSavedOpen] = useState(false);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [activeBoardTitle, setActiveBoardTitle] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragRef | null>(null);
  const connectDragRef = useRef<ConnectDrag | null>(null);
  const suppressClickRef = useRef(false);

  const { data: customScenarios = [] } = useQuery({
    queryKey: ["custom-scenarios"],
    queryFn: api.listCustomScenarios,
  });
  const allScenarios: AugmentedScenario[] = [
    ...(SCENARIOS as AugmentedScenario[]),
    ...customScenarios.map((s) => ({ ...s, category: CUSTOM_CATEGORY, custom: true })),
  ];
  const scenarioOptions = [...SCENARIO_CATEGORIES, CUSTOM_CATEGORY]
    .map((category) => ({
      label: category,
      options: allScenarios
        .filter((s) => s.category === category)
        .map((s) => ({ value: s.id, label: s.name })),
    }))
    .filter((group) => group.options.length > 0);
  const scenario: AugmentedScenario = allScenarios.find((s) => s.id === scenarioId) ?? (SCENARIOS[0] as AugmentedScenario);
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const { data: savedBoards = [], error: boardsError } = useQuery({
    queryKey: ["arch-boards"],
    queryFn: api.listBoards,
  });
  const invalidateBoards = () => queryClient.invalidateQueries({ queryKey: ["arch-boards"] });
  const invalidateCustomScenarios = () => queryClient.invalidateQueries({ queryKey: ["custom-scenarios"] });
  const saveBoardMutation = useMutation({
    mutationFn: () =>
      api.upsertBoard({
        id: activeBoardId ?? undefined,
        title: activeBoardTitle ?? t("board.draftTitle", { scenario: scenario.name }),
        scenarioId: scenario.id,
        nodes,
        edges,
      }),
    onSuccess: (board: { id?: string; title: string }) => {
      setActiveBoardId(board.id ?? null);
      setActiveBoardTitle(board.title);
      invalidateBoards();
    },
  });
  const deleteBoardMutation = useMutation({
    mutationFn: api.deleteBoard,
    onSuccess: (_data: unknown, id: string) => {
      if (id === activeBoardId) {
        setActiveBoardId(null);
        setActiveBoardTitle(null);
      }
      invalidateBoards();
    },
  });
  const saveScenarioMutation = useMutation({
    mutationFn: api.upsertCustomScenario,
    onSuccess: (saved: object) => {
      invalidateCustomScenarios();
      setCreatorOpen(false);
      switchScenario((saved as { id: string }).id);
    },
  });
  const deleteScenarioMutation = useMutation({
    mutationFn: api.deleteCustomScenario,
    onSuccess: (_data: unknown, id: string) => {
      invalidateCustomScenarios();
      if (id === scenarioId) switchScenario((SCENARIOS[0] as AugmentedScenario).id);
    },
  });

  const cancelConnection = () => {
    connectDragRef.current = null;
    setConnectDrag(null);
    setConnectFrom(null);
  };

  const loadBoard = (board: SavedBoard) => {
    if (!allScenarios.some((item) => item.id === board.scenarioId)) {
      window.alert(t("board.unknownScenarioMessage", { scenarioId: board.scenarioId }));
      return;
    }
    setScenarioId(board.scenarioId);
    setNodes(board.nodes);
    setEdges(board.edges);
    cancelConnection();
    setResult(null);
    setActiveBoardId(board.id ?? null);
    setActiveBoardTitle(board.title);
    setSavedOpen(false);
  };
  const liveCost = nodes.reduce((s, n) => s + meta(n.type).cost, 0);
  const liveMaint = nodes.reduce((s, n) => s + meta(n.type).maint, 0);

  const switchScenario = (id: string) => {
    setScenarioId(id);
    setNodes([]);
    setEdges([]);
    cancelConnection();
    setResult(null);
    setActiveBoardId(null);
    setActiveBoardTitle(null);
  };

  const addNode = (type: string) => {
    const i = nodes.length;
    setNodes([
      ...nodes,
      { id: crypto.randomUUID(), type, x: 30 + (i % 5) * 155, y: 30 + Math.floor(i / 5) * 95 },
    ]);
    setResult(null);
  };

  const removeNode = (id: string) => {
    setNodes(nodes.filter((n) => n.id !== id));
    setEdges(edges.filter((e) => e.from !== id && e.to !== id));
    if (connectFrom === id || connectDrag?.from === id) cancelConnection();
    setResult(null);
  };

  const addEdge = (from: string, to: string) => {
    if (from === to || edges.some((e) => e.from === from && e.to === to)) return;
    setEdges([...edges, { id: crypto.randomUUID(), from, to }]);
    setResult(null);
  };

  const removeEdge = (id: string) => {
    setEdges(edges.filter((e) => e.id !== id));
    setResult(null);
  };

  const canvasPoint = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, rect };
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
    setNodes((prev) => prev.map((n) => (n.id === d.id ? { ...n, x, y } : n)));
  };

  const onNodePointerUp = (e: React.PointerEvent) => {
    if (connectDragRef.current) {
      finishConnectionDrag(e);
      return;
    }
    if (dragRef.current?.moved) suppressClickRef.current = true;
    dragRef.current = null;
  };

  const onNodeClick = (n: BoardNode) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (connectFrom && connectFrom !== n.id) {
      addEdge(connectFrom, n.id);
      cancelConnection();
    } else if (connectFrom === n.id) {
      cancelConnection();
    }
  };

  return (
    <main style={{ minHeight: `calc(100vh - ${layout.webHeaderHeight}px)`, width: "100%", padding: "32px 32px 56px", boxSizing: "border-box" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", color: colors.textBright }}>
        Arch Board
      </h1>
      <p style={{ margin: "0 0 16px", color: colors.textFaint, fontSize: 13 }}>
        Pick a scenario, drag components onto the canvas, then wire them with arrows. Click a node's side axis handle
        then a target, or hold Shift and drag from one node axis to another.
      </p>

      {/* Scenario picker */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <BrandIcon name={CATEGORY_ICONS[scenario.category ?? ""] ?? "board"} color={colors.accentBright} size={16} />
        <Combobox
          value={scenario.id}
          options={scenarioOptions}
          onChange={switchScenario}
          style={{ flex: 1, minWidth: 260 }}
          triggerStyle={{ padding: "9px 12px", fontWeight: 600 }}
        />
        <span style={{ fontSize: 11, color: colors.textFaint, fontWeight: 600 }}>
          {allScenarios.length} scenarios
        </span>
        {scenario.custom && (
          <button
            onClick={() => window.confirm(`Delete scenario "${scenario.name}"?`) && deleteScenarioMutation.mutate(scenario.id)}
            style={{
              padding: "7px 14px", background: "transparent", border: `1px solid ${colors.danger}50`,
              borderRadius: 8, color: colors.dangerBright, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            {t("common.delete")}
          </button>
        )}
        <button
          onClick={() => setCreatorOpen((value) => !value)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "7px 14px", background: "transparent",
            border: `1px solid ${creatorOpen ? colors.accent : `${colors.accent}60`}`,
            borderRadius: 8, color: colors.accentBright, fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          <BrandIcon name="board" color={colors.accentBright} size={13} />
          New scenario
        </button>
      </div>

      {creatorOpen && (
        <ScenarioForm
          onSave={(form) => saveScenarioMutation.mutate(form)}
          onCancel={() => setCreatorOpen(false)}
          saving={saveScenarioMutation.isPending}
          error={saveScenarioMutation.error}
        />
      )}

      {scenario.brief && (
        <div
          style={{
            padding: "12px 16px", background: colors.well, border: `1px solid ${colors.border}`,
            borderRadius: 10, marginBottom: 14, fontSize: 13, lineHeight: 1.6, color: colors.textDim,
          }}
        >
          {scenario.brief}
        </div>
      )}

      {/* Live cost ticker + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: liveCost > scenario.budget ? colors.danger : colors.textDim }}>
          <BrandIcon name="cost" color={liveCost > scenario.budget ? colors.danger : colors.textDim} size={14} />
          Cost {liveCost} / budget {scenario.budget}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: colors.textDim }}>
          <BrandIcon name="maintenance" color={colors.textDim} size={14} />
          Maintenance load {liveMaint}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => setSavedOpen((value) => !value)}
            style={{
              padding: "7px 14px", background: "transparent", border: `1px solid ${savedOpen ? colors.accent : colors.border}`,
              borderRadius: 8, color: savedOpen ? colors.accentBright : colors.textDim, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            {t("board.saved")} ({savedBoards.length})
          </button>
          <button
            onClick={() => saveBoardMutation.mutate()}
            disabled={saveBoardMutation.isPending}
            style={{
              padding: "7px 14px", background: "transparent", border: `1px solid ${colors.success}60`,
              borderRadius: 8, color: colors.successBright, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            {saveBoardMutation.isPending ? t("common.saving") : t("common.save")}
          </button>
          <button
            onClick={() => { setNodes([]); setEdges([]); cancelConnection(); setResult(null); setActiveBoardId(null); setActiveBoardTitle(null); }}
            style={{
              padding: "7px 14px", background: "transparent", border: `1px solid ${colors.border}`,
              borderRadius: 8, color: colors.textDim, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            Clear board
          </button>
          <button
            onClick={() => setResult(evaluate(scenario as Parameters<typeof evaluate>[0], nodes, edges))}
            disabled={nodes.length === 0}
            style={{
              padding: "7px 16px", background: colors.accent, border: "none", borderRadius: 8,
              color: colors.onAccent, fontSize: 12, fontWeight: 600,
              cursor: nodes.length ? "pointer" : "not-allowed", opacity: nodes.length ? 1 : 0.5,
            }}
          >
            Evaluate design
          </button>
        </div>
      </div>


      {(saveBoardMutation.error || deleteBoardMutation.error || deleteScenarioMutation.error || boardsError) && (
        <p style={{ margin: "0 0 10px", fontSize: 12, color: colors.dangerBright }}>
          {saveBoardMutation.error
            ? `${t("board.saveFailedTitle")}: ${saveBoardMutation.error.message}`
            : deleteBoardMutation.error
              ? `Delete failed: ${deleteBoardMutation.error.message}`
              : deleteScenarioMutation.error
                ? `Delete failed: ${deleteScenarioMutation.error.message}`
                : t("board.boardsError", { message: (boardsError as Error).message })}
        </p>
      )}

      {savedOpen && (
        <SavedBoards
          activeBoardId={activeBoardId}
          allScenarios={allScenarios}
          boards={savedBoards}
          onDelete={(id) => deleteBoardMutation.mutate(id)}
          onLoad={loadBoard}
        />
      )}

      <div style={{ display: "flex", gap: 14, alignItems: "stretch", flexWrap: "wrap" }}>
        <NodePalette onAddNode={addNode} />

        {/* Canvas */}
        <div
          ref={canvasRef}
          onPointerMove={(e) => { if (connectDragRef.current) updateConnectionDrag(e); }}
          onPointerUp={(e) => { if (connectDragRef.current) finishConnectionDrag(e); }}
          onClick={(e) => { if (e.target === canvasRef.current) cancelConnection(); }}
          style={{
            position: "relative", flex: 1, minWidth: 480, height: "calc(100vh - 360px)", minHeight: 560,
            background: colors.bgDeep,
            backgroundImage: `radial-gradient(${colors.border} 1px, transparent 1px)`,
            backgroundSize: "22px 22px",
            border: `1px solid ${colors.border}`, borderRadius: 14, overflow: "hidden",
          }}
        >
          {nodes.length === 0 && (
            <div
              style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center",
                justifyContent: "center", color: colors.textFaint, fontSize: 13, pointerEvents: "none",
              }}
            >
              Add components from the palette, then click or Shift-drag between node axis handles to wire them up.
            </div>
          )}

          {/* Edges */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={colors.textDim} />
              </marker>
            </defs>
            {edges.map((e) => {
              const a = nodeById[e.from];
              const b = nodeById[e.to];
              if (!a || !b) return null;
              const sx = a.x + (b.x >= a.x ? NODE_W : 0);
              const sy = a.y + NODE_H / 2;
              const tx = b.x + (b.x >= a.x ? 0 : NODE_W);
              const ty = b.y + NODE_H / 2;
              const mx = (sx + tx) / 2;
              const d = `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`;
              return (
                <g key={e.id}>
                  <path d={d} fill="none" stroke={colors.textDim} strokeWidth="2" markerEnd="url(#arrow)" />
                  <path
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="14"
                    style={{ pointerEvents: "stroke", cursor: "pointer" }}
                    onClick={() => removeEdge(e.id)}
                  >
                    <title>Click to remove this connection</title>
                  </path>
                </g>
              );
            })}
            {connectDrag && (() => {
              const fromNode = nodeById[connectDrag.from];
              if (!fromNode) return null;
              const start = nodeAxisPoint(fromNode, connectDrag);
              const mx = (start.x + connectDrag.x) / 2;
              const d = `M ${start.x} ${start.y} C ${mx} ${start.y}, ${mx} ${connectDrag.y}, ${connectDrag.x} ${connectDrag.y}`;
              return <path d={d} fill="none" stroke={colors.accentBright} strokeWidth="2" strokeDasharray="5 5" markerEnd="url(#arrow)" />;
            })()}
          </svg>

          {/* Nodes */}
          {nodes.map((n) => {
            const t = meta(n.type);
            const color = TYPE_COLORS[n.type];
            const isSource = connectFrom === n.id;
            const axisHandle = (side: string) => (
              <button
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
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    return;
                  }
                  setConnectFrom(isSource ? null : n.id);
                }}
                title={isSource ? "Cancel connection" : "Connect from here, or hold Shift and drag to another node axis"}
                style={{
                  position: "absolute",
                  [side]: -9,
                  top: NODE_H / 2 - 9,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: `2px solid ${colors.bgDeep}`,
                  background: color,
                  cursor: "crosshair",
                  padding: 0,
                }}
              />
            );
            return (
              <div
                key={n.id}
                onPointerDown={(e) => onNodePointerDown(e, n)}
                onPointerMove={onNodePointerMove}
                onPointerUp={onNodePointerUp}
                onClick={() => onNodeClick(n)}
                style={{
                  position: "absolute", left: n.x, top: n.y, width: NODE_W, height: NODE_H,
                  boxSizing: "border-box",
                  background: colors.surface,
                  border: `2px solid ${isSource ? colors.textBright : `${color}60`}`,
                  borderRadius: 10, cursor: "grab", touchAction: "none", userSelect: "none",
                  display: "flex", alignItems: "center", gap: 8, padding: "0 10px",
                  boxShadow: isSource ? `0 0 0 3px ${color}30` : "none",
                }}
              >
                <BrandIcon name={nodeIconName(n.type)} color={color} size={18} />
                <span style={{ fontSize: 11, fontWeight: 600, color: colors.text, lineHeight: 1.2 }}>{t.label}</span>
                <button
                  onPointerDown={(ev) => ev.stopPropagation()}
                  onClick={(ev) => { ev.stopPropagation(); removeNode(n.id); }}
                  title="Remove"
                  style={{
                    position: "absolute", top: -8, right: -8, width: 18, height: 18,
                    borderRadius: "50%", border: "none", background: colors.border,
                    cursor: "pointer", padding: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <BrandIcon name="close" color={colors.textDim} size={10} />
                </button>
                {axisHandle("left")}
                {axisHandle("right")}
              </div>
            );
          })}
        </div>
      </div>

      {result && <EvalResults result={result} scenario={scenario} />}
    </main>
  );
}

import React, { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NODE_TYPES, TYPE_COLORS, meta, SCENARIOS, SCENARIO_CATEGORIES, buildCustomChecks, evaluate } from "@tech-refresh/core/arch";
import { t } from "@tech-refresh/core/i18n";
import * as api from "./api";
import { colors, layout } from "@tech-refresh/core/tokens";
import { BrandIcon, nodeIconName } from "./BrandIcon";
import { Combobox } from "./Combobox";

type BoardNode = { id: string; type: string; x: number; y: number };
type BoardEdge = { id: string; from: string; to: string };
type ConnectDrag = { from: string; x: number; y: number; moved: boolean };
type DragRef = { id: string; dx: number; dy: number; moved: boolean };
// Augmented scenario type: the base Scenario from core plus optional UI-only fields.
type AugmentedScenario = { id: string; name: string; brief: string; budget: number; checks: object[]; warnings?: object[]; category?: string; custom?: boolean };

const NODE_W = 132;
const NODE_H = 54;

const CUSTOM_CATEGORY = "My scenarios";

// Evaluation verdict bands (score %) and maintenance-load bands (sum of node maint).
const SHIP_SCORE = 80;
const REVIEW_SCORE = 50;
const MAINT_LEAN_MAX = 8;
const MAINT_MODERATE_MAX = 14;

const CATEGORY_ICONS: Record<string, string> = {
  Commerce: "cost",
  Fintech: "payment",
  Social: "contact",
  Realtime: "spark",
  "Content & Media": "cloud",
  "Data & Analytics": "accuracy",
  Infrastructure: "gateway",
  "Mobility & Logistics": "globe",
  Gaming: "drill",
  "B2B SaaS": "service",
  [CUSTOM_CATEGORY]: "board",
};

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

  const loadBoard = (board: { id?: string; title: string; scenarioId: string; nodes: BoardNode[]; edges: BoardEdge[] }) => {
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
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 12 }}>
          {savedBoards.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: colors.textFaint }}>{t("board.savedEmpty")}</p>
          ) : (
            savedBoards.map((board) => {
              const boardScenario = allScenarios.find((item) => item.id === board.scenarioId);
              const active = board.id === activeBoardId;
              return (
                <div
                  key={board.id}
                  style={{
                    minWidth: 220, padding: "10px 12px", background: colors.well,
                    border: `1px solid ${active ? colors.accent : colors.border}`, borderRadius: 10,
                    display: "flex", flexDirection: "column", gap: 6,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.textBright, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {board.title}
                  </span>
                  <span style={{ fontSize: 10.5, color: colors.textFaint }}>
                    {t("board.boardMeta", { scenario: boardScenario?.name ?? board.scenarioId, nodes: board.nodes.length, edges: board.edges.length })}
                  </span>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button
                      onClick={() => loadBoard(board)}
                      style={{ padding: "3px 10px", background: "transparent", border: `1px solid ${colors.accent}60`, borderRadius: 6, color: colors.accentBright, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                    >
                      {t("common.load")}
                    </button>
                    <button
                      onClick={() => board.id && window.confirm(t("board.deleteMessage", { title: board.title })) && deleteBoardMutation.mutate(board.id)}
                      style={{ padding: "3px 10px", background: "transparent", border: `1px solid ${colors.danger}50`, borderRadius: 6, color: colors.dangerBright, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 14, alignItems: "stretch", flexWrap: "wrap" }}>
        {/* Palette */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 170 }}>
          {NODE_TYPES.map((t) => (
            <button
              key={t.type}
              onClick={() => addNode(t.type)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                background: colors.surface, border: `1px solid ${TYPE_COLORS[t.type]}40`,
                borderRadius: 8, color: colors.text, fontSize: 12, fontWeight: 600,
                cursor: "pointer", textAlign: "left",
              }}
              title={`cost ${t.cost} · maint ${t.maint}`}
            >
              <BrandIcon name={nodeIconName(t.type)} color={TYPE_COLORS[t.type]} size={16} />
              <span style={{ flex: 1 }}>{t.label}</span>
              <span style={{ color: colors.textFaint, fontSize: 10 }}>{"$".repeat(t.cost) || "free"}</span>
            </button>
          ))}
        </div>

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

      {/* Evaluation results */}
      {result && (
        <div
          style={{
            marginTop: 16, padding: "18px 20px", background: colors.well,
            border: `1px solid ${colors.border}`, borderRadius: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: result.score >= SHIP_SCORE ? colors.success : result.score >= REVIEW_SCORE ? colors.warning : colors.danger }}>
              {result.score}%
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: colors.textBright }}>
              {result.score >= SHIP_SCORE ? t("board.verdictShip") : result.score >= REVIEW_SCORE ? t("board.verdictReview") : t("board.verdictWhiteboard")}
            </span>
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: colors.textDim }}>
              <BrandIcon name="cost" color={colors.textDim} size={14} />
              {result.cost}/{scenario.budget} ·
              <BrandIcon name="maintenance" color={colors.textDim} size={14} />
              maint {result.maint} ({result.maint <= MAINT_LEAN_MAX ? "lean" : result.maint <= MAINT_MODERATE_MAX ? "moderate" : "heavy"})
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.textDim, marginBottom: 8, letterSpacing: "0.04em" }}>
                DESIGN CHECKS
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {result.checks.map((c) => (
                  <li key={c.label} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12.5, lineHeight: 1.5, color: c.passed ? colors.successBright : colors.dangerBright }}>
                    <BrandIcon name={c.passed ? "check" : "error"} color={c.passed ? colors.successBright : colors.dangerBright} size={14} />
                    <span style={{ flex: 1 }}>
                      {c.label} <span style={{ color: colors.textFaint }}>({c.points} pts)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {result.warnings.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.textDim, marginBottom: 8, letterSpacing: "0.04em" }}>
                  MEETING NOTES
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                  {result.warnings.map((w) => (
                    <li key={w} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12.5, lineHeight: 1.5, color: colors.warningBright }}>
                      <BrandIcon name="warning" color={colors.warningBright} size={14} />
                      <span style={{ flex: 1 }}>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

// Authoring form for custom scenarios: requirements are picked from the
// palette and compiled into evaluator checks via buildCustomChecks.
type ScenarioFormProps = { onSave: (form: object) => void; onCancel: () => void; saving: boolean; error: Error | null };
function ScenarioForm({ onSave, onCancel, saving, error }: ScenarioFormProps) {
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [budget, setBudget] = useState(12);
  const [requiredNodes, setRequiredNodes] = useState<string[]>([]);
  const [requiredEdges, setRequiredEdges] = useState<{ from: string; to: string }[]>([]);

  const inputStyle: React.CSSProperties = {
    boxSizing: "border-box", padding: "8px 10px",
    background: colors.bgDeep, border: `1px solid ${colors.border}`, borderRadius: 8,
    color: colors.text, fontSize: 13, outline: "none", fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: colors.textFaint, letterSpacing: "0.03em" };

  const toggleNode = (type: string) =>
    setRequiredNodes((prev) => (prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type]));
  const setEdgeAt = (index: number, side: string, value: string) =>
    setRequiredEdges((prev) => prev.map((e, i) => (i === index ? { ...e, [side]: value } : e)));
  const nodeTypeOptions = NODE_TYPES.map((spec) => ({ value: spec.type, label: spec.label, color: TYPE_COLORS[spec.type] }));

  const canSave = name.trim() && (requiredNodes.length > 0 || requiredEdges.length > 0);

  const save = () =>
    onSave({
      name: name.trim(),
      brief: brief.trim(),
      budget,
      checks: buildCustomChecks(requiredNodes, requiredEdges),
    });

  return (
    <div
      style={{
        marginBottom: 14, padding: "16px 18px", background: colors.surface,
        border: `1px solid ${colors.accent}60`, borderRadius: 12,
        display: "flex", flexDirection: "column", gap: 12,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={labelStyle}>Name *</span>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ticketing webhook storm" autoFocus />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={labelStyle}>Budget (sum of component costs)</span>
          <input
            style={inputStyle}
            type="number"
            min={4}
            max={30}
            value={budget}
            onChange={(e) => setBudget(Math.max(4, Math.min(30, Number(e.target.value) || 4)))}
          />
        </label>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={labelStyle}>Brief — the problem statement you'd get in the interview</span>
        <textarea
          style={{ ...inputStyle, minHeight: 52, resize: "vertical" as const, lineHeight: 1.5 }}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
        />
      </label>

      <div>
        <div style={{ ...labelStyle, marginBottom: 6 }}>Required components — each is a scored check</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {NODE_TYPES.map((spec) => {
            const active = requiredNodes.includes(spec.type);
            return (
              <button
                key={spec.type}
                onClick={() => toggleNode(spec.type)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 10px", borderRadius: 16, cursor: "pointer",
                  border: `1px solid ${active ? TYPE_COLORS[spec.type] : colors.border}`,
                  background: active ? `${TYPE_COLORS[spec.type]}25` : "transparent",
                  color: active ? colors.text : colors.textDim, fontSize: 11, fontWeight: 600,
                }}
              >
                <BrandIcon name={nodeIconName(spec.type)} color={TYPE_COLORS[spec.type]} size={12} />
                {spec.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ ...labelStyle, marginBottom: 6 }}>Required connections — scored when the edge exists</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {requiredEdges.map((e, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Combobox value={e.from} options={nodeTypeOptions} onChange={(value) => setEdgeAt(i, "from", value)} style={{ flex: 1 }} />
              <BrandIcon name="arrowRight" color={colors.textFaint} size={12} />
              <Combobox value={e.to} options={nodeTypeOptions} onChange={(value) => setEdgeAt(i, "to", value)} style={{ flex: 1 }} />
              <button
                onClick={() => setRequiredEdges((prev) => prev.filter((_, j) => j !== i))}
                title="Remove connection"
                style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", padding: 4 }}
              >
                <BrandIcon name="close" color={colors.textFaint} size={11} />
              </button>
            </div>
          ))}
          <button
            onClick={() => setRequiredEdges((prev) => [...prev, { from: "client", to: "service" }])}
            style={{
              alignSelf: "flex-start", padding: "5px 12px", background: "transparent",
              border: `1px solid ${colors.border}`, borderRadius: 8,
              color: colors.textDim, fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}
          >
            Add connection
          </button>
        </div>
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: 12, color: colors.dangerBright }}>Save failed: {error.message}</p>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            padding: "7px 14px", background: "transparent", border: `1px solid ${colors.border}`,
            borderRadius: 8, color: colors.textDim, fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          {t("common.cancel")}
        </button>
        <button
          onClick={save}
          disabled={!canSave || saving}
          style={{
            padding: "7px 16px", background: colors.accent, border: "none", borderRadius: 8,
            color: colors.onAccent, fontSize: 12, fontWeight: 600,
            cursor: canSave && !saving ? "pointer" : "not-allowed", opacity: canSave && !saving ? 1 : 0.5,
          }}
        >
          {saving ? t("common.saving") : "Save scenario"}
        </button>
      </div>
    </div>
  );
}

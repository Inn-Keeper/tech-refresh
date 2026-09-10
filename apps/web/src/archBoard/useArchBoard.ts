import { useEffect, useMemo, useRef, useState } from "react";
import { meta, SCENARIOS, SCENARIO_CATEGORIES, evaluate } from "@tech-refresh/core/arch";
import { t } from "@tech-refresh/core/i18n";
import { emptyTalkTrack, scoreTalkTrack } from "@tech-refresh/core/talkTrack";

import { CUSTOM_CATEGORY, NODE_H, NODE_W } from "./constants";
import { findPlacement } from "./boardGeometry.js";
import { commitSnapshot, createHistory, redo, sameSnapshot, undo } from "./editorState.js";
import { workflowStep } from "./workflowState.js";
import {
  useCustomScenariosQuery,
  useDeleteBoardMutation,
  useDeleteScenarioMutation,
  useSaveBoardMutation,
  useSavedBoardsQuery,
  useLoadBoard,
  useSaveScenarioMutation,
} from "./queries";
import type {
  AugmentedScenario,
  BoardEdge,
  BoardHistory,
  BoardNode,
  BoardSnapshot,
  BoardSummary,
  SavedBoard,
} from "./types";

import { useBoardPointer } from "./useBoardPointer";

export function useArchBoard() {
  // Board content and evaluation.
  const [scenarioId, setScenarioId] = useState<string>((SCENARIOS[0] as AugmentedScenario).id);
  const [creatorOpen, setCreatorOpen] = useState(false);

  const [nodes, setNodes] = useState<BoardNode[]>([]);
  const [edges, setEdges] = useState<BoardEdge[]>([]);
  const [inspectingId, setInspectingId] = useState<string | null>(null);
  const [inspectingEdgeId, setInspectingEdgeId] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof evaluate> | null>(null);

  // Panel visibility and talk-track input.
  const [savedOpen, setSavedOpen] = useState(false);
  const [talkOpen, setTalkOpen] = useState(false);
  const [talkSections, setTalkSections] = useState<Record<string, string>>(emptyTalkTrack);
  const [talkRating, setTalkRating] = useState<number | null>(null);
  const [talkGrade, setTalkGrade] = useState<number | null>(null);

  // Saved identity and undo checkpoints.
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [activeBoardTitle, setActiveBoardTitle] = useState<string | null>(null);
  const historyRef = useRef<BoardHistory | null>(null);
  const savedSnapshotRef = useRef<BoardSnapshot | null>(null);
  const submittedSnapshotRef = useRef<BoardSnapshot | null>(null);
  const [, renderHistory] = useState(0);

  // Built-in and custom scenario choices.
  const { data: customScenarios = [], error: scenariosError } = useCustomScenariosQuery();
  const allScenarios: AugmentedScenario[] = useMemo(
    () => [
      ...(SCENARIOS as AugmentedScenario[]),
      ...customScenarios.map((s) => ({ ...s, category: CUSTOM_CATEGORY, custom: true })),
    ],
    [customScenarios],
  );
  const scenarioOptions = useMemo(
    () =>
      [...SCENARIO_CATEGORIES, CUSTOM_CATEGORY]
        .map((category) => ({
          label: category,
          options: allScenarios.filter((s) => s.category === category).map((s) => ({ value: s.id, label: s.name })),
        }))
        .filter((group) => group.options.length > 0),
    [allScenarios],
  );
  const scenario: AugmentedScenario =
    allScenarios.find((s) => s.id === scenarioId) ?? (SCENARIOS[0] as AugmentedScenario);
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const snapshot = (): BoardSnapshot => ({ scenarioId, nodes, edges, talkSections, talkRating, talkGrade });

  /** A fresh board on the given scenario — the shape `snapshot()` returns, emptied. */
  const emptySnapshot = (id: string): BoardSnapshot => ({
    scenarioId: id,
    nodes: [],
    edges: [],
    talkSections: emptyTalkTrack(),
    talkRating: null,
    talkGrade: null,
  });

  /** Makes `next` the new undo baseline and the point the dirty check measures from. */
  const rebase = (next: BoardSnapshot) => {
    historyRef.current = createHistory(next);
    savedSnapshotRef.current = next;
  };

  if (!historyRef.current) rebase(snapshot());

  const isDirty = !sameSnapshot(snapshot(), savedSnapshotRef.current);
  const activeWorkflowStep = workflowStep(nodes.length, edges.length);

  // Protect dirty drafts when leaving the editor.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    const guardNavigation = (event: Event) => {
      if (!window.confirm("Discard unsaved changes?")) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("grip:navigate", guardNavigation);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("grip:navigate", guardNavigation);
    };
  }, [isDirty]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const editable =
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName));
      if (editable) return;
      if (event.key === "Escape") cancelConnection();
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        applyHistory(event.shiftKey ? redo(historyRef.current) : undo(historyRef.current));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // Persistence callbacks keep the active draft in sync.
  const {
    data: savedBoards = [],
    error: boardsError,
    isLoading: boardsLoading,
    refetch: retryBoards,
  } = useSavedBoardsQuery(savedOpen);
  const fetchBoard = useLoadBoard();
  const saveBoardMutation = useSaveBoardMutation((board) => {
    setActiveBoardId(board.id ?? null);
    setActiveBoardTitle(board.title);
    // Edits made while saving must remain dirty.
    savedSnapshotRef.current = submittedSnapshotRef.current;
    renderHistory((value) => value + 1);
  });
  const deleteBoardMutation = useDeleteBoardMutation((id) => {
    if (id === activeBoardId) {
      setActiveBoardId(null);
      setActiveBoardTitle(null);
    }
  });
  const saveScenarioMutation = useSaveScenarioMutation((saved) => {
    setCreatorOpen(false);
    switchScenario(saved.id);
  });
  const deleteScenarioMutation = useDeleteScenarioMutation((id) => {
    if (id === scenarioId) switchScenario((SCENARIOS[0] as AugmentedScenario).id);
  });

  // Undo and redo restore the full editable snapshot.
  const applySnapshot = (value: BoardSnapshot) => {
    setScenarioId(value.scenarioId);
    setNodes(value.nodes);
    setEdges(value.edges);
    setTalkSections(value.talkSections);
    setTalkRating(value.talkRating);
    setTalkGrade(value.talkGrade);
    setResult(null);
    cancelConnection();
  };

  const applyHistory = (history: BoardHistory) => {
    historyRef.current = history;
    applySnapshot(history.present);
    renderHistory((value) => value + 1);
  };

  const commit = (next: BoardSnapshot) => applyHistory(commitSnapshot({ ...historyRef.current, present: snapshot() }, next));
  const mayDiscard = () => !isDirty || window.confirm("Discard unsaved changes?");

  // Loading and switching scenarios reset the history baseline.
  const loadBoard = (board: SavedBoard, discardConfirmed = false) => {
    if (!discardConfirmed && !mayDiscard()) return;
    if (!allScenarios.some((item) => item.id === board.scenarioId)) {
      window.alert(t("board.unknownScenarioMessage", { scenarioId: board.scenarioId }));
      return;
    }
    const loaded: BoardSnapshot = {
      ...emptySnapshot(board.scenarioId),
      nodes: board.nodes,
      edges: board.edges,
      talkSections: { ...emptyTalkTrack(), ...(board.talkTrack?.sections ?? {}) },
      talkRating: board.talkTrack?.rating ?? null,
      talkGrade: board.talkGrade ?? null,
    };
    applySnapshot(loaded);
    rebase(loaded);
    setActiveBoardId(board.id ?? null);
    setActiveBoardTitle(board.title);
    setSavedOpen(false);
  };

  const requestBoard = async (summary: BoardSummary) => {
    if (!mayDiscard()) return;
    try {
      loadBoard(await fetchBoard(summary.id), true);
    } catch (error) {
      window.alert((error as Error).message);
    }
  };

  const liveCost = nodes.reduce((s, n) => s + meta(n.type).cost, 0);
  const liveMaint = nodes.reduce((s, n) => s + meta(n.type).maint, 0);
  const talkAnswered = scoreTalkTrack({ sections: talkSections, rating: talkRating }).answered.length;

  const switchScenario = (id: string) => {
    if (!mayDiscard()) return;
    const next = emptySnapshot(id);
    applySnapshot(next);
    rebase(next);
    setActiveBoardId(null);
    setActiveBoardTitle(null);
  };

  // Content edits share the same undo path.
  const addNode = (type: string) => {
    const width = canvasRef.current?.clientWidth ?? 480;
    const point = findPlacement(
      nodes,
      { width, height: canvasRef.current?.clientHeight ?? 560 },
      { width: NODE_W, height: NODE_H },
    );
    commit({ ...snapshot(), nodes: [...nodes, { id: crypto.randomUUID(), type, ...point }] });
  };

  const removeNode = (id: string) => {
    commit({
      ...snapshot(),
      nodes: nodes.filter((n) => n.id !== id),
      edges: edges.filter((e) => e.from !== id && e.to !== id),
    });
    if (connectFrom === id || connectDrag?.from === id) cancelConnection();
    if (inspectingId === id) setInspectingId(null);
    setResult(null);
  };

  const patchNode = (id: string, patch: Partial<BoardNode>) => {
    commit({ ...snapshot(), nodes: nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) });
  };

  const addEdge = (from: string, to: string) => {
    if (from === to || edges.some((e) => e.from === from && e.to === to)) return;
    commit({ ...snapshot(), edges: [...edges, { id: crypto.randomUUID(), from, to }] });
  };

  const removeEdge = (id: string) => {
    commit({ ...snapshot(), edges: edges.filter((e) => e.id !== id) });
    if (inspectingEdgeId === id) setInspectingEdgeId(null);
    setResult(null);
  };

  const patchEdge = (id: string, patch: Partial<BoardEdge>) => {
    commit({ ...snapshot(), edges: edges.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  };

  const {
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
  } = useBoardPointer({
    nodes,
    setNodes,
    addEdge,
    onDragEnd: (finalNodes) => {
      // One undo entry covers the entire drag.
      historyRef.current = commitSnapshot(historyRef.current, { ...snapshot(), nodes: finalNodes });
      renderHistory((value) => value + 1);
    },
  });

  return {
    scenariosError,
    boardsError,
    boardsLoading,
    retryBoards,
    scenarioId,
    creatorOpen,
    setCreatorOpen,
    nodes,
    edges,
    connectFrom,
    setConnectFrom,
    inspectingId,
    setInspectingId,
    inspectingEdgeId,
    setInspectingEdgeId,
    connectDrag,
    result,
    setResult,
    savedOpen,
    setSavedOpen,
    talkOpen,
    setTalkOpen,
    talkSections,
    talkRating,
    talkGrade,
    activeBoardId,
    activeBoardTitle,
    canvasRef,
    dragRef,
    connectDragRef,
    suppressClickRef,
    dragFrameRef,
    pendingNodesRef,
    historyRef,
    submittedSnapshotRef,
    allScenarios,
    scenarioOptions,
    scenario,
    nodeById,
    snapshot,
    isDirty,
    activeWorkflowStep,
    savedBoards,
    saveBoardMutation,
    deleteBoardMutation,
    saveScenarioMutation,
    deleteScenarioMutation,
    cancelConnection,
    applyHistory,
    commit,
    requestBoard,
    liveCost,
    liveMaint,
    talkAnswered,
    switchScenario,
    addNode,
    removeNode,
    patchNode,
    addEdge,
    removeEdge,
    patchEdge,
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

export type ArchBoardController = ReturnType<typeof useArchBoard>;

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { setTabBarHidden } from "@/lib/uiStore";
import { NODE_TYPES, SCENARIOS, TYPE_COLORS, evaluate, meta } from "@tech-refresh/core/arch";
import type { BoardEdge, BoardNode, EvalResult } from "@tech-refresh/core/arch";
import type { SavedBoard } from "@tech-refresh/core/api";
import { colors } from "@/theme";
import { Button, MiniButton, Pill, Screen } from "@/components/ui";
import { BoardCanvas } from "@/components/board/BoardCanvas";
import { ResultSheet } from "@/components/board/ResultSheet";

// The native tab bar floats over the content area; non-scrolling screens
// must clear it themselves (scroll views get automatic content insets).
const TAB_BAR_CLEARANCE = 56;

export default function BoardScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [nodes, setNodes] = useState<BoardNode[]>([]);
  const [edges, setEdges] = useState<BoardEdge[]>([]);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [savedOpen, setSavedOpen] = useState(false);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [activeBoardTitle, setActiveBoardTitle] = useState<string | null>(null);
  // Chrome levels: full (pills + brief), compact (slim row), zen (board only,
  // translucent title overlaid on the canvas).
  const [chrome, setChrome] = useState<"full" | "compact" | "zen">("full");

  // Zen also hides the native tab bar; restore it when leaving the screen.
  useEffect(() => {
    setTabBarHidden(chrome === "zen");
    return () => setTabBarHidden(false);
  }, [chrome]);

  const scenario = SCENARIOS[scenarioIndex];
  const { data: savedBoards = [] } = useQuery<SavedBoard[]>({ queryKey: ["arch-boards"], queryFn: api.listBoards });
  const invalidateBoards = () => queryClient.invalidateQueries({ queryKey: ["arch-boards"] });
  const saveBoardMutation = useMutation({
    mutationFn: () =>
      api.upsertBoard({
        id: activeBoardId ?? undefined,
        title: activeBoardTitle ?? `${scenario.name} draft`,
        scenarioId: scenario.id,
        nodes,
        edges,
      }),
    onSuccess: (board) => {
      setActiveBoardId(board.id ?? null);
      setActiveBoardTitle(board.title);
      invalidateBoards();
    },
  });
  const deleteBoardMutation = useMutation({
    mutationFn: api.deleteBoard,
    onSuccess: (_data, id) => {
      if (id === activeBoardId) {
        setActiveBoardId(null);
        setActiveBoardTitle(null);
      }
      invalidateBoards();
    },
  });
  const liveCost = nodes.reduce((sum, node) => sum + meta(node.type).cost, 0);
  const liveMaint = nodes.reduce((sum, node) => sum + meta(node.type).maint, 0);
  const overBudget = liveCost > scenario.budget;

  const clearBoard = () => {
    setNodes([]);
    setEdges([]);
    setResult(null);
    setActiveBoardId(null);
    setActiveBoardTitle(null);
  };

  const switchScenario = (index: number) => {
    setScenarioIndex(index);
    clearBoard();
  };

  const addNode = (type: string) => {
    const index = nodes.length;
    setNodes((current) => [
      ...current,
      { id: `${Date.now()}-${index}`, type, x: 20 + (index % 2) * 150, y: 20 + Math.floor(index / 2) * 80 },
    ]);
    setResult(null);
  };

  const moveNode = (id: string, x: number, y: number) =>
    setNodes((current) => current.map((node) => (node.id === id ? { ...node, x, y } : node)));

  const removeNode = (id: string) => {
    setNodes((current) => current.filter((node) => node.id !== id));
    setEdges((current) => current.filter((edge) => edge.from !== id && edge.to !== id));
    setResult(null);
  };

  const loadBoard = (board: SavedBoard) => {
    const nextScenarioIndex = SCENARIOS.findIndex((item) => item.id === board.scenarioId);
    if (nextScenarioIndex >= 0) setScenarioIndex(nextScenarioIndex);
    setNodes(board.nodes);
    setEdges(board.edges);
    setResult(null);
    setActiveBoardId(board.id ?? null);
    setActiveBoardTitle(board.title);
    setSavedOpen(false);
  };

  const confirmDeleteBoard = (board: SavedBoard) =>
    Alert.alert("Delete saved board", `Delete "${board.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteBoardMutation.mutate(board.id) },
    ]);

  const addEdge = (from: string, to: string) => {
    setEdges((current) =>
      current.some((edge) => edge.from === from && edge.to === to)
        ? current
        : [...current, { id: `${from}->${to}`, from, to }]
    );
    setResult(null);
  };

  const confirmRemoveEdge = (id: string) =>
    Alert.alert("Remove connection", "Delete this arrow?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => setEdges((current) => current.filter((edge) => edge.id !== id)),
      },
    ]);

  return (
    <Screen>
      <View
        style={{
          flex: 1,
          paddingTop: 6,
          paddingHorizontal: 6,
          gap: 8,
          paddingBottom: chrome === "zen" ? insets.bottom + 4 : insets.bottom + TAB_BAR_CLEARANCE,
        }}
      >
      {chrome === "full" && (
        <Animated.View entering={FadeInDown.duration(180)} style={{ gap: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
            {SCENARIOS.map((item, index) => (
              <Pill key={item.id} label={item.name} active={scenarioIndex === index} onPress={() => switchScenario(index)} />
            ))}
          </ScrollView>

          <Text style={{ fontSize: 12, lineHeight: 17, color: colors.textDim }}>{scenario.brief}</Text>
        </Animated.View>
      )}

      {chrome !== "zen" && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <MiniButton
            label={chrome === "full" ? "▾" : "▸"}
            color={colors.textDim}
            onPress={() => setChrome(chrome === "full" ? "compact" : "full")}
          />
          <MiniButton label="⛶" color={colors.textDim} onPress={() => setChrome("zen")} />
          {chrome === "compact" && (
            <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "600", color: colors.textDim, flexShrink: 1 }}>
              {scenario.name}
            </Text>
          )}
          <Text style={{ fontSize: 12, fontWeight: "600", color: overBudget ? colors.red : colors.textDim }}>
            💰 {liveCost}/{scenario.budget}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textDim }}>🔧 {liveMaint}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginLeft: "auto", alignItems: "center" }}>
            <MiniButton label="Saved" color={savedOpen ? colors.accent : colors.textDim} onPress={() => setSavedOpen((value) => !value)} />
            <MiniButton label={saveBoardMutation.isPending ? "Saving" : "Save"} color={colors.green} onPress={() => saveBoardMutation.mutate()} />
            <MiniButton label="Clear" color={colors.textDim} onPress={clearBoard} />
            <Button label="Evaluate" onPress={() => setResult(evaluate(scenario, nodes, edges))} disabled={nodes.length === 0} />
          </View>
        </View>
      )}

      {savedOpen && chrome !== "zen" && (
        <SavedBoardsTray boards={savedBoards} activeId={activeBoardId} onLoad={loadBoard} onDelete={confirmDeleteBoard} />
      )}

      <View style={{ flex: 1 }}>
        <BoardCanvas
          nodes={nodes}
          edges={edges}
          onMoveNode={moveNode}
          onRemoveNode={removeNode}
          onAddEdge={addEdge}
          onTapEdge={confirmRemoveEdge}
        />

        {chrome === "zen" && (
          <>
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: "#13161fb8",
                borderRadius: 16,
              }}
            >
              <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "600", color: colors.textDim }}>
                {scenario.name} · 💰 {liveCost}/{scenario.budget}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setChrome("compact")}
              hitSlop={8}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: "#13161fb8",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.textDim, fontSize: 13 }}>✕</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Floating palette: the canvas extends underneath, so this row costs
            no layout height — translucent so the board reads through it. */}
        <View
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            right: 8,
            backgroundColor: "#13161fd9",
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
          }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, padding: 6 }}>
            {NODE_TYPES.map((spec) => (
              <TouchableOpacity
                key={spec.type}
                onPress={() => addNode(spec.type)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: `${TYPE_COLORS[spec.type]}40`,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 14 }}>{spec.emoji}</Text>
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#cbd5e1" }}>{spec.label}</Text>
                <Text style={{ fontSize: 9, color: colors.textFaint }}>{"$".repeat(spec.cost) || "free"}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

        <ResultSheet result={result} scenario={scenario} onClose={() => setResult(null)} />
      </View>
    </Screen>
  );
}

type SavedBoardsTrayProps = {
  boards: SavedBoard[];
  activeId: string | null;
  onLoad: (board: SavedBoard) => void;
  onDelete: (board: SavedBoard) => void;
};

function SavedBoardsTray({ boards, activeId, onLoad, onDelete }: SavedBoardsTrayProps) {
  return (
    <Animated.View entering={FadeInDown.duration(180)} style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 12, fontWeight: "700", color: colors.textDim }}>Saved boards</Text>
        <Text style={{ fontSize: 11, color: colors.textFaint }}>{boards.length} total</Text>
      </View>
      {boards.length === 0 ? (
        <View style={{ padding: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }}>
          <Text style={{ fontSize: 12, color: colors.textFaint }}>Save a board to reuse or refine it later.</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
          {boards.map((board) => {
            const scenario = SCENARIOS.find((item) => item.id === board.scenarioId);
            const active = board.id === activeId;
            return (
              <View
                key={board.id}
                style={{
                  width: 210,
                  padding: 10,
                  gap: 8,
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: active ? colors.accent : colors.border,
                  borderRadius: 8,
                }}
              >
                <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "700", color: colors.textBright }}>
                  {board.title}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 10.5, color: colors.textFaint }}>
                  {scenario?.name ?? board.scenarioId} · {board.nodes.length} nodes · {board.edges.length} wires
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
                  <MiniButton label="Load" color={colors.accent} onPress={() => onLoad(board)} />
                  <MiniButton label="Delete" color={colors.red} onPress={() => onDelete(board)} />
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </Animated.View>
  );
}

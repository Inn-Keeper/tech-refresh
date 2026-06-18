import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setTabBarHidden } from "@/lib/uiStore";
import { NODE_TYPES, SCENARIOS, TYPE_COLORS, evaluate, meta } from "@tech-refresh/core/arch";
import { t } from "@tech-refresh/core/i18n";
import { useLocale } from "@/lib/useLocale";
import type { BoardEdge, BoardNode, EvalResult } from "@tech-refresh/core/arch";
import type { SavedBoard } from "@tech-refresh/core/api";
import { colors, layout } from "@/theme";
import { Button, MiniButton, Screen, ScreenHeader, SegmentedPills } from "@/components/ui";
import { BrandIcon, nodeIconName } from "@/components/BrandIcon";
import { BoardCanvas } from "@/components/board/BoardCanvas";
import { ResultSheet } from "@/components/board/ResultSheet";
import { useDeleteBoardMutation, useSaveBoardMutation, useSavedBoardsQuery } from "@/queries/board";

export default function BoardScreen() {
  const locale = useLocale();
  const insets = useSafeAreaInsets();
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
  const { data: savedBoards = [], error: boardsError } = useSavedBoardsQuery();
  const saveBoardMutation = useSaveBoardMutation(
    (board) => {
      setActiveBoardId(board.id ?? null);
      setActiveBoardTitle(board.title);
    },
    (error) => Alert.alert(t("board.saveFailedTitle"), error.message)
  );
  const deleteBoardMutation = useDeleteBoardMutation(
    (id) => {
      if (id === activeBoardId) {
        setActiveBoardId(null);
        setActiveBoardTitle(null);
      }
    },
    (error) => Alert.alert(t("common.delete"), error.message)
  );
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
    if (nextScenarioIndex < 0) {
      Alert.alert(t("board.unknownScenarioTitle"), t("board.unknownScenarioMessage", { scenarioId: board.scenarioId }));
      return;
    }
    setScenarioIndex(nextScenarioIndex);
    setNodes(board.nodes);
    setEdges(board.edges);
    setResult(null);
    setActiveBoardId(board.id ?? null);
    setActiveBoardTitle(board.title);
    setSavedOpen(false);
  };

  const confirmDeleteBoard = (board: SavedBoard) => {
    const id = board.id;
    if (!id) return;

    Alert.alert(t("board.deleteTitle"), t("board.deleteMessage", { title: board.title }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => deleteBoardMutation.mutate(id) },
    ]);
  };

  const addEdge = (from: string, to: string) => {
    setEdges((current) =>
      current.some((edge) => edge.from === from && edge.to === to)
        ? current
        : [...current, { id: `${from}->${to}`, from, to }]
    );
    setResult(null);
  };

  const confirmRemoveEdge = (id: string) =>
    Alert.alert(t("board.removeConnectionTitle"), t("board.removeConnectionMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => setEdges((current) => current.filter((edge) => edge.id !== id)),
      },
    ]);

  return (
    <Screen key={locale}>
      {chrome === "full" && (
        <Animated.View entering={FadeInDown.duration(180)}>
          <ScreenHeader title={t("tabs.board")} subtitle={scenario.brief}>
            <SegmentedPills
              options={SCENARIOS.map((item, index) => ({ key: index, label: item.name }))}
              activeKey={scenarioIndex}
              onChange={(key) => switchScenario(Number(key))}
            />
          </ScreenHeader>
        </Animated.View>
      )}

      <View
        style={{
          flex: 1,
          paddingTop: chrome === "full" ? 8 : 6,
          paddingHorizontal: 6,
          gap: 8,
          paddingBottom: chrome === "zen" ? insets.bottom + 4 : insets.bottom + layout.tabBarClearance,
        }}
      >
      {chrome !== "zen" && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <MiniButton
            label={chrome === "full" ? "Hide" : "Show"}
            color={colors.textDim}
            onPress={() => setChrome(chrome === "full" ? "compact" : "full")}
          />
          <MiniButton label="Zen" color={colors.textDim} onPress={() => setChrome("zen")} />
          {chrome === "compact" && (
            <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "600", color: colors.textDim, flexShrink: 1 }}>
              {scenario.name}
            </Text>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <BrandIcon name="cost" color={overBudget ? colors.danger : colors.textDim} size={14} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: overBudget ? colors.danger : colors.textDim }}>
              {liveCost}/{scenario.budget}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <BrandIcon name="maintenance" color={colors.textDim} size={14} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textDim }}>{liveMaint}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginLeft: "auto", alignItems: "center" }}>
            <MiniButton label={t("board.saved")} color={savedOpen ? colors.accent : colors.textDim} onPress={() => setSavedOpen((value) => !value)} />
            <MiniButton
              label={saveBoardMutation.isPending ? t("common.saving") : t("common.save")}
              color={colors.success}
              onPress={() =>
                saveBoardMutation.mutate({
                  id: activeBoardId ?? undefined,
                  title: activeBoardTitle ?? t("board.draftTitle", { scenario: scenario.name }),
                  scenarioId: scenario.id,
                  nodes,
                  edges,
                })
              }
            />
            <MiniButton label={t("common.clear")} color={colors.textDim} onPress={clearBoard} />
            <Button label={t("board.evaluate")} onPress={() => setResult(evaluate(scenario, nodes, edges))} disabled={nodes.length === 0} />
          </View>
        </View>
      )}

      {boardsError && chrome !== "zen" && (
        <Text style={{ fontSize: 12, color: colors.dangerBright }}>
          {t("board.boardsError", { message: boardsError.message })}
        </Text>
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
                backgroundColor: `${colors.bgDeep}b8`,
                borderRadius: 16,
              }}
            >
              <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "600", color: colors.textDim }}>
                {scenario.name} · {liveCost}/{scenario.budget}
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
                backgroundColor: `${colors.bgDeep}b8`,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BrandIcon name="close" color={colors.textDim} size={14} />
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
            backgroundColor: `${colors.bgDeep}d9`,
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
                <BrandIcon name={nodeIconName(spec.type)} color={TYPE_COLORS[spec.type]} size={16} />
                <Text style={{ fontSize: 11, fontWeight: "600", color: colors.text }}>{spec.label}</Text>
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
        <Text style={{ flex: 1, fontSize: 12, fontWeight: "700", color: colors.textDim }}>{t("board.savedBoards")}</Text>
        <Text style={{ fontSize: 11, color: colors.textFaint }}>{t("board.savedTotal", { count: boards.length })}</Text>
      </View>
      {boards.length === 0 ? (
        <View style={{ padding: 10, backgroundColor: colors.well, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }}>
          <Text style={{ fontSize: 12, color: colors.textFaint }}>{t("board.savedEmpty")}</Text>
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
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: active ? colors.accent : colors.border,
                  borderRadius: 8,
                }}
              >
                <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "700", color: colors.textBright }}>
                  {board.title}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 10.5, color: colors.textFaint }}>
                  {t("board.boardMeta", { scenario: scenario?.name ?? board.scenarioId, nodes: board.nodes.length, edges: board.edges.length })}
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
                  <MiniButton label={t("common.load")} color={colors.accent} onPress={() => onLoad(board)} />
                  <MiniButton label={t("common.delete")} color={colors.danger} onPress={() => onDelete(board)} />
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </Animated.View>
  );
}

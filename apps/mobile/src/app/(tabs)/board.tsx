import { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NODE_TYPES, SCENARIOS, TYPE_COLORS, evaluate, meta } from "@tech-refresh/core/arch";
import type { BoardEdge, BoardNode, EvalResult } from "@tech-refresh/core/arch";
import { colors } from "@/theme";
import { Button, MiniButton, Pill, Screen } from "@/components/ui";
import { BoardCanvas } from "@/components/board/BoardCanvas";
import { ResultSheet } from "@/components/board/ResultSheet";

// The native tab bar floats over the content area; non-scrolling screens
// must clear it themselves (scroll views get automatic content insets).
const TAB_BAR_CLEARANCE = 56;

export default function BoardScreen() {
  const insets = useSafeAreaInsets();
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [nodes, setNodes] = useState<BoardNode[]>([]);
  const [edges, setEdges] = useState<BoardEdge[]>([]);
  const [result, setResult] = useState<EvalResult | null>(null);
  // Distraction-free mode: collapse the scenario pills + brief into one slim row.
  const [chromeHidden, setChromeHidden] = useState(false);

  const scenario = SCENARIOS[scenarioIndex];
  const liveCost = nodes.reduce((sum, node) => sum + meta(node.type).cost, 0);
  const liveMaint = nodes.reduce((sum, node) => sum + meta(node.type).maint, 0);
  const overBudget = liveCost > scenario.budget;

  const clearBoard = () => {
    setNodes([]);
    setEdges([]);
    setResult(null);
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
      <View style={{ flex: 1, padding: 16, gap: 10, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}>
      {!chromeHidden && (
        <Animated.View entering={FadeInDown.duration(180)} style={{ gap: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
            {SCENARIOS.map((item, index) => (
              <Pill key={item.id} label={item.name} active={scenarioIndex === index} onPress={() => switchScenario(index)} />
            ))}
          </ScrollView>

          <Text style={{ fontSize: 12, lineHeight: 17, color: colors.textDim }}>{scenario.brief}</Text>
        </Animated.View>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <MiniButton
          label={chromeHidden ? "▸" : "▾"}
          color={colors.textDim}
          onPress={() => setChromeHidden((value) => !value)}
        />
        {chromeHidden && (
          <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "600", color: colors.textDim, flexShrink: 1 }}>
            {scenario.name}
          </Text>
        )}
        <Text style={{ fontSize: 12, fontWeight: "600", color: overBudget ? colors.red : colors.textDim }}>
          💰 {liveCost}/{scenario.budget}
        </Text>
        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textDim }}>🔧 {liveMaint}</Text>
        <View style={{ flexDirection: "row", gap: 8, marginLeft: "auto" }}>
          <Button label="Clear" variant="ghost" onPress={clearBoard} />
          <Button label="Evaluate" onPress={() => setResult(evaluate(scenario, nodes, edges))} disabled={nodes.length === 0} />
        </View>
      </View>

      <BoardCanvas
        nodes={nodes}
        edges={edges}
        onMoveNode={moveNode}
        onRemoveNode={removeNode}
        onAddEdge={addEdge}
        onTapEdge={confirmRemoveEdge}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6 }}>
        {NODE_TYPES.map((spec) => (
          <TouchableOpacity
            key={spec.type}
            onPress={() => addNode(spec.type)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 8,
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

        <ResultSheet result={result} scenario={scenario} onClose={() => setResult(null)} />
      </View>
    </Screen>
  );
}

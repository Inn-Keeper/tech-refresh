import { useState } from "react";
import { FlatList, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { categories } from "@tech-refresh/core/prepData";
import { PERFECT_QUIZ_BONUS } from "@tech-refresh/core/gamification";
import { buildDrill } from "@tech-refresh/core/quiz";
import { useScores } from "@/lib/useScores";
import { colors } from "@/theme";
import { FlipCard } from "@/components/FlipCard";
import { StatsBar } from "@/components/StatsBar";
import { DrillSession, type Drill } from "@/components/DrillSession";
import { Screen } from "@/components/ui";

export default function PrepScreen() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [drill, setDrill] = useState<Drill | null>(null);
  const { scores, record, addXp } = useScores();

  const category = categories[activeCategory];

  const startDrill = () =>
    setDrill({
      questions: buildDrill(categories, scores.answers),
      index: 0,
      answered: null,
      correctCount: 0,
      done: false,
    });

  const answerDrill = (i: number) => {
    if (!drill || drill.answered !== null) return;
    const isCorrect = i === drill.questions[drill.index].q.correct;
    setDrill({ ...drill, answered: i, correctCount: drill.correctCount + (isCorrect ? 1 : 0) });
    record(drill.questions[drill.index].tech, isCorrect, "drill");
  };

  const nextDrill = () => {
    if (!drill) return;
    const nextIndex = drill.index + 1;
    if (nextIndex >= drill.questions.length) {
      if (drill.correctCount === drill.questions.length) addXp(PERFECT_QUIZ_BONUS);
      setDrill({ ...drill, done: true });
    } else {
      setDrill({ ...drill, index: nextIndex, answered: null });
    }
  };

  return (
    <Screen>
      <FlatList
        data={drill ? [] : category.items.map((item) => ({ ...item, color: category.color }))}
        keyExtractor={(item) => `${activeCategory}-${item.tech}`}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={{ gap: 14 }}>
            <StatsBar scores={scores} onDrill={startDrill} drillActive={!!drill} />

            {drill ? (
              <DrillSession drill={drill} onAnswer={answerDrill} onNext={nextDrill} onExit={() => setDrill(null)} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {categories.map((cat: { name: string; emoji: string; color: string }, i: number) => (
                  <TouchableOpacity
                    key={cat.name}
                    onPress={() => setActiveCategory(i)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 20,
                      backgroundColor: activeCategory === i ? cat.color : colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: activeCategory === i ? "#fff" : colors.textDim,
                      }}
                    >
                      {cat.emoji} {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index * 60, 360)).springify().damping(18)}>
            <FlipCard item={item} stat={scores.answers[item.tech]} record={record} addXp={addXp} />
          </Animated.View>
        )}
      />
    </Screen>
  );
}

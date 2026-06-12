import { useEffect, useRef, useState } from "react";
import { FlatList, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { categories } from "@tech-refresh/core/prepData";
import { PERFECT_QUIZ_BONUS, rankForXp } from "@tech-refresh/core/gamification";
import { t } from "@tech-refresh/core/i18n";
import { buildDrill } from "@tech-refresh/core/quiz";
import { api } from "@/lib/api";
import { useScores } from "@/lib/useScores";
import { colors } from "@/theme";
import { FlipCard } from "@/components/FlipCard";
import { StatsBar } from "@/components/StatsBar";
import { DrillSession, type Drill } from "@/components/DrillSession";
import { AccuracyChart } from "@/components/AccuracyChart";
import { CelebrationOverlay } from "@/components/CelebrationOverlay";
import { Screen, ScreenHeader, SegmentedPills } from "@/components/ui";

type Celebration = { title: string; subtitle: string; accent?: string };

export default function PrepScreen() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [drill, setDrill] = useState<Drill | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const previousRank = useRef<ReturnType<typeof rankForXp> | null>(null);
  const { scores, record, addXp } = useScores();
  const { data: accuracy = [] } = useQuery({ queryKey: ["accuracy-timeline"], queryFn: api.getAccuracyTimeline });

  const category = categories[activeCategory];

  useEffect(() => {
    const current = rankForXp(scores.xp);
    if (previousRank.current && current.min > previousRank.current.min) {
      setCelebration({
        title: t("celebration.rankTitle", { rank: current.name }),
        subtitle: t("celebration.rankSubtitle", { xp: scores.xp }),
        accent: colors.accent,
      });
    }
    previousRank.current = current;
  }, [scores.xp]);

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
      if (drill.correctCount === drill.questions.length) {
        addXp(PERFECT_QUIZ_BONUS);
        setCelebration({
          title: t("celebration.perfectTitle"),
          subtitle: t("celebration.perfectSubtitle", { bonus: PERFECT_QUIZ_BONUS }),
          accent: colors.success,
        });
      }
      setDrill({ ...drill, done: true });
    } else {
      setDrill({ ...drill, index: nextIndex, answered: null });
    }
  };

  return (
    <Screen>
      {!drill && (
        <ScreenHeader title={t("tabs.prep")} subtitle="Flashcards, adaptive drills, and XP momentum.">
          <SegmentedPills
            options={categories.map((cat: { name: string; emoji: string; color: string }, i: number) => ({
              key: i,
              label: `${cat.emoji} ${cat.name}`,
              color: cat.color,
            }))}
            activeKey={activeCategory}
            onChange={(key) => setActiveCategory(Number(key))}
          />
        </ScreenHeader>
      )}
      <FlatList
        data={drill ? [] : category.items.map((item) => ({ ...item, color: category.color }))}
        keyExtractor={(item) => `${activeCategory}-${item.tech}`}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={{ gap: 14 }}>
            <StatsBar scores={scores} onDrill={startDrill} drillActive={!!drill} />
            {!drill && <AccuracyChart points={accuracy} />}

            {drill && <DrillSession drill={drill} onAnswer={answerDrill} onNext={nextDrill} onExit={() => setDrill(null)} />}
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index * 60, 360)).springify().damping(18)}>
            <FlipCard item={item} stat={scores.answers[item.tech]} record={record} addXp={addXp} />
          </Animated.View>
        )}
      />
      {celebration && (
        <CelebrationOverlay
          title={celebration.title}
          subtitle={celebration.subtitle}
          accent={celebration.accent}
          onDone={() => setCelebration(null)}
        />
      )}
    </Screen>
  );
}

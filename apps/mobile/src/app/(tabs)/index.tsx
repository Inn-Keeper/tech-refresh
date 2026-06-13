import { useEffect, useRef, useState } from "react";
import { FlatList, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { categories } from "@tech-refresh/core/prepData";
import { PERFECT_QUIZ_BONUS, rankForXp } from "@tech-refresh/core/gamification";
import { difficultyByKey } from "@tech-refresh/core/difficulty";
import { t } from "@tech-refresh/core/i18n";
import { buildDrillFromQuestions, selectDrillTechs } from "@tech-refresh/core/quiz";
import { api } from "@/lib/api";
import { useScores } from "@/lib/useScores";
import { colors } from "@/theme";
import { FlipCard } from "@/components/FlipCard";
import { StatsBar } from "@/components/StatsBar";
import { DifficultyPicker } from "@/components/DifficultyPicker";
import { DrillSession, type Drill } from "@/components/DrillSession";
import { AccuracyChart } from "@/components/AccuracyChart";
import { CelebrationOverlay } from "@/components/CelebrationOverlay";
import { Screen, ScreenHeader, SegmentedPills } from "@/components/ui";
import { categoryIconName } from "@/components/BrandIcon";

type Celebration = { title: string; subtitle: string; accent?: string };

const DRILL_SIZE = 10;

// Map every tech to its category color, so a fetched question can be themed.
const colorByTech: Record<string, string> = Object.fromEntries(
  categories.flatMap((c: { color: string; items: { tech: string }[] }) =>
    c.items.map((item) => [item.tech, c.color])
  )
);
const allTechs: string[] = Object.keys(colorByTech);

export default function PrepScreen() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [drill, setDrill] = useState<Drill | null>(null);
  const [picking, setPicking] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const previousRank = useRef<ReturnType<typeof rankForXp> | null>(null);
  const queryClient = useQueryClient();
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

  // Fetches one tier's questions (cached by React Query, offline-persisted),
  // preferring the user's weakest techs but falling back to the whole bank so a
  // partially-seeded tier still yields a drill.
  const fetchTierQuestions = (difficulty: string, techs: string[]) =>
    queryClient.fetchQuery({
      queryKey: ["questions", difficulty, techs],
      queryFn: () => api.getQuestions({ techs, difficulty, limit: DRILL_SIZE * 3 }),
    });

  const startDrill = async (difficulty: string) => {
    setLoadingTier(difficulty);
    setPickError(null);
    try {
      const weakest = selectDrillTechs(categories, scores.answers, { techCount: 5 });
      let questions = await fetchTierQuestions(difficulty, weakest);
      if (questions.length === 0) questions = await fetchTierQuestions(difficulty, allTechs);
      if (questions.length === 0) {
        setPickError(`No ${difficultyByKey(difficulty)?.label ?? difficulty} questions yet — more land soon.`);
        return;
      }
      setDrill({
        questions: buildDrillFromQuestions(questions, { colorByTech, fallbackColor: colors.accent, size: DRILL_SIZE }),
        index: 0,
        answered: null,
        correctCount: 0,
        done: false,
        difficulty,
      });
      setPicking(false);
    } catch {
      setPickError("Couldn't load questions. Check your connection and retry.");
    } finally {
      setLoadingTier(null);
    }
  };

  const answerDrill = (i: number) => {
    if (!drill || drill.answered !== null) return;
    const isCorrect = i === drill.questions[drill.index].q.correct;
    setDrill({ ...drill, answered: i, correctCount: drill.correctCount + (isCorrect ? 1 : 0) });
    record(drill.questions[drill.index].tech, isCorrect, "drill", drill.difficulty);
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
            options={categories.map((cat: { name: string; color: string }, i: number) => ({
              key: i,
              label: cat.name,
              icon: categoryIconName(cat.name),
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
            <StatsBar scores={scores} onDrill={() => setPicking(true)} drillActive={!!drill || picking} />
            {picking && !drill && (
              <DifficultyPicker
                onPick={startDrill}
                onCancel={() => {
                  setPicking(false);
                  setPickError(null);
                }}
                loadingKey={loadingTier}
                error={pickError}
              />
            )}
            {!drill && !picking && <AccuracyChart points={accuracy} />}

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

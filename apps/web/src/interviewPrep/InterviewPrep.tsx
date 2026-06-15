import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { categories } from "@tech-refresh/core/prepData";
import { techLinks } from "@tech-refresh/core/techLinks";
import { buildGithubTechCategory, fetchGithubTechSignals, githubUsernameFromUrl } from "@tech-refresh/core/githubTechs";
import { PERFECT_QUIZ_BONUS, rankForXp } from "@tech-refresh/core/gamification";
import { buildDrillFromQuestions, selectDrillTechs, shuffle, shuffleOptions } from "@tech-refresh/core/quiz";
import { difficultyByKey } from "@tech-refresh/core/difficulty";
import { t } from "@tech-refresh/core/i18n";
import { questionCapForPool } from "@tech-refresh/core/quizPrefs";
import * as api from "../lib/api";
import { useScores } from "./useScores";
import { CelebrationOverlay } from "../components/CelebrationOverlay";
import { colors } from "@tech-refresh/core/tokens";
import { WorkspaceLayout, WorkspacePanel } from "../components/WorkspaceLayout";
import { PoeAssistant } from "../components/poe/PoeAssistant";
import { getQuizSize, setQuizSize } from "./quizPrefs";
import styles from "./InterviewPrep.module.css";
import type {
  AccuracyPoint,
  CardState,
  CelebrationState,
  DrillState,
  PoeCue,
  PrepItem,
  QuizQuestion,
} from "./types";
import { Card } from "./Card";
import { ConfirmDialog } from "./ConfirmDialog";
import { DrillSession } from "./DrillSession";
import { PrepLeftRail } from "./PrepLeftRail";
import { PrepRightRail } from "./PrepRightRail";
import { summarizeScores } from "./summarizeScores";

const DRILL_SIZE = 10;
const CARD_POOL_LIMIT = 500; // pull the whole tier pool for a tech; size is controlled by user pref
const GITHUB_TECHS_STALE_MS = 1000 * 60 * 15; // public GitHub repo languages rarely change mid-session

// Map every tech to its category color so a fetched question can be themed.
const colorByTech = Object.fromEntries(
  categories.flatMap((c) => c.items.map((item) => [item.tech, c.color]))
);
const allTechs = Object.keys(colorByTech);

export default function InterviewPrep() {
  // Track the selected category by name, not list index: the "From GitHub techs"
  // category is prepended once it loads, which would shift every index underneath it.
  const [activeCategoryName, setActiveCategoryName] = useState(categories[0]?.name ?? "");
  const [cardState, setCardState] = useState<Record<string, CardState>>({});
  const [search, setSearch] = useState("");
  const [drill, setDrill] = useState<DrillState | null>(null);
  // Global difficulty, chosen in the right rail — drives both the quiz cards and drills.
  const [level, setLevel] = useState("mid");
  const [pendingLevel, setPendingLevel] = useState<string | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillError, setDrillError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<CelebrationState | null>(null);
  const [poeCue, setPoeCue] = useState<PoeCue | null>(null);
  // null = use all available questions; number = capped at that value
  const [quizSize, setQuizSizeState] = useState<number | null>(() => getQuizSize());
  // tracks the DB pool size for the most-recently-fetched tech+level combo
  const [poolSize, setPoolSize] = useState<number | null>(null);

  const updateQuizSize = (value: number | null) => {
    setQuizSize(value);
    setQuizSizeState(value);
    setCardState({});
  };
  const previousRank = useRef<{ name: string; min: number } | null>(null);
  const queryClient = useQueryClient();
  const { scores, scoresReady, record, addXp } = useScores();
  const { data: accuracy = [] } = useQuery<AccuracyPoint[]>({ queryKey: ["accuracy-timeline"], queryFn: api.getAccuracyTimeline as () => Promise<AccuracyPoint[]> });
  const { data: profile = null } = useQuery({ queryKey: ["profile"], queryFn: api.getUser });
  const githubPrepEnabled = !!profile?.useGithubTechsForPrep;
  const githubUsername = githubPrepEnabled ? githubUsernameFromUrl(profile?.githubUrl) : "";
  const { data: githubTechs = [], error: githubError, isFetching: githubLoading } = useQuery({
    queryKey: ["github-techs", githubUsername],
    queryFn: () => fetchGithubTechSignals(githubUsername, allTechs),
    enabled: githubPrepEnabled && !!githubUsername,
    staleTime: GITHUB_TECHS_STALE_MS,
  });

  useEffect(() => {
    if (!scoresReady) return;
    const current = rankForXp(scores.xp);
    if (previousRank.current && current && current.min > previousRank.current.min) {
      setCelebration({
        title: t("celebration.rankTitle", { rank: current.name }),
        subtitle: t("celebration.rankSubtitle", { xp: scores.xp }),
        accent: colors.accent ?? "",
      });
      setPoeCue({ type: "levelUp", id: Date.now() });
    }
    previousRank.current = current ?? null;
  }, [scores.xp, scoresReady]);

  const allItems = categories.flatMap((c) =>
    c.items.map((item) => ({ ...item, category: c.name, color: c.color, emoji: c.emoji }))
  );
  const githubCategory = buildGithubTechCategory(allItems, githubTechs, { color: colors.accentBright });
  const displayCategories = githubCategory ? [githubCategory, ...categories] : categories;

  const filtered = search.trim()
    ? allItems.filter(
        (i) =>
          i.tech.toLowerCase().includes(search.toLowerCase()) ||
          i.oneliner.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const displayCategory = displayCategories.find((c) => c.name === activeCategoryName) ?? displayCategories[0]!;
  const summary = summarizeScores(scores);
  const visibleItems: PrepItem[] = filtered ?? (displayCategory.items as PrepItem[]).map((item: PrepItem) => ({ ...item, color: item.color ?? displayCategory.color, emoji: displayCategory.emoji }));
  const activeTitle = filtered ? "Search results" : displayCategory.name;

  const getState = (key: string): CardState =>
    cardState[key] ?? { phase: "front", quizIndex: 0, answered: null, runCorrect: 0, shuffled: null };

  // Loads this tech's questions at the active level for a flip card's quiz,
  // falling back to the static prep questions if the bank has none.
  const fetchCardQuestions = async (tech: string): Promise<QuizQuestion[] | null> => {
    try {
      const rows = await queryClient.fetchQuery({
        queryKey: ["questions", "v2", "card-pool", level, tech, CARD_POOL_LIMIT],
        queryFn: () => api.getQuestions({ techs: [tech], difficulty: level, limit: CARD_POOL_LIMIT }),
      });
      if (rows.length) {
        setPoolSize(rows.length);
        // quizSize is a user-set cap; if it meets or exceeds the real pool it means "all".
        const cap = questionCapForPool(quizSize, rows.length);
        return shuffle(rows).slice(0, cap).map((r) => shuffleOptions({ question: r.prompt, options: r.options, correct: r.correct }));
      }
      console.warn(`No ${level} questions in the DB for "${tech}" — falling back to static prep questions (these don't vary by level). Run the questions seed.`);
    } catch (err) {
      console.error(`Failed to load ${level} questions for "${tech}"; using static prep questions.`, err);
    }
    return null;
  };

  const handleFlip = async (key: string, item: PrepItem) => {
    const s = cardState[key] ?? { phase: "front" as const };
    if (s.phase === "front") {
      setCardState((prev) => ({ ...prev, [key]: { ...(prev[key] ?? {}), phase: "back" as const, quizIndex: 0, answered: null, runCorrect: 0, shuffled: null } }));
      return;
    }
    if (s.phase === "back") {
      const fetched = await fetchCardQuestions(item.tech);
      const shuffled = fetched ?? (shuffle(item.quiz) as QuizQuestion[]).map(shuffleOptions as (q: QuizQuestion) => QuizQuestion);
      setCardState((prev) => ({
        ...prev,
        [key]: { ...(prev[key] ?? {}), phase: "quiz" as const, quizIndex: 0, answered: null, runCorrect: 0, shuffled },
      }));
    }
  };

  const handleAnswer = (key: string, tech: string, optionIndex: number) => {
    const s = cardState[key];
    if (!s || s.answered !== null) return;
    const isCorrect = optionIndex === s.shuffled![s.quizIndex]!.correct;
    setCardState((prev) => ({
      ...prev,
      [key]: { ...s, answered: optionIndex, runCorrect: s.runCorrect + (isCorrect ? 1 : 0) },
    }));
    setPoeCue({ type: isCorrect ? "correct" : "wrong", id: Date.now() });
    record(tech, isCorrect, "card", level);
  };

  const handleNextQuestion = (key: string) => {
    const s = cardState[key];
    if (!s || !s.shuffled) return;
    const nextIndex = s.quizIndex + 1;
    if (nextIndex >= s.shuffled.length) {
      if (s.runCorrect === s.shuffled.length) addXp(PERFECT_QUIZ_BONUS);
      setCardState((prev) => ({
        ...prev,
        [key]: { ...s, phase: "front" as const, quizIndex: 0, answered: null, runCorrect: 0, shuffled: null },
      }));
    } else {
      setCardState((prev) => ({ ...prev, [key]: { ...s, quizIndex: nextIndex, answered: null } }));
    }
  };

  const handleFlipBack = (key: string) => {
    setCardState((prev) => {
      const s = prev[key];
      if (!s) return prev;
      return { ...prev, [key]: { ...s, phase: "front" as const } };
    });
  };

  // Fetches one tier's questions (cached by React Query), preferring the user's
  // weakest techs but falling back to the whole bank so a partially-seeded tier
  // still yields a drill.
  const fetchTierQuestions = (difficulty: string, techs: string[]) =>
    queryClient.fetchQuery({
      queryKey: ["questions", "v2", difficulty, techs],
      queryFn: () => api.getQuestions({ techs, difficulty, limit: DRILL_SIZE * 3 }),
    });

  const startDrill = async (difficulty: string) => {
    setDrillLoading(true);
    setDrillError(null);
    try {
      const weakest = selectDrillTechs(displayCategories, scores.answers, { techCount: 5 });
      let questions = await fetchTierQuestions(difficulty, weakest);
      if (questions.length === 0) questions = await fetchTierQuestions(difficulty, allTechs);
      if (questions.length === 0) {
        setDrillError(`No ${difficultyByKey(difficulty)?.label ?? difficulty} questions yet — more land soon.`);
        return;
      }
      const entries = buildDrillFromQuestions(questions, { colorByTech, fallbackColor: colors.accent, size: DRILL_SIZE }).map(
        (entry) => ({ ...entry, link: techLinks[entry.tech] })
      );
      setDrill({ questions: entries, index: 0, answered: null, correctCount: 0, done: false, difficulty });
    } catch {
      setDrillError("Couldn't load questions. Check your connection and retry.");
    } finally {
      setDrillLoading(false);
    }
  };

  const applyLevel = (key: string) => {
    setLevel(key);
    setCardState({});
    setPoolSize(null); // pool size is tier-specific; reset so the slider re-calibrates
    setPendingLevel(null);
  };

  // Switch tier instantly, but confirm first if a quiz is mid-flight (would be discarded).
  const requestLevel = (key: string) => {
    if (key === level) return;
    const quizOpen = Object.values(cardState).some((s) => s?.phase === "quiz");
    if (quizOpen) setPendingLevel(key);
    else applyLevel(key);
  };

  const answerDrill = (optionIndex: number) => {
    if (!drill || drill.answered !== null) return;
    const cur = drill.questions[drill.index];
    if (!cur) return;
    const isCorrect = optionIndex === cur.q.correct;
    setDrill({ ...drill, answered: optionIndex, correctCount: drill.correctCount + (isCorrect ? 1 : 0) });
    setPoeCue({ type: isCorrect ? "correct" : "wrong", id: Date.now() });
    record(cur.tech, isCorrect, "drill", drill.difficulty);
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
          accent: colors.success ?? "",
        });
        setPoeCue({ type: "levelUp", id: Date.now() });
      }
      setDrill({ ...drill, done: true });
    } else {
      setDrill({ ...drill, index: nextIndex, answered: null });
    }
  };

  return (
    <WorkspaceLayout
      mainLabel="Interview prep"
      left={
        <PrepLeftRail
          activeCategoryName={activeCategoryName}
          allItems={allItems}
          categories={displayCategories}
          githubStatus={{
            hasUrl: !!githubUsername,
            enabled: githubPrepEnabled,
            loading: githubLoading,
            error: githubError,
            count: githubCategory?.items.length ?? 0,
          }}
          scores={scores}
          search={search}
          setSearch={setSearch}
          onCategory={(name) => {
            setActiveCategoryName(name);
            setSearch("");
            setCardState({});
          }}
        />
      }
      right={
        <PrepRightRail
          accuracy={accuracy}
          drillActive={!!drill}
          drillLoading={drillLoading}
          drillError={drillError}
          level={level}
          onLevel={requestLevel}
          onDrill={() => startDrill(level)}
          scores={scores}
          summary={summary}
          quizSize={quizSize}
          poolSize={poolSize}
          onQuizSize={updateQuizSize}
        />
      }
    >
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 18, marginBottom: 16 }}>
        <div>
          <p style={{ margin: "0 0 6px", color: colors.textFaint, fontSize: 12, fontWeight: 700 }}>
            {filtered ? `${filtered.length} of ${allItems.length} technologies` : `${displayCategory.items.length} technologies`}
          </p>
          <h1 style={{ margin: 0, color: colors.textBright, fontSize: 26, lineHeight: 1.12, fontWeight: 850 }}>
            {activeTitle}
          </h1>
        </div>
        <p style={{ margin: 0, color: colors.textFaint, fontSize: 12, lineHeight: 1.5, textAlign: "right", maxWidth: 360 }}>
          Tap a card for prep notes, then quiz. The workspace keeps cards compact so scanning stays fast.
        </p>
      </div>

      {drill ? (
        <div style={{ width: "min(100%, 860px)", paddingBottom: 48 }}>
          <DrillSession drill={drill} onAnswer={answerDrill} onNext={nextDrill} onExit={() => setDrill(null)} />
        </div>
      ) : visibleItems.length === 0 ? (
        <WorkspacePanel tone="sunken" style={{ textAlign: "center", color: colors.textFaint, padding: 28 }}>
          No matches found.
        </WorkspacePanel>
      ) : (
        <div
          className={styles.cardGrid}
        >
          {visibleItems.map((item, index) => {
            const key = filtered ? `search-${item.tech}` : `${activeCategoryName}-${item.tech}`;
            return (
              <Card
                key={key}
                index={index}
                item={item}
                level={level}
                stat={scores.answers[item.tech]}
                state={getState(key)}
                onFlip={() => handleFlip(key, item)}
                onBack={() => handleFlipBack(key)}
                onAnswer={(i) => handleAnswer(key, item.tech, i)}
                onNext={() => handleNextQuestion(key)}
              />
            );
          })}
        </div>
      )}

      {pendingLevel && (
        <ConfirmDialog
          title="Switch difficulty?"
          message={`You have a quiz in progress. Switching to ${difficultyByKey(pendingLevel)?.label ?? pendingLevel} resets your open card.`}
          confirmLabel="Switch & reload"
          onConfirm={() => applyLevel(pendingLevel)}
          onCancel={() => setPendingLevel(null)}
        />
      )}

      {celebration && (
        <CelebrationOverlay
          title={celebration.title}
          subtitle={celebration.subtitle}
          accent={celebration.accent}
          onDone={() => setCelebration(null)}
        />
      )}
      <PoeAssistant cue={poeCue} />
    </WorkspaceLayout>
  );
}

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { categories } from "@tech-refresh/core/prepData";
import { techLinks } from "@tech-refresh/core/techLinks";
import { buildGithubTechCategory, fetchGithubTechSignals, githubUsernameFromUrl } from "@tech-refresh/core/githubTechs";
import { RANKS, CORRECT_XP, PERFECT_QUIZ_BONUS, rankForXp } from "@tech-refresh/core/gamification";
import { buildDrillFromQuestions, selectDrillTechs, shuffle, shuffleOptions } from "@tech-refresh/core/quiz";
import { DIFFICULTIES, difficultyByKey } from "@tech-refresh/core/difficulty";
import { t } from "@tech-refresh/core/i18n";
import * as api from "./api.js";
import { useScores } from "./useScores.js";
import { AccuracyChart } from "./AccuracyChart.jsx";
import { CelebrationOverlay } from "./CelebrationOverlay.jsx";
import { colors, layout, tints } from "@tech-refresh/core/tokens";
import { BrandIcon, categoryIconName } from "./BrandIcon.jsx";
import { WorkspaceLayout, WorkspacePanel, WorkspaceTitle } from "./WorkspaceLayout.jsx";
import { PoeAssistant } from "./PoeAssistant.jsx";
import styles from "./InterviewPrep.module.css";

const DRILL_SIZE = 10;
const CARD_QUIZ_SIZE = 3; // questions shown per card quiz — a random subset of the tier's pool, so repeats feel fresh
const CARD_POOL_LIMIT = 50; // fetch the whole tier pool for a tech, then sample from it
const ACCURACY_GOOD_PCT = 70; // at/above this, accuracy reads as "strong" (success color)
const GITHUB_TECHS_STALE_MS = 1000 * 60 * 15; // public GitHub repo languages rarely change mid-session

// Map every tech to its category color so a fetched question can be themed.
const colorByTech = Object.fromEntries(
  categories.flatMap((c) => c.items.map((item) => [item.tech, c.color]))
);
const allTechs = Object.keys(colorByTech);

export default function InterviewPrep() {
  // Track the selected category by name, not list index: the "From GitHub techs"
  // category is prepended once it loads, which would shift every index underneath it.
  const [activeCategoryName, setActiveCategoryName] = useState(categories[0].name);
  const [cardState, setCardState] = useState({});
  const [search, setSearch] = useState("");
  const [drill, setDrill] = useState(null);
  // Global difficulty, chosen in the right rail — drives both the quiz cards and drills.
  const [level, setLevel] = useState("mid");
  const [pendingLevel, setPendingLevel] = useState(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillError, setDrillError] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [poeCue, setPoeCue] = useState(null);
  const previousRank = useRef(null);
  const queryClient = useQueryClient();
  const { scores, record, addXp } = useScores();
  const { data: accuracy = [] } = useQuery({ queryKey: ["accuracy-timeline"], queryFn: api.getAccuracyTimeline });
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
    const current = rankForXp(scores.xp);
    if (previousRank.current && current.min > previousRank.current.min) {
      setCelebration({
        title: t("celebration.rankTitle", { rank: current.name }),
        subtitle: t("celebration.rankSubtitle", { xp: scores.xp }),
        accent: colors.accent,
      });
      setPoeCue({ type: "levelUp", id: Date.now() });
    }
    previousRank.current = current;
  }, [scores.xp]);

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

  const displayCategory = displayCategories.find((c) => c.name === activeCategoryName) ?? displayCategories[0];
  const summary = summarizeScores(scores);
  const visibleItems = filtered ?? displayCategory.items.map((item) => ({ ...item, color: item.color ?? displayCategory.color, emoji: displayCategory.emoji }));
  const activeTitle = filtered ? "Search results" : displayCategory.name;

  const getState = (key) =>
    cardState[key] || { phase: "front", quizIndex: 0, answered: null, runCorrect: 0, shuffled: null };

  // Loads this tech's questions at the active level for a flip card's quiz,
  // falling back to the static prep questions if the bank has none.
  const fetchCardQuestions = async (tech) => {
    try {
      const rows = await queryClient.fetchQuery({
        queryKey: ["questions", "v2", level, [tech]],
        queryFn: () => api.getQuestions({ techs: [tech], difficulty: level, limit: CARD_POOL_LIMIT }),
      });
      if (rows.length) {
        // Random subset of the tier's pool each open, so re-quizzing a card feels fresh.
        return shuffle(rows).slice(0, CARD_QUIZ_SIZE).map((r) => shuffleOptions({ question: r.prompt, options: r.options, correct: r.correct }));
      }
      console.warn(`No ${level} questions in the DB for "${tech}" — falling back to static prep questions (these don't vary by level). Run the questions seed.`);
    } catch (err) {
      console.error(`Failed to load ${level} questions for "${tech}"; using static prep questions.`, err);
    }
    return null;
  };

  const handleFlip = async (key, item) => {
    const s = cardState[key] || { phase: "front" };
    if (s.phase === "front") {
      setCardState((prev) => ({ ...prev, [key]: { ...(prev[key] ?? {}), phase: "back" } }));
      return;
    }
    if (s.phase === "back") {
      const fetched = await fetchCardQuestions(item.tech);
      const shuffled = fetched ?? shuffle(item.quiz).map(shuffleOptions);
      setCardState((prev) => ({
        ...prev,
        [key]: { ...(prev[key] ?? {}), phase: "quiz", quizIndex: 0, answered: null, runCorrect: 0, shuffled },
      }));
    }
  };

  const handleAnswer = (key, tech, optionIndex) => {
    const s = cardState[key];
    if (!s || s.answered !== null) return;
    const isCorrect = optionIndex === s.shuffled[s.quizIndex].correct;
    setCardState((prev) => ({
      ...prev,
      [key]: { ...s, answered: optionIndex, runCorrect: s.runCorrect + (isCorrect ? 1 : 0) },
    }));
    setPoeCue({ type: isCorrect ? "correct" : "wrong", id: Date.now() });
    record(tech, isCorrect, "card", level);
  };

  const handleNextQuestion = (key) => {
    const s = cardState[key];
    const nextIndex = s.quizIndex + 1;
    if (nextIndex >= s.shuffled.length) {
      if (s.runCorrect === s.shuffled.length) addXp(PERFECT_QUIZ_BONUS);
      setCardState((prev) => ({
        ...prev,
        [key]: { ...s, phase: "front", quizIndex: 0, answered: null, runCorrect: 0, shuffled: null },
      }));
    } else {
      setCardState((prev) => ({ ...prev, [key]: { ...s, quizIndex: nextIndex, answered: null } }));
    }
  };

  const handleFlipBack = (key) => {
    setCardState((prev) => {
      const s = prev[key];
      if (!s) return prev;
      return { ...prev, [key]: { ...s, phase: "front" } };
    });
  };

  // Fetches one tier's questions (cached by React Query), preferring the user's
  // weakest techs but falling back to the whole bank so a partially-seeded tier
  // still yields a drill.
  const fetchTierQuestions = (difficulty, techs) =>
    queryClient.fetchQuery({
      queryKey: ["questions", "v2", difficulty, techs],
      queryFn: () => api.getQuestions({ techs, difficulty, limit: DRILL_SIZE * 3 }),
    });

  const startDrill = async (difficulty) => {
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

  const applyLevel = (key) => {
    setLevel(key);
    setCardState({}); // reset cards to front; the new tier loads on next open
    setPendingLevel(null);
  };

  // Switch tier instantly, but confirm first if a quiz is mid-flight (would be discarded).
  const requestLevel = (key) => {
    if (key === level) return;
    const quizOpen = Object.values(cardState).some((s) => s?.phase === "quiz");
    if (quizOpen) setPendingLevel(key);
    else applyLevel(key);
  };

  const answerDrill = (optionIndex) => {
    if (drill.answered !== null) return;
    const cur = drill.questions[drill.index];
    const isCorrect = optionIndex === cur.q.correct;
    setDrill({ ...drill, answered: optionIndex, correctCount: drill.correctCount + (isCorrect ? 1 : 0) });
    setPoeCue({ type: isCorrect ? "correct" : "wrong", id: Date.now() });
    record(cur.tech, isCorrect, "drill", drill.difficulty);
  };

  const nextDrill = () => {
    const nextIndex = drill.index + 1;
    if (nextIndex >= drill.questions.length) {
      if (drill.correctCount === drill.questions.length) {
        addXp(PERFECT_QUIZ_BONUS);
        setCelebration({
          title: t("celebration.perfectTitle"),
          subtitle: t("celebration.perfectSubtitle", { bonus: PERFECT_QUIZ_BONUS }),
          accent: colors.success,
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

function summarizeScores(scores) {
  const entries = Object.entries(scores.answers);
  const totals = entries.reduce(
    (acc, [, s]) => ({ correct: acc.correct + s.correct, wrong: acc.wrong + s.wrong }),
    { correct: 0, wrong: 0 }
  );
  const attempts = totals.correct + totals.wrong;
  const accuracy = attempts ? Math.round((totals.correct / attempts) * 100) : null;
  const ranked = entries
    .filter(([, s]) => s.correct + s.wrong > 0)
    .map(([tech, s]) => ({
      tech,
      acc: Math.round((s.correct / (s.correct + s.wrong)) * 100),
      n: s.correct + s.wrong,
    }))
    .sort((a, b) => b.acc - a.acc || b.n - a.n);

  return { attempts, accuracy, ranked };
}

function categoryAnswered(cat, scores) {
  return cat.items.filter((item) => scores.answers[item.tech]?.correct || scores.answers[item.tech]?.wrong).length;
}

function PrepLeftRail({ activeCategoryName, allItems, categories, githubStatus, scores, search, setSearch, onCategory }) {
  return (
    <>
      <WorkspacePanel>
        <WorkspaceTitle
          icon={<BrandIcon name="layers" color={colors.accentBright} size={17} />}
          title="Practice map"
          subtitle={`${allItems.length} technologies grouped by interview surface.`}
        />
        <div style={{ position: "relative", marginTop: 14 }}>
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
            <BrandIcon name="search" color={colors.textFaint} size={13} />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search technology"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "9px 10px 9px 32px",
              background: colors.bgDeep,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              color: colors.text,
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>
      </WorkspacePanel>

      <WorkspacePanel style={{ padding: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {categories.map((cat) => {
            const active = activeCategoryName === cat.name && !search.trim();
            const answered = categoryAnswered(cat, scores);
            const pct = Math.round((answered / cat.items.length) * 100);
            return (
              <button
                key={cat.name}
                onClick={() => onCategory(cat.name)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "9px 10px",
                  border: "none",
                  borderRadius: 7,
                  background: active ? `${cat.color}24` : "transparent",
                  color: active ? colors.textBright : colors.textDim,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <BrandIcon name={categoryIconName(cat.name)} color={active ? cat.color : colors.textFaint} size={15} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 12.5, fontWeight: 750 }}>{cat.name}</span>
                  <span style={{ display: "block", marginTop: 3, color: colors.textFaint, fontSize: 10.5 }}>
                    {answered}/{cat.items.length} touched
                  </span>
                </span>
                <span style={{ width: 34, textAlign: "right", color: pct > 0 ? cat.color : colors.textFaint, fontSize: 11, fontWeight: 800 }}>
                  {pct}%
                </span>
              </button>
            );
          })}
        </div>
      </WorkspacePanel>

      {githubStatus?.enabled && githubStatus?.hasUrl && (
        <WorkspacePanel tone="sunken" style={{ color: colors.textFaint, fontSize: 11.5, lineHeight: 1.5 }}>
          {githubStatus.loading
            ? "Reading public GitHub repo languages..."
            : githubStatus.error
              ? "GitHub tech sync could not load. Saved profile URL is still intact."
              : githubStatus.count
                ? `${githubStatus.count} profile techs matched from public GitHub repos.`
                : "No matching prep techs found from public GitHub repos yet."}
        </WorkspacePanel>
      )}
    </>
  );
}

function PrepRightRail({ accuracy, drillActive, drillLoading, drillError, level, onLevel, onDrill, scores, summary }) {
  const rank = rankForXp(scores.xp);
  const next = RANKS[RANKS.indexOf(rank) + 1];
  const progress = next ? Math.round(((scores.xp - rank.min) / (next.min - rank.min)) * 100) : 100;
  const strongest = summary.ranked.slice(0, 4);
  const weakest = [...summary.ranked].reverse().slice(0, 4);
  const tier = difficultyByKey(level);

  return (
    <>
      <LevelSelector level={level} onLevel={onLevel} />

      <WorkspacePanel>
        <WorkspaceTitle
          icon={<BrandIcon name="rank" color={colors.accentBright} size={17} />}
          title={rank.name}
          subtitle={`${scores.xp} XP earned`}
          right={
            <span style={{ color: summary.accuracy !== null && summary.accuracy >= ACCURACY_GOOD_PCT ? colors.successBright : colors.warningBright, fontSize: 12, fontWeight: 850 }}>
              {summary.accuracy === null ? "--" : `${summary.accuracy}%`}
            </span>
          }
        />
        <div style={{ height: 7, background: colors.well, borderRadius: 999, overflow: "hidden", marginTop: 14 }}>
          <div style={{ width: `${progress}%`, height: "100%", background: colors.accent }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 9, color: colors.textFaint, fontSize: 11 }}>
          <span>{summary.attempts} answered</span>
          <span>{next ? `${next.min - scores.xp} XP to ${next.name}` : "Top rank"}</span>
        </div>
        <button
          onClick={onDrill}
          disabled={drillActive || drillLoading}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            marginTop: 14,
            padding: "9px 12px",
            background: `${tier?.color ?? colors.accent}1F`,
            border: `1px solid ${tier?.color ?? colors.accent}60`,
            borderRadius: 8,
            color: tier?.color ?? colors.accentBright,
            fontSize: 12,
            fontWeight: 800,
            cursor: drillActive || drillLoading ? "default" : "pointer",
            opacity: drillActive || drillLoading ? 0.55 : 1,
          }}
        >
          <BrandIcon name="drill" color={tier?.color ?? colors.accentBright} size={14} />
          {drillLoading ? "Loading…" : `Drill weakest · ${tier?.emoji ?? ""} ${tier?.label ?? ""}`}
        </button>
        {drillError && <p style={{ margin: "8px 0 0", fontSize: 11, color: colors.warning }}>{drillError}</p>}
      </WorkspacePanel>

      <AccuracyChart points={accuracy} compact />

      <WorkspacePanel>
        <WorkspaceTitle
          icon={<BrandIcon name="accuracy" color={colors.successBright} size={17} />}
          title="Signal"
          subtitle="Use this to choose what to rehearse next."
        />
        <RailList title="Strongest" icon="arrowUp" items={strongest} color={colors.successBright} />
        <RailList title="Needs reps" icon="arrowDown" items={weakest} color={colors.warningBright} />
      </WorkspacePanel>
    </>
  );
}

function RailList({ color, icon, items, title }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: colors.textDim, fontSize: 11, fontWeight: 800, marginBottom: 8 }}>
        <BrandIcon name={icon} color={color} size={12} />
        {title}
      </div>
      {items.length === 0 ? (
        <p style={{ margin: 0, color: colors.textFaint, fontSize: 11, lineHeight: 1.5 }}>Answer a few questions to build a signal.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {items.map((item) => (
            <div key={item.tech} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 }}>
              <span style={{ color: colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.tech}</span>
              <span style={{ color, fontWeight: 800 }}>{item.acc}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ index = 0, item, level, stat, state, onFlip, onBack, onAnswer, onNext }) {
  const { phase, quizIndex, answered, shuffled } = state;
  const flipped = phase === "back";

  return (
    <div
      className={styles.card}
      style={{
        borderRadius: 10,
        animationDelay: `${Math.min(index * 45, 360)}ms`,
        "--prep-card-min-height": `${layout.prepCardMinHeight}px`,
      }}
    >
      {phase === "quiz" && shuffled ? (
        <div className={styles.quiz}>
          <QuizFace
            item={item}
            level={level}
            link={techLinks[item.tech]}
            question={shuffled[quizIndex]}
            questionNumber={quizIndex + 1}
            total={shuffled.length}
            answered={answered}
            onAnswer={onAnswer}
            onNext={onNext}
          />
        </div>
      ) : (
        <div className={`${styles.cardInner}${flipped ? ` ${styles.isBack}` : ""}`}>
          <div className={styles.cardFace}>
            <FrontFace item={item} level={level} stat={stat} onFlip={onFlip} />
          </div>
          <div className={`${styles.cardFace} ${styles.backFace}`}>
            <BackFace item={item} onBack={onBack} onQuiz={onFlip} />
          </div>
        </div>
      )}
    </div>
  );
}

function FrontFace({ item, level, stat, onFlip }) {
  const attempts = stat ? stat.correct + stat.wrong : 0;
  const accuracy = attempts ? Math.round((stat.correct / attempts) * 100) : null;
  const tier = difficultyByKey(level);

  return (
    <div
      onClick={onFlip}
      style={{
        cursor: "pointer",
        background: colors.surface,
        border: `1px solid ${item.color}30`,
        borderRadius: 10,
        padding: "15px 14px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        minHeight: layout.prepCardMinHeight,
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 9 }}>
          <div style={{
            display: "inline-block", padding: "3px 10px",
            background: `${item.color}20`, borderRadius: 999,
            color: item.color, fontSize: 11, fontWeight: 700,
            letterSpacing: "0.04em",
          }}>
            {item.tech}
          </div>
          {tier && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, background: `${tier.color}1A`, border: `1px solid ${tier.color}55`, color: tier.color, fontSize: 10, fontWeight: 800, whiteSpace: "nowrap" }}>
              {tier.emoji} {tier.label}
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: colors.text }}>
          {item.oneliner}
        </p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 10.5, color: colors.textFaint, marginTop: 12 }}>
        <span style={{ color: accuracy === null ? colors.textFaint : accuracy >= ACCURACY_GOOD_PCT ? colors.success : colors.warning }}>
          {accuracy === null ? "" : `✓ ${accuracy}% · ${attempts} answered`}
        </span>
        <span style={{ whiteSpace: "nowrap" }}>prep notes</span>
      </div>
    </div>
  );
}

function BackFace({ item, onBack, onQuiz }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${item.color}18, ${colors.surface})`,
        border: `1px solid ${item.color}50`,
        borderRadius: 10,
        padding: "15px",
        display: "flex", flexDirection: "column", gap: 12,
        minHeight: layout.prepCardMinHeight,
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: item.color, marginBottom: 10, letterSpacing: "0.06em" }}>
          INTERVIEW PREP
        </div>
        <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          {item.prep.map((point) => (
            <li key={point} style={{ fontSize: 12.5, lineHeight: 1.5, color: colors.textDim }}>
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", gap: 10 }}>
        <button
          onClick={onBack}
          style={{
            padding: "8px 12px",
            background: "transparent",
            border: `1px solid ${colors.border}`,
            borderRadius: 7,
            color: colors.textFaint,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ← Flip back
        </button>
        <button
          onClick={onQuiz}
          style={{
            padding: "8px 14px",
            background: `${item.color}25`,
            border: `1px solid ${item.color}60`,
            borderRadius: 7,
            color: item.color,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Take quiz →
        </button>
      </div>
    </div>
  );
}

function QuizFace({ item, level, link, question, questionNumber, total, answered, onAnswer, onNext }) {
  const isCorrect = answered !== null && answered === question.correct;
  const isLast = questionNumber === total;
  const perAnswerXp = difficultyByKey(level)?.xp ?? CORRECT_XP;

  return (
    <div
      style={{
        background: colors.well,
        border: `1px solid ${item.color}40`,
        borderRadius: 10,
        padding: "15px",
        display: "flex", flexDirection: "column", gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: item.color, letterSpacing: "0.08em" }}>
          {item.tech} · QUIZ
        </div>
        <div style={{ fontSize: 10, color: colors.textFaint }}>
          {questionNumber} / {total}
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: colors.text, fontWeight: 700 }}>
        {question.question}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {question.options.map((opt, i) => {
          const isThisCorrect = i === question.correct;
          const isThisChosen = answered === i;

          let bg = colors.surfaceHi;
          let border = `1px solid ${colors.border}`;
          let color = colors.textDim;

          if (answered !== null) {
            if (isThisCorrect) {
              bg = tints.successSoft;
              border = `1px solid ${colors.success}80`;
              color = colors.successBright;
            } else if (isThisChosen && !isThisCorrect) {
              bg = tints.dangerSoft;
              border = `1px solid ${colors.danger}80`;
              color = colors.dangerBright;
            }
          }

          return (
            <button
              key={i}
              onClick={() => answered === null && onAnswer(i)}
              style={{
                textAlign: "left",
                padding: "9px 12px",
                background: bg,
                border,
                borderRadius: 8,
                color,
                fontSize: 12.5,
                lineHeight: 1.45,
                cursor: answered === null ? "pointer" : "default",
                transition: "all 0.15s",
              }}
            >
              <span style={{ opacity: 0.5, marginRight: 6 }}>
                {String.fromCharCode(65 + i)}.
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {answered !== null && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: isCorrect ? colors.success : colors.danger, fontWeight: 600 }}>
              {isCorrect ? `Correct! +${perAnswerXp} XP` : "Incorrect"}
            </span>
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: colors.accentBright, textDecoration: "none", fontWeight: 500 }}
              >
                Docs ↗
              </a>
            )}
          </span>
          <button
            onClick={onNext}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 14px",
              background: `${item.color}25`,
              border: `1px solid ${item.color}60`,
              borderRadius: 8,
              color: item.color,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {isLast ? "Done" : "Next"}
            <BrandIcon name={isLast ? "check" : "arrowRight"} color={item.color} size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

// Lightweight confirmation modal (scrim + centered card).
function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
  return (
    <div
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, background: tints.modalScrim, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(100%, 380px)", background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 20 }}
      >
        <h2 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 850, color: colors.textBright }}>{title}</h2>
        <p style={{ margin: "0 0 18px", fontSize: 13, lineHeight: 1.5, color: colors.textDim }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textDim, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: "8px 16px", background: colors.accent, border: "none", borderRadius: 8, color: colors.onAccent, fontSize: 13, fontWeight: 800, cursor: "pointer" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Sidebar difficulty picker. Sets the global level that drives both the quiz
// cards and the drill, so the whole screen runs at one tier.
function LevelSelector({ level, onLevel }) {
  return (
    <WorkspacePanel>
      <WorkspaceTitle
        icon={<BrandIcon name="drill" color={colors.accentBright} size={17} />}
        title="Difficulty level"
        subtitle="Applies to quiz cards and drills."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 14 }}>
        {DIFFICULTIES.map((d) => {
          const active = d.key === level;
          return (
            <button
              key={d.key}
              onClick={() => onLevel(d.key)}
              aria-pressed={active}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textAlign: "left",
                padding: "9px 11px",
                background: active ? `${d.color}24` : "transparent",
                border: `1px solid ${active ? d.color : colors.border}`,
                borderRadius: 9,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 18 }}>{d.emoji}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12.5, fontWeight: 800, color: active ? d.color : colors.text }}>{d.label}</span>
                <span style={{ display: "block", fontSize: 10.5, color: colors.textFaint }}>{d.blurb}</span>
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, color: active ? d.color : colors.textFaint }}>+{d.xp}</span>
            </button>
          );
        })}
      </div>
    </WorkspacePanel>
  );
}

function DrillSession({ drill, onAnswer, onNext, onExit }) {
  const { questions, index, answered, correctCount, done } = drill;
  const tier = difficultyByKey(drill.difficulty);
  const perAnswerXp = tier?.xp ?? CORRECT_XP;

  if (done) {
    const perfect = correctCount === questions.length;
    return (
      <div
        style={{
          background: colors.well, border: `1px solid ${colors.border}`, borderRadius: 14,
          padding: "32px 24px", textAlign: "center",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            margin: "0 auto 8px",
            borderRadius: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${perfect ? colors.success : colors.accent}20`,
            border: `1px solid ${perfect ? colors.success : colors.accent}60`,
          }}
        >
          <BrandIcon
            name={perfect ? "rank" : correctCount >= questions.length / 2 ? "spark" : "story"}
            color={perfect ? colors.successBright : colors.accentBright}
            size={25}
          />
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: colors.textBright, marginBottom: 6 }}>
          {correctCount} / {questions.length}
        </div>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: colors.textDim }}>
          +{correctCount * perAnswerXp} XP{perfect ? ` · +${PERFECT_QUIZ_BONUS} perfect bonus` : ""} — accuracy recorded
          per tech, so the next drill adapts.
        </p>
        <button
          onClick={onExit}
          style={{
            padding: "9px 18px", background: colors.accent, border: "none", borderRadius: 8,
            color: colors.onAccent, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          Back to cards
        </button>
      </div>
    );
  }

  const cur = questions[index];
  const isCorrect = answered !== null && answered === cur.q.correct;
  const isLast = index === questions.length - 1;

  return (
    <div
      style={{
        background: colors.well, border: `1px solid ${cur.color}40`, borderRadius: 14,
        padding: "20px", display: "flex", flexDirection: "column", gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 700, color: cur.color, letterSpacing: "0.08em" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <BrandIcon name="drill" color={cur.color} size={13} />
            DRILL · {cur.tech}
          </span>
          {tier && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, background: `${tier.color}1A`, border: `1px solid ${tier.color}60`, color: tier.color, letterSpacing: "0.04em" }}>
              {tier.emoji} {tier.label.toUpperCase()}
            </span>
          )}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 10, color: colors.textFaint }}>{index + 1} / {questions.length}</span>
          <button
            onClick={onExit}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "3px 10px", background: "transparent", border: `1px solid ${colors.border}`,
              borderRadius: 8, color: colors.textFaint, fontSize: 10, fontWeight: 600, cursor: "pointer",
            }}
          >
            Exit
            <BrandIcon name="close" color={colors.textFaint} size={11} />
          </button>
        </span>
      </div>

      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: colors.text, fontWeight: 750 }}>
        {cur.q.question}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {cur.q.options.map((opt, i) => {
          const isThisCorrect = i === cur.q.correct;
          const isThisChosen = answered === i;

          let bg = colors.surfaceHi;
          let border = `1px solid ${colors.border}`;
          let color = colors.textDim;

          if (answered !== null) {
            if (isThisCorrect) {
              bg = tints.successSoft;
              border = `1px solid ${colors.success}80`;
              color = colors.successBright;
            } else if (isThisChosen && !isThisCorrect) {
              bg = tints.dangerSoft;
              border = `1px solid ${colors.danger}80`;
              color = colors.dangerBright;
            }
          }

          return (
            <button
              key={i}
              onClick={() => answered === null && onAnswer(i)}
              style={{
                textAlign: "left", padding: "10px 12px", background: bg, border, borderRadius: 8,
                color, fontSize: 13, lineHeight: 1.45,
                cursor: answered === null ? "pointer" : "default", transition: "all 0.15s",
              }}
            >
              <span style={{ opacity: 0.5, marginRight: 6 }}>{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          );
        })}
      </div>

      {answered !== null && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: isCorrect ? colors.success : colors.danger, fontWeight: 600 }}>
              {isCorrect ? `Correct! +${perAnswerXp} XP` : "Incorrect"}
            </span>
            {cur.link && (
              <a
                href={cur.link}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: colors.accentBright, textDecoration: "none", fontWeight: 500 }}
              >
                Docs ↗
              </a>
            )}
          </span>
          <button
            onClick={onNext}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "7px 14px", background: `${cur.color}25`, border: `1px solid ${cur.color}60`,
              borderRadius: 8, color: cur.color, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            {isLast ? "Finish" : "Next"}
            <BrandIcon name={isLast ? "check" : "arrowRight"} color={cur.color} size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { categories } from "@tech-refresh/core/prepData";
import { techLinks } from "@tech-refresh/core/techLinks";
import { RANKS, CORRECT_XP, PERFECT_QUIZ_BONUS, rankForXp } from "@tech-refresh/core/gamification";
import { buildDrill, shuffle, shuffleOptions } from "@tech-refresh/core/quiz";
import { t } from "@tech-refresh/core/i18n";
import * as api from "./api.js";
import { useScores } from "./useScores.js";
import { AccuracyChart } from "./AccuracyChart.jsx";
import { CelebrationOverlay } from "./CelebrationOverlay.jsx";

export default function InterviewPrep() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [cardState, setCardState] = useState({});
  const [search, setSearch] = useState("");
  const [drill, setDrill] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const previousRank = useRef(null);
  const { scores, record, addXp } = useScores();
  const { data: accuracy = [] } = useQuery({ queryKey: ["accuracy-timeline"], queryFn: api.getAccuracyTimeline });

  useEffect(() => {
    const current = rankForXp(scores.xp);
    if (previousRank.current && current.min > previousRank.current.min) {
      setCelebration({
        title: t("celebration.rankTitle", { rank: current.name }),
        subtitle: t("celebration.rankSubtitle", { xp: scores.xp }),
        accent: "#6366f1",
      });
    }
    previousRank.current = current;
  }, [scores.xp]);

  const allItems = categories.flatMap((c) =>
    c.items.map((item) => ({ ...item, category: c.name, color: c.color, emoji: c.emoji }))
  );

  const filtered = search.trim()
    ? allItems.filter(
        (i) =>
          i.tech.toLowerCase().includes(search.toLowerCase()) ||
          i.oneliner.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const displayCategory = categories[activeCategory];

  const getState = (key) =>
    cardState[key] || { phase: "front", quizIndex: 0, answered: null, runCorrect: 0, shuffled: null };

  const handleFlip = (key, item) => {
    setCardState((prev) => {
      const s = prev[key] || { phase: "front", quizIndex: 0, answered: null, runCorrect: 0, shuffled: null };
      if (s.phase === "front") {
        return { ...prev, [key]: { ...s, phase: "back" } };
      }
      if (s.phase === "back") {
        const shuffled = shuffle(item.quiz).map(shuffleOptions);
        return { ...prev, [key]: { ...s, phase: "quiz", quizIndex: 0, answered: null, runCorrect: 0, shuffled } };
      }
      return prev;
    });
  };

  const handleAnswer = (key, tech, optionIndex) => {
    const s = cardState[key];
    if (!s || s.answered !== null) return;
    const isCorrect = optionIndex === s.shuffled[s.quizIndex].correct;
    setCardState((prev) => ({
      ...prev,
      [key]: { ...s, answered: optionIndex, runCorrect: s.runCorrect + (isCorrect ? 1 : 0) },
    }));
    record(tech, isCorrect);
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

  const startDrill = () => {
    const questions = buildDrill(categories, scores.answers).map((entry) => ({
      ...entry,
      link: techLinks[entry.tech],
    }));
    setDrill({ questions, index: 0, answered: null, correctCount: 0, done: false });
  };

  const answerDrill = (optionIndex) => {
    if (drill.answered !== null) return;
    const cur = drill.questions[drill.index];
    const isCorrect = optionIndex === cur.q.correct;
    setDrill({ ...drill, answered: optionIndex, correctCount: drill.correctCount + (isCorrect ? 1 : 0) });
    record(cur.tech, isCorrect, "drill");
  };

  const nextDrill = () => {
    const nextIndex = drill.index + 1;
    if (nextIndex >= drill.questions.length) {
      if (drill.correctCount === drill.questions.length) {
        addXp(PERFECT_QUIZ_BONUS);
        setCelebration({
          title: t("celebration.perfectTitle"),
          subtitle: t("celebration.perfectSubtitle", { bonus: PERFECT_QUIZ_BONUS }),
          accent: "#22c55e",
        });
      }
      setDrill({ ...drill, done: true });
    } else {
      setDrill({ ...drill, index: nextIndex, answered: null });
    }
  };

  return (
    <div>
      <div style={{ padding: "24px 24px 0", maxWidth: 960, margin: "0 auto" }}>
        <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13, display: "flex", gap: 12 }}>
          <span>Tap a card to read prep notes · tap again to start a quiz · finish the quiz to reset.</span>
          <span style={{ marginLeft: "auto", fontWeight: 500, whiteSpace: "nowrap" }}>
            {allItems.length} technologies
          </span>
        </p>

        <StatsBar scores={scores} onDrill={startDrill} drillActive={!!drill} />

        {!drill && <AccuracyChart points={accuracy} />}

        <div style={{ position: "relative", marginBottom: 24 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: 14 }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search any technology…"
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 12px 10px 36px",
              background: "#1e2330", border: "1px solid #2d3748",
              borderRadius: 10, color: "#e2e8f0", fontSize: 14,
              outline: "none",
            }}
          />
        </div>
      </div>

      {drill ? (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 48px" }}>
          <DrillSession drill={drill} onAnswer={answerDrill} onNext={nextDrill} onExit={() => setDrill(null)} />
        </div>
      ) : filtered ? (
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 48px" }}>
          {filtered.length === 0 ? (
            <p style={{ color: "#64748b", textAlign: "center", marginTop: 40 }}>No matches found.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {filtered.map((item) => {
                const key = `search-${item.tech}`;
                return (
                  <Card
                    key={key}
                    item={item}
                    stat={scores.answers[item.tech]}
                    state={getState(key)}
                    onFlip={() => handleFlip(key, item)}
                    onAnswer={(i) => handleAnswer(key, item.tech, i)}
                    onNext={() => handleNextQuestion(key)}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingBottom: 12 }}>
              {categories.map((cat, i) => (
                <button
                  key={cat.name}
                  onClick={() => { setActiveCategory(i); setCardState({}); }}
                  style={{
                    padding: "7px 14px", borderRadius: 20, border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                    background: activeCategory === i ? cat.color : "#1e2330",
                    color: activeCategory === i ? "#fff" : "#94a3b8",
                    transition: "all 0.15s",
                  }}
                >
                  {cat.emoji} {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ maxWidth: 960, margin: "16px auto 0", padding: "0 24px 48px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {displayCategory.items.map((item) => {
                const key = `${activeCategory}-${item.tech}`;
                return (
                  <Card
                    key={key}
                    item={{ ...item, color: displayCategory.color, emoji: displayCategory.emoji }}
                    stat={scores.answers[item.tech]}
                    state={getState(key)}
                    onFlip={() => handleFlip(key, item)}
                    onAnswer={(i) => handleAnswer(key, item.tech, i)}
                    onNext={() => handleNextQuestion(key)}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}

      {celebration && (
        <CelebrationOverlay
          title={celebration.title}
          subtitle={celebration.subtitle}
          accent={celebration.accent}
          onDone={() => setCelebration(null)}
        />
      )}
    </div>
  );
}

function Card({ item, stat, state, onFlip, onAnswer, onNext }) {
  const { phase, quizIndex, answered, shuffled } = state;

  return (
    <div style={{ borderRadius: 14, overflow: "hidden", minHeight: 200 }}>
      {phase === "front" && <FrontFace item={item} stat={stat} onFlip={onFlip} />}
      {phase === "back" && <BackFace item={item} onFlip={onFlip} />}
      {phase === "quiz" && shuffled && (
        <QuizFace
          item={item}
          link={techLinks[item.tech]}
          question={shuffled[quizIndex]}
          questionNumber={quizIndex + 1}
          total={shuffled.length}
          answered={answered}
          onAnswer={onAnswer}
          onNext={onNext}
        />
      )}
    </div>
  );
}

function FrontFace({ item, stat, onFlip }) {
  const attempts = stat ? stat.correct + stat.wrong : 0;
  const accuracy = attempts ? Math.round((stat.correct / attempts) * 100) : null;

  return (
    <div
      onClick={onFlip}
      style={{
        cursor: "pointer",
        background: "#1e2330",
        border: `1px solid ${item.color}30`,
        borderRadius: 14,
        padding: "20px 18px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        minHeight: 160,
      }}
    >
      <div>
        <div style={{
          display: "inline-block", padding: "3px 10px",
          background: `${item.color}20`, borderRadius: 20,
          color: item.color, fontSize: 11, fontWeight: 700,
          letterSpacing: "0.04em", marginBottom: 10,
        }}>
          {item.tech}
        </div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "#cbd5e1" }}>
          {item.oneliner}
        </p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#475569", marginTop: 12 }}>
        <span style={{ color: accuracy === null ? "#475569" : accuracy >= 70 ? "#22c55e" : "#f59e0b" }}>
          {accuracy === null ? "" : `✓ ${accuracy}% · ${attempts} answered`}
        </span>
        <span>tap for prep notes →</span>
      </div>
    </div>
  );
}

function BackFace({ item, onFlip }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${item.color}18, #1e2330)`,
        border: `1px solid ${item.color}50`,
        borderRadius: 14,
        padding: "18px",
        display: "flex", flexDirection: "column", gap: 12,
        minHeight: 160,
      }}
    >
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: item.color, marginBottom: 10, letterSpacing: "0.06em" }}>
          INTERVIEW PREP
        </div>
        <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          {item.prep.map((point) => (
            <li key={point} style={{ fontSize: 12.5, lineHeight: 1.5, color: "#94a3b8" }}>
              {point}
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={onFlip}
        style={{
          marginTop: "auto",
          padding: "8px 14px",
          background: `${item.color}25`,
          border: `1px solid ${item.color}60`,
          borderRadius: 8,
          color: item.color,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          alignSelf: "flex-end",
        }}
      >
        Take quiz →
      </button>
    </div>
  );
}

function QuizFace({ item, link, question, questionNumber, total, answered, onAnswer, onNext }) {
  const isCorrect = answered !== null && answered === question.correct;
  const isLast = questionNumber === total;

  return (
    <div
      style={{
        background: "#1a1f2e",
        border: `1px solid ${item.color}40`,
        borderRadius: 14,
        padding: "18px",
        display: "flex", flexDirection: "column", gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: item.color, letterSpacing: "0.08em" }}>
          {item.tech} · QUIZ
        </div>
        <div style={{ fontSize: 10, color: "#475569" }}>
          {questionNumber} / {total}
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "#e2e8f0", fontWeight: 500 }}>
        {question.question}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {question.options.map((opt, i) => {
          const isThisCorrect = i === question.correct;
          const isThisChosen = answered === i;

          let bg = "#252b3b";
          let border = "1px solid #2d3748";
          let color = "#94a3b8";

          if (answered !== null) {
            if (isThisCorrect) {
              bg = "#14532d40";
              border = "1px solid #22c55e80";
              color = "#86efac";
            } else if (isThisChosen && !isThisCorrect) {
              bg = "#4c051940";
              border = "1px solid #ef444480";
              color = "#fca5a5";
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
            <span style={{ fontSize: 12, color: isCorrect ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
              {isCorrect ? `Correct! +${CORRECT_XP} XP` : "Incorrect"}
            </span>
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: "#7dd3fc", textDecoration: "none", fontWeight: 500 }}
              >
                Docs ↗
              </a>
            )}
          </span>
          <button
            onClick={onNext}
            style={{
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
            {isLast ? "Done ✓" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}

function StatsBar({ scores, onDrill, drillActive }) {
  const [showRanking, setShowRanking] = useState(false);

  const entries = Object.entries(scores.answers);
  const totals = entries.reduce(
    (acc, [, s]) => ({ correct: acc.correct + s.correct, wrong: acc.wrong + s.wrong }),
    { correct: 0, wrong: 0 }
  );
  const attempts = totals.correct + totals.wrong;
  const accuracy = attempts ? Math.round((totals.correct / attempts) * 100) : null;

  const rank = rankForXp(scores.xp);
  const next = RANKS[RANKS.indexOf(rank) + 1];
  const progress = next ? Math.round(((scores.xp - rank.min) / (next.min - rank.min)) * 100) : 100;

  const ranked = entries
    .filter(([, s]) => s.correct + s.wrong >= 2)
    .map(([tech, s]) => ({
      tech,
      acc: Math.round((s.correct / (s.correct + s.wrong)) * 100),
      n: s.correct + s.wrong,
    }))
    .sort((a, b) => b.acc - a.acc || b.n - a.n);

  return (
    <div
      style={{
        marginBottom: 20,
        padding: "14px 16px",
        background: "#1a1f2e",
        border: "1px solid #2d3748",
        borderRadius: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>
          🏆 {rank.name}
        </span>
        <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{scores.xp} XP</span>
        <div style={{ flex: 1, minWidth: 120, height: 6, background: "#252b3b", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "#6366f1", borderRadius: 3, transition: "width 0.3s" }} />
        </div>
        {next && (
          <span style={{ fontSize: 11, color: "#64748b" }}>
            {next.min - scores.xp} XP to {next.name}
          </span>
        )}
        {accuracy !== null && (
          <span style={{ fontSize: 12, color: accuracy >= 70 ? "#22c55e" : "#f59e0b", fontWeight: 600 }}>
            {accuracy}% accuracy · {attempts} answered
          </span>
        )}
        <button
          onClick={onDrill}
          disabled={drillActive}
          style={{
            padding: "5px 12px",
            background: "#6366f125",
            border: "1px solid #6366f160",
            borderRadius: 8,
            color: "#a5b4fc",
            fontSize: 11,
            fontWeight: 600,
            cursor: drillActive ? "default" : "pointer",
            opacity: drillActive ? 0.5 : 1,
          }}
        >
          🎯 Drill weakest
        </button>
        {ranked.length > 0 && (
          <button
            onClick={() => setShowRanking((v) => !v)}
            style={{
              padding: "5px 12px",
              background: "transparent",
              border: "1px solid #2d3748",
              borderRadius: 8,
              color: "#94a3b8",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Ranking {showRanking ? "▴" : "▾"}
          </button>
        )}
      </div>

      <div style={{ fontSize: 10.5, color: "#475569", marginTop: 8 }}>
        +{CORRECT_XP} XP per correct answer · +{PERFECT_QUIZ_BONUS} XP for a perfect quiz
      </div>

      {showRanking && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }}>
          <RankingList title="💪 Strongest" items={ranked.slice(0, 5)} color="#22c55e" />
          <RankingList title="📉 Needs work" items={[...ranked].reverse().slice(0, 5)} color="#f59e0b" />
        </div>
      )}
    </div>
  );
}

function RankingList({ title, items, color }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 8, letterSpacing: "0.04em" }}>
        {title}
      </div>
      <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((r) => (
          <li key={r.tech} style={{ fontSize: 12, color: "#cbd5e1" }}>
            {r.tech} <span style={{ color, fontWeight: 600 }}>{r.acc}%</span>{" "}
            <span style={{ color: "#475569" }}>({r.n})</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function DrillSession({ drill, onAnswer, onNext, onExit }) {
  const { questions, index, answered, correctCount, done } = drill;

  if (done) {
    const perfect = correctCount === questions.length;
    return (
      <div
        style={{
          background: "#1a1f2e", border: "1px solid #2d3748", borderRadius: 14,
          padding: "32px 24px", textAlign: "center",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>{perfect ? "🏆" : correctCount >= questions.length / 2 ? "💪" : "📚"}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>
          {correctCount} / {questions.length}
        </div>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#94a3b8" }}>
          +{correctCount * CORRECT_XP} XP{perfect ? ` · +${PERFECT_QUIZ_BONUS} perfect bonus` : ""} — accuracy recorded
          per tech, so the next drill adapts.
        </p>
        <button
          onClick={onExit}
          style={{
            padding: "9px 18px", background: "#6366f1", border: "none", borderRadius: 8,
            color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
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
        background: "#1a1f2e", border: `1px solid ${cur.color}40`, borderRadius: 14,
        padding: "20px", display: "flex", flexDirection: "column", gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: cur.color, letterSpacing: "0.08em" }}>
          🎯 DRILL · {cur.tech}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 10, color: "#475569" }}>{index + 1} / {questions.length}</span>
          <button
            onClick={onExit}
            style={{
              padding: "3px 10px", background: "transparent", border: "1px solid #2d3748",
              borderRadius: 8, color: "#64748b", fontSize: 10, fontWeight: 600, cursor: "pointer",
            }}
          >
            Exit
          </button>
        </span>
      </div>

      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "#e2e8f0", fontWeight: 500 }}>
        {cur.q.question}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {cur.q.options.map((opt, i) => {
          const isThisCorrect = i === cur.q.correct;
          const isThisChosen = answered === i;

          let bg = "#252b3b";
          let border = "1px solid #2d3748";
          let color = "#94a3b8";

          if (answered !== null) {
            if (isThisCorrect) {
              bg = "#14532d40";
              border = "1px solid #22c55e80";
              color = "#86efac";
            } else if (isThisChosen && !isThisCorrect) {
              bg = "#4c051940";
              border = "1px solid #ef444480";
              color = "#fca5a5";
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
            <span style={{ fontSize: 12, color: isCorrect ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
              {isCorrect ? `Correct! +${CORRECT_XP} XP` : "Incorrect"}
            </span>
            {cur.link && (
              <a
                href={cur.link}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: "#7dd3fc", textDecoration: "none", fontWeight: 500 }}
              >
                Docs ↗
              </a>
            )}
          </span>
          <button
            onClick={onNext}
            style={{
              padding: "7px 14px", background: `${cur.color}25`, border: `1px solid ${cur.color}60`,
              borderRadius: 8, color: cur.color, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            {isLast ? "Finish ✓" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}

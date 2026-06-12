import { useState } from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { PERFECT_QUIZ_BONUS } from "@tech-refresh/core/gamification";
import { shuffle, shuffleOptions } from "@tech-refresh/core/quiz";
import { colors } from "@/theme";
import { QuizView } from "./QuizView";

type Item = {
  tech: string;
  oneliner: string;
  prep: string[];
  quiz: { question: string; options: string[]; correct: number }[];
  color: string;
};

type Stat = { correct: number; wrong: number } | undefined;

type Props = {
  item: Item;
  stat: Stat;
  record: (tech: string, isCorrect: boolean, source?: string) => void;
  addXp: (points: number) => void;
};

const SPRING = { damping: 16, stiffness: 140 };

// 3D card flip on the UI thread: front face 0→180°, back face -180→0.
export function FlipCard({ item, stat, record, addXp }: Props) {
  const rotation = useSharedValue(0);
  const [phase, setPhase] = useState<"front" | "back" | "quiz">("front");
  const [quiz, setQuiz] = useState<{ questions: Item["quiz"]; index: number; answered: number | null; runCorrect: number } | null>(null);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${rotation.value}deg` }],
    backfaceVisibility: "hidden" as const,
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${rotation.value - 180}deg` }],
    backfaceVisibility: "hidden" as const,
    opacity: interpolate(rotation.value, [89, 91], [0, 1]),
  }));

  const flipToBack = () => {
    rotation.value = withSpring(180, SPRING);
    setPhase("back");
  };

  const flipToFront = () => {
    rotation.value = withSpring(0, SPRING);
    setPhase("front");
    setQuiz(null);
  };

  const startQuiz = () => {
    setQuiz({ questions: shuffle(item.quiz).map(shuffleOptions), index: 0, answered: null, runCorrect: 0 });
    setPhase("quiz");
  };

  const answer = (i: number) => {
    if (!quiz || quiz.answered !== null) return;
    const isCorrect = i === quiz.questions[quiz.index].correct;
    setQuiz({ ...quiz, answered: i, runCorrect: quiz.runCorrect + (isCorrect ? 1 : 0) });
    record(item.tech, isCorrect);
  };

  const next = () => {
    if (!quiz) return;
    const nextIndex = quiz.index + 1;
    if (nextIndex >= quiz.questions.length) {
      if (quiz.runCorrect === quiz.questions.length) addXp(PERFECT_QUIZ_BONUS);
      flipToFront();
    } else {
      setQuiz({ ...quiz, index: nextIndex, answered: null });
    }
  };

  const attempts = stat ? stat.correct + stat.wrong : 0;
  const accuracy = attempts ? Math.round(((stat?.correct ?? 0) / attempts) * 100) : null;

  if (phase === "quiz" && quiz) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: `${item.color}40`,
          borderRadius: 14,
          padding: 16,
        }}
      >
        <QuizView
          tech={item.tech}
          color={item.color}
          question={quiz.questions[quiz.index]}
          questionNumber={quiz.index + 1}
          total={quiz.questions.length}
          answered={quiz.answered}
          onAnswer={answer}
          onNext={next}
          isLast={quiz.index === quiz.questions.length - 1}
        />
      </View>
    );
  }

  return (
    <View style={{ minHeight: 185 }}>
      {/* Front */}
      <Animated.View style={[{ borderRadius: 14 }, frontStyle, phase !== "front" && { position: "absolute", inset: 0 }]}>
        <Pressable
          onPress={flipToBack}
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: `${item.color}30`,
            borderRadius: 14,
            padding: 18,
            minHeight: 185,
            justifyContent: "space-between",
          }}
        >
          <View>
            <View
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 10,
                paddingVertical: 3,
                backgroundColor: `${item.color}20`,
                borderRadius: 20,
                marginBottom: 10,
              }}
            >
              <Text style={{ color: item.color, fontSize: 11, fontWeight: "700", letterSpacing: 0.4 }}>
                {item.tech}
              </Text>
            </View>
            <Text style={{ fontSize: 14, lineHeight: 21, color: colors.text }}>{item.oneliner}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
            <Text style={{ fontSize: 11, color: accuracy !== null && accuracy >= 70 ? colors.success : colors.warning }}>
              {accuracy === null ? "" : `✓ ${accuracy}% · ${attempts} answered`}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textFaint }}>tap for prep notes →</Text>
          </View>
        </Pressable>
      </Animated.View>

      {/* Back */}
      {phase === "back" && (
        <Animated.View style={[{ borderRadius: 14 }, backStyle]}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: `${item.color}50`,
              borderRadius: 14,
              padding: 16,
              minHeight: 185,
              gap: 10,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", color: item.color, letterSpacing: 0.6 }}>
              INTERVIEW PREP
            </Text>
            <View style={{ gap: 6 }}>
              {item.prep.map((point) => (
                <Text key={point} style={{ fontSize: 12.5, lineHeight: 18, color: colors.textDim }}>
                  {"•"} {point}
                </Text>
              ))}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: "auto" }}>
              <TouchableOpacity onPress={flipToFront} style={{ padding: 8 }}>
                <Text style={{ fontSize: 12, color: colors.textFaint }}>← flip back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={startQuiz}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  backgroundColor: `${item.color}25`,
                  borderWidth: 1,
                  borderColor: `${item.color}60`,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: item.color }}>Take quiz →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

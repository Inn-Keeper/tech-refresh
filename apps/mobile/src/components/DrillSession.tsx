import { Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { CORRECT_XP, PERFECT_QUIZ_BONUS } from "@tech-refresh/core/gamification";
import { colors } from "@/theme";
import { QuizView } from "./QuizView";

export type Drill = {
  questions: { tech: string; color: string; q: { question: string; options: string[]; correct: number } }[];
  index: number;
  answered: number | null;
  correctCount: number;
  done: boolean;
};

type Props = {
  drill: Drill;
  onAnswer: (i: number) => void;
  onNext: () => void;
  onExit: () => void;
};

export function DrillSession({ drill, onAnswer, onNext, onExit }: Props) {
  if (drill.done) {
    const perfect = drill.correctCount === drill.questions.length;
    return (
      <Animated.View
        entering={FadeInDown.springify()}
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          padding: 28,
          alignItems: "center",
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 34 }}>
          {perfect ? "🏆" : drill.correctCount >= drill.questions.length / 2 ? "💪" : "📚"}
        </Text>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.textBright }}>
          {drill.correctCount} / {drill.questions.length}
        </Text>
        <Text style={{ fontSize: 13, color: colors.textDim, textAlign: "center" }}>
          +{drill.correctCount * CORRECT_XP} XP{perfect ? ` · +${PERFECT_QUIZ_BONUS} perfect bonus` : ""}
        </Text>
        <TouchableOpacity
          onPress={onExit}
          style={{ backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 9, marginTop: 8 }}
        >
          <Text style={{ color: colors.onAccent, fontWeight: "600", fontSize: 13 }}>Back to cards</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  const cur = drill.questions[drill.index];
  return (
    <Animated.View
      key={drill.index}
      entering={FadeInDown.springify().damping(16)}
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: `${cur.color}40`,
        borderRadius: 14,
        padding: 16,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 10, fontWeight: "700", color: cur.color, letterSpacing: 0.8 }}>🎯 DRILL</Text>
        <TouchableOpacity onPress={onExit}>
          <Text style={{ fontSize: 11, color: colors.textFaint }}>Exit ✕</Text>
        </TouchableOpacity>
      </View>
      <QuizView
        tech={cur.tech}
        color={cur.color}
        question={cur.q}
        questionNumber={drill.index + 1}
        total={drill.questions.length}
        answered={drill.answered}
        onAnswer={onAnswer}
        onNext={onNext}
        isLast={drill.index === drill.questions.length - 1}
      />
    </Animated.View>
  );
}

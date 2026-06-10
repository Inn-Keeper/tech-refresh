import { Linking, Text, TouchableOpacity, View } from "react-native";
import { techLinks } from "@tech-refresh/core/techLinks";
import { CORRECT_XP } from "@tech-refresh/core/gamification";
import { colors } from "@/theme";

type Question = { question: string; options: string[]; correct: number };

type Props = {
  tech: string;
  color: string;
  question: Question;
  questionNumber: number;
  total: number;
  answered: number | null;
  onAnswer: (i: number) => void;
  onNext: () => void;
  isLast: boolean;
};

export function QuizView({ tech, color, question, questionNumber, total, answered, onAnswer, onNext, isLast }: Props) {
  const isCorrect = answered !== null && answered === question.correct;
  const link = techLinks[tech];

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 10, fontWeight: "700", color, letterSpacing: 0.8 }}>
          {tech.toUpperCase()} · QUIZ
        </Text>
        <Text style={{ fontSize: 10, color: colors.textFaint }}>
          {questionNumber} / {total}
        </Text>
      </View>

      <Text style={{ fontSize: 14, lineHeight: 20, color: colors.text, fontWeight: "500" }}>
        {question.question}
      </Text>

      <View style={{ gap: 7 }}>
        {question.options.map((opt, i) => {
          const isThisCorrect = i === question.correct;
          const isThisChosen = answered === i;
          let bg = "#252b3b";
          let border = colors.border;
          let textColor = colors.textDim;
          if (answered !== null) {
            if (isThisCorrect) {
              bg = "#14532d40";
              border = "#22c55e80";
              textColor = "#86efac";
            } else if (isThisChosen) {
              bg = "#4c051940";
              border = "#ef444480";
              textColor = "#fca5a5";
            }
          }
          return (
            <TouchableOpacity
              key={i}
              disabled={answered !== null}
              onPress={() => onAnswer(i)}
              style={{ padding: 11, backgroundColor: bg, borderWidth: 1, borderColor: border, borderRadius: 8 }}
            >
              <Text style={{ fontSize: 12.5, lineHeight: 18, color: textColor }}>
                <Text style={{ opacity: 0.5 }}>{String.fromCharCode(65 + i)}. </Text>
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {answered !== null && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: isCorrect ? colors.green : colors.red }}>
              {isCorrect ? `Correct! +${CORRECT_XP} XP` : "Incorrect"}
            </Text>
            {link && (
              <TouchableOpacity onPress={() => Linking.openURL(link)}>
                <Text style={{ fontSize: 12, color: "#7dd3fc", fontWeight: "500" }}>Docs ↗</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={onNext}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              backgroundColor: `${color}25`,
              borderWidth: 1,
              borderColor: `${color}60`,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "600", color }}>{isLast ? "Done ✓" : "Next →"}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

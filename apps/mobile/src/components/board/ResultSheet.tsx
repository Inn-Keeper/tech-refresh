import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import type { EvalResult, Scenario } from "@tech-refresh/core/arch";
import { t } from "@tech-refresh/core/i18n";
import { colors } from "@/theme";
import { Button } from "@/components/ui";

type Props = {
  result: EvalResult | null;
  scenario: Scenario;
  onClose: () => void;
};

function verdict(score: number): { label: string; color: string } {
  if (score >= 80) return { label: t("board.verdictShip"), color: colors.success };
  if (score >= 50) return { label: t("board.verdictReview"), color: colors.warning };
  return { label: t("board.verdictWhiteboard"), color: colors.danger };
}

export function ResultSheet({ result, scenario, onClose }: Props) {
  if (!result) return null;
  const { label, color } = verdict(result.score);
  const maintLabel = result.maint <= 8 ? "lean" : result.maint <= 14 ? "moderate" : "heavy";

  return (
    // Modal's native slide animation — Reanimated entering animations
    // don't fire reliably inside RN Modals.
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: colors.modalScrim }} />
      <View
        style={{
          maxHeight: "75%",
          backgroundColor: colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 20,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
          <Text style={{ fontSize: 30, fontWeight: "700", color }}>{result.score}%</Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textBright, flex: 1 }}>{label}</Text>
        </View>
        <Text style={{ fontSize: 12, color: colors.textDim, marginBottom: 14 }}>
          💰 {result.cost}/{scenario.budget} budget · 🔧 maintenance {result.maint} ({maintLabel})
        </Text>

        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 14, paddingBottom: 8 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textDim, letterSpacing: 0.6 }}>
              {t("board.designChecks")}
            </Text>
            {result.checks.map((check) => (
              <Text
                key={check.label}
                style={{ fontSize: 12.5, lineHeight: 18, color: check.passed ? colors.successBright : colors.dangerBright }}
              >
                {check.passed ? "✅" : "❌"} {check.label} ({check.points} pts)
              </Text>
            ))}
          </View>

          {result.warnings.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textDim, letterSpacing: 0.6 }}>
                {t("board.meetingNotes")}
              </Text>
              {result.warnings.map((warning) => (
                <Text key={warning} style={{ fontSize: 12.5, lineHeight: 18, color: colors.warningBright }}>
                  ⚠️ {warning}
                </Text>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={{ marginTop: 12, alignItems: "flex-end" }}>
          <Button label={t("common.close")} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

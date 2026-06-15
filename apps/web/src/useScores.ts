import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CORRECT_XP } from "@tech-refresh/core/gamification";
import { difficultyByKey } from "@tech-refresh/core/difficulty";
import { addXp as addXpApi, getScores, recordAnswer } from "./api";

type ScoreState = { 
  xp: number; 
  answers: Record<string, { correct: number; wrong: number }> 
};
type RecordArgs = { 
  tech: string; isCorrect: boolean; source: string; difficulty: string | null };

const EMPTY: ScoreState = { xp: 0, answers: {} };

// Quiz score store backed by Supabase (profiles + answer_events).
// Mutations apply optimistically so the quiz UI never waits on the network.
export function useScores() {
  const queryClient = useQueryClient();
  const { data, isFetched } = useQuery({ queryKey: ["scores"], queryFn: getScores });
  const scores = data ?? EMPTY;

  const patch = (updater: (s: ScoreState) => ScoreState) =>
    queryClient.setQueryData(["scores"], (old: ScoreState | undefined) => updater(old ?? EMPTY));
  const rollback = () => queryClient.invalidateQueries({ queryKey: ["scores"] });

  const recordMutation = useMutation({
    mutationFn: ({ tech, isCorrect, source, difficulty }: RecordArgs) => recordAnswer(tech, isCorrect, source, difficulty),
    onMutate: ({ tech, isCorrect, difficulty }: RecordArgs) =>
      patch((s) => ({
        xp: s.xp + (isCorrect ? (difficultyByKey(difficulty ?? "")?.xp ?? CORRECT_XP) : 0),
        answers: {
          ...s.answers,
          [tech]: {
            correct: (s.answers[tech]?.correct ?? 0) + (isCorrect ? 1 : 0),
            wrong: (s.answers[tech]?.wrong ?? 0) + (isCorrect ? 0 : 1),
          },
        },
      })),
    onError: rollback,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["accuracy-timeline"] }),
  });

  const xpMutation = useMutation({
    mutationFn: addXpApi,
    onMutate: (points: number) => patch((s) => ({ ...s, xp: s.xp + points })),
    onError: rollback,
  });

  return {
    scores,
    scoresReady: isFetched,
    record: (tech: string, isCorrect: boolean, source = "card", difficulty: string | null = null) =>
      recordMutation.mutate({ tech, isCorrect, source, difficulty }),
    addXp: (points: number) => xpMutation.mutate(points),
  };
}

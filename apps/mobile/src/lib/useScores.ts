import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CORRECT_XP } from "@tech-refresh/core/gamification";
import { difficultyByKey } from "@tech-refresh/core/difficulty";
import type { Scores } from "@tech-refresh/core/api";
import { api } from "./api";

export type { Scores };

const EMPTY: Scores = { xp: 0, answers: {} };

// Same optimistic score store as the web app, bound to the mobile client.
export function useScores() {
  const queryClient = useQueryClient();
  const { data } = useQuery<Scores>({ queryKey: ["scores"], queryFn: api.getScores });
  const scores = data ?? EMPTY;

  const patch = (updater: (s: Scores) => Scores) =>
    queryClient.setQueryData<Scores>(["scores"], (old) => updater(old ?? EMPTY));
  const rollback = () => queryClient.invalidateQueries({ queryKey: ["scores"] });

  const recordMutation = useMutation({
    mutationFn: ({ tech, isCorrect, source, difficulty }: { tech: string; isCorrect: boolean; source: string; difficulty: string | null }) =>
      api.recordAnswer(tech, isCorrect, source, difficulty),
    onMutate: ({ tech, isCorrect, difficulty }) =>
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
    mutationFn: (points: number) => api.addXp(points),
    onMutate: (points) => patch((s) => ({ ...s, xp: s.xp + points })),
    onError: rollback,
  });

  return {
    scores,
    record: (tech: string, isCorrect: boolean, source = "card", difficulty: string | null = null) =>
      recordMutation.mutate({ tech, isCorrect, source, difficulty }),
    addXp: (points: number) => xpMutation.mutate(points),
  };
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CORRECT_XP } from "@tech-refresh/core/gamification";
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
    mutationFn: ({ tech, isCorrect, source }: { tech: string; isCorrect: boolean; source: string }) =>
      api.recordAnswer(tech, isCorrect, source),
    onMutate: ({ tech, isCorrect }) =>
      patch((s) => ({
        xp: s.xp + (isCorrect ? CORRECT_XP : 0),
        answers: {
          ...s.answers,
          [tech]: {
            correct: (s.answers[tech]?.correct ?? 0) + (isCorrect ? 1 : 0),
            wrong: (s.answers[tech]?.wrong ?? 0) + (isCorrect ? 0 : 1),
          },
        },
      })),
    onError: rollback,
  });

  const xpMutation = useMutation({
    mutationFn: (points: number) => api.addXp(points),
    onMutate: (points) => patch((s) => ({ ...s, xp: s.xp + points })),
    onError: rollback,
  });

  return {
    scores,
    record: (tech: string, isCorrect: boolean, source = "card") =>
      recordMutation.mutate({ tech, isCorrect, source }),
    addXp: (points: number) => xpMutation.mutate(points),
  };
}

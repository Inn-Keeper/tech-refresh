import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CORRECT_XP } from "@tech-refresh/core/gamification";
import { difficultyByKey } from "@tech-refresh/core/difficulty";
import { addXp as addXpApi, getScores, recordAnswer } from "./api.js";

const EMPTY = { xp: 0, answers: {} };

// Quiz score store backed by Supabase (profiles + answer_events).
// Mutations apply optimistically so the quiz UI never waits on the network.
export function useScores() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["scores"], queryFn: getScores });
  const scores = data ?? EMPTY;

  const patch = (updater) =>
    queryClient.setQueryData(["scores"], (old) => updater(old ?? EMPTY));
  const rollback = () => queryClient.invalidateQueries({ queryKey: ["scores"] });

  const recordMutation = useMutation({
    mutationFn: ({ tech, isCorrect, source, difficulty }) => recordAnswer(tech, isCorrect, source, difficulty),
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
    mutationFn: addXpApi,
    onMutate: (points) => patch((s) => ({ ...s, xp: s.xp + points })),
    onError: rollback,
  });

  return {
    scores,
    record: (tech, isCorrect, source = "card", difficulty = null) =>
      recordMutation.mutate({ tech, isCorrect, source, difficulty }),
    addXp: (points) => xpMutation.mutate(points),
  };
}

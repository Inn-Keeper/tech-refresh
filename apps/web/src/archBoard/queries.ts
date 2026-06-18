import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../lib/api";

export const archBoardQueryKeys = {
  boards: ["arch-boards"] as const,
  customScenarios: ["custom-scenarios"] as const,
};

export function useCustomScenariosQuery() {
  return useQuery({
    queryKey: archBoardQueryKeys.customScenarios,
    queryFn: api.listCustomScenarios,
  });
}

export function useSavedBoardsQuery() {
  return useQuery({
    queryKey: archBoardQueryKeys.boards,
    queryFn: api.listBoards,
  });
}

export function useSaveBoardMutation(onSaved: (board: { id?: string; title: string }) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.upsertBoard,
    onSuccess: (board: { id?: string; title: string }) => {
      onSaved(board);
      queryClient.invalidateQueries({ queryKey: archBoardQueryKeys.boards });
    },
  });
}

export function useDeleteBoardMutation(onDeleted: (id: string) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteBoard,
    onSuccess: (_data: unknown, id: string) => {
      onDeleted(id);
      queryClient.invalidateQueries({ queryKey: archBoardQueryKeys.boards });
    },
  });
}

export function useSaveScenarioMutation(onSaved: (saved: { id: string }) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (scenario: object) => api.upsertCustomScenario(scenario) as Promise<{ id: string }>,
    onSuccess: (saved: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: archBoardQueryKeys.customScenarios });
      onSaved(saved);
    },
  });
}

export function useDeleteScenarioMutation(onDeleted: (id: string) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteCustomScenario,
    onSuccess: (_data: unknown, id: string) => {
      queryClient.invalidateQueries({ queryKey: archBoardQueryKeys.customScenarios });
      onDeleted(id);
    },
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../lib/api";

export const storyQueryKeys = {
  stories: ["stories"] as const,
};

export function useStoriesQuery() {
  return useQuery({ queryKey: storyQueryKeys.stories, queryFn: api.listStories });
}

function useInvalidateStories() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: storyQueryKeys.stories });
}

export function useSaveStoryMutation() {
  const invalidate = useInvalidateStories();
  return useMutation({ mutationFn: api.upsertStory, onSettled: invalidate });
}

export function useDeleteStoryMutation() {
  const invalidate = useInvalidateStories();
  return useMutation({ mutationFn: api.deleteStory, onSettled: invalidate });
}

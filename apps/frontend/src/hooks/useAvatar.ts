/**
 * Avatar React Query Hooks
 * Provides data fetching and mutations for character creator avatar configuration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { avatarApi } from '../lib/api';
import type { CharacterConfig } from '../lib/character/types';

// Query keys for caching
export const avatarQueryKeys = {
  all: ['avatar'] as const,
  config: () => [...avatarQueryKeys.all, 'config'] as const,
  player: (userId: string) => [...avatarQueryKeys.all, 'player', userId] as const,
  players: (userIds: string[]) => [...avatarQueryKeys.all, 'players', userIds.join(',')] as const,
};

interface AvatarConfigResponse {
  config: CharacterConfig | null;
  version: number;
  message?: string;
}

interface SaveAvatarResponse {
  success: boolean;
  avatarId: string;
  version: number;
}

interface PlayerConfigResponse {
  config: CharacterConfig | null;
  bodyType: string | null;
}

interface PlayersConfigResponse {
  configs: Record<string, CharacterConfig>;
}

/**
 * Hook to fetch current user's avatar configuration
 */
export function useAvatarConfig(options?: { enabled?: boolean }) {
  return useQuery<AvatarConfigResponse>({
    queryKey: avatarQueryKeys.config(),
    queryFn: async () => {
      const response = await avatarApi.getConfig();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to save avatar configuration
 */
export function useSaveAvatarConfig() {
  const queryClient = useQueryClient();

  return useMutation<SaveAvatarResponse, Error, CharacterConfig>({
    mutationFn: async (config: CharacterConfig) => {
      const response = await avatarApi.saveConfig(config);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate the avatar config query to refetch fresh data
      queryClient.invalidateQueries({ queryKey: avatarQueryKeys.config() });
    },
  });
}

/**
 * Hook to delete avatar configuration
 */
export function useDeleteAvatarConfig() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error>({
    mutationFn: async () => {
      const response = await avatarApi.deleteConfig();
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and reset the avatar config query
      queryClient.invalidateQueries({ queryKey: avatarQueryKeys.config() });
    },
  });
}

/**
 * Hook to fetch another player's avatar configuration (for multiplayer)
 */
export function usePlayerAvatarConfig(userId: string, options?: { enabled?: boolean }) {
  return useQuery<PlayerConfigResponse>({
    queryKey: avatarQueryKeys.player(userId),
    queryFn: async () => {
      const response = await avatarApi.getPlayerConfig(userId);
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes (player configs change less frequently)
    retry: 1,
    enabled: (options?.enabled ?? true) && !!userId,
  });
}

/**
 * Hook to fetch multiple players' avatar configurations (batch for multiplayer)
 */
export function usePlayersAvatarConfigs(playerIds: string[], options?: { enabled?: boolean }) {
  return useQuery<PlayersConfigResponse>({
    queryKey: avatarQueryKeys.players(playerIds),
    queryFn: async () => {
      const response = await avatarApi.getPlayerConfigs(playerIds);
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
    enabled: (options?.enabled ?? true) && playerIds.length > 0,
  });
}

/**
 * Hook that combines fetching and saving for convenience
 */
export function useAvatarManager() {
  const configQuery = useAvatarConfig();
  const saveMutation = useSaveAvatarConfig();
  const deleteMutation = useDeleteAvatarConfig();

  return {
    // Data
    config: configQuery.data?.config ?? null,
    version: configQuery.data?.version ?? 0,
    hasAvatar: !!configQuery.data?.config,

    // Loading states
    isLoading: configQuery.isLoading,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Error states
    error: configQuery.error,
    saveError: saveMutation.error,

    // Actions
    save: saveMutation.mutateAsync,
    deleteAvatar: deleteMutation.mutateAsync,
    refetch: configQuery.refetch,
  };
}

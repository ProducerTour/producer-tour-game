import { useQuery } from '@tanstack/react-query';
import { gamificationApi } from '../lib/api';

interface ToolAccessResponse {
  hasAccess: boolean;
  isAdmin?: boolean;
  isWriter?: boolean;
  redemption?: {
    id: string;
    expiresAt: string | null;
    reward: {
      name: string;
      details: any;
    };
  };
  expiresAt?: string | null;
}

interface UserToolAccess {
  toolId: string;
  name: string;
  expiresAt: string | null;
  redemptionId: string;
}

export function useToolAccess(toolId: string) {
  return useQuery<ToolAccessResponse>({
    queryKey: ['tool-access', toolId],
    queryFn: async () => {
      const response = await gamificationApi.checkToolAccess(toolId);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
}

export function useUserToolAccess() {
  return useQuery<{ tools: UserToolAccess[] }>({
    queryKey: ['user-tool-access'],
    queryFn: async () => {
      const response = await gamificationApi.getUserToolAccess();
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

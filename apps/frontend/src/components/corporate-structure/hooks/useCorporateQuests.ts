import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { corporateApi, aiApi } from '../../../lib/api';
import { useSocket } from '../../../hooks/useSocket';
import type {
  CorporateEntity,
  CorporateQuest,
  CorporateStats,
  ComplianceItem,
  CorporateUserProgress,
  QuestStepExplanation,
  EntityVerificationResult,
  CompanyDetails,
} from '../types';

// ============================================================================
// Entity Hooks
// ============================================================================

export function useCorporateEntities() {
  return useQuery<CorporateEntity[]>({
    queryKey: ['corporate', 'entities'],
    queryFn: async () => {
      const response = await corporateApi.getEntities();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCorporateEntity(id: string) {
  return useQuery<CorporateEntity>({
    queryKey: ['corporate', 'entity', id],
    queryFn: async () => {
      const response = await corporateApi.getEntity(id);
      return response.data;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ============================================================================
// Quest Hooks
// ============================================================================

export function useCorporateQuests(entityId: string, enablePolling = false) {
  return useQuery<CorporateQuest[]>({
    queryKey: ['corporate', 'quests', entityId],
    queryFn: async () => {
      const response = await corporateApi.getQuests(entityId);
      return response.data;
    },
    enabled: !!entityId,
    staleTime: 30 * 1000, // 30 seconds for faster co-op updates
    // Enable polling for co-op mode - refresh every 10 seconds when active
    refetchInterval: enablePolling ? 10000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useQuestDetails(questId: string) {
  return useQuery<CorporateQuest>({
    queryKey: ['corporate', 'quest', questId],
    queryFn: async () => {
      const response = await corporateApi.getQuestDetails(questId);
      return response.data;
    },
    enabled: !!questId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useStartQuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questId: string) => {
      const response = await corporateApi.startQuest(questId);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['corporate', 'quests'] });
      queryClient.invalidateQueries({ queryKey: ['corporate', 'quest', data.id] });
    },
  });
}

export function useCompleteQuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questId: string) => {
      const response = await corporateApi.completeQuest(questId);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all corporate queries to reflect XP and quest status changes
      queryClient.invalidateQueries({ queryKey: ['corporate'] });
    },
  });
}

// ============================================================================
// Quest Step Hooks
// ============================================================================

export function useCompleteStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stepId, documentId }: { stepId: string; documentId?: string }) => {
      const response = await corporateApi.completeStep(stepId, documentId);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate quest queries to reflect step progress
      queryClient.invalidateQueries({ queryKey: ['corporate', 'quests'] });
      queryClient.invalidateQueries({ queryKey: ['corporate', 'quest', data.questId] });
    },
  });
}

export function useSkipStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stepId, reason }: { stepId: string; reason?: string }) => {
      const response = await corporateApi.skipStep(stepId, reason);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['corporate', 'quests'] });
      queryClient.invalidateQueries({ queryKey: ['corporate', 'quest', data.questId] });
    },
  });
}

export function useUncompleteStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stepId: string) => {
      const response = await corporateApi.uncompleteStep(stepId);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['corporate', 'quests'] });
      queryClient.invalidateQueries({ queryKey: ['corporate', 'quest', data.questId] });
    },
  });
}

// ============================================================================
// Compliance Hooks
// ============================================================================

export function useComplianceItems(entityId?: string) {
  return useQuery<ComplianceItem[]>({
    queryKey: ['corporate', 'compliance', entityId],
    queryFn: async () => {
      const response = await corporateApi.getComplianceItems(entityId);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpcomingCompliance() {
  return useQuery<ComplianceItem[]>({
    queryKey: ['corporate', 'compliance', 'upcoming'],
    queryFn: async () => {
      const response = await corporateApi.getUpcomingCompliance();
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateCompliance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { status?: string; documentId?: string; completedAt?: string };
    }) => {
      const response = await corporateApi.updateComplianceItem(id, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate', 'compliance'] });
    },
  });
}

// ============================================================================
// Progress & Stats Hooks
// ============================================================================

export function useCorporateProgress() {
  return useQuery<CorporateUserProgress>({
    queryKey: ['corporate', 'progress'],
    queryFn: async () => {
      const response = await corporateApi.getProgress();
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useCorporateStats() {
  return useQuery<CorporateStats>({
    queryKey: ['corporate', 'stats'],
    queryFn: async () => {
      const response = await corporateApi.getStats();
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// AI Quest Advisor Hooks
// ============================================================================

export interface ExplainStepContext {
  stepTitle: string;
  stepDescription: string;
  actionType?: string;
  questTitle: string;
  questCategory?: string;
  entityName: string;
  entityType?: string;
  jurisdiction?: string;
  actionData?: Record<string, unknown>;
}

export function useExplainQuestStep() {
  return useMutation<QuestStepExplanation, Error, ExplainStepContext>({
    mutationFn: async (context) => {
      console.log('[useExplainQuestStep] mutationFn called with:', context);
      try {
        const response = await aiApi.explainQuestStep(context);
        console.log('[useExplainQuestStep] API response status:', response.status);
        console.log('[useExplainQuestStep] API response.data:', response.data);
        console.log('[useExplainQuestStep] Extracted explanation:', response.data.explanation);
        return response.data.explanation;
      } catch (error) {
        console.error('[useExplainQuestStep] API call failed:', error);
        throw error;
      }
    },
    onMutate: (variables) => {
      console.log('[useExplainQuestStep] onMutate - starting with:', variables.stepTitle);
    },
    onSuccess: (data) => {
      console.log('[useExplainQuestStep] onSuccess - data keys:', Object.keys(data || {}));
    },
    onError: (error) => {
      console.error('[useExplainQuestStep] onError:', error.message);
    },
  });
}

export function useUploadStepDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stepId, file }: { stepId: string; file: File }) => {
      const response = await corporateApi.uploadStepDocument(stepId, file);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate quest queries to reflect step completion
      queryClient.invalidateQueries({ queryKey: ['corporate', 'quests'] });
      if (data.step?.questId) {
        queryClient.invalidateQueries({ queryKey: ['corporate', 'quest', data.step.questId] });
      }
    },
  });
}

// ============================================================================
// Document Hooks
// ============================================================================

export function useCorporateDocuments(entityId: string, category?: string) {
  return useQuery<import('../types').CorporateDocument[]>({
    queryKey: ['corporate', 'documents', entityId, category],
    queryFn: async () => {
      const response = await corporateApi.getDocuments(entityId, category);
      return response.data;
    },
    enabled: !!entityId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ============================================================================
// Combined Hook for Holdings Interior
// ============================================================================

export function useHoldingsData(enableCoopPolling = true) {
  const entityId = 'holdings';

  const entityQuery = useCorporateEntity(entityId);
  // Enable polling for co-op mode - quests refresh every 10 seconds for real-time collaboration
  const questsQuery = useCorporateQuests(entityId, enableCoopPolling);
  const complianceQuery = useComplianceItems(entityId);
  const progressQuery = useCorporateProgress();
  const statsQuery = useCorporateStats();

  return {
    entity: entityQuery.data,
    quests: questsQuery.data || [],
    compliance: complianceQuery.data || [],
    progress: progressQuery.data,
    stats: statsQuery.data,
    isLoading: entityQuery.isLoading || questsQuery.isLoading,
    isError: entityQuery.isError || questsQuery.isError,
    error: entityQuery.error || questsQuery.error,
    // Expose refetch for manual refresh
    refetchQuests: questsQuery.refetch,
  };
}

// ============================================================================
// Entity Verification Hooks (OpenCorporates)
// ============================================================================

export function useVerificationStatus() {
  return useQuery<{ available: boolean; hasApiToken: boolean; message: string }>({
    queryKey: ['corporate', 'verification', 'status'],
    queryFn: async () => {
      const response = await corporateApi.getVerificationStatus();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useVerifyEntity() {
  return useMutation<EntityVerificationResult, Error, { entityName: string; jurisdiction: string }>({
    mutationFn: async ({ entityName, jurisdiction }) => {
      const response = await corporateApi.verifyEntity(entityName, jurisdiction);
      return response.data;
    },
  });
}

export function useVerifyProducerTourEntity(shortName: string) {
  return useQuery<EntityVerificationResult>({
    queryKey: ['corporate', 'verification', 'pt', shortName],
    queryFn: async () => {
      const response = await corporateApi.verifyProducerTourEntity(shortName);
      return response.data;
    },
    enabled: !!shortName,
    staleTime: 10 * 60 * 1000, // 10 minutes - registry data doesn't change often
  });
}

export function useSearchCompanies(query: string, jurisdiction?: string) {
  return useQuery<{ results: Array<{ id: string; name: string; score: number }> }>({
    queryKey: ['corporate', 'verification', 'search', query, jurisdiction],
    queryFn: async () => {
      const response = await corporateApi.searchCompanies(query, jurisdiction);
      return response.data;
    },
    enabled: query.length >= 3, // Only search with 3+ characters
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useCompanyDetails(companyId: string) {
  return useQuery<CompanyDetails>({
    queryKey: ['corporate', 'verification', 'company', companyId],
    queryFn: async () => {
      const response = await corporateApi.getCompanyDetails(companyId);
      return response.data;
    },
    enabled: !!companyId,
    staleTime: 30 * 60 * 1000, // 30 minutes - company details are stable
  });
}

export function useVerifyEntityById() {
  const queryClient = useQueryClient();

  return useMutation<
    EntityVerificationResult & { details?: CompanyDetails; updated: boolean },
    Error,
    string
  >({
    mutationFn: async (entityId) => {
      const response = await corporateApi.verifyEntityById(entityId);
      return response.data;
    },
    onSuccess: (data, entityId) => {
      // Invalidate entity query if data was updated
      if (data.updated) {
        queryClient.invalidateQueries({ queryKey: ['corporate', 'entity', entityId] });
        queryClient.invalidateQueries({ queryKey: ['corporate', 'entities'] });
      }
    },
  });
}

// ============================================================================
// Push Notification Hooks (OneSignal)
// ============================================================================

export function useNotificationStatus() {
  return useQuery<{
    enabled: boolean;
    hasAppId: boolean;
    hasApiKey: boolean;
    message: string;
  }>({
    queryKey: ['corporate', 'notifications', 'status'],
    queryFn: async () => {
      const response = await corporateApi.getNotificationStatus();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSendTestNotification() {
  return useMutation<
    { success: boolean; notificationId?: string; error?: string },
    Error,
    { title?: string; message?: string }
  >({
    mutationFn: async ({ title, message }) => {
      const response = await corporateApi.sendTestNotification(title, message);
      return response.data;
    },
  });
}

export function useTriggerComplianceCheck() {
  return useMutation<
    { success: boolean; processed: number; sent: number; errors: string[] },
    Error,
    void
  >({
    mutationFn: async () => {
      const response = await corporateApi.triggerComplianceCheck();
      return response.data;
    },
  });
}

export function useSendQuestNotification() {
  return useMutation<
    { success: boolean; notificationId?: string; error?: string },
    Error,
    {
      userIds: string[];
      questId: string;
      questTitle: string;
      entityName: string;
      xpReward?: number;
      type: 'unlocked' | 'completed' | 'reminder';
    }
  >({
    mutationFn: async (data) => {
      const response = await corporateApi.sendQuestNotification(data);
      return response.data;
    },
  });
}

export function useSendComplianceNotification() {
  return useMutation<
    { success: boolean; notificationId?: string; error?: string },
    Error,
    { userIds: string[]; complianceItemId: string }
  >({
    mutationFn: async ({ userIds, complianceItemId }) => {
      const response = await corporateApi.sendComplianceNotification(userIds, complianceItemId);
      return response.data;
    },
  });
}

// ============================================================================
// Co-op Quest Socket Updates
// ============================================================================

/**
 * Hook to listen for real-time quest updates via WebSocket
 * When another admin completes a quest step, this invalidates the local cache
 * so the UI updates automatically
 */
export function useQuestSocketUpdates() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for quest updates from other admins
    const handleQuestUpdate = (data: { entityId: string; questId?: string; type: 'started' | 'step-completed' | 'completed' }) => {
      console.log('[Quest Co-op] Received update:', data);

      // Invalidate quest queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['corporate', 'quests', data.entityId] });
      if (data.questId) {
        queryClient.invalidateQueries({ queryKey: ['corporate', 'quest', data.questId] });
      }
      // Also refresh stats and progress
      queryClient.invalidateQueries({ queryKey: ['corporate', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['corporate', 'progress'] });
    };

    // Subscribe to quest events
    socket.on('quest:updated', handleQuestUpdate);

    return () => {
      socket.off('quest:updated', handleQuestUpdate);
    };
  }, [socket, isConnected, queryClient]);
}

/**
 * Hook to emit quest updates when the current user makes changes
 * Call this after successful quest mutations to notify other admins
 */
export function useEmitQuestUpdate() {
  const { socket, isConnected } = useSocket();

  return (entityId: string, questId: string, type: 'started' | 'step-completed' | 'completed') => {
    if (socket && isConnected) {
      socket.emit('quest:update', { entityId, questId, type });
    }
  };
}

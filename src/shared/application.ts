/**
 * Application Layer - Runalyzer
 * 
 * Shared use-cases that orchestrate domain + API.
 * This replaces the old application/ folder - kept minimal in shared/.
 */

import { useAuthStore } from './store/auth.store';
import { useQuery } from '@tanstack/react-query';
import {
  buildRollingWindowBounds,
  createIntervalsClient,
  fetchActivities,
  fetchActivityWithIntervals,
  fetchActivityStreams,
  fetchRollingWindowActivities,
  validateApiKey,
} from './api/intervals-client';
import type { StreamType } from '../features/activity/domain/activity.types';
import {
  buildHome30dRunningSummary,
  type Home30dSummaryQueryResult,
} from '../features/activity/domain';
import {
  buildActivitiesQueryKey,
  buildActivityDetailQueryKey,
  buildActivityStreamsQueryKey,
  buildHome30dSummaryAuthScope,
  buildHome30dSummaryQueryKey,
} from './queryKeys';

/**
 * Sync activities use-case
 */
export async function syncActivities(options: { limit?: number } = {}): Promise<void> {
  const { apiKey } = useAuthStore.getState();
  if (!apiKey) throw new Error('Not authenticated');

  const client = await createIntervalsClient({ apiKey });
  await fetchActivities(client, options);
}

/**
 * Hook to fetch activities with TanStack Query
 */
export function useActivities(limit = 20) {
  const { apiKey } = useAuthStore();
  
  return useQuery({
    queryKey: buildActivitiesQueryKey(limit),
    queryFn: async () => {
      if (!apiKey) throw new Error('Not authenticated');
      const client = await createIntervalsClient({ apiKey });
      return fetchActivities(client, { limit });
    },
    enabled: !!apiKey,
  });
}

/**
 * Hook to fetch activity streams
 */
export function useActivityStreams(activityId: string, types: string[] = ['time', 'heartrate', 'velocity_smooth']) {
  const { apiKey } = useAuthStore();
  
  return useQuery({
    queryKey: buildActivityStreamsQueryKey(activityId, types),
    queryFn: async () => {
      if (!apiKey) throw new Error('Not authenticated');
      const client = await createIntervalsClient({ apiKey });
      return fetchActivityStreams(client, activityId, types as StreamType[]);
    },
    enabled: !!apiKey && !!activityId,
  });
}

/**
 * Hook to fetch activity detail with intervals
 */
export function useActivityDetail(activityId: string) {
  const { apiKey } = useAuthStore();

  return useQuery({
    queryKey: buildActivityDetailQueryKey(activityId),
    queryFn: async () => {
      if (!apiKey) throw new Error('Not authenticated');
      const client = await createIntervalsClient({ apiKey });
      return fetchActivityWithIntervals(client, activityId);
    },
    enabled: !!apiKey && !!activityId,
    staleTime: 120_000,
    retry: 1,
  });
}

/**
 * Hook to fetch 30-day running summary with isolated state
 */
export function useHome30dSummary(options: { enabled?: boolean } = {}) {
  const { apiKey } = useAuthStore();
  const { enabled = true } = options;
  const authScope = buildHome30dSummaryAuthScope(apiKey);

  return useQuery<Home30dSummaryQueryResult, Error>({
    queryKey: buildHome30dSummaryQueryKey(authScope),
    queryFn: async () => {
      if (!apiKey) {
        throw new Error('Not authenticated');
      }

      const client = await createIntervalsClient({ apiKey });
      const windowEvaluatedAt = new Date();
      const { oldest, newest } = buildRollingWindowBounds(windowEvaluatedAt, 30);
      const activities = await fetchRollingWindowActivities(client, {
        oldest,
        newest,
      });

      return {
        summary: buildHome30dRunningSummary({
          activities,
          windowEvaluatedAt,
        }),
        sourceActivityCount: activities.length,
      };
    },
    enabled: !!apiKey && enabled,
    staleTime: 120_000,
    retry: 1,
  });
}

/**
 * Authenticate with API key
 */
export async function authenticate(apiKey: string): Promise<boolean> {
  const isValid = await validateApiKey(apiKey);
  if (isValid) {
    useAuthStore.getState().setApiKey(apiKey);
  } else {
    useAuthStore.getState().setError('Invalid API key');
  }
  return isValid;
}

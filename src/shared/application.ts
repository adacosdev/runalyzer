/**
 * Application Layer - Runalyzer
 * 
 * Shared use-cases that orchestrate domain + API.
 * This replaces the old application/ folder - kept minimal in shared/.
 */

import { useAuthStore } from './store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { createIntervalsClient, fetchActivities, fetchActivityStreams, validateApiKey } from './api/intervals-client';

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
    queryKey: ['activities', limit],
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
    queryKey: ['activity-streams', activityId, types],
    queryFn: async () => {
      if (!apiKey) throw new Error('Not authenticated');
      const client = await createIntervalsClient({ apiKey });
      return fetchActivityStreams(client, activityId, types as any);
    },
    enabled: !!apiKey && !!activityId,
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

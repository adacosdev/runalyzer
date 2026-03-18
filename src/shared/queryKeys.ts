import type { QueryClient } from '@tanstack/react-query';

export const HOME_30D_SUMMARY_QUERY_KEY = 'home-30d-summary';
export const ACTIVITY_DETAIL_QUERY_KEY = 'activity-detail';
export const ACTIVITY_STREAMS_QUERY_KEY = 'activity-streams';
const HOME_30D_SUMMARY_ANONYMOUS_SCOPE = 'anonymous';

export function buildHome30dSummaryAuthScope(authIdentity: string | null): string {
  if (!authIdentity) {
    return HOME_30D_SUMMARY_ANONYMOUS_SCOPE;
  }

  return `acct-${hashAuthIdentity(authIdentity)}`;
}

export function buildHome30dSummaryQueryKey(authScope: string | null) {
  return [HOME_30D_SUMMARY_QUERY_KEY, authScope ?? HOME_30D_SUMMARY_ANONYMOUS_SCOPE] as const;
}

export function buildActivityDetailQueryKey(activityId: string) {
  return [ACTIVITY_DETAIL_QUERY_KEY, activityId] as const;
}

export function buildActivitiesQueryKey(limit: number) {
  return ['activities', limit] as const;
}

export function buildActivityStreamsQueryKey(activityId: string, types: readonly string[]) {
  return [ACTIVITY_STREAMS_QUERY_KEY, activityId, [...types]] as const;
}

export function clearHome30dSummaryQueryCache(client: QueryClient): void {
  client.removeQueries({ queryKey: [HOME_30D_SUMMARY_QUERY_KEY] });
}

export function clearActivityDetailQueryCache(client: QueryClient): void {
  client.removeQueries({ queryKey: [ACTIVITY_DETAIL_QUERY_KEY] });
}

export function clearActivityStreamsQueryCache(client: QueryClient): void {
  client.removeQueries({ queryKey: [ACTIVITY_STREAMS_QUERY_KEY] });
}

function hashAuthIdentity(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `${value.length.toString(16)}-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

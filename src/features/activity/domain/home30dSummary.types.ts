import type { DomainActivity } from './activity.types';

export interface Home30dWindow {
  windowStart: Date;
  windowEnd: Date;
  windowEvaluatedAt: Date;
}

export interface Home30dSummary {
  window: Home30dWindow;
  totalRuns: number;
  totalDistanceKm: number;
  totalDurationSec: number;
  totalMovingTimeSec: number;
  totalElevationGainM: number;
  avgPaceSecPerKm: number | null;
  avgHeartrateBpm: number | null;
  hrSampleCount: number;
  includedRunCount: number;
  excludedByWindowCount: number;
}

export interface Home30dSummaryInput {
  activities: DomainActivity[];
  windowEvaluatedAt?: Date;
}

export interface Home30dSummaryQueryResult {
  summary: Home30dSummary;
  sourceActivityCount: number;
}

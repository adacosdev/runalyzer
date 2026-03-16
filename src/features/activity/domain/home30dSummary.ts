import type { DomainActivity } from './activity.types';
import type { Home30dSummary, Home30dSummaryInput } from './home30dSummary.types';

const DEFAULT_WINDOW_DAYS = 30;
const METERS_PER_KM = 1000;

interface SummaryAccumulator {
  totalRuns: number;
  totalDistanceMeters: number;
  totalDurationSec: number;
  totalMovingTimeSec: number;
  totalElevationGainM: number;
  hrTotalBpm: number;
  hrSampleCount: number;
}

export function buildHome30dRunningSummary(input: Home30dSummaryInput): Home30dSummary {
  const windowEvaluatedAt = resolveWindowEvaluatedAt(input.windowEvaluatedAt);
  const windowStart = new Date(windowEvaluatedAt);
  windowStart.setUTCDate(windowStart.getUTCDate() - DEFAULT_WINDOW_DAYS);

  const sourceActivities = Array.isArray(input.activities) ? input.activities : [];
  const includedActivities = sourceActivities.filter((activity) => {
    const activityTimestamp = activity.startDate?.getTime();
    if (!Number.isFinite(activityTimestamp)) {
      return false;
    }

    return activityTimestamp >= windowStart.getTime() && activityTimestamp <= windowEvaluatedAt.getTime();
  });

  const totals = includedActivities.reduce<SummaryAccumulator>((accumulator, activity) => {
    const safeDuration = sanitizeNonNegativeNumber(activity.duration);
    const safeMovingTime = sanitizeNonNegativeNumber(activity.movingTime);
    const safeDistanceMeters = sanitizeNonNegativeNumber(activity.distance);
    const safeElevationGain = sanitizeNonNegativeNumber(activity.elevationGain);

    const movingTimeForPace = safeMovingTime > 0 ? safeMovingTime : safeDuration;

    accumulator.totalRuns += 1;
    accumulator.totalDistanceMeters += safeDistanceMeters;
    accumulator.totalDurationSec += safeDuration;
    accumulator.totalMovingTimeSec += movingTimeForPace;
    accumulator.totalElevationGainM += safeElevationGain;

    const eligibleHeartrate = isHeartRateEligible(activity);
    if (eligibleHeartrate === null) {
      return accumulator;
    }

    accumulator.hrTotalBpm += eligibleHeartrate;
    accumulator.hrSampleCount += 1;
    return accumulator;
  }, createInitialAccumulator());

  const totalDistanceKm = totals.totalDistanceMeters / METERS_PER_KM;

  return {
    window: {
      windowStart,
      windowEnd: new Date(windowEvaluatedAt),
      windowEvaluatedAt,
    },
    totalRuns: totals.totalRuns,
    totalDistanceKm,
    totalDurationSec: totals.totalDurationSec,
    totalMovingTimeSec: totals.totalMovingTimeSec,
    totalElevationGainM: totals.totalElevationGainM,
    avgPaceSecPerKm: totalDistanceKm > 0 ? totals.totalMovingTimeSec / totalDistanceKm : null,
    avgHeartrateBpm: totals.hrSampleCount > 0 ? totals.hrTotalBpm / totals.hrSampleCount : null,
    hrSampleCount: totals.hrSampleCount,
    includedRunCount: totals.totalRuns,
    excludedByWindowCount: sourceActivities.length - totals.totalRuns,
  };
}

function resolveWindowEvaluatedAt(windowEvaluatedAt?: Date): Date {
  if (windowEvaluatedAt === undefined) {
    return new Date();
  }

  if (!(windowEvaluatedAt instanceof Date) || Number.isNaN(windowEvaluatedAt.getTime())) {
    throw new Error('windowEvaluatedAt must be a valid Date');
  }

  return new Date(windowEvaluatedAt);
}

function createInitialAccumulator(): SummaryAccumulator {
  return {
    totalRuns: 0,
    totalDistanceMeters: 0,
    totalDurationSec: 0,
    totalMovingTimeSec: 0,
    totalElevationGainM: 0,
    hrTotalBpm: 0,
    hrSampleCount: 0,
  };
}

function sanitizeNonNegativeNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return value;
}

function isHeartRateEligible(activity: DomainActivity): number | null {
  if (!activity.hasHeartrate) {
    return null;
  }

  const averageHeartrate = activity.averageHeartrate;
  if (typeof averageHeartrate !== 'number' || !Number.isFinite(averageHeartrate) || averageHeartrate <= 0) {
    return null;
  }

  return averageHeartrate;
}

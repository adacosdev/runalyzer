import { describe, expect, it } from 'vitest';
import type { DomainActivity } from '../activity.types';
import { buildHome30dRunningSummary } from '../home30dSummary';

function createActivity(overrides: Partial<DomainActivity> = {}): DomainActivity {
  return {
    id: 'run-1',
    name: 'Easy Run',
    startDate: new Date('2026-03-01T10:00:00.000Z'),
    startTime: 0,
    duration: 1800,
    movingTime: 1700,
    distance: 5000,
    elevationGain: 30,
    elevationLoss: 20,
    averageHeartrate: 150,
    maxHeartrate: 170,
    hasHeartrate: true,
    averagePace: 340,
    maxPace: 280,
    icuIntervals: [],
    icuHrZoneTimes: [],
    decoupling: null,
    dataAvailability: 'summary-only',
    ...overrides,
  };
}

describe('buildHome30dRunningSummary', () => {
  it('includes exact lower boundary and excludes older/future timestamps', () => {
    const windowEvaluatedAt = new Date('2026-03-14T12:00:00.000Z');
    const exactLowerBoundary = new Date(windowEvaluatedAt);
    exactLowerBoundary.setUTCDate(exactLowerBoundary.getUTCDate() - 30);

    const summary = buildHome30dRunningSummary({
      windowEvaluatedAt,
      activities: [
        createActivity({ id: 'in-boundary', startDate: exactLowerBoundary }),
        createActivity({ id: 'out-older', startDate: new Date('2026-02-12T11:59:59.000Z') }),
        createActivity({ id: 'out-future', startDate: new Date('2026-03-14T12:00:01.000Z') }),
      ],
    });

    expect(summary.totalRuns).toBe(1);
    expect(summary.includedRunCount).toBe(1);
    expect(summary.excludedByWindowCount).toBe(2);
  });

  it('uses only HR-eligible runs for denominator and sample count', () => {
    const summary = buildHome30dRunningSummary({
      windowEvaluatedAt: new Date('2026-03-14T12:00:00.000Z'),
      activities: [
        createActivity({ id: 'hr-1', averageHeartrate: 150, hasHeartrate: true }),
        createActivity({ id: 'hr-2', averageHeartrate: 160, hasHeartrate: true }),
        createActivity({ id: 'no-hr-flag', averageHeartrate: 170, hasHeartrate: false }),
        createActivity({ id: 'invalid-hr', averageHeartrate: 0, hasHeartrate: true }),
      ],
    });

    expect(summary.hrSampleCount).toBe(2);
    expect(summary.avgHeartrateBpm).toBe(155);
  });

  it('computes distance-weighted pace from totals and null when denominator is zero', () => {
    const withDistance = buildHome30dRunningSummary({
      windowEvaluatedAt: new Date('2026-03-14T12:00:00.000Z'),
      activities: [
        createActivity({ id: 'a', movingTime: 1500, duration: 1600, distance: 5000 }),
        createActivity({ id: 'b', movingTime: 3600, duration: 3600, distance: 10000 }),
      ],
    });

    expect(withDistance.totalDistanceKm).toBe(15);
    expect(withDistance.totalMovingTimeSec).toBe(5100);
    expect(withDistance.avgPaceSecPerKm).toBe(340);

    const mixedDistance = buildHome30dRunningSummary({
      windowEvaluatedAt: new Date('2026-03-14T12:00:00.000Z'),
      activities: [
        createActivity({ id: 'base', movingTime: 1500, duration: 1500, distance: 5000 }),
        createActivity({ id: 'zero-dist', movingTime: 600, duration: 600, distance: 0 }),
      ],
    });

    expect(mixedDistance.totalDistanceKm).toBe(5);
    expect(mixedDistance.totalMovingTimeSec).toBe(2100);
    expect(mixedDistance.avgPaceSecPerKm).toBe(420);

    const zeroDenominator = buildHome30dRunningSummary({
      windowEvaluatedAt: new Date('2026-03-14T12:00:00.000Z'),
      activities: [
        createActivity({ id: 'z1', distance: 0, movingTime: 1200, duration: 1200 }),
        createActivity({ id: 'z2', distance: -500, movingTime: 1300, duration: 1300 }),
      ],
    });

    expect(zeroDenominator.totalDistanceKm).toBe(0);
    expect(zeroDenominator.avgPaceSecPerKm).toBeNull();
  });

  it('falls back to duration for pace when movingTime is not positive', () => {
    const summary = buildHome30dRunningSummary({
      windowEvaluatedAt: new Date('2026-03-14T12:00:00.000Z'),
      activities: [
        createActivity({ id: 'fallback', movingTime: 0, duration: 1800, distance: 6000 }),
      ],
    });

    expect(summary.totalMovingTimeSec).toBe(1800);
    expect(summary.avgPaceSecPerKm).toBe(300);
  });

  it('is deterministic for repeated fixed input and evaluation timestamp', () => {
    const input = {
      windowEvaluatedAt: new Date('2026-03-14T12:00:00.000Z'),
      activities: [
        createActivity({ id: 'd1', movingTime: 1500, duration: 1600, distance: 5000 }),
        createActivity({ id: 'd2', averageHeartrate: null, hasHeartrate: false }),
      ],
    };

    const first = buildHome30dRunningSummary(input);
    const second = buildHome30dRunningSummary(input);

    expect(second).toEqual(first);
  });

  it('handles optional-field gaps without NaN or Infinity output', () => {
    const activityWithGaps = createActivity({
      id: 'gaps',
      movingTime: undefined as unknown as number,
      averageHeartrate: undefined as unknown as number,
      elevationGain: Number.NaN,
      distance: Number.NaN,
    });

    const summary = buildHome30dRunningSummary({
      windowEvaluatedAt: new Date('2026-03-14T12:00:00.000Z'),
      activities: [activityWithGaps],
    });

    expect(summary.totalDistanceKm).toBe(0);
    expect(summary.totalElevationGainM).toBe(0);
    expect(summary.totalDurationSec).toBe(1800);
    expect(summary.avgPaceSecPerKm).toBeNull();
    expect(summary.avgHeartrateBpm).toBeNull();
  });
});

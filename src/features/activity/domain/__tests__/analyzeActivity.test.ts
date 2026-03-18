import { describe, expect, it } from 'vitest';
import { analyzeActivity } from '../analyzeActivity';
import type { ActivityStream, DomainActivity, DomainInterval } from '../activity.types';
import type { ZoneConfig } from '../../../setup/domain/zones.types';
import {
  long_z1_rodaje,
  mixed_session_sparse_checkpoints,
  z2_threshold_interval_session,
} from './fixtures/intervalAwareV2';

function createInterval(overrides: Partial<DomainInterval> = {}): DomainInterval {
  return {
    id: 'interval-1',
    name: 'Interval 1',
    startTime: 0,
    duration: 180,
    distance: 800,
    averageHeartrate: 168,
    maxHeartrate: 178,
    minHeartrate: 154,
    averagePace: 230,
    maxPace: 210,
    type: 'interval',
    isRecovery: false,
    ...overrides,
  };
}

function createActivity(overrides: Partial<DomainActivity> = {}): DomainActivity {
  return {
    id: 'activity-real-id',
    name: 'Threshold session',
    startDate: new Date('2026-03-01T07:00:00.000Z'),
    startTime: 1740812400,
    duration: 3600,
    movingTime: 3500,
    distance: 12000,
    elevationGain: 80,
    elevationLoss: 80,
    averageHeartrate: 152,
    maxHeartrate: 178,
    hasHeartrate: true,
    averagePace: 280,
    maxPace: 220,
    icuIntervals: [createInterval()],
    icuHrZoneTimes: [400, 900, 700, 500, 120, 0, 0],
    decoupling: 3.4,
    dataAvailability: 'full-streams',
    ...overrides,
  };
}

function createStreams(): ActivityStream[] {
  return [
    { type: 'time', data: Array.from({ length: 300 }, (_, index) => index) },
    { type: 'heartrate', data: [...Array(150).fill(145), ...Array(150).fill(152)] },
    { type: 'velocity_smooth', data: Array(300).fill(3.7) },
  ];
}

function paceToVelocity(paceSecPerKm: number | null): number {
  if (paceSecPerKm == null || paceSecPerKm <= 0) {
    return 0;
  }

  return 1000 / paceSecPerKm;
}

function createFixtureStreams(timeData: number[], paceData: Array<number | null>, hrData: number[]): ActivityStream[] {
  return [
    { type: 'time', data: timeData },
    { type: 'velocity_smooth', data: paceData.map(paceToVelocity) },
    { type: 'heartrate', data: hrData },
  ];
}

function createFixtureActivity(
  fixtureId: string,
  duration: number,
  intervals: DomainInterval[],
  overrides: Partial<DomainActivity> = {}
): DomainActivity {
  return createActivity({
    id: `fixture-${fixtureId}`,
    duration,
    movingTime: duration,
    icuIntervals: intervals,
    ...overrides,
  });
}

describe('analyzeActivity', () => {
  it('preserves activity identity and enables interval analyses when intervals exist', () => {
    const activity = createActivity({ id: 'activity-123-real-detail-id' });

    const analysis = analyzeActivity(activity, createStreams());

    expect(analysis.activityId).toBe('activity-123-real-detail-id');
    expect(analysis.internalExternalLoad).not.toBeNull();
    expect(analysis.lactateClearance).not.toBeNull();
  });

  it('reports summary-only availability when no streams are provided', () => {
    const analysis = analyzeActivity(createActivity(), []);
    expect(analysis.dataAvailability).toBe('summary-only');
  });

  it('keeps stream-derived analysis when intervals are absent', () => {
    const activityWithoutIntervals = createActivity({
      id: 'activity-no-intervals',
      icuIntervals: [],
    });

    const analysis = analyzeActivity(activityWithoutIntervals, createStreams());

    expect(analysis.activityId).toBe('activity-no-intervals');
    expect(analysis.internalExternalLoad).toBeNull();
    expect(analysis.lactateClearance).toBeNull();
    expect(analysis.cardiacDrift).not.toBeNull();
    expect(analysis.zoneDistribution).not.toBeNull();
    expect(analysis.dataAvailability).toBe('full-streams');
  });

  it('forwards provided zoneConfig to lactate clearance analysis', () => {
    const customZoneConfig: ZoneConfig = {
      z1MaxHR: 80,
      z2MaxHR: 100,
      maxHR: 190,
      isEstimated: false,
      calibrationMethod: 'manual',
      lastCalibrated: Date.now(),
    };

    const activityWithLowIntensityInterval = createActivity({
      icuIntervals: [
        createInterval({
          name: 'Activa baja',
          averageHeartrate: 90,
          maxHeartrate: 115,
          duration: 180,
          isRecovery: false,
        }),
        createInterval({
          id: 'interval-2',
          name: 'Recuperacion',
          averageHeartrate: 80,
          maxHeartrate: 95,
          duration: 180,
          isRecovery: true,
        }),
      ],
    });

    const analysisWithDefaultZones = analyzeActivity(activityWithLowIntensityInterval, createStreams());
    const analysisWithCustomZones = analyzeActivity(
      activityWithLowIntensityInterval,
      createStreams(),
      customZoneConfig
    );

    expect(analysisWithDefaultZones.lactateClearance?.hasIntervals).toBe(true);
    expect(analysisWithCustomZones.lactateClearance?.hasIntervals).toBe(true);
    expect(analysisWithCustomZones.lactateClearance?.intervals).toHaveLength(1);
  });

  it('fixture A: enforces intensity precedence and suppresses z1 warning for interval_z2 sessions', () => {
    const fixture = z2_threshold_interval_session();
    const timeData = [
      ...fixture.timeStreamSec,
      238,
      240,
      298,
      360,
      420,
      480,
      540,
      600,
    ];
    const paceData = [
      ...fixture.paceStreamSecPerKm,
      620,
      615,
      610,
      595,
      605,
      598,
      602,
      590,
      610,
    ];
    const hrData = [
      ...fixture.heartRateStreamBpm,
      170,
      168,
      165,
      172,
      174,
      176,
      173,
      171,
      169,
    ];
    const activity = createFixtureActivity(fixture.fixtureId, 2400, [
      createInterval({
        id: 'a-interval-active-1',
        name: 'Bloque Z2',
        startTime: 58,
        duration: 180,
        type: 'interval',
        isRecovery: false,
        maxHeartrate: 176,
      }),
      createInterval({
        id: 'a-interval-recovery-1',
        name: 'Recuperacion',
        startTime: 238,
        duration: 120,
        type: 'recovery',
        isRecovery: true,
        averageHeartrate: 145,
        maxHeartrate: 150,
      }),
    ]);
    const analysis = analyzeActivity(
      activity,
      createFixtureStreams(timeData, paceData, hrData),
      {
        z1MaxHR: 135,
        z2MaxHR: 165,
        maxHR: 190,
        isEstimated: false,
        calibrationMethod: 'manual',
        lastCalibrated: Date.now(),
      }
    );

    expect(analysis.intervalAwareContext?.thresholdSecPerKm).toBe(600);
    expect(analysis.intervalAwareContext?.sessionType).toBe('interval_z2');
    expect(analysis.cardiacDrift?.policyApplied).toBe('interval_5_5');
    expect(analysis.actionableFeedback[0]?.id).toBe('intensity-interval-z2-high');
    expect(
      analysis.actionableFeedback.some((insight) => insight.title.includes('Poco tiempo en zona base'))
    ).toBe(false);
  });

  it('fixture B: classifies long explicit-z1 sessions as rodaje and applies 10/10 drift trim', () => {
    const fixture = long_z1_rodaje();
    const intervals: DomainInterval[] = [
      createInterval({
        id: 'b-steady-1',
        name: 'Rodaje continuo',
        startTime: 0,
        duration: fixture.activityDurationSec,
        type: 'steady',
        isRecovery: false,
        averagePace: 395,
        maxHeartrate: 143,
      }),
    ];
    const activity = createFixtureActivity(fixture.fixtureId, fixture.activityDurationSec, intervals, {
      icuHrZoneTimes: [3200, 240, 80, 0, 0, 0, 0],
    });

    const analysis = analyzeActivity(
      activity,
      createFixtureStreams(fixture.timeStreamSec, fixture.paceStreamSecPerKm, fixture.heartRateStreamBpm),
      {
        z1MaxHR: 145,
        z2MaxHR: 165,
        maxHR: 190,
        isEstimated: false,
        calibrationMethod: 'manual',
        lastCalibrated: Date.now(),
      }
    );

    expect(analysis.intervalAwareContext?.sessionType).toBe('rodaje_z1');
    expect(analysis.intervalAwareContext?.warmupCooldownHeuristicApplied).toBe(false);
    expect(analysis.cardiacDrift?.policyApplied).toBe('rodaje_10_10');
    expect(analysis.lactateClearance).toBeNull();
  });

  it('fixture C: reports sparse +2m checkpoint as unavailable without fabricating lactate drops', () => {
    const fixture = mixed_session_sparse_checkpoints();
    const timeData = [...fixture.timeStreamSec, 240, 360, 480, 620, 740, 860];
    const paceData = [...fixture.paceStreamSecPerKm, 590, 620, 615, 605, 610, 598];
    const hrData = [...fixture.heartRateStreamBpm, 162, 158, 156, 164, 161, 159];
    const intervals: DomainInterval[] = [
      createInterval({
        id: 'c-active-1',
        name: 'Bloque mixto',
        startTime: 60,
        duration: 180,
        type: 'steady',
        isRecovery: false,
        maxHeartrate: 164,
      }),
      createInterval({
        id: 'c-recovery-1',
        name: 'Recuperacion corta',
        startTime: 240,
        duration: 90,
        type: 'recovery',
        isRecovery: true,
        averageHeartrate: 140,
      }),
    ];
    const activity = createFixtureActivity(fixture.fixtureId, fixture.activityDurationSec, intervals);

    const analysis = analyzeActivity(
      activity,
      createFixtureStreams(timeData, paceData, hrData),
      {
        z1MaxHR: 135,
        z2MaxHR: 155,
        maxHR: 190,
        isEstimated: false,
        calibrationMethod: 'manual',
        lastCalibrated: Date.now(),
      }
    );

    expect(analysis.intervalAwareContext?.sessionType).toBe('mixed');
    expect(analysis.intervalAwareContext?.warmupCooldownHeuristicApplied).toBe(false);
    expect(analysis.lactateClearance?.hasIntervals).toBe(false);
    expect(analysis.lactateClearance?.reasonCode).toBe('checkpoint-unavailable-outside-window');
    expect(analysis.actionableFeedback[0]?.id).toContain('intensity');
  });
});

import { DomainActivity, ActivityStream } from './activity.types';
import { ActivityAnalysis } from './types';
import { analyzeCardiacDriftV2 } from './cardiacDrift';
import { analyzeZoneDistribution } from './zoneDistribution';
import { analyzeInternalExternalLoad } from './internalExternalLoad';
import { analyzeLactateClearance } from './lactateClearance';
import { generateFeedback } from './feedbackGenerator';
import { filterInvalidHR, roundTo } from './math';
import { ZoneConfig, getDefaultZoneConfig } from '../../setup/domain/zones.types';
import {
  ACTIVE_PACE_THRESHOLD_SECONDS_PER_KM,
  buildClassifiedSegments,
  classifyPaceStream,
} from './intervalClassification';
import { detectSessionSemantics } from './sessionSemantics';

const HIGH_INTENSITY_INTERVAL_TYPES = new Set(['interval', 'race', 'hill', 'sprint']);

function toPaceStream(velocityStreamMps: number[]): Array<number | null> {
  return velocityStreamMps.map((velocityMps) => {
    if (!Number.isFinite(velocityMps) || velocityMps <= 0) {
      return null;
    }

    return 1000 / velocityMps;
  });
}

function isValidHeartRateSample(heartRate: number): boolean {
  return heartRate >= 30 && heartRate <= 220;
}

function hasExplicitZ1Semantics(activity: DomainActivity | null | undefined): boolean {
  const intervals = activity?.icuIntervals ?? [];
  if (intervals.length === 0) {
    return false;
  }

  if (intervals.some((interval) => HIGH_INTENSITY_INTERVAL_TYPES.has(interval.type))) {
    return false;
  }

  const [z1Seconds = 0, z2Seconds = 0, z3Seconds = 0] = activity?.icuHrZoneTimes ?? [];
  if (z1Seconds <= 0) {
    return false;
  }

  return z1Seconds >= z2Seconds + z3Seconds;
}

function isIntervalSession(activity: DomainActivity | null | undefined): boolean {
  const intervals = activity?.icuIntervals ?? [];
  return intervals.some((interval) => HIGH_INTENSITY_INTERVAL_TYPES.has(interval.type) && !interval.isRecovery);
}

function getHeartRateExtremes(
  heartRateData: number[],
  activeSampleIndexes: Set<number>
): { activeFcMax: number | null; sessionFcMax: number | null } {
  let activeFcMax: number | null = null;
  let sessionFcMax: number | null = null;

  for (let sampleIndex = 0; sampleIndex < heartRateData.length; sampleIndex += 1) {
    const heartRate = heartRateData[sampleIndex];
    if (!isValidHeartRateSample(heartRate)) {
      continue;
    }

    if (sessionFcMax == null || heartRate > sessionFcMax) {
      sessionFcMax = heartRate;
    }

    if (!activeSampleIndexes.has(sampleIndex)) {
      continue;
    }

    if (activeFcMax == null || heartRate > activeFcMax) {
      activeFcMax = heartRate;
    }
  }

  return { activeFcMax, sessionFcMax };
}

function getStreamData(streams: ActivityStream[], type: ActivityStream['type']): number[] {
  return streams.find((s) => s.type === type)?.data ?? [];
}

export function analyzeActivity(
  activity: DomainActivity | null | undefined,
  streams: ActivityStream[],
  zoneConfig?: ZoneConfig | null
): ActivityAnalysis {
  const timeData = getStreamData(streams, 'time');
  const hrData = getStreamData(streams, 'heartrate');
  const velocityData = getStreamData(streams, 'velocity_smooth');
  const paceData = toPaceStream(velocityData);
  const { validCount, totalCount, validPercent } = filterInvalidHR(hrData);

  const effectiveZoneConfig = zoneConfig ?? getDefaultZoneConfig(30, true);
  const alignedSampleCount = Math.min(timeData.length, paceData.length);
  const alignedTimeData = timeData.slice(0, alignedSampleCount);
  const alignedPaceData = paceData.slice(0, alignedSampleCount);
  const paceClassifications = classifyPaceStream(alignedTimeData, alignedPaceData);
  const classifiedSegments = buildClassifiedSegments(paceClassifications);
  const explicitZ1Semantics = hasExplicitZ1Semantics(activity);
  const semantics = detectSessionSemantics({
    activityDurationSec: activity?.duration ?? 0,
    explicitZ1Semantics,
  });
  const sessionType = isIntervalSession(activity) ? 'interval_z2' : semantics.sessionType;
  const activeSampleIndexes = new Set(
    paceClassifications
      .filter((sample) => sample.classLabel === 'active')
      .map((sample) => sample.sampleIndex)
  );
  const { activeFcMax, sessionFcMax } = getHeartRateExtremes(hrData, activeSampleIndexes);
  const hasRecoverySegments = classifiedSegments.some((segment) => segment.classLabel === 'recovery');

  const cardiacDrift = hrData.length > 0
    ? analyzeCardiacDriftV2({
        heartRateData: hrData,
        timeData,
        sessionType,
        classifiedSegments,
        externalDecouplingPercent: activity?.decoupling ?? null,
      })
    : null;
  const zoneDistribution = hrData.length > 0 ? analyzeZoneDistribution(hrData, effectiveZoneConfig) : null;

  const intervals = activity?.icuIntervals ?? [];
  const internalExternalLoad = intervals.length > 0
    ? analyzeInternalExternalLoad(
        intervals.map((i) => ({
          name: i.name,
          averagePace: i.averagePace,
          averageHeartrate: i.averageHeartrate,
          duration: i.duration,
          type: i.type,
        })),
        undefined,
        effectiveZoneConfig
      )
    : null;

  const lactateClearance = intervals.length > 0
    ? analyzeLactateClearance(
        intervals.map((i) => ({
          name: i.name,
          averageHeartrate: i.averageHeartrate,
          maxHeartrate: i.maxHeartrate,
          duration: i.duration,
          isRecovery: i.isRecovery,
        })),
        effectiveZoneConfig,
        {
          domainIntervals: intervals,
          timeData,
          heartRateData: hrData,
        }
      )
    : null;

  const base: ActivityAnalysis = {
    activityId: activity?.id ?? 'unknown-activity',
    analyzedAt: Date.now(),
    dataAvailability: hrData.length > 0 ? 'full-streams' : 'summary-only',
    cardiacDrift,
    zoneDistribution,
    internalExternalLoad,
    lactateClearance,
    actionableFeedback: [],
    hrDataQuality: {
      totalPoints: totalCount,
      validPoints: validCount,
      validPercent: roundTo(validPercent),
      qualityWarning: validPercent < 80 ? 'Datos de FC incompletos para análisis de alta calidad.' : undefined,
    },
    intervalAwareContext: {
      thresholdSecPerKm: ACTIVE_PACE_THRESHOLD_SECONDS_PER_KM,
      sessionType,
      warmupCooldownHeuristicApplied: semantics.warmupCooldownHeuristicApplied,
      sourceAuthority: cardiacDrift?.sourceAuthority,
    },
  };

  return {
    ...base,
    actionableFeedback: generateFeedback(base, {
      sessionType,
      zoneConfig: effectiveZoneConfig,
      activeFcMax,
      sessionFcMax,
      hasRecoverySegments,
    }),
  };
}

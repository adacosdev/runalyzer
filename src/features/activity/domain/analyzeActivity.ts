import { DomainActivity, ActivityStream } from './activity.types';
import { ActivityAnalysis } from './types';
import { analyzeCardiacDrift } from './cardiacDrift';
import { analyzeZoneDistribution } from './zoneDistribution';
import { analyzeInternalExternalLoad } from './internalExternalLoad';
import { analyzeLactateClearance } from './lactateClearance';
import { generateFeedback } from './feedbackGenerator';
import { filterInvalidHR, roundTo } from './math';
import { ZoneConfig, getDefaultZoneConfig } from '../../setup/domain/zones.types';

function getStreamData(streams: ActivityStream[], type: ActivityStream['type']): number[] {
  return streams.find((s) => s.type === type)?.data ?? [];
}

export function analyzeActivity(
  activity: DomainActivity | null | undefined,
  streams: ActivityStream[],
  zoneConfig?: ZoneConfig | null
): ActivityAnalysis {
  const hrData = getStreamData(streams, 'heartrate');
  const { validCount, totalCount, validPercent } = filterInvalidHR(hrData);

  const effectiveZoneConfig = zoneConfig ?? getDefaultZoneConfig(30, true);

  const cardiacDrift = hrData.length > 0 ? analyzeCardiacDrift(hrData) : null;
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
        }))
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
        }))
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
  };

  return {
    ...base,
    actionableFeedback: generateFeedback(base),
  };
}

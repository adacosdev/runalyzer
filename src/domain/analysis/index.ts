/**
 * Analysis Engine - Runalyzer
 * 
 * Main entry point for the analysis engine.
 * Orchestrates all analysis functions to produce a complete ActivityAnalysis.
 */

import { 
  ActivityAnalysis, 
  DataAvailability, 
  DataQualityReport,
  ActivityStream 
} from './types';
import { ZoneConfig } from '../zones/types';
import { DomainActivity, DomainInterval } from '../activity/types';
import { filterInvalidHR, roundTo } from './math';
import { analyzeCardiacDrift } from './cardiacDrift';
import { analyzeZoneDistribution } from './zoneDistribution';
import { analyzeLactateClearance } from './lactateClearance';
import { analyzeInternalExternalLoad } from './internalExternalLoad';
import { generateFeedback } from './feedbackGenerator';

/**
 * Complete analysis result for an activity
 */
export interface AnalysisResult {
  activity: DomainActivity;
  analysis: ActivityAnalysis;
}

/**
 * Analyze a complete activity
 * 
 * @param activity - Domain activity with streams
 * @param zoneConfig - User's zone configuration
 * @param hrStreams - Heart rate stream data (one value per second)
 * @param paceStreams - Pace stream data (optional)
 * @returns Complete ActivityAnalysis
 */
export function analyzeActivity(
  activity: DomainActivity,
  zoneConfig: ZoneConfig,
  hrStreams?: number[],
  paceStreams?: number[]
): ActivityAnalysis {
  const analyzedAt = Date.now();
  
  // Determine data availability
  const dataAvailability = determineDataAvailability(hrStreams, activity);
  
  // Analyze HR data quality
  const hrDataQuality = analyzeHRDataQuality(hrStreams);
  
  // Run analyses based on available data
  const cardiacDrift = dataAvailability === 'full-streams' && hrStreams
    ? analyzeCardiacDrift(hrStreams)
    : null;
  
  const zoneDistribution = dataAvailability === 'full-streams' && hrStreams
    ? analyzeZoneDistribution(hrStreams, zoneConfig)
    : null;
  
  const lactateClearance = activity.icuIntervals && activity.icuIntervals.length > 0
    ? analyzeLactateClearance(mapIntervalsForLactate(activity.icuIntervals))
    : null;
  
  const internalExternalLoad = activity.icuIntervals && activity.icuIntervals.length > 0
    ? analyzeInternalExternalLoad(mapIntervalsForLoad(activity.icuIntervals))
    : null;
  
  // Generate actionable feedback
  const analysis: ActivityAnalysis = {
    activityId: activity.id,
    analyzedAt,
    dataAvailability,
    cardiacDrift,
    zoneDistribution,
    internalExternalLoad,
    lactateClearance,
    actionableFeedback: [],
    hrDataQuality,
  };
  
  // Generate feedback after all analyses are complete
  analysis.actionableFeedback = generateFeedback(analysis);
  
  return analysis;
}

/**
 * Determine data availability level
 */
function determineDataAvailability(
  streams: number[] | undefined,
  activity: DomainActivity
): DataAvailability {
  if (!streams || streams.length === 0) {
    if (activity.hasHeartrate && activity.averageHeartrate) {
      return 'summary-only';
    }
    return 'none';
  }
  return 'full-streams';
}

/**
 * Analyze HR data quality
 */
function analyzeHRDataQuality(streams: number[] | undefined): DataQualityReport {
  if (!streams || streams.length === 0) {
    return {
      totalPoints: 0,
      validPoints: 0,
      validPercent: 0,
      qualityWarning: 'No hay datos de frecuencia cardíaca disponibles.',
    };
  }
  
  const { filtered, validCount, totalCount, validPercent } = filterInvalidHR(streams);
  
  const warnings: string[] = [];
  if (validPercent < 80) {
    warnings.push(`Solo ${roundTo(validPercent)}% de los datos son válidos.`);
  }
  
  return {
    totalPoints: totalCount,
    validPoints: validCount,
    validPercent: roundTo(validPercent),
    qualityWarning: warnings.length > 0 ? warnings.join(' ') : undefined,
  };
}

/**
 * Map intervals for lactate clearance analysis
 */
function mapIntervalsForLactate(intervals: DomainInterval[]): Array<{
  name: string;
  averageHeartrate: number | null;
  maxHeartrate: number | null;
  duration: number;
  isRecovery: boolean;
}> {
  return intervals.map(interval => ({
    name: interval.name,
    averageHeartrate: interval.averageHeartrate,
    maxHeartrate: interval.maxHeartrate,
    duration: interval.duration,
    isRecovery: interval.isRecovery || interval.type === 'recovery',
  }));
}

/**
 * Map intervals for internal/external load analysis
 */
function mapIntervalsForLoad(intervals: DomainInterval[]): Array<{
  name: string;
  averagePace: number | null;
  averageHeartrate: number | null;
  duration: number;
  type: string;
}> {
  return intervals.map(interval => ({
    name: interval.name,
    averagePace: interval.averagePace,
    averageHeartrate: interval.averageHeartrate,
    duration: interval.duration,
    type: interval.type,
  }));
}

// Re-export all analysis functions and types
export * from './types';
export { analyzeCardiacDrift } from './cardiacDrift';
export { analyzeZoneDistribution } from './zoneDistribution';
export { analyzeLactateClearance } from './lactateClearance';
export { analyzeInternalExternalLoad } from './internalExternalLoad';
export { generateFeedback } from './feedbackGenerator';

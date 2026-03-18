/**
 * Lactate Clearance Analysis - Runalyzer
 * 
 * Implements Luis del Águila's methodology for analyzing recovery between intervals.
 * 
 * Concept: After a hard effort, the heart rate should drop quickly in the recovery period.
 * A fast drop indicates efficient lactate recycling by the muscles.
 * 
 * Luis del Águila prescribes 3-minute recovery intervals.
 * This analyzes the HR drop within that 3-minute window.
 */

import { LactateClearanceResult, RecoveryInterval, LactateQuality } from './types';
import { average, percentChange, roundTo } from './math';
import { ZoneConfig } from '../../setup/domain/zones.types';
import { DomainInterval } from './activity.types';
import { analyzeLactateProtocol } from './lactateProtocol';

const MIN_INTERVAL_DURATION_SECONDS = 120;
const MIN_RECOVERY_DURATION_SECONDS = 120;

/**
 * Analyze lactate clearance from interval data
 * 
 * @param intervals - Activity intervals with HR data
 * @returns LactateClearanceResult with recovery analysis
 */
export function analyzeLactateClearance(
  intervals: Array<{
    name: string;
    averageHeartrate: number | null;
    maxHeartrate: number | null;
    duration: number;
    isRecovery: boolean;
  }>,
  zoneConfig?: ZoneConfig | null,
  streamContext?: {
    domainIntervals: DomainInterval[];
    timeData: number[];
    heartRateData: number[];
  }
): LactateClearanceResult {
  if (streamContext) {
    const { domainIntervals, timeData, heartRateData } = streamContext;
    const protocolResult = analyzeLactateProtocol({
      intervals: domainIntervals,
      timeData,
      heartRateData,
    });

    const mappedIntervals: RecoveryInterval[] = protocolResult.intervals
      .filter((result) => result.reasonCode === 'ok' && result.peakHr != null && result.efficiencyEndHr != null)
      .map((result) => {
        const peakHR = result.peakHr as number;
        const endHR = result.efficiencyEndHr as number;
        const dropBpm = peakHR - endHR;
        const dropPercent = result.efficiencyDropPct ?? percentChange(peakHR, endHR);

        return {
          name: result.intervalName,
          peakHR: roundTo(peakHR),
          endHR: roundTo(endHR),
          efficiencyEndHR: roundTo(endHR),
          structuralEndHR: result.structuralEndHr != null ? roundTo(result.structuralEndHr) : undefined,
          dropBpm: roundTo(dropBpm),
          dropPercent: roundTo(dropPercent),
          efficiencyDropPercent: result.efficiencyDropPct != null ? roundTo(result.efficiencyDropPct) : undefined,
          structuralDropPercent: result.structuralDropPct != null ? roundTo(result.structuralDropPct) : undefined,
          quality: classifyRecoveryQuality(dropPercent),
          confidence: result.confidence.plus1m,
          reasonCode: result.reasonCode,
        };
      });

    if (mappedIntervals.length === 0) {
      if (zoneConfig) {
        const fallbackSummaryResult = analyzeLactateClearance(intervals, zoneConfig);
        if (fallbackSummaryResult.hasIntervals) {
          return fallbackSummaryResult;
        }
      }

      const firstReason = protocolResult.intervals[0]?.reasonCode;
      const reasonCode = firstReason && firstReason !== 'ok' ? firstReason : 'insufficient-data';

      return {
        intervals: [],
        averageDropPercent: 0,
        overallQuality: 'poor',
        verdict: 'No hay checkpoints válidos para analizar la eliminación de lactato.',
        hasIntervals: false,
        reasonCode,
      };
    }

    const averageDropPercent = average(mappedIntervals.map((interval) => interval.dropPercent));
    const overallQuality = classifyRecoveryQuality(averageDropPercent);

    return {
      intervals: mappedIntervals,
      averageDropPercent: roundTo(averageDropPercent),
      overallQuality,
      verdict: generateLactateVerdict(overallQuality, averageDropPercent),
      hasIntervals: true,
      reasonCode: 'ok',
    };
  }

  if (!zoneConfig) {
    return {
      intervals: [],
      averageDropPercent: 0,
      overallQuality: 'poor',
      verdict: 'No se puede analizar la eliminación de lactato sin configuración de zonas cardíacas.',
      hasIntervals: false,
      reasonCode: 'insufficient-data',
    };
  }

  const recoveryIntervals: RecoveryInterval[] = [];

  for (let i = 0; i < intervals.length; i++) {
    const activeInterval = intervals[i];
    const nextInterval = intervals[i + 1];

    if (!isValidActiveInterval(activeInterval, zoneConfig)) continue;
    if (!nextInterval?.isRecovery) continue;
    if (nextInterval.duration < MIN_RECOVERY_DURATION_SECONDS) continue;

    const peakHR = activeInterval.maxHeartrate;
    const endHR = nextInterval.averageHeartrate;
    if (peakHR == null || endHR == null || peakHR <= 0 || endHR <= 0) continue;

    const dropBpm = peakHR - endHR;
    const dropPercent = percentChange(peakHR, endHR);

    recoveryIntervals.push({
      name: nextInterval.name || `Recuperacion ${recoveryIntervals.length + 1}`,
      peakHR: roundTo(peakHR),
      endHR: roundTo(endHR),
      dropBpm: roundTo(dropBpm),
      dropPercent: roundTo(dropPercent),
      quality: classifyRecoveryQuality(dropPercent),
    });
  }
  
  // If no structured intervals, analyze overall recovery from activity
  if (recoveryIntervals.length === 0) {
    return {
      intervals: [],
      averageDropPercent: 0,
      overallQuality: 'poor',
      verdict: 'Esta actividad no tiene intervalos estructurados para analizar la eliminación de lactato.',
      hasIntervals: false,
    };
  }
  
  // Calculate average drop
  const avgDrop = average(recoveryIntervals.map(r => r.dropPercent));
  const overallQuality = classifyRecoveryQuality(avgDrop);
  
  return {
    intervals: recoveryIntervals,
    averageDropPercent: roundTo(avgDrop),
    overallQuality,
    verdict: generateLactateVerdict(overallQuality, avgDrop),
    hasIntervals: true,
  };
}

function isValidActiveInterval(
  interval: {
    averageHeartrate: number | null;
    maxHeartrate: number | null;
    duration: number;
    isRecovery: boolean;
  },
  zoneConfig?: ZoneConfig | null
): boolean {
  if (!zoneConfig) return false;
  if (interval.isRecovery) return false;
  if (interval.duration < MIN_INTERVAL_DURATION_SECONDS) return false;
  if (interval.averageHeartrate == null) return false;
  if (interval.maxHeartrate == null) return false;

  return (
    interval.averageHeartrate >= zoneConfig.z1MaxHR &&
    interval.averageHeartrate <= zoneConfig.z2MaxHR
  );
}

/**
 * Classify recovery quality based on HR drop percentage
 * 
 * Thresholds implemented in this analysis:
 * - >=15% drop: Excellent (efficient clearing)
 * - >=12% and <15% drop: Good
 * - <12% drop: Poor (lactate accumulating)
 */
function classifyRecoveryQuality(dropPercent: number): LactateQuality {
  if (dropPercent >= 15) return 'excellent';
  if (dropPercent >= 12) return 'good';
  return 'poor';
}

/**
 * Generate verdict message for lactate clearance
 */
function generateLactateVerdict(quality: LactateQuality, avgDrop: number): string {
  switch (quality) {
    case 'excellent':
      return `Excelente eliminación de lactato (${roundTo(avgDrop)}% de caída). ` +
        'Tu sistema está muy adaptado para reciclar energía durante la recuperación.';
    case 'good':
      return `Buena recuperación (${roundTo(avgDrop)}% de caída). ` +
        'Tu capacidad de reciclaje de lactato está desarrollando bien.';
    case 'poor':
      return `Recuperación limitada (${roundTo(avgDrop)}% de caída). ` +
        'Considera extender la recuperación a 3-4 minutos o reducir la intensidad.';
  }
}

/**
 * Analyze lactate clearance from continuous HR stream
 * 
 * Alternative method when intervals are not available.
 * Looks for the pattern: hard effort followed by recovery.
 */
export function analyzeLactateClearanceFromStream(
  _heartRateData: number[],
  _paceData: number[]
): LactateClearanceResult {
  void _heartRateData;
  void _paceData;

  // This is a simplified version - real implementation would need
  // to detect effort vs recovery from pace patterns
  return {
    intervals: [],
    averageDropPercent: 0,
    overallQuality: 'poor',
    verdict: 'Se requiere estructura de intervalos para análisis detallado de lactato.',
    hasIntervals: false,
  };
}

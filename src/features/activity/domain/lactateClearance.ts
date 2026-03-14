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

const RECOVERY_WINDOW_SECONDS = 180; // 3 minutes

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
  }>
): LactateClearanceResult {
  // Find recovery intervals (typically after hard intervals)
  // In Luis del Águila's methodology, recovery is always 3 minutes
  const recoveryIntervals: RecoveryInterval[] = [];
  
  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];
    const nextInterval = intervals[i + 1];
    
    // Skip if no HR data
    if (!interval.maxHeartrate || !interval.averageHeartrate) continue;
    
    // Look for recovery period after a hard effort
    // Recovery should be around 3 minutes (180 seconds)
    if (nextInterval && nextInterval.duration >= 120) {
      const peakHR = interval.maxHeartrate;
      const endHR = nextInterval.averageHeartrate;
      
      if (peakHR && endHR && peakHR > 0 && endHR > 0) {
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
    }
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

/**
 * Classify recovery quality based on HR drop percentage
 * 
 * Based on typical lactate clearance rates:
 * - >30% drop: Excellent (efficient clearing)
 * - 20-30% drop: Good
 * - <20% drop: Poor (lactate accumulating)
 */
function classifyRecoveryQuality(dropPercent: number): LactateQuality {
  if (dropPercent >= 25) return 'excellent';
  if (dropPercent >= 15) return 'good';
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
  heartRateData: number[],
  paceData: number[]
): LactateClearanceResult {
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

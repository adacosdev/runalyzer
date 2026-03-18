/**
 * Zone Distribution Analysis - Runalyzer
 * 
 * Implements Luis del Águila's 3-zone metabolic model:
 * - Zone 1: Fat oxidation / easy running (aerobic base)
 * - Zone 2: Glycogen/lactate threshold 
 * - Zone 3: VO2Max / high intensity
 * 
 * Unlike commercial apps with 5-7 zones, this uses only 3 zones
 * based on metabolic pathways.
 */

import { SessionType, ZoneDistribution } from './types';
import { 
  calculateTimeInZones, 
  zoneSecondsToPercent,
  roundTo 
} from './math';
import { ZoneConfig, getZoneThresholds } from '../../setup/domain/zones.types';

/**
 * Analyze zone distribution from heart rate data
 * 
 * @param heartRateData - Array of HR values (one per second)
 * @param zoneConfig - User's zone thresholds
 * @returns ZoneDistribution with time in each zone
 */
export function analyzeZoneDistribution(
  heartRateData: number[],
  zoneConfig: ZoneConfig,
  sessionType: SessionType = 'mixed'
): ZoneDistribution {
  const thresholds = getZoneThresholds(zoneConfig);
  
  // Calculate raw seconds in each zone
  const { z1, z2, z3, total } = calculateTimeInZones(
    heartRateData,
    thresholds.z1.max,
    thresholds.z2.max
  );
  
  // Convert to percentages
  const { z1Percent, z2Percent, z3Percent } = zoneSecondsToPercent(z1, z2, z3);
  
  // Generate verdict based on ideal distribution for runners
  const verdict = generateZoneVerdict(z1Percent, z2Percent, z3Percent, zoneConfig.isEstimated, sessionType);
  
  return {
    z1Seconds: z1,
    z2Seconds: z2,
    z3Seconds: z3,
    z1Percent: roundTo(z1Percent),
    z2Percent: roundTo(z2Percent),
    z3Percent: roundTo(z3Percent),
    totalSeconds: total,
    verdict,
    isEstimated: zoneConfig.isEstimated,
  };
}

/**
 * Generate verdict message based on zone distribution
 */
function generateZoneVerdict(
  z1Percent: number,
  z2Percent: number,
  z3Percent: number,
  isEstimated: boolean,
  sessionType: SessionType
): string {
  let message = '';
  
  // Zone 1 should dominate for aerobic development
  if (sessionType !== 'interval_z2') {
    if (z1Percent < 60) {
      message = 'Muy poco tiempo en Z1. Esto compromete el desarrollo de la base aeróbica. ';
    } else if (z1Percent < 75) {
      message = 'Podrías pasar más tiempo en Z1. La base es fundamental. ';
    }
  }
  
  // Zone 2 is for threshold work
  if (z2Percent > 50) {
    message += 'Exceso de tiempo en Z2. Solo sesiones específicas deberían estar en esta zona. ';
  } else if (z2Percent > 15) {
    message += 'Tiempo adecuado en Z2 para trabajo de umbral. ';
  }
  
  // Zone 3 should be minimal unless it's a race or interval session
  if (z3Percent > 15) {
    message += 'Mucho tiempo en Z3. Asegúrate de que sea en sesiones intendedas para ello. ';
  }
  
  if (!message) {
    message = 'Distribución de zonas equilibrada para desarrollo aeróbico. ';
  }
  
  if (isEstimated) {
    message += '(Zonas estimadas - calibra para mayor precisión)';
  }
  
  return message.trim();
}

/**
 * Calculate target zone distribution based on training type
 */
export type TrainingType = 'base' | 'threshold' | 'interval' | 'race';

export function getTargetZoneDistribution(type: TrainingType): {
  z1: { min: number; max: number };
  z2: { min: number; max: number };
  z3: { min: number; max: number };
} {
  switch (type) {
    case 'base':
      return {
        z1: { min: 70, max: 90 },
        z2: { min: 5, max: 20 },
        z3: { min: 0, max: 10 },
      };
    case 'threshold':
      return {
        z1: { min: 40, max: 60 },
        z2: { min: 30, max: 50 },
        z3: { min: 0, max: 20 },
      };
    case 'interval':
      return {
        z1: { min: 20, max: 40 },
        z2: { min: 20, max: 40 },
        z3: { min: 30, max: 50 },
      };
    case 'race':
      return {
        z1: { min: 0, max: 30 },
        z2: { min: 40, max: 70 },
        z3: { min: 20, max: 40 },
      };
  }
}

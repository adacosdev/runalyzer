/**
 * Internal vs External Load Analysis - Runalyzer
 * 
 * Implements Luis del Águila's methodology for cross-referencing
 * external load (pace) with internal load (heart rate response).
 * 
 * Concept: Success is not measured by pace alone, but by how the body
 * responds to that pace. Same pace can be easy or hard depending on
 * the day's condition.
 */

import { InternalExternalLoad, LoadInterval } from './types';
import { average, roundTo } from './math';
import { ZoneConfig } from '../../setup/domain/zones.types';
import { ACTIVE_PACE_THRESHOLD_SECONDS_PER_KM } from './intervalClassification';

interface SessionLoadContext {
  sessionType?: 'interval_z2' | 'rodaje_z1' | 'z1_warmup_cooldown' | 'mixed';
  activeFcMax?: number | null;
  sessionFcMax?: number | null;
}

/**
 * Analyze internal vs external load from interval data
 * 
 * @param intervals - Activity intervals with pace and HR data
 * @param userRPE - Optional RPE values per interval (from user input)
 * @returns InternalExternalLoad with analysis
 */
export function analyzeInternalExternalLoad(
  intervals: Array<{
    name: string;
    averagePace: number | null; // seconds per km
    averageHeartrate: number | null;
    duration: number;
    type: string;
  }>,
  userRPE?: number[],
  zoneConfig?: ZoneConfig | null,
  sessionContext?: SessionLoadContext
): InternalExternalLoad {
  const loadIntervals: LoadInterval[] = [];
  
  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];
    
    // Skip intervals without required data
    if (!interval.averagePace || !interval.averageHeartrate) continue;
    if (interval.duration < 30) continue; // Skip very short intervals
    if (interval.averagePace > ACTIVE_PACE_THRESHOLD_SECONDS_PER_KM) continue;
    
    const avgPace = interval.averagePace;
    const avgHR = interval.averageHeartrate;
    const rpe = userRPE?.[i];
    
    // Calculate HR-to-pace efficiency
    // Higher = more efficient (more pace per unit of cardiac stress)
    // This is a simplified metric - could be refined with more data
    const hrToPaceEfficiency = avgPace > 0 ? (1000 / avgPace) / avgHR : 0;
    
    loadIntervals.push({
      name: interval.name || `Intervalo ${i + 1}`,
      avgPaceMps: roundTo(avgPace),
      avgHR: roundTo(avgHR),
      rpe,
      hrToPaceEfficiency: roundTo(hrToPaceEfficiency, 3),
      verdict: generateLoadVerdict(avgHR, avgPace, rpe, zoneConfig),
    });
  }
  
  if (loadIntervals.length === 0) {
    return {
      intervals: [],
      sessionAvgPaceMinKm: 0,
      sessionAvgHR: 0,
      sessionVerdict: 'No hay suficientes datos para analizar la carga interna vs externa.',
    };
  }
  
  // Calculate session averages
  const allPaces = loadIntervals
    .map((interval) => interval.avgPaceMps)
    .filter((pace) => pace > 0 && pace <= ACTIVE_PACE_THRESHOLD_SECONDS_PER_KM);
  const allHRs = loadIntervals.map(i => i.avgHR).filter(h => h > 0);
  
  const sessionAvgPace = average(allPaces);
  const sessionAvgHR = average(allHRs);
  
  return {
    intervals: loadIntervals,
    sessionAvgPaceMinKm: roundTo(sessionAvgPace),
    sessionAvgHR: roundTo(sessionAvgHR),
    sessionVerdict: generateSessionVerdict(sessionAvgHR, sessionAvgPace, zoneConfig, sessionContext),
  };
}

/**
 * Generate verdict for individual interval
 */
function generateLoadVerdict(
  avgHR: number,
  avgPace: number,
  rpe?: number,
  zoneConfig?: ZoneConfig | null
): string {
  // If we have RPE, cross-reference with HR
  if (rpe !== undefined) {
    const hrExpected = estimateHRForRPE(rpe);
    const hrDiff = Math.abs(avgHR - hrExpected);

    if (hrDiff > 20) {
      return rpe > avgHR / 10
        ? 'RPE más alto que la respuesta de FC - posiblemente ejecutaste más fuerte de lo que sientes.'
        : 'FC más alta de lo esperado para este RPE - el cuerpo estaba fatigado o bajo estrés.';
    }
  }

  // Use zone config thresholds when available, fall back to sensible defaults
  const z1Max = zoneConfig?.z1MaxHR ?? 120;
  const z2Max = zoneConfig?.z2MaxHR ?? 150;

  if (avgHR < z1Max) {
    return 'Intensidad baja - trabajo de recuperación o aerobic suave.';
  } else if (avgHR < z2Max) {
    return 'Intensidad moderada - trabajo de zona 1-2, desarrollo de base.';
  } else if (avgHR < z2Max + 15) {
    return 'Intensidad alta - trabajo de umbral o VO2Max.';
  } else {
    return 'Intensidad máxima - sprint o esfuerzo de carrera.';
  }
}

/**
 * Estimate expected HR for a given RPE (rough heuristic)
 * Assumes: RPE 1-10 → HR 50-200 range approximately
 */
function estimateHRForRPE(rpe: number): number {
  return Math.round(50 + (rpe * 15)); // Very rough estimate
}

/**
 * Generate session verdict
 */
function generateSessionVerdict(
  avgHR: number,
  avgPace: number,
  zoneConfig?: ZoneConfig | null,
  sessionContext?: SessionLoadContext
): string {
  const z1Max = zoneConfig?.z1MaxHR ?? 120;
  const z2Max = zoneConfig?.z2MaxHR ?? 150;

  if (sessionContext?.sessionType === 'interval_z2') {
    if (sessionContext.activeFcMax != null && sessionContext.activeFcMax > z2Max) {
      return 'Sesión de umbral con intensidad por encima de Z2. Vigilá el control en los bloques activos.';
    }

    return 'Sesión de umbral. Trabajo principal en Z2 con carga interna coherente.';
  }

  if (sessionContext?.sessionType === 'rodaje_z1' || sessionContext?.sessionType === 'z1_warmup_cooldown') {
    const sessionFcMax = sessionContext.sessionFcMax ?? avgHR;
    if (sessionFcMax > z1Max) {
      return 'Rodaje por encima de Z1. Cuidá la intensidad para sostener el estímulo aeróbico.';
    }

    return 'Sesión de rodaje en Z1. Carga interna controlada.';
  }

  if (avgHR < z1Max) {
    return 'Sesión de recuperación. Baja carga interna, enfocate en mantener la continuidad.';
  } else if (avgHR < z2Max) {
    return 'Sesión de base aeróbica. Ideal para desarrollar capacidad cardiovascular.';
  } else if (avgHR < z2Max + 20) {
    return 'Sesión de umbral. Buena intensidad para mejorar el límite de rendimiento.';
  } else {
    return 'Sesión de alta intensidad. Asegúrate de que el objetivo era trabajar en VO2Max.';
  }
}

/**
 * Calculate training stress based on duration, intensity, and HR
 * Simplified TRIMP-like metric
 */
export function calculateTrainingStress(
  durationMinutes: number,
  avgHR: number,
  maxHR: number
): number {
  if (maxHR <= 0 || avgHR <= 0) return 0;
  
  // Normalized HR (0-1)
  const hrPercent = avgHR / maxHR;
  
  // Duration factor
  const durationFactor = durationMinutes / 60;
  
  // Simple stress estimate
  const stress = hrPercent * durationFactor * 100;
  
  return roundTo(stress);
}

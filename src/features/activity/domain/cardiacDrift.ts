/**
 * Cardiac Drift Analysis - Runalyzer
 * 
 * Implements Luis del Águila's methodology for measuring metabolic homeostasis.
 * 
 * Concept: During constant pace effort, HR should remain stable.
 * If HR drifts upward (>4%), the body is not adapting to the pace -
 * meaning the pace was too hard for that day's condition.
 * 
 * The analysis splits the activity into first half and second half by time,
 * compares average HR, and calculates the drift percentage.
 */

import { CardiacDriftResult, CardiacDriftVerdict, SessionType } from './types';
import { 
  average, 
  filterInvalidHR, 
  splitInHalf, 
  calculateDrift,
  roundTo 
} from './math';
import { ClassifiedSegment } from './intervalClassification';
import { selectDriftWindow } from './driftWindowing';

/**
 * Analyze cardiac drift from heart rate stream data
 * 
 * @param heartRateData - Array of heart rate values (one per second)
 * @param config - Optional configuration
 * @returns CardiacDriftResult with verdict and metrics
 */
export function analyzeCardiacDrift(
  heartRateData: number[],
  config?: CardiacDriftConfig
): CardiacDriftResult {
  const {
    driftThreshold = 4,
    warningThreshold = 8,
    minValidPercent = 80,
  } = config || {};
  
  // Step 1: Filter invalid HR data
  const { filtered, validCount, validPercent } = filterInvalidHR(heartRateData);
  
  // Check for insufficient data
  if (validPercent < minValidPercent || filtered.length < 120) {
    return {
      verdict: 'insufficient-data',
      driftPercent: 0,
      firstHalfAvgHR: 0,
      secondHalfAvgHR: 0,
      message: 'No hay suficientes datos de frecuencia cardíaca para analizar el drift.',
      dataQualityWarning: validPercent < minValidPercent 
        ? `Solo el ${roundTo(validPercent)}% de los datos son válidos.`
        : undefined,
      validDataPoints: validCount,
    };
  }
  
  // Step 2: Split into first and second half
  const [firstHalf, secondHalf] = splitInHalf(filtered);
  
  // Step 3: Calculate averages
  const firstHalfAvgHR = average(firstHalf);
  const secondHalfAvgHR = average(secondHalf);
  
  // Step 4: Calculate drift percentage
  const driftPercent = calculateDrift(firstHalf, secondHalf);
  
  // Step 5: Determine verdict based on drift threshold
  let verdict: CardiacDriftVerdict;
  let message: string;
  
  if (driftPercent < driftThreshold) {
    // Drift is within acceptable range - good adaptation
    verdict = 'ok';
    message = driftPercent <= 0
      ? 'Tu frecuencia cardíaca se mantuvo estable. Tu cuerpo está adaptado a este ritmo.'
      : `Ligero incremento del ${roundTo(driftPercent)}% en la segunda mitad. Dentro de lo normal.`;
  } else if (driftPercent < warningThreshold) {
    // Moderate drift - warning
    verdict = 'warning';
    message = `Tu frecuencia cardíaca subió un ${roundTo(driftPercent)}% en la segunda mitad. ` +
      'El ritmo fue ligeramente exigente para tu condición de hoy. ' +
      'Para la próxima sesión similar, considera ir un poco más lento.';
  } else {
    // Significant drift - bad execution
    verdict = 'bad';
    message = `Tu frecuencia cardíaca subió un ${roundTo(driftPercent)}% en la segunda mitad. ` +
      'El ritmo fue demasiado exigente y tu cuerpo no pudo mantener la homeostasis metabólica. ' +
      'Para la próxima, reduce el ritmo al menos 10-15 segundos/km.';
  }
  
  return {
    verdict,
    driftPercent: roundTo(driftPercent),
    firstHalfAvgHR: roundTo(firstHalfAvgHR),
    secondHalfAvgHR: roundTo(secondHalfAvgHR),
    message,
    validDataPoints: validCount,
  };
}

/**
 * Configuration for cardiac drift analysis
 */
export interface CardiacDriftConfig {
  /** Drift percentage that indicates good adaptation (default: 4%) */
  driftThreshold?: number;
  /** Drift percentage that triggers warning (default: 8%) */
  warningThreshold?: number;
  /** Minimum percentage of valid HR data required (default: 80%) */
  minValidPercent?: number;
}

export interface CardiacDriftV2Input {
  heartRateData: number[];
  timeData: number[];
  sessionType: SessionType;
  classifiedSegments: ClassifiedSegment[];
  externalDecouplingPercent?: number | null;
  driftThreshold?: number;
  warningThreshold?: number;
}

const MIN_VALID_DRIFT_WINDOW_SAMPLES = 20;

function isValidHeartRate(hr: number): boolean {
  return hr >= 30 && hr <= 220;
}

function buildWindowedHeartRateData(
  heartRateData: number[],
  timeData: number[],
  startSec: number,
  endSec: number
): number[] {
  const sampleCount = Math.min(heartRateData.length, timeData.length);
  const windowedSamples: number[] = [];

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const timestampSec = timeData[sampleIndex];
    if (timestampSec < startSec || timestampSec > endSec) {
      continue;
    }

    const heartRate = heartRateData[sampleIndex];
    if (!isValidHeartRate(heartRate)) {
      continue;
    }

    windowedSamples.push(heartRate);
  }

  return windowedSamples;
}

export function analyzeCardiacDriftV2(input: CardiacDriftV2Input): CardiacDriftResult {
  const {
    heartRateData,
    timeData,
    sessionType,
    classifiedSegments,
    externalDecouplingPercent,
    driftThreshold = 4,
    warningThreshold = 8,
  } = input;

  const windowSelection = selectDriftWindow({
    sessionType,
    timeData,
    classifiedSegments,
  });

  if (!windowSelection.window) {
    return {
      verdict: 'insufficient-data',
      driftPercent: 0,
      firstHalfAvgHR: 0,
      secondHalfAvgHR: 0,
      message: 'No hay ventana valida para analizar el drift cardíaco.',
      validDataPoints: 0,
      reasonCode: windowSelection.reasonCode,
      sourceAuthority: 'local_unavailable',
      policyApplied: windowSelection.trimPolicy.policyApplied,
      externalReference: {
        intervalsIcuDecouplingPercent: externalDecouplingPercent ?? null,
      },
    };
  }

  const { startSec, endSec } = windowSelection.window;
  const windowedHeartRateData = buildWindowedHeartRateData(heartRateData, timeData, startSec, endSec);
  if (windowedHeartRateData.length < MIN_VALID_DRIFT_WINDOW_SAMPLES) {
    return {
      verdict: 'insufficient-data',
      driftPercent: 0,
      firstHalfAvgHR: 0,
      secondHalfAvgHR: 0,
      message: 'No hay suficientes datos de frecuencia cardíaca en la ventana de análisis.',
      validDataPoints: windowedHeartRateData.length,
      reasonCode: 'trim-window-too-short',
      sourceAuthority: 'local_unavailable',
      policyApplied: windowSelection.trimPolicy.policyApplied,
      externalReference: {
        intervalsIcuDecouplingPercent: externalDecouplingPercent ?? null,
      },
    };
  }

  const [firstHalf, secondHalf] = splitInHalf(windowedHeartRateData);
  const firstHalfAvgHR = average(firstHalf);
  const secondHalfAvgHR = average(secondHalf);
  const driftPercent = calculateDrift(firstHalf, secondHalf);

  let verdict: CardiacDriftVerdict = 'ok';
  if (driftPercent >= warningThreshold) {
    verdict = 'bad';
  } else if (driftPercent >= driftThreshold) {
    verdict = 'warning';
  }

  let message = 'Tu drift cardíaco se mantuvo en rango.';
  if (verdict === 'warning') {
    message = `Tu frecuencia cardíaca subió un ${roundTo(driftPercent)}% en la ventana analizada.`;
  } else if (verdict === 'bad') {
    message = `Tu frecuencia cardíaca subió un ${roundTo(driftPercent)}% en la ventana analizada. El esfuerzo fue exigente.`;
  }

  return {
    verdict,
    driftPercent: roundTo(driftPercent),
    firstHalfAvgHR: roundTo(firstHalfAvgHR),
    secondHalfAvgHR: roundTo(secondHalfAvgHR),
    message,
    validDataPoints: windowedHeartRateData.length,
    reasonCode: 'ok',
    sourceAuthority: 'local_primary',
    policyApplied: windowSelection.trimPolicy.policyApplied,
    analysisWindow: {
      startSec,
      endSec,
      durationSec: endSec - startSec,
    },
    externalReference: {
      intervalsIcuDecouplingPercent: externalDecouplingPercent ?? null,
    },
  };
}

/**
 * Legacy function name for backward compatibility
 */
export const analyzeCardiacDriftLegacy = analyzeCardiacDrift;

import { DomainInterval } from './activity.types';
import { AnalysisReasonCode, ConfidenceMarker } from './types';
import { average, roundTo } from './math';
import { ACTIVE_PACE_THRESHOLD_SECONDS_PER_KM } from './intervalClassification';

const CHECKPOINT_TOLERANCE_SECONDS = 3;
const ACTIVE_PEAK_WINDOW_SECONDS = 60;

export interface CheckpointSample {
  targetSec: number;
  actualSec?: number;
  hr?: number;
  confidence: ConfidenceMarker;
}

export interface LactateProtocolIntervalResult {
  intervalId: string;
  intervalName: string;
  peakHr?: number;
  efficiencyEndHr?: number;
  structuralEndHr?: number;
  efficiencyDropPct?: number;
  structuralDropPct?: number;
  confidence: {
    peak: ConfidenceMarker;
    plus1m: ConfidenceMarker;
    plus2m: ConfidenceMarker;
  };
  reasonCode: AnalysisReasonCode;
}

export interface LactateProtocolResult {
  intervals: LactateProtocolIntervalResult[];
  hasIntervals: boolean;
}

export interface LactateProtocolInput {
  intervals: DomainInterval[];
  timeData: number[];
  heartRateData: number[];
}

function isValidHeartRate(hr: number): boolean {
  return hr >= 30 && hr <= 220;
}

function getNearestSampleIndex(
  timeData: number[],
  targetSec: number,
  toleranceSec: number
): number | null {
  let nearestIndex: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < timeData.length; index += 1) {
    const distance = Math.abs(timeData[index] - targetSec);
    if (distance > toleranceSec) {
      continue;
    }

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
      continue;
    }

    if (distance === nearestDistance && nearestIndex != null && timeData[index] < timeData[nearestIndex]) {
      nearestIndex = index;
    }
  }

  return nearestIndex;
}

export function pickCheckpointSample(
  timeData: number[],
  heartRateData: number[],
  targetSec: number,
  toleranceSec: number = CHECKPOINT_TOLERANCE_SECONDS
): CheckpointSample {
  const sampleCount = Math.min(timeData.length, heartRateData.length);
  if (sampleCount === 0) {
    return {
      targetSec,
      confidence: 'unavailable',
    };
  }

  for (let index = 0; index < sampleCount; index += 1) {
    if (timeData[index] !== targetSec) {
      continue;
    }

    const heartRate = heartRateData[index];
    if (!isValidHeartRate(heartRate)) {
      break;
    }

    return {
      targetSec,
      actualSec: targetSec,
      hr: heartRate,
      confidence: 'exact',
    };
  }

  const nearestIndex = getNearestSampleIndex(timeData.slice(0, sampleCount), targetSec, toleranceSec);
  if (nearestIndex == null) {
    return {
      targetSec,
      confidence: 'unavailable',
    };
  }

  const nearestHeartRate = heartRateData[nearestIndex];
  if (!isValidHeartRate(nearestHeartRate)) {
    return {
      targetSec,
      confidence: 'unavailable',
    };
  }

  return {
    targetSec,
    actualSec: timeData[nearestIndex],
    hr: nearestHeartRate,
    confidence: 'fallback_nearest_3s',
  };
}

function buildPeakHeartRate(
  timeData: number[],
  heartRateData: number[],
  intervalStartSec: number,
  intervalEndSec: number
): { peakHr?: number; confidence: ConfidenceMarker } {
  const peakWindowStartSec = Math.max(intervalStartSec, intervalEndSec - ACTIVE_PEAK_WINDOW_SECONDS);
  const sampleCount = Math.min(timeData.length, heartRateData.length);
  const peakSamples: number[] = [];

  for (let index = 0; index < sampleCount; index += 1) {
    const timestampSec = timeData[index];
    if (timestampSec < peakWindowStartSec || timestampSec > intervalEndSec) {
      continue;
    }

    const heartRate = heartRateData[index];
    if (!isValidHeartRate(heartRate)) {
      continue;
    }

    peakSamples.push(heartRate);
  }

  if (peakSamples.length === 0) {
    return { confidence: 'unavailable' };
  }

  const peakHeartRate = average(peakSamples);

  return {
    peakHr: roundTo(peakHeartRate),
    confidence: 'exact',
  };
}

function buildIntervalResult(
  interval: DomainInterval,
  timeData: number[],
  heartRateData: number[],
  recoveryInterval?: DomainInterval
): LactateProtocolIntervalResult {
  const intervalEndSec = recoveryInterval?.startTime ?? (interval.startTime + interval.duration);
  const peak = buildPeakHeartRate(timeData, heartRateData, interval.startTime, intervalEndSec);
  if (peak.peakHr == null) {
    return {
      intervalId: interval.id,
      intervalName: interval.name,
      confidence: {
        peak: 'unavailable',
        plus1m: 'unavailable',
        plus2m: 'unavailable',
      },
      reasonCode: 'peak-window-missing',
    };
  }

  const plus1m = pickCheckpointSample(timeData, heartRateData, intervalEndSec + 60);
  const plus2m = pickCheckpointSample(timeData, heartRateData, intervalEndSec + 120);

  if (plus1m.hr == null || plus2m.hr == null) {
    return {
      intervalId: interval.id,
      intervalName: interval.name,
      peakHr: peak.peakHr,
      efficiencyEndHr: plus1m.hr,
      structuralEndHr: plus2m.hr,
      confidence: {
        peak: peak.confidence,
        plus1m: plus1m.confidence,
        plus2m: plus2m.confidence,
      },
      reasonCode: 'checkpoint-unavailable-outside-window',
    };
  }

  const efficiencyDropPct = ((peak.peakHr - plus1m.hr) / peak.peakHr) * 100;
  const structuralDropPct = ((peak.peakHr - plus2m.hr) / peak.peakHr) * 100;

  return {
    intervalId: interval.id,
    intervalName: interval.name,
    peakHr: peak.peakHr,
    efficiencyEndHr: roundTo(plus1m.hr),
    structuralEndHr: roundTo(plus2m.hr),
    efficiencyDropPct: roundTo(efficiencyDropPct),
    structuralDropPct: roundTo(structuralDropPct),
    confidence: {
      peak: peak.confidence,
      plus1m: plus1m.confidence,
      plus2m: plus2m.confidence,
    },
    reasonCode: 'ok',
  };
}

export function analyzeLactateProtocol(input: LactateProtocolInput): LactateProtocolResult {
  const { intervals, timeData, heartRateData } = input;
  if (timeData.length === 0 || heartRateData.length === 0) {
    return {
      intervals: [],
      hasIntervals: false,
    };
  }

  const intervalResults: LactateProtocolIntervalResult[] = [];

  for (let index = 0; index < intervals.length; index += 1) {
    const activeInterval = intervals[index];
    if (activeInterval.isRecovery) {
      continue;
    }

    const nextInterval = intervals[index + 1];
    const recoveryInterval = nextInterval && (
      nextInterval.isRecovery
      || (
        nextInterval.averagePace != null
        && nextInterval.averagePace > ACTIVE_PACE_THRESHOLD_SECONDS_PER_KM
      )
    )
      ? nextInterval
      : undefined;
    intervalResults.push(buildIntervalResult(activeInterval, timeData, heartRateData, recoveryInterval));
  }

  return {
    intervals: intervalResults,
    hasIntervals: intervalResults.some((result) => result.reasonCode === 'ok'),
  };
}

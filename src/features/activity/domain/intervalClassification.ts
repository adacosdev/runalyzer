export const ACTIVE_PACE_THRESHOLD_SECONDS_PER_KM = 600;

export type PaceClass = 'active' | 'recovery';

export type PaceClassificationReasonCode = 'pace-missing' | 'pace-invalid-nonpositive';

export interface PaceSampleClassification {
  sampleIndex: number;
  timestampSec: number;
  paceSecPerKm: number | null;
  classLabel: PaceClass;
  thresholdSecPerKm: number;
  reasonCode?: PaceClassificationReasonCode;
}

export interface ClassifiedSegment {
  startSec: number;
  endSec: number;
  durationSec: number;
  classLabel: PaceClass;
  sampleCount: number;
}

export function classifyPaceSample(
  paceSecPerKm: number | null,
  thresholdSecPerKm: number = ACTIVE_PACE_THRESHOLD_SECONDS_PER_KM
): PaceClass {
  if (paceSecPerKm == null || paceSecPerKm <= 0) {
    return 'recovery';
  }

  return paceSecPerKm <= thresholdSecPerKm ? 'active' : 'recovery';
}

export function classifyPaceStream(
  timeStreamSec: number[],
  paceStreamSecPerKm: Array<number | null>,
  thresholdSecPerKm: number = ACTIVE_PACE_THRESHOLD_SECONDS_PER_KM
): PaceSampleClassification[] {
  if (timeStreamSec.length !== paceStreamSecPerKm.length) {
    throw new Error(
      `Time/pace stream length mismatch: time=${timeStreamSec.length}, pace=${paceStreamSecPerKm.length}`
    );
  }

  const sampleCount = timeStreamSec.length;
  const samples: PaceSampleClassification[] = [];

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const timestampSec = timeStreamSec[sampleIndex];
    const paceSecPerKm = paceStreamSecPerKm[sampleIndex];
    const classLabel = classifyPaceSample(paceSecPerKm, thresholdSecPerKm);

    let reasonCode: PaceClassificationReasonCode | undefined;
    if (paceSecPerKm == null) {
      reasonCode = 'pace-missing';
    } else if (paceSecPerKm <= 0) {
      reasonCode = 'pace-invalid-nonpositive';
    }

    samples.push({
      sampleIndex,
      timestampSec,
      paceSecPerKm,
      classLabel,
      thresholdSecPerKm,
      reasonCode,
    });
  }

  return samples;
}

export function buildClassifiedSegments(samples: PaceSampleClassification[]): ClassifiedSegment[] {
  if (samples.length === 0) {
    return [];
  }

  const segments: ClassifiedSegment[] = [];
  let currentClassLabel = samples[0].classLabel;
  let currentStartSec = samples[0].timestampSec;
  let currentDurationSec = 0;
  let currentSampleCount = 1;

  for (let index = 0; index < samples.length; index += 1) {
    const currentSample = samples[index];
    const nextSample = samples[index + 1];
    const nextTimestamp = nextSample?.timestampSec ?? currentSample.timestampSec;
    const sampleDuration = Math.max(nextTimestamp - currentSample.timestampSec, 0);

    currentDurationSec += sampleDuration;

    if (!nextSample || nextSample.classLabel !== currentClassLabel) {
      segments.push({
        startSec: currentStartSec,
        endSec: currentStartSec + currentDurationSec,
        durationSec: currentDurationSec,
        classLabel: currentClassLabel,
        sampleCount: currentSampleCount,
      });

      if (!nextSample) {
        continue;
      }

      currentClassLabel = nextSample.classLabel;
      currentStartSec = nextSample.timestampSec;
      currentDurationSec = 0;
      currentSampleCount = 1;
      continue;
    }

    currentSampleCount += 1;
  }

  return segments;
}

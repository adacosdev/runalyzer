import { ClassifiedSegment } from './intervalClassification';
import { SessionType } from './types';

export type DriftWindowReasonCode =
  | 'ok'
  | 'trim-window-empty'
  | 'trim-window-too-short'
  | 'missing-main-z2-block';

export interface DriftTrimPolicy {
  headTrimSec: number;
  tailTrimSec: number;
  policyApplied: 'interval_5_5' | 'rodaje_10_10';
}

export interface DriftWindow {
  startSec: number;
  endSec: number;
  durationSec: number;
}

export interface DriftWindowSelection {
  window: DriftWindow | null;
  reasonCode: DriftWindowReasonCode;
  trimPolicy: DriftTrimPolicy;
}

const INTERVAL_TRIM_POLICY: DriftTrimPolicy = {
  headTrimSec: 5 * 60,
  tailTrimSec: 5 * 60,
  policyApplied: 'interval_5_5',
};

const RODAJE_TRIM_POLICY: DriftTrimPolicy = {
  headTrimSec: 10 * 60,
  tailTrimSec: 10 * 60,
  policyApplied: 'rodaje_10_10',
};

const MIN_TRIMMED_WINDOW_SECONDS = 120;

function getMainZ2Block(segments: ClassifiedSegment[]): ClassifiedSegment | null {
  const activeSegments = segments.filter((segment) => segment.classLabel === 'active');
  if (activeSegments.length === 0) {
    return null;
  }

  return activeSegments.reduce((currentMain, segment) => {
    if (segment.durationSec > currentMain.durationSec) {
      return segment;
    }

    if (segment.durationSec === currentMain.durationSec && segment.startSec < currentMain.startSec) {
      return segment;
    }

    return currentMain;
  });
}

function buildTrimmedWindow(
  baseWindow: DriftWindow,
  trimPolicy: DriftTrimPolicy,
  minimumWindowSec: number
): DriftWindowSelection {
  const trimmedStartSec = baseWindow.startSec + trimPolicy.headTrimSec;
  const trimmedEndSec = baseWindow.endSec - trimPolicy.tailTrimSec;
  const trimmedDurationSec = trimmedEndSec - trimmedStartSec;

  if (trimmedDurationSec <= 0) {
    return {
      window: null,
      reasonCode: 'trim-window-empty',
      trimPolicy,
    };
  }

  if (trimmedDurationSec < minimumWindowSec) {
    return {
      window: null,
      reasonCode: 'trim-window-too-short',
      trimPolicy,
    };
  }

  return {
    window: {
      startSec: trimmedStartSec,
      endSec: trimmedEndSec,
      durationSec: trimmedDurationSec,
    },
    reasonCode: 'ok',
    trimPolicy,
  };
}

export interface DriftWindowingInput {
  sessionType: SessionType;
  timeData: number[];
  classifiedSegments: ClassifiedSegment[];
  minimumWindowSec?: number;
}

export function selectDriftWindow(input: DriftWindowingInput): DriftWindowSelection {
  const { sessionType, timeData, classifiedSegments, minimumWindowSec = MIN_TRIMMED_WINDOW_SECONDS } = input;

  if (sessionType === 'interval_z2') {
    const mainZ2Block = getMainZ2Block(classifiedSegments);
    if (!mainZ2Block) {
      return {
        window: null,
        reasonCode: 'missing-main-z2-block',
        trimPolicy: INTERVAL_TRIM_POLICY,
      };
    }

    return buildTrimmedWindow(
      {
        startSec: mainZ2Block.startSec,
        endSec: mainZ2Block.endSec,
        durationSec: mainZ2Block.durationSec,
      },
      INTERVAL_TRIM_POLICY,
      minimumWindowSec
    );
  }

  const firstTimestamp = timeData[0];
  const lastTimestamp = timeData[timeData.length - 1];
  if (firstTimestamp == null || lastTimestamp == null) {
    return {
      window: null,
      reasonCode: 'trim-window-empty',
      trimPolicy: RODAJE_TRIM_POLICY,
    };
  }

  return buildTrimmedWindow(
    {
      startSec: firstTimestamp,
      endSec: lastTimestamp,
      durationSec: lastTimestamp - firstTimestamp,
    },
    RODAJE_TRIM_POLICY,
    minimumWindowSec
  );
}

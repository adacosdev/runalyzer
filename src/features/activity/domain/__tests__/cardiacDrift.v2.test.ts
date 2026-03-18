import { describe, expect, it } from 'vitest';
import { analyzeCardiacDriftV2 } from '../cardiacDrift';
import type { ClassifiedSegment } from '../intervalClassification';

function buildMinuteTimeline(minutes: number): number[] {
  return Array.from({ length: minutes + 1 }, (_, index) => index * 60);
}

describe('analyzeCardiacDriftV2', () => {
  it('applies 5m/5m trim for interval_z2 main block', () => {
    const timeData = buildMinuteTimeline(60);
    const heartRateData = timeData.map((timestamp) => {
      if (timestamp < 900 || timestamp > 2700) {
        return 130;
      }

      return timestamp <= 1800 ? 145 : 155;
    });

    const classifiedSegments: ClassifiedSegment[] = [
      { startSec: 0, endSec: 900, durationSec: 900, classLabel: 'recovery', sampleCount: 15 },
      { startSec: 900, endSec: 2700, durationSec: 1800, classLabel: 'active', sampleCount: 30 },
      { startSec: 2700, endSec: 3600, durationSec: 900, classLabel: 'recovery', sampleCount: 15 },
    ];

    const result = analyzeCardiacDriftV2({
      heartRateData,
      timeData,
      sessionType: 'interval_z2',
      classifiedSegments,
      externalDecouplingPercent: 3.2,
    });

    expect(result.reasonCode).toBe('ok');
    expect(result.policyApplied).toBe('interval_5_5');
    expect(result.analysisWindow).toEqual({
      startSec: 1200,
      endSec: 2400,
      durationSec: 1200,
    });
    expect(result.sourceAuthority).toBe('local_primary');
    expect(result.externalReference).toEqual({ intervalsIcuDecouplingPercent: 3.2 });
  });

  it('applies 10m/10m trim for rodaje_z1 sessions', () => {
    const timeData = buildMinuteTimeline(70);
    const heartRateData = timeData.map((timestamp) => (timestamp <= 2100 ? 138 : 142));

    const result = analyzeCardiacDriftV2({
      heartRateData,
      timeData,
      sessionType: 'rodaje_z1',
      classifiedSegments: [],
    });

    expect(result.reasonCode).toBe('ok');
    expect(result.policyApplied).toBe('rodaje_10_10');
    expect(result.analysisWindow).toEqual({
      startSec: 600,
      endSec: 3600,
      durationSec: 3000,
    });
  });

  it('returns missing-main-z2-block when interval_z2 has no active block', () => {
    const result = analyzeCardiacDriftV2({
      heartRateData: buildMinuteTimeline(20).map(() => 140),
      timeData: buildMinuteTimeline(20),
      sessionType: 'interval_z2',
      classifiedSegments: [
        {
          startSec: 0,
          endSec: 1200,
          durationSec: 1200,
          classLabel: 'recovery',
          sampleCount: 20,
        },
      ],
    });

    expect(result.verdict).toBe('insufficient-data');
    expect(result.reasonCode).toBe('missing-main-z2-block');
    expect(result.driftPercent).toBe(0);
  });

  it('returns trim-window-too-short when trimmed interval is below minimum window', () => {
    const timeData = buildMinuteTimeline(15);
    const heartRateData = timeData.map(() => 145);

    const result = analyzeCardiacDriftV2({
      heartRateData,
      timeData,
      sessionType: 'interval_z2',
      classifiedSegments: [
        {
          startSec: 120,
          endSec: 780,
          durationSec: 660,
          classLabel: 'active',
          sampleCount: 11,
        },
      ],
    });

    expect(result.verdict).toBe('insufficient-data');
    expect(result.reasonCode).toBe('trim-window-too-short');
  });
});

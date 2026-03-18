import { describe, expect, it } from 'vitest';
import { analyzeLactateProtocol, pickCheckpointSample } from '../lactateProtocol';
import type { DomainInterval } from '../activity.types';

const baseInterval: DomainInterval = {
  id: 'int-1',
  name: 'Intervalo 1',
  startTime: 0,
  duration: 180,
  distance: 800,
  averageHeartrate: 165,
  maxHeartrate: 176,
  minHeartrate: 150,
  averagePace: 250,
  maxPace: 230,
  type: 'interval',
  isRecovery: false,
};

describe('pickCheckpointSample', () => {
  it('uses exact sample when target timestamp exists', () => {
    const sample = pickCheckpointSample([180, 240, 300], [170, 150, 140], 240);
    expect(sample.confidence).toBe('exact');
    expect(sample.actualSec).toBe(240);
    expect(sample.hr).toBe(150);
  });

  it('uses nearest sample inside +-3s fallback window', () => {
    const sample = pickCheckpointSample([180, 242, 300], [170, 149, 140], 240);
    expect(sample.confidence).toBe('fallback_nearest_3s');
    expect(sample.actualSec).toBe(242);
    expect(sample.hr).toBe(149);
  });

  it('returns unavailable when nearest point is outside fallback window', () => {
    const sample = pickCheckpointSample([180, 245, 300], [170, 149, 140], 240);
    expect(sample.confidence).toBe('unavailable');
    expect(sample.hr).toBeUndefined();
  });
});

describe('analyzeLactateProtocol', () => {
  it('computes exact +1m/+2m checkpoints and drop percentages', () => {
    const timeData = [120, 130, 140, 150, 160, 170, 180, 240, 300];
    const heartRateData = [172, 173, 174, 175, 176, 177, 178, 154, 146];

    const result = analyzeLactateProtocol({
      intervals: [baseInterval],
      timeData,
      heartRateData,
    });

    expect(result.hasIntervals).toBe(true);
    expect(result.intervals).toHaveLength(1);
    expect(result.intervals[0]).toMatchObject({
      reasonCode: 'ok',
      confidence: {
        peak: 'exact',
        plus1m: 'exact',
        plus2m: 'exact',
      },
      efficiencyEndHr: 154,
      structuralEndHr: 146,
    });
    expect(result.intervals[0].efficiencyDropPct).toBeGreaterThan(0);
    expect(result.intervals[0].structuralDropPct).toBeGreaterThan(0);
  });

  it('marks fallback confidence for +1m when exact point is missing', () => {
    const timeData = [120, 140, 160, 180, 242, 300];
    const heartRateData = [172, 174, 176, 178, 155, 147];

    const result = analyzeLactateProtocol({
      intervals: [baseInterval],
      timeData,
      heartRateData,
    });

    expect(result.intervals[0].reasonCode).toBe('ok');
    expect(result.intervals[0].confidence.plus1m).toBe('fallback_nearest_3s');
    expect(result.intervals[0].confidence.plus2m).toBe('exact');
  });

  it('returns unavailable reason when +2m checkpoint is outside +-3s', () => {
    const timeData = [120, 140, 160, 180, 240, 305];
    const heartRateData = [170, 172, 174, 176, 154, 145];

    const result = analyzeLactateProtocol({
      intervals: [baseInterval],
      timeData,
      heartRateData,
    });

    expect(result.hasIntervals).toBe(false);
    expect(result.intervals[0].reasonCode).toBe('checkpoint-unavailable-outside-window');
    expect(result.intervals[0].structuralDropPct).toBeUndefined();
  });

  it('is deterministic for identical inputs across repeated runs', () => {
    const timeData = [120, 130, 140, 150, 160, 170, 180, 242, 300];
    const heartRateData = [171, 172, 173, 174, 175, 176, 177, 155, 148];
    const input = {
      intervals: [baseInterval],
      timeData,
      heartRateData,
    };

    const firstRun = analyzeLactateProtocol(input);
    const secondRun = analyzeLactateProtocol(input);

    expect(firstRun).toEqual(secondRun);
  });
});

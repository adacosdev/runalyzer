import { describe, expect, it } from 'vitest';
import {
  ACTIVE_PACE_THRESHOLD_SECONDS_PER_KM,
  buildClassifiedSegments,
  classifyPaceSample,
  classifyPaceStream,
} from '../intervalClassification';
import {
  mixed_session_sparse_checkpoints,
  z2_threshold_interval_session,
} from './fixtures/intervalAwareV2';

describe('intervalClassification', () => {
  it('classifies pace at boundary 600 as active', () => {
    expect(classifyPaceSample(600)).toBe('active');
  });

  it('classifies pace just above boundary as recovery', () => {
    expect(classifyPaceSample(600.0001)).toBe('recovery');
  });

  it('classifies null and nonpositive pace as recovery with reason codes', () => {
    const fixture = mixed_session_sparse_checkpoints();

    const samples = classifyPaceStream(
      fixture.timeStreamSec,
      fixture.paceStreamSecPerKm,
      ACTIVE_PACE_THRESHOLD_SECONDS_PER_KM
    );

    expect(samples[1].classLabel).toBe('recovery');
    expect(samples[1].reasonCode).toBe('pace-missing');
    expect(samples[3].classLabel).toBe('recovery');
    expect(samples[3].reasonCode).toBe('pace-invalid-nonpositive');
  });

  it('builds deterministic contiguous segments and durations', () => {
    const fixture = z2_threshold_interval_session();

    const samples = classifyPaceStream(fixture.timeStreamSec, fixture.paceStreamSecPerKm);
    const segments = buildClassifiedSegments(samples);

    expect(segments.map((segment) => segment.classLabel)).toEqual([
      'active',
      'recovery',
      'active',
      'recovery',
      'active',
      'recovery',
      'active',
    ]);
    expect(segments.every((segment) => segment.durationSec >= 0)).toBe(true);
    expect(segments[0].durationSec).toBe(120);
    expect(segments[0].sampleCount).toBe(2);
  });

  it('fails fast when time and pace streams have different lengths', () => {
    expect(() => classifyPaceStream([0, 60, 120], [500, 520])).toThrow(
      'Time/pace stream length mismatch: time=3, pace=2'
    );
  });
});

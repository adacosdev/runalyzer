import { describe, expect, it } from 'vitest';
import { detectSessionSemantics } from '../sessionSemantics';
import {
  long_z1_rodaje,
  mixed_session_sparse_checkpoints,
  z2_threshold_interval_session,
} from './fixtures/intervalAwareV2';

describe('sessionSemantics', () => {
  it('returns z1_warmup_cooldown for explicit z1 sessions under 45 minutes', () => {
    const fixture = z2_threshold_interval_session();

    const result = detectSessionSemantics({
      activityDurationSec: fixture.activityDurationSec,
      explicitZ1Semantics: true,
    });

    expect(result.sessionType).toBe('z1_warmup_cooldown');
    expect(result.warmupCooldownHeuristicApplied).toBe(true);
  });

  it('returns rodaje_z1 for explicit z1 sessions 45 minutes or longer', () => {
    const fixture = long_z1_rodaje();

    const result = detectSessionSemantics({
      activityDurationSec: fixture.activityDurationSec,
      explicitZ1Semantics: fixture.explicitZ1Semantics,
    });

    expect(result.sessionType).toBe('rodaje_z1');
    expect(result.warmupCooldownHeuristicApplied).toBe(false);
  });

  it('returns rodaje_z1 exactly at 45 minutes without warmup/cooldown heuristic', () => {
    const result = detectSessionSemantics({
      activityDurationSec: 2700,
      explicitZ1Semantics: true,
    });

    expect(result.sessionType).toBe('rodaje_z1');
    expect(result.warmupCooldownHeuristicApplied).toBe(false);
  });

  it('never applies warmup/cooldown heuristic when explicit z1 semantics are absent', () => {
    const fixture = mixed_session_sparse_checkpoints();

    const result = detectSessionSemantics({
      activityDurationSec: fixture.activityDurationSec,
      explicitZ1Semantics: fixture.explicitZ1Semantics,
    });

    expect(result.sessionType).toBe('mixed');
    expect(result.warmupCooldownHeuristicApplied).toBe(false);
  });
});

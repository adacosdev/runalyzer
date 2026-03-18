import { SessionType } from './types';

export interface SessionSemanticsInput {
  activityDurationSec: number;
  explicitZ1Semantics: boolean;
}

export interface SessionSemanticsResult {
  sessionType: SessionType;
  explicitZ1Semantics: boolean;
  warmupCooldownHeuristicApplied: boolean;
  rationale: string;
}

const Z1_SHORT_SESSION_MAX_SECONDS = 45 * 60;

export function detectSessionSemantics(input: SessionSemanticsInput): SessionSemanticsResult {
  const { activityDurationSec, explicitZ1Semantics } = input;

  if (!explicitZ1Semantics) {
    return {
      sessionType: 'mixed',
      explicitZ1Semantics,
      warmupCooldownHeuristicApplied: false,
      rationale: 'No explicit z1 semantics: warmup/cooldown heuristic is disabled.',
    };
  }

  if (activityDurationSec < Z1_SHORT_SESSION_MAX_SECONDS) {
    return {
      sessionType: 'z1_warmup_cooldown',
      explicitZ1Semantics,
      warmupCooldownHeuristicApplied: true,
      rationale: 'Explicit z1 semantics and short duration (<45m): warmup/cooldown semantics apply.',
    };
  }

  return {
    sessionType: 'rodaje_z1',
    explicitZ1Semantics,
    warmupCooldownHeuristicApplied: false,
    rationale: 'Explicit z1 semantics and long duration (>=45m): classify as rodaje.',
  };
}

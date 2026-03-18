export interface IntervalAwareFixtureExpected {
  acceptanceCriteria: string[];
  keyAssertions: {
    thresholdBoundary: string;
    sessionSemantics: string;
    lactateCheckpointPolicy: string;
    driftPolicy: string;
  };
}

export interface IntervalAwareFixture {
  fixtureId: 'A' | 'B' | 'C';
  fixtureName: string;
  activityDurationSec: number;
  explicitZ1Semantics: boolean;
  timeStreamSec: number[];
  paceStreamSecPerKm: Array<number | null>;
  heartRateStreamBpm: number[];
  expected: IntervalAwareFixtureExpected;
}

export function z2_threshold_interval_session(): IntervalAwareFixture {
  return {
    fixtureId: 'A',
    fixtureName: 'z2_threshold_interval_session',
    activityDurationSec: 2400,
    explicitZ1Semantics: false,
    timeStreamSec: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540],
    paceStreamSecPerKm: [595, 600, 600.0001, 610, 590, 600, 605, 598, 602, 592],
    heartRateStreamBpm: [150, 152, 154, 157, 160, 163, 166, 168, 169, 171],
    expected: {
      acceptanceCriteria: ['AC-1', 'AC-2', 'AC-5', 'AC-8', 'AC-9', 'AC-10', 'AC-11'],
      keyAssertions: {
        thresholdBoundary: 'pace 600 is active; pace above 600 is recovery.',
        sessionSemantics: 'mixed semantics; no explicit z1 heuristic applied.',
        lactateCheckpointPolicy: '+1m fallback within +-3s allowed; +2m exact available.',
        driftPolicy: 'interval sessions use 5m head and 5m tail trim on main z2 block.',
      },
    },
  };
}

export function long_z1_rodaje(): IntervalAwareFixture {
  return {
    fixtureId: 'B',
    fixtureName: 'long_z1_rodaje',
    activityDurationSec: 3600,
    explicitZ1Semantics: true,
    timeStreamSec: [0, 300, 600, 900, 1200, 1500, 1800, 2100, 2400, 2700, 3000, 3300],
    paceStreamSecPerKm: [390, 392, 395, 398, 400, 402, 401, 399, 397, 396, 395, 394],
    heartRateStreamBpm: [132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143],
    expected: {
      acceptanceCriteria: ['AC-3', 'AC-4', 'AC-6'],
      keyAssertions: {
        thresholdBoundary: 'all samples are active under 10:00/km threshold.',
        sessionSemantics: 'explicit z1 with duration >=45m -> rodaje_z1.',
        lactateCheckpointPolicy: 'not required for this fixture baseline.',
        driftPolicy: 'rodaje sessions use 10m head and 10m tail trim.',
      },
    },
  };
}

export function mixed_session_sparse_checkpoints(): IntervalAwareFixture {
  return {
    fixtureId: 'C',
    fixtureName: 'mixed_session_sparse_checkpoints',
    activityDurationSec: 2100,
    explicitZ1Semantics: false,
    timeStreamSec: [0, 90, 180, 270, 360, 450, 540, 630, 720, 810],
    paceStreamSecPerKm: [580, null, 620, 0, 599, 610, 605, 590, 612, 598],
    heartRateStreamBpm: [145, 148, 150, 151, 153, 154, 156, 157, 158, 160],
    expected: {
      acceptanceCriteria: ['AC-1', 'AC-2', 'AC-3', 'AC-4', 'AC-8', 'AC-12'],
      keyAssertions: {
        thresholdBoundary: 'null and nonpositive pace are deterministic recovery with reason codes.',
        sessionSemantics: 'mixed session does not apply warmup/cooldown heuristic.',
        lactateCheckpointPolicy: '+2m checkpoint outside +-3s is unavailable with reason.',
        driftPolicy: 'drift can be unavailable without changing route-ready semantics.',
      },
    },
  };
}

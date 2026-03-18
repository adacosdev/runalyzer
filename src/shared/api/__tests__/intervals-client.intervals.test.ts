import { describe, expect, it, vi } from 'vitest';
import { fetchActivityWithIntervals } from '../intervals-client';

function createRawActivityWithIntervals() {
  return {
    id: 'activity-42',
    name: 'Tempo Run',
    start_date: '2026-03-10T08:00:00.000Z',
    start_time: 0,
    moving_time: 3600,
    elapsed_time: 3700,
    distance: 12000,
    elevation_gain: 100,
    elevation_loss: 100,
    average_heartrate: 155,
    max_heartrate: 175,
    average_speed: 3.33,
    max_speed: 4.5,
    has_heartrate: true,
    icu_hr_zone_times: [120, 300, 600, 1200, 480],
    decoupling: 3.5,
    icu_intervals: [
      {
        id: 1,
        name: 'Warmup',
        start_time: 0,
        duration: 600,
        distance: 2000,
        average_heartrate: 130,
        max_heartrate: 145,
        min_heartrate: 110,
        average_speed: 3.0,
        max_speed: 3.5,
        type: 'WarmUp',
      },
      {
        id: 2,
        name: 'Work 1',
        start_time: 600,
        duration: 900,
        distance: 3500,
        average_heartrate: 165,
        max_heartrate: 175,
        min_heartrate: 155,
        average_speed: 3.89,
        max_speed: 4.2,
        type: 'WORK',
      },
      {
        id: 3,
        name: 'Recovery 1',
        start_time: 1500,
        duration: 300,
        distance: 900,
        average_heartrate: 140,
        max_heartrate: 150,
        min_heartrate: 130,
        average_speed: 3.0,
        max_speed: 3.2,
        type: 'RECOVERY',
      },
    ],
  };
}

describe('fetchActivityWithIntervals', () => {
  it('passes intervals: true to getActivity', async () => {
    const rawActivity = createRawActivityWithIntervals();
    const getActivity = vi.fn().mockResolvedValue(rawActivity);
    const client = { activities: { getActivity } };

    await fetchActivityWithIntervals(client, 'activity-42');

    expect(getActivity).toHaveBeenCalledWith('activity-42', { intervals: true });
  });

  it('maps icu_intervals from the response into domain intervals', async () => {
    const rawActivity = createRawActivityWithIntervals();
    const client = {
      activities: { getActivity: vi.fn().mockResolvedValue(rawActivity) },
    };

    const result = await fetchActivityWithIntervals(client, 'activity-42');

    expect(result.icuIntervals).toHaveLength(3);
  });

  it('maps WORK interval type to "interval" domain type', async () => {
    const rawActivity = createRawActivityWithIntervals();
    const client = {
      activities: { getActivity: vi.fn().mockResolvedValue(rawActivity) },
    };

    const result = await fetchActivityWithIntervals(client, 'activity-42');
    const workInterval = result.icuIntervals.find((i) => i.name === 'Work 1');

    expect(workInterval?.type).toBe('interval');
    expect(workInterval?.isRecovery).toBe(false);
  });

  it('maps RECOVERY interval type to "recovery" domain type with isRecovery=true', async () => {
    const rawActivity = createRawActivityWithIntervals();
    const client = {
      activities: { getActivity: vi.fn().mockResolvedValue(rawActivity) },
    };

    const result = await fetchActivityWithIntervals(client, 'activity-42');
    const recoveryInterval = result.icuIntervals.find((i) => i.name === 'Recovery 1');

    expect(recoveryInterval?.type).toBe('recovery');
    expect(recoveryInterval?.isRecovery).toBe(true);
  });

  it('maps WarmUp interval type to "warmup" domain type', async () => {
    const rawActivity = createRawActivityWithIntervals();
    const client = {
      activities: { getActivity: vi.fn().mockResolvedValue(rawActivity) },
    };

    const result = await fetchActivityWithIntervals(client, 'activity-42');
    const warmupInterval = result.icuIntervals.find((i) => i.name === 'Warmup');

    expect(warmupInterval?.type).toBe('warmup');
    expect(warmupInterval?.isRecovery).toBe(false);
  });

  it('propagates errors from the transport layer', async () => {
    const client = {
      activities: {
        getActivity: vi.fn().mockRejectedValue(new Error('network timeout')),
      },
    };

    await expect(fetchActivityWithIntervals(client, 'activity-42')).rejects.toThrow('network timeout');
  });
});

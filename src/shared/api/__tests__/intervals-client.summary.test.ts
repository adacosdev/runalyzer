import { describe, expect, it, vi } from 'vitest';
import { buildRollingWindowBounds, fetchActivities, fetchRollingWindowActivities } from '../intervals-client';

function createRawActivity(id: number) {
  return {
    id: `activity-${id}`,
    name: `Run ${id}`,
    start_date: '2026-03-01T10:00:00.000Z',
    start_time: 0,
    moving_time: 1500,
    elapsed_time: 1600,
    distance: 5000,
    elevation_gain: 50,
    elevation_loss: 50,
    average_heartrate: 150,
    max_heartrate: 170,
    average_speed: 3.5,
    max_speed: 4.2,
    has_heartrate: true,
    icu_intervals: [],
    icu_hr_zone_times: [],
    decoupling: null,
  };
}

describe('intervals-client summary path contract', () => {
  it('builds exact [now-30d, now] ISO bounds', () => {
    const now = new Date('2026-03-14T12:00:00.000Z');

    const bounds = buildRollingWindowBounds(now, 30);

    expect(bounds.oldest).toBe('2026-02-12T12:00:00.000Z');
    expect(bounds.newest).toBe('2026-03-14T12:00:00.000Z');
  });

  it('throws on invalid window date', () => {
    expect(() => buildRollingWindowBounds(new Date('invalid'), 30)).toThrow(
      'windowEvaluatedAt must be a valid Date'
    );
  });

  it('throws on invalid windowDays', () => {
    const now = new Date('2026-03-14T12:00:00.000Z');

    expect(() => buildRollingWindowBounds(now, 0)).toThrow('windowDays must be a positive integer');
    expect(() => buildRollingWindowBounds(now, -1)).toThrow('windowDays must be a positive integer');
    expect(() => buildRollingWindowBounds(now, 3.5)).toThrow('windowDays must be a positive integer');
  });

  it('fetches rolling window activities without implicit capping', async () => {
    const apiRows = Array.from({ length: 75 }, (_, index) => createRawActivity(index + 1));
    const listActivities = vi.fn().mockResolvedValue(apiRows);
    const client = {
      activities: {
        listActivities,
      },
    };

    const result = await fetchRollingWindowActivities(client, {
      oldest: '2026-02-12T12:00:00.000Z',
      newest: '2026-03-14T12:00:00.000Z',
    });

    expect(listActivities).toHaveBeenCalledWith({
      oldest: '2026-02-12T12:00:00.000Z',
      newest: '2026-03-14T12:00:00.000Z',
    });
    expect(result).toHaveLength(75);
    expect(result[0]?.id).toBe('activity-1');
    expect(result[74]?.id).toBe('activity-75');
  });

  it('throws when rolling window transport fails so query can enter error state', async () => {
    const client = {
      activities: {
        listActivities: vi.fn().mockRejectedValue(new Error('network down')),
      },
    };

    await expect(
      fetchRollingWindowActivities(client, {
        oldest: '2026-02-12T12:00:00.000Z',
        newest: '2026-03-14T12:00:00.000Z',
      })
    ).rejects.toThrow('Failed to fetch rolling window activities: network down');
  });

  it('throws when rolling window response payload is invalid', async () => {
    const client = {
      activities: {
        listActivities: vi.fn().mockResolvedValue(null),
      },
    };

    await expect(
      fetchRollingWindowActivities(client, {
        oldest: '2026-02-12T12:00:00.000Z',
        newest: '2026-03-14T12:00:00.000Z',
      })
    ).rejects.toThrow(
      'Failed to fetch rolling window activities: Intervals API returned an invalid activities payload'
    );
  });

  it('keeps existing fetchActivities default cap behavior unchanged', async () => {
    const apiRows = Array.from({ length: 75 }, (_, index) => createRawActivity(index + 1));
    const listActivities = vi.fn().mockResolvedValue(apiRows);
    const client = {
      activities: {
        listActivities,
      },
    };

    const result = await fetchActivities(client, {
      oldest: '2026-02-12',
      newest: '2026-03-14',
    });

    expect(result).toHaveLength(50);
    expect(result[49]?.id).toBe('activity-50');
  });
});

/**
 * Intervals.icu API Client - Runalyzer
 * 
 * Real implementation using the intervals-icu library.
 */

import { DomainActivity, DomainInterval, ActivityStream, StreamType } from '../../features/activity/domain/activity.types';

/**
 * Client configuration
 */
export interface IntervalsClientConfig {
  apiKey: string;
  athleteId?: string;
}

export interface RollingWindowActivitiesOptions {
  oldest: string;
  newest: string;
}

export interface RollingWindowBounds {
  oldest: string;
  newest: string;
}

/**
 * Real Intervals.icu client
 */
export async function createIntervalsClient(config: IntervalsClientConfig): Promise<any> {
  const { IntervalsClient } = await import('intervals-icu');
  
  return new IntervalsClient({
    apiKey: config.apiKey,
    athleteId: config.athleteId || '0',
  });
}

/**
 * Fetch activities within a date range
 */
export async function fetchActivities(
  client: any,
  options: {
    oldest?: string;
    newest?: string;
    limit?: number;
  } = {}
): Promise<DomainActivity[]> {
  const { limit = 50 } = options;
  
  // Default to last 30 days if not specified
  const oldest = options.oldest || getDefaultOldest();
  const newest = options.newest || new Date().toISOString().split('T')[0];
  
  try {
    const response = await client.activities.listActivities({
      oldest,
      newest,
    });
    
    if (!response || !Array.isArray(response)) {
      console.warn('No activities found or invalid response');
      return [];
    }
    
    const sliced = limit ? response.slice(0, limit) : response;
    return sliced.map((raw: any) => mapRawActivityToDomain(raw));
  } catch (e: any) {
    console.error('Error fetching activities:', e.message);
    return [];
  }
}

export async function fetchRollingWindowActivities(
  client: any,
  options: RollingWindowActivitiesOptions
): Promise<DomainActivity[]> {
  const { oldest, newest } = options;

  try {
    const response = await client.activities.listActivities({
      oldest,
      newest,
    });

    if (!Array.isArray(response)) {
      throw new Error('Intervals API returned an invalid activities payload');
    }

    return response.map((raw: any) => mapRawActivityToDomain(raw));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch rolling window activities: ${message}`);
  }
}

export function buildRollingWindowBounds(windowEvaluatedAt: Date, windowDays = 30): RollingWindowBounds {
  if (!(windowEvaluatedAt instanceof Date) || Number.isNaN(windowEvaluatedAt.getTime())) {
    throw new Error('windowEvaluatedAt must be a valid Date');
  }

  if (!Number.isInteger(windowDays) || windowDays <= 0) {
    throw new Error('windowDays must be a positive integer');
  }

  const oldestDate = new Date(windowEvaluatedAt);
  oldestDate.setUTCDate(oldestDate.getUTCDate() - windowDays);

  return {
    oldest: oldestDate.toISOString(),
    newest: windowEvaluatedAt.toISOString(),
  };
}

/**
 * Get default oldest date (30 days ago)
 */
function getDefaultOldest(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}

/**
 * Fetch a single activity with intervals
 */
export async function fetchActivityWithIntervals(
  client: any,
  activityId: string
): Promise<DomainActivity> {
  const activity = await client.activities.getActivity(activityId);
  
  return mapRawActivityToDomain(activity);
}

/**
 * Fetch stream data for an activity
 */
export async function fetchActivityStreams(
  client: any,
  activityId: string,
  types: StreamType[] = ['heartrate', 'velocity_smooth', 'time']
): Promise<ActivityStream[]> {
  const streams = await client.activities.getStreams(activityId, types);
  
  return streams.map((stream: any) => ({
    type: stream.type as StreamType,
    data: stream.data,
  }));
}

/**
 * Validate API key
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const client = await createIntervalsClient({ apiKey });
    await client.athletes.getAthlete();
    return true;
  } catch (error) {
    console.error('API key validation failed:', error);
    return false;
  }
}

/**
 * Map raw activity from Intervals.icu to domain model
 */
function mapRawActivityToDomain(raw: any): DomainActivity {
  return {
    id: raw.id,
    name: raw.name,
    startDate: new Date(raw.start_date),
    startTime: raw.start_time,
    duration: raw.elapsed_time,
    movingTime: raw.moving_time,
    distance: raw.distance,
    elevationGain: raw.elevation_gain,
    elevationLoss: raw.elevation_loss,
    averageHeartrate: raw.average_heartrate,
    maxHeartrate: raw.max_heartrate,
    hasHeartrate: raw.has_heartrate,
    averagePace: raw.average_speed ? 1000 / raw.average_speed : null,
    maxPace: raw.max_speed ? 1000 / raw.max_speed : null,
    icuIntervals: raw.icu_intervals?.map(mapRawIntervalToDomain) || [],
    icuHrZoneTimes: raw.icu_hr_zone_times || [],
    decoupling: raw.decoupling || null,
    dataAvailability: 'summary-only',
  };
}

/**
 * Map raw interval to domain model
 */
function mapRawIntervalToDomain(raw: any): DomainInterval {
  return {
    id: raw.id,
    name: raw.name,
    startTime: raw.start_time,
    duration: raw.duration,
    distance: raw.distance,
    averageHeartrate: raw.average_heartrate,
    maxHeartrate: raw.max_heartrate,
    minHeartrate: raw.min_heartrate,
    averagePace: raw.average_speed ? 1000 / raw.average_speed : null,
    maxPace: raw.max_speed ? 1000 / raw.max_speed : null,
    type: mapIntervalType(raw.type),
    isRecovery: raw.type === 'Recovery' || raw.type === 'recovery',
  };
}

/**
 * Map interval type string to domain type
 */
function mapIntervalType(type: string): DomainInterval['type'] {
  const typeLower = type.toLowerCase();
  
  if (typeLower === 'warmup' || typeLower === 'warm up') return 'warmup';
  if (typeLower === 'cooldown' || typeLower === 'cool down') return 'cooldown';
  if (typeLower === 'recovery') return 'recovery';
  if (typeLower === 'interval') return 'interval';
  if (typeLower === 'race') return 'race';
  if (typeLower === 'hill') return 'hill';
  if (typeLower === 'sprint') return 'sprint';
  
  return 'steady';
}

/**
 * Get athlete info
 */
export async function getAthleteInfo(client: any) {
  return client.athletes.getAthlete();
}

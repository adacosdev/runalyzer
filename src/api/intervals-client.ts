/**
 * Intervals.icu API Client - Runalyzer
 * 
 * Wrapper around the intervals-icu npm package.
 * Handles authentication, data fetching, and DTO -> domain mapping.
 */

import { DomainActivity, DomainInterval, ActivityStream, StreamType, RawActivity, RawInterval } from '../domain/activity/types';

// Use require to avoid ESM issues with intervals-icu
// eslint-disable-next-line @typescript-eslint/no-var-requires
const IntervalsICULib = require('intervals-icu');

/**
 * Client configuration
 */
export interface IntervalsClientConfig {
  apiKey: string;
  athleteId?: string; // Defaults to '0' (current user)
}

/**
 * Create an authenticated Intervals.icu client
 */
export function createIntervalsClient(config: IntervalsClientConfig): any {
  return new IntervalsICULib({
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
    oldest?: string; // YYYY-MM-DD
    newest?: string; // YYYY-MM-DD
    limit?: number;
  } = {}
): Promise<DomainActivity[]> {
  const { oldest, newest, limit = 50 } = options;
  
  const response = await client.activities.getActivities({
    oldest,
    newest,
    limit,
  });
  
  return response.map((raw: any) => mapRawActivityToDomain(raw));
}

/**
 * Fetch a single activity with intervals
 */
export async function fetchActivityWithIntervals(
  client: any,
  activityId: string
): Promise<DomainActivity> {
  const activity = await client.activities.getActivity(activityId, {
    intervals: true,
  });
  
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
 * Validate API key by attempting to fetch current user
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const client = createIntervalsClient({ apiKey });
    await client.athlete.getAthlete();
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
    averagePace: raw.average_speed ? 1000 / raw.average_speed : null, // m/s -> sec/km
    maxPace: raw.max_speed ? 1000 / raw.max_speed : null,
    icuIntervals: raw.icu_intervals?.map(mapRawIntervalToDomain) || [],
    icuHrZoneTimes: raw.icu_hr_zone_times || [],
    decoupling: raw.decoupling || null,
    dataAvailability: 'summary-only', // Will be upgraded to 'full-streams' if streams fetched
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
 * Get athlete info (for zone calibration)
 */
export async function getAthleteInfo(client: any) {
  return client.athlete.getAthlete();
}

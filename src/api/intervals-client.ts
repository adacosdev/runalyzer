/**
 * Intervals.icu API Client - Runalyzer
 * 
 * Mock implementation for development.
 * To use the real client:
 * 1. npm install intervals-icu
 * 2. Update createIntervalsClient to use the real library
 */

import { DomainActivity, DomainInterval, ActivityStream, StreamType } from '../domain/activity/types';

/**
 * Client configuration
 */
export interface IntervalsClientConfig {
  apiKey: string;
  athleteId?: string;
}

/**
 * Mock client for development - always returns mock data
 */
export async function createIntervalsClient(config: IntervalsClientConfig): Promise<any> {
  console.log('Creating mock client for development');
  return mockClient;
}

// Mock client object
const mockClient = {
  activities: {
    getActivities: async (options: any = {}) => {
      return mockActivities;
    },
    getActivity: async (id: string, options: any = {}) => {
      return mockActivities.find(a => a.id === id);
    },
    getStreams: async (id: string, types: string[]) => {
      return mockStreams;
    },
  },
  athlete: {
    getAthlete: async () => ({ id: 'mock', name: 'Mock Runner' }),
  }
};

// Mock data for development
const mockActivities = [
  {
    id: '1',
    name: 'Rodaje suave',
    start_date: '2026-03-10',
    start_time: 1700000000,
    elapsed_time: 3600,
    moving_time: 3540,
    distance: 10500,
    elevation_gain: 50,
    elevation_loss: 50,
    average_heartrate: 135,
    max_heartrate: 155,
    average_speed: 2.92,
    max_speed: 3.5,
    has_heartrate: true,
    icu_intervals: [],
    icu_hr_zone_times: [1800, 900, 600, 300, 0, 0, 0],
    decoupling: 5.2,
  },
  {
    id: '2',
    name: 'Series 8x800m',
    start_date: '2026-03-12',
    start_time: 1700150000,
    elapsed_time: 4200,
    moving_time: 4000,
    distance: 12000,
    elevation_gain: 30,
    elevation_loss: 30,
    average_heartrate: 158,
    max_heartrate: 178,
    average_speed: 3.0,
    max_speed: 4.2,
    has_heartrate: true,
    icu_intervals: [
      { id: 'i1', name: 'Warmup', start_time: 0, duration: 600, distance: 1800, average_heartrate: 120, max_heartrate: 135, min_heartrate: 110, average_speed: 3.0, max_speed: 3.2, type: 'warmup', workout: false },
      { id: 'i2', name: '800m', start_time: 600, duration: 270, distance: 800, average_heartrate: 170, max_heartrate: 178, min_heartrate: 165, average_speed: 2.96, max_speed: 3.5, type: 'interval', workout: true },
      { id: 'i3', name: 'Recovery', start_time: 870, duration: 180, distance: 500, average_heartrate: 145, max_heartrate: 155, min_heartrate: 140, average_speed: 2.8, max_speed: 3.0, type: 'recovery', workout: false },
      { id: 'i4', name: '800m', start_time: 1050, duration: 265, distance: 800, average_heartrate: 172, max_heartrate: 180, min_heartrate: 168, average_speed: 3.02, max_speed: 3.8, type: 'interval', workout: true },
    ],
    icu_hr_zone_times: [600, 1800, 1200, 600, 0, 0, 0],
    decoupling: 8.5,
  },
  {
    id: '3',
    name: 'Carrera progresiva',
    start_date: '2026-03-08',
    start_time: 1699900000,
    elapsed_time: 5400,
    moving_time: 5200,
    distance: 15000,
    elevation_gain: 100,
    elevation_loss: 100,
    average_heartrate: 145,
    max_heartrate: 165,
    average_speed: 2.88,
    max_speed: 3.3,
    has_heartrate: true,
    icu_intervals: [],
    icu_hr_zone_times: [2600, 1800, 800, 0, 0, 0, 0],
    decoupling: 3.1,
  },
];

const mockStreams = [
  { type: 'heartrate', data: Array(3600).fill(0).map((_, i) => i < 1800 ? 130 + Math.random() * 10 : 135 + Math.random() * 15) },
  { type: 'velocity_smooth', data: Array(3600).fill(0).map(() => 2.8 + Math.random() * 0.3) },
  { type: 'time', data: Array(3600).fill(0).map((_, i) => i) },
];

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
  
  const response = await client.activities.getActivities({ limit });
  
  return response.slice(0, limit).map((raw: any) => mapRawActivityToDomain(raw));
}

/**
 * Fetch a single activity with intervals
 */
export async function fetchActivityWithIntervals(
  client: any,
  activityId: string
): Promise<DomainActivity> {
  const activity = await client.activities.getActivity(activityId, { intervals: true });
  
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
  // For mock, always return true if not empty
  return apiKey.length > 0;
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
 * Get athlete info (for zone calibration)
 */
export async function getAthleteInfo(client: any) {
  return client.athlete.getAthlete();
}

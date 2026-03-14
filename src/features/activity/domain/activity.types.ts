/**
 * Domain Types - Runalyzer
 * 
 * Core domain entities derived from Intervals.icu data.
 * These are pure domain objects with no framework dependencies.
 */

/**
 * Represents a running activity imported from Intervals.icu
 */
export interface DomainActivity {
  id: string;
  name: string;
  startDate: Date;
  startTime: number; // Unix timestamp in seconds
  duration: number; // Total duration in seconds
  movingTime: number; // Moving time in seconds
  distance: number; // Distance in meters
  elevationGain: number; // Elevation gain in meters
  elevationLoss: number; // Elevation loss in meters
  
  // Heart rate data
  averageHeartrate: number | null; // Average HR in BPM
  maxHeartrate: number | null;    // Max HR in BPM
  hasHeartrate: boolean;
  
  // Pace data
  averagePace: number | null; // Average pace in seconds per km
  maxPace: number | null;     // Max pace in seconds per km
  
  // Intervals.icu specific
  icuIntervals: DomainInterval[];
  icuHrZoneTimes: number[]; // Time in each HR zone (1-7)
  decoupling: number | null; // Cardiac decoupling percentage
  
  // Computed
  dataAvailability: 'full-streams' | 'summary-only' | 'none';
}

/**
 * Represents an interval or split within an activity
 */
export interface DomainInterval {
  id: string;
  name: string;
  startTime: number; // Seconds from activity start
  duration: number;  // Interval duration in seconds
  distance: number;  // Distance in meters
  
  // Heart rate during this interval
  averageHeartrate: number | null;
  maxHeartrate: number | null;
  minHeartrate: number | null;
  
  // Pace during this interval
  averagePace: number | null; // Seconds per km
  maxPace: number | null;     // Seconds per km
  
  // Type
  type: IntervalType;
  
  // Recovery indicator (for intervals following hard efforts)
  isRecovery: boolean;
}

export type IntervalType = 
  | 'warmup' 
  | 'cooldown' 
  | 'recovery' 
  | 'steady' 
  | 'interval' 
  | 'race' 
  | 'hill' 
  | 'sprint';

/**
 * Stream data for second-by-second analysis
 */
export interface ActivityStream {
  type: StreamType;
  data: number[];
}

export type StreamType = 
  | 'heartrate' 
  | 'velocity_smooth' 
  | 'time' 
  | 'distance' 
  | 'altitude' 
  | 'cadence';

/**
 * Raw activity from Intervals.icu API before domain mapping
 */
export interface RawActivity {
  id: string;
  name: string;
  start_date: string;
  start_time: number;
  moving_time: number;
  elapsed_time: number;
  distance: number;
  elevation_gain: number;
  elevation_loss: number;
  average_heartrate: number | null;
  max_heartrate: number | null;
  average_speed: number | null;
  max_speed: number | null;
  has_heartrate: boolean;
  icu_intervals?: RawInterval[];
  icu_hr_zone_times?: number[];
  decoupling?: number | null;
}

export interface RawInterval {
  id: string;
  name: string;
  start_time: number;
  duration: number;
  distance: number;
  average_heartrate: number | null;
  max_heartrate: number | null;
  min_heartrate: number | null;
  average_speed: number | null;
  max_speed: number | null;
  type: string;
  workout: boolean;
}

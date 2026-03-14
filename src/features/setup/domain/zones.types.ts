/**
 * Zone Configuration - Runalyzer
 * 
 * Based on Luis del Águila's 3-zone model.
 * Configuration can be either user-provided or estimated.
 */

import { CardiacDriftResult } from '../analysis/types';

/**
 * User's zone configuration based on their personal thresholds
 */
export interface ZoneConfig {
  /** Maximum heart rate for Zone 1 (endurance/fat burning) */
  z1MaxHR: number;
  /** Maximum heart rate for Zone 2 (threshold/lactate) = LTHR */
  z2MaxHR: number;
  /** User's maximum heart rate */
  maxHR: number;
  /** User's resting heart rate (for HRR calculations) */
  restingHR?: number;
  
  /** Whether these values are estimated or user-provided */
  isEstimated: boolean;
  
  /** How this config was determined */
  calibrationMethod: CalibrationMethod;
  
  /** When this config was last updated */
  lastCalibrated: number | null;
}

/**
 * How the zone configuration was determined
 */
export type CalibrationMethod = 
  | 'manual'              // User entered values manually
  | 'threshold-test'      // Calculated from threshold test
  | 'estimated-default'; // Default estimate (220 - age)

/**
 * Zone thresholds in heart rate format
 */
export interface ZoneThresholds {
  z1: { min: number; max: number };
  z2: { min: number; max: number };
  z3: { min: number; max: number };
}

/**
 * Default zone configuration for new users
 * 
 * Uses the formula: (220 - age) as base for max HR
 * Then applies standard zone percentages
 */
export function getDefaultZoneConfig(age: number, isEstimated: true): ZoneConfig {
  const maxHR = Math.round((220 - age) * 0.87); // Aerobic threshold approximation
  
  return {
    z1MaxHR: Math.round(maxHR * 0.75),    // ~65-75% of max
    z2MaxHR: Math.round(maxHR * 0.87),    // ~80-90% of max (LTHR)
    maxHR: maxHR,
    isEstimated: true,
    calibrationMethod: 'estimated-default',
    lastCalibrated: null,
  };
}

/**
 * Calculate zone thresholds from ZoneConfig
 */
export function getZoneThresholds(config: ZoneConfig): ZoneThresholds {
  return {
    z1: { min: 0, max: config.z1MaxHR },
    z2: { min: config.z1MaxHR, max: config.z2MaxHR },
    z3: { min: config.z2MaxHR, max: config.maxHR },
  };
}

/**
 * Determine which zone a heart rate falls into
 */
export function getZoneForHR(hr: number, config: ZoneConfig): 1 | 2 | 3 {
  if (hr <= config.z1MaxHR) return 1;
  if (hr <= config.z2MaxHR) return 2;
  return 3;
}

/**
 * Threshold test result from an activity
 * 
 * Used to calculate zone configuration from actual effort data
 */
export interface ThresholdTestResult {
  /** The activity ID where the test was performed */
  activityId: string;
  /** Heart rate at the point of excessive drift */
  driftPointHR: number;
  /** Pace at the point of excessive drift (seconds per km) */
  driftPointPace: number;
  /** Whether drift exceeded 4% at this point */
  driftExceeded: boolean;
  /** Test duration in seconds */
  duration: number;
}

/**
 * Analyze a threshold test activity to determine zones
 * 
 * Based on Luis del Águila's methodology:
 * - Find the pace/HR where cardiac drift exceeds 4%
 * - That HR becomes the max of Zone 2 (LTHR)
 * - Max Zone 1 pace = LTHR pace + 1:15/km
 */
export function calculateZonesFromTest(
  activityHR: number[],
  activityPace: number[], // seconds per km
  activityTimes: number[] // timestamps
): { z1MaxHR: number; z2MaxHR: number; maxHR: number } {
  // Find the point where drift exceeded 4%
  const midpoint = Math.floor(activityHR.length / 2);
  const firstHalfHR = activityHR.slice(0, midpoint).filter(hr => hr > 0);
  const secondHalfHR = activityHR.slice(midpoint).filter(hr => hr > 0);
  
  if (firstHalfHR.length === 0 || secondHalfHR.length === 0) {
    throw new Error('Insufficient heart rate data for threshold test analysis');
  }
  
  const avgFirstHalf = firstHalfHR.reduce((a, b) => a + b, 0) / firstHalfHR.length;
  const avgSecondHalf = secondHalfHR.reduce((a, b) => a + b, 0) / secondHalfHR.length;
  
  const driftPercent = ((avgSecondHalf - avgFirstHalf) / avgFirstHalf) * 100;
  
  // Find the pace at the drift point (where drift first exceeded 4%)
  // This is a simplified version - in practice would need more granular analysis
  const maxHR = Math.max(...activityHR.filter(hr => hr > 0));
  const z2MaxHR = Math.round(avgFirstHalf + (avgFirstHalf * 0.04)); // HR at 4% drift
  const z1MaxHR = Math.round(z2MaxHR * 0.86); // ~14% below LTHR
  
  return {
    z1MaxHR,
    z2MaxHR: Math.min(z2MaxHR, maxHR),
    maxHR,
  };
}

/**
 * Validate that a ZoneConfig has reasonable values
 */
export function isValidZoneConfig(config: ZoneConfig): boolean {
  return (
    config.z1MaxHR > 0 &&
    config.z2MaxHR > config.z1MaxHR &&
    config.maxHR >= config.z2MaxHR &&
    config.maxHR <= 220 &&
    config.z1MaxHR >= 60 &&
    config.z2MaxHR >= 80
  );
}

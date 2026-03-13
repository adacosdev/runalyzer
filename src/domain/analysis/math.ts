/**
 * Math Utilities - Runalyzer
 * 
 * Pure mathematical functions for activity analysis.
 * No side effects, fully testable.
 */

/**
 * Calculate average of an array of numbers
 * Ignores zero and negative values (considered invalid/missing)
 */
export function average(numbers: number[]): number {
  const valid = numbers.filter(n => n > 0);
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/**
 * Calculate percentage change between two values
 */
export function percentChange(before: number, after: number): number {
  if (before === 0) return 0;
  return ((after - before) / before) * 100;
}

/**
 * Convert pace from seconds/km to mm:ss format
 */
export function formatPace(secondsPerKm: number): string {
  if (!secondsPerKm || secondsPerKm <= 0) return '--:--';
  
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Convert seconds to mm:ss or hh:mm:ss format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Convert heart rate BPM to percentage of max HR
 */
export function hrToPercentMax(hr: number, maxHR: number): number {
  if (maxHR <= 0) return 0;
  return (hr / maxHR) * 100;
}

/**
 * Convert pace (seconds per km) to speed (km/h)
 */
export function paceToSpeed(paceSecondsPerKm: number): number {
  if (paceSecondsPerKm <= 0) return 0;
  return 3600 / paceSecondsPerKm;
}

/**
 * Calculate time in zone given HR data and zone thresholds
 */
export function calculateTimeInZones(
  hrData: number[],
  z1Max: number,
  z2Max: number
): { z1: number; z2: number; z3: number; total: number } {
  let z1 = 0;
  let z2 = 0;
  let z3 = 0;
  
  for (const hr of hrData) {
    if (hr <= 0) continue;
    
    if (hr <= z1Max) {
      z1++;
    } else if (hr <= z2Max) {
      z2++;
    } else {
      z3++;
    }
  }
  
  const total = z1 + z2 + z3;
  
  return { z1, z2, z3, total };
}

/**
 * Calculate percentages from seconds in each zone
 */
export function zoneSecondsToPercent(
  z1Seconds: number,
  z2Seconds: number,
  z3Seconds: number
): { z1Percent: number; z2Percent: number; z3Percent: number } {
  const total = z1Seconds + z2Seconds + z3Seconds;
  
  if (total === 0) {
    return { z1Percent: 0, z2Percent: 0, z3Percent: 0 };
  }
  
  return {
    z1Percent: (z1Seconds / total) * 100,
    z2Percent: (z2Seconds / total) * 100,
    z3Percent: (z3Seconds / total) * 100,
  };
}

/**
 * Filter out invalid heart rate data points
 * Returns both the filtered data and quality metrics
 */
export function filterInvalidHR(
  hrData: number[]
): { filtered: number[]; validCount: number; totalCount: number; validPercent: number } {
  const filtered = hrData.filter(hr => hr >= 30 && hr <= 220); // Reasonable HR range
  const validCount = filtered.length;
  const totalCount = hrData.length;
  const validPercent = totalCount > 0 ? (validCount / totalCount) * 100 : 0;
  
  return { filtered, validCount, totalCount, validPercent };
}

/**
 * Split array into two halves
 * First half gets the extra element if odd length
 */
export function splitInHalf<T>(array: T[]): [T[], T[]] {
  const midpoint = Math.ceil(array.length / 2);
  return [array.slice(0, midpoint), array.slice(midpoint)];
}

/**
 * Calculate drift between two halves of an array
 * Used for cardiac drift analysis
 */
export function calculateDrift(
  firstHalf: number[],
  secondHalf: number[]
): number {
  const avgFirst = average(firstHalf);
  const avgSecond = average(secondHalf);
  
  if (avgFirst === 0) return 0;
  
  return percentChange(avgFirst, avgSecond);
}

/**
 * Round to specified decimal places
 */
export function roundTo(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

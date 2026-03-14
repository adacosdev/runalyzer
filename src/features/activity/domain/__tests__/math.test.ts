/**
 * Math Utilities Tests - Runalyzer
 * 
 * Unit tests for math utility functions.
 */

import { describe, it, expect } from 'vitest';
import { 
  average, 
  percentChange, 
  formatPace, 
  formatDuration, 
  filterInvalidHR,
  splitInHalf,
  calculateDrift,
  roundTo,
  clamp,
  zoneSecondsToPercent,
  calculateTimeInZones
} from '../math';

describe('average', () => {
  it('should calculate average correctly', () => {
    expect(average([1, 2, 3, 4, 5])).toBe(3);
  });

  it('should ignore zero values', () => {
    expect(average([1, 0, 3, 0, 5])).toBe(3);
  });

  it('should ignore negative values', () => {
    expect(average([1, -1, 3, -1, 5])).toBe(3);
  });

  it('should return 0 for empty array', () => {
    expect(average([])).toBe(0);
  });

  it('should return 0 for all invalid values', () => {
    expect(average([0, 0, 0])).toBe(0);
  });
});

describe('percentChange', () => {
  it('should calculate positive change', () => {
    expect(percentChange(100, 110)).toBe(10);
  });

  it('should calculate negative change', () => {
    expect(percentChange(100, 90)).toBe(-10);
  });

  it('should return 0 when before is 0', () => {
    expect(percentChange(0, 100)).toBe(0);
  });
});

describe('formatPace', () => {
  it('should format pace correctly', () => {
    expect(formatPace(300)).toBe('5:00');
    expect(formatPace(330)).toBe('5:30');
    expect(formatPace(360)).toBe('6:00');
  });

  it('should format pace with seconds', () => {
    expect(formatPace(305)).toBe('5:05');
  });

  it('should return --:-- for invalid pace', () => {
    expect(formatPace(0)).toBe('--:--');
    expect(formatPace(-1)).toBe('--:--');
  });
});

describe('formatDuration', () => {
  it('should format minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2:05');
    expect(formatDuration(3600)).toBe('1:00:00');
  });

  it('should format hours correctly', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });
});

describe('filterInvalidHR', () => {
  it('should filter out invalid HR values', () => {
    const result = filterInvalidHR([60, 70, 0, 80, 250, 90]);
    
    expect(result.filtered).toEqual([60, 70, 80, 90]);
    expect(result.validCount).toBe(4);
  });

  it('should calculate valid percentage', () => {
    const result = filterInvalidHR([60, 70, 0, 80, 0, 0]);
    
    expect(result.validPercent).toBeCloseTo(50, 1);
  });
});

describe('splitInHalf', () => {
  it('should split array into two halves', () => {
    const [first, second] = splitInHalf([1, 2, 3, 4]);
    
    expect(first).toEqual([1, 2]);
    expect(second).toEqual([3, 4]);
  });

  it('should handle odd-length arrays', () => {
    const [first, second] = splitInHalf([1, 2, 3, 4, 5]);
    
    expect(first).toEqual([1, 2, 3]);
    expect(second).toEqual([4, 5]);
  });
});

describe('calculateDrift', () => {
  it('should calculate drift percentage', () => {
    const drift = calculateDrift([140, 140, 140], [150, 150, 150]);
    
    // (150 - 140) / 140 * 100 = 7.14%
    expect(drift).toBeCloseTo(7.14, 1);
  });

  it('should return 0 for empty first half', () => {
    expect(calculateDrift([], [150, 150])).toBe(0);
  });
});

describe('roundTo', () => {
  it('should round to specified decimals', () => {
    expect(roundTo(3.14159, 2)).toBe(3.14);
    expect(roundTo(3.14159, 0)).toBe(3);
  });
});

describe('clamp', () => {
  it('should clamp value within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('zoneSecondsToPercent', () => {
  it('should calculate percentages correctly', () => {
    const result = zoneSecondsToPercent(1800, 600, 600);
    
    expect(result.z1Percent).toBe(60);
    expect(result.z2Percent).toBe(20);
    expect(result.z3Percent).toBe(20);
  });

  it('should return zeros for zero total', () => {
    const result = zoneSecondsToPercent(0, 0, 0);
    
    expect(result.z1Percent).toBe(0);
    expect(result.z2Percent).toBe(0);
    expect(result.z3Percent).toBe(0);
  });
});

describe('calculateTimeInZones', () => {
  it('should calculate time in each zone', () => {
    const hrData = [
      ...Array(100).fill(100), // Z1
      ...Array(100).fill(150), // Z2
      ...Array(100).fill(180), // Z3
    ];
    
    const result = calculateTimeInZones(hrData, 140, 165);
    
    expect(result.z1).toBe(100);
    expect(result.z2).toBe(100);
    expect(result.z3).toBe(100);
  });

  it('should ignore invalid HR values', () => {
    const hrData = [0, 100, 0, 150, 180];
    
    const result = calculateTimeInZones(hrData, 140, 165);
    
    expect(result.total).toBe(3);
  });
});

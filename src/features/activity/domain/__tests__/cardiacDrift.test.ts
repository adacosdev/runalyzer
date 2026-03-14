/**
 * Cardiac Drift Analysis Tests - Runalyzer
 * 
 * Unit tests for the cardiac drift analysis algorithm.
 */

import { describe, it, expect } from 'vitest';
import { analyzeCardiacDrift, CardiacDriftConfig } from '../cardiacDrift';

describe('analyzeCardiacDrift', () => {
  const defaultConfig: CardiacDriftConfig = {
    driftThreshold: 4,
    warningThreshold: 8,
    minValidPercent: 80,
  };

  describe('verdict: ok (drift < 4%)', () => {
    it('should return ok for stable HR', () => {
      // First half: avg 140, Second half: avg 140 (0% drift)
      const hrData = [
        ...Array(300).fill(140), // First 5 min at 140
        ...Array(300).fill(140), // Second 5 min at 140
      ];
      
      const result = analyzeCardiacDrift(hrData, defaultConfig);
      
      expect(result.verdict).toBe('ok');
      expect(result.driftPercent).toBe(0);
    });

    it('should return ok for slight positive drift (under threshold)', () => {
      // First half: avg 140, Second half: avg 144 (2.86% drift)
      const hrData = [
        ...Array(300).fill(140),
        ...Array(300).fill(144),
      ];
      
      const result = analyzeCardiacDrift(hrData, defaultConfig);
      
      expect(result.verdict).toBe('ok');
      expect(result.driftPercent).toBeLessThan(4);
    });

    it('should return ok for slight negative drift', () => {
      // First half: avg 144, Second half: avg 140 (-2.78% drift)
      const hrData = [
        ...Array(300).fill(144),
        ...Array(300).fill(140),
      ];
      
      const result = analyzeCardiacDrift(hrData, defaultConfig);
      
      expect(result.verdict).toBe('ok');
      expect(result.driftPercent).toBeLessThan(0);
    });
  });

  describe('verdict: warning (4% <= drift < 8%)', () => {
    it('should return warning for moderate drift', () => {
      // First half: avg 140, Second half: avg 146 (4.29% drift)
      const hrData = [
        ...Array(300).fill(140),
        ...Array(300).fill(146),
      ];
      
      const result = analyzeCardiacDrift(hrData, defaultConfig);
      
      expect(result.verdict).toBe('warning');
      expect(result.driftPercent).toBeGreaterThanOrEqual(4);
      expect(result.driftPercent).toBeLessThan(8);
    });
  });

  describe('verdict: bad (drift >= 8%)', () => {
    it('should return bad for high drift', () => {
      // First half: avg 140, Second half: avg 154 (10% drift)
      const hrData = [
        ...Array(300).fill(140),
        ...Array(300).fill(154),
      ];
      
      const result = analyzeCardiacDrift(hrData, defaultConfig);
      
      expect(result.verdict).toBe('bad');
      expect(result.driftPercent).toBeGreaterThanOrEqual(8);
    });
  });

  describe('verdict: insufficient-data', () => {
    it('should return insufficient-data for empty array', () => {
      const hrData: number[] = [];
      
      const result = analyzeCardiacDrift(hrData, defaultConfig);
      
      expect(result.verdict).toBe('insufficient-data');
    });

    it('should return insufficient-data for very short activity', () => {
      // Less than 120 seconds
      const hrData = Array(60).fill(140);
      
      const result = analyzeCardiacDrift(hrData, defaultConfig);
      
      expect(result.verdict).toBe('insufficient-data');
    });

    it('should return insufficient-data when too many invalid points', () => {
      // 50% invalid (zeros)
      const hrData = [
        ...Array(300).fill(0),
        ...Array(300).fill(140),
      ];
      
      const result = analyzeCardiacDrift(hrData, defaultConfig);
      
      expect(result.verdict).toBe('insufficient-data');
    });
  });

  describe('data quality warnings', () => {
    it('should filter out invalid HR values (0)', () => {
      const hrData = [
        ...Array(150).fill(140),
        0, 0, 0, // Invalid
        ...Array(150).fill(140),
      ];
      
      const result = analyzeCardiacDrift(hrData, defaultConfig);
      
      expect(result.validDataPoints).toBe(300);
      expect(result.dataQualityWarning).toBeUndefined();
    });

    it('should filter out invalid HR values (< 30 or > 220)', () => {
      const hrData = [
        ...Array(150).fill(140),
        20, 250, // Invalid
        ...Array(150).fill(140),
      ];
      
      const result = analyzeCardiacDrift(hrData, defaultConfig);
      
      expect(result.validDataPoints).toBe(300);
    });
  });

  describe('custom thresholds', () => {
    it('should use custom drift threshold', () => {
      const hrData = [
        ...Array(300).fill(140),
        ...Array(300).fill(143), // ~2.14% drift
      ];
      
      const config: CardiacDriftConfig = { ...defaultConfig, driftThreshold: 2 };
      const result = analyzeCardiacDrift(hrData, config);
      
      expect(result.verdict).toBe('warning'); // Now 2% exceeds 2% threshold
    });
  });
});

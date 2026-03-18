/**
 * Zone Distribution Tests - Runalyzer
 * 
 * Unit tests for zone distribution analysis.
 */

import { describe, it, expect } from 'vitest';
import { analyzeZoneDistribution } from '../zoneDistribution';
import { ZoneConfig } from '../../../setup/domain/zones.types';

describe('analyzeZoneDistribution', () => {
  const createZoneConfig = (overrides: Partial<ZoneConfig> = {}): ZoneConfig => ({
    z1MaxHR: 140,
    z2MaxHR: 165,
    maxHR: 180,
    isEstimated: false,
    calibrationMethod: 'manual',
    lastCalibrated: Date.now(),
    ...overrides,
  });

  describe('Z1 (Zone 1) - Fat oxidation', () => {
    it('should count time in Z1 when HR <= z1MaxHR', () => {
      // All data in Z1
      const hrData = Array(300).fill(130); // Below z1MaxHR (140)
      
      const config = createZoneConfig();
      const result = analyzeZoneDistribution(hrData, config);
      
      expect(result.z1Percent).toBe(100);
      expect(result.z2Percent).toBe(0);
      expect(result.z3Percent).toBe(0);
    });

    it('should calculate Z1 correctly at boundary', () => {
      // Exactly at z1MaxHR
      const hrData = Array(300).fill(140);
      
      const config = createZoneConfig();
      const result = analyzeZoneDistribution(hrData, config);
      
      expect(result.z1Percent).toBe(100);
    });
  });

  describe('Z2 (Zone 2) - Threshold', () => {
    it('should count time in Z2 when z1MaxHR < HR <= z2MaxHR', () => {
      const hrData = Array(300).fill(150); // Between 140 and 165
      
      const config = createZoneConfig();
      const result = analyzeZoneDistribution(hrData, config);
      
      expect(result.z1Percent).toBe(0);
      expect(result.z2Percent).toBe(100);
      expect(result.z3Percent).toBe(0);
    });
  });

  describe('Z3 (Zone 3) - VO2Max', () => {
    it('should count time in Z3 when HR > z2MaxHR', () => {
      const hrData = Array(300).fill(175); // Above z2MaxHR (165)
      
      const config = createZoneConfig();
      const result = analyzeZoneDistribution(hrData, config);
      
      expect(result.z1Percent).toBe(0);
      expect(result.z2Percent).toBe(0);
      expect(result.z3Percent).toBe(100);
    });
  });

  describe('Mixed zones', () => {
    it('should calculate correct percentages for mixed zones', () => {
      // 100 sec in Z1, 100 sec in Z2, 100 sec in Z3
      const hrData = [
        ...Array(100).fill(130),
        ...Array(100).fill(150),
        ...Array(100).fill(175),
      ];
      
      const config = createZoneConfig();
      const result = analyzeZoneDistribution(hrData, config);
      
      expect(result.z1Percent).toBeCloseTo(33.33, 1);
      expect(result.z2Percent).toBeCloseTo(33.33, 1);
      expect(result.z3Percent).toBeCloseTo(33.33, 1);
    });
  });

  describe('verdict generation', () => {
    it('should warn when Z1 is too low', () => {
      // 50% Z1, 30% Z2, 20% Z3
      const hrData = [
        ...Array(150).fill(130),
        ...Array(90).fill(150),
        ...Array(60).fill(175),
      ];
      
      const config = createZoneConfig();
      const result = analyzeZoneDistribution(hrData, config);
      
      expect(result.verdict).toContain('Muy poco tiempo en Z1');
    });

    it('should warn when Z2 is too high for base training', () => {
      // 50% Z1, 45% Z2, 5% Z3
      const hrData = [
        ...Array(150).fill(130),
        ...Array(135).fill(150),
        ...Array(15).fill(175),
      ];
      
      const config = createZoneConfig();
      const result = analyzeZoneDistribution(hrData, config);
      
      expect(result.verdict).toContain('Exceso de tiempo en Z2');
    });

    it('should indicate estimated zones in verdict', () => {
      const hrData = Array(300).fill(130);
      const config = createZoneConfig({ isEstimated: true });
      
      const result = analyzeZoneDistribution(hrData, config);
      
      expect(result.verdict).toContain('estimadas');
    });

    it('should suppress low Z1 warning for interval_z2 sessions', () => {
      // 20% Z1, 60% Z2, 20% Z3
      const hrData = [
        ...Array(60).fill(130),
        ...Array(180).fill(150),
        ...Array(60).fill(175),
      ];

      const config = createZoneConfig();
      const result = analyzeZoneDistribution(hrData, config, 'interval_z2');

      expect(result.verdict).not.toContain('Muy poco tiempo en Z1');
      expect(result.verdict).toContain('Exceso de tiempo en Z2');
    });
  });

  describe('edge cases', () => {
    it('should handle empty HR data', () => {
      const hrData: number[] = [];
      const config = createZoneConfig();
      
      const result = analyzeZoneDistribution(hrData, config);
      
      expect(result.totalSeconds).toBe(0);
      expect(result.z1Percent).toBe(0);
      expect(result.z2Percent).toBe(0);
      expect(result.z3Percent).toBe(0);
    });

    it('should handle invalid HR values', () => {
      const hrData = [0, 0, 0, 130, 130, 130];
      const config = createZoneConfig();
      
      const result = analyzeZoneDistribution(hrData, config);
      
      // Should ignore zeros
      expect(result.z1Percent).toBe(100);
    });
  });
});

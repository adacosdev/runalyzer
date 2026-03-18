/**
 * Internal/External Load Tests - Runalyzer
 * 
 * Unit tests for internal vs external load analysis.
 */

import { describe, it, expect } from 'vitest';
import { analyzeInternalExternalLoad, calculateTrainingStress } from '../internalExternalLoad';
import type { ZoneConfig } from '../../../setup/domain/zones.types';

function makeZoneConfig(z1MaxHR: number, z2MaxHR: number): ZoneConfig {
  return {
    z1MaxHR,
    z2MaxHR,
    maxHR: z2MaxHR + 20,
    isEstimated: false,
    calibrationMethod: 'manual',
    lastCalibrated: Date.now(),
  };
}

describe('analyzeInternalExternalLoad', () => {
  describe('interval analysis', () => {
    it('should analyze intervals with pace and HR', () => {
      const intervals = [
        { name: 'Rodaje', averagePace: 300, averageHeartrate: 130, duration: 1800, type: 'steady' },
        { name: 'Series', averagePace: 270, averageHeartrate: 160, duration: 1200, type: 'interval' },
      ];
      
      const result = analyzeInternalExternalLoad(intervals);
      
      expect(result.intervals.length).toBe(2);
      expect(result.sessionAvgPaceMinKm).toBeGreaterThan(0);
      expect(result.sessionAvgHR).toBeGreaterThan(0);
    });

    it('should skip intervals without pace or HR', () => {
      const intervals = [
        { name: 'Sin datos', averagePace: null, averageHeartrate: null, duration: 1800, type: 'steady' },
        { name: 'Valido', averagePace: 300, averageHeartrate: 130, duration: 1800, type: 'steady' },
      ];
      
      const result = analyzeInternalExternalLoad(intervals);
      
      expect(result.intervals.length).toBe(1);
      expect(result.intervals[0].name).toBe('Valido');
    });

    it('should skip very short intervals (<30s)', () => {
      const intervals = [
        { name: 'Muy corto', averagePace: 300, averageHeartrate: 130, duration: 20, type: 'steady' },
        { name: 'Normal', averagePace: 300, averageHeartrate: 130, duration: 1800, type: 'steady' },
      ];
      
      const result = analyzeInternalExternalLoad(intervals);
      
      expect(result.intervals.length).toBe(1);
      expect(result.intervals[0].name).toBe('Normal');
    });

    it('should ignore recovery pace segments slower than 10:00/km', () => {
      const intervals = [
        { name: 'Activo', averagePace: 300, averageHeartrate: 150, duration: 600, type: 'steady' },
        { name: 'Recuperacion', averagePace: 620, averageHeartrate: 120, duration: 600, type: 'recovery' },
      ];

      const result = analyzeInternalExternalLoad(intervals);

      expect(result.intervals).toHaveLength(1);
      expect(result.intervals[0].name).toBe('Activo');
      expect(result.sessionAvgPaceMinKm).toBe(300);
    });
  });

  describe('RPE integration', () => {
    it('should include RPE in analysis when provided', () => {
      const intervals = [
        { name: 'Serie 1', averagePace: 270, averageHeartrate: 160, duration: 180, type: 'interval' },
      ];
      const rpe = [7];
      
      const result = analyzeInternalExternalLoad(intervals, rpe);
      
      expect(result.intervals[0].rpe).toBe(7);
    });
  });

  describe('session verdict', () => {
    it('should return recovery verdict for low HR', () => {
      const intervals = [
        { name: 'Rodaje suave', averagePace: 360, averageHeartrate: 110, duration: 3600, type: 'steady' },
      ];
      
      const result = analyzeInternalExternalLoad(intervals);
      
      expect(result.sessionVerdict).toContain('recuperaci');
    });

    it('should return base verdict for moderate HR', () => {
      const intervals = [
        { name: 'Rodaje', averagePace: 300, averageHeartrate: 140, duration: 3600, type: 'steady' },
      ];
      
      const result = analyzeInternalExternalLoad(intervals);
      
      expect(result.sessionVerdict).toContain('base');
    });

    it('should return threshold verdict for high HR', () => {
      const intervals = [
        { name: 'Series', averagePace: 260, averageHeartrate: 165, duration: 1800, type: 'interval' },
      ];
      
      const result = analyzeInternalExternalLoad(intervals);
      
      expect(result.sessionVerdict).toContain('umbral');
    });

    it('should return max verdict for very high HR', () => {
      const intervals = [
        { name: 'Sprint', averagePace: 200, averageHeartrate: 185, duration: 60, type: 'sprint' },
      ];
      
      const result = analyzeInternalExternalLoad(intervals);
      
      expect(result.sessionVerdict).toContain('intensidad');
    });
  });

  describe('HR-to-pace efficiency', () => {
    it('should calculate efficiency metric', () => {
      const intervals = [
        { name: 'Eficiente', averagePace: 240, averageHeartrate: 140, duration: 180, type: 'interval' },
      ];
      
      const result = analyzeInternalExternalLoad(intervals);
      
      // Efficiency = (1000/pace) / HR
      // (1000/240) / 140 = 4.167 / 140 = 0.0298
      expect(result.intervals[0].hrToPaceEfficiency).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty intervals', () => {
      const intervals: Array<{
        name: string;
        averagePace: number | null;
        averageHeartrate: number | null;
        duration: number;
        type: string;
      }> = [];
      
      const result = analyzeInternalExternalLoad(intervals);
      
      expect(result.intervals.length).toBe(0);
      expect(result.sessionVerdict).toContain('No hay suficientes datos');
    });
  });

  describe('zoneConfig-based thresholds', () => {
    const zoneConfig = makeZoneConfig(140, 165);

    it('uses z1MaxHR boundary — interval below z1MaxHR gets low-intensity verdict', () => {
      const intervals = [
        { name: 'Suave', averagePace: 360, averageHeartrate: 135, duration: 1800, type: 'steady' },
      ];

      const result = analyzeInternalExternalLoad(intervals, undefined, zoneConfig);

      expect(result.intervals[0].verdict).toContain('baja');
    });

    it('uses z2MaxHR boundary — interval above z2MaxHR gets high-intensity verdict', () => {
      const intervals = [
        { name: 'Series', averagePace: 250, averageHeartrate: 170, duration: 300, type: 'interval' },
      ];

      const result = analyzeInternalExternalLoad(intervals, undefined, zoneConfig);

      // avgHR 170 > z2MaxHR 165 + 15 = 180? No, 170 < 180 → umbral/VO2Max bucket
      // 165 < 170 < 165+15=180 → "Intensidad alta"
      expect(result.intervals[0].verdict).toContain('alta');
    });

    it('interval in z1-z2 range gets moderate-intensity verdict', () => {
      const intervals = [
        { name: 'Tempo', averagePace: 290, averageHeartrate: 155, duration: 600, type: 'steady' },
      ];

      const result = analyzeInternalExternalLoad(intervals, undefined, zoneConfig);

      // 140 < 155 < 165 → moderada
      expect(result.intervals[0].verdict).toContain('moderada');
    });

    it('calling without zoneConfig produces same verdict structure as before (regression guard)', () => {
      const intervals = [
        { name: 'Rodaje', averagePace: 300, averageHeartrate: 140, duration: 3600, type: 'steady' },
      ];

      const withoutConfig = analyzeInternalExternalLoad(intervals);
      const withNullConfig = analyzeInternalExternalLoad(intervals, undefined, null);

      // Both must produce a valid verdict (string) and same session verdict
      expect(typeof withoutConfig.sessionVerdict).toBe('string');
      expect(withoutConfig.sessionVerdict).toBe(withNullConfig.sessionVerdict);
    });
  });
});

describe('calculateTrainingStress', () => {
  it('should calculate stress based on HR and duration', () => {
    const stress = calculateTrainingStress(60, 140, 180);
    
    expect(stress).toBeGreaterThan(0);
    expect(stress).toBeLessThan(100);
  });

  it('should return 0 for invalid HR', () => {
    const stress = calculateTrainingStress(60, 0, 180);
    
    expect(stress).toBe(0);
  });

  it('should return higher stress for longer duration', () => {
    const stress30 = calculateTrainingStress(30, 140, 180);
    const stress60 = calculateTrainingStress(60, 140, 180);
    
    expect(stress60).toBeGreaterThan(stress30);
  });

  it('should return higher stress for higher intensity', () => {
    const stressLow = calculateTrainingStress(60, 120, 180);
    const stressHigh = calculateTrainingStress(60, 160, 180);
    
    expect(stressHigh).toBeGreaterThan(stressLow);
  });
});

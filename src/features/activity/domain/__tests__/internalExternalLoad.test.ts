/**
 * Internal/External Load Tests - Runalyzer
 * 
 * Unit tests for internal vs external load analysis.
 */

import { describe, it, expect } from 'vitest';
import { analyzeInternalExternalLoad, calculateTrainingStress } from '../internalExternalLoad';

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
      const intervals: any[] = [];
      
      const result = analyzeInternalExternalLoad(intervals);
      
      expect(result.intervals.length).toBe(0);
      expect(result.sessionVerdict).toContain('No hay suficientes datos');
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

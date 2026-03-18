/**
 * Lactate Clearance Tests - Runalyzer
 * 
 * Unit tests for lactate clearance analysis.
 */

import { describe, it, expect } from 'vitest';
import { analyzeLactateClearance } from '../lactateClearance';
import type { ZoneConfig } from '../../../setup/domain/zones.types';
import type { DomainInterval } from '../activity.types';

const zoneConfig: ZoneConfig = {
  z1MaxHR: 150,
  z2MaxHR: 170,
  maxHR: 190,
  isEstimated: false,
  calibrationMethod: 'manual',
  lastCalibrated: Date.now(),
};

describe('analyzeLactateClearance', () => {
  describe('activities with intervals', () => {
    it('uses only active intervals in zone range followed by recovery', () => {
      const intervals = [
        { name: 'Intervalo 1', averageHeartrate: 160, maxHeartrate: 176, duration: 180, isRecovery: false },
        { name: 'Recuperacion 1', averageHeartrate: 138, maxHeartrate: 145, duration: 180, isRecovery: true },
      ];

      const result = analyzeLactateClearance(intervals, zoneConfig);

      expect(result.hasIntervals).toBe(true);
      expect(result.intervals).toHaveLength(1);
      expect(result.intervals[0]).toMatchObject({
        name: 'Recuperacion 1',
        peakHR: 176,
        endHR: 138,
        dropBpm: 38,
      });
    });

    it('returns explicit insufficient-data when zone config is missing in summary interval mode', () => {
      const intervals = [
        { name: 'Intervalo 1', averageHeartrate: 160, maxHeartrate: 176, duration: 180, isRecovery: false },
        { name: 'Recuperacion 1', averageHeartrate: 138, maxHeartrate: 145, duration: 180, isRecovery: true },
      ];

      const result = analyzeLactateClearance(intervals);

      expect(result.hasIntervals).toBe(false);
      expect(result.intervals).toHaveLength(0);
      expect(result.reasonCode).toBe('insufficient-data');
      expect(result.verdict).toContain('sin configuración de zonas');
    });
  });

  describe('active interval filters', () => {
    it('rejects active interval when it is marked as recovery', () => {
      const intervals = [
        { name: 'Recovery marcada como activa', averageHeartrate: 160, maxHeartrate: 176, duration: 180, isRecovery: true },
        { name: 'Recuperacion 2', averageHeartrate: 138, maxHeartrate: 145, duration: 180, isRecovery: true },
      ];

      const result = analyzeLactateClearance(intervals, zoneConfig);

      expect(result.hasIntervals).toBe(false);
      expect(result.intervals).toHaveLength(0);
    });

    it('rejects active interval with duration < 120 seconds', () => {
      const intervals = [
        { name: 'Activa corta', averageHeartrate: 160, maxHeartrate: 175, duration: 119, isRecovery: false },
        { name: 'Recuperacion', averageHeartrate: 138, maxHeartrate: 145, duration: 180, isRecovery: true },
      ];

      const result = analyzeLactateClearance(intervals, zoneConfig);

      expect(result.hasIntervals).toBe(false);
      expect(result.intervals).toHaveLength(0);
      expect(result.verdict).toContain('no tiene intervalos');
    });

    it('accepts active interval when duration is exactly 120 seconds', () => {
      const intervals = [
        { name: 'Activa en limite de duracion', averageHeartrate: 160, maxHeartrate: 175, duration: 120, isRecovery: false },
        { name: 'Recuperacion', averageHeartrate: 138, maxHeartrate: 145, duration: 180, isRecovery: true },
      ];

      const result = analyzeLactateClearance(intervals, zoneConfig);

      expect(result.hasIntervals).toBe(true);
      expect(result.intervals).toHaveLength(1);
    });

    it('rejects active interval when avgHR is below z1MaxHR', () => {
      const intervals = [
        { name: 'Activa baja', averageHeartrate: 149, maxHeartrate: 171, duration: 180, isRecovery: false },
        { name: 'Recuperacion', averageHeartrate: 135, maxHeartrate: 140, duration: 180, isRecovery: true },
      ];

      const result = analyzeLactateClearance(intervals, zoneConfig);

      expect(result.hasIntervals).toBe(false);
      expect(result.intervals).toHaveLength(0);
    });

    it('accepts active interval when avgHR is exactly z1MaxHR', () => {
      const intervals = [
        { name: 'Activa en z1', averageHeartrate: zoneConfig.z1MaxHR, maxHeartrate: 171, duration: 180, isRecovery: false },
        { name: 'Recuperacion', averageHeartrate: 140, maxHeartrate: 145, duration: 180, isRecovery: true },
      ];

      const result = analyzeLactateClearance(intervals, zoneConfig);

      expect(result.hasIntervals).toBe(true);
      expect(result.intervals).toHaveLength(1);
    });

    it('rejects active interval when avgHR is above z2MaxHR', () => {
      const intervals = [
        { name: 'Activa alta', averageHeartrate: 171, maxHeartrate: 182, duration: 180, isRecovery: false },
        { name: 'Recuperacion', averageHeartrate: 142, maxHeartrate: 148, duration: 180, isRecovery: true },
      ];

      const result = analyzeLactateClearance(intervals, zoneConfig);

      expect(result.hasIntervals).toBe(false);
      expect(result.intervals).toHaveLength(0);
    });

    it('accepts active interval when avgHR is exactly z2MaxHR', () => {
      const intervals = [
        { name: 'Activa en z2', averageHeartrate: zoneConfig.z2MaxHR, maxHeartrate: 182, duration: 180, isRecovery: false },
        { name: 'Recuperacion', averageHeartrate: 142, maxHeartrate: 148, duration: 180, isRecovery: true },
      ];

      const result = analyzeLactateClearance(intervals, zoneConfig);

      expect(result.hasIntervals).toBe(true);
      expect(result.intervals).toHaveLength(1);
    });

    it('rejects pairing when next interval is not recovery', () => {
      const intervals = [
        { name: 'Activa', averageHeartrate: 160, maxHeartrate: 178, duration: 180, isRecovery: false },
        { name: 'No recovery', averageHeartrate: 140, maxHeartrate: 147, duration: 180, isRecovery: false },
      ];

      const result = analyzeLactateClearance(intervals, zoneConfig);

      expect(result.hasIntervals).toBe(false);
      expect(result.intervals).toHaveLength(0);
    });

    it('rejects pairing when immediate recovery duration is < 120 seconds', () => {
      const intervals = [
        { name: 'Activa', averageHeartrate: 160, maxHeartrate: 178, duration: 180, isRecovery: false },
        { name: 'Recuperacion corta', averageHeartrate: 140, maxHeartrate: 147, duration: 119, isRecovery: true },
      ];

      const result = analyzeLactateClearance(intervals, zoneConfig);

      expect(result.hasIntervals).toBe(false);
      expect(result.intervals).toHaveLength(0);
    });

    it('accepts pairing when immediate recovery duration is exactly 120 seconds', () => {
      const intervals = [
        { name: 'Activa', averageHeartrate: 160, maxHeartrate: 178, duration: 180, isRecovery: false },
        { name: 'Recuperacion en limite', averageHeartrate: 140, maxHeartrate: 147, duration: 120, isRecovery: true },
      ];

      const result = analyzeLactateClearance(intervals, zoneConfig);

      expect(result.hasIntervals).toBe(true);
      expect(result.intervals).toHaveLength(1);
    });
  });

  describe('activities without intervals', () => {
    it('should return no intervals for continuous activity', () => {
      const intervals: Array<{
        name: string;
        averageHeartrate: number | null;
        maxHeartrate: number | null;
        duration: number;
        isRecovery: boolean;
      }> = [];

      const result = analyzeLactateClearance(intervals, zoneConfig);

      expect(result.hasIntervals).toBe(false);
      expect(result.intervals.length).toBe(0);
      expect(result.overallQuality).toBe('poor');
      expect(result.verdict).toContain('no tiene intervalos');
    });
  });

  describe('intervals without HR data', () => {
    it('should skip intervals without HR', () => {
      const intervals = [
        { name: 'Intervalo 1', averageHeartrate: null, maxHeartrate: null, duration: 180, isRecovery: false },
        { name: 'Recuperacion 1', averageHeartrate: null, maxHeartrate: null, duration: 200, isRecovery: true },
      ];

      const result = analyzeLactateClearance(intervals, zoneConfig);

      expect(result.intervals.length).toBe(0);
      expect(result.hasIntervals).toBe(false);
    });
  });

  describe('v2 compatibility facade with protocol stream context', () => {
    const domainIntervals: DomainInterval[] = [
      {
        id: 'int-1',
        name: 'Intervalo 1',
        startTime: 0,
        duration: 180,
        distance: 800,
        averageHeartrate: 165,
        maxHeartrate: 178,
        minHeartrate: 150,
        averagePace: 250,
        maxPace: 230,
        type: 'interval',
        isRecovery: false,
      },
    ];

    it('keeps the existing result shape and propagates checkpoint confidence', () => {
      const summaryIntervals = [
        { name: 'Intervalo 1', averageHeartrate: 165, maxHeartrate: 178, duration: 180, isRecovery: false },
      ];

      const result = analyzeLactateClearance(summaryIntervals, zoneConfig, {
        domainIntervals,
        timeData: [120, 130, 140, 150, 160, 170, 180, 242, 300],
        heartRateData: [172, 173, 174, 175, 176, 177, 178, 154, 146],
      });

      expect(result.hasIntervals).toBe(true);
      expect(result.intervals).toHaveLength(1);
      expect(result.intervals[0].confidence).toBe('fallback_nearest_3s');
      expect(result.intervals[0].reasonCode).toBe('ok');
      expect(result.intervals[0].dropPercent).toBeGreaterThan(0);
    });

    it('does not fabricate drop percentages when required checkpoints are unavailable', () => {
      const summaryIntervals = [
        { name: 'Intervalo 1', averageHeartrate: 165, maxHeartrate: 178, duration: 180, isRecovery: false },
      ];

      const result = analyzeLactateClearance(summaryIntervals, zoneConfig, {
        domainIntervals,
        timeData: [120, 130, 140, 150, 160, 170, 180, 240, 305],
        heartRateData: [172, 173, 174, 175, 176, 177, 178, 154, 145],
      });

      expect(result.hasIntervals).toBe(false);
      expect(result.intervals).toHaveLength(0);
      expect(result.averageDropPercent).toBe(0);
      expect(result.reasonCode).toBe('checkpoint-unavailable-outside-window');
    });

    it('falls back to deterministic insufficient-data reason when protocol yields no intervals', () => {
      const result = analyzeLactateClearance([], zoneConfig, {
        domainIntervals: [],
        timeData: [60, 120, 180],
        heartRateData: [150, 155, 152],
      });

      expect(result.hasIntervals).toBe(false);
      expect(result.intervals).toHaveLength(0);
      expect(result.reasonCode).toBe('insufficient-data');
    });
  });
});

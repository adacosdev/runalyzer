/**
 * Feedback Generator Tests - Runalyzer
 * 
 * Unit tests for actionable feedback generation.
 */

import { describe, it, expect } from 'vitest';
import { generateFeedback, generateSummaryFeedback } from '../feedbackGenerator';
import { ActivityAnalysis } from '../types';

describe('generateFeedback', () => {
  const createBaseAnalysis = (overrides: Partial<ActivityAnalysis> = {}): ActivityAnalysis => ({
    activityId: 'test-activity',
    analyzedAt: Date.now(),
    dataAvailability: 'full-streams',
    cardiacDrift: null,
    zoneDistribution: null,
    internalExternalLoad: null,
    lactateClearance: null,
    actionableFeedback: [],
    hrDataQuality: {
      totalPoints: 600,
      validPoints: 580,
      validPercent: 96.67,
    },
    ...overrides,
  });

  describe('cardiac drift insights', () => {
    it('should generate insight for ok drift', () => {
      const analysis = createBaseAnalysis({
        cardiacDrift: {
          verdict: 'ok',
          driftPercent: 2,
          firstHalfAvgHR: 140,
          secondHalfAvgHR: 143,
          message: 'Good stability',
          validDataPoints: 500,
        },
      });
      
      const feedback = generateFeedback(analysis);
      
      const driftInsight = feedback.find(f => f.category === 'cardiac_drift');
      expect(driftInsight).toBeDefined();
      expect(driftInsight?.title).toContain('Excelente');
    });

    it('should generate high-priority insight for bad drift', () => {
      const analysis = createBaseAnalysis({
        cardiacDrift: {
          verdict: 'bad',
          driftPercent: 10,
          firstHalfAvgHR: 140,
          secondHalfAvgHR: 154,
          message: 'High drift',
          validDataPoints: 500,
        },
      });
      
      const feedback = generateFeedback(analysis);
      
      const driftInsight = feedback.find(f => f.category === 'cardiac_drift');
      expect(driftInsight).toBeDefined();
      expect(driftInsight?.priority).toBe(1); // Highest priority
      expect(driftInsight?.title).toContain('elevado');
    });

    it('should NOT generate insight for insufficient data', () => {
      const analysis = createBaseAnalysis({
        cardiacDrift: {
          verdict: 'insufficient-data',
          driftPercent: 0,
          firstHalfAvgHR: 0,
          secondHalfAvgHR: 0,
          message: 'Not enough data',
          validDataPoints: 50,
        },
      });
      
      const feedback = generateFeedback(analysis);
      
      const driftInsight = feedback.find(f => f.category === 'cardiac_drift');
      expect(driftInsight).toBeUndefined();
    });
  });

  describe('zone distribution insights', () => {
    it('should warn when Z1 is too low', () => {
      const analysis = createBaseAnalysis({
        zoneDistribution: {
          z1Seconds: 1200,
          z2Seconds: 1800,
          z3Seconds: 600,
          z1Percent: 33.3,
          z2Percent: 50,
          z3Percent: 16.7,
          totalSeconds: 3600,
          verdict: 'Low Z1',
          isEstimated: false,
        },
      });
      
      const feedback = generateFeedback(analysis);
      
      const zoneInsight = feedback.find(f => f.category === 'zone_distribution');
      expect(zoneInsight).toBeDefined();
      expect(zoneInsight?.title).toContain('Poco tiempo');
    });
  });

  describe('data quality insights', () => {
    it('should warn when data quality is poor', () => {
      const analysis = createBaseAnalysis({
        hrDataQuality: {
          totalPoints: 1000,
          validPoints: 400,
          validPercent: 40,
        },
      });
      
      const feedback = generateFeedback(analysis);
      
      const qualityInsight = feedback.find(f => f.category === 'data_quality');
      expect(qualityInsight).toBeDefined();
      expect(qualityInsight?.title).toContain('incompletos');
    });
  });

  describe('max 3 insights', () => {
    it('should return maximum 3 insights', () => {
      const analysis = createBaseAnalysis({
        cardiacDrift: {
          verdict: 'bad',
          driftPercent: 10,
          firstHalfAvgHR: 140,
          secondHalfAvgHR: 154,
          message: 'High drift',
          validDataPoints: 500,
        },
        zoneDistribution: {
          z1Seconds: 1200,
          z2Seconds: 1800,
          z3Seconds: 600,
          z1Percent: 33.3,
          z2Percent: 50,
          z3Percent: 16.7,
          totalSeconds: 3600,
          verdict: 'Low Z1',
          isEstimated: false,
        },
        internalExternalLoad: {
          intervals: [],
          sessionAvgPaceMinKm: 300,
          sessionAvgHR: 140,
          sessionVerdict: 'Base session',
        },
        hrDataQuality: {
          totalPoints: 1000,
          validPoints: 400,
          validPercent: 40,
        },
      });
      
      const feedback = generateFeedback(analysis);
      
      expect(feedback.length).toBeLessThanOrEqual(3);
    });
  });

  describe('priority ordering', () => {
    it('should order cardiac drift first', () => {
      const analysis = createBaseAnalysis({
        cardiacDrift: {
          verdict: 'bad',
          driftPercent: 10,
          firstHalfAvgHR: 140,
          secondHalfAvgHR: 154,
          message: 'High drift',
          validDataPoints: 500,
        },
        zoneDistribution: {
          z1Seconds: 1200,
          z2Seconds: 1800,
          z3Seconds: 600,
          z1Percent: 33.3,
          z2Percent: 50,
          z3Percent: 16.7,
          totalSeconds: 3600,
          verdict: 'Low Z1',
          isEstimated: false,
        },
      });
      
      const feedback = generateFeedback(analysis);
      
      expect(feedback[0]?.category).toBe('cardiac_drift');
    });
  });

  describe('v2 priority and suppression rules', () => {
    const zoneConfig = {
      z1MaxHR: 140,
      z2MaxHR: 165,
      maxHR: 190,
      isEstimated: false,
      calibrationMethod: 'manual' as const,
      lastCalibrated: Date.now(),
    };

    it('prioritizes intensity over recovery when both conditions co-trigger', () => {
      const analysis = createBaseAnalysis({
        zoneDistribution: {
          z1Seconds: 600,
          z2Seconds: 1800,
          z3Seconds: 600,
          z1Percent: 20,
          z2Percent: 60,
          z3Percent: 20,
          totalSeconds: 3000,
          verdict: 'High intensity',
          isEstimated: false,
        },
        lactateClearance: {
          intervals: [
            {
              name: 'Recovery 1',
              peakHR: 175,
              endHR: 158,
              dropBpm: 17,
              dropPercent: 9.7,
              quality: 'poor',
            },
          ],
          averageDropPercent: 9.7,
          overallQuality: 'poor',
          verdict: 'Recuperación limitada',
          hasIntervals: true,
        },
      });

      const feedback = generateFeedback(analysis, {
        sessionType: 'interval_z2',
        zoneConfig,
        activeFcMax: 172,
        sessionFcMax: 176,
        hasRecoverySegments: true,
      });

      expect(feedback[0]?.id).toBe('intensity-interval-z2-high');
      expect(feedback.some((insight) => insight.id === 'lactate-poor')).toBe(false);
      expect(feedback.some((insight) => insight.title.includes('Poco tiempo en zona base'))).toBe(false);
    });

    it('requires recovery segments to emit recovery feedback', () => {
      const analysis = createBaseAnalysis({
        lactateClearance: {
          intervals: [
            {
              name: 'Recovery 1',
              peakHR: 172,
              endHR: 158,
              dropBpm: 14,
              dropPercent: 8.1,
              quality: 'poor',
            },
          ],
          averageDropPercent: 8.1,
          overallQuality: 'poor',
          verdict: 'Recuperación limitada',
          hasIntervals: true,
        },
      });

      const feedback = generateFeedback(analysis, {
        sessionType: 'mixed',
        zoneConfig,
        activeFcMax: 150,
        sessionFcMax: 160,
        hasRecoverySegments: false,
      });

      expect(feedback.some((insight) => insight.id === 'lactate-poor')).toBe(false);
    });
  });
});

describe('generateSummaryFeedback', () => {
  it('should generate summary when no specific insights', () => {
    const analysis: ActivityAnalysis = {
      activityId: 'test',
      analyzedAt: Date.now(),
      dataAvailability: 'full-streams',
      cardiacDrift: null,
      zoneDistribution: null,
      internalExternalLoad: null,
      lactateClearance: null,
      actionableFeedback: [],
      hrDataQuality: {
        totalPoints: 600,
        validPoints: 580,
        validPercent: 96,
      },
    };
    
    const summary = generateSummaryFeedback(analysis);
    
    expect(summary).toBeTruthy();
    expect(typeof summary).toBe('string');
  });

  it('should include positive feedback when drift is ok', () => {
    const analysis: ActivityAnalysis = {
      activityId: 'test',
      analyzedAt: Date.now(),
      dataAvailability: 'full-streams',
      cardiacDrift: {
        verdict: 'ok',
        driftPercent: 2,
        firstHalfAvgHR: 140,
        secondHalfAvgHR: 143,
        message: 'Good',
        validDataPoints: 500,
      },
      zoneDistribution: null,
      internalExternalLoad: null,
      lactateClearance: null,
      actionableFeedback: [],
      hrDataQuality: {
        totalPoints: 600,
        validPoints: 580,
        validPercent: 96,
      },
    };
    
    const summary = generateSummaryFeedback(analysis);
    
    expect(summary).toContain('drift');
    expect(summary).toContain('control');
  });
});

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

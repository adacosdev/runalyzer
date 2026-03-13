/**
 * Activities Store - Runalyzer
 * 
 * Manages activity list and analysis results.
 * In-memory cache with TTL (15 minutes).
 */

import { create } from 'zustand';
import { DomainActivity } from '../domain/activity/types';
import { ActivityAnalysis } from '../domain/analysis/types';

interface ActivitiesState {
  // State
  activities: DomainActivity[];
  analyses: Map<string, ActivityAnalysis>; // activityId → analysis
  selectedActivityId: string | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  
  // Cache config
  CACHE_TTL_MS: number; // 15 minutes
  
  // Actions
  setActivities: (activities: DomainActivity[]) => void;
  addAnalysis: (activityId: string, analysis: ActivityAnalysis) => void;
  getAnalysis: (activityId: string) => ActivityAnalysis | null;
  setSelectedActivity: (activityId: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearCache: () => void;
  isCacheValid: () => boolean;
}

export const useActivitiesStore = create<ActivitiesState>((set, get) => ({
  activities: [],
  analyses: new Map(),
  selectedActivityId: null,
  isLoading: false,
  error: null,
  lastFetched: null,
  CACHE_TTL_MS: 15 * 60 * 1000, // 15 minutes
  
  setActivities: (activities) => set({ 
    activities, 
    lastFetched: Date.now() 
  }),
  
  addAnalysis: (activityId, analysis) => {
    const analyses = new Map(get().analyses);
    analyses.set(activityId, analysis);
    set({ analyses });
  },
  
  getAnalysis: (activityId) => {
    return get().analyses.get(activityId) || null;
  },
  
  setSelectedActivity: (activityId) => set({ selectedActivityId: activityId }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error, isLoading: false }),
  
  clearCache: () => set({ 
    activities: [], 
    analyses: new Map(), 
    lastFetched: null 
  }),
  
  isCacheValid: () => {
    const { lastFetched, CACHE_TTL_MS } = get();
    if (!lastFetched) return false;
    return Date.now() - lastFetched < CACHE_TTL_MS;
  },
}));
